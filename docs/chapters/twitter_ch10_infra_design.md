# Twitter Case Study - Chapter 10: Disaster Recovery and Business Continuity

## 1. Disaster Recovery Objectives (RTO and RPO)

In global social systems, infrastructure architecture designs must plan for disaster recovery (DR). DR planning is defined by two metrics:
- **Recovery Time Objective (RTO)**: The maximum acceptable duration of system downtime before service is restored (target: **RTO < 10 minutes** for core read paths).
- **Recovery Point Objective (RPO)**: The maximum acceptable data loss window measured in time (target: **RPO < 1 second** for relational metadata, **RPO < 1 minute** for persistent tweet data).

---

## 2. Multi-Region Replication Topologies

To meet these objectives, we deploy multi-region active-active and active-passive replication topologies.

```
      [ Ingress DNS Traffic Router ]
         /                        \
        / (Active, 100%)           \ (Standby)
       v                            v
  [ Region A (US-East-1) ]    [ Region B (US-West-2) ]
  - Live API Gateways         - Standby Gateways
  - Active databases          - Replica databases (Async replication)
```

### 2.1 Cassandra Cross-Region Replication
Apache Cassandra natively supports multi-region active-active deployments.
- **Write Policy**: A write client writes to its local region coordinator using the `LOCAL_QUORUM` consistency level.
- **Asynchronous Sync**: Cassandra replicates the write to other configured regions asynchronously, meeting write throughput targets without incurring WAN latency penalties during the write transaction.

### 2.2 Relational Database Replication (PostgreSQL)
For ACID relational metadata (User Profiles, Authentication Tables), active-active deployments can lead to write conflict resolution issues. The system implements an **Active-Passive replication** model:
- **Primary Node (Region A)**: Handles all write operations.
- **Standby Replica (Region B)**: Receives database updates via continuous WAL streaming replication. If Region A fails, the load balancer promotes Region B's standby node to Primary.

---

## 3. Automated Database Backup Strategies

If data corruption occurs (e.g., due to configuration errors or compromised credentials), replication will propagate the corruption to all regions. We maintain point-in-time backups to enable recovery.

- **PostgreSQL Backups**: Continuous archiving of Write-Ahead Logs (WAL) combined with daily full physical base backups stored in Amazon S3. This allows restoring the database to a specific millisecond state.
- **Cassandra Backups**: Daily SSTable snapshots generated on each cluster node. Snapshots are moved to low-cost S3 Glacier storage with a 30-day lifecycle expiration policy.

---

## 4. Automated Failover and Recovery Testing

Manual failover operations are slow and error-prone during outages. The system implements automated health checkers and DNS rerouting.

### 4.1 Automated DNS Health Checks
A Global Traffic Management (GTM) service runs health checks against edge routers:
- If a region fails to respond to 3 consecutive health checks, the DNS controller updates records to redirect traffic to the standby region.
- **Chaos Injection Testing**: SRE teams run simulated regional failovers (e.g., blocking traffic routes to a region) quarterly to verify that the automated DNS reroute and promote-standby systems execute within RTO limits.
