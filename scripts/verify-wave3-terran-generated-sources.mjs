import assert from 'node:assert/strict';
import path from 'node:path';
import {read, save, root} from './support/wave3-raven-tabletop-room-v1.mjs';
import {resolveWave3StandardContext} from './support/wave3-standard-action-room-v1.mjs';
import {openWave3EngineeringStoreV1} from './support/wave3-room-boundary-fixture-v1.mjs';
import {wave3HumanMapConfiguration} from '../packages/product-composition/wave3-human-match-v1.mjs';
import {prepareOfficialStandardReleaseOpeningV2, OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY}
  from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import {createOfficialReleaseMatchRuntimeV2} from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import {createOfficialRelocationFamilyAdapterV1} from '../packages/product-composition/official-relocation-family-adapter-v1.mjs';
import {projectOfficialContextualSupplyValueV1} from '../packages/rule-atoms/official-contextual-supply-projection-v1.mjs';

const dir='build/ticket-28-wave3-human-lobby-v1/remaining-six';
const rooms='build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const version='2.96.0';
const setup=(await read('content/wave3-human-match-setups-v1.json')).find(row=>row.scale==='Standard');
const context=await resolveWave3StandardContext(await read(setup.releaseRef),'area_ability_inputs');
function open(roomId, recipes) {
  return prepareOfficialStandardReleaseOpeningV2({roomId,recipes,releaseContext:context,releaseMatchVersion:version,
    dataset:context.dataset,snapshot:context.snapshot,missionRecordKey:setup.missionRecordKey,
    deploymentRecordKey:setup.deploymentRecordKey,mapConfiguration:wave3HumanMapConfiguration(setup),
    armySpendPolicy:OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY});
}
const raven=await read(rooms+'/raven-standard-v228/factory-state.json');
const nova=await read(rooms+'/nova-holo-standard-v233/nova_assault_mode/factory-state.json');
const opening=open('generated-units-296',{player1:raven.armyBuildingConfigurationBySide.player1,
  player2:nova.armyBuildingConfigurationBySide.player1});
assert.deepEqual(opening.pendingNativeDefinitionIds,[]);
const state=opening.state;
const definitions=[];
function proof(id, stage, source, extra={}) {
  const d=opening.nativeActions.catalogue.definitions.find(row=>row.definitionId===id);
  assert(d?.sourceFeatureHash,id);
  if(source) assert.equal(source.sourceFeatureHash,d.sourceFeatureHash,id);
  definitions.push({id,hash:d.sourceFeatureHash,stage,...extra});
  return d;
}
for(const [id,profileKey] of [
  ['unit:auto_turret/gauss-cannon-assault-phase@1','army_units:auto_turret::assault::Gauss Cannon'],
  ['unit:nova_assault_mode/hellfire-shotgun-assault-phase@1','army_units:nova_assault_mode::assault::Hellfire Shotgun']]) {
  const profile=state.officialAttackProfileCatalogue.profilesByProfileKey[profileKey];
  assert(profile?.profileHash,profileKey);
  const d=proof(id,'weapon_registered_in_admitted_room',null,{profileKey,profileHash:profile.profileHash});
  assert.equal(d.execution.status,'executable_exact',id);
}
proof('unit:holo_decoy/decoy-any-phase@1','summon_decoy_source_in_admitted_room',state.officialDecoySourceBundle);
assert.equal((await read(rooms+'/nova-modes-standard-v232/mutually-exclusive.json')).bothModesRejected,true);
proof('unit:nova_assault_mode/battle-preparation-any-phase@1','mutually_exclusive_roster_and_bound_passive',
  state.officialSelectedRosterAbilitySourceBundle.passiveBindings.find(row=>row.recordKey==='army_units:nova_assault_mode'));
const droneProfile=state.officialGeneratedUnitDataBundle.profiles.find(p=>p.recordKey==='army_units:point_defense_drone');
assert(droneProfile?.isStructure);
proof('unit:point_defense_drone/structure-any-phase@1','generated_structure_in_admitted_room',droneProfile.structureFeatures[0]);
const ingress=rooms+'/raynor-match-v227/ingress';
const receipt=await read(ingress+'/result.json');
const handoff=await read(ingress+'/handoff.json');
assert(receipt.exactColdReplay);
const store=openWave3EngineeringStoreV1({directory:path.join(root,ingress),filename:'room.sqlite',readOnly:true});
try {
  const head=(await store.loadRoom('raynor-v227-ingress')).envelope;
  assert.equal(head.stateHash,handoff.stateHash);
  const drone=head.state.pieces.find(p=>p.id===receipt.spawned);
  assert.equal(drone.officialUnitRecordKey,droneProfile.recordKey);
  const source=state.officialRelocationFamilySourceBundle;
  const id='unit:point_defense_drone/gliding-any-phase@1';
  const adapter=createOfficialRelocationFamilyAdapterV1(source);
  const request={queryKind:'relocation_modifier_projection',pieceId:drone.id};
  const query=adapter.query(head.state,request);
  assert.equal(query.result.hasDisplacement,true);
  assert(query.result.applicableDefinitionIds.includes(id));
  proof(id,'gliding_projection_on_signed_spawn',source.routes.find(r=>r.definitionId===id),
    {queryHash:query.queryReceiptHash,spawned:drone.id,headHash:head.stateHash});
} finally { store.close(); }
const support=await read(dir+'/web-openings/support-2.95.0.public.json');
const sup=open('medic-supply-296',support.recipes);
const runtime=createOfficialReleaseMatchRuntimeV2({context,state:sup.state,candidateVersion:version});
const first=runtime.enumerate(sup.state).candidates.find(c=>c.actionType==='resolve_mission_start_of_round'&&c.isEnabled);
assert(first);
const after=runtime.apply(sup.state,first,{sideKey:sup.state.activeSideKey}).state;
const project=c=>projectOfficialContextualSupplyValueV1({state:after,pieceId:'medic',context:c});
const pool=project('supply_pool_calculation'), marker=project('mission_marker_control');
assert.equal(pool.effectiveSupply,0);
assert.equal(marker.effectiveSupply,marker.baseSupply);
assert(marker.baseSupply>0);
await save(dir+'/terran-generated-296.public.json',{version,manifestHash:context.manifest.manifestHash,definitions,
  admitted:true,support:{selected:support.definitions.length,pool,marker,next:runtime.enumerate(after).candidates.map(r=>r.actionType)},
  receiptRef:ingress+'/result.json',providerCalls:0});
console.log('Terran',definitions.length,'pool',pool.effectiveSupply,'marker',marker.effectiveSupply);
