import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4TurretInputs,createWave4TurretScene,bindWave4TurretRoom} from './support/wave4-turret-room-v1.mjs';
import {timingParameters} from './support/wave4-timing-room-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const inputs=await loadWave4TurretInputs(root);const parent=path.join(root,'build/wave4-web/universal-carrier');await fs.mkdir(parent,{recursive:true});
const run=await fs.mkdtemp(path.join(parent,'run-'));const results=[];
for(const spec of [{id:'destroyed-zero-supply',infected:true,heal:true,restore:true},
 {id:'positive-supply-loss',infected:true,heal:true,positiveSupply:true},
 {id:'clean-no-trigger',infected:false,heal:false},
 {id:'no-recipient-in-range',infected:true,heal:false,positiveSupply:true,outOfRange:true}]){
 const scene=createWave4TurretScene(inputs,{kind:'infestation',includeUniversalCarrier:true,zeroSupply:spec.positiveSupply,
  additionalFriendlyUnits:spec.positiveSupply?[{id:'healee',key:'roach'}]:[],friendlyPositionsById:{healee:[spec.outOfRange?45:14,10]}});
 if(!spec.infected)scene.state.pieces.find(p=>p.id==='fallen').statuses=[];
 const target=scene.state.pieces.find(p=>p.id===(spec.positiveSupply?'healee':'actor'));
 target.damageMarker=1;target.models[0].damage=1;target.models[0].remainingWounds=3;
 if(spec.positiveSupply){const fallen=scene.state.pieces.find(p=>p.id==='fallen');fallen.currentModels=6;fallen.currentSupply=2;fallen.destroyedModelIds=[];for(const m of fallen.models)Object.assign(m,{isDestroyed:false,isOnField:true,damage:0,remainingWounds:2});fallen.damageMarker=1;fallen.models[0].damage=1;fallen.models[0].remainingWounds=1;}
 const directory=path.join(run,spec.id);const bound=await bindWave4TurretRoom({inputs,...scene,directory,
  scenario:{...scene.scenario,kind:'universal_carrier_native',declaredFriendlyWound:1,positiveSupplyInitialModels:spec.positiveSupply?6:null}});
 let native=bound.open(),expected;const roomId='wave4-carrier-'+spec.id;const trace=[];let healing=0,restored=false;
 try{
  const credentials=await native.create(roomId,bound.authority,{matchId:roomId+'-v1'});let shot=false;
  for(let step=0;step<30;step++){
   const current=await native.store.loadRoom(roomId);const s=current.envelope.state;
   const attacked=s.log.flatMap(row=>row.events||[]).some(e=>e.type==='ranged_attack'&&e.pieceId==='actor');
   if(attacked&&!s.pendingOfficialUniversalCarrier&&!s.pendingOfficialInfestationTransfer&&!s.pendingOfficialReactionWindow
    &&!s.pendingOfficialRangedPrecisionChoice&&!s.pendingCurrentProductRangedCasualtyChoice)break;
   const menu=bound.runtime.enumerate(s);let d,p;
   if(s.pendingOfficialUniversalCarrier){d=menu.parameterDomains.find(row=>row.actionType==='choose_universal_carrier_heal');assert.ok(d);p={targetUnitId:target.id};
    assert.ok(d.parameterSchema.targetUnitId.enum.includes(target.id));healing++;
    assert.ok(!menu.parameterDomains.some(row=>row.actionType==='resolve_reaction_family_ability'),'PASSIVE_MUST_OWN_CHOICE');}
   else if(!shot){d=menu.parameterDomains.find(row=>row.pieceId==='actor'&&row.weaponName===(spec.positiveSupply?'Autocannon':'Needle Spines'));assert.ok(d);p={targetUnitId:'fallen'};shot=true;}
   else if(s.pendingOfficialReactionWindow){d=(spec.restore&&menu.parameterDomains.find(row=>row.definitionId==='unit:medic/restoration-any-phase@1'||row.effectKind==='infestation_transfer'))||menu.parameterDomains.find(row=>row.actionType==='pass_reaction_family_window');assert.ok(d);p=timingParameters(d);if(d.effectKind==='infestation_transfer')p.targetUnitId='recipient';if(d.definitionId==='unit:medic/restoration-any-phase@1')restored=true;}
   else {d=menu.parameterDomains[0];if(d)p=timingParameters(d);}
   const reactionBefore=structuredClone(s.officialReactionHistory||[]);const cardsBefore=structuredClone(s.cardResources);
   const candidate=!d&&menu.candidates.filter(c=>c.isEnabled!==false)[0];assert.ok(d||candidate,'CARRIER_SUCCESSOR_REQUIRED');
   const receipt=await native.commit({roomId,credential:credentials[s.activeSideKey],operationKey:'step-'+current.stateRevision,
    ...(d?{select:row=>row.domainId===d.domainId,parameters:()=>p}:{kind:'finite',select:row=>row.action.sourceActionHash===candidate.sourceActionHash})});
   assert.equal(receipt.idempotentReplayVerified,true);
   trace.push({revision:current.stateRevision+1,sideKey:s.activeSideKey,actionType:d?.actionType||candidate.actionType,definitionId:d?.definitionId||null});
   if(d?.actionType==='choose_universal_carrier_heal'){const after=(await native.store.loadRoom(roomId)).envelope.state;assert.deepEqual(after.officialReactionHistory||[],reactionBefore);assert.deepEqual(after.cardResources,cardsBefore);}
  }
  expected=await native.store.loadRoom(roomId);const after=expected.envelope.state;
  const losses=after.supplyLossLedger.entries;const enemy=after.pieces.find(p=>p.id==='fallen');
  assert.equal(Boolean(after.pendingOfficialUniversalCarrier),false);assert.equal(Boolean(after.pendingOfficialInfestationTransfer),false);
  assert.equal(healing,spec.heal?1:0,'ACTUAL_INFECTED_LOSS_HEAL_TRIGGER_REQUIRED:'+JSON.stringify({losses,enemyModels:enemy.currentModels}));
  assert.equal(after.pieces.find(p=>p.id===target.id).damageMarker,spec.heal?0:1);
  assert.equal(restored,Boolean(spec.restore));
  const heal=after.officialUniversalCarrierHistory?.at(-1)?.healResolution;
  if(heal){assert.equal(heal.effectiveHeal,1);assert.equal(heal.discardedHeal,1);assert.equal(heal.destroyedModelsReturned,0);assert.equal(heal.shieldedStatusRestored,false);}
  await atomicWrite(path.join(directory,'checkpoint.json'),JSON.stringify(expected.envelope));
  results.push({...spec,roomId,directoryRef:path.relative(root,directory),sourceDefinitionIds:scene.sourceDefinitionIds,
    signedActions:expected.stateRevision,stateHash:expected.envelope.stateHash,runtimeHash:bound.runtime.descriptor.runtimeHash,
    targetUnitId:target.id,healingChoices:healing,healResolution:heal||null,infestationRestorationCompleted:restored,
    actualEnemyDestroyed:enemy.isDestroyed,actualEnemyCurrentSupply:enemy.currentSupply,trace,idempotencyVerified:true,coldReplay:false});
 }finally{native.close();}
 native=bound.open();try{await native.restoreDependencies(roomId,bound.authority);const bundle=await native.store.loadReplayBundle(roomId);
  const journal=bundle.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt);const replay=native.engine.replay({initialEnvelope:bundle.initialEnvelope,journal});
  assert.equal(replay.ok,true);assert.deepEqual(replay.envelope,expected.envelope);results.at(-1).coldReplay=true;}finally{native.close();}
 console.log(JSON.stringify({case:spec.id,status:'passed',signedActions:expected.stateRevision}));
}
const result={schema:'starcraft_tmg_wave4_universal_carrier_native_v1',status:'passed_scoped',runRef:path.relative(root,run),results,
 newGameAtoms:0,implementedCumulativeAtoms:5,sourceHeldDefinitions:39,fullWave4Admission:false,modelCalls:0,trainingTruth:false};
await atomicWrite(path.join(run,'result.public.json'),JSON.stringify(result,null,2));
await atomicWrite(path.join(root,'docs/development/wave4/evidence/universal-carrier.public.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({status:result.status,cases:results.length,signedActions:results.reduce((n,r)=>n+r.signedActions,0),runRef:result.runRef}));
