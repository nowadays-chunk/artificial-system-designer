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
API_AUTH_SIM_ACTOR_ID=dev-user
API_AUTH_SIM_TENANT_ID=dev-tenant
```

```bash
# Header-driven auth
API_AUTH_PROVIDER=header
```
