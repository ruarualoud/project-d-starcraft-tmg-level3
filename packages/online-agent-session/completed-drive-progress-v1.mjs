// Observe completed jobs only: a long-running model/tool call is not a stall.
// A transient handoff can complete without an action, but repeatedly resuming
// the same failed state must not reset the no-progress budget indefinitely.
export function advanceCompletedDriveProgressV1(previous, current) {
  const progressed = current.stateRevision > previous.stateRevision
    || current.actionCount > previous.actionCount;
  const noProgressCompletions = progressed ? 0
    : previous.noProgressCompletions + 1;
  if (noProgressCompletions >= 3) {
    const code = "SLICE248_COMPLETED_DRIVES_WITHOUT_PROGRESS";
    throw Object.assign(new Error(code), { code, severity: "High",
      stateRevision: current.stateRevision, noProgressCompletions,
      automaticRetryAuthorized: false });
  }
  return { stateRevision: current.stateRevision, actionCount: current.actionCount,
    noProgressCompletions };
}
