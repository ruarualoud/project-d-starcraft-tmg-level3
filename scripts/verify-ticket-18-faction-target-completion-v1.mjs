import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { prepareFactionNativeProductionRoleV1 } from '../packages/skill-production-v3/faction-native-production-runtime-v1.mjs';
import { readFactionTeachFailureEvidenceV1 } from '../packages/skill-evaluation/faction-teach-failure-evidence-v1.mjs';
import { readFactionStructuredSuccessEvidenceV1 } from '../packages/skill-evaluation/faction-structured-success-evidence-v1.mjs';
import { prepareFactionReasonerAnswerCompletionV1, factionReasonerCompletionRequestV1,
  validateFactionReasonerCompletionPartV1, assembleFactionReasonerAnswerCompletionV1,
  completeFactionReasonerAnswersV1 } from '../packages/skill-production-v3/faction-reasoner-answer-completion-v1.mjs';
import { resolveFactionReviewCoverageAddressesV1, FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_V1 as oldAddress }
  from '../packages/skill-production-v3/faction-review-coverage-address-v1.mjs';
import { resolveFactionReviewCoverageAddressesV2, FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_V2 as address }
  from '../packages/skill-production-v3/faction-review-coverage-address-v2.mjs';
import { createFactionReviewTargetsV1 } from '../packages/skill-production-v3/faction-review-targets-v1.mjs';
import { createFactionReviewBatchPlanV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { createFactionReviewContextCapsuleV1 } from '../packages/skill-production-v3/faction-review-context-capsule-v1.mjs';
import { materializeFactionStructuredReviewV1 } from '../packages/skill-production-v3/faction-structured-review-runtime-v1.mjs';
const base = 'build/ticket-18-faction-production-v1/', filename = 'build/ticket-17-production-redesign-v1/production.sqlite';
const read = async file => verifySeal(JSON.parse(await readFile(file, 'utf8')));
const diagnosis = await read(base + 'reasoner-answer-gap-diagnosis.json'), runId = diagnosis.runId;
const input = await read(base + 'zerg_swarm-input.json'), request = diagnosis.request;
const evidence = readFactionTeachFailureEvidenceV1({ filename, runId, attemptId: diagnosis.attemptId });
const policy = { maxOutputUnits: 4096, attemptEstimateMicros: 800000, attemptTokenReserve: 500000,
  allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false, idempotentRetrySupported: false, encryptedRawQuarantineAvailable: false };
const prepared = prepareFactionNativeProductionRoleV1({ input, request, executionPolicy: policy });
const args = { input, request, prepared, evidence };
const materialization = prepareFactionReasonerAnswerCompletionV1(args);
assert.equal(prepared.contextManifestRef.hash, evidence.rejected.contextManifestRef.hash);
assert.deepEqual(materialization.plan.batches, [[2, 3], [4, 5]]);
let checks = 2;
for (const patch of [{ state: 'intent' }, { code: 'PROVIDER_PAYMENT_REQUIRED' }, { code: 'STRUCTURED_PROVIDER_INCOMPLETE' }]) {
  assert.throws(() => prepareFactionReasonerAnswerCompletionV1({ ...args,
    evidence: { ...evidence, attempt: { ...evidence.attempt, ...patch } } }), { code: 'FACTION_ANSWER_COMPLETION_EVIDENCE_INVALID' }); checks++;
}
const calls = [], parts = [];
const completed = await completeFactionReasonerAnswersV1({ ...args, async role(child) {
  const batchIndex = calls.length; calls.push(child);
  assert.deepEqual(child.workspace.questionTree, request.workspace.questionTree);
  assert.deepEqual(child.workspace.questions, request.workspace.questions);
  assert.deepEqual(child.workspace.priorAnswerBatches, parts.map(p => p.output));
  const value = seal({ roleId: child.packet.id + '.' + child.roleId,
    output: { answers: child.workspace.answerTargetsAtEnd.map(q => ({ index: q.index,
      answer: 'INJECTED TRANSPORT FIXTURE ONLY; not an evaluated strategy answer.', sourceRefs: q.sourceRefs })),
    uncertainties: ['Injection-only; no strategic correctness claimed.'] },
    structuredDecodePassed: true, semanticAcceptance: false, trainingTruth: false });
  parts.push(value); return value;
} });
checks += 6;
assert.equal(calls.length, 2); checks++;
assert.deepEqual(completed.output.answers.slice(0, 2), evidence.rejected.providerValue.answers.slice(0, 2)); checks++;
assert.deepEqual(completed.output.answers.map(a => a.index), [0, 1, 2, 3, 4, 5]); checks++;
assert.equal(completed.freshCombinedJudgeRequired, true); checks++;
assert.throws(() => assembleFactionReasonerAnswerCompletionV1({ input, request, prepared, materialization, parts: parts.slice(0, 1) }),
  { code: 'FACTION_ANSWER_COMPLETION_ASSEMBLY_SCOPE' }); checks++;
for (const mutate of [o => { o.answers[0].index = 0; }, o => { o.answers.pop(); },
  o => { o.answers[0].sourceRefs = ['invented']; },
  o => { o.answers[0].answer = request.workspace.questions[2].question; }]) {
  const output = structuredClone(parts[0].output); mutate(output);
  assert.throws(() => validateFactionReasonerCompletionPartV1({ input, materialization, batchIndex: 0, output }),
    { code: 'FACTION_ANSWER_COMPLETION_PART_INVALID' }); checks++;
}

const terranInput = await read(base + 'terran_armed_forces-input.json');
const history = await read(base + 'five-chapter-consumer-replay-readiness.json');
const { section, draft } = history.pendingRequest.workspace;
const batch = createFactionReviewBatchPlanV1({ section, draft }).batches.find(b => b.first === 2);
const targets = createFactionReviewTargetsV1({ input: terranInput, section, draft, indices: batch.reviewIndices });
const reviewEvidence = readFactionStructuredSuccessEvidenceV1({ filename, runId,
  attemptId: 'structured-b0fb63adffb1dae58bcb69ef011977874d05e1f458a7a97f' });
const originalReview = reviewEvidence.candidate.providerValue;
const capsule = createFactionReviewContextCapsuleV1({ factionInput: terranInput, section, draft,
  reviewIndices: batch.reviewIndices, coverageRequiredSourceRefs: batch.requiredSourceRefs, targets,
  roleRef: reviewEvidence.candidate.roleRef, outputContractRef: reviewEvidence.candidate.outputContractRef,
  route: 'adversarial', includeSharedScenarioSources: true });
assert.equal(capsule.hash, reviewEvidence.candidate.contextManifestRef.hash); checks++;
const coverage = originalReview.coverage.map(row => ({ sourceRef: batch.requiredSourceRefs[row.coverageSlot],
  verdict: row.verdict, reason: row.reason, recommendationIndices: row.recommendationIndices }));
for (let n = 0; n < 2; n++) {
  assert.throws(() => resolveFactionReviewCoverageAddressesV1({ coverage, targets, draft, binding: oldAddress }),
    { code: 'FACTION_REVIEW_COVERAGE_ADDRESS_UNRESOLVED' }); checks++;
}
const resolved = resolveFactionReviewCoverageAddressesV2({ coverage, targets, draft, binding: address });
assert.deepEqual(resolved.coverage[0].recommendationIndices, [2]); checks++;
assert.equal(resolved.coverage[0].reason, coverage[0].reason); checks++;
assert.equal(resolved.coverage[0].verdict, coverage[0].verdict); checks++;
const correctedProviderValue = { ...originalReview, coverage: originalReview.coverage.map((row, i) =>
  ({ ...row, recommendationIndices: resolved.coverage[i].recommendationIndices })) };
const corrected = materializeFactionStructuredReviewV1({ providerOutput: correctedProviderValue, capsule,
  input: terranInput, section, draft, reviewIndices: batch.reviewIndices,
  requiredSourceRefs: batch.requiredSourceRefs, targets, reviewReasonMaximum: 16384, reviewSourceMaximum: 128 });
assert.deepEqual(corrected.output.coverage[0].recommendationIndices, [2]); checks++;
for (const delta of [{ reason: 'Academy source alone' }, { reason: '(Academy 与 Medic)' },
  { recommendationIndices: [1] }, { recommendationIndices: [99] }, { sourceRef: 'source:absent' }]) {
  assert.throws(() => resolveFactionReviewCoverageAddressesV2({ coverage: [{ ...coverage[0], ...delta }], targets, draft, binding: address }),
    { code: 'FACTION_REVIEW_COVERAGE_SHORT_TITLE_UNRESOLVED' }); checks++;
}
for (const verdict of ['uncertain', 'omitted']) {
  const rows = [{ ...coverage[0], verdict }];
  assert.deepEqual(resolveFactionReviewCoverageAddressesV2({ coverage: rows, targets, draft, binding: address }).coverage, rows); checks++;
}
const fullTitle = [{ ...coverage[0], reason: draft.recommendations[2].title }];
assert.deepEqual(resolveFactionReviewCoverageAddressesV2({ coverage: fullTitle, targets, draft, binding: address }),
  resolveFactionReviewCoverageAddressesV1({ coverage: fullTitle, targets, draft, binding: oldAddress })); checks++;
const files = ['packages/skill-production-v3/faction-reasoner-answer-completion-v1.mjs',
  'packages/skill-production-v3/faction-review-coverage-address-v2.mjs',
  'scripts/verify-ticket-18-faction-target-completion-v1.mjs'];
const report = seal({ passed: true, checks, runId, nativeOriginAttemptId: diagnosis.attemptId,
  reviewOriginAttemptId: reviewEvidence.attempt.id, materialization, addressResolution: resolved.receipt,
  completeSourcesAndPriorContextPreserved: true, originalTwoAnswersPreserved: true,
  unansweredQuestionsNotRelabelled: true, oldAddressV1Preserved: true,
  actualContextRebuilt: true, actualProviderCalls: 0, injectionOnly: true,
  productionWiringChanged: false, sourceRefreshPerformed: false, semanticAcceptance: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
await writeFile(base + 'target-completion-unit-readiness.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, actualProviderCalls: 0, missingAnswerBatches: 2, hash: report.hash }));
