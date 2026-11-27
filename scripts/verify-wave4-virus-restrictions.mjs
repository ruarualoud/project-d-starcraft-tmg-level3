import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4TurretInputs,createWave4TurretScene,bindWave4TurretRoom} from './support/wave4-turret-room-v1.mjs';
import {createWave4VirusMovementScene,GROWING,FETID,BLINK,RECALL} from './support/wave4-virus-room-v1.mjs';
import {timingParameters} from './support/wave4-timing-room-v1.mjs';
import {projectOfficialInfestationRestrictionsV1,assertOfficialInfestationPlacementV1,allowsOfficialInfestationReactionV1} from '../packages/rule-atoms/official-infestation-restrictions-v1.mjs';
import {createOfficialReactionWindowOpportunityBatchV1} from '../packages/product-composition/official-reaction-family-adapter-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const inputs=await loadWave4TurretInputs(root);
const parent=path.join(root,'build/wave4-web/virus-restrictions');await fs.mkdir(parent,{recursive:true});
const directory=await fs.mkdtemp(path.join(parent,'run-'));const results=[];
async function verifyCase(spec,scene,operate){
 const dir=path.join(directory,spec.id);const bound=await bindWave4TurretRoom({inputs,...scene,directory:dir});
 let native=bound.open(),expected;const trace=[];const roomId='wave4-virus-'+spec.id;
 const commit=async(domain,parameters,finite=false)=>{const current=await native.store.loadRoom(roomId);const request={roomId,credential:credentials[current.envelope.state.activeSideKey],operationKey:'step-'+current.stateRevision,select:d=>finite?d.action.sourceActionHash===domain.sourceActionHash:d.domainId===domain.domainId,...(finite?{kind:'finite'}:{parameters:()=>parameters})};const out=await native.commit(request);assert.equal(out.idempotentReplayVerified,true);trace.push({revision:current.stateRevision+1,sideKey:current.envelope.state.activeSideKey,actionType:domain.actionType,definitionId:domain.definitionId||null});};
 let credentials;
 try{credentials=await native.create(roomId,bound.authority,{matchId:roomId+'-v1'});await operate({native,runtime:bound.runtime,roomId,credentials,commit});expected=await native.store.loadRoom(roomId);}finally{native.close();}
 native=bound.open();try{await native.restoreDependencies(roomId,bound.authority);const bundle=await native.store.loadReplayBundle(roomId);const journal=bundle.privateJournal.filter(row=>row.payload.type==='accepted_transition').map(row=>row.payload.payload.receipt);const replay=native.engine.replay({initialEnvelope:bundle.initialEnvelope,journal});assert.equal(replay.ok,true);assert.deepEqual(replay.envelope,expected.envelope);assert.deepEqual((await native.store.loadRoom(roomId)).envelope,expected.envelope);}finally{native.close();}
 const result={...spec,roomId,directoryRef:path.relative(root,dir),sourceDefinitionIds:scene.sourceDefinitionIds,signedActions:expected.stateRevision,stateHash:expected.envelope.stateHash,runtimeHash:bound.runtime.descriptor.runtimeHash,idempotencyVerified:true,coldReplay:true,trace};results.push(result);console.log(JSON.stringify({case:spec.id,status:'passed',signedActions:result.signedActions}));
}
if(!process.argv.includes('--mass-only')) {
for(const spec of [{id:'infected-ordinary-move',infected:true,action:'move'},{id:'clean-blink',infected:false,action:'blink'},{id:'clean-recall',infected:false,action:'recall'}]){
 const scene=createWave4VirusMovementScene(inputs,spec);
 await verifyCase(spec,scene,async({native,runtime,roomId,commit})=>{
  const initial=await native.store.loadRoom(roomId);const state=initial.envelope.state;const menu=runtime.enumerate(state);
  const facts=projectOfficialInfestationRestrictionsV1(state,'enemy');assert.equal(facts.cannotResolvePlace,spec.infected);assert.equal(facts.cannotReturnToReserves,spec.infected);
  for(const kind of ['place','set','return_to_reserves']){if(spec.infected)assert.throws(()=>assertOfficialInfestationPlacementV1(state,'enemy',kind),/INFESTATION_PLACEMENT_RESERVE_LOCKED/);else assert.doesNotThrow(()=>assertOfficialInfestationPlacementV1(state,'enemy',kind));}
  assert.equal(menu.parameterDomains.some(d=>d.definitionId===BLINK),!spec.infected);assert.equal(menu.parameterDomains.some(d=>d.definitionId===RECALL),!spec.infected);
  const domain=menu.parameterDomains.find(d=>spec.action==='move'?d.actionType==='move'&&d.pieceId==='enemy':d.definitionId===(spec.action==='blink'?BLINK:RECALL));assert.ok(domain);
  let parameters;
  if(spec.action==='move')parameters={leadingModelId:'enemy-model-1',path:[{xMilliInches:24000,yMilliInches:10000},{xMilliInches:25000,yMilliInches:10000}],placements:[]};
  else if(spec.action==='recall')parameters=timingParameters(domain);
  else parameters={leadingModelId:'enemy-model-1',placements:[{modelId:'enemy-model-1',xMilliInches:25000,yMilliInches:10000,rotationDegrees:0,elevation:'ground',supportTerrainIds:[]}],paymentCardInstanceIds:domain.parameterSchema.paymentCardInstanceIds.enum[0]};
  await commit(domain,parameters);const after=(await native.store.loadRoom(roomId)).envelope.state;const enemy=after.pieces.find(p=>p.id==='enemy');
  if(spec.action==='recall')assert.equal(enemy.isInReserves,true);else assert.equal(enemy.models[0].xInches,25);
 });
}
const armourId='card:engineering_bay/infantry-armor-any@2';
for(const spec of [{id:'growing-blocks-armour',infected:true},{id:'growing-clean-control',infected:false},{id:'growing-restoration-exception',infected:true,restore:true}]){
 const scene=createWave4TurretScene(inputs,{kind:'infestation',virusCard:'hungering_infestation',enemyCard:'engineering_bay',extraReactionDefinitionIds:[armourId]});scene.runtimeOptions.includeArmourReactions=true;
 const fallen=scene.state.pieces.find(p=>p.id==='fallen');if(!spec.infected)fallen.statuses=[];
 // Keep the factory model count and wound tracks explicit for this attack branch.
 if(!spec.restore){fallen.currentModels=fallen.models.length;fallen.currentSupply=2;fallen.destroyedModelIds=[];fallen.damageMarker=0;
 for(const model of fallen.models)Object.assign(model,{isOnField:true,isDestroyed:false,damage:0,remainingWounds:2});}
 else scene.state.pieces.find(p=>p.id==='restorer').statuses.push({statusName:'INFESTATION',statusKind:'DEBUFF',conditionalInitialStatus:true});
 await verifyCase(spec,scene,async({native,runtime,roomId,commit})=>{
  const state=(await native.store.loadRoom(roomId)).envelope.state;
  const input={triggerKind:'before_armour_roll',activeSideKey:'player1',phase:'assault',activationId:'virus-armour-probe',sourceActionHash:'a'.repeat(64),context:{targetPieceId:'fallen',affectedPieceId:'fallen',attackerPieceId:'actor',armourDiceCount:2}};
  const batch=createOfficialReactionWindowOpportunityBatchV1({state,bundle:state.officialReactionFamilySourceBundle}).projectWindow(input);
  assert.equal(batch.defenderLegal.parameterDomains.some(d=>d.definitionId===armourId),!spec.infected);
  assert.equal(allowsOfficialInfestationReactionV1(state,{sideKey:'player2',sourcePieceId:'fallen',recipientPieceId:'fallen',abilityName:'Overwatch'}),!spec.infected);
  assert.equal(allowsOfficialInfestationReactionV1(state,{sideKey:'player1',recipientPieceId:'fallen',abilityName:'Corrode Armor'}),true);
  let shot=false;
  for(let step=0;step<25;step++){
   const current=await native.store.loadRoom(roomId);const s=current.envelope.state;
   if(s.log.flatMap(r=>r.events||[]).some(e=>e.type==='ranged_attack'&&e.pieceId==='actor')&&!s.pendingOfficialReactionWindow&&!s.pendingOfficialInfestationTransfer)break;
   const menu=runtime.enumerate(s);let d,p;
   if(!shot){d=menu.parameterDomains.find(r=>r.weaponName==='Needle Spines'&&r.pieceId==='actor');p={targetUnitId:'fallen'};shot=true;}
   else if(s.pendingOfficialReactionWindow){const offer=menu.parameterDomains.find(r=>r.definitionId===armourId);if(spec.infected)assert.equal(offer,undefined);d=offer||(spec.restore&&menu.parameterDomains.find(r=>r.definitionId==='unit:medic/restoration-any-phase@1'||r.effectKind==='infestation_transfer'))||menu.parameterDomains.find(r=>r.actionType==='pass_reaction_family_window');p=timingParameters(d);if(d.effectKind==='infestation_transfer')p.targetUnitId='recipient';}
   else{d=menu.parameterDomains[0];if(d)p=timingParameters(d);}
   if(d)await commit(d,p);else{const c=menu.candidates.filter(c=>c.isEnabled!==false);assert.equal(c.length,1);await commit(c[0],undefined,true);}
  }
  const end=(await native.store.loadRoom(roomId)).envelope.state;assert.ok(end.log.flatMap(r=>r.events||[]).some(e=>e.type==='ranged_attack'&&e.pieceId==='actor'));if(spec.infected)assert.ok(!end.officialReactionHistory?.some(r=>r.definitionId===armourId));if(spec.restore){assert.ok(end.officialReactionHistory.some(r=>r.definitionId==='unit:medic/restoration-any-phase@1'));assert.equal(end.pieces.find(p=>p.id==='recipient').statuses.some(s=>String(s.statusName||s).toLowerCase()==='infestation'),false);}
 });
}
}
if(process.argv.includes('--mass-only')){
 const spec={id:'infected-mixed-mass-recall',infected:true,massRecall:true};const scene=createWave4VirusMovementScene(inputs,spec);
 await verifyCase(spec,scene,async({native,runtime,roomId,commit})=>{
  const state=(await native.store.loadRoom(roomId)).envelope.state;
  const query=runtime.query(state,{queryKind:'unit_restrictions',pieceId:'enemy'});
  assert.equal(query.mutationAuthority,false);assert.equal(query.result.cannotReturnToReserves,true);
  const menu=runtime.enumerate(state);const domain=menu.parameterDomains.find(d=>d.definitionId==='card:daelaam/mass-recall-any@1'&&d.pieceId==='ally');
  assert.ok(domain,'MASS_RECALL_UNINFECTED_ACTOR_REQUIRED');
  const p=timingParameters({...domain,sourceDomain:undefined,parameterSchema:{...domain.parameterSchema,required:domain.parameterSchema.required.filter(k=>k!=='coordinate')}});
  p.coordinate={xMilliInches:24000,yMilliInches:12000};await commit(domain,p);
  const after=(await native.store.loadRoom(roomId)).envelope.state;
  assert.equal(after.pieces.find(p=>p.id==='enemy').isOnField,true);
  assert.equal(after.pieces.find(p=>p.id==='ally').isInReserves,true);
  assert.equal(after.pieces.find(p=>p.id==='enemy').statuses.some(s=>s.statusName==='INFESTATION'),true);
 });
}
const result={schema:'starcraft_tmg_wave4_virus_restrictions_native_v1',status:'passed_scoped',runRef:path.relative(root,directory),results,newGameAtoms:process.argv.includes('--mass-only')?0:2,implementedCumulativeAtoms:5,sourceHeldDefinitions:39,originalDefinitionCount:556,fullWave4Admission:false,modelCalls:0,trainingTruth:false};
await atomicWrite(path.join(directory,'result.public.json'),JSON.stringify(result,null,2)+'\n');
await atomicWrite(path.join(root,'docs/development/wave4/evidence/'+(process.argv.includes('--mass-only')?'virus-mass-recall':'virus-restrictions')+'.public.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,cases:results.length,signedActions:results.reduce((n,r)=>n+r.signedActions,0),runRef:result.runRef}));
