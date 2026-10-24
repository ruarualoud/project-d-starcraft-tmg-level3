import { effectiveRosterFinalPlanReviewFindingsV1 } from './roster-final-plan-review-v1.mjs';
import { rosterTeachReadinessV1 } from './roster-planning-workflow-v1.mjs';

export const ROSTER_PROGRESS_POLICY_V1 = 'evidence_led_issue_progress_v1';

// An allowance belongs to one issue under one executable contract, not the
// task. Restarting and changing reply IDs cannot refill it.
export function rosterRepairProgressV1(state, failureCode) {
  const counts = new Map();
  for (const entry of state.iterations) {
    if (entry.modelContextVersion !== state.modelContextVersion) continue;
    if (entry.decisionKind !== 'repair_needed') { counts.clear(); continue; }
    const code = entry.publicDecision?.failureCode || state.observations.findLast(row =>
      row.requestKey === entry.requestKey && row.query?.kind === 'model_output_repair')?.receipt?.failureCode;
    if (code) counts.set(code, (counts.get(code) || 0) + 1);
  }
  const attempts = (counts.get(failureCode) || 0) + 1;
  return { policyVersion: ROSTER_PROGRESS_POLICY_V1, issue: failureCode,
    attemptsWithoutSuccessfulDecision: attempts, stop: attempts >= 3,
    reason: attempts >= 3 ? 'same_issue_without_progress' : 'distinct_issue_or_remaining_repair',
    taskWideAttemptLimit: false, historyReset: false };
}

export function rosterTeachAcceptanceIssuesV1(teach) {
  const findings = teach?.planReview?.status === 'completed'
    && teach.planReview.planHash === teach.plan?.planHash
    ? effectiveRosterFinalPlanReviewFindingsV1({ plan: teach.plan, review: teach.planReview.review }) : [];
  return [
    ...findings.filter(row => ['high', 'critical'].includes(row.severity))
      .map(row => ({ kind: 'source_finding', severity: row.severity,
        claimPath: row.claimPath, code: row.code || row.category || 'source_finding' })),
    ...(teach?.claimRepairBacklog || []).map(row => ({ kind: 'claim_backlog',
      claimPath: row.claimPath, code: row.status })),
    ...(teach?.teachFramework ? rosterTeachReadinessV1(teach).issues : []),
  ];
}

// A completed review is not a failed attempt. Continue when issues close;
// stop three reviews with unresolved issues and no closure. Prose/IDs are not
// progress. Current source proof and final acceptance remain mandatory.
export function rosterReviewProgressV1(reviews) {
  let prior = null, stagnant = 0, resolved = [];
  for (const row of reviews) {
    const current = new Set(row.issues.map(issue => JSON.stringify([
      issue.kind, issue.claimPath || '', issue.code || '' ])));
    resolved = prior ? [...prior].filter(key => !current.has(key)) : [];
    stagnant = current.size === 0 || resolved.length ? 0 : stagnant + 1;
    prior = current;
  }
  return { policyVersion: ROSTER_PROGRESS_POLICY_V1,
    unresolvedIssueCount: prior?.size || 0, consecutiveReviewsWithoutClosure: stagnant,
    resolvedIssueCount: resolved.length, stop: stagnant >= 3, historyReset: false };
}
