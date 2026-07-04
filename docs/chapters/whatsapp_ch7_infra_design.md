# WhatsApp Case Study - Chapter 7: Performance and Availability Management

## 1. Mitigating Hotspots: Hybrid Read/Write Timelines

In a messaging platform, traffic loads are highly skewed. A minority of contacts or channels (e.g. broadcasting channels or group chats with thousands of active members) generate a disproportionate amount of read and write traffic.

If we rely solely on a **Fan-Out-on-Write (Push)** model:
- When an administrator posts a message to a channel with 50,000 active subscribers, the fan-out workers must update the sync state of 50,000 devices.
- This write surge causes significant write amplification, saturating cache cluster CPU and network bandwidth.

```
       [ Channel Message Submitted ]
                   |
                   v
       +-----------------------+
       | Channel Members > 500? |
       +-----------------------+
         /                   \
        / (Yes)               \ (No, Private Chat)
       v                       v
  [ Bypass Fan-Out ]      [ Fan-Out on Write ]
  (Store updates index)   (Push to subscriber queues)
```

To resolve this, the system uses a hybrid model:
- **Private Chats (Members < 500)**: Messages are fanned out to members' device lists directly on write.
- **Large Channels (Members >= 500)**: Fan-out is bypassed. The update is written only to the channel outbox cache (`channel_updates:channel_id`).
- **On-Read Merging**: When a client device checks for updates, the system fetches their pre-computed standard state from Redis and merges it on-the-fly with the active updates of any large channels they are members of.

---

### 1.1 Hybrid Sync Assembly Algorithm
The following implementation demonstrates this on-the-fly merging process:

```typescript
import Redis from "ioredis";

interface SyncEvent {
  id: string;
  channelId: string;
  messageId: string;
  timestamp: number;
}

export class SyncMerger {
  private redis = new Redis.Cluster([{ host: "redis-cache-1", port: 6379 }]);

  public async fetchChatSyncState(userId: string, deviceId: string): Promise<SyncEvent[]> {
    const userSyncKey = `device_sync:${deviceId}`;
    const channelsKey = `channels:${userId}`;

    // 1. Fetch pre-computed standard updates from Redis
    const standardUpdatesRaw = await this.redis.lrange(userSyncKey, 0, 99);
    const standardUpdates: SyncEvent[] = standardUpdatesRaw.map(u => JSON.parse(u));

    // 2. Query the user's active channel memberships to find large channels they belong to
    const largeChannelIds = await this.redis.smembers(channelsKey);

    // 3. Fetch recent updates of those channels from memory cache
    const largeChannelUpdates: SyncEvent[] = [];
    if (largeChannelIds.length > 0) {
      await Promise.all(
        largeChannelIds.map(async (channelId) => {
          const updates = await this.redis.lrange(`channel_updates:${channelId}`, 0, 9);
          updates.forEach((u) => largeChannelUpdates.push(JSON.parse(u)));
        })
      );
    }

    // 4. Merge standard and channel-specific updates chronologically
    const mergedSync = [...standardUpdates, ...largeChannelUpdates];
    mergedSync.sort((a, b) => b.timestamp - a.timestamp);

    return mergedSync;
  }
}
```

---

## 2. Multi-Region Active-Active Ingress Routing

To achieve high availability (99.999% uptime) and low latency globally, the ingress tier uses a multi-region active-active deployment.

```
       [ Client Request ] ---> [ Anycast IP DNS Resolution ]
                                         |
                       +-----------------+-----------------+
                       | (US East Coast)                   | (Europe)
                       v                                   v
             [ us-east-1 Region ]                [ eu-west-1 Region ]
```

### 2.1 Anycast IP Routing
External client requests are routed to the nearest geographic Point of Presence (PoP) using Anycast IP routing. These PoPs terminate TLS connections, cache static assets, and forward request payloads over a dedicated private network back to the active application regions.

### 2.2 Global Traffic Management (GTM)
Global server load balancers monitor region health and latencies. If a region experiences a power outage or significant network degradation, the load balancer shifts traffic to the surviving regions automatically.

---

## 3. Downstream Cache Stampede Mitigation

When a cache node (e.g., a Redis instance containing presence lists) fails, rebuilding its keyspace from the database can cause a **cache stampede** or query surge that saturates the database.

```
  Cache Stampede Mitigation Flow:
  [ Cache Miss Detected ] ---> [ Acquire Lock (Redlock) ]
                                      |
                     +----------------+----------------+
                     | (Lock Acquired)                 | (Lock Fails)
                     v                                 v
            [ Query DB & Update Cache ]       [ Wait / Return Stale Data ]
```

### 3.1 Distributed Locks (Redlock Implementation)
To protect the database tier during cache recovery:
- **Mutual Exclusion Locks**: When a cache miss occurs, the read service attempts to acquire a distributed lock for that key.
- **Single Database Query**: Only the request that acquires the lock is permitted to query the database and update the cache. Concurrently arriving requests wait for the lock to release or receive stale fallback data.

```typescript
import Redis from "ioredis";

export class CacheStampedeProtector {
  private redis = new Redis.Cluster([{ host: "redis-lock-1", port: 6379 }]);

  /**
   * Safe fetch checking cache before fallback query.
   */
  public async fetchSafe(key: string, dbFallback: () => Promise<string>): Promise<string> {
    // 1. Attempt to read cached value
    let value = await this.redis.get(key);
    if (value) return value;

    // 2. Cache miss: attempt to acquire distributed lock
    const lockKey = `lock:${key}`;
    const token = `${Date.now()}-${Math.random()}`;
    const acquired = await this.redis.set(lockKey, token, "NX", "PX", 5000); // 5s expiry

    if (acquired === "OK") {
      try {
        // Acquired lock: query database and update cache
        value = await dbFallback();
        await this.redis.set(key, value, "EX", 300); // 5m expiry
      } finally {
        // Release lock using Lua script to verify token
        const luaScript = `
          if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
          else
            return 0
          end
        `;
        await this.redis.eval(luaScript, 1, lockKey, token);
      }
    } else {
      // Lock failed: wait and retry lookup
      await new Promise((resolve) => setTimeout(resolve, 100));
      return this.fetchSafe(key, dbFallback);
    }

    return value;
  }
}
```
