import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4StukovUnitInputs} from './compile-wave4-stukov-units.mjs';
import {createWave4BioKillSwitchScene} from './support/wave4-bio-kill-switch-room-v1.mjs';
import {bindWave4TurretRoom} from './support/wave4-turret-room-v1.mjs';
import {timingParameters} from './support/wave4-timing-room-v1.mjs';
import {OFFICIAL_CORRODE_ARMOUR_ID} from '../packages/source-data/official-corrode-armour-source-v1.mjs';
import {resolveOfficialEffectiveCombatProfileV1} from '../packages/product-composition/official-characteristic-status-family-adapter-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),inputs=await loadWave4StukovUnitInputs(root);
const directory=await fs.mkdtemp(path.join(root,'build/wave4-web/stukov-units/corrode-round-'));
const scene=createWave4BioKillSwitchScene(inputs,{combatWeapons:true,woundedCaster:false,targetKey:'goliath',corrode:true,empty:true,fullRound:true});
Object.assign(scene.state,{phase:'start_of_round',stage:'mission_start_of_round',phaseFirstActorByRound:{}});
const bound=await bindWave4TurretRoom({inputs,...scene,directory});
let native=bound.open(),expected,attacked=false,used=false,sawPenalty=false;const roomId='wave4-corrode-round',trace=[];
try{const credentials=await native.create(roomId,bound.authority);
 for(let step=0;step<70;step++){
  const head=await native.store.loadRoom(roomId),s=head.envelope.state;if(Number(s.round)===2)break;
  const menu=bound.runtime.enumerate(s,{matchBinding:head.envelope.matchBinding});let d,c,p;
  if(s.phase==='assault'&&!attacked){d=menu.parameterDomains.find(d=>d.pieceId==='stukov'&&d.weaponName==='Corrosive Blast');
   if(d){p={targetUnitId:'infected'};attacked=true;}}
  if(!d&&!used){d=menu.parameterDomains.find(d=>d.definitionId===OFFICIAL_CORRODE_ARMOUR_ID);if(d){p=timingParameters(d);used=true;}}
  if(!d&&s.pendingOfficialReactionWindow){d=menu.parameterDomains.find(d=>d.actionType==='pass_reaction_family_window');if(d)p=timingParameters(d);}
  if(!d)c=menu.candidates.find(c=>c.actionType==='choose_first_actor'&&c.sourceAction.chosenFirstActorSideKey==='player1');
  if(!d&&!c){d=menu.parameterDomains.find(d=>d.actionType==='finish_activation');if(d)p={};}
  if(!d&&!c)c=menu.candidates.find(c=>/pass/.test(c.actionType))||menu.candidates[0];
  assert.ok(d||c,'CORRODE_ROUND_SUCCESSOR_REQUIRED');const choice=d||c;
  const receipt=await native.commit({roomId,credential:credentials[choice.sideKey||s.activeSideKey||s.firstPlayerSideKey],operationKey:'step-'+head.stateRevision,
   ...(d?{select:r=>r.domainId===d.domainId,parameters:()=>p}:{kind:'finite',select:r=>r.action.actionType===c.actionType
    &&(c.actionType!=='choose_first_actor'||r.action.sourceAction.chosenFirstActorSideKey===c.sourceAction.chosenFirstActorSideKey)})});
  assert.equal(receipt.idempotentReplayVerified,true);const after=(await native.store.loadRoom(roomId)).envelope.state;
  if(choice.definitionId===OFFICIAL_CORRODE_ARMOUR_ID){assert.equal(resolveOfficialEffectiveCombatProfileV1(after,after.pieces.find(p=>p.id==='infected')).armourThreshold,5);sawPenalty=true;}
  trace.push({revision:head.stateRevision+1,round:s.round,phase:s.phase,actionType:choice.actionType,definitionId:choice.definitionId||null});console.log(JSON.stringify(trace.at(-1)));
 }
 expected=await native.store.loadRoom(roomId);const s=expected.envelope.state,target=s.pieces.find(p=>p.id==='infected');
 assert.equal(attacked,true);assert.equal(used,true);assert.equal(sawPenalty,true);assert.equal(s.round,2);
 assert.equal(s.officialMissionRuntimeState.scoringHistory.length,1);
 assert.ok(!target.statuses.some(st=>st.sourceDefinitionId===OFFICIAL_CORRODE_ARMOUR_ID));
 assert.equal(resolveOfficialEffectiveCombatProfileV1(s,target).armourThreshold,4);
 assert.ok(!s.board.effectMarkers.some(m=>m.sourceDefinitionId===OFFICIAL_CORRODE_ARMOUR_ID));
}finally{native.close();}
native=bound.open();try{await native.restoreDependencies(roomId,bound.authority);const b=await native.store.loadReplayBundle(roomId);
 const journal=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt),replay=native.engine.replay({initialEnvelope:b.initialEnvelope,journal});
 assert.equal(replay.ok,true);assert.deepEqual(replay.envelope,expected.envelope);
}finally{native.close();}
const result={schema:'starcraft_tmg_wave4_corrode_round_v1',status:'passed_scoped',roomId,directoryRef:path.relative(root,directory),signedActions:expected.stateRevision,
 stateHash:expected.envelope.stateHash,trace,fullNativeRound:true,armourFiveBeforeCleanup:true,armourFourAfterCleanup:true,
 coldReplay:true,idempotencyVerified:true,engineeringEstimatedUnitGeometry:true,fullMatchAdmission:false,newGameAtomsImplemented:0,
 implementedCumulativeAtoms:6,sourceHeldDefinitions:39,modelCalls:0,trainingTruth:false};
await atomicWrite(path.join(root,'docs/development/wave4/evidence/corrode-armour-round.public.json'),JSON.stringify(result,null,2));
await atomicWrite(path.join(directory,'result.public.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({status:result.status,signedActions:result.signedActions,fullNativeRound:true}));
