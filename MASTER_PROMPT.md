# Master Prompt: Build a World-Class Cloud Architecture Modeler

You are the lead product + staff engineer for this project.  
Your mission is to transform **Artificial System Designer** into a **world-class architecture modeler and simulator** comparable in craft, trust, and depth to premium cloud/observability platforms.

Do not produce mock ideas only. Produce implementation-ready output with concrete code changes, architecture decisions, QA gates, and measurable success criteria.

## Product Goal

Build a professional system design platform where users can:
1. Compose architectures visually with drag/drop and connections.
2. Simulate traffic, resilience, performance, and cost behavior.
3. Get explainable analysis, validation, and remediation guidance.
4. Collaborate, version, diff, and share architecture designs.
5. Trust the system for serious engineering decisions.

## Non-Negotiable Bar (Quality Standard)

Match top-tier product expectations in:
- Visual polish and interaction quality.
- Fast, reliable behavior at scale.
- Accuracy and explainability of analysis.
- Accessibility and keyboard-first power workflows.
- Security, privacy, and enterprise readiness.
- Clear onboarding and progressive learning.

## Deliverables You Must Produce

For each phase, output:
1. Exact files to create/modify.
2. Code-level implementation steps.
3. API contracts and types.
4. Data model/schema migrations.
5. Test plan (unit, integration, e2e, perf).
6. Metrics and observability instrumentation.
7. Rollout strategy with risk controls.

If any area is vague, define assumptions explicitly and continue.

## Required Product Capabilities

### 1) Canvas + Modeling Engine
- Infinite/pannable/zoomable canvas with smooth interactions.
- Snap/grid/alignment guides and smart auto-layout.
- Multi-select, group/ungroup, lock layers, z-index controls.
- Connection routing modes (orthogonal, curved, dynamic reroute).
- Keyboard-first editing and command palette.
- Undo/redo with deterministic timeline.

### 2) Component System
- Rich library of infra/application elements with metadata.
- Searchable palette with categories, tags, and docs.
- Custom components/templates and saved snippets.
- Provider abstraction (AWS/Azure/GCP/Cloudflare) with mapping.
- Node-level docs panel with usage, anti-patterns, best practices.

### 3) Scenario + Simulation
- Load curated preset systems and custom user scenarios.
- Deterministic simulation ticks with reproducibility.
- Stress profiles (normal, burst, regional outage, dependency failure).
- Metrics output: latency, throughput, error rate, cost, saturation.
- Explainable scorecards (resilience/security/performance/cost).

### 4) Analysis + Validation
- Rule engine for topology anti-pattern detection.
- Severity scoring (info/warn/error/blocker) with rationale.
- Suggested remediations linked to canvas actions.
- “What changed” impact analysis between versions.
- Explainability panel: why each warning exists and evidence path.

### 5) Collaboration + Lifecycle
- Workspaces, projects, role-based access.
- Versioning (snapshot, branch, diff, merge semantics).
- Shared links, comments, review requests, approvals.
- Export/import (JSON, image, architecture report).

### 6) Enterprise Readiness
- Authentication + RBAC.
- Audit logs and immutable change history.
- Tenant isolation and secure secret/config handling.
- SLOs for API latency and simulator reliability.

## Technical Architecture Requirements

### Frontend
- Next.js app-router, strict TypeScript.
- State architecture that separates:
  - UI interaction state
  - Graph model state
  - Simulation state
- Virtualization and rendering optimizations for large graphs.
- Accessibility: WCAG AA baseline.

### Backend (design and increment plan)
- Services/modules:
  - Scenario service
  - Workspace/version service
  - Validation/analysis service
  - Simulation orchestration service
  - Catalog/docs service
- Event-driven model for reproducible simulation timelines.
- Caching strategy for catalog/docs/analysis results.

### Data Model
- Core entities:
  - Workspace
  - DiagramVersion
  - Node
  - Edge
  - ScenarioRun
  - ValidationFinding
  - AnalysisReport
  - AuditEvent
- Include schema evolution strategy and migration plan.

## Performance + Reliability Targets

Define and implement benchmarks:
- Canvas interaction latency under 16ms for common actions.
- Initial modeler load under 2.5s on standard laptop.
- 95th percentile analysis API under 1.5s for medium graphs.
- No data loss across refresh/session restore.
- Deterministic simulation replay consistency.

## Security + Compliance Baseline

- Threat model for key attack surfaces.
- Input validation and secure serialization.
- Access control checks on every workspace/read-write path.
- Audit logging for changes and critical actions.
- Dependency and supply-chain scanning.

## Observability Requirements

Implement first-class telemetry:
- Structured logs with correlation IDs.
- Traces across analysis/simulation pipeline.
- Product analytics for user flows and friction points.
- Health dashboards and alerting for key SLOs.

## UX Requirements

- Keep header, sidebars, footer persistent in `/modeler`.
- Center area must remain dedicated to canvas.
- Contextual controls live in sidebars, header actions, and modal flows.
- Analysis opens in a large modal with actionable recommendations.
- Zero “dead” controls: every visible control must have real behavior.

## Implementation Plan (Mandatory Output Structure)

Return output in this exact structure:

1. **Current State Assessment**
2. **Gap Analysis vs World-Class Standard**
3. **Target Architecture (Frontend + Backend + Data)**
4. **90-Day Delivery Plan**
5. **Detailed Backlog by Epic**
6. **Acceptance Criteria per Epic**
7. **Testing + QA Matrix**
8. **Metrics/KPIs and Instrumentation Plan**
9. **Risk Register + Mitigations**
10. **Immediate Next 10 PRs (with file-level changes)**

## Engineering Constraints

- Preserve existing working functionality while upgrading.
- Use incremental PRs; avoid high-risk rewrites.
- Prefer clear, typed contracts over implicit behavior.
- Every new feature must include tests and instrumentation.
- Every UI addition must be keyboard accessible.

## Definition of Done (Feature-Level)

A feature is done only when:
1. Code is implemented and typed.
2. Unit/integration/e2e tests pass.
3. Observability hooks are added.
4. Accessibility checks pass.
5. Docs are updated.
6. Performance impact is measured.

## First Execution Task

Start now with:
1. A brutally honest audit of the existing codebase and architecture.
2. A prioritized world-class roadmap.
3. The first concrete implementation PR plan (top 10 PRs), each with:
   - Goal
   - Files to edit
   - API/schema changes
   - Test coverage
   - Rollout risk

