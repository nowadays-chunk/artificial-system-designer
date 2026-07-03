# Twitter Case Study - Chapter 5: System Integration and Interoperability

## 1. Inter-Service Communication: gRPC over HTTP/2

In a high-scale microservices architecture, network performance depends heavily on the communication protocols between nodes. Historically, systems relied on REST APIs over HTTP/1.1, transferring JSON payloads. This model introduces significant latency at scale due to:
- **Head-of-Line (HoL) Blocking**: HTTP/1.1 requires a separate TCP connection for each concurrent request, leading to socket exhaustion.
- **Verbose Text Serialization**: Parsing JSON strings consumes substantial CPU cycles compared to binary formats.

To address this, our microservice architecture standardizes on **gRPC** running over **HTTP/2**.

```
    gRPC over HTTP/2 (Multiplexed Streams):
    [ Client Service ] ===( Single TCP Connection )===> [ Target Service ]
                              |--- Stream A (Req/Res 1)
                              |--- Stream B (Req/Res 2)
                              |--- Stream C (Req/Res 3)
```

### 1.1 HTTP/2 Multiplexing
HTTP/2 supports request-response multiplexing over a single shared TCP connection. It breaks payloads down into binary frames and interleaves them. This design:
- Prevents connection setup overhead.
- Minimizes TCP slow-start performance penalties.
- Enables bi-directional streaming.

### 1.2 Protocol Buffers Schema Definition
We define clear API contracts using Protocol Buffers (`proto3`). The following schema defines the core Tweet Service integration contract:

```protobuf
syntax = "proto3";

package twitter.integration.v1;

service TweetService {
  rpc PostTweet(PostTweetRequest) returns (PostTweetResponse);
  rpc GetTweet(GetTweetRequest) returns (GetTweetResponse);
  rpc BatchGetTweets(BatchGetTweetsRequest) returns (BatchGetTweetsResponse);
}

message PostTweetRequest {
  string author_id = 1;
  string tweet_body = 2;
  repeated string media_urls = 3;
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

## 2. Social Graph Service Integration

Calculating timelines requires low-latency queries on the user's social graph to answer: "Who is this user following?" and "Who is following this user?"

### 2.1 FlockDB Graph Topology
We model social graph relationships using a distributed graph database layout (similar to FlockDB), optimized for low-depth, high-degree traversals.
- **Edges Table Schema**:
  ```sql
  CREATE TABLE social_graph.edges (
      source_id bigint,
      target_id bigint,
      state state_enum, // active, blocked, muted
      updated_at timestamp,
      PRIMARY KEY (source_id, target_id)
  );
  ```

To support both queries efficiently, the edges table is stored in two index mappings:
1. **Forward Index (`source_id` $\rightarrow$ `target_id`)**: Finds all accounts a user is following.
2. **Inverted Index (`target_id` $\rightarrow$ `source_id`)**: Finds all followers of an account (used during fan-out).

---

## 3. Timeline Fan-Out Pipeline Implementation

When a user posts a tweet, the Fan-Out pipeline distributes the Tweet ID to the home feed caches of active followers.

```
  Ingestion Flow:
  [ Tweet Post ] ---> [ Kafka Topic ] ---> [ Fan-Out Worker ]
                                                    |
         +------------------------------------------+
         | (Iterate active followers)
         v
  [ Redis LPUSH ] ---> [ LTRIM 800 ] (Keep feed size bounded)
```

### 3.1 Fan-Out Worker Loop Algorithm
Below is a conceptual implementation of the background fan-out process:

```typescript
interface TweetEvent {
  tweetId: string;
  authorId: string;
  timestamp: number;
}

async function handleTweetFanOut(event: TweetEvent) {
  // 1. Fetch followers list using the Inverted Index
  const followers = await socialGraph.getFollowers(event.authorId);

  // 2. Batch process followers to prevent memory saturation
  const BATCH_SIZE = 1000;
  for (let i = 0; i < followers.length; i += BATCH_SIZE) {
    const batch = followers.slice(i, i + BATCH_SIZE);

    // 3. Filter for active users (active in the last 30 days)
    const activeFollowers = await presenceService.filterActiveUsers(batch);

    // 4. Update active follower caches in parallel using Redis pipelines
    const redisPipeline = redisCluster.pipeline();
    activeFollowers.forEach((followerId) => {
      const feedKey = `timeline:${followerId}`;
      
      // Prepend Tweet ID to the user's timeline list
      redisPipeline.lpush(feedKey, event.tweetId);
      
      // Keep list size bounded to the latest 800 entries
      redisPipeline.ltrim(feedKey, 0, 799);
    });

    await redisPipeline.exec();
  }
}
```

---

## 4. Architectural Verification Metrics

To ensure system reliability, we monitor key pipeline metrics:
- **Fan-out Latency P99**: The time elapsed from when Alice posts a tweet to when the last active follower's cache is updated. The target SLO is **P99 < 2 seconds** under normal load.
- **Kafka Consumer Lag**: Measures the backlog of unconsumed messages in the write pipeline. Significant consumer lag indicates the need to provision additional fan-out worker instances.
