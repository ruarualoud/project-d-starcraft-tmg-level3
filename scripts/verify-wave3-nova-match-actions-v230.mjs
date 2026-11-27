import assert from 'node:assert/strict';
import {projectOfficialChargeSpeedDebuffV1} from '../packages/rule-atoms/official-charge-speed-debuff-policy-v1.mjs';
import { createOfficialRoundSupplyStateV1 } from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import { createOfficialSupplyLossLedgerV1 } from '../packages/rule-atoms/official-supply-loss-ledger-v1.mjs';
import { poolParameters } from './verify-wave3-lethal-hologram-v1.mjs';
import path from 'node:path';
import {root, registry, read, save} from './support/wave3-raven-tabletop-room-v1.mjs';
import {createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2} from '../packages/source-data/official-release-context-v2.mjs';
import {createOfficialReleaseMatchRuntimeV2} from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import {declareWave3EngineeringCoherencyV1,createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1} from './support/wave3-room-boundary-fixture-v1.mjs';

const integration='build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const out=integration+'/nova-shared-standard-v230';
const branch=process.argv.at(-1);
assert(['griffin','mark','stim','armour','suppression','magrail'].includes(branch));
const dir=out+'/'+branch, roomId='nova-v230-'+branch;
async function resolve(manifest,purpose) {
  const product = registry();
  try {
    product.resolver.register(manifest);
    const [base,mission] = await Promise.all([purpose,'mission_source'].map(purpose=>product.resolver.resolve({releaseId:manifest.releaseId,purpose})));
    return {...base,resources:{...base.resources,...mission.resources}};
  } finally { product.close(); }
}
const original=await read(integration+'/tabletop-raven-m01-v1/manifest.json');
const state=await read(out+'/factory-state.json');
const assaultBranch = ['suppression','magrail'].includes(branch);
state.phase=assaultBranch?'assault':'movement';state.stage='activation_phases';
state.firstPlayerSideKey=state.activeSideKey=branch==='suppression'?'player2':'player1';
state.phaseFirstActorByRound['1:'+state.phase]={round:1,phase:state.phase,chosenFirstActorSideKey:state.activeSideKey,markerHolderSideKey:state.firstPlayerSideKey};
for(const piece of state.pieces.filter(p=>p.id==='spec_ops_marauder__marauder_'||p.id==='zergling')){
  Object.assign(piece,{isOnField:true,isInReserves:false,deploymentStatus:'deployed',leadingModelId:piece.models[0].id});
  const x=piece.sideKey==='player1'?8.5:assaultBranch?17:29, y=10;
  for(const [i,model] of piece.models.entries()){
    const angle=2*Math.PI*(i-1)/(piece.models.length-1);
    Object.assign(model,{xInches:x+(i?Math.round(2700*Math.cos(angle))/1000:0),
      yInches:y+(i?Math.round(2700*Math.sin(angle))/1000:0),isOnField:true});
  }
  state.reserveManifestBySide[piece.sideKey].find(entry=>entry.pieceId===piece.id).deploymentStatus='deployed';
}
declareWave3EngineeringCoherencyV1(state,{planIdPrefix:'nova-v230-'+branch+'-'});
state.officialRoundSupplyState=createOfficialRoundSupplyStateV1({state,gameplayDataBundle:state.officialGameplayDataBundle,
  rulesRuntimeHash:state.officialMissionRuntimeDescriptor.runtimeHash});
state.supplyLossLedger=createOfficialSupplyLossLedgerV1({round:state.round,rulesRuntimeHash:state.officialMissionRuntimeDescriptor.runtimeHash});
for(const side of ['player1','player2']) state.players[side].supply=state.officialRoundSupplyState.supplyPoolBySide[side];
const source=await resolve(original,'area_ability_inputs');
const descriptor=createOfficialReleaseMatchRuntimeV2({context:source,state,candidateVersion:'2.30.0'}).descriptor;
await save(dir+'/runtime.json',descriptor);
const frozen=original.source;
const manifest=createOfficialReleaseManifestV2({releaseId:original.releaseId,dataset:source.dataset,snapshot:source.snapshot,
  sourceRevision:await read(frozen.sourceRevisionRef),sourceRevisionRef:frozen.sourceRevisionRef,
  snapshotRef:frozen.snapshotRef,datasetRef:frozen.datasetRef,sourcePolicy:frozen.policy,referenceSources:frozen.references,
  components:{...original.components,rulesRuntime:{ref:dir+'/runtime.json',version:descriptor.runtimeVersion,
    integrity:{field:'runtimeHash',value:descriptor.runtimeHash}}}});
const context=await resolve(manifest,'area_ability_component');
const runtime=createOfficialReleaseMatchRuntimeV2({context,state,boundRuntimeManifest:manifest});
assert.deepEqual(runtime.descriptor,descriptor);
const authority=createWave3ComponentEngineeringAuthorityV1({context,state,scenario:{scope:'formal_standard_nova',source:out+'/factory-state.json',declaredPositions:true,branch}});
const open=()=>openWave3EngineeringRoomV1({directory:path.join(root,dir),filename:'room.sqlite',rulesRuntime:bindOfficialReleaseRulesRuntimeV2({context,runtime})});

const nested=(row,key)=>{for(let r=row;r;r=r.sourceAction??r.sourceDomain){if(r[key]!==undefined)return r[key];}};
const specId = 'spec_ops_marauder__marauder_';
const nas = {
  griffin:'card:nova_covert_ops/griffin-support-any@1',
  mark:'card:nova_covert_ops/mark-for-death-any@1',
  stim:'unit:spec_ops_marauder__marauder_/commando-stimpack-movement-phase@1',
  armour:'unit:spec_ops_marauder__marauder_/spec-ops-armour-any-phase@1'
};
async function verifyEffect(s) {
      const actor=s.pieces.find(p=>p.id===specId), target=s.pieces.find(p=>p.id==='zergling');
      let observed;
      if(branch==='griffin') {
        const drone=s.pieces.find(p=>p.officialUnitRecordKey==='army_units:sabotage_drone');
        const saved=await read(dir+'/placement.json');
        const bundle=await app.store.loadReplayBundle(roomId);
        const projected=runtime.queryGriffinPlacement(bundle.initialEnvelope.state,specId,saved.parameters);
        assert.equal(projected.queryReceiptHash,saved.queryReceiptHash);
        const plan=nested(projected.result.action,'unitLifecyclePlan');
        assert.equal(drone.id,plan.canonicalParameters.createdPieceId);
        await save(dir+'/placement.json',{...saved,pieceId:drone.id});
        assert.equal(drone.currentSupply,0);assert.equal(drone.models[0].remainingWounds,3);
        assert.equal(s.cardResources.player1.find(c=>c.cardKind==='faction').readiness,'exhausted');
        observed={createdPieceId:drone.id,supply:drone.currentSupply,remainingWounds:drone.models[0].remainingWounds};
      } else if(branch==='mark') {
        const effect=target.officialAbilityEffects.find(e=>e.sourceDefinitionId===nas.mark);
        assert.equal(effect.criticalHit,1);assert.equal(effect.precision,1);observed={target:target.id,criticalHit:effect.criticalHit,precision:effect.precision};
      } else if(branch==='stim') {
        const ranged=runtime.queryWeaponCharacteristics(s,specId,{weaponName:'Quad K12',attackKind:'ranged'}).result;
        const melee=runtime.queryWeaponCharacteristics(s,specId,{weaponName:'Strike',attackKind:'close_combat'}).result;
        assert.equal(ranged.precision,2);assert.equal(melee.precision,2);observed={rangedPrecision:ranged.precision,meleePrecision:melee.precision};
      } else {
        assert(actor.statuses.some(value=>(typeof value === 'string' ? value : value.statusName) === 'hidden'));
        observed={statuses:actor.statuses};
      }
      await save(dir+'/effect.json',observed);
}
async function verifyCurrentRoom() {
const app = open();
try {
  const seats = await app.create(roomId,authority);
  let room = await app.store.loadRoom(roomId);
  if(!assaultBranch && room.stateRevision===1) await verifyEffect(room.envelope.state);
  const trace = room.stateRevision ? await read(dir+'/trace.json') : [];
  for (let step=0;step<36;step++) {
    const current = room.envelope.state, side = current.activeSideKey;
    if (branch==='griffin' && current.phase==='combat' || branch==='suppression' && room.stateRevision>=3
      || branch==='magrail' && current.log.some(row=>row.events?.some(e=>e.type==='ranged_attack' && e.pieceId===specId))
      || !assaultBranch && branch!=='griffin' && room.stateRevision>=2) break;
    const menu = await app.room.legalSpace({roomId,seatToken:seats[side].seatToken});
    assert(menu.ok,menu.reason??menu.code);
    const options = menu.legalSpace.finiteActions.map(entry=>entry.action);
    const domains = menu.legalSpace.parameterDomains;
    await save(dir+'/menu-r'+room.stateRevision+'.json',{phase:current.phase,side,options:options.map(row=>row.actionType),
      domains:domains.map(row=>({type:row.actionType,unit:row.pieceId,definition:nested(row,'definitionId'),fields:row.parameterSchema.required}))});
    let command;
    if (branch==='suppression') {
      if (room.stateRevision===0) {
        const model=id=>current.pieces.find(p=>p.id===id).models[0].id;
        command={choice:{actionType:'charge',pieceId:'zergling'},parameters:()=>({leadingModelId:model('zergling'),targets:[{unitId:specId,modelId:model(specId)}]})};
      } else if(room.stateRevision===1) {
        assert.equal(current.activeSideKey,'player1');
        command={select:row=>nested(row,'definitionId')==='unit:spec_ops_marauder__marauder_/suppression-shells-assault-phase@1',parameters:row=>({paymentCardInstanceIds:row.parameterSchema.paymentCardInstanceIds.const})};
      } else {
        assert.equal(current.pendingOfficialChargeDeclaration.stage,'ready');
        const penalty=projectOfficialChargeSpeedDebuffV1(current,current.pieces.find(p=>p.id==='zergling'));
        assert.equal(penalty.speedPenalty,3);
        await save(dir+'/effect.json',{speedPenalty:penalty.speedPenalty,charged:specId});
        command={kind:'finite',select:row=>row.action.actionType==='roll_declared_charge'};
      }
    } else if(branch==='magrail'&&room.stateRevision===0) {
      const unused=runtime.queryWeaponCharacteristics(current,specId,{weaponName:'Quad K12',attackKind:'ranged'}).result.firstGameWeaponPierce;
      assert.equal(unused.remainingUses,1);
      command={select:row=>row.pieceId===specId&&nested(row,'weaponName')==='Quad K12',parameters:()=>({targetUnitId:'zergling'})};
    } else if (room.stateRevision===0) {
      const id=nas[branch];
      const d=domains.find(row=>nested(row,'definitionId')===id && row.pieceId===specId);
      assert(d,'chosen source missing from formal action menu');
      const parameters={activeUnitId:specId,paymentCardInstanceIds:d.parameterSchema.paymentCardInstanceIds.enum[0]};
      if(branch==='mark') parameters.targetUnitId='zergling';
      if(branch==='griffin') {
        parameters.coordinate={xMilliInches:18000,yMilliInches:10000};
        const query=runtime.queryGriffinPlacement(current,specId,parameters);
        const planned=nested(query.result.action,'unitLifecyclePlan');
        assert(planned?.canonicalParameters.friendlyRangeProof.qualifyingFriendlyUnits.some(unit=>unit.pieceId===specId));
        await save(dir+'/placement.json',{pieceId:planned.canonicalParameters.createdPieceId,parameters,queryReceiptHash:query.queryReceiptHash});
      }
      command={select:row=>row.domainId===d.domainId,parameters:()=>parameters};
    } else if (current.selectedRosterActivationWindow?.pieceId===specId && current.phase==='movement') {
      command={choice:{actionType:'finish_activation',pieceId:specId},parameters:()=>({})};
    } else {
      const chooseSource=domains.find(row=>row.parameterSchema.required.includes('sourcePieceId'));
      if (chooseSource) {
        const sourcePieceId=chooseSource.parameterSchema.sourcePieceId.enum[0];
        const receipt=runtime.querySabotageDrone(current,sourcePieceId);
        assert(receipt.scope.targets.some(t=>t.targetUnitId===sourcePieceId&&t.baseHits===5&&t.additionalHits===5));
        await save(dir+'/blast.json',{sourcePieceId,targets:receipt.scope.targets,range:receipt.scope.rangeMilliInches,queryReceiptHash:receipt.queryReceiptHash});
        command={select:row=>row.domainId===chooseSource.domainId,parameters:()=>({sourcePieceId})};
      } else {
        const first=options.find(a=>['begin_sabotage_drone_phase_end','complete_sabotage_drone_phase_end'].includes(a.actionType))
          ??options.find(a=>a.actionType==='choose_first_actor'&&a.chosenFirstActorSideKey==='player1')
          ??options.find(a=>a.actionType==='pass_reaction_family_window')
          ??options.find(a=>a.actionType==='pass')??(options.length===1?options[0]:null);
        if (first) command={kind:'finite',select:row=>row.action.sourceActionHash===first.sourceActionHash};
        else {
          const pool=domains.find(row=>row.parameterSchema.required.some(k=>['casualtySelectionHash','casualtyModelIds','convertedFailedArmourDieIndices','precisionDieIndices'].includes(k)));
          assert(pool,'unrecognised defence or continuation menu at r'+room.stateRevision);
          command={select:row=>row.domainId===pool.domainId,parameters:row=>poolParameters(row)};
        }
      }
    }
    const applied=await app.commit({roomId,credential:seats[side],operationKey:'r'+room.stateRevision,...command});
    room=await app.store.loadRoom(roomId);
    const s=room.envelope.state, events=applied.preview.core.result.events;
    trace.push({revision:room.stateRevision,side,action:applied.preview.core.action.actionType,phase:s.phase,events:events.map(e=>e.type),stateHash:room.envelope.stateHash});
    await save(dir+'/trace.json',trace);
    if(!assaultBranch && room.stateRevision===1) await verifyEffect(s);
  }
  const end=room.envelope.state;
  if(branch==='griffin') {
    assert.equal(end.phase,'combat');
    assert.equal(end.sabotageDronePhaseEndCompletedRound,1);
    assert.equal(trace.filter(r=>r.events.includes('phase_advanced')&&r.phase==='combat').length,1);
  } else if(branch==='suppression') {
    assert.equal(end.pendingAction.stage,'resolve_charge_after_roll');
    assert.equal(end.pendingAction.maxDistanceMilliInches,(end.pendingAction.chargePlan.speedInches+end.pendingAction.chargeRoll)*1000);
  } else if(branch==='magrail') {
    const shot=end.log.flatMap(r=>r.events||[]).find(e=>e.type==='ranged_attack'&&e.pieceId===specId);
    assert.equal(shot.weaponName,'Quad K12');
    const spent=runtime.queryWeaponCharacteristics(end,specId,{weaponName:'Quad K12',attackKind:'ranged'}).result.firstGameWeaponPierce;
    assert.equal(spent.remainingUses,0);
    await save(dir+'/effect.json',{weapon:shot.weaponName,dice:shot.stages.hit.dice,target:shot.targetId,usesBefore:1,usesAfter:0});
  } else {assert.equal(end.activeSideKey,'player2');assert.equal(room.stateRevision,2);}
  await save(dir+'/result.json',{phase:end.phase,side:end.activeSideKey,revision:room.stateRevision,stateHash:room.envelope.stateHash});
} finally {app.close();}
const cold=open();
try {
  await cold.restoreDependencies(roomId,authority);
  const bundle=await cold.store.loadReplayBundle(roomId);
  const receipts=bundle.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt);
  const replay=cold.engine.replay({initialEnvelope:bundle.initialEnvelope,journal:receipts});
  const end=await cold.store.loadRoom(roomId);
  assert.equal(replay.ok,true);assert.deepEqual(replay.envelope,end.envelope);
  await save(dir+'/cold.json',{receipts:receipts.length,exact:true,stateHash:end.envelope.stateHash});
} finally {cold.close();}
}
async function verifyCasualtyFork() {
  assert.equal(branch,'magrail');
  const oldRoom=open();
  let pending;
  try {
    await oldRoom.restoreDependencies(roomId,authority);
    const bundle=await oldRoom.store.loadReplayBundle(roomId);
    const receipts=bundle.privateJournal.filter(e=>e.payload.type==='accepted_transition').map(e=>e.payload.payload.receipt);
    const prefix=oldRoom.engine.replay({initialEnvelope:bundle.initialEnvelope,journal:receipts.slice(0,1)});
    assert.equal(prefix.ok,true);
    assert.equal(prefix.envelope.stateHash,(await read(dir+'/trace.json'))[0].stateHash);
    pending=prefix.envelope.state;
    assert.equal(pending.activeSideKey,'player2');assert(pending.pendingCurrentProductRangedCasualtyChoice);
  } finally {oldRoom.close();}
  const target=dir+'/casualty-fork-v231', newId=roomId+'-r1-v231';
  const candidate=createOfficialReleaseMatchRuntimeV2({context:source,state,candidateVersion:'2.31.0'});
  await save(target+'/runtime.json',candidate.descriptor);
  const updated=createOfficialReleaseManifestV2({releaseId:original.releaseId,dataset:source.dataset,snapshot:source.snapshot,
    sourceRevision:await read(frozen.sourceRevisionRef),sourceRevisionRef:frozen.sourceRevisionRef,
    snapshotRef:frozen.snapshotRef,datasetRef:frozen.datasetRef,sourcePolicy:frozen.policy,referenceSources:frozen.references,
    components:{...original.components,rulesRuntime:{ref:target+'/runtime.json',version:candidate.descriptor.runtimeVersion,
      integrity:{field:'runtimeHash',value:candidate.descriptor.runtimeHash}}}});
  const repairedContext=await resolve(updated,'area_ability_component');
  const repaired=createOfficialReleaseMatchRuntimeV2({context:repairedContext,state,boundRuntimeManifest:updated});
  const oldCharge=runtime.enumerate(pending).parameterDomains.find(d=>d.actionType==='charge');
  assert(oldCharge);
  const model=id=>pending.pieces.find(p=>p.id===id).models[0].id;
  const charge={leadingModelId:model('zergling'),targets:[{unitId:specId,modelId:model(specId)}]};
  const rejected=runtime.instantiate(pending,oldCharge,charge).action;
  assert.throws(()=>repaired.instantiate(pending,oldCharge,charge),/RELEASE_RANGED_CONTINUATION_REQUIRED/);
  assert.throws(()=>repaired.apply(pending,rejected,{}),/RELEASE_RANGED_CONTINUATION_REQUIRED/);
  const forkAuthority=createWave3ComponentEngineeringAuthorityV1({context:repairedContext,state:pending,scenario:{
    scope:'saved_signed_magrail_casualty',source:dir+'/trace.json',sourceRevision:1}});
  const make=()=>openWave3EngineeringRoomV1({directory:path.join(root,target),filename:'room.sqlite',
    rulesRuntime:bindOfficialReleaseRulesRuntimeV2({context:repairedContext,runtime:repaired})});
  const fresh=make();
  try {
    const seats=await fresh.create(newId,forkAuthority);
    const room=await fresh.store.loadRoom(newId);
    if(room.stateRevision===0) {
      const menu=await fresh.room.legalSpace({roomId:newId,seatToken:seats.player2.seatToken});
      assert(menu.ok);
      assert.equal(menu.legalSpace.finiteActions.length,0);
      assert.deepEqual(menu.legalSpace.parameterDomains.map(d=>d.parameterSchema.required),[['casualtySelectionHash']]);
      await save(target+'/menu.json',{previous:['casualtySelectionHash','charge'],current:['casualtySelectionHash'],
        stalePreviewRejected:true,staleApplyRejected:true,sourceSnapshotHash:(await read(dir+'/trace.json'))[0].stateHash});
      await fresh.commit({roomId:newId,credential:seats.player2,operationKey:'choose-casualties',
        select:row=>row.parameterSchema.required.includes('casualtySelectionHash'),parameters:poolParameters});
    }
  } finally {fresh.close();}
  const cold=make();
  try {
    await cold.restoreDependencies(newId,forkAuthority);
    const room=await cold.store.loadRoom(newId);
    assert.equal(room.stateRevision,1);
    assert(!room.envelope.state.pendingCurrentProductRangedCasualtyChoice);
    const resolved=room.envelope.state.log.flatMap(r=>r.events||[]).find(e=>e.type==='ranged_attack'&&e.pieceId===specId);
    assert.equal(resolved.weaponName,'Quad K12');
    const archive=await cold.store.loadReplayBundle(newId);
    const receipts=archive.privateJournal.filter(e=>e.payload.type==='accepted_transition').map(e=>e.payload.payload.receipt);
    const replay=cold.engine.replay({initialEnvelope:archive.initialEnvelope,journal:receipts});
    assert.equal(replay.ok,true);assert.deepEqual(replay.envelope,room.envelope);
    await save(target+'/result.json',{replayedPrefixFrom230:1,replayedNewReceipts:receipts.length,attackResolved:true,
      coldExact:true,originalRuntimeHash:runtime.descriptor.runtimeHash,newRuntimeHash:repaired.descriptor.runtimeHash});
  } finally {cold.close();}
}
if (process.argv.includes('--casualty-fork')) await verifyCasualtyFork();
else await verifyCurrentRoom();
