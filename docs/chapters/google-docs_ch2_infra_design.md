# Google Docs Case Study - Chapter 2: Infrastructure Modeling

## 1. Directed Dependency Graph for Real-Time Collaboration

We represent Google Docs' edit resolution and sync delivery architecture as a directed dependency graph:
$$G = (V, E)$$
where:
- **Vertices ($V$)**: Represent infrastructure services (e.g., WebSockets Host, Sync Service, Redis Cache, PostgreSQL Cluster).
- **Directed Edges ($E$)**: Represent communication and data-flow links.

```
       [ Client Browser ] ===( WebSockets )===> [ WebSockets Host ] ---> [ Sync Service ]
                                                                                |
                                                                                v
                                                                        [ Redis Cluster ]
```

---

## 2. Vertex Node Attributes for Google Docs

### 2.1 WebSockets Connection Hosts (Compute Nodes)
- **Replicas**: Scaled based on active persistent socket connections.
- **Memory Allocations**: Typically provisioned with 8GB RAM per node to handle open TCP file descriptors.

### 2.2 Relational Document Database Nodes (Stateful)
- **RAM allocations**: Sized to hold active document metadata in memory.
- **Disk IOPS**: Minimum of 10,000 IOPS on SSDs to handle write-heavy snapshot storage.

---

## 3. Serializing the Graph: JSON Schema Representation

```json
{
  "diagramId": "google-docs-core-topology",
  "version": 1,
  "nodes": [
    {
      "id": "node-websockets-host",
      "label": "WebSockets Gateway Pool",
      "type": "gateway",
      "settings": {
        "maxConnections": 50000,
        "ram": 16
      }
    },
    {
      "id": "node-postgres-snapshots",
      "label": "PostgreSQL Snapshots DB",
      "type": "database",
      "settings": {
        "ram": 128,
        "iops": 15000
      }
    },
    {
      "id": "node-redis-ot-cache",
      "label": "Redis OT Operations Cache",
      "type": "cache",
      "settings": {
        "ram": 64,
        "iops": 25000
      }
    }
  ],
  "edges": [
    {
      "id": "edge-ws-to-sync",
      "source": "node-websockets-host",
      "target": "node-redis-ot-cache",
      "protocol": "grpc-multiplex"
    }
  ]
}
```
