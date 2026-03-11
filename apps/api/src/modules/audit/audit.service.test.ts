import assert from "node:assert/strict";
import test from "node:test";
import { recordAuditEvent } from "./audit.service";

test("recordAuditEvent appends hash-chained entries", () => {
  const first = recordAuditEvent({
    tenantId: "tenant-audit-test",
    actorId: "u1",
    action: "workspace.create",
    resourceType: "workspace",
    resourceId: "w1",
  });
  const second = recordAuditEvent({
    tenantId: "tenant-audit-test",
    actorId: "u1",
    action: "workspace.read",
    resourceType: "workspace",
    resourceId: "w1",
  });

  assert.notEqual(first.hash, second.hash);
  assert.equal(second.prevHash, first.hash);
});
