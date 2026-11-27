import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
export const OFFICIAL_ADMIRAL_ACTIVATION_EXCHANGE_ID='unit:stukov/admiral-of-the-infested-movement-phase@1';
export const OFFICIAL_ADMIRAL_ACTIVATION_EXCHANGE_ATOM='rule-atom:wave4/infestation-activation-exchange@1';
const spread='Target an Enemy Unit Within 8". The targeted Unit gains the INFESTATION Status. For the purposes of resolving Special Abilities, this effect is treated as a DEBUFF.';
const definitions={
 'unit:stukov/commander-any-phase@1':{recordKey:'army_units:stukov',name:'Commander',activation:'passive',phase:'any',
  text:'Treat this Unit’s Supply characteristic as increased by 1 for Controlling and Contesting Mission Markers, completing objectives, and resolving Disengage checks.',
  spec:{effectKind:'commander_supply_bonus',actionKind:'query_modifier',supplyModifier:1,
   contexts:['mission_marker_control','objective_completion','disengage_check']}},
 'unit:stukov/plague-warden-any-phase@1':{recordKey:'army_units:stukov',name:'Plague Warden',activation:'passive',phase:'any',
  text:'Treat the Supply characteristic of any Enemy Unit that has the INFESTATION Status and is Within 6" as reduced by 1 (to a minimum of 0) for Controlling and Contesting Mission Markers, and completing objectives.',
  spec:{effectKind:'infected_enemy_mission_supply_penalty',actionKind:'query_modifier',supplyModifier:-1,minimumSupply:0,
   rangeMilliInches:6000,contexts:['mission_marker_control','objective_completion']}},
 'unit:stukov/spread-infestation-movement-phase@1':{recordKey:'army_units:stukov',name:'Spread Infestation',activation:'active',phase:'movement',text:spread,
  spec:{effectKind:'infestation_spread',actionKind:'active_ability',targetKind:'visible_enemy_within',rangeMilliInches:8000,
   resourceType:'BM',resourceCost:1,expiresAt:null}},
 'unit:infested_trooper/spread-infestation-any-phase@1':{recordKey:'army_units:infested_trooper',name:'Spread Infestation',activation:'active',phase:'any',text:spread,
  spec:{effectKind:'infestation_spread',actionKind:'active_ability',targetKind:'visible_enemy_within',rangeMilliInches:8000,
   resourceType:'BM',resourceCost:1,expiresAt:null}},
 [OFFICIAL_ADMIRAL_ACTIVATION_EXCHANGE_ID]:{recordKey:'army_units:stukov',name:'Admiral of the Infested',activation:'active',phase:'movement',
  text:'Target an Enemy Unit Within 8" that has the INFESTATION Status. That Unit counts as Activated in this Phase (set an Activation Marker next to it) and remove the INFESTATION Status from that Unit. You may target any Non-Unique Infested Friendly Unit that is Within 8" of the previously targeted Enemy Unit. Remove the Activation Marker from that targeted Friendly Unit.',
  spec:{effectKind:'infestation_activation_exchange',actionKind:'active_ability',targetKind:'visible_infected_enemy_within',
   rangeMilliInches:8000,friendlyRangeMilliInches:8000,resourceType:'BM',resourceCost:1,
   ruleAtomId:OFFICIAL_ADMIRAL_ACTIVATION_EXCHANGE_ATOM,expiresAt:'immediate'}},
};
export function compileOfficialStukovInfestationSpecV1(definition){
 const row=definitions[definition?.definitionId];if(!row)return null;
 if(definition.recordKey!==row.recordKey||definition.definitionName!==row.name||definition.sourceKind!=='unit_feature'
  ||definition.activationKind!==row.activation||definition.phase!==row.phase||definition.sourceText!==row.text
  ||Object.values(definition.costByComposition||{}).some(cost=>cost!==0))throw Error('STUKOV_INFESTATION_SOURCE_MISMATCH:'+definition.definitionId);
 return structuredClone(row.spec);
}
export function createOfficialStukovContextualSupplyRoutesV1(bundle){
 return(bundle?.routes||[]).filter(r=>['unit:stukov/commander-any-phase@1','unit:stukov/plague-warden-any-phase@1'].includes(r.definitionId))
  .map(route=>{
   const spec=compileOfficialStukovInfestationSpecV1({...route,definitionName:route.abilityName});
   if(!spec||spec.effectKind!==route.effectKind||route.routeHash!==hash(Object.fromEntries(Object.entries(route).filter(([k])=>k!=='routeHash'))))throw Error('STUKOV_SUPPLY_ROUTE_INVALID');
   const body={schema:'starcraft_tmg_official_contextual_supply_route_v1',definitionId:route.definitionId,
    recordKey:route.recordKey,sourceFeatureHash:route.sourceFeatureHash,sourceRouteHash:route.routeHash,abilityName:route.abilityName,
    ...spec,trainingTruth:false};return{...body,routeHash:hash(body)};
  }).sort((a,b)=>a.definitionId.localeCompare(b.definitionId));
}
