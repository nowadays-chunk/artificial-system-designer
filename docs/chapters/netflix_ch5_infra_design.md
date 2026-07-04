# Netflix Case Study - Chapter 5: System Integration and Interoperability

## 1. High-Performance Inter-Service Communication Protocols

In an enterprise-scale microservices architecture handling 100,000+ internal remote procedure calls (RPCs) per second, the choice of communication protocol directly impacts service latency, CPU consumption, and network saturation. Legacy architectures relying on REST APIs over HTTP/1.1 with text-based JSON serialization incur high resource penalties:
- **TCP Connection Overhead**: HTTP/1.1 requires setting up distinct TCP connections or keeping connections open using keep-alive headers. However, it cannot multiplex requests over a single connection, leading to socket exhaustion under heavy load.
- **JSON Serialization CPU Overhead**: Parsing and serializing text-based JSON strings consumes significant CPU cycles compared to binary serialization formats.
- **Header Size Inflation**: HTTP/1.1 headers are transmitted as uncompressed text strings, introducing substantial bandwidth overhead for small payloads.

To resolve these limitations, the Netflix infrastructure architecture standardizes on **gRPC running over HTTP/2** with **Protocol Buffers (protobuf)** as the binary serialization layer.

```
  gRPC HTTP/2 Multiplexing:
  [ Ingress Gateway ] ===( Single TCP Connection )===> [ Routing Service ]
                             |--- Frame Stream A (PostVideo Request)
                             |--- Frame Stream B (GetManifest Response)
                             |--- Frame Stream C (LogTelemetry Request)
```

By multiplexing streams over a single connection:
- **Eliminates Socket Exhaustion**: Services communicate via a persistent pool of TCP connections, avoiding connection setup overhead.
- **Reduces Latency**: Eliminates the TCP slow-start penalty by keeping connections active.
- **Saves Bandwidth**: Uses HPACK header compression to compress headers, reducing egress bandwidth requirements.

---

## 2. Protobuf Integration Contracts

We define gRPC interface contracts using Protocol Buffers (`proto3`). The following schema defines the core Playback Service integration contract:

```protobuf
syntax = "proto3";

package netflix.integration.v1;

option go_package = "netflix/integration/v1;integrationv1";
option java_multiple_files = true;
option java_package = "com.netflix.integration.v1";

// Handles playback manifest requests and tracking heartbeats.
service PlaybackService {
  rpc GetPlaybackManifest(PlaybackManifestRequest) returns (PlaybackManifestResponse);
  rpc LogHeartbeat(PlaybackHeartbeatRequest) returns (PlaybackHeartbeatResponse);
}

message PlaybackManifestRequest {
  string video_id = 1;
  string user_id = 2;
  repeated string supported_codecs = 3; // AV1, VP9, H.264
}

message PlaybackManifestResponse {
  string video_id = 1;
  string title = 2;
  string manifest_url = 3; // Pre-signed CDN endpoint URL
  int64 timestamp = 4;
}

message PlaybackHeartbeatRequest {
  string video_id = 1;
  int64 user_id = 2;
  int32 playback_time_seconds = 3;
}

message PlaybackHeartbeatResponse {
  bool status = 1;
}
```

---

## 3. Timeline Fan-Out Architecture: Push vs. Pull Models

When a user updates their watchlist or Netflix releases a show, the system must update the home feeds of active subscribers. We use a hybrid model combining **Fan-Out-on-Write (Push)** and **Fan-Out-on-Read (Pull)**.

```
       [ Video Uploaded ] ---> [ Kafka Event ] ---> [ Fan-Out Workers ]
                                                     |
             +---------------------------------------+
             | (Iterate active subscribers)
             v
       [ Redis LPUSH ] ---> [ LTRIM 800 ] (Keep feed sizes bounded)
```

---

### 3.1 Fan-Out-on-Write (Push Model)
For users with average activity profiles, new watchlist updates are pushed directly to their feed caches:
1. **Event Ingestion**: The Write Service publishes a `WatchlistChangedEvent` to a Kafka topic.
2. **Device Queries**: A Fan-Out Worker consumes the event and queries the Social Graph Service to retrieve the user's active devices.
3. **Presence Filtering**: The worker queries the Presence Service to identify active connection channels.
4. **Cache Updates**: The worker sends pipelined updates to the active profiles' caches.

---

### 3.2 Fan-Out-on-Read (Pull Model)
For global releases (e.g. blockbuster releases watched by millions of users), fanning out a single show update to all users' home feeds would saturate cache CPU and network bandwidth. Instead:
- **Write Bypass**: If the target audience count exceeds 10,000, the fan-out step is bypassed. The show ID is written only to the global releases index (`global_releases:active`).
- **On-Read Merging**: When a user loads their homepage, the Playback Service fetches their pre-computed personalized feed from Redis and merges it on-the-fly with the recent updates of any global releases they are watching.

---

### 3.3 Fan-Out Pipeline Implementation
Below is a conceptual implementation of the background fan-out process:

```typescript
import { Kafka } from "kafkajs";
import Redis from "ioredis";

interface WatchlistChangedEvent {
  videoId: string;
  userId: string;
  timestamp: number;
}

export class FanOutPipeline {
  private kafka = new Kafka({ brokers: ["kafka-broker-1:9092"] });
  private redisCluster = new Redis.Cluster([
    { host: "redis-node-1", port: 6379 }
  ]);
  private consumer = this.kafka.consumer({ groupId: "fanout-workers" });

  public async start() {
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: "watchlist-updates", fromBeginning: false });

    await this.consumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return;
        const event: WatchlistChangedEvent = JSON.parse(message.value.toString());
        await this.executeFanOut(event);
      }
    });
  }

  private async executeFanOut(event: WatchlistChangedEvent) {
    // Query User's profiles list to update secondary profiles
    const profiles = await profileRegistry.getProfiles(event.userId);

    // Bypass standard fan-out if updating global/shared catalogs
    if (profiles.length > 10) {
      await this.redisCluster.lpush(`user_feed:${event.userId}`, event.videoId);
      await this.redisCluster.ltrim(`user_feed:${event.userId}`, 0, 99);
      return;
    }

    // Update active profile caches in parallel using Redis pipelines
    const pipeline = this.redisCluster.pipeline();
    profiles.forEach((profile) => {
      const feedKey = `profile_feed:${profile.id}`;
      pipeline.lpush(feedKey, event.videoId);
      pipeline.ltrim(feedKey, 0, 799); // Limit feed size to 800 items
    });

    await pipeline.exec();
  }
}
```

---

## 4. Pipeline Monitoring and SLO Targets

To maintain real-time delivery performance, we monitor the following metrics:

### 4.1 Sync Latency
The duration from when a video upload finishes transcoding to when it appears in the homepage feeds of all active subscribers.
- **SLO Target**: P95 < 1.0 second, P99 < 3.0 seconds.

### 4.2 Kafka Consumer Lag
Measures the queue backlog of unprocessed messages. A rising lag indicates that additional fan-out worker pods should be provisioned.
- **Target Threshold**: Lag < 5,000 events per partition.
- **HPA Integration**: The Kubernetes autoscaler scales worker pod counts based on partition lag metrics.
