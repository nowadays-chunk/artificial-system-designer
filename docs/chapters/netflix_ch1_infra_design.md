# Netflix Case Study - Chapter 1: Infrastructure Architecture Design

## 1. Introduction and System Scale Requirements

Designing the infrastructure architecture for a global subscription video-on-demand platform like Netflix (250M+ active members) introduces unique scaling and computational challenges. Unlike platforms that serve small, transactional payloads, a video streaming architecture must handle exabytes of binary files, distribute compute-intensive encoding tasks, manage dynamic playback licensing (DRM), and route traffic to thousands of localized Open Connect CDN edge appliances.

The system must handle:
- **Write Path (Video Ingestion & Encoding)**: Ingestion of high-resolution master video files (e.g. 4K HDR ProRes sources at 100+ GB per hour of footage) and encoding them into thousands of format/bitrate permutations.
- **Read Path (Video Streaming)**: Over 100 million concurrent playback sessions, requiring low-latency manifest resolution and CDN selection.
- **Egress Bandwidth**: Peak aggregate egress rates exceeding 100 Terabits per second (Tbps) globally.

To satisfy these requirements, the architecture decouples the **Video Ingestion & Encoding Path** from the **High-Availability Playback Read Path**.

---

## 2. Ingress Architecture and Path Splitting

To optimize performance, we split incoming client traffic at the API Gateway layer based on request path parameters:

```
  Ingress Path:
  [ Ingress Gateway (Anycast, SSL/TLS Terminate) ]
         |
         +-------------------------+-------------------------+
         | (Video Ingestion Path: /api/ingest)               | (Video Playback Path: /api/play)
         v                                                   v
  [ Ingestion API ]                                   [ Playback Broker ]
         |                                                   |
         +===> Write Catalog (Cassandra Primary)             +===> Read Catalog (Cassandra Replicas)
         |                                                   |
         +===> Upload Source (S3 Bucket)                     +===> Stream Video Chunks (Open Connect CDN)
```

### 2.1 Video Ingestion & Encoding Path
The ingestion path handles raw files and indexes details:
1. **Ingestion API**: Receives raw video file chunks via HTTP chunked uploads.
2. **Metadata Ingestion**: Writes initial video details (owner, title, description) to a primary Cassandra database.
3. **Raw Storage Ingestion**: Raw video files are written directly to Amazon S3 buckets.
4. **Queue Notification**: Once the upload completes, an ingestion event is published to start transcoding workers.

---

### 2.2 Pre-Signed S3/GCS Ingestion URL Pattern
To prevent application servers from bottlenecking on raw file transfers, we offload the binary upload traffic from the application gateway using **Pre-Signed S3 URLs**.

```
  Pre-Signed URL Ingestion Workflow:
  1. [ Client ] --( Post Video Metadata )--> [ API Gateway ]
  2. [ Client ] <--( Return Pre-Signed URL )-- [ API Gateway ]
  3. [ Client ] --( Upload Raw Video Chunks )---> [ S3 Bucket ]
```

The gateway validates the upload metadata and generates a secure, temporary S3 URL. The client app then uploads the raw video file directly to S3.

#### Gateway pre-signed URL generator implementation:

```typescript
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export class IngestionService {
  private s3Client = new S3Client({ region: "us-east-1" });
  private bucketName = "netflix-raw-media-uploads";

  /**
   * Generates a pre-signed S3 URL for direct client video uploads.
   * @param uploaderId Authenticated user ID
   * @param fileSizeBytes Size in bytes to enforce bucket limits
   */
  public async getUploadUrl(uploaderId: string, fileSizeBytes: number): Promise<{ uploadUrl: string; videoId: string }> {
    // Enforce upload size limits (e.g. 100GB limit for raw video chunks)
    const MAX_SIZE = 100 * 1024 * 1024 * 1024;
    if (fileSizeBytes > MAX_SIZE) {
      throw new Error("File size exceeds maximum allowed upload size");
    }

    const videoId = `${uploaderId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const objectKey = `raw/${uploaderId}/${videoId}`;

    // Generate pre-signed URL valid for 30 minutes
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: objectKey,
      ContentType: "video/quicktime" // Typically Apple ProRes format
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 1800 });

    return { uploadUrl, videoId };
  }
}
```

---

## 3. High-Availability Playback Read Path

The read path serves streaming segments to clients:
1. **Manifest Retrieval**: The client queries the Playback Broker to initiate a session.
2. **Catalog Fetch**: The broker queries Cassandra read replicas to retrieve video format mappings (resolutions, bitrates, URLs).
3. **Edge Streaming**: The broker returns a manifest manifest (DASH/HLS). The client requests video segments directly from localized Open Connect CDN edge appliances co-located inside their Internet Service Provider (ISP) networks.
