import { isBoolean, isNumber, isRecord, isString, mergeValidationErrors, } from "./validation.ts";
export function isGraphNode(value) {
    if (!isRecord(value)) {
        return false;
    }
    const settings = value.settings;
    const hasValidSettings = isRecord(settings) &&
        Object.values(settings).every((entry) => isString(entry) || isNumber(entry) || isBoolean(entry));
    return (isString(value.id) &&
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
        hasValidSettings);
}
export function isGraphEdge(value) {
    if (!isRecord(value)) {
        return false;
    }
    return (isString(value.id) &&
        isString(value.sourceId) &&
        isString(value.targetId) &&
        isString(value.protocol) &&
        isString(value.purpose));
}
function validateGraphNode(node, index) {
    const errors = [];
    if (node.width <= 0) {
        errors.push(`nodes[${index}].width must be > 0`);
    }
    if (node.height <= 0) {
        errors.push(`nodes[${index}].height must be > 0`);
    }
    return errors;
}
function validateGraphEdge(edge, index, nodeIdSet) {
    const errors = [];
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
export function isGraphDocument(value) {
    return validateGraphDocument(value).ok;
}
export function validateGraphDocument(value) {
    if (!isRecord(value)) {
        return { ok: false, errors: ["GraphDocument must be an object"] };
    }
    const nodes = value.nodes;
    const edges = value.edges;
    const schemaVersion = value.schemaVersion;
    const topLevelErrors = [];
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
    const nodeShapeErrors = [];
    const edgeShapeErrors = [];
    const nodeSemanticErrors = [];
    const edgeSemanticErrors = [];
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
    const typedNodes = nodes;
    const typedEdges = edges;
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
