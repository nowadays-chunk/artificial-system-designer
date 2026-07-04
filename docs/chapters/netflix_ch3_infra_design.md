# Netflix Case Study - Chapter 3: Technology Selection and Standards

## 1. Evaluation Matrix: Cassandra Distributed Keyspace vs. Relational Sharding

To store video catalog metadata, user playback histories, recommendation weights, and asset configurations at scale:

- **Cassandra Distributed Keyspace**: Selected to store playback histories and catalog tables. Cassandra is designed for multi-region active-active layouts, using a masterless ring architecture that writes data to local nodes and syncs modifications asynchronously across geographic regions. This allows Netflix to support local writes with sub-millisecond latencies while surviving complete regional outages.
- **Vitess / MySQL Sharding (Comparison)**: Excellent for strict ACID transactions (such as billing systems), but maintaining synchronous replication across global regions introduces network write latency and operational complexity.

---

## 2. In-Memory Cache Selection: Redis vs. Memcached (EVCache)

To host active sessions, recommendation caches, and playback manifest layouts:
- **EVCache (Distributed Memcached wrapper)**: Netflix standardizes on **EVCache**, an in-house distributed caching system built on top of Memcached. EVCache provides multi-region replication, low-latency lookups, and integration with AWS microservices.
- **Redis Cluster**: Redis is a strong alternative with rich data structures, but EVCache's optimization for simple key-value payloads and large-scale AWS replication fit Netflix's caching architecture requirements.

---

## 3. Database Schema Design for Video Catalog

To model video catalog metadata in Cassandra:

```sql
CREATE KEYSPACE netflix_catalog WITH replication = {
    'class': 'NetworkTopologyStrategy',
    'us-east': 3,
    'us-west': 3
};

CREATE TABLE netflix_catalog.videos (
    video_id uuid,
    title text,
    description text,
    release_year int,
    genres set<text>,
    playback_urls map<text, text>, -- Maps resolution to CDN URL
    PRIMARY KEY (video_id)
);
```

This schema partitions catalog data by `video_id` to distribute read and write traffic evenly across Cassandra ring nodes.
