# Google Docs Case Study - Chapter 5: System Integration and Interoperability

## 1. High-Performance Inter-Service Communication Protocols

In an enterprise-scale microservices architecture handling 100,000+ internal remote procedure calls (RPCs) per second, the choice of communication protocol directly impacts service latency, CPU consumption, and network saturation. Legacy architectures relying on REST APIs over HTTP/1.1 with text-based JSON serialization incur high resource penalties:
- **TCP Connection Overhead**: HTTP/1.1 requires setting up distinct TCP connections or keeping connections open using keep-alive headers. However, it cannot multiplex requests over a single connection, leading to socket exhaustion under heavy load.
- **JSON Serialization CPU Overhead**: Parsing and serializing text-based JSON strings consumes significant CPU cycles compared to binary serialization formats.
- **Header Size Inflation**: HTTP/1.1 headers are transmitted as uncompressed text strings, introducing substantial bandwidth overhead for small payloads.

To resolve these limitations, the Google Docs infrastructure architecture standardizes on **gRPC running over HTTP/2** with **Protocol Buffers (protobuf)** as the binary serialization layer.

```
  gRPC HTTP/2 Multiplexing:
  [ Ingress Gateway ] ===( Single TCP Connection )===> [ Routing Service ]
                             |--- Frame Stream A (PostEdit Request)
                             |--- Frame Stream B (GetSnapshot Response)
                             |--- Frame Stream C (LogTelemetry Request)
```

By multiplexing streams over a single connection:
- **Eliminates Socket Exhaustion**: Services communicate via a persistent pool of TCP connections, avoiding connection setup overhead.
- **Reduces Latency**: Eliminates the TCP slow-start penalty by keeping connections active.
- **Saves Bandwidth**: Uses HPACK header compression to compress headers, reducing egress bandwidth requirements.

---

## 2. Protobuf Integration Contracts

We define gRPC interface contracts using Protocol Buffers (`proto3`). The following schema defines the core Edit Service integration contract:

```protobuf
syntax = "proto3";

package googledocs.integration.v1;

option go_package = "googledocs/integration/v1;integrationv1";
option java_multiple_files = true;
option java_package = "com.googledocs.integration.v1";

// Handles edit registration and document synchronization.
service EditService {
  rpc SubmitOperation(SubmitOperationRequest) returns (SubmitOperationResponse);
  rpc GetDocumentHistory(GetDocumentHistoryRequest) returns (GetDocumentHistoryResponse);
}

message SubmitOperationRequest {
  string document_id = 1;
  string user_id = 2;
  int64 base_version = 3;
  bytes operation_delta = 4; // Protobuf serialized OT delta
  int64 timestamp = 5;
}

message SubmitOperationResponse {
  int64 applied_version = 1;
  bool success = 2;
}

message GetDocumentHistoryRequest {
  string document_id = 1;
  int64 start_version = 2;
}

message GetDocumentHistoryResponse {
  repeated bytes operation_deltas = 1;
  int64 current_version = 2;
}
```

---

## 3. Timeline Fan-Out Architecture: Push vs. Pull Models

When a user edits a document, the system must update the screen state of all other active editors. We use a hybrid model combining **Fan-Out-on-Write (Push)** and **Fan-Out-on-Read (Pull)**.

```
       [ Edit Event ] ---> [ Kafka Event ] ---> [ Fan-Out Workers ]
                                                     |
             +---------------------------------------+
             | (Iterate active editors)
             v
       [ Redis LPUSH ] ---> [ LTRIM 100 ] (Keep edit history bounded)
```

---

### 3.1 Fan-Out-on-Write (Push Model)
For documents with average active editor counts (under 100 active editors), new edits are pushed directly to their editors' connection channels:
1. **Event Ingestion**: The Write Service publishes an `EditCreatedEvent` to a Kafka topic.
2. **Editor Queries**: A Fan-Out Worker consumes the event and queries the Active Editors registry to retrieve the document's active users.
3. **Presence Filtering**: The worker queries the Presence Service to identify active connection channels.
4. **Cache Updates**: The worker sends pipelined updates to the active editors' WebSocket channels.

---

### 3.2 Fan-Out-on-Read (Pull Model)
For high-profile documents (e.g. public announcements with thousands of active viewers), fanning out a single edit to all channels would saturate cache CPU and network bandwidth. Instead:
- **Write Bypass**: If the document's active reader count exceeds 100, the fan-out step is bypassed. The edit is written only to the document outbox cache (`doc_updates:doc_id`).
- **On-Read Merging**: When a client device checks for updates, the Sync Service fetches their pre-computed standard state from Redis and merges it on-the-fly with the recent updates of the active document they are viewing.

---

### 3.3 Fan-Out Pipeline Implementation
Below is a conceptual implementation of the background fan-out process:

```typescript
import { Kafka } from "kafkajs";
import Redis from "ioredis";

interface EditCreatedEvent {
  documentId: string;
  userId: string;
  appliedVersion: number;
  operationDelta: string;
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
    await this.consumer.subscribe({ topic: "edit-events", fromBeginning: false });

    await this.consumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return;
        const event: EditCreatedEvent = JSON.parse(message.value.toString());
        await this.executeFanOut(event);
      }
    });
  }

  private async executeFanOut(event: EditCreatedEvent) {
    // 1. Query Active Editors registry to retrieve document's active connections
    const activeUsers = await activeEditorsRegistry.getActiveUsers(event.documentId);

    // Bypass standard fan-out for high-concurrency documents
    if (activeUsers.length > 100) {
      await this.redisCluster.lpush(`doc_updates:${event.documentId}`, JSON.stringify(event));
      await this.redisCluster.ltrim(`doc_updates:${event.documentId}`, 0, 99);
      return;
    }

    // Update active user caches in parallel using Redis pipelines
    const pipeline = this.redisCluster.pipeline();
    activeUsers.forEach((user) => {
      const feedKey = `user_sync:${user.id}`;
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
The duration from when an edit is submitted to when it is synced to all active editors.
- **SLO Target**: P95 < 100ms, P99 < 300ms.

### 4.2 Kafka Consumer Lag
Measures the queue backlog of unprocessed messages. A rising lag indicates that additional fan-out worker pods should be provisioned.
- **Target Threshold**: Lag < 5,000 events per partition.
- **HPA Integration**: The Kubernetes autoscaler scales worker pod counts based on partition lag metrics.
