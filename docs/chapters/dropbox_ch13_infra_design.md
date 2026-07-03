# Dropbox Case Study - Chapter 13: Infrastructure Optimization

## 1. Monitoring Performance Bottlenecks

We monitor key performance indicators (KPIs) to identify optimization opportunities:
- **CDN Edge Hit Ratios**: The target is >95% cache hits for static file blocks. Lower hit rates increase origin storage requests, impacting costs and download latencies.
- **Database CPU & Lock Saturation**: High lock wait times indicate the need to optimize database indexes or shard tables.

---

## 2. Bandwidth Egress Optimization (Block Compression)

Because data block downloads represent the majority of egress traffic, we optimize file sizes:
- **Block Compression**: File blocks are compressed using Brotli or Gzip algorithms before transmission, reducing network bandwidth overhead.
- **Deduplication Engine**: A background engine periodically scans block indexes to identify duplicate blocks, merging references to save storage space.

---

## 3. Database Tuning and Connection Pooling

We optimize database performance:
- **Proxy Pools**: We use ProxySQL to manage database connection pooling and balance read queries across database replicas.
- **Buffer Pool Tuning**: Database buffer pool sizes are configured to hold active indexes in memory, reducing disk reads.
