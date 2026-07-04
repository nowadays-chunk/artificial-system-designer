# Uber Case Study - Chapter 3: Technology Selection and Standards

## 1. Evaluation Matrix: Cassandra Distributed Keyspace vs. Relational Sharding

To store driver locations, trips history records, rating metrics, and billing logs at scale:

- **Cassandra Distributed Keyspace**: Selected to store historical trip records and receipts. Cassandra is designed for multi-region active-active layouts, using a masterless ring architecture that writes data to local nodes and syncs modifications asynchronously across geographic regions. This allows Uber to support local writes with sub-millisecond latencies while surviving complete regional outages.
- **Vitess / MySQL Sharding (Comparison)**: Excellent for strict ACID transactions (such as billing systems), but maintaining synchronous replication across global regions introduces network write latency and operational complexity.

---

## 2. In-Memory Cache Selection: Redis vs. Memcached

To host active driver locations, dynamic dispatch queues, and surge pricing indexes:
- **Redis Cluster**: Selected because it supports rich data structures (e.g., Sorted Sets, Lists, Hashes) in memory. This allows storing driver coordinates as Sorted Sets, enabling fast geohash range queries and updates.
- **Memcached**: Excellent for simple key-value lookups (such as caching static rider profile structures), but its lack of complex data structures makes it less suitable for hosting dynamic driver locations.

---

## 3. Database Schema Design for Trips Table

To model trips in Cassandra:

```sql
CREATE KEYSPACE uber_trips WITH replication = {
    'class': 'NetworkTopologyStrategy',
    'us-east': 3,
    'us-west': 3
};

CREATE TABLE uber_trips.trips_by_rider (
    rider_id uuid,
    trip_id uuid,
    driver_id uuid,
    fare_cents int,
    pickup_latitude double,
    pickup_longitude double,
    dropoff_latitude double,
    dropoff_longitude double,
    created_at timestamp,
    PRIMARY KEY (rider_id, created_at)
) WITH CLUSTERING ORDER BY (created_at DESC);
```

This schema partitions trip data by `rider_id` to distribute read and write traffic evenly across Cassandra ring nodes, while clustering by `created_at` DESC enables fast retrieval of a rider's recent trips.
