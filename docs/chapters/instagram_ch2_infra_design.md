# Instagram Case Study - Chapter 2: Infrastructure Modeling

## 1. Formalizing the System Topology Graph

We model Instagram's infrastructure layout as a directed dependency graph:
$$G = (V, E)$$
where:
- **Vertices ($V$)**: Represent infrastructure services (e.g., Ingress Gateways, Media Transcoders, Caching Clusters, Object Buckets).
- **Directed Edges ($E$)**: Represent communication links between services.

```
       [ Gateway Node ] ---> [ Media Upload Node ] ---> [ Transcoder Node ] ---> [ S3 Bucket Node ]
             |
             +--------------> [ Feed Service Node ] ---> [ Redis Cache Node ]
```

---

## 2. Vertex Node Attributes for Instagram

We define node properties based on their functional characteristics:

### 2.1 Media Transcoding Services (Compute-Heavy)
- **Replicas**: Scaled based on active transcoding queue sizes.
- **CPU Allocations**: Typically provisioned with high-compute virtual cores (e.g., 4 vCPUs per worker pod) to process video compression.

### 2.2 Relational Metadata Database Nodes (Stateful)
- **RAM allocation**: Sized to hold active database indexes in memory (Buffer Pool).
- **Provisioned IOPS**: Minimum of 15,000 IOPS on SSD storage to handle write-heavy metadata updates.

### 2.3 Object Storage Nodes (Media Persistence)
- **Storage Tiering**: Transition rules from hot storage (Standard S3) to warm/cold storage (S3 Glacier) based on access frequency.

---

## 3. Serializing the Graph: JSON Schema Representation

The following schema defines the core Instagram graph topology:

```json
{
  "diagramId": "instagram-core-topology",
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
      "label": "Media Transcoder Pool",
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
