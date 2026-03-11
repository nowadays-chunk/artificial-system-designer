import { useRef, useState } from "react";
import {
  createEmptyTimeline,
  executeGraphCommand,
  redoGraphCommand,
  undoGraphCommand,
  type CommandTimeline,
} from "../commands/command-bus";
import type { GraphCommand, GraphEntity, GraphSnapshot } from "../commands/types";

type GraphEdgeEntity = GraphEntity & { sourceId: string; targetId: string };

export function useGraphStore<
  TNode extends GraphEntity,
  TEdge extends GraphEdgeEntity,
  TSelection,
  TDragState,
>(
  initialNodes: TNode[],
  initialEdges: TEdge[],
  initialSelection: TSelection,
) {
  const [snapshot, setSnapshot] = useState<GraphSnapshot<TNode, TEdge, TSelection>>({
    nodes: initialNodes,
    edges: initialEdges,
    selection: initialSelection,
    pendingConnectionSourceId: null,
  });
  const [dragState, setDragState] = useState<TDragState | null>(null);
  const timelineRef = useRef<CommandTimeline<TNode, TEdge, TSelection>>(createEmptyTimeline());
  const [timelineMeta, setTimelineMeta] = useState({ cursor: -1, length: 0 });
  const commandCounterRef = useRef(0);

  const nextCommandId = () => {
    commandCounterRef.current += 1;
    return `cmd-${commandCounterRef.current}`;
  };

  const execute = (command: Omit<GraphCommand<TNode, TEdge, TSelection>, "id">) => {
    setSnapshot((current) => {
      const commandWithId = {
        ...command,
        id: nextCommandId(),
      } as GraphCommand<TNode, TEdge, TSelection>;
      const result = executeGraphCommand(current, timelineRef.current, commandWithId);
      timelineRef.current = result.timeline;
      setTimelineMeta({
        cursor: result.timeline.cursor,
        length: result.timeline.entries.length,
      });
      return result.next;
    });
  };

  const undo = () => {
    setSnapshot((current) => {
      const result = undoGraphCommand(current, timelineRef.current);
      timelineRef.current = result.timeline;
      setTimelineMeta({
        cursor: result.timeline.cursor,
        length: result.timeline.entries.length,
      });
      return result.next;
    });
  };

  const redo = () => {
    setSnapshot((current) => {
      const result = redoGraphCommand(current, timelineRef.current);
      timelineRef.current = result.timeline;
      setTimelineMeta({
        cursor: result.timeline.cursor,
        length: result.timeline.entries.length,
      });
      return result.next;
    });
  };

  const clearTimeline = () => {
    timelineRef.current = createEmptyTimeline();
    setTimelineMeta({ cursor: -1, length: 0 });
  };

  const setNodes = (updater: TNode[] | ((current: TNode[]) => TNode[])) => {
    setSnapshot((current) => ({
      ...current,
      nodes: typeof updater === "function" ? updater(current.nodes) : updater,
    }));
    clearTimeline();
  };

  const setEdges = (updater: TEdge[] | ((current: TEdge[]) => TEdge[])) => {
    setSnapshot((current) => ({
      ...current,
      edges: typeof updater === "function" ? updater(current.edges) : updater,
    }));
    clearTimeline();
  };

  const setSelection = (selection: TSelection) => {
    execute({
      kind: "set_selection",
      payload: { selection },
    });
  };

  const setPendingConnectionSourceId = (nodeId: string | null) => {
    execute({
      kind: "set_pending_connection",
      payload: { nodeId },
    });
  };

  const updateNode = (nodeId: string, updater: (node: TNode) => TNode) => {
    const existing = snapshot.nodes.find((node) => node.id === nodeId);
    if (!existing) {
      return;
    }

    execute({
      kind: "update_node",
      payload: {
        nodeId,
        nextNode: updater(existing),
      },
    });
  };

  const addNode = (node: TNode) => {
    execute({
      kind: "add_node",
      payload: { node },
    });
  };

  const removeNode = (nodeId: string) => {
    execute({
      kind: "remove_node",
      payload: { nodeId },
    });
  };

  const addEdge = (edge: TEdge) => {
    execute({
      kind: "add_edge",
      payload: { edge },
    });
  };

  const removeEdge = (edgeId: string) => {
    execute({
      kind: "remove_edge",
      payload: { edgeId },
    });
  };

  const updateEdge = (edgeId: string, updater: (edge: TEdge) => TEdge) => {
    const existing = snapshot.edges.find((edge) => edge.id === edgeId);
    if (!existing) {
      return;
    }

    execute({
      kind: "update_edge",
      payload: {
        edgeId,
        nextEdge: updater(existing),
      },
    });
  };

  const replaceGraph = (
    nextNodes: TNode[],
    nextEdges: TEdge[],
    nextSelection: TSelection,
  ) => {
    execute({
      kind: "replace_graph",
      payload: {
        nodes: nextNodes,
        edges: nextEdges,
        selection: nextSelection,
        pendingConnectionSourceId: null,
      },
    });
  };

  const canUndo = timelineMeta.cursor >= 0;
  const canRedo = timelineMeta.cursor + 1 < timelineMeta.length;

  return {
    nodes: snapshot.nodes,
    setNodes,
    edges: snapshot.edges,
    setEdges,
    selection: snapshot.selection,
    setSelection,
    pendingConnectionSourceId: snapshot.pendingConnectionSourceId,
    setPendingConnectionSourceId,
    dragState,
    setDragState,
    updateNode,
    addNode,
    removeNode,
    addEdge,
    removeEdge,
    updateEdge,
    replaceGraph,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
