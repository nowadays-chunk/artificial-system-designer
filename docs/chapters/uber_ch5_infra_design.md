# Uber Case Study - Chapter 5: System Integration and Interoperability

## 1. High-Performance Inter-Service Communication Protocols

In an enterprise-scale microservices architecture handling 100,000+ internal remote procedure calls (RPCs) per second, the choice of communication protocol directly impacts service latency, CPU consumption, and network saturation. Legacy architectures relying on REST APIs over HTTP/1.1 with text-based JSON serialization incur high resource penalties:
- **TCP Connection Overhead**: HTTP/1.1 requires setting up distinct TCP connections or keeping connections open using keep-alive headers. However, it cannot multiplex requests over a single connection, leading to socket exhaustion under heavy load.
- **JSON Serialization CPU Overhead**: Parsing and serializing text-based JSON strings consumes significant CPU cycles compared to binary serialization formats.
- **Header Size Inflation**: HTTP/1.1 headers are transmitted as uncompressed text strings, introducing substantial bandwidth overhead for small payloads.

To resolve these limitations, the Uber infrastructure architecture standardizes on **gRPC running over HTTP/2** with **Protocol Buffers (protobuf)** as the binary serialization layer.

```
  gRPC HTTP/2 Multiplexing:
  [ Ingress Gateway ] ===( Single TCP Connection )===> [ Routing Service ]
                             |--- Frame Stream A (PostLocation Request)
                             |--- Frame Stream B (GetTripDetails Response)
                             |--- Frame Stream C (LogTelemetry Request)
```

By multiplexing streams over a single connection:
- **Eliminates Socket Exhaustion**: Services communicate via a persistent pool of TCP connections, avoiding connection setup overhead.
- **Reduces Latency**: Eliminates the TCP slow-start penalty by keeping connections active.
- **Saves Bandwidth**: Uses HPACK header compression to compress headers, reducing egress bandwidth requirements.

---

## 2. Protobuf Integration Contracts

We define gRPC interface contracts using Protocol Buffers (`proto3`). The following schema defines the core Dispatch Service integration contract:

```protobuf
syntax = "proto3";

package uber.integration.v1;

option go_package = "uber/integration/v1;integrationv1";
option java_multiple_files = true;
option java_package = "com.uber.integration.v1";

// Handles driver location updates and dispatch offers.
service DispatchService {
  rpc ReportLocation(ReportLocationRequest) returns (ReportLocationResponse);
  rpc QueryNearbyDrivers(QueryNearbyDriversRequest) returns (QueryNearbyDriversResponse);
}

message ReportLocationRequest {
  string driver_id = 1;
  double latitude = 2;
  double longitude = 3;
  double speed = 4;
  double bearing = 5;
  int64 timestamp = 6;
}

message ReportLocationResponse {
  bool success = 1;
}

message QueryNearbyDriversRequest {
  double latitude = 1;
  double longitude = 2;
  double radius_meters = 3;
  int32 max_drivers = 4;
}

message QueryNearbyDriversResponse {
  repeated string driver_ids = 1;
  int64 current_timestamp = 2;
}
```

---

## 3. Timeline Fan-Out Architecture: Push vs. Pull Models

When a driver updates their location, the system must update the maps of nearby riders. We use a hybrid model combining **Fan-Out-on-Write (Push)** and **Fan-Out-on-Read (Pull)**.

```
       [ Location Telemetry Ping ] ---> [ Kafka Event ] ---> [ Fan-Out Workers ]
                                                                   |
             +-----------------------------------------------------+
             | (Iterate active riders in the S2 cell partition)
             v
       [ Redis LPUSH ] ---> [ LTRIM 10 ] (Keep sync history bounded)
```

---

### 3.1 Fan-Out-on-Write (Push Model)
For riders actively looking at maps in standard demand zones (less than 100 active users in the S2 cell partition), location updates are pushed directly to their devices:
1. **Event Ingestion**: The Write Service publishes a `LocationUpdatedEvent` to a Kafka topic.
2. **Geospatial Queries**: A Fan-Out Worker consumes the event and queries the Social Graph Service to retrieve active riders watching the coordinate segment.
3. **Presence Filtering**: The worker queries the Presence Service to identify active connection channels.
4. **Cache Updates**: The worker sends pipelined updates to the active riders' WebSocket channels.

---

### 3.2 Fan-Out-on-Read (Pull Model)
For high-demand zones (e.g. airport taxi stands or stadiums during events with thousands of active riders), fanning out every driver location update would saturate cache CPU and network bandwidth. Instead:
- **Write Bypass**: If the rider density in an S2 cell partition exceeds 100, the fan-out step is bypassed. Driver coordinates are written only to the cell outbox cache (`cell_drivers:s2_cell_id`).
- **On-Read Merging**: When a rider device refreshes its map, the Dispatch Service fetches their pre-computed state from Redis and merges it on-the-fly with the recent updates of any driver coordinates in their current cell.

---

### 3.3 Fan-Out Pipeline Implementation
Below is a conceptual implementation of the background fan-out process:

```typescript
import { Kafka } from "kafkajs";
import Redis from "ioredis";

interface LocationUpdatedEvent {
  driverId: string;
  latitude: number;
  longitude: number;
  s2CellId: string;
  timestamp: number;
}

export class FanOutPipeline {
  private kafka = new Kafka({ brokers: ["kafka-broker-1:9092"] });
  private redisCluster = new Redis.Cluster([
    { host: "redis-node-1", port: 6379 }
  ]);
  private consumer = this.kafka.consumer({ groupId: "fanout-workers" });

  public async start() {
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: "location-updates", fromBeginning: false });

    await this.consumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return;
        const event: LocationUpdatedEvent = JSON.parse(message.value.toString());
        await this.executeFanOut(event);
      }
    });
  }

  private async executeFanOut(event: LocationUpdatedEvent) {
    // Query active riders in the S2 cell partition
    const activeRiders = await cellRegistry.getActiveRiders(event.s2CellId);

    // Bypass standard fan-out for high-demand zones
    if (activeRiders.length > 100) {
      await this.redisCluster.hset(`cell_drivers:${event.s2CellId}`, event.driverId, JSON.stringify(event));
      return;
    }

    // Update active rider caches in parallel using Redis pipelines
    const pipeline = this.redisCluster.pipeline();
    activeRiders.forEach((riderId) => {
      const feedKey = `rider_map:${riderId}`;
      pipeline.lpush(feedKey, JSON.stringify(event));
      pipeline.ltrim(feedKey, 0, 9); // Limit cache size to 10 items
    });

    await pipeline.exec();
  }
}
```

---

## 4. Pipeline Monitoring and SLO Targets

To maintain real-time delivery performance, we monitor the following metrics:

### 4.1 Sync Latency
The duration from when location telemetry is pinged to when it is delivered to nearby rider maps.
- **SLO Target**: P95 < 500ms, P99 < 1.0 second.

### 4.2 Kafka Consumer Lag
Measures the queue backlog of unprocessed messages. A rising lag indicates that additional fan-out worker pods should be provisioned.
- **Target Threshold**: Lag < 5,000 events per partition.
- **HPA Integration**: The Kubernetes autoscaler scales worker pod counts based on partition lag metrics.
