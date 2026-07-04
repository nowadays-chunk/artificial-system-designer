# YouTube Case Study - Chapter 2: Infrastructure Modeling

## 1. Formalizing the System Topology Graph

To simulate, evaluate, and inspect cloud-scale infrastructure layouts, an architect must represent the topology as a mathematically rigorous directed graph:
$$G = (V, E)$$
where:
- **Vertices ($V$)**: Represent discrete infrastructure resource elements (e.g., compute node containers, load balancers, caches, database clusters, routing gateways).
- **Directed Edges ($E$)**: Represent communication paths connecting vertices, where an edge $e = (u, v) \in E$ indicates that vertex $u$ (source) transmits data packets or executes remote calls to vertex $v$ (target).

```
       [ Gateway Node ] ---> [ Ingestion Node ] ---> [ Transcoding Node ] ---> [ GCS Storage Node ]
             |
             +--------------> [ Playback Node ] ---> [ GGC Cache Node ]
```

---

## 2. Vertex Node Attributes for YouTube

We define node properties based on their functional characteristics:

### 2.1 Transcoding Services (Compute-Heavy)
- **Replicas**: Scaled based on active transcoding queue sizes.
- **CPU Allocations**: Typically provisioned with high-compute virtual cores (e.g., 8 vCPUs per worker pod) or custom ASIC chips (like the Argos VPU) to process video compression.

### 2.2 Relational Metadata Database Nodes (Stateful)
- **RAM allocation**: Sized to hold active database indexes (such as video catalog listings) in memory (Buffer Pool).
- **Provisioned IOPS**: Minimum of 15,000 IOPS on SSD storage to handle write-heavy catalog updates.

### 2.3 Edge Caching Nodes (Google Global Cache)
- **Cache Sizing**: Terabytes of high-speed SSD cache buffers deployed inside partner ISP datacenters.
- **Hit Rate Target**: Cache hit ratio target >98% for local streaming files.

---

## 3. Serializing the Graph: JSON Schema Representation

```json
{
  "diagramId": "youtube-core-topology",
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
      "id": "node-transcoding-pool",
      "label": "Argos VPU Transcoder Cluster",
      "type": "worker-compute",
      "settings": {
        "replicas": 128,
        "coresPerNode": 64
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
      "id": "node-ggc-edge",
      "label": "Google Global Cache Node",
      "type": "cdn-edge",
      "settings": {
        "cacheCapacityTB": 1000,
        "hitRateTarget": 0.98
      }
    }
  ],
  "edges": [
    {
      "id": "edge-edge-to-transcoder",
      "source": "node-ingress-edge",
      "target": "node-transcoding-pool",
      "protocol": "http2-multiplex"
    },
    {
      "id": "edge-transcoder-to-ggc",
      "source": "node-transcoding-pool",
      "target": "node-ggc-edge",
      "protocol": "private-backbone"
    }
  ]
}
```
