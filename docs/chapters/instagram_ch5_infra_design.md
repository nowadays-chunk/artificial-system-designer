# Instagram Case Study - Chapter 5: System Integration and Interoperability

## 1. High-Performance Inter-Service Communication Protocols

In an enterprise-scale microservices architecture handling 100,000+ internal remote procedure calls (RPCs) per second, the choice of communication protocol directly impacts service latency, CPU consumption, and network saturation. Legacy architectures relying on REST APIs over HTTP/1.1 with text-based JSON serialization incur high resource penalties:
- **TCP Connection Overhead**: HTTP/1.1 requires setting up distinct TCP connections or keeping connections open using keep-alive headers. However, it cannot multiplex requests over a single connection, leading to socket exhaustion under heavy load.
- **JSON Serialization CPU Overhead**: Parsing and serializing text-based JSON strings consumes significant CPU cycles compared to binary serialization formats.
- **Header Size Inflation**: HTTP/1.1 headers are transmitted as uncompressed text strings, introducing substantial bandwidth overhead for small payloads.

To resolve these limitations, the Instagram infrastructure architecture standardizes on **gRPC running over HTTP/2** with **Protocol Buffers (protobuf)** as the binary serialization layer.

```
  gRPC HTTP/2 Multiplexing:
  [ Ingress Gateway ] ===( Single TCP Connection )===> [ Routing Service ]
                             |--- Frame Stream A (PostMedia Request)
                             |--- Frame Stream B (GetFeed Response)
                             |--- Frame Stream C (LogTelemetry Request)
```

By multiplexing streams over a single connection:
- **Eliminates Socket Exhaustion**: Services communicate via a persistent pool of TCP connections, avoiding connection setup overhead.
- **Reduces Latency**: Eliminates the TCP slow-start penalty by keeping connections active.
- **Saves Bandwidth**: Uses HPACK header compression to compress headers, reducing egress bandwidth requirements.

---

## 2. Protobuf Integration Contracts

We define gRPC interface contracts using Protocol Buffers (`proto3`). The following schema defines the core Post Service integration contract:

```protobuf
syntax = "proto3";

package instagram.integration.v1;

option go_package = "instagram/integration/v1;integrationv1";
option java_multiple_files = true;
option java_package = "com.instagram.integration.v1";

// Handles post creation, metadata retrieval, and batch reads.
service PostService {
  rpc PostMedia(PostMediaRequest) returns (PostMediaResponse);
  rpc GetPost(GetPostRequest) returns (GetPostResponse);
  rpc BatchGetPosts(BatchGetPostsRequest) returns (BatchGetPostsResponse);
}

message PostMediaRequest {
  string author_id = 1;
  string caption = 2;
  repeated string media_urls = 3;
  int64 timestamp = 4;
}

message PostMediaResponse {
  string post_id = 1;
  int64 timestamp = 2;
  bool success = 3;
}

message GetPostRequest {
  string post_id = 1;
}

message GetPostResponse {
  string post_id = 1;
  string author_id = 2;
  string caption = 3;
  repeated string media_urls = 4;
  int64 created_at = 5;
}

message BatchGetPostsRequest {
  repeated string post_ids = 1;
}

message BatchGetPostsResponse {
  repeated GetPostResponse posts = 1;
}
```

---

## 3. Timeline Fan-Out Architecture: Push vs. Pull Models

When a user posts a photo or video, the system must update the home timelines of their followers. We use a hybrid model combining **Fan-Out-on-Write (Push)** and **Fan-Out-on-Read (Pull)**.

```
       [ Post Created ] ---> [ Kafka Event ] ---> [ Fan-Out Workers ]
                                                     |
             +---------------------------------------+
             | (Iterate active followers)
             v
       [ Redis LPUSH ] ---> [ LTRIM 800 ] (Keep timeline sizes bounded)
```

---

### 3.1 Fan-Out-on-Write (Push Model)
For users with average follower counts (under 10,000), new posts are pushed directly to their followers' timeline caches:
1. **Event Ingestion**: The Write Service publishes a `PostCreatedEvent` to a Kafka topic.
2. **Follower Queries**: A Fan-Out Worker consumes the event and queries the Social Graph Service to retrieve the author's followers.
3. **Presence Filtering**: The worker queries the Presence Service to identify active users (active in the last 30 days).
4. **Cache Updates**: The worker sends pipelined updates to the active followers' Redis timeline lists.

---

### 3.2 Fan-Out-on-Read (Pull Model)
For high-profile users (celebrities with millions of followers), fanning out a single post to all followers would saturate cache CPU and network bandwidth. Instead:
- **Write Bypass**: If the author's follower count exceeds 10,000, the fan-out step is bypassed. The post ID is written only to the author's timeline index (`celebrity_posts:author_id`).
- **On-Read Merging**: When a follower loads their home feed, the Feed Service fetches their pre-computed standard feed from Redis and merges it on-the-fly with the recent posts of any celebrity users they follow.

---

### 3.3 Fan-Out Pipeline Implementation
Below is a conceptual implementation of the background fan-out process:

```typescript
import { Kafka } from "kafkajs";
import Redis from "ioredis";

interface PostCreatedEvent {
  postId: string;
  authorId: string;
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
    await this.consumer.subscribe({ topic: "post-events", fromBeginning: false });

    await this.consumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return;
        const event: PostCreatedEvent = JSON.parse(message.value.toString());
        await this.executeFanOut(event);
      }
    });
  }

  private async executeFanOut(event: PostCreatedEvent) {
    // 1. Query Social Graph to retrieve followers list
    const followers = await graphClient.getFollowers(event.authorId);

    // Bypass standard fan-out for celebrity accounts
    if (followers.length > 10000) {
      await this.redisCluster.lpush(`celebrity_posts:${event.authorId}`, event.postId);
      await this.redisCluster.ltrim(`celebrity_posts:${event.authorId}`, 0, 99);
      return;
    }

    // 2. Batch process followers in chunks of 1,000 to manage memory
    const BATCH_SIZE = 1000;
    for (let i = 0; i < followers.length; i += BATCH_SIZE) {
      const batch = followers.slice(i, i + BATCH_SIZE);

      // 3. Filter for active users (active in the last 30 days)
      const activeFollowers = await presenceClient.filterActiveUsers(batch);

      // 4. Update active follower caches in parallel using Redis pipelines
      const pipeline = this.redisCluster.pipeline();
      activeFollowers.forEach((followerId) => {
        const feedKey = `timeline:${followerId}`;
        pipeline.lpush(feedKey, event.postId);
        pipeline.ltrim(feedKey, 0, 799); // Limit timeline size to 800 items
      });

      await pipeline.exec();
    }
  }
}
```

---

## 4. Pipeline Monitoring and SLO Targets

To maintain real-time delivery performance, we monitor the following metrics:

### 4.1 Fan-out Latency
The duration from when a post is uploaded to when it appears in the home feed caches of all active followers.
- **SLO Target**: P95 < 500ms, P99 < 2.0 seconds.

### 4.2 Kafka Consumer Lag
Measures the queue backlog of unprocessed messages. A rising lag indicates that additional fan-out worker pods should be provisioned.
- **Target Threshold**: Lag < 5,000 events per partition.
- **HPA Integration**: The Kubernetes autoscaler scales worker pod counts based on partition lag metrics.
