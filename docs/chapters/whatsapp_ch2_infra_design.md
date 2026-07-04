# WhatsApp Case Study - Chapter 2: Infrastructure Modeling

## 1. Formalizing the System Topology Graph

To simulate, evaluate, and inspect cloud-scale infrastructure layouts, an architect must represent the topology as a mathematically rigorous directed graph:
$$G = (V, E)$$
where:
- **Vertices ($V$)**: Represent discrete infrastructure resource elements (e.g., compute node containers, load balancers, caches, database clusters, routing gateways).
- **Directed Edges ($E$)**: Represent communication paths connecting vertices, where an edge $e = (u, v) \in E$ indicates that vertex $u$ (source) transmits data packets or executes remote calls to vertex $v$ (target).

```
       [ Client Device ] ===( TCP / TLS )===> [ Erlang Gateway Node ] ---> [ Router Node ]
                                                     |                          |
                                                     v                          v
                                            [ Presence Node ]          [ MySQL Shard Node ]
```

---

## 2. Vertex Node Attributes for WhatsApp

We define node properties based on their functional characteristics:

### 2.1 Chat Gateways (Connection-Heavy Nodes)
- **Replicas**: Scaled based on active TCP session connections.
- **Memory Optimization**: Memory allocation per socket connection is restricted to under 10KB to maximize connection density on bare-metal systems.

### 2.2 Relational Metadata Database Nodes (Stateful)
- **RAM allocation**: Sized to hold active database indexes (such as offline messages queues) in memory (Buffer Pool).
- **Provisioned IOPS**: Minimum of 15,000 IOPS on SSD storage to handle write-heavy updates.

### 2.3 Presence Cache Nodes (High-Read/Write Stateful Nodes)
- **RAM Sizing**: Configured with large Redis clusters to hold active session tracking directories in memory.
- **Latency target**: Read/write lookups must operate under 1ms.

---

## 3. Serializing the Graph: JSON Schema Representation

```json
{
  "diagramId": "whatsapp-core-topology",
  "version": 1,
  "nodes": [
    {
      "id": "node-erlang-gateway",
      "label": "Erlang Gateway Cluster",
      "type": "connection-host",
      "settings": {
        "maxConnectionsPerNode": 2000000,
        "ram": 128
      }
    },
    {
      "id": "node-presence-redis",
      "label": "Presence Redis Cluster",
      "type": "cache",
      "settings": {
        "ram": 256,
        "iops": 50000
      }
    },
    {
      "id": "node-offline-mysql",
      "label": "Sharded MySQL Offline Store",
      "type": "database",
      "settings": {
        "ram": 64,
        "iops": 15000
      }
    }
  ],
  "edges": [
    {
      "id": "edge-gateway-to-presence",
      "source": "node-erlang-gateway",
      "target": "node-presence-redis",
      "protocol": "resp"
    },
    {
      "id": "edge-gateway-to-mysql",
      "source": "node-erlang-gateway",
      "target": "node-offline-mysql",
      "protocol": "mysql-proto"
    }
  ]
}
```
