# Twitter Case Study - Chapter 14: Lifecycle Management

## 1. Software Version Lifecycle Policies

We manage software components (runtimes, databases, libraries) through standardized lifecycle stages to prevent security vulnerabilities and technical debt:
- **Active**: Supported and approved for new deployments.
- **Deprecated**: Supported but not recommended for new services. Migration plans are draft.
- **End-of-Life (EOL)**: Decommissioned. Systems running EOL versions must be upgraded.

We maintain a central dependency catalog that runs weekly checks to identify services running deprecated or EOL packages.

---

## 2. Low-Risk Database Cluster Major Upgrades

Upgrading stateful database tiers (e.g., upgrading a Cassandra cluster from 3.x to 4.x) requires a multi-phase roll-out plan.

```
  Cassandra Cluster Rolling Upgrade:
  [ Node 1 (v3.11) ] =======( Upgrade Node )=======> [ Node 1 (v4.0) ]
                                                            |
                                                            v
  [ Node 2 (v3.11) ] <======( Verify Health )===============+
```

### 2.1 Rolling Upgrades
Cassandra support rolling upgrades without cluster downtime:
- **Individual Upgrade**: Nodes are upgraded, restarted, and verified one-by-one.
- **Protocol Compatibility**: The cluster operates in mixed-version compatibility mode until all nodes are upgraded, ensuring uninterrupted write and read transactions.

---

### 2.2 Upgrade Validation Steps
For each node in the cluster:
1. **Deselect**: Remove the node from active read routing lists.
2. **Snapshot**: Create a local SSTable snapshot.
3. **Upgrade**: Install the target software package.
4. **Restart**: Start the Cassandra process and run consistency checks (`nodetool repair`).
5. **Verify**: Monitor CPU and I/O metrics. Re-enable the node for read routing.

If compatibility issues emerge during the rolling upgrade, we halt the rollout and revert nodes to the pre-upgrade snapshot state.

---

## 3. API Version Deprecation and Sunset Pipelines

Phasing out legacy microservice endpoints requires a structured deprecation process to prevent client application breakages.

### 3.1 Deprecation Phases
1. **Metrics Auditing**: Monitor endpoint call rates using API logs to identify active client dependencies.
2. **Header Warning Injections**: Inject `Deprecation` and `Sunset` HTTP headers in responses to alert client teams of deprecation schedules.
3. **Shedding Load (Brownouts)**: Implement scheduled short outages (e.g. 5 minutes) of deprecated endpoints to surface unmigrated dependencies in development environments before permanent sun-setting.
4. **Sunset**: Decommission the endpoint permanently.
