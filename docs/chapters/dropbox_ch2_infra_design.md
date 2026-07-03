# Dropbox Case Study - Chapter 2: Infrastructure Modeling

## 1. Directed Dependency Graph for File Synchronization

We represent Dropbox's block upload and namespace synchronization architecture as a directed dependency graph:
$$G = (V, E)$$
where:
- **Vertices ($V$)**: Represent infrastructure services (e.g., API Gateways, Block Service, Metadata Registry, MySQL Database, S3 Bucket).
- **Directed Edges ($E$)**: Represent communication and data-flow links.

```
       [ Client Gateway ] ---> [ Block Service ] ---> [ S3 Object Store ]
              |
              +--------------> [ Metadata Registry ] ---> [ MySQL Clusters ]
```

---

## 2. Vertex Node Attributes for Dropbox

### 2.1 Block Ingestion Services (Compute Nodes)
- **Replicas**: Scaled based on active data connection channels.
- **CPU Allocations**: Typically provisioned with 4 vCPUs per replica to handle concurrent network transfers.

### 2.2 Relational Namespace Database Nodes (Stateful)
- **RAM allocations**: Sized to hold active directory tree indexes in memory.
- **Disk IOPS**: Minimum of 15,000 IOPS on SSDs to handle write-heavy metadata edits.

---

## 3. Serializing the Graph: JSON Schema Representation

```json
{
  "diagramId": "dropbox-core-topology",
  "version": 1,
  "nodes": [
    {
      "id": "node-block-s3",
      "label": "S3 Block Storage",
      "type": "bucket-storage",
      "settings": {
        "storageClass": "Standard",
        "encryption": "AES-256"
      }
    },
    {
      "id": "node-metadata-mysql",
      "label": "MySQL Metadata Cluster",
      "type": "database",
      "settings": {
        "ram": 128,
        "iops": 20000
      }
    },
    {
      "id": "node-redis-lock-manager",
      "label": "Redis Lock Manager",
      "type": "cache",
      "settings": {
        "ram": 64,
        "iops": 15000
      }
    }
  ],
  "edges": [
    {
      "id": "edge-block-to-s3",
      "source": "node-block-s3",
      "target": "node-redis-lock-manager",
      "protocol": "grpc-tls"
    }
  ]
}
```
