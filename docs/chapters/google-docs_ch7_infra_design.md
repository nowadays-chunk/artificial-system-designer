# Google Docs Case Study - Chapter 7: Performance and Availability Management

## 1. Geo-Distributed Syncing and Resiliency

To minimize upload and download latencies, the platform deploys regional document caching proxies near user populations.

```
  Download Request Route:
  [ Client Player ] ---> [ Nearest Edge Cache ]
                                |
                                +===> (Cache Hit: Return document snapshots)
                                |
                                v (Cache Miss)
                        [ Storage Origin ]
```

### 1.1 Cache Eviction Policies
Edge caches use Least Recently Used (LRU) eviction algorithms. Frequently accessed files remain cached near active users, while older, cold blocks are evicted.

---

## 2. PostgreSQL Metadata Replication and Partitioning

To scale the directory namespace database under heavy read pressure:
- **Master-Replica Replication**: Relational databases replicate updates asynchronously in the background.
- **Horizontal Sharding**: User namespaces are sharded across database instances using the User ID hash value, preventing single database nodes from saturating under write load.

```
    Sharded Database Architecture:
    [ Metadata Router ]
         /          \
        v            v
  [ Shard 1 (A-M) ]  [ Shard 2 (N-Z) ]
```
