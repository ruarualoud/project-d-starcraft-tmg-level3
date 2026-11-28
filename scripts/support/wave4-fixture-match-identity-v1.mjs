import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../../packages/authoritative-engine/referee-crypto-v1.mjs';
import {projectStarcraftTmgFiniteActionV1} from '../../packages/authoritative-engine/transition-v1.mjs';

// Development fixture identity selection only. This never changes a pending
// Room binding, rolls, HMAC key, referee or product randomness implementation.
// The selected identity is fixed before the persistent Room is created.
export function selectWave4SourceArmourFixtureIdentity({native,head,finite}){
 const envelope=head.envelope,{bindingHash,refereeSignature,...core}=envelope.matchBinding;
 assert.equal(hash(core),bindingHash);assert.equal(core.productionReady,false);
 assert.equal(finite.action.actionType,'roll_automatic_hits_armour_pool');assert.equal(finite.action.chance.count,5);
 const projectionFor=matchBindingHash=>projectStarcraftTmgFiniteActionV1({...finite.action,isEnabled:true},{matchBindingHash,
  stateHash:envelope.stateHash,stateRevision:head.stateRevision,sideKey:finite.action.sideKey});
 assert.equal(projectionFor(bindingHash).actionKey,finite.actionKey);
 for(let index=0;index<10000;index++){
  const matchId='wave4-drone-armour-boundary-'+index,candidateHash=hash({...core,matchId}),action=projectionFor(candidateHash),
   proposalHash=hash({kind:'finite',actionKey:action.actionKey}),rolls=Array.from({length:5},(_,counter)=>{
    const ticket=native.engine.createChanceTicket({matchBindingHash:candidateHash,stateHash:envelope.stateHash,stateRevision:head.stateRevision,
     proposalHash,counter,faces:6,rngSchemeId:core.rngSchemeId});const r=native.engine.revealChanceTicket(ticket);assert.equal(r.ok,true);return r.outcome;});
  if(rolls.filter(r=>r===6).length!==3)continue;
  return{schema:'starcraft_tmg_wave4_fixture_match_identity_v1',scope:'development branch coverage; not a production fairness audit',
   matchId,bindingHash:candidateHash,prefixStateHash:envelope.stateHash,prefixRevision:head.stateRevision,proposalHash,
   predictedFirstArmourRolls:rolls,identitiesInspected:index+1,selectedBeforePersistentRoomCreation:true,productRandomnessUnchanged:true,trainingTruth:false};
 }
 throw Error('WAVE4_FIXTURE_IDENTITY_COVERAGE_NOT_FOUND');
}
