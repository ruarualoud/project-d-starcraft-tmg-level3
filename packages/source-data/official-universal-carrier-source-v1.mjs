export const OFFICIAL_UNIVERSAL_CARRIER_ID = 'card:healing_pathogen/universal-carrier-any@1';
export const OFFICIAL_UNIVERSAL_CARRIER_TEXT = 'Universal Carrier <Passive> <Any Phase>: While an Enemy Unit has the INFESTATION Status, immediately after its supply is reduced or it is destroyed, target any Friendly Biological Unit Within 12". This Friendly Unit resolves the HEAL (2) effect.';
export function compileOfficialUniversalCarrierSpecV1(definition) {
  if(definition.definitionId !== OFFICIAL_UNIVERSAL_CARRIER_ID)return null;
  if(definition.recordKey!=='tactical_cards:healing_pathogen'||definition.definitionName!=='Universal Carrier'
    ||definition.sourceKind!=='card_feature'||definition.phase!=='any'||definition.activationKind!=='passive'
    ||definition.sourceText!==OFFICIAL_UNIVERSAL_CARRIER_TEXT)throw Error('UNIVERSAL_CARRIER_SOURCE_INVALID');
  return{effectKind:'universal_carrier',actionKind:'query_modifier',healValue:2,rangeMilliInches:12000};
}
