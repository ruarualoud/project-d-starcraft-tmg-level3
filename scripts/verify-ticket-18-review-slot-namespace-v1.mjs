import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { verifySeal, hash, seal, sha256 } from '../packages/skill-production/common.mjs';
import { createFactionWritingPlanV1, createFactionReviewBatchPlanV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { createFactionReviewTargetsV1 } from '../packages/skill-production-v3/faction-review-targets-v1.mjs';
import { createFactionReviewContextCapsuleV1 } from '../packages/skill-production-v3/faction-review-context-capsule-v1.mjs';
import { materializeFactionStructuredReviewV1 } from '../packages/skill-production-v3/faction-structured-review-runtime-v1.mjs';
import { FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_V4 as priorBinding } from '../packages/skill-production-v3/faction-review-coverage-address-v4.mjs';
import { recoverFactionExplicitSlotReviewV1, resolveFactionLegacySlotReferencesV1,
  createFactionSlotReviewContextV1, materializeFactionSlotReviewV1 } from '../packages/skill-production-v3/faction-review-slot-namespace-v1.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_REF_V6 as nativeRef,
  STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V6 as nativeContract,
  FACTION_REVIEW_SLOT_NAMESPACE_BINDING_V1 as binding } from '../content/skill-generation/ticket-18-faction-review-output-contract-v6.mjs';
import { validateStarcraftTmgProviderJsonSchemaValueV1 } from '../packages/structured-generation/output-contract-registry-v1.mjs';

const runId = 'faction-v1-8262a9a7181f3ec25c06';
const attemptId = 'structured-76698661eced0d83008fc72ceecbeceb256367eb15b6105f';
const base = 'build/ticket-18-faction-production-v1/';
const json = async name => verifySeal(JSON.parse(await readFile(base + name + '.json', 'utf8')));
const input = await json(runId + '/zerg_swarm-input');
const ownerRecipe = await json(runId + '/recipe');
const capabilities = await json(runId + '/active-capabilities');
const db = new DatabaseSync('build/ticket-17-production-redesign-v1/production.sqlite', { readOnly: true });
let candidate, runtimeReceipt, correction, attempt;
try {
  assert.equal(db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n, 0);
  assert.equal(db.prepare('SELECT recipe FROM runs WHERE id=?').get(runId).recipe, ownerRecipe.hash);
  const read = id => verifySeal(JSON.parse(db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'").get(runId, id).artifact)).value;
  candidate = read(attemptId + '.candidate');
  runtimeReceipt = read(attemptId + '.runtime-receipt');
  correction = read('faction.zerg_swarm.unit_roles.1.zerg-unit-timing-correction-v1.0');
  attempt = db.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(runId, attemptId);
} finally { db.close(); }
const originalAttemptHash = hash(attempt);
const draft = correction.correction.proposedDraft;
const section = createFactionWritingPlanV1(input).sections.find(s => s.id === 'faction.zerg_swarm.unit_roles.1');
const batch = createFactionReviewBatchPlanV1({ section, draft }).batches.find(b => b.first === 2);
const targets = createFactionReviewTargetsV1({ input, section, draft, indices: batch.reviewIndices });
const capsule = createFactionReviewContextCapsuleV1({ factionInput: input, section, draft,
  reviewIndices: batch.reviewIndices, coverageRequiredSourceRefs: batch.requiredSourceRefs,
  targets, roleRef: candidate.roleRef, outputContractRef: candidate.outputContractRef,
  route: 'adversarial', includeSharedScenarioSources: true });
const checks = [];
const check = (id, operation) => { operation(); checks.push({ id, passed: true }); };
check('actual.complete-context-byte-identity', () => assert.equal(capsule.hash, candidate.contextManifestRef.hash));
const options = { capsule, input, section, draft, reviewIndices: batch.reviewIndices,
  requiredSourceRefs: batch.requiredSourceRefs, targets, coverageAddressBinding: priorBinding,
  reviewSourceMaximum: 128, providerOutput: candidate.providerValue,
  evidence: { candidate, runtimeReceipt, attempt, ownerRecipe, capability: capabilities.catalogueReview } };
check('actual.original-materializer-still-reproduces-exact-failure', () => assert.throws(() => materializeFactionStructuredReviewV1(options),
  { code: 'FACTION_REVIEW_COVERAGE_EXPLICIT_SLOT_UNRESOLVED' }));
const result = recoverFactionExplicitSlotReviewV1(options);
check('actual.paid-context-model-contract-and-slot-identity-recovered', () => {
  assert.deepEqual(result.output.coverage.map(row => row.recommendationIndices), [[2]]);
  assert.equal(result.receipt.coordinateProof.paid.receiptHash, candidate.providerReceiptHash);
  assert.equal(result.receipt.coordinateProof.paid.newProviderCalls, 0);
});
check('actual.original-judgments-reasons-and-negative-findings-not-rewritten', () => {
  assert.equal(result.output.coverage[0].reason, candidate.providerValue.coverage[0].reason);
  assert.deepEqual(result.output.verdicts.map(v => [v.verdict, v.reason]), candidate.providerValue.verdicts.map(v => [v.verdict, v.reason]));
  assert.equal(hash(attempt), originalAttemptHash);
  assert.equal(result.receipt.semanticAcceptanceInherited, false);
  assert.equal(result.receipt.runtimeAccepted, false);
});
for (const [id, mutate] of [
  ['wrong-request', e => e.attempt.request_hash = hash('wrong')],
  ['wrong-owner', e => e.attempt.run = 'faction-v1-' + 'a'.repeat(20)],
  ['unsettled', e => e.attempt.state = 'intent'],
  ['missing-usage', e => e.attempt.usage = null],
  ['wrong-candidate', e => e.candidate = seal({ ...e.candidate, hash: undefined, providerReceiptHash: hash('wrong') })],
  ['missing-capability', e => e.capability = null],
  ['changed-raw-output', e => e.candidate = seal({ ...e.candidate, hash: undefined, providerValue: { ...e.candidate.providerValue, coverage: [] } })],
]) check('paid.reject-' + id, () => {
  const evidence = structuredClone(options.evidence); mutate(evidence);
  assert.throws(() => recoverFactionExplicitSlotReviewV1({ ...options, evidence }));
});
check('paid.changed-caller-output-rejected', () => {
  const providerOutput = structuredClone(candidate.providerValue); providerOutput.coverage[0].reason += ' altered';
  assert.throws(() => recoverFactionExplicitSlotReviewV1({ ...options, providerOutput }), { code: 'FACTION_REVIEW_SLOT_NAMESPACE_PAID_EVIDENCE_DRIFT' });
});
const reseal = value => { const { hash: ignored, ...body } = value; return seal(body); };
const forgeLinkedReceipt = (evidence, mutate) => {
  const response = verifySeal(JSON.parse(evidence.attempt.response)).value;
  const { receiptHash: ignored, ...body } = response.usageReceipt;
  mutate(body);
  response.usageReceipt = { ...body, receiptHash: hash(body) };
  evidence.attempt.response = JSON.stringify(seal({ value: response }));
  evidence.candidate = reseal({ ...evidence.candidate, providerReceiptHash: response.usageReceipt.receiptHash });
  evidence.runtimeReceipt = reseal({ ...evidence.runtimeReceipt, candidateHash: evidence.candidate.hash,
    providerReceiptHash: response.usageReceipt.receiptHash });
};
for (const [id, mutate, code] of [
  ['wrong-reported-model', body => body.reportedModel = 'wrong-model', 'FACTION_EXECUTION_MODEL_RECEIPT_MISMATCH'],
  ['wrong-requested-model', body => body.requestedModel = 'wrong-model', 'FACTION_EXECUTION_MODEL_RECEIPT_MISMATCH'],
  ['wrong-actual-wire-body', body => body.requestBodyHash = hash('wrong-body'), 'FACTION_REVIEW_SLOT_NAMESPACE_PAID_REQUEST_DRIFT'],
]) check('paid.reject-consistently-resealed-' + id, () => {
  const evidence = structuredClone(options.evidence); forgeLinkedReceipt(evidence, mutate);
  assert.throws(() => recoverFactionExplicitSlotReviewV1({ ...options, evidence }), { code });
});
const mutateLegacy = mutate => {
  const providerOutput = structuredClone(candidate.providerValue); mutate(providerOutput.coverage[0]);
  return { ...options, providerOutput };
};
for (const [id, mutate] of [
  ['wrong-local-slot', row => row.reason = row.reason.replace('targetSlot 0', 'targetSlot 1')],
  ['no-explicit-slot', row => row.reason = row.reason.replace('targetSlot 0', 'Queen')],
  ['foreign-coordinate', row => row.reason += ' recommendation index 3'],
  ['duplicate-declaration', row => row.reason += ' targetSlot 0'],
  ['conflicting-declaration', row => row.reason += ' (target slot 1)'],
  ['foreign-target-id', row => row.reason += ' ' + targets.targets[1].targetId],
  ['foreign-target-title', row => row.reason += ' ' + targets.targets[1].title],
  ['missing-source-echo', row => row.reason = row.reason.replace(batch.requiredSourceRefs[0], 'Queen')],
]) check('legacy.reject-' + id, () => assert.throws(() => resolveFactionLegacySlotReferencesV1(mutateLegacy(mutate))));
check('legacy.correct-global-address-is-unchanged-not-new-recovery', () => {
  const args = mutateLegacy(row => row.recommendationIndices = [2]);
  const preserved = resolveFactionLegacySlotReferencesV1(args);
  assert.deepEqual(preserved.mapped, args.providerOutput); assert.equal(preserved.mappings.length, 0);
});
for (const verdict of ['omitted', 'uncertain']) check('legacy.preserve-' + verdict, () => {
  const args = mutateLegacy(row => { row.verdict = verdict; row.recommendationIndices = []; });
  const preserved = resolveFactionLegacySlotReferencesV1(args);
  assert.deepEqual(preserved.mapped, args.providerOutput); assert.equal(preserved.mappings.length, 0);
});
check('legacy.existing-valid-global-address-never-reinterpreted-as-local', () => {
  const changedDraft = structuredClone(draft);
  changedDraft.recommendations[0].sourceRefs.push(batch.requiredSourceRefs[0]);
  const changedTargets = createFactionReviewTargetsV1({ input, section, draft: changedDraft, indices: batch.reviewIndices });
  const changedCapsule = createFactionReviewContextCapsuleV1({ factionInput: input, section, draft: changedDraft,
    reviewIndices: batch.reviewIndices, coverageRequiredSourceRefs: batch.requiredSourceRefs,
    targets: changedTargets, roleRef: candidate.roleRef, outputContractRef: candidate.outputContractRef,
    route: 'adversarial', includeSharedScenarioSources: true });
  const ambiguous = resolveFactionLegacySlotReferencesV1({ ...options, draft: changedDraft, targets: changedTargets, capsule: changedCapsule });
  // This is already valid under the frozen global contract: do NOT reinterpret
  // it as local slot 0 merely because the reason contains a targetSlot token.
  assert.equal(ambiguous.mappings.length, 0);
  assert.deepEqual(ambiguous.mapped.coverage[0].recommendationIndices, [0]);
});

const nativeCapsule = createFactionSlotReviewContextV1({ factionInput: input, section, draft,
  reviewIndices: batch.reviewIndices, coverageRequiredSourceRefs: batch.requiredSourceRefs,
  targets, roleRef: candidate.roleRef, outputContractRef: nativeRef,
  route: 'adversarial', includeSharedScenarioSources: true });
const nativeOutput = { verdicts: structuredClone(candidate.providerValue.verdicts),
  coverage: candidate.providerValue.coverage.map(({ recommendationIndices, ...row }) => ({ ...structuredClone(row), recommendationSlots: [0] })) };
const nativeOptions = { ...options, capsule: nativeCapsule, providerOutput: nativeOutput };
check('native.explicit-local-contract-rejects-old-global-field', () => {
  assert.equal(validateStarcraftTmgProviderJsonSchemaValueV1(nativeContract.providerSchema, candidate.providerValue).ok, false);
  assert.equal(validateStarcraftTmgProviderJsonSchemaValueV1(nativeContract.providerSchema, nativeOutput).ok, true);
  assert.ok(nativeContract.hostOwnedFields.includes('recommendationIndices'));
  assert.ok(nativeCapsule.localIssue.hostOwns.includes('recommendationIndices'));
});
check('native.complete-source-graph-and-draft-preserved', () => {
  for (const name of ['immutableBase', 'section', 'dependencyGraph', 'sourceIndexRef', 'omittedDomains'])
    assert.equal(hash(nativeCapsule[name]), hash(capsule[name]));
});
check('native.same-typed-slot-in-both-verdict-and-coverage', () => {
  const native = materializeFactionSlotReviewV1(nativeOptions);
  assert.deepEqual(native.output, result.output);
  assert.equal(native.receipt.coordinateProof.proseUsedToInferAddress, false);
  assert.equal(native.receipt.providerOutputHash, hash(nativeOutput));
});
check('native.address-does-not-depend-on-source-echo-or-prose-grammar', () => {
  const providerOutput = structuredClone(nativeOutput); providerOutput.coverage[0].reason = '本条依据所给来源；编号由结构化字段选择。';
  const native = materializeFactionSlotReviewV1({ ...nativeOptions, providerOutput });
  assert.deepEqual(native.output.coverage[0].recommendationIndices, [2]);
  assert.equal(native.output.coverage[0].reason, providerOutput.coverage[0].reason);
});
check('native.explicit-focus-path-host-materialization', () => {
  const providerOutput = structuredClone(nativeOutput), target = targets.targets[0];
  const field = target.fields.find(row => row.path === 'risk');
  assert(field && field.text.length > 16);
  providerOutput.verdicts[0].focus = [{ path: field.path,
    quote: field.text.slice(0, Math.min(80, field.text.length - 1)) + '。' }];
  const originalJudgment = { verdict: providerOutput.verdicts[0].verdict,
    reason: providerOutput.verdicts[0].reason, sourceSlots: providerOutput.verdicts[0].sourceSlots };
  const native = materializeFactionSlotReviewV1({ ...nativeOptions, providerOutput });
  assert.equal(native.receipt.version, 'faction_review_explicit_focus_path_materialization_v1');
  assert.equal(native.receipt.strictMaterializationFailure, 'FACTION_REVIEW_TARGET_QUOTE_MISMATCH');
  assert.equal(native.receipt.modelSelectedPathsReused, true);
  assert.equal(native.receipt.proseUsedToInferAddress, false);
  assert.equal(native.receipt.fieldBindingRecovery.originalFocusVerified, false);
  assert.deepEqual(native.receipt.fieldBindingRecovery.originalFocus[0].focus,
    providerOutput.verdicts[0].focus);
  assert.equal(native.output.verdicts[0].focus[0].path, field.path);
  assert.equal(native.output.verdicts[0].focus[0].quote, field.text.slice(0, 240));
  assert.deepEqual({ verdict: native.output.verdicts[0].verdict,
    reason: native.output.verdicts[0].reason,
    sourceSlots: providerOutput.verdicts[0].sourceSlots }, originalJudgment);
  assert.deepEqual(native.output.coverage, result.output.coverage);
});
check('native.unknown-focus-path-remains-rejected', () => {
  const providerOutput = structuredClone(nativeOutput);
  providerOutput.verdicts[0].focus = [{ path: 'procedure.999', quote: 'unknown field path must not be normalized' }];
  assert.throws(() => materializeFactionSlotReviewV1({ ...nativeOptions, providerOutput }),
    { code: 'FACTION_REVIEW_BINDING_SELECTION_INVALID' });
});
for (const [id, mutate] of [
  ['out-of-range', row => row.recommendationSlots = [2]],
  ['duplicate', row => row.recommendationSlots = [0, 0]],
  ['fractional', row => row.recommendationSlots = [0.5]],
  ['wrong-source', row => row.recommendationSlots = [1]],
  ['empty-covered', row => row.recommendationSlots = []],
  ['missing-slot-field', row => delete row.recommendationSlots],
  ['mixed-namespaces', row => row.recommendationIndices = [2]],
  ['unknown-coverage-slot', row => row.coverageSlot = 3],
]) check('native.reject-' + id, () => {
  const providerOutput = structuredClone(nativeOutput); mutate(providerOutput.coverage[0]);
  assert.throws(() => materializeFactionSlotReviewV1({ ...nativeOptions, providerOutput }));
});
for (const verdict of ['omitted', 'uncertain']) check('native.preserve-' + verdict, () => {
  const providerOutput = structuredClone(nativeOutput); providerOutput.coverage[0].verdict = verdict;
  providerOutput.coverage[0].recommendationSlots = [];
  const native = materializeFactionSlotReviewV1({ ...nativeOptions, providerOutput });
  assert.equal(native.output.coverage[0].verdict, verdict);
  assert.equal(native.output.coverage[0].reason, providerOutput.coverage[0].reason);
});
check('native.duplicate-coverage-row-rejected', () => {
  const providerOutput = structuredClone(nativeOutput); providerOutput.coverage.push(providerOutput.coverage[0]);
  assert.throws(() => materializeFactionSlotReviewV1({ ...nativeOptions, providerOutput }),
    { code: 'FACTION_STRUCTURED_REVIEW_COVERAGE_SLOT_INVALID' });
});
check('native.context-and-draft-drift-rejected', () => {
  const changedDraft = structuredClone(draft); changedDraft.recommendations[2].risk += ' altered';
  assert.throws(() => materializeFactionSlotReviewV1({ ...nativeOptions, draft: changedDraft }));
  assert.throws(() => materializeFactionSlotReviewV1({ ...nativeOptions, requiredSourceRefs: [] }));
  assert.throws(() => materializeFactionSlotReviewV1({ ...nativeOptions, capsule }));
});
for (const selected of createFactionReviewBatchPlanV1({ section, draft }).batches) {
  check('native.actual-draft-batch-offset-' + selected.first, () => {
    const scopedTargets = createFactionReviewTargetsV1({ input, section, draft, indices: selected.reviewIndices });
    const scopedCapsule = createFactionSlotReviewContextV1({ factionInput: input, section, draft,
      reviewIndices: selected.reviewIndices, coverageRequiredSourceRefs: selected.requiredSourceRefs,
      targets: scopedTargets, roleRef: candidate.roleRef, outputContractRef: nativeRef,
      route: 'adversarial', includeSharedScenarioSources: true });
    const providerOutput = {
      verdicts: scopedTargets.targets.map((target, targetSlot) => ({ targetSlot,
        focus: [{ path: target.fields[0].path, quote: target.fields[0].text.slice(0, 120) }],
        verdict: 'uncertain', reason: 'Injected address test only; no factual judgment made.',
        sourceSlots: [scopedCapsule.localIssue.reviewTask.sourceCatalogue.find(source => source.ref === target.recommendation.sourceRefs[0]).slot] })),
      coverage: selected.requiredSourceRefs.map((sourceRef, coverageSlot) => {
        const recommendationSlots = scopedTargets.targets.flatMap((target, slot) => target.recommendation.sourceRefs.includes(sourceRef) ? [slot] : []);
        return { coverageSlot, verdict: recommendationSlots.length ? 'covered' : 'uncertain', recommendationSlots,
          reason: 'Injected coordinate selection, not source acceptance.' };
      }),
    };
    // Provider array order must not become either namespace's identity.
    providerOutput.verdicts.reverse(); providerOutput.coverage.reverse();
    const validation = validateStarcraftTmgProviderJsonSchemaValueV1(nativeContract.providerSchema, providerOutput);
    assert.equal(validation.ok, true, JSON.stringify({ batch: selected.first, issues: validation.issues }));
    const mapped = materializeFactionSlotReviewV1({ ...nativeOptions, capsule: scopedCapsule,
      targets: scopedTargets, reviewIndices: selected.reviewIndices,
      requiredSourceRefs: selected.requiredSourceRefs, providerOutput });
    assert.deepEqual(mapped.output.verdicts.map(v => v.targetId), scopedTargets.targets.map(t => t.targetId));
    for (const row of mapped.output.coverage) {
      const original = providerOutput.coverage.find(r => selected.requiredSourceRefs[r.coverageSlot] === row.sourceRef);
      assert.deepEqual(row.recommendationIndices, original.recommendationSlots.map(slot => selected.reviewIndices[slot]));
    }
    assert.ok(mapped.output.verdicts.every(v => v.verdict === 'uncertain'));
    assert.equal(mapped.receipt.runtimeAccepted, false);
  });
}
const afterDb = new DatabaseSync('build/ticket-17-production-redesign-v1/production.sqlite', { readOnly: true });
try { check('actual-original-paid-attempt-byte-unchanged', () => assert.equal(hash(afterDb.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(runId, attemptId)), originalAttemptHash)); }
finally { afterDb.close(); }
for (const file of ['content/skill-generation/ticket-18-faction-review-output-contract-v1.mjs',
  'packages/skill-production-v3/faction-review-coverage-address-v4.mjs']) {
  const actual = sha256(await readFile(file));
  check('frozen-source.' + file, () => assert.equal(actual, ownerRecipe.codeHashes.find(row => row.file === file)?.hash));
}
const files = ['content/skill-generation/ticket-18-faction-review-output-contract-v6.mjs',
  'packages/skill-production-v3/faction-review-slot-namespace-v1.mjs', 'scripts/verify-ticket-18-review-slot-namespace-v1.mjs'];
const report = seal({ version: 'faction_review_slot_namespace_component_v1', passed: true, checks, binding,
  actualContextRebuilt: true, originalCandidateHash: candidate.hash, recovery: result.receipt,
  source: batch.requiredSourceRefs[0], localSlot: 0, globalIndex: 2, providerCalls: 0,
  productionArtifactsModified: false, productionWired: false, formalSkillAccepted: false,
  nativeV6ExamplesAreInjected: true, nativeV6ActualProviderCalls: 0, actualDshSessions: 0,
  semanticAcceptance: false, runtimeAccepted: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
await writeFile(base + 'review-slot-namespace-component-v1.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks: checks.length, originalContextHash: capsule.hash,
  providerCalls: 0, productionWired: false, hash: report.hash }));
