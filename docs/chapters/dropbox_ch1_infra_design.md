# Dropbox Case Study - Chapter 1: Infrastructure Architecture Design

## 1. Introduction and System Scale Requirements

Designing the infrastructure architecture for a global file synchronization and cloud storage platform like Dropbox (700M+ users) introduces unique scaling challenges. Unlike social media platforms, a file synchronization platform must process block-level binary uploads, track file metadata modifications across devices, and ensure strict consistency.

The system must handle:
- **Write Volume (Uploads)**: Average of 10,000 file chunks uploaded per second, requiring real-time block hashing, deduplication, and metadata updates.
- **Read Volume (Downloads)**: Average of 50,000 file downloads and sync queries per second.
- **Data Footprint**: Exabytes of user file data requiring chunking, deduplication, and replication across geographic storage arrays.

To sustain this workload with sub-second sync latencies and high durability, the architecture separates the **Block Ingestion Write Path** from the **File Retrieval Read Path**.

---

## 2. Ingress Architecture and Path Splitting

To optimize performance, we split incoming client traffic at the API Gateway layer based on request path parameters:

```
  Ingress Path:
  [ Ingress Gateway (Anycast, Cloudflare Edge) ]
         |
         +-------------------------+-------------------------+
         | (Write Path: /api/upload)                         | (Read Path: /api/download)
         v                                                   v
  [ Block Ingestion API ]                             [ File Retrieval Service ]
         |                                                   |
         +===> Query Index (PostgreSQL Primary)              +===> Fetch Registry (PostgreSQL Replicas)
         |                                                   |
         +===> Upload Chunk (S3 / Block Storage)             +===> Reconstruct File (Block Storage)
```

### 2.1 The Block Ingestion Write Path
The upload path handles chunked transfers and block deduplication:
1. **Client Chunking**: The client application splits files into 4MB chunks and computes SHA-256 hashes for each chunk locally.
2. **Deduplication Check**: The client sends hashes to the Block Ingestion API. The API queries a global block index database. If a hash already exists, the block upload is bypassed, saving bandwidth.
3. **Block Upload**: For unique chunks, the API generates a pre-signed S3 upload URL. The client uploads the binary block directly to S3.
4. **Metadata Update**: The client writes file metadata (filename, path, block directory list) to the primary PostgreSQL database once all chunks are verified.

---

### 2.2 Pre-Signed S3 Upload URL Pattern
To prevent application servers from bottlenecking on raw file transfers, we offload the binary upload traffic from the application gateway using **Pre-Signed S3 URLs**.

```
  Pre-Signed URL Ingestion Workflow:
  1. [ Client ] --( Post Block Hashes )--> [ API Gateway ]
  2. [ Client ] <--( Return Pre-Signed URL )-- [ API Gateway ]
  3. [ Client ] --( Upload Chunk Stream )---> [ S3 Bucket ]
```

The gateway validates the upload metadata and generates a secure, temporary S3 URL. The client app then uploads the binary block directly to S3.

#### Gateway pre-signed URL generator implementation:

```typescript
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export class BlockUploadService {
  private s3Client = new S3Client({ region: "us-east-1" });
  private bucketName = "dropbox-block-storage";

  /**
   * Generates a pre-signed S3 URL for direct client block uploads.
   * @param userId Authenticated user ID
   * @param blockHash SHA-256 hash of the block
   * @param blockSizeBytes Size in bytes (default 4MB)
   */
  public async getUploadUrl(userId: string, blockHash: string, blockSizeBytes: number): Promise<{ uploadUrl: string; blockKey: string }> {
    // 1. Enforce block size limits (standard 4MB chunk size)
    const MAX_SIZE = 4 * 1024 * 1024;
    if (blockSizeBytes > MAX_SIZE) {
      throw new Error("Block size exceeds maximum allowed chunk limit");
    }

    const blockKey = `blocks/${blockHash}`;

    // 2. Build S3 PutObject command
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: blockKey,
      ContentType: "application/octet-stream",
      Metadata: {
        "owner-id": userId,
        "block-hash": blockHash
      }
    });

    // 3. Generate pre-signed URL valid for 15 minutes
    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 900 });

    return { uploadUrl, blockKey };
  }
}
```

---

## 3. The File Retrieval Read Path

The read path reconstructs and downloads files:
1. **Metadata Lookup**: The client queries the File Retrieval Service with a file path parameter.
2. **Chunk Registry Fetch**: The service queries PostgreSQL read replicas to retrieve the ordered list of SHA-256 block hashes for the file.
3. **Block Downloads**: The service returns a manifest containing pre-signed download URLs for the blocks. The client downloads the blocks in parallel directly from storage and reconstructs the file locally.
