// Discover CURRENT tool contracts. This is invocation guidance, not strategy,
// a rules implementation, or evidence that a hypothetical action was executed.
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { projectRosterTeachQuestionProgressV1 } from './roster-teach-question-progress-v1.mjs';
import { assessRosterTeachEvidenceReadinessV1 } from './roster-teach-evidence-readiness-v1.mjs';
import { retireRosterTeachUnsentDownstreamCallV1 } from './roster-teach-call-checkpoint-v1.mjs';
export const ROSTER_TEACH_CAPABILITY_GUIDE_VERSION = 1;
// v2 delivers the retained branch context in the current prompt and exposes the
// implemented branch selector. A prior v1 continuation cannot validate this fix.
export const ROSTER_TEACH_TOOL_CATALOG_VERSION = 2;

// Scope comes from product authority, not the experimental arm's name. Both
// modes scrutinize the same Plan evidence; only editable rosters have a buying
// decision to justify. This is not a verdict on any existing question/answer.
export function projectRosterTeachDecisionScopeV1(context = {}) {
  const editable = context.rosterEditAuthority === 'agent_may_reselect_after_evidence';
  const fixed = context.rosterEditAuthority === 'preset_immutable';
  return {
    kind: 'planning_decision_scope', version: 2,
    rosterEditAuthority: context.rosterEditAuthority || 'unspecified',
    rosterChangesAllowed: editable, requireProcurementComparison: editable,
    planChangesAllowed: editable || fixed,
    arrivalScheduleChangesAllowed: editable || fixed,
    scheduleAuthority: 'model_chosen_rules_checked_proposal_not_rules_earliest_or_actual_arrival',
    revisionBoundary: 'Keep evidence snapshots unchanged. Propose Plan and arrival-schedule changes for the owning revision tools; validate changed schedules with Rules before use. The chosen schedule is not a rule forbidding earlier deployment. Preset mode locks army composition, not strategy or arrival timing. A read-only reviewer may propose changes but cannot claim they were applied. A coverage gap is not justified merely because the current proposal is frozen for this evidence snapshot.',
    requiredPlanEvidence: ['unit_and_upgrade_use', 'scoring_route', 'terrain_and_control',
      'activation_and_arrival_sequence', 'ability_and_card_payment', 'opponent_responses',
      'casualty_consequences', 'contingencies_and_switch_conditions'],
    autoResolveUnknown: false,
    instruction: fixed
      ? 'The roster is supplied, not a purchase decision. Explain how to use its actual units/upgrades and compare deployment, activation, target, CP/card and timing alternatives. Mineral/vespene totals describe the supplied legal roster; hypothetical buying comparisons are optional diagnostics, not prerequisites for accepting its Plan. For an old question about what to buy or remove, explicitly mark only that procurement subquestion outside this task in publicReason/frameworkFeedback and assess any operational claim separately. Do not answer an unknown fact as proved, erase its evidence, change the roster, or use fixed-roster status to excuse a missing operational rationale.'
      : editable
        ? 'Choose and justify both roster and Plan. Compare meaningful purchase/replacement alternatives with Native costs and legality under stated common scenarios; explain how selected units/upgrades serve the scoring route. The retained evidence snapshot does not prohibit revising the roster. Operational evidence requirements are identical to supplied-roster planning.'
        : 'Use only the declared roster edit authority; do not infer permission to change the roster. Preserve factual uncertainty and justify operational Plan choices.',
  };
}

// Legacy broad envelopes may contain empty placeholders, but populated query
// arguments are an intent, not ignorable metadata. Never report them as executed.
export function validateRosterTeachInspectionRequestV1(args) {
  const empty = value => value == null || value === '' || value === false || value === 0
    || Array.isArray(value) && value.length === 0;
  const ignored = Object.entries(args || {}).filter(([key, value]) => key !== 'branchIdRef' && !empty(value));
  if (ignored.length) {
    throw Object.assign(Error('ROSTER_TEACH_INSPECTION_DOES_NOT_EXECUTE_QUERY: kind=inspect accepts only branchIdRef and reads that branch context/actionSpace/cardResources; it does not execute queryKind, argumentsJson, or a hypothetical spec. Use kind=spatial for a native query, or kind=scenario for conditional scene construction, then inspect its returned branch. Select the tool that actually answers your question; do not claim a control calculation or payment executed from an inspection.'),
      { code: 'ROSTER_TEACH_INSPECTION_DOES_NOT_EXECUTE_QUERY', ignoredFields: ignored.map(([key]) => key) });
  }
  if (args?.branchIdRef !== undefined && typeof args.branchIdRef !== 'string') {
    throw Object.assign(Error('ROSTER_TEACH_INSPECTION_BRANCH_REFERENCE_INVALID'),
      { code: 'ROSTER_TEACH_INSPECTION_BRANCH_REFERENCE_INVALID' });
  }
}

// One bounded targeted dialogue for an old investigation that never received
// this tool discovery contract. No agenda regeneration, history reset or pass.
export function resumeRosterTeachCapabilityDiscoveryV1(state, questionIds) {
  const investigation = state?.investigation;
  const pending = new Set((state?.synthesis?.answers || [])
    .filter(a => a.disposition === 'unresolved').map(a => a.questionId));
  if (!investigation?.completed || investigation.capabilityContinuation
    || !Array.isArray(questionIds) || !questionIds.length
    || new Set(questionIds).size !== questionIds.length
    || questionIds.some(id => !pending.has(id))
    || (investigation.rounds.at(-1)?.capabilityGuideVersion || 0) >= ROSTER_TEACH_CAPABILITY_GUIDE_VERSION) {
    throw Object.assign(Error('ROSTER_TEACH_CAPABILITY_REFRESH_UNAVAILABLE'),
      { code: 'ROSTER_TEACH_CAPABILITY_REFRESH_UNAVAILABLE' });
  }
  investigation.capabilityContinuation = {
    version: ROSTER_TEACH_CAPABILITY_GUIDE_VERSION,
    startRound: investigation.rounds.length, questionIds: [...questionIds],
    maximumAdditionalBatches: 3, concreteFix: 'current_capability_guide_and_conditional_phase_discovery',
    historyReset: false, automaticallyAnswered: false,
  };
  investigation.completed = false;
}

// A scene may reveal a domain only after execution. A one-batch refresh closed
// before the investigator could consume that result. Repair that old stop once,
// preserving all paid attempts; this is not permission to restart all Teach.
export function resumeRosterTeachDependentQueriesV1(state, questionIds, { refreshToolCatalog = false } = {}) {
  const investigation = state?.investigation;
  const pending = new Set((state?.synthesis?.answers || [])
    .filter(answer => answer.disposition === 'unresolved').map(answer => answer.questionId));
  const old = investigation?.capabilityContinuation;
  if (refreshToolCatalog && investigation?.completed && investigation.dependencyContinuation
    && (investigation.dependencyContinuation.toolCatalogRefresh?.version || 0) < ROSTER_TEACH_TOOL_CATALOG_VERSION
    && !(investigation.rounds.at(-1)?.toolCatalogVersion >= ROSTER_TEACH_TOOL_CATALOG_VERSION)
    && Array.isArray(questionIds) && questionIds.length
    && new Set(questionIds).size === questionIds.length
    && questionIds.length === investigation.dependencyContinuation.questionIds.length
    && questionIds.every(id => pending.has(id) && investigation.dependencyContinuation.questionIds.includes(id))) {
    const continuation = investigation.dependencyContinuation;
    if (continuation.toolCatalogRefresh) {
      continuation.toolCatalogRefreshHistory ||= [];
      continuation.toolCatalogRefreshHistory.push(structuredClone(continuation.toolCatalogRefresh));
    }
    continuation.toolCatalogRefresh = { version: ROSTER_TEACH_TOOL_CATALOG_VERSION,
      concreteFix: 'retained_branch_context_projection_and_explicit_branch_transport',
      previousMaximumAdditionalBatches: continuation.maximumAdditionalBatches,
      additionalBatches: 1, historyReset: false };
    continuation.maximumAdditionalBatches += 1;
    investigation.completed = false;
    return;
  }
  if (refreshToolCatalog || !investigation?.completed || investigation.dependencyContinuation
    || old?.maximumAdditionalBatches !== 1
    || !Array.isArray(questionIds) || !questionIds.length
    || new Set(questionIds).size !== questionIds.length
    || questionIds.some(id => !pending.has(id) || !old.questionIds.includes(id))) {
    throw Object.assign(Error('ROSTER_TEACH_DEPENDENCY_CONTINUATION_UNAVAILABLE'),
      { code: 'ROSTER_TEACH_DEPENDENCY_CONTINUATION_UNAVAILABLE' });
  }
  investigation.dependencyContinuation = { version: 1, startRound: investigation.rounds.length,
    questionIds: [...questionIds], maximumAdditionalBatches: 3,
    concreteFix: 'dependent_query_results_need_a_following_investigation_turn',
    priorCapabilityContinuation: structuredClone(old), historyReset: false, automaticallyAnswered: false };
  investigation.completed = false;
}

export function configureRosterTeachProductInvestigationV1(state) {
  const investigation = state?.investigation, fact = investigation?.factProbeContinuation;
  if (!fact || investigation.productContinuationPolicy) return false;
  investigation.productContinuationPolicy = { version:'evidence_led_issue_progress_v1',
    startRound:fact.startRound, questionIds:[...fact.questionIds],
    priorTrialLimit:fact.maximumAdditionalBatches, historyReset:false };
  return true;
}

export function rosterTeachInvestigationWindowV1(state) {
  const investigation = state.investigation;
  // Continuations are append-only history. Their existence is not priority:
  // the newest assigned round owns the next query, irrespective of lane type.
  const replan = investigation.recoveryReplanContinuation;
  const current = [investigation.factProbeContinuation, investigation.dependencyContinuation,
    investigation.capabilityContinuation].filter(Boolean)
    .sort((a, b) => b.startRound - a.startRound)[0];
  const policy = investigation.productContinuationPolicy;
  const productive = current && policy?.version === 'evidence_led_issue_progress_v1'
    && policy.startRound === current.startRound && hash(policy.questionIds) === hash(current.questionIds)
    && (!replan || current.startRound >= replan.startRound);
  // Repairing arguments answers that tool request, not its strategic question.
  // Return each NEW successful repair to the same investigator exactly once.
  // Otherwise a local movement witness can skip its missing full-arrival chain.
  if (investigation.completed && !state.pendingModelCall) {
    const open = new Map();
    for (const round of investigation.rounds) {
      if (!round.completed) break;
      const unresolved = new Set((round.output?.unresolved || []).map(row => row.questionId));
      for (const row of round.output?.questionProgress || []) {
        open.set(row.questionId, unresolved.has(row.questionId)
          || ['needs_tool_result','unresolved_handoff','capability_gap'].includes(row.disposition));
      }
      for (const id of unresolved) open.set(id,true);
    }
    const consumed = new Set((investigation.recoveryReplanHistory || [])
      .flatMap(row => row.recoveryReceiptHashes || []));
    const repaired = (state.queryRecovery?.operations || []).filter(op => op.completed
      && open.get(op.questionId) && op.result?.receiptHash
      && !consumed.has(op.result.receiptHash)
      && assessRosterTeachEvidenceReadinessV1(op.result).usableForClaim);
    if (repaired.length) {
      const start = investigation.rounds.length;
      const questionIds = [...new Set(repaired.map(op => op.questionId))];
      return {start,limit:start+1,questionIds,
        recoveryReplan:{version:2,startRound:start,questionIds,
          reason:'repaired_native_result_requires_question_interpretation',
          recoveryReceiptHashes:[...new Set(repaired.map(op=>op.result.receiptHash))],
          repairedQueries:repaired.map(op=>({questionId:op.questionId,
            queryId:op.queryId,originalQueryId:op.originalQueryId,receiptHash:op.result.receiptHash})),
          historyReset:false,automaticallyAnswered:false,
          instruction:'Read the NEW successful repair before interpreting the same unresolved question. It establishes only the actual request, branch and predicate. A local move is not a complete arrival chain; a one-way attack estimate is not a sequential exchange. Use the current capability guide and model-chosen conditional Native successors for any missing prerequisite. Continue only with a new dependent experiment, or explicitly explain which facts are established and which remain unresolved. Do not repeat the repaired query, erase a gap, or treat query success as Plan acceptance.'}};
    }
  }
  if (current && !productive && (!replan || current.startRound >= replan.startRound)) {
    return { start: current.startRound,
      limit: current.startRound + (current.maximumAdditionalBatches || 1),
      questionIds: [...current.questionIds],
      unstartedContinuation: investigation.completed === true
        && investigation.rounds.length === current.startRound };
  }
  // Argument repair cannot change the selected scene. A failed repair therefore
  // returns the SAME question to the investigator, which owns prerequisites,
  // phase and side selection. Never fabricate an answer or reset paid history.
  const recovery = state.queryRecovery?.operations || [];
  if (!productive && investigation.completed && !state.pendingModelCall
    && recovery.length && recovery.every(op => op.completed)) {
    const handed = new Set((investigation.recoveryReplanHistory || [])
      .flatMap(row => row.questionIds));
    const failures = recovery.filter(op => !handed.has(op.questionId)
      && !assessRosterTeachEvidenceReadinessV1(op.result || op.currentFailure).usableForClaim
      && op.status !== 'superseded_by_investigation_handoff');
    if (failures.length) {
      const questionIds = [...new Set(failures.map(op => op.questionId))];
      const start = investigation.rounds.length;
      return {start, limit:start + 1, questionIds,
        recoveryReplan:{version:1, startRound:start, questionIds,
          failures:failures.map(op => ({questionId:op.questionId,
            queryId:op.queryId, originalQueryId:op.originalQueryId,
            failureReceiptHash:(op.result || op.currentFailure).receiptHash,
            reason:(op.result || op.currentFailure).unknownReasonCode
              || assessRosterTeachEvidenceReadinessV1(op.result || op.currentFailure).reasons[0]})),
          historyReset:false, automaticallyAnswered:false,
          instruction:'Same-scene parameter correction did not answer these questions. Replan the factual experiment using actual rules, phase, active side and participants; a missing domain in one scene is not a missing tool. Preserve original failures. Do not invent IDs, rename failed queries, or call a failed receipt evidence_established. Return genuine missing capability explicitly if prerequisites cannot be constructed.'}};
    }
  }
  const extra = investigation.supplement;
  const activeProgress = productive ? current : replan;
  if (activeProgress || (!extra && state.investigationPolicyVersion === 'evidence_led_issue_progress_v1')) {
    const start = activeProgress?.startRound || 0;
    const assigned = activeProgress?.questionIds || state.agenda.questions.map(question => question.questionId);
    const seen = new Set(), capabilityGaps = [], nonAdvancingSearches = [];
    let noProgressBatches = 0, completed = 0, stopped = false;
    // Remove only receipt/dispatch labels, never game IDs or result values.
    const content = value => Array.isArray(value) ? value.map(content)
      : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value)
        .filter(([key]) => !['receiptHash', 'challengeId', 'questionId', 'queryId',
          'requestHash', 'createdAt', 'executedAt', 'timestamp'].includes(key))
        .map(([key, child]) => [key, content(child)])) : value;
    for (const round of investigation.rounds.slice(start)) {
      if (!round.completed) break;
      let novel = 0;
      for (const query of round.output.queries) {
        const result = investigation.evidence.find(row => row.challengeId === query.queryId);
        const operation = investigation.operations.find(row => row.queryId === query.queryId);
        const failed = !result || result.status === 'unknown' || result.sourceReceipt?.status === 'unknown'
          || result.followUpReceipts?.some(row => row.status === 'unknown');
        if (failed) {
          capabilityGaps.push({ questionId: query.questionId, queryId: query.queryId,
            request: operation?.request || null,
            reason: result?.unknownReasonCode || result?.sourceReceipt?.unknownReason || 'QUERY_UNANSWERED',
            queryRepair: result?.queryRepair || null, status: 'unresolved_query_not_strategy_disproof' });
          continue;
        }
        if (result.queryNotExecuted || result.repeatedFailedRequest) continue;
        // A handled search is not necessarily a new feasibility witness.
        // Keep its real bounded-miss evidence, but do not let endless new
        // anchors reset the investigation's no-progress counter. The existing
        // query-repair/synthesis lanes decide whether to revise the scene/Plan.
        const staticSearch = result.sourceReceipt?.queryKind === 'space.solve_static_formation'
          ? result.sourceReceipt.queryReceipt?.result : null;
        if (Array.isArray(staticSearch?.formationOptions) && !staticSearch.formationOptions.length) {
          nonAdvancingSearches.push({ questionId: query.questionId, queryId: query.queryId,
            reason: 'static_formation_search_returned_no_witness',
            attemptedAnchors: staticSearch.misses?.length || 0,
            impossibilityProven: false, originalEvidenceRetained: true });
          continue;
        }
        const key = hash({ request: operation?.request || null, result: content(result) });
        if (!seen.has(key)) { seen.add(key); novel++; }
      }
      completed++;
      noProgressBatches = novel ? 0 : noProgressBatches + 1;
      if (!round.output.queries.length || noProgressBatches >= 2) { stopped = true; break; }
    }
    const questionProgress = projectRosterTeachQuestionProgressV1(
      assigned, investigation.rounds.slice(start));
    if (!questionProgress.pendingQuestionIds.length) stopped = true;
    return { start, limit: start + (stopped ? completed : completed + 1),
      questionIds: questionProgress.pendingQuestionIds,
      unconsumedToolResult: Boolean(productive && investigation.completed && !stopped
        && investigation.rounds.length === start + completed),
      progress: { policyVersion: state.investigationPolicyVersion, distinctResults: seen.size,
        noProgressBatches, capabilityGaps, nonAdvancingSearches, stopped, questionProgress,
        stopReason: stopped ? (!questionProgress.pendingQuestionIds.length
          ? 'all_questions_handed_to_synthesis_not_plan_acceptance' : 'no_further_queries_or_no_new_evidence') : null,
        evidenceRelevanceStillRequiresModelAssessment: true } };
  }
  return { start: extra?.progressContinuation?.startRound ?? extra?.startRound ?? 0,
    limit: extra ? (extra.progressContinuation?.startRound ?? extra.startRound) + 1 : 3,
    questionIds: extra?.questionIds || (extra && state.synthesis
      ? state.synthesis.answers.filter(answer => answer.disposition === 'unresolved').map(answer => answer.questionId)
      : state.agenda.questions.map(question => question.questionId)) };
}

// Startup may already own a saved, UNSENT synthesis request. Resolve that
// ownership before the reader-only fast path; never bypass a paid/in-flight call.
export function resumeRosterTeachRepairedQuestionInvestigationV1({state,
  retainedPublicOutputs,retainedDispatches}) {
  if (!state.investigation?.completed) return false;
  const pending=state.pendingModelCall;
  if(pending) {
    if(!['teach_framework_synthesis_step','teach_framework_synthesis','teach_framework_citation_patch','teach_framework_citation_delta'].includes(pending.kind))return false;
    const key=pending.request?.contextHash;
    if(!key || !Array.isArray(retainedPublicOutputs) || !Array.isArray(retainedDispatches)
      || retainedPublicOutputs.some(row=>row.contextHash===key)
      || retainedDispatches.some(row=>row.contextHash===key)
      || state.calls?.some(row=>row.contextHash===key))return false;
  }
  const handoff=rosterTeachInvestigationWindowV1({...state,pendingModelCall:null}).recoveryReplan;
  if(handoff?.reason!=='repaired_native_result_requires_question_interpretation')return false;
  if(pending)retireRosterTeachUnsentDownstreamCallV1({state,retainedPublicOutputs,retainedDispatches});
  (state.investigation.recoveryReplanHistory||=[]).push(structuredClone(handoff));
  state.investigation.recoveryReplanContinuation=structuredClone(handoff);
  state.investigation.completed=false;
  return true;
}

export function resumeRosterTeachUnstartedInvestigationV1(state) {
  if (!state.investigation?.completed) return false;
  const window = rosterTeachInvestigationWindowV1(state);
  if (!window.unstartedContinuation && !window.unconsumedToolResult) return false;
  // Repair only a demonstrably unstarted assignment, never reopen completed
  // batches or reset paid replies, limits, answers or query history.
  state.investigation.completed = false;
  (state.investigation.continuationResumptions ||= []).push({
    startRound: window.start, questionIds: [...window.questionIds],
    reason: window.unconsumedToolResult ? 'productive_tool_result_requires_dependent_decision'
      : 'newer_unstarted_assignment_was_shadowed_by_historical_window',
    historyReset: false, automaticallyAnswered: false,
  });
  return true;
}

export function rosterTeachReplacementCapabilityV1(request, queryContext) {
  if (request?.kind === 'math' && request.toolRequest?.mathKind === 'budget_fit'
    && queryContext?.capabilities?.builderCandidateComparison) {
    return { capabilityKey: 'builderCandidateComparison',
      contract: structuredClone(queryContext.capabilities.builderCandidateComparison),
      instruction: 'Use the complete selectedRosterReference.candidateInput and a model-chosen alternative with builder_candidate_comparison. budget_fit does not implement a roster audit; its rejection does not mean upgrade, slot or cost comparison is unavailable. Native Builder returns costs and legality, not strategic rankings. A fixed roster may be compared without editing it.' };
  }
  return null;
}

export function isRosterTeachStaleCapabilityDeferralV1(operation) {
  return operation?.completed === true && operation.status === 'model_deferred'
    && !operation.deferredCapabilityRecovery
    && operation.currentFailure?.unknownReasonCode === 'ROSTER_TEACH_BUDGET_FIT_REQUIRES_SELECTED_ROSTER_AUDIT'
    && !operation.currentFailure.queryRepair?.capabilities?.builderCandidateComparison;
}

export function projectRosterTeachActionAvailabilityScopeV1(queryContext) {
  const domains=queryContext.actionSpace?.parameterDomains||[];
  return {phase:queryContext.phase??null,activeSideKey:queryContext.activeSideKey??null,
    globalCapabilityExhaustive:false,
    currentActivationCompletionDomains:domains.filter(d=>
      d.parameterKind==='official_selected_roster_finish_activation_v1').map(d=>({
      domainId:d.domainId,pieceId:d.pieceId,sideKey:d.sideKey,actionType:d.actionType,
      parameterSchema:structuredClone(d.parameterSchema)})),
    instruction:'This is the action menu of ONE inspected state, not the complete capability catalog or the actions of every future activation. Activation-completion domains, when listed, are actual Native transitions: they can be selected with scenario/native_action using this branch and their own parameters. Inspect the successor for the next side/unit/window. Absence of another unit move in this window is not global unavailability. No completion action is selected or executed by this description; a hypothetical parent stays conditional.'};
}

export function projectRosterTeachCapabilityGuideV1(queryContext, context = {}, { includeToolCatalog = true } = {}) {
  const construction = queryContext.scenarioConstruction || {};
  return {
    kind: 'current_query_capability_guide', version: ROSTER_TEACH_CAPABILITY_GUIDE_VERSION,
    source: 'current_laboratory_contract_not_historical_model_claims',
    sourceStateHash: queryContext.sourceStateHash,
    actionAvailabilityScope:projectRosterTeachActionAvailabilityScopeV1(queryContext),
    ...(Array.isArray(queryContext.availableScenarioBranches) ? {
      retainedScenarios: {
        availableScenarioBranches: structuredClone(queryContext.availableScenarioBranches),
        availableFoundationBranchRefs: [...queryContext.availableFoundationBranchRefs],
        instruction: queryContext.scenarioReferenceInstruction,
        listingExecutesNothing: true,
      },
    } : {}),
    builderComparison: queryContext.capabilities?.builderCandidateComparison || null,
    ...(context.selectedRosterReference ? { selectedRosterReference: context.selectedRosterReference } : {}),
    ...(includeToolCatalog ? { toolSurfaceCatalog: {
      version: ROSTER_TEACH_TOOL_CATALOG_VERSION, nativeQueryKindsAreExhaustiveToolList: false,
      nativeSpatialSubqueries: { requestKind: 'spatial', queryKinds: Object.keys(queryContext.queryContracts || {}),
        argumentContract: queryContext.nativeSpatialQueryTransport || null },
      math: { requestKind: 'math', contracts: queryContext.capabilities?.mathContracts || null },
      inspect: { requestKind: 'inspect', toolRequestFields: ['branchIdRef'],
        returns: ['phase', 'activeSideKey', 'availableUnits', 'cardResources', 'resourceEvidenceScope', 'actionSpace'],
        scope: 'exact source or retained branch; context read, not execution or future readiness' },
      scenario: { requestKind: 'scenario', allowedKinds: construction.allowedKinds || [],
        allowedPhases: construction.allowedPhases || [], pieceIdMeans: construction.pieceIdMeans,
        requiredSequence: construction.requiredSequence, placementFields: construction.placementFields,
         participantSelection: construction.participantSelection || null,
          phaseOnlyHypothesis: construction.phaseOnlyHypothesis || null,
          firstRoundInitialization: construction.firstRoundInitialization || null,
        scope: 'model-declared conditional assumptions, not a real arrival or hidden opponent state' },
      nativeAction: construction.nativeActionBranch || null,
      retainedEvidence: { requestKind: 'retained_evidence', toolRequestFields: ['receiptHash', 'path'] },
      instruction: 'queryContracts enumerates only native spatial subqueries. It is NOT the complete set of Teach operations: inspect reads resources/action domains; scenario constructs conditional states; scenario native_action applies a selected Native domain to that private state. Determine availability from these distinct surfaces, not solely from the spatial queryKind names. No tactic, phase, domain, payment choice or opponent position is selected for you.',
    } } : {}),
    conditionalActions: {
      allowedPhases: construction.allowedPhases || [],
      nativeActionBranch: construction.nativeActionBranch || null,
      phaseOnlyHypothesis: construction.phaseOnlyHypothesis || null,
      firstRoundInitialization: construction.firstRoundInitialization || null,
      sourcePhase: queryContext.phase,
      instruction: 'actionSpace is local to the inspected phase, side, on-table units and resource state. An empty undeployed source or an absent domain in another phase is NOT global unavailability. For a conditional ability question, choose the phase and participants from its source rules, construct a hypothetical_geometry scene, inspect that branch, then select its Native domain and parameters. Domains expose actual targets, payment choices and costs. Hypothetical geometry may differ by phase; weapon exchange uses assault but other abilities need their own rule-defined phase. Do not use weapon results as payment evidence.',
    },
    evidenceBoundary: 'Separate a conditional feasibility claim from a guaranteed future outcome. State model-chosen assumptions; query Native consequences. Unknown future opponent choices or future card readiness do not require omniscience to compare conditional plans. Never assert actual payment, arrival or future truth without the corresponding evidence. Current contracts supersede old capability-unavailable prose, not old recorded outcomes.',
    mutationAuthority: false, trainingTruth: false,
  };
}
