import { randomUUID } from "node:crypto";
import type { DiagramVersion, GraphDocument, Workspace } from "./workspace.types";

const workspaces = new Map<string, Workspace>();
const versionsByWorkspace = new Map<string, DiagramVersion[]>();

export function createWorkspace(name: string): Workspace {
  const now = new Date().toISOString();
  const workspace: Workspace = {
    id: randomUUID(),
    name,
    createdAt: now,
  };
  workspaces.set(workspace.id, workspace);
  versionsByWorkspace.set(workspace.id, []);
  return workspace;
}

export function getWorkspaceById(workspaceId: string): Workspace | null {
  return workspaces.get(workspaceId) ?? null;
}

export function createDiagramVersion(input: {
  workspaceId: string;
  baseVersionId?: string;
  graph: GraphDocument;
  message: string;
}): DiagramVersion {
  const workspaceVersions = versionsByWorkspace.get(input.workspaceId);
  if (!workspaceVersions) {
    throw new Error("workspace_not_found");
  }

  const nextNumber = workspaceVersions.length + 1;
  const version: DiagramVersion = {
    id: randomUUID(),
    workspaceId: input.workspaceId,
    number: nextNumber,
    baseVersionId: input.baseVersionId,
    graph: input.graph,
    message: input.message,
    createdAt: new Date().toISOString(),
  };
  workspaceVersions.push(version);
  return version;
}

