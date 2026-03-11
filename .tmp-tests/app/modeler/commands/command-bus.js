"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEmptyTimeline = createEmptyTimeline;
exports.executeGraphCommand = executeGraphCommand;
exports.undoGraphCommand = undoGraphCommand;
exports.redoGraphCommand = redoGraphCommand;
const handlers_1 = require("./handlers");
function createEmptyTimeline() {
    return { entries: [], cursor: -1 };
}
function executeGraphCommand(snapshot, timeline, command) {
    const executed = (0, handlers_1.applyGraphCommand)(snapshot, command);
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
function undoGraphCommand(snapshot, timeline) {
    if (timeline.cursor < 0) {
        return { next: snapshot, timeline };
    }
    const entry = timeline.entries[timeline.cursor];
    const reverted = (0, handlers_1.applyGraphCommand)(snapshot, entry.inverse);
    return {
        next: reverted.next,
        timeline: {
            entries: timeline.entries,
            cursor: timeline.cursor - 1,
        },
    };
}
function redoGraphCommand(snapshot, timeline) {
    const nextCursor = timeline.cursor + 1;
    if (nextCursor >= timeline.entries.length) {
        return { next: snapshot, timeline };
    }
    const entry = timeline.entries[nextCursor];
    const replayed = (0, handlers_1.applyGraphCommand)(snapshot, entry.command);
    return {
        next: replayed.next,
        timeline: {
            entries: timeline.entries,
            cursor: nextCursor,
        },
    };
}
