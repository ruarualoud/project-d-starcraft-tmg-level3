import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {openWave3EngineeringStoreV1} from './support/wave3-room-boundary-fixture-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const names=process.argv.includes('--multi-target')?['detonation-nested-host','detonation-multi-target']:['detonation-nested-host'];
const audits=[];
for(const name of names){
 const proof=JSON.parse(await fs.readFile(path.join(root,'docs/development/wave4/evidence/'+name+'.public.json'),'utf8'));
 for(const entry of [...proof.results,...(proof.noDamageControls||[])]){
  const directory=path.join(root,entry.directoryRef),authority=JSON.parse(await fs.readFile(path.join(directory,'authority.json'),'utf8'));
  const store=openWave3EngineeringStoreV1({directory,filename:'room.sqlite',readOnly:true});
  try{const head=await store.loadRoom(entry.roomId),s=head.envelope.state,events=s.log.flatMap(l=>l.events||[]),losses=s.supplyLossLedger.entries||[];
   assert.equal(head.envelope.stateHash,entry.stateHash);assert.equal(events.filter(e=>e.type==='close_combat_attack').length,1);
   for(const frame of entry.frames){
    assert.deepEqual(frame.activationContext,entry.frames[0].activationContext);
    for(const row of frame.rows){
     const matches=events.filter(e=>e.targetId===row.targetPieceId&&(e.resolutionHash===row.attackResolutionHash||e.stages?.resolutionHash===row.attackResolutionHash));
     assert.equal(matches.length,1);assert.deepEqual(matches[0].casualtyModelIds,row.casualty.casualtyModelIds);
    }
   }
   for(const piece of s.pieces){const initial=authority.state.pieces.find(p=>p.id===piece.id),entries=losses.filter(e=>e.unitId===piece.id);
    assert.equal(entries.reduce((sum,e)=>sum+e.currentSupplyBefore-e.currentSupplyAfter,0),initial.currentSupply-piece.currentSupply);
    if(entry.coverageSatisfied&&entry.use&&!(piece.id==='ally'&&entry.allyKind==='allocation-only')){assert.equal(piece.isDestroyed,true);assert.equal(entries.length,1);}
   }
   assert.ok(!s.officialBeforeCasualtyContinuations?.length&&!s.pendingOfficialAutomaticHits&&!s.pendingAction);
   assert.ok(!s.pieces.some(p=>p.officialBeforeCasualtyReservations?.length));
   if(entry.allyKind==='casualty'){
    const multi=entry.frames.find(f=>f.rows.length===2);assert.ok(multi);
    assert.ok(entry.trace.some(t=>t.definitionId?.includes('/detonation-')&&t.stackDepth===2&&t.sourceInstanceId!==multi.rows[0].targetPieceId));
   }
   audits.push({id:entry.id,roomId:entry.roomId,stateHash:entry.stateHash,signedActions:entry.signedActions,
    originalResolutionAndCasualtyOrderPreserved:true,originalActivationContextPreserved:true,supplyLossesExactlyOnce:true,
    stalePendingSlotsAbsent:true,nonPrimarySourceWitnessVerified:entry.allyKind==='casualty'});
  }finally{store.close();}
 }
}
const result={schema:'starcraft_tmg_wave4_detonation_settlement_audit_v1',status:'passed_scoped',audits,nativeActionsAdded:0,
 modelCalls:0,trainingTruth:false};
await atomicWrite(path.join(root,'docs/development/wave4/evidence/detonation-settlement-audit.public.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({status:result.status,cases:audits.length}));
