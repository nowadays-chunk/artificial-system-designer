# Dropbox Case Study - Chapter 4: Infrastructure Strategy and Planning

## 1. Capacity Sizing for High-Throughput Block Ingestion

Block-level storage requirements scale rapidly. We size our storage using the following profile:
- **Total File Uploads**: 1,000,000 files/day.
- **Average Chunks per File (4MB block size)**: 5 chunks.
- **Deduplication Rate**: 40% (meaning 40% of chunks uploaded already exist in block storage).
- **Daily Storage Growth (Raw)**:
  $$\text{Storage}_{\text{daily}} = 1,000,000 \text{ files} \times 5 \text{ chunks} \times 4 \text{ MB} \times (1 - 0.40) = 12,000,000 \text{ MB} = 12 \text{ Terabytes (TB)/day}$$
- **Annual Multi-Resolution Storage Growth (with 3x replica storage)**:
  $$\text{Storage}_{\text{annual}} = 12 \text{ TB/day} \times 365 \text{ days} \times 3 \approx 13.14 \text{ Petabytes (PB)/year}$$

---

## 2. Bandwidth Sizing for Content Delivery

At peak download workloads ($50,000 \text{ concurrent downloads}$), the egress bandwidth requirements are significant:
- **Average Block Size**: 4MB.
- **Download Window**: 10 seconds.
- **Peak Egress Bandwidth**:
  $$\text{Bandwidth} = 50,000 \text{ concurrent} \times \left( \frac{4 \text{ MB}}{10 \text{ sec}} \right) = 20,000 \text{ MB/sec (160 Gbps)}$$

```
  Egress Delivery:
  [ Origin Storage ] ===( Low Bandwidth Link )===> [ CDN Edge Cache Nodes ]
                                                           | (160 Gbps Egress)
                                                           v
                                                   [ Global Clients ]
```

To support this egress volume without saturating origin storage links, the system offloads 90%+ of block delivery traffic to CDN edge caches.

---

## 3. Dynamic Chunking and Synchronization

To minimize bandwidth consumption and speed up sync times:
- **CDC (Content-Defined Chunking)**: The client application uses Rabin fingerprints to chunk files dynamically based on content boundaries rather than fixed byte limits, ensuring that minor modifications do not shift downstream block offsets.
- **Delta Sync**: Only modified blocks are uploaded to storage, reducing payload sizes.
