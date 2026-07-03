# Dropbox Case Study - Chapter 15: Documentation and Architecture Artifacts

## 1. GitOps Workflows for Architecture Documentation

We manage system design documentation as code:
- **Versioning**: All architecture diagrams, configurations, and API schemas are stored in markdown format within the Git repository.
- **Approvals**: Any changes to architecture specifications require pull request reviews and team approvals.

---

## 2. Standardized Architecture Decision Record (ADR) Schema

We document architectural decisions using a standardized ADR template:

```markdown
# ADR-023: Deploying Magic Pocket Custom Storage

## Status
Approved

## Context
Egress bandwidth and hosting costs on public cloud block storage are scaling unsustainably.

## Decision
We will migrate our block storage tier to custom bare-metal servers hosted in private datacenters.

## Consequences
- Lowers operational costs by 50% over a 3-year window.
- Requires building a custom storage management software layer.
```

---

## 3. Centralized API Registry and Schema Management

To coordinate service communication and prevent breaking changes:
- **Proto Schema Contracts**: Store all Protocol Buffer schemas in a central repository.
- **CI Linting**: Run compatibility checks on schema changes in CI pipelines to prevent regressions.
