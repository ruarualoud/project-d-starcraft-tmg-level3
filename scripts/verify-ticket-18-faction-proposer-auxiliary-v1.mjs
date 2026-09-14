import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { prepareDshLoop } from '../packages/skill-production/loops.mjs';
import { readFactionTeachFailureEvidenceV1 } from '../packages/skill-evaluation/faction-teach-failure-evidence-v1.mjs';
import { FACTION_PROPOSER_AUXILIARY_CAPACITY_BINDING_V1 as binding } from '../packages/skill-production-v3/faction-proposer-auxiliary-capacity-v1.mjs';
import { materializeFactionProposerAuxiliaryV1, recoverFactionProposerAuxiliaryV1 } from '../packages/skill-production-v3/faction-proposer-auxiliary-recovery-v1.mjs';
import { FACTION_PROPOSER_BATCH_BINDING_V1 as batchBinding, validateFactionProposerBatchOutputV1,
  factionProposerBatchRequestV1, assembleFactionProposerBatchesV1, produceFactionProposerBatchesV1 } from '../packages/skill-production-v3/faction-proposer-batches-v1.mjs';
import { prepareFactionNativeProductionRoleV1, createFactionNativeProductionRuntimeV1, usesFactionNativeProductionInputV1 } from '../packages/skill-production-v3/faction-native-production-runtime-v1.mjs';
import { verifyFactionStructuredRoleReplayV1 } from '../packages/skill-evaluation/faction-structured-replay-v1.mjs';
import { validateFactionProposerAuxiliaryMigrationV1 } from '../packages/skill-production-v3/faction-proposer-auxiliary-migration-v1.mjs';
import { verifyFactionProposerAuxiliaryCurrentFaultsV1 } from './support/faction-proposer-auxiliary-current-faults-v1.mjs';

const root = process.cwd(), base = 'build/ticket-18-faction-production-v1/';
const read = async name => verifySeal(JSON.parse(await readFile(base + name + '.json', 'utf8')));
const recipe = await read('faction-v1-c96a15b1a09894a777f7/recipe');
const executionPolicy = { maxOutputUnits: 4096, attemptEstimateMicros: 800000, attemptTokenReserve: 500000,
  allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false, idempotentRetrySupported: false, encryptedRawQuarantineAvailable: false };
const reseal = (v, delta) => { const { hash: ignored, ...body } = v; return seal({ ...body, ...delta }); };
const dsh = await prepareDshLoop(root);
let checks = 0, currentFaults; const origins = [];
for (const [faction, name] of [['zerg_swarm', 'proposer-uncertainty-capacity-diagnosis'],
  ['terran_armed_forces', 'terran-proposer-auxiliary-diagnosis']]) {
  const input = await read(faction + '-input'), diagnosis = await read(name), request = diagnosis.request;
  const evidence = readFactionTeachFailureEvidenceV1({ filename: 'build/ticket-17-production-redesign-v1/production.sqlite',
    runId: diagnosis.originRunId, attemptId: diagnosis.originAttemptId });
  const prepared = prepareFactionNativeProductionRoleV1({ input, request, executionPolicy,
    proposerBatchBinding: batchBinding, proposerAuxiliaryCapacityBinding: binding });
  const args = { input, request, prepared, evidence, auxiliaryCapacityBinding: binding };
  const materialization = materializeFactionProposerAuxiliaryV1(args);
  assert.deepEqual(materialization.output, evidence.rejected.providerValue); checks++;
  assert.equal(materialization.uncertaintyCount, 3); checks++;
  assert.equal(materialization.originalOutputHash, hash(evidence.rejected.providerValue)); checks++;
  assert.equal(materialization.contentChanged, false); checks++;
  const { plan, batchIndex, priorBatches, originalInstruction, originalMaxOutput } = request.workspace.proposerBatch;
  const outputArgs = { input, plan, indices: plan.batches[batchIndex] };
  assert.throws(() => validateFactionProposerBatchOutputV1(materialization.output, outputArgs),
    { code: 'FACTION_PROPOSER_BATCH_UNCERTAINTIES_INVALID' }); checks++;
  assert.deepEqual(validateFactionProposerBatchOutputV1(materialization.output, { ...outputArgs, auxiliaryCapacityBinding: binding }),
    materialization.output); checks++;
  for (const delta of [out => out.plans.pop(), out => out.plans[0].index = 127,
    out => out.plans[0].sourceRefs = ['source:invented'], out => out.plans[0].sourceRefs = [],
    out => out.plans[0].text = 'x'.repeat(601), out => out.uncertainties[0] = 'x'.repeat(241),
    out => out.uncertainties = Array(129).fill('uncertain')]) {
    const wrong = structuredClone(materialization.output); delta(wrong);
    assert.throws(() => validateFactionProposerBatchOutputV1(wrong, { ...outputArgs, auxiliaryCapacityBinding: binding })); checks++;
  }
  for (const bad of [
    { ...evidence, attempt: { ...evidence.attempt, state: 'intent' } },
    { ...evidence, attempt: { ...evidence.attempt, code: 'STRUCTURED_PROVIDER_INCOMPLETE' } },
    { ...evidence, attempt: { ...evidence.attempt, code: 'PROVIDER_PAYMENT_REQUIRED' } },
    { ...evidence, issue: reseal(evidence.issue, { safeReceiptHash: hash('foreign') }) },
    { ...evidence, rejected: reseal(evidence.rejected, { contextManifestRef: { hash: hash('foreign') } }) },
  ]) { assert.throws(() => materializeFactionProposerAuxiliaryV1({ ...args, evidence: bad })); checks++; }
  assert.throws(() => materializeFactionProposerAuxiliaryV1({ ...args,
    prepared: { ...prepared, payload: prepared.payload + ' ' } }), { code: 'FACTION_PROPOSER_AUXILIARY_EVIDENCE_INVALID' }); checks++;
  const imported = await recoverFactionProposerAuxiliaryV1({ ...args, dsh });
  assert.deepEqual(imported.output, evidence.rejected.providerValue); checks++;
  assert.equal(usesFactionNativeProductionInputV1(imported), true); checks++;
  const consumerArgs = { value: imported, roleInput: prepared.roleInput, request, input,
    recipe: { ...recipe, proposerAuxiliaryCapacityBinding: binding }, resolveTeachFailureEvidence: () => evidence };
  assert.deepEqual(verifyFactionStructuredRoleReplayV1(consumerArgs).providerReceiptHashes,
    [materialization.originalFailureReceiptHash]); checks++;
  assert.throws(() => verifyFactionStructuredRoleReplayV1({ ...consumerArgs, recipe }),
    { code: 'FACTION_PROPOSER_AUXILIARY_CONSUMER_BINDING_REQUIRED' }); checks++;
  const dropped = { ...imported.output, uncertainties: imported.output.uncertainties.slice(0, 2) };
  assert.throws(() => verifyFactionStructuredRoleReplayV1({ ...consumerArgs, value: reseal(imported, { output: dropped }) }),
    { code: 'FACTION_PROPOSER_AUXILIARY_CONSUMER_DRIFT' }); checks++;

  let stored, imports = 0;
  const store = { acquire(id, roleInput) { assert.equal(id, prepared.fullRoleId); assert.deepEqual(roleInput, prepared.roleInput);
    return stored ? { cached: true, artifact: stored } : { cached: false }; },
    finish(_lease, value) { stored = value; return value; }, release() {} };
  const runtime = createFactionNativeProductionRuntimeV1({ input, store, executionPolicy,
    proposerBatchBinding: batchBinding, proposerAuxiliaryCapacityBinding: binding, proposerAuxiliaryImports: [evidence],
    dsh: { binding: dsh.binding, async run(call) { imports++; const result = await call.callModel();
      assert.equal(result.receiptHash, materialization.hash); return imported.loop; } },
    runtime: { role: () => assert.fail('no legacy fallback') }, providerAdapter: { complete: () => assert.fail('no Provider') },
    egressBinding: {}, priceUsage: () => assert.fail('no new billing') });
  assert.equal((await runtime.role(request)).hash, imported.hash); checks++;
  assert.equal((await runtime.role(request)).hash, imported.hash); checks++;
  assert.equal(imports, 1); checks++;

  const { proposerBatch, outputRequestAtEnd, ...originalWorkspace } = request.workspace;
  const parent = { ...request, roleId: plan.parentRoleId, instruction: originalInstruction,
    maxOutput: originalMaxOutput, workspace: originalWorkspace };
  const batches = [...priorBatches, { indices: plan.batches[batchIndex], artifactHash: imported.hash, output: imported.output }];
  // Any final missing batch is injected solely to test propagation/assembly,
  // not claimed as produced content, source review or chapter completion.
  for (let n = batches.length; n < plan.batches.length; n++) {
    const child = factionProposerBatchRequestV1({ input, request: parent, plan, batchIndex: n,
      priorBatches: batches, auxiliaryCapacityBinding: binding });
    assert.deepEqual(child.workspace.proposerBatch.priorBatches[batchIndex].output, imported.output); checks++;
    const native = prepareFactionNativeProductionRoleV1({ input, request: child, executionPolicy,
      proposerBatchBinding: batchBinding, proposerAuxiliaryCapacityBinding: binding });
    assert.deepEqual(JSON.parse(native.payload).workspace.proposerBatch.priorBatches[batchIndex].output, imported.output); checks++;
    batches.push({ indices: plan.batches[n], artifactHash: hash('injected-tail-' + n), output: {
      plans: plan.batches[n].map(index => ({ index, text: 'Injected pipeline propagation test, not produced strategy.',
        sourceRefs: plan.targets[index].requiredSourceRefs })), uncertainties: ['Synthetic final batch, not semantic evidence.'] } });
  }
  const assembly = assembleFactionProposerBatchesV1({ input, plan, batches, auxiliaryCapacityBinding: binding });
  for (const note of imported.output.uncertainties) { assert.ok(assembly.output.uncertainties.includes(note)); checks++; }
  const generated = await produceFactionProposerBatchesV1({ input, request: parent, auxiliaryCapacityBinding: binding,
    role: async child => {
      const n = child.workspace.proposerBatch.batchIndex, row = batches[n];
      // Existing paid batch hashes are needed in the exact next request.
      return n === batchIndex ? imported : seal({ roleId: child.packet.id + '.' + child.roleId, output: row.output });
    }, store: { acquire: () => ({ cached: false }), finish: (_lease, value) => value } });
  assert.deepEqual(generated.value, assembly.output); checks++;
  if (faction === 'zerg_swarm') currentFaults = await verifyFactionProposerAuxiliaryCurrentFaultsV1({
    input, request, actualOutput: imported.output, executionPolicy, recipe, dsh });
  origins.push({ inputHash: input.hash, originRunId: diagnosis.originRunId, originAttemptId: diagnosis.originAttemptId,
    originalFailureReceiptHash: materialization.originalFailureReceiptHash, rejectedCandidateHash: evidence.rejected.hash,
    contextHash: prepared.contextManifestRef.hash, recoveredArtifactHash: imported.hash, materializationHash: materialization.hash,
    originalUsage: materialization.originalUsage, originalSettledMicros: materialization.originalSettledMicros });
}
const files = ['packages/skill-production-v3/faction-proposer-auxiliary-capacity-v1.mjs',
  'packages/skill-production-v3/faction-proposer-auxiliary-migration-v1.mjs',
  'packages/skill-production-v3/faction-proposer-auxiliary-recovery-v1.mjs',
  'packages/skill-production-v3/faction-proposer-batches-v1.mjs', 'packages/skill-production-v3/faction-native-production-runtime-v1.mjs',
  'packages/skill-production-v3/faction-strategy-workflow-v1.mjs', 'packages/skill-production-v3/faction-continuation-v1.mjs',
  'packages/skill-evaluation/faction-structured-replay-v1.mjs', 'packages/skill-evaluation/faction-replay-runtime-stack-v1.mjs',
  'packages/skill-evaluation/faction-candidate-evidence-v1.mjs', 'scripts/run-ticket-18-faction-strategy-production-v1.mjs',
  'scripts/verify-ticket-18-proposer-auxiliary-boundary-v1.mjs', 'scripts/verify-ticket-18-faction-proposer-auxiliary-v1.mjs'];
files.push('scripts/support/faction-proposer-auxiliary-current-faults-v1.mjs');
const report = seal({ passed: true, checks: checks + currentFaults.checks, binding, origins, currentFaults,
  actualDshSessions: 2 + currentFaults.actualDshSessions, providerCalls: 0,
  actualRequestRebuilt: true, consumerReplayPassed: true, fullContextPreserved: true, allUncertaintiesPreserved: true,
  subsequentBatchAndAssemblyTested: true, productionImportTested: true, strictSubstantiveChecksPreserved: true,
  oldProviderContractPreserved: true, semanticAcceptanceInherited: false, sourceRefreshPerformed: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
const next = { ...recipe, proposerAuxiliaryCapacityBinding: binding, proposerAuxiliaryReadinessHash: report.hash,
  codeHashes: report.codeHashes };
const migrationArgs = { filename: 'build/ticket-17-production-redesign-v1/production.sqlite',
  parentRunId: 'faction-v1-c96a15b1a09894a777f7', parent: recipe, next, readiness: report };
assert.equal(validateFactionProposerAuxiliaryMigrationV1(migrationArgs).bindingHash, binding.hash);
for (const delta of [n => delete n.proposerAuxiliaryCapacityBinding, n => n.proposerAuxiliaryReadinessHash = hash('foreign'),
  n => n.codeHashes = [], n => n.proposerBatchBinding = { hash: hash('foreign') }]) {
  const changed = structuredClone(next); delta(changed);
  assert.throws(() => validateFactionProposerAuxiliaryMigrationV1({ ...migrationArgs, next: changed }));
}
assert.throws(() => validateFactionProposerAuxiliaryMigrationV1({ ...migrationArgs, parentRunId: 'faction-v1-c7ca14be3b96ade06b22' }));
await writeFile(base + 'proposer-auxiliary-readiness.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks: report.checks, actualDshSessions: report.actualDshSessions,
  providerCalls: 0, hash: report.hash }));
