# Dropbox Case Study - Chapter 5: System Integration and Interoperability

## 1. Real-Time Synchronization Telemetry Pipelines

To notify client applications of folder updates (e.g., when a shared file is updated by another user):
- **WebSockets Gateways**: Client apps establish persistent WebSocket connections to notification servers.
- **Message Broker (Kafka)**: When a file update commits to PostgreSQL, a database trigger publishes a sync event to a Kafka topic (`sync-events`).
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

## 2. API Schema Definitions for Block Handshakes

We define communication contracts between client players and sync gateways using Protocol Buffers:

```protobuf
syntax = "proto3";

package dropbox.sync.v1;

service SyncService {
  rpc CheckBlockExistence(CheckBlockExistenceRequest) returns (CheckBlockExistenceResponse);
  rpc RegisterBlockUpload(RegisterBlockUploadRequest) returns (RegisterBlockUploadResponse);
}

message CheckBlockExistenceRequest {
  string user_id = 1;
  repeated string block_hashes = 2; // SHA-256 hashes
}

message CheckBlockExistenceResponse {
  repeated string missing_block_hashes = 1; // Upload only these
}

message RegisterBlockUploadRequest {
  string user_id = 1;
  string file_path = 2;
  repeated string block_hashes = 3;
}

message RegisterBlockUploadResponse {
  bool success = 1;
  int64 version = 2;
}
```
