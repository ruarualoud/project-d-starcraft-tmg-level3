import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { createFactionWritingPlanV1, createFactionReviewBatchPlanV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { createFactionReviewTargetsV1 } from '../packages/skill-production-v3/faction-review-targets-v1.mjs';
import { prepareFactionSlotReviewRoleV1 } from '../packages/skill-production-v3/faction-slot-review-runtime-v1.mjs';
import { createFactionStructuralReviewRuntimeV1 } from '../packages/skill-production-v3/faction-structural-json-runtime-v1.mjs';
import { createFactionStructuralReviewLaneV1 } from '../packages/skill-production-v3/faction-structural-json-lane-v1.mjs';
import { FACTION_PARSED_WIRE_FILES_V2 as files, factionParsedWireRecipeV2, validateFactionParsedWireMigrationV2 }
  from '../packages/skill-production-v3/faction-parsed-wire-scope-v2.mjs';
import { FACTION_STRUCTURAL_JSON_SCHEMA_BRIDGE_BINDING_V2 as binding } from '../packages/skill-production-v3/faction-structural-json-schema-bridge-v2.mjs';

const base = 'build/ticket-18-faction-production-v1/', filename = 'build/ticket-17-production-redesign-v1/production.sqlite';
const json = async file => verifySeal(JSON.parse(await readFile(base + file + '.json', 'utf8')));
const decode = raw => verifySeal(JSON.parse(raw)).value;
const source = new DatabaseSync(filename, { readOnly: true });
const ledgerHash = () => hash(source.prepare('SELECT * FROM attempts ORDER BY run,id').all());
const before = ledgerHash();
assert.equal(source.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n, 0);
const runtime = await json('parsed-wire-dsh-runtime-v2'), component = await json('structural-json-schema-bridge-component-v2');
assert(runtime.passed && runtime.actualDshSessions > 0 && runtime.providerCalls === 0);
assert(component.passed && component.providerCalls === 0 && runtime.actualPaidOriginProofHash === component.authenticatedProof.hash);
for (const row of [...runtime.codeHashes, ...component.codeHashes]) assert.equal(sha256(await readFile(row.file)), row.hash, row.file);
for (const mode of ['normal', 'restart_after_paid_response']) assert(runtime.results.find(r => r.mode === mode)?.independentColdConsumerPassed);
for (const mode of ['changed_citation', 'schema_again', 'payment_required']) assert(runtime.results.find(r => r.mode === mode)?.noRepeatSend);
assert(runtime.results.find(r => r.mode === 'disabled')?.rejected);
const parentRunId = component.origin.runId, parent = await json(parentRunId + '/recipe'), input = await json(parentRunId + '/zerg_swarm-input');
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) })));
const provisional = seal({ version: 'faction_parsed_wire_wiring_readiness_v2', passed: true, bindingHash: binding.hash,
  runtimeDshProofHash: runtime.hash, componentProofHash: component.hash,
  actualPaidOriginAuthenticated: true, coldConsumerPassed: true, paidResponseRestartPassed: true,
  negativeBindingsPassed: true, dryAndLiveFactoryPassed: true,
  providerCalls: 0, actualDshSessions: 0, referencedActualDshSessions: runtime.actualDshSessions, codeHashes });
const reseal = (value, patch = {}) => { const { hash: ignored, ...body } = value; return seal({ ...body, ...patch }); };
const fields = factionParsedWireRecipeV2(provisional);
let checks = 0;
const eq = (a, b) => { assert.deepEqual(a, b); checks++; };
const next = reseal(parent, { ...fields, codeHashes: [...parent.codeHashes.filter(r => !files.includes(r.file)), ...codeHashes] });
eq(validateFactionParsedWireMigrationV2({ parent, next, readiness: provisional }).accountingReset, false);
eq(validateFactionParsedWireMigrationV2({ parent, next, readiness: provisional }).originalAttemptsCopied, 0);
for (const key of ['bindingHash', 'runtimeDshProofHash', 'passed', 'coldConsumerPassed', 'actualPaidOriginAuthenticated',
  'paidResponseRestartPassed', 'negativeBindingsPassed', 'dryAndLiveFactoryPassed', 'providerCalls', 'codeHashes']) {
  const changed = key === 'codeHashes' ? codeHashes.slice(1) : key === 'providerCalls' ? 1 : false;
  assert.throws(() => factionParsedWireRecipeV2(reseal(provisional, { [key]: changed }))); checks++;
}
for (const patch of [{ sourceBinding: {} }, { limits: {} }, { modelHash: hash('wrong') },
  { contextHash: hash('wrong') }, { dshBindingHash: hash('wrong') }, { executionModelBinding: null },
  { parsedWireSchemaBridgeReadinessHash: hash('wrong') }, { parsedWireSchemaBridgeBinding: null },
  { codeHashes: next.codeHashes.filter(r => r.file !== files[0]) }]) {
  assert.throws(() => validateFactionParsedWireMigrationV2({ parent, next: reseal(next, patch), readiness: provisional })); checks++;
}
const fixtureDb = runtime.directory + '/normal.sqlite';
const fixture = new DatabaseSync(fixtureDb, { readOnly: true });
try {
  const row = fixture.prepare("SELECT * FROM steps WHERE state='complete' AND json_extract(artifact,'$.value.parsedWireRecoveries') IS NOT NULL").get();
  assert(row); const value = decode(row.artifact), runId = row.run;
  const origins = [...parent.structuralJsonReviewOrigins, component.origin]
    .sort((a, b) => (a.runId + '/' + a.attemptId).localeCompare(b.runId + '/' + b.attemptId));
  const recipe = reseal(parent, { parsedWireSchemaBridgeBinding: binding, structuralJsonReviewOrigins: origins,
    executionPolicyBinding: null, continuation: seal({ parentRunId, parentRecipeHash: parent.hash, reusable: [] }),
    dshBindingHash: value.loop.runtimeBinding.hash, injectionTest: { mode: 'normal', directory: runtime.directory, realDsh: true } });
  eq(runId, 'faction-v1-' + recipe.hash.slice(0, 20));
  const draft = decode(source.prepare('SELECT artifact FROM steps WHERE run=? AND id=?')
    .get(parentRunId, 'faction.zerg_swarm.unit_roles.2.known-rule-correction').artifact).draft;
  const section = createFactionWritingPlanV1(input).sections.find(s => s.id === 'faction.zerg_swarm.unit_roles.2');
  const batch = createFactionReviewBatchPlanV1({ section, draft }).batches.find(b => b.first === 6);
  const targets = createFactionReviewTargetsV1({ input, section, draft, indices: batch.reviewIndices });
  const request = { packet: seal({ id: 'faction.zerg_swarm', inputHash: input.hash, sourceBinding: input.sourceBinding }),
    roleId: component.authenticatedProof.invocation.roleRef.id + '.source-evidence-v1.3cd990702ff2ba8b4acc',
    workspace: { inputHash: input.hash, section, draft, reviewIndices: batch.reviewIndices,
      coverageRequiredSourceRefs: batch.requiredSourceRefs, outputRequestAtEnd: { targetContract: targets } } };
  const executionPolicy = { maxOutputUnits: 4096, attemptEstimateMicros: 800000, attemptTokenReserve: 500000,
    allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false, idempotentRetrySupported: false, encryptedRawQuarantineAvailable: false };
  const prepared = prepareFactionSlotReviewRoleV1({ input, request, executionPolicy });
  const deny = () => assert.fail('No Provider, new DSH or delegated role allowed');
  const options = { root: process.cwd(), recipe, input, executionPolicy, dry: true, runtime: { role: deny } };
  const store = openProductionStore(fixtureDb, { runId, recipeHash: recipe.hash });
  try {
    const lane = createFactionStructuralReviewLaneV1({ ...options, filename: fixtureDb, runId, store });
    if (runtime.expiredOriginHistoricalRevalidation) {
      await assert.rejects(lane.role(request), { code: 'RAW_QUARANTINE_EXPIRED' }); checks++;
      await assert.rejects(createFactionStructuralReviewLaneV1({ ...options, filename: fixtureDb, runId, store,
        recipe: reseal(recipe, { parsedWireSchemaBridgeBinding: null }) }).role(request),
      { code: 'RAW_QUARANTINE_EXPIRED' }); checks++;
    } else {
      eq((await lane.role(request)).hash, value.hash);
      await assert.rejects(createFactionStructuralReviewLaneV1({ ...options, filename: fixtureDb, runId, store,
        recipe: reseal(recipe, { parsedWireSchemaBridgeBinding: null }) }).role(request),
      { code: 'STRUCTURAL_JSON_SYNTAX_UNSUPPORTED' }); checks++;
    }
  } finally { store.close(); }
  assert.throws(() => createFactionStructuralReviewRuntimeV1({ runtime: { role: deny }, input,
    store: {}, dsh: { binding: value.loop.runtimeBinding }, executionPolicy, selectedBinding: parent.structuralJsonReviewBinding,
    readOrigin: deny, authenticateOrigin: deny, parsedWireSchemaBridgeBinding: binding }),
  { code: 'FACTION_STRUCTURAL_JSON_REVIEW_PARSED_SCHEMA_BINDING_INVALID' }); checks++;
  // An uncached dry run proves preparation only and must stop before egress.
  const directory = await mkdtemp(base + 'parsed-wire-wiring-'), testDb = directory + '/uncached.sqlite';
  const uncachedStore = openProductionStore(testDb, { runId, recipeHash: recipe.hash });
  const copy = new DatabaseSync(testDb);
  for (const r of fixture.prepare('SELECT * FROM runs WHERE id<>?').all(runId))
    copy.prepare('INSERT INTO runs VALUES(?,?,?,?,?)').run(r.id, r.recipe, r.cap, r.calls, r.token_cap);
  for (const r of fixture.prepare('SELECT * FROM attempts WHERE run<>?').all(runId))
    copy.prepare('INSERT INTO attempts VALUES(?,?,?,?,?,?,?,?,?,?)')
      .run(r.run, r.id, r.request_hash, r.state, r.reserve, r.settled, r.usage, r.response, r.code, r.token_reserve);
  for (const r of fixture.prepare('SELECT * FROM steps WHERE run<>?').all(runId))
    copy.prepare('INSERT INTO steps VALUES(?,?,?,?,?,?,?,?)').run(r.run, r.id, r.input_hash, r.generation, r.owner, r.expires, r.state, r.artifact);
  copy.close(); let observed;
  try {
    const expected = runtime.expiredOriginHistoricalRevalidation
      ? { code: 'RAW_QUARANTINE_EXPIRED' }
      : { code: 'FACTION_PREFLIGHT_PARSED_WIRE_SCHEMA_CORRECTION_REQUIRED' };
    await assert.rejects(createFactionStructuralReviewLaneV1({ ...options, filename: testDb, runId, store: uncachedStore,
      onUncached: event => { observed = event; } }).role(request), expected); checks++;
    if (runtime.expiredOriginHistoricalRevalidation) eq(observed, undefined);
    else { eq(observed.contextHash, prepared.capsule.hash); eq(observed.preparationHash, component.preparation.hash); }
    eq(uncachedStore.summary().calls, 0);
  } finally { uncachedStore.close(); }
} finally { fixture.close(); }
const main = await readFile('scripts/run-ticket-18-faction-strategy-production-v1.mjs', 'utf8');
for (const text of ['...parsedWireRecipeFields', 'parsedWire: parsedWireReadiness',
  'parsedWireSchemaBridgeBinding: recipe.parsedWireSchemaBridgeBinding, readParsedWireRecovery',
  'await createFactionParsedWireRecoveryReaderV2({ root, filename, runId, recipe })',
  'parsedWireReadiness.runtimeDshProofHash !== parsedWireDshProof.hash',
  'FACTION_PREFLIGHT_PARSED_WIRE_SCHEMA_CORRECTION_REQUIRED']) { assert(main.includes(text), text); checks++; }
eq(ledgerHash(), before); source.close();
eq(await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))), codeHashes);
const report = seal({ ...Object.fromEntries(Object.entries(provisional).filter(([k]) => k !== 'hash')), checks,
  actualMigrationChecked: true, mainParametersBound: true, originalLedgerUnchanged: true,
  mainProductionPreflightPassed: false, semanticAcceptance: false, runtimeAccepted: false, trainingTruth: false });
await writeFile(base + 'parsed-wire-schema-readiness-v2.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, hash: report.hash, runtimeDshProofHash: runtime.hash, providerCalls: 0 }));
