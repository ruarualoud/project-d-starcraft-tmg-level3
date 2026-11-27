import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4TurretInputs,bindWave4TurretRoom} from './support/wave4-turret-room-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const inputs=await loadWave4TurretInputs(root);const read=async f=>JSON.parse(await fs.readFile(path.join(root,f),'utf8'));
const proofs=await Promise.all(['virus-restrictions','virus-mass-recall'].map(id=>read('docs/development/wave4/evidence/'+id+'.public.json')));
const auditDirectory=await fs.mkdtemp(path.join(root,'build/wave4-web/virus-restrictions/audit-'));const results=[];
for(const row of proofs.flatMap(proof=>proof.results)){
 const authority=await read(row.directoryRef+'/authority.json');const scope=await read(row.directoryRef+'/scope.json');
 const bound=await bindWave4TurretRoom({inputs,state:authority.state,...scope,directory:path.join(auditDirectory,row.id)});
 assert.equal(bound.runtime.descriptor.runtimeHash,row.runtimeHash);
 const native=bound.open({readOnly:true,directory:path.join(root,row.directoryRef)});
 try{
  await native.restoreDependencies(row.roomId,authority);const replay=await native.store.loadReplayBundle(row.roomId);
  const journal=replay.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt);
  const full=native.engine.replay({initialEnvelope:replay.initialEnvelope,journal});assert.equal(full.ok,true);
  assert.equal(full.envelope.stateHash,row.stateHash);
  const state=full.envelope.state;const initial=replay.initialEnvelope.state;
  const query=bound.runtime.query(initial,{queryKind:'unit_restrictions',pieceId:initial.pieces.some(p=>p.id==='enemy')?'enemy':'fallen'});
  assert.equal(query.mutationAuthority,false);
  const attacks=state.log.flatMap(r=>r.events||[]).filter(e=>e.type==='ranged_attack').map(e=>({pieceId:e.pieceId,hits:e.stages?.hits,armourDice:e.stages?.armourDice,totalDamage:e.stages?.totalDamage}));
  const reactions=(state.officialReactionHistory||[]).map(r=>r.definitionId);
  if(row.id==='growing-clean-control')assert.ok(reactions.includes('card:engineering_bay/infantry-armor-any@2'));
  if(row.id==='growing-blocks-armour')assert.ok(!reactions.includes('card:engineering_bay/infantry-armor-any@2'));
  results.push({id:row.id,currentRuntimeColdReplay:true,queryReceiptHash:query.queryReceiptHash,initialRestrictionFacts:query.result,attacks,reactions});
 }finally{native.close();}
}
const result={schema:'starcraft_tmg_wave4_virus_current_consumer_audit_v1',status:'passed',runRef:path.relative(root,auditDirectory),results,modelCalls:0,trainingTruth:false};
await atomicWrite(path.join(root,'docs/development/wave4/evidence/virus-audit.public.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({status:result.status,cases:results.length,attacks:results.filter(r=>r.attacks.length)}));
