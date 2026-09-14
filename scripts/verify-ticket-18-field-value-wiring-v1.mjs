import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, mkdir } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { prepareDshLoop } from '../packages/skill-production/loops.mjs';
import { withProductionExecutionPolicyV1 } from '../packages/skill-production/execution-policy-v1.mjs';
import { openFactionProductionReplayV1 } from '../packages/skill-evaluation/faction-production-replay-v1.mjs';
import { createFactionReplayRuntimeStackV1, loadFactionStructuredReplayDependenciesV1 } from '../packages/skill-evaluation/faction-replay-runtime-stack-v1.mjs';
import { createFactionFieldRecoveryLaneV1 } from '../packages/skill-production-v3/faction-field-recovery-lane-v1.mjs';
import { FACTION_FIELD_RECOVERY_BINDING_V3 as recoveryBinding } from '../packages/skill-production-v3/faction-field-recovery-v1.mjs';
import { FACTION_FIELD_VALUE_BINDING_V1 as binding, prepareFactionFieldValueFamilyV1 } from '../packages/skill-production-v3/faction-field-value-runtime-v1.mjs';
import { FACTION_FIELD_VALUE_FILES_V1 as files, factionFieldValueRecipeV1, assertFactionFieldValueRecipeV1,
  validateFactionFieldValueMigrationV1, createFactionFieldValueCompleterV1, createFactionFieldValueCapabilityResolverV1,
  factionFieldValueProbeSampleV1 } from '../packages/skill-production-v3/faction-field-value-integration-v1.mjs';
import { readFactionFieldRecoveryEvidenceV1 } from '../packages/skill-production-v3/faction-field-recovery-scope-v1.mjs';
import { createFactionStructuredReviewRuntimeV1 } from '../packages/skill-production-v3/faction-structured-review-runtime-v1.mjs';
import { createFactionPriorReviewAttemptReaderV1 } from '../packages/skill-production-v3/faction-review-source-expansion-scope-v1.mjs';
import { validateFactionProductionTargetReviewV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { factionExecutionProfileV1, factionExecutionEgressV1 } from '../packages/skill-production-v3/faction-execution-model-v1.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V6 as reviewContract } from '../content/skill-generation/ticket-18-faction-review-output-contract-v6.mjs';
import { createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1 } from '../packages/structured-generation/adapters/deepseek-responses-json-schema-v1.mjs';
import { createStarcraftTmgInMemoryStructuredFaultAdapterV1 } from '../packages/structured-generation/adapters/in-memory-fault-injection-v1.mjs';

const args = process.argv.slice(2);
assert(args.length === 0 || args.length === 1 && args[0] === '--dsh');
const root = process.cwd(), base = 'build/ticket-18-faction-production-v1/';
const filename = 'build/ticket-17-production-redesign-v1/production.sqlite';
const json = async name => verifySeal(JSON.parse(await readFile(base + name + '.json', 'utf8')));
const component = await json('field-value-runtime-v1'), originalProof = await json('field-recovery-runtime-v1');
assert(component.passed && component.checks >= 141 && component.providerCalls === 0);
for (const row of [...component.codeHashes, ...originalProof.codeHashes]) assert.equal(sha256(await readFile(row.file)), row.hash, row.file);
const origin = originalProof.originalPaidEvidenceRefs[0], prepared = originalProof.prepared;
const parentRunId = origin.ownerRunId, parent = await json(parentRunId + '/recipe');
const input = await json(parentRunId + '/zerg_swarm-input'), caps = await json(parentRunId + '/active-capabilities');
const decode = raw => verifySeal(JSON.parse(raw)).value;
const reseal = (value, patch) => { const { hash: ignored, ...body } = value; return seal({ ...body, ...patch }); };
let checks = 0;
const eq = (a, b) => { assert.deepEqual(a, b); checks++; };
const throws = (fn, code) => { assert.throws(fn, code ? { code } : undefined); checks++; };
const source = new DatabaseSync(filename, { readOnly: true });
const originalRow = source.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(origin.ownerRunId, origin.attemptId);
eq(hash(originalRow), origin.originalRowHash);
eq(source.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n, 0);
const ancestors = [], ownerRows = [];
let cursor = parentRunId;
while (cursor) {
  const recipe = await json(cursor + '/recipe');
  eq(cursor, 'faction-v1-' + recipe.hash.slice(0, 20));
  ancestors.push(recipe);
  const row = source.prepare('SELECT * FROM runs WHERE id=?').get(cursor);
  if (row) ownerRows.push(row);
  cursor = recipe.continuation?.parentRunId;
}
const lineage = seal({ parentRunId, recipes: ancestors.map(r => ({ runId: 'faction-v1-' + r.hash.slice(0, 20), recipeHash: r.hash })) });
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) })));
const body = { version: 'faction_field_value_wiring_readiness_v1', passed: true,
  bindingHash: binding.hash, componentProofHash: component.hash, authenticatedDshProofHash: originalProof.hash,
  fullReplayConsumerPassed: true, dryAndLiveFactoryPassed: true, actualProviderAdapterBoundaryPassed: true,
  actualDshSessions: 3, dshInjectionUsed: false,
  productionMainPreflightPassed: false, providerCalls: 0, semanticAcceptance: false, runtimeAccepted: false, trainingTruth: false, codeHashes };
const provisional = seal(body);
const fields = { fieldRecoveryBinding: recoveryBinding, fieldRecoveryReadinessHash: hash('isolated-original-only-field-fixture'),
  fieldRecoveryOrigins: [{ runId: origin.ownerRunId, attemptId: origin.attemptId, rejectedCandidateHash: origin.rejectedCandidateHash }],
  ...factionFieldValueRecipeV1(provisional) };
const next = reseal(parent, { ...fields, codeHashes: [...parent.codeHashes.filter(r => !files.includes(r.file)), ...codeHashes] });
eq(assertFactionFieldValueRecipeV1(parent), false);
eq(validateFactionFieldValueMigrationV1({ parent, next, readiness: provisional }).accountingReset, false);
for (const patch of [{ fieldValueBinding: null }, { fieldValueReadinessHash: hash('wrong') }, { inputHashes: [] }, { limits: {} }])
  throws(() => validateFactionFieldValueMigrationV1({ parent, next: reseal(next, patch), readiness: provisional }));
const directory = await mkdtemp(base + 'field-value-wiring-'), testFile = directory + '/journal.sqlite';
const recipe = reseal(next, { continuation: seal({ parentRunId, parentRecipeHash: parent.hash, reusable: [] }),
  injectionTest: { directory, missingOldRepairInIsolatedFixture: true, purpose: 'field-values-through-formal-runtime-and-cold-consumer' } });
const runId = 'faction-v1-' + recipe.hash.slice(0, 20);
await mkdir(base + runId);
await writeFile(base + runId + '/recipe.json', JSON.stringify(recipe, null, 2), { flag: 'wx' });
let journal = openProductionStore(testFile, { runId, recipeHash: recipe.hash, maxCalls: 10, maxTokens: 3000000 });
let store = withProductionExecutionPolicyV1(journal, recipe.executionPolicyBinding);
const fixture = new DatabaseSync(testFile);
for (const row of ownerRows) fixture.prepare('INSERT INTO runs VALUES(?,?,?,?,?)').run(row.id, row.recipe, row.cap, row.calls, row.token_cap);
const originalCap = source.prepare("SELECT * FROM attempts WHERE state='received' AND json_extract(response,'$.value.capabilityReceipt.receiptHash')=?")
  .all(origin.capabilityReceiptHash);
eq(originalCap.length, 1);
for (const row of [originalRow, ...originalCap]) fixture.prepare('INSERT INTO attempts VALUES(?,?,?,?,?,?,?,?,?,?)')
  .run(row.run, row.id, row.request_hash, row.state, row.reserve, row.settled, row.usage, row.response, row.code, row.token_reserve);
for (const suffix of ['.issue', '.rejected-candidate', '.runtime-receipt']) {
  const row = source.prepare('SELECT * FROM steps WHERE run=? AND id=?').get(origin.ownerRunId, origin.attemptId + suffix);
  fixture.prepare('INSERT INTO steps VALUES(?,?,?,?,?,?,?,?)').run(row.run, row.id, row.input_hash, row.generation, row.owner, row.expires, row.state, row.artifact);
}
fixture.close();
const evidence = readFactionFieldRecoveryEvidenceV1({ filename: testFile, recipe, ancestors, prepared, currentRunId: runId });
eq(evidence.repairEvidence, null);
const { task } = prepareFactionFieldValueFamilyV1({ input, prepared, originalEvidence: evidence.originalEvidence });
const sample = factionFieldValueProbeSampleV1(task.contract), good = { field0: originalProof.value.materialization.completion.value.coverage };
const packet = seal({ id: 'faction.zerg_swarm', inputHash: input.hash, sourceBinding: input.sourceBinding });
const m = prepared.mapping;
const request = { packet, roleId: prepared.fullRoleId.slice(packet.id.length + 1), workspace: { inputHash: input.hash,
  section: m.section, draft: m.draft, reviewIndices: m.reviewIndices, coverageRequiredSourceRefs: m.requiredSourceRefs,
  outputRequestAtEnd: { targetContract: m.targets } } };
const executionPolicy = binding.executionPolicy;
let calls = 0, probes = 0, dshCalls = 0, fallbackCalls = 0;
const requests = [], egressBinding = factionExecutionEgressV1(factionExecutionProfileV1({ binding: recipe.executionModelBinding }));
const fault = createStarcraftTmgInMemoryStructuredFaultAdapterV1({ steps: [
  { kind: 'success', output: sample }, { kind: 'success', output: { field0: 'invalid array type' } }, { kind: 'success', output: good } ] });
const adapter = createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1({ maxProbeOutputUnits: 512, send: async q => {
  calls++; requests.push(q.body); if (q.body.input === JSON.stringify(sample)) probes++;
  return fault.send(q);
} });
const deny = () => assert.fail('unrequested egress or original-request resend forbidden');
const native = args.includes('--dsh') ? await prepareDshLoop(root, { sessionPolicy: 'phased-v1' }) : {
  binding: originalProof.value.loop.runtimeBinding, async run(q) {
    const r = await q.callModel();
    return seal({ runtimeBinding: this.binding, sandboxReceipt: { injected: true }, calls: 1, directNetworkUsed: false,
      lifecycle: originalProof.value.loop.lifecycle, deadline: originalProof.value.loop.deadline, lifecycleFixtureCopied: true,
      trainingTruth: false, final: r.command.content, toolTrace: [],
      transcript: [{ call: 1, receiptHash: r.receiptHash, commandHash: sha256(JSON.stringify(r.command)) }] });
  } };
const dsh = { ...native, async run(q) { dshCalls++; return native.run(q); } };
eq(dsh.binding.hash, recipe.dshBindingHash);
const capabilityArgs = { filename: testFile, allowedRunIds: [runId, ...lineage.recipes.map(r => r.runId)], store, adapter,
  egressBinding, seedCapability: caps.slotReview, priceUsage: u => u.totalUnits };
const ensureCapability = createFactionFieldValueCapabilityResolverV1(capabilityArgs);
// Same contract/probe is coalesced, and a fresh resolver reuses its actual paid row.
const [cap1, cap2] = await Promise.all([ensureCapability(task.contract), ensureCapability(task.contract)]);
eq(cap1.receiptHash, cap2.receiptHash); eq(probes, 1);
eq((await createFactionFieldValueCapabilityResolverV1(capabilityArgs)(task.contract)).receiptHash, cap1.receiptHash); eq(probes, 1);
const completeFieldValues = createFactionFieldValueCompleterV1({ filename: testFile, recipe, ancestors, runId, input,
  store, dsh, providerAdapter: adapter, egressBinding, ensureCapability, priceUsage: u => u.totalUnits,
  onProgress: row => console.log(JSON.stringify({ stage: 'injected_field_value_round', ...row })) });
let dryRoute;
const laneArgs = { filename: testFile, runId, recipe, ancestors, input, store, dsh, executionPolicy, completeFieldValues,
  runtime: { role: async () => { fallbackCalls++; return 'delegated'; } }, onUncached: row => { dryRoute = row; } };
let value;
try {
  await assert.rejects(createFactionFieldRecoveryLaneV1({ ...laneArgs, dry: true }).role(request),
    { code: 'FACTION_PREFLIGHT_FIELD_VALUE_COMPLETION_REQUIRED' }); checks++;
  eq(dryRoute.route, 'authenticated_field_value_completion'); eq(calls, 1);
  // Enter from the real native review runtime as well, using actual frozen
  // original failure evidence. It must not dispatch .schema-repair.1.
  const readPriorReviewAttempt = await createFactionPriorReviewAttemptReaderV1({ root, filename: testFile, lineage });
  const nativeReview = createFactionStructuredReviewRuntimeV1({ input, runtime: { role: deny }, store, dsh,
    providerAdapter: adapter, egressBinding, capabilityReceipt: caps.slotReview, outputContract: reviewContract,
    executionPolicy, priceUsage: u => u.totalUnits, includeSharedScenarioSources: true,
    reviewSlotNamespaceBinding: recipe.reviewSlotNamespaceBinding, reviewSourceExpansionBinding: recipe.reviewSourceExpansionBinding,
    readPriorReviewAttempt, fieldValueBinding: recipe.fieldValueBinding, completeFieldValues });
  value = await nativeReview.role(request);
  eq(value.protocol, binding.version); eq(calls, 3); eq(probes, 1); eq(value.rounds.length, 2);
  eq(value.output, originalProof.value.output); eq(value.completion.value.verdicts, evidence.originalEvidence.rejected.providerValue.verdicts);
  validateFactionProductionTargetReviewV1(value.output, { ...m, artifact: value, reviewSlotNamespaceBinding: recipe.reviewSlotNamespaceBinding }); checks++;
  for (const q of requests.slice(1)) {
    eq(Object.keys(q.text.format.schema.properties), ['field0']);
    eq(JSON.parse(q.input).orderedBlocks.slice(0, 3), JSON.parse(task.context.compiledInput).orderedBlocks.slice(0, 3));
  }
  eq((await createFactionFieldRecoveryLaneV1({ ...laneArgs, runtime: nativeReview }).role(request)).hash, value.hash);
  eq(calls, 3); eq(fallbackCalls, 0);
  console.log(JSON.stringify({ stage: 'formal_field_value_runtime_passed', checks, calls, actualDshSessions: args.includes('--dsh') ? dshCalls : 0 }));
} finally { journal.close(); }
const replayArgs = { filename: testFile, runId, recipe, ancestors, input };
const replay = openFactionProductionReplayV1(replayArgs);
let replayEvidence;
try {
  const dependencies = await loadFactionStructuredReplayDependenciesV1({ root, recipe });
  const stack = await createFactionReplayRuntimeStackV1({ root, runId, recipe, input, replay, runtime: { role: deny }, dependencies });
  eq((await stack.runtime.role(request)).hash, value.hash);
  replayEvidence = replay.evidence(); eq(replayEvidence.actualProviderReceiptHashes.length, 3); eq(replayEvidence.newProviderCalls, 0);
} finally { replay.close(); }
// Independent consumer must reject forged acceptance, missing real capability,
// edited paid values and foreign owners, even if the outer hashes are resealed.
const tamper = new DatabaseSync(testFile), canonicalRow = tamper.prepare('SELECT artifact FROM steps WHERE run=? AND id=?').get(runId, prepared.fullRoleId);
for (const patch of [{ semanticAcceptance: true }, { rounds: value.rounds.slice(1) }, { output: {} },
  { rounds: value.rounds.map((r, i) => i ? r : reseal(r, { choice: reseal(r.choice, { capability: { ...r.choice.capability, receiptHash: hash('fake') } }) })) }]) {
  tamper.prepare('UPDATE steps SET artifact=? WHERE run=? AND id=?')
    .run(JSON.stringify(reseal(verifySeal(JSON.parse(canonicalRow.artifact)), { value: reseal(value, patch) })), runId, prepared.fullRoleId);
  const r = openFactionProductionReplayV1(replayArgs);
  try { r.bindRoleRequest(request); throws(() => r.store.acquire(prepared.fullRoleId, prepared.roleInput)); }
  finally { r.close(); }
}
tamper.prepare('UPDATE steps SET artifact=? WHERE run=? AND id=?').run(canonicalRow.artifact, runId, prepared.fullRoleId);
tamper.close();
eq(hash(source.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(origin.ownerRunId, origin.attemptId)), hash(originalRow));
source.close();
const main = await readFile('scripts/run-ticket-18-faction-strategy-production-v1.mjs', 'utf8');
for (const text of ['...fieldValueRecipe', 'fieldValues: fieldValueReadiness', 'fieldValueBinding: recipe.fieldValueBinding, completeFieldValues',
  'executionPolicy: structuredReviewPolicy, completeFieldValues', 'pending: fieldCapabilityPending', "'FACTION_PREFLIGHT_FIELD_VALUE_COMPLETION_REQUIRED'"])
  { assert(main.includes(text), text); checks++; }
eq(calls, 3); eq(dshCalls, 3);
const report = seal({ ...body, checks, directory, replayEvidence, roleArtifactHash: value.hash,
  actualDshSessions: args.includes('--dsh') ? dshCalls : 0, dshInjectionUsed: !args.includes('--dsh'),
  injectedProviderCalls: calls, originalActualPaidAttemptPreserved: true, oldPaidRepairNotOverriddenInProduction: true });
await writeFile(base + (args.includes('--dsh') ? 'field-value-readiness-v1' : 'field-value-wiring-fixture-v1') + '.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, hash: report.hash, directory, injectedProviderCalls: calls,
  providerCalls: 0, actualDshSessions: report.actualDshSessions, productionMainPreflightPassed: false }));
