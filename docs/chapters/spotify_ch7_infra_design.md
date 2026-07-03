# Spotify Case Study - Chapter 7: Performance and Availability Management

## 1. Edge Audio Caching and Stream Resiliency

To minimize playback start latency and prevent streaming interruptions on slow networks, the platform routes all audio traffic through global CDN edge caches:

```
  Streaming Request Route:
  [ Client Player ] ---> [ Nearest CDN Edge ]
                                |
                                +===> (Cache Hit: Return Ogg blocks)
                                |
                                v (Cache Miss)
                        [ Storage Origin ]
```

### 1.1 Cache Replacement Policies
CDN edge nodes cache popular songs based on local popularity indicators. Infrequently accessed tracks are evicted to make room for new content releases.

---

## 2. Cassandra Multi-Region Active-Active Replication

User playlists and catalog metadata are stored in Cassandra clusters deployed across multiple regions:
- **Local Read/Write**: Applications read and write to local databases to avoid WAN latency.
- **Asynchronous Sync**: Cassandra replicates updates across regions asynchronously in the background.

```
    Cassandra Multi-Region Topology:
    [ Region A: Cassandra Nodes ] <---( Async Replication )---> [ Region B: Cassandra Nodes ]
```

### 2.2 Handling Data Conflicts
Because database replication is asynchronous, conflicts can arise (e.g., when a user modifies a playlist from two devices simultaneously). Cassandra resolves these conflicts using **Last-Write-Wins (LWW)** timestamps.
