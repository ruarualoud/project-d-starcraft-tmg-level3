import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4StukovUnitInputsV3} from './compile-wave4-stukov-units-v3.mjs';
import {bindWave4TurretRoom} from './support/wave4-turret-room-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),inputs=await loadWave4StukovUnitInputsV3(root),ref=process.argv[2];
assert.ok(ref?.startsWith('build/wave4-web/stukov-units/detonation-delayed-')&&ref.endsWith('/drone-use-0'));
const read=async name=>JSON.parse(await fs.readFile(path.join(root,ref,name+'.json'),'utf8')),
 proof=await read('result.public'),authority=await read('authority'),scope=await read('scope'),descriptor=await read('runtime'),
 directory=await fs.mkdtemp(path.join(root,'build/wave4-web/stukov-units/drone-reservation-control-')),
 bound=await bindWave4TurretRoom({inputs,state:authority.state,...scope,directory});assert.deepEqual(bound.runtime.descriptor,descriptor);
const native=bound.open({directory:path.join(root,ref),readOnly:true});
try{await native.restoreDependencies(proof.roomId,authority);const head=await native.store.loadRoom(proof.roomId),s=head.envelope.state,events=s.log.flatMap(l=>l.events||[]),
 source=s.pieces.find(p=>p.id===proof.sourceId),row=proof.frames.flatMap(f=>f.rows).find(r=>r.targetPieceId===source.id),
 child=events.filter(e=>e.type==='automatic_hits_damage'&&e.targetId===source.id&&e.sourceDefinitionId==='unit:infested_trooper/detonation-any-phase@1'),
 original=events.filter(e=>e.type==='automatic_hits_damage'&&e.targetId===source.id&&e.stages.resolutionHash===row.attackResolutionHash);
 assert.equal(head.envelope.stateHash,proof.stateHash);assert.ok(source.isDestroyed);assert.equal(row.casualty.casualtyModelIds.length,1);
 assert.equal(child.length,1);assert.deepEqual(child[0].casualtyModelIds,[]);assert.equal(original.length,1);assert.deepEqual(original[0].casualtyModelIds,row.casualty.casualtyModelIds);
 assert.equal(source.models.filter(m=>m.isDestroyed).length,1);assert.equal(proof.coverageSatisfied,false);assert.equal(proof.sourceKilledByDetonation,false);
 const result={schema:'starcraft_tmg_wave4_drone_reservation_control_v1',status:'passed_read_only_control',roomId:proof.roomId,inputRef:ref,
  originalSignedActions:head.stateRevision,newActions:0,sourceOriginallyAllocated:true,childReallocatedModels:0,originalRemovalExactlyOnce:true,
  scope:'control verifies already-doomed source reservation; does not qualify the source-killed-by-Detonation use case',modelCalls:0,trainingTruth:false};
 await atomicWrite(path.join(root,'docs/development/wave4/evidence/drone-reservation-control.public.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{native.close();}
