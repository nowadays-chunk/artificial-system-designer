# Dropbox Case Study - Chapter 1: Infrastructure Architecture Design

## 1. Introduction and System Scale Requirements

Designing the infrastructure architecture for a cloud storage and file synchronization platform at the scale of Dropbox (500M+ Daily Active Users) requires separating high-throughput binary block storage transmission from low-latency file metadata operations.

The system must handle:
- **Write Volume (Uploads/Updates)**: Average of 3,000 file mutations/uploads per second, peaking at 7,000+ uploads per second.
- **Read Volume (Downloads/Syncs)**: Average of 50,000 download/sync actions per second, peaking at 120,000+ requests per second.
- **Data Footprint**: Exabytes of active binary data storage requiring deduplication and delta synchronization.

To satisfy these requirements, the architecture decouples binary block uploads from file hierarchy metadata storage.

---

## 2. Ingress Architecture and Path Splitting

```
  Ingress Path:
  [ Ingress Gateway (Anycast, SSL/TLS Terminate) ]
         |
         +-------------------------+-------------------------+
         | (Metadata Operations)                             | (Block Data Operations)
         v                                                   v
  [ Metadata Service ]                                [ Block Service ]
         |                                                   |
         +===> Read Namespaces (MySQL Primary/Replicas)      +===> Fetch Block (S3 Block Storage)
         |                                                   |
         +===> Lock Management (Redis Cache Pool)            +===> Block Deduplication (Index Hash DB)
```

### 2.1 Metadata Operations Path
1. **Metadata Service**: Handles requests for directory listings, file renaming, permissions updates, and synchronization metadata handshakes.
2. **Metadata Persistence**: Queries MySQL master-replica databases (to store file namespaces) and Redis cache pools (to handle user folder concurrency locks).

### 2.2 Block Data Operations Path
1. **Block Service**: Handles raw binary block transfers. Files are split into 4MB chunks (blocks) on the client side before transmission.
2. **Block Deduplication**: The service computes a cryptographic SHA-256 hash of each block and checks the Index Hash Database to see if the block already exists. If yes, the duplicate block upload is bypassed, saving network bandwidth.
3. **Block Persistence**: Unique blocks are uploaded to S3-compatible object storage vaults.
