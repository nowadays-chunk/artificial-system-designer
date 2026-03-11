# 1. **Current State Assessment**

## Brutally honest audit
- Product surface is mostly frontend-only. There is no backend service layer, persistence, auth, RBAC, or tenant model.
- `app/modeler/page.tsx` provides a strong shell (persistent header/sidebars/footer, keyboard shortcuts, analysis modal trigger).
- `app/diagram-modeler.tsx` has substantial in-browser modeling and simulation logic, but it is monolithic (thousands of lines), mixing:
  - UI interaction state
  - Graph model state
  - Simulation and validation execution
- No durable storage: model edits are session-local only.
- No deterministic event log persisted to replay/verify simulations across sessions.
- No collaboration/versioning/diff/merge.
- No API contracts, no schema migrations, no observability pipeline.
- Test coverage is effectively absent (`package.json` has no test scripts and repository has no test suite).
- Security/compliance baseline is not present (auth, access control checks, audit events, threat model, dependency scanning workflow).

## Existing strengths to preserve
- Good directional UX structure in `/modeler` with persistent layout regions.
- Rich static component catalog and scenario data in `app/spec-data.ts`.
- Useful first-pass rule checks and runtime visualization concepts in `app/diagram-modeler.tsx`.
- Theme support and keyboard affordances already introduced.

# 2. **Gap Analysis vs World-Class Standard**

## Gaps by capability
- Canvas engine: no infinite virtualized canvas, no grouping/layer locks/z-index panel, limited routing options, no deterministic undo/redo timeline persisted.
- Component system: no provider abstraction mapping model, no user templates/snippets storage, no docs service backend.
- Simulation: local-only, non-authoritative, no run orchestration, no reproducibility guarantees with stored seed + event stream.
- Analysis/validation: rule logic exists but not isolated service; no severity evidence path graph; no what-changed impact engine.
- Collaboration/lifecycle: no workspaces/projects/comments/approvals/version control semantics.
- Enterprise readiness: no auth, RBAC, audit logging, tenant isolation.
- Reliability/performance: no formal benchmark harness for 16ms interactions/2.5s load/1.5s p95 analysis API.
- Observability: no structured logs, traces, product analytics, SLO dashboards.

# 3. **Target Architecture (Frontend + Backend + Data)**

## Frontend architecture (Next.js app-router + strict TS)
- `app/modeler/page.tsx`: shell and orchestration only.
- `app/modeler/state/ui-store.ts`: viewport, panels, selection mode, shortcuts, command palette.
- `app/modeler/state/graph-store.ts`: normalized graph entities, commands, deterministic undo/redo.
- `app/modeler/state/sim-store.ts`: run status, ticks, reports, findings, replay.
- `app/modeler/components/canvas/*`: renderers, interaction controllers, virtualization layer.
- `app/modeler/components/inspector/*`: node/edge inspectors and docs panel.
- `app/modeler/components/analysis/*`: explainability + remediation modal.
- `lib/api-client/*`: typed API clients.
- `lib/telemetry/*`: analytics events, correlation ids.

## Backend modules (incremental)
- `apps/api/src/modules/workspace`: projects, versions, snapshots, diffs.
- `apps/api/src/modules/scenario`: presets and scenario metadata.
- `apps/api/src/modules/analysis`: rules + explainability + remediation actions.
- `apps/api/src/modules/simulation`: orchestration, ticks, deterministic replay.
- `apps/api/src/modules/catalog`: components/docs/provider mappings.
- `apps/api/src/modules/auth`: identity, RBAC, tenant resolution.
- `apps/api/src/modules/audit`: immutable audit event stream.

## Core API contracts (initial)
- `POST /api/workspaces`
  - Request: `{ name: string }`
  - Response: `{ workspaceId: string, createdAt: string }`
- `POST /api/workspaces/:id/diagram-versions`
  - Request: `{ baseVersionId?: string, graph: GraphDocument, message: string }`
  - Response: `{ versionId: string, number: number }`
- `POST /api/simulations/runs`
  - Request: `{ workspaceId: string, versionId: string, scenarioId: string, seed: number, profile: "normal" | "burst" | "regional_outage" | "dependency_failure" }`
  - Response: `{ runId: string, status: "queued" | "running" }`
- `GET /api/simulations/runs/:runId`
  - Response: `{ runId: string, status: string, metrics: SimulationMetrics, findings: ValidationFinding[] }`
- `POST /api/analysis/validate`
  - Request: `{ graph: GraphDocument, scenarioId?: string }`
  - Response: `{ reportId: string, findings: ValidationFinding[], scorecard: Scorecard }`

## Shared types (initial)
- `GraphDocument`, `GraphNode`, `GraphEdge`
- `SimulationRun`, `SimulationTick`, `SimulationMetrics`
- `ValidationFinding`, `EvidencePath`, `RemediationAction`
- `AnalysisReport`, `DiagramDiff`, `AuditEvent`

## Data model + migration plan
- `Workspace(id, tenant_id, name, created_by, created_at)`
- `Project(id, workspace_id, name, created_at)`
- `DiagramVersion(id, project_id, version_number, base_version_id, graph_json, message, created_by, created_at)`
- `ScenarioRun(id, workspace_id, version_id, scenario_id, seed, profile, status, started_at, finished_at, metrics_json)`
- `ValidationFinding(id, run_id, severity, rule_code, rationale, evidence_json, remediation_json, created_at)`
- `AnalysisReport(id, workspace_id, version_id, scorecard_json, summary_json, created_at)`
- `AuditEvent(id, tenant_id, actor_id, action, resource_type, resource_id, payload_json, occurred_at, hash)`
- Migration strategy:
  - `0001_init_core_tables.sql`
  - `0002_add_version_branching.sql`
  - `0003_add_audit_hash_chain.sql`
  - `0004_add_indexes_perf.sql`
  - Backfill scripts for version lineage and run correlation ids.

# 4. **90-Day Delivery Plan**

## Phase 1 (Days 1-30): Foundation and decomposition
- Files to create/modify:
  - Create `app/modeler/state/*`, `app/modeler/components/*`, `lib/api-client/*`, `lib/telemetry/*`
  - Refactor `app/diagram-modeler.tsx` into modular feature folders.
  - Create backend scaffold under `apps/api/*`.
- Code-level steps:
  - Split stores (UI/graph/sim).
  - Introduce command bus and undo/redo timeline.
  - Add typed client boundary even before backend is fully live (mock adapters).
- API/types:
  - Define shared contracts in `packages/contracts/src/*`.
- Data migrations:
  - Apply `0001_init_core_tables.sql`.
- Tests:
  - Unit tests for graph commands, selectors, rule evaluator.
  - Integration tests for API contract validation.
  - E2E smoke for `/modeler` keyboard and drag/drop.
  - Baseline perf probes for load and interaction latency.
- Metrics/observability:
  - Correlation id in all frontend actions and backend requests.
  - Structured logs for command execution and API requests.
- Rollout/risk control:
  - Feature flags for new stores and API mode (`local_sim`, `remote_sim`).

## Phase 2 (Days 31-60): Analysis, simulation service, persistence
- Files to create/modify:
  - `apps/api/src/modules/simulation/*`, `analysis/*`, `workspace/*`
  - `app/modeler/components/analysis/*`, `app/modeler/hooks/use-simulation-run.ts`
- Code-level steps:
  - Add deterministic simulation orchestrator with seed + tick stream.
  - Persist diagram versions and scenario runs.
  - Implement explainability panel with evidence path.
- API/types:
  - Ship simulation run and analysis endpoints.
- Data migrations:
  - Apply `0002_add_version_branching.sql`.
- Tests:
  - Simulation determinism tests (same seed => identical outputs).
  - Integration tests for validate + remediation mapping.
  - E2E for save version -> run simulation -> open analysis modal.
  - Perf test p95 analysis under target.
- Metrics/observability:
  - Add traces across validate -> simulate -> report pipeline.
  - Dashboard for run success/failure + latency.
- Rollout/risk control:
  - Canary simulation service for internal workspaces only.

## Phase 3 (Days 61-90): Collaboration + enterprise hardening
- Files to create/modify:
  - `apps/api/src/modules/auth/*`, `audit/*`, `comments/*`, `diff/*`
  - `app/modeler/components/collab/*`, `app/modeler/components/versioning/*`
- Code-level steps:
  - Add workspace roles, comments, review requests, approvals.
  - Implement version diff and merge checks.
  - Enforce access checks on every workspace read/write endpoint.
- API/types:
  - Auth/session + RBAC-protected workspace routes.
  - Review/comment endpoints with audit events.
- Data migrations:
  - Apply `0003_add_audit_hash_chain.sql`, `0004_add_indexes_perf.sql`.
- Tests:
  - RBAC authorization matrix tests.
  - Audit immutability tests.
  - E2E collaboration flows.
  - Reliability tests for session restore/no data loss.
- Metrics/observability:
  - SLO dashboards and burn-rate alerts for API/simulation.
- Rollout/risk control:
  - Tenant-by-tenant rollout with kill switches.

# 5. **Detailed Backlog by Epic**

## Epic A: Modeling Core
- Deliver infinite canvas, virtualization, alignment guides, grouping, locking, z-index, routing modes.
- Deterministic command stack with persisted undo/redo timeline.

## Epic B: Component and Catalog System
- Provider-neutral component taxonomy + provider mapping matrix.
- Searchable palette with tags/docs links and custom snippets.

## Epic C: Simulation Orchestration
- Deterministic run engine with scenario profiles and tick stream persistence.
- Metrics output for latency, throughput, error rate, saturation, cost.

## Epic D: Analysis and Explainability
- Rule engine service with severity scoring and evidence paths.
- Remediation actions deep-linked to canvas mutations.

## Epic E: Workspace Lifecycle
- Workspaces/projects/versioning/diff/merge/comment/review/approval.
- Share links and export/import (JSON/image/report).

## Epic F: Enterprise and Security
- Auth, RBAC, tenant isolation, immutable audit log.
- Input validation, secure serialization, dependency scanning.

## Epic G: Observability and Product Intelligence
- Structured logs, traces, analytics events, SLO dashboards.
- Funnel telemetry for onboarding and friction points.

# 6. **Acceptance Criteria per Epic**

- Epic A: 95% of drag/pan/zoom interactions complete under 16ms on benchmark graph (1k nodes/2k edges).
- Epic B: Component search returns results under 100ms and docs panel opens for every node type.
- Epic C: Same `(versionId, scenarioId, seed, profile)` returns byte-identical scorecard outputs.
- Epic D: Every finding includes rule id, severity, rationale, evidence path, and at least one remediation.
- Epic E: Users can create snapshot, branch, diff, and submit review without data loss across refresh.
- Epic F: All workspace endpoints enforce RBAC and emit immutable audit event records.
- Epic G: End-to-end trace exists for validate/simulate/report and SLO alerts trigger in staging drills.

# 7. **Testing + QA Matrix**

- Unit:
  - Graph command handlers, selection reducers, edge routing functions.
  - Rule evaluator predicates and scoring calculators.
  - Serialization/deserialization and contract schemas.
- Integration:
  - API handlers + persistence layer.
  - Simulation orchestrator + analysis pipeline.
  - Auth middleware + RBAC guard checks.
- E2E:
  - Keyboard-first modeling workflow.
  - Save/version/diff/simulate/analyze flow.
  - Collaboration review/approval flow.
- Performance:
  - Canvas FPS and interaction latency under large graph fixtures.
  - p95 API latency for analysis and run status endpoints.
- Reliability:
  - Refresh/restore, offline recovery, deterministic replay checks.
- Accessibility:
  - Automated axe checks + manual keyboard-only passes for `/modeler`.

# 8. **Metrics/KPIs and Instrumentation Plan**

## Product KPIs
- Activation: first valid architecture within 15 minutes.
- Quality: % of models with blocker findings resolved before share.
- Engagement: weekly active modelers + simulations per active workspace.
- Collaboration: review completion rate and median time to approval.

## Engineering/SLO KPIs
- Canvas interaction p95 < 16ms.
- Initial modeler load p75 < 2.5s.
- Analysis API p95 < 1.5s for medium graphs.
- Simulation run success rate > 99.5%.
- Zero data loss incidents on refresh/session restore.

## Instrumentation
- Frontend events:
  - `modeler.node_added`, `modeler.edge_created`, `analysis.opened`, `simulation.run_started`, `version.saved`.
- Backend logs:
  - JSON structured logs with `correlation_id`, `tenant_id`, `workspace_id`, `actor_id`.
- Traces:
  - `analysis.validate`, `simulation.orchestrate`, `workspace.save_version`.
- Dashboards/alerts:
  - Latency, error rate, saturation, run failure, and SLO burn alerts.

# 9. **Risk Register + Mitigations**

- Risk: Monolithic `app/diagram-modeler.tsx` refactor regression.
  - Mitigation: strangler pattern with feature flags and parity tests before removal.
- Risk: Performance drops while adding rich interactions.
  - Mitigation: benchmark suite + render virtualization gate in CI.
- Risk: Non-deterministic simulation behavior.
  - Mitigation: seed-controlled engine + snapshot-based replay tests.
- Risk: Scope overload across 90 days.
  - Mitigation: strict milestone acceptance gates and deferred non-core visuals.
- Risk: Security debt from delayed auth/RBAC.
  - Mitigation: RBAC middleware introduced early behind internal auth provider.
- Risk: Migration failures on version graph and audit tables.
  - Mitigation: reversible migrations, staging rehearsal, backup and rollback scripts.

# 10. **Immediate Next 10 PRs (with file-level changes)**

## PR1: Extract typed domain contracts
- Goal: establish shared frontend/backend types.
- Files:
  - Create `packages/contracts/src/graph.ts`
  - Create `packages/contracts/src/simulation.ts`
  - Create `packages/contracts/src/analysis.ts`
  - Create `packages/contracts/src/index.ts`
- API/schema: none yet; contract-first.
- Tests: unit for schema validators and type guards.
- Rollout risk: low.

## PR2: Split modeler state stores
- Goal: separate UI, graph, and simulation state.
- Files:
  - Create `app/modeler/state/ui-store.ts`
  - Create `app/modeler/state/graph-store.ts`
  - Create `app/modeler/state/sim-store.ts`
  - Modify `app/diagram-modeler.tsx`
- API/schema: none.
- Tests: unit for command reducers/selectors.
- Rollout risk: medium (state regression).

## PR3: Command bus + deterministic undo/redo
- Goal: deterministic timeline and replay-ready commands.
- Files:
  - Create `app/modeler/commands/types.ts`
  - Create `app/modeler/commands/command-bus.ts`
  - Create `app/modeler/commands/handlers/*`
  - Modify `app/diagram-modeler.tsx`
- API/schema: add command envelope type.
- Tests: unit and property tests for inverse operations.
- Rollout risk: medium.

## PR4: Backend API scaffold + health + logging
- Goal: introduce service foundation and observability baseline.
- Files:
  - Create `apps/api/src/main.ts`
  - Create `apps/api/src/modules/health/*`
  - Create `apps/api/src/lib/logger.ts`
  - Create `apps/api/src/lib/correlation.ts`
- API/schema: `GET /api/health`.
- Tests: integration for health and log correlation id.
- Rollout risk: low.

## PR5: Workspace + version persistence
- Goal: save/load/version diagrams.
- Files:
  - Create `apps/api/src/modules/workspace/*`
  - Create `apps/api/migrations/0001_init_core_tables.sql`
  - Create `apps/api/migrations/0002_add_version_branching.sql`
  - Modify `app/modeler/page.tsx`
  - Create `lib/api-client/workspaces.ts`
- API/schema: workspace/version endpoints.
- Tests: integration CRUD + version lineage checks.
- Rollout risk: medium-high (data integrity).

## PR6: Analysis service extraction
- Goal: isolate validation rules into service with explainability payload.
- Files:
  - Create `apps/api/src/modules/analysis/*`
  - Modify `app/diagram-modeler.tsx`
  - Create `lib/api-client/analysis.ts`
- API/schema: `POST /api/analysis/validate`.
- Tests: rule engine unit + API integration + explainability shape checks.
- Rollout risk: medium.

## PR7: Simulation orchestration service
- Goal: deterministic simulation runs with persisted snapshots.
- Files:
  - Create `apps/api/src/modules/simulation/*`
  - Create `apps/api/migrations/0003_add_scenario_runs.sql`
  - Modify `app/diagram-modeler.tsx`
  - Create `lib/api-client/simulation.ts`
- API/schema: run create/get endpoints.
- Tests: deterministic replay tests + integration tests.
- Rollout risk: high (correctness + performance).

## PR8: Accessibility and keyboard-first hardening
- Goal: WCAG AA baseline and complete keyboard workflows.
- Files:
  - Modify `app/modeler/page.tsx`
  - Modify `app/diagram-modeler.tsx`
  - Create `app/modeler/a11y/shortcuts.ts`
- API/schema: none.
- Tests: e2e keyboard navigation + axe checks.
- Rollout risk: low.

## PR9: Auth + RBAC + audit log
- Goal: secure workspace actions and immutable audit history.
- Files:
  - Create `apps/api/src/modules/auth/*`
  - Create `apps/api/src/modules/audit/*`
  - Create `apps/api/migrations/0004_add_audit_hash_chain.sql`
  - Modify all workspace/analysis/simulation handlers for guards
- API/schema: auth session metadata on protected endpoints.
- Tests: authorization matrix + audit append-only verification.
- Rollout risk: high.

## PR10: CI quality gates (tests/perf/security)
- Goal: enforce definition of done automatically.
- Files:
  - Modify `package.json`
  - Create `.github/workflows/ci.yml`
  - Create `tests/perf/modeler-bench.spec.ts`
  - Create `tests/e2e/modeler-core.spec.ts`
  - Create `tests/integration/api-contracts.spec.ts`
- API/schema: none.
- Tests: full matrix in CI.
- Rollout risk: low-medium (build time increase).

