# Spotify Case Study - Chapter 5: System Integration and Interoperability

## 1. Recommendation Ingestion Telemetry Pipelines

Spotify's recommendation engine (generating Discover Weekly and Daily Mixes) relies on user activity telemetry streams:
- **Telemetry Client**: The client player sends events (e.g., track played, track skipped, playlist created) to the ingress gateway.
- **Message Bus (Kafka)**: The gateway publishes telemetry events to partitioned Kafka topics (`play-telemetry`).
- **Processing Engine**: Apache Spark and Flink consume the event streams to build user affinity profiles and generate recommendation models.

```
       [ Client Player ] ---> [ Ingress Gateway ] ---> [ Kafka Topic ]
                                                             |
                                                             v
                                                   [ Flink Processor ]
                                                             |
                                                             v
                                                 [ Recommendation Model ]
```

---

## 2. API Schema Definitions for Playback Session Handshakes

We define communication contracts between client players and session controllers using Protocol Buffers:

```protobuf
syntax = "proto3";

package spotify.playback.v1;

service PlaybackSessionService {
  rpc InitiatePlayback(InitiatePlaybackRequest) returns (InitiatePlaybackResponse);
  rpc LogPlaybackEvent(LogPlaybackEventRequest) returns (LogPlaybackEventResponse);
}

message InitiatePlaybackRequest {
  string user_id = 1;
  string track_id = 2;
  string device_id = 3;
}

message InitiatePlaybackResponse {
  string stream_url = 1; // Pre-signed CDN endpoint URL
  string decryption_key_id = 2;
  bool success = 3;
}

message LogPlaybackEventRequest {
  string user_id = 1;
  string track_id = 2;
  string event_type = 3; // PLAY, SKIP, PAUSE, STOP
  int64 event_timestamp = 4;
}

message LogPlaybackEventResponse {
  bool status = 1;
}
```
