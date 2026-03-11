import type { GraphDocument } from "@asd/contracts/graph";

export type Workspace = {
  id: string;
  tenantId: string;
  name: string;
  createdAt: string;
};

export type DiagramVersion = {
  id: string;
  workspaceId: string;
  number: number;
  baseVersionId?: string;
  graph: GraphDocument;
  message: string;
  createdAt: string;
};

export type { GraphDocument };
