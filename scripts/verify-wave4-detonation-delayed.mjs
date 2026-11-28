import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4StukovUnitInputsV2} from './compile-wave4-stukov-units-v2.mjs';
import {loadWave4StukovUnitInputsV3} from './compile-wave4-stukov-units-v3.mjs';
import {createWave4DetonationDelayedScene,BILE_ID,DRONE_ID,GRIFFIN_ID} from './support/wave4-detonation-delayed-room-v1.mjs';
import {bindWave4TurretRoom} from './support/wave4-turret-room-v1.mjs';
import {timingParameters} from './support/wave4-timing-room-v1.mjs';
import {inspectOfficialMultiModelCasualtySelectionV1} from '../packages/rule-atoms/official-multi-model-casualty-resolution-kernel-v1.mjs';
import {createOfficialCharacteristicStatusComponentRuntimeV2} from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import {atomicWrite} from './lib/development-context.mjs';
import {selectWave4SourceArmourFixtureIdentity} from './support/wave4-fixture-match-identity-v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),bileInputs=await loadWave4StukovUnitInputsV2(root),resume=process.argv.find(a=>a.startsWith('--resume='))?.slice(9),
 directory=resume?path.resolve(root,resume):await fs.mkdtemp(path.join(root,'build/wave4-web/stukov-units/detonation-delayed-')),results=[],controls=[];
assert.ok(directory.startsWith(path.join(root,'build/wave4-web/stukov-units/detonation-delayed-')));
function parameters(s,d){const schema=d.parameterSchema||d.sourceDomain.parameterSchema;
 if(schema.required.includes('casualtyModelIds')){const p=s.pendingOfficialAutomaticHits,contract=p.casualtyDomain.selectionContract,casualtyModelIds=[];
  while(casualtyModelIds.length<contract.casualtyCount){const g=inspectOfficialMultiModelCasualtySelectionV1({targetPieceId:p.targetPieceId,selectionContract:contract,casualtyModelIds,complete:false});assert.ok(g.valid&&g.legalNextModelIds.length);casualtyModelIds.push(g.legalNextModelIds[0]);}return{casualtyModelIds};}
 if(d.actionType==='move'){const p=s.pieces.find(p=>p.id==='actor'),m=p.models[0];return{leadingModelId:m.id,path:[{xMilliInches:Math.round(m.xInches*1000),yMilliInches:Math.round(m.yInches*1000)+100,elevation:'ground',supportTerrainIds:[]}],placements:[]};}
 return timingParameters(d);
}
for(const kind of ['bile','drone']){
 const inputs=kind==='drone'?await loadWave4StukovUnitInputsV3(root):bileInputs;
 const old=createWave4DetonationDelayedScene(inputs,{kind,beforeCasualtyPolicyVersion:'1.5.0'});
 assert.throws(()=>createOfficialCharacteristicStatusComponentRuntimeV2({context:inputs.context,spatialState:old.state,definitionIds:old.characteristicRuntimeDefinitionIds,
  sourceDefinitionIds:old.sourceDefinitionIds,...old.runtimeOptions}),/BEFORE_CASUALTY_EXTERNAL_HITS_OWNER_NOT_ADMITTED/);
 for(const use of [true,false])for(let attempt=0;attempt<16;attempt++){
  const id=kind+'-'+(use?'use':'decline'),caseDirectory=path.join(directory,id+'-'+attempt),roomId='wave4-detonation-delayed-'+id+'-'+attempt;
  const saved=await fs.readFile(path.join(caseDirectory,'result.public.json'),'utf8').then(JSON.parse).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
  if(saved){if(saved.coverageSatisfied){results.push(saved);break;}controls.push(saved);continue;}
  const armoryControl=kind==='drone'&&use&&attempt===5,fixedIdentity=kind==='drone'&&use&&attempt>=12,
   scene=createWave4DetonationDelayedScene(inputs,{kind,protectDroneSource:armoryControl,...(fixedIdentity?{targetInstanceId:'zz-defender'}:{})}),
   bound=await bindWave4TurretRoom({inputs,...scene,directory:caseDirectory});let native=bound.open(),expected,identitySelection;const trace=[],frames=new Map();
  async function drive(native,credentials,{stopAtSourceRoll=false,traceTarget=trace,framesTarget=frames}={}){
   for(let step=0;step<85;step++){
    const h=await native.store.loadRoom(roomId),s=h.envelope.state,drone=kind==='drone',stack=s.officialBeforeCasualtyContinuations||[];
    for(const f of stack){framesTarget.set(f.continuationId,f);assert.equal(f.activationContext.activationId,null);assert.ok(f.suspendedHostSlots[drone?'pendingSabotageDronePhaseEnd':'pendingCorrosiveBileResolution']);}
    if(s.round===2&&s.phase==='movement')break;
    const menu=bound.runtime.enumerate(s,{matchBinding:h.envelope.matchBinding});let d,c,p;
    const producerUsed=drone?s.unitLifecycleUseHistory?.some(r=>r.definitionId===GRIFFIN_ID):s.corrosiveBileUseHistory?.length;
    if(!producerUsed&&s.phase==='movement'){
     d=menu.parameterDomains.find(d=>d.definitionId===(drone?GRIFFIN_ID:BILE_ID));
     if(d)p=drone?{activeUnitId:'actor',paymentCardInstanceIds:[],coordinate:scene.droneCoordinate}:
      {paymentCardInstanceIds:d.parameterSchema.paymentCardInstanceIds.choices[0],placements:[{modelId:s.pieces.find(p=>p.id==='actor').models[0].id,...scene.bileCoordinate}]};
    }
    if(!d&&s.pendingOfficialReactionWindow)d=(use?menu.parameterDomains.find(d=>d.effectKind==='before_casualty_detonation'):null)||menu.parameterDomains.find(d=>d.actionType==='pass_reaction_family_window');
    if(!d&&s.pendingOfficialAutomaticHits)d=menu.parameterDomains[0];
    const chosenFirstActorSideKey=s.phase==='assault'?'player2':'player1';
    if(!d)c=menu.candidates.find(c=>c.actionType==='choose_first_actor'&&c.sourceAction.chosenFirstActorSideKey===chosenFirstActorSideKey);
    if(!d&&!c)d=menu.parameterDomains.find(d=>d.actionType==='finish_activation');
    if(!d&&!c&&s.phase==='movement'&&s.selectedRosterActivationWindow?.pieceId==='actor')d=menu.parameterDomains.find(d=>d.actionType==='move'&&d.pieceId==='actor');
    if(!d&&!c)c=menu.candidates.find(c=>/pass/.test(c.actionType))||menu.candidates[0];
    if(!d&&!c)d=menu.parameterDomains[0];assert.ok(d||c,'DELAYED_DETONATION_SUCCESSOR_REQUIRED:'+JSON.stringify({kind,phase:s.phase,menu}));
    if(stopAtSourceRoll&&c?.actionType==='roll_automatic_hits_armour_pool'){
     const targetOf=a=>a&&(a.targetId||targetOf(a.sourceAction));assert.equal(targetOf(c),'special:1:sabotage_drone');const b=await native.store.loadReplayBundle(roomId),journal=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt);
     assert.ok(journal.every(r=>!r.chanceReveal));
     const space=native.engine.legalSpace(h.envelope,{internalServerAuthority:true,sideKey:c.sideKey}),finite=space.finiteActions.find(r=>r.action.actionType===c.actionType&&targetOf(r.action)===targetOf(c));assert.ok(finite);
     return{...selectWave4SourceArmourFixtureIdentity({native,head:h,finite}),probeSetupAcceptedActions:journal.length};
    }
    if(identitySelection&&h.stateRevision===identitySelection.prefixRevision){assert.equal(h.envelope.stateHash,identitySelection.prefixStateHash);assert.equal(h.envelope.matchBindingHash,identitySelection.bindingHash);}
    const result=await native.commit({roomId,credential:credentials[(d||c).sideKey||s.activeSideKey||s.firstPlayerSideKey],operationKey:'step-'+h.stateRevision,
     ...(d?{select:r=>r.domainId===d.domainId,parameters:()=>p||parameters(s,d)}:{kind:'finite',select:r=>r.action.actionType===c.actionType
      &&(c.actionType!=='choose_first_actor'||r.action.sourceAction.chosenFirstActorSideKey===chosenFirstActorSideKey)})});
    assert.equal(result.idempotentReplayVerified,true);traceTarget.push({revision:h.stateRevision+1,round:s.round,phase:s.phase,actionType:(d||c).actionType,definitionId:d?.definitionId||null,stackDepth:stack.length});console.log(JSON.stringify({id,probe:stopAtSourceRoll,...traceTarget.at(-1)}));
   }
   if(stopAtSourceRoll)throw Error('WAVE4_FIRST_SOURCE_ROLL_PREFIX_REQUIRED');
  }
  if(fixedIdentity){
   const ref=path.join(caseDirectory,'identity-selection.public.json');identitySelection=await fs.readFile(ref,'utf8').then(JSON.parse).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
   if(!identitySelection){const probe=bound.open({filename:':memory:',directory:path.join(caseDirectory,'identity-probe')});
    try{const credentials=await probe.create(roomId,bound.authority,{matchId:'wave4-prefix-template'});identitySelection=await drive(probe,credentials,{stopAtSourceRoll:true,traceTarget:[],framesTarget:new Map()});}
    finally{probe.close();}await atomicWrite(ref,JSON.stringify(identitySelection,null,2));}
  }
  try{const credentials=await native.create(roomId,bound.authority,identitySelection?{matchId:identitySelection.matchId}:{});
   if(resume){const b=await native.store.loadReplayBundle(roomId),journal=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt),definition=a=>a&&(a.definitionId||definition(a.sourceAction));
    for(const r of journal){trace.push({revision:r.postStateRevision,actionType:r.action.actionType,definitionId:definition(r.action)||null,restoredFromSignedJournal:true});
     if(r.events.some(e=>e.type==='before_casualty_batch_interrupted')){const replay=native.engine.replay({initialEnvelope:b.initialEnvelope,journal:journal.slice(0,r.postStateRevision)});assert.equal(replay.ok,true);for(const f of replay.envelope.state.officialBeforeCasualtyContinuations||[])frames.set(f.continuationId,f);}}
   }
   await drive(native,credentials);
   expected=await native.store.loadRoom(roomId);const s=expected.envelope.state,events=s.log.flatMap(l=>l.events||[]),drone=kind==='drone';
   assert.equal(s.phase,'movement');assert.equal(s.round,2);
   assert.ok(!s.pendingCorrosiveBileResolution&&!s.pendingSabotageDronePhaseEnd&&!s.pendingOfficialAutomaticHits&&!s.officialBeforeCasualtyContinuations?.length&&!s.pieces.some(p=>p.officialBeforeCasualtyReservations?.length));
   if(drone){assert.equal(s.unitLifecycleUseHistory.filter(r=>r.definitionId===GRIFFIN_ID).length,1);assert.equal(s.sabotageDronePhaseEndCompletedRound,1);assert.equal(events.filter(e=>e.type==='sabotage_drone_source_effect_completed').length,1);
    const source=s.pieces.find(p=>p.officialUnitRecordKey==='army_units:sabotage_drone');assert.ok(source.isDestroyed||source.isOnField===false);}
   else{assert.equal(s.corrosiveBileUseHistory.length,1);assert.equal(s.resolvedCorrosiveBileEffects.length,1);assert.equal(s.officialMissionRuntimeState.scoringHistory.length,1);assert.ok(!s.board.tokens.some(t=>t.tokenKind==='corrosive_bile'));}
   if(identitySelection){const original=events.find(e=>e.type==='automatic_hits_damage'&&e.sourceDefinitionId===DRONE_ID&&e.targetId==='special:1:sabotage_drone');assert.ok(original);assert.deepEqual(original.stages.armourRolls,identitySelection.predictedFirstArmourRolls);}
   if(armoryControl)assert.equal(s.officialReactionHistory.filter(r=>r.definitionId==='card:armory/vehicle-plating-any@2').length,0);
   for(const f of frames.values())for(const row of f.rows){const es=events.filter(e=>e.type==='automatic_hits_damage'&&e.targetId===row.targetPieceId&&e.stages.resolutionHash===row.attackResolutionHash);assert.equal(es.length,1);assert.deepEqual(es[0].casualtyModelIds,row.casualty.casualtyModelIds);}
   const losses=events.filter(e=>e.type==='supply_loss_recorded'&&e.round===1);assert.equal(losses.length,new Set(losses.map(e=>e.entryHash)).size);
   for(const original of scene.state.pieces)assert.equal(losses.filter(e=>e.unitId===original.id).reduce((n,e)=>n+e.supplyDelta,0),original.currentSupply-s.pieces.find(p=>p.id===original.id).currentSupply);
  }finally{native.close();}
  const s=expected.envelope.state,events=s.log.flatMap(l=>l.events||[]),sourceId=kind==='bile'?'actor':s.pieces.find(p=>p.officialUnitRecordKey==='army_units:sabotage_drone').id,
   sourceKilledByDetonation=events.some(e=>e.type==='automatic_hits_damage'&&e.targetId===sourceId&&DETONATION_SOURCE(e.sourceDefinitionId)&&e.casualtyModelIds.length),
   coverageSatisfied=frames.size>0&&(!use||sourceKilledByDetonation);
  if(coverageSatisfied){native=bound.open();try{await native.restoreDependencies(roomId,bound.authority);const b=await native.store.loadReplayBundle(roomId),journal=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt),replay=native.engine.replay({initialEnvelope:b.initialEnvelope,journal});assert.equal(replay.ok,true);assert.deepEqual(replay.envelope,expected.envelope);}finally{native.close();}}
  const result={id,kind,use,attempt,armoryControl,...(identitySelection?{identitySelection}:{}),roomId,directoryRef:path.relative(root,caseDirectory),signedActions:expected.stateRevision,stateHash:expected.envelope.stateHash,coverageSatisfied,
   trace,frames:[...frames.values()].map(f=>({hostKind:f.hostKind,rows:f.rows,activationContext:f.activationContext})),sourceId,sourceKilledByDetonation,
   actualMovementProducer:true,fullNativeRound:true,scope:'actual R1 start, Movement producer, Assault-end effect, scoring and cleanup through R2 Movement',
   originalDiceAndCasualtyOrderPreserved:true,supplyExactlyOnce:true,idempotencyVerified:true,coldReplay:coverageSatisfied};
  await atomicWrite(path.join(caseDirectory,'result.public.json'),JSON.stringify(result,null,2));if(!coverageSatisfied){controls.push(result);assert.ok(attempt<15,'DELAYED_COVERAGE_NOT_REACHED');continue;}results.push(result);break;
 }
}
function DETONATION_SOURCE(id){return ['unit:infested_marine/detonation-any-phase@1','unit:infested_trooper/detonation-any-phase@1'].includes(id);}
await atomicWrite(path.join(root,'docs/development/wave4/evidence/detonation-delayed.public.json'),JSON.stringify({schema:'starcraft_tmg_wave4_detonation_delayed_v1',status:'passed_scoped',
 runRef:path.relative(root,directory),results,controls,newGameAtomsImplemented:0,implementedCumulativeAtoms:6,sourceHeldDefinitions:39,fullMatchAdmission:false,modelCalls:0,trainingTruth:false},null,2));
