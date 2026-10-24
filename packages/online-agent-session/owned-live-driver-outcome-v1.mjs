// Experiment supervision only. This never decides a game action or retries a
// Provider call. Read the actual Web driver's checkpoint/complete contract.
export const STARCRAFT_TMG_OWNED_LIVE_DRIVER_OUTCOME_VERSION =
  "starcraft_tmg_owned_live_driver_outcome_v1";

// A failed driver has failure.json, not a completed-match report. Preserve the
// initiating failure instead of turning its absent report into a new ENOENT.
export async function readStarcraftTmgOwnedLiveDriverOutcomeV1(progress,
  { progressPath, readJson } = {}) {
  if (typeof progressPath !== "string" || typeof readJson !== "function"
    || !progressPath.endsWith("progress.json")) {
    throw new Error("LIVE_DRIVER_OUTCOME_READER_INPUT_INVALID");
  }
  const filename = progressPath.replace(/progress\.json$/u,
    progress?.status === "failed" ? "failure.json" : "report.json");
  try { return await readJson(filename); }
  catch (error) {
    if (progress?.status !== "failed" || error?.code !== "ENOENT"
      || !progress.failureCode) throw error;
    return { ok: false, code: progress.failureCode,
      failureArtifactMissing: true };
  }
}

export function classifyStarcraftTmgOwnedLiveDriverOutcomeV1(progress, outcome,
  expected = {}) {
  const unexpected = reason => ({ kind: "unexpected_stop", reason,
    severity: "High", automaticRetryAllowed: false });
  if (progress?.status === "failed"
    && Number.isFinite(Date.parse(progress.updatedAt))
    && Number.isFinite(Date.parse(expected.startedAt))
    && Date.parse(progress.updatedAt) >= Date.parse(expected.startedAt)) {
    const code = progress.failureCode || outcome?.code || outcome?.error?.code
      || "LIVE_DRIVER_FAILED_WITHOUT_CODE";
    return { ...unexpected(`LIVE_DRIVER_FAILED:${code}`), failureCode: code,
      failureArtifactMissing: outcome?.failureArtifactMissing === true };
  }
  if (!progress || !outcome || outcome.ok !== true
    || outcome.roomId !== expected.roomId
    || !Number.isSafeInteger(progress.actionCount) || progress.actionCount < 0
    || progress.actionCount < (expected.minimumActionCount ?? 0)
    || !Number.isFinite(Date.parse(progress.updatedAt))
    || !Number.isFinite(Date.parse(expected.startedAt))
    || Date.parse(progress.updatedAt) < Date.parse(expected.startedAt)) {
    return unexpected("LIVE_DRIVER_TERMINAL_EVIDENCE_MISSING_OR_STALE");
  }
  if (expected.kind === "checkpoint") {
    if (progress.status !== "checkpoint"
      || outcome.schema !== "ticket23_slice248_agent_agent_web_checkpoint_v1"
      || outcome.actionCount !== progress.actionCount
      || outcome.stateRevision !== outcome.lastAction?.postStateRevision
      || outcome.lastAction?.replayMatchesCurrent !== true
      || outcome.lastAction?.screenshotObservedStateRevision !== outcome.stateRevision) {
      return unexpected("LIVE_DRIVER_CHECKPOINT_NOT_PROVEN");
    }
    return { kind: "planned_checkpoint", roomId: outcome.roomId,
      actionCount: outcome.actionCount, stateRevision: outcome.stateRevision,
      wholeMatchComplete: false };
  }
  if (expected.kind === "match_complete") {
    const accepted = outcome.acceptance;
    const seatCounts = accepted?.actionsBySeat;
    if (progress.status !== "complete"
      || outcome.schema !== "ticket23_slice248_agent_agent_web_report_v1"
      || accepted?.terminal !== true || accepted?.allAgentReplaysVerified !== true
      || accepted?.authoritativeActionCount !== progress.actionCount
      || !Number.isSafeInteger(seatCounts?.player1)
      || !Number.isSafeInteger(seatCounts?.player2)
      || seatCounts.player1 + seatCounts.player2 !== progress.actionCount
      || !Number.isFinite(Date.parse(outcome.completedAt))
      || Date.parse(outcome.completedAt) < Date.parse(expected.startedAt)) {
      return unexpected("LIVE_DRIVER_COMPLETE_MATCH_NOT_PROVEN");
    }
    return { kind: "completed_match", roomId: outcome.roomId,
      actionCount: progress.actionCount, wholeMatchComplete: true };
  }
  return unexpected("LIVE_DRIVER_EXPECTED_OUTCOME_KIND_INVALID");
}
