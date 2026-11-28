import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4StukovUnitInputsV2} from './compile-wave4-stukov-units-v2.mjs';
import {createWave4DetonationTargetScene} from './support/wave4-detonation-target-room-v1.mjs';
import {bindWave4TurretRoom} from './support/wave4-turret-room-v1.mjs';
import {timingParameters} from './support/wave4-timing-room-v1.mjs';
import {inspectOfficialMultiModelCasualtySelectionV1} from '../packages/rule-atoms/official-multi-model-casualty-resolution-kernel-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),inputs=await loadWave4StukovUnitInputsV2(root),resume=process.argv.find(a=>a.startsWith('--resume='))?.slice(9);
const directory=resume?path.resolve(root,resume):await fs.mkdtemp(path.join(root,'build/wave4-web/stukov-units/detonation-target-'));
assert.ok(directory.startsWith(path.join(root,'build/wave4-web/stukov-units/detonation-target-')));
const results=[],controls=[];
function parameters(s,d){const schema=d.parameterSchema||d.sourceDomain.parameterSchema;
 if(d.actionType==='ranged_attack'&&schema.required.includes('targetUnitId'))return{targetUnitId:'defender'};
 if(d.actionType==='declare_ranged_attack_before_target_reaction')return{targetUnitId:'defender'};
 if(schema.required.includes('casualtyModelIds')){const p=s.pendingCurrentProductRangedCasualtyChoice||s.pendingOfficialAutomaticHits,contract=p.casualtyDomain.selectionContract,casualtyModelIds=[];
  while(casualtyModelIds.length<contract.casualtyCount){const r=inspectOfficialMultiModelCasualtySelectionV1({targetPieceId:p.targetPieceId,selectionContract:contract,casualtyModelIds,complete:false});assert.ok(r.valid&&r.legalNextModelIds.length);casualtyModelIds.push(r.legalNextModelIds[0]);}return{casualtyModelIds};}
 if(d.actionType==='move'){const p=s.pieces.find(p=>p.id==='defiler'),leader=p.models[0],point=m=>({xMilliInches:Math.round(m.xInches*1000),yMilliInches:Math.round(m.yInches*1000)+100,elevation:'ground',supportTerrainIds:[]});
  return{leadingModelId:leader.id,path:[point(leader)],placements:p.models.slice(1).map(m=>({modelId:m.id,...point(m),rotationDegrees:0}))};}
 return timingParameters(d);
}
for(const spec of [{id:'dark-swarm-use-blocks',useDark:true},{id:'dark-swarm-decline-detonates',useDark:false}])for(let attempt=0;attempt<8;attempt++){
 const caseDirectory=path.join(directory,spec.id+'-'+attempt),roomId='wave4-detonation-target-'+spec.id+'-'+attempt;
 const saved=await fs.readFile(path.join(caseDirectory,'result.public.json'),'utf8').then(JSON.parse).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
 if(saved){if(saved.coverageSatisfied){results.push(saved);break;}controls.push(saved);continue;}
 const scene=createWave4DetonationTargetScene(inputs),bound=await bindWave4TurretRoom({inputs,...scene,directory:caseDirectory});
 let native=bound.open(),expected;const trace=[],frames=new Map();
 try{const credentials=await native.create(roomId,bound.authority);
  if(resume){const b=await native.store.loadReplayBundle(roomId),journal=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt),definition=a=>a&&(a.definitionId||definition(a.sourceAction));
   for(const r of journal){trace.push({revision:r.postStateRevision,actionType:r.action.actionType,definitionId:definition(r.action)||null,restoredFromSignedJournal:true});
    if(r.events.some(e=>e.type==='before_casualty_batch_interrupted')){const replay=native.engine.replay({initialEnvelope:b.initialEnvelope,journal:journal.slice(0,r.postStateRevision)});assert.equal(replay.ok,true);for(const f of replay.envelope.state.officialBeforeCasualtyContinuations||[])frames.set(f.continuationId,f);}}
  }
  for(let step=0;step<85;step++){
   const head=await native.store.loadRoom(roomId),s=head.envelope.state,stack=s.officialBeforeCasualtyContinuations||[];
   for(const f of stack){frames.set(f.continuationId,f);assert.ok(f.suspendedHostSlots.pendingOfficialAttackTargetReaction);}
   if(s.round===2&&s.phase==='movement')break;
   const menu=bound.runtime.enumerate(s,{matchBinding:head.envelope.matchBinding});let d,c,p;
   if(!s.gestateDarkSwarmUseHistory?.length&&s.phase==='movement'){d=menu.parameterDomains.find(d=>d.actionType==='set_dark_swarm');if(d)p={coordinate:scene.tokenCoordinate};}
   if(!d&&s.pendingOfficialReactionWindow){
    const trigger=s.pendingOfficialReactionWindow.triggerKind;
    if(trigger==='attack_target_selected'&&spec.useDark)d=menu.parameterDomains.find(d=>d.definitionId==='unit:defiler/dark-swarm-assault-phase@1');
    if(trigger==='before_casualty_batch'){
     const det=menu.parameterDomains.find(d=>d.effectKind==='before_casualty_detonation');if(spec.useDark)assert.ok(!det);else d=det;
    }
    d||=menu.parameterDomains.find(d=>d.actionType==='pass_reaction_family_window');
   }
   if(!d&&s.phase==='assault'&&!(s.rangedActionHistory||[]).some(h=>h.pieceId==='attacker'))
    d=menu.parameterDomains.find(d=>d.pieceId==='attacker'&&['declare_ranged_attack_before_target_reaction','ranged_attack'].includes(d.actionType));
   if(!d&&!c&&s.pendingOfficialAutomaticHits)d=menu.parameterDomains[0];
   if(!d&&!c&&s.pendingOfficialAttackTargetReaction)d=menu.parameterDomains[0];
   if(!d&&!c&&s.pendingCurrentProductRangedCasualtyChoice)d=menu.parameterDomains[0];
   const chosenFirstActorSideKey=s.phase==='movement'?'player2':'player1';
   if(!d)c=menu.candidates.find(c=>c.actionType==='choose_first_actor'&&c.sourceAction.chosenFirstActorSideKey===chosenFirstActorSideKey);
   if(!d&&!c)d=menu.parameterDomains.find(d=>d.actionType==='finish_activation');
   if(!d&&!c&&s.selectedRosterActivationWindow?.pieceId==='defiler'&&s.phase==='movement')d=menu.parameterDomains.find(d=>d.actionType==='move'&&d.pieceId==='defiler');
   if(!d&&!c)c=menu.candidates.find(c=>/pass/.test(c.actionType))||menu.candidates[0];
   assert.ok(d||c,'TARGET_DETONATION_SUCCESSOR_REQUIRED:'+JSON.stringify({phase:s.phase,stage:s.stage,menu}));
   const result=await native.commit({roomId,credential:credentials[(d||c).sideKey||s.activeSideKey||s.firstPlayerSideKey],operationKey:'step-'+head.stateRevision,
    ...(d?{select:r=>r.domainId===d.domainId,parameters:()=>p||parameters(s,d)}:{kind:'finite',select:r=>r.action.actionType===c.actionType
     &&(c.actionType!=='choose_first_actor'||r.action.sourceAction.chosenFirstActorSideKey===chosenFirstActorSideKey)})});
   assert.equal(result.idempotentReplayVerified,true);trace.push({revision:head.stateRevision+1,round:s.round,phase:s.phase,actionType:(d||c).actionType,definitionId:d?.definitionId||null,stackDepth:stack.length});console.log(JSON.stringify(trace.at(-1)));
  }
  expected=await native.store.loadRoom(roomId);const s=expected.envelope.state,events=s.log.flatMap(l=>l.events||[]),shots=events.filter(e=>e.type==='ranged_attack'&&e.pieceId==='attacker');
  assert.equal(s.round,2);assert.equal(s.phase,'movement');assert.equal(shots.length,1);assert.equal(s.gestateDarkSwarmUseHistory.length,1);
  assert.equal(s.officialMissionRuntimeState.scoringHistory.length,1);assert.equal(events.filter(e=>e.type==='attack_target_reaction_consumed').length,1);
  assert.equal(s.officialReactionHistory.filter(h=>h.definitionId==='unit:defiler/dark-swarm-assault-phase@1').length,spec.useDark?1:0);
  assert.equal(trace.some(t=>t.definitionId?.includes('/detonation-')),spec.useDark?false:frames.size>0);
  assert.ok(!s.pendingOfficialAttackTargetReaction&&!s.officialBeforeCasualtyContinuations?.length&&!s.pendingOfficialAutomaticHits&&!s.pieces.some(p=>p.officialBeforeCasualtyReservations?.length));
  assert.ok(!s.board.tokens.some(t=>t.tokenKind==='dark_swarm'&&!t.isRemoved));
  for(const f of frames.values())for(const row of f.rows){const e=shots.filter(e=>e.attackResolutionHash===row.attackResolutionHash);assert.equal(e.length,1);assert.deepEqual(e[0].casualtyModelIds,row.casualty.casualtyModelIds);}
  const losses=events.filter(e=>e.type==='supply_loss_recorded'&&e.round===1);
  assert.equal(new Set(losses.map(e=>e.entryHash)).size,losses.length);
  for(const p of s.pieces)assert.equal(losses.filter(e=>e.unitId===p.id).reduce((n,e)=>n+e.supplyDelta,0),scene.state.pieces.find(i=>i.id===p.id).currentSupply-p.currentSupply);
 }finally{native.close();}
 native=bound.open();try{await native.restoreDependencies(roomId,bound.authority);const b=await native.store.loadReplayBundle(roomId),journal=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt),replay=native.engine.replay({initialEnvelope:b.initialEnvelope,journal});assert.equal(replay.ok,true);assert.deepEqual(replay.envelope,expected.envelope);}finally{native.close();}
 const s=expected.envelope.state,coverageSatisfied=spec.useDark?true:frames.size>0&&s.pieces.find(p=>p.id==='attacker').isDestroyed;
 const result={...spec,attempt,roomId,directoryRef:path.relative(root,caseDirectory),signedActions:expected.stateRevision,stateHash:expected.envelope.stateHash,coverageSatisfied,trace,
  frames:[...frames.values()].map(f=>({hostKind:f.hostKind,rows:f.rows,activationContext:f.activationContext})),attackerDestroyed:s.pieces.find(p=>p.id==='attacker').isDestroyed,
  tokenBoard:scene.scenario.tokenBoard,actualMovementTokenPlacement:true,sourceTargetConsumedExactlyOnce:true,fullRound:true,completedRounds:1,originalDiceAndCasualtyOrderPreserved:true,supplyExactlyOnce:true,coldReplay:true,idempotencyVerified:true};
 await atomicWrite(path.join(caseDirectory,'result.public.json'),JSON.stringify(result,null,2));if(!coverageSatisfied){controls.push(result);assert.ok(attempt<7,'TARGET_COVERAGE_NOT_REACHED');continue;}results.push(result);break;
}
await atomicWrite(path.join(root,'docs/development/wave4/evidence/detonation-target.public.json'),JSON.stringify({schema:'starcraft_tmg_wave4_detonation_target_v1',status:'passed_scoped',runRef:path.relative(root,directory),results,controls,
 policyVersion:'1.5.0',rootRuntimeVersion:'3.236.0',newGameAtomsImplemented:0,implementedCumulativeAtoms:6,sourceHeldDefinitions:39,fullMatchAdmission:false,modelCalls:0,trainingTruth:false},null,2));
