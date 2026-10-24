// Regression for D's lost immutable source across ordinary product restarts.
// The hook rejects a second construction instead of inventing the missing old state.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createIterativeRosterFileStoreV1 } from '../packages/roster-strategist/iterative-roster-file-store-v1.mjs';
const [base] = process.argv.slice(2);
const dir = `${base}/roster-plan-matrix-v274/D/fresh-generation-v274/workspace/iterative-draft/sessions`;
const file = (await fs.readdir(dir)).find(n => n.endsWith('.json'));
const original = await fs.readFile(`${dir}/${file}`, 'utf8');
const raw = JSON.parse(original), session = raw.value ?? raw;
const actualFailure = session.draftTeachSnapshots.at(-1).failure;
assert.equal(actualFailure.code, 'ROSTER_TEACH_RETAINED_BRANCH_SOURCE_CHANGED');
assert.notEqual(actualFailure.detail.mismatches.sourceStateHash.saved,
  actualFailure.detail.mismatches.sourceStateHash.current);
const cfg = JSON.parse(await fs.readFile(`${base}/common-v79-plan-recovery-config.private.json`, 'utf8'));
const copy = await fs.mkdtemp(path.join(base, 'pinned-source-v308-'));
const store = createIterativeRosterFileStoreV1({ directory: path.join(copy, 'iterative-draft') });
await store.save(session.sessionId, session);
const counts = new Map(), observed = [];
globalThis.__sourceBuildV308 = input => {
  const key = hash({ recipes: input.recipes, map: input.mapConfiguration,
    mission: input.missionRecordKey ?? null, deployment: input.deploymentRecordKey ?? null,
    policy: input.armySpendPolicy ?? 'exact_budget' });
  counts.set(key, (counts.get(key) || 0) + 1);
  assert.equal(counts.get(key), 1, 'LAB_SOURCE_REBUILT_ON_PRODUCT_RESTART');
};
globalThis.__sourceReadV308 = state => observed.push(hash(state));
const hooks = registerHooks({ load(url, context, nextLoad) {
  const loaded = nextLoad(url, context);
  let needle, replacement;
  if (url.endsWith('/official-standard-room-factory-v1.mjs')) {
    needle = 'export function createOfficialStandardRoomInitialStateAuthorityV1(input = {}) {';
    replacement = needle + '\nglobalThis.__sourceBuildV308(input);';
  } else if (url.endsWith('/pregame-scene-laboratory-v1.mjs')) {
    needle = 'const sourceState = clone(input.sourceState);';
    replacement = needle + '\nglobalThis.__sourceReadV308(sourceState);';
  }
  if (!needle) return loaded;
  assert.ok(String(loaded.source).includes(needle), 'Actual product instrumentation seam exists');
  return { ...loaded, source: String(loaded.source).replace(needle, replacement) };
} });
const { createRosterPlanningProductModuleV1 } = await import('../packages/product-composition/roster-planning-product-module-v1.mjs');
const { rosterPlanExperimentGroupV274 } = await import('../content/roster-plan-experiment-matrix-v274.mjs');
let modelBoundaries = 0;
const options = { root: process.cwd(), fixtureRoot: cfg.fixtureRoot, dataDirectory: copy,
  enableIterativeDraft: true, referenceArmyRecipes: rosterPlanExperimentGroupV274('D').referenceArmyRecipes,
  mapConfiguration: JSON.parse(await fs.readFile(cfg.mapConfigurationFile, 'utf8')),
  deliberationFactory: { availability: () => ({ available: true }), createForRun: async () => {
    modelBoundaries++;
    throw Object.assign(Error('SOURCE_CAPTURED_BEFORE_PROVIDER'), { code: 'SOURCE_CAPTURED_BEFORE_PROVIDER' });
  } } };
for (let restart = 0; restart < 2; restart++) {
  const product = await createRosterPlanningProductModuleV1(options);
  await assert.rejects(() => product.iterativeDraft.resume(session.sessionId),
    { code: 'SOURCE_CAPTURED_BEFORE_PROVIDER' });
}
hooks.deregister();
delete globalThis.__sourceBuildV308;
delete globalThis.__sourceReadV308;
assert.equal(counts.size, 2, 'Reference and selected armies have distinct frozen sources');
assert.deepEqual(observed.slice(0, 2), observed.slice(2), 'Restart uses the exact saved sources');
assert.equal(observed[1], actualFailure.detail.mismatches.sourceStateHash.current);
assert.equal(modelBoundaries, 2);
assert.equal(await fs.readFile(`${dir}/${file}`, 'utf8'), original);
const { createPlanningLaboratorySourceStoreV1 } = await import('../packages/roster-planning-workspace/planning-laboratory-source-store-v1.mjs');
const sourceDirectory = path.join(copy, 'laboratory-sources');
const snapshots = (await fs.readdir(sourceDirectory)).filter(n => n.endsWith('.json.gz'));
assert.equal(snapshots.length, 2, 'One compact snapshot per exact construction scope');
const { gunzipSync, gzipSync } = await import('node:zlib');
const target = path.join(sourceDirectory, snapshots[0]);
const envelope = JSON.parse(gunzipSync(await fs.readFile(target)).toString('utf8'));
const pinned = createPlanningLaboratorySourceStoreV1({ directory: sourceDirectory });
assert.throws(() => pinned.get({ scope: { ...envelope.scope, sourceEpoch: 'different' },
  create: () => { throw Error('NEW_SCOPE_REQUIRES_FACTORY'); } }), /NEW_SCOPE_REQUIRES_FACTORY/);
envelope.authority.state.round += 1;
await fs.writeFile(target, gzipSync(JSON.stringify(envelope)));
assert.throws(() => pinned.get({ scope: envelope.scope,
  create: () => { throw Error('CORRUPTION_MUST_NOT_REBUILD'); } }), /PLANNING_LAB_SOURCE_SNAPSHOT_INVALID/);
console.log(JSON.stringify({ passed: true, immutableSources: 2, restarts: 1,
  originalUnchanged: true, sourceChangeStillRejected: true,
  historicalMixedSourceRepaired: false, providerCalls: 0, nativeActions: 0, copy }));
