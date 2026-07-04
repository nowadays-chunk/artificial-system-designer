# YouTube Case Study - Chapter 1: Infrastructure Architecture Design

## 1. Introduction and System Scale Requirements

Designing the infrastructure architecture for a global video streaming platform like YouTube (2B+ monthly active users) introduces unique scaling challenges. Unlike image or text platforms, a video sharing platform must process exabytes of high-throughput binary files, run heavy transcoding computations, distribute media chunks to localized ISP caches, and resolve playback manifests dynamically.

The system must handle:
- **Write Volume (Uploads)**: Over 500 hours of video uploaded every minute globally.
- **Read Volume (Playback Sessions)**: Over 1 billion hours of video watched per day, requiring millions of concurrent streams.
- **Egress Bandwidth**: Multi-terabits per second of network egress delivered via edge networks.

To satisfy these requirements, the architecture decouples the **Video Ingestion & Transcoding Path** from the **Video Playback Read Path**.

---

## 2. Ingress Architecture and Path Splitting

To optimize performance, we split incoming client traffic at the API Gateway layer based on request path parameters:

```
  Ingress Path:
  [ Ingress Gateway (Anycast, SSL/TLS Terminate) ]
         |
         +-------------------------+-------------------------+
         | (Video Ingestion Path: /api/upload)               | (Video Playback Path: /api/playback)
         v                                                   v
  [ Ingestion Service ]                               [ Playback Broker ]
         |                                                   |
         +===> Write Metadata (PostgreSQL Primary)           +===> Read Catalog (PostgreSQL Replicas)
         |                                                   |
         +===> Upload Raw (GCS Bucket)                       +===> Stream Content (CDN / GGC Nodes)
```

### 2.1 Video Ingestion & Transcoding Path
The ingestion path handles raw files and indexes details:
1. **Ingestion API**: Receives raw video file chunks via HTTP chunked uploads.
2. **Metadata Ingestion**: Writes initial video details (owner, title, description) to the primary PostgreSQL database.
3. **Raw Storage Ingestion**: Raw video files are written directly to Google Cloud Storage (GCS) or internal blob storage.
4. **Queue Notification**: Once the upload completes, an ingestion event is published to start transcoding workers.

---

### 2.2 Pre-Signed S3/GCS Ingestion URL Pattern
To prevent application servers from bottlenecking on raw file transfers, we offload the binary upload traffic from the application gateway using **Pre-Signed GCS/S3 URLs**.

```
  Pre-Signed URL Ingestion Workflow:
  1. [ Client ] --( Post Video Metadata )--> [ API Gateway ]
  2. [ Client ] <--( Return Pre-Signed URL )-- [ API Gateway ]
  3. [ Client ] --( Upload Raw Video Chunks )---> [ GCS Bucket ]
```

The gateway validates the upload metadata and generates a secure, temporary GCS URL. The client app then uploads the raw video file directly to GCS.

#### Gateway pre-signed URL generator implementation:

```typescript
import { Storage } from "@google-cloud/storage";

export class IngestionService {
  private storage = new Storage({ projectId: "youtube-core" });
  private bucketName = "youtube-raw-media-uploads";

  /**
   * Generates a pre-signed GCS URL for direct client video uploads.
   * @param uploaderId Authenticated user ID
   * @param fileSizeBytes Size in bytes to enforce bucket limits
   */
  public async getUploadUrl(uploaderId: string, fileSizeBytes: number): Promise<{ uploadUrl: string; videoId: string }> {
    // 1. Enforce upload size limits (e.g. 5GB limit for raw video chunks)
    const MAX_SIZE = 5 * 1024 * 1024 * 1024;
    if (fileSizeBytes > MAX_SIZE) {
      throw new Error("File size exceeds maximum allowed upload size");
    }

    const videoId = `${uploaderId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const blobName = `raw/${uploaderId}/${videoId}`;
    const file = this.storage.bucket(this.bucketName).file(blobName);

    // 2. Generate pre-signed URL valid for 30 minutes
    const [uploadUrl] = await file.getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + 30 * 60 * 1000, // 30 minutes
      contentType: "video/mp4"
    });

    return { uploadUrl, videoId };
  }
}
```

---

## 3. The Video Playback Read Path

The read path serves streaming segments to clients:
1. **Manifest Retrieval**: The client queries the Playback Broker to initiate a session.
2. **Catalog Fetch**: The broker queries PostgreSQL read replicas to retrieve video format mappings (resolutions, bitrates, URLs).
3. **Edge Streaming**: The broker returns a manifest manifest (DASH/HLS). The client requests video segments directly from localized Google Global Cache (GGC) nodes co-located inside their Internet Service Provider (ISP) networks.
