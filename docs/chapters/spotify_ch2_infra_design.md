# Spotify Case Study - Chapter 2: Infrastructure Modeling

## 1. Formalizing the System Topology Graph

To simulate, evaluate, and inspect cloud-scale infrastructure layouts, an architect must represent the topology as a mathematically rigorous directed graph:
$$G = (V, E)$$
where:
- **Vertices ($V$)**: Represent discrete infrastructure resource elements (e.g., compute node containers, load balancers, caches, database clusters, routing gateways).
- **Directed Edges ($E$)**: Represent communication paths connecting vertices, where an edge $e = (u, v) \in E$ indicates that vertex $u$ (source) transmits data packets or executes remote calls to vertex $v$ (target).

```
       [ Gateway Node ] ---> [ Audio Ingestion Node ] ---> [ Transcoder Node ] ---> [ S3 Bucket Node ]
             |
             +--------------> [ Playback Service Node ] ---> [ Redis Cache Node ]
```

---

## 2. Vertex Node Attributes for Spotify

We define node properties based on their functional characteristics:

### 2.1 Audio Transcoding Services (Compute-Heavy)
- **Replicas**: Scaled based on active transcoding queue sizes.
- **CPU Allocations**: Typically provisioned with high-compute virtual cores (e.g., 4 vCPUs per worker pod) to process audio compression.

### 2.2 Relational Metadata Database Nodes (Stateful)
- **RAM allocation**: Sized to hold active database indexes in memory (Buffer Pool).
- **Provisioned IOPS**: Minimum of 15,000 IOPS on SSD storage to handle write-heavy metadata updates.

### 2.3 Object Storage Nodes (Media Persistence)
- **Storage Tiering**: Transition rules from hot storage (Standard S3) to warm/cold storage (S3 Glacier) based on access frequency.

---

## 3. Serializing the Graph: JSON Schema Representation

```json
{
  "diagramId": "spotify-core-topology",
  "version": 1,
  "nodes": [
    {
      "id": "node-ingress-edge",
      "label": "Anycast Edge Router",
      "type": "gateway",
      "settings": {
        "replicas": 12,
        "cpu": 4
      }
    },
    {
      "id": "node-transcoder-pool",
      "label": "Audio Transcoder Pool",
      "type": "worker-compute",
      "settings": {
        "replicas": 64,
        "cpu": 8
      }
    },
    {
      "id": "node-postgres-metadata",
      "label": "PostgreSQL Primary",
      "type": "database",
      "settings": {
        "ram": 128,
        "iops": 20000
      }
    },
    {
      "id": "node-s3-media-vault",
      "label": "S3 Object Store",
      "type": "bucket-storage",
      "settings": {
        "storageClass": "Standard",
        "encryption": "AES-256"
      }
    }
  ],
  "edges": [
    {
      "id": "edge-edge-to-transcoder",
      "source": "node-ingress-edge",
      "target": "node-transcoder-pool",
      "protocol": "http2-multiplex"
    },
    {
      "id": "edge-transcoder-to-s3",
      "source": "node-transcoder-pool",
      "target": "node-s3-media-vault",
      "protocol": "s3-api"
    }
  ]
}
```
