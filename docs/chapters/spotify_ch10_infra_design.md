# Spotify Case Study - Chapter 10: Disaster Recovery and Business Continuity

## 1. Disaster Recovery and Target Metrics

For a global music streaming platform, disaster recovery planning must address database replication and audio file backup replication.

We define target metrics:
- **Recovery Time Objective (RTO)**: REST APIs and read paths must recover within **15 minutes** of an outage.
- **Recovery Point Objective (RPO)**: Database updates data loss must be kept under **1 second** using streaming replication.

---

## 2. Multi-Region Cassandra Ring Topologies

Cassandra rings are deployed across multiple regions to support active-active failovers:

```
  Multi-Region Cassandra Architecture:
  [ Region A: Cassandra Ring ] <====( Async Sync )====> [ Region B: Cassandra Ring ]
```

- **Asynchronous Replication**: Cassandra replicates write updates to standby regions in the background, avoiding network latency penalties for clients during writes.
- **Failover Routing**: If Region A fails, the load balancer redirects client traffic to the Region B ring.

---

## 3. Database Replication and Backups

- **Daily Snapshots**: Cassandra cluster snapshots are generated daily, verified using automated recovery scripts, and archived in S3 Glacier.
- **Incremental Backups**: Incremental backups are executed hourly to copy updated database partition files to backup buckets.
