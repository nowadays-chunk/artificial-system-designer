# Dropbox Case Study - Chapter 3: Technology Selection and Standards

## 1. Evaluation Matrix: Storage Selection for Block Storage and Metadata

To persist file block registries and directory namespace trees, the storage engine must support transactional consistency and rapid indexing:

- **MySQL Master-Replica Clusters**: Selected for directory tree namespaces and metadata storage because relational databases support complex ACID transactions (critical for folder permissions and renaming) and B+ Tree indexing.
- **Custom Object Storage (e.g., Magic Pocket)**: Standardized to host block contents on a custom storage framework rather than public cloud instances, avoiding network egress fees and custom hardware limitations.

---

## 2. Block Deduplication and Hashing Standards

To minimize storage and network overhead:
- **SHA-256 Hash Identifiers**: Files are chunked into 4MB blocks, and each block is assigned a unique cryptographic SHA-256 hash. If two users upload identical files (or sections of files), only one physical copy is stored, reducing storage costs.

---

## 3. Metadata MySQL Table Schema Design

To model file namespaces in PostgreSQL/MySQL:

```sql
CREATE TABLE dropbox_metadata.file_nodes (
    node_id bigint NOT NULL AUTO_INCREMENT,
    parent_id bigint,
    user_id bigint NOT NULL,
    node_name varchar(255) NOT NULL,
    is_directory boolean DEFAULT false,
    file_sha250 varchar(64),
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (node_id),
    KEY idx_parent_user (parent_id, user_id)
);
```

This schema partitions file listings by `parent_id` and `user_id` to enable fast, single-query lookup of directory contents.
