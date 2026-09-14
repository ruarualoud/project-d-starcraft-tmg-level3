import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { readFactionCheckpointInventoryV1, verifyFactionCheckpointInventoryV1,
  FACTION_CHECKPOINT_INVENTORY_BINDING_V1 as binding } from '../packages/skill-production-v3/faction-checkpoint-inventory-v1.mjs';

const base = 'build/ticket-18-faction-production-v1/', filename = 'build/ticket-17-production-redesign-v1/production.sqlite';
const parentRunId = 'faction-v1-f3c43a4f1ec255cbc9ea';
const json = async id => verifySeal(JSON.parse(await readFile(base + id + '/recipe.json', 'utf8')));
const parentRecipe = await json(parentRunId), lanePrefixes = ['faction.terran_armed_forces.', 'faction.zerg_swarm.'];
const db = new DatabaseSync(filename, { readOnly: true });
const row = db.prepare('SELECT id,input_hash,artifact FROM steps WHERE run=? AND id=?')
  .get(parentRunId, 'faction.terran_armed_forces.tutor');
const redundant = verifySeal(JSON.parse(row.artifact)).value;
const window = { lanePrefix: lanePrefixes[0], throughRunId: parentRunId,
  restoreFromRunId: 'faction-v1-27ef94cd6f32462ec36a', reason: 'restore_skipped_lane_checkpoint',
  supersededProvisionalRoles: [{ runId: parentRunId, id: row.id, inputHash: row.input_hash, artifactHash: hash(redundant) }] };
const older = verifySeal(JSON.parse(db.prepare('SELECT artifact FROM steps WHERE run=? AND id=?')
  .get(window.restoreFromRunId, row.id).artifact)).value;
const originalPaid = db.prepare('SELECT * FROM attempts WHERE run=?').all(parentRunId);
const args = { filename, parentRunId, parentRecipe, lanePrefixes, restorationWindows: [window] };
let checks = 0;
const eq = (a, b) => { assert.deepEqual(a, b); checks++; };
const restored = readFactionCheckpointInventoryV1(args);
eq(restored.steps.find(r => r.id === row.id).artifact.hash, older.hash);
eq(restored.steps.find(r => r.id === row.id).inputHash, row.input_hash);
eq(readFactionCheckpointInventoryV1({ ...args, restorationWindows: [] }).steps.find(r => r.id === row.id).artifact.hash, redundant.hash);
eq(restored.steps.filter(r => r.id.startsWith(lanePrefixes[0])).length, 348);
eq(restored.steps.filter(r => r.id.startsWith(lanePrefixes[1])).length, 84);
eq(restored.proof.attemptsCopied, 0); eq(restored.proof.accountingReset, false);
eq(verifyFactionCheckpointInventoryV1({ proof: restored.proof, readAuthenticated: () => readFactionCheckpointInventoryV1(args) }).proof.hash, restored.proof.hash);
for (const patch of [{ supersededProvisionalRoles: [] }, { restoreFromRunId: 'faction-v1-' + 'f'.repeat(20) },
  { lanePrefix: lanePrefixes[1] }, { reason: 'ignore_all_bad_results' }]) {
  assert.throws(() => readFactionCheckpointInventoryV1({ ...args, restorationWindows: [{ ...window, ...patch }] })); checks++;
}
eq(hash(db.prepare('SELECT * FROM attempts WHERE run=?').all(parentRunId)), hash(originalPaid));
db.close();

// Synthetic, tiny chain: a skipped lane survives, an explicit redundant
// restart is retired, and valid work AFTER that restoration window wins.
const directory = await mkdtemp(base + 'checkpoint-inventory-'), testFile = directory + '/journal.sqlite';
const manifests = new Map(), prefix = 'faction.fixture.', roleId = prefix + 'tutor';
const common = { version: 'faction_strategy_production_v1', contextHash: hash('fixture'), inputHashes: [hash('fixture input')],
  sourceBinding: { fixtureOnly: true }, modelHash: hash('fixture model'), dshBindingHash: hash('fixture dsh') };
const artifact = value => seal({ roleId, value, fixtureOnly: true, loop: { transcript: [{ fixtureOnly: true }] } });
let parent = null;
function append(label, value) {
  const recipe = seal({ ...common, fixtureLabel: label, ...(parent ? { continuation: seal({
    parentRunId: parent.id, parentRecipeHash: parent.recipe.hash, reusable: [] }) } : {}) });
  const id = 'faction-v1-' + recipe.hash.slice(0, 20), store = openProductionStore(testFile, { runId: id, recipeHash: recipe.hash });
  if (value) store.finish(store.acquire(roleId, { fixtureInput: true }), value);
  store.close(); manifests.set(id, recipe); parent = { id, recipe }; return parent;
}
const original = artifact('original'), duplicate = artifact('duplicate'), later = artifact('later');
const first = append('first', original); const skipped = append('skipped', null);
const testArgs = () => ({ filename: testFile, parentRunId: parent.id, parentRecipe: parent.recipe,
  lanePrefixes: [prefix], readRecipe: id => manifests.get(id) });
eq(readFactionCheckpointInventoryV1(testArgs()).steps[0].artifact.hash, original.hash);
const duplicateRun = append('duplicate', duplicate);
const restorationWindows = [{ lanePrefix: prefix, throughRunId: duplicateRun.id, restoreFromRunId: first.id,
  reason: 'restore_skipped_lane_checkpoint', supersededProvisionalRoles: [{ runId: duplicateRun.id,
    id: roleId, inputHash: hash({ fixtureInput: true }), artifactHash: hash(duplicate) }] }];
eq(readFactionCheckpointInventoryV1({ ...testArgs(), restorationWindows }).steps[0].artifact.hash, original.hash);
append('later', later);
eq(readFactionCheckpointInventoryV1({ ...testArgs(), restorationWindows }).steps[0].artifact.hash, later.hash);
const tamper = new DatabaseSync(testFile);
tamper.prepare('UPDATE runs SET recipe=? WHERE id=?').run(hash('tampered'), skipped.id);
assert.throws(() => readFactionCheckpointInventoryV1(testArgs()), { code: 'FACTION_CHECKPOINT_INVENTORY_ANCESTRY_DRIFT' }); checks++;
tamper.close();
const files = ['packages/skill-production-v3/faction-checkpoint-inventory-v1.mjs', 'scripts/verify-ticket-18-checkpoint-inventory-v1.mjs'];
const report = seal({ version: 'faction_checkpoint_inventory_component_v1', passed: true, checks, bindingHash: binding.hash,
  actualInventoryProof: restored.proof, codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))),
  providerCalls: 0, productionMainWired: false, semanticAcceptance: false, trainingTruth: false });
await writeFile(base + 'checkpoint-inventory-component-v1.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, hash: report.hash, roles: restored.steps.length,
  providerCalls: 0, productionMainWired: false }));
