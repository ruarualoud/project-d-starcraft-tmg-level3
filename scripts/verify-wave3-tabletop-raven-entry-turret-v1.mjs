import assert from 'node:assert/strict';
import path from 'node:path';
import { root, tabletop, sourceRef, read, save, registry, sourceContext, ravenRooms }
  from './support/wave3-raven-tabletop-room-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { declareWave3EngineeringCoherencyV1, commitWave3RangedBatchV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { arrange, poolParameters } from './verify-wave3-lethal-hologram-v1.mjs';
import { createOfficialReleaseRosterStateV2, refreshOfficialReleaseRosterDerivedStateV2 } from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 } from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { createOfficialRoundSupplyStateV1 } from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import { OFFICIAL_AUTO_TURRET_OVERWATCH_DEFINITION_ID as overwatch, OFFICIAL_AUTO_TURRET_GAUSS_CANNON_DEFINITION_ID as cannon }
  from '../packages/rule-atoms/official-overwatch-attack-policy-v1.mjs';

const evidence = tabletop + '/entry-turret';
const entry = 'unit:raven/internal-tech-module-movement-phase@1';
const shells = 'unit:raven/explosive-shrapnel-shells-assault-phase@1';
const deploy = 'unit:raven/deploy-auto-turret-movement-phase@1';
const oldBoard = 'build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/contact-contour-geometry-v22/raven-turret-from-entry-v1/overwatch-assault/source-linked-shrapnel-gauss-before.json';
const piece = (state, id) => state.pieces.find(p => p.id === id);
const runtimeFor = (context, state) => createOfficialCharacteristicStatusComponentRuntimeV2({
  context, spatialState: state, definitionIds: [entry, shells], includeMelee: true,
  includeRanged: true, includeArmourChoices: true, includePrecisionChoices: true, weaponDefinitionIds: [cannon],
});
const rooms = ravenRooms(evidence, runtimeFor);
const onTable = state => state.officialRoundSupplyState.onTableSupplyBySide.player1;
const reserve = state => state.officialRoundSupplyState.reserveSupplyBySide.player1;
const available = state => state.officialRoundSupplyState.availableSupplyBySide.player1;
const result = async (prefix, data) => {
  const ref = await save(prefix + '/result.json', data);
  return { evidenceRef: ref, checkpointRef: ref };
};
function candidate(sideKey, faction, cards, unitIds) {
  return { sideKey, scaleId: 'Standard', mineralBudget: 2000, factionRecordKey: 'tactical_cards:' + faction,
    tacticalCardRecordKeys: cards, units: unitIds.map(id => ({ unitInstanceId: id, recordKey: 'army_units:' + id,
      compositionKind: 'small', upgrades: id === 'raven'
        ? ['Internal Tech Module', 'Explosive Shrapnel Shells'].map(upgradeName => ({ upgradeName })) : [] })) };
}
async function compile(product) {
  const context = await sourceContext(product);
  const { state: historical } = (await read(oldBoard)).envelope;
  const { state } = createOfficialReleaseRosterStateV2({
    context, legacyDisclosurePolicy: (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json')).state.officialRosterDisclosureDataBundle,
    candidatesBySide: { player1: candidate('player1','raynor_s_raiders',[],['marine','raven']),
      player2: candidate('player2','nerazim',['tactical_cards:robotics_facility'],['zealot','zeratul']) },
    reactionDefinitionIds: [overwatch], unitLifecycleDefinitionIds: [deploy], characteristicDefinitionIds: [entry, shells],
    additionalGeneratedUnitRecordKeys: ['army_units:auto_turret'], unitRoundEndDefinitionIds: ['unit:auto_turret/timed-life-any-phase@1'],
    canonicalResourceTypes: true, includeMelee: true, includeAbilitySourcePhases: true,
    includeCharacteristicConsumers: true, includeStructureTargeting: true, includeActionPerformedStatusLifecycle: true,
  });
  for (const k of ['board','officialDeploymentGeometryBinding','engagementScale','armyBuildingEngagementScale','supplyLossLedger',
    'officialMissionRuntimeDescriptor','officialMissionSupplyProfile','officialModelGapTransitPolicy']) state[k] = structuredClone(historical[k]);
  Object.assign(state, {round:1, phase:'movement', activeSideKey:'player1', firstPlayerSideKey:'player1', log:[],
    phaseFirstActorByRound: {'1:movement':{round:1,phase:'movement',chosenFirstActorSideKey:'player1'}}});
  arrange(piece(state,'marine'),43,5);
  arrange(piece(state,'zealot'),17,10);
  arrange(piece(state,'zeratul'),26,20);
  assert.equal(piece(state,'raven').isInReserves, true);
  const geometry = state.officialModelBaseGeometryDataBundle.profiles.find(p => p.recordKey === 'army_units:raven');
  assert.equal(geometry.ravenOutlineSource.kind,'annotated_assembly_estimate');
  assert.equal(piece(state,'raven').models[0].baseLocalVerticesMilliInches.length,28);
  assert.equal(state.pieces.some(p => p.officialUnitRecordKey === 'army_units:auto_turret'),false);
  declareWave3EngineeringCoherencyV1(state,{planIdPrefix:'tabletop-reserve-'});
  const prepared = refreshOfficialReleaseRosterDerivedStateV2({ context, state });
  const runtime = runtimeFor(context,prepared);
  prepared.officialRoundSupplyState = createOfficialRoundSupplyStateV1({state:prepared, missionSupplyProfile:prepared.officialMissionSupplyProfile, rulesRuntimeHash:runtime.descriptor.runtimeHash});
  for (const branch of ['raven-neutral','raven-ordinary']) await rooms.registerScene(product,context,branch,prepared,{declaredMovementPhase:true,fullMatch:false});
  return result(evidence + '/compile',{geometry:geometry.ravenOutlineSource.kind,vertices:28,
    costs:prepared.officialRosterRegistryResult.rostersByPlayer.player1.units.find(u => u.unitInstanceId === 'raven').selectedUpgrades.map(u => [u.upgradeName,u.mineralCost]),
    initialSupply:[onTable(prepared),reserve(prepared),available(prepared)]});
}
const point = (x,y) => ({xMilliInches:x,yMilliInches:y,elevation:'ground',supportTerrainIds:[],rotationDegrees:0});
function movementParams(id, x, followers = []) {
  return {leadingModelId:id+'-model-1',path:[point(x,10000)],placements:followers.map((pos,i)=>({modelId:id+'-model-'+(i+2),...point(pos,10000)})),
    elevationTransitions:[],gapMouths:[],coherencyGapMouths:[]};
}
async function runEntry(product, neutral) {
  const branch = neutral ? 'raven-neutral' : 'raven-ordinary';
  const { native, authority, runtime, roomId, prefix } = await rooms.openBranch(product,branch);
  try {
    const seats = await native.create(roomId,authority);
    const apply = (side, operationKey, choice, params) => native.commit({roomId,credential:seats[side],operationKey,choice,parameters:()=>params});
    const first = (await native.store.loadReplayBundle(roomId)).initialEnvelope.state;
    const location = neutral ? [4500,10000] : [30000,31000];
    const entrySegmentId = neutral ? 'raven-neutral-entry:left' : 'red-entry-1';
    const landing = await apply('player1','reserve-entry',{pieceId:'raven',actionType:'deploy'},{
      ...movementParams('raven',location[0]),path:[point(...location)],entryAlongEdgeMilliInches:neutral?10000:30000,entrySegmentId});
    const plan = landing.preview.core.action.sourceAction.spatialPlan;
    assert.equal(plan.entrySegmentId,entrySegmentId);
    assert.equal(plan.entrySource?.definitionId ?? null, neutral ? entry : null);
    if (neutral) assert.equal(plan.entrySource.enemyExclusionRangeMilliInches,8000);
    const get = async () => (await native.store.loadRoom(roomId)).envelope.state;
    // Use the accepted deploy plan for geometry; occupancy is verified at the end, including on a resumed room.
    assert.equal(plan.fullBaseBoundaryAndSweptPathChecked,true);
    let turretId = null;
    if (neutral) {
      const placed = await apply('player1','place-turret',{pieceId:'raven',actionType:'resolve_unit_lifecycle_ability'},
        {activeUnitId:'raven',paymentCardInstanceIds:['faction:player1'],coordinate:{xMilliInches:9000,yMilliInches:10000}});
      assert.equal(placed.preview.core.action.sourceAction.definitionId,deploy);
      const withTurret = await get();
      const turret = withTurret.pieces.find(p => p.officialUnitRecordKey === 'army_units:auto_turret');
      assert.equal(turret.specialDeploymentSourcePieceId,'raven');
      assert.equal(turret.isStructure,true);
      assert.equal(turret.currentSupply,0);
      assert.deepEqual([turret.models[0].xInches,turret.models[0].yInches],[9,10]);
      assert.equal(turret.models[0].baseWidthInches,1.575);
      turretId = turret.id;
      assert(!runtime.enumerate(withTurret).parameterDomains.some(d => d.definitionId === deploy));
    }
    await apply('player1','finish-raven',{pieceId:'raven',actionType:'finish_activation'},{});
    if (neutral) {
      await apply('player2','approach',{pieceId:'zealot',actionType:'move'},movementParams('zealot',17500,[15825,19175]));
      await apply('player2','finish-zealot',{pieceId:'zealot',actionType:'finish_activation'},{});
    }
    const end = await native.store.loadRoom(roomId);
    assert.equal(end.envelope.state.activeSideKey,neutral?'player1':'player2');
    assert.deepEqual([onTable(end.envelope.state),reserve(end.envelope.state),available(end.envelope.state)],
      [onTable(first)+1,reserve(first)-1,available(first)-1]);
    assert.deepEqual([piece(end.envelope.state,'raven').models[0].xInches,piece(end.envelope.state,'raven').models[0].yInches],location.map(n=>n/1000));
    return result(prefix,{entrySegmentId,entrySource:plan.entrySource,location,turretId,
      caster:neutral?'raven':null,revision:end.stateRevision,stateHash:end.envelope.stateHash,
      supplyBefore:[onTable(first),reserve(first),available(first)],supplyAfter:[onTable(end.envelope.state),reserve(end.envelope.state),available(end.envelope.state)]});
  } finally {native.close();}
}
async function assault(product) {
  const parent = await rooms.openBranch(product,'raven-neutral');
  let end;
  try {end = await parent.native.store.loadRoom(parent.roomId);}
  finally {parent.native.close();}
  const state = structuredClone(end.envelope.state);
  const parentResult = await read(evidence + '/raven-neutral/result.json');
  assert.equal(end.envelope.stateHash,parentResult.stateHash);
  const turretId = parentResult.turretId;
  state.phase = 'assault';
  state.activeSideKey = 'player2';
  state.phaseFirstActorByRound['1:assault'] = {round:1,phase:'assault',markerHolderSideKey:'player1',chosenFirstActorSideKey:'player2'};
  const context = await sourceContext(product);
  await rooms.registerScene(product,context,'turret-assault',state,{declaredAssault:true,parentStateHash:parentResult.stateHash,fullMatch:false});
  const {native,authority,runtime,roomId,prefix,directory} = await rooms.openBranch(product,'turret-assault');
  try {
    const seats = await native.create(roomId,authority);
    await native.commit({roomId,credential:seats.player2,operationKey:'zealot-run',choice:{pieceId:'zealot',actionType:'run'},
      parameters:()=>movementParams('zealot',17000,[15325,18675])});
    await native.commit({roomId,credential:seats.player2,operationKey:'finish-run',choice:{pieceId:'zealot',actionType:'finish_activation'},parameters:()=>({})});
    await native.commit({roomId,credential:seats.player1,operationKey:'overwatch',select:r=>r.definitionId===overwatch && r.sourceInstanceId===turretId,
      parameters:()=>({paymentCardInstanceIds:[]})});
    const shot = await commitWave3RangedBatchV1({directory,native,runtime,roomId,credentials:seats,attackerSideKey:'player1',
      attackerPieceId:turretId,targetPieceId:'zealot',weaponName:'Gauss Cannon',operationKey:'shrapnel-shot',selectPoolParameters:poolParameters});
    const e = shot.event;
    assert.equal(e.stages.effects.surgeMatched,true);
    assert.equal(e.stages.hit.dice,6);
    assert.deepEqual(e.stages.hit.thresholdByDieIndex,Array(6).fill(3));
    const after = shot.after.envelope.state;
    assert(!after.pendingOfficialAutoTurretOverwatch);
    assert.deepEqual(piece(after,turretId).activatedPhases,piece(state,turretId).activatedPhases);
    return result(prefix,{parentStateHash:parentResult.stateHash,turretId,upgrade:shells,against:e.targetId,
      dice:e.stages.hit.dice,thresholds:e.stages.hit.thresholdByDieIndex,surgeMatched:e.stages.effects.surgeMatched,
      surgeRolls:e.stages.effects.surgeRolls,damageMarker:e.postDamageMarker,activeSide:after.activeSideKey,
      stateHash:shot.after.envelope.stateHash,revision:shot.after.stateRevision});
  } finally {native.close();}
}
const repairRef = process.argv.find(arg=>arg.startsWith('--repair-ref='))?.slice(13);
await runProductBoundaryCheck({directory:path.join(root,evidence,'verification'),
  identity:{factoryModule:'packages/product-composition/official-release-roster-state-v2.mjs',factoryExport:'createOfficialReleaseRosterStateV2',sourceRef,contractVersion:'tabletop-raven-entry-turret-v1'},
  steps:[{name:'compile',repairRef,openProduct:registry,check:compile},
    {name:'consume',repairRef,openProduct:registry,check:product=>runEntry(product,false)},
    {name:'successor',repairRef,openProduct:registry,check:product=>runEntry(product,true)}]});
await runProductBoundaryCheck({directory:path.join(root,evidence,'verification-assault'),
  identity:{factoryModule:'packages/product-composition/official-characteristic-status-component-runtime-v2.mjs',factoryExport:'createOfficialCharacteristicStatusComponentRuntimeV2',sourceRef:evidence+'/raven-neutral/result.json',contractVersion:'tabletop-shrapnel-reaction-v1'},
  steps:[{name:'consume',repairRef,openProduct:registry,check:assault},
    {name:'coldRecovery',repairRef,openProduct:registry,check:product=>rooms.coldReplay(product,['raven-ordinary','raven-neutral','turret-assault'])}]});
