# Spotify Case Study - Chapter 13: Infrastructure Optimization

## 1. Monitoring Performance Bottlenecks

We monitor key performance indicators (KPIs) to identify optimization opportunities:
- **CDN Edge Hit Ratios**: The target is >98% cache hits for audio files. Lower hit rates increase origin storage requests, impacting costs and playback start latencies.
- **Database CPU & Lock Saturation**: High lock wait times indicate the need to optimize database indexes or split tables.

---

## 2. Bandwidth Egress Optimization (Ogg Vorbis Compression)

Because audio data represents the majority of egress traffic, we optimize file sizes:
- **Ogg Vorbis & AAC Encodings**: Audio assets are transcoded into Ogg Vorbis or AAC formats at multiple bitrates (96kbps, 160kbps, 320kbps).
- **Dynamic Bitrate Adjustment**: Client players adjust audio quality dynamically based on network conditions, minimizing bandwidth consumption on slow connections.

---

## 3. JVM Garbage Collection Optimization

We optimize the performance of Scala-based microservices:
- **ZGC (Z Garbage Collector)**: Standardized on ZGC to maintain garbage collection pause times under 10ms, preventing latency spikes in playback session handshakes.
- **Heap Tuning**: JVM heap settings are adjusted based on container resource limits to prevent OOM errors.
