import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { readFactionStructuredSuccessEvidenceV1 } from '../packages/skill-evaluation/faction-structured-success-evidence-v1.mjs';
import { resolveFactionReviewCoverageAddressesV4 as resolve, FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_V4 as binding } from '../packages/skill-production-v3/faction-review-coverage-address-v4.mjs';
import { resolveFactionReviewCoverageAddressesV3 as oldResolve, FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_V3 as oldBinding } from '../packages/skill-production-v3/faction-review-coverage-address-v3.mjs';
import { FACTION_EXPLICIT_SLOT_REVIEW_BINDING_V1 as composite } from '../packages/skill-production-v3/faction-explicit-slot-review-binding-v1.mjs';
import { prepareDshLoop } from '../packages/skill-production/loops.mjs';
import { createFactionStructuredReviewRuntimeV1 } from '../packages/skill-production-v3/faction-structured-review-runtime-v1.mjs';
import { verifyFactionStructuredRoleReplayV1 } from '../packages/skill-evaluation/faction-structured-replay-v1.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V5 as contract } from '../content/skill-generation/ticket-18-faction-review-output-contract-v1.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { validateFactionExplicitSlotReviewMigrationV1 } from '../packages/skill-production-v3/faction-explicit-slot-review-migration-v1.mjs';

const base = 'build/ticket-18-faction-production-v1/', filename = 'build/ticket-17-production-redesign-v1/production.sqlite';
const json = async file => verifySeal(JSON.parse(await readFile(file, 'utf8')));
const db = new DatabaseSync(filename, { readOnly: true });
try { assert.equal(db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n, 0); }
finally { db.close(); }
const diagnosis = await json(base + 'zerg-explicit-slot-address-diagnosis-v4.json');
assert.equal(diagnosis.actualContextRebuilt, true);
assert.equal(diagnosis.codeHash, sha256(await readFile('scripts/diagnose-ticket-18-zerg-explicit-slot-address-v4.mjs')));
const input = await json(base + diagnosis.originRunId + '/zerg_swarm-input.json');
assert.equal(input.hash, diagnosis.inputHash);
const evidence = readFactionStructuredSuccessEvidenceV1({ filename, runId: diagnosis.originRunId, attemptId: diagnosis.originAttemptId });
assert.equal(evidence.candidate.hash, diagnosis.originalCandidateHash);
const request = diagnosis.request, w = request.workspace, targets = w.outputRequestAtEnd.targetContract;
const coverage = evidence.candidate.providerValue.coverage.map(r => ({ sourceRef: w.coverageRequiredSourceRefs[r.coverageSlot],
  verdict: r.verdict, recommendationIndices: r.recommendationIndices, reason: r.reason }));
const args = { coverage, targets, draft: w.draft, binding };
for (let i = 0; i < 2; i++) assert.throws(() => oldResolve({ ...args, binding: oldBinding }),
  { code: 'FACTION_REVIEW_COVERAGE_TARGET_ID_UNRESOLVED' });
const resolved = resolve(args);
assert.deepEqual(coverage[0].recommendationIndices, [0]);
assert.deepEqual(resolved.coverage[0].recommendationIndices, [2]);
assert.equal(resolved.coverage[0].reason, coverage[0].reason);
assert.equal(resolved.coverage[0].verdict, coverage[0].verdict);
assert.equal(hash(evidence.candidate.providerValue.coverage), hash(diagnosis.originalCoverage));
let checks = 11;
for (const delta of [
  { reason: coverage[0].reason.replace('(target slot 0)', '') },
  { reason: coverage[0].reason.replace('(target slot 0)', '(target slot 1)') },
  { reason: coverage[0].reason.replace('(target slot 0)', '(target slot 00)') },
  { reason: coverage[0].reason + ' (target slot 0)' },
  { reason: coverage[0].reason + ' (target slot 1)' },
  { reason: coverage[0].reason + ' target slot 9' },
  { reason: coverage[0].reason.replace('(source:army_units:queen)', '') },
  { reason: coverage[0].reason + ' ' + targets.targets[1].targetId },
  { reason: coverage[0].reason + ' ' + targets.targets[1].title },
  { recommendationIndices: [1] }, { recommendationIndices: [0, 0] }, { recommendationIndices: [-1] },
  { sourceRef: 'source:invented' },
]) {
  assert.throws(() => resolve({ ...args, coverage: [{ ...coverage[0], ...delta }] }),
    { code: 'FACTION_REVIEW_COVERAGE_EXPLICIT_SLOT_UNRESOLVED' }); checks++;
}
const reseal = v => { const { hash: ignored, ...body } = v; return seal(body); };
for (const mutate of [
  t => { t.targets[0].recommendation.procedure[0] += ' changed'; },
  t => { t.targets[0].index = 3; },
  t => { t.targets[0].recommendationHash = '0'.repeat(64); },
  t => { t.targets[0].targetId = 'advice-2-000000000000'; },
  t => { t.targets[0].title += ' changed'; },
]) {
  const changed = structuredClone(targets); mutate(changed);
  assert.throws(() => resolve({ ...args, targets: reseal(changed) }),
    { code: 'FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_DRIFT' }); checks++;
}
// Existing exact title/ID/global and negative rows retain their old receipts.
for (const c of [
  [{ ...coverage[0], recommendationIndices: [2] }],
  [{ ...coverage[0], reason: targets.targets[0].title }],
  [{ ...coverage[0], reason: targets.targets[0].targetId }],
  [{ ...coverage[0], reason: 'same original negative finding', verdict: 'uncertain', recommendationIndices: [] }],
  [{ ...coverage[0], verdict: 'missing', recommendationIndices: [] }],
]) {
  assert.deepEqual(resolve({ ...args, coverage: c }), oldResolve({ ...args, coverage: c, binding: oldBinding })); checks++;
}
const ambiguousDraft = structuredClone(w.draft);
ambiguousDraft.recommendations[0].sourceRefs.push(coverage[0].sourceRef);
assert.throws(() => resolve({ ...args, draft: ambiguousDraft, targets: reseal({ ...targets, draftHash: hash(ambiguousDraft) }) }),
  { code: 'FACTION_REVIEW_COVERAGE_EXPLICIT_SLOT_UNRESOLVED' }); checks++;
const dsh = await prepareDshLoop(process.cwd());
const originalRecipe = await json(base + diagnosis.originRunId + '/recipe.json');
const capabilities = await json(base + diagnosis.originRunId + '/active-capabilities.json');
const recipe = { ...originalRecipe, explicitSlotReviewBinding: composite };
const policy = { maxOutputUnits: 4096, attemptEstimateMicros: 800000, attemptTokenReserve: 500000,
  allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false, idempotentRetrySupported: false, encryptedRawQuarantineAvailable: false };
let value, roleInput;
const fixtureDirectory = await mkdtemp(base + 'explicit-slot-restart-');
const testDb = fixtureDirectory + '/journal.sqlite';
const storeOptions = { runId: 'explicit-slot-recovery-fixture', recipeHash: hash(recipe) };
let journal = openProductionStore(testDb, storeOptions);
const store = { acquire(id, body) { assert.equal(id, request.packet.id + '.' + request.roleId);
  roleInput ||= body; assert.deepEqual(body, roleInput); return journal.acquire(id, body); },
  finish(lease, saved) { value = journal.finish(lease, saved); return value; }, release(lease) { journal.release(lease); } };
const makeRuntime = () => createFactionStructuredReviewRuntimeV1({ input, store, dsh, outputContract: contract, executionPolicy: policy,
  runtime: { role: () => assert.fail('No legacy') }, providerAdapter: { complete: () => assert.fail('No Provider') },
  egressBinding: {}, priceUsage: () => assert.fail('No new billing'), capabilityReceipt: capabilities.catalogueReview,
  includeSharedScenarioSources: true, completeReviewImports: [evidence],
  coverageAddressBinding: binding, completeReviewImportBinding: composite.reviewImport });
try { await makeRuntime().role(request); } finally { journal.close(); }
assert.equal(value.completeReviewImportProof.providerCalls, 0); checks++;
assert.equal(value.completeReviewImportProof.candidateHash, evidence.candidate.hash); checks++;
assert.deepEqual(value.output.coverage, resolved.coverage); checks++;
journal = openProductionStore(testDb, storeOptions);
try {
  assert.equal((await makeRuntime().role(request)).hash, value.hash); checks++;
  assert.equal(journal.summary().calls, 0); checks++;
  assert.equal(journal.summary().knownTokens, 0); checks++;
  assert.equal(journal.summary().steps.filter(s => s.state === 'complete').length, 1); checks++;
  assert.throws(() => journal.acquire(value.roleId, { ...roleInput, packetHash: '0'.repeat(64) }),
    { code: 'STEP_INPUT_DRIFT' }); checks++;
} finally { journal.close(); }
const proofArgs = { value, roleInput, request, input, recipe,
  resolveArtifact: h => [evidence.candidate, evidence.runtimeReceipt].find(a => a.hash === h),
  resolveResponse: h => h === evidence.candidate.providerReceiptHash ? { response: verifySeal(JSON.parse(evidence.attempt.response)).value } : null,
  resolveCompleteReviewImportEvidence: () => evidence };
const proof = verifyFactionStructuredRoleReplayV1(proofArgs);
assert.deepEqual(proof.providerReceiptHashes, [diagnosis.originalReceiptHash]); checks++;
assert.throws(() => verifyFactionStructuredRoleReplayV1({ ...proofArgs, recipe: originalRecipe }),
  { code: 'FACTION_REVIEW_COMPLETE_IMPORT_CONSUMER_BINDING_REQUIRED' }); checks++;
const tampered = structuredClone(value); tampered.output.coverage[0].reason += ' CHANGED';
assert.throws(() => verifyFactionStructuredRoleReplayV1({ ...proofArgs, value: reseal(tampered) }),
  { code: 'FACTION_STRUCTURED_REPLAY_HOST_MAPPING_DRIFT' }); checks++;
const files = ['packages/skill-production-v3/faction-review-coverage-address-v4.mjs',
  'packages/skill-production-v3/faction-explicit-slot-review-binding-v1.mjs',
  'packages/skill-production-v3/faction-explicit-slot-review-migration-v1.mjs',
  'packages/skill-production-v3/faction-continuation-v1.mjs',
  'scripts/run-ticket-18-faction-strategy-production-v1.mjs',
  'scripts/check-ticket-18-faction-launch-readiness-v1.mjs',
  'packages/skill-production-v3/faction-review-complete-output-import-v1.mjs',
  'packages/skill-production-v3/faction-structured-review-runtime-v1.mjs',
  'packages/skill-evaluation/faction-structured-replay-v1.mjs',
  'scripts/diagnose-ticket-18-zerg-explicit-slot-address-v4.mjs', 'scripts/verify-ticket-18-explicit-slot-review-v1.mjs'];
// This proves the CLI's declared wiring, not that a paid production run has
// started or passed its independent end-to-end preflight.
// Historical V4 imports/receipts stay bound above. New production explicitly
// selects V5 through the separately verified wire/address recovery migration.
const runner = await readFile('scripts/run-ticket-18-faction-strategy-production-v1.mjs', 'utf8');
for (const text of [
  'explicitSlotReviewBinding, explicitSlotReviewReadinessHash: explicitSlotReviewReadiness.hash',
  'coverageAddressBinding: wireAddressRecovery.recipeFields.dualCoordinateReviewBinding.coverageAddress',
  'completeReviewImportBinding: wireAddressRecovery.recipeFields.dualCoordinateReviewBinding.reviewImport',
  '...wireAddressRecovery.recipeFields, wireAddressRecoveryReadinessHash: wireAddressRecoveryReadiness.hash',
  'wireAddressRecovery: { gate: wireAddressRecoveryReadiness, prepared: wireAddressRecovery }',
  '[metadataRecoveryReadiness, targetCompletionReadiness, targetIdReviewReadiness, explicitSlotReviewReadiness]',
  'explicitSlotReview: explicitSlotReviewReadiness',
]) { assert(runner.includes(text), text); checks++; }
const reportBody = { version: 'faction_explicit_slot_review_readiness_v1', passed: true, checks, binding: composite,
  originRunId: diagnosis.originRunId, reviewOriginAttemptId: diagnosis.originAttemptId, reviewInputHash: input.hash,
  originalReceiptHash: diagnosis.originalReceiptHash, originalCandidateHash: evidence.candidate.hash,
  actualContextRebuilt: true, diagnosisHash: diagnosis.hash, consumerReplayPassed: true, originalJudgmentsPreserved: true,
  explicitNamespaceOnly: true, oldAddressReceiptsPreserved: true, actualDshSessions: 1, providerCalls: 0,
  hostMaterializationReceiptHash: value.hostMaterializationReceipt.hash,
  recoveredRole: value, recoveredRoleInput: roleInput, formalProductionWired: true,
  runnerParametersBound: true, sqliteRestartPassed: true, fixtureDirectory,
  legacyV4BindingRetained: true, currentDispatch: 'explicit_versioned_dual_coordinate_recovery',
  actualProductionResumed: false, fullContinuationPreflightPassed: false,
  semanticAcceptanceInherited: false, actualSkillsAccepted: 0, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))) };
const componentGate = seal(reportBody);
const nextFor = g => reseal({ ...originalRecipe, explicitSlotReviewBinding: composite, explicitSlotReviewReadinessHash: g.hash,
  codeHashes: [...originalRecipe.codeHashes.filter(c => !g.codeHashes.some(n => n.file === c.file)), ...g.codeHashes] });
const migrationArgs = { filename, parentRunId: diagnosis.originRunId, parent: originalRecipe,
  next: nextFor(componentGate), gate: componentGate };
const migrationProof = validateFactionExplicitSlotReviewMigrationV1(migrationArgs);
assert.equal(migrationProof.originalReceiptHash, diagnosis.originalReceiptHash); checks++;
assert.equal(migrationProof.accountingReset, false); checks++;
for (const delta of [{ sqliteRestartPassed: false }, { originalReceiptHash: '0'.repeat(64) },
  { originalCandidateHash: '0'.repeat(64) }, { providerCalls: 1 }, { runnerParametersBound: false },
  { reviewInputHash: '0'.repeat(64) }]) {
  const g = reseal({ ...componentGate, ...delta });
  assert.throws(() => validateFactionExplicitSlotReviewMigrationV1({ ...migrationArgs, next: nextFor(g), gate: g }),
    error => ['FACTION_EXPLICIT_SLOT_REVIEW_MIGRATION_INVALID', 'FACTION_EXPLICIT_SLOT_REVIEW_ORIGIN_DRIFT'].includes(error.code)); checks++;
}
assert.throws(() => validateFactionExplicitSlotReviewMigrationV1({ ...migrationArgs,
  next: reseal({ ...migrationArgs.next, limits: { ...originalRecipe.limits, maxCalls: originalRecipe.limits.maxCalls + 1 } }) }),
  { code: 'FACTION_EXPLICIT_SLOT_REVIEW_MIGRATION_INVALID' }); checks++;
assert.throws(() => validateFactionExplicitSlotReviewMigrationV1({ ...migrationArgs, parentRunId: 'faction-v1-00000000000000000000' }),
  { code: 'FACTION_EXPLICIT_SLOT_REVIEW_MIGRATION_INVALID' }); checks++;
const report = seal({ ...reportBody, checks, explicitMigrationBoundaryPassed: true });
validateFactionExplicitSlotReviewMigrationV1({ ...migrationArgs, next: nextFor(report), gate: report });
await writeFile(base + 'explicit-slot-review-readiness-v1.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, actualDshSessions: 1, providerCalls: 0,
  formalProductionWired: true, actualProductionResumed: false, hash: report.hash }));
