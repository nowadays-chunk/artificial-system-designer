# Google Docs Case Study - Chapter 15: Documentation and Architecture Artifacts

## 1. Document-as-Code (GitOps Workflows)

Infrastructure architecture documentation must be kept up-to-date and versioned alongside the code. We treat documentation as code (GitOps):
- **Storage**: Architecture diagrams, network specifications, and schemas are stored in a markdown format inside the project's repository.
- **Reviews**: Changes to system design documents require pull requests and team approvals.
- **Generation**: Build pipelines compile markdown files to generate HTML docs pages.

---

## 2. Standardized Architecture Decision Record (ADR) Schema

We use a standard template for ADRs to document architectural decisions.

```markdown
# ADR-014: Database Sharding Selection for Metadata Storage

## Status
Approved

## Context
Our metadata write path handles 3,000+ QPS peak load. The existing single-instance PostgreSQL database experiences CPU saturation and lock contention.

## Decision
We will partition and shard our PostgreSQL database cluster horizontally using a hash of the User ID.

## Consequences
- Distributes read/write loads across shard groups, preventing single-node bottlenecks.
- Requires modifying application queries to include the partitioning key (User ID) to avoid cross-shard query operations.
```

---

## 3. Central Schema Registry & API Catalogs

To coordinate service communication and prevent breaking changes:
- **Proto Schema Contracts**: Store all Protocol Buffer schemas in a central repository.
- **CI Linting**: Run compatibility checks on schema changes in CI pipelines to prevent regressions.
