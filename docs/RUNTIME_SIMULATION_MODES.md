# Runtime Simulation Modes

This project supports explicit in-memory simulation toggles for both database and authentication.

## Database Simulation

- `API_DB_PROVIDER=memory` enables in-memory database simulation.
- `API_DB_PROVIDER=postgres_psql` enables SQL-backed storage via `psql`.
- `DATABASE_URL` is required when `API_DB_PROVIDER=postgres_psql`.

### Examples

```bash
# In-memory DB simulation
API_DB_PROVIDER=memory
API_RUN_MIGRATIONS_ON_BOOT=0
```

```bash
# SQL-backed DB
API_DB_PROVIDER=postgres_psql
DATABASE_URL=postgres://user:pass@localhost:5432/asd
```

## Authentication Simulation

- `API_AUTH_PROVIDER=in_memory` forces simulated auth identity (default).
- `API_AUTH_PROVIDER=header` uses incoming auth headers (`x-actor-id`, `x-tenant-id`, `x-actor-type`).
- `API_AUTH_SIMULATION=1` always forces simulation, even if provider is set to `header`.

Simulation identity controls:

- `API_AUTH_SIM_ACTOR_ID` (default: `local-user`)
- `API_AUTH_SIM_TENANT_ID` (default: `default`)
- `API_AUTH_SIM_ACTOR_TYPE` (`user` or `service`, default: `user`)

### Examples

```bash
# In-memory auth simulation
API_AUTH_PROVIDER=in_memory
API_AUTH_SIMULATION=1
API_AUTH_SIM_ACTOR_ID=dev-user
API_AUTH_SIM_TENANT_ID=dev-tenant
```

```bash
# Header-driven auth
API_AUTH_PROVIDER=header
API_AUTH_SIMULATION=0
# per-request headers required:
# x-actor-id, x-tenant-id, x-actor-type
```

## Tenant Isolation

- Workspaces are tenant-scoped; access is denied when request tenant does not match workspace tenant.
- In simulation mode, tenant comes from `API_AUTH_SIM_TENANT_ID`.
- In header mode, tenant comes from `x-tenant-id`.

## Validation In CI / Local

- `npm run test:integration:memory` validates in-memory DB + in-memory auth simulation end-to-end.
- `npm run test:integration:sql` validates SQL repositories when `DATABASE_URL` is set.
- `npm run test:integration:rbac` validates header-auth RBAC matrix when `DATABASE_URL` is set.
- `GET /api/audit/verify-chain` validates audit hash-chain integrity for the active tenant.



