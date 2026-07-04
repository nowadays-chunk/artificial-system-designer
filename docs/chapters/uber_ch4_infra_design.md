# Uber Case Study - Chapter 4: Infrastructure Strategy and Planning

## 1. Capacity Sizing for Geospatial Telemetry Ingestion

Driver location telemetry requires high write throughput and minimal latency.

We estimate resource requirements using the following profile:
- **Active Connected Drivers**: 5,000,000 drivers globally.
- **Location Ping Frequency**: Every 4 seconds.
- **Total Ingestion QPS**:
  $$\text{QPS} = \frac{5,000,000}{4} = 1,250,000 \text{ write requests/sec}$$
- **Average Telemetry Payload**: 250 bytes (latitude, longitude, driver ID, timestamp, bearing, speed).
- **Ingestion Bandwidth**:
  $$\text{Bandwidth} = 1,250,000 \times 250 \text{ bytes} = 312,500,000 \text{ bytes/sec} \approx 312.5 \text{ Megabytes/sec (2.5 Gbps)}$$

---

## 2. Ingress Load Balancer Auto-Scaling Sizing

To process incoming WebSocket connections:
- **Telemetry Gateway Pod Capacity**: A standard compute container node can process $25,000 \text{ write requests/sec}$ under load.
- **Total Compute Replicas Requirement (Ingestion)**:
  $$R_{\text{ingest}} = \frac{1,250,000}{25,000} = 50 \text{ container instances}$$

```
  Ingestion Pathway:
  [ Mobile Clients ] ===( 2.5 Gbps Telemetry )===> [ Telemetry Gateway Pods ]
                                                          |
                                                          v
                                                 [ Redis Location Cache ]
```

We deploy auto-scaling rules using active connection count and CPU metrics to provision instances dynamically as active editor counts rise.

---

## 3. Dynamic Telemetry Throttling Policies

To protect database and network capacity during peak load conditions or network degradation:
- **Dynamic Ingestion Throttling**: The gateway adjusts ping intervals dynamically (e.g., from 4 seconds to 8 seconds when the driver is stationary), reducing upstream ingestion QPS.
