import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { read, root, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { resolveWave3StandardContext, bindWave3StandardActionRoom, assertWave3StandardRoomColdReplayV1 } from './support/wave3-standard-action-room-v1.mjs';
import { openWave3EngineeringStoreV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { compareLeadAtFirstScoring, exerciseBothEntries, exerciseOrdinaryMovement } from './support/wave3-two-scale-entries.mjs';
import { createOfficialReleaseMatchRuntimeV2 } from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import { createOfficialReleaseManifestV2 } from '../packages/source-data/official-release-context-v2.mjs';
import { prepareOfficialStandardReleaseOpeningV2, OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY } from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import { prepareOfficialSkirmish500ReleaseOpeningV2 } from '../packages/product-composition/official-skirmish-500-room-factory-v1.mjs';
import { createOfficialPremadeMapConfiguratorV1 } from '../packages/product-composition/official-premade-map-configurator-v1.mjs';
import { createOfficialWave3MissionSourceV1, OFFICIAL_WAVE3_GATHER_SKIRMISH_KEY } from '../packages/source-data/official-wave3-mission-source-v1.mjs';
import { createHash } from 'node:crypto';
import { hashStarcraftTmgContract } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { projectStarcraftTmgViewerStateShapeV3 } from '../packages/client-domain/viewer-projection-v3.mjs';

const area = 'build/ticket-28-wave3-mission-source-20261121-v1';
const integrated = area + '/release-room-integration';
const reviewed = area + '/deployment-card-source-review';
const scale = process.argv[2];
assert(['standard', 'skirmish', 'meeting'].includes(scale));
const meeting = scale === 'meeting';
const standard = scale !== 'skirmish';
const seedId = standard ? 'standard-d6-1' : 'skirmish-d3-1';
const roomId = 't28-w3-m23-' + scale;
const dir = integrated + '/two-scale-map-deployments-v1/' + scale;
const missionRecordKey = standard ? 'faction_cards:mission_fire_in_the_sky' : OFFICIAL_WAVE3_GATHER_SKIRMISH_KEY;
const deploymentRecordKey = 'faction_cards:' + (meeting ? 'f1fL4RiJ2zPOF4BeDlgl' : standard ? 'gWudxJ1dMPAF8vP6UghB' : 'EyCV5SmTPXTrpqS6iy3e');
const candidateVersion = '2.84.0';
await fs.mkdir(path.join(root, dir), {recursive:true});
let stage = 'release';
async function run() {
  const scoring = process.argv.includes('--score');
  const movement = process.argv.includes('--move');
  if (process.argv.includes('--continue') || scoring || movement) {
    stage = 'resume-signed-room';
    const store = openWave3EngineeringStoreV1({directory:path.join(root,dir), filename:'room.sqlite',readOnly:true});
    let initial, saved;
    try {
      initial = (await store.loadReplayBundle(roomId)).initialEnvelope.state;
      if (scoring || movement) saved = (await store.loadRoom(roomId)).envelope;
    }
    finally { store.close(); }
    if (scoring || movement) {
      assert.equal(saved.stateRevision,6);
      const context = await resolveWave3StandardContext(await read(dir+'/room-source-manifest.json'),'area_ability_inputs');
      const runtime = createOfficialReleaseMatchRuntimeV2({context,state:initial,candidateVersion});
      assert.equal(runtime.descriptor.runtimeHash,saved.matchBinding.rulesRuntimeBinding.runtimeHash);
      stage = movement ? 'ordinary-movement' : 'first-scoring';
      const result = movement ? exerciseOrdinaryMovement(runtime,saved)
        : compareLeadAtFirstScoring({runtime,envelope:saved,leadThreshold:standard ? 10 : 8});
      await save(dir+'/'+stage+'.public.json',result);
      console.log(JSON.stringify(result));
      return;
    }
    const bound = await bindWave3StandardActionRoom({manifestRef:dir+'/room-source-manifest.json',initial,dir,candidateVersion,
      scenario:'unconditioned two-human official map and deployment',frozenRuntimeRef:dir+'/runtime.json'});
    const native = bound.open();
    let expected;
    try {
      const seats = await native.create(roomId,bound.authority);
      stage = 'alternate-deployment';
      expected = await exerciseBothEntries({native,runtime:bound.runtime,seats,roomId,saveEvidence:(file,data)=>save(dir+'/'+file,data)});
    } finally { native.close(); }
    stage = 'deployment-recovery';
    const actions = await assertWave3StandardRoomColdReplayV1(bound,bound.authority,roomId,expected);
    await save(dir+'/deployment-result.public.json',{roomId,revision:expected.stateRevision,actions,coldReplay:true,stateHash:expected.stateHash});
    console.log(JSON.stringify({roomId,actions,revision:expected.stateRevision}));
    if (!meeting) {
      stage = 'first-scoring';
      const result = compareLeadAtFirstScoring({runtime:bound.runtime,envelope:expected,leadThreshold:standard?10:8});
      await save(dir+'/first-round-scoring.public.json',result);
      console.log(JSON.stringify(result));
    }
    return;
  }
  const original = await read(integrated + '/tabletop-raven-m01-v1/manifest.json');
  const cards = await read(reviewed + '/reviewed-two-card-room-source-manifest.json');
  assert.equal(original.source.datasetHash, cards.source.datasetHash);
  assert.equal(original.source.snapshotHash, cards.source.snapshotHash);
  const base = await resolveWave3StandardContext(original, 'area_ability_inputs');
  const manifestInput = {releaseId: meeting ? roomId + '-source' : original.releaseId, dataset: base.dataset, snapshot: base.snapshot,
    datasetRef: original.source.datasetRef, snapshotRef: original.source.snapshotRef, sourceRevisionRef: original.source.sourceRevisionRef,
    sourceRevision: await read(original.source.sourceRevisionRef), sourcePolicy: original.source.policy, referenceSources: original.source.references,
    components: {...original.components, deploymentCardGeometry: cards.components.deploymentCardGeometry}};
  if (meeting) {
    const ref = 'content/source-releases/wave3-20261125-reviewed-deployment-cards-v2.json';
    const bundle = await read(ref);
    const entry = bundle.cards.find(card=>card.recordKey===deploymentRecordKey);
    const bytes = await fs.readFile(path.join(root,entry.evidence.sourceRef));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.evidence.sourceContentHash);
    manifestInput.components.deploymentCardGeometry = {ref,version:'1.0.0',integrity:{field:'bundleHash',value:bundle.bundleHash}};
    const mission = createOfficialWave3MissionSourceV1({...base,manifest:createOfficialReleaseManifestV2(manifestInput)});
    const missionSource = {ref:await save(dir+'/mission-source.json',mission),version:'1.0.0',integrity:{field:'bundleHash',value:mission.bundleHash}};
    manifestInput.components = {...manifestInput.components, missionSource};
  }
  const manifest = createOfficialReleaseManifestV2(manifestInput);
  const manifestRef = await save(dir + '/room-source-manifest.json', manifest);
  const context = await resolveWave3StandardContext(manifest, 'area_ability_inputs');
  const preview = createOfficialPremadeMapConfiguratorV1().preview({seedId});
  assert.deepEqual(preview.recommendedTerrainSetup.pendingSurfaceInstanceIds, []);
  const recipes = standard ? (await read(integrated + '/khassar-supply-standard-2.84.0/coverage.json')).recipes
    : (await read(reviewed + '/reviewed-two-card-signed/power-lines/native-initial-state.json')).armyBuildingConfigurationBySide;
  stage = 'release-opening';
  const prepare = standard ? prepareOfficialStandardReleaseOpeningV2 : prepareOfficialSkirmish500ReleaseOpeningV2;
  const opening = prepare({releaseContext:context, releaseMatchVersion:candidateVersion, dataset:context.dataset, snapshot:context.snapshot,
    roomId, recipes, missionRecordKey, deploymentRecordKey, ...(standard ? {armySpendPolicy:OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY} : {}),
    mapConfiguration:{seedId, terrainSetup:{valuesByInstance:preview.recommendedTerrainSetup.valuesByInstance}}});
  const initial = opening.state;
  assert.equal(initial.selectedDeployment.profile.recordKey, deploymentRecordKey);
  assert.equal(initial.selectedMission.profile.recordKey, missionRecordKey);
  assert.equal(initial.officialCompetitiveMapRoomFreeze.seedId, seedId);
  assert.equal(initial.board.widthInches, standard ? 54 : 36);
  assert.equal(initial.board.heightInches, 36);
  assert.equal(initial.officialMissionMarkerPlacement.missionMarkers.length, standard ? 5 : 3);
  assert.deepEqual(opening.pendingNativeDefinitionIds, []);
  const terrain = initial.board.terrain;
  assert(terrain.length > 0);
  const geometry = initial.officialDeploymentGeometryBinding;
  const summary = {roomId, seedId, missionRecordKey, deploymentRecordKey, datasetHash:context.dataset.datasetHash, candidateVersion,
    board:[initial.board.widthInches, initial.board.heightInches], terrainRows:terrain.length,
    terrainHash:hashStarcraftTmgContract(terrain), mapFreezeHash:initial.officialCompetitiveMapRoomFreeze.roomFreezeHash,
    entryEdges:geometry.entryEdgesByPlayer, markers:geometry.markerTargets, providerCalls:0};
  await save(dir + '/opening.public.json', summary);
  stage = 'room';
  const bound = await bindWave3StandardActionRoom({manifestRef,initial,dir,candidateVersion,scenario:'unconditioned two-human official map and deployment'});
  const native = bound.open();
  let expected;
  try {
    const seats = await native.create(roomId, bound.authority);
    const room = await native.store.loadRoom(roomId);
    if (!room.stateRevision) {
      const side = initial.activeSideKey;
      const menu = await native.room.legalSpace({roomId,seatToken:seats[side].seatToken});
      assert(menu.ok, JSON.stringify(menu));
      const choices = menu.legalSpace.finiteActions;
      await save(dir + '/r0-menu.public.json', {finite:choices.map(row=>row.action.actionType),domains:menu.legalSpace.parameterDomains.map(row=>row.actionType)});
      await native.commit({roomId,credential:seats[side],operationKey:'mission-start',kind:'finite',choice:{actionType:'resolve_mission_start_of_round'}});
    }
    expected = (await native.store.loadRoom(roomId)).envelope;
    assert.equal(expected.state.officialCompetitiveMapRoomFreeze.roomFreezeHash, summary.mapFreezeHash);
    const projected = projectStarcraftTmgViewerStateShapeV3(expected.state);
    assert.deepEqual(projected.board.terrain.map(row => [row.id, row.footprint, row.footprintCells, row.elevation, row.blocksPlacement]),
      expected.state.board.terrain.map(row => [row.id, row.footprint, row.footprintCells, row.elevation, row.blocksPlacement]));
  } finally { native.close(); }
  stage = 'recovery';
  const actions = await assertWave3StandardRoomColdReplayV1(bound,bound.authority,roomId,expected);
  assert(actions.length > 0);
  await save(dir + '/result.public.json', {...summary, revision:expected.stateRevision,actions,coldReplay:true});
  console.log(JSON.stringify({seedId,terrainRows:terrain.length,revision:expected.stateRevision,actions}));
}
try { await run(); } catch(error) {
  const failure = {stage,seedId,missionRecordKey,deploymentRecordKey,message:error.message,stack:error.stack?.split('\n').slice(0,7)};
  await save(dir + '/stop-' + Date.now() + '.json',failure);
  console.error(JSON.stringify(failure)); process.exitCode = 1;
}
