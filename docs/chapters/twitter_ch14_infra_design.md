# Twitter Case Study - Chapter 14: Lifecycle Management

## 1. Upgrades and Obsolescence Mitigation

Infrastructure components have operational lifecycles. We manage software lifecycle phases:
1. **Active**: Supported, actively deployed.
2. **Deprecated**: Supported but not recommended for new service deployments.
3. **End of Life (EOL)**: Decommissioned. All active instances must be migrated.

We maintain a central tech inventory database to track software version lifecycles and identify nodes running deprecated packages.

---

## 2. Low-Risk Database Cluster Major Upgrades

Upgrading stateful database tiers (e.g., upgrading a Cassandra cluster from 3.x to 4.x) requires a multi-phase roll-out plan.

```
  Cassandra Cluster Rolling Upgrade:
  [ Node 1 (v3.0) ] ---> [ Upgrade Node 1 (v4.0) ] ---> [ Verify Node 1 Health ]
                                                                |
                                                                v
                                                        [ Node 2 (v3.0) ] ---> [ Repeat... ]
```

### 2.1 Rolling Upgrades
Cassandra support rolling upgrades without cluster downtime:
- **Individual Upgrade**: Nodes are upgraded, restarted, and verified one-by-one.
- **Protocol Compatibility**: The cluster operates in mixed-version compatibility mode until all nodes are upgraded, ensuring uninterrupted write and read transactions.

### 2.2 Rollback Preparation
Before initiating upgrades, we generate full snapshots of all databases. If compatibility issues emerge during the rolling upgrade, we halt the rollout and revert nodes to the pre-upgrade snapshot state.

---

## 3. API Version deprecation pipelines

Phasing out legacy microservice endpoints requires a structured deprecation process:
1. **Metrics Auditing**: Monitor endpoint call counts using API logs to identify active consumers.
2. **Header Warning Injections**: Inject `Deprecation` and `Sunset` HTTP headers in responses to alert client teams of upcoming deprecation dates.
3. **Shedding Load (Brownouts)**: Implement scheduled short outages (e.g. 5 minutes) of deprecated endpoints to surface unmigrated dependencies in development environments before permanent sun-setting.
