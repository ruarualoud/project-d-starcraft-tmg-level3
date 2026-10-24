import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { projectRosterTeachSourceReviewV1 } from './roster-teach-source-review-v1.mjs';

export const ROSTER_PLANNING_WORKFLOW_VERSION = 'roster_plan_teach_workflow_v1';

// The secure product adapter durably records reserved/sending BEFORE egress.
// A restart before any round or dispatch is not an ambiguous paid request.
export function isUnsentInitialRosterPlanningV1(session) {
  return session?.status === 'failed'
    && session.failure?.code === 'ROSTER_WORKSPACE_RUN_INTERRUPTED_BY_RESTART'
    && Array.isArray(session.progress?.rounds) && session.progress.rounds.length === 0
    && (session.retainedReplyCount ?? session.publicOutputs?.length ?? -1) === 0
    && (session.providerDispatches || []).length === 0
    && (session.failedProviderOutputs || []).length === 0;
}
export const ROSTER_PLANNING_EVIDENCE_POLICY_V1 = Object.freeze({
  version: ROSTER_PLANNING_WORKFLOW_VERSION,
  instruction: 'Develop the army and its Plan together. Rules/tool results are facts only within their returned scope. A conditional experiment supports only its stated assumptions; static placement is not legal arrival and expected losses are not guaranteed losses. Opponent choices and future outcomes may remain explicit strategic hypotheses with triggers, risks and alternatives. A query error/unknown is not false or evidence of success. Teach challenges choices but never selects a tactic. Resolve a question with relevant evidence or revise the Plan so it no longer asserts the unsupported fact; changing wording, IDs or receipt labels alone is not progress.',
  strategyChosenByHost: false, canAffectRules: false, trainingTruth: false,
});

// Accept both persisted Teach and its public workspace projection. Finishing a
// run is deliberately distinct from resolving and applying its current claims.
export function rosterTeachIssueLedgerV1(framework) {
  const state = framework?.state || framework || {};
  const answers = state.synthesis?.answers || [];
  const questions = state.agenda?.questions || [];
  const coverage = state.coverage || framework?.coverage || [];
  const missing = new Set(coverage.flatMap(row => row.unresolvedQuestionIds || []));
  const existing = state.issueLedger?.questions || framework?.issueLedger?.questions || [];
  const ids = [...new Set([...questions.map(q => q.questionId), ...answers.map(a => a.questionId), ...missing,
    ...existing.map(q => q.questionId)])];
  const evidence = [...(state.evidence || []), ...(state.investigation?.evidence || []),
    ...(state.queryRecovery?.operations || []).map(op => op.result).filter(Boolean)];
  const completed = framework?.status === 'completed' || state.phase === 'completed';
  return { version: ROSTER_PLANNING_WORKFLOW_VERSION, questions: ids.map(questionId => {
    const q = questions.find(row => row.questionId === questionId);
    const answer = answers.find(row => row.questionId === questionId);
    const prior = existing.find(row => row.questionId === questionId);
    const unresolved = missing.has(questionId) || answer?.disposition === 'unresolved'
      || (!answer && !prior && completed) || (!answer && prior?.status === 'unresolved');
    const related = evidence.filter(e => (e.questionId || e.challengeId) === questionId);
    return { questionId, issueKey: q ? hash({ axes: [...q.axisIds].sort(), claim: q.claim,
      question: q.question, assumptions: q.scenarioAssumptions }) : prior?.issueKey || questionId,
      claim: q?.claim || prior?.claim || null,
      assumptions: q?.scenarioAssumptions || prior?.assumptions || [],
      status: unresolved ? 'unresolved' : answer?.disposition === 'revise' ? 'revision_proposed'
        : answer?.disposition === 'retain' ? 'conditional_support' : prior?.status || 'pending',
      evidenceRefs: answer?.evidenceRefs || prior?.evidenceRefs || [],
      evidenceScopes: related.map(e => ({ receiptHash: e.receiptHash,
        status: e.status, sourceStateHash: e.sourceReceipt?.sourceStateHash || null,
        baseStateHash: e.sourceReceipt?.baseStateHash || null,
        branchStateHash: e.sourceReceipt?.branchStateHash || null })),
      publicReason: answer?.publicReason || prior?.publicReason || null,
      replanTrigger: answer?.replanTrigger || prior?.replanTrigger || null,
      interpretationVerified: false, futureOutcomeGuaranteed: false };
  }), trainingTruth: false };
}

export function rosterTeachReadinessV1(view, { requireApplied = false } = {}) {
  const framework = view?.teachFramework;
  const state = framework?.state || framework;
  const planHash = view?.plan?.planHash;
  const ledger = rosterTeachIssueLedgerV1(framework);
  const unresolved = ledger.questions.filter(q => q.status === 'unresolved');
  const completed = framework?.status === 'completed'
    && (framework.investigationCompleted === true || state?.investigation?.completed === true);
  const current = Boolean(planHash && (requireApplied
    ? framework?.appliedToPlanHash === planHash
    : [framework?.planHash, framework?.appliedToPlanHash].includes(planHash)));
  const issues = [];
  if (!completed) issues.push({ kind: 'teach_lifecycle', code: 'TEACH_INCOMPLETE', severity: 'high' });
  if (completed && !current) issues.push({ kind: 'teach_lifecycle', code: 'TEACH_NOT_CURRENT', severity: 'high' });
  for (const q of unresolved) issues.push({ kind: 'teach_question', code: 'TEACH_UNRESOLVED',
    severity: 'high', claimPath: q.issueKey, questionId: q.questionId, claim: q.claim,
    publicReason: q.publicReason, replanTrigger: q.replanTrigger });
  return { version: ROSTER_PLANNING_WORKFLOW_VERSION, completed, current,
    ready: completed && current && !unresolved.length,
    unresolvedQuestionIds: unresolved.map(q => q.questionId), issues, ledger,
    conditionalStrategyAllowed: true, strategicOptimalityProven: false };
}

// Findings are a challenger's allegations, never Rules truth or a strategic
// veto. Preserve them across the source-review -> quantitative-Teach seam.
// Also expose typed Native constraints for declared partners: a partner may be
// an indirect collaborator, so a tag mismatch is not automatically an illegal
// plan. The model must clarify the role or change its direct-target claim.
export function prepareRosterTeachContextV1({framework, plan, freshContext,
  review, providerDispatches = []}) {
  const state = framework.state || {};
  const neverStarted = !state.framework && !state.agenda
    && (!state.phase || state.phase === 'learn_framework')
    && !(state.calls?.length || state.evidence?.length || state.repairs?.length)
    && !providerDispatches.some(d => d.planHash === plan.planHash
      && String(d.roundKind).startsWith('teach_framework_'));
  // No automatic reset of a dispatched, ambiguous, paid or investigated cycle.
  if (framework.context && !neverStarted) return framework.context;
  const context = structuredClone(freshContext);
  const sourceReview = projectRosterTeachSourceReviewV1({plan,review});
  if (sourceReview) context.sourceReview = sourceReview;
  const units = new Map(plan.rosterCandidate.units.map(u => [u.unitInstanceId,u]));
  const rules = new Map((context.sourceFacts?.selectionUnitRules || []).map(r => [r.recordKey,r]));
  const native = new Map((context.queryContext?.nativeAbilityReference?.records || []).map(r => [r.recordKey,r]));
  context.abilityPartnerConstraints = [];
  for (const purpose of plan.componentPurposes) {
    const serialized = purpose.publicPurposeText.split('Selection argument (public model output):\n')[1];
    if (!serialized) continue;
    let choice;
    try {choice=JSON.parse(serialized);} catch {continue;} // Current prose, not historical replacement.
    const owner = units.get(choice.unitInstanceId);
    if (!owner || purpose.instanceId !== choice.unitInstanceId) continue;
    for (const use of choice.abilityApplications || []) {
      const definitions = native.get(owner.recordKey)?.definitions.filter(d =>
        d.abilityName === use.abilityName && d.exactSourcePatternCompiled === true
        && typeof d.requiredTargetTag === 'string') || [];
      for (const definition of definitions) for (const partnerId of use.partnerUnitIds || []) {
        const partner = units.get(partnerId), record = rules.get(partner?.recordKey);
        if (!partner || !record) continue;
        const tags = (Array.isArray(record.tags) ? record.tags : String(record.tags || '').split(/[,\s]+/u))
          .map(t => t.trim().toLowerCase()).filter(Boolean);
        const required = definition.requiredTargetTag.toLowerCase();
        context.abilityPartnerConstraints.push({ownerUnitId:owner.unitInstanceId,
          abilityName:use.abilityName, partnerUnitId:partnerId,
          requiredTargetTag:required, partnerTags:tags,
          staticConstraintStatus:!tags.includes(required) ? 'required_tag_mismatch'
            : definition.requiresAnotherFriendlyTarget && owner.unitInstanceId === partnerId
              ? 'another_target_required' : 'matches_checked_static_constraints',
          definitionId:definition.definitionId, routeHash:definition.routeHash,
          sourceText:definition.sourceText, partnerSourceRecordHash:record.sourceRecordHash,
          scope:'selected source tags and explicit compiled target predicates only',
          partnerRoleIsProvenDirectTarget:false, executionEligibilityProven:false,
          dynamicRangeTimingResourcesAndModifiersNotChecked:true});
      }
    }
  }
  context.partnerConstraintInstruction = 'For each mismatching declared partner, clarify whether it is a direct ability recipient or merely indirect cooperation. The named ability cannot target that source tag under the shown predicate unless an explicit Rules-verified modifier changes it. Matching these static checks does not prove range, resources, timing, upgrade selection or future legality. No Host tactic is selected.';
  if (framework.context && hash(framework.context) !== hash(context)) {
    const original = structuredClone(framework);
    framework.preflightContextHistory ||= [];
    framework.preflightContextHistory.push({reason:'same_plan_never_dispatched_context_completion',original});
    framework.state = {};
  }
  return context;
}

// Compact durable transitions; per-call records remain authority for prompt
// bytes, cost, latency and public decisions. Polling cannot grow this history.
export function recordRosterPlanningCheckpointV1(target, detail) {
  target.workflow ||= { version: ROSTER_PLANNING_WORKFLOW_VERSION, transitions: [] };
  const prior = target.workflow.current;
  if (prior && hash(prior.detail) === hash(detail)) return prior;
  const row = { sequence: target.workflow.transitions.length + 1,
    at: new Date().toISOString(), detail: structuredClone(detail) };
  target.workflow.transitions.push(row); target.workflow.current = row;
  return row;
}
