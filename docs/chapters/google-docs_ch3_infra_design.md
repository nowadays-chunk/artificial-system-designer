# Google Docs Case Study - Chapter 3: Technology Selection and Standards

## 1. Evaluation Matrix: Relational Database Sharding vs. NoSQL Keyspace

To store document metadata, directory hierarchies, and consolidated text snapshots at scale:

- **PostgreSQL with Manual Sharding**: Selected to persist core document snapshots. Since the data model is hierarchical (documents within directory trees, sharing metadata and permission mappings), maintaining strong ACID guarantees is essential. To scale past single-node write limitations, PostgreSQL instances are sharded horizontally using the Document ID hash.
- **Cassandra NoSQL Storage (Comparison)**: Optimized for write-heavy flat lists, but it lacks the recursive query support, index flexibility, and transaction capabilities required for complex folder metadata.

---

## 2. In-Memory Cache Selection: Redis vs. Memcached

To host active editing sessions, conflict resolution queues, and user presence registries:
- **Redis Cluster**: Selected because it supports rich data structures (e.g., Lists, Sorted Sets, Hashes) in memory. This allows storing document edit deltas as Lists (`LIST`), enabling fast sequential appends, range queries, and atomic push/pop operations.
- **Memcached**: Excellent for simple key-value lookups (such as caching static document profiles), but its lack of complex data structures makes it less suitable for hosting dynamic collaborative edit deltas.

---

## 3. Database Schema Design for Document Snapshots

To model document snapshots in sharded PostgreSQL:

```sql
CREATE TABLE google_docs_metadata.snapshots (
    document_id uuid NOT NULL,
    version int NOT NULL,
    content text NOT NULL, -- Compressed document markup
    checksum varchar(64) NOT NULL, -- SHA-256 hash of the content
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (document_id, version)
) PARTITION BY HASH (document_id);
```

This schema partitions the `snapshots` table by `document_id` to distribute write actions across database shards and group version histories sequentially on disk.
