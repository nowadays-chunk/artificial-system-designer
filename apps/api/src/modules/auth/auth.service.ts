import type { IncomingHttpHeaders } from "node:http";
import { assignWorkspaceRole, getWorkspaceRole } from "./auth.repository";
import type { RequestAuthContext, WorkspaceRole } from "./auth.types";

const ACTOR_ID_HEADER = "x-actor-id";
const TENANT_ID_HEADER = "x-tenant-id";
const ACTOR_TYPE_HEADER = "x-actor-type";

function readHeader(headers: IncomingHttpHeaders, name: string): string | null {
  const value = headers[name];
  if (!value) {
    return null;
  }
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value;
}

function roleSatisfies(requiredRole: WorkspaceRole, actualRole: WorkspaceRole) {
  const weight: Record<WorkspaceRole, number> = { viewer: 1, editor: 2, owner: 3 };
  return weight[actualRole] >= weight[requiredRole];
}

export function resolveRequestAuth(headers: IncomingHttpHeaders): RequestAuthContext {
  const actorId = readHeader(headers, ACTOR_ID_HEADER) ?? "anonymous";
  const tenantId = readHeader(headers, TENANT_ID_HEADER) ?? "default";
  const rawType = readHeader(headers, ACTOR_TYPE_HEADER);
  return {
    actorId,
    tenantId,
    actorType: rawType === "service" ? "service" : "user",
  };
}

export function grantWorkspaceOwner(workspaceId: string, actorId: string) {
  assignWorkspaceRole(workspaceId, actorId, "owner");
}

export function requireWorkspaceRole(
  auth: RequestAuthContext,
  workspaceId: string,
  requiredRole: WorkspaceRole,
) {
  const role = getWorkspaceRole(workspaceId, auth.actorId);
  if (!role || !roleSatisfies(requiredRole, role)) {
    throw new Error("forbidden_workspace_access");
  }
  return role;
}
