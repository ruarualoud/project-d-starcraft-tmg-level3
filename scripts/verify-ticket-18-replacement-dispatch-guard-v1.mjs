import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, sha256 } from '../packages/skill-production/common.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { openFactionReplacementDispatchGuardV1 } from '../packages/skill-production-v3/faction-replacement-dispatch-guard-v1.mjs';
// Explicitly reuse the component's REAL full-context request preparation;
// capabilities, subsequent sends and responses below remain injected fixtures.
import { actualPreparedRequests } from './verify-ticket-18-ambiguous-replacement-v1.mjs';

const base = 'build/ticket-18-faction-production-v1/';
const out = await mkdtemp(base + 'replacement-dispatch-');
const filename = out + '/fixture.sqlite';
const files = ['packages/skill-production-v3/faction-replacement-dispatch-guard-v1.mjs',
  'packages/skill-production/store.mjs', 'scripts/verify-ticket-18-replacement-dispatch-guard-v1.mjs'];
const snapshot = () => Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) })));
const codeHashes = await snapshot();
let checks = 0;
const eq = (a, b) => { assert.deepEqual(a, b); checks++; };
const rejects = (fn, code) => { assert.throws(fn, { code }); checks++; };
const prepared = actualPreparedRequests[0];
const makeStore = id => openProductionStore(filename, { runId: id, recipeHash: hash(id),
  maxCalls: 3, maxCostMicros: 3000000, maxTokens: 2000000 });
let first = makeStore('fixture-first-owner');
let second = makeStore('fixture-second-owner');
const args = { filename, prepared, store: first, allowedRunIds: [], authenticate: () => prepared };
let a = openFactionReplacementDispatchGuardV1(args);
let b = openFactionReplacementDispatchGuardV1({ ...args, store: second, allowedRunIds: ['fixture-first-owner'] });
const request = prepared.request;
const reserve = guard => guard.reserve(request.requestId, request, 800000, 500000);
const lockStore = openProductionStore(filename, { runId: a.controlRunId, recipeHash: prepared.grant.hash,
  maxCalls: 1, maxCostMicros: 1, maxTokens: 1 });
const lock = lockStore.acquire('dispatch-mutex', { grantHash: prepared.grant.hash }, 60000);
rejects(() => reserve(a), 'STEP_LEASE_BUSY');
eq(first.globalSummary().calls, 0);
lockStore.release(lock); lockStore.close();
rejects(() => a.reserve('wrong-request', request, 800000, 500000), 'FACTION_REPLACEMENT_DISPATCH_REQUEST_SCOPE');
rejects(() => a.reserve(request.requestId, { ...request, input: 'lost context' }, 800000, 500000), 'FACTION_REPLACEMENT_DISPATCH_REQUEST_SCOPE');
const reserved = reserve(a);
eq(reserved.cached, false);
eq(reserved.originRunId, 'fixture-first-owner');
eq(first.summary().calls, 1);
rejects(() => reserve(b), 'AMBIGUOUS_EGRESS_NO_RETRY');
eq(second.summary().calls, 0);
first.settle(request.requestId, { usage: { inputUnits: 10, outputUnits: 2, totalUnits: 12 }, costMicros: 1,
  response: { fixtureOnly: true, output: { verdict: 'uncertain' } } });
const paid = first.globalSummary();
const reused = reserve(b);
eq(reused.cached, true);
eq(reused.originRunId, 'fixture-first-owner');
eq(reused.originAttemptId, request.requestId);
eq(reused.response.fixtureOnly, true);
eq(second.summary().calls, 0);
eq(first.globalSummary().calls, paid.calls);
eq(first.globalSummary().reservedOrSettledMicros, paid.reservedOrSettledMicros);
a.close(); b.close(); first.close(); second.close();
first = makeStore('fixture-first-owner'); second = makeStore('fixture-second-owner');
b = openFactionReplacementDispatchGuardV1({ ...args, store: second, allowedRunIds: ['fixture-first-owner'] });
eq(reserve(b).cached, true);
eq(second.summary().calls, 0);
const foreign = openFactionReplacementDispatchGuardV1({ ...args, store: second });
rejects(() => reserve(foreign), 'FACTION_REPLACEMENT_DISPATCH_FOREIGN_OWNER'); foreign.close();
const fallback = actualPreparedRequests[1];
eq(fallback.grant.hash, prepared.grant.hash);
const changedChoice = openFactionReplacementDispatchGuardV1({ ...args, prepared: fallback, store: second,
  allowedRunIds: ['fixture-first-owner'], authenticate: () => fallback });
rejects(() => changedChoice.reserve(fallback.request.requestId, fallback.request, 800000, 500000), 'FACTION_REPLACEMENT_DISPATCH_CHOICE_CHANGED');
changedChoice.close();
const badAuth = openFactionReplacementDispatchGuardV1({ ...args, store: second, authenticate: () => null });
rejects(() => reserve(badAuth), 'FACTION_REPLACEMENT_DISPATCH_AUTHENTICATION_DRIFT'); badAuth.close();
// Simulated payment stop is confined to this fixture, never the production DB.
first.reserve('injected-payment', { fixtureOnly: true }, 1, 1);
first.settle('injected-payment', { code: 'PROVIDER_PAYMENT_REQUIRED', definitelyNotSent: true });
rejects(() => reserve(b), 'API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
rejects(() => openFactionReplacementDispatchGuardV1({ ...args, store: second }), 'API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
b.close(); first.close(); second.close();
// The guard run has zero paid attempts: no hidden accounting reset/copy.
const db = new DatabaseSync(filename, { readOnly: true });
eq(db.prepare('SELECT count(*) n FROM attempts WHERE run=?').get(reserved.dispatchRef.controlRunId).n, 0);
eq(db.prepare('SELECT count(*) n FROM attempts WHERE id=?').get(request.requestId).n, 1);
db.close();
for (const code of ['STRUCTURED_PROVIDER_AMBIGUOUS_SEND', 'STRUCTURED_PROVIDER_SCHEMA_INVALID']) {
  const failureFile = out + '/' + code + '.sqlite';
  const owner = openProductionStore(failureFile, { runId: 'fixture-failed-owner', recipeHash: hash(code),
    maxCalls: 2, maxCostMicros: 2000000, maxTokens: 1000000 });
  const guard = openFactionReplacementDispatchGuardV1({ ...args, filename: failureFile, store: owner });
  eq(reserve(guard).cached, false);
  owner.settle(request.requestId, { code, failureReceipt: seal({ fixtureOnly: true, code }) });
  const stopped = reserve(guard);
  eq(stopped.failed, true); eq(stopped.code, code); eq(owner.summary().calls, 1);
  eq(owner.summary().reservedOrSettledMicros, 800000);
  guard.close(); owner.close();
}
const budgetFile = out + '/budget.sqlite';
const budgetOwner = openProductionStore(budgetFile, { runId: 'fixture-budget-owner', recipeHash: hash('budget'),
  maxCalls: 3, maxCostMicros: 1000000, maxTokens: 2000000 });
budgetOwner.reserve('prior-cost', { fixtureOnly: true }, 700000, 1);
budgetOwner.settle('prior-cost', { code: 'fixture_unknown_usage' });
const budgetGuard = openFactionReplacementDispatchGuardV1({ ...args, filename: budgetFile, store: budgetOwner });
rejects(() => reserve(budgetGuard), 'PRODUCTION_BUDGET_EXHAUSTED');
eq(budgetOwner.summary().calls, 1);
eq(budgetOwner.summary().reservedOrSettledMicros, 700000);
budgetGuard.close(); budgetOwner.close();
eq(await snapshot(), codeHashes);
const report = seal({ version: 'faction_replacement_dispatch_guard_component_v1', passed: true, checks,
  completeActualContextBytes: Buffer.byteLength(request.input), originalGrantHash: prepared.grant.hash,
  controlSchemaMigration: false, sqliteRestartPassed: true, sharedCasLeasePassed: true,
  foreignOwnerRejected: true, originalAttemptCopied: false, modelChangeCannotMintSecondAllowance: true,
  failedReplacementDoesNotResend: true, budgetStillEnforcedByProducerStore: true,
  injectedRequests: 1, injectedPaymentStops: 1, providerCalls: 0, actualDshSessions: 0,
  fullStructuredRuntimeConsumerPassed: false, productionEntrypointWired: false,
  fixtureDirectory: out, codeHashes, runtimeAccepted: false, trainingTruth: false });
await writeFile(base + 'replacement-dispatch-guard-component-v1.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, providerCalls: 0, hash: report.hash, fixtureDirectory: out }));
