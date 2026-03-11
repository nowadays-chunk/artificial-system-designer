import { applyGraphCommand } from "./handlers";
import type {
  ExecutedGraphCommand,
  GraphCommand,
  GraphEntity,
  GraphSnapshot,
} from "./types";

export type CommandTimeline<
  TNode extends GraphEntity,
  TEdge extends GraphEntity,
  TSelection,
> = {
  entries: ExecutedGraphCommand<TNode, TEdge, TSelection>[];
  cursor: number;
};

export function createEmptyTimeline<
  TNode extends GraphEntity,
  TEdge extends GraphEntity,
  TSelection,
>(): CommandTimeline<TNode, TEdge, TSelection> {
  return { entries: [], cursor: -1 };
}

export function executeGraphCommand<
  TNode extends GraphEntity,
  TEdge extends GraphEntity & { sourceId: string; targetId: string },
  TSelection,
>(
  snapshot: GraphSnapshot<TNode, TEdge, TSelection>,
  timeline: CommandTimeline<TNode, TEdge, TSelection>,
  command: GraphCommand<TNode, TEdge, TSelection>,
) {
  const executed = applyGraphCommand(snapshot, command);
  const retainedEntries = timeline.entries.slice(0, timeline.cursor + 1);
  const nextEntries = [...retainedEntries, executed];

  return {
    next: executed.next,
    timeline: {
      entries: nextEntries,
      cursor: nextEntries.length - 1,
    },
  };
}

export function undoGraphCommand<
  TNode extends GraphEntity,
  TEdge extends GraphEntity & { sourceId: string; targetId: string },
  TSelection,
>(
  snapshot: GraphSnapshot<TNode, TEdge, TSelection>,
  timeline: CommandTimeline<TNode, TEdge, TSelection>,
) {
  if (timeline.cursor < 0) {
    return { next: snapshot, timeline };
  }

  const entry = timeline.entries[timeline.cursor];
  const reverted = applyGraphCommand(snapshot, entry.inverse);
  return {
    next: reverted.next,
    timeline: {
      entries: timeline.entries,
      cursor: timeline.cursor - 1,
    },
  };
}

export function redoGraphCommand<
  TNode extends GraphEntity,
  TEdge extends GraphEntity & { sourceId: string; targetId: string },
  TSelection,
>(
  snapshot: GraphSnapshot<TNode, TEdge, TSelection>,
  timeline: CommandTimeline<TNode, TEdge, TSelection>,
) {
  const nextCursor = timeline.cursor + 1;
  if (nextCursor >= timeline.entries.length) {
    return { next: snapshot, timeline };
  }

  const entry = timeline.entries[nextCursor];
  const replayed = applyGraphCommand(snapshot, entry.command);
  return {
    next: replayed.next,
    timeline: {
      entries: timeline.entries,
      cursor: nextCursor,
    },
  };
}

