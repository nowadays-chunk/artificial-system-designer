# WhatsApp Case Study - Chapter 5: System Integration and Interoperability

## 1. High-Performance Inter-Service Communication Protocols

In an enterprise-scale microservices architecture handling 100,000+ internal remote procedure calls (RPCs) per second, the choice of communication protocol directly impacts service latency, CPU consumption, and network saturation. Legacy architectures relying on REST APIs over HTTP/1.1 with text-based JSON serialization incur high resource penalties:
- **TCP Connection Overhead**: HTTP/1.1 requires setting up distinct TCP connections or keeping connections open using keep-alive headers. However, it cannot multiplex requests over a single connection, leading to socket exhaustion under heavy load.
- **JSON Serialization CPU Overhead**: Parsing and serializing text-based JSON strings consumes significant CPU cycles compared to binary serialization formats.
- **Header Size Inflation**: HTTP/1.1 headers are transmitted as uncompressed text strings, introducing substantial bandwidth overhead for small payloads.

To resolve these limitations, the WhatsApp infrastructure architecture standardizes on **gRPC running over HTTP/2** with **Protocol Buffers (protobuf)** as the binary serialization layer.

```
  gRPC HTTP/2 Multiplexing:
  [ Ingress Gateway ] ===( Single TCP Connection )===> [ Routing Service ]
                             |--- Frame Stream A (PostMessage Request)
                             |--- Frame Stream B (GetPresence Response)
                             |--- Frame Stream C (LogTelemetry Request)
```

By multiplexing streams over a single connection:
- **Eliminates Socket Exhaustion**: Services communicate via a persistent pool of TCP connections, avoiding connection setup overhead.
- **Reduces Latency**: Eliminates the TCP slow-start penalty by keeping connections active.
- **Saves Bandwidth**: Uses HPACK header compression to compress headers, reducing egress bandwidth requirements.

---

## 2. Protobuf Integration Contracts

We define gRPC interface contracts using Protocol Buffers (`proto3`). The following schema defines the core Message Service integration contract:

```protobuf
syntax = "proto3";

package whatsapp.integration.v1;

option go_package = "whatsapp/integration/v1;integrationv1";
option java_multiple_files = true;
option java_package = "com.whatsapp.integration.v1";

// Handles message registration and connection checks.
service MessageService {
  rpc SubmitMessage(SubmitMessageRequest) returns (SubmitMessageResponse);
  rpc GetSyncState(GetSyncStateRequest) returns (GetSyncStateResponse);
}

message SubmitMessageRequest {
  string recipient_id = 1;
  string sender_id = 2;
  bytes encrypted_payload = 3; // Signal Protocol block
  int64 timestamp = 4;
}

message SubmitMessageResponse {
  string message_id = 1;
  bool success = 2;
}

message GetSyncStateRequest {
  string user_id = 1;
}

message GetSyncStateResponse {
  repeated string pending_message_ids = 1;
  int64 current_timestamp = 2;
}
```

---

## 3. Timeline Fan-Out Architecture: Push vs. Pull Models

When a user sends a message, the system must update the presence status or trigger notifications. We use a hybrid model combining **Fan-Out-on-Write (Push)** and **Fan-Out-on-Read (Pull)**.

```
       [ Message Sent ] ---> [ Kafka Event ] ---> [ Fan-Out Workers ]
                                                     |
             +---------------------------------------+
             | (Iterate active endpoints)
             v
       [ Redis LPUSH ] ---> [ LTRIM 100 ] (Keep sync history bounded)
```

---

### 3.1 Fan-Out-on-Write (Push Model)
For users with average contact lists (under 1,000 contacts), presence updates are pushed directly to their contacts' caches:
1. **Event Ingestion**: The Write Service publishes a `PresenceChangedEvent` to a Kafka topic.
2. **Contact Queries**: A Fan-Out Worker consumes the event and queries the Social Graph Service to retrieve the user's contacts.
3. **Presence Filtering**: The worker queries the Presence Service to identify active connection channels.
4. **Cache Updates**: The worker sends pipelined updates to the active contacts' channels.

---

### 3.2 Fan-Out-on-Read (Pull Model)
For high-profile users or business accounts (with thousands of contacts), fanning out a single presence update to all contacts would saturate cache CPU and network bandwidth. Instead:
- **Write Bypass**: If the contact count exceeds 1,000, the fan-out step is bypassed. The update is written only to the user's outbox cache (`user_presence:user_id`).
- **On-Read Merging**: When a contact checks their list, the Presence Service fetches their pre-computed standard state from Redis and merges it on-the-fly with the recent updates of any high-profile users they are watching.

---

### 3.3 Fan-Out Pipeline Implementation
Below is a conceptual implementation of the background fan-out process:

```typescript
import { Kafka } from "kafkajs";
import Redis from "ioredis";

interface PresenceChangedEvent {
  userId: string;
  isOnline: boolean;
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
    await this.consumer.subscribe({ topic: "presence-events", fromBeginning: false });

    await this.consumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return;
        const event: PresenceChangedEvent = JSON.parse(message.value.toString());
        await this.executeFanOut(event);
      }
    });
  }

  private async executeFanOut(event: PresenceChangedEvent) {
    // 1. Query Contacts registry to retrieve user's contacts
    const contacts = await contactRegistry.getContacts(event.userId);

    // Bypass standard fan-out for business/high-concurrency accounts
    if (contacts.length > 1000) {
      await this.redisCluster.set(`user_presence:${event.userId}`, JSON.stringify(event));
      return;
    }

    // Update active contact caches in parallel using Redis pipelines
    const pipeline = this.redisCluster.pipeline();
    contacts.forEach((contact) => {
      const feedKey = `contact_presence:${contact.id}`;
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
The duration from when a message is sent to when it is delivered to the recipient.
- **SLO Target**: P95 < 100ms, P99 < 300ms.

### 4.2 Kafka Consumer Lag
Measures the queue backlog of unprocessed messages. A rising lag indicates that additional fan-out worker pods should be provisioned.
- **Target Threshold**: Lag < 5,000 events per partition.
- **HPA Integration**: The Kubernetes autoscaler scales worker pod counts based on partition lag metrics.
