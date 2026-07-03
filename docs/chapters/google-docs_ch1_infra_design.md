# Google Docs Case Study - Chapter 1: Infrastructure Architecture Design

## 1. Introduction and System Scale Requirements

Designing the infrastructure architecture for a real-time collaborative document editing platform at the scale of Google Docs (500M+ Daily Active Users) requires managing high-concurrency document state synchronization with low latency.

The system must handle:
- **Write Volume (Edits/Operations)**: Average of 10,000 document edit mutations per second, peaking at 25,000+ operations per second.
- **Read Volume (Document Views)**: Average of 100,000 active document viewing sessions per second, peaking at 220,000+ requests per second.
- **Data Footprint**: Terabytes of real-time editing operation logs requiring conflict resolution.

To satisfy these requirements, the architecture decouples document viewing read paths from collaborative editing write paths.

---

## 2. Ingress Architecture and Path Splitting

```
  Ingress Path:
  [ Ingress Gateway (Anycast, SSL/TLS Terminate) ]
         |
         +-------------------------+-------------------------+
         | (Collaborative Edits)                             | (Document Reading)
         v                                                   v
  [ Dynamic Sync Service ]                            [ Document View API ]
         |                                                   |
         +===> Operation Resolver (Redis Cache Pool)         +===> Fetch Snapshot (PostgreSQL Replicas)
         |                                                   |
         +===> Broadcast Updates (WebSockets Gateway)        +===> Fetch Media Assets (S3 Bucket)
```

### 2.1 Collaborative Edits Path
1. **Dynamic Sync Service**: Manages active collaborative sessions. It receives character insertion/deletion operations, resolves conflict states, and broadcasts updates.
2. **Operation Resolver**: Queries Redis cache pools (to resolve real-time operation order and locks) and WebSockets gateways (to push updates to concurrent editors).

### 2.2 Document Reading Path
1. **Document View API**: Handles requests for document content snapshots.
2. **Snapshot Persistence**: Queries PostgreSQL read replicas (to retrieve document structure metadata) and S3 buckets (to fetch embedded images or assets).
