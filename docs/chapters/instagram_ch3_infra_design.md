# Instagram Case Study - Chapter 3: Technology Selection and Standards

## 1. Evaluation Matrix: Relational Database Sharding vs. NoSQL Keyspace

To store post metadata, user relations, comments, and likes at scale:

- **PostgreSQL with Manual Sharding**: Selected to persist core metadata. Since the data model is relational (e.g. users, posts, comments, likes), maintaining relational mappings and transactional guarantees is essential. To scale past single-node write limitations, PostgreSQL database instances are sharded horizontally using the User ID hash.
- **Cassandra NoSQL Storage (Comparison)**: Optimized for write-heavy append-only keyspace logs, but it lacks the secondary indexing flexibility, query join capabilities, and transaction support required for complex relational queries.

---

## 2. In-Memory Cache Selection: Redis vs. Memcached

To host pre-computed user timelines and active session stores:
- **Redis Cluster**: Selected because it supports rich data structures (e.g., Sorted Sets, Lists, Hashes) in memory. This allows storing user timelines as Sorted Sets (`ZSET`) indexed by post timestamp, enabling fast range queries and updates during fan-out.
- **Memcached**: Excellent for simple key-value lookups (such as caching raw JSON post bodies), but its lack of complex data structures makes it less suitable for hosting dynamic user feed timelines.

---

## 3. Database Schema Design for Media Metadata

To model user posts in sharded PostgreSQL:

```sql
CREATE TABLE instagram_metadata.posts (
    post_id bigint NOT NULL, -- Snowflake ID (combines timestamp, shard ID, seq ID)
    author_id bigint NOT NULL,
    media_url varchar(512) NOT NULL,
    caption text,
    likes_count int DEFAULT 0,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (author_id, post_id)
) PARTITION BY HASH (author_id);
```

This schema partitions the `posts` table by `author_id` to distribute write actions across database shards and group a creator's posts sequentially on disk.
