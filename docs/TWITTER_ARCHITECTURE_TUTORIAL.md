# Designing Twitter: Step-by-Step IT Infrastructure Architect Guide

This case study guides you through designing and modeling a real-time microblogging system (Twitter/X style) scaled to handle **500M+ DAUs**, structured around the **15-step IT Infrastructure Architect Checklist**.

---

## Chapter 1: Infrastructure Architecture Design
- **Logical Model**: Define clear separations between the **Write Path** (posting tweets) and the **Read Path** (loading home timelines).
- **Architecture Blueprints**: Draw physical diagrams segmenting Client Apps, Ingress Gateways, Application Services, Caching Pools, and Persistent Storage.

---

## Chapter 2: Infrastructure Modeling
- **Component Mapping**: Represent microservices visually:
  - **User Service**: Identity database.
  - **Tweet Service**: Processes writes.
  - **Timeline Service**: Hydrates feeds.
  - **Search & Index Service**: Full-text indexers.
- **Relationship Bounds**: Model inter-service communication over high-throughput gRPC connections.

---

## Chapter 3: Technology Selection & Standards
- **Ingress Layer**: NGINX gateways acting as reverse proxies + Cloudflare CDN edge servers.
- **Messaging Pipeline**: Apache Kafka cluster for pub/sub message processing.
- **Cache Cluster**: Redis cluster running memory-cache pools.
- **Persistent Database**: Apache Cassandra for wide-column tweet storage, PostgreSQL for user meta records.

---

## Chapter 4: Infrastructure Strategy & Planning
- **Load Expectations**: Handle an average of 6,000 tweets per second and 300,000 timeline reads per second.
- **Diurnal Scaling Plan**: Schedule scaling curves using auto-scaler profiles (nominal night modes, high diurnal peak allocations).

---

## Chapter 5: System Integration & Interoperability
- **gRPC Protocols**: Standardize communication links using protobuf contracts to maintain type safety.
- **Fanout Pipeline**: Configure background worker instances triggered by Kafka queues to write new tweets to active followers' Redis home timelines.

---

## Chapter 6: Security Architecture
- **API Gateways Rate-Limiting**: Enforce sliding-window rate limit checks to restrict query surges and mitigate DDoS sweeps.
- **Encryption Bounds**: Secure transit channels using TLS 1.3 encryption, and protect secrets via Vault.

---

## Chapter 7: Performance & Availability Management
- **Hotspot Caching**: Mitigate celebrity query loads by caching highly-requested timelines in secondary Redis replica caches.
- **Redundant Routing**: Use Load Balancers (ALBs) routing traffic across multiple Availability Zones (AZs) to prevent single points of failure.

---

## Chapter 8: Infrastructure Implementation Oversight
- **Architecture Reviews**: Conduct topology checklists before code integrations.
- **QA Verifications**: Run load simulation tests checking capacity constraints before staging deployment.

---

## Chapter 9: Cloud & Virtualization Architecture
- **Container Host**: Deploy services as containerized microservices in Amazon EKS (Kubernetes).
- **Auto-scaler Metrics**: Configure Horizontal Pod Autoscalers (HPA) keying on CPU saturation.

---

## Chapter 10: Disaster Recovery & Business Continuity
- **Multi-Region Failovers**: Deploy active-passive replication configurations across AWS Regions.
- **Backup Ledgers**: Store daily Cassandra backups in S3 Glacier with a 30-day lifecycle expiration.

---

## Chapter 11: Governance & Compliance
- **ADR Templates**: Maintain Architecture Decision Records (ADRs) tracking reasons behind cache configurations.
- **Tag Policies**: Standardize resource naming tags across compute resources (e.g. `env`, `service`, `owner`).

---

## Chapter 12: Collaboration & Stakeholder Communication
- **SRE & DBA Synces**: Coordinate database migration schedules.
- **Capacity Planning reviews**: Meet with product managers quarterly to align load allocations.

---

## Chapter 13: Infrastructure Optimization
- **Cache Hit Verification**: Monitor Redis cache hit rates.
- **Query Optimization**: Optimize Cassandra indexing models to prevent database saturation.

---

## Chapter 14: Lifecycle Management
- **Upgrade Paths**: Plan regular system updates for Redis cluster nodes.
- **Decommissioning Plans**: Phase out old monolithic service components once gRPC gateways are validated.

---

## Chapter 15: Documentation & Architecture Artifacts
- **Topology Maps**: Store versioned architecture diagrams in diagrams directories.
- **API Swagger guides**: Maintain swagger schemas explaining gateway access routes.
