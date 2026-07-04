# YouTube Case Study - Chapter 5: System Integration and Interoperability

## 1. High-Performance Inter-Service Communication Protocols

In an enterprise-scale microservices architecture handling 100,000+ internal remote procedure calls (RPCs) per second, the choice of communication protocol directly impacts service latency, CPU consumption, and network saturation. Legacy architectures relying on REST APIs over HTTP/1.1 with text-based JSON serialization incur high resource penalties:
- **TCP Connection Overhead**: HTTP/1.1 requires setting up distinct TCP connections or keeping connections open using keep-alive headers. However, it cannot multiplex requests over a single connection, leading to socket exhaustion under heavy load.
- **JSON Serialization CPU Overhead**: Parsing and serializing text-based JSON strings consumes significant CPU cycles compared to binary serialization formats.
- **Header Size Inflation**: HTTP/1.1 headers are transmitted as uncompressed text strings, introducing substantial bandwidth overhead for small payloads.

To resolve these limitations, the YouTube infrastructure architecture standardizes on **gRPC running over HTTP/2** with **Protocol Buffers (protobuf)** as the binary serialization layer.

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

package youtube.integration.v1;

option go_package = "youtube/integration/v1;integrationv1";
option java_multiple_files = true;
option java_package = "com.youtube.integration.v1";

// Handles playback manifest requests and tracking heartbeats.
service PlaybackService {
  rpc GetPlaybackManifest(PlaybackManifestRequest) returns (PlaybackManifestResponse);
  rpc LogHeartbeat(PlaybackHeartbeatRequest) returns (PlaybackHeartbeatResponse);
}

message PlaybackManifestRequest {
  string video_id = 1;
  string client_ip = 2;
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

When a creator uploads a video, the system must update the subscription feeds of their subscribers. We use a hybrid model combining **Fan-Out-on-Write (Push)** and **Fan-Out-on-Read (Pull)**.

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
For channels with average subscriber counts (under 10,000 subscribers), new videos are pushed directly to their subscribers' feed caches:
1. **Event Ingestion**: The Write Service publishes a `VideoCreatedEvent` to a Kafka topic.
2. **Subscriber Queries**: A Fan-Out Worker consumes the event and queries the Social Graph Service to retrieve the channel's subscribers.
3. **Presence Filtering**: The worker queries the Presence Service to identify active subscribers.
4. **Cache Updates**: The worker sends pipelined updates to the active subscribers' Redis feed lists.

---

### 3.2 Fan-Out-on-Read (Pull Model)
For high-profile channels (with millions of subscribers), fanning out a single video upload to all subscribers would saturate cache CPU and network bandwidth. Instead:
- **Write Bypass**: If the subscriber count exceeds 10,000, the fan-out step is bypassed. The video ID is written only to the channel's outbox cache (`channel_videos:channel_id`).
- **On-Read Merging**: When a subscriber loads their subscription feed, the Playback Service fetches their pre-computed standard feed from Redis and merges it on-the-fly with the recent uploads of any high-profile channels they subscribe to.

---

### 3.3 Fan-Out Pipeline Implementation
Below is a conceptual implementation of the background fan-out process:

```typescript
import { Kafka } from "kafkajs";
import Redis from "ioredis";

interface VideoCreatedEvent {
  videoId: string;
  channelId: string;
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
    await this.consumer.subscribe({ topic: "video-events", fromBeginning: false });

    await this.consumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return;
        const event: VideoCreatedEvent = JSON.parse(message.value.toString());
        await this.executeFanOut(event);
      }
    });
  }

  private async executeFanOut(event: VideoCreatedEvent) {
    // 1. Query Social Graph to retrieve subscribers list
    const subscribers = await graphClient.getSubscribers(event.channelId);

    // Bypass standard fan-out for celebrity/high-profile channels
    if (subscribers.length > 10000) {
      await this.redisCluster.lpush(`channel_videos:${event.channelId}`, event.videoId);
      await this.redisCluster.ltrim(`channel_videos:${event.channelId}`, 0, 99);
      return;
    }

    // 2. Batch process subscribers in chunks of 1,000 to manage memory
    const BATCH_SIZE = 1000;
    for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
      const batch = subscribers.slice(i, i + BATCH_SIZE);

      // 3. Filter for active users (active in the last 30 days)
      const activeSubscribers = await presenceClient.filterActiveUsers(batch);

      // 4. Update active subscriber caches in parallel using Redis pipelines
      const pipeline = this.redisCluster.pipeline();
      activeSubscribers.forEach((subId) => {
        const feedKey = `sub_feed:${subId}`;
        pipeline.lpush(feedKey, event.videoId);
        pipeline.ltrim(feedKey, 0, 799); // Limit feed size to 800 items
      });

      await pipeline.exec();
    }
  }
}
```

---

## 4. Pipeline Monitoring and SLO Targets

To maintain real-time delivery performance, we monitor the following metrics:

### 4.1 Sync Latency
The duration from when a video upload finishes transcoding to when it appears in the subscription feeds of all active subscribers.
- **SLO Target**: P95 < 1.0 second, P99 < 3.0 seconds.

### 4.2 Kafka Consumer Lag
Measures the queue backlog of unprocessed messages. A rising lag indicates that additional fan-out worker pods should be provisioned.
- **Target Threshold**: Lag < 5,000 events per partition.
- **HPA Integration**: The Kubernetes autoscaler scales worker pod counts based on partition lag metrics.
