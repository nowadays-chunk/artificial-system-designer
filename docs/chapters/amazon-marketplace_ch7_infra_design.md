# Amazon Marketplace Case Study - Chapter 7: Performance and Availability Management

## 1. Mitigating Hotspots: Hybrid Read/Write Timelines

In an e-commerce platform, traffic loads are highly skewed. A minority of products or sellers (e.g. flash-sale items or popular brands with thousands of active buyers) generate a disproportionate amount of read and write traffic.

If we rely solely on a **Fan-Out-on-Write (Push)** model:
- When a seller updates a price on a popular item with 50,000 watchers, the fan-out workers must update the watchlists of 50,000 users.
- This write surge causes significant write amplification, saturating cache cluster CPU and network bandwidth.

```
       [ Price Modification Event ]
                   |
                   v
       +-----------------------+
       | Active Watchers > 500?|
       +-----------------------+
         /                   \
        / (Yes)               \ (No, Standard Product)
       v                       v
  [ Bypass Fan-Out ]      [ Fan-Out on Write ]
  (Store updates index)   (Push to watcher queues)
```

To resolve this, the system uses a hybrid model:
- **Standard Products (Watchers < 500)**: Price changes are fanned out to watchers' notification lists directly on write.
- **Hot Products (Watchers >= 500)**: Fan-out is bypassed. The update is written only to the product outbox cache (`product_updates:product_id`).
- **On-Read Merging**: When a client device checks their watchlist, the system fetches their pre-computed standard state from Redis and merges it on-the-fly with the active updates of any hot products they are watching.

---

### 1.1 Hybrid Sync Assembly Algorithm
The following implementation demonstrates this on-the-fly merging process:

```typescript
import Redis from "ioredis";

interface SyncEvent {
  id: string;
  productId: string;
  priceCents: number;
  timestamp: number;
}

export class SyncMerger {
  private redis = new Redis.Cluster([{ host: "redis-cache-1", port: 6379 }]);

  public async fetchWatchlistSyncState(userId: string): Promise<SyncEvent[]> {
    const userWatchlistKey = `user_watchlist:${userId}`;
    const watchlistProductsKey = `watchlist_products:${userId}`;

    // 1. Fetch pre-computed standard updates from Redis
    const standardUpdatesRaw = await this.redis.lrange(userWatchlistKey, 0, 99);
    const standardUpdates: SyncEvent[] = standardUpdatesRaw.map(u => JSON.parse(u));

    // 2. Query the user's watchlist references to find hot items
    const hotProductIds = await this.redis.smembers(watchlistProductsKey);

    // 3. Fetch recent updates of those products from memory cache
    const hotProductUpdates: SyncEvent[] = [];
    if (hotProductIds.length > 0) {
      await Promise.all(
        hotProductIds.map(async (productId) => {
          const updates = await this.redis.lrange(`product_updates:${productId}`, 0, 9);
          updates.forEach((u) => hotProductUpdates.push(JSON.parse(u)));
        })
      );
    }

    // 4. Merge standard and product-specific updates chronologically
    const mergedSync = [...standardUpdates, ...hotProductUpdates];
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

When a cache node (e.g., a Redis instance containing product catalog price records) fails, rebuilding its keyspace from the database can cause a **cache stampede** or query surge that saturates the database.

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
