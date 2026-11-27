import assert from 'node:assert/strict';
import {read,save} from './support/wave3-raven-tabletop-room-v1.mjs';
import {bindWave3StandardActionRoom} from './support/wave3-standard-action-room-v1.mjs';
import {manifestRef,output,savedRoom} from './support/wave3-faq-room-v1.mjs';
const dir='build/ticket-28-wave3-khassar-melee-supply/zealot-engagement';
const id='formal-khassar-zealot-melee-supply',s=await savedRoom(dir,id);
const reference=await read(dir+'/result.public.json');
assert.equal(s.head.stateHash,reference.stateHash);
const bound=await bindWave3StandardActionRoom({manifestRef,initial:s.initial.state,dir,candidateVersion:reference.version,frozenRuntimeRef:dir+'/runtime.json'});
const app=bound.open({readOnly:true});
try {
  await app.restoreDependencies(id,bound.authority);
  const rows=[];
  for(const r of [0,1,2,3,4,5,6]){
    const e=r===0?s.initial:r===6?s.head:app.engine.replay({initialEnvelope:s.initial,journal:s.journal.slice(0,r)}).envelope;
    assert.equal(e.stateHash,r?s.journal[r-1].postStateHash:s.initial.stateHash);
    const st=e.state,menu=bound.runtime.enumerate(st,{sideKey:st.activeSideKey});
    rows.push({revision:r,side:st.activeSideKey,window:st.selectedRosterActivationWindow??null,domains:menu.parameterDomains.map(d=>[d.actionType,d.pieceId,d.definitionId]),
      finite:menu.candidates.filter(c=>c.isEnabled).map(c=>[c.actionType,c.pieceId,c.definitionId])});
  }
  verifyKhassarMenus(rows,s.head.stateHash);
  await save(output+'/khassar-activation/menus.public.json',rows);
  await save(output+'/khassar-activation/result.public.json',{faq:65,source:dir,signedStateHash:s.head.stateHash,rows,providerCalls:0});
  console.log(JSON.stringify(rows).slice(0,6500));
}finally{app.close();}

function verifyKhassarMenus(rows,hash){
  assert.match(hash,/^[0-9a-f]{64}$/);
  assert(rows[0].domains.some(([type,owner])=>type==='resolve_characteristic_status_ability'&&owner==='high_templar'));
  assert(rows[0].domains.some(([type])=>type==='delegate_khassar_fight'));
  const borrowed=rows.filter(row=>row.window?.pieceId==='zealot_ally');
  assert.equal(borrowed.length,5);
  for(const row of borrowed){
    for(const [type] of [...row.domains,...row.finite])assert(['fight','roll_melee_attack_armour_pool','resolve_melee_attack_evade_pool','resolve_reaction_family_ability','pass_reaction_family_window'].includes(type),type);
  }
  assert.deepEqual([rows.at(-1).window.pieceId,rows.at(-1).window.stage],['high_templar','after_action']);
}
