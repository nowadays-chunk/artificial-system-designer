# Twitter Case Study - Chapter 1: Infrastructure Architecture Design

## 1. Introduction and System Scale Requirements

Designing the infrastructure architecture for a microblogging platform at the scale of Twitter (500M+ Daily Active Users) presents a classic high-throughput, low-latency system design challenge. Unlike traditional relational web applications where read and write loads are roughly symmetric, microblogging systems exhibit extreme read-to-write asymmetry. At peak capacity, the system must process:
- **Write Volume**: Average of 6,000 tweets posted per second, peaking at 12,000+ tweets per second.
- **Read Volume**: Average of 300,000 home timeline reads per second, peaking at over 1,000,000 requests per second.

This 50:1 read-to-write ratio dictates the fundamental design of the system. An infrastructure architect must construct logical and physical models that isolate the processing pipelines of writes from reads to ensure that heavy read traffic does not contend with write ingestion, and that write bursts do not degrade timeline load performance.

---

## 2. Theoretical Foundations: Push vs. Pull Models

### The Pull Model (Query on Read)
In a pure pull model, when a user (e.g., Bob) requests his home timeline, the system performs a dynamic query across the databases of all users Bob follows:
$$\text{Timeline} = \bigcup_{u \in \text{Following}(B)} \text{Tweets}(u) \quad \text{sorted by timestamp DESC}$$
- **Write Path Complexity**: $O(1)$. Posting a tweet simply requires appending a record to a database table indexed by user ID.
- **Read Path Complexity**: $O(F \log(T \cdot F))$, where $F$ is the number of followed users (fan-out) and $T$ is the number of tweets per user. Gathering, merging, and sorting records from hundreds of disparate database partitions in real-time is extremely expensive, introducing high latency and severe database IOPS saturation under heavy read pressure.

### The Push Model (Fan-Out on Write)
To achieve sub-100ms read latencies, the architecture shifts the computational burden from the read path to the write path. When a user (e.g., Alice) posts a tweet, the system instantly duplicates the tweet ID into the pre-computed home timeline cache (in-memory feeds) of every follower Alice has.
- **Read Path Complexity**: $O(1)$. Loading a home timeline requires a simple range query from an in-memory Redis list cache.
- **Write Path Complexity**: $O(F)$, where $F$ is the follower count. The write path must execute graph traversals to locate follower lists and dispatch write updates to hundreds of thousands of active timeline caches.

### Hybrid Architectural Model
For users with average follower counts (under 5,000), the push model (Fan-Out on Write) is highly efficient. However, for high-profile users (celebrities with millions of followers), a push model triggers a "celebrity write bottleneck," where fanning out a single tweet to 50 million follower caches consumes massive network bandwidth and memory cache IOPS, delaying delivery by minutes.

The target design utilizes a hybrid model:
1. **Standard Users**: Tweet fanned out to active follower timeline caches (Push).
2. **Celebrity Users**: Tweets are *not* fanned out. Instead, when a standard follower loads their timeline, the system fetches the pre-computed standard feed from Redis and merges it on-the-fly (Pull) with the active tweets of any celebrities the user follows.

---

## 3. Logical Tier Architecture

The system is structured into six decoupled logical tiers, separating traffic ingestion from background processing and persistent storage:

```
  [ Ingress & Routing Tier (Anycast IP, Cloudflare CDN, NGINX Gateways) ]
                                   |
         +-------------------------+-------------------------+
         | (Write Path)                                      | (Read Path)
         v                                                   v
  [ Write Service Tier ]                              [ Read Service Tier ]
  (Tweet Ingestion API)                               (Timeline Service)
         |                                                   |
         v                                                   |
  [ Ingestion Tier ]                                         |
  (Kafka Partitioned Bus)                                    |
         |                                                   |
         v                                                   |
  [ Fan-Out Worker Tier ]                                    v
  (Graph traversal consumers) ----------------------> [ Caching Tier ]
         |                                            (Redis Cluster Feeds)
         v                                                   ^
  [ Persistence Tier ]                                       | (Cache Miss)
  (Cassandra Tweet Store) -----------------------------------+
```

### 3.1 Ingress & Routing Tier
Responsible for terminating SSL/TLS connections, filtering malicious payloads, and routing requests based on path routing parameters.
- **Anycast IP**: Distributes incoming HTTP requests to the geographically nearest Point of Presence (PoP) edge node.
- **Global CDN**: Caches static assets, profile pictures, and media attachments close to users.
- **API Gateways**: NGINX reverse proxies validate headers, resolve user identities, and route paths (e.g., `/api/v1/tweets` to the Write Service, `/api/v1/timeline` to the Read Service).

### 3.2 Write Service Tier
A high-performance stateless microservice layer optimized for write ingestion throughput. It parses new tweet payloads, sanitizes inputs, assigns globally unique Snowflake IDs, and commits metadata.

### 3.3 Messaging & Ingestion Tier
Acts as an asynchronous buffer protecting downstream workers from traffic spikes.
- **Apache Kafka**: Serves as the commit log bus. Tweet writes are published to partitioned Kafka topics (e.g., `tweet-events`), partitioned by User ID to ensure sequential consistency.

### 3.4 Fan-Out Worker Tier
A background processing cluster consuming events from Kafka.
- **Social Graph In-Memory Service**: Workers query this service to retrieve active follower lists.
- **Home Feed Hydrator**: Traverses followers and issues bulk pipelined updates to active follower timeline lists in the Caching Tier.

### 3.5 Caching Tier
The authoritative real-time read layer.
- **Redis Cluster**: Home timelines are stored as Redis lists carrying a maximum of 800 tweet IDs per user. When a user requests their feed, the Read Service queries this cache to get the list under 10ms.

### 3.6 Persistence Tier
The long-term durable database layer.
- **Apache Cassandra**: Serves as the wide-column tweet store. Tweet bodies are indexed by User ID and Tweet ID.
- **PostgreSQL**: Manages highly relational ACID datasets (user profiles, auth credentials, billing, and system configurations).

---

## 4. Detailed Technical Flow

```
Alice                    API Gateway                 Kafka                  Fan-Out Worker           Redis Cache
  |                          |                         |                          |                       |
  |--- POST /tweet --------->|                         |                          |                       |
  |    (Text body)           |--- Publish event ------>|                          |                       |
  |                          |    (User ID, Tweet ID)  |                          |                       |
  |<-- HTTP 202 Accepted ----|                         |--- Consume event ------->|                       |
  |                          |                         |    (Query followers)     |                       |
  |                          |                         |                          |--- Bulk LPUSH ------->|
  |                          |                         |                          |    (Follower lists)   |
```

### The Write Execution Flow (Alice posts a tweet)
1. **Client Submission**: Alice submits a post. The request hits the API Gateway via HTTPS.
2. **Sanitization and ID Generation**: Gateway forwards the request to the Write Service. The service generates a 64-bit Snowflake ID (incorporating timestamp, worker node ID, and sequence counter) and writes the tweet body to the Apache Cassandra database.
3. **Event Publishing**: Write Service publishes a message payload containing `{ tweet_id, author_id, timestamp }` to the `tweet-events` Kafka topic.
4. **Queue Acknowledgment**: The client receives an `HTTP 202 Accepted` response. The actual delivery to followers happens asynchronously.
5. **Worker Processing**: A Fan-Out Worker consumes the event. It queries the Social Graph Service to retrieve the list of Alice's followers.
6. **Timeline Cache Injection**: The worker filters the list for active users (active in the last 30 days) and runs an `LPUSH` pipeline command to prepend the new `tweet_id` to the Redis lists of active followers.

### The Read Execution Flow (Bob requests his timeline)
1. **Timeline Query**: Bob's client sends a request for the home timeline. The API Gateway routes it to the Read/Timeline Service.
2. **Cache Lookup**: The Timeline Service queries Bob's Redis list `timeline:user_bob`.
3. **Feeds Merging**: The service fetches the cached tweet IDs. It checks if Bob follows any celebrity users. If yes, it fetches active celebrity tweet IDs and merges them chronologically using a priority queue.
4. **Object Hydration**: The service runs a bulk multi-get query against Cassandra or a read-through Memcached layer using the merged tweet IDs to retrieve the actual tweet bodies, user handles, and media links.
5. **Response Delivery**: The hydrated JSON timeline is returned to Bob.

---

## 5. Architectural Trade-offs and Calculations

### Memory Cache Calculations for Redis Home Timelines
- **Active User Feeds**: 300 million monthly active users.
- **Timeline Size**: Store up to 800 tweet IDs per active user timeline.
- **Tweet ID Size**: 64-bit integer (8 bytes).
- **Metadata Overhead**: Redis list node pointers average 32 bytes per entry.
- **Total size per timeline list**:
  $$\text{Size} = 800 \times (8 \text{ bytes (ID)} + 32 \text{ bytes (pointer)}) = 32,000 \text{ bytes (32 KB)}$$
- **Total Cluster Memory Requirement**:
  $$\text{Memory} = 300,000,000 \times 32 \text{ KB} = 9.6 \text{ Terabytes of RAM}$$

To achieve high availability and prevent data loss, the caching tier must run replication copies ($N=2$), requiring $19.2 \text{ TB}$ of RAM. Partitioning the Redis keyspace across 64-node clusters (each with 300GB of RAM) provides sufficient headroom for traffic surges.
