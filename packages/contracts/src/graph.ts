import {
  isBoolean,
  isNumber,
  isRecord,
  isString,
  mergeValidationErrors,
  type ValidationResult,
} from "./validation";

export type GraphNodeSettingsValue = string | number | boolean;

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

export function isGraphNode(value: unknown): value is GraphNode {
  if (!isRecord(value)) {
    return false;
  }

  const settings = value.settings;
  const hasValidSettings =
    isRecord(settings) &&
    Object.values(settings).every((entry) => isString(entry) || isNumber(entry) || isBoolean(entry));

  return (
    isString(value.id) &&
    isString(value.type) &&
    isString(value.label) &&
    isString(value.category) &&
    (value.focus === undefined || isString(value.focus)) &&
    (value.provider === undefined || isString(value.provider)) &&
    (value.region === undefined || isString(value.region)) &&
    isNumber(value.x) &&
    isNumber(value.y) &&
    isNumber(value.width) &&
    isNumber(value.height) &&
    hasValidSettings
  );
}

export function isGraphEdge(value: unknown): value is GraphEdge {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.sourceId) &&
    isString(value.targetId) &&
    isString(value.protocol) &&
    isString(value.purpose)
  );
}

function validateGraphNode(node: GraphNode, index: number): string[] {
  const errors: string[] = [];

  if (node.width <= 0) {
    errors.push(`nodes[${index}].width must be > 0`);
  }
  if (node.height <= 0) {
    errors.push(`nodes[${index}].height must be > 0`);
  }

  return errors;
}

function validateGraphEdge(edge: GraphEdge, index: number, nodeIdSet: Set<string>): string[] {
  const errors: string[] = [];
  if (!nodeIdSet.has(edge.sourceId)) {
    errors.push(`edges[${index}].sourceId references unknown node "${edge.sourceId}"`);
  }
  if (!nodeIdSet.has(edge.targetId)) {
    errors.push(`edges[${index}].targetId references unknown node "${edge.targetId}"`);
  }
  if (edge.sourceId === edge.targetId) {
    errors.push(`edges[${index}] cannot be self-referential`);
  }
  return errors;
}

export function isGraphDocument(value: unknown): value is GraphDocument {
  return validateGraphDocument(value).ok;
}

export function validateGraphDocument(value: unknown): ValidationResult {
  if (!isRecord(value)) {
    return { ok: false, errors: ["GraphDocument must be an object"] };
  }

  const nodes = value.nodes;
  const edges = value.edges;
  const schemaVersion = value.schemaVersion;

  const topLevelErrors: string[] = [];

  if (schemaVersion !== "1.0") {
    topLevelErrors.push("schemaVersion must be \"1.0\"");
  }
  if (!Array.isArray(nodes)) {
    topLevelErrors.push("nodes must be an array");
  }
  if (!Array.isArray(edges)) {
    topLevelErrors.push("edges must be an array");
  }

  if (topLevelErrors.length > 0 || !Array.isArray(nodes) || !Array.isArray(edges)) {
    return { ok: false, errors: topLevelErrors };
  }

  const nodeShapeErrors: string[] = [];
  const edgeShapeErrors: string[] = [];
  const nodeSemanticErrors: string[] = [];
  const edgeSemanticErrors: string[] = [];

  nodes.forEach((node, index) => {
    if (!isGraphNode(node)) {
      nodeShapeErrors.push(`nodes[${index}] is not a valid GraphNode`);
      return;
    }
    nodeSemanticErrors.push(...validateGraphNode(node, index));
  });

  edges.forEach((edge, index) => {
    if (!isGraphEdge(edge)) {
      edgeShapeErrors.push(`edges[${index}] is not a valid GraphEdge`);
    }
  });

  if (nodeShapeErrors.length > 0 || edgeShapeErrors.length > 0) {
    return mergeValidationErrors(topLevelErrors, nodeShapeErrors, edgeShapeErrors);
  }

  const typedNodes = nodes as GraphNode[];
  const typedEdges = edges as GraphEdge[];
  const ids = typedNodes.map((node) => node.id);
  const idSet = new Set(ids);

  if (idSet.size !== ids.length) {
    nodeSemanticErrors.push("node ids must be unique");
  }

  typedEdges.forEach((edge, index) => {
    edgeSemanticErrors.push(...validateGraphEdge(edge, index, idSet));
  });

  return mergeValidationErrors(topLevelErrors, nodeSemanticErrors, edgeSemanticErrors);
}

