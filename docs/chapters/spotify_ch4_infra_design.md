# Spotify Case Study - Chapter 4: Infrastructure Strategy and Planning

## 1. Capacity Sizing for Global Audio Storage

Audio file assets require significant storage capacity and egress bandwidth compared to text metadata.

We plan capacity using the following profile:
- **Total Catalog Tracks**: 100,000,000 songs.
- **Audio Encodings per Track**: 3 bitrates (96kbps Normal, 160kbps High, 320kbps Extreme).
- **Average Song Duration**: 3.5 minutes (210 seconds).
- **Average Song File Size (160kbps)**:
  $$\text{Size} = \frac{160,000 \text{ bits/sec} \times 210 \text{ sec}}{8 \text{ bits/byte}} = 4.2 \text{ Megabytes (MB)}$$
- **Total Storage (Standard Catalog)**:
  $$\text{Storage} = 100,000,000 \times 4.2 \text{ MB} \times 3 \text{ encodings} = 1.26 \text{ Petabytes (PB)}$$

---

## 2. Bandwidth Sizing for Streaming Egress

At peak workloads ($180,000 \text{ active playbacks/sec}$), the streaming egress bandwidth requirements are high:
- **Egress Bandwidth**:
  $$\text{Bandwidth} = 180,000 \times 160 \text{ kbps} = 28,800,000 \text{ kbps} = 28.8 \text{ Gigabits/sec (Gbps)}$$

```
  Egress Pipeline:
  [ Storage Tier ] ===( Low Bandwidth Link )===> [ Regional CDN Edges ]
                                                         | (28.8 Gbps Egress)
                                                         v
                                                 [ Global Listeners ]
```

To support this egress volume without saturating origin storage links, the system offloads 98%+ of audio delivery traffic to regional CDN edge caches.

---

## 3. Playback Buffering and Pre-fetching Strategies

To minimize playback start latency and prevent interruptions on slow networks:
- **Pre-fetching**: The client app downloads the first 10 seconds of the next song in the active playlist queue before the current track ends.
- **Dynamic Bitrate Switching**: The client player adjusts audio quality dynamically (e.g., switching from 320kbps to 96kbps) based on real-time network throughput measurements.
