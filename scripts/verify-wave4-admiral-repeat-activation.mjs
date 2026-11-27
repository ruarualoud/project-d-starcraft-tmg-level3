import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4StukovUnitInputs} from './compile-wave4-stukov-units.mjs';
import {createWave4StukovUnitScene} from './support/wave4-stukov-unit-room-v1.mjs';
import {bindWave4TurretRoom} from './support/wave4-turret-room-v1.mjs';
import {timingParameters} from './support/wave4-timing-room-v1.mjs';
import {OFFICIAL_REPEATED_ACTIVATION_IDENTITY_POLICY_V1} from '../packages/rule-atoms/official-repeated-activation-identity-v1.mjs';
import {resolveOfficialArmourRollActivationIdV1} from '../packages/rule-atoms/official-armour-roll-ordinal-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),inputs=await loadWave4StukovUnitInputs(root);
const scene=createWave4StukovUnitScene(inputs,{preactivateMarine:false});
scene.state.officialRepeatedActivationIdentityPolicy=structuredClone(OFFICIAL_REPEATED_ACTIVATION_IDENTITY_POLICY_V1);
const parent=path.join(root,'build/wave4-web/stukov-units'),directory=await fs.mkdtemp(path.join(parent,'repeat-activation-'));
const bound=await bindWave4TurretRoom({inputs,...scene,directory});let native=bound.open(),expected;
const roomId='wave4-admiral-repeat-activation',ids=[],trace=[];let moves=0,spread=false,exchanged=false;
try{
 const credentials=await native.create(roomId,bound.authority);
 for(let step=0;step<30;step++){
  const head=await native.store.loadRoom(roomId),s=head.envelope.state;if(moves===2&&!s.selectedRosterActivationWindow)break;
  const menu=bound.runtime.enumerate(s);let d,c,p;
  if(s.pendingOfficialReactionWindow){d=menu.parameterDomains.find(r=>r.actionType==='pass_reaction_family_window');p=timingParameters(d);}
  else if(s.selectedRosterActivationWindow&&(s.selectedRosterActivationWindow.pieceId==='marine'||exchanged)){
   d=menu.parameterDomains.find(r=>r.actionType==='finish_activation');p={};}
  else if(s.activeSideKey==='player2')c=menu.candidates.find(r=>r.actionType==='pass');
  else if(moves===0||exchanged&&moves===1){
   d=menu.parameterDomains.find(r=>r.actionType==='move'&&r.pieceId==='marine');assert.ok(d);
   ids.push(resolveOfficialArmourRollActivationIdV1(s,'marine'));
   const piece=s.pieces.find(p=>p.id==='marine'),offset=moves===0?250:500;
   const positions=piece.models.map(m=>({modelId:m.id,xMilliInches:Math.round(m.xInches*1000)-offset,
    yMilliInches:Math.round(m.yInches*1000),elevation:'ground',supportTerrainIds:[]}));
   p={leadingModelId:piece.models[0].id,path:[{xMilliInches:Math.round(piece.models[0].xInches*1000),yMilliInches:Math.round(piece.models[0].yInches*1000)},
    {xMilliInches:positions[0].xMilliInches,yMilliInches:positions[0].yMilliInches}],placements:positions.slice(1)};moves++;
  }else if(!spread){d=menu.parameterDomains.find(r=>r.effectKind==='infestation_spread'&&r.pieceId==='stukov');
   p={activeUnitId:'stukov',paymentCardInstanceIds:['faction:player1'],targetUnitId:'enemy'};spread=true;
  }else{d=menu.parameterDomains.find(r=>r.effectKind==='infestation_activation_exchange');
   p={activeUnitId:'stukov',paymentCardInstanceIds:['player1-tactical-2'],targetUnitId:'enemy',friendlyUnitId:'marine'};exchanged=true;}
  assert.ok(d||c,'REPEATED_ACTIVATION_SUCCESSOR_REQUIRED');const choice=d||c;
  const committed=await native.commit({roomId,credential:credentials[choice.sideKey||s.activeSideKey],operationKey:'step-'+head.stateRevision,
   ...(d?{select:r=>r.domainId===d.domainId,parameters:()=>p}:{kind:'finite',select:r=>r.action.actionType===c.actionType})});
  assert.equal(committed.idempotentReplayVerified,true);trace.push({revision:head.stateRevision+1,actionType:choice.actionType,definitionId:choice.definitionId||null});
  console.log(JSON.stringify(trace.at(-1)));
 }
 expected=await native.store.loadRoom(roomId);assert.equal(moves,2);assert.equal(ids.length,2);assert.notEqual(ids[0],ids[1]);
 assert.equal(expected.envelope.state.officialActivationRenewalHistory.length,1);
 assert.equal(expected.envelope.state.pieces.find(p=>p.id==='marine').activatedPhases.movement,true);
}finally{native.close();}
native=bound.open();try{await native.restoreDependencies(roomId,bound.authority);const bundle=await native.store.loadReplayBundle(roomId);
 const journal=bundle.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt);
 const replay=native.engine.replay({initialEnvelope:bundle.initialEnvelope,journal});assert.equal(replay.ok,true);assert.deepEqual(replay.envelope,expected.envelope);
}finally{native.close();}
const result={schema:'starcraft_tmg_wave4_admiral_repeated_activation_v1',status:'passed_scoped',runRef:path.relative(root,directory),roomId,
 signedActions:expected.stateRevision,stateHash:expected.envelope.stateHash,activationIds:ids,twoActualNativeMoves:true,
 reactionAndArmourIdentityConsumer:'resolveOfficialArmourRollActivationIdV1',trace,coldReplay:true,idempotencyVerified:true,
 newGameAtoms:0,implementedCumulativeAtoms:6,engineeringEstimatedUnitGeometry:true,sourceHeldDefinitions:39,fullMatchAdmission:false,modelCalls:0,trainingTruth:false};
await atomicWrite(path.join(directory,'result.public.json'),JSON.stringify(result,null,2));
await atomicWrite(path.join(root,'docs/development/wave4/evidence/admiral-repeat-activation.public.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({status:result.status,signedActions:result.signedActions,distinctActivationIds:true}));
