import { createHash } from "node:crypto";
import { appendAuditEvent, listAuditEventsByTenant } from "./audit.repository";

export function recordAuditEvent(input: {
  tenantId: string;
  actorId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  payload?: Record<string, unknown>;
}) {
  return appendAuditEvent(input);
}

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

export function verifyAuditChain(tenantId: string): {
  valid: boolean;
  checked: number;
  brokenAtEventId?: string;
} {
  const events = listAuditEventsByTenant(tenantId);
  let previousHash = "GENESIS";
  for (const event of events) {
    if (event.prevHash !== previousHash) {
      return {
        valid: false,
        checked: events.length,
        brokenAtEventId: event.id,
      };
    }
    const recomputed = hashRecord({
      tenantId: event.tenantId,
      actorId: event.actorId,
      action: event.action,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      occurredAt: event.occurredAt,
      prevHash: event.prevHash,
      payload: event.payload ?? {},
    });
    if (recomputed !== event.hash) {
      return {
        valid: false,
        checked: events.length,
        brokenAtEventId: event.id,
      };
    }
    previousHash = event.hash;
  }
  return { valid: true, checked: events.length };
}
