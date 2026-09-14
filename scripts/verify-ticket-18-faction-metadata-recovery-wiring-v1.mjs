import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { prepareDshLoop } from '../packages/skill-production/loops.mjs';
import { createFactionNativeProductionRuntimeV1, prepareFactionNativeProductionRoleV1 } from '../packages/skill-production-v3/faction-native-production-runtime-v1.mjs';
import { createFactionStructuredReviewRuntimeV1 } from '../packages/skill-production-v3/faction-structured-review-runtime-v1.mjs';
import { createFactionReviewTargetsV1 } from '../packages/skill-production-v3/faction-review-targets-v1.mjs';
import { createFactionReviewBatchPlanV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { verifyFactionStructuredRoleReplayV1 } from '../packages/skill-evaluation/faction-structured-replay-v1.mjs';
import { readFactionTeachFailureEvidenceV1 } from '../packages/skill-evaluation/faction-teach-failure-evidence-v1.mjs';
import { readFactionStructuredSuccessEvidenceV1 } from '../packages/skill-evaluation/faction-structured-success-evidence-v1.mjs';
import { verifyFactionReviewCompleteOutputImportV1 } from '../packages/skill-production-v3/faction-review-complete-output-import-v1.mjs';
import { FACTION_METADATA_RECOVERY_BINDING_V1 as binding } from '../packages/skill-production-v3/faction-metadata-recovery-binding-v1.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V5 as contract } from '../content/skill-generation/ticket-18-faction-review-output-contract-v1.mjs';
const base = 'build/ticket-18-faction-production-v1/', filename = 'build/ticket-17-production-redesign-v1/production.sqlite';
const read = async file => verifySeal(JSON.parse(await readFile(file, 'utf8')));
const runId = 'faction-v1-a266c185ad305c8a954b';
const originalRecipe = await read(base + runId + '/recipe.json'), recipe = { ...originalRecipe, metadataRecoveryBinding: binding };
const nativeGate = await read(base + 'native-reference-set-readiness.json');
const input = await read(base + 'zerg_swarm-input.json');
const nativeEvidence = readFactionTeachFailureEvidenceV1({ filename, runId, attemptId: nativeGate.originAttemptId });
const policy = { maxOutputUnits: 4096, attemptEstimateMicros: 800000, attemptTokenReserve: 500000,
  allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false, idempotentRetrySupported: false, encryptedRawQuarantineAvailable: false };
const prepared = prepareFactionNativeProductionRoleV1({ input, request: nativeGate.request, executionPolicy: policy });
const memoryStore = () => { let value, roleInput, roleId; return {
  acquire(id, body) { roleId ||= id; roleInput ||= body; assert.equal(id, roleId); assert.deepEqual(body, roleInput);
    return value ? { cached: true, artifact: value } : { cached: false }; },
  finish(_lease, next) { value = next; return next; }, release() {}, readInput: () => roleInput }; };
let nativeImports = 0;
const nativeRuntime = createFactionNativeProductionRuntimeV1({ input, executionPolicy: policy, store: memoryStore(),
  runtime: { role: () => assert.fail('No fallback') }, referenceSetImports: [nativeEvidence],
  dsh: { binding: nativeGate.imported.loop.runtimeBinding, async run(call) {
    nativeImports++; assert.equal((await call.callModel()).receiptHash, nativeGate.materialization.hash); return nativeGate.imported.loop; } } });
const native = await nativeRuntime.role(nativeGate.request);
assert.equal(native.hash, nativeGate.imported.hash);
assert.equal((await nativeRuntime.role(nativeGate.request)).hash, native.hash);
assert.equal(nativeImports, 1);
const nativeProof = verifyFactionStructuredRoleReplayV1({ value: native, roleInput: prepared.roleInput,
  request: nativeGate.request, input, recipe, resolveTeachFailureEvidence: () => nativeEvidence });
assert.deepEqual(nativeProof.providerReceiptHashes, [nativeGate.materialization.originalFailureReceiptHash]);
assert.throws(() => verifyFactionStructuredRoleReplayV1({ value: native, roleInput: prepared.roleInput,
  request: nativeGate.request, input, recipe: originalRecipe, resolveTeachFailureEvidence: () => nativeEvidence }),
{ code: 'FACTION_NATIVE_REFERENCE_SET_CONSUMER_BINDING_REQUIRED' });
let checks = 5;

const terranInput = await read(base + 'terran_armed_forces-input.json');
const prior = await read(base + 'five-chapter-consumer-replay-readiness.json');
const { section, draft } = prior.pendingRequest.workspace;
const batch = createFactionReviewBatchPlanV1({ section, draft }).batches.find(b => b.first === 2);
const targets = createFactionReviewTargetsV1({ input: terranInput, section, draft, indices: batch.reviewIndices });
const reviewEvidence = readFactionStructuredSuccessEvidenceV1({ filename, runId,
  attemptId: 'structured-193b71dd003baf4ca65e2d2757ed10e6f8a35b65aa445d51' });
const request = { ...prior.pendingRequest, roleId: prior.pendingRequest.roleId.replace('supportive.0.0.', 'supportive.0.2.'),
  workspace: { ...prior.pendingRequest.workspace, reviewIndices: batch.reviewIndices, coverageRequiredSourceRefs: batch.requiredSourceRefs,
    outputRequestAtEnd: { targetContract: targets, coverageOnlySourceRefs: batch.requiredSourceRefs } } };
const capabilities = await read(base + runId + '/active-capabilities.json');
const store = memoryStore(), dsh = await prepareDshLoop(process.cwd());
const reviewRuntime = createFactionStructuredReviewRuntimeV1({ input: terranInput, store, dsh,
  outputContract: contract, executionPolicy: policy, capabilityReceipt: capabilities.catalogueReview,
  providerAdapter: { complete: () => assert.fail('No Provider') }, egressBinding: {}, priceUsage: () => assert.fail('No new billing'),
  runtime: { role: () => assert.fail('No legacy fallback') }, includeSharedScenarioSources: true,
  completeReviewImports: [reviewEvidence], coverageAddressBinding: binding.coverageAddress });
const reviewed = await reviewRuntime.role(request);
assert.deepEqual(reviewed.output.coverage[0].recommendationIndices, [2]); checks++;
assert.equal(reviewed.output.coverage[0].verdict, 'covered'); checks++;
assert.equal(reviewed.output.coverage[0].reason, JSON.parse(reviewEvidence.attempt.response).value.output.coverage[0].reason); checks++;
assert.equal(reviewed.hostMaterializationReceipt.coverageAddressResolution.repairs.length, 1); checks++;
assert.equal(reviewed.completeReviewImportProof.providerCalls, 0); checks++;
assert.equal((await reviewRuntime.role(request)).hash, reviewed.hash); checks++;
const roleInput = store.readInput();
const reviewProof = verifyFactionStructuredRoleReplayV1({ value: reviewed, roleInput, request, input: terranInput, recipe,
  resolveArtifact: h => [reviewEvidence.candidate, reviewEvidence.runtimeReceipt].find(r => r.hash === h),
  resolveResponse: () => ({ response: JSON.parse(reviewEvidence.attempt.response).value, originRunId: runId }),
  resolveCompleteReviewImportEvidence: () => reviewEvidence });
assert.deepEqual(reviewProof.providerReceiptHashes, [reviewed.completeReviewImportProof.providerReceiptHash]); checks++;
assert.throws(() => verifyFactionReviewCompleteOutputImportV1({ evidence: { ...reviewEvidence,
  attempt: { ...reviewEvidence.attempt, state: 'intent' } }, roleInput, fullRoleId: reviewed.roleId, contract }),
{ code: 'FACTION_REVIEW_COMPLETE_IMPORT_EVIDENCE_INVALID' }); checks++;
assert.throws(() => verifyFactionStructuredRoleReplayV1({ value: reviewed, roleInput, request, input: terranInput, recipe: originalRecipe,
  resolveArtifact: h => [reviewEvidence.candidate, reviewEvidence.runtimeReceipt].find(r => r.hash === h),
  resolveResponse: () => ({ response: JSON.parse(reviewEvidence.attempt.response).value }), resolveCompleteReviewImportEvidence: () => reviewEvidence }),
{ code: 'FACTION_REVIEW_COMPLETE_IMPORT_CONSUMER_BINDING_REQUIRED' }); checks++;
const files = ['packages/skill-production-v3/faction-metadata-recovery-binding-v1.mjs',
  'packages/skill-production-v3/faction-native-reference-set-recovery-v1.mjs',
  'packages/skill-production-v3/faction-native-production-runtime-v1.mjs',
  'packages/skill-production-v3/faction-review-coverage-address-v1.mjs',
  'packages/skill-production-v3/faction-review-complete-output-import-v1.mjs',
  'packages/skill-production-v3/faction-structured-review-runtime-v1.mjs',
  'packages/skill-evaluation/faction-structured-success-evidence-v1.mjs',
  'packages/skill-evaluation/faction-structured-replay-v1.mjs',
  'packages/skill-evaluation/faction-production-replay-v1.mjs',
  'scripts/diagnose-ticket-18-faction-review-coverage-v1.mjs',
  'scripts/verify-ticket-18-faction-native-reference-set-v1.mjs',
  'scripts/verify-ticket-18-faction-metadata-recovery-wiring-v1.mjs'];
const report = seal({ passed: true, checks, binding, originRunId: runId,
  nativeOriginAttemptId: nativeGate.originAttemptId, reviewOriginAttemptId: reviewEvidence.attempt.id,
  nativeInputHash: input.hash, reviewInputHash: terranInput.hash,
  nativeOriginalReceiptHash: nativeGate.materialization.originalFailureReceiptHash,
  reviewOriginalReceiptHash: reviewed.completeReviewImportProof.providerReceiptHash,
  sourceDuplicateRemovedOnly: true, exactTitleAddressResolutionOnly: true,
  nativeActualConsumerReplayPassed: true, reviewActualConsumerReplayPassed: true,
  completeContextRebuilt: true, actualDshSessions: 1, priorActualNativeDshLoopReused: true,
  providerCalls: 0, actualNewSemanticAcceptance: false, sourceRefreshPerformed: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
await writeFile(base + 'metadata-recovery-readiness.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, actualDshSessions: 1, providerCalls: 0, hash: report.hash }));
