# Instagram Case Study - Chapter 4: Infrastructure Strategy and Planning

## 1. Capacity Sizing for High-Throughput Media Ingestion

Video and image storage requirements scale rapidly compared to text metadata. We size our storage using the following profile:
- **Total Image/Video Uploads**: 1,000 uploads/second.
- **Average Raw Upload File Size**: 3 Megabytes (MB).
- **Hourly Storage Growth (Raw)**:
  $$\text{Storage}_{\text{hourly}} = 1,000 \text{ uploads/sec} \times 60 \text{ min} \times 60 \text{ sec} \times 3 \text{ MB} = 10.8 \text{ Terabytes (TB)/hour}$$
  $$\text{Storage}_{\text{daily}} = 10.8 \text{ TB/hour} \times 24 \text{ hours} \approx 259.2 \text{ TB/day}$$
- **Annual Multi-Resolution Storage Growth (with 3 transcoded targets and 3x replica storage)**:
  $$\text{Storage}_{\text{annual}} = 259.2 \text{ TB/day} \times 1.8 \text{ (resolution factor)} \times 365 \text{ days} \times 3 \approx 510.6 \text{ Petabytes/year}$$

---

## 2. Bandwidth Sizing for Content Delivery

At peak read workloads ($400,000 \text{ feed requests/sec}$), the egress bandwidth requirements are significant:
- **Average Images Loaded per Feed Page**: 15 images.
- **Average Size of Compressed Image (WebP)**: 150 Kilobytes (KB).
- **Peak Egress Bandwidth**:
  $$\text{Bandwidth} = 400,000 \text{ requests/sec} \times 15 \text{ images} \times 150 \text{ KB} = 900,000,000 \text{ KB/sec} = 900 \text{ Gigabytes/sec (7.2 Tbps)}$$

```
  Egress Delivery:
  [ Origin Storage ] ===( Low Bandwidth Link )===> [ CDN Edge Cache Nodes ]
                                                           | (7.2 Tbps Egress)
                                                           v
                                                   [ Global Viewers ]
```

To support this egress volume without saturating origin storage links, the system offloads 98%+ of media delivery traffic to CDN edge caches.

---

## 3. Dynamic Video Bitrate Optimization

To minimize buffering and playback latency:
- **DASH Chunking**: Video streams are sliced into 5-second chunk blocks.
- **Client-Side Control**: The client player monitors real-time network throughput and requests the optimal chunk resolution automatically.
