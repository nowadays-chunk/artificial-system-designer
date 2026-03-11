import type { GraphDocument } from "../../packages/contracts/src/graph";

type CreateWorkspaceResponse = {
  workspaceId: string;
  createdAt: string;
};

type CreateDiagramVersionResponse = {
  versionId: string;
  number: number;
};

const defaultApiBase = "http://localhost:4010";

function apiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? defaultApiBase;
}

async function parseJsonOrThrow(response: Response) {
  const payload = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(String(payload.error ?? "request_failed"));
  }
  return payload;
}

export async function createWorkspace(name: string): Promise<CreateWorkspaceResponse> {
  const response = await fetch(`${apiBaseUrl()}/api/workspaces`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const payload = await parseJsonOrThrow(response);
  return {
    workspaceId: String(payload.workspaceId),
    createdAt: String(payload.createdAt),
  };
}

export async function createDiagramVersion(input: {
  workspaceId: string;
  graph: GraphDocument;
  message: string;
  baseVersionId?: string;
}): Promise<CreateDiagramVersionResponse> {
  const response = await fetch(`${apiBaseUrl()}/api/workspaces/${input.workspaceId}/diagram-versions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      graph: input.graph,
      message: input.message,
      baseVersionId: input.baseVersionId,
    }),
  });
  const payload = await parseJsonOrThrow(response);
  return {
    versionId: String(payload.versionId),
    number: Number(payload.number),
  };
}

