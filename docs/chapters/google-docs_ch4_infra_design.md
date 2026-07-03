# Google Docs Case Study - Chapter 4: Infrastructure Strategy and Planning

## 1. Capacity Sizing for Real-Time Sync Operations

Operational logs scale rapidly under active collaboration. We size our storage using the following profile:
- **Total Users**: 500,000,000 users.
- **Active Editors/Day**: 10% of users ($50,000,000$ active editors/day).
- **Average Edit Operations/User/Day**: 500 operations.
- **Daily Operations Ingested**:
  $$\text{Ops}_{\text{daily}} = 50,000,000 \times 500 = 25,000,000,000 \text{ operations/day}$$
- **Average Operation Size (JSON)**: 100 bytes.
- **Daily Raw Data Ingested**:
  $$\text{Data}_{\text{raw}} = 25,000,000,000 \times 100 \text{ bytes} = 2.5 \text{ Terabytes/day}$$
- **Annual Storage Growth (with replicas)**:
  $$\text{Storage}_{\text{annual}} = 2.5 \text{ TB/day} \times 365 \text{ days} \times 3 \approx 2.73 \text{ Petabytes/year}$$

---

## 2. Bandwidth Sizing for Real-Time Sync Egress

At peak write workloads ($25,000 \text{ active operations/sec}$), the gateway bandwidth requirements are significant:
- **Upload Bandwidth**:
  $$\text{Bandwidth} = 25,000 \times 100 \text{ bytes} \approx 2.5 \text{ Megabytes/sec (20 Mbps)}$$

```
  Upload Pipeline:
  [ Ingress Gateways ] ===( Raw Edit Streams )===> [ WebSockets Gateway Nodes ]
                                                            |
                                                            v
                                                   [ Storage Origin ]
```

To optimize network costs, the sync service is deployed on high-throughput interfaces with dedicated network links to storage pools.

---

## 3. Operational Transformation (OT) and Compression Strategies

To minimize network bandwidth during file updates:
- **Operation Grouping**: Operations are grouped on the client side before transmission, reducing network overhead.
- **Revision Compacting**: A background engine periodically compacts old operation history logs into static document snapshots, freeing database storage.
