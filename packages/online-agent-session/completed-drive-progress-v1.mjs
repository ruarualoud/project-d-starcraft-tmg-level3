// Observe completed jobs only: a long-running model/tool call is not a stall.
// Unknown stalls retain the bounded stop. A known, fresh DNS transport pause
// is not an engine stall and must wait before the next same-state submission.
function isFreshDnsPause(current) {
  const job = current.driveJob;
  const requestedAt = Date.parse(job?.requestedAt || "");
  const completedAt = Date.parse(job?.completedAt || "");
  if (job?.status !== "completed" || job.result?.status !== "paused"
    || job.failure || !Number.isFinite(requestedAt)
    || !Number.isFinite(completedAt) || completedAt < requestedAt) return false;
  const findings = job.result?.failureAccounting?.findings;
  if (!Array.isArray(findings)) return false;
  // Accounting contains old jobs too. Never let an old network finding waive
  // a new deadlock, Rules, credentials, or an unknown outcome.
  const fresh = findings.filter((finding) => {
    const at = Date.parse(finding.occurredAt || "");
    return Number.isFinite(at) && at >= requestedAt && at <= completedAt;
  });
  return fresh.some((finding) => finding.code === "provider_dns_resolution_failed")
    && fresh.every((finding) => finding.stateRevision === current.stateRevision
      && finding.integrationBlocking === false
      && finding.severity !== "High" && finding.severity !== "Critical"
      && ["provider_dns_resolution_failed", "A2A_NO_PROGRESS_AT_CURRENT_STATE"]
        .includes(finding.code));
}

export function advanceCompletedDriveProgressV1(previous, current) {
  const progressed = current.stateRevision > previous.stateRevision
    || current.actionCount > previous.actionCount;
  if (!progressed && isFreshDnsPause(current)) {
    const transportFailureCompletions = Number(
      previous.transportFailureCompletions || 0) + 1;
    return { stateRevision: current.stateRevision, actionCount: current.actionCount,
      noProgressCompletions: previous.noProgressCompletions,
      transportFailureCompletions,
      retryAfterMs: Math.min(60_000,
        5_000 * 2 ** Math.min(transportFailureCompletions - 1, 4)) };
  }
  const noProgressCompletions = progressed ? 0
    : previous.noProgressCompletions + 1;
  if (noProgressCompletions >= 3) {
    const code = "SLICE248_COMPLETED_DRIVES_WITHOUT_PROGRESS";
    throw Object.assign(new Error(code), { code, severity: "High",
      stateRevision: current.stateRevision, noProgressCompletions,
      automaticRetryAuthorized: false });
  }
  return { stateRevision: current.stateRevision, actionCount: current.actionCount,
    noProgressCompletions, transportFailureCompletions: 0, retryAfterMs: 0 };
}
