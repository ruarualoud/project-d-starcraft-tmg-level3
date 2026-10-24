// Read-only source comparison in a private session copy; never calls a Provider.
import fs from 'node:fs/promises';
import path from 'node:path';
import { registerHooks } from 'node:module';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createIterativeRosterFileStoreV1 } from '../packages/roster-strategist/iterative-roster-file-store-v1.mjs';
const [base] = process.argv.slice(2);
const dir = `${base}/roster-plan-matrix-v274/D/fresh-generation-v274/workspace/iterative-draft/sessions`;
const file = (await fs.readdir(dir)).find(n => n.endsWith('.json'));
const original = await fs.readFile(`${dir}/${file}`, 'utf8');
const raw = JSON.parse(original), session = raw.value ?? raw;
const cfg = JSON.parse(await fs.readFile(`${base}/common-v79-plan-recovery-config.private.json`, 'utf8'));
const copy = await fs.mkdtemp(path.join(base, 'product-source-v308-'));
await createIterativeRosterFileStoreV1({ directory: path.join(copy, 'iterative-draft') }).save(session.sessionId, session);
const sources = [];
// Instrument only this child process. No product source file or original session is changed.
globalThis.__sourceDiagnosisV308 = state => {
  sources.push(structuredClone(state));
  console.log(JSON.stringify({ stage: 'laboratory_source', index: sources.length - 1,
    hash: hash(state), units: state.pieces.map(p => p.id) }));
};
const hooks = registerHooks({ load(url, context, nextLoad) {
  const loaded = nextLoad(url, context);
  if (url.endsWith('/pregame-scene-laboratory-v1.mjs')) {
    const text = String(loaded.source);
    const needle = 'const sourceState = clone(input.sourceState);';
    if (!text.includes(needle)) throw Error('DIAGNOSTIC_SOURCE_SEAM_CHANGED');
    return { ...loaded, source: text.replace(needle,
      needle + '\nglobalThis.__sourceDiagnosisV308(sourceState);') };
  }
  return loaded;
} });
const { createRosterPlanningProductModuleV1 } = await import('../packages/product-composition/roster-planning-product-module-v1.mjs');
const { rosterPlanExperimentGroupV274 } = await import('../content/roster-plan-experiment-matrix-v274.mjs');
const product = await createRosterPlanningProductModuleV1({ root: process.cwd(), fixtureRoot: cfg.fixtureRoot,
  dataDirectory: copy, enableIterativeDraft: true,
  referenceArmyRecipes: rosterPlanExperimentGroupV274('D').referenceArmyRecipes,
  mapConfiguration: JSON.parse(await fs.readFile(cfg.mapConfigurationFile, 'utf8')),
  deliberationFactory: { availability: () => ({ available: true }),
    createForRun: async () => { throw Object.assign(Error('DIAGNOSTIC_SOURCE_CAPTURED'),
      { code: 'DIAGNOSTIC_SOURCE_CAPTURED' }); } } });
let failure;
try { await product.iterativeDraft.resume(session.sessionId); }
catch (error) { failure = { code: error.code || error.message, detail: error.detail }; }
hooks.deregister();
delete globalThis.__sourceDiagnosisV308;
const { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } = await import('./support/official-development-tranche-source-lock-fixture-v1.mjs');
const { createOfficialStandardRoomInitialStateAuthorityV1, OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY }
  = await import('../packages/product-composition/official-standard-room-factory-v1.mjs');
const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root: cfg.fixtureRoot });
const c = session.draftTeachSnapshots.at(-1).candidateInput;
const recipe = { factionRecordKey: c.factionRecordKey, tacticalCardRecordKeys: c.tacticalCardRecordKeys,
  units: c.units.map(u => ({ unitInstanceId: u.unitInstanceId, recordKey: u.recordKey,
    compositionKind: u.compositionKind, upgradeNames: u.upgrades.map(x => x.upgradeName) })) };
const direct = createOfficialStandardRoomInitialStateAuthorityV1({ dataset: source.dataset, snapshot: source.snapshot,
  serverSeatPlan: ['player1', 'player2'].map(side => ({ label: side, seatKey: side, roleMode: 'supervisor', principalType: 'human' })),
  roomId: 'ticket27-slice-271-roster-workspace-isolated-lab',
  recipes: { ...rosterPlanExperimentGroupV274('D').referenceArmyRecipes, [c.sideKey]: recipe },
  armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY,
  ...(session.frozenContext.missionBinding ? { missionRecordKey: session.frozenContext.missionBinding.missionRecordKey,
    deploymentRecordKey: session.frozenContext.missionBinding.deploymentRecordKey } : {}),
  mapConfiguration: JSON.parse(await fs.readFile(cfg.mapConfigurationFile, 'utf8')) }).state;
const productSource = sources.at(-1);
const differences = [];
function diff(a, b, at = '') {
  if (hash(a ?? null) === hash(b ?? null)) return;
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) diff(a[key], b[key], `${at}/${key}`);
  } else differences.push({ path: at, product: a, direct: b });
}
if (productSource) diff(productSource, direct);
console.log(JSON.stringify({ failure, productHash: productSource && hash(productSource), directHash: hash(direct),
  differenceCount: differences.length, differences: differences.slice(0, 30),
  originalUnchanged: await fs.readFile(`${dir}/${file}`, 'utf8') === original,
  providerCalls: 0, nativeActions: 0, copy }));
