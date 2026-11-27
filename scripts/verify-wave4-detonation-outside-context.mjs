import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4StukovUnitInputs} from './compile-wave4-stukov-units.mjs';
import {bindWave4TurretRoom} from './support/wave4-turret-room-v1.mjs';
import {createOfficialCharacteristicStatusComponentRuntimeV2} from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),inputs=await loadWave4StukovUnitInputs(root);
const read=async ref=>JSON.parse(await fs.readFile(path.join(root,ref),'utf8'));
const proof=await read('docs/development/wave4/evidence/detonation-outside.public.json'),entry=proof.results.find(r=>r.use);
const authority=await read(entry.directoryRef+'/authority.json'),scope=await read(entry.directoryRef+'/scope.json');
const directory=await fs.mkdtemp(path.join(root,'build/wave4-web/stukov-units/detonation-outside-context-'));
const bound=await bindWave4TurretRoom({inputs,state:authority.state,...scope,directory});
const native=bound.open({directory:path.join(root,entry.directoryRef),readOnly:true}),checks=[];
try{await native.restoreDependencies(entry.roomId,authority);const b=await native.store.loadReplayBundle(entry.roomId);
 const journal=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt);
 const detonationRevision=entry.trace.find(t=>t.definitionId?.includes('/detonation-')).revision;
 const prefix=entry.trace.find(t=>t.revision>detonationRevision&&t.actionType==='roll_automatic_hits_armour_pool').revision-1;
 const replay=native.engine.replay({initialEnvelope:b.initialEnvelope,journal:journal.slice(0,prefix)});assert.equal(replay.ok,true);
 const s=replay.envelope.state,frame=s.officialBeforeCasualtyContinuations.at(-1);
 assert.equal(frame.activationContext.activationId,null);assert.ok(frame.suspendedHostSlots.pendingOfficialRavenSeekerPhaseEnd);assert.ok(!s.pendingOfficialRavenSeekerPhaseEnd);
 const runtime=createOfficialCharacteristicStatusComponentRuntimeV2({context:inputs.context,spatialState:authority.state,
  definitionIds:scope.characteristicRuntimeDefinitionIds,sourceDefinitionIds:scope.sourceDefinitionIds,...scope.runtimeOptions});
 const action=Object.fromEntries(Object.entries(runtime.hits.enumerate(s).candidates[0]).filter(([k])=>!['isEnabled','disabledReason','score'].includes(k)));
 const context=runtime.hits.inspectContext(s,action);assert.equal(context.reactionTiming,'outside_activation');assert.equal(context.reactionActivationContext.activationId,null);
 checks.push({id:'actual-child-hits-inherits-outside-context',signedPrefix:prefix,prefixStateHash:replay.envelope.stateHash,context});
 const modified=structuredClone(s),p=modified.pendingOfficialAutomaticHits;delete p.parentHash;p.reactionTiming='inside_activation';p.parentHash=hash(p);
 assert.throws(()=>runtime.hits.enumerate(modified));checks.push({id:'resealed-wrong-child-timing-rejected',passed:true});
 for(const r of proof.results){assert.ok(r.windows.some(w=>w.kind==='before_casualty_batch'&&w.activationId===null&&w.prioritySideKeys[0]==='player2'));
  checks.push({id:r.id+'-marker-holder-priority',passed:true});}
 const expected=await native.store.loadRoom(entry.roomId),full=native.engine.replay({initialEnvelope:b.initialEnvelope,journal});assert.equal(full.ok,true);assert.deepEqual(full.envelope,expected.envelope);
 assert.ok(expected.envelope.state.pieces.every(p=>p.isDestroyed&&p.currentModels===0));
 checks.push({id:'post-annihilation-round-and-score-cold-replay',originalSignedActions:expected.stateRevision,passed:true,
  finalPieces:expected.envelope.state.pieces.map(p=>({id:p.id,isDestroyed:p.isDestroyed,currentModels:p.currentModels,currentSupply:p.currentSupply}))});
}finally{native.close();}
await atomicWrite(path.join(root,'docs/development/wave4/evidence/detonation-outside-context.public.json'),JSON.stringify({schema:'starcraft_tmg_wave4_detonation_outside_context_v1',status:'passed_scoped_read_only',checks,nativeActionsAdded:0,modelCalls:0,trainingTruth:false},null,2));
console.log(JSON.stringify({status:'passed_scoped_read_only',checks:checks.length}));
