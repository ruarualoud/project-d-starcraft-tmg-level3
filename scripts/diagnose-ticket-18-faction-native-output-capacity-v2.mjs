import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
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
import { produceFactionStrategyV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { prepareFactionNativeProductionRoleV1 } from '../packages/skill-production-v3/faction-native-production-runtime-v1.mjs';

const root = process.cwd(), base = 'build/ticket-18-faction-production-v1/';
const filename = 'build/ticket-17-production-redesign-v1/production.sqlite';
const runId = 'faction-v1-8a5389823de46cf062ae', attemptId = 'structured-18946a75714b4367dd6a728a34db7b3f4f5408c812ea0517';
const read = async file => verifySeal(JSON.parse(await readFile(file, 'utf8')));
const input = await read(base + 'zerg_swarm-input.json'), recipe = await read(base + runId + '/recipe.json');
const capabilities = await read(base + runId + '/active-capabilities.json');
const db = new DatabaseSync(filename, { readOnly: true });
let receipt, issue;
try {
  const attempt = db.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(runId, attemptId);
  assert.equal(attempt.state, 'failed'); assert.equal(attempt.code, 'STRUCTURED_PROVIDER_INCOMPLETE');
  assert.ok(attempt.settled > 0);
  receipt = verifySeal(JSON.parse(attempt.response)).value;
  issue = verifySeal(verifySeal(JSON.parse(db.prepare('SELECT artifact FROM steps WHERE run=? AND id=?')
    .get(runId, attemptId + '.issue').artifact)).value);
  assert.equal(receipt.status, 200); assert.equal(receipt.incompleteReason, 'max_output_tokens');
  assert.equal(receipt.usage.outputUnits, 4096); assert.equal(receipt.outputTextHash, null);
  assert.equal(issue.rejectedCandidateRef, null);
} finally { db.close(); }
const ancestors = []; let parent = recipe.continuation?.parentRunId;
while (parent) { const r = await read(base + parent + '/recipe.json'); ancestors.push(r); parent = r.continuation?.parentRunId; }
const catalogue = await loadFrozenSkillEvidence(root), context = createGlobalProductionContext(catalogue);
const { dataset } = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root });
const drills = await createFactionRosterChoiceDrillsV1({ catalogue, dataset });
const knownRulePolicy = createFactionKnownRulePolicyV1({ input, drills });
assert.equal(knownRulePolicy.hash, recipe.knownRulePolicyHashes[1]);
const dependencies = await loadFactionStructuredReplayDependenciesV1({ root, recipe });
const replay = openFactionProductionReplayV1({ filename, runId, recipe, ancestors, input, editorImport: dependencies.editorImport });
let request, replayProof;
try {
  const forbidden = () => fail('CAPACITY_DIAGNOSIS_NO_PROVIDER_OR_DSH');
  const runtime = createProductionRuntimeV3({ store: replay.store, reader: createEvidenceReader(catalogue), context,
    verifier: {}, model: forbidden, dsh: { run: forbidden } });
  const stack = await createFactionReplayRuntimeStackV1({ root, runId, recipe, input, replay, runtime, dependencies });
  await assert.rejects(produceFactionStrategyV1({ input, knownRulePolicy, store: replay.store,
    registeredSourceFieldRepair: true, legacyPromptRoleIds: stack.legacyPromptRoleIds,
    catalogueReviewBinding: recipe.catalogueReviewBinding, structuredReviewValidationBinding: stack.structuredReviewValidationBinding,
    tutorRecovery: recipe.teachRecoveryBindings.find(r => r.inputHash === input.hash),
    runtime: { role(r) { if (r.roleId === 'faction.zerg_swarm.army_resources.1.proposer') {
      request = r; fail('CAPACITY_DIAGNOSIS_REQUEST_CAPTURED'); } return stack.runtime.role(r); } } }),
  { code: 'CAPACITY_DIAGNOSIS_REQUEST_CAPTURED' });
  replayProof = replay.evidence();
} finally { replay.close(); }
const executionPolicy = { maxOutputUnits: 4096, attemptEstimateMicros: 800000, attemptTokenReserve: 500000,
  allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false, idempotentRetrySupported: false, encryptedRawQuarantineAvailable: false };
const prepared = prepareFactionNativeProductionRoleV1({ input, request, executionPolicy });
const invocation = { schemaVersion: 'starcraft_tmg_structured_generation_runtime_v1.invocation',
  roleRef: prepared.roleRef, contextManifestRef: prepared.contextManifestRef, outputContractRef: prepared.outputContractRef,
  executionPolicyRef: prepared.executionPolicyRef, continuationRef: null,
  contextPayloadHash: hash({ instructions: prepared.instructions, input: prepared.payload }),
  capabilityReceiptHash: capabilities.nativeProduction.notes.receiptHash, trainingTruth: false };
assert.equal(hash(invocation), issue.invocationHash);
assert.equal(receipt.capabilityReceiptHash, invocation.capabilityReceiptHash);
assert.deepEqual(JSON.parse(prepared.payload).fullFrozenSources, input.frozenSources.prompt);
const report = seal({ passed: true, originRunId: runId, originAttemptId: attemptId,
  originalReceiptHash: receipt.receiptHash, originalIssueHash: issue.hash, inputHash: input.hash,
  invocationHash: issue.invocationHash, fullRoleId: prepared.fullRoleId, kind: prepared.kind,
  fullContextBytes: prepared.fullContextBytes, request, replayProof, actualRequestRebuilt: true,
  failureClass: 'output_incomplete', incompleteReason: receipt.incompleteReason,
  actualOutputUnits: receipt.usage.outputUnits, partialOutputUsed: false, providerCalls: 0, actualDshSessions: 0,
  sourceRefreshPerformed: false, trainingTruth: false,
  codeHashes: [{ file: 'scripts/diagnose-ticket-18-faction-native-output-capacity-v2.mjs', hash: sha256(await readFile(import.meta.filename)) }] });
await writeFile(base + 'native-output-capacity-diagnosis.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, originRunId: runId, kind: prepared.kind, actualOutputUnits: 4096,
  actualRequestRebuilt: true, providerCalls: 0, hash: report.hash }));
