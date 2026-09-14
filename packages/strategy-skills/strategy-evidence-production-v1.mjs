import { hash, seal, verifySeal, fail } from '../skill-production/common.mjs';
import { STRATEGY_ROLE_ORDER_V1 } from './strategy-structured-workflow-v1.mjs';
import { materializeStrategyFieldPatchV2 } from './strategy-structured-workflow-v2.mjs';
import { prepareStrategyEvidenceReviewV1, strategyFieldTargetsV1, reconcileStrategyReviewOpinionsV1 } from './strategy-evidence-review-v1.mjs';
import { createStrategyLayerV1, validateStrategyDraftV1 } from './strategy-contract-v1.mjs';
import { validateStrategyProductionOutputV1 } from './strategy-production-input-v1.mjs';

// Adapter over the existing seven-role generator and shared structured runtime.
// The source reviewer is a separate evidence producer; its opinions never
// become an edit command. General/faction/directed-matchup inputs share this seam.
export function createEvidenceReviewedStrategyProductionV1({ input, generator, reviewer, store }) {
  verifySeal(input);
  async function audit(policy, history) {
    const { hash: omitted, ...body } = input.contract;
    if (!body.requiredAxes.includes(policy.axis)) fail('STRATEGY_ROLE_AXIS_DRIFT');
    validateStrategyDraftV1({ policies: [policy] }, seal({ ...body, requiredAxes: [policy.axis] }), {
      allowedRuleRefs: input.workspace.fullFrozenSources.sources.map(s => s.ref),
      allowedCaseIds: input.workspace.developmentCases.map(c => c.caseId) });
    const targets = strategyFieldTargetsV1(), reviews = [];
    for (let start = 0; start < targets.length; start += 4) {
      const prepared = prepareStrategyEvidenceReviewV1({ input, policy, history, targets: targets.slice(start, start + 4) });
      const result = await reviewer.review(prepared);
      verifySeal(result); verifySeal(result.evidence);
      if (result.preparedHash !== prepared.hash || result.evidence.policyHash !== hash(policy)) fail('STRATEGY_PRODUCTION_REVIEW_DRIFT');
      reviews.push(result);
    }
    const lifecycle = reconcileStrategyReviewOpinionsV1(reviews.map(r => r.evidence), hash(policy));
    const candidate = seal({ schema: 'strategy_evidence_reviewed_candidate_v1', inputHash: input.hash, axis: policy.axis,
      policy, roleHistory: history, reviews, lifecycle,
      status: lifecycle.open || lifecycle.uncertain ? 'needs_independent_adjudication' : 'model_review_clear_pending_independent_validation',
      sourceReviewIndependentlyVerified: false, strategyEffectivenessProven: false,
      automaticRepairPerformed: false, runtimeAccepted: false, trainingTruth: false });
    const lease = store.acquire('evidence-reviewed-candidate.' + candidate.hash.slice(0, 48), { candidateHash: candidate.hash });
    return lease.cached ? lease.artifact : store.finish(lease, candidate);
  }
  async function produceAxis(axis) {
    if (!input.contract.requiredAxes.includes(axis)) fail('STRATEGY_ROLE_AXIS_DRIFT');
    const history = []; let policy = null;
    for (const stage of STRATEGY_ROLE_ORDER_V1) {
      const kind = ['proposer', 'generator'].includes(stage) ? 'policy' : 'notes';
      const artifact = await generator.role({ axis, stage, kind, history, currentPolicy: policy });
      verifySeal(artifact); history.push(artifact);
      if (kind === 'policy') policy = artifact.value.policy;
    }
    return audit(policy, history);
  }
  async function resumeMaterialized({ artifact, history }) {
    verifySeal(artifact);
    if (artifact.schema !== 'strategy_host_materialized_role_v2' || artifact.parentProposal.inputHash !== input.hash
      || hash(artifact.value.policy) !== hash(artifact.patch.policy)
      || !history.some(a => a.hash === artifact.hash)) fail('STRATEGY_PRODUCTION_RESUME_DRIFT');
    return audit(artifact.value.policy, history);
  }
  // Reflection input must have been built by the existing bound development-
  // feedback constructor. Heldout feedback is not a teaching input.
  async function revisePolicy() {
    const reflection = input.workspace.reflection;
    if (!reflection || reflection.feedback.evaluationSplit !== 'development'
      || reflection.feedback.inputHash !== input.lineage?.parentInputHash
      || reflection.feedback.hash !== input.lineage.feedbackHash
      || reflection.parentLayer.hash !== input.lineage.parentLayerHash) fail('STRATEGY_REFLECTION_BINDING_DRIFT');
    verifySeal(reflection.feedback); verifySeal(reflection.parentLayer);
    const before = reflection.parentLayer.draft.policies.find(p => p.axis === reflection.axis);
    if (!before) fail('STRATEGY_REFLECTION_AXIS_INVALID');
    const history = [reflection.feedback];
    const proposal = await generator.role({ axis: before.axis, stage: 'targeted-repair', kind: 'policy', history,
      currentPolicy: before, findings: reflection.findings });
    verifySeal(proposal);
    const patch = materializeStrategyFieldPatchV2({ before, proposal: proposal.value.policy, findings: reflection.findings,
      priorHashes: [hash(before)] });
    history.push(seal({ schema: 'strategy_host_materialized_role_v2', parentProposal: proposal, patch,
      value: { policy: patch.policy }, runtimeAccepted: false, trainingTruth: false }));
    const candidate = await audit(patch.policy, history);
    const draft = { policies: reflection.parentLayer.draft.policies.map(p => p.axis === before.axis ? patch.policy : p) };
    validateStrategyProductionOutputV1(input, draft);
    return seal({ schema: 'strategy_evidence_reflection_candidate_v1', candidate,
      layer: createStrategyLayerV1({ contract: input.contract, draft, author: 'model_candidate' }),
      parentLayerHash: reflection.parentLayer.hash, feedbackHash: reflection.feedback.hash,
      changedAxis: before.axis, allPriorAcceptanceInvalidated: true, runtimeAccepted: false, trainingTruth: false });
  }
  return Object.freeze({ produceAxis, resumeMaterialized, revisePolicy });
}
