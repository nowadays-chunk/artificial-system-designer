# Google Docs Case Study - Chapter 5: System Integration and Interoperability

## 1. Real-Time Synchronization Telemetry Pipelines

To notify client applications of document updates:
- **WebSockets Gateways**: Client apps establish persistent WebSocket connections to notification servers.
- **Message Broker (Kafka)**: When a document update commits to PostgreSQL, a database trigger publishes a sync event to a Kafka topic (`sync-events`).
- **Notification Workers**: Notification workers consume the event and broadcast sync updates to the target user's active WebSockets connection.

```
       [ Database Update ] ---> [ Kafka Topic ] ---> [ Notification Worker ]
                                                            |
                                                            v
                                                   [ WebSockets Host ]
                                                            |
                                                            v
                                                    [ Client Player ]
```

---

## 2. API Schema Definitions for Operation Handshakes

We define communication contracts between client players and sync gateways using Protocol Buffers:

```protobuf
syntax = "proto3";

package googledocs.sync.v1;

service SyncService {
  rpc SubmitOperation(SubmitOperationRequest) returns (SubmitOperationResponse);
  rpc GetDocumentHistory(GetDocumentHistoryRequest) returns (GetDocumentHistoryResponse);
}

message SubmitOperation {
  string client_id = 1;
  int64 base_version = 2;
  string op_type = 3; // INSERT, DELETE
  int32 position = 4;
  string content = 5;
}

message SubmitOperationRequest {
  string document_id = 1;
  SubmitOperation op = 2;
}

message SubmitOperationResponse {
  bool success = 1;
  int64 resolved_version = 2;
}

message GetDocumentHistoryRequest {
  string document_id = 1;
  int64 since_version = 2;
}

message GetDocumentHistoryResponse {
  repeated SubmitOperation ops = 1;
  int64 current_version = 2;
}
```
