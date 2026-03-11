type GraphNodeSettingsValue = string | number | boolean;

export type GraphNode = {
  id: string;
  type: string;
  label: string;
  category: string;
  focus?: string;
  provider?: string;
  region?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  settings: Record<string, GraphNodeSettingsValue>;
};

export type GraphEdge = {
  id: string;
  sourceId: string;
  targetId: string;
  protocol: string;
  purpose: string;
};

export type GraphDocument = {
  schemaVersion: "1.0";
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata?: {
    name?: string;
    description?: string;
    tags?: string[];
  };
};

export type Workspace = {
  id: string;
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

