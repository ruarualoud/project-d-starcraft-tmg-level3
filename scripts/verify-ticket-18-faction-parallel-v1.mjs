import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { createFactionParallelControlV1, bindFactionLaneRuntimeV1,
  runFactionLanesV1, renewFactionCapabilityV1 } from '../packages/skill-production-v3/faction-parallel-v1.mjs';
import { createStarcraftTmgProviderCapabilityReceiptV1 } from '../packages/structured-generation/provider-capability-receipt-v1.mjs';
import { STARCRAFT_TMG_FACTION_ADVICE_EDITOR_OUTPUT_CONTRACT_V1 as editorContract }
  from '../content/skill-generation/ticket-18-faction-advice-editor-output-contract-v1.mjs';
import { createFactionReviewTransactionRuntimeV1 } from '../packages/skill-production-v3/faction-review-transaction-runtime-v1.mjs';
import { createFactionWritingPlanV1, validateFactionOutlineV1,
  createFactionOutlineSourceIssueV1, applyFactionOutlineSourceReconstructionV1 }
  from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';

const base = 'build/ticket-18-faction-production-v1';
const dir = await mkdtemp(base + '/parallel-test-');
const inputs = [{ factionRecordKey: 'tactical_cards:terran_armed_forces', hash: hash('terran') },
  { factionRecordKey: 'tactical_cards:zerg_swarm', hash: hash('zerg') }];
const store = openProductionStore(dir + '/journal.sqlite', {
  runId: 'parallel-test', recipeHash: hash('test'), maxCalls: 10,
  maxCostMicros: 100, maxTokens: 100 });
const control = createFactionParallelControlV1(store);
let releaseBoth;
const both = new Promise(resolve => { releaseBoth = resolve; });
let started = 0, finished = 0;
const execution = await runFactionLanesV1({ inputs, control,
  runLane: async (input, index) => {
    const id = input.factionRecordKey;
    const lease = control.store.acquire(id, { hash: input.hash });
    control.store.reserve(id, { faction: id }, 40, 40);
    if (++started === 2) releaseBoth();
    await both;
    control.store.settle(id, { usage: { inputUnits: 3, outputUnits: 2, totalUnits: 5 },
      costMicros: 5, response: { faction: id } });
    control.store.finish(lease, { faction: id }); finished++;
    if (index === 0) throw Object.assign(new Error('local schema issue'), { code: 'LOCAL_SCHEMA_ISSUE' });
    return { faction: id };
  } });
assert.equal(execution.receipt.maximumConcurrentLanes, 2);
assert.equal(finished, 2);
assert.deepEqual(execution.results.map(r => r.status), ['rejected', 'fulfilled']);
assert.equal(control.stoppedCode, null);
assert.equal(store.summary().knownTokens, 10);
assert.equal(store.summary().reservedOrSettledMicros, 10);
assert.equal(store.summary().attempts.filter(r => r.state === 'intent').length, 0);
control.store.reserve('large-reserve', {}, 80, 80);
assert.throws(() => control.store.reserve('would-overspend', {}, 20, 20),
  { code: 'PRODUCTION_BUDGET_EXHAUSTED' });
assert.equal(control.stoppedCode, 'PRODUCTION_BUDGET_EXHAUSTED');
control.store.settle('large-reserve', { definitelyNotSent: true });
assert.throws(() => control.store.reserve('after-stop', {}, 1, 1),
  { code: 'PRODUCTION_BUDGET_EXHAUSTED' });
const paymentControl = createFactionParallelControlV1(store);
paymentControl.store.reserve('payment', {}, 1, 1);
paymentControl.store.settle('payment', { code: 'PROVIDER_PAYMENT_REQUIRED' });
assert.throws(() => paymentControl.store.reserve('post-payment', {}, 1, 1),
  { code: 'API_BALANCE_EXHAUSTED_STOP_ALL_WORK' });
let roleCalls = 0;
const lane = bindFactionLaneRuntimeV1({ role: async () => { roleCalls++; return 1; } }, inputs[0]);
await assert.rejects(() => lane.role({ packet: { id: 'faction.zerg_swarm', inputHash: inputs[1].hash } }),
  { code: 'FACTION_PARALLEL_LANE_SCOPE_INVALID' });
assert.equal(roleCalls, 0);
await lane.role({ packet: { id: 'faction.terran_armed_forces', inputHash: inputs[0].hash } });
assert.equal(roleCalls, 1);
store.close();

const prior = JSON.parse(await readFile('build/ticket-18-structured-generation-v1/structured-canary-8402a3b34415b4c8b4b808c7f101e46f/capability-receipt.json', 'utf8'));
const clock = new Date(Date.parse(prior.expiresAt) + 1000).toISOString();
const { schemaVersion, receiptHash, trainingTruth, ...priorBody } = prior;
const fresh = createStarcraftTmgProviderCapabilityReceiptV1({ ...priorBody,
  probedAt: clock, expiresAt: new Date(Date.parse(clock) + 86400000).toISOString() });
const renewalStore = openProductionStore(dir + '/renewal.sqlite', { runId: 'renewal-test',
  recipeHash: hash('renewal'), maxCalls: 2, maxCostMicros: 200000, maxTokens: 100000 });
let probeCalls = 0;
const renewOptions = { store: renewalStore, prior, contract: editorContract,
  binding: { providerProfileRef: prior.providerProfileRef, endpoint: { path: prior.endpointPath },
    endpointDialect: prior.endpointDialect, model: prior.model },
  adapter: { async probeCapability() { probeCalls++; return { ok: true,
    capabilityReceipt: fresh, usage: fresh.usage }; } }, priceUsage: () => 100,
  now: () => clock };
assert.deepEqual(await renewFactionCapabilityV1(renewOptions), fresh);
assert.deepEqual(await renewFactionCapabilityV1(renewOptions), fresh);
assert.equal(probeCalls, 1);
assert.equal(renewalStore.summary().calls, 1);
renewalStore.close();

const input = verifySeal(JSON.parse(await readFile(base + '/terran_armed_forces-input.json', 'utf8')));
const zerg = verifySeal(JSON.parse(await readFile(base + '/zerg_swarm-input.json', 'utf8')));
let delegatedOutline = 0;
const transaction = createFactionReviewTransactionRuntimeV1({ input: zerg,
  store: {}, runtime: { role: async () => { delegatedOutline++; return 'outline'; } } });
await transaction.role({ roleId: 'faction.zerg_swarm.army_resources.1.generator-outline.source-reconstruction.v1',
  workspace: { section: createFactionWritingPlanV1(zerg).sections[0], inputHash: zerg.hash } });
assert.equal(delegatedOutline, 1);
const db = new DatabaseSync('build/ticket-17-production-redesign-v1/production.sqlite', { readOnly: true });
const get = suffix => verifySeal(JSON.parse(db.prepare('SELECT artifact FROM steps WHERE run=? AND id=?').get(
  'faction-v1-29c36b16b8b6ce793efe', 'faction.terran_armed_forces.faction.terran_armed_forces.threat_tradeoffs.1.generator-outline' + suffix).artifact)).value.output;
const rejectedOutput = get(''); assert.deepEqual(rejectedOutput, get('.schema')); db.close();
const section = createFactionWritingPlanV1(input).sections[4];
assert.throws(() => validateFactionOutlineV1(rejectedOutput, { input, section }), { code: 'FACTION_OUTLINE_SOURCE_OMISSION' });
const issue = createFactionOutlineSourceIssueV1(rejectedOutput, { input, section });
assert.deepEqual(issue.missingSourceRefs, ['source:tactical_cards:terran_armed_forces']);
const proposal = { planHash: issue.hash, replacements: [{ index: 0,
  focus: 'Injected structural reconstruction fixture only; no strategy quality claim',
  sourceRefs: [...rejectedOutput.outline[0].sourceRefs, ...issue.missingSourceRefs] }] };
const options = { input, section, rejectedOutput, issue };
const fixed = applyFactionOutlineSourceReconstructionV1(proposal, options);
assert.deepEqual(fixed.output.outline.slice(1), rejectedOutput.outline.slice(1));
assert.equal(fixed.receipt.semanticAcceptanceInherited, false);
const mutate = (fn, code) => { const p = structuredClone(proposal); fn(p); assert.throws(
  () => applyFactionOutlineSourceReconstructionV1(p, options), { code }); };
mutate(p => p.planHash = hash('wrong'), 'FACTION_OUTLINE_SOURCE_RECONSTRUCTION_SCOPE_INVALID');
mutate(p => p.replacements[0].index = 8, 'FACTION_OUTLINE_SOURCE_RECONSTRUCTION_SCOPE_INVALID');
mutate(p => p.replacements[0].sourceRefs.shift(), 'FACTION_OUTLINE_SOURCE_RECONSTRUCTION_DROPPED_SOURCE');
mutate(p => p.replacements[0].focus = rejectedOutput.outline[0].focus, 'FACTION_OUTLINE_SOURCE_RECONSTRUCTION_CONTENT_REQUIRED');
mutate(p => p.replacements.push(p.replacements[0]), 'FACTION_OUTLINE_SOURCE_RECONSTRUCTION_SCOPE_INVALID');
const files = ['packages/skill-production-v3/faction-parallel-v1.mjs',
  'packages/skill-production-v3/faction-review-transaction-runtime-v1.mjs',
  'packages/skill-production-v3/faction-strategy-workflow-v1.mjs',
  'scripts/run-ticket-18-faction-strategy-production-v1.mjs',
  'scripts/verify-ticket-18-faction-parallel-v1.mjs'];
const report = seal({ passed: true, providerCalls: 0, maximumConcurrentLanes: 2,
  independentFailureSettled: true, atomicBudgetTested: true, paymentStopsNewCalls: true,
  wrongFactionRejected: true, actualOutlineOmissionReproduced: true,
  expiredCapabilityRenewedOnceAndReused: true,
  sourceReconstructionGuardMutations: 5, semanticAcceptanceInherited: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))),
  trainingTruth: false });
await writeFile(base + '/parallel-readiness.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
