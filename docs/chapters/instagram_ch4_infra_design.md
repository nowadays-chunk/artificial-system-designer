# Instagram Case Study - Chapter 4: Infrastructure Strategy and Planning

## 1. Capacity Sizing for High-Resolution Image Media

Unlike text-based microblogging, a media platform's capacity planning is driven by disk storage consumption and CDN egress bandwidth.

We plan capacity using the following profile:
- **Daily Uploads**: 100,000,000 photos/day.
- **Average Photo Size (Compressed)**: 200 Kilobytes (KB).
- **Daily Storage Growth**:
  $$\text{Storage}_{\text{daily}} = 100,000,000 \times 200 \text{ KB} = 20 \text{ Terabytes/day}$$
- **Annual Storage Footprint (with replicas)**:
  $$\text{Storage}_{\text{annual}} = 20 \text{ TB/day} \times 365 \text{ days} \times 3 = 21.9 \text{ Petabytes/year}$$

---

## 2. Bandwidth and Egress Capacity Sizing

With an average of 150,000 feed requests per second and 10 photos loaded per feed view, the system must handle high egress bandwidth:
- **Egress QPS**: $150,000 \text{ requests/sec} \times 10 \text{ images} = 1,500,000 \text{ images/sec}$.
- **Egress Bandwidth**:
  $$\text{Bandwidth} = 1,500,000 \times 200 \text{ KB} = 300,000,000 \text{ KB/sec} = 300 \text{ Gigabytes/sec (2.4 Terabits/sec)}$$

```
  Egress Pipeline:
  [ Origin Server ] ===( Low Bandwidth Link )===> [ Regional CDN Nodes ]
                                                         | (2.4 Tbps Egress)
                                                         v
                                                 [ Global Clients ]
```

To support this egress volume without saturating origin server connection links, the system offloads 95%+ of media delivery traffic to regional CDN edge caches.

---

## 3. Storage Lifecycle Policies

To control storage costs, we implement S3 lifecycle policies:
- **Hot Tier (Standard S3)**: Brand new uploads are stored here to support high initial access rates.
- **Warm Tier (S3 Standard-IA)**: Photos older than 30 days are transitioned to standard infrequent access storage.
- **Cold Tier (S3 Glacier)**: Photos older than 90 days are moved to low-cost archival storage, as historical posts are rarely requested.
