import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { seal, verifySeal, hash, sha256 } from '../packages/skill-production/common.mjs';
import { prepareDshLoop } from '../packages/skill-production/loops.mjs';
import { FACTION_TARGET_ID_REVIEW_BINDING_V1 as binding } from '../packages/skill-production-v3/faction-target-id-review-binding-v1.mjs';
import { FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_V2 as oldBinding, resolveFactionReviewCoverageAddressesV2 } from '../packages/skill-production-v3/faction-review-coverage-address-v2.mjs';
import { resolveFactionReviewCoverageAddressesV3 } from '../packages/skill-production-v3/faction-review-coverage-address-v3.mjs';
import { readFactionStructuredSuccessEvidenceV1 } from '../packages/skill-evaluation/faction-structured-success-evidence-v1.mjs';
import { createFactionStructuredReviewRuntimeV1 } from '../packages/skill-production-v3/faction-structured-review-runtime-v1.mjs';
import { verifyFactionStructuredRoleReplayV1 } from '../packages/skill-evaluation/faction-structured-replay-v1.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V5 as contract } from '../content/skill-generation/ticket-18-faction-review-output-contract-v1.mjs';

const base = 'build/ticket-18-faction-production-v1/', json = async file => verifySeal(JSON.parse(await readFile(file, 'utf8')));
const diagnosis = await json(base + 'target-id-address-diagnosis.json');
assert.equal(diagnosis.passed, true); assert.equal(diagnosis.sourceReviewedChaptersRebuilt, 5);
const input = await json(base + 'terran_armed_forces-input.json'), originalRecipe = await json(base + diagnosis.originRunId + '/recipe.json');
assert.equal(input.hash, diagnosis.inputHash);
const recipe = { ...originalRecipe, targetIdReviewBinding: binding };
const evidence = readFactionStructuredSuccessEvidenceV1({ filename: 'build/ticket-17-production-redesign-v1/production.sqlite',
  runId: diagnosis.originRunId, attemptId: diagnosis.originAttemptId });
const request = diagnosis.request, w = request.workspace, targets = w.outputRequestAtEnd.targetContract;
const coverage = evidence.candidate.providerValue.coverage.map(row => ({ sourceRef: w.coverageRequiredSourceRefs[row.coverageSlot],
  verdict: row.verdict, recommendationIndices: row.recommendationIndices, reason: row.reason }));
const args = { coverage, targets, draft: w.draft };
for (let i = 0; i < 2; i++) assert.throws(() => resolveFactionReviewCoverageAddressesV2({ ...args, binding: oldBinding }),
  { code: 'FACTION_REVIEW_COVERAGE_SHORT_TITLE_UNRESOLVED' });
const result = resolveFactionReviewCoverageAddressesV3({ ...args, binding: binding.coverageAddress });
assert.deepEqual(coverage[0].recommendationIndices, [0]);
assert.deepEqual(result.coverage[0].recommendationIndices, [2]);
assert.equal(result.receipt.repairs[0].evidence[0].targetId, 'advice-2-d443e02d4c6a');
assert.equal(result.coverage[0].reason, coverage[0].reason);
assert.equal(result.coverage[0].verdict, coverage[0].verdict);
let checks = 10;
const exactId = targets.targets[0].targetId;
for (const delta of [
  { reason: coverage[0].reason.replace(exactId, 'advice-2-000000000000') },
  { reason: coverage[0].reason.replace(exactId, exactId + '-extra') },
  { reason: coverage[0].reason.replace(exactId, '') },
  { reason: coverage[0].reason + ' advice-99-000000000000' },
  { recommendationIndices: [1] }, { recommendationIndices: [0, 0] },
  { sourceRef: 'source:invented' },
]) {
  assert.throws(() => resolveFactionReviewCoverageAddressesV3({ ...args, coverage: [{ ...coverage[0], ...delta }],
    binding: binding.coverageAddress }), { code: 'FACTION_REVIEW_COVERAGE_TARGET_ID_UNRESOLVED' }); checks++;
}
for (const changed of [
  [{ ...coverage[0], recommendationIndices: [2] }],
  [{ ...coverage[0], reason: '(' + targets.targets[0].title.split(/[:：]/u)[0] + ')' }],
  [{ ...coverage[0], verdict: 'uncertain', recommendationIndices: [] }],
]) {
  assert.deepEqual(resolveFactionReviewCoverageAddressesV3({ ...args, coverage: changed, binding: binding.coverageAddress }),
    resolveFactionReviewCoverageAddressesV2({ ...args, coverage: changed, binding: oldBinding })); checks++;
}
const dsh = await prepareDshLoop(process.cwd()), capabilities = await json(base + diagnosis.originRunId + '/active-capabilities.json');
const policy = { maxOutputUnits: 4096, attemptEstimateMicros: 800000, attemptTokenReserve: 500000,
  allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false, idempotentRetrySupported: false, encryptedRawQuarantineAvailable: false };
let value, roleInput;
const store = { acquire(id, body) { assert.equal(id, request.packet.id + '.' + request.roleId);
  roleInput ||= body; assert.deepEqual(body, roleInput); return value ? { cached: true, artifact: value } : { cached: false }; },
  finish(_lease, saved) { value = saved; return saved; }, release() {} };
const runtime = createFactionStructuredReviewRuntimeV1({ input, store, dsh, outputContract: contract, executionPolicy: policy,
  runtime: { role: () => assert.fail('No legacy') }, providerAdapter: { complete: () => assert.fail('No Provider') },
  egressBinding: {}, priceUsage: () => assert.fail('No new billing'), capabilityReceipt: capabilities.catalogueReview,
  includeSharedScenarioSources: true, completeReviewImports: [evidence],
  coverageAddressBinding: binding.coverageAddress, completeReviewImportBinding: binding.reviewImport });
await runtime.role(request);
assert.equal(value.completeReviewImportProof.providerCalls, 0); checks++;
assert.equal(value.completeReviewImportProof.candidateHash, evidence.candidate.hash); checks++;
assert.equal((await runtime.role(request)).hash, value.hash); checks++;
const proofArgs = { value, roleInput, request, input, recipe,
  resolveArtifact: h => [evidence.candidate, evidence.runtimeReceipt].find(a => a.hash === h),
  resolveResponse: h => h === evidence.candidate.providerReceiptHash ? { response: verifySeal(JSON.parse(evidence.attempt.response)).value } : null,
  resolveCompleteReviewImportEvidence: () => evidence };
const proof = verifyFactionStructuredRoleReplayV1(proofArgs);
assert.deepEqual(proof.providerReceiptHashes, [diagnosis.originalReceiptHash]); checks++;
assert.throws(() => verifyFactionStructuredRoleReplayV1({ ...proofArgs, recipe: originalRecipe }),
  { code: 'FACTION_REVIEW_COMPLETE_IMPORT_CONSUMER_BINDING_REQUIRED' }); checks++;
const files = ['packages/skill-production-v3/faction-review-coverage-address-v3.mjs',
  'packages/skill-production-v3/faction-target-id-review-binding-v1.mjs', 'packages/skill-production-v3/faction-review-complete-output-import-v1.mjs',
  'packages/skill-production-v3/faction-structured-review-runtime-v1.mjs', 'packages/skill-evaluation/faction-structured-replay-v1.mjs',
  'packages/skill-production-v3/faction-continuation-v1.mjs', 'scripts/run-ticket-18-faction-strategy-production-v1.mjs',
  'scripts/diagnose-ticket-18-faction-target-id-address-v3.mjs', 'scripts/verify-ticket-18-faction-target-id-review-v1.mjs'];
const report = seal({ passed: true, checks, binding, originRunId: diagnosis.originRunId,
  reviewOriginAttemptId: diagnosis.originAttemptId, reviewInputHash: input.hash,
  originalReceiptHash: diagnosis.originalReceiptHash, originalCandidateHash: evidence.candidate.hash,
  actualContextRebuilt: true, consumerReplayPassed: true, originalJudgmentsPreserved: true,
  exactHostTargetIdOnly: true, oldAddressReceiptsPreserved: true, actualDshSessions: 1, providerCalls: 0,
  semanticAcceptanceInherited: false, actualSkillsAccepted: 0, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
await writeFile(base + 'target-id-review-readiness.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, actualDshSessions: 1, providerCalls: 0, hash: report.hash }));
