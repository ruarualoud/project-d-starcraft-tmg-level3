import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4VirusEffectsInputs} from './compile-wave4-virus-effects.mjs';
import {bindWave4TurretRoom} from './support/wave4-turret-room-v1.mjs';
import {createWave4VirusCreepScene,CREEP_SPREAD} from './support/wave4-virus-creep-room-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const inputs=await loadWave4VirusEffectsInputs(root);
const parent=path.join(root,'build/wave4-web/virus-creep');await fs.mkdir(parent,{recursive:true});
const run=process.argv[2]?path.resolve(process.argv[2]):await fs.mkdtemp(path.join(parent,'run-'));const results=[];
assert.ok(run.startsWith(parent+path.sep));
for(const virusCard of ['healing_pathogen','weighted_pustule','hungering_infestation']){
 const scene=createWave4VirusCreepScene(inputs,{virusCard});
 const fullRound=virusCard==='healing_pathogen';
 if(!fullRound){scene.state.phase='movement';scene.state.stage='activation_phases';scene.state.phaseFirstActorByRound={'1:movement':{round:1,phase:'movement',markerHolderSideKey:'player1',chosenFirstActorSideKey:'player1'}};}
 const directory=path.join(run,fullRound?virusCard:virusCard+'-phase-v2');const bound=await bindWave4TurretRoom({inputs,...scene,directory});
 let native=bound.open(),expected,tokenId;const roomId='wave4-creep-'+virusCard;const trace=[];let stayed=false,moved=false;
 const checkpoint=await fs.readFile(path.join(directory,'checkpoint.json'),'utf8').then(JSON.parse).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
 if(checkpoint){
  try{await native.restoreDependencies(roomId,bound.authority);const bundle=await native.store.loadReplayBundle(roomId);
   const journal=bundle.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt);
   const replay=native.engine.replay({initialEnvelope:bundle.initialEnvelope,journal});assert.equal(replay.ok,true);assert.deepEqual(replay.envelope,checkpoint);
   const removal=checkpoint.state.log.flatMap(r=>r.events||[]).find(e=>e.type==='creep_tumor_removed');assert.ok(removal?.measurementResultHash);
   results.push({definitionId:scene.creepId,roomId,directoryRef:path.relative(root,directory),tokenId:removal.tokenId,
    signedActions:journal.length,stateHash:checkpoint.stateHash,runtimeHash:bound.runtime.descriptor.runtimeHash,nativeRoundsCompleted:fullRound?1:0,
    stayInPlayAfterCleanup:fullRound,enemyMoveEndRemoval:true,removal,coldReplay:true,idempotencyVerified:true,
    trace:journal.map(r=>({revision:r.postStateRevision,phase:r.action.phase,actionType:r.action.actionType}))});
   console.log(JSON.stringify({case:virusCard,status:'retained_signed_checkpoint',signedActions:journal.length}));
  }finally{native.close();}continue;
 }
 try{
  const credentials=await native.create(roomId,bound.authority);
  for(let step=0;step<60;step++){
   const head=await native.store.loadRoom(roomId),s=head.envelope.state;
   if(moved)break;
   const token=s.board.tokens.find(t=>t.tokenKind==='creep_tumor');
   if(token){tokenId=token.tokenId;assert.equal(token.stayInPlay,true);assert.equal(s.officialBattlefieldAssetBindings.find(b=>b.assetId===token.tokenId).displacement,true);}
   if(fullRound&&s.round===2&&!moved){assert.ok(token,'STAY_IN_PLAY_MUST_SURVIVE_NATIVE_CLEANUP');stayed=true;}
   const menu=bound.runtime.enumerate(s,{matchBinding:head.envelope.matchBinding});let d,c,p;
   if(!tokenId&&s.phase==='movement'){
    d=menu.parameterDomains.find(row=>row.definitionId===CREEP_SPREAD);
    if(d)p={activeUnitId:'actor',paymentCardInstanceIds:[],coordinate:scene.center};
   }
   if(!d&&(s.round===2||!fullRound)&&s.phase==='movement'&&tokenId){
    d=menu.parameterDomains.find(row=>row.actionType==='move'&&row.pieceId==='enemy');
    if(d){p=scene.enemyMove;moved=true;}
   }
   if(!d)c=menu.candidates.find(row=>row.actionType==='choose_first_actor'&&row.sourceAction.chosenFirstActorSideKey===(s.round===2?'player2':'player1'));
   if(!d&&!c){d=menu.parameterDomains.find(row=>row.actionType==='finish_activation');if(d)p={};}
   if(!d&&!c)c=menu.candidates.find(row=>/pass/.test(row.actionType))||menu.candidates[0];
   assert.ok(d||c,'CREEP_ROUND_SUCCESSOR_REQUIRED:'+JSON.stringify({round:s.round,phase:s.phase,domains:menu.parameterDomains.map(r=>({type:r.actionType,id:r.definitionId})),finite:menu.candidates.map(r=>r.actionType)}));
   const choice=d||c,sideKey=choice.sideKey||s.activeSideKey||s.firstPlayerSideKey;
   const receipt=await native.commit({roomId,credential:credentials[sideKey],operationKey:'step-'+head.stateRevision,
    ...(d?{select:row=>row.domainId===d.domainId,parameters:()=>p}:{kind:'finite',select:row=>row.action.actionType===c.actionType
      &&(c.actionType!=='choose_first_actor'||row.action.sourceAction?.chosenFirstActorSideKey===c.sourceAction.chosenFirstActorSideKey)})});
   assert.equal(receipt.idempotentReplayVerified,true);
   trace.push({revision:head.stateRevision+1,round:s.round,phase:s.phase,actionType:choice.actionType,definitionId:choice.definitionId||null});
   console.log(JSON.stringify({case:virusCard,...trace.at(-1)}));
  }
  expected=await native.store.loadRoom(roomId);const s=expected.envelope.state;
  assert.ok((stayed||!fullRound)&&moved);assert.ok(tokenId);assert.ok(!s.board.tokens.some(t=>t.tokenId===tokenId),'ENEMY_MOVE_END_WITHIN_ONE_MUST_REMOVE');
  const removed=s.log.flatMap(r=>r.events||[]).find(e=>e.type==='creep_tumor_removed'&&e.tokenId===tokenId);assert.ok(removed);
  assert.equal(s.officialMissionRuntimeState.scoringHistory.length,fullRound?1:0);
  assert.ok(removed.measurementResultHash);assert.ok(removed.sourceFeatureHash);
  results.push({definitionId:scene.creepId,roomId,directoryRef:path.relative(root,directory),tokenId,
   signedActions:expected.stateRevision,stateHash:expected.envelope.stateHash,runtimeHash:bound.runtime.descriptor.runtimeHash,
   nativeRoundsCompleted:fullRound?1:0,stayInPlayAfterCleanup:fullRound,enemyMoveEndRemoval:true,removal:removed,trace,coldReplay:false,idempotencyVerified:true});
  await atomicWrite(path.join(directory,'checkpoint.json'),JSON.stringify(expected.envelope));
 }finally{native.close();}
 native=bound.open();try{await native.restoreDependencies(roomId,bound.authority);const bundle=await native.store.loadReplayBundle(roomId);
  const journal=bundle.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt);
  const replay=native.engine.replay({initialEnvelope:bundle.initialEnvelope,journal});assert.equal(replay.ok,true);assert.deepEqual(replay.envelope,expected.envelope);results.at(-1).coldReplay=true;
 }finally{native.close();}
}
const result={schema:'starcraft_tmg_wave4_virus_creep_native_v1',status:'passed_scoped',runRef:path.relative(root,run),results,
 newGameAtoms:0,implementedCumulativeAtoms:5,sourceHeldDefinitions:39,fullWave4Admission:false,modelCalls:0,trainingTruth:false};
await atomicWrite(path.join(run,'result.public.json'),JSON.stringify(result,null,2));
await atomicWrite(path.join(root,'docs/development/wave4/evidence/virus-creep.public.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({status:result.status,cases:results.length,signedActions:results.reduce((n,r)=>n+r.signedActions,0),runRef:result.runRef}));
