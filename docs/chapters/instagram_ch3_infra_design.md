# Instagram Case Study - Chapter 3: Technology Selection and Standards

## 1. Evaluation Matrix for Relational Metadata and Media Hosting

To support Instagram's metadata query requirements (e.g., fetching comments and likes associated with a media ID), the persistence tier must support efficient secondary indexing and complex queries.

```
       Metadata Store (PostgreSQL Primary/Replicas):
       [ Client Reads ] ---> [ Redis Cache Layer ]
                                   | (Cache Miss)
                                   v
                         [ PostgreSQL Replicas ]
```

- **PostgreSQL**: Selected for metadata storage due to its support for ACID transactions, robust B+ Tree indexing, and master-replica replication topologies.
- **Cassandra (Comparison)**: While Cassandra is optimized for write-heavy key-value schemas (like Twitter timelines), it lacks the transactional guarantees and relational capabilities required for Instagram's complex user-tagging and comment-threading data models.

---

## 2. Object Storage Selection: Amazon S3 vs. Custom Distributed Storage

Hosting petabytes of photo binaries requires highly available, cost-effective storage solutions. We compared:
- **Custom Distributed Storage (e.g., Ceph)**: Provides high compute control and avoids public cloud vendor lock-in, but introduces significant management overhead and maintenance costs.
- **Amazon S3**: Selected as the standard for object storage due to its durability guarantees (99.999999999% durability over a year), built-in replication, and automated lifecycle policies.

---

## 3. Storage Schema Design in PostgreSQL

To support high-throughput operations, database tables are partitioned horizontally:

```sql
CREATE TABLE instagram_metadata.media (
    media_id uuid NOT NULL,
    owner_id uuid NOT NULL,
    media_url varchar(255) NOT NULL,
    caption text,
    created_at timestamp NOT NULL,
    PRIMARY KEY (media_id, created_at)
) PARTITION BY RANGE (created_at);
```
Partitioning the `media` table by `created_at` timestamp ranges ensures that indexes for active, recent uploads remain small enough to fit within memory buffers.
