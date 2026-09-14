import { fail, hash, seal, verifySeal } from '../skill-production/common.mjs';
import { createStrategyStructuredWorkflowV1, createStrategyRoleContractsV1, STRATEGY_ROLE_ORDER_V1,
  assertStrategyLocalizedRepairV1 } from './strategy-structured-workflow-v1.mjs';
import { validateStarcraftTmgProviderJsonSchemaValueV1 } from '../structured-generation/output-contract-registry-v1.mjs';
import { createStrategyLayerV1 } from './strategy-contract-v1.mjs';
import { validateStrategyProductionOutputV1 } from './strategy-production-input-v1.mjs';

// The model proposes values, while the host applies an allowlisted patch.
// Unrequested fields are copied from the exact parent, not trusted model echo.
// Preserve both the original proposal and a receipt of every discarded edit.
export function materializeStrategyFieldPatchV2({ before, proposal, findings, priorHashes = [] }) {
  const contract = createStrategyRoleContractsV1().policy;
  if (!validateStarcraftTmgProviderJsonSchemaValueV1(contract.providerSchema, { policy: proposal }).ok) fail('STRATEGY_ROLE_SCHEMA_INVALID');
  const fields = [...new Set(findings.map(f => f.field))];
  if (!fields.length || fields.some(f => f === 'axis' || !Object.hasOwn(before, f))
    || before.axis !== proposal.axis) fail('STRATEGY_REPAIR_TARGET_REQUIRED');
  const policy = Object.fromEntries(Object.keys(before).map(field => [field, fields.includes(field) ? proposal[field] : before[field]]));
  assertStrategyLocalizedRepairV1(before, policy, findings, priorHashes);
  return seal({ schema: 'strategy_host_field_patch_v2', parentHash: hash(before), proposalHash: hash(proposal),
    authorizedFields: fields, ignoredUnrequestedEdits: Object.keys(before)
      .filter(f => !fields.includes(f) && hash(before[f]) !== hash(proposal[f]))
      .map(field => ({ field, parentValueHash: hash(before[field]), proposedValueHash: hash(proposal[field]) })),
    policy, semanticAcceptanceInherited: false, runtimeAccepted: false, trainingTruth: false });
}

export function createStrategyStructuredWorkflowV2(options) {
  const base = createStrategyStructuredWorkflowV1(options);
  async function produceAxis(axis) {
    const history = []; let policy = null;
    for (const stage of STRATEGY_ROLE_ORDER_V1) {
      const kind = ['proposer', 'generator'].includes(stage) ? 'policy' : 'notes';
      const artifact = await base.role({ axis, stage, kind, history, currentPolicy: policy });
      history.push(artifact); if (kind === 'policy') policy = artifact.value.policy;
    }
    const priorHashes = [hash(policy)];
    for (let round = 0; round <= 2; round++) {
      const host = options.sourceReviewFindingsForPolicy?.(policy) || null;
      if (host) {
        verifySeal(host);
        const refs = new Set(options.input.workspace.fullFrozenSources.sources.map(s => s.ref));
        if (host.policyHash !== hash(policy) || host.inputHash !== options.input.hash
          || !validateStarcraftTmgProviderJsonSchemaValueV1(createStrategyRoleContractsV1().review.providerSchema, host.value).ok
          || host.value.findings.some(f => f.ruleRefs.some(ref => !refs.has(ref)))) fail('STRATEGY_HOST_REVIEW_BINDING_DRIFT');
        history.push(host);
      }
      const modelReview = await base.role({ axis, stage: 'source-review', kind: 'review', round, history, currentPolicy: policy });
      const review = host ? seal({ schema: 'strategy_combined_review_v2', modelReview, hostReview: host,
        value: { findings: [...modelReview.value.findings, ...host.value.findings],
          limitations: [...modelReview.value.limitations, ...host.value.limitations] },
        runtimeAccepted: false, trainingTruth: false }) : modelReview;
      history.push(review);
      if (!review.value.findings.length) return seal({ schema: 'strategy_axis_candidate_v2', axis, policy,
        roleArtifacts: history, repairRounds: round, modelReviewHasNoOpenFindings: true,
        sourceReviewIndependentlyVerified: false, runtimeAccepted: false, trainingTruth: false });
      if (round === 2) fail('STRATEGY_REPAIR_BUDGET_EXHAUSTED', { axis, reviewHash: review.hash });
      const proposal = await base.role({ axis, stage: 'targeted-repair', kind: 'policy', round, history,
        currentPolicy: policy, findings: review.value.findings });
      const patch = materializeStrategyFieldPatchV2({ before: policy, proposal: proposal.value.policy,
        findings: review.value.findings, priorHashes });
      const artifact = seal({ schema: 'strategy_host_materialized_role_v2', parentProposal: proposal,
        patch, value: { policy: patch.policy }, runtimeAccepted: false, trainingTruth: false });
      const lease = options.store.acquire('strategy-field-patch.' + proposal.hash.slice(0, 48), { patchHash: patch.hash });
      const stored = lease.cached ? lease.artifact : options.store.finish(lease, artifact);
      verifySeal(stored);
      if (stored.hash !== artifact.hash) fail('STRATEGY_REPAIR_MATERIALIZATION_DRIFT');
      policy = patch.policy; priorHashes.push(hash(policy)); history.push(stored);
    }
  }
  async function produce() {
    const axes = [];
    for (const axis of options.input.contract.requiredAxes) axes.push(await produceAxis(axis));
    const draft = { policies: axes.map(a => a.policy) };
    return seal({ schema: 'strategy_structured_production_result_v2', inputHash: options.input.hash,
      planHash: base.plan.hash, layer: createStrategyLayerV1({ contract: options.input.contract, draft, author: 'model_candidate' }),
      validation: validateStrategyProductionOutputV1(options.input, draft), axes,
      status: 'candidate_pending_independent_source_and_case_evaluation', runtimeAccepted: false, trainingTruth: false });
  }
  async function revisePolicy() {
    const reflection = options.input.workspace.reflection;
    if (!reflection) fail('STRATEGY_REFLECTION_CONTEXT_REQUIRED');
    const before = reflection.parentLayer.draft.policies.find(p => p.axis === reflection.axis);
    const history = [reflection.feedback];
    const proposal = await base.role({ axis: before.axis, stage: 'targeted-repair', kind: 'policy', history,
      currentPolicy: before, findings: reflection.findings });
    const patch = materializeStrategyFieldPatchV2({ before, proposal: proposal.value.policy,
      findings: reflection.findings, priorHashes: [hash(before)] });
    const artifact = seal({ schema: 'strategy_host_materialized_role_v2', parentProposal: proposal,
      patch, value: { policy: patch.policy }, runtimeAccepted: false, trainingTruth: false });
    history.push(artifact);
    const review = await base.role({ axis: before.axis, stage: 'source-review', kind: 'review', history, currentPolicy: patch.policy });
    if (review.value.findings.length) fail('STRATEGY_REFLECTION_REVIEW_UNRESOLVED', { reviewHash: review.hash });
    const draft = { policies: reflection.parentLayer.draft.policies.map(p => p.axis === before.axis ? patch.policy : p) };
    validateStrategyProductionOutputV1(options.input, draft);
    return seal({ schema: 'strategy_reflection_candidate_v2', parentHash: reflection.parentLayer.hash,
      inputHash: options.input.hash, artifact, review,
      layer: createStrategyLayerV1({ contract: options.input.contract, draft, author: 'model_candidate' }),
      allPriorAcceptanceInvalidated: true, runtimeAccepted: false, trainingTruth: false });
  }
  return Object.freeze({ ...base, produceAxis, produce, revisePolicy });
}
