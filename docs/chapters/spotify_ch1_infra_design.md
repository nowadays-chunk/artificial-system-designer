# Spotify Case Study - Chapter 1: Infrastructure Architecture Design

## 1. Introduction and System Scale Requirements

Designing the infrastructure architecture for a global music streaming platform like Spotify (500M+ Active Users) introduces unique scaling challenges. Unlike text-based social networks, an audio platform must process high-volume, binary media files (ranging from 5MB to 100MB+) alongside structured metadata (user follow relationships, playlists, search catalogs).

The system must handle:
- **Write Volume (Ingestion)**: Average of 100 high-resolution audio tracks ingested per minute, requiring multi-codec encoding and regional storage.
- **Read Volume (Stream Playbacks)**: Average of 100,000 stream requests per second, peaking at over 300,000 playbacks per second.
- **Egress Bandwidth**: Over 500 Gigabytes per second (4.0 Terabits per second) of audio data delivered to global client players.

To sustain this workload with sub-100ms playback start latencies and high availability, the architecture separates the **Audio Ingestion Write Path** from the **Playback Read Path**.

---

## 2. Ingress Architecture and Path Splitting

To optimize performance, we split incoming client traffic at the API Gateway layer based on request path parameters:

```
  Ingress Path:
  [ Ingress Gateway (Anycast, Cloudflare Edge) ]
         |
         +-------------------------+-------------------------+
         | (Write Path: /api/ingest)                         | (Read Path: /api/play)
         v                                                   v
  [ Audio Ingestion API ]                             [ Playback Service ]
         |                                                   |
         +===> Write Metadata (PostgreSQL Primary)           +===> Fetch Cached Playlist (Redis)
         |                                                   |
         +===> Upload Binary (S3 Object Storage)             +===> Stream Audio (CDN Edge Nodes)
```

### 2.1 The Audio Ingestion Write Path
The upload path handles binary file transfers and metadata storage:
1. **Ingress Gateway**: Cloudflare edge proxies terminate SSL/TLS connections and forward requests to the nearest entry gateway.
2. **Audio Ingestion Service**: A stateless service that receives the audio stream, generates a unique Track ID, and writes the raw binary file to a temporary storage buffer.
3. **Metadata Persistence**: The service writes track metadata (artist ID, album ID, duration, audio formats) to a primary PostgreSQL database.
4. **Binary Archival**: The service pushes the file to long-term storage in Amazon S3.

---

### 2.2 Pre-Signed S3 Upload URL Pattern
To prevent application servers from bottlenecking on raw file transfers, we offload the binary upload traffic from the application gateway using **Pre-Signed S3 URLs**.

```
  Pre-Signed URL Ingestion Workflow:
  1. [ Client ] --( Post Metadata Request )--> [ API Gateway ]
  2. [ Client ] <--( Return Pre-Signed URL )-- [ API Gateway ]
  3. [ Client ] --( Upload Binary Stream )---> [ S3 Bucket ]
```

The gateway validates the upload metadata and generates a secure, temporary S3 URL. The client app then uploads the binary file directly to S3.

#### Gateway pre-signed URL generator implementation:

```typescript
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export class IngestionService {
  private s3Client = new S3Client({ region: "us-east-1" });
  private bucketName = "spotify-raw-audio-ingestion";

  /**
   * Generates a pre-signed S3 URL for direct client binary uploads.
   * @param artistId Authenticated artist ID
   * @param contentType MIME type of the upload (e.g. audio/wav)
   * @param fileSizeBytes Size in bytes to enforce bucket limits
   */
  public async getUploadUrl(artistId: string, contentType: string, fileSizeBytes: number): Promise<{ uploadUrl: string; trackId: string }> {
    // 1. Enforce upload size limits
    const MAX_SIZE = 100 * 1024 * 1024; // 100MB limit
    if (fileSizeBytes > MAX_SIZE) {
      throw new Error("File size exceeds maximum allowed upload size");
    }

    const trackId = `${artistId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const objectKey = `raw/${artistId}/${trackId}`;

    // 2. Build S3 PutObject command
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: objectKey,
      ContentType: contentType,
      Metadata: {
        "artist-id": artistId,
        "track-id": trackId
      }
    });

    // 3. Generate pre-signed URL valid for 15 minutes
    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 900 });

    return { uploadUrl, trackId };
  }
}
```

---

## 3. The Playback Read Path

The read path retrieves and formats tracks for users:
1. **Cache Lookup**: When a user selects a playlist, the Playback Service queries their playlist cache in Redis.
2. **Cache Miss Fallback**: If cache data is missing, the service queries PostgreSQL read replicas to retrieve the tracks list.
3. **Audio Hydration**: The service returns the playback payload, containing audio URLs pointing to geographic CDN edge servers. The client app streams the binaries directly from the CDN to minimize gateway bandwidth consumption.
