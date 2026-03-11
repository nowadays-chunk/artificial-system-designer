import assert from "node:assert/strict";
import test from "node:test";
import { grantWorkspaceOwner, requireWorkspaceRole } from "./auth.service";

test("requireWorkspaceRole allows owner access", () => {
  grantWorkspaceOwner("w-auth-test", "u-auth-test");
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
