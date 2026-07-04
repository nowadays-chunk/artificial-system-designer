# Amazon Marketplace Case Study - Chapter 5: System Integration and Interoperability

## 1. High-Performance Inter-Service Communication Protocols

In an enterprise-scale microservices architecture handling 100,000+ internal remote procedure calls (RPCs) per second, the choice of communication protocol directly impacts service latency, CPU consumption, and network saturation. Legacy architectures relying on REST APIs over HTTP/1.1 with text-based JSON serialization incur high resource penalties:
- **TCP Connection Overhead**: HTTP/1.1 requires setting up distinct TCP connections or keeping connections open using keep-alive headers. However, it cannot multiplex requests over a single connection, leading to socket exhaustion under heavy load.
- **JSON Serialization CPU Overhead**: Parsing and serializing text-based JSON strings consumes significant CPU cycles compared to binary serialization formats.
- **Header Size Inflation**: HTTP/1.1 headers are transmitted as uncompressed text strings, introducing substantial bandwidth overhead for small payloads.

To resolve these limitations, the Amazon Marketplace infrastructure architecture standardizes on **gRPC running over HTTP/2** with **Protocol Buffers (protobuf)** as the binary serialization layer.

```
  gRPC HTTP/2 Multiplexing:
  [ Ingress Gateway ] ===( Single TCP Connection )===> [ Routing Service ]
                             |--- Frame Stream A (PostOrder Request)
                             |--- Frame Stream B (GetCatalog Response)
                             |--- Frame Stream C (LogTelemetry Request)
```

By multiplexing streams over a single connection:
- **Eliminates Socket Exhaustion**: Services communicate via a persistent pool of TCP connections, avoiding connection setup overhead.
- **Reduces Latency**: Eliminates the TCP slow-start penalty by keeping connections active.
- **Saves Bandwidth**: Uses HPACK header compression to compress headers, reducing egress bandwidth requirements.

---

## 2. Protobuf Integration Contracts

We define gRPC interface contracts using Protocol Buffers (`proto3`). The following schema defines the core Checkout Service integration contract:

```protobuf
syntax = "proto3";

package amazon.integration.v1;

option go_package = "amazon/integration/v1;integrationv1";
option java_multiple_files = true;
option java_package = "com.amazon.integration.v1";

// Handles order registration and transaction updates.
service CheckoutService {
  rpc SubmitOrder(SubmitOrderRequest) returns (SubmitOrderResponse);
  rpc GetOrderHistory(GetOrderHistoryRequest) returns (GetOrderHistoryResponse);
}

message SubmitOrderRequest {
  string cart_id = 1;
  string user_id = 2;
  int64 price_cents = 3;
  string idempotency_key = 4;
  int64 timestamp = 5;
}

message SubmitOrderResponse {
  string order_id = 1;
  bool success = 2;
}

message GetOrderHistoryRequest {
  string user_id = 1;
  int64 start_timestamp = 2;
}

message GetOrderHistoryResponse {
  repeated string order_ids = 1;
  int64 current_timestamp = 2;
}
```

---

## 3. Timeline Fan-Out Architecture: Push vs. Pull Models

When a seller posts a product discount, the system must update the product feeds of their subscribers. We use a hybrid model combining **Fan-Out-on-Write (Push)** and **Fan-Out-on-Read (Pull)**.

```
       [ Product Update ] ---> [ Kafka Event ] ---> [ Fan-Out Workers ]
                                                     |
             +---------------------------------------+
             | (Iterate active subscribers)
             v
       [ Redis LPUSH ] ---> [ LTRIM 100 ] (Keep feed history bounded)
```

---

### 3.1 Fan-Out-on-Write (Push Model)
For sellers with average subscriber counts (under 5,000 subscribers), new updates are pushed directly to their subscribers' feed caches:
1. **Event Ingestion**: The Write Service publishes a `ProductUpdatedEvent` to a Kafka topic.
2. **Subscriber Queries**: A Fan-Out Worker consumes the event and queries the Social Graph Service to retrieve the seller's subscribers.
3. **Presence Filtering**: The worker queries the Presence Service to identify active subscribers.
4. **Cache Updates**: The worker sends pipelined updates to the active subscribers' Redis feed lists.

---

### 3.2 Fan-Out-on-Read (Pull Model)
For high-profile brands or sellers (with millions of subscribers), fanning out a single update to all subscribers would saturate cache CPU and network bandwidth. Instead:
- **Write Bypass**: If the subscriber count exceeds 5,000, the fan-out step is bypassed. The update is written only to the seller's profile index (`seller_feed:seller_id`).
- **On-Read Merging**: When a subscriber checks their feed, the Checkout Service fetches their pre-computed standard state from Redis and merges it on-the-fly with the recent updates of any high-profile sellers they watch.

---

### 3.3 Fan-Out Pipeline Implementation
Below is a conceptual implementation of the background fan-out process:

```typescript
import { Kafka } from "kafkajs";
import Redis from "ioredis";

interface ProductUpdatedEvent {
  productId: string;
  sellerId: string;
  priceCents: number;
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
    await this.consumer.subscribe({ topic: "product-updates", fromBeginning: false });

    await this.consumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return;
        const event: ProductUpdatedEvent = JSON.parse(message.value.toString());
        await this.executeFanOut(event);
      }
    });
  }

  private async executeFanOut(event: ProductUpdatedEvent) {
    // 1. Query Social Graph to retrieve subscribers list
    const subscribers = await socialRegistry.getSubscribers(event.sellerId);

    // Bypass standard fan-out for large seller feeds
    if (subscribers.length > 5000) {
      await this.redisCluster.lpush(`seller_feed:${event.sellerId}`, JSON.stringify(event));
      await this.redisCluster.ltrim(`seller_feed:${event.sellerId}`, 0, 99);
      return;
    }

    // Update active subscriber caches in parallel using Redis pipelines
    const pipeline = this.redisCluster.pipeline();
    subscribers.forEach((subId) => {
      const feedKey = `user_feed:${subId}`;
      pipeline.lpush(feedKey, JSON.stringify(event));
      pipeline.ltrim(feedKey, 0, 99); // Limit cache size to 100 items
    });

    await pipeline.exec();
  }
}
```

---

## 4. Pipeline Monitoring and SLO Targets

To maintain real-time delivery performance, we monitor the following metrics:

### 4.1 Sync Latency
The duration from when an order checkout is submitted to when it is processed and visible in the user's dashboard.
- **SLO Target**: P95 < 200ms, P99 < 500ms.

### 4.2 Kafka Consumer Lag
Measures the queue backlog of unprocessed messages. A rising lag indicates that additional fan-out worker pools should be provisioned.
- **Target Threshold**: Lag < 5,000 events per partition.
- **HPA Integration**: The Kubernetes autoscaler scales worker pod counts based on partition lag metrics.
