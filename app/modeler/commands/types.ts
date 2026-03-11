export type GraphEntity = { id: string };

export type GraphSnapshot<
  TNode extends GraphEntity,
  TEdge extends GraphEntity,
  TSelection,
> = {
  nodes: TNode[];
  edges: TEdge[];
  selection: TSelection;
  pendingConnectionSourceId: string | null;
};

export type ReplaceGraphPayload<
  TNode extends GraphEntity,
  TEdge extends GraphEntity,
  TSelection,
> = {
  nodes: TNode[];
  edges: TEdge[];
  selection: TSelection;
  pendingConnectionSourceId: string | null;
};

export type GraphCommand<
  TNode extends GraphEntity,
  TEdge extends GraphEntity,
  TSelection,
> =
  | { id: string; kind: "add_node"; payload: { node: TNode } }
  | { id: string; kind: "remove_node"; payload: { nodeId: string } }
  | { id: string; kind: "update_node"; payload: { nodeId: string; nextNode: TNode } }
  | { id: string; kind: "add_edge"; payload: { edge: TEdge } }
  | { id: string; kind: "remove_edge"; payload: { edgeId: string } }
  | { id: string; kind: "update_edge"; payload: { edgeId: string; nextEdge: TEdge } }
  | { id: string; kind: "set_selection"; payload: { selection: TSelection } }
  | { id: string; kind: "set_pending_connection"; payload: { nodeId: string | null } }
  | {
    id: string;
    kind: "replace_graph";
    payload: ReplaceGraphPayload<TNode, TEdge, TSelection>;
  };

export type ExecutedGraphCommand<
  TNode extends GraphEntity,
  TEdge extends GraphEntity,
  TSelection,
> = {
  command: GraphCommand<TNode, TEdge, TSelection>;
  inverse: GraphCommand<TNode, TEdge, TSelection>;
};
