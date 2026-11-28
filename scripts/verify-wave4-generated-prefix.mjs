import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4StukovUnitInputsV3} from './compile-wave4-stukov-units-v3.mjs';
import {bindWave4TurretRoom} from './support/wave4-turret-room-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),ref=process.argv[2];assert.ok(ref?.startsWith('build/wave4-web/stukov-units/detonation-delayed-control-web-'));
const inputs=await loadWave4StukovUnitInputsV3(root),roomRef=ref+'/rooms/drone-source-reserved-control',roomId='product-wave4-web-drone-source-reserved-control',
 read=async n=>JSON.parse(await fs.readFile(path.join(root,roomRef,n+'.json'),'utf8')),authority=await read('authority'),scope=await read('scope'),descriptor=await read('runtime'),
 directory=await fs.mkdtemp(path.join(root,'build/wave4-web/stukov-units/generated-prefix-audit-')),
 args={inputs,state:authority.state,...scope,directory};assert.ok(scope.runtimeInitialState&&scope.humanConfirmed);
const bound=await bindWave4TurretRoom(args);assert.deepEqual(bound.runtime.descriptor,descriptor);
assert.equal(authority.state.pieces.length,3);assert.equal(scope.runtimeInitialState.pieces.length,2);
await assert.rejects(()=>bindWave4TurretRoom({...args,scenario:{...scope.scenario,sourceStateHash:'0'.repeat(64)}}),/SIGNED_GENERATED_PREFIX_RUNTIME_INITIAL_REQUIRED/);
const changed=structuredClone(scope.runtimeInitialState);changed.officialGeneratedUnitDataBundle.bundleHash='0'.repeat(64);
await assert.rejects(()=>bindWave4TurretRoom({...args,runtimeInitialState:changed}),/SIGNED_GENERATED_PREFIX_RUNTIME_INITIAL_REQUIRED/);
await assert.rejects(()=>bindWave4TurretRoom({...args,expectedNativeRuntimeHash:'0'.repeat(64)}),/RUNTIME_INITIAL_BINDING_MISMATCH/);
const native=bound.open({directory:path.join(root,roomRef),readOnly:true});
try{await native.restoreDependencies(roomId,authority);const b=await native.store.loadReplayBundle(roomId),head=await native.store.loadRoom(roomId),
 journal=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt),replay=native.engine.replay({initialEnvelope:b.initialEnvelope,journal});
 assert.equal(replay.ok,true);assert.deepEqual(replay.envelope,head.envelope);assert.equal((await native.store.loadRoom(roomId)).envelope.stateHash,head.envelope.stateHash);
 const result={schema:'starcraft_tmg_wave4_generated_prefix_verification_v1',status:'passed_read_only',inputRef:roomRef,roomId,
  purchasedInitialPieces:2,actualPrefixPieces:3,originalNativeRuntimeHash:scope.expectedNativeRuntimeHash,sourcePrefixReceipts:scope.scenario.sourcePrefixReceipts,
  originalWebSignedActions:head.stateRevision,newActions:0,descriptorUnchanged:true,coldReplay:true,
  rejected:['wrong_signed_state_hash','changed_generated_unit_bundle','wrong_original_runtime_hash'],
  fullMatchAdmission:false,modelCalls:0,trainingTruth:false};
 await atomicWrite(path.join(root,'docs/development/wave4/evidence/generated-prefix.public.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{native.close();}
