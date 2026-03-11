import { type ValidationResult } from "./validation.ts";
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
export declare function isGraphNode(value: unknown): value is GraphNode;
export declare function isGraphEdge(value: unknown): value is GraphEdge;
export declare function isGraphDocument(value: unknown): value is GraphDocument;
export declare function validateGraphDocument(value: unknown): ValidationResult;
