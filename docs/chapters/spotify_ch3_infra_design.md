# Spotify Case Study - Chapter 3: Technology Selection and Standards

## 1. Evaluation Matrix: Relational Database Sharding vs. NoSQL Keyspace

To store track metadata, user profiles, playlists, and followers at scale:

- **PostgreSQL with Manual Sharding**: Selected to persist core metadata. Since the data model is relational (e.g. users, playlists, tracks), maintaining relational mappings and transactional guarantees is essential. To scale past single-node write limitations, PostgreSQL database instances are sharded horizontally using the User ID hash.
- **Cassandra NoSQL Storage (Comparison)**: Optimized for write-heavy append-only keyspace logs, but it lacks the secondary indexing flexibility, query join capabilities, and transaction support required for complex relational queries.

---

## 2. In-Memory Cache Selection: Redis vs. Memcached

To host pre-computed user playlists and active session stores:
- **Redis Cluster**: Selected because it supports rich data structures (e.g., Sorted Sets, Lists, Hashes) in memory. This allows storing playlists as Sorted Sets (`ZSET`) indexed by tracks, enabling fast range queries and updates.
- **Memcached**: Excellent for simple key-value lookups (such as caching raw JSON track profiles), but its lack of complex data structures makes it less suitable for hosting dynamic playlist tracks.

---

## 3. Database Schema Design for Audio Metadata

To model tracks in sharded PostgreSQL:

```sql
CREATE TABLE spotify_metadata.tracks (
    track_id bigint NOT NULL, -- Snowflake ID (combines timestamp, shard ID, seq ID)
    artist_id bigint NOT NULL,
    audio_url varchar(512) NOT NULL,
    title varchar(255) NOT NULL,
    duration int NOT NULL, -- in seconds
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (artist_id, track_id)
) PARTITION BY HASH (artist_id);
```

This schema partitions the `tracks` table by `artist_id` to distribute write actions across database shards and group an artist's tracks sequentially on disk.
