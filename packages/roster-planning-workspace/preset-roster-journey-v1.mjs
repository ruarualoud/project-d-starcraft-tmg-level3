// Product-owned fixed-army orchestration. Clients and experiments only Run,
// observe and Pause. All facts, edits, paid replies and recovery remain owned
// by the existing workspace/Teach/Rules services, not by this coordinator.
import { effectiveRosterFinalPlanReviewFindingsV1, needsRosterFinalPlanReconciliationV1 } from '../roster-strategist/roster-final-plan-review-v1.mjs';
import { rosterReviewProgressV1 } from '../roster-strategist/roster-progress-supervisor-v1.mjs';
import { rosterTeachReadinessV1, recordRosterPlanningCheckpointV1 }
  from '../roster-strategist/roster-planning-workflow-v1.mjs';
import { unresolvedStarcraftTmgProviderDispatchesV1 }
  from '../secure-provider-runtime/provider-dispatch-recovery-v1.mjs';

export const PRESET_ROSTER_JOURNEY_VERSION = 'preset_roster_product_journey_v1';
const fail = code => { throw Object.assign(new Error(code), { code }); };
const unresolved = view => rosterTeachReadinessV1(view).unresolvedQuestionIds;
const findings = view => view.planReview?.status === 'completed'
  && view.planReview.planHash === view.plan?.planHash
  ? effectiveRosterFinalPlanReviewFindingsV1({ plan: view.plan, review: view.planReview.review }) : [];
const sourceClean = view => view.status === 'planned' && !!view.plan
  && !view.planEvidenceStale && view.planReview?.status === 'completed'
  && view.planReview.planHash === view.plan.planHash && !view.planReview.stale
  && !view.planReviewRequiredForHandoff && !view.planReviewBlockingHighFindings
  && !findings(view).some(f => ['high', 'critical'].includes(f.severity))
  && !(view.claimRepairBacklog || []).length;
const appliedTeach = view => rosterTeachReadinessV1(view, { requireApplied: true }).ready;

export function presetRosterSourceReviewRequestV1(view) {
  // A partially dispatched current review must resume its exact existing body.
  if (view.planReview?.planHash === view.plan?.planHash) return {};
  const reviews = [view.planReview, ...(view.planReviewHistory || [])];
  const previous = (view.planVersionHistory || []).findLast(plan =>
    plan.planHash !== view.plan?.planHash && reviews.some(r => r?.status === 'completed'
      && r.planHash === plan.planHash && r.review?.planHash === plan.planHash));
  // The existing review service still validates dependencies and explicitly
  // falls back to full review if they changed. The coordinator waives nothing.
  return previous ? { scope: 'changed_claims', baselinePlanHash: previous.planHash } : {};
}

// Recheck the current version, not merely a historical "completed" badge.
// Room admission still performs its existing Builder/map/source binding checks.
export function isPresetRosterJourneyAcceptedV1(view) {
  return view.presetJourney?.version === PRESET_ROSTER_JOURNEY_VERSION
    && view.presetJourney.status === 'completed'
    && view.presetJourney.acceptedPlanHash === view.plan?.planHash
    && sourceClean(view) && appliedTeach(view);
}

export function createPresetRosterJourneyV1({ service, readState, saveState,
  sleep = () => new Promise(resolve => setTimeout(resolve, 1000)) }) {
  const jobs = new Map();
  async function advance(id, job) {
    const read = () => service.readSession(id);
    const stopped = () => job.stopRequested;
    const phase = async stage => {
      job.state.stage = stage; job.state.updatedAt = new Date().toISOString();
      const view = read();
      recordRosterPlanningCheckpointV1(job.state, { stage, runStatus: job.state.status,
        planHash: view.plan?.planHash || null, planVersion: view.plan?.planVersion || null,
        armyMode: 'fixed', teachPhase: view.teachFramework?.phase || null,
        unresolvedQuestionIds: unresolved(view), sourceHigh: view.planReviewBlockingHighFindings || false,
        latestDispatch: (view.providerDispatches || []).at(-1)?.status || null });
      await saveState(id, job.state);
    };
    const call = async (stage, operation) => {
      await phase(stage);
      while (!stopped()) {
        try { return await operation(); }
        catch (e) {
          // This is the workspace's BEFORE-SEND single-writer reservation.
          // A model/network failure is never retried by this loop.
          if (e.code !== 'ROSTER_WORKSPACE_PLANNING_BUSY') throw e;
          await sleep();
        }
      }
    };
    const wait = async (status, success, error) => {
      while (true) {
        const view = read(), current = status(view);
        // Pause stops the next dispatch, not the already-paid in-flight body.
        // Keep the outer job alive until its owned child saves a terminal state,
        // otherwise the caller may close its Worker and abort that response.
        if (current === 'running') { await sleep(); continue; }
        if (stopped()) return null;
        if (current === success) return view;
        fail(error(view) || 'PRESET_JOURNEY_STAGE_FAILED');
      }
    };
    let view = read();
    if (job.recovery) {
      // The existing service, not this coordinator, owns exact-body replay,
      // one-send authorization and preservation of the old unknown charge.
      const { kind, ...request } = job.recovery;
      if (kind === 'source_review') {
        await call('recovering_interrupted_source_review', () => service.reviewFinalPlan(id, request));
        view = await wait(v => v.planReview?.status, 'completed', v => v.planReview?.failure?.code);
      } else {
        await call('recovering_interrupted_teach', () => service.teachPlanFramework(id,
          { ...request, expectedPlanHash: view.plan.planHash }));
        view = await wait(v => v.teachFramework?.status, 'completed', v => v.teachFramework?.failure?.code);
      }
      if (!view) return;
      job.recovery = null;
    }
    if (!view.plan) {
      if (view.status !== 'running') await call('generating_plan', () => service.startPlanning(id,
        { resume: view.retainedReplyCount > 0 || view.status === 'paused' }));
      view = await wait(v => v.status, 'planned', v => v.failure?.code);
      if (!view) return;
    }
    if (!view.plan.openingDeploymentSchedule) {
      await call('planning_arrival', () => service.revisePlan(id, {
        reasonText: 'Create the Rules-audited opening arrival schedule for this unchanged fixed roster and align the public deployment plan with its model-selected arrival windows.',
        revisedSectionKeys: ['deploymentConcept', 'publicSummaryText'], triggerIds: [],
      }));
      view = await wait(v => v.status, 'planned', v => v.failure?.code);
      if (!view) return;
      if (!view.plan.openingDeploymentSchedule) fail('PRESET_JOURNEY_ARRIVAL_MISSING');
    }
    while (!stopped()) {
      view = read();
      if (!view.planReview || view.planReview.status !== 'completed'
        || view.planReview.planHash !== view.plan.planHash || view.planReview.stale) {
        if (view.planReview?.status !== 'running') await call('reviewing_source', () =>
          service.reviewFinalPlan(id, presetRosterSourceReviewRequestV1(view)));
        view = await wait(v => v.planReview?.status, 'completed', v => v.planReview?.failure?.code);
        if (!view) return;
      }
      if (needsRosterFinalPlanReconciliationV1(view.planReview.review)) {
        await call('qualifying_source_review', () => service.reconcileReviewFindings(id));
        if (stopped()) return;
        view = read();
      }
      const high = findings(view).filter(f => ['high', 'critical'].includes(f.severity));
      if (high.some(f => f.severity === 'critical')) fail('PRESET_JOURNEY_SOURCE_CRITICAL');
      const backlog = view.claimRepairBacklog || [];
      if (high.length || backlog.length) {
        const prior = job.state.reviewProgress || [];
        if (prior.at(-1)?.planHash !== view.plan.planHash) prior.push({ planHash: view.plan.planHash,
          issues: [...high.map(f => ({ kind: 'source_finding', claimPath: f.claimPath,
            code: f.code || f.category || 'source_finding' })), ...backlog.map(f => ({
            kind: 'claim_backlog', claimPath: f.claimPath, code: f.status }))] });
        job.state.reviewProgress = prior;
        await phase('repairing_source');
        if (rosterReviewProgressV1(prior).stop) fail('PRESET_JOURNEY_SOURCE_NONCONVERGENT');
        const paths = [...new Set([...high.map(f => f.claimPath),
          ...backlog.filter(f => f.status === 'repair_required').map(f => f.claimPath)])];
        if (!paths.length || paths.some(p => typeof p !== 'string' || !p)) fail('PRESET_JOURNEY_SOURCE_REPAIR_UNAVAILABLE');
        const before = view.plan.planHash;
        await call('repairing_source', () => service.revisePlan(id, {
          reasonText: 'Correct the qualified source findings on these exact claims. Keep the fixed army; choose the strategy from Skill and evidence, not from snapshot immutability.',
          targetedClaimPaths: paths,
          revisedSectionKeys: [...new Set(['deploymentConcept', ...paths.map(p => p.split('.')[0])])], triggerIds: [],
        }));
        view = await wait(v => v.status, 'planned', v => v.failure?.code);
        if (!view) return;
        if (view.plan.planHash === before) fail('PRESET_JOURNEY_REPAIR_UNCHANGED');
        continue;
      }
      if (!sourceClean(view)) fail('PRESET_JOURNEY_SOURCE_ACCEPTANCE_REQUIRED');
      if (appliedTeach(view)) {
        job.state.acceptedPlanHash = view.plan.planHash;
        job.state.status = 'completed'; await phase('plan_teach_completed'); return;
      }
      if (view.teachFramework?.status !== 'completed'
        || view.teachFramework.planHash !== view.plan.planHash) {
        if (view.teachFramework?.status !== 'running') await call('teaching', () =>
          service.teachPlanFramework(id, { expectedPlanHash: view.plan.planHash }));
        view = await wait(v => v.teachFramework?.status, 'completed', v => v.teachFramework?.failure?.code);
        if (!view) return;
      }
      if (!view.teachFramework.investigationCompleted) fail('PRESET_JOURNEY_TEACH_INCOMPLETE');
      const missing = unresolved(view);
      if (missing.length) {
        // Use the existing model-owned query correction port once per saved
        // question set. A restart cannot refill this allowance or hide unknowns.
        const key = JSON.stringify([view.teachFramework.planHash, [...missing].sort()]);
        job.state.queryRecoveries ||= [];
        if (!job.state.queryRecoveries.includes(key)) {
          job.state.queryRecoveries.push(key);
          await call('repairing_teach_queries', () => service.teachPlanFramework(id, {
            expectedPlanHash: view.plan.planHash, recoverFailedQueryIds: missing,
          }));
          view = await wait(v => v.teachFramework?.status, 'completed', v => v.teachFramework?.failure?.code);
          if (!view) return;
        }
        if (unresolved(view).length) {
          const progress = job.state.teachIssueProgress ||= [];
          if (progress.at(-1)?.planHash !== view.plan.planHash) progress.push({ planHash: view.plan.planHash,
            issues: rosterTeachReadinessV1(view).issues });
          if (rosterReviewProgressV1(progress).stop) fail('PRESET_JOURNEY_TEACH_NONCONVERGENT');
          const previousHash = view.plan.planHash;
          await call('revising_unresolved_plan', () => service.revisePlan(id, {
            reasonText: 'The saved Teach still has these unanswered questions: ' + unresolved(view).join(', ')
              + '. Keep the army fixed, but revise actual Plan assertions/route if their required facts could not be established. Distinguish conditional opponent hypotheses from tool failures. Preserve justified risk and supported decisions. Do not claim an unknown query was answered or merely hide it with wording. The resulting Plan will receive source review and Teach again.',
            revisedSectionKeys: ['scoreRoute', 'deploymentConcept', 'componentPurposes', 'publicSummaryText',
              'opponentHypotheses', 'counterResponses', 'invalidationTriggers'], triggerIds: [],
          }));
          view = await wait(v => v.status, 'planned', v => v.failure?.code);
          if (!view) return;
          if (view.plan.planHash === previousHash) fail('PRESET_JOURNEY_TEACH_REVISION_UNCHANGED');
          continue;
        }
      }
      await call('applying_teach', () => service.revisePlan(id, {
        reasonText: 'Use the completed Teach evidence to produce the final playable strategy for this fixed army. Explain retained and changed choices, opponent hypotheses and conditional responses. Preserve justified risk; do not treat reviewer preferences as rules or snapshot immutability as a strategic reason.',
        revisedSectionKeys: ['scoreRoute', 'deploymentConcept', 'componentPurposes', 'publicSummaryText'], triggerIds: [],
      }));
      view = await wait(v => v.status, 'planned', v => v.failure?.code);
      if (!view) return;
      if (!appliedTeach(view)) fail('PRESET_JOURNEY_TEACH_APPLICATION_MISSING');
      // Re-enter source review for the resulting Plan, never approve old text.
    }
  }
  async function run(id, request = {}) {
    const view = service.readSession(id);
    if (!view.lockedRoster || view.agentSelectionHandoffHash) fail('PRESET_JOURNEY_FIXED_ARMY_REQUIRED');
    if (jobs.has(id) || isPresetRosterJourneyAcceptedV1(view)) return view;
    const pending = unresolvedStarcraftTmgProviderDispatchesV1(view.providerDispatches);
    const interrupted = pending[0];
    const exactRecovery = pending.length === 1 && request.resumeAfterNetworkInterrupt === true
      && request.expectedRequestId === interrupted.requestId
      && interrupted.planHash === view.plan?.planHash;
    const canResumeTeach = exactRecovery && String(interrupted.roundKind).startsWith('teach_framework_')
      && view.teachFramework?.status === 'failed';
    const canResumeReview = exactRecovery && interrupted.roundKind === 'final_plan_review'
      && view.planReview?.status === 'failed' && view.planReview.planHash === view.plan.planHash;
    if (pending.length && !canResumeTeach && !canResumeReview) fail('PRESET_JOURNEY_DISPATCH_RECOVERY_REQUIRED');
    const previous = readState(id);
    const job = { stopRequested: false,
      recovery: canResumeTeach || canResumeReview ? { kind: canResumeReview ? 'source_review' : 'teach',
        resumeAfterNetworkInterrupt: true, expectedRequestId: interrupted.requestId } : null,
      state: { ...previous,
      version: PRESET_ROSTER_JOURNEY_VERSION, status: 'running', stage: 'starting',
      acceptedPlanHash: null, failure: null, history: previous?.history || [] } };
    jobs.set(id, job);
    try { await saveState(id, job.state); } catch (e) { jobs.delete(id); throw e; }
    void advance(id, job).catch(error => {
      job.state.status = 'blocked'; job.state.failure = { code: String(error.code || error.message), automaticRetry: false };
    }).finally(async () => {
      if (job.state.status === 'running') job.state.status = 'paused';
      job.state.history.push({ stage: job.state.stage, status: job.state.status,
        planHash: service.readSession(id).plan?.planHash || null, at: new Date().toISOString() });
      recordRosterPlanningCheckpointV1(job.state, { stage: job.state.stage, runStatus: job.state.status,
        planHash: service.readSession(id).plan?.planHash || null,
        failure: job.state.failure?.code || null, acceptedPlanHash: job.state.acceptedPlanHash });
      try { await saveState(id, job.state); } finally { jobs.delete(id); }
    }).catch(() => { /* Persist failure remains a failed job, never acceptance. */ });
    return service.readSession(id);
  }
  function stop(id) { const job = jobs.get(id); if (job) job.stopRequested = true; return Boolean(job); }
  return Object.freeze({ run, stop });
}
