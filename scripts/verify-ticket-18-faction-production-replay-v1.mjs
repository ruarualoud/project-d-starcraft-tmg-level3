import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openFactionProductionReplayV1 } from '../packages/skill-evaluation/faction-production-replay-v1.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { hash, sha256, seal } from '../packages/skill-production/common.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = path.join(root, 'build/ticket-18-faction-production-v1');
const temp = await mkdtemp(path.join(base, 'production-replay-test-'));
const recipeBody = { version: 'faction_strategy_production_v1', contextHash: hash('full frozen context'),
  modelHash: hash('model'), sourceBinding: { source: hash('source') }, dshBindingHash: hash('dsh') };
const input = { task: 'complete injected host task', contextHash: recipeBody.contextHash }, roleId = 'faction.fixture.review';
const output = { channels: { skill: { action: 'finish', content: { verdict: 'unsupported', reason: 'injected negative' } } } };
const receiptBody = { schemaVersion: 'starcraft_tmg_provider_egress_transport_v1.success', providerProfileRef: { hash: recipeBody.modelHash },
  status: 200, physicalAttempts: 1, automaticRetries: 0, responseFingerprint: sha256(JSON.stringify(output)) };
const receipt = { ...receiptBody, receiptHash: hash(receiptBody) };
const role = seal({ roleId, contextHash: recipeBody.contextHash, sourceDelivery: 'host_materialized_in_every_role_prompt',
  output: output.channels.skill.content, loop: seal({ runtimeBinding: { hash: recipeBody.dshBindingHash }, sandboxReceipt: { fixtureOnly: true },
    final: output.channels.skill.content, calls: 1, directNetworkUsed: false, trainingTruth: false,
    transcript: [{ call: 1, action: 'finish', commandHash: sha256(JSON.stringify(output.channels.skill)), receiptHash: receipt.receiptHash }] }), trainingTruth: false });
const reseal = (v, fields) => { const { hash: ignored, ...body } = v; return seal({ ...body, ...fields }); };
let serial = 0;
function setup({ roleValue = role, paid = true, profileDrift = false, originInputDrift = false } = {}) {
  const filename = path.join(temp, 'fixture-' + serial++ + '.sqlite');
  const parent = seal(recipeBody), parentId = 'faction-v1-' + parent.hash.slice(0, 20);
  const recipe = seal({ ...recipeBody, ...(profileDrift ? { modelHash: hash('drift') } : {}),
    continuation: seal({ parentRunId: parentId, parentRecipeHash: parent.hash }) });
  const runId = 'faction-v1-' + recipe.hash.slice(0, 20);
  const parentStore = openProductionStore(filename, { runId: parentId, recipeHash: parent.hash });
  parentStore.finish(parentStore.acquire(roleId, originInputDrift ? { ...input, task: 'foreign source task' } : input), roleValue);
  if (paid) {
    parentStore.reserve('fixture-call', { fixtureOnly: true }, 100, 30);
    parentStore.settle('fixture-call', { usage: { inputUnits: 10, outputUnits: 2, totalUnits: 12 }, costMicros: 10,
      response: { output, usageReceipt: receipt } });
  }
  parentStore.close();
  const child = openProductionStore(filename, { runId, recipeHash: recipe.hash });
  child.finish(child.acquire(roleId, input), roleValue);
  const derived = seal({ originalRoleHash: roleValue.hash, verdict: 'unsupported' });
  child.finish(child.acquire('derived', { roleHash: roleValue.hash }), derived); child.close();
  return { filename, runId, recipe, ancestors: [parent], derived };
}
const args = setup(), replay = openFactionProductionReplayV1(args);
try {
  const saved = replay.store.acquire(roleId, input); assert(saved.cached); assert.equal(saved.artifact.output.verdict, 'unsupported');
  const lease = replay.store.acquire('derived', { roleHash: role.hash });
  assert.equal(replay.store.finish(lease, args.derived).hash, args.derived.hash);
  const proof = replay.evidence(); assert.equal(proof.matchedStepIds.length, 2); assert.equal(proof.actualProviderReceiptHashes.length, 1);
  assert.equal(proof.exactDshProviderRequestsReplayed, false); assert.equal(proof.independentSemanticReviewPerformed, false);
  assert.throws(() => replay.store.reserve('anything', {}), { code: 'FACTION_REPLAY_EGRESS_FORBIDDEN' });
  assert.throws(() => replay.store.settle('anything', {}), { code: 'FACTION_REPLAY_MUTATION_FORBIDDEN' });
  assert.throws(() => replay.store.acquire(roleId, input), { code: 'FACTION_REPLAY_STEP_INPUT_DRIFT' });
} finally { replay.close(); }
for (const [setupArgs, expected] of [[{ paid: false }, 'FACTION_REPLAY_RECEIPT_MISSING'],
  [{ originInputDrift: true }, 'FACTION_REPLAY_ROLE_ORIGIN_DRIFT'],
  [{ roleValue: reseal(role, { sourceDelivery: 'summary_only' }) }, 'FACTION_REPLAY_ROLE_INVALID'],
  [{ roleValue: reseal(role, { loop: reseal(role.loop, { transcript: [{ ...role.loop.transcript[0], commandHash: hash('wrong') }] }) }) }, 'FACTION_REPLAY_RECEIPT_INVALID'],
  [{ roleValue: reseal(role, { output: { verdict: 'supported' } }) }, 'FACTION_REPLAY_ROLE_INVALID']]) {
  const r = openFactionProductionReplayV1(setup(setupArgs));
  try { assert.throws(() => r.store.acquire(roleId, input), { code: expected }); } finally { r.close(); }
}
assert.throws(() => openFactionProductionReplayV1(setup({ profileDrift: true })), { code: 'FACTION_REPLAY_LINEAGE_INVALID' });
assert.throws(() => openFactionProductionReplayV1({ ...args, ancestors: [] }), { code: 'FACTION_REPLAY_LINEAGE_INVALID' });
const wrong = openFactionProductionReplayV1(args);
try {
  assert.throws(() => wrong.store.acquire(roleId, { ...input, task: 'missing source context' }), { code: 'FACTION_REPLAY_STEP_INPUT_DRIFT' });
  const lease = wrong.store.acquire('derived', { roleHash: role.hash });
  assert.throws(() => wrong.store.finish(lease, reseal(args.derived, { verdict: 'supported' })), { code: 'FACTION_REPLAY_DERIVED_OUTPUT_DRIFT' });
} finally { wrong.close(); }
const files = ['packages/skill-evaluation/faction-production-replay-v1.mjs', 'scripts/verify-ticket-18-faction-production-replay-v1.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) })));
const report = seal({ passed: true, checks: 15, codeHashes, fixtureOnly: true, providerCalls: 0,
  actualCompleteFactionInspected: false, trainingTruth: false });
await writeFile(path.join(base, 'production-replay-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks: 15, providerCalls: 0, hash: report.hash }));
