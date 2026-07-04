# Amazon Marketplace Case Study - Chapter 2: Infrastructure Modeling

## 1. Formalizing the System Topology Graph

To simulate, evaluate, and inspect cloud-scale infrastructure layouts, an architect must represent the topology as a mathematically rigorous directed graph:
$$G = (V, E)$$
where:
- **Vertices ($V$)**: Represent discrete infrastructure resource elements (e.g., compute node containers, load balancers, caches, database clusters, routing gateways).
- **Directed Edges ($E$)**: Represent communication paths connecting vertices, where an edge $e = (u, v) \in E$ indicates that vertex $u$ (source) transmits data packets or executes remote calls to vertex $v$ (target).

```
       [ Gateway Node ] ---> [ Order Service Node ] ---> [ Redis Inventory Node ]
             |                        |
             |                        v
             +--------------> [ PG Database Node ]
```

---

## 2. Vertex Node Attributes for Amazon Marketplace

We define node properties based on their functional characteristics:

### 2.1 Checkout Services (Compute-Heavy)
- **Replicas**: Scaled based on active checkout request rates.
- **CPU Allocations**: Typically provisioned with balanced virtual cores (e.g., 4 vCPUs per worker pod) to handle transaction coordination.

### 2.2 DynamoDB Database Nodes (Stateful)
- **Read/Write Capacity Units (RCUs/WCUs)**: Configured dynamically to handle write spikes during promotional events.
- **Latency target**: Read/write lookups must operate under 5ms.

### 2.3 Inventory Cache Nodes (High-Read/Write Cache Nodes)
- **RAM Sizing**: Configured with large Redis clusters to hold active product stock records in memory.
- **Hit Rate Target**: Cache hit ratio target >99% for stock status checks.

---

## 3. Serializing the Graph: JSON Schema Representation

```json
{
  "diagramId": "amazon-core-topology",
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
      "id": "node-checkout-service",
      "label": "Checkout Service Pods",
      "type": "transaction-compute",
      "settings": {
        "replicas": 32,
        "cpu": 4
      }
    },
    {
      "id": "node-dynamodb-orders",
      "label": "DynamoDB Order Store",
      "type": "database",
      "settings": {
        "readCapacity": 50000,
        "writeCapacity": 50000
      }
    },
    {
      "id": "node-redis-inventory",
      "label": "Redis Inventory Cache",
      "type": "cache",
      "settings": {
        "ram": 128,
        "iops": 40000
      }
    }
  ],
  "edges": [
    {
      "id": "edge-edge-to-checkout",
      "source": "node-ingress-edge",
      "target": "node-checkout-service",
      "protocol": "http2-json"
    },
    {
      "id": "edge-checkout-to-dynamo",
      "source": "node-checkout-service",
      "target": "node-dynamodb-orders",
      "protocol": "aws-api"
    },
    {
      "id": "edge-checkout-to-redis",
      "source": "node-checkout-service",
      "target": "node-redis-inventory",
      "protocol": "resp"
    }
  ]
}
```
