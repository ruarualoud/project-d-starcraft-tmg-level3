// Source-addressed interventions, not a second Rules engine or a preference
// function. Effects/costs come from Native's frozen compiled definitions.
import {projectNativeAbilityReferenceV1} from './native-ability-reference-v1.mjs';
import {verifyOfficialUnitCardSupplyDataBundleV1} from '../source-data/official-unit-card-supply-data-bundle-v1.mjs';
const text={type:'string',minLength:1,maxLength:65536};
const object=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const actors={type:'array',minItems:1,items:text};
export const ROSTER_COMPARISON_INTERVENTION_SCHEMA_V1={anyOf:[
  object({kind:{...text,enum:['native_ability_use']},actorUnitId:text,
    definitionId:{...text,description:'Prefer the exact Native definitionId. An exact visible abilityName is also accepted only when it uniquely identifies one definition for this actor; no fuzzy matching or cross-unit lookup.'},
    current:{...text,enum:['use','omit']},alternative:{...text,enum:['use','omit']}}),
  object({kind:{...text,enum:['participant_configuration']},actorUnitIds:{...actors,
    description:'Union of explicitly selected changed actors across current and alternative participant configurations. A replacement may use different actors in each arm; each arm must contain a declared actor and every declared actor must appear in the union. Measurement subjects must exist in their own arm. No participant is inserted implicitly.'}}),
  object({kind:{...text,enum:['placement_or_action']},actorUnitIds:{...actors,
    description:'Actors whose placement or action changes; each declared actor must exist in both arms.'}}),
]};
// Only dependencies known from a typed Native effect are registered here.
// No distance, dice, damage, duration or activation-cost calculation lives here.
// Do not classify an unknown effect by its ability name or by prompt prose.
const effectProcesses=Object.freeze({charge_speed_debuff:{
  requiredProcess:'single_target_charge_resolution',requiredBranches:['charge_succeeded','charge_failed'],
  reason:'Native charge_speed_debuff changes charge resolution. Conditioning on a successful charge removes the mechanism; a post-success IMPACT-only endpoint cannot measure it.'}});
export function projectRosterComparisonInterventionsV1({state,sourceStateHash,rulesRuntimeHash,releaseBinding}){
  const reference=projectNativeAbilityReferenceV1(state),definitions=[];
  const purchaseUnits=state.officialArmyResourceBudgetDataBundle?.factionArmyEligibilityDataBundle?.unitDataBundle;
  // Older unversioned rooms also stored card characteristics under the purchase ledger.
  const unitData=state.officialUnitCardSupplyDataBundle ?? (releaseBinding ? null : purchaseUnits);
  if(releaseBinding && (!unitData || unitData.normalizedDatasetHash!==releaseBinding.normalizedDatasetHash
    || unitData.sourceSnapshotHash!==releaseBinding.sourceSnapshotHash
    || (unitData.armyBuilderUnitDataBundleHash && unitData.armyBuilderUnitDataBundleHash!==purchaseUnits?.bundleHash))){
    throw Error('ROSTER_COMPARISON_UNIT_CHARACTERISTICS_RELEASE_MISMATCH');
  }
  if(unitData)verifyOfficialUnitCardSupplyDataBundleV1(unitData);
  const profiles=new Map(unitData?.unitProfiles.map(profile=>[profile.recordKey,profile]));
  const unitFacts=unitData?(state.pieces??[]).filter(piece=>piece.officialUnitRecordKey).map(piece=>{
    const profile=profiles.get(piece.officialUnitRecordKey);
    if(!profile)throw Error('UNIT_CARD_SUPPLY_PROFILE_REQUIRED: '+piece.officialUnitRecordKey);
    return {unitId:piece.id,recordKey:profile.recordKey,profileHash:profile.profileHash,
      sourceRecordHash:profile.sourceRecordHash,currentModels:piece.currentModels??null,
      currentSupply:piece.currentSupply??null,compositionKind:piece.compositionKind??null,
      speedProfile:structuredClone(profile.speed),supplyProfile:structuredClone(profile.supplyProfile),
      currentActionEligibilityProven:false,
      instruction:'Parsed frozen Native unit-card profile plus actual source model/Supply state; not a recomputed effective characteristic. multiModelInches and singleModelInches describe model-count regimes, not Movement versus Charge. Actual effects/modifiers, action timing and current action speed remain Native action-menu/transition results; never choose either printed value or invent a successful action.'};
  }):[];
  for(const row of reference.records)for(const definition of row.definitions){
    if(!definition.definitionId||!definition.routeHash)continue;
    const projected={definitionId:definition.definitionId,routeHash:definition.routeHash,
      sourceBundle:definition.sourceBundle,recordKey:definition.recordKey,unitIds:[...row.unitIds],
      abilityName:definition.abilityName,activationKind:definition.activationKind,
      phase:definition.phase,effectKind:definition.effectKind,
      ...(definition.triggerKind?{triggerKind:definition.triggerKind}:{}),
      ...(definition.resourceType!==undefined?{resourceType:definition.resourceType}:{}),
      ...(definition.resourceCost!==undefined?{resourceCost:definition.resourceCost}:{}),
      ...(definition.costByComposition?{costByComposition:structuredClone(definition.costByComposition)}:{}),
      processDependency:structuredClone(effectProcesses[definition.effectKind]??null)};
    definitions.push(Object.fromEntries(Object.entries(projected).filter(([,value])=>value!==undefined)));
  }
  // Purchase eligibility is the existing Builder's printed-list reconciliation,
  // NOT a positive price heuristic. Some real purchases cost zero; many innate
  // abilities also carry zero selection costs without being purchases.
  const purchases=state.officialUnitCompositionUpgradeDataBundle;
  const purchasableUpgrades=purchases?.purchasableUpgradeProfiles?.map(profile=>({
    purchasableUpgradeProfileId:profile.purchasableUpgradeProfileId,profileHash:profile.profileHash,
    recordKey:profile.recordKey,upgradeName:profile.upgradeName,
    unitIds:(state.pieces??[]).filter(p=>p.officialUnitRecordKey===profile.recordKey).map(p=>p.id),
    mineralCostByComposition:structuredClone(profile.mineralCostByComposition),
    applicationKind:profile.applicationKind,specialistAssignmentRequired:profile.specialistAssignmentRequired,
    replacementTargetName:profile.replacementTargetName,sourceDefinitionHash:profile.sourceDefinitionHash,
  }))??[];
  return {schema:'roster_native_interventions_v1',sourceStateHash,rulesRuntimeHash,definitions,unitFacts,
    purchasableUpgrades,purchaseSourceBundleHash:purchases?.bundleHash??null,
    purchaseSourceAvailability:purchases?'same_native_builder_source':'source_not_present_no_inferred_purchases',
    unitFactsAvailability:unitData?'same_native_compiled_source':'source_not_present_no_fabricated_values',
    executionEligibilityProven:false,strategyApproved:false,
    instruction:'Select exact actor/definition for a use-versus-omit native ability decision. Definitions and explicit costs are from the frozen Native compiler, not model-authored receipts. Undefined cost is unknown, not free. This reference includes unselected upgrades: legal availability, timing, prerequisites and payment still require the real Native menu/application. For roster/configuration or position/action changes use the corresponding intervention kind and actual participants; do not mislabel ability use to avoid its process dependency. Null dependency means this catalogue has no deterministic causal-coverage check for that effect, not that every metric is appropriate. Independent preflight must check the declared kind, mechanism, costs and decision relevance.'};
}
export function resolveRosterComparisonAbilitySourceV1({intervention,catalogue}){
  const sources=catalogue?.nativeInterventions;
  if(sources?.schema!=='roster_native_interventions_v1'||!Array.isArray(sources.definitions))
    return {status:'unresolved',code:'comparison_intervention_source_required'};
  const exact=sources.definitions.filter(d=>d.definitionId===intervention?.definitionId);
  const definitions=exact.length?exact:sources.definitions.filter(d=>d.abilityName===intervention?.definitionId
    &&d.unitIds.includes(intervention?.actorUnitId));
  if(definitions.length!==1)return {status:'unresolved',code:'comparison_intervention_source_unresolved',matchCount:definitions.length};
  const definition=definitions[0];
  if(!definition.unitIds.includes(intervention?.actorUnitId))return {status:'unresolved',code:'comparison_intervention_actor_mismatch'};
  return {status:'resolved',definition,sourceStateHash:sources.sourceStateHash,rulesRuntimeHash:sources.rulesRuntimeHash,
    sourceAddressing:exact.length?'exact_definition_id':'unique_exact_actor_ability_name'};
}
export function compileRosterComparisonInterventionV1({question,catalogue,measurementDomain}){
  const intervention=question?.intervention;
  const reject=(code,detail={})=>({status:'not_executable',errors:[{code,...detail}],strategyApproved:false});
  if(!intervention)return reject('comparison_intervention_required',{
    instruction:'Declare the actual intervention. Native ability use selects a frozen definition and actor; computed success/failure is not an input. Preserve old design evidence but do not execute it under the new contract.'});
  if(['participant_configuration','placement_or_action'].includes(intervention.kind)){
    if(!Array.isArray(intervention.actorUnitIds)||!intervention.actorUnitIds.length
      ||new Set(intervention.actorUnitIds).size!==intervention.actorUnitIds.length)
      return reject('comparison_intervention_actors_invalid');
    return {status:'compiled',kind:intervention.kind,actorUnitIds:[...intervention.actorUnitIds],
      sourceDefinition:null,processDependency:null,causalCoverageChecked:false,
      instruction:'The declared change still needs the existing participant/scene and semantic checks. This is not permission to use an ability while labelling it as a placement or roster change.'};
  }
  if(intervention.kind!=='native_ability_use')return reject('comparison_intervention_kind_unknown');
  if(!['use','omit'].includes(intervention.current)||!['use','omit'].includes(intervention.alternative))
    return reject('comparison_intervention_choices_invalid');
  if(intervention.current===intervention.alternative)return reject('comparison_intervention_no_change');
  const resolved=resolveRosterComparisonAbilitySourceV1({intervention,catalogue});
  if(resolved.status!=='resolved')return reject(resolved.code,{definitionId:intervention.definitionId,...(resolved.matchCount!==undefined?{matchCount:resolved.matchCount}:{})});
  const definition=resolved.definition;
  if(!['active','reaction'].includes(definition.activationKind))return reject('comparison_intervention_not_selectable_use',{
    activationKind:definition.activationKind,instruction:'An always-on passive is not a use/omit action. An upgrade-selection comparison belongs to participant_configuration and the real Builder.'});
  // Re-derive from the registered Native effect type, not a model's claimed
  // processDependency or conveniently chosen observationDomain.
  const dependency=effectProcesses[definition.effectKind];
  if(dependency&&(!dependency.requiredBranches.every(b=>measurementDomain?.terminalBranches?.includes(b))
    ||measurementDomain?.id!==dependency.requiredProcess))return reject('comparison_intervention_process_not_covered',{
      definitionId:definition.definitionId,effectKind:definition.effectKind,
      requiredProcess:dependency.requiredProcess,requiredBranches:[...dependency.requiredBranches],
      actualDomain:structuredClone(measurementDomain??null),instruction:dependency.reason});
  return {status:'compiled',...structuredClone(intervention),sourceDefinition:structuredClone(definition),
    resolvedDefinitionId:definition.definitionId,sourceAddressing:resolved.sourceAddressing,
    sourceStateHash:resolved.sourceStateHash,rulesRuntimeHash:resolved.rulesRuntimeHash,
    processDependency:structuredClone(dependency??null),causalCoverageChecked:Boolean(dependency),
    actualInterventionExecuted:false,costPaid:false,legalActionProven:false,strategyApproved:false};
}
