# Instagram Case Study - Chapter 7: Performance and Availability Management

## 1. Geo-Distributed Content Delivery Networks (CDNs)

Loading high-resolution images and video binaries over long distances introduces significant latency. To optimize playback performance, the platform routes all static media delivery traffic through a global network of **CDN Edge Servers**.

```
  Ingress Traffic Route:
  [ Client Request ] ---> [ Geo-DNS Resolution ] ---> [ Nearest CDN Edge ]
                                                             | (Cache Hit)
                                                             +===> Return Media
                                                             | (Cache Miss)
                                                             v
                                                     [ Origin S3 Bucket ]
```

### 1.1 Cache Retention Policies
CDN edge caches use Least Recently Used (LRU) eviction algorithms. Popular media posts remain cached near active users, while older, infrequently accessed posts are evicted to free cache space.

---

## 2. PostgreSQL Read-Replica Load Balancing

To scale the metadata database tier under heavy read pressure (150,000 requests/sec), we use a PostgreSQL primary-replica topology.

- **Primary Node**: Handles all write transactions (user updates, uploads, likes).
- **Replica Nodes**: Receive updates asynchronously from the primary node via streaming replication, handling read queries (feed loads, profile queries).

```
    Database Write/Read Split:
    [ Client Writes ] =======> [ PostgreSQL Primary ]
                                      |
                                      +--- (Streaming Replication) ---> [ Postgres Replicas ]
                                                                                ^
    [ Client Reads ] ===========================================================+
```

### 2.2 Replication Lag Management
Because replication is asynchronous, replica databases can experience replication lag. If lag exceeds a threshold (e.g., 1 second), the query router shifts read queries back to the primary database temporarily to prevent users from seeing stale states.
