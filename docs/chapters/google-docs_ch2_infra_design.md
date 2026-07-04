# Google Docs Case Study - Chapter 2: Infrastructure Modeling

## 1. Formalizing the System Topology Graph

To simulate, evaluate, and inspect cloud-scale infrastructure layouts, an architect must represent the topology as a mathematically rigorous directed graph:
$$G = (V, E)$$
where:
- **Vertices ($V$)**: Represent discrete infrastructure resource elements (e.g., compute node containers, load balancers, caches, database clusters, routing gateways).
- **Directed Edges ($E$)**: Represent communication paths connecting vertices, where an edge $e = (u, v) \in E$ indicates that vertex $u$ (source) transmits data packets or executes remote calls to vertex $v$ (target).

```
       [ Gateway Node ] ---> [ Sync WebSocket Node ] ---> [ OT Engine Node ]
             |
             +--------------> [ Reader API Node ] ---> [ PostgreSQL DB Node ]
```

---

## 2. Vertex Node Attributes for Google Docs

We define node properties based on their functional characteristics:

### 2.1 Live WebSocket Sync Gateways (Connection-Heavy)
- **Replicas**: Scaled based on active concurrent WebSocket connections.
- **Memory Optimization**: Memory allocation per socket connection is restricted to under 15KB to maximize connection density on bare-metal systems.

### 2.2 Relational Metadata Database Nodes (Stateful)
- **RAM allocation**: Sized to hold active database indexes (such as document pathways and metadata indexes) in memory (Buffer Pool).
- **Provisioned IOPS**: Minimum of 15,000 IOPS on SSD storage to handle write-heavy snapshot updates.

### 2.3 Object Storage Nodes (Media/Document Storage)
- **Storage Tiering**: Transition rules from hot storage (Standard S3) to warm/cold storage (S3 Glacier) based on access frequency.

---

## 3. Serializing the Graph: JSON Schema Representation

```json
{
  "diagramId": "googledocs-core-topology",
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
      "id": "node-websocket-sync",
      "label": "WebSocket Sync Gateways",
      "type": "connection-compute",
      "settings": {
        "replicas": 64,
        "maxConnPerNode": 50000
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
      "id": "node-redis-cache",
      "label": "Redis OT Cache",
      "type": "cache",
      "settings": {
        "ram": 256,
        "iops": 50000
      }
    }
  ],
  "edges": [
    {
      "id": "edge-edge-to-websocket",
      "source": "node-ingress-edge",
      "target": "node-websocket-sync",
      "protocol": "http2-websockets"
    },
    {
      "id": "edge-websocket-to-redis",
      "source": "node-websocket-sync",
      "target": "node-redis-cache",
      "protocol": "resp"
    }
  ]
}
```
