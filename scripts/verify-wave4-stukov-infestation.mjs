import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4StukovUnitInputs} from './compile-wave4-stukov-units.mjs';
import {createWave4StukovUnitScene} from './support/wave4-stukov-unit-room-v1.mjs';
import {bindWave4TurretRoom} from './support/wave4-turret-room-v1.mjs';
import {timingParameters} from './support/wave4-timing-room-v1.mjs';
import {projectOfficialContextualSupplyValueV1 as supply} from '../packages/rule-atoms/official-contextual-supply-projection-v1.mjs';
import {listOfficialPhaseActivationUnitIdsV1} from '../packages/rule-atoms/official-phase-activation-availability-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),inputs=await loadWave4StukovUnitInputs(root);
const parent=path.join(root,'build/wave4-web/stukov-units');await fs.mkdir(parent,{recursive:true});
const run=process.argv[2]?path.resolve(process.argv[2]):await fs.mkdtemp(path.join(parent,'infestation-'));const results=[];
assert.ok(run.startsWith(parent+path.sep));
const specs=[{id:'admiral-reactivate',exchange:true},{id:'admiral-skip',exchange:true,skip:true},
 {id:'trooper-restoration',actor:'trooper',phase:'assault',restore:true},{id:'warden-round',fullRound:true}];
for(const spec of specs){
 const scene=createWave4StukovUnitScene(inputs,{phase:spec.phase||'movement',preactivateMarine:!spec.fullRound});
 if(spec.fullRound)Object.assign(scene.state,{phase:'start_of_round',stage:'mission_start_of_round',phaseFirstActorByRound:{}});
 const directory=path.join(run,spec.fullRound?spec.id+'-native-start':spec.id),bound=await bindWave4TurretRoom({inputs,...scene,directory});
 let native=bound.open(),expected;const roomId='wave4-stukov-'+spec.id,trace=[];let spread=false,exchanged=false,restored=false,infectedProjection,reactivatedMoveCompleted=false;
 const completed=await fs.readFile(path.join(directory,'result.public.json'),'utf8').then(JSON.parse).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
 if(completed){try{await native.restoreDependencies(roomId,bound.authority);const bundle=await native.store.loadReplayBundle(roomId);
  const journal=bundle.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt);
  const replay=native.engine.replay({initialEnvelope:bundle.initialEnvelope,journal});assert.equal(replay.ok,true);
  assert.equal(replay.envelope.stateHash,completed.stateHash);assert.deepEqual(replay.envelope,(await native.store.loadRoom(roomId)).envelope);
  results.push(completed);console.log(JSON.stringify({case:spec.id,status:'retained_signed_checkpoint',signedActions:journal.length}));
 }finally{native.close();}continue;}
 try{
  const credentials=await native.create(roomId,bound.authority);
  const start=await native.store.loadRoom(roomId);
  if(start.stateRevision){
   const bundle=await native.store.loadReplayBundle(roomId),journal=bundle.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt);
   const replay=native.engine.replay({initialEnvelope:bundle.initialEnvelope,journal});assert.equal(replay.ok,true);assert.deepEqual(replay.envelope,start.envelope);
   trace.push(...journal.map(r=>({revision:r.postStateRevision,phase:r.action.phase,actionType:r.action.actionType})));
   const events=start.envelope.state.log.flatMap(r=>r.events||[]);spread=events.some(e=>e.type==='infestation_status_applied');
   exchanged=events.some(e=>e.type==='infestation_activation_exchanged');
   restored=(start.envelope.state.officialReactionHistory||[]).some(r=>r.definitionId==='unit:medic/restoration-any-phase@1');
   if(spread)infectedProjection=supply({state:start.envelope.state,pieceId:'enemy',context:'mission_marker_control'});
  }
  for(let step=0;step<60;step++){
   const head=await native.store.loadRoom(roomId),s=head.envelope.state;
   if(!spec.fullRound&&spread&&(spec.exchange?(spec.skip?exchanged:reactivatedMoveCompleted):!s.pendingOfficialReactionWindow))break;
   if(spec.fullRound&&s.round===2)break;
   const menu=bound.runtime.enumerate(s,{matchBinding:head.envelope.matchBinding});let d,c,p;
   if(!spread){
    const actor=spec.actor||'stukov';d=menu.parameterDomains.find(r=>r.pieceId===actor&&r.effectKind==='infestation_spread');
    if(d){p={activeUnitId:actor,paymentCardInstanceIds:['faction:player1'],targetUnitId:'enemy'};spread=true;}
    else c=menu.candidates.find(r=>r.actionType==='choose_first_actor'&&r.sourceAction.chosenFirstActorSideKey==='player1')
      ||menu.candidates.find(r=>r.actionType==='resolve_mission_start_of_round');
   }else if(s.pendingOfficialReactionWindow){
    d=spec.restore&&menu.parameterDomains.find(r=>r.definitionId==='unit:medic/restoration-any-phase@1')
     ||menu.parameterDomains.find(r=>r.actionType==='pass_reaction_family_window');assert.ok(d);p=timingParameters(d);
    if(d.definitionId==='unit:medic/restoration-any-phase@1')restored=true;
   }else if(spec.exchange&&!exchanged){
    d=menu.parameterDomains.find(r=>r.effectKind==='infestation_activation_exchange');assert.ok(d);
    assert.ok(!d.parameterSchema.friendlyUnitId.enum.includes('stukov'),'UNIQUE_ACTOR_CANNOT_BE_READIED');
    p={activeUnitId:'stukov',paymentCardInstanceIds:['player1-tactical-2'],targetUnitId:'enemy',friendlyUnitId:spec.skip?'skip':'marine'};exchanged=true;
   }else if(spec.exchange&&!spec.skip&&exchanged&&s.activeSideKey==='player1'&&!s.selectedRosterActivationWindow){
    d=menu.parameterDomains.find(r=>r.actionType==='move'&&r.pieceId==='marine');assert.ok(d,'READIED_MARINE_MUST_HAVE_NATIVE_MOVE');
    const unit=s.pieces.find(u=>u.id==='marine');const positions=unit.models.map(m=>({modelId:m.id,xMilliInches:Math.round(m.xInches*1000)-500,
     yMilliInches:Math.round(m.yInches*1000),elevation:'ground',supportTerrainIds:[]}));
    p={leadingModelId:unit.models[0].id,path:[{xMilliInches:Math.round(unit.models[0].xInches*1000),yMilliInches:Math.round(unit.models[0].yInches*1000)},
     {xMilliInches:positions[0].xMilliInches,yMilliInches:positions[0].yMilliInches}],placements:positions.slice(1)};reactivatedMoveCompleted=true;
   }else{
    c=menu.candidates.find(r=>r.actionType==='choose_first_actor'&&r.sourceAction.chosenFirstActorSideKey==='player1');
    if(!c){d=menu.parameterDomains.find(r=>r.actionType==='finish_activation');if(d)p={};}
    if(!c&&!d)c=menu.candidates.find(r=>/pass/.test(r.actionType))||menu.candidates[0];
   }
   assert.ok(d||c,'STUKOV_SUCCESSOR_REQUIRED');const choice=d||c,sideKey=choice.sideKey||s.activeSideKey||s.firstPlayerSideKey;
   const receipt=await native.commit({roomId,credential:credentials[sideKey],operationKey:'step-'+head.stateRevision,
    ...(d?{select:r=>r.domainId===d.domainId,parameters:()=>p}:{kind:'finite',select:r=>r.action.actionType===c.actionType
      &&(c.actionType!=='choose_first_actor'||r.action.sourceAction.chosenFirstActorSideKey===c.sourceAction.chosenFirstActorSideKey)})});
   assert.equal(receipt.idempotentReplayVerified,true);const after=(await native.store.loadRoom(roomId)).envelope.state;
   if(choice.effectKind==='infestation_spread'){
    infectedProjection=supply({state:after,pieceId:'enemy',context:'mission_marker_control'});assert.equal(infectedProjection.effectiveSupply,1);
    assert.equal(supply({state:after,pieceId:'enemy',context:'disengage_check'}).effectiveSupply,2);
    assert.equal(supply({state:after,pieceId:'stukov',context:'mission_marker_control'}).effectiveSupply,2);
    assert.equal(supply({state:after,pieceId:'stukov',context:'supply_pool_calculation'}).effectiveSupply,1);
   }
   if(choice.effectKind==='infestation_activation_exchange'){
    assert.equal(after.pieces.find(p=>p.id==='marine').activatedPhases.movement,Boolean(spec.skip));
    assert.equal(listOfficialPhaseActivationUnitIdsV1(after,'player1').includes('marine'),!spec.skip);
   }
   trace.push({revision:head.stateRevision+1,round:s.round,phase:s.phase,actionType:choice.actionType,definitionId:choice.definitionId||null});
   console.log(JSON.stringify({case:spec.id,...trace.at(-1)}));
  }
  expected=await native.store.loadRoom(roomId);const s=expected.envelope.state,enemy=s.pieces.find(p=>p.id==='enemy');
  assert.ok(spread&&infectedProjection);
  if(spec.exchange){assert.ok(exchanged);assert.equal(enemy.activatedPhases.movement,true);assert.ok(!enemy.statuses.some(st=>String(st.statusName||st).toLowerCase()==='infestation'));
   if(!spec.skip)assert.ok(reactivatedMoveCompleted);
   assert.equal(s.officialInfestationActivationExchangeHistory.at(-1).friendlyUnitId,spec.skip?null:'marine');
  }
  if(spec.restore){assert.ok(restored);assert.ok(!enemy.statuses.some(st=>String(st.statusName||st).toLowerCase()==='infestation'));assert.equal(supply({state:s,pieceId:'enemy',context:'mission_marker_control'}).effectiveSupply,2);}
  if(spec.fullRound){assert.equal(s.round,2);assert.equal(s.officialMissionRuntimeState.scoringHistory.length,1);assert.ok(enemy.statuses.some(st=>String(st.statusName||st).toLowerCase()==='infestation'));}
  results.push({...spec,roomId,directoryRef:path.relative(root,directory),sourceDefinitionIds:scene.sourceDefinitionIds,
   signedActions:expected.stateRevision,stateHash:expected.envelope.stateHash,runtimeHash:bound.runtime.descriptor.runtimeHash,
   infectedProjection,reactivatedMoveCompleted,trace,missionState:spec.fullRound?s.officialMissionRuntimeState:null,idempotencyVerified:true,coldReplay:false});
  await atomicWrite(path.join(directory,'checkpoint.json'),JSON.stringify(expected.envelope));
 }finally{native.close();}
 native=bound.open();try{await native.restoreDependencies(roomId,bound.authority);const bundle=await native.store.loadReplayBundle(roomId);
  const journal=bundle.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt);
  const replay=native.engine.replay({initialEnvelope:bundle.initialEnvelope,journal});assert.equal(replay.ok,true);assert.deepEqual(replay.envelope,expected.envelope);results.at(-1).coldReplay=true;
 }finally{native.close();}
 await atomicWrite(path.join(directory,'result.public.json'),JSON.stringify(results.at(-1),null,2));
}
const result={schema:'starcraft_tmg_wave4_stukov_infestation_native_v1',status:'passed_scoped',runRef:path.relative(root,run),results,
 newGameAtoms:1,implementedCumulativeAtoms:6,sourceHeldDefinitions:39,engineeringEstimatedUnitGeometry:true,fullWave4Admission:false,modelCalls:0,trainingTruth:false};
await atomicWrite(path.join(run,'result.public.json'),JSON.stringify(result,null,2));
await atomicWrite(path.join(root,'docs/development/wave4/evidence/stukov-infestation.public.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({status:result.status,cases:results.length,signedActions:results.reduce((n,r)=>n+r.signedActions,0),runRef:result.runRef}));
