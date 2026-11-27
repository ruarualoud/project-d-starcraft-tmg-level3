import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4StukovUnitInputs} from './compile-wave4-stukov-units.mjs';
import {createWave4InfestedInfantryScene} from './support/wave4-infested-infantry-room-v1.mjs';
import {bindWave4TurretRoom} from './support/wave4-turret-room-v1.mjs';
import {timingParameters} from './support/wave4-timing-room-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),inputs=await loadWave4StukovUnitInputs(root);
const directory=await fs.mkdtemp(path.join(root,'build/wave4-web/stukov-units/munitions-')),results=[];
for(const spec of [{id:'marine-purchased'},{id:'trooper-free',unitKey:'infested_trooper'},
 {id:'marine-unpurchased',purchaseMunitions:false},{id:'medic-reduces-non-lethal',medic:true}]){
 const scene=createWave4InfestedInfantryScene(inputs,{...spec,munitions:true}),caseDirectory=path.join(directory,spec.id);
 const bound=await bindWave4TurretRoom({inputs,...scene,directory:caseDirectory});
 let native=bound.open(),expected,usedSupport=false;const trace=[],roomId='wave4-munitions-'+spec.id;
 try{const credentials=await native.create(roomId,bound.authority);
  const preview=bound.runtime.query(scene.state,{queryKind:'ranged_attack_preview',pieceId:'actor',weaponName:'Infested C-14 Rifle',parameters:{targetUnitId:'enemy'}});
  const initial=await native.store.loadRoom(roomId);
  await native.commit({roomId,credential:credentials.player1,operationKey:'rifle',select:r=>r.pieceId==='actor'&&r.weaponName==='Infested C-14 Rifle',parameters:()=>({targetUnitId:'enemy'})});
  assert.equal(preview.mutationAuthority,false);assert.equal(initial.stateRevision,0);
  for(let step=0;step<24;step++){
   const head=await native.store.loadRoom(roomId),s=head.envelope.state,menu=bound.runtime.enumerate(s);
   if(s.log.flatMap(l=>l.events||[]).some(e=>e.type==='ranged_attack')
    &&!s.pendingOfficialPlaguedMunitions&&!s.pendingOfficialRangedPrecisionChoice&&!s.pendingCurrentProductRangedCasualtyChoice)break;
   let d,parameters;
   if(s.pendingOfficialReactionWindow){
    d=spec.medic&&s.pendingOfficialPlaguedMunitions?menu.parameterDomains.find(r=>r.definitionId==='unit:medic/life-support-any-phase@1'):null;
    d||=menu.parameterDomains.find(r=>r.actionType==='pass_reaction_family_window');
    assert.ok(d,'MUNITIONS_DAMAGE_REACTION_DOMAIN_REQUIRED');parameters=timingParameters(d);
    if(d.definitionId){usedSupport=true;if(parameters.targetUnitId)parameters.targetUnitId='enemy';}
   }else{d=menu.parameterDomains[0];if(d)parameters=timingParameters(d);}
   const c=menu.candidates.find(r=>r.isEnabled!==false);
   assert.ok(d||c,'MUNITIONS_ATTACK_CONTINUATION_REQUIRED');
   await native.commit({roomId,credential:credentials[(d||c).sideKey||s.activeSideKey],operationKey:'step-'+head.stateRevision,
    ...(d?{select:r=>r.domainId===d.domainId,parameters:()=>parameters}:{kind:'finite',select:r=>r.action.actionType===c.actionType})});
   trace.push({revision:head.stateRevision+1,actionType:(d||c).actionType,definitionId:d?.definitionId||null});
  }
  expected=await native.store.loadRoom(roomId);const s=expected.envelope.state;
  assert.equal(Boolean(s.pendingOfficialPlaguedMunitions),false);
  const history=s.officialPlaguedMunitionsHistory||[],positive=spec.purchaseMunitions!==false;
  assert.equal(history.length,positive?1:0);
  if(positive){const e=history[0];assert.equal(e.nonLethalResolution.nonLethalDamage,1);
   assert.equal(e.nonLethalResolution.casualtyModelIds.length,0);assert.equal(e.damagePool.incomingDamage,1);
   assert.equal(s.pieces.find(p=>p.id==='enemy').damageMarker,e.damagePool.totalDamageAfterReduction);
   assert.equal(e.damagePool.appliedReduction>0,Boolean(spec.medic));}
  assert.equal(usedSupport,Boolean(spec.medic));
 }finally{native.close();}
 native=bound.open();try{await native.restoreDependencies(roomId,bound.authority);const b=await native.store.loadReplayBundle(roomId);
  const journal=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt);
  const replay=native.engine.replay({initialEnvelope:b.initialEnvelope,journal});assert.equal(replay.ok,true);assert.deepEqual(replay.envelope,expected.envelope);
 }finally{native.close();}
 const result={...spec,roomId,runRef:path.relative(root,caseDirectory),signedActions:expected.stateRevision,stateHash:expected.envelope.stateHash,
  history:expected.envelope.state.officialPlaguedMunitionsHistory||[],usedSupport,trace,coldReplay:true,idempotencyVerified:true};results.push(result);
 await atomicWrite(path.join(caseDirectory,'result.public.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({id:spec.id,signedActions:result.signedActions,status:'passed_scoped'}));
}
const result={schema:'starcraft_tmg_wave4_plagued_munitions_v1',status:'passed_scoped',runRef:path.relative(root,directory),results,
 sourceDefinitionIds:['unit:infested_marine/plagued-munitions-assault-phase@1','unit:infested_trooper/plagued-munitions-assault-phase@1'],
 newGameAtoms:0,implementedCumulativeAtoms:6,sourceHeldDefinitions:39,estimatedGeometryOnly:true,fullMatchAdmission:false,modelCalls:0,trainingTruth:false};
await atomicWrite(path.join(root,'docs/development/wave4/evidence/plagued-munitions.public.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({status:result.status,cases:results.length}));
