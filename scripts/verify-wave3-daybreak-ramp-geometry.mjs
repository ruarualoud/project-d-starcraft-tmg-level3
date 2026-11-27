import assert from 'node:assert/strict';
import {base,manifestRef,signedBranch} from './support/wave3-faq-room-v1.mjs';
import {read} from './support/wave3-raven-tabletop-room-v1.mjs';
import {resolveWave3StandardContext} from './support/wave3-standard-action-room-v1.mjs';
import {prepareOfficialStandardReleaseOpeningV2, OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY} from '../packages/product-composition/official-standard-room-factory-v1.mjs';
const mapConfiguration=await read('build/ticket-23-slice-248-semantic-map-input-wiring-v1/after/map-configuration.json');
const recipe=await read(base+'/inherited-zerg-standard-2.53.0/malignant.json');
const unit = (name, upgradeNames = []) => ({ unitInstanceId: name, recordKey: 'army_units:' + name,
  compositionKind: 'small', upgradeNames });
const recipes = {
  player1: { factionRecordKey: 'tactical_cards:raynor_s_raiders', tacticalCardRecordKeys: [],
    units: [unit('raven', ['Internal Tech Module']), unit('raynor_s_raider__marine_')] },
  player2: { ...recipe.recipes.player2,
    units: recipe.recipes.player2.units.map(u => u.unitInstanceId === 'queen' ? unit('hydralisk') : u) },
};
const ctx=await resolveWave3StandardContext(await read(manifestRef),'area_ability_inputs');
const { state, pendingNativeDefinitionIds } = prepareOfficialStandardReleaseOpeningV2({
  releaseContext: ctx, dataset: ctx.dataset, snapshot: ctx.snapshot, recipes, roomId: 'wave3-daybreak-geometry',
  releaseMatchVersion: '2.99.5', missionRecordKey: recipe.mission, deploymentRecordKey: recipe.deployment,
  armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY, mapConfiguration,
});
assert.deepEqual(pendingNativeDefinitionIds,[]);
const freeze=state.officialCompetitiveMapRoomFreeze;
const directory = 'build/ticket-28-wave3-premade-flight-and-platform/daybreak';
const admission = freeze.semanticRampAdmission;
assert.equal(freeze.semanticBindingHash, mapConfiguration.semanticTerrain.bindingHash);
assert.equal(admission.officialDatasetHash, ctx.dataset.datasetHash);
assert.equal(admission.officialTerrainDataBundleHash, state.officialTerrainLosDataBundle.bundleHash);
assert(admission.gateCount > 0 && admission.directionCount === admission.gateCount * 2);
assert.equal(admission.receipts.length, admission.directionCount);
const scene = { seedId: freeze.seedId, bindingHash: admission.bindingHash, overlayHash: admission.overlayHash,
  gateCount: admission.gateCount, directions: admission.directionCount, admissionHash: admission.admissionHash,
  denominator: 'Marine ramp certification paths at room creation' };
await signedBranch({ dir:directory, id:'wave3-daybreak-geometry', version:'2.99.5', initial:state, state, scene,
  perform:async ({head,menu,commit}) => {
    if ((await head()).stateRevision === 0) {
      const space=await menu();
      await commit(space.finiteActions.find(entry => entry.action.actionType==='resolve_mission_start_of_round'));
    }
  },
  verify:async (h,{menu}) => {
    assert.equal(h.stateRevision, 1);
    const published=h.state.officialCompetitiveMapRoomFreeze;
    assert.equal(published.semanticRampAdmission.admissionHash,admission.admissionHash);
    const next=await menu();
    assert(next.finiteActions.some(entry => entry.action.actionType==='choose_first_actor'));
    return {terrainRows:h.state.board.terrain.length, datasetHash:admission.officialDatasetHash,
      geometryHash:state.officialModelBaseGeometryDataBundle.bundleHash,
      terrainHash:admission.officialTerrainDataBundleHash, nextAction:'choose_first_actor'};
  }
});
