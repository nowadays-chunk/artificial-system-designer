# Instagram Case Study - Chapter 1: Infrastructure Architecture Design

## 1. Introduction and System Scale Requirements

Designing the infrastructure architecture for a global media-centric social platform like Instagram (500M+ Daily Active Users) introduces unique scaling challenges. Unlike text-based microblogging platforms, a photo and video sharing platform must process high-volume, binary media files (ranging from 100KB to 50MB+) alongside structured metadata (user follow relationships, comments, likes, tags).

The system must handle:
- **Write Volume (Uploads)**: Average of 1,000 high-resolution photos and videos uploaded per second, peaking at 3,000+ uploads per second.
- **Read Volume (Feed Views)**: Average of 150,000 feed requests per second, peaking at over 400,000 requests per second.
- **Egress Bandwidth**: Over 300 Gigabytes per second (2.4 Terabits per second) of video and image data delivered to global client players.

To sustain this workload with sub-100ms feed load latencies and high upload success rates, the architecture separates the **Media Upload Write Path** from the **Feed Rendering Read Path**.

---

## 2. Ingress Architecture and Path Splitting

To optimize performance, we split incoming client traffic at the API Gateway layer based on request path parameters:

```
  Ingress Path:
  [ Ingress Gateway (Anycast, Cloudflare Edge) ]
         |
         +-------------------------+-------------------------+
         | (Write Path: /api/upload)                         | (Read Path: /api/feed)
         v                                                   v
  [ Media Ingestion API ]                             [ Feed Service ]
         |                                                   |
         +===> Write Metadata (PostgreSQL Primary)           +===> Fetch Cached Feed (Redis)
         |                                                   |
         +===> Upload Binary (S3 Object Storage)             +===> Hydrate Metadata (PostgreSQL Replicas)
```

### 2.1 The Media Upload Write Path
The upload path handles binary file transfers and metadata storage:
1. **Ingress Gateway**: Cloudflare edge proxies terminate SSL/TLS connections and forward requests to the nearest entry gateway.
2. **Media Upload Service**: A stateless service that receives the image stream, generates a unique Media ID, and writes the raw binary file to a temporary storage buffer.
3. **Metadata Persistence**: The service writes media metadata (author ID, file location path, timestamps, caption text) to a primary PostgreSQL database.
4. **Binary Archival**: The service pushes the file to long-term storage in Amazon S3.

---

### 2.2 Pre-Signed S3 Upload URL Pattern
To prevent application servers from bottlenecking on raw file transfers, we offload the binary upload traffic from the application gateway using **Pre-Signed S3 URLs**.

```
  Pre-Signed URL Upload Workflow:
  1. [ Client ] --( Post Metadata Request )--> [ API Gateway ]
  2. [ Client ] <--( Return Pre-Signed URL )-- [ API Gateway ]
  3. [ Client ] --( Upload Binary Stream )---> [ S3 Bucket ]
```

The gateway validates the upload metadata and generates a secure, temporary S3 URL. The client app then uploads the binary file directly to S3.

#### Gateway pre-signed URL generator implementation:

```typescript
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export class UploadService {
  private s3Client = new S3Client({ region: "us-east-1" });
  private bucketName = "instagram-raw-media-uploads";

  /**
   * Generates a pre-signed S3 URL for direct client binary uploads.
   * @param userId Authenticated user ID
   * @param contentType MIME type of the upload (e.g. image/jpeg)
   * @param fileSizeBytes Size in bytes to enforce bucket limits
   */
  public async getUploadUrl(userId: string, contentType: string, fileSizeBytes: number): Promise<{ uploadUrl: string; mediaId: string }> {
    // 1. Enforce upload size limits
    const MAX_SIZE = 50 * 1024 * 1024; // 50MB limit
    if (fileSizeBytes > MAX_SIZE) {
      throw new Error("File size exceeds maximum allowed upload size");
    }

    const mediaId = `${userId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const objectKey = `raw/${userId}/${mediaId}`;

    // 2. Build S3 PutObject command
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: objectKey,
      ContentType: contentType,
      Metadata: {
        "owner-id": userId,
        "media-id": mediaId
      }
    });

    // 3. Generate pre-signed URL valid for 15 minutes
    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 900 });

    return { uploadUrl, mediaId };
  }
}
```

---

## 3. The Feed Rendering Read Path

The read path retrieves and formats posts chronologically for users:
1. **Cache Lookup**: When a user opens the app, the Feed Service queries their pre-computed feed cache in Redis.
2. **Cache Miss Fallback**: If cache data is missing, the service queries PostgreSQL read replicas to retrieve the user's feed.
3. **Media Hydration**: The service returns the feed payload, containing media URLs pointing to geographic CDN edge servers (e.g., Cloudfront). The client app downloads the binaries directly from the CDN to minimize gateway bandwidth consumption.
