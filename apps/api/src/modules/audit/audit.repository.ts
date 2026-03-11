import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readDbConfigFromEnv } from "../../lib/db/config";
import type { AuditEvent } from "./audit.types";

type AuditRepository = {
  appendAuditEvent(input: {
    tenantId: string;
    actorId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    payload?: Record<string, unknown>;
  }): AuditEvent;
};

function canonicalPayload(payload: Record<string, unknown>) {
  const sortedKeys = Object.keys(payload).sort();
  const stable: Record<string, unknown> = {};
  for (const key of sortedKeys) {
    stable[key] = payload[key];
  }
  return JSON.stringify(stable);
}

function escapeSqlLiteral(value: string) {
  return value.replace(/'/g, "''");
}

function runPsql(databaseUrl: string, sql: string): string[] {
  const result = spawnSync(
    "psql",
    [databaseUrl, "-v", "ON_ERROR_STOP=1", "-t", "-A", "-q", "-c", sql],
    { encoding: "utf8", windowsHide: true },
  );

  if (result.error) {
    throw new Error(`db_exec_failed:${result.error.message}`);
  }
  if (result.status !== 0) {
    const stderr = String(result.stderr ?? "").trim();
    throw new Error(`db_exec_failed:${stderr || `exit_${result.status}`}`);
  }

  return String(result.stdout ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function querySingleJson<T>(databaseUrl: string, sql: string): T | null {
  const rows = runPsql(databaseUrl, sql);
  if (rows.length === 0) {
    return null;
  }
  return JSON.parse(rows[0]) as T;
}

function hashRecord(input: {
  tenantId: string;
  actorId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  occurredAt: string;
  prevHash: string;
  payload: Record<string, unknown>;
}) {
  const source = [
    input.tenantId,
    input.actorId,
    input.action,
    input.resourceType,
    input.resourceId,
    input.occurredAt,
    input.prevHash,
    canonicalPayload(input.payload),
  ].join("|");
  return createHash("sha256").update(source).digest("hex");
}

function createMemoryAuditRepository(): AuditRepository {
  const eventsByTenant = new Map<string, AuditEvent[]>();
  return {
    appendAuditEvent(input: {
      tenantId: string;
      actorId: string;
      action: string;
      resourceType: string;
      resourceId: string;
      payload?: Record<string, unknown>;
    }): AuditEvent {
      const existing = eventsByTenant.get(input.tenantId) ?? [];
      const prevHash = existing.length > 0 ? existing[existing.length - 1]?.hash ?? "GENESIS" : "GENESIS";
      const occurredAt = new Date().toISOString();
      const payload = input.payload ?? {};
      const hash = hashRecord({
        tenantId: input.tenantId,
        actorId: input.actorId,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        occurredAt,
        prevHash,
        payload,
      });

      const event: AuditEvent = {
        id: randomUUID(),
        tenantId: input.tenantId,
        actorId: input.actorId,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        payload,
        occurredAt,
        prevHash,
        hash,
      };

      existing.push(event);
      eventsByTenant.set(input.tenantId, existing);
      return event;
    },
  };
}

function createPostgresAuditRepository(databaseUrl: string): AuditRepository {
  return {
    appendAuditEvent(input: {
      tenantId: string;
      actorId: string;
      action: string;
      resourceType: string;
      resourceId: string;
      payload?: Record<string, unknown>;
    }): AuditEvent {
      const escapedTenantId = escapeSqlLiteral(input.tenantId);
      const prevHashSql = `
        SELECT row_to_json(mapped)::text
        FROM (
          SELECT hash
          FROM AuditEvent
          WHERE tenant_id = '${escapedTenantId}'
          ORDER BY occurred_at DESC
          LIMIT 1
        ) mapped;
      `;
      const previous = querySingleJson<{ hash?: string }>(databaseUrl, prevHashSql);
      const prevHash = previous?.hash ?? "GENESIS";
      const payload = input.payload ?? {};
      const occurredAt = new Date().toISOString();
      const hash = hashRecord({
        tenantId: input.tenantId,
        actorId: input.actorId,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        occurredAt,
        prevHash,
        payload,
      });

      const eventId = randomUUID();
      const escapedPayload = escapeSqlLiteral(JSON.stringify(payload));
      const escapedActorId = escapeSqlLiteral(input.actorId);
      const escapedAction = escapeSqlLiteral(input.action);
      const escapedResourceType = escapeSqlLiteral(input.resourceType);
      const escapedResourceId = escapeSqlLiteral(input.resourceId);
      const escapedOccurredAt = escapeSqlLiteral(occurredAt);
      const escapedPrevHash = escapeSqlLiteral(prevHash);
      const escapedHash = escapeSqlLiteral(hash);

      const insertSql = `
        WITH inserted AS (
          INSERT INTO AuditEvent (
            id,
            tenant_id,
            actor_id,
            action,
            resource_type,
            resource_id,
            payload_json,
            occurred_at,
            prev_hash,
            hash
          )
          VALUES (
            '${eventId}'::uuid,
            '${escapedTenantId}',
            '${escapedActorId}',
            '${escapedAction}',
            '${escapedResourceType}',
            '${escapedResourceId}',
            '${escapedPayload}'::jsonb,
            '${escapedOccurredAt}'::timestamptz,
            '${escapedPrevHash}',
            '${escapedHash}'
          )
          RETURNING id, tenant_id, actor_id, action, resource_type, resource_id, payload_json, occurred_at, prev_hash, hash
        )
        SELECT row_to_json(mapped)::text
        FROM (
          SELECT
            id::text AS id,
            tenant_id AS \"tenantId\",
            actor_id AS \"actorId\",
            action,
            resource_type AS \"resourceType\",
            resource_id AS \"resourceId\",
            payload_json AS payload,
            occurred_at::text AS \"occurredAt\",
            prev_hash AS \"prevHash\",
            hash
          FROM inserted
        ) mapped;
      `;

      const inserted = querySingleJson<AuditEvent>(databaseUrl, insertSql);
      if (!inserted) {
        throw new Error("audit_insert_failed");
      }
      return inserted;
    },
  };
}

function createAuditRepository(): AuditRepository {
  const config = readDbConfigFromEnv();
  if (config.provider === "postgres_psql" && config.databaseUrl) {
    return createPostgresAuditRepository(config.databaseUrl);
  }
  return createMemoryAuditRepository();
}

const repository = createAuditRepository();

export function appendAuditEvent(input: {
  tenantId: string;
  actorId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  payload?: Record<string, unknown>;
}): AuditEvent {
  return repository.appendAuditEvent(input);
}

export type { AuditRepository };
