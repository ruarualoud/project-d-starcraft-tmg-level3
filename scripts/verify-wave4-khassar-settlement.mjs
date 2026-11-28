import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {openWave3EngineeringStoreV1} from './support/wave3-room-boundary-fixture-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),proof=JSON.parse(await fs.readFile(path.join(root,'docs/development/wave4/evidence/detonation-khassar.public.json'),'utf8')),results=[];
assert.equal(proof.status,'passed_scoped');assert.equal(proof.results.length,6);
for(const entry of proof.results){
 const store=openWave3EngineeringStoreV1({directory:path.join(root,entry.directoryRef),filename:'room.sqlite',readOnly:true});
 try{const head=await store.loadRoom(entry.roomId),state=head.envelope.state,events=state.log.flatMap(l=>l.events||[]),actor=state.pieces.find(p=>p.id==='actor'),recipient=state.pieces.find(p=>p.id==='recipient'),
   completed=events.filter(e=>e.type==='khassar_non_lethal_damage_after_'+entry.kind);
  assert.equal(completed.length,1);assert.equal(events.filter(e=>e.type==='khassar_faction_card_exhausted').length,1);
  assert.equal(events.filter(e=>e.type==='unit_activation_finished'&&e.pieceId==='actor').length,actor.isDestroyed?0:1);
  const damage=completed[0].damage;
  if(recipient.isDestroyed){assert.equal(damage.reason,'recipient_destroyed');assert.equal(damage.effectiveDamage,0);}
  else{assert.equal(damage.nonLethalDamage,3);assert.equal(damage.postDamageMarker-damage.priorDamageMarker,3);assert.equal(recipient.damageMarker,damage.postDamageMarker);assert.deepEqual(damage.casualtyModelIds,[]);}
  assert.equal(state.activeAbilityUseHistory.filter(e=>e.pieceId==='actor'&&e.routeId==='card:templar_caste/khassar-de-templari-any@1').length,1);
  for(const key of ['pendingOfficialKhassarShot','pendingOfficialKhassarFight','pendingOfficialKhassarCharge','pendingAction','pendingOfficialAutomaticHits','pendingOfficialReactionWindow','pendingOfficialMeleeSidearmSequence','pendingCurrentProductRangedSequence'])assert.ok(!state[key],key);
  assert.ok(!state.selectedRosterActivationWindow&&!state.officialBeforeCasualtyContinuations?.length&&!state.pieces.some(p=>p.officialBeforeCasualtyReservations?.length));
  results.push({id:entry.id,originalSignedActions:head.stateRevision,recipientDestroyed:recipient.isDestroyed,actorDestroyed:actor.isDestroyed,
   damage,cardExhaustedEvents:1,abilityUses:1,actorFinishEvents:actor.isDestroyed?0:1,noHangingContinuation:true,newActions:0});
 }finally{store.close();}
}
await atomicWrite(path.join(root,'docs/development/wave4/evidence/khassar-settlement.public.json'),JSON.stringify({schema:'starcraft_tmg_wave4_khassar_settlement_v1',status:'passed_read_only',
 results,modelCalls:0,trainingTruth:false},null,2));
console.log(JSON.stringify({status:'passed_read_only',cases:results.length,originalSignedActions:results.reduce((n,r)=>n+r.originalSignedActions,0)}));
