const liveText='When this Unit attacks an Enemy Unit with the INFESTATION Status or a Unit Within 6" of any Source of Creep or Creep Tumor, its Infested C-14 Rifle and all Close Combat Attacks gain PRECISION (2).';
const units=['infested_marine','infested_trooper'];
export function compileOfficialInfestedInfantrySpecV1(definition){
 const munitions=units.find(u=>definition?.definitionId==='unit:'+u+'/plagued-munitions-assault-phase@1');
 if(munitions){
  if(definition.recordKey!=='army_units:'+munitions||definition.definitionName!=='Plagued Munitions'
   ||definition.sourceKind!=='unit_feature'||definition.activationKind!=='passive'||definition.phase!=='assault'
   ||definition.sourceText!=='Immediately after an attack with the Infested C-14 Rifle, if the attacked Unit suffered Damage, it also suffers NON-LETHAL Damage (1).')
   throw Error('INFESTED_INFANTRY_MUNITIONS_SOURCE_MISMATCH');
  return{effectKind:'plagued_munitions',actionKind:'query_modifier',weaponName:'Infested C-14 Rifle',nonLethalDamage:1};
 }
 const unit=units.find(u=>definition?.definitionId==='unit:'+u+'/live-for-the-swarm-any-phase@1');if(!unit)return null;
 if(definition.recordKey!=='army_units:'+unit||definition.definitionName!=='Live for the Swarm!'
  ||definition.sourceKind!=='unit_feature'||definition.activationKind!=='passive'||definition.phase!=='any'||definition.sourceText!==liveText)
  throw Error('INFESTED_INFANTRY_LIVE_SOURCE_MISMATCH');
 return{effectKind:'passive_weapon_keyword',actionKind:'query_modifier',weaponScope:'all',keyword:'precision',value:2,
  weaponCondition:{kind:'infestation_or_creep_proximity',attackKinds:['ranged','close_combat'],rangeMilliInches:6000,
   rangedWeaponName:'infested c-14 rifle'}};
}
