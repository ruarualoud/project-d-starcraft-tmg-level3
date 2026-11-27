import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4StukovUnitInputs} from './compile-wave4-stukov-units.mjs';
import {createWave4InfestedInfantryScene,INFANTRY_BASE_IDS} from './support/wave4-infested-infantry-room-v1.mjs';
import {bindWave4TurretRoom} from './support/wave4-turret-room-v1.mjs';
import {timingParameters} from './support/wave4-timing-room-v1.mjs';
import {commitWave3RangedBatchV1} from './support/wave3-room-boundary-fixture-v1.mjs';
import {projectOfficialCharacteristicStatusFamilyModifiersV1 as modifiers} from '../packages/product-composition/official-characteristic-status-family-adapter-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),inputs=await loadWave4StukovUnitInputs(root);
const parent=path.join(root,'build/wave4-web/stukov-units'),directory=process.argv[2]?path.resolve(root,process.argv[2]):await fs.mkdtemp(path.join(parent,'infantry-'));
assert.ok(directory.startsWith(parent+path.sep));
const results=[];
for(const spec of [{id:'marine-infection',infected:true},{id:'marine-clean'},
 {id:'trooper-creep',unitKey:'infested_trooper',creepSource:true},
 {id:'marine-burrow',phase:'movement',reserve:true},{id:'trooper-burrow',unitKey:'infested_trooper',phase:'movement',reserve:true}]){
 const scene=createWave4InfestedInfantryScene(inputs,spec),s=scene.state,caseDirectory=path.join(directory,spec.id);
 const bound=await bindWave4TurretRoom({inputs,...scene,directory:caseDirectory});
 const projection=weapon=>modifiers(s.officialCharacteristicStatusFamilySourceBundle,s,{pieceId:'actor',
  context:{attackKind:weapon==='Bayonet'||weapon==='Strike'?'close_combat':'ranged',weaponName:weapon,targetPieceId:'enemy'}});
 const expectedPrecision=spec.infected||spec.creepSource?2:0;
 if(!spec.reserve){assert.equal(projection('Infested C-14 Rifle').precision,expectedPrecision);
  assert.equal(projection(spec.unitKey?'Bayonet':'Strike').precision,expectedPrecision);
  assert.equal(projection('Infested Missile Launcher - Acid Blast').precision,0);}
 let native=bound.open(),expected;
 const roomId='wave4-infantry-'+spec.id;
 try{const credentials=await native.create(roomId,bound.authority);
  if(spec.reserve){const actor=s.pieces.find(p=>p.id==='actor'),segment=s.officialDeploymentGeometryBinding.entryEdgesByPlayer.player1.segments[0];
   assert.equal(segment.side,'top');
   const parameters={leadingModelId:actor.models[0].id,entrySegmentId:segment.segmentId,
    placements:actor.models.map((m,i)=>({modelId:m.id,xMilliInches:35000+(i%3)*1310,yMilliInches:27000+Math.floor(i/3)*1310,
     elevation:'ground',supportTerrainIds:[],rotationDegrees:0}))};
   const preview=bound.runtime.query(s,{queryKind:'relocation_preview',pieceId:'actor',
    definitionId:'unit:'+(spec.unitKey||'infested_marine')+'/burrow-ambush-movement-phase@1',parameters});
   assert.ok(preview.result);
   await native.commit({roomId,credential:credentials.player1,operationKey:'ambush',
    select:r=>r.actionType==='resolve_relocation_ability'&&r.pieceId==='actor',parameters:()=>parameters});
  }else{
   const attack=await commitWave3RangedBatchV1({directory:caseDirectory,native,runtime:bound.runtime,roomId,credentials,
    attackerSideKey:'player1',attackerPieceId:'actor',targetPieceId:'enemy',weaponName:'Infested C-14 Rifle',
    operationKey:'rifle',selectPoolParameters:timingParameters,selectCasualtyParameters:d=>({
      casualtyModelIds:d.parameterSchema.casualtyModelIds.items.enum.slice(0,d.parameterSchema.casualtyModelIds.minItems)})});
   assert.equal(attack.query.result.action.sourceAction?.precisionValue??attack.query.result.action.precisionValue??0,expectedPrecision);
  }
  expected=await native.store.loadRoom(roomId);
  if(spec.reserve){const actor=expected.envelope.state.pieces.find(p=>p.id==='actor');assert.equal(actor.isOnField,true);
   assert.equal(actor.activatedPhases.movement,true);}
 }finally{native.close();}
 native=bound.open();try{await native.restoreDependencies(roomId,bound.authority);const b=await native.store.loadReplayBundle(roomId);
  const journal=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt);
  const replay=native.engine.replay({initialEnvelope:b.initialEnvelope,journal});assert.equal(replay.ok,true);assert.deepEqual(replay.envelope,expected.envelope);
 }finally{native.close();}
 const result={...spec,roomId,runRef:path.relative(root,caseDirectory),signedActions:expected.stateRevision,
  stateHash:expected.envelope.stateHash,expectedPrecision,coldReplay:true,idempotencyVerified:true};results.push(result);
 await atomicWrite(path.join(caseDirectory,'result.public.json'),JSON.stringify(result,null,2));
 console.log(JSON.stringify(result));
}
const result={schema:'starcraft_tmg_wave4_infested_infantry_base_wiring_v1',status:'passed_scoped',
 runRef:path.relative(root,directory),sourceDefinitionIds:INFANTRY_BASE_IDS,sourceDefinitionCount:13,results,
 newGameAtoms:0,implementedCumulativeAtoms:6,sourceHeldDefinitions:39,estimatedGeometryOnly:true,
 fullMatchAdmission:false,modelCalls:0,trainingTruth:false};
await atomicWrite(path.join(root,'docs/development/wave4/evidence/infested-infantry-base.public.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({status:result.status,cases:results.length}));
