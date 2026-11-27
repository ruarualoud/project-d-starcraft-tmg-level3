import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4StukovUnitInputs} from './compile-wave4-stukov-units.mjs';
import {createWave4InfestedInfantryScene} from './support/wave4-infested-infantry-room-v1.mjs';
import {bindWave4TurretRoom} from './support/wave4-turret-room-v1.mjs';
import {timingParameters} from './support/wave4-timing-room-v1.mjs';
import {commitWave3RangedBatchV1,completeWave3MeleePoolsV1} from './support/wave3-room-boundary-fixture-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),inputs=await loadWave4StukovUnitInputs(root);
const directory=await fs.mkdtemp(path.join(root,'build/wave4-web/stukov-units/weapons-')),results=[];
const specialists=['Infested Missile Launcher - Acid Blast','Infested Missile Launcher - Scourgeshot'];
for(const spec of [{id:'marine-specialists',phase:'assault',upgrades:specialists.map((upgradeName,i)=>({upgradeName,nominatedModelId:'actor-model-'+(i+1)}))},
 {id:'marine-mutation',phase:'combat',weapon:'Wild Mutation',upgrades:[{upgradeName:'Wild Mutation'}]},
 {id:'marine-strike',phase:'combat',weapon:'Strike'},
 {id:'trooper-bayonet',phase:'combat',unitKey:'infested_trooper',weapon:'Bayonet'}]){
 const scene=createWave4InfestedInfantryScene(inputs,{...spec,infected:true}),caseDirectory=path.join(directory,spec.id);
 const bound=await bindWave4TurretRoom({inputs,...scene,directory:caseDirectory});
 let native=bound.open(),expected;const roomId='wave4-infantry-'+spec.id,events=[];
 try{const credentials=await native.create(roomId,bound.authority);
  if(spec.phase==='assault'){
   for(const weaponName of specialists){const shot=await commitWave3RangedBatchV1({directory:caseDirectory,native,runtime:bound.runtime,roomId,credentials,
    attackerSideKey:'player1',attackerPieceId:'actor',targetPieceId:'enemy',weaponName,operationKey:weaponName,
    selectPoolParameters:timingParameters,selectCasualtyParameters:d=>({casualtyModelIds:d.parameterSchema.casualtyModelIds.items.enum.slice(0,d.parameterSchema.casualtyModelIds.minItems)})});
    const attack=shot.query.result.action.sourceAction||shot.query.result.action;
    assert.equal(attack.rangedPlan?.activePrecisionValue||attack.precisionValue||0,0);
    assert.equal(attack.rangedPlan.eligibleAttackerModelIds.length,1);events.push(shot.event);}
  }else{
   const menu=bound.runtime.enumerate(scene.state),domain=menu.parameterDomains.find(d=>d.actionType==='fight'&&d.pieceId==='actor'&&d.weaponName===spec.weapon);
   assert.ok(domain,'INFANTRY_FIGHT_DOMAIN_REQUIRED');
   const schema=domain.sourceDomain.parameterSchema,parameters={closeRanksMode:'decline',
    allocations:[{targetUnitId:'enemy',dice:domain.sourceDomain.constraints.declineCloseRanksAttackDice}],
    ...(schema.required.includes('surgeTargetUnitId')?{surgeTargetUnitId:'enemy'}:{})};
   const preview=bound.runtime.query(scene.state,{queryKind:'melee_action_preview',actionType:'fight',pieceId:'actor',weaponName:spec.weapon,parameters});
   await native.commit({roomId,credential:credentials.player1,operationKey:'fight',select:d=>d.domainId===domain.domainId,parameters:()=>parameters});
   const targets=preview.result.action.sourceAction?.meleePlan?.chancePlan?.targets||preview.result.action.meleePlan?.chancePlan?.targets;
   if(targets)assert.equal(targets[0].precision,2);
   await completeWave3MeleePoolsV1({directory:caseDirectory,native,runtime:bound.runtime,roomId,credentials,operationPrefix:'fight-pool',
    selectPoolParameters:d=>d.parameterSchema.required.includes('casualtyModelIds')
     ?{casualtyModelIds:d.parameterSchema.casualtyModelIds.items.enum.slice(0,d.parameterSchema.casualtyModelIds.minItems)}:timingParameters(d)});
   const head=await native.store.loadRoom(roomId),event=head.envelope.state.log.flatMap(l=>l.events||[]).find(e=>e.type==='close_combat_attack');
   assert.ok(event);assert.equal(event.stages.activePrecisionValue,2);events.push(event);
  }
  expected=await native.store.loadRoom(roomId);
 }finally{native.close();}
 native=bound.open();try{await native.restoreDependencies(roomId,bound.authority);const b=await native.store.loadReplayBundle(roomId);
  const journal=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt),replay=native.engine.replay({initialEnvelope:b.initialEnvelope,journal});
  assert.equal(replay.ok,true);assert.deepEqual(replay.envelope,expected.envelope);
 }finally{native.close();}
 const result={...spec,roomId,directoryRef:path.relative(root,caseDirectory),signedActions:expected.stateRevision,stateHash:expected.envelope.stateHash,
  events,coldReplay:true,idempotencyVerified:true};results.push(result);await atomicWrite(path.join(caseDirectory,'result.public.json'),JSON.stringify(result,null,2));
 console.log(JSON.stringify({id:spec.id,signedActions:result.signedActions,status:'passed_scoped'}));
}
const result={schema:'starcraft_tmg_wave4_infantry_weapons_v1',status:'passed_scoped',runRef:path.relative(root,directory),results,
 newGameAtoms:0,implementedCumulativeAtoms:6,estimatedGeometryOnly:true,fullMatchAdmission:false,sourceHeldDefinitions:39,modelCalls:0,trainingTruth:false};
await atomicWrite(path.join(root,'docs/development/wave4/evidence/infantry-weapons.public.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({status:result.status,cases:results.length}));
