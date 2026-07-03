# Instagram Case Study - Chapter 5: System Integration and Interoperability

## 1. Asynchronous Transcoding Pipelines

When a user uploads a high-resolution photo or video, it must be compressed and formatted for diverse client devices (iOS, Android, Web) and network conditions.

```
       [ Upload Request ] ---> [ S3 Raw Bucket ] ---> [ Kafka Event ]
                                                            |
                                                            v
                                                  [ Transcoder Worker ]
                                                            |
                                                            v
                                                 [ S3 Optimized Bucket ]
```

### 1.1 Triggering Transcoding Jobs
1. **Raw Storage**: The client uploads the raw media file to a raw S3 bucket.
2. **Event Notification**: S3 publishes a notification event to a Kafka topic (`media-uploads`).
3. **Worker Consumer**: A transcoder worker consumes the event, downloads the raw file, and runs compression profiles.
4. **Resolution Targets**: The worker generates target resolutions (e.g., 1080p, 720p, 480p) and writes the optimized files to the production S3 bucket.

---

## 2. API Schema Integration Contracts

We define communication contracts between client devices and upload gateways using Protocol Buffers:

```protobuf
syntax = "proto3";

package instagram.media.v1;

service MediaUploadService {
  rpc InitiateUpload(InitiateUploadRequest) returns (InitiateUploadResponse);
  rpc CompleteUpload(CompleteUploadRequest) returns (CompleteUploadResponse);
}

message InitiateUploadRequest {
  string user_id = 1;
  string content_type = 2; // image/jpeg, video/mp4
  int64 file_size_bytes = 3;
}

message InitiateUploadResponse {
  string upload_session_id = 1;
  string upload_url = 2; // Pre-signed S3 URL
}

message CompleteUploadRequest {
  string upload_session_id = 1;
  string caption = 2;
  repeated string tags = 3;
}

message CompleteUploadResponse {
  string media_id = 1;
  bool success = 2;
}
```

This pre-signed URL workflow offloads file transfer traffic from the application gateways, routing binary uploads directly to Amazon S3.
