# Dropbox Case Study - Chapter 13: Infrastructure Optimization

## 1. Detecting Performance Bottlenecks

Optimizing large-scale infrastructures requires continuous monitoring of performance metrics. We focus on three indicators:
- **Cache Hit Ratio**: Active namespace and directory cache hits must exceed 98%. Drops in this ratio shift read loads to the PostgreSQL database, increasing read latency.
- **Database Saturation**: PostgreSQL primary node CPU utilization and disk write-ahead log queue depth.
- **Network Link Egress Bandwidth**: Egress traffic limits on connections to public networks.

---

### 1.1 Cache Hit Ratio Optimization
If the cache hit ratio drops below 98%, the database tier experiences query surges. To prevent cache eviction:
- **Dynamic TTL**: Adjust key expiration times based on user access frequency (e.g. active users have longer TTLs).
- **Cache Pre-warming**: Background workers pre-warm caches for users expected to log in soon (e.g. based on daily access patterns).

---

## 2. Bandwidth and Egress Optimization

Because the read-to-write ratio is asymmetric (15:1), data egress cost is a primary expense. We optimize egress transit through two strategies:

```
  Data Size Reduction:
  [ Raw API Payload (JSON) ] =======( Protobuf Serialization )=======> [ Binary Frames (40% smaller) ]
  [ Uncompressed Video ]     =======( Brotli Chunk Compression )=====> [ Stream Feeds (60% smaller) ]
```

### 2.1 Serialization Formats (Protobuf vs JSON)
We replace legacy JSON API formats with binary **Protocol Buffers** for microservice-to-client payloads:
- Protobuf omits tag names, utilizing numeric keys in binary frames.
- This reduces average payload sizes by 40% and lowers CPU serialization overhead at the API Gateway.

---

### 2.2 Block Compression Optimization
File block payloads are processed through compression pipelines:
- Raw chunks are compressed using **Brotli** or **ZSTD** algorithms before transmission, reducing network bandwidth footprints.
- The client-side software executes compression locally before sending blocks, offloading compute requirements from ingress hosts.

---

## 3. Compute Density Tuning: JVM/Go Garbage Collection

Stateless microservices (written in Java/Scala or Go) can experience latency spikes during garbage collection (GC) cycles.

---

### 3.1 Tuning JVM GC (ZGC/G1GC)
For Java-based Sync Services, we use the **Z Garbage Collector (ZGC)**:
- ZGC executes GC cycles concurrently with application threads.
- This maintains pause times under 10ms even with large heap allocations, preventing latency spikes that could trigger upstream timeouts.

---

### 3.2 Go GC Tuning
For Go-based API Gateways, we adjust the garbage collection target percentage:
- Setting `GOGC=120` trades memory footprint for CPU cycles, reducing GC frequency during traffic peaks.
- We monitor GC pause durations and CPU cycles spent on GC using Prometheus metrics to verify configuration performance under load.
