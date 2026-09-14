import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { prepareDshLoop, runDirectLoop } from '../packages/skill-production/loops.mjs';
import { readFactionTeachFailureEvidenceV1 } from '../packages/skill-evaluation/faction-teach-failure-evidence-v1.mjs';
import { FACTION_PROPOSER_ENVELOPE_CAPACITY_BINDING_V2 as binding,
  FACTION_PROPOSER_AUXILIARY_CAPACITY_BINDING_V1 as oldBinding } from '../packages/skill-production-v3/faction-proposer-auxiliary-capacity-v1.mjs';
import { materializeFactionProposerAuxiliaryV1, recoverFactionProposerAuxiliaryV1 } from '../packages/skill-production-v3/faction-proposer-auxiliary-recovery-v1.mjs';
import { FACTION_PROPOSER_BATCH_BINDING_V1 as batchBinding, FACTION_PROPOSER_BATCH_CONTRACT_V1 as planContract,
  validateFactionProposerBatchOutputV1, factionProposerBatchRequestV1, assembleFactionProposerBatchesV1,
  produceFactionProposerBatchesV1 } from '../packages/skill-production-v3/faction-proposer-batches-v1.mjs';
import { prepareFactionNativeProductionRoleV1, createFactionNativeProductionRuntimeV1, factionNativeProductionKindV1 } from '../packages/skill-production-v3/faction-native-production-runtime-v1.mjs';
import { verifyFactionStructuredRoleReplayV1 } from '../packages/skill-evaluation/faction-structured-replay-v1.mjs';
import { verifyFactionProposerAuxiliaryCurrentFaultsV1 } from './support/faction-proposer-auxiliary-current-faults-v1.mjs';
import { FACTION_NATIVE_TARGET_RECONSTRUCTION_BINDING_V1 as targetBinding } from '../packages/skill-production-v3/faction-native-target-reconstruction-v1.mjs';
import { applyFactionNativeOutputCapacityV2 } from '../packages/skill-production-v3/faction-native-output-capacity-v2.mjs';
import { FACTION_NATIVE_PRODUCTION_CONTRACTS_V1 } from '../content/skill-generation/ticket-18-faction-native-production-contracts-v1.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V2 as profile } from '../content/skill-generation/offline-provider-profile-v2.mjs';
import { createStarcraftTmgProviderProfileRegistryV2 } from '../packages/secure-provider-runtime/provider-profile-registry-v2.mjs';
import { createStarcraftTmgProviderCapabilityReceiptV1 } from '../packages/structured-generation/provider-capability-receipt-v1.mjs';
import { STARCRAFT_TMG_JSON_SCHEMA_SUBSET_VERSION, outputContractRefStarcraftTmgV1 } from '../packages/structured-generation/output-contract-registry-v1.mjs';
import { createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1 } from '../packages/structured-generation/adapters/deepseek-responses-json-schema-v1.mjs';
import { createStarcraftTmgInMemoryStructuredFaultAdapterV1 } from '../packages/structured-generation/adapters/in-memory-fault-injection-v1.mjs';
import { DatabaseSync } from 'node:sqlite';
import { validateFactionProposerAuxiliaryMigrationV1 } from '../packages/skill-production-v3/faction-proposer-auxiliary-migration-v1.mjs';

const root = process.cwd(), base = 'build/ticket-18-faction-production-v1/';
const read = async name => verifySeal(JSON.parse(await readFile(base + name + '.json', 'utf8')));
const recipe = await read('faction-v1-9200d037cfa6a1c4a388/recipe');
const executionPolicy = { maxOutputUnits: 4096, attemptEstimateMicros: 800000, attemptTokenReserve: 500000,
  allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false, idempotentRetrySupported: false, encryptedRawQuarantineAvailable: false };
const reseal = (v, delta) => { const { hash: ignored, ...body } = v; return seal({ ...body, ...delta }); };
const dsh = await prepareDshLoop(root);
let checks = 0, currentFaults; const origins = [];
for (const [faction, name] of [['zerg_swarm', 'proposer-uncertainty-capacity-diagnosis'],
  ['terran_armed_forces', 'terran-proposer-auxiliary-diagnosis'], ['zerg_swarm', 'proposer-plan-length-diagnosis']]) {
  const input = await read(faction + '-input'), diagnosis = await read(name), request = diagnosis.request;
  const evidence = readFactionTeachFailureEvidenceV1({ filename: 'build/ticket-17-production-redesign-v1/production.sqlite',
    runId: diagnosis.originRunId, attemptId: diagnosis.originAttemptId });
  const prepared = prepareFactionNativeProductionRoleV1({ input, request, executionPolicy,
    proposerBatchBinding: batchBinding, proposerAuxiliaryCapacityBinding: binding });
  const args = { input, request, prepared, evidence, auxiliaryCapacityBinding: binding };
  const materialization = materializeFactionProposerAuxiliaryV1(args);
  assert.deepEqual(materialization.output, evidence.rejected.providerValue); checks++;
  assert.equal(materialization.contentChanged, false); checks++;
  assert.equal(materialization.originalOutputHash, hash(evidence.rejected.providerValue)); checks++;
  const { plan, batchIndex, priorBatches, originalInstruction, originalMaxOutput } = request.workspace.proposerBatch;
  const outputArgs = { input, plan, indices: plan.batches[batchIndex], auxiliaryCapacityBinding: binding };
  assert.deepEqual(validateFactionProposerBatchOutputV1(materialization.output, outputArgs), evidence.rejected.providerValue); checks++;
  for (const delta of [out => out.plans.pop(), out => out.plans[0].index = 127,
    out => out.plans[0].sourceRefs = ['source:invented'], out => out.plans[0].sourceRefs = [],
    out => out.plans[0].text = 'x'.repeat(1601), out => out.uncertainties[0] = 'x'.repeat(241),
    out => out.uncertainties = Array(129).fill('uncertain')]) {
    const wrong = structuredClone(materialization.output); delta(wrong);
    assert.throws(() => validateFactionProposerBatchOutputV1(wrong, outputArgs)); checks++;
  }
  for (const bad of [
    { ...evidence, attempt: { ...evidence.attempt, state: 'intent' } },
    { ...evidence, attempt: { ...evidence.attempt, code: 'PROVIDER_PAYMENT_REQUIRED' } },
    { ...evidence, issue: reseal(evidence.issue, { safeReceiptHash: hash('foreign') }) },
    { ...evidence, rejected: reseal(evidence.rejected, { contextManifestRef: { hash: hash('foreign') } }) },
  ]) { assert.throws(() => materializeFactionProposerAuxiliaryV1({ ...args, evidence: bad })); checks++; }
  assert.throws(() => materializeFactionProposerAuxiliaryV1({ ...args,
    prepared: { ...prepared, payload: prepared.payload + ' ' } }), { code: 'FACTION_PROPOSER_AUXILIARY_EVIDENCE_INVALID' }); checks++;
  const imported = await recoverFactionProposerAuxiliaryV1({ ...args, dsh });
  assert.deepEqual(imported.output, evidence.rejected.providerValue); checks++;
  let cached = null, imports = 0;
  const importRuntime = createFactionNativeProductionRuntimeV1({ input, executionPolicy,
    proposerBatchBinding: batchBinding, proposerAuxiliaryCapacityBinding: binding, proposerAuxiliaryImports: [evidence],
    store: { acquire(id, roleInput) { assert.equal(id, prepared.fullRoleId); assert.deepEqual(roleInput, prepared.roleInput);
      return cached ? { cached: true, artifact: cached } : { cached: false }; }, finish(_lease, value) { cached = value; return value; }, release() {} },
    runtime: { role: () => assert.fail('No legacy import') }, providerAdapter: { complete: () => assert.fail('No paid import') },
    dsh: { binding: dsh.binding, async run(call) { imports++; assert.equal((await call.callModel()).receiptHash, materialization.hash); return imported.loop; } } });
  assert.equal((await importRuntime.role(request)).hash, imported.hash); checks++;
  assert.equal((await importRuntime.role(request)).hash, imported.hash); checks++;
  assert.equal(imports, 1); checks++;
  const consumerArgs = { value: imported, roleInput: prepared.roleInput, request, input,
    recipe: { ...recipe, proposerAuxiliaryCapacityBinding: binding }, resolveTeachFailureEvidence: () => evidence };
  assert.deepEqual(verifyFactionStructuredRoleReplayV1(consumerArgs).providerReceiptHashes,
    [materialization.originalFailureReceiptHash]); checks++;
  assert.throws(() => verifyFactionStructuredRoleReplayV1({ ...consumerArgs, recipe }),
    { code: 'FACTION_PROPOSER_AUXILIARY_CONSUMER_BINDING_REQUIRED' }); checks++;
  const changedOutput = structuredClone(imported.output); changedOutput.plans[0].text += ' '; 
  assert.throws(() => verifyFactionStructuredRoleReplayV1({ ...consumerArgs, value: reseal(imported, { output: changedOutput }) })); checks++;
  if (name === 'proposer-plan-length-diagnosis') {
    assert.equal(imported.output.plans[0].text.length, 608); checks++;
    assert.throws(() => materializeFactionProposerAuxiliaryV1({ ...args, auxiliaryCapacityBinding: oldBinding }),
      { code: 'FACTION_PROPOSER_AUXILIARY_NOT_APPLICABLE' }); checks++;
    assert.throws(() => validateFactionProposerBatchOutputV1(imported.output,
      { ...outputArgs, auxiliaryCapacityBinding: oldBinding })); checks++;
    const { proposerBatch, outputRequestAtEnd, ...workspace } = request.workspace;
    const parent = { ...request, roleId: plan.parentRoleId, instruction: originalInstruction, maxOutput: originalMaxOutput, workspace };
    const batches = [...priorBatches, { indices: plan.batches[batchIndex], artifactHash: imported.hash, output: imported.output }];
    for (let n = batches.length; n < plan.batches.length; n++) {
      const child = factionProposerBatchRequestV1({ input, request: parent, plan, batchIndex: n, priorBatches: batches, auxiliaryCapacityBinding: binding });
      const native = prepareFactionNativeProductionRoleV1({ input, request: child, executionPolicy,
        proposerBatchBinding: batchBinding, proposerAuxiliaryCapacityBinding: binding });
      assert.deepEqual(JSON.parse(native.payload).workspace.proposerBatch.priorBatches[0].output, imported.output); checks++;
      batches.push({ indices: plan.batches[n], artifactHash: hash('injected-tail-' + n), output: {
        plans: plan.batches[n].map(index => ({ index, text: 'Injected propagation test, not strategy.', sourceRefs: plan.targets[index].requiredSourceRefs })), uncertainties: [] } });
    }
    const assembly = assembleFactionProposerBatchesV1({ input, plan, batches, auxiliaryCapacityBinding: binding });
    assert.ok(assembly.output.lesson[0].includes(imported.output.plans[0].text)); checks++;
    const produced = await produceFactionProposerBatchesV1({ input, request: parent, auxiliaryCapacityBinding: binding,
      role: async child => child.workspace.proposerBatch.batchIndex === 0 ? imported : seal({ roleId: child.packet.id + '.' + child.roleId,
        output: batches[child.workspace.proposerBatch.batchIndex].output }),
      store: { acquire: () => ({ cached: false }), finish: (_lease, value) => value } });
    assert.deepEqual(produced.value, assembly.output); checks++;
    currentFaults = await verifyFactionProposerAuxiliaryCurrentFaultsV1({ input, request, actualOutput: imported.output, executionPolicy, recipe, dsh, binding });
  }
  origins.push({ inputHash: input.hash, originRunId: diagnosis.originRunId, originAttemptId: diagnosis.originAttemptId,
    originalFailureReceiptHash: materialization.originalFailureReceiptHash, rejectedCandidateHash: evidence.rejected.hash,
    contextHash: prepared.contextManifestRef.hash, recoveredArtifactHash: imported.hash, materializationHash: materialization.hash,
    originalUsage: materialization.originalUsage, originalSettledMicros: materialization.originalSettledMicros });
}
// Real failed request, new native route, same complete workspace and items
// schema. Simulated output exercises plumbing only, not source/strategy truth.
const diagnosis = await read('native-target-reconstruction-diagnosis'), input = await read('terran_armed_forces-input');
const request = diagnosis.rebuildRequest, capacity = recipe.nativeOutputCapacityBinding;
assert.equal(factionNativeProductionKindV1(request.roleId), null); checks++;
assert.equal(factionNativeProductionKindV1(request.roleId, { targetReconstructionBinding: targetBinding }), 'items'); checks++;
const prepared = prepareFactionNativeProductionRoleV1({ input, request: applyFactionNativeOutputCapacityV2(request, capacity),
  executionPolicy: capacity.executionPolicy, outputCapacityBinding: capacity, proposerBatchBinding: batchBinding,
  proposerAuxiliaryCapacityBinding: binding, targetReconstructionBinding: targetBinding });
assert.deepEqual(JSON.parse(prepared.payload).workspace, request.workspace); checks++;
assert.deepEqual(JSON.parse(prepared.payload).fullFrozenSources, input.frozenSources.prompt); checks++;
assert.equal(prepared.outputContractRef.hash, outputContractRefStarcraftTmgV1(FACTION_NATIVE_PRODUCTION_CONTRACTS_V1.items).hash); checks++;
for (const change of [r => r.workspace.indices = [0, 1], r => r.workspace.completedRecommendations.pop(),
  r => r.workspace.outputRequestAtEnd.targets = [], r => r.workspace.outline[4].focus += ' drift',
  r => r.workspace.proposerAssemblyHash = hash('foreign'), r => r.roleId += '.schema']) {
  const wrong = structuredClone(request); change(wrong);
  assert.throws(() => prepareFactionNativeProductionRoleV1({ input, request: applyFactionNativeOutputCapacityV2(wrong, capacity),
    executionPolicy: capacity.executionPolicy, outputCapacityBinding: capacity, proposerBatchBinding: batchBinding,
    proposerAuxiliaryCapacityBinding: binding, targetReconstructionBinding: targetBinding })); checks++;
}
const db = new DatabaseSync('build/ticket-17-production-redesign-v1/production.sqlite', { readOnly: true });
let rejected;
try { const row = db.prepare('SELECT artifact FROM steps WHERE run=? AND id=?').get(diagnosis.originRunId,
  request.packet.id + '.' + diagnosis.request.roleId); rejected = verifySeal(verifySeal(JSON.parse(row.artifact)).value); } finally { db.close(); }
const output = { items: request.workspace.targetIssue.targets.map(t => ({ index: t.index, value: {
  title: 'Injected target route test ' + t.index, when: ['Injected condition'], procedure: ['Injected procedure'], alternatives: ['Injected alternative'],
  risk: 'Injected risk', reviseIf: ['Injected revision'], sourceRefs: t.requiredSourceRefs, unproven: ['Engineering fixture, not produced strategy.'] } })) };
const egressBinding = createStarcraftTmgProviderProfileRegistryV2({ entries: [{ providerProfile: profile, responsePath: '/responses' }] })
  .resolveEgressBinding({ profileRef: capacity.profileRef }).egressBinding;
const now = Date.now(), capability = createStarcraftTmgProviderCapabilityReceiptV1({ providerProfileRef: egressBinding.providerProfileRef,
  endpointPath: '/responses', endpointDialect: egressBinding.endpointDialect, model: egressBinding.model,
  capability: 'responses_json_schema', schemaSubsetVersion: STARCRAFT_TMG_JSON_SCHEMA_SUBSET_VERSION, outputContractRef: prepared.outputContractRef,
  probeInputHash: hash('INJECTED-target'), probeOutputHash: hash('INJECTED-target-output'), probeResult: 'accepted_schema_valid',
  usage: { inputUnits: 10, outputUnits: 10, totalUnits: 20 }, usageKnown: true, physicalAttempts: 1,
  probedAt: new Date(now).toISOString(), expiresAt: new Date(now + 3600000).toISOString() });
let targetDshSessions = 0;
for (const mode of ['success', 'invalid_json', 'incomplete', 'payment_required']) {
  const store = openProductionStore(':memory:', { runId: 'target-' + mode, recipeHash: hash(mode), maxCalls: 2, maxCostMicros: 5000000, maxTokens: 1500000 });
  const artifacts = new Map([[rejected.hash, rejected]]), responses = new Map();
  const journal = { ...store, finish(lease, value) { const r = store.finish(lease, value); artifacts.set(r.hash, r); return r; },
    settle(id, value) { const r = store.settle(id, value); if (value.response?.usageReceipt) responses.set(value.response.usageReceipt.receiptHash, { response: value.response }); return r; } };
  const step = mode === 'success' ? { kind: mode, output } : mode === 'payment_required' ? { kind: 'failed', status: 402 } : { kind: mode };
  const fault = createStarcraftTmgInMemoryStructuredFaultAdapterV1({ steps: [step] });
  const adapter = createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1({ send: async args => {
    const response = structuredClone(await fault.send(args));
    const { receiptHash: ignored, ...body } = response.transportReceipt;
    body.startedAt = new Date(now).toISOString();
    response.transportReceipt = { ...body, receiptHash: hash(body) }; return response;
  } });
  const runtime = createFactionNativeProductionRuntimeV1({ input, runtime: { role: () => assert.fail('No legacy target fallback') }, store: journal,
    dsh: mode === 'success' ? dsh : { run: runDirectLoop }, executionPolicy, proposerBatchBinding: batchBinding, proposerAuxiliaryCapacityBinding: binding,
    targetReconstructionBinding: targetBinding, priceUsage: u => u.totalUnits,
    outputCapacity: { binding: capacity, frozenRoleIds: recipe.nativeOutputCapacityFrozenRoleIds,
      providerAdapter: adapter, egressBinding, capabilities: { items: capability } } });
  try {
    if (mode === 'success') {
      const value = await runtime.role(request); targetDshSessions++;
      const args = { value, roleInput: prepared.roleInput, request, input,
        recipe: { ...recipe, proposerAuxiliaryCapacityBinding: binding, nativeTargetReconstructionBinding: targetBinding },
        resolveArtifact: h => artifacts.get(h), resolveResponse: h => responses.get(h), resolveCapabilityReceipt: () => capability };
      assert.equal(verifyFactionStructuredRoleReplayV1(args).providerReceiptHashes.length, 1); checks++;
      assert.equal((await runtime.role(request)).hash, value.hash); checks++;
      assert.throws(() => verifyFactionStructuredRoleReplayV1({ ...args, recipe })); checks++;
      assert.throws(() => verifyFactionStructuredRoleReplayV1({ ...args, resolveArtifact: h => h === rejected.hash ? reseal(rejected, { output }) : artifacts.get(h) })); checks++;
    } else {
      await assert.rejects(runtime.role(request), mode === 'payment_required' ? { code: 'PROVIDER_PAYMENT_REQUIRED' } : undefined); checks++;
    }
    assert.equal(fault.inspect().calls.length, 1); checks++;
    assert.equal(store.summary().steps.filter(s => s.state === 'running').length, 0); checks++;
  } finally { store.close(); }
}
let preserved;
await createFactionNativeProductionRuntimeV1({ input, targetReconstructionBinding: targetBinding,
  legacyRoleIds: [request.packet.id + '.' + request.roleId], runtime: { role: r => { preserved = r; } } }).role(request);
assert.equal(preserved, request); checks++;
const files = ['packages/skill-production-v3/faction-proposer-auxiliary-capacity-v1.mjs',
  'packages/skill-production-v3/faction-proposer-auxiliary-recovery-v1.mjs', 'packages/skill-production-v3/faction-proposer-auxiliary-migration-v1.mjs',
  'packages/skill-production-v3/faction-proposer-batches-v1.mjs', 'packages/skill-production-v3/faction-native-target-reconstruction-v1.mjs',
  'packages/skill-production-v3/faction-native-production-runtime-v1.mjs', 'packages/skill-production-v3/faction-continuation-v1.mjs',
  'packages/skill-evaluation/faction-structured-replay-v1.mjs', 'packages/skill-evaluation/faction-replay-runtime-stack-v1.mjs',
  'scripts/run-ticket-18-faction-strategy-production-v1.mjs', 'scripts/verify-ticket-18-bounded-generation-v2.mjs',
  'scripts/support/faction-proposer-auxiliary-current-faults-v1.mjs',
  // Keep the old verifier dependencies declared, even though V2 has its own
  // readiness. Removing them would silently change the historical code set.
  'scripts/verify-ticket-18-proposer-auxiliary-boundary-v1.mjs', 'scripts/verify-ticket-18-faction-proposer-auxiliary-v1.mjs',
  'packages/skill-evaluation/faction-candidate-evidence-v1.mjs',
  'packages/skill-evaluation/faction-unique-cross-field-audit-v1.mjs', 'scripts/verify-ticket-18-unique-cross-field-v1.mjs',
  'scripts/run-ticket-18-faction-consumer-evaluation-v1.mjs'];
const semanticGuard = await read('unique-cross-field-readiness');
assert.equal(semanticGuard.passed, true); assert.equal(semanticGuard.productionApplied, false);
for (const row of semanticGuard.codeHashes) assert.equal(sha256(await readFile(row.file)), row.hash);
const report = seal({ passed: true, binding, targetBinding, checks: checks + currentFaults.checks + semanticGuard.checks,
  origins, currentFaults, semanticGuardHash: semanticGuard.hash, sourceBoundedCorrectionApplied: false,
  actualDshSessions: origins.length + currentFaults.actualDshSessions + targetDshSessions, providerCalls: 0,
  actualRequestRebuilt: true, consumerReplayPassed: true, fullContextPreserved: true, allUncertaintiesPreserved: true,
  allPlanningTextPreserved: true, subsequentBatchAndAssemblyTested: true, productionImportTested: true,
  strictSourceAndTargetChecksPreserved: true, oldProviderContractHash: planContract.contractHash,
  targetReconstruction: { originRunId: diagnosis.originRunId, originAttemptId: diagnosis.originAttemptId,
    originalFailureReceiptHash: diagnosis.originalFailureReceiptHash, diagnosisHash: diagnosis.hash,
    actualRequestRebuilt: true, nativeConsumerReplayPassed: true, legacySuccessFrozen: true, simulatedProviderOnly: true },
  semanticAcceptanceInherited: false, sourceRefreshPerformed: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
const next = { ...recipe, proposerAuxiliaryCapacityBinding: binding, nativeTargetReconstructionBinding: targetBinding,
  proposerAuxiliaryReadinessHash: report.hash, codeHashes: report.codeHashes };
const migrationArgs = { filename: 'build/ticket-17-production-redesign-v1/production.sqlite',
  parentRunId: 'faction-v1-9200d037cfa6a1c4a388', parent: recipe, next, readiness: report };
assert.equal(validateFactionProposerAuxiliaryMigrationV1(migrationArgs).bindingHash, binding.hash);
for (const change of [n => delete n.nativeTargetReconstructionBinding, n => n.proposerAuxiliaryReadinessHash = hash('foreign'),
  n => n.codeHashes = [], n => n.proposerBatchBinding = { hash: hash('foreign') }]) {
  const wrong = structuredClone(next); change(wrong);
  assert.throws(() => validateFactionProposerAuxiliaryMigrationV1({ ...migrationArgs, next: wrong }));
}
assert.throws(() => validateFactionProposerAuxiliaryMigrationV1({ ...migrationArgs, parentRunId: 'faction-v1-c96a15b1a09894a777f7' }));
await writeFile(base + 'bounded-generation-readiness-v2.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks: report.checks, actualDshSessions: report.actualDshSessions, providerCalls: 0, hash: report.hash }));
