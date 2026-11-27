import assert from 'node:assert/strict';
import {read} from './support/wave3-raven-tabletop-room-v1.mjs';
import {base,output,savedRoom,signedBranch} from './support/wave3-faq-room-v1.mjs';
import {restoreOrPreparePositionedStandardOpening} from './support/wave3-standard-action-room-v1.mjs';
import {declareWave3EngineeringCoherencyV1} from './support/wave3-room-boundary-fixture-v1.mjs';
import {initializeOfficialMatchRoundSupplyV1} from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import {projectOfficialCharacteristicStatusFamilyModifiersV1} from '../packages/product-composition/official-characteristic-status-family-adapter-v1.mjs';

const root=output+'/khassar-owner/before',source=await savedRoom(root,'faq77-owner-before');
const dir=output+'/repeat-weapon',id='faq74-double-fight',version='2.99.5';
const state=structuredClone(source.initial.state),actor='zealot_ally',target='zealot',caster='high_templar';
const ref=await read(base+'/khassar-supply-standard-2.84.0/coverage.json');
ref.recipes.player1.units[1]={unitInstanceId:actor,recordKey:'army_units:zealot',compositionKind:'small',upgradeNames:[]};
ref.recipes.player1.tacticalCardRecordKeys.push('tactical_cards:gateway');ref.compareReadOnlyAdmission=true;
const old=await read('build/ticket-28-wave3-khassar-melee-supply/zealot-engagement/result.public.json');
const initial=await restoreOrPreparePositionedStandardOpening({dir:dir+'/factory',roomId:id,reference:ref,candidateVersion:version,scene:old.scene});
const unit=(s,id)=>s.pieces.find(p=>p.id===id);
state.pieces[state.pieces.findIndex(p=>p.id===target)]=structuredClone(unit(initial,target));
unit(state,actor).activatedPhases.combat=false;
declareWave3EngineeringCoherencyV1(state,{planIdPrefix:id});
initializeOfficialMatchRoundSupplyV1(state,true);
const printed=d=>Object.fromEntries((d.parameterSchema.required??[]).map(k=>{
  const f=d.parameterSchema[k]??d.parameterSchema.properties?.[k];
  if(f?.type==='array'&&f.items?.enum&&d.constraints?.mayDecline)return [k,[]];
  assert(f?.enum?.length||Object.hasOwn(f??{},'const'),k);return [k,f.const??f.enum[0]];
}));
const scene={source:source.initial.stateHash,conditions:'Zealots start Combat available, defender at full signed roster strength; attacker Gateway ready'};
const events=s=>s.log.flatMap(e=>e.events??[]);
const attacks=s=>events(s).filter(e=>e.type==='close_combat_attack'&&e.targetId===target);
const ability='card:gateway/quick-strikes-any@1';
await signedBranch({dir,id,version,scene,initial,state,perform:async({head,menu,commit})=>{
  for(;;){
    const h=await head(),s=h.state;
    if(events(s).some(e=>e.type==='khassar_non_lethal_damage_after_fight'))break;
    assert(h.stateRevision<30);
    const {parameterDomains:ds,finiteActions:fs}=await menu();
    let d,args;
    if(!h.stateRevision){
      d=ds.find(d=>d.definitionId===ability&&d.pieceId===actor);
      assert(d);const f=d.parameterSchema.paymentCardInstanceIds;args={activeUnitId:actor,paymentCardInstanceIds:f.const??f.enum[0]};
    }else if(s.pendingOfficialReactionWindow)d=ds.find(d=>d.actionType==='pass_reaction_family_window');
    else if(ds.some(d=>d.parameterSchema.required?.includes('casualtySelectionHash')))
      d=ds.find(d=>d.parameterSchema.required.includes('casualtySelectionHash'));
    else{
      const roll=fs.find(r=>/roll_melee|resolve_melee/.test(r.action.actionType));
      d=roll??ds.find(d=>/pool|precision|casualty/.test(d.actionType));
      if(!d && s.selectedRosterActivationWindow?.stage==='after_action')
        d=ds.find(d=>d.actionType==='finish_activation');
      if(!d && s.activeSideKey==='player2'){
        d=ds.find(d=>d.actionType==='finish_activation')??fs.find(r=>r.action.actionType==='pass');
        if(!d&&!s.selectedRosterActivationWindow){
          d=ds.find(d=>d.actionType==='resolve_characteristic_status_ability' &&
            d.parameterSchema.required?.every(k=>['activeUnitId','paymentCardInstanceIds','refreshCardInstanceIds'].includes(k)));
          if(d){
            const pay=d.parameterSchema.paymentCardInstanceIds;
            const refresh=d.parameterSchema.refreshCardInstanceIds;
            args={activeUnitId:d.pieceId,...(pay?{paymentCardInstanceIds:pay.const??pay.enum[0]}:{}),
              ...(refresh?{refreshCardInstanceIds:refresh.items.enum.slice(0,refresh.maxItems)}:{})};
          }
        }
      }
      if(!d&&s.activeSideKey==='player1'){
        const second=attacks(s).length>0;
        d=ds.find(d=>d.actionType===(second?'delegate_khassar_fight':'fight')&&
          d.pieceId===(second?caster:actor)&&d.constraints.declineCloseRanksAttackDice>0&&
          (!second||d.constraints.recipientUnitId===actor));
        if(d){
          const p=s.officialAttackProfileCatalogueV2.profiles.find(p=>p.profileHash===d.constraints.sourceProfileHash);
          assert(p);args={closeRanksMode:'decline',allocations:[{targetUnitId:target,dice:d.constraints.declineCloseRanksAttackDice}],
            surgeTargetUnitId:p.surge?target:null,criticalTargetUnitId:null};
        }
      }
    }
    assert(d,'r'+h.stateRevision+' '+JSON.stringify([s.activeSideKey,s.selectedRosterActivationWindow,ds.map(x=>[x.actionType,x.pieceId]),fs.map(x=>x.action.actionType)]));
    await commit(d,args??(d.domainId?printed(d):{}));
  }
},verify:async h=>{
  const s=h.state,rows=attacks(s);assert.equal(rows.length,2);
  const effect=unit(s,actor).officialAbilityEffects.find(e=>e.sourceDefinitionId===ability);
  assert(effect?.boundWeaponName);
  for(const r of rows)assert.equal(r.stages.activePrecisionValue,2,JSON.stringify(r).slice(0,1500));
  const project=(st,name)=>projectOfficialCharacteristicStatusFamilyModifiersV1(st.officialCharacteristicStatusFamilySourceBundle,st,
    {pieceId:actor,context:{attackKind:'close_combat',weaponName:name}}).precision;
  const other=project(s,'Other Weapon'),expired=project({...s,round:s.round+1},effect.boundWeaponName);
  assert.equal(other,0);assert.equal(expired,0);
  assert.equal(s.selectedRosterActivationWindow?.pieceId,caster);
  assert.equal(s.activeSideKey,'player1');
  assert(!s.pendingOfficialKhassarFight);
  return {faq:74,source:ability,recipient:actor,boundWeapon:effect.boundWeaponName,normalAndDelegatedPrecision:rows.map(e=>e.stages.activePrecisionValue),
    otherWeaponPrecision:other,nextRoundPrecision:expired,handback:s.selectedRosterActivationWindow.pieceId};
}});
