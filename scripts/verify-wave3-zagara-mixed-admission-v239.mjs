import assert from 'node:assert/strict';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { resolveWave3StandardContext } from './support/wave3-standard-action-room-v1.mjs';
import { inspectOfficialStandardReleaseOpeningCoverageV2, prepareOfficialStandardReleaseOpeningV2,
  OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY } from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import { createOfficialReleaseMatchRuntimeV2 } from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';

const base = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const previous = base + '/zagara-standard-admission-v239';
const kind = process.argv[2];
assert(['pair', 'ravager'].includes(kind));
const version = process.argv.includes('--v240') ? '2.40.0' : '2.39.0';
const output = previous + '/mixed-' + kind + (version === '2.40.0' ? '-v240' : '');
const saved = await read(previous + '/admission.json');
const recipes = await read(previous + '/recipes.json');
const extra = kind === 'pair' ? ['swarmling__zergling_', 'vileling__zergling_'] : ['ravager'];
for (const key of extra) recipes.player2.units.push({ unitInstanceId: key.split('__')[0], recordKey: 'army_units:' + key,
  compositionKind: 'small', upgradeNames: [] });
const manifest = await read(base + '/tabletop-raven-m01-v1/manifest.json');
const context = await resolveWave3StandardContext(manifest, 'area_ability_inputs');
assert.equal(saved.manifestHash, manifest.manifestHash);
const input = { releaseContext: context, dataset: context.dataset, snapshot: context.snapshot,
  recipes, releaseMatchVersion: version, armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY,
  missionRecordKey: saved.mission, deploymentRecordKey: saved.deployment };
await save(output + '/recipes.json', recipes);
let stage = 'coverage';
try {
  const coverage = inspectOfficialStandardReleaseOpeningCoverageV2(input);
  const selected = coverage.definitions.map(row => ({ id: row.definitionId, status: row.registrationStatus }));
  const pending = selected.filter(row => row.status !== 'executable_exact').map(row => row.id);
  const addedUnitDefinitions = Object.fromEntries(extra.map(key => [key, selected.filter(row => row.id.startsWith('unit:' + key + '/'))]));
  for (const key of extra) assert(addedUnitDefinitions[key].length > 0, key);
  const facts = { version, manifestHash: manifest.manifestHash, selected: selected.length,
    exact: selected.length - pending.length, pending, addedUnitDefinitions };
  await save(output + '/coverage.json', facts);
  stage = 'formal-opening';
  if (version === '2.40.0' && kind === 'ravager') {
    const old = await read(previous + '/mixed-ravager/coverage.json');
    const impact = 'unit:ravager/devastating-charge-assault-phase@1';
    assert(old.pending.includes(impact));
    assert.equal(facts.selected, old.selected);
    assert.deepEqual(pending, old.pending.filter(id => id !== impact));
    assert.throws(() => prepareOfficialStandardReleaseOpeningV2(input), error =>
      error.code === 'OFFICIAL_RELEASE_ROOM_ABILITY_COVERAGE_PENDING'
      && JSON.stringify(error.detail.pendingSelectedDefinitionIds) === JSON.stringify(pending));
    await save(output + '/admission.json', { ...facts, opening: 'rejected_pending_definitions',
      verifiedNewRegistration: impact, previousVersion: old.version, fullMatch: false });
    process.exit(0);
  }
  const prepared = prepareOfficialStandardReleaseOpeningV2(input);
  assert.deepEqual(pending, []);
  stage = 'runtime-menu';
  const runtime = createOfficialReleaseMatchRuntimeV2({ context, state: prepared.state, candidateVersion: version });
  const actions = runtime.enumerate(prepared.state).candidates.map(c => c.actionType);
  assert.deepEqual(actions, ['resolve_mission_start_of_round']);
  for (const key of extra) assert(prepared.state.pieces.some(p => p.id === key.split('__')[0]));
  await save(output + '/admission.json', { ...facts, actions, runtimeHash: runtime.descriptor.runtimeHash,
    addedUnitIds: extra, opening: 'accepted', mission: saved.mission, deployment: saved.deployment, modelCalls: 0 });
} catch (error) {
  await save(output + '/stop-' + stage + '.json', { stage, message: error.message, code: error.code,
    pending: error.detail?.pendingSelectedDefinitionIds, modelCalls: 0 });
  throw error;
}
