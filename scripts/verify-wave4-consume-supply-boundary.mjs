import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4StukovUnitInputsV3} from './compile-wave4-stukov-units-v3.mjs';
import {bindWave4TurretRoom} from './support/wave4-turret-room-v1.mjs';
import {createOfficialCharacteristicStatusComponentRuntimeV2} from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import {readOfficialAttackTargetReactionParentV1,synchronizeOfficialTargetReactionSupplyProjectionV1}
  from '../packages/product-composition/official-attack-target-reaction-context-v1.mjs';
import {refreshOfficialRoundSupplyOccupancyV1} from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),ref=process.argv[2];
assert.ok(ref?.startsWith('build/wave4-web/stukov-units/consume-dark-swarm-'));
const read=async name=>JSON.parse(await fs.readFile(path.join(root,ref,name),'utf8'));
const authority=await read('authority.json'),scope=await read('scope.json'),inputs=await loadWave4StukovUnitInputsV3(root),
  directory=await fs.mkdtemp(path.join(root,'build/wave4-web/stukov-units/consume-supply-boundary-')),
  bound=await bindWave4TurretRoom({inputs,state:authority.state,...scope,directory}),
  native=bound.open({directory:path.join(root,ref),readOnly:true}),roomId='wave4-consume-dark-infested_marine-self-source';
try{
  await native.restoreDependencies(roomId,authority);const head=await native.store.loadRoom(roomId),bundle=await native.store.loadReplayBundle(roomId),
    journal=bundle.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt),
    prior=native.engine.replay({initialEnvelope:bundle.initialEnvelope,journal:journal.slice(0,9)});
  assert.equal(prior.ok,true);
  const core=createOfficialCharacteristicStatusComponentRuntimeV2({context:inputs.context,spatialState:authority.state,
    definitionIds:scope.characteristicRuntimeDefinitionIds,sourceDefinitionIds:scope.sourceDefinitionIds,...scope.runtimeOptions}),
    raw=core.apply(prior.envelope.state,journal[9].action.sourceAction,{});
  assert.equal(raw.state.pieces.find(p=>p.id==='defiler').isDestroyed,true);readOfficialAttackTargetReactionParentV1(raw.state);
  const after={...structuredClone(raw.state),officialRoundSupplyState:refreshOfficialRoundSupplyOccupancyV1({state:raw.state})};
  assert.throws(()=>readOfficialAttackTargetReactionParentV1(after),/PARENT_INVALID/);
  const synced=synchronizeOfficialTargetReactionSupplyProjectionV1(raw.state,after);
  assert.equal(readOfficialAttackTargetReactionParentV1(synced).stage,'ready');
  const moved=structuredClone(after);moved.pieces.find(p=>p.id==='victim').models[0].xInches+=1;
  assert.throws(()=>synchronizeOfficialTargetReactionSupplyProjectionV1(raw.state,moved),/PROJECTION_ONLY/);
  const paid=structuredClone(after);paid.cardResources.player1[0].readiness='exhausted';
  if(paid.cardResources.player1[0].readiness===after.cardResources.player1[0].readiness)paid.cardResources.player1[0].readiness='ready';
  assert.throws(()=>synchronizeOfficialTargetReactionSupplyProjectionV1(raw.state,paid),/PROJECTION_ONLY/);
  const forged=structuredClone(after);forged.officialRoundSupplyState.onTableSupplyBySide.player1+=2;
  assert.throws(()=>synchronizeOfficialTargetReactionSupplyProjectionV1(raw.state,forged),/PROJECTION_NOT_NATIVE/);
  assert.equal((await native.store.loadRoom(roomId)).envelope.stateHash,head.envelope.stateHash);
  const result={schema:'starcraft_tmg_wave4_consume_supply_boundary_v1',status:'passed_component',inputRef:ref,sourceOpenedReadOnly:true,
    sourceSignedPrefix:9,newActions:0,cases:['actual_self_source_payment_reproduces_stale_cache','native_supply_projection_resealed',
      'physical_position_change_rejected','card_change_rejected','non_native_supply_cache_rejected'],modelCalls:0,trainingTruth:false};
  await atomicWrite(path.join(root,'docs/development/wave4/evidence/consume-supply-boundary.public.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result));
}finally{native.close();}
