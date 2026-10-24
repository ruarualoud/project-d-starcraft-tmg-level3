import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { runRosterTeachFrameworkSessionV1, collectRosterTeachScenarioRecordsV1 } from './roster-teach-framework-v1.mjs';
import { createRetainedReplayDeliberationPortV1 } from '../roster-planning-workspace/roster-planning-workspace-service-v1.mjs';
import { ROSTER_PLANNING_EVIDENCE_POLICY_V1, rosterTeachIssueLedgerV1 }
  from './roster-planning-workflow-v1.mjs';
import { reconcileStarcraftTmgProviderDispatchV1, unresolvedStarcraftTmgProviderDispatchesV1 }
  from '../secure-provider-runtime/provider-dispatch-recovery-v1.mjs';
import { isRecoverableProviderNetworkFailureV1 }
  from '../secure-provider-runtime/provider-network-resilience-v1.mjs';
import { createRosterTeachHistoryEvidenceV1 } from './roster-teach-history-view-v1.mjs';

const clone = value => structuredClone(value);
const fail = code => { throw Object.assign(new Error(code), { code }); };

function strategicPlan(plan) {
  const { revisionReason: _reason, ...strategy } = plan.strategy || {};
  // Binding/status metadata is checked separately by the final handoff. A
  // different explanation of an unchanged strategy is not another investigation.
  return { victoryRoute: plan.victoryRoute, strategy };
}

// Advisory early-Teach reuse depends on mission facts and their frozen sources,
// not the laboratory implementation label that delivered an identical result.
// Retain original receipts verbatim; this is NOT receipt equivalence or final
// Plan admission. Every other mission field (including source/runtime/map) stays
// in the comparison, so an actual fact/source change still invalidates reuse.
function missionAdviceIdentity(mission) {
  if (!mission?.scoring) return hash(mission);
  const { laboratoryVersion: _deliveryVersion, receiptHash: _deliveryReceipt,
    ...scoring } = mission.scoring;
  return hash({ ...mission, scoring });
}

function inquiryHasNotStarted(record) {
  return ['pending','running','paused','failed'].includes(record.status)
    && ['publicOutputs','failedOutputs','dispatches','usage'].every(key=>!(record[key] || []).length)
    && !(record.state?.evidence || []).length
    && !(record.state?.investigation?.rounds || []).length
    && !(record.state?.investigation?.operations || []).length
    && !(record.state?.queryRecovery?.operations || []).length
    && !record.state?.synthesisReader && !record.state?.synthesis;
}

function publishDraftFeedback(state, record) {
  state.draftTeachFeedback = { snapshotId: record.snapshotId, candidateHash: record.candidateHash,
    sourcePlanHash: record.sourcePlanHash,
    framework: clone(record.state.framework), agenda: clone(record.state.agenda),
    coverage: clone(record.state.coverage), synthesis: clone(record.state.synthesis),
    issueLedger: rosterTeachIssueLedgerV1(record.state),
    evidence: clone([...(record.state.evidence || []), ...(record.state.investigation?.evidence || []),
      ...(record.state.queryRecovery?.operations || []).map(op => op.result).filter(Boolean),
      ...(record.state.retainedHistoricalEvidence || [])]),
    retainedHistoricalEvidenceSources: clone(record.state.retainedHistoricalEvidenceSources || []),
    advisoryOnly: true, finalAcceptance: false, rosterAndPlanCanBeReopened: true };
}

// Adapter over the EXISTING Teach engine. A draft inquiry is evidence for the
// next selecting decision, never a final Plan, a tactical veto or Room admission.
export function createIterativeRosterDraftTeachV1({ deliberationFactory,
  createSceneLaboratory, selectSkillGuidance, missionEvidence } = {}) {
  return async function investigate(state, checkpoint, control = {}) {
    if (!state.currentCandidate || !state.plan || state.pendingDecision
      || typeof createSceneLaboratory !== 'function') fail('ITERATIVE_DRAFT_TEACH_PREREQUISITE_MISSING');
    const sourcePlanHash = hash(state.plan);
    const skillGuidance = selectSkillGuidance(state);
    const existingEvidence = state.observations.map(row => row.receipt);
    const sameContextInputs = row => hash(row.context.frozenContext) === hash(state.frozenContext)
      && missionAdviceIdentity(row.context.mission) === missionAdviceIdentity(missionEvidence)
      && hash(row.context.skillGuidance) === hash(skillGuidance)
      && hash(row.context.existingEvidence || []) === hash(existingEvidence);
    // These are cache dependencies, not new admission/signature requirements.
    // Same Plan + new facts must receive a new inquiry, not the old completion.
    const snapshotId = hash({ candidateHash: state.currentCandidate.candidateHash,
      plan: state.plan, frozenContext: state.frozenContext,
      mission: missionEvidence, skillGuidance, existingEvidence });
    state.draftTeachSnapshots ||= [];
    const samePlan = row => row.candidateHash === state.currentCandidate.candidateHash
      && row.sourcePlanHash === sourcePlanHash
      && hash(row.context.frozenContext) === hash(state.frozenContext);
    // Recognize historical records by their actual inputs without rewriting IDs.
    // An unfinished inquiry first drains with its immutable paid context; after
    // completion another call can investigate the newly added evidence.
    let record = state.draftTeachSnapshots.findLast(row => samePlan(row)
      && !['completed','superseded_before_dispatch'].includes(row.status))
      || state.draftTeachSnapshots.findLast(row => row.status === 'completed'
        && samePlan(row) && sameContextInputs(row));
    const reusableAdvice = row => row.candidateHash === state.currentCandidate.candidateHash
      && hash(row.context.frozenContext) === hash(state.frozenContext)
      && missionAdviceIdentity(row.context.mission) === missionAdviceIdentity(missionEvidence)
      && hash(row.context.skillGuidance) === hash(skillGuidance);
    const completedAdvice = state.draftTeachSnapshots.findLast(row => row.status === 'completed');
    // A previous implementation may have prepared (but never sent) a redundant
    // agenda. Keep that record, explicitly supersede it, and return to selection.
    // Any dispatch/output/evidence means normal immutable continuation instead.
    if (record && completedAdvice && reusableAdvice(completedAdvice) && inquiryHasNotStarted(record)) {
      record.status = 'superseded_before_dispatch';
      record.supersededByAdviceSnapshotId = completedAdvice.snapshotId;
      record.supersessionReason = 'same_army_same_mission_facts_early_advice';
      record = null;
    }
    if (!record) {
      const previous = state.draftTeachSnapshots.findLast(row => row.status === 'completed');
      const sameDraftInputs = previous && reusableAdvice(previous);
      const unchangedStrategy = previous
        && hash(strategicPlan(previous.plan)) === hash(strategicPlan(state.plan));
      // Early Teach informs selection; it must not demand final evidence for
      // every Plan-only revision or tool read of the SAME army. Return the prior
      // critique to the selecting agent, without certifying this new Plan. A
      // changed army/map/rules/Skills is taught normally. New observations are
      // still delivered to selection; they do not recursively restart all eight
      // axes before the selecting agent can consume them. Full current-Plan
      // Teach and source review remain mandatory AFTER the arrival handoff.
      // An already-started paid inquiry above is always resumed.
      const partialArmy = Number.isFinite(state.currentCandidate.mineralSpent)
        && Number.isFinite(state.mineralBudget)
        && state.currentCandidate.mineralSpent < state.mineralBudget;
      if (sameDraftInputs) {
        publishDraftFeedback(state, previous);
        state.draftTeachReuse = { version: 3,
          reason: unchangedStrategy ? 'strategy_unchanged' : partialArmy
            ? 'partial_army_plan_continuation' : 'same_army_plan_continuation',
          sourceSnapshotId: previous.snapshotId, sourcePlanHash: previous.sourcePlanHash,
          currentPlanHash: sourcePlanHash, originalEvidenceScopePreserved: true,
          finalAcceptance: false, currentPlanReviewed: false, newProviderCalls: 0,
          instruction: !partialArmy
            ? 'This army already received provisional Teach. Its saved findings are historical guidance, not acceptance of the current Plan. Read the current Plan and newer observations before repeating a prior criticism. Resolve required factual gaps through the available tools and revise the Plan or army with reasons. Once the exact-budget army, current map evidence and substantive provisional Plan are ready, finish hands off to Rules-audited arrival, full current-Plan Teach and source review; it does NOT accept unresolved facts or enter a game. Do not run another complete early inquiry merely because Plan prose or evidence changed. All earlier issues and original evidence are preserved; final factual gaps must still be resolved.'
            : unchangedStrategy
            ? 'The strategy fields did not change; only explanation or binding metadata changed. Read the retained Teach feedback. Address an issue in the actual Plan/army, query missing facts, or retain a defensible choice with evidence. This reuse does not resolve any issue or accept the current Plan. Final Teach/source admission remains required.'
            : 'The same partial army already received provisional Teach. Its earlier critique remains available, not proof that this revised Plan passed. Continue selecting: query relevant tools, revise the working hypothesis or propose army and Plan together toward the requested budget. Do not treat early Teach as a requirement to perfect an incomplete army before purchasing. Changed armies and final full-budget Plans still receive Teach and source admission; all unresolved questions remain recorded.' };
        await checkpoint(state);
        return state;
      }
      delete state.draftTeachReuse;
      const previousMethod = previous?.state.framework;
      record = { snapshotId, candidateHash: state.currentCandidate.candidateHash,
        sourcePlanHash, createdAtRevision: state.revision, status: 'pending',
        // Stable evidence snapshot: later tool queries must not change the
        // context of a paid Teach that is being resumed.
        context: { rosterEditAuthority: 'agent_may_reselect_after_evidence',
          evidencePolicy: clone(ROSTER_PLANNING_EVIDENCE_POLICY_V1),
          equalPlanScrutinyForPresetAndAgentSelected: true,
          planningStage: { kind: 'provisional_roster_and_plan',
            mineralSpent: state.currentCandidate.mineralSpent, mineralBudget: state.mineralBudget,
            completeArmyRequiredNow: false, finalPublicationRequirementsUnchanged: true,
            instruction: 'Question this working victory hypothesis while the army is still being built. Identify what to investigate, keep or change next. Missing future purchases are provisional, not a reason to demand a complete final Plan before selection may continue. Do not invent evidence or require every uncertainty to be resolved before revising the army and Plan.' },
          frozenContext: clone(state.frozenContext), skillGuidance: clone(skillGuidance),
          mission: clone(missionEvidence), existingEvidence: clone(existingEvidence),
          previousInquiry: state.draftTeachFeedback ? clone(state.draftTeachFeedback) : null },
        plan: { schema: 'starcraft_tmg_provisional_roster_plan_v1', ...clone(state.plan),
          planHash: sourcePlanHash, finalPlan: false, trainingTruth: false },
        candidateInput: clone(state.currentCandidate.input),
        state: previousMethod ? { framework: clone(previousMethod),
          ...(previous.candidateHash === state.currentCandidate.candidateHash
            && hash(previous.context.frozenContext) === hash(state.frozenContext) ? {
            reusableQuestionEvidence: { sourcePlanHash: previous.sourcePlanHash,
              questions: clone(previous.state.agenda?.questions || []),
              evidence: clone(previous.state.evidence || []) } } : {}) } : {},
        publicOutputs: [], failedOutputs: [], dispatches: [], events: [], usage: [], failure: null };
      state.draftTeachSnapshots.push(record);
      await checkpoint(state);
    }
    const publishFeedback = () => publishDraftFeedback(state, record);
    if (record.status === 'completed') {
      publishFeedback();
      return state;
    }
    // Plan revisions may refer to scenes inspected under the SAME army/map.
    // Rebuild only their handle registry, not the scene queries or model output.
    // Native restore still verifies source/runtime/spec/parent/state hashes.
    // Keep recipes in their original snapshots: do not duplicate them into each
    // paid context or relabel an old result as proof of the current Plan.
    const dependencies = state.draftTeachSnapshots.slice(0, state.draftTeachSnapshots.indexOf(record))
      .filter(previous => previous.status === 'completed'
        && previous.candidateHash === record.candidateHash
        && hash(previous.context.frozenContext) === hash(record.context.frozenContext)
        && hash(previous.context.mission) === hash(record.context.mission));
    const retainedScenarios = dependencies.flatMap(previous => collectRosterTeachScenarioRecordsV1(previous.state));
    const registry = { version: 1, sourceSnapshotIds: dependencies.map(row => row.snapshotId),
      branchRefs: [...new Set(retainedScenarios.map(row => row.challengeId))],
      originalReceiptsPreserved: true, lazyNativeSourceValidationRequired: true };
    if (hash(record.state.scenarioDependencies || null) !== hash(registry)) {
      record.state.scenarioDependencies = registry;
      await checkpoint(state);
    }
    const onEvent = async event => {
      if (event.type === 'provider_dispatch') {
        const index = record.dispatches.findIndex(row => row.requestId === event.dispatch.requestId);
        if (index < 0) record.dispatches.push(clone(event.dispatch));
        else record.dispatches[index] = clone(event.dispatch);
        if (event.dispatch.retryAuthorizationId) {
          const authorization = record.dispatchRetryAuthorizations?.find(row =>
            row.authorizationId === event.dispatch.retryAuthorizationId);
          if (authorization) Object.assign(authorization, { status: 'consumed',
            retryRequestId: event.dispatch.requestId });
        }
      }
      if (event.type === 'round_completed' && event.sanitizedOutputRecord) {
        const output = event.sanitizedOutputRecord;
        if (!record.publicOutputs.some(row => row.contextHash === output.contextHash
          && row.outputHash === output.outputHash)) record.publicOutputs.push(clone(output));
      }
      if (event.type === 'round_failed' && event.failedOutputRecord) {
        record.failedOutputs ||= [];
        if (!record.failedOutputs.some(row => row.dispatchRequestId === event.dispatchRequestId
          && hash(row.failedOutputRecord) === hash(event.failedOutputRecord))) {
          record.failedOutputs.push({ dispatchRequestId: event.dispatchRequestId || null,
            code: event.code, failedOutputRecord: clone(event.failedOutputRecord) });
        }
      }
      if (['round_completed', 'round_failed'].includes(event.type) && event.paidProviderCall !== false) {
        const accountingKey = event.dispatchRequestId || event.receiptHash || hash(event);
        if (!record.usage.some(row => row.accountingKey === accountingKey)) {
          record.usage.push({ accountingKey, receiptHash: event.receiptHash || null,
            paidProviderCall: event.paidProviderCall ?? null,
            costStatus: event.usage ? 'known' : 'unknown',
            usage: clone(event.usage || null), latencyMs: event.latencyMs ?? null });
        }
      }
      record.events.push({ type: event.type, roundKind: event.roundKind || null,
        receiptHash: event.receiptHash || null, code: event.code || null,
        replayed: event.replayed === true, paidProviderCall: event.paidProviderCall ?? null,
        at: event.at || null });
      await checkpoint(state);
    };
    record.status = 'running'; record.failure = null;
    await checkpoint(state);
    try {
      // Ordinary product Run owns a bounded network reconnect, not an observer
      // script. Persist authorization before egress; a restart cannot refill it.
      // This does not retry model/Rules errors or replace the paid request body.
      const recoverNetworkDispatch = async failed => {
        if (await control.shouldPause?.()) return null;
        if (failed.sessionId !== state.sessionId || failed.planHash !== sourcePlanHash
          || failed.retryOfRequestId || failed.retryOfNotSentRequestId
          || !['ambiguous', 'definitely_not_sent'].includes(failed.status)
          || !isRecoverableProviderNetworkFailureV1(failed.transportFailure)) return null;
        const saved = record.dispatches.find(row => row.requestId === failed.requestId);
        if (!saved || saved.status !== failed.status || saved.contextHash !== failed.contextHash
          || saved.requestBodyHash !== failed.requestBodyHash
          || record.dispatches.some(row => row.retryOfRequestId === failed.requestId
            || row.retryOfNotSentRequestId === failed.requestId)) return null;
        record.dispatchRetryAuthorizations ||= [];
        const recovery = reconcileStarcraftTmgProviderDispatchV1({ dispatchRecord: saved,
          retainedOutputs: record.publicOutputs, processInterrupted: true,
          retryAuthorizations: record.dispatchRetryAuthorizations,
          resumeAuthorization: { requestId: saved.requestId, contextHash: saved.contextHash,
            requestBodyHash: saved.requestBodyHash, standingNetworkResumeConsent: true } });
        if (recovery.action === 'retry_not_sent') return clone(saved);
        if (recovery.action !== 'retry_authorized_unknown') return null;
        let authorization = record.dispatchRetryAuthorizations.find(row => row.requestId === saved.requestId);
        if (!authorization) {
          authorization = { authorizationId: hash({ scope: 'draft_teach_network_recovery_v1',
            sessionId: state.sessionId, requestId: saved.requestId, requestBodyHash: saved.requestBodyHash }),
            requestId: saved.requestId, contextHash: saved.contextHash, requestBodyHash: saved.requestBodyHash,
            planHash: sourcePlanHash, status: 'authorized', maximumPhysicalRetries: 1,
            originalCostStatus: saved.costStatus, standingNetworkResumeConsent: true };
          record.dispatchRetryAuthorizations.push(authorization);
        }
        await checkpoint(state);
        return { ...clone(saved), retryAuthorizationId: authorization.authorizationId,
          standingNetworkResumeConsent: true };
      };
      const pending = unresolvedStarcraftTmgProviderDispatchesV1(record.dispatches);
      if (pending.length > 1) fail('ITERATIVE_DRAFT_TEACH_DISPATCH_RECONCILIATION_REQUIRED');
      const retryDispatch = pending[0]?.status === 'ambiguous'
        ? await recoverNetworkDispatch(pending[0]) : null;
      const laboratory = createSceneLaboratory({ candidateInput: clone(record.candidateInput),
        setup: clone(state.frozenContext) });
      const livePort = await deliberationFactory.createForRun({ sessionId: state.sessionId,
        runKind: 'draft-teach-framework', planHash: sourcePlanHash,
        control, onEvent, retryDispatch, recoverNetworkDispatch });
      const replay = createRetainedReplayDeliberationPortV1({
        retainedOutputs: record.publicOutputs, requireContextBoundReplay: true, onEvent,
        modelVersion: deliberationFactory.descriptor?.().modelVersion || 'draft-teach',
        livePort: { deliberate: async request => {
          // A missing answer to a sent request is not a new generation task.
          // Preserve it for explicit dispatch reconciliation, not blind retry.
          const unresolved = unresolvedStarcraftTmgProviderDispatchesV1(record.dispatches)
            .find(row => row.contextHash === request.contextHash
            && !record.publicOutputs.some(output => output.dispatchRequestId === row.requestId));
          if (record.dispatches.some(row => row.contextHash === request.contextHash
            && row.status === 'response_rejected'
            && !record.publicOutputs.some(output => output.dispatchRequestId === row.requestId)))
            fail('ITERATIVE_DRAFT_TEACH_DISPATCH_RECONCILIATION_REQUIRED');
          if (unresolved && unresolved.requestId !== retryDispatch?.requestId)
            fail('ITERATIVE_DRAFT_TEACH_DISPATCH_RECONCILIATION_REQUIRED');
          if (await control.shouldPause?.()) fail('ITERATIVE_DRAFT_TEACH_PAUSED');
          return livePort.deliberate(request);
        } },
      });
      await runRosterTeachFrameworkSessionV1({ sessionId: state.sessionId,
        plan: record.plan, context: record.context, laboratory, deliberation: replay,
        selectedCandidateInput: record.candidateInput, state: record.state,
        historicalEvidence: createRosterTeachHistoryEvidenceV1(record, dependencies),
        retainedScenarios,
         retainedDispatches: record.dispatches || [],
        retainedPublicOutputs: record.publicOutputs,
        onCheckpoint: async next => { record.state = next; await checkpoint(state); } });
      record.status = 'completed';
      publishFeedback();
      await checkpoint(state);
      return state;
    } catch (error) {
      const paused = error.code === 'ITERATIVE_DRAFT_TEACH_PAUSED';
      record.status = paused ? 'paused' : 'failed';
      record.failure = paused ? null : { code: error.code || String(error.message).split(':')[0],
        ...(error.code === 'ROSTER_TEACH_RETAINED_BRANCH_SOURCE_CHANGED' && error.detail
          ? { detail: clone(error.detail) } : {}) };
      state.status = 'paused'; state.blockingFinding = paused ? null : 'ITERATIVE_DRAFT_TEACH_FAILED';
      await checkpoint(state);
      if (paused) return state;
      throw error;
    }
  };
}
