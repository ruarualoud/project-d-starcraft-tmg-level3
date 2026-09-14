import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { seal, verifySeal, hash, sha256, fail } from '../packages/skill-production/common.mjs';
import { loadFrozenSkillEvidence, createEvidenceReader } from '../packages/skill-production/evidence.mjs';
import { createGlobalProductionContext } from '../packages/skill-production-v3/context.mjs';
import { createProductionRuntimeV3 } from '../packages/skill-production-v3/runtime.mjs';
import { createFactionKnownRulePolicyV1 } from '../packages/skill-production-v3/faction-known-rule-findings-v1.mjs';
import { createFactionRosterChoiceDrillsV1 } from '../packages/skill-evaluation/faction-roster-choice-drills-v1.mjs';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from './support/official-development-tranche-source-lock-fixture-v1.mjs';
import { openFactionProductionReplayV1 } from '../packages/skill-evaluation/faction-production-replay-v1.mjs';
import { loadFactionStructuredReplayDependenciesV1, createFactionReplayRuntimeStackV1 } from '../packages/skill-evaluation/faction-replay-runtime-stack-v1.mjs';
import { produceFactionStrategyV1, validateFactionTreeV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { prepareFactionNativeProductionRoleV1 } from '../packages/skill-production-v3/faction-native-production-runtime-v1.mjs';
import { readFactionTeachFailureEvidenceV1 } from '../packages/skill-evaluation/faction-teach-failure-evidence-v1.mjs';
import { materializeFactionNativeReferenceSetV1, recoverFactionNativeReferenceSetV1, verifyFactionNativeReferenceSetRoleV1,
  normalizeFactionNativeReferenceSetsV1, FACTION_NATIVE_REFERENCE_SET_RECOVERY_BINDING_V1 as binding } from '../packages/skill-production-v3/faction-native-reference-set-recovery-v1.mjs';
import { FACTION_NATIVE_PRODUCTION_CONTRACTS_V1 as contracts } from '../content/skill-generation/ticket-18-faction-native-production-contracts-v1.mjs';
import { prepareDshLoop } from '../packages/skill-production/loops.mjs';
const root = process.cwd(), base = 'build/ticket-18-faction-production-v1/';
const read = async file => verifySeal(JSON.parse(await readFile(file, 'utf8')));
const runId = 'faction-v1-a266c185ad305c8a954b', attemptId = 'structured-044198cd01084357d75c0948a0d3e78f7ae08af6c5e15c34';
const recipe = await read(base + runId + '/recipe.json'), input = await read(base + 'zerg_swarm-input.json');
const evidence = readFactionTeachFailureEvidenceV1({ filename: 'build/ticket-17-production-redesign-v1/production.sqlite', runId, attemptId });
const normalized = normalizeFactionNativeReferenceSetsV1({ value: evidence.rejected.providerValue, contract: contracts.questions, input });
validateFactionTreeV1(normalized.output, input);
assert.equal(normalized.repairs.length, 1);
assert.deepEqual(normalized.repairs[0].removedIndices, [2]);
assert.equal(normalized.output.branches.length, 6);
assert.equal(normalized.output.branches.flatMap(b => b.questions).length, 18);
assert.deepEqual(normalized.output.branches.flatMap(b => b.questions.map(q => q.question)),
  evidence.rejected.providerValue.branches.flatMap(b => b.questions.map(q => q.question)));
console.log(JSON.stringify({ event: 'actual-duplicate-reproduced-and-normalized', preservedQuestions: 18, removedDuplicateReferences: 1, providerCalls: 0 }));
const ancestors = []; let parent = recipe.continuation?.parentRunId;
while (parent) { const r = await read(base + parent + '/recipe.json'); ancestors.push(r); parent = r.continuation?.parentRunId; }
const catalogue = await loadFrozenSkillEvidence(root), context = createGlobalProductionContext(catalogue);
const { dataset } = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root });
const drills = await createFactionRosterChoiceDrillsV1({ catalogue, dataset });
const knownRulePolicy = createFactionKnownRulePolicyV1({ input, drills });
assert.equal(knownRulePolicy.hash, recipe.knownRulePolicyHashes[1]);
const dependencies = await loadFactionStructuredReplayDependenciesV1({ root, recipe });
const replay = openFactionProductionReplayV1({ filename: 'build/ticket-17-production-redesign-v1/production.sqlite',
  runId, recipe, ancestors, input, editorImport: dependencies.editorImport });
let request, replayProof;
try {
  const forbidden = () => fail('FIXTURE_NO_PROVIDER_OR_DSH');
  const runtime = createProductionRuntimeV3({ store: replay.store, reader: createEvidenceReader(catalogue), context,
    verifier: {}, model: forbidden, dsh: { run: forbidden } });
  const stack = await createFactionReplayRuntimeStackV1({ root, runId, recipe, input, replay, runtime, dependencies });
  await assert.rejects(produceFactionStrategyV1({ input, knownRulePolicy, store: replay.store,
    registeredSourceFieldRepair: true, legacyPromptRoleIds: stack.legacyPromptRoleIds,
    catalogueReviewBinding: recipe.catalogueReviewBinding, structuredReviewValidationBinding: stack.structuredReviewValidationBinding,
    tutorRecovery: recipe.teachRecoveryBindings.find(r => r.inputHash === input.hash),
    runtime: { role(r) { if (r.roleId === 'question-tree') { request = r; fail('FIXTURE_REQUEST_CAPTURED'); }
      return stack.runtime.role(r); } } }), { code: 'FIXTURE_REQUEST_CAPTURED' });
  replayProof = replay.evidence();
} finally { replay.close(); }
const executionPolicy = { maxOutputUnits: 4096, attemptEstimateMicros: 800000, attemptTokenReserve: 500000,
  allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false, idempotentRetrySupported: false, encryptedRawQuarantineAvailable: false };
const prepared = prepareFactionNativeProductionRoleV1({ input, request, executionPolicy });
assert.equal(prepared.contextManifestRef.hash, evidence.rejected.contextManifestRef.hash);
const materialization = materializeFactionNativeReferenceSetV1({ input, prepared, evidence });
assert.deepEqual(materialization.output, normalized.output);
assert.equal(materialization.originalUsage.outputUnits, 3934);
assert.equal(materialization.providerCalls, 0);
const dsh = await prepareDshLoop(root);
const value = await recoverFactionNativeReferenceSetV1({ input, prepared, evidence, dsh });
assert.deepEqual(verifyFactionNativeReferenceSetRoleV1({ value, input, prepared, evidence, dshBindingHash: dsh.binding.hash })
  .providerReceiptHashes, [materialization.originalFailureReceiptHash]);
let checks = 11;
for (const code of ['PROVIDER_PAYMENT_REQUIRED', 'STRUCTURED_PROVIDER_INCOMPLETE']) {
  assert.throws(() => materializeFactionNativeReferenceSetV1({ input, prepared,
    evidence: { ...evidence, attempt: { ...evidence.attempt, code } } }), { code: 'FACTION_NATIVE_REFERENCE_SET_EVIDENCE_INVALID' }); checks++;
}
const unknown = structuredClone(evidence.rejected.providerValue); unknown.branches[0].questions[0].sourceRefs[0] = 'source:invented';
assert.throws(() => normalizeFactionNativeReferenceSetsV1({ value: unknown, contract: contracts.questions, input }),
  { code: 'FACTION_NATIVE_REFERENCE_SET_UNKNOWN_SOURCE' }); checks++;
const otherError = structuredClone(evidence.rejected.providerValue); otherError.accepted = true;
assert.throws(() => normalizeFactionNativeReferenceSetsV1({ value: otherError, contract: contracts.questions, input }),
  { code: 'FACTION_NATIVE_REFERENCE_SET_NOT_APPLICABLE' }); checks++;
const files = ['packages/skill-production-v3/faction-native-reference-set-recovery-v1.mjs',
  'scripts/verify-ticket-18-faction-native-reference-set-v1.mjs'];
const report = seal({ passed: true, checks, binding, originRunId: runId, originAttemptId: attemptId,
  inputHash: input.hash, materialization, imported: value, request, replayProof,
  actualRequestContextRebuilt: true, originalQuestionsPreserved: 18, removedDuplicateReferences: 1,
  actualDshSessions: 1, providerCalls: 0, actualStructuredConsumerReplayPassed: false,
  productionWiringChanged: false, semanticAcceptance: false, sourceRefreshPerformed: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
await writeFile(base + 'native-reference-set-readiness.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, preservedQuestions: 18, providerCalls: 0, hash: report.hash }));
