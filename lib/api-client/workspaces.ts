import type { GraphDocument } from "../../packages/contracts/src/graph";
import { getActiveTenantId, getActiveRole } from "./auth-headers";
import { appendAuditEvent } from "./audit";

type CreateWorkspaceResponse = {
  workspaceId: string;
  createdAt: string;
};

type CreateDiagramVersionResponse = {
  versionId: string;
  number: number;
};

function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export async function createWorkspace(name: string): Promise<CreateWorkspaceResponse> {
  if (typeof window === "undefined") {
    return { workspaceId: "ssr-workspace", createdAt: new Date().toISOString() };
  }

  // Check simulated RBAC
  const role = getActiveRole();
  if (role === "viewer") {
    throw new Error("Access Denied: Viewer role cannot create workspaces.");
  }

  const tenantId = getActiveTenantId();
  const raw = window.localStorage.getItem("asd_sim_workspaces");
  const workspaces = raw ? JSON.parse(raw) : [];

  // Check if a workspace with this name under this tenant already exists
  const existing = workspaces.find((w: any) => w.tenantId === tenantId && w.name === name);
  if (existing) {
    return {
      workspaceId: existing.id,
      createdAt: existing.createdAt,
    };
  }

  const workspaceId = generateUUID();
  const createdAt = new Date().toISOString();

  const newWorkspace = {
    id: workspaceId,
    tenantId,
    name,
    createdAt,
  };

  workspaces.push(newWorkspace);
  window.localStorage.setItem("asd_sim_workspaces", JSON.stringify(workspaces));

  // Log audit event
  appendAuditEvent("workspace.create", { workspaceId, name, tenantId });

  return { workspaceId, createdAt };
}

export async function createDiagramVersion(input: {
  workspaceId: string;
  graph: GraphDocument;
  message: string;
  baseVersionId?: string;
}): Promise<CreateDiagramVersionResponse> {
  if (typeof window === "undefined") {
    return { versionId: "ssr-version", number: 1 };
  }

  // Check simulated RBAC
  const role = getActiveRole();
  if (role === "viewer") {
    throw new Error("Access Denied: Viewer role cannot save diagram versions.");
  }

  const rawWorkspaces = window.localStorage.getItem("asd_sim_workspaces");
  const workspaces = rawWorkspaces ? JSON.parse(rawWorkspaces) : [];
  const workspace = workspaces.find((w: any) => w.id === input.workspaceId);
  if (!workspace) {
    throw new Error("Workspace not found.");
  }

  // Enforce simulated Tenant Isolation
  const tenantId = getActiveTenantId();
  if (workspace.tenantId !== tenantId) {
    throw new Error(`Security Exception: Access Denied to Workspace ${input.workspaceId} under Tenant ${tenantId}`);
  }

  const rawVersions = window.localStorage.getItem("asd_sim_versions");
  const versions = rawVersions ? JSON.parse(rawVersions) : [];

  // Filter versions for this workspace to get next version number
  const workspaceVersions = versions.filter((v: any) => v.workspaceId === input.workspaceId);
  const nextNumber = workspaceVersions.length + 1;

  const versionId = generateUUID();
  const createdAt = new Date().toISOString();

  const newVersion = {
    id: versionId,
    workspaceId: input.workspaceId,
    tenantId,
    number: nextNumber,
    graph: input.graph,
    message: input.message,
    baseVersionId: input.baseVersionId,
    createdAt,
  };

  versions.push(newVersion);
  window.localStorage.setItem("asd_sim_versions", JSON.stringify(versions));

  // Log audit event
  appendAuditEvent("version.create", {
    workspaceId: input.workspaceId,
    versionId,
    versionNumber: nextNumber,
    message: input.message,
  });

  return { versionId, number: nextNumber };
}
