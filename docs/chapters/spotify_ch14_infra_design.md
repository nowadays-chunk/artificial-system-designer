# Spotify Case Study - Chapter 14: Lifecycle Management

## 1. Upgrade Lifecycle Policies

We categorize infrastructure tools and software versions using standard lifecycle stages:
- **Active**: Actively supported and deployed versions.
- **Deprecated**: Supported but not recommended for new projects.
- **End-of-Life (EOL)**: Decommissioned. Systems must be upgraded.

We maintain a central version catalog to track dependencies and schedule updates.

---

## 2. Upgrading Cassandra Clusters Without Downtime

To upgrade database engines with zero downtime, we use rolling upgrades:
- **Rolling Upgrade**: Nodes are upgraded, restarted, and verified one-by-one.
- **Mixed-Version Mode**: The Cassandra cluster operates in mixed-version compatibility mode until all nodes are upgraded, ensuring uninterrupted write and read transactions.
- **Rollback Preparation**: Before initiating upgrades, we generate full snapshots of all databases.

```
    Zero-Downtime Database Upgrade:
    [ Cassandra Node 1 (v3.11) ] =======( Upgrade Node )=======> [ Cassandra Node 1 (v4.0) ]
```

---

## 3. Deprecation and Sunset of Internal APIs

To deprecate legacy microservice endpoints:
- **Usage Metrics Audits**: Monitor endpoint call rates to identify active client dependencies.
- **Sunset Headers**: Inject Sunset headers in responses to alert client teams of deprecation schedules.
- **Shedding Load**: Run short, planned outages of deprecated APIs to detect unmigrated dependencies in development environments.
