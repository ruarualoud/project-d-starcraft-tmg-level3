import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {openWave3EngineeringStoreV1} from './support/wave3-room-boundary-fixture-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),results=[];
for(const name of ['detonation-consume','consume-dark-swarm']){
  const proof=JSON.parse(await fs.readFile(path.join(root,'docs/development/wave4/evidence/'+name+'.public.json'),'utf8'));
  assert.equal(proof.status,'passed_scoped');
  for(const row of proof.results){
    const store=openWave3EngineeringStoreV1({directory:path.join(root,row.directoryRef),filename:'room.sqlite',readOnly:true});
    try{
      const head=await store.loadRoom(row.roomId),bundle=await store.loadReplayBundle(row.roomId),
        receipts=bundle.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt),
        events=receipts.flatMap(r=>r.events),state=head.envelope.state;
      assert.equal(head.envelope.stateHash,row.stateHash);assert.equal(state.officialConsumePaymentHistory.length,1);
      const payment=state.officialConsumePaymentHistory[0],removed=events.filter(e=>e.type==='consume_model_removed');
      assert.equal(removed.length,1);assert.equal(removed[0].paymentReceiptHash,payment.paymentReceiptHash);
      assert.equal(events.filter(e=>e.type==='consume_payment_committed').length,1);
      assert.equal(payment.generatedFromModel,1);assert.equal(payment.retainedAfterPayment,0);assert.equal(payment.modelsBefore-payment.modelsAfter,1);
      const losses=events.filter(e=>e.type==='supply_loss_recorded'&&e.unitId===payment.sacrificePieceId
        &&e.causeKind==='consume_resource_payment');
      assert.equal(losses.length,payment.supplyBefore>payment.supplyAfter?1:0);
      assert.equal(losses.reduce((n,e)=>n+e.supplyDelta,0),payment.supplyBefore-payment.supplyAfter);
      assert.ok(losses.every(e=>!e.scoreable&&e.attributionStatus==='exact_rules_owned_self_removal'));
      assert.equal(state.unitDestructionLifecycleHistory.filter(r=>r.schema==='starcraft_tmg_consume_destruction_resolution_v1'
        &&r.sourcePaymentPlanHash===payment.paymentPlanHash).length,1);
      assert.equal(state.officialMissionRuntimeState.scoringHistory.length,1);
      assert.ok(!state.pendingOfficialConsumePayment&&!state.pendingOfficialPaidPlague&&!state.officialBeforeCasualtyContinuations?.length);
      results.push({id:row.id,roomId:row.roomId,originalSignedActions:receipts.length,sourceOpenedReadOnly:true,newActions:0,
        originalRemovalExactlyOnce:true,generatedBiomass:1,retainedBiomass:0,consumeSupplyLost:payment.supplyBefore-payment.supplyAfter,
        consumeSupplyLossEvents:losses.length,selfRemovalNeverCreditsOpponent:true,lastModelDestruction:true,
        zeroSupplyDestruction:payment.supplyBefore===0,oneScoringStep:true});
    }finally{store.close();}
  }
}
const result={schema:'starcraft_tmg_wave4_consume_settlement_v1',status:'passed_read_only',results,
  cases:results.length,originalSignedActions:results.reduce((n,r)=>n+r.originalSignedActions,0),
  consumeSupplyLost:results.reduce((n,r)=>n+r.consumeSupplyLost,0),zeroSupplyDestructions:results.filter(r=>r.zeroSupplyDestruction).length,
  modelCalls:0,trainingTruth:false};
await atomicWrite(path.join(root,'docs/development/wave4/evidence/consume-settlement.public.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({status:result.status,cases:result.cases,consumeSupplyLost:result.consumeSupplyLost,zeroSupplyDestructions:result.zeroSupplyDestructions,newActions:0}));
