import assert from 'node:assert/strict';
import { hash, seal } from '../packages/skill-production/common.mjs';
import { repairStrategyDecisionComparisonCoverageV1 } from '../packages/strategy-skills/strategy-decision-local-repair-v1.mjs';
import { createStrategyRoleContractsV1 } from '../packages/strategy-skills/strategy-structured-workflow-v1.mjs';
import { outputContractRefStarcraftTmgV1 } from '../packages/structured-generation/output-contract-registry-v1.mjs';
import { withStrategyDecisionComparisonRecoveryV1 } from '../packages/structured-generation/adapters/strategy-decision-comparison-recovery-v1.mjs';

const prompt = seal({ schema: 'starcraft_strategy_case_prompt_v1', caseId: 'fixture.case',
  candidates: [{ candidateId: 'ordinary', intent: 'move without spending' },
    { candidateId: 'boost', intent: 'move and spend resource' }], trainingTruth: false });
const evaluation = seal({ schema: 'starcraft_strategy_case_evaluation_v1', promptHash: prompt.hash,
  preferredCandidateIds: ['ordinary'], trainingTruth: false });
const compiled = seal({ schema: 'starcraft_compiled_strategy_case_v1', prompt, evaluation,
  runtimeAccepted: false, trainingTruth: false });
const rejected = seal({ version: 'starcraft_tmg_structured_generation_runtime_v1.rejected-candidate',
  providerValue: { candidateId: 'ordinary', comparisons: [{ candidateId: 'boost', tradeoff: 'spends a resource' }],
    opponentResponse: 'opponent contests the point', reviseIf: 'boost is required to reach' },
  validation: { ok: false, issues: [{ path: '$.comparisons', code: 'array_too_short',
    actualItems: 1, minItems: 2, maxItems: 32 }] }, runtimeAccepted: false, trainingTruth: false });
const repaired = repairStrategyDecisionComparisonCoverageV1({ compiled, rejectedCandidate: rejected });
assert.equal(repaired.value.candidateId, 'ordinary');
assert.deepEqual(repaired.value.comparisons.map(row => row.candidateId), ['ordinary', 'boost']);
assert.equal(repaired.localChange.addedComparisonForSelectedCandidate, 'ordinary');
assert.equal(repaired.grade.decisionPreferencePassed, true);
assert.equal(repaired.providerRegenerationCalls, 0);
assert.equal(repaired.runtimeAccepted, false);

const missingOther = seal({ ...Object.fromEntries(Object.entries(rejected).filter(([key]) => key !== 'hash')),
  providerValue: { ...rejected.providerValue, candidateId: 'boost', comparisons: [{ candidateId: 'boost', tradeoff: 'self' }] } });
assert.throws(() => repairStrategyDecisionComparisonCoverageV1({ compiled, rejectedCandidate: missingOther }),
  error => error.code === 'STRATEGY_DECISION_LOCAL_REPAIR_NOT_SAFE');
const wrongIssue = seal({ ...Object.fromEntries(Object.entries(rejected).filter(([key]) => key !== 'hash')),
  validation: { ok: false, issues: [{ path: '$.candidateId', code: 'enum_mismatch' }] } });
assert.throws(() => repairStrategyDecisionComparisonCoverageV1({ compiled, rejectedCandidate: wrongIssue }),
  error => error.code === 'STRATEGY_DECISION_LOCAL_REPAIR_NOT_APPLICABLE');

const contract = createStrategyRoleContractsV1().decision;
const contractRef = outputContractRefStarcraftTmgV1(contract);
const capabilityReceipt = { receiptHash: hash('capability') };
const failureBody = { code: 'STRUCTURED_PROVIDER_SCHEMA_INVALID', status: 200, usageKnown: true,
  usage: { inputUnits: 100, outputUnits: 20, totalUnits: 120, inputCacheHitUnits: 0, inputCacheMissUnits: 100 },
  physicalAttempts: 1, automaticRetries: 0, capabilityReceiptHash: capabilityReceipt.receiptHash };
const providerError = Object.assign(new Error(failureBody.code), { code: failureBody.code,
  safeReceipt: { ...failureBody, receiptHash: hash(failureBody) } });
Object.defineProperties(providerError, { transientCandidate: { value: rejected.providerValue },
  transientValidation: { value: rejected.validation } });
const providerRequest = { requestId: 'structured-fixture', roleRef: { id: 'role', version: '1', hash: hash('role') },
  input: JSON.stringify({ hostTask: { stage: 'decision-consumer', kind: 'decision' }, evaluationPrompt: prompt }),
  outputContractRef: contractRef };
const adapter = withStrategyDecisionComparisonRecoveryV1({ complete: async () => { throw providerError; } });
const adapterResult = await adapter.complete({ providerRequest, outputContract: contract, capabilityReceipt });
assert.equal(adapterResult.output.comparisons.length, 2);
assert.equal(adapterResult.usageReceipt.additionalProviderAttempts, 0);
assert.equal(adapterResult.usageReceipt.responseNormalization.preferenceChanged, false);
const duplicateValue = { ...rejected.providerValue, comparisons: [
  { candidateId: 'boost', tradeoff: 'costs one resource' },
  { candidateId: 'boost', tradeoff: 'also adds self-damage' },
] };
const successBody = { schemaVersion: 'fixture.success', capabilityReceiptHash: capabilityReceipt.receiptHash,
  usage: failureBody.usage, physicalAttempts: 1, automaticRetries: 0 };
const dynamicAdapter = withStrategyDecisionComparisonRecoveryV1({ complete: async () => ({
  output: duplicateValue, usageReceipt: { ...successBody, receiptHash: hash(successBody) },
  localValidationReceipt: { valid: true },
}) });
const dynamicResult = await dynamicAdapter.complete({ providerRequest, outputContract: contract, capabilityReceipt });
assert.deepEqual(dynamicResult.output.comparisons.map(row => row.candidateId), ['ordinary', 'boost']);
assert.equal(dynamicResult.usageReceipt.responseNormalization.recoveryKind,
  'dynamic_candidate_coverage_missing_selected_candidate');
assert.equal(dynamicResult.usageReceipt.responseNormalization.discardedDuplicateComparisonHashes.length, 1);
assert.equal(dynamicResult.usageReceipt.additionalProviderAttempts, 0);

console.log(JSON.stringify({ passed: true, repairedFields: ['comparisons'], providerCalls: 0,
  preferenceReplayPassed: repaired.grade.decisionPreferencePassed }));
