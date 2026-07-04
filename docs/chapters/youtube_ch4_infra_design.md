# YouTube Case Study - Chapter 4: Infrastructure Strategy and Planning

## 1. Capacity Sizing for Petabyte-Scale Video Storage

Video file storage requirements scale rapidly compared to text metadata. We size our storage using the following profile:
- **Total Video Uploaded/Minute**: 500 hours/minute.
- **Average Bitrate (1080p, 30fps)**: 5 Megabits/sec (Mbps).
- **Hourly Storage Growth (1080p Single Target)**:
  $$\text{Storage}_{\text{hourly}} = 500 \text{ hours} \times 60 \text{ min} \times 60 \text{ sec} \times \left( \frac{5 \text{ Mbps}}{8 \text{ bits/byte}} \right) \approx 1,125 \text{ Gigabytes (1.125 TB)/min}$$
  $$\text{Storage}_{\text{daily}} = 1,125 \text{ GB/min} \times 1,440 \text{ min} \approx 1.62 \text{ Petabytes (PB)/day}$$
- **Annual Multi-Resolution Storage Growth (with 5 transcoded targets and 3x replica storage)**:
  $$\text{Storage}_{\text{annual}} = 1.62 \text{ PB/day} \times 2.5 \text{ (resolution factor)} \times 365 \text{ days} \times 3 \approx 4.43 \text{ Exabytes/year}$$

---

## 2. Bandwidth Sizing for Playback Egress

At peak read workloads ($20,000,000 \text{ concurrent playbacks}$), the egress bandwidth requirements are significant:
- **Average Playback Bitrate**: 2.5 Mbps (mixed 720p/1080p).
- **Egress Bandwidth**:
  $$\text{Bandwidth} = 20,000,000 \times 2.5 \text{ Mbps} = 50,000,000 \text{ Mbps} = 50 \text{ Terabits/sec (Tbps)}$$

```
  Playback Delivery:
  [ Storage Pool ] ===( Low Bandwidth Link )===> [ ISP Edge GGC Nodes ]
                                                         | (50 Tbps Egress)
                                                         v
                                                 [ Global Viewers ]
```

To support this egress volume without saturating origin connection links, the system offloads 98%+ of media delivery traffic to local ISP Google Global Cache (GGC) nodes.

---

## 3. Dynamic Adaptive Streaming over HTTP (DASH)

To minimize buffering and playback latency:
- **DASH Chunking**: Video streams are sliced into 5-second chunk blocks.
- **Client-Side Control**: The client player monitors real-time network throughput and requests the optimal chunk resolution automatically.
