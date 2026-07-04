# Twitter Case Study - Chapter 10: Disaster Recovery and Business Continuity

## 1. Disaster Recovery Objectives (RTO and RPO)

Designing a disaster recovery (DR) architecture requires defining target recovery metrics for each service class based on business impact:
- **Recovery Time Objective (RTO)**: The maximum acceptable duration of system downtime before service is restored.
- **Recovery Point Objective (RPO)**: The maximum acceptable data loss window measured in time.

```
         +-----------------------------------------------------------+
         |                    RTO and RPO Targets                    |
         +-----------------------------------------------------------+
         |  Service Class    |  RTO Target        |  RPO Target      |
         +-------------------+--------------------+------------------+
         |  Authentication   |  < 1 minute        |  0 (Strict Sync) |
         |  Timeline Read    |  < 10 minutes      |  < 5 minutes     |
         |  Tweet Creation   |  < 2 minutes       |  < 1 second      |
         +-----------------------------------------------------------+
```

To meet these targets, the database tier uses a combination of multi-region replication models based on data consistency requirements.

---

## 2. Multi-Region Database Replication Topologies

To survive regional data center outages, data is replicated across multiple geographic regions (e.g. `us-east-1` and `us-west-2`).

---

### 2.1 Cassandra Active-Active Cross-Region Replication (Eventual Consistency)
For the Cassandra Tweet Store, we deploy a multi-region active-active cluster ring.

```
  Cassandra Cross-Region Replication:
  [ Region A (US-East) ] <===( Async Gossip Protocol )===> [ Region B (US-West) ]
  - Writes: LOCAL_QUORUM                                  - Writes: LOCAL_QUORUM
  - Reads: LOCAL_QUORUM                                   - Reads: LOCAL_QUORUM
```

- **LOCAL_QUORUM Consistency**: Reads and writes are acknowledged locally within the active region first:
  $$\text{Write Consistency} = \text{LOCAL\_QUORUM}$$
  This avoids WAN latency penalties, ensuring sub-10ms writes.
- **Asynchronous Sync**: Cassandra replicates updates across regions asynchronously in the background.
- **Conflict Resolution**: Cassandra uses **Last-Write-Wins (LWW)** timestamps to resolve write conflicts. SRE teams run background **Active Read Repair** processes to fix inconsistencies across regions.

---

### 2.2 PostgreSQL Active-Passive Replication (Strict Consistency)
For transactional user profile metadata, active-active configurations can cause write conflicts. We deploy an **Active-Passive replication** model:
- **Primary Node (Region A)**: Processes all write transactions.
- **Synchronous Standby (Region A - secondary AZ)**: Receives synchronous updates to ensure zero data loss within the primary region.
- **Asynchronous Standby (Region B - remote region)**: Receives streaming updates asynchronously over WAN connections.

```
    PostgreSQL Active-Passive Pipeline:
    [ Primary (Reg A) ] ===( Sync Commit )===> [ Standby (Reg A) ]
            ||
            || (Async WAL Streaming)
            \/
    [ Replica (Reg B) ]
```

---

## 3. Automated Backup Architectures and Sandbox Verification

If data corruption occurs (e.g., due to configuration errors or compromised credentials), replication will propagate the corruption to all regions. We maintain point-in-time backups to enable recovery.

---

### 3.1 Cassandra Snapshots
- **SSTable Snapshots**: Hourly incremental backups and daily full snapshots are generated on each cluster node.
- **Glacier Archival**: Backups are encrypted and uploaded to Amazon S3 Glacier with a 30-day lifecycle retention policy.

---

### 3.2 PostgreSQL Point-in-Time Recovery (PITR)
- **Continuous WAL Archiving**: PostgreSQL Write-Ahead Logs (WAL) are streamed continuously to backup storage.
- **Base Backups**: Weekly physical base backups are scheduled. SRE teams use WAL logs to restore the database to a specific millisecond state (PITR) if data corruption occurs.

---

### 3.3 Sandbox Verification Runbook
To verify backup integrity, automated Jenkins pipelines run recovery tests weekly:
1. **Provision Sandbox**: Launch a temporary, isolated database cluster.
2. **Restore Dataset**: Download and restore the latest snapshot and WAL files.
3. **Verify Integrity**: Run consistency check scripts to audit tables and indexes.
4. **Tear Down**: Destroy the sandbox environment.

---

## 4. Automated Route Rerouting and Failover Runbooks

When a regional outage occurs, GTM DNS load balancers redirect client traffic to the standby region.

```typescript
export class DNSFailoverController {
  private primaryRegionHealthUrl = "https://health.us-east.twitter.com";
  private standbyRegionHealthUrl = "https://health.us-west.twitter.com";

  /**
   * Evaluates regional health and reroutes DNS traffic if the primary region goes offline.
   */
  public async monitorAndFailover(): Promise<void> {
    const isPrimaryHealthy = await this.checkHealth(this.primaryRegionHealthUrl);

    if (!isPrimaryHealthy) {
      console.warn("[ALERT] Primary region US-East is offline. Initiating failover...");
      
      const isStandbyHealthy = await this.checkHealth(this.standbyRegionHealthUrl);
      if (isStandbyHealthy) {
        // Promote standby region in DNS records
        await dnsClient.updateRoutingWeight({
          primaryWeight: 0,
          standbyWeight: 100
        });
        console.log("[SUCCESS] DNS routing successfully redirected to US-West");
      } else {
        throw new Error("Disaster: Both primary and standby regions are offline");
      }
    }
  }

  private async checkHealth(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
      return response.status === 200;
    } catch {
      return false;
    }
  }
}
```
Failover tests are executed quarterly in production environments to verify that route transitions complete within the 10-minute RTO target.
