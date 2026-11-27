import assert from 'node:assert/strict';
import path from 'node:path';
import {root,read,save} from './support/wave3-raven-tabletop-room-v1.mjs';
import {bindWave3StandardActionRoom,assertWave3StandardRoomColdReplayV1} from './support/wave3-standard-action-room-v1.mjs';
import {declareWave3EngineeringCoherencyV1,openWave3EngineeringStoreV1} from './support/wave3-room-boundary-fixture-v1.mjs';
import {refreshOfficialRoundSupplyOccupancyV1} from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import {deriveOfficialEngagementGraphV2,deriveOfficialModelSurfacePlacementV2} from '../packages/rule-atoms/official-engagement-graph-v2.mjs';
import {evaluateOfficialBaseMeasurementV1} from '../packages/rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import {poolParameters} from './verify-wave3-lethal-hologram-v1.mjs';

const base='build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const parent='roachling-standard-v260',roomId='roachling-claws-v260',dir=base+'/'+roomId;
const targetId='nova_stealth_mode';
const cert=await read(base+'/'+parent+'/summon.json');
assert(cert.coldExact);
const actorId=cert.child;
const unit=(s,id)=>s.pieces.find(p=>p.id===id);
let room,stage='signed_parent';

try {
  const store=openWave3EngineeringStoreV1({directory:path.join(root,base,parent),filename:'room.sqlite'});
  let state,initial;
  try {
    const h=await store.loadRoom(parent);
    assert.equal(h.envelope.stateHash,cert.stateHash);
    state=structuredClone(h.envelope.state);
    initial=(await store.loadReplayBundle(parent)).initialEnvelope.state;
  } finally {store.close();}
  const scene={twoHumanSeats:true,conditionalPhase:'combat',sourceRoom:parent,sourceStateHash:cert.stateHash,
    sourceParentInReserves:true,attacker:actorId,target:targetId};
  const selection=await read(base+'/inherited-zerg-standard-2.51.0/kerrigan.json');
  const bound=await bindWave3StandardActionRoom({manifestRef:selection.manifestRef,initial,
    dir,candidateVersion:cert.version,frozenRuntimeRef:base+'/'+parent+'/runtime.json',scenario:scene});
  stage='contact_scene';
  Object.assign(state,{phase:'combat',activeSideKey:'player2',firstPlayerSideKey:'player2'});
  delete state.selectedRosterActivationWindow;
  state.phaseFirstActorByRound['1:combat']={phase:'combat',round:1,chosenFirstActorSideKey:'player2',markerHolderSideKey:'player2'};
  const source=unit(state,cert.sourcePiece);
  Object.assign(source,{isInReserves:true,isOnField:false,deploymentStatus:'in_reserves'});
  for(const m of source.models){m.isOnField=false;delete m.xInches;delete m.yInches;}
  state.reserveManifestBySide.player2.find(row=>row.pieceId===source.id).deploymentStatus='in_reserves';
  const actor=unit(state,actorId), target=unit(state,targetId);
  assert.equal(target.models.length,1);
  const leading=actor.models.find(m=>m.id===actor.leadingModelId) || actor.models[0];
  const ref=(p,m)=>({kind:'model',unitId:p.id,modelId:m.id});
  const gap=()=>evaluateOfficialBaseMeasurementV1({state,dataBundle:state.officialModelBaseGeometryDataBundle,
    source:ref(target,target.models[0]),target:ref(actor,leading)});
  function setTarget(yMilli){const xy={xInches:leading.xInches,yInches:yMilli/1000};Object.assign(target,xy);Object.assign(target.models[0],xy);}
  const samplingY=Math.round(leading.yInches*1000)+6000;
  setTarget(samplingY);
  setTarget(samplingY-gap().distanceMilliInches);
  assert(gap().baseToBaseContact);
  assert.equal(deriveOfficialModelSurfacePlacementV2(state,{pieceId:targetId,modelId:target.models[0].id}).elevation,'ground');
  const graph=deriveOfficialEngagementGraphV2(state);
  assert(graph.engagedUnitIds.includes(actorId) && graph.engagedUnitIds.includes(targetId));
  declareWave3EngineeringCoherencyV1(state,{planIdPrefix:roomId});
  state.officialRoundSupplyState=refreshOfficialRoundSupplyOccupancyV1({state});
  const authority=bound.authorityFor(state,scene);
  room=bound.open();
  const seats=await room.create(roomId,authority);
  const logOffset=state.log.length;
  for(;;) {
    const head=await room.store.loadRoom(roomId);
    const s=head.envelope.state, side=s.activeSideKey;
    assert(head.stateRevision<16,'combat choice sequence did not hand off');
    const menu=await room.room.legalSpace({roomId,seatToken:seats[side].seatToken});
    assert(menu.ok,menu.reason);
    const {parameterDomains:domains,finiteActions:finite}=menu.legalSpace;
    const events=s.log.slice(logOffset).flatMap(e=>e.events || []);
    const hit=events.find(e=>e.type==='close_combat_attack' && e.pieceId===actorId && e.targetId===targetId && e.weaponName==='Claws');
    const types=[...new Set([...domains,...finite.map(c=>c.action)].map(r=>r.actionType))];
    if(hit && side==='player1' && !s.pendingAction && !s.pendingOfficialReactionWindow && (types.includes('fight') || types.includes('pass'))) {
      stage='cold_replay';
      const attack=await read(dir+'/declared.json');
      assert.equal(hit.stages.hitRolls.length,attack.dice);
      const actions=await assertWave3StandardRoomColdReplayV1(bound,authority,roomId,head.envelope);
      await save(dir+'/result.json',{version:cert.version,scene,actions,sourceProfileHash:attack.sourceProfileHash,
        graphHash:graph.graphHash,dice:attack.dice,hitRolls:hit.stages.hitRolls,damage:hit.stages.totalDamage,
        casualties:hit.casualtyModelIds,nextSide:side,next:types,coldExact:true,stateHash:head.envelope.stateHash,modelCalls:0});
      break;
    }
    stage='combat_r'+head.stateRevision;
    const common={roomId,credential:seats[side],operationKey:'claws-r'+head.stateRevision};
    const claws=domains.find(d=>d.actionType==='fight' && d.pieceId===actorId && d.weaponName==='Claws');
    if(head.stateRevision===0) {
      assert(claws,JSON.stringify(types));
      assert(claws.constraints.targetUnitIds.includes(targetId));
      const route=s.officialMeleeWeaponSourceBundle.routes.find(row=>row.profileKey===claws.profileKey);
      assert.equal(route?.definitionId,'unit:roachling/claws-combat-phase@1');
      assert.equal(claws.sourceDefinitionId,route.definitionId);
      assert.equal(claws.sourceFeatureHash,route.sourceFeatureHash);
      const dice=claws.constraints.declineCloseRanksAttackDice;
      assert(Number.isSafeInteger(dice) && dice>0);
      await save(dir+'/declared.json',{dice,sourceProfileHash:claws.constraints.sourceProfileHash,targetId,actorId,graphHash:graph.graphHash});
      await room.commit({...common,select:d=>d.domainId===claws.domainId,
        parameters:()=>({closeRanksMode:'decline',allocations:[{targetUnitId:targetId,dice}]})});
      continue;
    }
    const passReaction=domains.find(d=>d.actionType==='pass_reaction_family_window') || domains.find(d=>d.actionType==='finish_activation');
    const finitePass=finite.find(c=>['pass_reaction_family_window','finish_activation'].includes(c.action.actionType));
    const domain=passReaction || (!finitePass && domains.length===1 ? domains[0] : null);
    if(domain) {
      await room.commit({...common,select:d=>d.domainId===domain.domainId,parameters:poolParameters});
    } else {
      const action=finitePass || (finite.length===1 ? finite[0] : null);
      assert(action,'unexpected melee menu '+JSON.stringify(types));
      await room.commit({...common,kind:'finite',select:c=>c.actionKey===action.actionKey});
    }
  }
} catch(error) {
  await save(dir+'/stop-'+Date.now()+'.json',{stage,error:error.message,code:error.code,frames:error.stack?.split('\n').slice(0,5)});
  throw error;
} finally {room?.close();}
