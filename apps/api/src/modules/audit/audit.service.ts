import { appendAuditEvent } from "./audit.repository";

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
