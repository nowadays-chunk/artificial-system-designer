# Amazon Marketplace Case Study - Chapter 4: Infrastructure Strategy and Planning

## 1. Capacity Sizing for Transactional Order Ingestion

Order checkout requests require high write throughput and minimal latency.

We plan capacity using the following profile:
- **Peak Order Target**: 100,000 orders per second globally.
- **Average Checkout Request Payload**: 2 Kilobytes (KB).
- **Total Ingestion Bandwidth**:
  $$\text{Bandwidth} = 100,000 \text{ orders/sec} \times 2 \text{ KB} = 200,000 \text{ KB/sec} = 200 \text{ Megabytes/sec (1.6 Gbps)}$$
- **Database Write Capacity Units (WCUs)**:
  $$\text{WCUs} = 100,000 \text{ writes/sec} \times 2 \text{ (due to 2KB payload size)} = 200,000 \text{ WCUs}$$

---

## 2. Ingress Load Balancer Auto-Scaling Sizing

To process incoming checkout requests:
- **API Pod Capacity**: A standard compute container node can process $5,000 \text{ checkout operations/sec}$ under load.
- **Total Compute Replicas Requirement (Checkout)**:
  $$R_{\text{checkout}} = \frac{100,000}{5,000} = 20 \text{ container instances}$$

```
  Checkout Pathway:
  [ Ingress Gateways ] ===( 1.6 Gbps Inflow )===> [ API Checkout Pods ]
                                                         |
                                                         v
                                                [ DynamoDB Orders ]
```

We deploy auto-scaling rules using active connection count and CPU metrics to provision instances dynamically as active editor counts rise.

---

## 3. Dynamic Edit Event Throttling Policies

To protect database and network capacity during peak load conditions or network degradation:
- **Dynamic Ingestion Throttling**: The gateway adjusts event aggregation windows dynamically (e.g. queuing non-critical order detail updates on the client side), reducing upstream ingestion QPS.
- **Virtual Waiting Room**: During extreme promotional spikes, the gateway redirects non-checkout traffic to temporary cached pages, preserving database write capacity for purchase actions.
