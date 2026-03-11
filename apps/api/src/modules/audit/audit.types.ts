export type AuditEvent = {
  id: string;
  tenantId: string;
  actorId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  payload: Record<string, unknown>;
  occurredAt: string;
  prevHash: string;
  hash: string;
};
