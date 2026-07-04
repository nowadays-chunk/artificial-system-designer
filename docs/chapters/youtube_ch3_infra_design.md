# YouTube Case Study - Chapter 3: Technology Selection and Standards

## 1. Evaluation Matrix: Relational Database Sharding vs. NoSQL Keyspace

To store video catalog metadata, user uploads profiles, comments, and view statistics at scale:

- **Vitess (Distributed PostgreSQL/MySQL Sharding)**: Selected to scale the database tier. Vitess acts as a proxy layer on top of sharded SQL instances. It handles query routing, connection pooling, and online schema migrations while preserving relational features (ACID guarantees, indexing structures).
- **Cassandra NoSQL Storage (Comparison)**: Optimized for write-heavy flat logs, but it lacks the secondary indexing flexibility, query join capabilities, and transaction support required for complex relational queries.

---

## 2. In-Memory Cache Selection: Redis vs. Memcached

To host active playback sessions, dynamic recommendation feeds, and user configurations:
- **Redis Cluster**: Selected because it supports rich data structures (e.g., Sorted Sets, Lists, Hashes) in memory. This allows storing playback segments metadata as Hashes, enabling fast range queries and updates.
- **Memcached**: Excellent for simple key-value lookups (such as caching raw JSON video profile structures), but its lack of complex data structures makes it less suitable for hosting dynamic playback manifests metadata.

---

## 3. Database Schema Design for Video Catalog

To model videos in sharded Vitess:

```sql
CREATE TABLE youtube_metadata.videos (
    video_id varchar(11) NOT NULL,
    uploader_id uuid NOT NULL,
    title varchar(255) NOT NULL,
    video_url varchar(255) NOT NULL,
    duration int NOT NULL, -- in seconds
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (uploader_id, video_id)
) ENGINE=InnoDB;
```

This schema partitions the `videos` table by `uploader_id` to distribute write actions across database shards and group creator videos sequentially on disk.
