# Twitter Case Study - Chapter 5: System Integration and Interoperability

## 1. High-Performance Inter-Service Communication Protocols

In an enterprise-scale microservices architecture handling 100,000+ internal remote procedure calls (RPCs) per second, the choice of communication protocol directly impacts service latency, CPU consumption, and network saturation. Legacy architectures relying on REST APIs over HTTP/1.1 with text-based JSON serialization incur high resource penalties:
- **TCP Connection Overhead**: HTTP/1.1 requires setting up distinct TCP connections or keeping connections open using keep-alive headers. However, it cannot multiplex requests over a single connection, leading to socket exhaustion under heavy load.
- **JSON Serialization CPU Overhead**: Parsing and serializing text-based JSON strings consumes significant CPU cycles compared to binary serialization formats.
- **Header Size Inflation**: HTTP/1.1 headers are transmitted as uncompressed text strings, introducing substantial bandwidth overhead for small payloads.

To resolve these limitations, the Twitter infrastructure architecture standardizes on **gRPC running over HTTP/2** with **Protocol Buffers (protobuf)** as the binary serialization layer.

---

### 1.1 gRPC over HTTP/2 (Multiplexed Streams)

HTTP/2 replaces text-based transport with a binary framing layer. It splits HTTP requests and responses into independent binary frames and multiplexes them over a single, shared TCP connection.

```
  gRPC HTTP/2 Multiplexing:
  [ Ingress Gateway ] ===( Single TCP Connection )===> [ Routing Service ]
                             |--- Frame Stream A (PostTweet Request)
                             |--- Frame Stream B (GetTimeline Response)
                             |--- Frame Stream C (LogTelemetry Request)
```

By multiplexing streams over a single connection:
- **Eliminates Socket Exhaustion**: Services communicate via a persistent pool of TCP connections, avoiding connection setup overhead.
- **Reduces Latency**: Eliminates the TCP slow-start penalty by keeping connections active.
- **Saves Bandwidth**: Uses HPACK header compression to compress headers, reducing egress bandwidth requirements.

---

### 1.2 Protobuf Integration Contracts

We define gRPC interface contracts using Protocol Buffers (`proto3`). The following schema defines the core Tweet Service integration contract:

```protobuf
syntax = "proto3";

package twitter.integration.v1;

option go_package = "twitter/integration/v1;integrationv1";
option java_multiple_files = true;
option java_package = "com.twitter.integration.v1";

// Handles tweet creation, metadata retrieval, and batch reads.
service TweetService {
  rpc PostTweet(PostTweetRequest) returns (PostTweetResponse);
  rpc GetTweet(GetTweetRequest) returns (GetTweetResponse);
  rpc BatchGetTweets(BatchGetTweetsRequest) returns (BatchGetTweetsResponse);
}

message PostTweetRequest {
  string author_id = 1;
  string tweet_body = 2;
  repeated string media_urls = 3;
  int64 timestamp = 4;
}

message PostTweetResponse {
  string tweet_id = 1;
  int64 timestamp = 2;
  bool success = 3;
}

message GetTweetRequest {
  string tweet_id = 1;
}

message GetTweetResponse {
  string tweet_id = 1;
  string author_id = 2;
  string tweet_body = 3;
  repeated string media_urls = 4;
  int64 created_at = 5;
}

message BatchGetTweetsRequest {
  repeated string tweet_ids = 1;
}

message BatchGetTweetsResponse {
  repeated GetTweetResponse tweets = 1;
}
```

---

## 2. Distributed Social Graph Service (FlockDB Architecture)

A core challenge in microblogging platforms is managing user relationships: who follows whom, and who blocks whom. This data is managed by the **Social Graph Service (FlockDB)**.

FlockDB is a distributed graph database optimized for low-depth, high-degree traversals. It does not support multi-hop traversals (e.g. "find friends of friends"); instead, it is designed to answer two queries under 5ms:
1. **Forward Query**: "Who is User A following?" (used to assemble home timelines).
2. **Inverted Query**: "Who is following User A?" (used during tweet fan-out).

```
  FlockDB Index Partitioning:
  [ User A ID ] ---> [ Forward Index (Following) ] ----> [ User B ID, User C ID ]
  [ User A ID ] ---> [ Inverted Index (Followers) ] ---> [ User D ID, User E ID ]
```

### 2.1 Graph Index Storage Schema
Relationships are represented as directed edges stored in a MySQL backend sharded using the **Gizzard** framework:

```sql
CREATE TABLE flock_graph.edges (
    source_id bigint NOT NULL,
    target_id bigint NOT NULL,
    state tinyint NOT NULL, -- 0: Active, 1: Deleted, 2: Blocked, 3: Muted
    updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (source_id, target_id),
    KEY idx_target_state (target_id, state)
) ENGINE=InnoDB;
```

- **Forward Index (`PRIMARY KEY`)**: InnoDB tables cluster data physically by the primary key (`source_id`, `target_id`). This ensures that querying all users followed by `source_id` is a sequential disk read.
- **Inverted Index (`idx_target_state`)**: Allows fast retrieval of all active followers of a target user during the write fan-out pipeline.

---

## 3. Timeline Fan-Out Architecture: Push vs. Pull Models

When a user posts a tweet, the system must update the home timelines of their followers. We use a hybrid model combining **Fan-Out-on-Write (Push)** and **Fan-Out-on-Read (Pull)**.

```
       [ Tweet Post ] ---> [ Kafka Event ] ---> [ Fan-Out Workers ]
                                                     |
             +---------------------------------------+
             | (Iterate active followers)
             v
       [ Redis LPUSH ] ---> [ LTRIM 800 ] (Keep timeline sizes bounded)
```

---

### 3.1 Fan-Out-on-Write (Push Model)
For users with average follower counts (under 10,000), new tweets are pushed directly to their followers' timeline caches:
1. **Event Ingestion**: The Write Service publishes a `TweetCreatedEvent` to a Kafka topic.
2. **Follower Queries**: A Fan-Out Worker consumes the event and queries the Social Graph Service (FlockDB) to retrieve the author's followers.
3. **Presence Filtering**: The worker queries the Presence Service to identify active users (active in the last 30 days).
4. **Cache Updates**: The worker sends pipelined updates to the active followers' Redis timeline lists.

---

### 3.2 Fan-Out-on-Read (Pull Model)
For high-profile users (celebrities with millions of followers), fanning out a single tweet to all followers would saturate cache CPU and network bandwidth. Instead:
- **Write Bypass**: If the author's follower count exceeds 10,000, the fan-out step is bypassed. The tweet ID is written only to the author's timeline index (`celebrity_tweets:author_id`).
- **On-Read Merging**: When a follower loads their home feed, the Timeline Service fetches their pre-computed standard feed from Redis and merges it on-the-fly with the recent tweets of any celebrity users they follow.

---

### 3.3 Fan-Out Pipeline Implementation
Below is a conceptual implementation of the background fan-out process:

```typescript
import { Kafka } from "kafkajs";
import Redis from "ioredis";

interface TweetCreatedEvent {
  tweetId: string;
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
    await this.consumer.subscribe({ topic: "tweet-events", fromBeginning: false });

    await this.consumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return;
        const event: TweetCreatedEvent = JSON.parse(message.value.toString());
        await this.executeFanOut(event);
      }
    });
  }

  private async executeFanOut(event: TweetCreatedEvent) {
    // 1. Query FlockDB to retrieve followers list
    const followers = await flockClient.getFollowers(event.authorId);

    // Bypass standard fan-out for celebrity accounts
    if (followers.length > 10000) {
      await this.redisCluster.lpush(`celebrity_tweets:${event.authorId}`, event.tweetId);
      await this.redisCluster.ltrim(`celebrity_tweets:${event.authorId}`, 0, 99);
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
        pipeline.lpush(feedKey, event.tweetId);
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
The duration from when a tweet is posted to when it appears in the home feed caches of all active followers.
- **SLO Target**: P95 < 500ms, P99 < 2.0 seconds.

### 4.2 Kafka Consumer Lag
Measures the queue backlog of unprocessed messages. A rising lag indicates that additional fan-out worker pods should be provisioned.
- **Target Threshold**: Lag < 5,000 events per partition.
- **HPA Integration**: The Kubernetes autoscaler scales worker pod counts based on partition lag metrics.
