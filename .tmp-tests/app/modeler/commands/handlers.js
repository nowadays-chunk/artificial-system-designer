"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyGraphCommand = applyGraphCommand;
function replaceGraph(current, payload) {
    return {
        nodes: payload.nodes,
        edges: payload.edges,
        selection: payload.selection,
        pendingConnectionSourceId: payload.pendingConnectionSourceId,
    };
}
function applyGraphCommand(current, command) {
    switch (command.kind) {
        case "add_node": {
            const next = { ...current, nodes: [...current.nodes, command.payload.node] };
            return {
                command,
                inverse: {
                    id: `${command.id}:inverse`,
                    kind: "remove_node",
                    payload: { nodeId: command.payload.node.id },
                },
                next,
            };
        }
        case "remove_node": {
            const node = current.nodes.find((item) => item.id === command.payload.nodeId);
            if (!node) {
                return {
                    command,
                    inverse: {
                        id: `${command.id}:inverse`,
                        kind: "replace_graph",
                        payload: {
                            nodes: current.nodes,
                            edges: current.edges,
                            selection: current.selection,
                            pendingConnectionSourceId: current.pendingConnectionSourceId,
                        },
                    },
                    next: current,
                };
            }
            const connectedEdges = current.edges.filter((edge) => edge.sourceId === node.id || edge.targetId === node.id);
            const next = {
                ...current,
                nodes: current.nodes.filter((item) => item.id !== node.id),
                edges: current.edges.filter((edge) => edge.sourceId !== node.id && edge.targetId !== node.id),
            };
            return {
                command,
                inverse: {
                    id: `${command.id}:inverse`,
                    kind: "replace_graph",
                    payload: {
                        nodes: [...next.nodes, node],
                        edges: [...next.edges, ...connectedEdges],
                        selection: current.selection,
                        pendingConnectionSourceId: current.pendingConnectionSourceId,
                    },
                },
                next,
            };
        }
        case "update_node": {
            const previousNode = current.nodes.find((item) => item.id === command.payload.nodeId);
            if (!previousNode) {
                return {
                    command,
                    inverse: {
                        id: `${command.id}:inverse`,
                        kind: "replace_graph",
                        payload: {
                            nodes: current.nodes,
                            edges: current.edges,
                            selection: current.selection,
                            pendingConnectionSourceId: current.pendingConnectionSourceId,
                        },
                    },
                    next: current,
                };
            }
            const next = {
                ...current,
                nodes: current.nodes.map((item) => item.id === command.payload.nodeId ? command.payload.nextNode : item),
            };
            return {
                command,
                inverse: {
                    id: `${command.id}:inverse`,
                    kind: "update_node",
                    payload: {
                        nodeId: previousNode.id,
                        nextNode: previousNode,
                    },
                },
                next,
            };
        }
        case "add_edge": {
            const next = { ...current, edges: [...current.edges, command.payload.edge] };
            return {
                command,
                inverse: {
                    id: `${command.id}:inverse`,
                    kind: "remove_edge",
                    payload: { edgeId: command.payload.edge.id },
                },
                next,
            };
        }
        case "remove_edge": {
            const edge = current.edges.find((item) => item.id === command.payload.edgeId);
            if (!edge) {
                return {
                    command,
                    inverse: {
                        id: `${command.id}:inverse`,
                        kind: "replace_graph",
                        payload: {
                            nodes: current.nodes,
                            edges: current.edges,
                            selection: current.selection,
                            pendingConnectionSourceId: current.pendingConnectionSourceId,
                        },
                    },
                    next: current,
                };
            }
            const next = {
                ...current,
                edges: current.edges.filter((item) => item.id !== command.payload.edgeId),
            };
            return {
                command,
                inverse: {
                    id: `${command.id}:inverse`,
                    kind: "add_edge",
                    payload: { edge },
                },
                next,
            };
        }
        case "update_edge": {
            const previousEdge = current.edges.find((item) => item.id === command.payload.edgeId);
            if (!previousEdge) {
                return {
                    command,
                    inverse: {
                        id: `${command.id}:inverse`,
                        kind: "replace_graph",
                        payload: {
                            nodes: current.nodes,
                            edges: current.edges,
                            selection: current.selection,
                            pendingConnectionSourceId: current.pendingConnectionSourceId,
                        },
                    },
                    next: current,
                };
            }
            const next = {
                ...current,
                edges: current.edges.map((item) => item.id === command.payload.edgeId ? command.payload.nextEdge : item),
            };
            return {
                command,
                inverse: {
                    id: `${command.id}:inverse`,
                    kind: "update_edge",
                    payload: {
                        edgeId: previousEdge.id,
                        nextEdge: previousEdge,
                    },
                },
                next,
            };
        }
        case "set_selection": {
            const next = { ...current, selection: command.payload.selection };
            return {
                command,
                inverse: {
                    id: `${command.id}:inverse`,
                    kind: "set_selection",
                    payload: { selection: current.selection },
                },
                next,
            };
        }
        case "set_pending_connection": {
            const next = { ...current, pendingConnectionSourceId: command.payload.nodeId };
            return {
                command,
                inverse: {
                    id: `${command.id}:inverse`,
                    kind: "set_pending_connection",
                    payload: { nodeId: current.pendingConnectionSourceId },
                },
                next,
            };
        }
        case "replace_graph": {
            const next = replaceGraph(current, command.payload);
            return {
                command,
                inverse: {
                    id: `${command.id}:inverse`,
                    kind: "replace_graph",
                    payload: {
                        nodes: current.nodes,
                        edges: current.edges,
                        selection: current.selection,
                        pendingConnectionSourceId: current.pendingConnectionSourceId,
                    },
                },
                next,
            };
        }
    }
    const unreachable = command;
    throw new Error(`Unsupported command variant: ${JSON.stringify(unreachable)}`);
}
