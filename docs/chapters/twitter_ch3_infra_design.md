# Twitter Case Study - Chapter 3: Technology Selection and Standards

## 1. Architectural Selection Evaluation Framework

In high-scale infrastructure engineering, technology selection must bypass vendor marketing claims and rely on a quantitative evaluation framework. Technologies are graded across five dimensions:

1. **Throughput Density**: Request/event handling capacities per resource core.
2. **Latency Bounds**: P95 and P99 transit and execution limits under peak saturation loads.
3. **Consistency vs. Availability Profiles (CAP Theorem)**: Choosing AP (Availability / Partition Tolerance) configurations for write queues and feeds vs. CP (Consistency / Partition Tolerance) configurations for user billing and authentication.
4. **Write-Path Storage Engines**: Evaluating Log-Structured Merge-Trees (LSM-Trees) vs. B-Trees for write-to-read profiles.
5. **Operations Cost and Maintainability**: Open standards compliance, cluster scaling mechanics, and telemetry visibility.

---

## 2. Ingress & Routing Tier: NGINX vs. Envoy

The ingress layer terminates external user traffic and routes paths to backend microservices. The candidate options evaluated were **NGINX** (process-based worker architecture) and **Envoy Proxy** (thread-per-connection event-driven C++ mesh gateway).

```
         +-----------------------------------------------------------+
         |                       Feature Comparison                  |
         +-----------------------------------------------------------+
         |  Dimension        |  NGINX             |  Envoy Proxy     |
         +-------------------+--------------------+------------------+
         |  Architecture     |  Process-Per-Core  |  Thread-Per-Core |
         |  Service Mesh     |  Limited/Plugin    |  Native (xDS)    |
         |  Multiplexing     |  Medium            |  High (HTTP/2)   |
         |  Configuration    |  Static Reload     |  Dynamic APIs    |
         +-----------------------------------------------------------+
```

### 2.1 Process vs. Thread Threading Models
- **NGINX**: Uses a master-worker process model. Each worker process is single-threaded, running an event loop to handle connections. While highly robust, configuration updates require a process reload (`nginx -s reload`), which can disrupt active connection links at scale.
- **Envoy Proxy**: Uses a thread-per-core event loop model built on `libevent`. Envoy handles configuration updates dynamically without connection loss through its **xDS Discovery APIs** (LDS, RDS, CDS, EDS). This is critical for Twitter, where service instances scale dynamically.

### 2.2 Protocol Support & Service Mesh Integration
Envoy provides native support for **HTTP/2 and gRPC multiplexing**, along with deep observability (emitting Prometheus metrics and zipkin/jaeger tracing headers per request). Envoy was selected as the internal service mesh gateway proxy, while Cloudflare handles edge Anycast CDN caching.

---

## 3. Messaging Tier: Apache Kafka vs. RabbitMQ

For the asynchronous write pipeline (buffering new tweets before fanning them out to follower feed caches), we compared **Apache Kafka** (log-structured commit log) and **RabbitMQ** (AMQP message broker).

### 3.1 Storage Architecture and Message Retention
- **RabbitMQ**: Messages are pushed to queues, processed by consumers, and deleted once acknowledged. The queue state is managed in memory; as queues grow, memory saturation degrades throughput.
- **Apache Kafka**: An append-only partition log written directly to disk files. Messages are not deleted upon consumption; they persist based on time-based retention configurations. This allows multiple consumer groups (e.g., Feed Fan-Out, Search Indexer, Analytics Engine) to read the same event stream independently.

### 3.2 Partitioning and Horizontal Scale
Kafka partitions topics using the publisher's key:
$$\text{Partition ID} = \text{Hash}(\text{User ID}) \pmod{\text{Partition Count}}$$
This ensures that all tweets from a specific User ID are written to the same partition log, maintaining strict chronological order. Active consumers bind to individual partitions, enabling horizontal scaling without lock contention. Kafka was selected as the asynchronous buffering standard.

---

## 4. Cache Tier: Redis Cluster vs. Memcached

Storing pre-computed home feeds in memory requires a cache tier capable of low-latency range queries. The candidates were **Memcached** (multithreaded simple key-value store) and **Redis Cluster** (single-threaded advanced data structures engine).

### 4.1 Data Structure Requirements
- **Memcached**: Simple key-value store. Storing a timeline requires serializing the entire feed array (e.g., as JSON or Protocol Buffers) and rewriting the entire object on every update. This introduces write amplification:
  $$\text{Write Overhead} = O(N) \quad \text{where } N \text{ is timeline length}$$
- **Redis Cluster**: Native support for list types (`LPUSH`, `LRANGE`) and sorted sets (`ZADD`, `ZRANGEBYSCORE`). Fanning out a tweet requires fanning out the Tweet ID to a Redis list:
  $$\text{Write Overhead} = O(1) \quad \text{via } \text{LPUSH timeline:user\_id [tweet\_id]}$$
  We limit timeline lists to the latest 800 items using `LTRIM`. Redis was selected for the Home Feed cache tier due to these native data structures.

---

## 5. Persistence Tier: Apache Cassandra vs. PostgreSQL

The database tier must store billions of tweet records reliably. We compared a wide-column NoSQL store (**Apache Cassandra**) and a relational database (**PostgreSQL**).

### 5.1 Storage Engines: LSM-Trees vs. B+ Trees
- **PostgreSQL**: Employs B+ Trees to index datasets. B+ Trees require random disk writes to update leaf nodes when records are inserted, introducing disk head seek latency and page split overhead.
- **Apache Cassandra**: Uses Log-Structured Merge-Trees (LSM-Trees). Writes are written sequentially to an in-memory buffer (**MemTable**) and appended to a sequential disk commit log. MemTables are periodically flushed to disk as immutable **SSTables** (Sorted String Tables). This architecture converts random writes into highly efficient sequential writes:
  $$\text{Write Complexity} = O(1)$$

```
  Write Pipeline (Cassandra LSM-Tree):
  [ Client Write ] ---> [ MemTable (RAM) ] ---> [ Commit Log (Sequential Disk) ]
                                | (periodic flush)
                                v
                           [ SSTable (Disk) ]
```

### 5.2 Schema Design for Tweet Storage
Cassandra's partitioning keys allow modeling tweets to be stored sequentially on disk by User ID, optimized for reads:

```sql
CREATE KEYSPACE twitter_persistence
WITH replication = {'class': 'NetworkTopologyStrategy', 'us-east-1': 3};

CREATE TABLE twitter_persistence.tweets (
    author_id uuid,
    tweet_id timeuuid,
    tweet_body text,
    media_urls list<text>,
    PRIMARY KEY (author_id, tweet_id)
) WITH CLUSTERING ORDER BY (tweet_id DESC);
```

- **Partition Key (`author_id`)**: Determines which node in the cluster ring stores the partition.
- **Clustering Key (`tweet_id`)**: Stores tweets sequentially on disk in reverse chronological order.

For relational metadata (user registrations, follow relationships, security credentials), PostgreSQL was selected to enforce ACID guarantees.
