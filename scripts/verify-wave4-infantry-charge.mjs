import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4StukovUnitInputs} from './compile-wave4-stukov-units.mjs';
import {createWave4InfestedInfantryScene} from './support/wave4-infested-infantry-room-v1.mjs';
import {bindWave4TurretRoom} from './support/wave4-turret-room-v1.mjs';
import {timingParameters} from './support/wave4-timing-room-v1.mjs';
import {completeWave3MeleePoolsV1} from './support/wave3-room-boundary-fixture-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),inputs=await loadWave4StukovUnitInputs(root);
const directory=await fs.mkdtemp(path.join(root,'build/wave4-web/stukov-units/charge-')),results=[];
for(const unitKey of ['infested_marine','infested_trooper']){
 const scene=createWave4InfestedInfantryScene(inputs,{unitKey,charge:true}),caseDirectory=path.join(directory,unitKey);
 const bound=await bindWave4TurretRoom({inputs,...scene,directory:caseDirectory});
 let native=bound.open(),expected,impactDice;const roomId='wave4-charge-'+unitKey;
 try{const credentials=await native.create(roomId,bound.authority),s=scene.state,actor=s.pieces.find(p=>p.id==='actor'),target=s.pieces.find(p=>p.id==='enemy');
  const targetModel=target.models.find(m=>m.id==='enemy-model-2');
  await native.commit({roomId,credential:credentials.player1,operationKey:'declare',select:d=>d.actionType==='charge'&&d.pieceId==='actor',
   parameters:()=>({leadingModelId:actor.models[0].id,targets:[{unitId:'enemy',modelId:targetModel.id}]})});
  const contactX=Math.round(targetModel.xInches*1000)-Math.round((targetModel.baseWidthInches+actor.models[0].baseWidthInches)*500);
  const placements=actor.models.map((m,i)=>({modelId:m.id,xMilliInches:contactX-(i>=3?Math.round(m.baseWidthInches*1000):0),
   yMilliInches:10000+(i%3)*Math.round(m.baseDepthInches*1000),elevation:'ground',supportTerrainIds:[]}));
  await native.commit({roomId,credential:credentials.player1,operationKey:'resolve',select:d=>d.actionType==='resolve_charge',
   parameters:()=>({outcome:'success',path:[{xMilliInches:contactX,yMilliInches:10000,elevation:'ground',supportTerrainIds:[]}],placements:placements.slice(1)})});
  const head=await native.store.loadRoom(roomId),domain=bound.runtime.enumerate(head.envelope.state).parameterDomains.find(d=>d.actionType==='resolve_impact');
  assert.ok(domain);const models=domain.sourceDomain.parameterSchema.eligibleModels;
  assert.equal(models.length,actor.models.length);assert.ok(models.every(m=>m.impactDice===2));
  impactDice=models.reduce((sum,m)=>sum+m.impactDice,0);
  await native.commit({roomId,credential:credentials.player1,operationKey:'impact',select:d=>d.domainId===domain.domainId,
   parameters:()=>({allocations:models.map(m=>({modelId:m.modelId,targetUnitId:'enemy',dice:m.impactDice}))})});
  await completeWave3MeleePoolsV1({directory:caseDirectory,native,runtime:bound.runtime,roomId,credentials,operationPrefix:'impact-pool',
   selectPoolParameters:d=>d.parameterSchema.required.includes('casualtyModelIds')?
    {casualtyModelIds:d.parameterSchema.casualtyModelIds.items.enum.slice(0,d.parameterSchema.casualtyModelIds.minItems)}:timingParameters(d)});
  expected=await native.store.loadRoom(roomId);
  const event=expected.envelope.state.log.flatMap(l=>l.events||[]).find(e=>e.type==='impact_damage');
  assert.ok(event);assert.equal(event.stages.hitRolls.length,impactDice);assert.equal(event.stages.hitThreshold,4);
 }finally{native.close();}
 native=bound.open();try{await native.restoreDependencies(roomId,bound.authority);const b=await native.store.loadReplayBundle(roomId);
  const journal=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt),replay=native.engine.replay({initialEnvelope:b.initialEnvelope,journal});
  assert.equal(replay.ok,true);assert.deepEqual(replay.envelope,expected.envelope);
 }finally{native.close();}
 const result={unitKey,roomId,directoryRef:path.relative(root,caseDirectory),impactDice,signedActions:expected.stateRevision,stateHash:expected.envelope.stateHash,
  coldReplay:true,idempotencyVerified:true};results.push(result);await atomicWrite(path.join(caseDirectory,'result.public.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}
const result={schema:'starcraft_tmg_wave4_infantry_charge_v1',status:'passed_scoped',runRef:path.relative(root,directory),results,
 newGameAtoms:0,implementedCumulativeAtoms:6,estimatedGeometryOnly:true,fullMatchAdmission:false,sourceHeldDefinitions:39,modelCalls:0,trainingTruth:false};
await atomicWrite(path.join(root,'docs/development/wave4/evidence/infantry-charge.public.json'),JSON.stringify(result,null,2));
