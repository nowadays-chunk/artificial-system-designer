# Twitter Case Study - Chapter 7: Performance and Availability Management

## 1. Mitigating High-Profile Users (Celebrity Hotspots)

In microblogging platforms, a minority of users (celebrity accounts with tens of millions of followers) generate a disproportionate amount of read and write traffic. This leads to the **celebrity write bottleneck**: fanning out a single tweet from an account with 50 million followers to all active follower caches consumes substantial cache CPU cycles and network bandwidth, degrading system performance.

```
       [ Celebrity Posts Tweet ]
                  |
                  v
       +----------------------+
       |  Fan-Out Bypass?     |
       +----------------------+
         /                  \
        / (Yes, Followers)   \ (No, Standard User)
       v                      v
  [ Read-Path Merging ]   [ Fan-Out on Write ]
  (Merge feeds on read)   (Push to Redis)
```

### 1.1 Read-Path Merging Pipeline (Pull Hybrid Model)
To address the celebrity write bottleneck, the architecture implements a hybrid read-path merging pipeline:
- **Bypass Limit**: Accounts with more than 10,000 followers bypass the standard push-based fan-out pipeline when posting a tweet.
- **On-Read Feed Assembly**: When a follower (e.g., Bob) requests their timeline, the system fetches Bob's pre-computed timeline cache from Redis and merges those items on-the-fly with the recent tweets of any celebrity accounts Bob follows.

```typescript
interface Tweet {
  id: string;
  authorId: string;
  body: string;
  timestamp: number;
}

async function assembleHomeTimeline(userId: string): Promise<Tweet[]> {
  // 1. Fetch pre-computed standard feed from Redis
  const cachedTweetIds = await redisCluster.lrange(`timeline:${userId}`, 0, 199);

  // 2. Query the Social Graph to find celebrity users followed by Bob
  const followedCelebrities = await socialGraph.getFollowedCelebrities(userId);

  // 3. Fetch recent tweets of those celebrities from memory cache
  const celebrityTweets: Tweet[] = [];
  await Promise.all(
    followedCelebrities.map(async (celebrityId) => {
      const tweets = await redisCluster.lrange(`celebrity_tweets:${celebrityId}`, 0, 9);
      tweets.forEach((t) => celebrityTweets.push(JSON.parse(t)));
    })
  );

  // 4. Hydrate standard tweet IDs from cache/database
  const standardTweets = await tweetHydrator.batchGet(cachedTweetIds);

  // 5. Merge standard and celebrity tweets chronologically
  const mergedFeeds = [...standardTweets, ...celebrityTweets];
  mergedFeeds.sort((a, b) => b.timestamp - a.timestamp);

  // Return the top 100 entries
  return mergedFeeds.slice(0, 99);
}
```

---

## 2. Multi-Region Active-Active Ingress Load Balancing

To achieve high availability and low latency globally, the ingress tier uses a multi-region active-active deployment.

### 2.1 Anycast IP Routing
External client requests are routed to the nearest geographic Point of Presence (PoP) using Anycast IP routing. These PoPs terminate TLS connections, cache static assets, and forward request payloads over a dedicated private network back to the active application regions (e.g., `us-east-1`, `eu-west-1`).

### 2.2 Global Traffic Management (GTM)
Global server load balancers monitor region health and latencies. If a region (e.g., `eu-west-1`) experiences a power outage or significant network degradation, the load balancer shifts traffic to the surviving regions automatically.

---

## 3. Downstream Cache Recovery Mitigation

When a cache node (e.g., a Redis instance containing home feeds) fails, rebuilding its keyspace from the primary database (Cassandra) can cause a **cache stampede** or query surge that saturates the database.

```
       [ Cache Node Fails ]
                 |
                 v
       +----------------------+
       |  Cache Miss?         |
       +----------------------+
         /                  \
        / (True)             \ (False, Normal path)
       v                      v
  [ Mutual Exclusion Lock ]  [ Return Data ]
  (Only 1 worker queries DB)
```

To protect the database tier during cache recovery:
- **Mutual Exclusion Locks**: When a cache miss occurs, the read service attempts to acquire a distributed lock (e.g., using Redis `Redlock`) for that key.
- **Single Database Query**: Only the request that acquires the lock is permitted to query the database and update the cache. Concurrently arriving requests wait for the lock to release or receive stale fallback data.
