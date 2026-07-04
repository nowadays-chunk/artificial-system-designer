# Dropbox Case Study - Chapter 2: Infrastructure Modeling

## 1. Formalizing the System Topology Graph

To simulate, evaluate, and inspect cloud-scale infrastructure layouts, an architect must represent the topology as a mathematically rigorous directed graph:
$$G = (V, E)$$
where:
- **Vertices ($V$)**: Represent discrete infrastructure resource elements (e.g., compute node containers, load balancers, caches, database clusters, routing gateways).
- **Directed Edges ($E$)**: Represent communication paths connecting vertices, where an edge $e = (u, v) \in E$ indicates that vertex $u$ (source) transmits data packets or executes remote calls to vertex $v$ (target).

```
       [ Gateway Node ] ---> [ Ingestion Node ] ---> [ Metadata DB Node ]
             |
             +--------------> [ Retrieval Node ] ---> [ Redis Cache Node ]
```

---

## 2. Vertex Node Attributes for Dropbox

We define node properties based on their functional characteristics:

### 2.1 Block Ingestion Services (Compute-Heavy)
- **Replicas**: Scaled based on active uploads and deduplication check volumes.
- **CPU Allocations**: Typically provisioned with high-compute virtual cores (e.g., 4 vCPUs per worker pod) to process SHA-256 validation queries.

### 2.2 Relational Metadata Database Nodes (Stateful)
- **RAM allocation**: Sized to hold active database indexes (such as file paths and block listings) in memory (Buffer Pool).
- **Provisioned IOPS**: Minimum of 15,000 IOPS on SSD storage to handle write-heavy namespace updates.

### 2.3 Object Storage Nodes (Media Persistence)
- **Storage Tiering**: Transition rules from hot storage (Standard S3) to warm/cold storage (S3 Glacier) based on access frequency.

---

## 3. Serializing the Graph: JSON Schema Representation

```json
{
  "diagramId": "dropbox-core-topology",
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
      "id": "node-ingestion-pool",
      "label": "Block Ingestion Pool",
      "type": "worker-compute",
      "settings": {
        "replicas": 64,
        "cpu": 4
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
      "label": "S3 Block Store",
      "type": "bucket-storage",
      "settings": {
        "storageClass": "Standard",
        "encryption": "AES-256"
      }
    }
  ],
  "edges": [
    {
      "id": "edge-edge-to-ingestion",
      "source": "node-ingress-edge",
      "target": "node-ingestion-pool",
      "protocol": "http2-multiplex"
    },
    {
      "id": "edge-ingestion-to-s3",
      "source": "node-ingestion-pool",
      "target": "node-s3-media-vault",
      "protocol": "s3-api"
    }
  ]
}
```
