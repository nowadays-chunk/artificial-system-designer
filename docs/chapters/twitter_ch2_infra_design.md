# Twitter Case Study - Chapter 2: Infrastructure Modeling

## 1. Mathematical Formalization of Topology Graphs

To simulate, evaluate, and inspect cloud-scale infrastructure layouts, an architect must represent the topology as a mathematically rigorous directed graph:
$$G = (V, E)$$
where:
- **Vertices ($V$)**: Represent discrete infrastructure resource elements (e.g., compute node containers, load balancers, caches, database clusters, routing gateways).
- **Directed Edges ($E$)**: Represent communication paths connecting vertices, where an edge $e = (u, v) \in E$ indicates that vertex $u$ (source) transmits data packets or executes remote calls to vertex $v$ (target).

In a multi-tier microblogging architecture like Twitter, the graph is not merely a collection of blocks; it is a **capacitated dependency graph** where both vertices and edges carry deep physical metadata properties that determine how traffic cascades across systems.

---

## 2. Vertex Modeling: Node Types and Attributes

We categorize vertices into three fundamental groups based on their compute, queuing, or storage characteristics:

```
                  +---------------------------------------+
                  |            Vertex (V)                 |
                  +---------------------------------------+
                                      |
         +----------------------------+----------------------------+
         |                            |                            |
         v                            v                            v
  [ Compute Node ]             [ Stateful Node ]            [ Queue Node ]
  - Replicas count             - RAM size (GB)              - Partitions count
  - CPU cores allocation       - Disk IOPS limits           - Max message bytes
  - Thread pool sizing         - Write-ahead-log bounds     - Queue capacity limits
```

### 2.1 Compute Nodes (Stateless Processing)
Compute vertices (e.g., API Gateway, Tweet Ingestor Service, Timeline Server) represent CPU-bound processing nodes. They do not store persistent state across request boundaries. Their metadata properties include:
- **Replicas ($R_v$)**: The number of concurrent instances handling load in the auto-scaling group.
- **CPU Cores ($C_v$)**: Virtual CPU cores allocated per replica instance.
- **Thread Pool Limit ($T_v$)**: Maximum number of concurrent executing request threads per instance before incoming connection queries begin piling up in queue buffers.
- **Service Capacity Function**:
  $$\mu_v = R_v \times \left( \frac{C_v}{\text{Avg Service Time per Req}} \right)$$

### 2.2 Stateful Nodes (Databases and Caches)
Stateful vertices (e.g., Redis feed cache, Cassandra wide-column store, PostgreSQL metadata DB) persist datasets and manage memory/disk operations. Their metadata properties include:
- **Memory Buffer Size ($M_v$)**: RAM allocated (in gigabytes) to determine caching capacity.
- **Disk IOPS Limit ($I_v$)**: Maximum read/write disk operations per second supported by the underlying storage tier (e.g., gp3 volumes vs provisioned IOPS SSDs).
- **Write-Ahead Log (WAL) Limit**: Bandwidth limits for sequential write operations before write bottlenecks trigger queue backpressure.

### 2.3 Queue Nodes (Message Brokers)
Queue vertices (e.g., Kafka message bus topics) handle asynchronous message ingestion. Their properties include:
- **Partition Count ($P_v$)**: Slices the topic partition log into parallel queues, determining maximum consumer group scale limits.
- **Max Message Size ($S_v$)**: Restricts payload volumes per event.
- **Buffer Retention Capacity ($B_v$)**: Maximum memory/disk footprint size allocated before old, unconsumed message records expire.

---

## 3. Serialization Schema: JSON Graph Model

In production systems, this model is serialized to JSON to enable storage, diff calculation, and rendering. The following JSON structure represents the core Twitter topology layout:

```json
{
  "diagramId": "twitter-core-topology",
  "version": 1,
  "environment": {
    "provider": "aws",
    "region": "us-east-1",
    "networkBudgetMbps": 100000
  },
  "nodes": [
    {
      "id": "node-ingress-gateway",
      "label": "Ingress Gateway",
      "type": "gateway",
      "settings": {
        "replicas": 8,
        "cpu": 4,
        "ram": 8,
        "threadPool": 500
      }
    },
    {
      "id": "node-kafka-ingestion",
      "label": "Tweet Events Log",
      "type": "queue",
      "settings": {
        "partitions": 64,
        "maxMessageBytes": 1048576,
        "retentionHours": 72
      }
    },
    {
      "id": "node-redis-timeline-cache",
      "label": "Timeline Cache",
      "type": "redis",
      "settings": {
        "ram": 192,
        "replicas": 3,
        "iops": 25000
      }
    },
    {
      "id": "node-cassandra-tweets",
      "label": "Cassandra Tweet Store",
      "type": "cassandra",
      "settings": {
        "ram": 64,
        "iops": 15000,
        "nodesCount": 24
      }
    }
  ],
  "edges": [
    {
      "id": "edge-gateway-to-kafka",
      "source": "node-ingress-gateway",
      "target": "node-kafka-ingestion",
      "protocol": "kafka-amqp",
      "purpose": "Buffer tweet writes asynchronously"
    },
    {
      "id": "edge-redis-to-cassandra",
      "source": "node-redis-timeline-cache",
      "target": "node-cassandra-tweets",
      "protocol": "grpc",
      "purpose": "Read-through cache miss database fetch"
    }
  ]
}
```

---

## 4. Connection Modeling: Protocols and Latency Functions

Directed edges carry traffic streams, converting topological links into physical conduits.

### 4.1 Communication Protocols
- **HTTP/REST (Synchronous)**: Used for client-to-gateway interactions. High headers overhead, TCP handshake latency.
- **gRPC over HTTP/2 (Synchronous Multiplexed)**: Standard for microservice communications. Utilizes binary protobuf serialization and TCP link multiplexing to eliminate socket exhaustion.
- **AMQP / Kafka Event Logs (Asynchronous)**: Decoupled write paths. Ensures message delivery guarantees even during downstream consumer outages.

### 4.2 Network Latency Calculation
The transit latency $L(e)$ of an edge $e = (u, v)$ is calculated as a function of the request packet size $S$ (bytes), network link bandwidth $B$ (bps), and physical distance delay (propagation delay) $D$:
$$L(e) = \frac{S}{B} + D_{\text{geo}} + L_{\text{serialization}} + L_{\text{queue}}$$
where:
- **$D_{\text{geo}}$**: Physical transit time based on distance (e.g., ~1ms for intra-AZ links, ~35ms for cross-US-region fiber links).
- **$L_{\text{queue}}$**: Buffering delay. If target node $v$ is saturated, requests queue up at TCP sockets, causing latency to spike exponentially.

---

## 5. Topological Validation and Verification Rules

To audit system designs before deployment, we implement graph validation rules checking structural and scaling invariants.

### 5.1 Cut-Vertex Analysis (Single Point of Failure - SPOF)
A vertex $v \in V$ is a cut-vertex (SPOF) if removing it increases the number of connected components in the graph:
$$\text{Components}(G \setminus \{v\}) > \text{Components}(G)$$
- **Check**: Traverse the graph using Tarjan's bridge-finding algorithm. If any database, gateway, or cache node is flagged as a cut-vertex, alert:
  `[WARN] SPOF: Single point of failure detected at node [NodeName]. Deploy replicas.`

### 5.2 Caching Overlay Rules
- **Rule**: Direct synchronous compute-to-database connections under high throughput are blocked.
- **Constraint**: If ingress traffic load $\lambda_u > 100,000$ requests/sec, and edge $e = (u, \text{database})$ is synchronous, flag a warning:
  `[ERROR] SCALING VIOLATION: Database [DBName] accessed directly at peak load. Insert Redis/caching tier between compute and persistence.`

### 5.3 Network Budget Allocations
- **Constraint**: The sum of edge bandwidths cannot exceed the environment limit:
  $$\sum_{e \in E} \text{Traffic}(e) \times \text{Average Payload Size} < \text{Environment Network Budget}$$
  If this limit is exceeded, warn of potential packet loss and connection timeouts due to link saturation.
