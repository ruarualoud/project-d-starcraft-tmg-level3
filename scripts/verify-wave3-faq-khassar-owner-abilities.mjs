import assert from 'node:assert/strict';
import {read,save} from './support/wave3-raven-tabletop-room-v1.mjs';
import {restoreOrPreparePositionedStandardOpening} from './support/wave3-standard-action-room-v1.mjs';
import {base,output,savedRoom,signedBranch} from './support/wave3-faq-room-v1.mjs';
const parent='formal-khassar-zealot-melee-supply',sourceDir='build/ticket-28-wave3-khassar-melee-supply/zealot-engagement';
const original=await savedRoom(sourceDir,parent);
const reference=await read(base+'/khassar-supply-standard-2.84.0/coverage.json');
const recipient='zealot_ally',owner='high_templar',ability='card:gateway/quick-strikes-any@1';
reference.recipes.player1.units[1]={unitInstanceId:recipient,recordKey:'army_units:zealot',compositionKind:'small',upgradeNames:[]};
reference.recipes.player1.tacticalCardRecordKeys.push('tactical_cards:gateway');reference.compareReadOnlyAdmission=true;
const version='2.99.5',root=output+'/khassar-owner';
const initial=await restoreOrPreparePositionedStandardOpening({dir:root,roomId:'faq77-source',reference,candidateVersion:version,scene:{positions:{}}});
const results=[];
for(const [step,envelope] of [['before',original.initial],['after',original.head]]){
  const state=structuredClone(initial),old=envelope.state;
  for(const key of ['pieces','reserveManifestBySide','stage','phase','round','firstPlayerSideKey','activeSideKey','players','phaseFirstActorByRound','supplyLossLedger','officialRoundSupplyState','selectedRosterActivationWindow','currentProductMatchLifecycle','activeAbilityUseHistory','log']){
    if(Object.hasOwn(old,key))state[key]=structuredClone(old[key]);else delete state[key];
  }
  for(const side of ['player1','player2'])for(const card of state.cardResources[side]){
    const originalCard=old.cardResources[side].find(row=>row.cardInstanceId===card.cardInstanceId);
    if(originalCard)card.readiness=originalCard.readiness;
  }
  const id='faq77-owner-'+step,scene={parent,revision:envelope.stateRevision,sourceHash:envelope.stateHash,condition:'same activation state and unit records; caster side adds a legal ready Gateway'};
  results.push(await signedBranch({initial,state,dir:root+'/'+step,id,version,scene,perform:async({head,menu,commit})=>{
    if((await head()).stateRevision)return;
    const domains=(await menu()).parameterDomains;
    const a=domains.find(d=>d.pieceId===owner&&d.definitionId===ability);
    assert(a,JSON.stringify(domains.map(d=>[d.actionType,d.pieceId,d.definitionId])));
    assert(!domains.some(d=>d.pieceId===recipient&&d.definitionId===ability));
    const pay=a.parameterSchema.paymentCardInstanceIds;
    await commit(a,{activeUnitId:owner,paymentCardInstanceIds:pay.const??pay.enum[0]});
  },verify:async (h,ctx)=>{
    const effect=h.state.pieces.find(p=>p.id===owner).officialAbilityEffects.find(e=>e.sourceDefinitionId===ability);
    assert(effect&&effect.keyword==='precision');
    const next=(await ctx.menu()).parameterDomains;
    if(step==='before')assert(next.some(d=>d.actionType==='delegate_khassar_fight'));
    else {assert(next.some(d=>d.actionType==='finish_activation'&&d.pieceId===owner));assert(!next.some(d=>d.actionType==='delegate_khassar_fight'));}
    return {step,owner,ability,effectHash:effect.effectHash,stage:h.state.selectedRosterActivationWindow.stage};
  }}));
}
await save(root+'/result.public.json',{faq:77,results,providerCalls:0});
