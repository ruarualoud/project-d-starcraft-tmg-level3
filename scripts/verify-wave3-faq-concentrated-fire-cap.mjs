import assert from 'node:assert/strict';
import {read,save} from './support/wave3-raven-tabletop-room-v1.mjs';
import {output} from './support/wave3-faq-room-v1.mjs';
import {WAVE3_FAQ_V13_BYTE_HASH} from '../packages/rule-atoms/official-wave3-faq-clarifications-v1.mjs';
import {resolveOfficialNonLethalDamageV1} from '../packages/rule-atoms/official-non-lethal-damage-rules-kernel-v1.mjs';
import {resolveOfficialSelectedRosterRangedChanceV1,resolveOfficialCurrentProductCasualtyDomainV1,applyOfficialSelectedRosterResolvedDamageV1,enumerateOfficialSelectedRosterRangedActionsV1,instantiateOfficialSelectedRosterRangedActionV1} from '../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs';
const dir='build/ticket-28-wave2-capabilities-20261113-v1/immortal-photon-weapons/sample-1';
const original=(await read(dir+'/left-before.json')).envelope,record=(await read(dir+'/left-result.json')).event;
const rows=[];
for(const kind of ['standard','non_lethal']){
  for(const current of [false,true]){
    const s=structuredClone(original.state),target=s.pieces.find(p=>p.id===record.targetId);
    if(current)s.officialWave3FaqClarificationsHash=WAVE3_FAQ_V13_BYTE_HASH;
    const profile=s.officialCombatProfileBundle.profiles.find(p=>p.recordKey===target.officialUnitRecordKey);
    if(kind==='non_lethal'){
      target.damageMarker=resolveOfficialNonLethalDamageV1({targetPieceId:target.id,targetModelId:target.models[0].id,priorDamageMarker:0,amount:1,targetHitPoints:profile.hitPoints,abilityResolutionHash:record.attackResolutionHash}).postDamageMarker;
    }else target.damageMarker=1;
    const domain=enumerateOfficialSelectedRosterRangedActionsV1(s).parameterDomains.find(d=>d.pieceId===record.pieceId&&d.weaponName===record.weaponName);
    const attack=instantiateOfficialSelectedRosterRangedActionV1(s,domain,{targetUnitId:target.id}).action;
    const hit=resolveOfficialSelectedRosterRangedChanceV1(s,attack,{chanceReveals:record.chanceReveals});
    const c=hit.casualtyDomain;assert.equal(c.totalDamage,3);assert.equal(c.casualtyCount,1);
    const casualty=resolveOfficialCurrentProductCasualtyDomainV1(c,c.legalSelections[0].selectionHash);
    applyOfficialSelectedRosterResolvedDamageV1(s,target,profile,casualty);
    rows.push({kind,current,damage:hit.resolution.stages.damage.totalDamage,casualties:casualty.casualtyModelIds,remainingMarker:target.damageMarker,discarded:c.discardedOverflowDamage});
  }
}
const summary={faq:93,source:dir,sourceHash:original.stateHash,recordedRolls:record.chanceReveals,rows,providerCalls:0};
if(process.argv.includes('--capture-old')){await save(output+'/concentrated-fire/red.public.json',summary);assert(rows.every(r=>r.remainingMarker===1));}
else {for(const r of rows){assert.equal(r.remainingMarker,r.current?0:1);assert.equal(r.discarded,r.current?1:0);}
await save(output+'/concentrated-fire/result.public.json',summary);}
