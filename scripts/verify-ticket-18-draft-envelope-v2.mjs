import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { prepareDshLoop } from '../packages/skill-production/loops.mjs';
import { readFactionTeachFailureEvidenceV1 } from '../packages/skill-evaluation/faction-teach-failure-evidence-v1.mjs';
import { normalizeFactionDraftEnvelopeV2, materializeFactionDraftEnvelopeV2, FACTION_DRAFT_ENVELOPE_BINDING_V2 as binding } from '../packages/skill-production-v3/faction-draft-envelope-v2.mjs';
import { recoverFactionDraftEnvelopeV2, verifyFactionDraftEnvelopeRoleV2 } from '../packages/skill-production-v3/faction-draft-envelope-recovery-v2.mjs';
import { prepareFactionNativeProductionRoleV1, createFactionNativeProductionRuntimeV1 } from '../packages/skill-production-v3/faction-native-production-runtime-v1.mjs';
import { verifyFactionStructuredRoleReplayV1 } from '../packages/skill-evaluation/faction-structured-replay-v1.mjs';
import { applyFactionNativeOutputCapacityV2 } from '../packages/skill-production-v3/faction-native-output-capacity-v2.mjs';
import { validateFactionDraftV1, validateFactionDraftBatchV1, applyFactionStrategyPatchV1,
  createFactionReviewBatchPlanV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { createFactionInitialSourceCorrectionV2, FACTION_INITIAL_SOURCE_CORRECTION_BINDING_V2 as sourceBinding } from '../packages/skill-production-v3/faction-initial-source-correction-v2.mjs';
import { verifyFactionDraftEnvelopeCurrentFaultsV2 } from './support/faction-draft-envelope-current-faults-v2.mjs';

const root = process.cwd(), base = 'build/ticket-18-faction-production-v1/', runId = 'faction-v1-b624e21a2da88377b410';
const read = async name => verifySeal(JSON.parse(await readFile(base + name + '.json', 'utf8')));
const recipe = await read(runId + '/recipe'), capacity = recipe.nativeOutputCapacityBinding;
const dsh = await prepareDshLoop(root), origins = [], recoveredRoles = [], samples = [];
const reseal = (v, delta) => { const { hash: ignored, ...body } = v; return seal({ ...body, ...delta }); };
let checks = 0;
const check = (name, fn) => { fn(); checks++; };
for (const faction of ['terran_armed_forces', 'zerg_swarm']) {
  const input = await read(runId + '/' + faction + '-input'), diagnosis = await read(faction + '-draft-envelope-diagnosis');
  const request = diagnosis.request, evidence = readFactionTeachFailureEvidenceV1({ filename: 'build/ticket-17-production-redesign-v1/production.sqlite',
    runId, attemptId: diagnosis.originAttemptId });
  const prepared = prepareFactionNativeProductionRoleV1({ input, request: applyFactionNativeOutputCapacityV2(request, capacity),
    executionPolicy: capacity.executionPolicy, outputCapacityBinding: capacity, proposerBatchBinding: recipe.proposerBatchBinding,
    proposerAuxiliaryCapacityBinding: recipe.proposerAuxiliaryCapacityBinding, targetReconstructionBinding: recipe.nativeTargetReconstructionBinding });
  const args = { input, request, prepared, evidence, binding }, output = evidence.rejected.providerValue;
  const materialization = materializeFactionDraftEnvelopeV2(args);
  check('exact actual paid output, including empty array and every distinct citation', () => assert.deepEqual(materialization.output, output));
  check('full source request rebuilt independently', () => assert.equal(diagnosis.actualInvocationRebuilt, true));
  const scope = { input, outline: request.workspace.outline, indices: request.workspace.indices,
    completedRecommendations: request.workspace.completedRecommendations, draftEnvelopeBinding: binding };
  check('old strict default still rejects', () => assert.throws(() => validateFactionDraftBatchV1(output, { ...scope, draftEnvelopeBinding: null })));
  check('new policy accepts actual exact source-target body', () => assert.equal(validateFactionDraftBatchV1(output, scope).length, 2));
  const draft = { recommendations: [...request.workspace.completedRecommendations, ...output.items.map(i => i.value)] };
  check('whole chapter schema consumes same envelope', () => validateFactionDraftV1(draft, input, { draftEnvelopeBinding: binding }));
  const reviewPlan = createFactionReviewBatchPlanV1({ section: request.workspace.section, draft });
  check('whole chapter review still covers every advice', () => assert.equal(reviewPlan.batches.flatMap(b => b.reviewIndices).length, draft.recommendations.length));
  // A narrow edit elsewhere must preserve the original 11 refs / empty array
  // when validating the aggregate. This was the downstream rejection seam.
  const revised = structuredClone(draft.recommendations[0]); revised.risk += '（局部接线测试，非正式策略。）';
  const issue = seal({ parentHash: hash(draft), openIssues: 1, issues: [{ kind: 'recommendation_source_or_condition',
    index: 0, oldHash: hash(draft.recommendations[0]) }] });
  const patch = { parentHash: hash(draft), replacements: [{ index: 0, value: revised }], additions: [] };
  check('atomic aggregate patch consumes same envelope', () => assert.deepEqual(
    applyFactionStrategyPatchV1(patch, { input, draft, issues: issue, draftEnvelopeBinding: binding }).recommendations.slice(1), draft.recommendations.slice(1)));
  for (const delta of [v => v.items[0].value.title = '', v => v.items[0].value.procedure = [],
    v => v.items[0].value.sourceRefs = ['invented-source'], v => v.items[0].value.unproven = ['x'.repeat(1601)]]) {
    const changed = structuredClone(output); delta(changed);
    check('substantive body failures not repaired', () => assert.throws(() => normalizeFactionDraftEnvelopeV2({ input, value: changed, binding })));
  }
  for (const bad of [
    { ...evidence, attempt: { ...evidence.attempt, state: 'intent' } },
    { ...evidence, attempt: { ...evidence.attempt, code: 'PROVIDER_PAYMENT_REQUIRED' } },
    { ...evidence, rejected: reseal(evidence.rejected, { contextManifestRef: { hash: hash('foreign') } }) },
    { ...evidence, issue: reseal(evidence.issue, { safeReceiptHash: hash('foreign') }) },
  ]) check('actual paid provenance cannot be substituted', () => assert.throws(() => materializeFactionDraftEnvelopeV2({ ...args, evidence: bad })));
  check('full source payload hash is mandatory', () => assert.throws(() => materializeFactionDraftEnvelopeV2({ ...args,
    prepared: { ...prepared, payload: prepared.payload + ' ' } }), { code: 'FACTION_DRAFT_ENVELOPE_EVIDENCE_INVALID' }));
  check('wrong target cannot pass host validation', () => {
    const wrong = structuredClone(output); wrong.items[0].index = 127;
    assert.throws(() => validateFactionDraftBatchV1(wrong, scope), { code: 'FACTION_BATCH_SCOPE_INVALID' });
  });
  const imported = await recoverFactionDraftEnvelopeV2({ ...args, dsh });
  check('actual DSH import preserves original output', () => assert.deepEqual(imported.output, output));
  check('consumer reconstructs exact original receipt', () => assert.deepEqual(
    verifyFactionDraftEnvelopeRoleV2({ ...args, value: imported, dshBindingHash: dsh.binding.hash }).providerReceiptHashes,
    [materialization.originalFailureReceiptHash]));
  const changedOutput = structuredClone(imported.output); changedOutput.items[0].value.risk += ' drift';
  check('consumer rejects changed prose', () => assert.throws(() => verifyFactionDraftEnvelopeRoleV2({ ...args,
    value: reseal(imported, { output: changedOutput }), dshBindingHash: dsh.binding.hash })));
  check('format recovery not semantic approval', () => assert.deepEqual([imported.semanticAcceptance,
    materialization.semanticAcceptanceInherited, materialization.normalized.emptyUnprovenAcceptedAsProof], [false, false, false]));
  const db = new DatabaseSync('build/ticket-17-production-redesign-v1/production.sqlite', { readOnly: true });
  let original;
  try { original = verifySeal(verifySeal(JSON.parse(db.prepare('SELECT artifact FROM steps WHERE run=? AND id=?')
    .get(runId, prepared.fullRoleId.slice(0, -'.target-reconstruction.v1'.length)).artifact)).value); }
  finally { db.close(); }
  samples.push({ input, request, output, original });
  const consumer = { value: imported, input, request, roleInput: prepared.roleInput, recipe: { ...recipe, draftEnvelopeBinding: binding },
    resolveArtifact: h => { assert.equal(h, original.hash); return original; }, resolveTeachFailureEvidence: () => evidence };
  check('independent consumer route verifies original wrong-target artifact', () => assert.deepEqual(
    verifyFactionStructuredRoleReplayV1(consumer).providerReceiptHashes, [materialization.originalFailureReceiptHash]));
  check('unbound consumer cannot accept envelope', () => assert.throws(() => verifyFactionStructuredRoleReplayV1({ ...consumer, recipe }),
    { code: 'FACTION_DRAFT_ENVELOPE_CONSUMER_BINDING_REQUIRED' }));
  check('original target error evidence cannot disappear', () => assert.throws(() => verifyFactionStructuredRoleReplayV1({ ...consumer,
    resolveArtifact: null }), { code: 'FACTION_NATIVE_TARGET_RECONSTRUCTION_CONSUMER_BINDING_REQUIRED' }));
  let cached = null, imports = 0;
  const runtime = createFactionNativeProductionRuntimeV1({ input,
    executionPolicy: { maxOutputUnits: 4096, attemptEstimateMicros: 800000, attemptTokenReserve: 500000,
      allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false, idempotentRetrySupported: false, encryptedRawQuarantineAvailable: false },
    draftEnvelopeBinding: binding, draftEnvelopeImports: [evidence], proposerBatchBinding: recipe.proposerBatchBinding,
    proposerAuxiliaryCapacityBinding: recipe.proposerAuxiliaryCapacityBinding, targetReconstructionBinding: recipe.nativeTargetReconstructionBinding,
    outputCapacity: { binding: capacity, frozenRoleIds: recipe.nativeOutputCapacityFrozenRoleIds },
    egressBinding: { providerProfileRef: capacity.profileRef, maxOutputUnits: capacity.executionPolicy.maxOutputUnits },
    providerAdapter: { complete: () => assert.fail('No Provider on recovery') }, runtime: { role: () => assert.fail('No legacy fallback') },
    store: { acquire(id, roleInput) { assert.equal(id, prepared.fullRoleId); assert.deepEqual(roleInput, prepared.roleInput);
      return cached ? { cached: true, artifact: cached } : { cached: false }; },
    finish(_lease, artifact) { cached = artifact; return artifact; }, release() {} },
    dsh: { binding: dsh.binding, async run(call) { imports++;
      assert.equal((await call.callModel()).receiptHash, materialization.hash); return imported.loop; } } });
  assert.equal((await runtime.role(request)).hash, imported.hash); checks++;
  assert.equal((await runtime.role(request)).hash, imported.hash); checks++;
  check('import occurs once; resume reuses artifact', () => assert.equal(imports, 1));
  origins.push({ inputHash: input.hash, originRunId: runId, originAttemptId: diagnosis.originAttemptId,
    originalFailureReceiptHash: materialization.originalFailureReceiptHash, rejectedCandidateHash: evidence.rejected.hash,
    contextHash: prepared.contextManifestRef.hash, materializationHash: materialization.hash, recoveredArtifactHash: imported.hash,
    originalUsage: materialization.originalUsage, originalSettledMicros: materialization.originalSettledMicros });
  recoveredRoles.push(imported);
}
const zergInput = await read(runId + '/zerg_swarm-input'), sourceGate = await read('zerg-card-economy-readiness');
const originalDraft = structuredClone(sourceGate.proposal.proposedDraft);
for (const f of sourceGate.audit.findings) {
  const [key, n] = f.path.split('.');
  if (n === undefined) originalDraft.recommendations[f.index][key] = f.text;
  else originalDraft.recommendations[f.index][key][Number(n)] = f.text;
}
const correction = createFactionInitialSourceCorrectionV2({ input: zergInput, draft: originalDraft, binding: sourceBinding });
check('initial semantic correction collects all13 actual fields', () => assert.equal(correction.changes.length, 13));
check('initial correction matches independently tested proposal', () => assert.deepEqual(correction.proposedDraft, sourceGate.proposal.proposedDraft));
check('correction is not reflection or promotion', () => assert.deepEqual([correction.initialProductionNotReflectionUpgrade,
  correction.productionApplied, correction.independentEvaluationPassed], [true, false, false]));
check('no known correction debt after proposed application', () => assert.equal(createFactionInitialSourceCorrectionV2({
  input: zergInput, draft: correction.proposedDraft, binding: sourceBinding }), null));
const currentFaults = await verifyFactionDraftEnvelopeCurrentFaultsV2({ samples, recipe, binding, dsh });
checks += currentFaults.checks;
const files = ['packages/skill-production-v3/faction-draft-envelope-v2.mjs', 'packages/skill-production-v3/faction-draft-envelope-recovery-v2.mjs',
  'packages/skill-production-v3/faction-initial-source-correction-v2.mjs', 'packages/skill-production-v3/faction-strategy-workflow-v1.mjs',
  'packages/skill-production-v3/faction-native-production-runtime-v1.mjs', 'packages/skill-evaluation/faction-structured-replay-v1.mjs',
  'scripts/support/faction-draft-envelope-current-faults-v2.mjs',
  'scripts/verify-ticket-18-draft-envelope-v2.mjs'];
const report = seal({ passed: true, checks, binding, sourceBinding, origins, recoveredRoles,
  actualDshSessions: 2 + currentFaults.actualDshSessions, providerCalls: 0, fullPaidRequestAndInvocationRebuilt: true,
  nativeImportAndConsumerWired: true, currentFailureBranchTested: true, currentFaults,
  completePipelineWired: false, formalProductionRecovered: false, independentSemanticAcceptance: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
await writeFile(base + 'draft-envelope-recovery-component-v2.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, actualDshSessions: report.actualDshSessions, providerCalls: 0, completePipelineWired: false, hash: report.hash }));
