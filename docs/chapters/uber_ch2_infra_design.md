# Uber Case Study - Chapter 2: Infrastructure Modeling

## 1. Formalizing the System Topology Graph

To simulate, evaluate, and inspect cloud-scale infrastructure layouts, an architect must represent the topology as a mathematically rigorous directed graph:
$$G = (V, E)$$
where:
- **Vertices ($V$)**: Represent discrete infrastructure resource elements (e.g., compute node containers, load balancers, caches, database clusters, routing gateways).
- **Directed Edges ($E$)**: Represent communication paths connecting vertices, where an edge $e = (u, v) \in E$ indicates that vertex $u$ (source) transmits data packets or executes remote calls to vertex $v$ (target).

```
       [ Client Device ] ===( WebSockets )===> [ Dispatcher Node ] ---> [ Redis Geohash Node ]
                                                     |
                                                     v
                                            [ Cassandra Trip Node ]
```

---

## 2. Vertex Node Attributes for Uber

We define node properties based on their functional characteristics:

### 2.1 Dispatcher Services (Connection & Real-Time Compute Nodes)
- **Replicas**: Scaled based on active trip matching loads and connections.
- **Memory Optimization**: Memory allocation per websocket connection is restricted to under 12KB to maximize connection density on bare-metal systems.

### 2.2 Relational Metadata Database Nodes (Stateful)
- **RAM allocation**: Sized to hold active database indexes (such as active billing ledger indexes) in memory (Buffer Pool).
- **Provisioned IOPS**: Minimum of 15,000 IOPS on SSD storage to handle write-heavy transaction updates.

### 2.3 Geospatial Coordinate Cache Nodes (High-Read/Write Cache Nodes)
- **RAM Sizing**: Configured with large Redis clusters to hold active driver coordinates in memory.
- **Latency target**: Read/write lookups must operate under 1ms.

---

## 3. Serializing the Graph: JSON Schema Representation

```json
{
  "diagramId": "uber-core-topology",
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
      "id": "node-dispatcher-service",
      "label": "Dispatcher Service Pods",
      "type": "match-compute",
      "settings": {
        "replicas": 48,
        "cpu": 4
      }
    },
    {
      "id": "node-cassandra-trips",
      "label": "Cassandra Trips Store",
      "type": "database",
      "settings": {
        "replicas": 6,
        "iops": 25000
      }
    },
    {
      "id": "node-redis-geohash",
      "label": "Redis Location Cache",
      "type": "cache",
      "settings": {
        "ram": 128,
        "iops": 60000
      }
    }
  ],
  "edges": [
    {
      "id": "edge-edge-to-dispatcher",
      "source": "node-ingress-edge",
      "target": "node-dispatcher-service",
      "protocol": "websockets"
    },
    {
      "id": "edge-dispatcher-to-cassandra",
      "source": "node-dispatcher-service",
      "target": "node-cassandra-trips",
      "protocol": "cql"
    },
    {
      "id": "edge-dispatcher-to-redis",
      "source": "node-dispatcher-service",
      "target": "node-redis-geohash",
      "protocol": "resp"
    }
  ]
}
```
