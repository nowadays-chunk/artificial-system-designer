# Instagram Case Study - Chapter 1: Infrastructure Architecture Design

## 1. Introduction and System Scale Requirements

Designing the infrastructure architecture for a photo and video sharing platform at the scale of Instagram (500M+ Daily Active Users) introduces unique challenges in media storage, data retrieval, and real-time feed compilation.

The infrastructure must handle:
- **Write Volume (Uploads)**: Average of 1,000 high-resolution photos and videos uploaded per second, peaking at 3,000+ uploads per second.
- **Read Volume (Feed Views)**: Average of 150,000 feed requests per second, peaking at over 400,000 requests per second.
- **Data Footprint**: Petabytes of new binary media storage generated daily, requiring compression and storage pipelines.

To sustain this workload with sub-100ms feed load latencies and high upload success rates, the architecture separates the **Media Upload Write Path** from the **Feed Rendering Read Path**.

---

## 2. Write Path vs. Read Path Separation

```
  Ingress Path:
  [ Ingress Gateway (Anycast, Cloudflare Edge) ]
         |
         +-------------------------+-------------------------+
         | (Write Path)                                      | (Read Path)
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

### 2.2 The Feed Rendering Read Path
The read path retrieves and formats posts chronologically for users:
1. **Cache Lookup**: When a user opens the app, the Feed Service queries their pre-computed feed cache in Redis.
2. **Cache Miss Fallback**: If cache data is missing, the service queries PostgreSQL read replicas to retrieve the user's feed.
3. **Media Hydration**: The service returns the feed payload, containing media URLs pointing to geographic CDN edge servers (e.g., Cloudfront). The client app downloads the binaries directly from the CDN to minimize gateway bandwidth consumption.
