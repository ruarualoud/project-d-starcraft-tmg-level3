import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4StukovUnitInputsV3} from './compile-wave4-stukov-units-v3.mjs';
import {createWave4DetonationStormPhotonScene,STORM_ID,PHOTON_ID,AMBUSH_ID} from './support/wave4-detonation-storm-photon-room-v1.mjs';
import {createWave4DetonationPhotonScene,VENTRAL_ID} from './support/wave4-detonation-photon-room-v1.mjs';
import {bindWave4TurretRoom} from './support/wave4-turret-room-v1.mjs';
import {timingParameters} from './support/wave4-timing-room-v1.mjs';
import {inspectOfficialMultiModelCasualtySelectionV1} from '../packages/rule-atoms/official-multi-model-casualty-resolution-kernel-v1.mjs';
import {createOfficialCharacteristicStatusComponentRuntimeV2} from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),inputs=await loadWave4StukovUnitInputsV3(root),
 kind=process.argv.find(a=>a.startsWith('--kind='))?.slice(7)||'storm',resume=process.argv.find(a=>a.startsWith('--resume='))?.slice(9),
 directory=resume?path.resolve(root,resume):await fs.mkdtemp(path.join(root,'build/wave4-web/stukov-units/detonation-'+kind+'-')),
 results=[],controls=[];
console.log(JSON.stringify({kind,directoryRef:path.relative(root,directory)}));
assert.ok(['storm','photon'].includes(kind));assert.ok(directory.startsWith(path.join(root,'build/wave4-web/stukov-units/detonation-'+kind+'-')));
const storm=kind==='storm',sceneFor=options=>storm?createWave4DetonationStormPhotonScene(inputs,{kind,...options}):createWave4DetonationPhotonScene(inputs,options),
 old=sceneFor({beforeCasualtyPolicyVersion:'1.6.0'});
assert.throws(()=>createOfficialCharacteristicStatusComponentRuntimeV2({context:inputs.context,spatialState:old.state,
 definitionIds:old.characteristicRuntimeDefinitionIds,sourceDefinitionIds:old.sourceDefinitionIds,...old.runtimeOptions}),/BEFORE_CASUALTY_EXTERNAL_HITS_OWNER_NOT_ADMITTED/);
const definition=a=>a&&(a.definitionId||definition(a.sourceAction));
function parameters(s,d){const schema=d.parameterSchema||d.sourceDomain.parameterSchema;
 if(schema.required.includes('casualtyModelIds')){const p=s.pendingOfficialAutomaticHits,contract=p.casualtyDomain.selectionContract,casualtyModelIds=[];
  while(casualtyModelIds.length<contract.casualtyCount){const g=inspectOfficialMultiModelCasualtySelectionV1({targetPieceId:p.targetPieceId,selectionContract:contract,casualtyModelIds,complete:false});assert.ok(g.valid&&g.legalNextModelIds.length);casualtyModelIds.push(g.legalNextModelIds[0]);}return{casualtyModelIds};}
 return timingParameters(d);
}
for(const use of [true,false])for(let attempt=0;attempt<8;attempt++){
 const id=kind+'-'+(use?'use':'decline'),caseDirectory=path.join(directory,id+'-'+attempt),roomId='wave4-detonation-'+id+'-'+attempt,
 saved=await fs.readFile(path.join(caseDirectory,'result.public.json'),'utf8').then(JSON.parse).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
 if(saved){if(saved.coverageSatisfied){results.push(saved);break;}controls.push(saved);continue;}
 const scene=sceneFor({}),bound=await bindWave4TurretRoom({inputs,...scene,directory:caseDirectory});
 let native=bound.open(),expected;const trace=[],frames=new Map();
 try{const credentials=await native.create(roomId,bound.authority);
  if(resume){const b=await native.store.loadReplayBundle(roomId),journal=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt);
   for(const r of journal){trace.push({revision:r.postStateRevision,actionType:r.action.actionType,definitionId:definition(r.action)||null,restoredFromSignedJournal:true});
    if(r.events.some(e=>e.type==='before_casualty_batch_interrupted')){const replay=native.engine.replay({initialEnvelope:b.initialEnvelope,journal:journal.slice(0,r.postStateRevision)});assert.equal(replay.ok,true);for(const f of replay.envelope.state.officialBeforeCasualtyContinuations||[])frames.set(f.continuationId,f);}}
  }
  for(let step=0;step<85;step++){
   const h=await native.store.loadRoom(roomId),s=h.envelope.state,events=s.log.flatMap(l=>l.events||[]),stack=s.officialBeforeCasualtyContinuations||[];
   for(const f of stack){frames.set(f.continuationId,f);assert.ok(f.suspendedHostSlots[storm?'pendingOfficialPsionicStormAssaultOrder':'pendingOfficialPhotonOvercharge']);
    assert.equal(f.activationContext.activationId,null);if(!storm)assert.equal(f.activationContext.activeSideKey,'player1');}
   if(s.round===2&&s.phase==='movement')break;
   const menu=bound.runtime.enumerate(s,{matchBinding:h.envelope.matchBinding});let d,c,p;
   const producerUsed=storm?s.officialPsionicStormCenters?.length:s.pieces.find(p=>p.id==='actor').isOnField||s.pieces.find(p=>p.id==='actor').isDestroyed;
   if(storm&&!producerUsed&&s.phase==='movement'&&!s.pendingOfficialReactionWindow){
    d=menu.parameterDomains.find(d=>d.definitionId===STORM_ID);if(d){const raw=d.sourceDomain||d;p={coordinate:scene.stormCoordinate,paymentCardInstanceIds:raw.constraints.payments[0]};}
   }
   if(!storm&&!s.pendingOfficialReactionWindow&&!s.pendingOfficialAutomaticHits){
    if(s.round===1&&s.phase==='movement'&&!events.some(e=>e.type==='battlefield_asset_created')){
     d=menu.parameterDomains.find(d=>d.definitionId===VENTRAL_ID&&d.actionType==='resolve_battlefield_asset_ability');if(d)p={activeUnitId:'builder',paymentCardInstanceIds:[],coordinate:scene.beaconCoordinate};
    }
    const moved=events.some(e=>e.type==='unit_'+(s.phase==='movement'?'move':'run')+'_resolved'&&e.pieceId==='defender');
    if(!d&&s.round===1&&['movement','assault'].includes(s.phase)&&!moved){
     d=menu.parameterDomains.find(d=>d.pieceId==='defender'&&d.actionType===(s.phase==='movement'?'move':'run'));
     if(d){const actor=s.pieces.find(p=>p.id==='defender'),x=s.phase==='movement'?15500:19500,dx=x-Math.round(actor.models[0].xInches*1000);
      p={leadingModelId:actor.models[0].id,path:[{xMilliInches:x,yMilliInches:10000,elevation:'ground',supportTerrainIds:[]}],
       placements:actor.models.slice(1).map(m=>({modelId:m.id,xMilliInches:Math.round(m.xInches*1000)+dx,yMilliInches:Math.round(m.yInches*1000),elevation:'ground',supportTerrainIds:[],rotationDegrees:0}))};}
    }
    if(!d&&s.phase==='cleanup'&&!producerUsed){
     d=menu.parameterDomains.find(d=>d.pieceId==='actor'&&d.actionType==='resolve_unit_lifecycle_consumer'&&d.definitionId===VENTRAL_ID);
     if(d){const actor=s.pieces.find(p=>p.id==='actor'),raw=d.sourceDomain||d,c=raw.constraints.markerCoordinate,
       x=Math.round(c.x*1000-actor.models[0].baseWidthInches*500),y=Math.round(c.y*1000);
      p={placementPlan:{leadingModelId:actor.models[0].id,placements:actor.models.map((m,i)=>({modelId:m.id,xMilliInches:x+Math.round((m.baseWidthInches+0.05)*1000*(i===2?0.5:i)),
       yMilliInches:y+(i===2?Math.round((m.baseDepthInches+0.05)*1000*Math.sqrt(3)/2):0),rotationDegrees:0}))}};}
    }
   }
   if(!d&&s.pendingOfficialReactionWindow)d=(s.pendingOfficialReactionWindow.triggerKind==='reserve_entered_non_entry'
    ?menu.parameterDomains.find(d=>d.definitionId===PHOTON_ID):use?menu.parameterDomains.find(d=>d.effectKind==='before_casualty_detonation'):null)
     ||menu.parameterDomains.find(d=>d.actionType==='pass_reaction_family_window');
   if(!d&&s.pendingOfficialAutomaticHits)d=menu.parameterDomains[0];
   if(!d)c=menu.candidates.find(c=>c.actionType==='choose_first_actor'&&c.sourceAction.chosenFirstActorSideKey==='player1');
   if(!d&&!c)d=menu.parameterDomains.find(d=>d.actionType==='finish_activation');
   if(!d&&!c)c=menu.candidates.find(c=>/pass/.test(c.actionType))||menu.candidates[0];
   if(!d&&!c)d=menu.parameterDomains[0];assert.ok(d||c,'STORM_PHOTON_SUCCESSOR_REQUIRED:'+JSON.stringify({kind,phase:s.phase,menu}));
   const r=await native.commit({roomId,credential:credentials[(d||c).sideKey||s.activeSideKey||s.firstPlayerSideKey],operationKey:'step-'+h.stateRevision,
    ...(d?{select:r=>r.domainId===d.domainId,parameters:()=>p||parameters(s,d)}:{kind:'finite',select:r=>r.action.actionType===c.actionType
     &&(c.actionType!=='choose_first_actor'||r.action.sourceAction.chosenFirstActorSideKey==='player1')})});
   assert.equal(r.idempotentReplayVerified,true);trace.push({revision:h.stateRevision+1,round:s.round,phase:s.phase,actionType:(d||c).actionType,
    definitionId:d?.definitionId||null,stackDepth:stack.length});console.log(JSON.stringify({id,...trace.at(-1)}));
  }
  expected=await native.store.loadRoom(roomId);const s=expected.envelope.state,events=s.log.flatMap(l=>l.events||[]);
  assert.equal(s.round,2);assert.equal(s.phase,'movement');assert.equal(s.officialMissionRuntimeState.scoringHistory.length,1);
  assert.ok(!s.pendingOfficialAutomaticHits&&!s.pendingOfficialPhotonOvercharge&&!s.pendingOfficialPsionicStormAssaultOrder
   &&!s.pendingOfficialPsionicStormMovementEnd&&!s.officialBeforeCasualtyContinuations?.length&&!s.pieces.some(p=>p.officialBeforeCasualtyReservations?.length));
  if(storm){assert.ok(events.some(e=>e.type==='psionic_storm_movement_end_batch_completed'));assert.ok(events.some(e=>e.type==='psionic_storm_assault_end_rolled'));
   assert.ok(!s.board.tokens.some(t=>t.tokenKind==='psionic_storm'));assert.ok(!s.officialPsionicStormCenters.length);}
  else{assert.equal(events.filter(e=>e.type==='battlefield_asset_created').length,1);assert.equal(events.filter(e=>e.type==='reserve_deployed_via_special_entry'&&e.effectKind==='ventral_sacs_reserve_landing').length,1);assert.equal((s.officialReactionHistory||[]).filter(r=>r.definitionId===PHOTON_ID).length,1);}
  for(const f of frames.values())for(const row of f.rows){const es=events.filter(e=>['ability_direct_damage','automatic_hits_damage'].includes(e.type)&&e.targetId===row.targetPieceId&&e.stages.resolutionHash===row.attackResolutionHash);
   assert.equal(es.length,1);assert.deepEqual(es[0].casualtyModelIds,row.casualty.casualtyModelIds);}
  const losses=events.filter(e=>e.type==='supply_loss_recorded'&&e.round===1);assert.equal(losses.length,new Set(losses.map(e=>e.entryHash)).size);
  for(const original of scene.state.pieces)assert.equal(losses.filter(e=>e.unitId===original.id).reduce((n,e)=>n+e.supplyDelta,0),original.currentSupply-s.pieces.find(p=>p.id===original.id).currentSupply);
 }finally{native.close();}
 const s=expected.envelope.state,events=s.log.flatMap(l=>l.events||[]),sourceKilledByDetonation=events.some(e=>e.type==='automatic_hits_damage'&&e.targetId==='actor'&&e.sourceDefinitionId==='unit:infested_marine/detonation-any-phase@1'&&e.casualtyModelIds.length),
 counterTargetKilledByDetonation=events.some(e=>e.type==='automatic_hits_damage'&&e.targetId==='defender'&&e.sourceDefinitionId==='unit:infested_trooper/detonation-any-phase@1'&&e.casualtyModelIds.length),
 coverageSatisfied=frames.size>0&&(!use||(storm?sourceKilledByDetonation:counterTargetKilledByDetonation));
 if(coverageSatisfied){native=bound.open();try{await native.restoreDependencies(roomId,bound.authority);const b=await native.store.loadReplayBundle(roomId),journal=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt),replay=native.engine.replay({initialEnvelope:b.initialEnvelope,journal});assert.equal(replay.ok,true);assert.deepEqual(replay.envelope,expected.envelope);}finally{native.close();}}
 const result={id,kind,use,attempt,roomId,originalSourcePlanHash:[...frames.values()][0]?.hostData?.parent?.sourcePlanHash,directoryRef:path.relative(root,caseDirectory),signedActions:expected.stateRevision,stateHash:expected.envelope.stateHash,coverageSatisfied,trace,
  frames:[...frames.values()].map(f=>({hostKind:f.hostKind,rows:f.rows,activationContext:f.activationContext})),sourceKilledByDetonation,counterTargetKilledByDetonation,
  actualMovementProducer:true,fullNativeRound:true,originalDiceAndCasualtyOrderPreserved:true,supplyExactlyOnce:true,idempotencyVerified:true,coldReplay:coverageSatisfied};
 await atomicWrite(path.join(caseDirectory,'result.public.json'),JSON.stringify(result,null,2));if(!coverageSatisfied){controls.push(result);assert.ok(attempt<7,'STORM_PHOTON_COVERAGE_NOT_REACHED');continue;}results.push(result);break;
}
await atomicWrite(path.join(root,'docs/development/wave4/evidence/detonation-'+kind+'.public.json'),JSON.stringify({schema:'starcraft_tmg_wave4_detonation_'+kind+'_v1',status:'passed_scoped',runRef:path.relative(root,directory),results,controls,
 newGameAtomsImplemented:0,implementedCumulativeAtoms:6,sourceHeldDefinitions:39,fullMatchAdmission:false,modelCalls:0,trainingTruth:false},null,2));
