# Instagram Case Study - Chapter 14: Lifecycle Management

## 1. Software Version Lifecycle Policies

We manage software components (runtimes, databases, libraries) through standardized lifecycle stages to prevent security vulnerabilities and technical debt:
- **Active**: Supported and approved for new deployments.
- **Deprecated**: Supported but not recommended for new services. Migration plans are draft.
- **End-of-Life (EOL)**: Decommissioned. Systems running EOL versions must be upgraded.

We maintain a central dependency catalog that runs weekly checks to identify services running deprecated or EOL packages.

---

## 2. Low-Risk Database Cluster Major Upgrades

Upgrading stateful database tiers (e.g., upgrading a PostgreSQL cluster from 12 to 15) requires a multi-phase roll-out plan.

```
  PostgreSQL Cluster Replication-Based Upgrade:
  [ Master Node (v12) ] =======( Logical Replication )=======> [ Replica Node (v15) ]
                                                                       |
                                                                       v
  [ Ingress Gateway ] <========( Promote to Master )===================+
```

### 2.1 Logical Replication Migrations
PostgreSQL support logical replication across major versions:
- **Target Cluster Setup**: Deploy a parallel target cluster running version 15.
- **Logical Replication**: Configure logical replication to copy updates from the source cluster to the target cluster in real-time.
- **Canary Cutover**: Switch read queries to the version 15 replicas. Promote the target cluster to master once replication latency approaches zero.

---

### 2.2 Upgrade Validation Steps
Before cutover:
1. **Consistency Audit**: Run verify scripts to compare row counts and check checksums across clusters.
2. **Read Canary**: Route 5% of read traffic to the target replica to check query execution profiles.
3. **Write Promotion**: Set the source master to read-only, wait for logical replication to catch up, promote the target cluster, and route write connections to the new master.

---

## 3. API Version Deprecation and Sunset Pipelines

Phasing out legacy microservice endpoints requires a structured deprecation process to prevent client application breakages.

### 3.1 Deprecation Phases
1. **Metrics Auditing**: Monitor endpoint call rates using API logs to identify active client dependencies.
2. **Header Warning Injections**: Inject `Deprecation` and `Sunset` HTTP headers in responses to alert client teams of deprecation schedules.
3. **Shedding Load (Brownouts)**: Implement scheduled short outages (e.g. 5 minutes) of deprecated endpoints to surface unmigrated dependencies in development environments before permanent sun-setting.
4. **Sunset**: Decommission the endpoint permanently.
