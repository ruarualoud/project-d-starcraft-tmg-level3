import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {openWave3EngineeringStoreV1} from './support/wave3-room-boundary-fixture-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const proof=JSON.parse(await fs.readFile(path.join(root,'docs/development/wave4/evidence/detonation-disengage.public.json'),'utf8'));
assert.equal(proof.results.length,12);const results=[];
for(const row of proof.results){
  const store=openWave3EngineeringStoreV1({directory:path.join(root,row.directoryRef),filename:'room.sqlite',readOnly:true});
  try{
    const head=await store.loadRoom(row.roomId),bundle=await store.loadReplayBundle(row.roomId),
      receipts=bundle.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt),
      events=receipts.flatMap(r=>r.events),original=events.filter(e=>e.type==='unit_disengage_resolved');
    assert.equal(head.envelope.stateHash,row.stateHash);assert.equal(receipts.length,row.signedActions);
    assert.equal(original.length,1);assert.equal(original[0].spatialPlanHash,row.originalPlanHash);
    assert.deepEqual(original[0].casualtyModelIds,row.frames[0].rows[0].casualty.casualtyModelIds);
    const losses=events.filter(e=>e.type==='supply_loss_recorded'),owned=losses.filter(e=>e.unitId==='actor'&&e.causeKind==='disengage_removal');
    assert.equal(losses.length,new Set(losses.map(e=>e.entryHash)).size);
    const score=events.filter(e=>e.type==='mission_victory_points_scored');assert.equal(score.length,1);
    if(row.kind==='last'){
      const actor=head.envelope.state.pieces.find(p=>p.id==='actor');
      assert.equal(actor.isDestroyed,true);assert.equal(actor.currentSupply,0);
      assert.equal(head.envelope.state.unitDestructionLifecycleHistory.filter(r=>r.schema==='starcraft_tmg_disengage_destruction_v1'&&r.pieceId==='actor').length,1);
      assert.equal(owned.length,row.unitKey==='infested_marine'?1:0);
      if(owned.length)assert.equal(owned[0].supplyDelta,1);
      // Preserve the existing unresolved attribution for Disengage. A self
      // removal does not invent an enemy attack or an extra scoring step.
      assert.equal(score[0].breakdowns.player2.destroyedEnemySupplyVp,0);
    }
    results.push({id:row.id,originalSignedActions:row.signedActions,originalRemovalInSignedEventsExactlyOnce:true,
      directSupplyLossEvents:owned.length,directSupplyLost:owned.reduce((n,e)=>n+e.supplyDelta,0),
      lastModelDestructionVerified:row.kind==='last',oneScoringStep:true,readOnly:true,newActions:0,stateHash:head.envelope.stateHash});
  }finally{store.close();}
}
const result={schema:'starcraft_tmg_wave4_disengage_settlement_v1',status:'passed_read_only',results,
  scope:'original signed journals, destruction lifecycle and mission scoring; no reconstructed archive',
  fullMatchAdmission:false,modelCalls:0,trainingTruth:false};
await atomicWrite(path.join(root,'docs/development/wave4/evidence/disengage-settlement.public.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({status:result.status,cases:results.length,directSupplyCases:results.filter(r=>r.directSupplyLossEvents).length,
  directSupplyLost:results.reduce((n,r)=>n+r.directSupplyLost,0),lastModelCases:results.filter(r=>r.lastModelDestructionVerified).length,newActions:0}));
