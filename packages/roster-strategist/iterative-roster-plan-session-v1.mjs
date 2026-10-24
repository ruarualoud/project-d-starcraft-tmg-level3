import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { projectRosterTeachPromptEvidenceV1, readRosterTeachRetainedEvidenceV1 }
  from "./roster-teach-framework-v1.mjs";
import { rosterRepairProgressV1, rosterTeachAcceptanceIssuesV1, rosterReviewProgressV1 }
  from './roster-progress-supervisor-v1.mjs';
import { recordRosterPlanningCheckpointV1 } from './roster-planning-workflow-v1.mjs';
import { createIterativeRosterTeachHistoryEvidenceV1 } from './roster-teach-history-view-v1.mjs';
import { executeRosterQueryBatchV1 } from './roster-query-batch-checkpoint-v1.mjs';

export const ITERATIVE_ROSTER_PLAN_SESSION_V1 =
  "starcraft_tmg_iterative_roster_plan_session_v1";

const ID = /^[A-Za-z0-9._:-]{8,200}$/u;

function fail(code) {
  throw Object.assign(new Error(code), { code });
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function copy(value) {
  return structuredClone(value);
}

export function readIterativeRosterTeachEvidenceV1(state, request) {
  const archive = new Map();
  for (const feedback of [state.teachFeedback, state.draftTeachFeedback]) {
    if (feedback?.candidateHash === state.currentCandidate?.candidateHash) {
      projectRosterTeachPromptEvidenceV1(feedback, archive);
    }
  }
  for (const [reference, original] of createIterativeRosterTeachHistoryEvidenceV1(state).originals) {
    archive.set(reference, original);
  }
  let body;
  try { body = { status: 'advisory', readOnly: true,
    result: readRosterTeachRetainedEvidenceV1([], request, archive), trainingTruth: false }; }
  catch (error) { body = { status: 'unknown', readOnly: true,
    reason: String(error.code || error.message), trainingTruth: false }; }
  return { ...body, receiptHash: hashStarcraftTmgContract(body) };
}

function requiredId(value, label) {
  if (typeof value !== "string" || !ID.test(value)) fail(label);
  return value;
}

function requiredHash(value, label) {
  if (typeof value !== "string" || value.length < 8 || value.length > 200) {
    fail(label);
  }
  return value;
}

function requirePorts(ports) {
  for (const [port, method] of [
    ["store", "load"], ["store", "save"], ["model", "decide"],
    ["builder", "evaluate"], ["tools", "query"], ["review", "final"],
  ]) {
    if (typeof ports[port]?.[method] !== "function") {
      fail("ITERATIVE_ROSTER_PORT_MISSING");
    }
  }
}

function publicPlan(value, candidateHash, priorPlan, observations) {
  if (!object(value) || typeof value.victoryRoute !== "string"
    || !value.victoryRoute.trim()
    || !["unknown", "legal"].includes(value.arrivalScheduleStatus)
    || !(value.mapEvidenceHash === null
      || typeof value.mapEvidenceHash === "string")) {
    fail("ITERATIVE_ROSTER_PLAN_INVALID");
  }
  if (value.mapEvidenceHash !== null
    && !observations.some((entry) => (
      (entry.query.kind === "map_route"
        && entry.query.candidateHash === candidateHash
        && ["exact", "certified", "advisory"].includes(entry.receipt.status)
        && entry.receipt.receiptHash === value.mapEvidenceHash)
      || (entry.query.kind === "map_summary"
        && entry.receipt.status === "certified"
        && entry.receipt.mapBinding?.roomFreezeHash === value.mapEvidenceHash)))) {
    fail("ITERATIVE_ROSTER_MAP_EVIDENCE_UNBOUND");
  }
  // Draft wording may change without a new strategic route. Preserve the
  // discrepancy as an observation in resume; final Teach must resolve it.
  return { victoryRoute: value.victoryRoute.trim(),
    mapEvidenceHash: value.mapEvidenceHash,
    arrivalScheduleStatus: value.arrivalScheduleStatus,
    candidateHash, assumptionDisposition: value.assumptionDisposition,
    strategy: object(value.strategy) ? copy(value.strategy) : null };
}

function operationalPlanIdentity(plan) {
  const { assumptionDisposition: _disposition, ...body } = plan;
  const { revisionReason: _explanation, ...strategy } = plan.strategy || {};
  return hashStarcraftTmgContract({ ...body, strategy });
}

// A Builder-legal purchase is not proof that copied Plan text describes it.
// Return the concrete roster delta to the selecting Agent BEFORE buying another
// Teach. This schedules an authoring decision, never chooses a strategy or
// rejects a justified decision to retain one. Existing paid Teach stays saved.
export function projectIterativeRosterPlanAlignmentV1(state) {
  if (Number(state.modelContextVersion || 0) < 12 || !state.currentCandidate || !state.plan) return null;
  const current = state.currentCandidate;
  const history = state.iterations || [];
  const previous = history.findLast(row => row.candidateSnapshot && row.planSnapshot
    && row.currentCandidateHash !== current.candidateHash);
  if (!previous) return null;
  // Actual r6 changed two timing words but retained the old army rationale.
  // Neither editing only victoryRoute nor submitting finish acknowledges it.
  if (state.plan.strategy?.rosterRationale !== previous.planSnapshot.strategy?.rosterRationale
    || state.plan.strategy?.revisionReason !== previous.planSnapshot.strategy?.revisionReason) return null;
  const oldUnits = previous.candidateSnapshot.input.units;
  const units = current.input.units;
  return { status: 'needs_plan_alignment', sourceRevision: previous.revision,
    previousCandidateHash: previous.currentCandidateHash, candidateHash: current.candidateHash,
    previousMineralSpent: previous.candidateSnapshot.mineralSpent, mineralSpent: current.mineralSpent,
    addedUnitIds: units.filter(u => !oldUnits.some(old => old.unitInstanceId === u.unitInstanceId)).map(u => u.unitInstanceId),
    removedUnitIds: oldUnits.filter(u => !units.some(now => now.unitInstanceId === u.unitInstanceId)).map(u => u.unitInstanceId),
    changedUnitIds: units.filter(u => oldUnits.some(old => old.unitInstanceId === u.unitInstanceId
      && hashStarcraftTmgContract(old) !== hashStarcraftTmgContract(u))).map(u => u.unitInstanceId),
    previousTacticalCardRecordKeys: previous.candidateSnapshot.input.tacticalCardRecordKeys,
    tacticalCardRecordKeys: current.input.tacticalCardRecordKeys,
    instruction: 'The army changed but your victoryRoute and strategy were copied unchanged. Use the current army, printed costs, retained Teach and tools to author its Plan before another Teach. Explain the added/removed/changed units, purposes, budget and schedule. revise_plan can retain a justified strategy with an explicit current-army rationale; propose can change both. This is not a tactical veto or final acceptance.',
    strategyChosenByHost: false, oldEvidenceRetainedWithOriginalScope: true };
}

export function createIterativeRosterPlanSessionV1(ports = {}) {
  requirePorts(ports);
  const busy = new Set();
  const pauseRequests = new Set();
  const pendingWrites = new Map();

  function serializeWrite(sessionId, write) {
    const task = (pendingWrites.get(sessionId) || Promise.resolve()).catch(() => {}).then(write);
    pendingWrites.set(sessionId, task);
    const release = () => { if (pendingWrites.get(sessionId) === task) pendingWrites.delete(sessionId); };
    void task.then(release, release);
    return task;
  }

  function saveState(sessionId, value) {
    recordRosterPlanningCheckpointV1(value, { stage: value.planAlignment ? 'align_plan'
      : value.pendingDecision ? 'author_decision' : value.draftTeachSnapshots?.at(-1)?.status === 'running'
        ? 'teach' : value.blockingFinding === 'ITERATIVE_ROSTER_TEACH_ACCEPTED' ? 'accepted_candidate' : 'co_design',
      runStatus: value.status, revision: value.revision,
      candidateHash: value.currentCandidate?.candidateHash || null,
      planHash: value.plan ? hashStarcraftTmgContract(value.plan) : null,
      requestKey: value.pendingDecision?.requestKey || null,
      blockingFinding: value.blockingFinding || null,
      teachSnapshotId: value.draftTeachSnapshots?.at(-1)?.snapshotId || null,
      teachPhase: value.draftTeachSnapshots?.at(-1)?.state?.phase || null });
    // File-backed stores can snapshot into immutable encoded bytes before the
    // asynchronous queue, avoiding a full graph clone followed by JSON encode.
    // Legacy/shared stores retain the existing defensive-copy contract.
    const prepared = typeof ports.store.prepareSave === 'function'
      ? ports.store.prepareSave(sessionId, value) : null;
    const snapshot = prepared ? null : copy(value);
    return serializeWrite(sessionId, async () => {
      // Pause is a control intent, not part of a stale model/checkpoint snapshot.
      // A later explicit Run clears it; ordinary saves may never revoke it.
      if (prepared) {
        await prepared.commit({ forcePause: pauseRequests.has(sessionId) });
        return;
      }
      if (pauseRequests.has(sessionId)) snapshot.pauseRequested = true;
      await ports.store.save(sessionId, snapshot);
    });
  }

  async function read(sessionId) {
    requiredId(sessionId, "ITERATIVE_ROSTER_SESSION_ID_INVALID");
    const state = await ports.store.load(sessionId);
    if (!state || state.schema !== ITERATIVE_ROSTER_PLAN_SESSION_V1
      || state.sessionId !== sessionId) {
      fail("ITERATIVE_ROSTER_SESSION_NOT_FOUND");
    }
    return ports.store.loadReturnsOwnedValue === true ? state : copy(state);
  }

  async function attachExactBudgetOptions(state, requestKey) {
    const current = state.currentCandidate;
    if (Number(state.modelContextVersion || 0) < 2 || !current
      || current.mineralSpent >= state.mineralBudget
      || state.observations.some((entry) =>
        entry.query?.kind === "exact_budget_repairs"
          && entry.query.candidateHash === current.candidateHash)) return null;
    const query = { kind: "exact_budget_repairs",
      candidateHash: current.candidateHash };
    const receipt = await ports.tools.query(query, copy(state));
    requiredHash(receipt?.receiptHash,
      "ITERATIVE_ROSTER_EXACT_BUDGET_RECEIPT_INVALID");
    if (receipt.status !== "builder_certified_exact_budget_options"
      || receipt.sourceCandidateHash !== current.candidateHash
      || receipt.exactBudgetImpossibilityClaimed !== false
      || !Array.isArray(receipt.matches)
      || receipt.matches.some((match) =>
        match.mineralSpent !== state.mineralBudget
          || typeof match.rulesVerdictHash !== "string")) {
      fail("ITERATIVE_ROSTER_EXACT_BUDGET_RECEIPT_INVALID");
    }
    const observation = { query, receipt: copy(receipt), requestKey };
    state.observations.push(observation);
    return observation;
  }

  async function attachCurrentMapRoute(state, requestKey) {
    const current = state.currentCandidate;
    if (Number(state.modelContextVersion || 0) < 2 || !current
      || current.mineralSpent !== state.mineralBudget
      || state.observations.some((entry) =>
        entry.query?.kind === "map_route"
          && entry.query.candidateHash === current.candidateHash)) return null;
    // A route audit is bound to the exact Builder-accepted candidate. Fetching
    // this deterministic evidence does not choose a strategy for the model.
    const query = { kind: "map_route", candidateHash: current.candidateHash };
    const receipt = await ports.tools.query(query, copy(state));
    requiredHash(receipt?.receiptHash,
      "ITERATIVE_ROSTER_MAP_ROUTE_RECEIPT_INVALID");
    if (receipt.candidateHash !== current.candidateHash
      || !["certified", "unknown"].includes(receipt.status)) {
      fail("ITERATIVE_ROSTER_MAP_ROUTE_RECEIPT_INVALID");
    }
    const observation = { query, receipt: copy(receipt), requestKey };
    state.observations.push(observation);
    return observation;
  }

  async function attachDeterministicEvidence(state) {
    const hostKey = hashStarcraftTmgContract({
      sessionId: state.sessionId,
      kind: "exact_budget_repairs",
      candidateHash: state.currentCandidate?.candidateHash || null,
    });
    const routeKey = hashStarcraftTmgContract({
      sessionId: state.sessionId,
      kind: "map_route",
      candidateHash: state.currentCandidate?.candidateHash || null,
    });
    const budget = await attachExactBudgetOptions(state, hostKey);
    const route = await attachCurrentMapRoute(state, routeKey);
    return Boolean(budget || route);
  }

  async function start(input = {}) {
    const sessionId = requiredId(input.sessionId,
      "ITERATIVE_ROSTER_SESSION_ID_INVALID");
    if (await ports.store.load(sessionId)) fail("ITERATIVE_ROSTER_SESSION_EXISTS");
    const mineralBudget = Number(input.mineralBudget);
    const frozenContext = input.frozenContext;
    if (!Number.isSafeInteger(mineralBudget) || mineralBudget < 1
      || !object(frozenContext)) fail("ITERATIVE_ROSTER_CONTEXT_INVALID");
    for (const field of ["mapHash", "taskHash", "sourceHash"]) {
      requiredHash(frozenContext[field], "ITERATIVE_ROSTER_CONTEXT_INVALID");
    }
    const state = {
      schema: ITERATIVE_ROSTER_PLAN_SESSION_V1,
      sessionId, status: "active", revision: 0, mineralBudget,
      frozenContext: copy(frozenContext),
      contextHash: hashStarcraftTmgContract({ mineralBudget, frozenContext }),
      currentCandidate: null, plan: null, observations: [], iterations: [],
      pendingDecision: null, pauseRequested: false, finalReview: null,
      modelContextVersion: input.teachFeedbackPolicy === "locked_roster_teach_v1" ? 5 : 20,
      teachFeedbackPolicy: input.teachFeedbackPolicy || "skill_teach_roster_coevolution_v1",
      ...(input.teachFeedbackPolicy !== "locked_roster_teach_v1" ? {
        selectionJustificationPolicyVersion: "unit_role_comparison_v1" } : {}),
      modelDecisionReceiptCount: 0,
      trainingTruth: false,
    };
    await saveState(sessionId, state);
    return copy(state);
  }

  async function pause(sessionId) {
    requiredId(sessionId, "ITERATIVE_ROSTER_SESSION_ID_INVALID");
    pauseRequests.add(sessionId);
    return serializeWrite(sessionId, async () => {
      // Read after older saves settle, so pausing cannot erase a paid reply.
      const state = await read(sessionId);
      if (state.status === "ready_for_match") return state;
      if (!["active", "paused"].includes(state.status)) {
        fail("ITERATIVE_ROSTER_RECONCILIATION_REQUIRED");
      }
      state.pauseRequested = true;
      if (!busy.has(sessionId)) state.status = "paused";
      await ports.store.save(sessionId, copy(state));
      return copy(state);
    });
  }

  async function attachTeachFeedback(sessionId, teach) {
    const state = await read(sessionId);
    if (busy.has(sessionId) || state.pendingDecision) fail("ITERATIVE_ROSTER_SESSION_BUSY");
    const source = teach?.agentSelectedStrategySource;
    if (state.teachFeedbackPolicy !== "skill_teach_roster_coevolution_v1"
      || teach?.status !== "planned" || !teach.plan?.planHash
      || teach.agentSelectedCandidateHash !== state.currentCandidate?.candidateHash
      || source?.planHash !== hashStarcraftTmgContract(state.plan)
      || source?.iterativeSessionId !== sessionId) {
      fail("ITERATIVE_ROSTER_TEACH_FEEDBACK_SOURCE_INVALID");
    }
    const acceptanceIssues = rosterTeachAcceptanceIssuesV1(teach);
    const correctiveFeedback = Number(state.modelContextVersion || 0) >= 13 && acceptanceIssues.length > 0;
    if (!correctiveFeedback && state.selectionJustificationPolicyVersion === "unit_role_comparison_v1"
      && (!teach.selectionJustification?.coverageComplete
        || !teach.selectionJustification?.referencesResolved)) {
      fail("ROSTER_SELECTION_JUSTIFICATION_INCOMPLETE");
    }
    state.teachFeedbackHistory ||= [];
    const prior = state.teachFeedbackHistory.findLast(entry =>
      entry.teachSessionId === teach.sessionId);
    const frameworkPolicyVersion = teach.teachFramework?.policyVersion || null;
    if (prior?.taughtPlan.planHash === teach.plan.planHash
      && (prior.frameworkPolicyVersion || null) === frameworkPolicyVersion
      && hashStarcraftTmgContract(prior.teachFramework?.revisionWorkOrder || null)
        === hashStarcraftTmgContract(teach.teachFramework?.state?.revisionWorkOrder || null)
      && hashStarcraftTmgContract(prior.acceptanceIssues || []) === hashStarcraftTmgContract(acceptanceIssues)) return copy(state);
    // A source repair creates a new decision snapshot, not a new army/session.
    // Preserve the accepted historical version; never overwrite a pending or
    // reopened decision while it is being evaluated.
    if (prior && !['accepted', 'pending'].includes(prior.disposition)) {
      fail("ITERATIVE_ROSTER_TEACH_FEEDBACK_CONFLICT");
    }
    if (prior?.disposition === 'pending') prior.disposition = 'superseded_evidence';
    if (Number(state.modelContextVersion || 0) < 13 && state.teachFeedbackHistory.length >= 3) {
      fail("ITERATIVE_ROSTER_TEACH_FEEDBACK_NONCONVERGENT");
    }
    const feedback = {
      teachSessionId: teach.sessionId, disposition: "pending",
      ...(Number(state.modelContextVersion || 0) >= 13 ? {
        acceptanceBlocked: correctiveFeedback, acceptanceIssues,
        instruction: correctiveFeedback
          ? 'The listed source or Teach evidence issues require resolution before acceptance. Query evidence, revise_plan, or propose a new army and Plan through Builder. An unknown query is not proof; conditional opponent hypotheses remain allowed. Reopening is permitted; a tactical preference is not a source fact. Final review remains mandatory.'
          : 'Evaluate this reviewed Plan; acceptance still applies only to this version.',
      } : {}),
      candidateHash: state.currentCandidate.candidateHash,
      sourceStrategy: copy(source), taughtPlan: copy(teach.plan),
      evidence: copy(teach.evidence || {}),
      teachCycle: copy(teach.teachCycle || teach.evidence?.teachCycle || null),
      frameworkPolicyVersion,
      ...(teach.teachFramework?.state ? { teachFramework: {
        framework: copy(teach.teachFramework.state.framework),
        coverage: copy(teach.teachFramework.state.coverage),
        agenda: copy(teach.teachFramework.state.agenda),
        evidence: copy(teach.teachFramework.state.evidence),
        investigation: copy(teach.teachFramework.state.investigation || null),
        queryRecovery: copy(teach.teachFramework.state.queryRecovery || null),
        synthesis: copy(teach.teachFramework.state.synthesis),
        revisionWorkOrder: copy(teach.teachFramework.state.revisionWorkOrder || null),
        rosterAndPlanCanBeReopened: true,
        frameworkIsNotRulesOrTacticalVeto: true,
      } } : {}),
      ...(teach.planReview?.status === "completed"
        && teach.planReview.planHash === teach.plan.planHash ? {
          feedbackReason: "post_source_review",
          sourceReview: copy(teach.planReview),
        } : {}),
      ...(prior ? { supersedesTaughtPlanHash: prior.taughtPlan.planHash } : {}),
      ...(teach.selectionJustification ? {
        selectionJustification: copy(teach.selectionJustification) } : {}),
      attachedAfterRevision: state.revision, trainingTruth: false,
    };
    if (correctiveFeedback) {
      const progress = rosterReviewProgressV1([...state.teachFeedbackHistory
        .map(entry => ({ issues: entry.acceptanceIssues || [] })), { issues: acceptanceIssues }]);
      if (progress.stop) fail('ITERATIVE_ROSTER_TEACH_FEEDBACK_NONCONVERGENT');
      feedback.progress = progress;
    }
    state.teachFeedbackHistory.push(feedback);
    state.teachFeedback = copy(feedback);
    if (teach.teachFramework?.state) state.modelContextVersion = Math.max(8, state.modelContextVersion || 0);
    state.status = "active";
    state.pauseRequested = false;
    state.blockingFinding = null;
    await saveState(sessionId, state);
    return copy(state);
  }

  function reopenTeachSnapshot(state, publicReason) {
    if (state.teachFeedback?.disposition !== "pending") return;
    const feedback = state.teachFeedbackHistory.findLast(entry =>
      entry.teachSessionId === state.teachFeedback.teachSessionId
        && entry.taughtPlan.planHash === state.teachFeedback.taughtPlan.planHash);
    feedback.disposition = "reopened";
    feedback.publicReason = publicReason;
    feedback.decidedAtRevision = state.revision + 1;
    state.teachFeedback = copy(feedback);
    // Only the current snapshot becomes obsolete; paid history never resets.
    state.arrivalSnapshotHistory ||= [];
    state.arrivalSnapshotHistory.push({ candidateHash: feedback.candidateHash,
      strategyHash: feedback.sourceStrategy.planHash,
      schedule: copy(state.openingDeploymentSchedule || null),
      publicRevision: copy(state.arrivalPublicRevision || null),
      arrivalAttemptCount: state.arrivalAttemptCount || 0,
      publicRevisionAttemptCount: state.publicRevisionAttemptCount || 0 });
    state.openingDeploymentSchedule = null;
    state.arrivalPublicRevision = null;
    state.arrivalRejection = null;
    state.publicRevisionRejection = null;
    state.finalReview = null;
  }

  function upgradeSettledFeedbackContext(state) {
    if (state.modelContextVersion === 19 && !state.pendingDecision) {
      const body = { fromVersion: 19, toVersion: 20, afterRevision: state.revision,
        reason: 'typed_plan_field_edits_instead_of_claimed_whole_document_revisions',
        existingIterationsRetained: state.iterations.length,
        existingPaidReceiptCountRetained: state.modelDecisionReceiptCount };
      state.feedbackContextMigrations ||= [];
      state.feedbackContextMigrations.push({ ...body, receiptHash: hashStarcraftTmgContract(body) });
      state.modelContextVersion = 20;
      return true;
    }
    if (state.modelContextVersion === 18 && !state.pendingDecision) {
      const body = { fromVersion: 18, toVersion: 19, afterRevision: state.revision,
        reason: 'evidence_driven_draft_handoff_after_plan_revision',
        existingIterationsRetained: state.iterations.length,
        existingPaidReceiptCountRetained: state.modelDecisionReceiptCount };
      state.feedbackContextMigrations ||= [];
      state.feedbackContextMigrations.push({ ...body, receiptHash: hashStarcraftTmgContract(body) });
      state.modelContextVersion = 19;
      return true;
    }
    if (state.modelContextVersion === 17 && !state.pendingDecision) {
      const body = { fromVersion: 17, toVersion: 18, afterRevision: state.revision,
        reason: 'current_operation_failure_separate_from_prior_query_evidence',
        existingIterationsRetained: state.iterations.length,
        existingPaidReceiptCountRetained: state.modelDecisionReceiptCount };
      state.feedbackContextMigrations ||= [];
      state.feedbackContextMigrations.push({ ...body, receiptHash: hashStarcraftTmgContract(body) });
      state.modelContextVersion = 18;
      return true;
    }
    if (state.modelContextVersion === 16 && !state.pendingDecision) {
      const body = { fromVersion: 16, toVersion: 17, afterRevision: state.revision,
        reason: 'explicit_latest_query_result_turn_before_retained_history',
        existingIterationsRetained: state.iterations.length,
        existingPaidReceiptCountRetained: state.modelDecisionReceiptCount };
      state.feedbackContextMigrations ||= [];
      state.feedbackContextMigrations.push({ ...body, receiptHash: hashStarcraftTmgContract(body) });
      state.modelContextVersion = 17;
      return true;
    }
    if (state.modelContextVersion === 15 && !state.pendingDecision) {
      const body = { fromVersion: 15, toVersion: 16, afterRevision: state.revision,
        reason: 'source_bound_teach_scenes_available_to_roster_selector',
        existingIterationsRetained: state.iterations.length,
        existingPaidReceiptCountRetained: state.modelDecisionReceiptCount };
      state.feedbackContextMigrations ||= [];
      state.feedbackContextMigrations.push({ ...body, receiptHash: hashStarcraftTmgContract(body) });
      state.modelContextVersion = 16;
      return true;
    }
    if (state.modelContextVersion === 14 && !state.pendingDecision) {
      const body = { fromVersion: 14, toVersion: 15, afterRevision: state.revision,
        reason: 'typed_query_arm_decoding_and_semantic_evidence_identity',
        existingIterationsRetained: state.iterations.length,
        existingPaidReceiptCountRetained: state.modelDecisionReceiptCount };
      state.feedbackContextMigrations ||= [];
      state.feedbackContextMigrations.push({ ...body, receiptHash: hashStarcraftTmgContract(body) });
      state.modelContextVersion = 15;
      return true;
    }
    if ([7, 8, 9, 10, 11, 12, 13].includes(state.modelContextVersion) && !state.pendingDecision) {
      const body = { fromVersion: state.modelContextVersion, toVersion: 14,
        afterRevision: state.revision,
        reason: "lossless_same_prompt_evidence_interning_and_issue_scoped_progress",
        existingIterationsRetained: state.iterations.length,
        existingPaidReceiptCountRetained: state.modelDecisionReceiptCount };
      state.feedbackContextMigrations ||= [];
      state.feedbackContextMigrations.push({ ...body, receiptHash: hashStarcraftTmgContract(body) });
      state.modelContextVersion = 14;
      return true;
    }
    if (state.modelContextVersion !== 3 || state.pendingDecision) return false;
    const body = { fromVersion: 3, toVersion: 4, afterRevision: state.revision,
      reason: "official_menu_gas_ledger_added_to_rejected_proposal",
      existingIterationsRetained: state.iterations.length,
      existingPaidReceiptCountRetained: state.modelDecisionReceiptCount };
    state.feedbackContextMigrations ||= [];
    state.feedbackContextMigrations.push({ ...body,
      receiptHash: hashStarcraftTmgContract(body) });
    state.modelContextVersion = 4;
    return true;
  }


  async function prepare(sessionId) {
    const state = await read(sessionId);
    if (busy.has(sessionId) || state.pendingDecision) {
      fail("ITERATIVE_ROSTER_SESSION_BUSY");
    }
    busy.add(sessionId);
    try {
      const upgraded = upgradeSettledFeedbackContext(state);
      if (await attachDeterministicEvidence(state) || upgraded) {
        await saveState(sessionId, state);
      }
      return copy(state);
    } finally {
      busy.delete(sessionId);
    }
  }

  async function resume(sessionId, options = {}) {
    if (busy.has(sessionId)) fail("ITERATIVE_ROSTER_SESSION_BUSY");
    // Clear only the intent that predates this Run, not a pause arriving while
    // its initial read or subsequent checkpoint is in flight.
    pauseRequests.delete(sessionId);
    let state = await read(sessionId);
    if (state.status === "ready_for_match") return state;
    if (busy.has(sessionId)) fail("ITERATIVE_ROSTER_SESSION_BUSY");
    // Old paid replies keep their original context projection for exact
    // recovery. Upgrade this existing live session only after revision 21
    // has settled; all newly started sessions use the compact projection.
    if (!state.modelContextVersion && state.revision >= 21
      && !state.pendingDecision) {
      state.modelContextVersion = 2;
    }
    // The rejected-candidate repair prompt changes the paid context. Upgrade
    // only between decisions; an in-flight v2 reply must recover under v2.
    if (state.modelContextVersion === 2 && !state.pendingDecision) {
      state.modelContextVersion = 3;
    }
    upgradeSettledFeedbackContext(state);
    const lastIteration = state.iterations.at(-1);
    const capacityRejection = state.observations.findLast(row =>
      row.requestKey === lastIteration?.requestKey
      && row.receipt?.status === 'known_provider_context_rejection');
    const correctedCapacityContext = state.status === 'requires_reconciliation'
      && !state.pendingDecision && lastIteration?.decisionKind === 'repair_needed'
      && capacityRejection?.receipt.failureCode === 'ITERATIVE_ROSTER_PROVIDER_CONTEXT_REJECTED'
      && lastIteration.modelContextVersion < state.modelContextVersion
      && Number(state.modelContextVersion || 0) >= 14;
    const retainedRecovery = state.status === "requires_reconciliation"
      && Boolean(state.pendingDecision)
      && typeof ports.model.recover === "function";
    const retainedReconciliation = (state.status === "requires_reconciliation"
      && options.advanceAfterKnownInvalid !== true
      || (options.preferRetainedRepair === true
        && ["active", "paused"].includes(state.status)))
      && !correctedCapacityContext && !state.pendingDecision
      && state.iterations.at(-1)?.decisionKind === "repair_needed"
      && typeof ports.model.reconcile === "function";
    const advanceAfterKnownInvalid = state.status === "requires_reconciliation"
      && (options.advanceAfterKnownInvalid === true || correctedCapacityContext)
      && !state.pendingDecision
      && state.iterations.at(-1)?.decisionKind === "repair_needed";
    if (!["active", "paused"].includes(state.status)
      && !retainedRecovery && !retainedReconciliation
      && !advanceAfterKnownInvalid) {
      fail("ITERATIVE_ROSTER_RECONCILIATION_REQUIRED");
    }
    const recovering = Boolean(state.pendingDecision);
    if (recovering) {
      // The external model adapter must recover this exact request key from
      // its retained reply. An ambiguous dispatched attempt is never sent
      // again by this module.
      if (typeof ports.model.recover !== "function") {
        fail("ITERATIVE_ROSTER_PENDING_DECISION_RECONCILIATION_REQUIRED");
      }
    }
    busy.add(sessionId);
    try {
      const hadPersistedPause = state.pauseRequested === true || state.status === 'paused';
      state.status = "active";
      state.pauseRequested = pauseRequests.has(sessionId);
      if (state.pauseRequested) {
        state.status = 'paused';
        await saveState(sessionId, state);
        return copy(state);
      }
      if (hadPersistedPause) await saveState(sessionId, state);
      if (!recovering && !retainedReconciliation) {
        if (await attachDeterministicEvidence(state)) {
          await saveState(sessionId, state);
        }
        state.planAlignment = projectIterativeRosterPlanAlignmentV1(state);
        if (!state.planAlignment && state.teachFeedback?.disposition !== 'pending'
          && Number(state.modelContextVersion || 0) >= 12 && state.currentCandidate && state.plan
          && state.teachFeedbackPolicy !== 'locked_roster_teach_v1') {
          if (typeof ports.review.draft !== 'function') fail('ITERATIVE_DRAFT_TEACH_PORT_MISSING');
          const shouldPause = async () => pauseRequests.has(sessionId)
            || (await read(sessionId)).pauseRequested === true;
          state = await ports.review.draft(copy(state), async next => {
            const latest = await read(sessionId);
            next.pauseRequested ||= latest.pauseRequested;
            await saveState(sessionId, next);
          }, { shouldPause });
          state.blockingFinding = null;
          if (await shouldPause()) {
            state.status = 'paused'; state.pauseRequested = false;
            await saveState(sessionId, state);
            return copy(state);
          }
          await saveState(sessionId, state);
        }
      }
      const sourceRequestKey = state.pendingDecision?.sourceRequestKey
        || (retainedReconciliation
          ? state.iterations.at(-1).requestKey : null);
      const requestKey = state.pendingDecision?.requestKey
        || hashStarcraftTmgContract({ sessionId,
          contextHash: state.contextHash, nextRevision: state.revision + 1,
          precedingReceiptHash: state.iterations.at(-1)?.receiptHash || null,
          sourceRequestKey });
      state.pendingDecision = { requestKey,
        nextRevision: state.revision + 1,
        ...(sourceRequestKey ? { sourceRequestKey } : {}) };
      await saveState(sessionId, state);
      let reply;
      try {
        reply = recovering
          ? await ports.model.recover({ requestKey, sourceRequestKey,
            state: copy(state) })
          : retainedReconciliation
            ? await ports.model.reconcile({ requestKey, sourceRequestKey,
              state: copy({ ...state, pendingDecision: null }) })
          : await ports.model.decide({ requestKey,
            state: copy({ ...state, pendingDecision: null }) });
      } catch (error) {
        state = await read(sessionId);
        state.status = "requires_reconciliation";
        if (!recovering && retainedReconciliation
          && error.code === 'ITERATIVE_ROSTER_RECONCILIATION_LIMIT_REACHED') {
          // The model port emitted this BEFORE retaining or dispatching a new
          // request. It is known invalid evidence, not an unknown paid send.
          state.retainedRevalidationHistory ||= [];
          state.retainedRevalidation = { sourceRequestKey,
            requestKey, modelContextVersion: state.modelContextVersion,
            code: error.code, paidProviderCall: false, sourceReplyUnchanged: true };
          state.retainedRevalidationHistory.push(copy(state.retainedRevalidation));
          state.pendingDecision = null;
          await saveState(sessionId, state);
          throw error;
        }
        state.pendingDecision.recoveryRequired = true;
        await saveState(sessionId, state);
        throw error;
      }
      if (reply?.outcome !== "completed"
        || typeof reply.receiptHash !== "string"
        || !object(reply.decision)) {
        state = await read(sessionId);
        state.status = "requires_reconciliation";
        state.pendingDecision.recoveryRequired = true;
        await saveState(sessionId, state);
        fail("ITERATIVE_ROSTER_MODEL_OUTCOME_UNKNOWN");
      }
      state = await read(sessionId);
      let decision = copy(reply.decision);
      const formalEvidenceTransfer = decision.kind === 'revise_plan'
        && state.teachFeedback?.acceptanceIssues?.some(i => i.kind === 'teach_question')
        && !state.teachFeedback?.formalEvidenceRepairRequested;
      const formalRepairTransfer = decision.kind === 'revise_plan'
        && state.teachFeedback?.disposition === 'pending'
        && state.teachFeedback.acceptanceBlocked === true
        && state.teachFeedback.feedbackReason === 'post_source_review'
        && state.teachFeedback.candidateHash === state.currentCandidate?.candidateHash
        && state.teachFeedback.sourceStrategy?.planHash === hashStarcraftTmgContract(state.plan)
        && (formalEvidenceTransfer
          || state.teachFeedback.acceptanceIssues?.some(i => i.kind === 'source_finding'));
      if (!formalRepairTransfer && decision.kind === 'revise_plan' && state.currentCandidate && state.plan
        && ['retain', 'revise'].includes(decision.assumptionDisposition)) {
        const proposed = publicPlan({ ...decision.plan,
          assumptionDisposition: decision.assumptionDisposition },
        state.currentCandidate.candidateHash, state.plan, state.observations);
        if (operationalPlanIdentity(proposed) === operationalPlanIdentity(state.plan)) {
          // A parsed reply is not progress. Feed an exact no-op back through the
          // SAME bounded output-repair lane, before reopening Teach or changing
          // Plan state. Keep the paid reply/receipt and let the agent choose.
          decision = { kind: 'repair_needed',
            failureCode: 'ITERATIVE_ROSTER_PLAN_REVISION_UNCHANGED',
            providerReplyHash: hashStarcraftTmgContract(reply.decision),
            diagnostics: { canonicalPlanUnchanged: true, armyUnchanged: true,
              revisionExplanationChanged: proposed.strategy?.revisionReason !== state.plan.strategy?.revisionReason,
              currentPlanHash: hashStarcraftTmgContract(state.plan),
              inputAdjustments: copy(decision.inputAdjustments || []),
              hostChoosesNextDecision: false,
              instruction: 'This revise_plan changes no operational Plan field. Editing revisionReason or retain/revise labels alone cannot count as strategy progress; the original explanation is retained with the paid reply. Do not resend or merely paraphrase it. Read the retained Teach/issues and choose a relevant query, an actual Plan/army change, or finish only when its existing requirements are met. If new evidence changes an opening, role, counterplan or assumption, update that actual field, not just revisionReason. Keeping a defensible strategy is allowed; facts and unresolved evidence must not be invented to force a change.' } };
        }
      }
      if (decision.kind !== "repair_needed") state.blockingFinding = null;
      const toolReceipts = [];
      let verdict = null;
      if (formalRepairTransfer) {
        // An old in-flight selector reply cannot edit formal component claims.
        // Retain it verbatim as an unapplied proposal, then resume the owning
        // Plan tools. Do not reset the army, arrival schedule or paid review.
        const body = { status:'rerouted_unapplied',routedTo:formalEvidenceTransfer ? 'formal_teach_evidence' : 'formal_plan_tools',
          proposedDecisionHash:hashStarcraftTmgContract(decision),
          modelReceiptHash:reply.receiptHash,teachSessionId:state.teachFeedback.teachSessionId,
          currentPlanHash:hashStarcraftTmgContract(state.plan),armyUnchanged:true,
          reason:formalEvidenceTransfer
            ? 'Formal factual questions require their retained evidence investigation before Plan edits; the provisional draft is not the current formal Plan'
            : 'Formal source claim paths cannot be written by provisional planEdits',trainingTruth:false };
        if (formalEvidenceTransfer) state.teachFeedback.formalEvidenceRepairRequested = true;
        const observation={query:{kind:'formal_plan_repair_transfer'},requestKey,
          receipt:{...body,receiptHash:hashStarcraftTmgContract(body)}};
        state.observations.push(observation);toolReceipts.push(observation);
        state.status='paused';state.blockingFinding='ITERATIVE_ROSTER_FORMAL_SOURCE_REPAIR_REQUIRED';
      } else if (decision.kind === "repair_needed") {
        if (typeof decision.failureCode !== "string"
          || !decision.failureCode.trim()) {
          fail("ITERATIVE_ROSTER_REPAIR_RECEIPT_INVALID");
        }
        const receipt = { status: decision.failureCode === "ITERATIVE_ROSTER_PROVIDER_CONTEXT_REJECTED"
          ? "known_provider_context_rejection" : "known_paid_output_rejected",
          failureCode: decision.failureCode,
          diagnostics: decision.diagnostics || null,
          providerReplyHash: decision.providerReplyHash || null,
          receiptHash: reply.receiptHash };
        const observation = { query: { kind: "model_output_repair" },
          receipt, requestKey };
        state.observations.push(observation);
        toolReceipts.push(observation);
        const progress = Number(state.modelContextVersion || 0) >= 13
          ? rosterRepairProgressV1(state, decision.failureCode) : null;
        if (progress) { observation.receipt.progress = progress; state.progress = copy(progress); }
        const latestRepairs = state.iterations.slice(-2).every((entry) =>
          entry.decisionKind === "repair_needed");
        if (advanceAfterKnownInvalid
          || decision.failureCode === 'ITERATIVE_ROSTER_PROVIDER_CONTEXT_REJECTED'
          || (progress ? progress.stop : state.iterations.length >= 2 && latestRepairs)) {
          state.status = "requires_reconciliation";
          state.blockingFinding = "ITERATIVE_ROSTER_OUTPUT_DID_NOT_CONVERGE";
        }
      } else if (decision.kind === "query") {
        if (!Array.isArray(decision.queries) || decision.queries.length < 1
          || decision.queries.length > 8
          || typeof decision.question !== "string") {
          fail("ITERATIVE_ROSTER_QUERY_INVALID");
        }
        if (decision.queries.some((query) => (
          query?.kind === "map_route"
          && (!state.currentCandidate
            || query.candidateHash !== state.currentCandidate.candidateHash)))) {
          fail("ITERATIVE_ROSTER_MAP_QUERY_STALE_CANDIDATE");
        }
        for (const ignored of decision.ignoredQueries || []) {
          const receiptBody = { status: "ignored_invalid_subquery",
            queryKind: ignored.kind, reason: ignored.reason,
            ...(ignored.capabilityOutcome ? { capabilityOutcome: copy(ignored.capabilityOutcome),
              originalQuery: copy(ignored.query) } : {}),
            modelReceiptHash: reply.receiptHash };
          const observation = { query: { kind: "ignored_model_query" },
            receipt: { ...receiptBody,
              receiptHash: hashStarcraftTmgContract(receiptBody) },
            requestKey };
          state.observations.push(observation);
          toolReceipts.push(observation);
        }
        const separatedStore = typeof ports.store.loadQueryBatch === 'function'
          && typeof ports.store.saveQueryBatch === 'function';
        const receipts = await executeRosterQueryBatchV1({ requestKey,
          candidateHash: state.currentCandidate?.candidateHash || null,
          frozenContext: state.frozenContext, queries: decision.queries,
          load: key => separatedStore ? ports.store.loadQueryBatch(key)
            : Promise.resolve(state.queryBatchCheckpoint?.binding.requestKey === key
              ? state.queryBatchCheckpoint : null),
          save: async (key, batch) => {
            if (separatedStore) return ports.store.saveQueryBatch(key, batch);
            // Legacy in-memory adapters use the same checkpoint contract.
            const saved = await read(sessionId);
            saved.queryBatchCheckpoint = batch;
            await saveState(sessionId, saved);
          },
          execute: async query => {
          if (query.kind !== "teach_evidence") return ports.tools.query(copy(query), copy(state));
          try { return readIterativeRosterTeachEvidenceV1(state, JSON.parse(query.argumentsJson)); }
          catch (error) {
            const body = { status: 'unknown', readOnly: true,
              reason: String(error.code || error.message), trainingTruth: false };
            return { ...body, receiptHash: hashStarcraftTmgContract(body) };
          }
        } });
        state.queryBatchFailure = null;
        for (let index = 0; index < receipts.length; index += 1) {
          const receipt = receipts[index];
          requiredHash(receipt?.receiptHash,
            "ITERATIVE_ROSTER_TOOL_RECEIPT_INVALID");
          const observation = { query: copy(decision.queries[index]),
            receipt: copy(receipt), requestKey };
          state.observations.push(observation);
          toolReceipts.push(observation);
        }
      } else if (decision.kind === "propose") {
        if (!object(decision.candidateInput)
          || !["retain", "revise"].includes(
            decision.assumptionDisposition)) {
          fail("ITERATIVE_ROSTER_PROPOSAL_INVALID");
        }
        if (state.plan && decision.assumptionDisposition === "retain"
          && decision.plan?.victoryRoute !== state.plan.victoryRoute) {
          const receiptBody = { status: "draft_route_wording_changed_while_retained",
            previousPlanHash: hashStarcraftTmgContract(state.plan),
            modelReceiptHash: reply.receiptHash,
            requiresTeachResolution: true };
          const observation = { query: { kind: "model_route_warning" },
            receipt: { ...receiptBody,
              receiptHash: hashStarcraftTmgContract(receiptBody) },
            requestKey };
          state.observations.push(observation);
          toolReceipts.push(observation);
        }
        if (decision.ignoredEvidenceHash) {
          const receiptBody = { status: "ignored_unbound_model_map_hash",
            ignoredHash: decision.ignoredEvidenceHash,
            modelReceiptHash: reply.receiptHash };
          const observation = { query: { kind: "model_evidence_warning" },
            receipt: { ...receiptBody,
              receiptHash: hashStarcraftTmgContract(receiptBody) },
            requestKey };
          state.observations.push(observation);
          toolReceipts.push(observation);
        }
        verdict = await ports.builder.evaluate(
          copy(decision.candidateInput), copy(state));
        const candidateHash = hashStarcraftTmgContract(decision.candidateInput);
        if (!object(verdict) || typeof verdict.legal !== "boolean"
          || verdict.candidateHash !== candidateHash
          || verdict.mineralBudget !== state.mineralBudget
          || !["legal", "illegal", "invalid_candidate", "unknown"]
            .includes(verdict.status)
          || (verdict.legal && (verdict.status !== "legal"
            || !Number.isSafeInteger(verdict.mineralSpent)
            || verdict.mineralSpent > state.mineralBudget
            || verdict.mineralSpent < 0
            || typeof verdict.verdictHash !== "string"))
          || (!verdict.legal && (verdict.status === "legal"
            || verdict.mineralSpent !== null
            || typeof verdict.receiptHash !== "string"))) {
          fail("ITERATIVE_ROSTER_RULES_VERDICT_INVALID");
        }
        if (verdict.legal) {
          const previousPlan = state.plan;
          const proposedPlan = publicPlan({ ...decision.plan,
            assumptionDisposition: decision.assumptionDisposition }, candidateHash,
          previousPlan, state.observations);
          reopenTeachSnapshot(state, decision.plan?.strategy?.revisionReason
            || decision.plan?.victoryRoute);
          state.currentCandidate = { input: copy(decision.candidateInput),
            candidateHash, mineralSpent: verdict.mineralSpent,
            verdictHash: requiredHash(verdict.verdictHash,
              "ITERATIVE_ROSTER_RULES_VERDICT_INVALID") };
          state.plan = proposedPlan;
          if (verdict.mineralSpent < state.mineralBudget) {
            if (Number(state.modelContextVersion || 0) >= 2) {
              const observation = await attachExactBudgetOptions(state,
                requestKey);
              if (observation) toolReceipts.push(observation);
            } else {
              const query = { kind: "budget_branches", candidateHash,
                mineralShortfall: state.mineralBudget - verdict.mineralSpent };
              const receipt = await ports.tools.query(query, copy(state));
              requiredHash(receipt?.receiptHash,
                "ITERATIVE_ROSTER_TOOL_RECEIPT_INVALID");
              if (receipt.exactBudgetImpossibilityClaimed !== false) {
                fail("ITERATIVE_ROSTER_FALSE_IMPOSSIBILITY_CLAIM");
              }
              const observation = { query, receipt: copy(receipt), requestKey };
              state.observations.push(observation);
              toolReceipts.push(observation);
            }
          }
        } else {
          state.observations.push({ query: { kind: "builder_verdict",
            candidateHash }, receipt: { status: verdict.status,
            receiptHash: verdict.receiptHash,
            rejectionKind: verdict.rejectionKind ?? null,
            rulesErrorCode: verdict.rulesErrorCode ?? null,
            rulesErrorDetail: verdict.rulesErrorDetail ?? null,
            portErrorCode: verdict.portErrorCode ?? null,
            portErrorDetail: verdict.portErrorDetail ?? null }, requestKey });
        }
      } else if (decision.kind === 'revise_plan') {
        if (Number(state.modelContextVersion || 0) < 12 || !state.currentCandidate
          || !object(decision.plan) || !['retain', 'revise'].includes(decision.assumptionDisposition)) {
          fail('ITERATIVE_ROSTER_PLAN_REVISION_INVALID');
        }
        reopenTeachSnapshot(state, decision.plan.strategy?.revisionReason || decision.plan.victoryRoute);
        state.plan = publicPlan({ ...decision.plan, assumptionDisposition: decision.assumptionDisposition },
          state.currentCandidate.candidateHash, state.plan, state.observations);
      } else if (decision.kind === "finish") {
        if (!state.currentCandidate || !object(decision.plan)
          || !["retain", "revise"].includes(
            decision.assumptionDisposition)) {
          fail("ITERATIVE_ROSTER_FINISH_PLAN_INVALID");
        }
        reopenTeachSnapshot(state, decision.plan?.strategy?.revisionReason
          || decision.plan?.victoryRoute);
        state.plan = publicPlan({ ...decision.plan,
          assumptionDisposition: decision.assumptionDisposition },
        state.currentCandidate.candidateHash, state.plan,
        state.observations);
        state.planAlignment = projectIterativeRosterPlanAlignmentV1(state);
        if (state.planAlignment) {
          const body = { status: 'plan_alignment_required', ...copy(state.planAlignment),
            modelReceiptHash: reply.receiptHash, finalAcceptance: false };
          const observation = { query: { kind: 'plan_alignment' },
            receipt: { ...body, receiptHash: hashStarcraftTmgContract(body) }, requestKey };
          state.observations.push(observation); toolReceipts.push(observation);
          state.status = 'active'; state.blockingFinding = null;
        } else {
        if (!state.currentCandidate || !state.plan
          || state.currentCandidate.mineralSpent !== state.mineralBudget
          || state.plan.candidateHash !== state.currentCandidate.candidateHash
          || !state.plan.mapEvidenceHash
          || !state.observations.some((entry) => (
            entry.query.kind === "map_route"
            && entry.query.candidateHash
              === state.currentCandidate.candidateHash
            && ["exact", "certified", "advisory"].includes(
              entry.receipt.status)
            &&
            entry.receipt.receiptHash === state.plan.mapEvidenceHash))) {
          fail("ITERATIVE_ROSTER_NOT_READY_FOR_MATCH");
        }
        const review = await ports.review.final(copy(state));
        if (!Array.isArray(review?.blockingFindings)) {
          fail("ITERATIVE_ROSTER_FINAL_REVIEW_INVALID");
        }
        const reviewHash = requiredHash(review.reviewHash,
          "ITERATIVE_ROSTER_FINAL_REVIEW_INVALID");
        state.finalReview = { reviewHash,
          blockingFindings: copy(review.blockingFindings) };
        if (review.blockingFindings.length > 0) {
          // A known completed model call and a review rejection are both
          // durable evidence. They cannot be retried under the same key.
          const observation = { query: { kind: "final_review" },
            receipt: { status: "blocked", receiptHash: reviewHash,
              blockingFindings: copy(review.blockingFindings) }, requestKey };
          state.observations.push(observation);
          toolReceipts.push(observation);
          state.status = "paused";
          state.blockingFinding = "ITERATIVE_ROSTER_FINAL_REVIEW_BLOCKED";
        } else {
          state.status = "ready_for_match";
          state.blockingFinding = null;
        }
        }
      } else if (decision.kind === "accept_teach") {
        const feedback = state.teachFeedback;
        if (feedback?.acceptanceBlocked) fail('ITERATIVE_ROSTER_TEACH_SOURCE_REPAIR_REQUIRED');
        if (feedback?.disposition !== "pending"
          || feedback.candidateHash !== state.currentCandidate?.candidateHash
          || typeof decision.publicReason !== "string" || !decision.publicReason.trim()) {
          fail("ITERATIVE_ROSTER_TEACH_ACCEPTANCE_INVALID");
        }
        const entry = state.teachFeedbackHistory.findLast(value =>
          value.teachSessionId === feedback.teachSessionId
            && value.taughtPlan.planHash === feedback.taughtPlan.planHash);
        entry.disposition = "accepted";
        entry.publicReason = decision.publicReason;
        entry.decidedAtRevision = state.revision + 1;
        state.teachFeedback = copy(entry);
        state.status = "paused";
        state.blockingFinding = "ITERATIVE_ROSTER_TEACH_ACCEPTED";
      } else {
        fail("ITERATIVE_ROSTER_DECISION_KIND_INVALID");
      }
      const receiptBody = { revision: state.revision + 1, requestKey,
        modelContextVersion: state.modelContextVersion || null,
        modelReceiptHash: reply.receiptHash,
        reconciledFromRequestKey: reply.reconciledFromRequestKey || null,
        decisionHash: hashStarcraftTmgContract(decision),
        decisionKind: decision.kind,
        ...(Number(state.modelContextVersion || 0) >= 6 ? {
          publicDecision: copy(decision),
          candidateSnapshot: copy(state.currentCandidate),
          planSnapshot: copy(state.plan),
        } : {}),
        rulesVerdictHash: verdict?.verdictHash || verdict?.receiptHash || null,
        rulesVerdictStatus: verdict?.status || null,
        toolReceiptHashes: toolReceipts.map((entry) => (
          entry.receipt.receiptHash)),
        currentCandidateHash: state.currentCandidate?.candidateHash || null,
        planHash: state.plan ? hashStarcraftTmgContract(state.plan) : null,
        status: state.status, trainingTruth: false };
      state.iterations.push({ ...receiptBody,
        receiptHash: hashStarcraftTmgContract(receiptBody) });
      state.revision += 1;
      state.planAlignment = projectIterativeRosterPlanAlignmentV1(state);
      state.pendingDecision = null;
      state.modelDecisionReceiptCount += 1;
      const latest = await read(sessionId);
      if ((pauseRequests.has(sessionId) || latest.pauseRequested) && state.status === "active") {
        state.status = "paused";
      }
      state.pauseRequested = false;
      await saveState(sessionId, state);
      return copy(state);
    } catch (error) {
      if (error.capabilityReceipt || error.queryBatchFailure) {
        // Keep the failed native operation observable even when its authority
        // failure must stop this step. The paid reply remains recoverable;
        // no network request or Builder verdict is silently substituted.
        const saved = await read(sessionId);
        saved.toolExecutionFailures ||= [];
        if (error.capabilityReceipt && !saved.toolExecutionFailures.some(row => row.receipt?.receiptHash === error.capabilityReceipt.receiptHash
          && row.requestKey === saved.pendingDecision?.requestKey)) {
          saved.toolExecutionFailures.push({ query: copy(error.capabilityQuery),
            receipt: copy(error.capabilityReceipt),
            requestKey: saved.pendingDecision?.requestKey || null });
        }
        if (error.queryBatchFailure) saved.queryBatchFailure = copy(error.queryBatchFailure);
        saved.status = 'requires_reconciliation';
        saved.blockingFinding = 'ITERATIVE_ROSTER_TOOL_EXECUTION_FAILED';
        if (saved.pendingDecision) saved.pendingDecision.recoveryRequired = true;
        await saveState(sessionId, saved);
      }
      throw error;
    } finally {
      busy.delete(sessionId);
    }
  }

  async function releaseUnsentDecision(sessionId) {
    if (busy.has(sessionId)) fail('ITERATIVE_ROSTER_SESSION_BUSY');
    busy.add(sessionId);
    try {
      const state=await read(sessionId), pending=state.pendingDecision;
      if (!pending || pending.sourceRequestKey
        || typeof ports.model.proveUnsentRequest!=='function') return state;
      const proof=await ports.model.proveUnsentRequest({requestKey:pending.requestKey,state:copy(state)});
      if (proof?.status!=='not_dispatched' || proof.requestKey!==pending.requestKey
        || proof.sessionId!==sessionId || proof.nextRevision!==pending.nextRevision
        || pending.nextRevision!==state.revision+1) return state;
      const current=await read(sessionId);
      if (current.revision!==state.revision || hashStarcraftTmgContract(current.pendingDecision)
        !==hashStarcraftTmgContract(pending)) fail('ITERATIVE_ROSTER_UNSENT_RELEASE_STALE');
      current.unsentDecisionReleases ||= [];
      current.unsentDecisionReleases.push({requestKey:pending.requestKey,proof:copy(proof),
        revision:current.revision,reason:'recheck_persisted_stage_before_new_dispatch',
        paidReplyDiscarded:false,armyOrPlanChanged:false});
      current.pendingDecision=null;
      await saveState(sessionId,current);
      return copy(current);
    } finally {busy.delete(sessionId);}
  }

  async function recordJourneyCheckpoint(sessionId, detail) {
    if (busy.has(sessionId)) fail('ITERATIVE_ROSTER_SESSION_BUSY');
    const state = await read(sessionId);
    state.journeyCheckpoint ||= {};
    recordRosterPlanningCheckpointV1(state.journeyCheckpoint, { ...copy(detail),
      revision: state.revision, candidateHash: state.currentCandidate?.candidateHash || null,
      planHash: state.plan ? hashStarcraftTmgContract(state.plan) : null,
      pendingRequestKey: state.pendingDecision?.requestKey || null });
    await saveState(sessionId, state);
  }
  return Object.freeze({ start, resume, pause, prepare, read, attachTeachFeedback, recordJourneyCheckpoint, releaseUnsentDecision });
}
