# WhatsApp Case Study - Chapter 3: Technology Selection and Standards

## 1. Evaluation Matrix: Programming Platform and Storage

To maintain millions of concurrent socket connections, the gateway runtime platform must support extremely lightweight processes and asynchronous networking:

- **Erlang/OTP (BEAM VM)**: Selected for chat gateways. Erlang processes are managed in user-space by the BEAM runtime (rather than operating system threads), requiring only ~2KB of memory overhead per process. Erlang's actor model and supervision trees provide native fault tolerance and let a single server node handle over 2 million concurrent TCP connections.
- **Node.js/Go (Comparison)**: Go is a strong alternative, but Go's goroutines consume 2-8KB initially and lack Erlang's battle-tested process isolation and hot-code loading mechanisms.

---

## 2. Storage Selection: MySQL Shards vs NoSQL

For offline message buffering:
- **Sharded MySQL (InnoDB Storage Engine)**: Selected to store offline messages. Since offline messages are deleted immediately upon delivery, the database operations are append-heavy and delete-heavy. Using sharded MySQL with InnoDB tables partitioned by User ID allows fast sequential writes and indexes that fit entirely in memory.
- **Redis**: Selected to store presence cache and user session mapping records due to its low latency and support for volatile keys (automated TTL expiration).

---

## 3. Database Schema Design for Offline Messages

To model offline messages in sharded MySQL:

```sql
CREATE TABLE whatsapp_offline.offline_messages (
    message_id varchar(64) NOT NULL,
    recipient_id bigint NOT NULL,
    sender_id bigint NOT NULL,
    payload blob NOT NULL, -- Encrypted message block
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (recipient_id, message_id)
) ENGINE=InnoDB;
```

This schema uses `recipient_id` as the primary partitioning/clustering key, grouping a user's pending offline messages sequentially on disk to allow single-query retrievals and deletions on reconnect.
