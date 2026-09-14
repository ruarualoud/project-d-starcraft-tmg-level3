import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile, writeFile } from 'node:fs/promises';
import { seal, verifySeal, hash, sha256, fail } from '../packages/skill-production/common.mjs';
import { loadFrozenSkillEvidence, createEvidenceReader } from '../packages/skill-production/evidence.mjs';
import { createGlobalProductionContext } from '../packages/skill-production-v3/context.mjs';
import { createProductionRuntimeV3 } from '../packages/skill-production-v3/runtime.mjs';
import { openFactionProductionReplayV1 } from '../packages/skill-evaluation/faction-production-replay-v1.mjs';
import { loadFactionStructuredReplayDependenciesV1, createFactionReplayRuntimeStackV1 } from '../packages/skill-evaluation/faction-replay-runtime-stack-v1.mjs';
import { createFactionObservedRosterFactsV1 } from '../packages/skill-evaluation/faction-observed-roster-facts-v1.mjs';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from './support/official-development-tranche-source-lock-fixture-v1.mjs';
import { produceFactionStrategyV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { prepareFactionNativeProductionRoleV1 } from '../packages/skill-production-v3/faction-native-production-runtime-v1.mjs';
import { applyFactionNativeOutputCapacityV2 } from '../packages/skill-production-v3/faction-native-output-capacity-v2.mjs';

const root = process.cwd(), base = 'build/ticket-18-faction-production-v1/';
const runId = 'faction-v1-c7ca14be3b96ade06b22';
const attemptId = 'structured-5ecd3e5fabd4e02899caf6911d8293273da034cf7c3fcec3';
const read = async name => verifySeal(JSON.parse(await readFile(base + name + '.json', 'utf8')));
const recipe = await read(runId + '/recipe'), capabilities = await read(runId + '/active-capabilities');
const input = await read('zerg_swarm-input'), knownRulePolicy = await read('zerg_swarm-known-rule-policy');
const filename = 'build/ticket-17-production-redesign-v1/production.sqlite';
const db = new DatabaseSync(filename, { readOnly: true }); let receipt, issue;
try {
  const row = db.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(runId, attemptId);
  assert.equal(row.state, 'failed'); assert.equal(row.code, 'STRUCTURED_PROVIDER_INCOMPLETE');
  assert.ok(row.settled > 0);
  receipt = verifySeal(JSON.parse(row.response)).value;
  issue = verifySeal(verifySeal(JSON.parse(db.prepare('SELECT artifact FROM steps WHERE run=? AND id=?')
    .get(runId, attemptId + '.issue').artifact)).value);
  assert.equal(receipt.incompleteReason, 'max_output_tokens');
  assert.equal(receipt.usage.outputUnits, 8192); assert.equal(receipt.usage.reasoningOutputUnits, 0);
  assert.equal(receipt.outputTextHash, null); assert.equal(issue.rejectedCandidateRef, null);
} finally { db.close(); }
const ancestors = []; let parent = recipe.continuation?.parentRunId;
while (parent) { const r = await read(parent + '/recipe'); ancestors.push(r); parent = r.continuation?.parentRunId; }
const catalogue = await loadFrozenSkillEvidence(root), context = createGlobalProductionContext(catalogue);
const dependencies = await loadFactionStructuredReplayDependenciesV1({ root, recipe });
const { dataset } = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root });
const facts = createFactionObservedRosterFactsV1({ input, dataset });
assert.equal(recipe.observedRosterFactsHashes[1], facts.hash);
const replay = openFactionProductionReplayV1({ filename, runId, recipe, ancestors, input, editorImport: dependencies.editorImport });
let request, replayProof;
try {
  const forbidden = () => fail('PROPOSER_DIAGNOSIS_NO_PROVIDER');
  const runtime = createProductionRuntimeV3({ store: replay.store, reader: createEvidenceReader(catalogue), context,
    verifier: {}, model: forbidden, dsh: { run: forbidden } });
  const stack = await createFactionReplayRuntimeStackV1({ root, runId, recipe, input, replay, runtime, dependencies });
  await assert.rejects(produceFactionStrategyV1({ input, knownRulePolicy, store: replay.store,
    registeredSourceFieldRepair: true, legacyPromptRoleIds: stack.legacyPromptRoleIds,
    catalogueReviewBinding: recipe.catalogueReviewBinding, structuredReviewValidationBinding: stack.structuredReviewValidationBinding,
    tutorRecovery: recipe.teachRecoveryBindings.find(r => r.inputHash === input.hash),
    observedSourceRepair: { binding: recipe.observedSourceRepairBinding, facts }, runtime: { role(r) {
      if (r.roleId === 'faction.zerg_swarm.army_resources.1.proposer') { request = r; fail('PROPOSER_DIAGNOSIS_CAPTURED'); }
      return stack.runtime.role(r);
    } } }), { code: 'PROPOSER_DIAGNOSIS_CAPTURED' });
  replayProof = replay.evidence();
} finally { replay.close(); }
const capacity = recipe.nativeOutputCapacityBinding;
const prepared = prepareFactionNativeProductionRoleV1({ input, request: applyFactionNativeOutputCapacityV2(request, capacity),
  executionPolicy: capacity.executionPolicy, outputCapacityBinding: capacity });
const invocation = { schemaVersion: 'starcraft_tmg_structured_generation_runtime_v1.invocation',
  roleRef: prepared.roleRef, contextManifestRef: prepared.contextManifestRef, outputContractRef: prepared.outputContractRef,
  executionPolicyRef: prepared.executionPolicyRef, continuationRef: null,
  contextPayloadHash: hash({ instructions: prepared.instructions, input: prepared.payload }),
  capabilityReceiptHash: capabilities.nativeOutputCapacity.notes.receiptHash, trainingTruth: false };
assert.equal(hash(invocation), issue.invocationHash);
assert.equal(receipt.capabilityReceiptHash, invocation.capabilityReceiptHash);
assert.equal(request.workspace.judge.judgments.length, 6);
assert.equal(request.workspace.sourceFactCorrection.freshWholeAnswerJudgeRequired, true);
assert.equal(request.workspace.sourceFactFreshJudgeArtifactHash, '6e0c97df1a7ba1e8d1976104a93f18a4668a9985df82c0372bab632896ecb9b4');
const report = seal({ passed: true, originRunId: runId, originAttemptId: attemptId,
  inputHash: input.hash, originalReceiptHash: receipt.receiptHash, originalIssueHash: issue.hash,
  actualInvocationHash: issue.invocationHash, actualRequestRebuilt: true, request,
  fullContextBytes: prepared.fullContextBytes, actualOutputUnits: receipt.usage.outputUnits,
  reportedReasoningOutputUnits: receipt.usage.reasoningOutputUnits,
  incompleteReason: receipt.incompleteReason, partialOutputAvailable: false, rawPrefixAccepted: false,
  correctedAnswersAndRealFreshJudgeReplayed: true, replayProof,
  scope: 'one_proposer_still_truncated_at_8192_not_evidence_of_all_role_capacity_or_hallucination_rate',
  providerCalls: 0, actualDshSessions: 0, sourceRefreshPerformed: false, trainingTruth: false,
  codeHashes: [{ file: 'scripts/diagnose-ticket-18-faction-proposer-capacity-v1.mjs', hash: sha256(await readFile(import.meta.filename)) }] });
await writeFile(base + 'proposer-capacity-diagnosis.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, actualOutputUnits: 8192, actualRequestRebuilt: true,
  correctedAnswersAndRealFreshJudgeReplayed: true, providerCalls: 0, hash: report.hash }));
