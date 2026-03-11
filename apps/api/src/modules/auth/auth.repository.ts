import type { WorkspaceRole } from "./auth.types";

const rolesByWorkspace = new Map<string, Map<string, WorkspaceRole>>();

export function assignWorkspaceRole(workspaceId: string, actorId: string, role: WorkspaceRole) {
  const existing = rolesByWorkspace.get(workspaceId) ?? new Map<string, WorkspaceRole>();
  existing.set(actorId, role);
  rolesByWorkspace.set(workspaceId, existing);
}

export function getWorkspaceRole(workspaceId: string, actorId: string): WorkspaceRole | null {
  const roles = rolesByWorkspace.get(workspaceId);
  if (!roles) {
    return null;
  }
  return roles.get(actorId) ?? null;
}
