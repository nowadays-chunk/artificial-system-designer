# Twitter Case Study - Chapter 7: Performance and Availability Management

## 1. Mitigating Celebrity Hotspots: Hybrid Read/Write Timelines

In a social network architecture, traffic loads are highly skewed. A minority of high-profile users (celebrity accounts with tens of millions of followers) generate a disproportionate amount of read and write traffic. 

If we rely solely on a **Fan-Out-on-Write (Push)** model:
- When a celebrity with 50 million followers posts a tweet, the fan-out workers must update 50 million timeline caches in Redis.
- This write surge causes significant write amplification, saturating cache cluster CPU and network bandwidth, and delaying delivery to followers.

```
       [ Celebrity Posts Tweet ]
                  |
                  v
       +-----------------------+
       | Follower Count > 10K? |
       +-----------------------+
         /                   \
        / (Yes)               \ (No, Standard User)
       v                       v
  [ Bypass Fan-Out ]      [ Fan-Out on Write ]
  (Store in Celeb ZSET)   (Push to follower lists)
```

To resolve this, the system uses a hybrid model:
- **Standard Users (Followers < 10,000)**: Tweets are fanned out to followers' Redis lists (`timeline:user_id`) on write.
- **High-Profile Users (Followers >= 10,000)**: Fan-out is bypassed. The tweet is written only to the celebrity's outbox cache (`celebrity_tweets:author_id`).
- **On-Read Merging**: When a follower (e.g., Bob) requests their timeline, the system fetches Bob's pre-computed timeline from Redis and merges it on-the-fly with the active tweets of any celebrity accounts Bob follows.

---

### 1.1 Hybrid Timeline Assembly Algorithm
The following implementation demonstrates this on-the-fly merging process:

```typescript
import Redis from "ioredis";

interface Tweet {
  id: string;
  authorId: string;
  body: string;
  timestamp: number;
}

export class TimelineMerger {
  private redis = new Redis.Cluster([{ host: "redis-cache-1", port: 6379 }]);

  public async fetchHomeTimeline(userId: string, limit = 20): Promise<Tweet[]> {
    const timelineKey = `timeline:${userId}`;
    const followingKey = `following:${userId}`;

    // 1. Fetch pre-computed standard feed from Redis
    const standardTweetIds = await this.redis.lrange(timelineKey, 0, 199);

    // 2. Query the Social Graph to find celebrity users followed by Bob
    // Celebrity IDs are stored in a sorted set indexed by follow timestamp
    const celebrityIds = await this.redis.zrange(followingKey, 0, -1);

    // 3. Fetch recent tweets of those celebrities from memory cache
    const celebrityTweets: Tweet[] = [];
    if (celebrityIds.length > 0) {
      await Promise.all(
        celebrityIds.map(async (celebrityId) => {
          const tweets = await this.redis.lrange(`celebrity_tweets:${celebrityId}`, 0, 9);
          tweets.forEach((t) => celebrityTweets.push(JSON.parse(t)));
        })
      );
    }

    // 4. Hydrate standard tweet IDs from cache/database
    const standardTweets = await this.hydrateTweets(standardTweetIds);

    // 5. Merge standard and celebrity tweets chronologically
    const mergedFeeds = [...standardTweets, ...celebrityTweets];
    mergedFeeds.sort((a, b) => b.timestamp - a.timestamp);

    // Return the top requested entries
    return mergedFeeds.slice(0, limit);
  }

  private async hydrateTweets(tweetIds: string[]): Promise<Tweet[]> {
    if (tweetIds.length === 0) return [];
    
    // Attempt to read from read-through Memcached layer
    const cachedTweets = await memcachedClient.getMulti(tweetIds);
    const missingIds: string[] = [];
    const tweets: Tweet[] = [];

    tweetIds.forEach((id) => {
      if (cachedTweets[id]) {
        tweets.push(JSON.parse(cachedTweets[id]));
      } else {
        missingIds.push(id);
      }
    });

    // Fetch missing records from Cassandra and update cache
    if (missingIds.length > 0) {
      const dbTweets = await cassandraClient.batchGet(missingIds);
      await Promise.all(
        dbTweets.map(async (t) => {
          tweets.push(t);
          await memcachedClient.set(t.id, JSON.stringify(t), 3600);
        })
      );
    }

    return tweets;
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
External client requests are routed to the nearest geographic Point of Presence (PoP) using Anycast IP routing. These PoPs terminate TLS connections, cache static assets, and forward request payloads over a dedicated private network back to the active application regions (e.g., `us-east-1`, `eu-west-1`).

### 2.2 Global Traffic Management (GTM)
Global server load balancers monitor region health and latencies. If a region (e.g., `eu-west-1`) experiences a power outage or significant network degradation, the load balancer shifts traffic to the surviving regions automatically.

---

## 3. Downstream Cache Stampede Mitigation

When a cache node (e.g., a Redis instance containing home feeds) fails, rebuilding its keyspace from the primary database (Cassandra) can cause a **cache stampede** or query surge that saturates the database.

```
  Cache Stampede Mitigation Flow:
  [ Cache Miss Detected ] ---> [ Acquire Lock (Redlock) ]
                                      |
                     +----------------+----------------+
                     | (Lock Acquired)                 | (Lock Fails)
                     v                                 v
            [ Query DB & Update Cache ]       [ Wait / Return Stale Data ]
```

### 3.1 Mutual Exclusion Locks (Redlock Implementation)
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
