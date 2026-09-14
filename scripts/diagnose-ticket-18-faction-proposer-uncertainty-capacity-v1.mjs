import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile, writeFile } from 'node:fs/promises';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { readFactionTeachFailureEvidenceV1 } from '../packages/skill-evaluation/faction-teach-failure-evidence-v1.mjs';
import { FACTION_PROPOSER_BATCH_BINDING_V1 as binding, FACTION_PROPOSER_BATCH_CONTRACT_V1 as contract,
  createFactionProposerBatchPlanV1, factionProposerBatchRequestV1 } from '../packages/skill-production-v3/faction-proposer-batches-v1.mjs';
import { prepareFactionNativeProductionRoleV1 } from '../packages/skill-production-v3/faction-native-production-runtime-v1.mjs';
import { validateStarcraftTmgProviderJsonSchemaValueV1 } from '../packages/structured-generation/output-contract-registry-v1.mjs';

// Per-attempt diagnosis only: the failed paid attempt is already settled.
// This does NOT replay or declare the other still-running lane terminal.
const base = 'build/ticket-18-faction-production-v1/', filename = 'build/ticket-17-production-redesign-v1/production.sqlite';
const runId = 'faction-v1-c96a15b1a09894a777f7';
const attemptId = 'structured-0bdcb5476e0a6e6b16292e4816013dc9fa63bb1d3e38d6cd';
const read = async name => verifySeal(JSON.parse(await readFile(base + name + '.json', 'utf8')));
const input = await read('zerg_swarm-input'), diagnosis = await read('proposer-capacity-diagnosis');
const evidence = readFactionTeachFailureEvidenceV1({ filename, runId, attemptId });
const receipt = verifySeal(JSON.parse(evidence.attempt.response)).value;
assert.equal(evidence.attempt.state, 'failed'); assert.ok(evidence.attempt.settled > 0);
assert.equal(receipt.code, 'STRUCTURED_PROVIDER_SCHEMA_INVALID'); assert.equal(receipt.status, 200);
assert.equal(receipt.incompleteReason, null); assert.equal(receipt.usage.outputUnits, 744);
const plan = createFactionProposerBatchPlanV1({ input, request: diagnosis.request });
const db = new DatabaseSync(filename, { readOnly: true }); let prior;
try {
  const id = diagnosis.request.packet.id + '.' + plan.sectionId + '.proposer-batch-v1.' + plan.hash.slice(0, 20) + '.batch.0';
  prior = verifySeal(verifySeal(JSON.parse(db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'")
    .get(runId, id).artifact)).value);
} finally { db.close(); }
const request = factionProposerBatchRequestV1({ input, request: diagnosis.request, plan, batchIndex: 1,
  priorBatches: [{ indices: plan.batches[0], artifactHash: prior.hash, output: prior.output }] });
const executionPolicy = { maxOutputUnits: 4096, attemptEstimateMicros: 800000, attemptTokenReserve: 500000,
  allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false, idempotentRetrySupported: false, encryptedRawQuarantineAvailable: false };
const prepared = prepareFactionNativeProductionRoleV1({ input, request, executionPolicy, proposerBatchBinding: binding });
assert.deepEqual(prepared.roleRef, evidence.rejected.roleRef);
assert.deepEqual(prepared.contextManifestRef, evidence.rejected.contextManifestRef);
const invocation = { schemaVersion: 'starcraft_tmg_structured_generation_runtime_v1.invocation',
  roleRef: prepared.roleRef, contextManifestRef: prepared.contextManifestRef, outputContractRef: prepared.outputContractRef,
  executionPolicyRef: prepared.executionPolicyRef, continuationRef: null,
  contextPayloadHash: hash({ instructions: prepared.instructions, input: prepared.payload }),
  capabilityReceiptHash: receipt.capabilityReceiptHash, trainingTruth: false };
assert.equal(hash(invocation), evidence.issue.invocationHash);
const output = evidence.rejected.providerValue;
const original = validateStarcraftTmgProviderJsonSchemaValueV1(contract.providerSchema, output);
assert.deepEqual(original.issues, [{ path: '$.uncertainties', code: 'array_too_long', actualItems: 3, minItems: 0, maxItems: 2 }]);
assert.deepEqual(original.issues, receipt.schemaIssues);
// Change just one validation boundary in a diagnostic copy. No production
// contract, plan text, source reference or negative information is changed.
const schema = structuredClone(contract.providerSchema); schema.properties.uncertainties.maxItems = 128;
assert.equal(validateStarcraftTmgProviderJsonSchemaValueV1(schema, output).ok, true);
assert.deepEqual(output.plans.map(p => p.index), plan.batches[1]);
for (const p of output.plans) {
  assert.ok(plan.targets[p.index].requiredSourceRefs.every(ref => p.sourceRefs.includes(ref)));
  assert.ok(p.sourceRefs.every(ref => input.frozenSources.prompt.sources.some(s => s.ref === ref)));
}
const report = seal({ passed: true, originRunId: runId, originAttemptId: attemptId,
  originalReceiptHash: receipt.receiptHash, rejectedCandidateHash: evidence.rejected.hash,
  originalIssueHash: evidence.issue.hash, actualRequestRebuilt: true, request,
  originalWorkspaceHash: plan.originalWorkspaceHash, priorBatchArtifactHash: prior.hash,
  plansHash: hash(output.plans), uncertaintiesHash: hash(output.uncertainties), originalValidation: original,
  outputUnits: receipt.usage.outputUnits, uncertaintyCount: output.uncertainties.length,
  uncertaintyLengths: output.uncertainties.map(s => s.length), planLengths: output.plans.map(p => p.text.length),
  hypothesisResults: { auxiliaryCountOnly: true, separatePlanShapeOrIndexFailure: false, outputTruncation: false },
  hostCapacityExperimentOnly: true, productionContractChanged: false, originalFailureRelabelled: false,
  contentDeleted: false, semanticAcceptance: false, productionRecovered: false,
  providerCalls: 0, actualDshSessions: 0, trainingTruth: false,
  codeHashes: [{ file: 'scripts/diagnose-ticket-18-faction-proposer-uncertainty-capacity-v1.mjs', hash: sha256(await readFile(import.meta.filename)) }] });
await writeFile(base + 'proposer-uncertainty-capacity-diagnosis.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, actualRequestRebuilt: true, onlySchemaIssue: '$.uncertainties:3>2',
  outputUnits: 744, productionRecovered: false, providerCalls: 0, hash: report.hash }));
