import { createHash, randomUUID } from "node:crypto";
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

const repository = createMemoryAuditRepository();

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
