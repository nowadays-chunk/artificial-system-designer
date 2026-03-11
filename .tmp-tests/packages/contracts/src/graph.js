"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isGraphNode = isGraphNode;
exports.isGraphEdge = isGraphEdge;
exports.isGraphDocument = isGraphDocument;
exports.validateGraphDocument = validateGraphDocument;
const validation_1 = require("./validation");
function isGraphNode(value) {
    if (!(0, validation_1.isRecord)(value)) {
        return false;
    }
    const settings = value.settings;
    const hasValidSettings = (0, validation_1.isRecord)(settings) &&
        Object.values(settings).every((entry) => (0, validation_1.isString)(entry) || (0, validation_1.isNumber)(entry) || (0, validation_1.isBoolean)(entry));
    return ((0, validation_1.isString)(value.id) &&
        (0, validation_1.isString)(value.type) &&
        (0, validation_1.isString)(value.label) &&
        (0, validation_1.isString)(value.category) &&
        (value.focus === undefined || (0, validation_1.isString)(value.focus)) &&
        (value.provider === undefined || (0, validation_1.isString)(value.provider)) &&
        (value.region === undefined || (0, validation_1.isString)(value.region)) &&
        (0, validation_1.isNumber)(value.x) &&
        (0, validation_1.isNumber)(value.y) &&
        (0, validation_1.isNumber)(value.width) &&
        (0, validation_1.isNumber)(value.height) &&
        hasValidSettings);
}
function isGraphEdge(value) {
    if (!(0, validation_1.isRecord)(value)) {
        return false;
    }
    return ((0, validation_1.isString)(value.id) &&
        (0, validation_1.isString)(value.sourceId) &&
        (0, validation_1.isString)(value.targetId) &&
        (0, validation_1.isString)(value.protocol) &&
        (0, validation_1.isString)(value.purpose));
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
function isGraphDocument(value) {
    return validateGraphDocument(value).ok;
}
function validateGraphDocument(value) {
    if (!(0, validation_1.isRecord)(value)) {
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
        return (0, validation_1.mergeValidationErrors)(topLevelErrors, nodeShapeErrors, edgeShapeErrors);
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
    return (0, validation_1.mergeValidationErrors)(topLevelErrors, nodeSemanticErrors, edgeSemanticErrors);
}
