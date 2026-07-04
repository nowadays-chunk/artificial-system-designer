# Google Docs Case Study - Chapter 4: Infrastructure Strategy and Planning

## 1. Capacity Sizing for Real-Time Collaborative Sessions

Collaborative edit updates require high write throughput and minimal latency.

We plan capacity using the following profile:
- **Active Editing Users**: 10,000,000 users.
- **Edit Frequency**: Average of 2 edits (character typings or deletions) per second per active user.
- **Total Ingestion QPS**:
  $$\text{QPS} = 10,000,000 \text{ users} \times 2 \text{ edits/sec} = 20,000,000 \text{ edits/sec}$$
- **Average Edit Event Size**: 500 bytes (includes metadata, timestamps, operational parameters).
- **Ingestion Bandwidth**:
  $$\text{Bandwidth} = 20,000,000 \times 500 \text{ bytes} = 10,000,000,000 \text{ bytes/sec} = 10 \text{ Gigabytes/sec (80 Gbps)}$$

---

## 2. Ingress Load Balancer Auto-Scaling Sizing

To process incoming WebSocket connections:
- **Sync Gateway Pod Capacity**: A standard compute container node can maintain $50,000 \text{ persistent WebSocket connections}$ under load.
- **Total Compute Replicas Requirement (Ingestion)**:
  $$R_{\text{sync}} = \frac{10,000,000}{50,000} = 200 \text{ container instances}$$

```
  Ingestion Pipeline:
  [ Ingress Gateways ] ===( WebSocket Links )===> [ Sync Gateway Pods ]
                                                         |
                                                         v
                                                [ Redis OT Cache ]
```

We deploy auto-scaling rules using active connection count and CPU metrics to provision instances dynamically as active editor counts rise.

---

## 3. Dynamic Edit Event Throttling Policies

To protect database and network capacity during peak load conditions or network degradation:
- **Dynamic Ingestion Throttling**: The sync gateway adjusts event aggregation windows dynamically (e.g. buffering character inputs on the client side for 100ms before sending), reducing upstream ingestion QPS.
