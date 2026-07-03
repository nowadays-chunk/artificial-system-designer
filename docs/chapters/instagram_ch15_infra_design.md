# Instagram Case Study - Chapter 15: Documentation and Architecture Artifacts

## 1. GitOps Workflows for Architecture Documentation

We manage system design documentation as code:
- **Versioning**: All architecture diagrams, configurations, and API schemas are stored in markdown format within the Git repository.
- **Approvals**: Any changes to architecture specifications require pull request reviews and team approvals.

---

## 2. Standardized Architecture Decision Record (ADR) Schema

We document architectural decisions using a standardized ADR template:

```markdown
# ADR-014: Selecting WebP as standard photo delivery format

## Status
Approved

## Context
High-resolution JPEGs consume significant egress bandwidth and increase page load times on slow mobile networks.

## Decision
We will transcode all uploaded media assets to WebP as the default delivery format.

## Consequences
- Reduces average payload size by 35%, lowering CDN egress costs.
- Increases CPU utilization on transcoding nodes.
```

---

## 3. Centralized API Registry and Schema Management

To coordinate service communication and prevent breaking changes:
- **Proto Schema Contracts**: Store all Protocol Buffer schemas in a central repository.
- **CI Linting**: Run compatibility checks on schema changes in CI pipelines to prevent regressions.
