# Instagram Case Study - Chapter 10: Disaster Recovery and Business Continuity

## 1. Disaster Recovery and Target Metrics

For a global photo sharing platform, disaster recovery planning must address database replication and media backup replication.

We define target metrics:
- **Recovery Time Objective (RTO)**: REST APIs and read paths must recover within **15 minutes** of an outage.
- **Recovery Point Objective (RPO)**: Relational metadata data loss must be kept under **1 second** using streaming replication.

---

## 2. Geo-Replicated S3 Object Storage

We configure S3 Cross-Region Replication (CRR) to back up uploaded media assets across regions automatically.

```
  Multi-Region Object Storage Backup:
  [ Region A: Primary S3 Bucket ] =======( Async CRR )=======> [ Region B: Standby S3 Bucket ]
```

- **Asynchronous Replication**: S3 copies uploaded photo objects to the backup region asynchronously, avoiding network latency penalties for clients during uploads.
- **Failover Routing**: If Region A fails, the CDN is updated to read from the Region B backup bucket.

---

## 3. Database Replication and Backups

- **WAL Archiving**: PostgreSQL Write-Ahead Logs (WAL) are streamed continuously to Region B backup buckets.
- **Daily Backups**: Full database dumps are scheduled daily, verified using automated recovery scripts, and archived in S3 Glacier.
