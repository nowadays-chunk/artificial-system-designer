# Dropbox Case Study - Chapter 3: Technology Selection and Standards

## 1. Evaluation Matrix: Relational Database Sharding vs. NoSQL Keyspace

To store file metadata, namespace trees, and block indexes at scale:

- **PostgreSQL with Manual Sharding**: Selected to persist file metadata and directory trees. Since the data model is hierarchical and relational (files within folder subdirectories), maintaining strong ACID guarantees is essential. To scale past single-node write limitations, PostgreSQL instances are sharded horizontally using the Namespace ID hash.
- **Cassandra NoSQL Storage (Comparison)**: Optimized for write-heavy flat logs, but it lacks the hierarchical transaction support, indexing flexibility, and foreign key constraints required for complex directory namespace trees.

---

## 2. In-Memory Cache Selection: Redis vs. Memcached

To host active sync states and user sessions:
- **Redis Cluster**: Selected because it supports rich data structures (e.g., Sorted Sets, Lists, Hashes) in memory. This allows storing file block indices as Hashes, enabling fast lookups and atomic field updates.
- **Memcached**: Excellent for simple key-value lookups (such as caching raw JSON file profiles), but its lack of complex data structures makes it less suitable for hosting dynamic sync tables.

---

## 3. Database Schema Design for File Metadata

To model files in sharded PostgreSQL:

```sql
CREATE TABLE dropbox_metadata.files (
    file_id uuid NOT NULL,
    parent_folder_id uuid,
    name varchar(255) NOT NULL,
    size bigint NOT NULL,
    version int NOT NULL DEFAULT 1,
    checksum varchar(64) NOT NULL, -- SHA-256 hash of the entire file
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (parent_folder_id, file_id)
) PARTITION BY HASH (parent_folder_id);
```

This schema partitions the `files` table by `parent_folder_id` to distribute write actions across database shards and group directory files sequentially on disk.
