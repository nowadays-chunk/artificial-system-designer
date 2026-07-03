# Google Docs Case Study - Chapter 10: Disaster Recovery and Business Continuity

## 1. Disaster Recovery and Target Metrics

For a global document editing platform, disaster recovery planning must address database replication and storage backup replication.

We define target metrics:
- **Recovery Time Objective (RTO)**: REST APIs and read paths must recover within **15 minutes** of an outage.
- **Recovery Point Objective (RPO)**: Database updates data loss must be kept under **1 second** using streaming replication.

---

## 2. Multi-Region Storage Replication Topologies

File blocks are replicated across regions to support active-passive failovers:

```
  Multi-Region Block Replication:
  [ Region A: Primary S3 Bucket ] =======( Async CRR )=======> [ Region B: Standby S3 Bucket ]
```

- **Asynchronous Replication**: Storage blocks are replicated to standby regions in the background, avoiding network latency penalties for clients during uploads.
- **Failover Routing**: If Region A fails, the load balancer redirects client traffic to the Region B bucket.

---

## 3. Database Replication and Backups

- **Daily Snapshots**: Relational database snapshots are generated daily, verified using automated recovery scripts, and archived in S3 Glacier.
- **WAL Archiving**: Write-Ahead Logs (WAL) are streamed continuously to backup regions to enable point-in-time recovery.
