import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { prepareDshLoop } from '../packages/skill-production/loops.mjs';
import { readFactionTeachFailureEvidenceV1 } from '../packages/skill-evaluation/faction-teach-failure-evidence-v1.mjs';
import { createFactionReviewContextCapsuleV1 } from '../packages/skill-production-v3/faction-review-context-capsule-v1.mjs';
import { contextManifestRefStarcraftTmgV1 } from '../packages/structured-generation/context-capsule-v1.mjs';
import { materializeReviewFocusCapacityV1, recoverReviewFocusCapacityV1,
  FACTION_REVIEW_FOCUS_CAPACITY_RECOVERY_BINDING_V1 as binding } from '../packages/skill-production-v3/faction-review-focus-capacity-recovery-v1.mjs';
import { createFactionStructuredReviewRuntimeV1 } from '../packages/skill-production-v3/faction-structured-review-runtime-v1.mjs';
import { verifyFactionStructuredRoleReplayV1 } from '../packages/skill-evaluation/faction-structured-replay-v1.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V5 as contract } from '../content/skill-generation/ticket-18-faction-review-output-contract-v1.mjs';
const root = process.cwd(), base = 'build/ticket-18-faction-production-v1/';
const json = async file => verifySeal(JSON.parse(await readFile(file, 'utf8')));
const runId = 'faction-v1-54e27ea11ecf1082df30', attemptId = 'structured-d235ac962d55c053572ca1d67530adb00a0054bec6304a52';
const replay = await json(base + 'five-chapter-consumer-replay-readiness.json');
assert.equal(replay.actualRunId, runId); assert.equal(replay.sourceReviewedChaptersRebuilt, 5);
const request = replay.pendingRequest, input = await json(base + 'terran_armed_forces-input.json');
const recipe = await json(base + runId + '/recipe.json');
const evidence = readFactionTeachFailureEvidenceV1({ filename: 'build/ticket-17-production-redesign-v1/production.sqlite', runId, attemptId });
const w = request.workspace, roleRef = evidence.rejected.roleRef;
const capsule = createFactionReviewContextCapsuleV1({ factionInput: input, section: w.section, draft: w.draft,
  reviewIndices: w.reviewIndices, coverageRequiredSourceRefs: w.coverageRequiredSourceRefs,
  targets: w.outputRequestAtEnd.targetContract, roleRef, outputContractRef: binding.outputContractRef,
  route: 'supportive', includeSharedScenarioSources: true });
const policy = { maxOutputUnits: 4096, attemptEstimateMicros: 800000, attemptTokenReserve: 500000,
  allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false, idempotentRetrySupported: false, encryptedRawQuarantineAvailable: false };
const roleInput = { version: 'starcraft_tmg_faction_structured_review_runtime_v1', packetHash: request.packet.hash,
  roleRef, contextManifestRef: contextManifestRefStarcraftTmgV1(capsule), outputContractRef: binding.outputContractRef,
  executionPolicyRef: { id: 'policy.faction-target-review.production', version: '2026.09.06.1', hash: hash(policy) }, semanticAcceptanceInherited: false };
const prepared = { fullRoleId: request.packet.id + '.' + request.roleId, roleInput, capsule, includeSharedScenarioSources: true,
  mapping: { section: w.section, draft: w.draft, reviewIndices: w.reviewIndices,
    requiredSourceRefs: w.coverageRequiredSourceRefs, targets: w.outputRequestAtEnd.targetContract } };
assert.equal(capsule.hash, evidence.rejected.contextManifestRef.hash);
const materialization = materializeReviewFocusCapacityV1({ input, prepared, evidence });
assert.deepEqual(materialization.originalFocusCounts, [16, 18]);
assert.equal(materialization.output.verdicts[1].focus[4].quote.length, 302);
for (let i = 0; i < 2; i++) {
  for (const field of ['focus', 'reason', 'verdict']) assert.deepEqual(materialization.output.verdicts[i][field], evidence.rejected.providerValue.verdicts[i][field]);
}
assert.equal(materialization.providerCalls, 0);
assert.equal(materialization.evidenceDropped, false);
assert.equal(materialization.originalProviderSchemaPassed, false);
let checks = 14;
const args = { input, prepared, evidence };
const reseal = (v, delta) => { const { hash: ignored, ...body } = v; return seal({ ...body, ...delta }); };
for (const bad of [
  { ...evidence, attempt: { ...evidence.attempt, state: 'intent' } },
  { ...evidence, attempt: { ...evidence.attempt, code: 'STRUCTURED_PROVIDER_INCOMPLETE' } },
  { ...evidence, issue: reseal(evidence.issue, { safeReceiptHash: hash('foreign') }) },
  { ...evidence, rejected: reseal(evidence.rejected, { contextManifestRef: { hash: hash('foreign') } }) },
]) { assert.throws(() => materializeReviewFocusCapacityV1({ ...args, evidence: bad }), { code: 'FACTION_REVIEW_FOCUS_CAPACITY_EVIDENCE_INVALID' }); checks++; }
// Keeping every negative is as important as preserving every positive. A
// foreign mutation is rejected, never converted to a supported judgment.
const wrongJudgment = structuredClone(evidence.rejected.providerValue); wrongJudgment.verdicts[0].verdict = 'invented';
assert.throws(() => materializeReviewFocusCapacityV1({ ...args,
  evidence: { ...evidence, rejected: reseal(evidence.rejected, { providerValue: wrongJudgment }) } }),
{ code: 'FACTION_REVIEW_FOCUS_CAPACITY_NOT_APPLICABLE' }); checks++;
const dsh = await prepareDshLoop(root);
const imported = await recoverReviewFocusCapacityV1({ ...args, dsh });
assert.deepEqual(imported.output, materialization.output); checks++;
assert.equal(imported.loop.calls, 1); checks++;
const consumer = verifyFactionStructuredRoleReplayV1({ value: imported, roleInput, request, input,
  recipe: { ...recipe, reviewFocusCapacityRecoveryBinding: binding }, resolveTeachFailureEvidence: () => evidence });
assert.deepEqual(consumer.providerReceiptHashes, [materialization.originalFailureReceiptHash]); checks++;
const capabilities = await json(base + runId + '/active-capabilities.json');
let stored, dshImports = 0;
const store = { acquire(id, actual) { assert.equal(id, prepared.fullRoleId); assert.deepEqual(actual, roleInput);
  return stored ? { cached: true, artifact: stored } : { cached: false }; },
  finish(_lease, v) { stored = v; return v; }, release() {} };
const runtime = createFactionStructuredReviewRuntimeV1({ input, store, outputContract: contract, executionPolicy: policy,
  runtime: { role: () => assert.fail('no legacy fallback') }, providerAdapter: { complete: () => assert.fail('no Provider') },
  dsh: { binding: dsh.binding, async run(call) { dshImports++; const outcome = await call.callModel();
    assert.equal(outcome.receiptHash, materialization.hash); return imported.loop; } },
  capabilityReceipt: capabilities.catalogueReview, egressBinding: {}, priceUsage: () => assert.fail('no new billing'),
  includeSharedScenarioSources: true, focusCapacityImports: [evidence] });
assert.equal((await runtime.role(request)).hash, imported.hash); checks++;
assert.equal((await runtime.role(request)).hash, imported.hash); checks++;
assert.equal(dshImports, 1); checks++;
const files = ['packages/skill-production-v3/faction-review-focus-capacity-recovery-v1.mjs',
  'packages/skill-production-v3/faction-structured-review-runtime-v1.mjs',
  'packages/skill-evaluation/faction-structured-replay-v1.mjs',
  'scripts/verify-ticket-18-faction-review-focus-capacity-v1.mjs'];
const report = seal({ passed: true, checks, binding, originRunId: runId, originAttemptId: attemptId,
  inputHash: input.hash, materializationHash: materialization.hash,
  originalFailureReceiptHash: materialization.originalFailureReceiptHash,
  originalRejectedCandidateHash: evidence.rejected.hash, originalFocusCounts: [16, 18], originalLongQuoteLength: 302,
  actualDshSessions: 1, providerCalls: 0, actualStructuredConsumerReplayPassed: true,
  productionImportTested: true, actualSourceContextRebuilt: true, allEvidencePreserved: true,
  judgmentsChanged: false, semanticAcceptanceInherited: false, sourceRefreshPerformed: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
await writeFile(base + 'review-focus-capacity-readiness.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, providerCalls: 0, originalFocusCounts: [16, 18], hash: report.hash }));
