# Spotify Case Study - Chapter 4: Infrastructure Strategy and Planning

## 1. Capacity Sizing for High-Throughput Audio Ingestion

Audio storage requirements scale rapidly compared to text metadata. We size our storage using the following profile:
- **Total Audio Uploads**: 100 uploads/minute.
- **Average Raw Upload File Size (WAV)**: 50 Megabytes (MB).
- **Hourly Storage Growth (Raw)**:
  $$\text{Storage}_{\text{hourly}} = 100 \text{ uploads/min} \times 60 \text{ min} \times 50 \text{ MB} = 300 \text{ Gigabytes (GB)/hour}$$
  $$\text{Storage}_{\text{daily}} = 300 \text{ GB/hour} \times 24 \text{ hours} \approx 7.2 \text{ Terabytes (TB)/day}$$
- **Annual Multi-Resolution Storage Growth (with 3 transcoded targets and 3x replica storage)**:
  $$\text{Storage}_{\text{annual}} = 7.2 \text{ TB/day} \times 0.6 \text{ (compression factor)} \times 365 \text{ days} \times 3 \approx 4.73 \text{ Petabytes/year}$$

---

## 2. Bandwidth Sizing for Content Delivery

At peak read workloads ($300,000 \text{ concurrent playbacks}$), the egress bandwidth requirements are significant:
- **Average Playback Bitrate (Ogg Vorbis)**: 320 Kilobits/sec (kbps).
- **Peak Egress Bandwidth**:
  $$\text{Bandwidth} = 300,000 \text{ playbacks} \times 320 \text{ kbps} = 96,000,000 \text{ kbps} = 96 \text{ Gigabits/sec (Gbps)}$$

```
  Egress Delivery:
  [ Origin Storage ] ===( Low Bandwidth Link )===> [ CDN Edge Cache Nodes ]
                                                           | (96 Gbps Egress)
                                                           v
                                                   [ Global Listeners ]
```

To support this egress volume without saturating origin storage links, the system offloads 99%+ of audio delivery traffic to CDN edge caches.

---

## 3. Dynamic Bitrate Adaptation

To minimize buffering and playback latency:
- **Audio Chunking**: Audio streams are sliced into 5-second chunk blocks.
- **Client-Side Control**: The client player monitors real-time network throughput and requests the optimal chunk resolution automatically (e.g. switching from 320kbps to 96kbps).
