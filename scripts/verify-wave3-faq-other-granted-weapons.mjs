import assert from 'node:assert/strict';
import {base,output} from './support/wave3-faq-room-v1.mjs';
import {read,save} from './support/wave3-raven-tabletop-room-v1.mjs';
import {restoreOrPreparePositionedStandardOpening} from './support/wave3-standard-action-room-v1.mjs';
import {WAVE3_FAQ_V13_BYTE_HASH} from '../packages/rule-atoms/official-wave3-faq-clarifications-v1.mjs';
import {consumeOfficialSelectedRosterFirstWeaponModifierV1,resolveOfficialSelectedRosterAbilityModifiersV1} from '../packages/product-composition/official-selected-roster-ability-runtime-v1.mjs';
import {consumeOfficialBattlefieldAssetFirstWeaponEffectsV1,projectOfficialBattlefieldAssetFamilyModifiersV1} from '../packages/product-composition/official-battlefield-asset-family-adapter-v1.mjs';
import {consumeOfficialProtossUniqueFirstWeaponEffectV1,projectOfficialProtossUniqueFamilyModifiersV1,createOfficialProtossUniqueFamilyAdapterV1} from '../packages/product-composition/official-protoss-unique-family-adapter-v1.mjs';
const dir=output+'/other-weapon-grants',results=[];
function control(label,state,id,name,expected,consume,project){
  for(const current of [false,true]){
    const s=structuredClone(state);
    if(current)s.officialWave3FaqClarificationsHash=WAVE3_FAQ_V13_BYTE_HASH;else delete s.officialWave3FaqClarificationsHash;
    const p=s.pieces.find(p=>p.id===id);
    assert.equal(project(s,p,name),expected);
    consume(s,id,name);const after=project(s,p,name);
    assert.equal(after,current?expected:0,label);
    assert.equal(project(s,p,'a different weapon'),0,label);
    consume(s,id,'a different weapon');assert.equal(project(s,p,name),after);
    assert.equal(project({...s,round:s.round+1},p,name),0,label);
    results.push({label,current,weapon:name,before:expected,after,sibling:0,nextRound:0});
  }
}
const mutation=await read(base+'/wave3-inherited-faction-wild-mutation-shot-checkpoint.json');
control('Wild Mutation',mutation.state,mutation.action.pieceId,mutation.action.weaponName,1,consumeOfficialSelectedRosterFirstWeaponModifierV1,
  (s,p,weaponName)=>resolveOfficialSelectedRosterAbilityModifiersV1(s,p,{weaponName}).precision);
const orders=await read(base+'/wave3-raynor-orders-critical-checkpoint.json');
const ordersWeapon=(await read(base+'/wave3-raynor-orders-critical-consume.public.json')).weapon;
control('Orders',orders,'player1-marine-1',ordersWeapon,2,consumeOfficialBattlefieldAssetFirstWeaponEffectsV1,
  (s,p,weaponName)=>projectOfficialBattlefieldAssetFamilyModifiersV1(s.officialBattlefieldAssetFamilySourceBundle,s,{pieceId:p.id,context:{weaponName}}).criticalHit);
const reference=await read(base+'/khassar-supply-standard-2.84.0/coverage.json');
reference.recipes.player1.tacticalCardRecordKeys=['tactical_cards:nexus'];reference.compareReadOnlyAdmission=true;
const actor='adept',state=await restoreOrPreparePositionedStandardOpening({dir,roomId:'faq74-ancient-pride',reference,candidateVersion:'2.99.5',scene:{positions:{adept:[16,12]}}});
Object.assign(state,{stage:'activation_phases',phase:'assault',activeSideKey:'player1'});
state.selectedRosterActivationWindow={schema:'starcraft_tmg_selected_roster_activation_window_v1',pieceId:actor,sideKey:'player1',round:state.round,phase:'assault',stage:'before_action',trainingTruth:false};
const native=createOfficialProtossUniqueFamilyAdapterV1(state.officialProtossUniqueFamilySourceBundle);
const domain=native.legalSpace(state,{sideKey:'player1'}).parameterDomains.find(d=>d.definitionId==='card:nexus/ancient-pride-any@1' && d.pieceId===actor);
assert(domain);
const action=native.preview(state,{domain,parameters:{activeUnitId:actor}}).action;
const granted=native.apply(state,{action}).state;
const weapon=state.officialAttackProfileCatalogueV2.profiles.find(p=>p.recordKey==='army_units:adept' && p.profileKey.includes('::assault::')).weaponName;
control('Ancient Pride',granted,actor,weapon,1,consumeOfficialProtossUniqueFirstWeaponEffectV1,
  (s,p,weaponName)=>Number(projectOfficialProtossUniqueFamilyModifiersV1(s.officialProtossUniqueFamilySourceBundle,s,{pieceId:p.id,weaponName,attackKind:'ranged'}).firstWeaponInstant));
await save(dir+'/result.public.json',{faq:74,scope:'Native modifier query and weapon completion for related cards, using two saved paid effects and one product card activation',results,providerCalls:0});
