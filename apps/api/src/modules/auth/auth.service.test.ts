import assert from "node:assert/strict";
import test from "node:test";
import { grantWorkspaceOwner, requireWorkspaceRole } from "./auth.service";

test("requireWorkspaceRole allows owner access", () => {
  grantWorkspaceOwner("w-auth-test", "u-auth-test", "default");
  const role = requireWorkspaceRole(
    { actorId: "u-auth-test", tenantId: "default", actorType: "user" },
    "w-auth-test",
    "viewer",
  );
  assert.equal(role, "owner");
});

test("requireWorkspaceRole rejects missing membership", () => {
  assert.throws(
    () =>
      requireWorkspaceRole(
        { actorId: "u-auth-missing", tenantId: "default", actorType: "user" },
        "w-auth-test",
        "viewer",
      ),
    /forbidden_workspace_access/,
  );
});

test("requireWorkspaceRole rejects cross-tenant access", () => {
  grantWorkspaceOwner("w-auth-tenant", "u-auth-tenant", "tenant-a");
  assert.throws(
    () =>
      requireWorkspaceRole(
        { actorId: "u-auth-tenant", tenantId: "tenant-b", actorType: "user" },
        "w-auth-tenant",
        "viewer",
      ),
    /forbidden_workspace_access/,
  );
});
