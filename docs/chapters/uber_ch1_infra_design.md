# Uber Case Study - Chapter 1: Infrastructure Architecture Design

## 1. Introduction and System Scale Requirements

Designing the infrastructure architecture for a real-time ride-hailing and dispatch platform like Uber (100M+ active users, 5M+ active drivers) introduces unique geospatial partitioning, concurrency, and real-time synchronization challenges. Unlike standard e-commerce or content platforms, a ride-hailing architecture must ingest high-frequency geospatial location telemetry (driver coordinates pinged every 4 seconds), compute real-time routing matches, resolve dynamic surge pricing indexes, and coordinate dispatch locks.

The system must handle:
- **Write Path (Location Telemetry & Dispatch)**: Over 1 million driver location pings per second, along with thousands of ride requests.
- **Read Path (Rider Maps & Catalog)**: Millions of concurrent active riders querying nearby driver lists and tracking trip progressions.
- **Latency Target**: Trip matching and dispatching operations resolved under 500ms end-to-end globally.

To satisfy these requirements, the architecture decouples the **Real-Time Location & Dispatch Write Path** from the **High-Availability Trip History Read Path**.

---

## 2. Ingress Architecture and Path Splitting

To optimize performance, we split incoming client traffic at the API Gateway layer based on request path parameters:

```
  Ingress Path:
  [ Mobile Rider / Driver Client ]
         |
         | (WebSocket Connection / HTTP/2)
         v
  [ Ingress Gateway (Anycast, SSL/TLS Terminate) ]
         |
         +-------------------------+-------------------------+
         | (Telemetry & Dispatch: /api/dispatch)             | (Trip history: /api/trips)
         v                                                   v
  [ Dispatch Gateway ]                                [ Trip Catalog API ]
         |                                                   |
         +===> Check Driver Presence (Redis Geohash)         +===> Read Catalog (Cassandra Replicas)
         |                                                   |
         +===> Coordinate Match (Go Dispatcher Cluster)      +===> Return Historic Trip Record
```

### 2.1 Real-Time Location & Dispatch Write Path
The real-time dispatch path handles coordinate ingestion and trip matching:
1. **Telemetry Ingest**: Driver mobile apps send location telemetry updates (latitude, longitude) over WebSockets every 4 seconds.
2. **Geospatial Update**: The Dispatch Gateway writes these coordinates to a high-performance Redis cache sharded using **Google S2 Geohashes**.
3. **Dispatch Coordinator**: When a rider requests a trip, the Dispatcher queries the Redis index for nearby active drivers, applies matching filters, and attempts to coordinate a match.
4. **Historical Logging**: Once a trip is completed, the trip logs are written asynchronously to Cassandra for archiving.

---

### 2.2 Dispatch Transaction Gateway Implementation
To prevent double-matching and coordinate dispatch offers safely:
- **Atomic Dispatch Offer Lock**: When a driver is selected for a trip match, the system acquires a distributed lock in Redis to lock that driver for the offer.
- **Async Verification**: If the driver accepts, the lock is promoted to an active session database record. If the driver declines or the offer times out (e.g. after 15 seconds), the lock is released.

#### Dispatch match coordinator implementation:

```typescript
import Redis from "ioredis";
import { Client as CassandraClient } from "cassandra-driver";

interface DispatchRequest {
  tripId: string;
  riderId: string;
  driverId: string;
  priceCents: number;
}

export class DispatchMatchCoordinator {
  private redis = new Redis.Cluster([{ host: "redis-dispatch-lock", port: 6379 }]);
  private cassandraClient = new CassandraClient({
    contactPoints: ["cassandra-node-1"],
    localDataCenter: "datacenter1",
    keyspace: "uber_dispatch"
  });

  /**
   * Evaluates and coordinates driver matching transaction.
   */
  public async offerTrip(request: DispatchRequest): Promise<{ success: boolean }> {
    const lockKey = `driver_lock:${request.driverId}`;
    const offerToken = `${request.tripId}-${Date.now()}`;

    // 1. Acquire distributed lock for driver availability (expires in 15 seconds)
    const acquired = await this.redis.set(lockKey, offerToken, "NX", "PX", 15000);

    if (acquired !== "OK") {
      // Driver already offered another trip or occupied
      return { success: false };
    }

    try {
      // 2. Insert pending trip offer record to Cassandra
      const insertQuery = "INSERT INTO offers (trip_id, rider_id, driver_id, status, price_cents) VALUES (?, ?, ?, ?, ?)";
      await this.cassandraClient.execute(insertQuery, [
        request.tripId,
        request.riderId,
        request.driverId,
        "offered",
        request.priceCents
      ], { prepare: true });

      return { success: true };
    } catch (err) {
      // Revert Redis lock on database write failure
      await this.redis.del(lockKey);
      return { success: false };
    }
  }

  /**
   * Commits the match transaction on driver acceptance.
   */
  public async acceptTrip(tripId: string, driverId: string): Promise<boolean> {
    const lockKey = `driver_lock:${driverId}`;
    const activeTripKey = `active_trip:${driverId}`;

    const pipeline = this.redis.pipeline();
    pipeline.set(activeTripKey, tripId);
    pipeline.del(lockKey); // Release offer lock

    await pipeline.exec();
    return true;
  }
}
```

---

## 3. High-Availability Trip History Read Path

The read path serves historical trip queries:
1. **Catalog Query**: The user queries their past trip details.
2. **State Lookup**: The Trip Catalog API queries Cassandra read replicas directly.
3. **Data Return**: Cassandra retrieves the partitioned trip history by `rider_id` and returns the dataset.
