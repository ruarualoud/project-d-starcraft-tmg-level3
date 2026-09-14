import { fail, hash, seal, verifySeal } from '../skill-production/common.mjs';
import { createStarcraftTmgOutputContractV1, validateStarcraftTmgProviderJsonSchemaValueV1 } from
  '../structured-generation/output-contract-registry-v1.mjs';
import { createStrategyContractV1, validateStrategyDraftV1 } from './strategy-contract-v1.mjs';
import { partitionStrategyCasesV1 } from './strategy-case-compiler-v1.mjs';
import { createOfficialFaqRuleRouterV2 } from '../rule-atoms/official-faq-rule-router-v2.mjs';

const string = { type: 'string', minLength: 1, maxLength: 4000 };
const array = (items, minItems = 1, maxItems = 32) => ({ type: 'array', items, minItems, maxItems });
const object = properties => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });

export function createStrategyOutputContractV1(contract) {
  verifySeal(contract);
  const providerSchema = object({ policies: array(object({
    axis: { ...string, enum: contract.requiredAxes }, title: string, when: array(string), objective: string,
    decisionProcedure: array(string), alternatives: array(object({ option: string, preferWhen: string }), 2, 8),
    opponentBranches: array(object({ response: string, adaptation: string }), 1, 8),
    risk: string, reviseIf: array(string), requiredQueries: array(string), ruleRefs: array(string, 0), caseIds: array(string, 0),
  }), 1, 64) });
  return createStarcraftTmgOutputContractV1({ id: `strategy.${contract.scope.family}.policies`, version: '1.0.0',
    schemaName: `strategy_${contract.scope.family}_policies`, providerSchema,
    modelOwnedFields: ['policies'], hostOwnedFields: ['scope', 'sourceBinding', 'dependencies', 'status', 'runtimeAccepted'],
    mapperRef: { id: 'strategy.host-binding', version: '1.0.0', hash: hash({ mapping: 'unchanged_policy_body_with_separate_host_bindings_v1' }) },
    // Protocol identity must not drift with matchup direction, source epoch or
    // a particular candidate. Those belong in the hashed INPUT contract.
    semanticValidatorRef: { id: 'strategy.conditional-policy', version: '1.0.0', hash: hash({
      semantics: 'source_addresses_and_cases_are_validated_separately_from_strategy_effectiveness_v1' }) },
    description: 'Conditional advisory policies; no model-owned authority or acceptance flags.' });
}

// Shared by general, faction and each DIRECTION of matchup production. The
// historical v1 source-reading generator and its input hashes are unchanged.
// This prepares the structured-runtime seam; it never calls a Provider.
export function prepareStrategyProductionInputV1({ frozenInput, scope, dependencies = [], cases, seed = null }) {
  verifySeal(frozenInput); verifySeal(frozenInput.frozenSources);
  const context = frozenInput.frozenSources;
  if (context.completeCoreAndFaqExposed !== true || context.refreshPerformed !== false
    || hash(context.sourceBinding) !== hash(frozenInput.sourceBinding)) fail('STRATEGY_FULL_SOURCE_CONTEXT_REQUIRED');
  const contract = createStrategyContractV1({ scope, sourceBinding: frozenInput.sourceBinding,
    referenceHash: frozenInput.overallDependencyHash, dependencies });
  if (seed) {
    verifySeal(seed);
    if (seed.contract.hash !== contract.hash) fail('STRATEGY_SEED_BINDING_DRIFT');
  }
  const { development, heldout } = partitionStrategyCasesV1(cases);
  if (!development.length) fail('STRATEGY_DEVELOPMENT_CASES_REQUIRED');
  if (cases.some(c => hash(c.prompt.binding.sourceBinding) !== hash(contract.sourceBinding))) fail('STRATEGY_CASE_SOURCE_DRIFT');
  const outputContract = createStrategyOutputContractV1(contract);
  const faq = createOfficialFaqRuleRouterV2({ sourceBinding: contract.sourceBinding, sources: context.prompt.sources });
  const developmentAxes = new Set(development.flatMap(c => c.prompt.policyAxes));
  return seal({ schema: 'starcraft_strategy_production_input_v1', contract, outputContract,
    workspace: { fullFrozenSources: context.prompt,
      faqInterpretation: { manifest: faq.manifest, sourcePrecedence: 'frozen_official_text_over_legacy_generated_summary',
        // Predicate boundary probes, NOT claimed real units or full moves.
        faq46BoundaryProbes: [1, 2, 3].map(modelSize => ({ kind: 'synthetic_size_predicate_boundary',
          input: { unitIsRaptor: true, modelSize, crossesForceField: true },
          result: faq.evaluate('faq-v1:46', { unitIsRaptor: true, modelSize, crossesForceField: true }) })) },
      rulesReference: frozenInput.overallSkill, operationalGuide: frozenInput.operationalGuide,
      strategyDependencies: dependencies, conditionalStrategySeed: seed,
      developmentCases: development.map(c => c.prompt),
      instruction: 'Write conditional decision policies, not another rules digest. Preserve source-backed rule constraints; mark missing evidence as probe-needed in risk. Compare alternatives and an opponent-response branch. Cases contain only pre-action player-view information. Cite only supplied source refs/case IDs. Do not infer optimal play from legality or source consensus. Use the declared JSON Schema; never invent host authority fields.' },
    evaluationManifest: { heldoutCount: heldout.length, heldoutInputsIncludedInWorkspace: false,
      developmentCaseHashes: development.map(c => c.hash), heldoutCaseHashes: heldout.map(c => c.hash),
      uncoveredAxes: contract.requiredAxes.filter(axis => !developmentAxes.has(axis)),
      runtimeCoverageGaps: [...new Set(cases.flatMap(c => c.prompt.runtimeCoverage.excludedSourceRefs))],
      sourceReviewRequired: true, decisionConsumerRunRequired: true, wholeGameEvaluationRequired: true },
    readiness: { structuredContractPrepared: true, providerCapabilityProbePassed: false,
      paidProductionReady: false, reason: 'capability_probe_and_runtime_coverage_review_required_before_paid_dispatch' },
    paidCalls: 0, runtimeAccepted: false, trainingTruth: false });
}

export function validateStrategyProductionOutputV1(input, draft) {
  verifySeal(input);
  const schemaResult = validateStarcraftTmgProviderJsonSchemaValueV1(input.outputContract.providerSchema, draft);
  if (!schemaResult.ok) fail('STRATEGY_STRUCTURED_OUTPUT_INVALID', { issues: schemaResult.issues });
  validateStrategyDraftV1(draft, input.contract, {
    allowedRuleRefs: input.workspace.fullFrozenSources.sources.map(s => s.ref),
    allowedCaseIds: input.workspace.developmentCases.map(c => c.caseId),
  });
  for (const policy of draft.policies) {
    if (policy.caseIds.some(id => !input.workspace.developmentCases
      .find(c => c.caseId === id)?.policyAxes.includes(policy.axis))) fail('STRATEGY_CASE_AXIS_MISMATCH');
  }
  return seal({ schema: 'starcraft_strategy_output_validation_v1', inputHash: input.hash, draftHash: hash(draft),
    structurePassed: true, sourceAddressesValid: true, caseAddressesValid: true,
    missingSourcePolicies: draft.policies.map((p, i) => !p.ruleRefs.length ? i : -1).filter(i => i >= 0),
    untestedPolicies: draft.policies.map((p, i) => !p.caseIds.length ? i : -1).filter(i => i >= 0),
    sourceReviewPassed: false, decisionCasesPassed: false, strategyEffectivenessProven: false,
    runtimeAccepted: false, trainingTruth: false });
}
