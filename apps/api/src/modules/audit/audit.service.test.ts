import assert from "node:assert/strict";
import test from "node:test";
import { recordAuditEvent, verifyAuditChain } from "./audit.service";

test("verifyAuditChain returns valid for appended events", () => {
  const tenantId = `tenant-audit-${Date.now()}`;
  recordAuditEvent({
    tenantId,
    actorId: "audit-user",
    action: "workspace.create",
    resourceType: "workspace",
    resourceId: "w-1",
    payload: { name: "A" },
  });
  recordAuditEvent({
    tenantId,
    actorId: "audit-user",
    action: "workspace.read",
    resourceType: "workspace",
    resourceId: "w-1",
  });

  const result = verifyAuditChain(tenantId);
  assert.equal(result.valid, true);
  assert.ok(result.checked >= 2);
});
