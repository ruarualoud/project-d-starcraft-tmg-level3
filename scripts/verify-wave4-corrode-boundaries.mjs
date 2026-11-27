import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4StukovUnitInputs} from './compile-wave4-stukov-units.mjs';
import {bindWave4TurretRoom} from './support/wave4-turret-room-v1.mjs';
import {openWave3EngineeringStoreV1} from './support/wave3-room-boundary-fixture-v1.mjs';
import {OFFICIAL_CORRODE_ARMOUR_ID} from '../packages/source-data/official-corrode-armour-source-v1.mjs';
import {resolveOfficialEffectiveCombatProfileV1,applyOfficialCorrodeArmourDebuffV1} from '../packages/product-composition/official-characteristic-status-family-adapter-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),inputs=await loadWave4StukovUnitInputs(root);
const read=async ref=>JSON.parse(await fs.readFile(path.join(root,ref),'utf8'));
const basic=await read('docs/development/wave4/evidence/corrode-armour-basic.public.json'),use=basic.results.find(r=>r.use);
const store=openWave3EngineeringStoreV1({directory:path.join(root,use.directoryRef),filename:'room.sqlite',readOnly:true});
let final;try{final=(await store.loadRoom(use.roomId)).envelope.state;}finally{store.close();}
const checks=[],targetId='infected',profile=s=>resolveOfficialEffectiveCombatProfileV1(s,s.pieces.find(p=>p.id===targetId));
assert.equal(profile(final).armourThreshold,5);
for(const [id,changes]of [['modifier',{modifier:-2}],['feature-hash',{sourceFeatureHash:'0'.repeat(64)}],['friendly-source',{sourceSideKey:'player2'}],
 ['expiry',{expiresAt:'round_end'}],['round',{roundApplied:2}],['reaction-proof',{reactionActionHash:'invalid'}]]){
 const s=structuredClone(final),target=s.pieces.find(p=>p.id===targetId),index=target.statuses.findIndex(st=>st.sourceDefinitionId===OFFICIAL_CORRODE_ARMOUR_ID);
 const {statusEffectHash,...body}=target.statuses[index],modified={...body,...changes};target.statuses[index]={...modified,statusEffectHash:hash(modified)};
 assert.throws(()=>profile(s),/CORRODE_ARMOUR_STATUS_INVALID/);checks.push({id:'forged-status-'+id,rejected:true});
}
const duplicate=structuredClone(final),target=duplicate.pieces.find(p=>p.id===targetId),source=duplicate.pieces.find(p=>p.id==='stukov');
const route=duplicate.officialReactionFamilySourceBundle.routes.find(r=>r.definitionId===OFFICIAL_CORRODE_ARMOUR_ID),existing=target.statuses.find(s=>s.sourceDefinitionId===route.definitionId);
assert.equal(applyOfficialCorrodeArmourDebuffV1(duplicate,route,source,target,existing.reactionActionHash).alreadyApplied,true);
assert.equal(target.statuses.filter(s=>s.sourceDefinitionId===route.definitionId).length,1);assert.equal(profile(duplicate).armourThreshold,5);
checks.push({id:'same-source-does-not-stack',componentOnly:true,passed:true});
const dead=structuredClone(final),caster=dead.pieces.find(p=>p.id==='stukov');Object.assign(caster,{isDestroyed:true,isOnField:false,currentModels:0});
caster.models.forEach(m=>Object.assign(m,{isDestroyed:true,isOnField:false}));assert.equal(profile(dead).armourThreshold,5);
checks.push({id:'existing-debuff-survives-caster-death',componentOnly:true,passed:true});
const round=await read('docs/development/wave4/evidence/corrode-armour-round.public.json'),authority=await read(round.directoryRef+'/authority.json'),scope=await read(round.directoryRef+'/scope.json');
const out=await fs.mkdtemp(path.join(root,'build/wave4-web/stukov-units/corrode-boundary-'));
const bound=await bindWave4TurretRoom({inputs,state:authority.state,...scope,directory:out});
const native=bound.open({directory:path.join(root,round.directoryRef),readOnly:true});
try{await native.restoreDependencies(round.roomId,authority);const b=await native.store.loadReplayBundle(round.roomId);
 const journal=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt);
 for(const [type,threshold]of [['resolve_current_product_end_of_round_effects',5],['resolve_current_product_cleanup_refresh',4]]){
  const count=round.trace.find(r=>r.actionType===type).revision,replayed=native.engine.replay({initialEnvelope:b.initialEnvelope,journal:journal.slice(0,count)});
  assert.equal(replayed.ok,true);assert.equal(profile(replayed.envelope.state).armourThreshold,threshold);
  checks.push({id:type,originalSignedPrefix:count,armourThreshold:threshold,prefixStateHash:replayed.envelope.stateHash,newActions:0});
 }
}finally{native.close();}
const observations=[];
for(const name of ['corrode-armour-basic','corrode-armour-restoration','corrode-armour-successor','corrode-armour-lunge','corrode-armour-controls']){
 const p=await read('docs/development/wave4/evidence/'+name+'.public.json');
 for(const r of p.results){const s=openWave3EngineeringStoreV1({directory:path.join(root,r.directoryRef),filename:'room.sqlite',readOnly:true});
  try{const h=await s.loadRoom(r.roomId),attack=h.envelope.state.log.flatMap(l=>l.events||[]).find(e=>e.type==='ranged_attack'&&e.pieceId==='stukov');
   assert.ok(attack);observations.push({id:r.id,roomId:r.roomId,originalDamage:attack.stages.damage.totalDamage,
    corrodeUsed:Boolean(r.used),signedActions:r.signedActions,stateHash:h.envelope.stateHash});
   if(r.successor){const next=h.envelope.state.log.flatMap(l=>l.events||[]).find(e=>e.type==='ranged_attack'&&e.pieceId==='friendly');
    assert.equal(next.stages.armour.threshold,5);assert.ok(next.stages.armour.rolls.length>0);
    checks.push({id:'actual-next-rifle-armour-roll',roomId:r.roomId,armourThreshold:5,armourRolls:next.stages.armour.rolls,newActions:0});}
  }finally{s.close();}
 }
}
const result={schema:'starcraft_tmg_wave4_corrode_boundaries_v1',status:'passed_scoped',checks,observations,nativeActionsAdded:0,
 zeroDamageCorrodeObserved:observations.some(r=>r.originalDamage===0&&r.corrodeUsed),newGameAtomsImplemented:0,implementedCumulativeAtoms:6,
 fullMatchAdmission:false,sourceHeldDefinitions:39,modelCalls:0,trainingTruth:false};
await atomicWrite(path.join(root,'docs/development/wave4/evidence/corrode-armour-boundaries.public.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({status:result.status,checks:checks.length,zeroDamageCorrodeObserved:result.zeroDamageCorrodeObserved}));
