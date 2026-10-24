import { randomUUID } from "node:crypto";
import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { effectiveRosterFinalPlanReviewFindingsV1, needsRosterFinalPlanReconciliationV1 } from
  "../roster-strategist/roster-final-plan-review-v1.mjs";
import { AGENT_SCHEDULED_ROSTER_PLAN_SCHEMA } from
  "../roster-strategist/agent-scheduled-roster-plan-v1.mjs";
import { rosterReviewProgressV1 } from '../roster-strategist/roster-progress-supervisor-v1.mjs';
import { rosterTeachReadinessV1, isUnsentInitialRosterPlanningV1 } from '../roster-strategist/roster-planning-workflow-v1.mjs';
import { collectIterativeRosterEvidenceV1 } from '../roster-strategist/iterative-roster-tool-port-v1.mjs';

export const AGENT_SELECTED_ROSTER_JOURNEY_V1 =
  "starcraft_tmg_agent_selected_roster_journey_v1";

export function rosterJourneyTeachRequestV1(job, plan) {
  return { expectedPlanHash: plan.planHash, factProbeExecutionMode:'product_evidence_led',
    ...(typeof job.automaticNetworkRecovery === 'boolean'
      ? { automaticNetworkRecovery:job.automaticNetworkRecovery } : {}) };
}

function fail(code) {
  throw Object.assign(new Error(code), { code });
}

// Shared by orchestration and actual Room preparation: accepting an old
// version is not accepting the strategy after source correction.
export function hasAcceptedCurrentRosterTeachV1(state, teach) {
  return state.teachFeedback?.disposition === "accepted"
    && state.teachFeedback.acceptanceBlocked !== true
    && state.teachFeedback.teachSessionId === teach?.sessionId
    && state.teachFeedback.taughtPlan?.planHash === teach?.plan?.planHash
    && (!teach?.teachFramework || teach.teachFramework.planHash === teach.plan?.planHash)
    && (state.selectionJustificationPolicyVersion !== 'unit_role_comparison_v1'
      && !teach?.teachFramework || rosterTeachReadinessV1(teach).ready)
    && (!teach?.teachFramework || state.teachFeedback.frameworkPolicyVersion
      === teach.teachFramework.policyVersion);
}

// Advice targets the formal Plan, not its seven-field precursor. Delivery to
// a changed version is not proof that this successor has passed Teach.
function pendingFormalTeachWork(teach, state) {
  // A current formal source audit owns its unfinished work even if it stopped
  // before producing findings. The provisional selector cannot recover it.
  // The review branch below, not this ownership predicate, decides retryability.
  if (hasCurrentSourceReview(teach) && teach.planReview.status !== 'completed') return true;
  // A current source repair remains formal work even when its request fails.
  // Ownership is not permission to retry; the owning workspace checks recovery.
  if (hasCurrentSourceReview(teach) && teach.planReview.status==='completed'
    && effectiveRosterFinalPlanReviewFindingsV1({plan:teach.plan,review:teach.planReview.review})
      .some(f=>['high','critical'].includes(f.severity))) return true;
  const framework = teach?.teachFramework;
  // A pause/failure/restart does not transfer a current formal inquiry back to
  // the provisional selector. Teach's own port owns replay, network ambiguity
  // and convergence limits; the outer Run entry must not change its owner.
  if (framework?.planHash === teach?.plan?.planHash
    && framework.status !== 'completed') return true;
  if (framework?.status !== 'completed') return false;
  if (framework.appliedToPlanHash === teach.plan?.planHash
    && framework.planHash !== teach.plan?.planHash) return true;
  const order=framework.revisionWorkOrder;
  const delivered=state?.teachFeedback;
  if (order?.rosterDecisionRequired && order.sourcePlanHash===teach.plan?.planHash
    && delivered?.disposition==='pending' && delivered.teachSessionId===teach.sessionId
    && delivered.taughtPlan?.planHash===order.sourcePlanHash
    && delivered.candidateHash===state.currentCandidate?.candidateHash
    && hashStarcraftTmgContract(delivered.teachFramework?.revisionWorkOrder || null)===hashStarcraftTmgContract(order))
    return false; // The selecting owner now consumes this exact work, once.
  return pendingCompletedTeachRevision(teach);
}

function pendingCompletedTeachRevision(teach) {
  const readiness = rosterTeachReadinessV1(teach);
  return readiness.completed && readiness.current
    && readiness.ledger.questions.some(q => q.status === 'revision_proposed');
}

function hasCurrentSourceReview(teach) {
  return Boolean(teach?.plan?.planHash && teach.planReview?.planHash === teach.plan.planHash);
}

function latestBuilderRejection(state) {
  if (state.currentCandidate) return false;
  const last = state.iterations.slice(-3);
  if (last.length < 3 || last.some((entry) =>
    entry.decisionKind !== "propose"
      || entry.rulesVerdictStatus !== "illegal"
      || (entry.modelContextVersion ?? 3)
        !== (state.modelContextVersion ?? 3))) return false;
  const codes = last.map((iteration) => state.observations.findLast((entry) =>
    entry.requestKey === iteration.requestKey
      && entry.query?.kind === "builder_verdict")?.receipt?.rulesErrorCode);
  return Boolean(codes[0] && codes.every((code) => code === codes[0]));
}

// One product-facing interface owns the ordering. The HTTP adapter and UI
// never decide when a Builder verdict, Rules arrival audit or locked Teach is
// sufficient. It intentionally does not claim Room admission: source review
// of the promoted Agent plan and match creation are later stages.
export function createAgentSelectedRosterJourneyV1({ iterativeDraft,
  workspaceService, promoteTeachPlan,
  createSessionId = () => `iterative-web-${randomUUID()}`
} = {}) {
  if (typeof iterativeDraft?.start !== "function"
    || typeof iterativeDraft?.listSessions !== "function"
    || typeof workspaceService?.createAgentSelectedTeachSession !== "function"
    || typeof workspaceService?.listSessions !== "function"
    || typeof workspaceService?.reviewFinalPlan !== "function"
    || typeof workspaceService?.revisePlan !== "function"
    || typeof promoteTeachPlan !== "function") {
    fail("AGENT_SELECTED_JOURNEY_PORTS_INVALID");
  }
  const jobs = new Map();
  async function phase(sessionId, job, stage, detail = {}) {
    job.phase = stage;
    const checkpoint = { stage,
      runStatus: job.running ? 'running' : job.failure ? 'blocked' : job.stopRequested ? 'paused' : 'settled',
      failure: job.failure || null, ...detail };
    const identity = hashStarcraftTmgContract(checkpoint);
    if (job.lastCheckpointIdentity === identity) return;
    await iterativeDraft.recordJourneyCheckpoint?.(sessionId, checkpoint);
    job.lastCheckpointIdentity = identity;
  }

  function readAwaitedSession(sessionId, lane) {
    const progress = workspaceService.readSession(sessionId, { progressOnly: true });
    const status = lane === 'planning' ? progress.status : progress[lane]?.status;
    // Only a live wait may use a narrow projection. All decisions, failures,
    // recovery and completion retain the ordinary complete source evidence.
    return status === 'running' ? progress : workspaceService.readSession(sessionId);
  }

  async function withWorkspaceSlot(job, operation) {
    const phase = job.phase;
    while (!job.stopRequested) {
      try {
        const result = await operation();
        job.phase = phase;
        return result;
      } catch (error) {
        // Busy is emitted before reservation/send by the single-writer
        // workspace. Wait for that writer, never retry a sent/unknown call
        // or reset a paid review/rejection history.
        if (error?.code !== "ROSTER_WORKSPACE_PLANNING_BUSY") throw error;
        job.phase = "waiting_for_workspace";
        await new Promise((resolve) => setTimeout(resolve, 1_000));
      }
    }
    return undefined;
  }

  function completedSourceReviews(teach) {
    const lineage = new Set([teach?.plan?.planHash,
      ...(teach?.planVersionHistory || []).map((plan) => plan.planHash)]);
    return [...(teach?.planReviewHistory || []), teach?.planReview]
      .filter((review) => review?.status === "completed"
        && lineage.has(review.planHash));
  }

  function reviewConvergenceExhausted(teach) {
    const seen = new Set();
    const reviews = completedSourceReviews(teach).filter(row => {
      const key = hashStarcraftTmgContract(row);
      if (seen.has(key)) return false;
      seen.add(key); return true;
    });
    return rosterReviewProgressV1(reviews.map(row => {
      const plan = [teach.plan, ...(teach.planVersionHistory || [])]
        .find(value => value.planHash === row.planHash);
      const findings = plan ? effectiveRosterFinalPlanReviewFindingsV1({ plan, review: row.review })
        : row.review?.findings || [];
      return { issues: [
        ...findings.filter(f => ['high', 'critical'].includes(f.severity))
          .map(f => ({ kind: 'source_finding', claimPath: f.claimPath, code: f.code || f.category || 'source_finding' })),
        ...(row === teach.planReview ? teach.claimRepairBacklog || [] : [])
          .map(f => ({ kind: 'claim_backlog', claimPath: f.claimPath, code: f.status })),
      ] };
    })).stop;
  }

  function retainedPreflightRepair(teach) {
    // A failed prose-repair preflight does not undo completed Teach or its
    // already promoted, reviewed plan. Re-enter only that cited repair lane;
    // sent/ambiguous attempts and the persisted three-review stop stay out.
    return teach?.status === "failed"
      && (teach.planRevisionRecovery?.canContinue===true
        || ['ROSTER_STRATEGIST_CLAIM_REPAIR_INVALID','ROSTER_WORKSPACE_RUN_INTERRUPTED_BY_RESTART']
        .includes(teach.failure?.code)
      && Array.isArray(teach.progress?.rounds)
      && teach.progress.rounds.length === 0)
      && teach.plan?.schema === "starcraft_tmg_agent_scheduled_roster_plan_v1"
      && teach.planReview?.status === "completed"
      && teach.planReview.planHash === teach.plan.planHash
      && teach.planReview.review?.planHash === teach.plan.planHash
      && (effectiveRosterFinalPlanReviewFindingsV1({ plan: teach.plan,
        review: teach.planReview.review }).some((finding) => (
        finding.severity === "high"))
        // A completed current Teach can request a formal revision even with
        // zero source-review Highs. A proven preflight restart must keep that
        // owner, not fall back to the provisional army selector. The same
        // zero-round/current-source/convergence guards still apply.
        || teach.failure.code === 'ROSTER_WORKSPACE_RUN_INTERRUPTED_BY_RESTART'
          && pendingCompletedTeachRevision(teach))
      && !effectiveRosterFinalPlanReviewFindingsV1({ plan: teach.plan,
        review: teach.planReview.review }).some((finding) => (
        finding.severity === "critical"))
      && !reviewConvergenceExhausted(teach);
  }

  async function linkedTeach(state) {
    const summaries = (await workspaceService.listSessions()).sessions;
    const lockedPlanId = `agent-selected-${state.sessionId}`;
    for (const summary of summaries.filter((entry) =>
      entry.planningMode === "locked_roster_teach_v1")) {
      const teach = workspaceService.readSession(summary.sessionId);
      if (state.teachFeedbackPolicy === "skill_teach_roster_coevolution_v1"
        && (teach.agentSelectedStrategySource?.planHash
          !== hashStarcraftTmgContract(state.plan)
          || state.teachFeedbackHistory?.some(entry =>
            entry.teachSessionId === teach.sessionId
              && entry.disposition === "reopened"))) continue;
      if (teach.agentSelectedCandidateHash
        === state.currentCandidate?.candidateHash
        && teach.setup?.factionRecordKey
          === state.frozenContext.factionRecordKey
        && teach.setup?.mineralBudget === state.mineralBudget
        && (teach.plan?.planId === lockedPlanId
          || teach.plan?.planId === `${lockedPlanId}-plan`
          || teach.lockedTeachSourcePlan?.planId === lockedPlanId
          || teach.lockedRoster?.baselinePlanId === lockedPlanId)) {
        // Plan IDs bind the exact iterative session, not merely a matching
        // roster. Full Builder/handoff verification stays at promotion and
        // Room admission; polling a journey must never rebuild it.
        return teach;
      }
    }
    return null;
  }

  function stage(state, teach, job) {
    if (state.status === "requires_reconciliation") {
      return "reconciliation_required";
    }
    if (hasCurrentSourceReview(teach) && teach.planReview.status === "failed") return "source_review_failed";
    if (job?.running) return job.phase;
    if (hasCurrentSourceReview(teach) && teach.planReview.status === "completed"
      && !teach.planReview.review.findings?.some(f => f.severity === "critical")
      && needsRosterFinalPlanReconciliationV1(teach.planReview.review)) {
      return "source_review_qualification_required";
    }
    if (reviewConvergenceExhausted(teach)) {
      return "source_review_nonconvergent";
    }
    if (job?.failure) return "stopped";
    if (teach?.status === "running") return "teaching";
    if (teach?.status === "planned") {
      if (hasCurrentSourceReview(teach) && teach.planReview.status === "completed") {
        return (effectiveRosterFinalPlanReviewFindingsV1({ plan: teach.plan,
          review: teach.planReview.review }).some((finding) =>
          finding.severity === "high"
            || finding.severity === "critical")
          || (teach.claimRepairBacklog || []).length > 0)
          ? "source_review_completed_with_findings"
          : state.teachFeedbackPolicy === "skill_teach_roster_coevolution_v1"
            && !hasAcceptedCurrentRosterTeachV1(state, teach)
            ? "reviewed_teach_feedback_required" : "source_review_completed_clean";
      }
      if (hasCurrentSourceReview(teach) && teach.planReview.status === "running") {
        return "reviewing_source";
      }
      return "source_review_required";
    }
    if (teach?.status === "failed") return "teach_failed";
    if (teach?.status === "paused") return "teach_paused";
    if (teach) return "teach_ready";
    if (state.openingDeploymentSchedule) {
      return state.arrivalPublicRevision?.publicAudit?.status
        === "unit_references_verified"
        ? "teach_handoff_required" : "public_arrival_revision_required";
    }
    if (state.currentCandidate?.mineralSpent === state.mineralBudget
      && state.status === "paused") return "arrival_schedule_required";
    return state.status === "paused" ? "paused" : "selecting_roster";
  }

  async function read(sessionId, { progressOnly = false } = {}) {
    if (progressOnly) {
      const job = jobs.get(sessionId);
      return { sessionId, running: job?.running === true,
        phase: job?.phase || null, stoppedReason: job?.failure || null };
    }
    const state = await iterativeDraft.read(sessionId);
    const teach = state.arrivalPublicRevision?.publicAudit?.status
      === "unit_references_verified" ? await linkedTeach(state) : null;
    const job = jobs.get(sessionId) || null;
    return {
      schema: AGENT_SELECTED_ROSTER_JOURNEY_V1,
      sessionId, stage: stage(state, teach, job),
      running: job?.running === true,
      stoppedReason: job?.failure || (reviewConvergenceExhausted(teach)
        ? "AGENT_SELECTED_JOURNEY_SOURCE_REVIEW_NONCONVERGENT"
        : null),
      revision: state.revision,
      iterativeStatus: state.status,
      blockingFinding: state.blockingFinding || null,
      factionRecordKey: state.frozenContext.factionRecordKey,
      opponentFactionRecordKey:
        state.frozenContext.opponentFactionRecordKey,
      engagementScale: state.frozenContext.scaleId,
      mineralBudget: state.mineralBudget,
      mineralSpent: state.currentCandidate?.mineralSpent ?? null,
      exactBudget: state.currentCandidate?.mineralSpent
        === state.mineralBudget,
      selectedUnits: state.currentCandidate?.input?.units?.map((unit) => ({
        unitInstanceId: unit.unitInstanceId,
        recordKey: unit.recordKey,
        compositionKind: unit.compositionKind,
        upgrades: unit.upgrades,
      })) || [],
      publicPlan: state.plan || null,
      teachFeedbackPolicy: state.teachFeedbackPolicy || "locked_roster_teach_v1",
      teachFeedback: state.teachFeedback ? {
        teachSessionId: state.teachFeedback.teachSessionId,
        disposition: state.teachFeedback.disposition,
        publicReason: state.teachFeedback.publicReason || null,
      } : null,
      arrivalSchedule: state.openingDeploymentSchedule || null,
      arrivalPublicAudit: state.arrivalPublicRevision?.publicAudit || null,
      teachSessionId: teach?.sessionId || null,
      teachStatus: teach?.status || null,
      teachPlanHash: teach?.plan?.planHash || null,
      sourceReviewStatus: teach?.planReview?.status || null,
      sourceReviewStale: Boolean(teach?.planReview && !hasCurrentSourceReview(teach)),
      sourceReviewFailure: hasCurrentSourceReview(teach) ? teach.planReview.failure?.code || null : null,
      sourceReviewHighCount: hasCurrentSourceReview(teach) && teach.planReview.status === "completed"
        ? effectiveRosterFinalPlanReviewFindingsV1({ plan: teach.plan,
          review: teach.planReview.review }).filter(finding =>
          finding.severity === "high" || finding.severity === "critical").length
        : null,
      decisions: state.iterations.map((entry) => ({
        revision: entry.revision,
        decisionKind: entry.decisionKind,
        rulesVerdictStatus: entry.rulesVerdictStatus,
        status: entry.status,
      })),
      canEnterRoom: false,
      roomAdmissionReason: "PROMOTED_PLAN_SOURCE_REVIEW_AND_ROOM_REQUIRED",
      trainingTruth: false,
    };
  }

  async function list() {
    const states = await iterativeDraft.listSessions();
    return Promise.all(states.map((state) => read(state.sessionId)));
  }

  async function create(setup = {}) {
    if (setup.engagementScale !== "Standard"
      || setup.mineralBudget !== 2000
      || typeof setup.factionRecordKey !== "string"
      || typeof setup.opponentFactionRecordKey !== "string") {
      fail("AGENT_SELECTED_JOURNEY_SETUP_INVALID");
    }
    const sessionId = createSessionId();
    await iterativeDraft.start({ sessionId, sideKey: "player1",
      factionRecordKey: setup.factionRecordKey,
      opponentFactionRecordKey: setup.opponentFactionRecordKey,
      scaleId: setup.engagementScale, mineralBudget: setup.mineralBudget,
      teachFeedbackPolicy: setup.teachFeedbackPolicy });
    return read(sessionId);
  }

  async function advance(sessionId, job) {
    // Preparation may add a versioned, evidence-only feedback source between
    // settled decisions. It never clears old rejections or paid receipts.
    let state = await iterativeDraft.read(sessionId);
    // The session/model port owns pending recovery: a retained paid reply is
    // consumed without dispatch; a missing/ambiguous reply is refused there.
    // Do not strand that safe path behind this outer Run gate.
    // An old selector may have reserved a request just before stage routing was
    // corrected. Prove it never left its transport, settle that reservation,
    // then re-evaluate the durable formal-stage owner. Never clear a sent or
    // ambiguous request and never repurchase a retained reply.
    const linkedFormal = await linkedTeach(state);
    if (state.pendingDecision
      && (state.blockingFinding === 'ITERATIVE_ROSTER_FORMAL_SOURCE_REPAIR_REQUIRED'
        || pendingFormalTeachWork(linkedFormal,state))
      && typeof iterativeDraft.releaseUnsentDecision === 'function'
      && linkedFormal) {
      state = await iterativeDraft.releaseUnsentDecision(sessionId);
    }
    if (state.status === 'requires_reconciliation' && state.pendingDecision) {
      await phase(sessionId, job, 'recovering_retained_decision');
      state = await iterativeDraft.resume(sessionId);
    }
    // A reserved decision must recover under its existing context first.
    // prepare intentionally rejects pending decisions; do not call it before
    // the model adapter has recovered (or refused) that exact reservation.
    if (!state.pendingDecision && typeof iterativeDraft.prepare === 'function') {
      state = await iterativeDraft.prepare(sessionId);
    }
    if (state.status === "requires_reconciliation"
      && !state.pendingDecision
      && state.iterations.at(-1)?.decisionKind === "repair_needed") {
      // Same ordinary Run entry, zero Provider calls: the model port admits
      // the retained answer only if current typed evidence now accepts it.
      // Old failures/costs remain; unknown dispatches never take this lane.
      try {
        state = await iterativeDraft.resume(sessionId, { preferRetainedRepair: true });
      } catch (error) {
        state = await iterativeDraft.read(sessionId);
        const last = state.iterations.at(-1);
        const known = state.retainedRevalidation;
        if (error.code !== 'ITERATIVE_ROSTER_RECONCILIATION_LIMIT_REACHED'
          || state.pendingDecision || known?.paidProviderCall !== false
          || known.sourceRequestKey !== last?.requestKey
          || Number(state.modelContextVersion || 0) < 13
          || !(last.modelContextVersion < state.modelContextVersion)) throw error;
        // One new corrected-contract decision after known local rejection.
        // Same-version non-convergence and ambiguous sends remain stopped;
        // the next iteration carries the new version, so restart cannot refill.
        state = await iterativeDraft.resume(sessionId, { advanceAfterKnownInvalid: true });
      }
    }
    // Formal claim paths are owned by the formal Plan tool port, not the
    // selector's seven provisional fields. Resume this lane after a settled
    // source-feedback boundary without rebuilding the army or its arrivals.
    const repairCandidate = !state.pendingDecision && (pendingFormalTeachWork(linkedFormal,state)
      || (state.teachFeedback?.disposition === 'pending'
      && state.teachFeedback?.acceptanceBlocked === true
      && state.teachFeedback?.feedbackReason === 'post_source_review'))
      ? await linkedTeach(state) : null;
    let formalRepair = repairCandidate
      && (state.blockingFinding === 'ITERATIVE_ROSTER_FORMAL_SOURCE_REPAIR_REQUIRED'
      || pendingFormalTeachWork(repairCandidate,state)
      // Ownership survives clearing Highs: the successor is quantitative Teach,
      // not the provisional selector. linkedTeach already binds army/Plan source.
      || (repairCandidate.planReview?.status === 'completed'
      && repairCandidate.planReview.planHash === repairCandidate.plan?.planHash
      && !needsRosterFinalPlanReconciliationV1(repairCandidate.planReview.review)
      && effectiveRosterFinalPlanReviewFindingsV1({plan:repairCandidate.plan,
        review:repairCandidate.planReview.review}).some(f=>f.severity==='high')))
      ? repairCandidate : null;
    while (!formalRepair && ["active", "paused"].includes(state.status)
      && state.blockingFinding
        !== "ITERATIVE_ROSTER_FINAL_REVIEW_BLOCKED"
      && state.blockingFinding !== "ITERATIVE_ROSTER_TEACH_ACCEPTED") {
      if (job.stopRequested) return;
      if (latestBuilderRejection(state)) {
        await iterativeDraft.pause(sessionId);
        fail("AGENT_SELECTED_JOURNEY_BUILDER_REJECTION_NONCONVERGENT");
      }
      await phase(sessionId, job, 'selecting_roster');
      state = await iterativeDraft.resume(sessionId);
      if (state.blockingFinding === 'ITERATIVE_ROSTER_FORMAL_SOURCE_REPAIR_REQUIRED') {
        formalRepair = await linkedTeach(state);
        if (!formalRepair) fail('AGENT_SELECTED_JOURNEY_FORMAL_REPAIR_SOURCE_MISSING');
      }
    }
    if (job.stopRequested) return;
    if (!formalRepair && state.status === "requires_reconciliation") {
      fail("AGENT_SELECTED_JOURNEY_RECONCILIATION_REQUIRED");
    }
    if ((!formalRepair && (state.status !== "paused"
      || !["ITERATIVE_ROSTER_FINAL_REVIEW_BLOCKED", "ITERATIVE_ROSTER_TEACH_ACCEPTED"]
        .includes(state.blockingFinding)))
      || state.currentCandidate?.mineralSpent !== state.mineralBudget
      || !state.plan?.mapEvidenceHash) {
      fail("AGENT_SELECTED_JOURNEY_DRAFT_NOT_EXACT_OR_MAP_BOUND");
    }
    if (!formalRepair) {
    await phase(sessionId, job, 'auditing_arrival');
    let arrival = await iterativeDraft.proposeSchedule(sessionId);
    while (["model_repair_needed", "rules_rejected"].includes(
      arrival.status)) {
      if (job.stopRequested) return;
      arrival = await iterativeDraft.proposeSchedule(sessionId);
    }
    if (!["rules_audited", "rules_audited_public_plan_revision_required"]
      .includes(arrival.status)) {
      fail("AGENT_SELECTED_JOURNEY_ARRIVAL_NOT_RULES_AUDITED");
    }
    await phase(sessionId, job, 'checking_public_arrival');
    let revision = await iterativeDraft.reviseSchedulePublicPlan(sessionId);
    while (["model_repair_needed", "rules_rejected"].includes(
      revision.status)) {
      if (job.stopRequested) return;
      revision = await iterativeDraft.reviseSchedulePublicPlan(sessionId);
    }
    if (revision.status !== "unit_references_verified") {
      fail("AGENT_SELECTED_JOURNEY_PUBLIC_ARRIVAL_NOT_VERIFIED");
    }
    }
    if (job.stopRequested) return;
    await phase(sessionId, job, 'starting_locked_teach');
    state = await iterativeDraft.read(sessionId);
    let teach = formalRepair || await linkedTeach(state);
    if (!teach) {
      if (state.teachFeedbackPolicy === "skill_teach_roster_coevolution_v1"
        && Number(state.modelContextVersion || 0) < 13
        && (state.teachFeedbackHistory?.length || 0) >= 3) {
        fail("ITERATIVE_ROSTER_TEACH_FEEDBACK_NONCONVERGENT");
      }
      const handoff = await iterativeDraft.prepareTeachHandoff(sessionId);
      teach = await withWorkspaceSlot(job, () =>
        workspaceService.createAgentSelectedTeachSession({
        setup: { sideKey: "player1",
          factionRecordKey: state.frozenContext.factionRecordKey,
          opponentFactionRecordKey:
            state.frozenContext.opponentFactionRecordKey,
          engagementScale: state.frozenContext.scaleId,
          mineralBudget: state.mineralBudget,
          opponentInformationBoundary: "open_roster" },
        handoff,
      }));
    } else if (typeof workspaceService.attachAgentSelectedEvidence === 'function') {
      teach = await withWorkspaceSlot(job, () =>
        workspaceService.attachAgentSelectedEvidence(teach.sessionId, {
          iterativeSessionId: state.sessionId, candidateHash: state.currentCandidate.candidateHash,
          planHash: hashStarcraftTmgContract(state.plan),
          selectionEvidence: collectIterativeRosterEvidenceV1(state) }));
    }
    if (job.stopRequested) return;
    if (teach.status === "draft") {
      await withWorkspaceSlot(job, () =>
        workspaceService.startPlanning(teach.sessionId));
    } else if (isUnsentInitialRosterPlanningV1(teach)) {
      await withWorkspaceSlot(job, () =>
        workspaceService.startPlanning(teach.sessionId, { resume: true }));
    } else if (teach.status === "failed"
      && !retainedPreflightRepair(teach)
      && Array.isArray(teach.progress?.rounds)
      && teach.progress.rounds.length > 0
      && teach.progress.rounds.every((round) =>
        ["completed", "replayed"].includes(round.status))
      && teach.retainedReplyCount >= teach.progress.rounds.length) {
      // Every completed paid reply is retained. A post-reply semantic or
      // shape failure may replay under its original context and contract;
      // an ambiguous dispatch or missing reply never enters this lane.
      await withWorkspaceSlot(job, () =>
        workspaceService.startPlanning(teach.sessionId, { resume: true }));
    }
    while (true) {
      if (job.stopRequested) return;
      teach = readAwaitedSession(teach.sessionId, 'planning');
      if (teach.status === "planned" || retainedPreflightRepair(teach)) break;
      if (teach.status !== "running") {
        fail("AGENT_SELECTED_JOURNEY_TEACH_NOT_PLANNED");
      }
      await phase(sessionId, job, 'teaching', { teachSessionId: teach.sessionId,
        teachPlanHash: teach.plan?.planHash || null });
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
    await phase(sessionId, job, 'promoting_agent_plan', { teachSessionId: teach.sessionId });
    if (!retainedPreflightRepair(teach)
      && teach.plan?.schema !== AGENT_SCHEDULED_ROSTER_PLAN_SCHEMA) {
      await promoteTeachPlan(sessionId, teach.sessionId);
    }
    // Progress is derived from persisted issues, not a process-local counter.
    // Completing a review is not itself failure; unresolved repeats still stop.
    while (true) {
      if (job.stopRequested) return;
      teach = workspaceService.readSession(teach.sessionId);
      const review = teach.planReview;
      if (review?.status === "failed") {
        // The workspace owns dispatch reconciliation, including retained paid
        // replies and ambiguous-send recovery. Historical paid rounds cannot
        // tell this caller whether the interrupted request may be resumed.
        const interruptedReview = review.failure?.code
          === "ROSTER_WORKSPACE_REVIEW_INTERRUPTED_BY_RESTART";
        // A developer-observed boundary can stop AFTER a complete paid reply.
        // Return that known-settled audit to the workspace's normal recovery;
        // it still validates retained replies/context and owns any new dispatch.
        // A sending/ambiguous request is not authorized by this local flag.
        const settledObservedReview = review.failure?.code === 'DEBUG_BOUNDARY_INSPECTION_REQUIRED'
          && [...(teach.providerDispatches || [])].reverse().find(dispatch =>
            dispatch.planHash === teach.plan.planHash
            && dispatch.roundKind === 'final_plan_review')?.status === 'completed';
        if (!interruptedReview && !settledObservedReview) {
          fail(review.failure?.code
            || "AGENT_SELECTED_JOURNEY_SOURCE_REVIEW_FAILED");
        }
      }
      if (review?.status !== "completed"
        || review.planHash !== teach.plan?.planHash) {
        await phase(sessionId, job, 'reviewing_source', { teachSessionId: teach.sessionId,
          teachPlanHash: teach.plan?.planHash || null });
        if (review?.status !== "running") {
          await withWorkspaceSlot(job, () =>
            workspaceService.reviewFinalPlan(teach.sessionId));
        }
        while (true) {
          if (job.stopRequested) return;
          teach = readAwaitedSession(teach.sessionId, 'planReview');
          if (teach.planReview?.status === "completed") break;
          if (teach.planReview?.status === "failed") {
            fail(teach.planReview.failure?.code
              || "AGENT_SELECTED_JOURNEY_SOURCE_REVIEW_FAILED");
          }
          if (teach.planReview?.status !== "running") {
            fail("AGENT_SELECTED_JOURNEY_SOURCE_REVIEW_NOT_RUNNING");
          }
          await new Promise((resolve) => setTimeout(resolve, 1_000));
        }
      }
      if (teach.planReview?.planHash !== teach.plan?.planHash) {
        fail("AGENT_SELECTED_JOURNEY_SOURCE_REVIEW_STALE");
      }
      if (teach.planReview.review.findings.some(f => f.severity === "critical")) {
        fail("AGENT_SELECTED_JOURNEY_SOURCE_REVIEW_CRITICAL");
      }
      // Ordinary Generate and explicit repair must qualify the same review
      // before its allegations can become corrective model instructions.
      if (needsRosterFinalPlanReconciliationV1(teach.planReview.review)) {
        if (typeof workspaceService.reconcileReviewFindings !== "function") {
          fail("AGENT_SELECTED_JOURNEY_REVIEW_QUALIFICATION_REQUIRED");
        }
        job.phase = "qualifying_source_review";
        teach = await withWorkspaceSlot(job, () =>
          workspaceService.reconcileReviewFindings(teach.sessionId));
      }
      if (reviewConvergenceExhausted(teach)) {
        fail("AGENT_SELECTED_JOURNEY_SOURCE_REVIEW_NONCONVERGENT");
      }
      const findings = effectiveRosterFinalPlanReviewFindingsV1({ plan: teach.plan,
        review: teach.planReview.review });
      if (findings.some((finding) => finding.severity === "critical")) {
        fail("AGENT_SELECTED_JOURNEY_SOURCE_REVIEW_CRITICAL");
      }
      const high = findings.filter((finding) => (
        finding.severity === "high"));
      const backlog = teach.claimRepairBacklog || [];
      if (high.length === 0 && backlog.length === 0) {
        // Decide on the reviewed/corrected strategy, not a superseded Teach.
        // Model choice may reopen both army and route through the same Builder;
        // acceptance applies only to this Plan version, never the whole session.
        state = await iterativeDraft.read(sessionId);
        if (state.selectionJustificationPolicyVersion === "unit_role_comparison_v1"
          && typeof workspaceService.teachPlanFramework === "function") {
          // Unknown factual results are investigation work, not a request to
          // rewrite the obsolete seven-field draft with stronger disclaimers.
          // Reuse the persisted fact-probe dialogue once; no new agenda, source,
          // roster, previous paid call or already resolved answer is reset.
          const readiness = rosterTeachReadinessV1(teach);
          if (readiness.completed && teach.teachFramework.planHash === teach.plan.planHash
            && readiness.ledger.questions.some(q => q.status === 'revision_proposed')) {
            const order = teach.teachFramework.revisionWorkOrder;
            if (!order || order.sourcePlanHash !== teach.plan.planHash) {
              await phase(sessionId,job,'scoping_formal_teach',{teachSessionId:teach.sessionId});
              await withWorkspaceSlot(job,()=>workspaceService.teachPlanFramework(teach.sessionId,{
                ...rosterJourneyTeachRequestV1(job,teach.plan),revisionWorkOrderOnly:true}));
              while (true) {
                if (job.stopRequested) return;
                teach=readAwaitedSession(teach.sessionId,'teachFramework');
                if (teach.teachFramework?.status==='completed') break;
                if (teach.teachFramework?.status!=='running')
                  fail(teach.teachFramework?.failure?.code || 'AGENT_SELECTED_JOURNEY_WORK_ORDER_FAILED');
                await new Promise(resolve=>setTimeout(resolve,1000));
              }
              continue;
            }
            if (order.rosterDecisionRequired) {
              await phase(sessionId,job,'evaluating_roster_teach_proposal',{teachSessionId:teach.sessionId});
              const experience=workspaceService.readPlanningExperience(teach.sessionId);
              await iterativeDraft.attachTeachFeedback(sessionId,{...teach,
                teachFramework:experience.teachFramework,
                teachCycle:experience.publicRounds.filter(round=>['teach_challenge','teach_revision'].includes(round.roundKind))});
              return advance(sessionId,job);
            }
            if (order.engineeringQuestionIds?.length) fail('AGENT_SELECTED_JOURNEY_TEACH_ENGINEERING_GAP');
            if (order.investigationQuestionIds?.length) {
              await withWorkspaceSlot(job,()=>workspaceService.teachPlanFramework(teach.sessionId,{
                ...rosterJourneyTeachRequestV1(job,teach.plan),startFactProbeForQuestionIds:order.investigationQuestionIds}));
              continue;
            }
            const paths = order.planClaimPaths;
            if (paths.length) {
            const oldPlanHash = teach.plan.planHash;
            await phase(sessionId, job, 'applying_formal_teach', {teachSessionId:teach.sessionId,
              teachPlanHash:oldPlanHash, unresolvedQuestionIds:readiness.unresolvedQuestionIds});
            await withWorkspaceSlot(job, () => workspaceService.revisePlan(teach.sessionId, {
              revisionPurpose:'teach_feedback_revision_v1', sourceTeachPlanHash:oldPlanHash,
              reasonText:'Apply the scoped Teach work order to the actual formal Plan through its executable edit tools. '
                + 'Choose evidence-based changes or explicitly retain supported arguments; preserve strategic intent. '
                + 'Unsupported dependencies must be investigated or genuinely removed, not relabelled as proven. '
                + 'This revision does not itself resolve or accept any Teach question. '
                + order.questionWork.filter(work=>work.route==='plan_revision').map(work=>work.publicReason).join('\n'),
              triggerIds:[], revisedSectionKeys:[...new Set(paths.map(path=>path.split('.')[0]))],
              targetedClaimPaths:paths,
            }));
            while (true) {
              if (job.stopRequested) return;
              const revised = readAwaitedSession(teach.sessionId, 'planning');
              if (revised.status === 'planned') {
                if (revised.plan?.planHash === oldPlanHash) fail('AGENT_SELECTED_JOURNEY_REPAIR_PLAN_UNCHANGED');
                break;
              }
              if (revised.status !== 'running') fail(revised.failure?.code || 'AGENT_SELECTED_JOURNEY_REPAIR_FAILED');
              await new Promise(resolve => setTimeout(resolve, 1_000));
            }
            continue; // Source-review the successor, then Teach its actual text.
            } // All retained proposals still go through the selecting feedback below.
          }
          if (readiness.completed && teach.teachFramework.planHash === teach.plan.planHash
            && readiness.unresolvedQuestionIds.length
            && !teach.teachFramework.factProbeContinuation) {
            await phase(sessionId, job, 'resolving_teach_evidence', {teachSessionId:teach.sessionId,
              unresolvedQuestionIds:readiness.unresolvedQuestionIds});
            await withWorkspaceSlot(job, () => workspaceService.teachPlanFramework(teach.sessionId, {
              ...rosterJourneyTeachRequestV1(job, teach.plan),
              startFactProbeForQuestionIds:readiness.unresolvedQuestionIds }));
            teach = workspaceService.readSession(teach.sessionId);
          }
          const currentFramework = () => teach.teachFramework?.status === "completed"
            && teach.teachFramework.investigationCompleted === true
            && teach.teachFramework.planHash === teach.plan.planHash;
          if (!currentFramework()) {
            await phase(sessionId, job, 'quantitative_framework_teach', { teachSessionId: teach.sessionId,
              teachPlanHash: teach.plan?.planHash || null });
            if (teach.teachFramework?.status !== "running") {
              await withWorkspaceSlot(job, () => workspaceService.teachPlanFramework(
                teach.sessionId, rosterJourneyTeachRequestV1(job, teach.plan)));
            }
            while (true) {
              if (job.stopRequested) return;
              teach = readAwaitedSession(teach.sessionId, 'teachFramework');
              if (currentFramework()) break;
              if (teach.teachFramework?.status !== "running") {
                fail(teach.teachFramework?.failure?.code || "AGENT_SELECTED_FRAMEWORK_TEACH_FAILED");
              }
              await new Promise(resolve => setTimeout(resolve, 1_000));
            }
            if (pendingFormalTeachWork(teach)) continue;
          }
        }
        if (state.teachFeedbackPolicy === "skill_teach_roster_coevolution_v1"
          && !hasAcceptedCurrentRosterTeachV1(state, teach)) {
          await phase(sessionId, job, 'evaluating_reviewed_teach_feedback', { teachSessionId: teach.sessionId,
            unresolvedQuestionIds: rosterTeachReadinessV1(teach).unresolvedQuestionIds });
          const experience = workspaceService.readPlanningExperience(teach.sessionId);
          await iterativeDraft.attachTeachFeedback(sessionId, { ...teach,
            teachFramework: experience.teachFramework || null,
            teachCycle: experience.publicRounds.filter(round =>
              ["teach_challenge", "teach_revision"].includes(round.roundKind)) });
          return advance(sessionId, job);
        }
        return;
      }
      if (high.length === 0 && backlog.every(entry =>
        entry.status === "source_review_required")) {
        fail("AGENT_SELECTED_JOURNEY_BACKLOG_REQUIRES_SOURCE_REVIEW");
      }
      // Correct source claims with the tools that own those exact fields.
      // Once source correction and quantitative Teach finish, the ordinary
      // feedback step above still lets the selector reopen both army and Plan.
      const paths = [...new Set([...high.map(finding => finding.claimPath),
        ...backlog.filter(entry => entry.status === "repair_required")
          .map(entry => entry.claimPath)])];
      if (paths.length === 0 || paths.length > 64
        || paths.some((path) => typeof path !== "string" || !path)) {
        fail("AGENT_SELECTED_JOURNEY_REVIEW_FINDINGS_UNREPAIRABLE");
      }
      const revisedSectionKeys = ["deploymentConcept",
        ...(paths.some((path) => path.startsWith("scoreRoute."))
          ? ["scoreRoute"] : []),
        ...(paths.some((path) => path.startsWith("componentPurposes."))
          ? ["componentPurposes"] : []),
        ...(paths.includes("publicSummaryText")
          ? ["publicSummaryText"] : [])];
      await phase(sessionId, job, 'repairing_cited_claims', { teachSessionId: teach.sessionId });
      await withWorkspaceSlot(job, () =>
        workspaceService.revisePlan(teach.sessionId, {
        reasonText: "Correct the cited High source findings on the exact "
          + "reviewed public claims; preserve the Rules-audited roster "
          + "and arrival schedule",
        triggerIds: [], revisedSectionKeys,
        targetedClaimPaths: paths,
      }));
      while (true) {
        if (job.stopRequested) return;
        const revised = readAwaitedSession(teach.sessionId, 'planning');
        if (revised.status === "planned") {
          if (revised.plan?.planHash === teach.plan?.planHash) {
            fail("AGENT_SELECTED_JOURNEY_REPAIR_PLAN_UNCHANGED");
          }
          break;
        }
        if (revised.status !== "running") {
          fail(revised.failure?.code
            || "AGENT_SELECTED_JOURNEY_REPAIR_FAILED");
        }
        await new Promise((resolve) => setTimeout(resolve, 1_000));
      }
    }
  }

  async function run(sessionId, request = {}) {
    if (request.automaticNetworkRecovery !== undefined
      && typeof request.automaticNetworkRecovery !== 'boolean') {
      fail('ROSTER_WORKSPACE_NETWORK_RECOVERY_POLICY_INVALID');
    }
    const existing = jobs.get(sessionId);
    if (existing?.running) fail("AGENT_SELECTED_JOURNEY_ALREADY_RUNNING");
    const current = await read(sessionId);
    if (current.stage === "source_review_completed_clean") {
      return current;
    }
    if (current.stage === "source_review_nonconvergent") {
      fail("AGENT_SELECTED_JOURNEY_SOURCE_REVIEW_NONCONVERGENT");
    }
    if (current.iterativeStatus === "requires_reconciliation") {
      const recoveryState = await iterativeDraft.read(sessionId);
      if (!recoveryState.pendingDecision
        && recoveryState.iterations.at(-1)?.decisionKind !== "repair_needed"
        && !pendingFormalTeachWork(await linkedTeach(recoveryState))) {
        fail("AGENT_SELECTED_JOURNEY_RECONCILIATION_REQUIRED");
      }
      // Both paths use the existing model port. Unknown dispatches cannot
      // generate again unless that port proves the original was never sent.
    }
    const job = { running: true, phase: "selecting_roster",
      automaticNetworkRecovery:request.automaticNetworkRecovery,
      failure: null, stopRequested: false };
    jobs.set(sessionId, job);
    void advance(sessionId, job).catch((error) => {
      job.failure = String(error?.code || error?.message ||
        "AGENT_SELECTED_JOURNEY_FAILED").slice(0, 160);
    }).finally(async () => { job.running = false;
      await phase(sessionId, job, job.phase);
    }).catch(error => { job.failure ||= String(error.code || error.message).slice(0, 160); });
    return read(sessionId);
  }

  async function pause(sessionId) {
    const job = jobs.get(sessionId);
    if (job) job.stopRequested = true;
    const state = await iterativeDraft.read(sessionId);
    if (["active", "paused"].includes(state.status)
      && state.blockingFinding
        !== "ITERATIVE_ROSTER_FINAL_REVIEW_BLOCKED") {
      await iterativeDraft.pause(sessionId);
    }
    return read(sessionId);
  }

  async function exportExperience(sessionId) {
    const state = await iterativeDraft.read(sessionId);
    const events = [];
    const keys = new Set([
      ...state.iterations.map(entry => entry.requestKey),
      ...(state.arrivalRequestKeys || []),
      ...(state.publicRevisionRequestKeys || []),
    ]);
    const replies = [];
    for (const requestKey of keys) {
      const reply = await iterativeDraft.loadRetainedReply(requestKey);
      if (!reply) continue;
      replies.push(reply);
      events.push({ kind: "model_decision", requestKey,
        receiptHash: reply.receiptHash, contextHash: reply.contextHash,
        output: reply.output || null,
        failureCode: reply.failureCode || null,
        usage: reply.usage || null, paidProviderCall: reply.paidProviderCall === true,
        revision: state.iterations.find(entry => entry.requestKey === requestKey)?.revision || null });
    }
    for (const observation of state.observations) events.push({
      kind: "tool_observation", ...structuredClone(observation) });
    for (const feedback of state.teachFeedbackHistory || []) events.push({
      kind: "teach_feedback", ...structuredClone(feedback) });
    const summaries = (await workspaceService.listSessions()).sessions;
    const teaches = summaries.map(summary => workspaceService.readSession(summary.sessionId))
      .filter(teach => teach.agentSelectedStrategySource?.iterativeSessionId === sessionId
        || teach.lockedRoster?.baselinePlanId === `agent-selected-${sessionId}`);
    for (const teach of teaches) events.push({ kind: "teach_snapshot",
      ...workspaceService.readPlanningExperience(teach.sessionId) });
    return {
      schema: "starcraft_tmg_roster_experience_v1", sessionId,
      frozenContext: structuredClone(state.frozenContext),
      contextHash: state.contextHash, status: state.status,
      strategyPolicy: state.teachFeedbackPolicy || "locked_roster_teach_v1",
      finalCandidate: structuredClone(state.currentCandidate),
      finalSelectionPlan: structuredClone(state.plan),
      arrivalSnapshotHistory: structuredClone(state.arrivalSnapshotHistory || []),
      currentArrivalSchedule: structuredClone(state.openingDeploymentSchedule || null),
      iterations: structuredClone(state.iterations), events,
      sourceBoundPaidReplyHashes: [...new Set(replies.filter(reply => reply.paidProviderCall === true)
        .map(reply => reply.receiptHash))],
      hiddenChainOfThoughtStored: false, trainingTruth: false,
      wikiImportCompleted: false,
    };
  }

  return Object.freeze({ create, list, read, run, pause, exportExperience,
    descriptor: () => ({ version: AGENT_SELECTED_ROSTER_JOURNEY_V1,
      draftAndTeachAvailable: true, roomAdmissionAvailable: false,
      trainingTruth: false }) });
}
