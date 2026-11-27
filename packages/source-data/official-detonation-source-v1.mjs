export const OFFICIAL_DETONATION_REACTION_COMPONENTS_V1=Object.freeze(Object.fromEntries([
 ['infested_marine',1],['infested_trooper',2],
].map(([unit,damagePerHit])=>['unit:'+unit+'/detonation-any-phase@1',Object.freeze({
 recordKey:'army_units:'+unit,abilityName:'Detonation',sourceKind:'unit_feature',resourceType:'BM',resourceCost:1,
 sourceText:'Immediately before any models in this Unit are Destroyed, Enemy Units Within 2" suffer HITS 1 ('+damagePerHit+') for each model in this Unit that will be Destroyed.',
 spec:Object.freeze({effectKind:'before_casualty_detonation',triggerKind:'before_casualty_batch',sourceMustEqualTarget:true,
  hitsPerCasualty:1,damagePerHit,enemyRangeMilliInches:2000,usesPendingCasualtyReservation:true,effectDuration:'immediate'}),
})])));
