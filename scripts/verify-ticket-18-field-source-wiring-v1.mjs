import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, mkdir } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { seal, verifySeal, hash, sha256 } from '../packages/skill-production/common.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { withProductionExecutionPolicyV1 } from '../packages/skill-production/execution-policy-v1.mjs';
import { prepareDshLoop } from '../packages/skill-production/loops.mjs';
import { loadFactionFieldSourceActualFixtureV1 } from './support/faction-field-source-actual-fixture-v1.mjs';
import { FACTION_FIELD_VALUE_SOURCE_HANDOFF_BINDING_V1 as binding, readFactionFieldValueSourceHandoffV1 } from '../packages/skill-production-v3/faction-field-value-source-handoff-v1.mjs';
import { FACTION_FIELD_SOURCE_FILES_V1 as files, factionFieldSourceRecipeV1, validateFactionFieldSourceMigrationV1,
  createFactionFieldSourceReaderV1, withFactionFieldSourceCompletionV1, completeFactionFieldSourceContextV1 } from '../packages/skill-production-v3/faction-field-source-integration-v1.mjs';
import { createFactionFieldRecoveryLaneV1 } from '../packages/skill-production-v3/faction-field-recovery-lane-v1.mjs';
import { createFactionStructuredReviewRuntimeV1 } from '../packages/skill-production-v3/faction-structured-review-runtime-v1.mjs';
import { createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1 } from '../packages/structured-generation/adapters/deepseek-responses-json-schema-v1.mjs';
import { createStarcraftTmgInMemoryStructuredFaultAdapterV1 } from '../packages/structured-generation/adapters/in-memory-fault-injection-v1.mjs';
import { factionExecutionEgressV1, factionExecutionProfileV1 } from '../packages/skill-production-v3/faction-execution-model-v1.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V6 as contract } from '../content/skill-generation/ticket-18-faction-review-output-contract-v6.mjs';
import { FACTION_FIELD_VALUE_BINDING_V1 } from '../packages/skill-production-v3/faction-field-value-runtime-v1.mjs';
import { openFactionProductionReplayV1 } from '../packages/skill-evaluation/faction-production-replay-v1.mjs';
import { loadFactionStructuredReplayDependenciesV1, createFactionReplayRuntimeStackV1 } from '../packages/skill-evaluation/faction-replay-runtime-stack-v1.mjs';

const cli = process.argv.slice(2);
assert(cli.length === 0 || cli.length === 1 && cli[0] === '--dsh');
const actual = await loadFactionFieldSourceActualFixtureV1(), base = 'build/ticket-18-faction-production-v1/';
const { input, prepared, request, originalEvidence, ancestors, recipe: parent } = actual;
const handoff = readFactionFieldValueSourceHandoffV1(actual);
const decode = raw => verifySeal(JSON.parse(raw)).value;
const reseal = (value, patch) => { const { hash: ignored, ...body } = value; return seal({ ...body, ...patch }); };
let checks = 0;
const eq = (a, b) => { assert.deepEqual(a, b); checks++; };
const deny = () => assert.fail('Original field request or unrelated egress is forbidden');
const source = new DatabaseSync(actual.filename, { readOnly: true });
const originalHash = hash(source.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(actual.runId, originalEvidence.attempt.id));
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) })));
const reportBody = { version: 'faction_field_source_wiring_readiness_v1', bindingHash: binding.hash,
  passed: true, actualFieldFailureReconstructed: true, fullColdConsumerPassed: true, restartNoFieldResendPassed: true,
  freshSourceReviewPassed: true, actualDshSessions: 1, dshInjectionUsed: false,
  providerCalls: 0, semanticAcceptance: false, runtimeAccepted: false, trainingTruth: false, codeHashes };
const provisional = seal(reportBody), fields = factionFieldSourceRecipeV1(provisional);
const next = reseal(parent, { ...fields, codeHashes: [...parent.codeHashes.filter(r => !files.includes(r.file)), ...codeHashes] });
eq(validateFactionFieldSourceMigrationV1({ parent, next, readiness: provisional }).accountingReset, false);
const directory = await mkdtemp(base + 'field-source-wiring-'), filename = directory + '/journal.sqlite';
const recipe = reseal(next, {
  fieldRecoveryOrigins: [{ runId: actual.runId, attemptId: originalEvidence.attempt.id, rejectedCandidateHash: originalEvidence.rejected.hash }],
  continuation: seal({ parentRunId: actual.runId, parentRecipeHash: parent.hash, reusable: [] }),
  injectionTest: { directory, purpose: 'actual field-value source gap through full production consumer' } });
const runId = 'faction-v1-' + recipe.hash.slice(0, 20);
await mkdir(base + runId);
await writeFile(base + runId + '/recipe.json', JSON.stringify(recipe, null, 2), { flag: 'wx' });
const options = { runId, recipeHash: recipe.hash, maxCalls: 4, maxTokens: 2000000, maxCostMicros: 4000000 };
let journal = openProductionStore(filename, options), store = withProductionExecutionPolicyV1(journal, recipe.executionPolicyBinding);
const fixture = new DatabaseSync(filename);
for (const p of ancestors) {
  const row = source.prepare('SELECT * FROM runs WHERE id=?').get('faction-v1-' + p.hash.slice(0, 20));
  if (row) fixture.prepare('INSERT INTO runs VALUES(?,?,?,?,?)').run(row.id, row.recipe, row.cap, row.calls, row.token_cap);
}
const attemptIds = new Set([originalEvidence.attempt.id, ...actual.records.map(r => r.choice.request.requestId)]);
const capabilities = new Set([originalEvidence.capability.receiptHash, ...actual.records.map(r => r.choice.capability.receiptHash)]);
const caps = verifySeal(JSON.parse(await readFile(base + actual.runId + '/active-capabilities.json', 'utf8')));
capabilities.add(caps.slotReview.receiptHash);
const copyAttempt = row => {
  fixture.prepare('INSERT INTO attempts VALUES(?,?,?,?,?,?,?,?,?,?)').run(row.run, row.id, row.request_hash,
    row.state, row.reserve, row.settled, row.usage, row.response, row.code, row.token_reserve);
};
for (const id of attemptIds) {
  const rows = source.prepare('SELECT * FROM attempts WHERE id=?').all(id); eq(rows.length, 1); copyAttempt(rows[0]);
  for (const row of source.prepare("SELECT * FROM steps WHERE run=? AND state='complete' AND id LIKE ?").all(rows[0].run, id + '.%'))
    fixture.prepare('INSERT INTO steps VALUES(?,?,?,?,?,?,?,?)').run(row.run, row.id, row.input_hash, row.generation, row.owner, row.expires, row.state, row.artifact);
}
for (const id of capabilities) {
  const rows = source.prepare("SELECT * FROM attempts WHERE state='received' AND json_extract(response,'$.value.capabilityReceipt.receiptHash')=?").all(id);
  eq(rows.length, 1); copyAttempt(rows[0]);
}
const controlId = 'faction-field-control-' + handoff.familyHash.slice(0, 32);
const control = source.prepare('SELECT * FROM runs WHERE id=?').get(controlId);
fixture.prepare('INSERT INTO runs VALUES(?,?,?,?,?)').run(control.id, control.recipe, control.cap, control.calls, control.token_cap);
for (const row of source.prepare("SELECT * FROM steps WHERE run=? AND state='complete'").all(controlId))
  fixture.prepare('INSERT INTO steps VALUES(?,?,?,?,?,?,?,?)').run(row.run, row.id, row.input_hash, row.generation, row.owner, row.expires, row.state, row.artifact);
fixture.close();
const output = structuredClone(handoff.completion.value);
output.verdicts[0].verdict = 'uncertain';
output.verdicts[0].reason = 'Injected fresh source-review objection, not a real strategy judgment. Supply Depot evidence does not grant Zerg roster permission.';
const fault = createStarcraftTmgInMemoryStructuredFaultAdapterV1({ steps: [{ kind: 'success', output }] });
let calls = 0, dshCalls = 0, fieldCalls = 0;
const adapter = createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1({ send: async q => {
  calls++; assert(!attemptIds.has(q.requestId));
  const c = JSON.parse(q.body.input), local = c.orderedBlocks.find(b => b.kind === 'volatile_local_issue').value;
  eq(local.sourceContextExpansion.expandedSources.map(r => r.ref), handoff.expandedSourceRefs);
  const result = await fault.send(q), { receiptHash: ignored, ...body } = result.transportReceipt;
  const timed = { ...body, startedAt: new Date().toISOString() };
  return { ...result, transportReceipt: { ...timed, receiptHash: hash(timed) } };
} });
const oldLoop = actual.records[0].loop;
const native = cli.includes('--dsh') ? await prepareDshLoop(process.cwd(), { sessionPolicy: 'phased-v1' }) : {
  binding: oldLoop.runtimeBinding, async run(q) { const r = await q.callModel(); return seal({
    runtimeBinding: this.binding, sandboxReceipt: { injected: true }, lifecycle: oldLoop.lifecycle, deadline: oldLoop.deadline,
    calls: 1, directNetworkUsed: false, trainingTruth: false, final: r.command.content, toolTrace: [],
    transcript: [{ call: 1, receiptHash: r.receiptHash, commandHash: sha256(JSON.stringify(r.command)) }] }); } };
const dsh = { ...native, async run(q) { dshCalls++; return native.run(q); } };
const egressBinding = factionExecutionEgressV1(factionExecutionProfileV1({ binding: recipe.executionModelBinding }));
const factory = () => {
  const readHandoff = createFactionFieldSourceReaderV1({ filename, recipe, ancestors, runId, input, allowCurrentRunning: true });
  const completeFieldValues = withFactionFieldSourceCompletionV1({
    baseCompleter: () => { fieldCalls++; return deny(); }, readHandoff,
    completeSourceContext: (p, h) => completeFactionFieldSourceContextV1({ prepared: p, handoff: h, readHandoff, runtimeOptions }) });
  const runtimeOptions = { input, store, dsh, providerAdapter: adapter, egressBinding,
    capabilityReceipt: caps.slotReview, outputContract: contract, executionPolicy: FACTION_FIELD_VALUE_BINDING_V1.executionPolicy,
    priceUsage: u => u.totalUnits, runtime: { role: deny }, includeSharedScenarioSources: true,
    reviewSlotNamespaceBinding: recipe.reviewSlotNamespaceBinding, reviewSourceExpansionBinding: recipe.reviewSourceExpansionBinding,
    fieldValueBinding: recipe.fieldValueBinding, completeFieldValues };
  const nativeRuntime = createFactionStructuredReviewRuntimeV1(runtimeOptions);
  return createFactionFieldRecoveryLaneV1({ filename, recipe, ancestors, runId, input, store, dsh,
    executionPolicy: FACTION_FIELD_VALUE_BINDING_V1.executionPolicy, completeFieldValues, runtime: nativeRuntime });
};
let value;
try {
  value = await factory().role(request);
  eq(value.sourceContextExpansion.trigger.fieldValueSourceHandoff.hash, handoff.hash);
  eq(value.output.verdicts[0].verdict, 'uncertain'); eq(calls, 1); eq(fieldCalls, 0);
} finally { journal.close(); }
journal = openProductionStore(filename, options); store = withProductionExecutionPolicyV1(journal, recipe.executionPolicyBinding);
try { eq((await factory().role(request)).hash, value.hash); eq(calls, 1); eq(dshCalls, 1); }
finally { journal.close(); }
const replayArgs = { filename, runId, recipe, ancestors, input };
const replay = openFactionProductionReplayV1(replayArgs); let replayEvidence;
try {
  const dependencies = await loadFactionStructuredReplayDependenciesV1({ root: process.cwd(), recipe });
  const stack = await createFactionReplayRuntimeStackV1({ root: process.cwd(), runId, recipe, input, replay, runtime: { role: deny }, dependencies });
  eq((await stack.runtime.role(request)).hash, value.hash);
  replayEvidence = replay.evidence(); eq(replayEvidence.actualProviderReceiptHashes.length, 3); eq(replayEvidence.newProviderCalls, 0);
} finally { replay.close(); }
const tamper = new DatabaseSync(filename), originalRole = tamper.prepare('SELECT artifact FROM steps WHERE run=? AND id=?').get(runId, prepared.fullRoleId);
for (const patch of [{ semanticAcceptance: true }, { sourceContextExpansion: reseal(value.sourceContextExpansion,
  { trigger: { ...value.sourceContextExpansion.trigger, fieldValueSourceHandoff: reseal(handoff, { providerReceiptHashes: [] }) } }) }]) {
  tamper.prepare('UPDATE steps SET artifact=? WHERE run=? AND id=?').run(JSON.stringify(seal({ value: reseal(value, patch) })), runId, prepared.fullRoleId);
  const r = openFactionProductionReplayV1(replayArgs);
  try { r.bindRoleRequest(request); assert.throws(() => r.store.acquire(prepared.fullRoleId, prepared.roleInput)); checks++; }
  finally { r.close(); }
}
tamper.prepare('UPDATE steps SET artifact=? WHERE run=? AND id=?').run(originalRole.artifact, runId, prepared.fullRoleId);
tamper.close();
eq(hash(source.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(actual.runId, originalEvidence.attempt.id)), originalHash);
source.close();
const main = await readFile('scripts/run-ticket-18-faction-strategy-production-v1.mjs', 'utf8');
for (const s of ['...fieldSourceRecipe', 'fieldSource: fieldSourceReadiness', 'withFactionFieldSourceCompletionV1',
  'stopForSourceContext: true', 'completeFactionFieldSourceContextV1']) { assert(main.includes(s)); checks++; }
const report = seal({ ...reportBody, checks, directory, actualRunId: actual.runId, actualHandoffHash: handoff.hash,
  freshRoleHash: value.hash, replayEvidence, injectedProviderCalls: calls, additionalFieldCalls: fieldCalls,
  actualDshSessions: cli.includes('--dsh') ? dshCalls : 0, dshInjectionUsed: !cli.includes('--dsh'), productionPreflightPassed: false });
await writeFile(base + (cli.includes('--dsh') ? 'field-source-readiness-v1' : 'field-source-wiring-fixture-v1') + '.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, hash: report.hash, providerCalls: 0, injectedProviderCalls: calls,
  actualDshSessions: report.actualDshSessions, additionalFieldCalls: fieldCalls, productionPreflightPassed: false }));
