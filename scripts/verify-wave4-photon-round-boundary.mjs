import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {openWave3EngineeringStoreV1} from './support/wave3-room-boundary-fixture-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const proof=JSON.parse(await fs.readFile(path.join(root,'docs/development/wave4/evidence/detonation-photon.public.json'),'utf8'));
assert.equal(proof.status,'passed_scoped');
const results=[];
for(const row of proof.results){
  const store=openWave3EngineeringStoreV1({directory:path.join(root,row.directoryRef),filename:'room.sqlite',readOnly:true});
  try{
    const head=await store.loadRoom(row.roomId),state=head.envelope.state;
    const bundle=await store.loadReplayBundle(row.roomId);
    const receipts=bundle.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt);
    const scoring=receipts.filter(r=>r.events.some(e=>e.type==='mission_victory_points_scored'));
    assert.equal(scoring.length,1);
    const score=scoring[0].events.find(e=>e.type==='mission_victory_points_scored');
    const losses=receipts.filter(r=>r.events.some(e=>e.type==='supply_loss_recorded'));
    assert.ok(losses.length>0);
    assert.ok(losses.every(r=>r.postStateRevision>scoring[0].postStateRevision));
    assert.deepEqual(state.scores,score.resultingScores);
    assert.equal(state.round,2);assert.equal(state.phase,'movement');
    assert.equal(state.officialMissionRuntimeState.scoringHistory.length,1);
    const rolls=state.officialArmourRollHistory.rolls;
    assert.ok(rolls.length>=1);
    assert.ok(rolls.every(r=>r.activationContextKind==='outside_activation'&&r.activationId===null
      &&r.armourRollOrdinalInActivation===null&&r.armourRollOrdinalInRound===1));
    assert.ok(rolls.some(r=>r.sourcePlanHash===row.originalSourcePlanHash&&r.targetPieceId==='actor'));
    if(row.use)assert.ok(rolls.some(r=>r.targetPieceId==='defender'));
    assert.equal((await store.loadRoom(row.roomId)).envelope.stateHash,head.envelope.stateHash);
    results.push({id:row.id,roomId:row.roomId,originalSignedActions:head.stateRevision,stateHash:head.envelope.stateHash,
      scoringRevision:scoring[0].postStateRevision,lateLossRevisions:losses.map(r=>r.postStateRevision),
      armourPools:rolls.length,outsideActivationPreserved:true,scoreBeforeRoundEndEffects:true,
      noImplicitRescoreOrVictoryAward:true,readOnly:true,newActions:0});
  }finally{store.close();}
}
const result={schema:'starcraft_tmg_wave4_photon_round_boundary_v1',status:'passed_read_only',results,
  ruleSequence:'8.9: score VP, end game check, end-round effects, cleanup, initiative',
  scope:'existing Photon journals only; late Supply losses remain ledger facts and do not insert an extra scoring step',
  modelCalls:0,trainingTruth:false,fullMatchAdmission:false};
await atomicWrite(path.join(root,'docs/development/wave4/evidence/photon-round-boundary.public.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify(result));
