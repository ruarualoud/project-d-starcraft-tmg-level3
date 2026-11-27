import assert from 'node:assert/strict';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { resolveWave3StandardContext } from './support/wave3-standard-action-room-v1.mjs';
import {
  inspectOfficialStandardReleaseOpeningCoverageV2,
  OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1,
  OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY,
} from '../packages/product-composition/official-standard-room-factory-v1.mjs';

const base = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const [name, version = '2.51.0'] = process.argv.slice(2);
const out = base + '/inherited-zerg-standard-' + version + '/' + name;
const unit = (id, upgradeNames = []) => ({
  unitInstanceId: id, recordKey: 'army_units:' + id, compositionKind: 'small', upgradeNames,
});
const cards = names => names.map(id => 'tactical_cards:' + id);

const rosters = {
  kerrigan: OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1.player2,
  swarm: {
    factionRecordKey: 'tactical_cards:zerg_swarm',
    tacticalCardRecordKeys: cards(['accelerating_creep', 'evolution_chamber', 'lair', 'overseer', 'roach_warren', 'spawning_pool', 'hydralisk_den']),
    units: [
      unit('zergling', ['Burrow Ambush', 'Shredding Claws', 'Adrenal Glands']),
      unit('roach', ['Tunneling Claws', 'Burrow Ambush', 'Glial Reconstitution', 'Hydriodic Bile']),
      unit('hydralisk', ['Burrow Ambush']),
      unit('raptor__zergling_', ['Burrow Ambush', 'Shredding Claws', 'Adrenal Glands']),
    ],
  },
  hydralisk: {
    factionRecordKey: 'tactical_cards:zerg_swarm',
    tacticalCardRecordKeys: cards(['accelerating_creep', 'hydralisk_den']),
    units: [unit('hydralisk', ['Burrow Ambush'])],
  },
  malignant: {
    factionRecordKey: 'tactical_cards:kerrigan_s_swarm',
    tacticalCardRecordKeys: cards(['malignant_creep', 'hatchery']),
    units: [unit('kerrigan'), unit('zergling'), unit('queen')],
  },
};
assert(Object.hasOwn(rosters, name), 'unknown roster name');
const opening = await read(base + '/ravager-deep-tunnel-v242/opening.json');
const manifest = await read(opening.sourceManifest);
const context = await resolveWave3StandardContext(manifest, 'area_ability_inputs');
const { mission, deployment } = await read(base + '/zagara-standard-admission-v239/admission.json');
const opponent = await read(base + '/zerg-forty-formal-admission-v251/recipes.json');
const recipes = { player1: opponent.player1, player2: rosters[name] };
try {
  const coverage = inspectOfficialStandardReleaseOpeningCoverageV2({
    releaseContext: context, dataset: context.dataset, snapshot: context.snapshot, releaseMatchVersion: version,
    recipes, armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY,
    missionRecordKey: mission, deploymentRecordKey: deployment,
  });
  assert(coverage.definitions.length);
  const rows = coverage.definitions.map(({definitionId, registrationStatus, sourceFeatureHash}) =>
    ({definitionId, registrationStatus, sourceFeatureHash}));
  await save(out + '.json', { name, version, recipes, manifestRef: opening.sourceManifest, manifestHash: manifest.manifestHash,
    mission, deployment, rows, productEntry: 'inspectOfficialStandardReleaseOpeningCoverageV2', modelCalls: 0 });
} catch (error) {
  await save(out + '-stop-' + Date.now() + '.json', { name, version, code: error.code, message: error.message, detail: error.detail });
  throw error;
}
