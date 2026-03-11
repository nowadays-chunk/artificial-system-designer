import { validateGraphDocument } from "../../../../../packages/contracts/src/graph";
import { grantWorkspaceOwner } from "../auth/auth.service";
import { createDiagramVersion, createWorkspace, getWorkspaceById } from "./workspace.repository";
import type { DiagramVersion, GraphDocument, Workspace } from "./workspace.types";

export function createWorkspaceService(name: unknown, actorId: string): Workspace {
  if (typeof name !== "string" || name.trim().length < 2) {
    throw new Error("invalid_workspace_name");
  }

  const workspace = createWorkspace(name.trim());
  grantWorkspaceOwner(workspace.id, actorId);
  return workspace;
}

export function getWorkspaceService(workspaceId: string): Workspace {
  const workspace = getWorkspaceById(workspaceId);
  if (!workspace) {
    throw new Error("workspace_not_found");
  }
  return workspace;
}

export function createDiagramVersionService(input: {
  workspaceId: string;
  baseVersionId?: unknown;
  graph: unknown;
  message: unknown;
}): DiagramVersion {
  if (typeof input.message !== "string" || input.message.trim().length === 0) {
    throw new Error("invalid_version_message");
  }

  const graphValidation = validateGraphDocument(input.graph);
  if (!graphValidation.ok) {
    throw new Error(`invalid_graph_document:${graphValidation.errors.join(";")}`);
  }

  const workspace = getWorkspaceById(input.workspaceId);
  if (!workspace) {
    throw new Error("workspace_not_found");
  }

  const baseVersionId =
    typeof input.baseVersionId === "string" && input.baseVersionId.length > 0
      ? input.baseVersionId
      : undefined;

  return createDiagramVersion({
    workspaceId: workspace.id,
    baseVersionId,
    graph: input.graph as GraphDocument,
    message: input.message.trim(),
  });
}
