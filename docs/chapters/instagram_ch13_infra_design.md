# Instagram Case Study - Chapter 13: Infrastructure Optimization

## 1. Monitoring Performance Bottlenecks

We monitor key performance indicators (KPIs) to identify optimization opportunities:
- **CDN Edge Hit Ratios**: The target is >95% cache hits for media files. Lower hit rates increase origin storage requests, impacting costs and read latencies.
- **Database CPU & Lock Saturation**: High lock wait times indicate the need to optimize database indexes or split tables.

---

## 2. Bandwidth Egress Optimization (WebP/AVIF Encoding)

Because photos represent the majority of egress traffic, we optimize file sizes:
- **WebP & AVIF Formats**: Uploaded JPEG files are transcoded to WebP or AVIF formats.
- **Size Savings**: WebP and AVIF formats reduce file sizes by 30% to 50% compared to JPEG at equivalent quality, reducing CDN egress bandwidth costs.

---

## 3. PostgreSQL Database Tuning

We optimize database performance through ongoing maintenance:
- **Connection Pools**: We use PgBouncer to manage database connections and prevent socket exhaustion on primary database nodes.
- **Query Optimizations**: Query plans are analyzed to identify missing indexes or slow query patterns.
