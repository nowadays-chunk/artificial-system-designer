# Netflix Case Study - Chapter 4: Infrastructure Strategy and Planning

## 1. Capacity Sizing for Petabyte-Scale Video Storage

Video file storage requirements scale rapidly compared to text metadata. We size our storage using the following profile:
- **Video Catalog Volume**: 10,000 titles (movies and shows).
- **Resolutions and Formats**: Each title is encoded in 4 resolutions (480p, 720p, 1080p, 4K) using 3 different codecs (AV1, VP9, H.264) to support diverse client devices.
- **Average Video Bitrate (1080p, 30fps)**: 4 Megabits/sec (Mbps).
- **Hourly Storage Target (1080p Single Target)**:
  $$\text{Storage}_{\text{hourly}} = 1 \text{ hour} \times 3600 \text{ sec} \times \left( \frac{4 \text{ Mbps}}{8 \text{ bits/byte}} \right) = 1.8 \text{ Gigabytes (GB)}$$
- **Total Storage (10,000 titles, averaging 2 hours, across all format permutations and 3x replica storage)**:
  $$\text{Storage}_{\text{raw}} = 10,000 \times 2 \times 1.8 \text{ GB} \times 4 \text{ (resolutions)} \times 3 \text{ (codecs)} \approx 432 \text{ Terabytes (TB)}$$
  $$\text{Storage}_{\text{total}} = 432 \text{ TB} \times 3 \text{ (replicas)} \approx 1.29 \text{ Petabytes (PB)}$$

---

## 2. Bandwidth Sizing for Playback Egress

At peak read workloads ($50,000,000 \text{ concurrent playbacks}$), the egress bandwidth requirements are significant:
- **Average Playback Bitrate**: 3.0 Mbps (mixed 720p/1080p).
- **Egress Bandwidth**:
  $$\text{Bandwidth} = 50,000,000 \times 3.0 \text{ Mbps} = 150,000,000 \text{ Mbps} = 150 \text{ Terabits/sec (Tbps)}$$

```
  Playback Delivery:
  [ AWS Cloud Origin ] ===( Low Bandwidth Link )===> [ Open Connect CDN Nodes ]
                                                            | (150 Tbps Egress)
                                                            v
                                                    [ Global Viewers ]
```

To support this egress volume without saturating cloud connection links, the system offloads 98%+ of media delivery traffic to local ISP Open Connect CDN appliances.

---

## 3. Dynamic Adaptive Streaming over HTTP (DASH)

To minimize buffering and playback latency:
- **DASH Chunking**: Video streams are sliced into 5-second chunk blocks.
- **Client-Side Control**: The client player monitors real-time network throughput and requests the optimal chunk resolution automatically.
