# Instagram Case Study - Chapter 10: Disaster Recovery and Business Continuity

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
         |  Media Upload     |  < 2 minutes       |  < 1 second      |
         +-----------------------------------------------------------+
```

To meet these targets, the database tier uses a combination of multi-region replication models based on data consistency requirements.

---

## 2. Multi-Region Database Replication Topologies

To survive regional data center outages, data is replicated across multiple geographic regions (e.g. `us-east-1` and `us-west-2`).

---

### 2.1 Media Object Storage Replication (Amazon S3 Cross-Region Replication)
For media binary assets, we use Amazon S3 Cross-Region Replication (CRR):
- **Asynchronous Replication**: Object binaries are copied asynchronously to the target region.
- **RPO Target**: Replication completes in under 15 minutes for 99.9% of uploads.

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

### 3.1 PostgreSQL Point-in-Time Recovery (PITR)
- **Continuous WAL Archiving**: PostgreSQL Write-Ahead Logs (WAL) are streamed continuously to backup storage.
- **Base Backups**: Weekly physical base backups are scheduled. SRE teams use WAL logs to restore the database to a specific millisecond state (PITR) if data corruption occurs.

---

### 3.2 Sandbox Verification Runbook
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
  private primaryRegionHealthUrl = "https://health.us-east.instagram.com";
  private standbyRegionHealthUrl = "https://health.us-west.instagram.com";

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
