# Dropbox Case Study - Chapter 4: Infrastructure Strategy and Planning

## 1. Capacity Sizing for Global Block Storage

File storage requirements scale rapidly compared to text metadata. We size our storage using the following profile:
- **Total Users**: 500,000,000 users.
- **Active Uploaders/Day**: 5% of users ($25,000,000$ active uploaders/day).
- **Average Data Uploaded/User/Day**: 50 Megabytes (MB).
- **Daily Raw Data Ingested**:
  $$\text{Data}_{\text{raw}} = 25,000,000 \times 50 \text{ MB} = 1,250 \text{ Terabytes (1.25 PB)/day}$$
- **Data Reduction via Deduplication (average 30% saving)**:
  $$\text{Data}_{\text{net}} = 1.25 \text{ PB} \times 0.7 = 875 \text{ Terabytes/day}$$
- **Annual Storage Growth (with 3x replication)**:
  $$\text{Storage}_{\text{annual}} = 875 \text{ TB/day} \times 365 \text{ days} \times 3 \approx 958 \text{ Petabytes/year}$$

---

## 2. Bandwidth Sizing for Upload Egress

At peak write workloads ($7,000 \text{ active uploads/sec}$), the gateway bandwidth requirements are significant:
- **Upload Bandwidth**:
  $$\text{Bandwidth} = 7,000 \times (50 \text{ MB / } 86400 \text{ sec}) \approx 4 \text{ Gigabits/sec (Gbps)}$$

```
  Upload Pipeline:
  [ Ingress Gateways ] ===( Raw Upload Streams )===> [ Block Service Nodes ]
                                                            |
                                                            v
                                                   [ Storage Origin ]
```

To optimize network costs, the block service is deployed on high-throughput interfaces with dedicated network links to storage pools.

---

## 3. Delta Synchronization and Chunking Strategies

To minimize network bandwidth during file updates:
- **4MB Chunking**: Files are split into 4MB chunks. If a user modifies a small section of a 100MB file, only the modified 4MB chunks are uploaded.
- **Rolling Hashing**: The sync engine uses rolling hashing algorithms to detect modified blocks, reducing upload volumes.
