// A POST observation timeout is not a run failure. A slow pre-send persistence
// barrier may still expose the preceding run's failed draft on disk.
export function isCurrentTeachTerminalV1(teach, current, observer, resuming) {
  if (!['completed', 'failed', 'cancelled'].includes(teach?.status)) return false;
  if (!resuming || observer.observedCurrentRun === true) return true;
  if (teach.status === 'completed') return Date.parse(current.updatedAt) >= Date.parse(observer.startedAt);
  return Boolean(teach.failure?.at && teach.failure.at !== observer.baselineFailureAt
    && Date.parse(teach.failure.at) >= Date.parse(observer.startedAt));
}
