# Twitter Case Study - Chapter 15: Documentation and Architecture Artifacts

## 1. Document-as-Code (GitOps Workflows)

Infrastructure architecture documentation must be kept up-to-date and versioned alongside the code. We treat documentation as code (GitOps):
- **Storage**: Architecture diagrams, network specifications, and schemas are stored in a markdown format inside the project's repository.
- **Reviews**: Changes to system design documents require pull requests and team approvals.
- **Generation**: Build pipelines compile markdown files to generate HTML docs pages.

---

## 2. Standardized Architecture Decision Record (ADR) Schema

We use a standard template for ADRs to document architectural decisions.

```markdown
# ADR-042: Database Selection for Tweet Storage

## Status
Approved

## Context
Our tweet write path handles 12,000+ QPS peak load. The existing database setup (B+ Tree relational indexes) suffers from high disk seek latency during random writes.

## Decision
We will migrate tweet persistence storage to Apache Cassandra.

## Consequences
- LSM-Tree engine changes random writes into sequential writes, resolving write latency.
- We trade ACID compliance for partition tolerance and eventual consistency (CAP Theorem).
```

---

## 3. Central Schema Registry & API Catalogs

To prevent breaking changes in distributed service communication, we maintain a central schema registry:
- **Proto Contracts**: All gRPC protocol buffer `.proto` schemas are stored in a single repository (`twitter-apis`).
- **CI Compatibility Checks**: CI pipelines run compatibility checks on schema changes (e.g., verifying fields are not renamed or re-indexed) to prevent regressions in active services.
- **Auto-Generation**: API client stubs are generated automatically for target runtimes (Java, Go, Scala) when schemas commit.
