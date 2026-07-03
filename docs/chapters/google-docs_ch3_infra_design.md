# Google Docs Case Study - Chapter 3: Technology Selection and Standards

## 1. Evaluation Matrix: Storage Selection for Document Snapshots and Operations Log

To persist user document contents and the real-time editing operations log, the storage engine must support low-latency lookups:

- **PostgreSQL Master-Replica Clusters**: Selected for document snapshots and metadata storage because relational databases support complex ACID transactions and structured document layout schemas.
- **Redis Cluster**: Selected to cache real-time operations logs (OT sequence records) because it supports low-latency range operations (`LRANGE`, `LPUSH`).

---

## 2. Real-Time Sync Protocols: WebSockets vs. SSE (Server-Sent Events)

To push document updates to client editors:
- **WebSockets**: Selected as the communication standard because it provides full-duplex, bi-directional channels over a single TCP connection, allowing clients to send edits and receive synchronization updates with minimal latency.

---

## 3. Operations Log PostgreSQL Table Schema Design

To model document revision operations in PostgreSQL:

```sql
CREATE TABLE google_docs_metadata.revision_operations (
    document_id uuid NOT NULL,
    revision_version bigint NOT NULL,
    user_id bigint NOT NULL,
    op_type varchar(10) NOT NULL, -- INSERT, DELETE
    op_position int NOT NULL,
    op_content text,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (document_id, revision_version)
);
```

This schema partitions operations by `document_id`, grouping revisions on disk to enable fast, single-query retrieval of document histories.
