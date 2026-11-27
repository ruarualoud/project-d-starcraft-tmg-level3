export const OFFICIAL_CORRODE_ARMOUR_ID='unit:stukov/corrode-armor-assault-phase@1';
export const OFFICIAL_CORRODE_ARMOUR_REACTION_COMPONENTS_V1=Object.freeze({
 [OFFICIAL_CORRODE_ARMOUR_ID]:Object.freeze({recordKey:'army_units:stukov',abilityName:'Corrode Armor',sourceKind:'unit_feature',
  phase:'assault',resourceType:'BM',resourceCost:1,
  sourceText:'Immediately after this Unit resolves a Ranged Attack against an Enemy Unit, the targeted Unit suffers the DEBUFF Armour (1).',
  spec:Object.freeze({effectKind:'after_ranged_armour_debuff',triggerKind:'after_ranged_attack_resolved',armourPenalty:1,
   sourceMustEqualRangedAttacker:true,requiresResolvedEnemyRangedAttack:true,effectDuration:'cleanup_and_refresh'})}),
});
