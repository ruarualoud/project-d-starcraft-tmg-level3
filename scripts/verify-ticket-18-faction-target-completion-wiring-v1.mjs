import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { prepareDshLoop } from '../packages/skill-production/loops.mjs';
import { createFactionNativeProductionRuntimeV1, prepareFactionNativeProductionRoleV1, usesFactionNativeProductionInputV1 }
  from '../packages/skill-production-v3/faction-native-production-runtime-v1.mjs';
import { createFactionStructuredReviewRuntimeV1 } from '../packages/skill-production-v3/faction-structured-review-runtime-v1.mjs';
import { verifyFactionStructuredRoleReplayV1 } from '../packages/skill-evaluation/faction-structured-replay-v1.mjs';
import { createFactionReplayRuntimeStackV1, loadFactionStructuredReplayDependenciesV1 } from '../packages/skill-evaluation/faction-replay-runtime-stack-v1.mjs';
import { readFactionTeachFailureEvidenceV1 } from '../packages/skill-evaluation/faction-teach-failure-evidence-v1.mjs';
import { readFactionStructuredSuccessEvidenceV1 } from '../packages/skill-evaluation/faction-structured-success-evidence-v1.mjs';
import { createFactionReviewTargetsV1 } from '../packages/skill-production-v3/faction-review-targets-v1.mjs';
import { createFactionReviewBatchPlanV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { FACTION_NATIVE_PRODUCTION_BINDING_V1 as nativeBinding } from '../content/skill-generation/ticket-18-faction-native-production-contracts-v1.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V5 as reviewContract } from '../content/skill-generation/ticket-18-faction-review-output-contract-v1.mjs';
import { FACTION_TARGET_COMPLETION_BINDING_V1 as binding } from '../packages/skill-production-v3/faction-target-completion-binding-v1.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as profile } from '../content/skill-generation/offline-provider-profile-v1.mjs';
import { createStarcraftTmgProviderProfileRegistryV2 } from '../packages/secure-provider-runtime/provider-profile-registry-v2.mjs';
import { createStarcraftTmgProviderCapabilityReceiptV1 } from '../packages/structured-generation/provider-capability-receipt-v1.mjs';
import { STARCRAFT_TMG_JSON_SCHEMA_SUBSET_VERSION } from '../packages/structured-generation/output-contract-registry-v1.mjs';
import { createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1 } from '../packages/structured-generation/adapters/deepseek-responses-json-schema-v1.mjs';
import { createStarcraftTmgInMemoryStructuredFaultAdapterV1 } from '../packages/structured-generation/adapters/in-memory-fault-injection-v1.mjs';

const base = 'build/ticket-18-faction-production-v1/', filename = 'build/ticket-17-production-redesign-v1/production.sqlite';
const read = async file => verifySeal(JSON.parse(await readFile(file, 'utf8')));
const root = process.cwd(), originRunId = 'faction-v1-e85faeb7af610d098c8c';
const originalRecipe = await read(base + originRunId + '/recipe.json');
const recipe = { ...originalRecipe, targetCompletionBinding: binding };
const diagnosis = await read(base + 'reasoner-answer-gap-diagnosis.json');
const unit = await read(base + 'target-completion-unit-readiness.json');
assert.equal(unit.passed, true);
const nativeInput = await read(base + 'zerg_swarm-input.json'), reviewInput = await read(base + 'terran_armed_forces-input.json');
const nativeEvidence = readFactionTeachFailureEvidenceV1({ filename, runId: originRunId, attemptId: unit.nativeOriginAttemptId });
const reviewEvidence = readFactionStructuredSuccessEvidenceV1({ filename, runId: originRunId, attemptId: unit.reviewOriginAttemptId });
const policy = { maxOutputUnits: 4096, attemptEstimateMicros: 800000, attemptTokenReserve: 500000,
  allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false, idempotentRetrySupported: false, encryptedRawQuarantineAvailable: false };
const dsh = await prepareDshLoop(root);
const dependencies = await loadFactionStructuredReplayDependenciesV1({ root, recipe });
let checks = 1;

async function nativeCase() {
  const request = diagnosis.request, prepared = prepareFactionNativeProductionRoleV1({ input: nativeInput, request, executionPolicy: policy });
  const egressBinding = createStarcraftTmgProviderProfileRegistryV2({ entries: [{ providerProfile: profile, responsePath: '/responses' }],
    allowedProviders: ['deepseek-openai-compatible-direct'] }).resolveEgressBinding({
    profileRef: { id: profile.providerProfileId, version: profile.version, hash: profile.integrity.hash } }).egressBinding;
  const now = Date.now(), capability = createStarcraftTmgProviderCapabilityReceiptV1({
    providerProfileRef: egressBinding.providerProfileRef, endpointPath: egressBinding.endpoint.path,
    endpointDialect: egressBinding.endpointDialect, model: egressBinding.model, capability: 'responses_json_schema',
    schemaSubsetVersion: STARCRAFT_TMG_JSON_SCHEMA_SUBSET_VERSION, outputContractRef: nativeBinding.contracts.reasoner,
    probeInputHash: hash('INJECTED ANSWER COMPLETION CAPABILITY'), probeOutputHash: hash('INJECTED CAPABILITY OUTPUT'),
    probeResult: 'accepted_schema_valid', usage: { inputUnits: 10, outputUnits: 10, totalUnits: 20 },
    usageKnown: true, physicalAttempts: 1, probedAt: new Date(now).toISOString(), expiresAt: new Date(now + 3600000).toISOString() });
  const outputs = unit.materialization.plan.batches.map(indices => ({
    answers: request.workspace.questions.filter(q => indices.includes(q.index)).map(q => ({ index: q.index,
      answer: 'INJECTED WIRING FIXTURE ONLY; an unevaluated answer, not strategy truth.', sourceRefs: q.sourceRefs })),
    uncertainties: ['Injected fixture must not be promoted.'] }));
  const fault = createStarcraftTmgInMemoryStructuredFaultAdapterV1({ steps: outputs.map(output => ({ kind: 'success', output })) });
  const sent = [], adapter = createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1({ send: args => { sent.push(args); return fault.send(args); } });
  const store = openProductionStore(':memory:', { runId: 'answer-completion-wiring', recipeHash: hash('answer-completion-wiring'),
    maxCalls: 2, maxCostMicros: 2000000, maxTokens: 1000000 });
  const artifacts = new Map(), responses = new Map(), inputs = new Map();
  const journal = { ...store, acquire(id, input) { inputs.set(id, input); return store.acquire(id, input); },
    finish(lease, value) { const saved = store.finish(lease, value); artifacts.set(saved.hash, saved); return saved; },
    settle(id, result) { const saved = store.settle(id, result); if (result.response?.usageReceipt)
      responses.set(result.response.usageReceipt.receiptHash, { response: result.response }); return saved; } };
  try {
    const runtime = createFactionNativeProductionRuntimeV1({ input: nativeInput, store: journal, dsh,
      runtime: { role: () => assert.fail('No legacy fallback') }, providerAdapter: adapter, egressBinding,
      capabilities: { reasoner: capability }, executionPolicy: policy, priceUsage: usage => usage.totalUnits,
      answerCompletionEnabled: true, answerCompletionImports: [nativeEvidence] });
    const value = await runtime.role(request);
    assert.deepEqual(value.output.answers.slice(0, 2), nativeEvidence.rejected.providerValue.answers.slice(0, 2)); checks++;
    assert.equal(value.output.answers.length, 6); checks++;
    assert.equal(fault.inspect().calls.length, 2); checks++;
    assert.equal((await runtime.role(request)).hash, value.hash); checks++;
    assert.equal(usesFactionNativeProductionInputV1(value), true); checks++;
    const proofArgs = { value, roleInput: prepared.roleInput, request, input: nativeInput, recipe,
      resolveArtifact: h => artifacts.get(h), resolveResponse: h => responses.get(h), resolveTeachFailureEvidence: () => nativeEvidence };
    const proof = verifyFactionStructuredRoleReplayV1(proofArgs);
    assert.equal(proof.providerReceiptHashes.length, 3); checks++;
    assert.throws(() => verifyFactionStructuredRoleReplayV1({ ...proofArgs, recipe: originalRecipe }),
      { code: 'FACTION_ANSWER_COMPLETION_CONSUMER_BINDING_REQUIRED' }); checks++;
    const raw = structuredClone(value); delete raw.hash; raw.output.answers[0].answer = 'Edited retained answer';
    assert.throws(() => verifyFactionStructuredRoleReplayV1({ ...proofArgs, value: seal(raw) }),
      { code: 'FACTION_ANSWER_COMPLETION_CONSUMER_DRIFT' }); checks++;
    // Exercise the OUTERMOST replay classifier as well as the inner verifier.
    const replay = { store: journal, bindRoleRequest() {}, readRoleSteps: () => [...artifacts.values()]
      .filter(a => a.roleId).map(artifact => ({ id: artifact.roleId, inputHash: hash(inputs.get(artifact.roleId)), artifact })) };
    const stack = await createFactionReplayRuntimeStackV1({ root, runId: originRunId, recipe, input: nativeInput, replay,
      runtime: { role: () => assert.fail('Aggregate must stay on native input lane') }, dependencies });
    assert.equal((await stack.runtime.role(request)).hash, value.hash); checks++;
    assert.equal(fault.inspect().calls.length, 2); checks++;
    return { value, proof, calls: sent.length };
  } finally { store.close(); }
}

async function reviewCase() {
  const previous = await read(base + 'five-chapter-consumer-replay-readiness.json');
  const { section, draft } = previous.pendingRequest.workspace;
  const batch = createFactionReviewBatchPlanV1({ section, draft }).batches.find(b => b.first === 2);
  const targets = createFactionReviewTargetsV1({ input: reviewInput, section, draft, indices: batch.reviewIndices });
  const request = { ...previous.pendingRequest,
    roleId: previous.pendingRequest.roleId.replace('supportive.0.0.', 'adversarial.0.2.'),
    instruction: previous.pendingRequest.instruction.replace('角色supportive', '角色adversarial'),
    workspace: { ...previous.pendingRequest.workspace, reviewIndices: batch.reviewIndices, coverageRequiredSourceRefs: batch.requiredSourceRefs,
      outputRequestAtEnd: { targetContract: targets, coverageOnlySourceRefs: batch.requiredSourceRefs } } };
  const capabilities = await read(base + originRunId + '/active-capabilities.json');
  let value, roleInput;
  const store = { acquire(id, body) { assert.equal(id, request.packet.id + '.' + request.roleId); roleInput ||= body;
    assert.deepEqual(body, roleInput); return value ? { cached: true, artifact: value } : { cached: false }; },
    finish(_lease, next) { value = next; return next; }, release() {} };
  const runtime = createFactionStructuredReviewRuntimeV1({ input: reviewInput, store, dsh, outputContract: reviewContract,
    executionPolicy: policy, capabilityReceipt: capabilities.catalogueReview, egressBinding: {},
    runtime: { role: () => assert.fail('No legacy') }, providerAdapter: { complete: () => assert.fail('No Provider') },
    priceUsage: () => assert.fail('No new billing'), includeSharedScenarioSources: true,
    completeReviewImports: [reviewEvidence], completeReviewImportBinding: binding.reviewImport, coverageAddressBinding: binding.coverageAddress });
  const reviewed = await runtime.role(request);
  assert.deepEqual(reviewed.output.coverage[0].recommendationIndices, [2]); checks++;
  assert.equal(reviewed.output.coverage[0].reason, reviewEvidence.candidate.providerValue.coverage[0].reason); checks++;
  assert.equal(reviewed.completeReviewImportProof.bindingHash, binding.reviewImport.hash); checks++;
  assert.equal((await runtime.role(request)).hash, reviewed.hash); checks++;
  const proof = verifyFactionStructuredRoleReplayV1({ value: reviewed, roleInput, request, input: reviewInput, recipe,
    resolveArtifact: h => [reviewEvidence.candidate, reviewEvidence.runtimeReceipt].find(a => a.hash === h),
    resolveResponse: () => ({ response: JSON.parse(reviewEvidence.attempt.response).value, originRunId }),
    resolveCompleteReviewImportEvidence: () => reviewEvidence });
  assert.equal(proof.providerReceiptHashes.length, 1); checks++;
  return { value: reviewed, proof };
}
// Both cases prepare a full, isolated pinned DSH job. Run them sequentially
// so this correctness gate does not turn local filesystem contention into a
// role timeout. Keep both assertions and the production 180-second deadline.
const native = await nativeCase();
const reviewed = await reviewCase();
const files = ['packages/skill-production-v3/faction-target-completion-binding-v1.mjs',
  'packages/skill-production-v3/faction-reasoner-answer-gap-v1.mjs',
  'packages/skill-production-v3/faction-reasoner-answer-completion-v1.mjs',
  'packages/skill-production-v3/faction-review-coverage-address-v2.mjs',
  'packages/skill-production-v3/faction-native-production-runtime-v1.mjs',
  'packages/skill-production-v3/faction-review-complete-output-import-v1.mjs',
  'packages/skill-production-v3/faction-structured-review-runtime-v1.mjs',
  'packages/skill-evaluation/faction-structured-replay-v1.mjs',
  'packages/skill-evaluation/faction-replay-runtime-stack-v1.mjs',
  'packages/skill-production-v3/faction-continuation-v1.mjs',
  'scripts/run-ticket-18-faction-strategy-production-v1.mjs',
  'scripts/verify-ticket-18-faction-target-completion-v1.mjs',
  'scripts/verify-ticket-18-faction-target-completion-wiring-v1.mjs'];
const report = seal({ passed: true, checks, binding, originRunId,
  nativeOriginAttemptId: unit.nativeOriginAttemptId, reviewOriginAttemptId: unit.reviewOriginAttemptId,
  nativeInputHash: nativeInput.hash, reviewInputHash: reviewInput.hash,
  nativeOriginalReceiptHash: native.value.hostMaterialization.originalFailureReceiptHash,
  reviewOriginalReceiptHash: reviewed.value.completeReviewImportProof.providerReceiptHash,
  actualContextRebuilt: true, nativeActualConsumerReplayPassed: true, reviewActualConsumerReplayPassed: true,
  outerNativeInputRouterTested: true, originalTwoAnswersPreserved: true, fullSourcesAndPriorContextPreserved: true,
  oldAddressV1Preserved: unit.oldAddressV1Preserved, unitReadinessHash: unit.hash,
  actualDshSessions: 3, injectedNativeCalls: native.calls, providerCalls: 0,
  semanticAcceptance: false, actualSkillsAccepted: 0, sourceRefreshPerformed: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
await writeFile(base + 'target-completion-readiness.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, actualDshSessions: 3, injectedNativeCalls: native.calls, providerCalls: 0, hash: report.hash }));
