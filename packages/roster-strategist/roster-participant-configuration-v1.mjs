// A declaration of the arm to test is not a mutation of the selected army.
// Reuse Native's unit-selection shape, then compare it with the exact selected
// candidate before executing a comparison. Never infer selections from prose.
import {isDeepStrictEqual} from 'node:util';
import {projectRosterParticipantConfigurationReadV1} from './roster-workflow-state-reference-v1.mjs';
import {ARMY_BUILDER_CANDIDATE_INPUT_CONTRACT_V1,resolveArmyBuilderPurchasableUpgradeV1} from './army-builder-query-port-v1.mjs';
const copy=structuredClone;
const unitSchema=ARMY_BUILDER_CANDIDATE_INPUT_CONTRACT_V1.properties.units.items;
// Native accepts omitted optional fields and addressing alternatives. Provider
// output requires a closed object with every field present. Derive that wire
// shape from Native, using null ONLY for absent optional fields; the semantic
// at-least-one-address check remains below, not an unsupported anyOf object.
function providerSelectionSchema(schema){
  if(schema.type==='string')return {...copy(schema),maxLength:65536};
  if(schema.type==='array')return {type:'array',minItems:schema.minItems??0,
    ...(schema.description?{description:schema.description}:{}),items:providerSelectionSchema(schema.items)};
  if(schema.type==='object'){
    const properties=Object.fromEntries(Object.entries(schema.properties).map(([key,field])=>{
      const projected=providerSelectionSchema(field);
      return [key,schema.required?.includes(key)?projected:{anyOf:[projected,{type:'null'}]}];
    }));
    return {type:'object',properties,required:Object.keys(properties),additionalProperties:false};
  }
  throw Error('Unsupported Native participant selection schema');
}
function nativeSelection(value,schema=unitSchema){
  if(Array.isArray(value))return value.map(entry=>nativeSelection(entry,schema.items));
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value)
    .filter(([key,entry])=>!(entry===null&&Object.hasOwn(schema.properties??{},key)&&!schema.required?.includes(key)))
    .map(([key,entry])=>[key,nativeSelection(entry,schema.properties?.[key]??{})]));
  return value;
}
export const normalizeRosterParticipantSelectionV1=value=>nativeSelection(value);
export const ROSTER_PARTICIPANT_CONFIGURATIONS_SCHEMA_V1={type:'array',minItems:0,
  items:providerSelectionSchema(unitSchema),description:'Exact intended Native selections of ALL participating army units on BOTH sides (unitInstanceId, recordKey, compositionKind OR compositionProfileId, upgrades, optional startingModelIds). Read inspect.participantSource for selected own/frozen enemy inputs and separate actual scene counts. Null means an omitted optional Native field, never a default. Required for comparison scenes/measurements; [] only for preparation or inherited local repairs. This does NOT resize, upgrade or replace any unit. candidate_context changes the own army; in unknown_roster mode its explicit opponentCandidateInput can construct a hypothetical enemy. A known frozen enemy remains immutable. An incompatible premise returns to the design author. Selected composition is not surviving/on-field model count.'};
const requiresSelection=new Set(['scenario','native_action','formation_scene','project_scene','spatial','probability','threat_exchange','compare_scenes','bounded_arrival_control','bounded_unit_temporal','bounded_joint_temporal']);
const instruction='Keep the original comparison intention. participantConfigurations declares exact intended Native selections for BOTH participating armies; prose does not resize a unit, substitute an enemy or buy upgrades. '+
  'The actualConfigurations below are saved selections, not a Native combat result. Read the current candidate or candidate_context receipt. '+
  'If a different arm is intended, explicitly create it with candidate_context candidateEdits/candidateInput, then bind its complete stateRef/contextRef on the scene and measurements. '+
  'Native alone checks candidate legality; do not alter an expectation to actual merely to force a pass. '+
  'A known reference enemy is frozen; only unknown_roster allows an explicitly model-selected hypothetical opponentCandidateInput through candidate_context, never an actual enemy assertion. A different required enemy kind/composition must return to the design/strategic owner for explicit redesign, not changing expected to actual just to pass. Scene counts are separate facts, not proof of all prose assumptions. If the intended arm cannot be constructed, return its concrete failure. No query, formal army/Plan mutation or strategy approval occurred.';
function reject(code,detail={}){
  throw Object.assign(Error(code),{code,detail,dispatchOutcome:'not_dispatched',queryRepair:{
    correctable:true,controlReturn:true,sourceContract:'roster_participant_configuration_v1',repairContractVersion:2,
    originalQueryNotAnswered:true,nativeExecuted:false,hostChoosesConfiguration:false,
    expectedSchema:copy(ROSTER_PARTICIPANT_CONFIGURATIONS_SCHEMA_V1),...copy(detail),instruction}});
}
export function validateRosterParticipantConfigurationsV1(units){
  if(units===undefined)return;
  if(!Array.isArray(units))reject('ROSTER_EXPERIMENT_PARTICIPANT_CONFIGURATION_SHAPE');
  const seen=new Set();
  for(const unit of units){
    if(!unit||typeof unit!=='object'||Array.isArray(unit)
      ||Object.keys(unit).some(key=>!Object.hasOwn(unitSchema.properties,key))
      ||['unitInstanceId','recordKey'].some(key=>typeof unit[key]!=='string'||!unit[key].trim())
      ||!['compositionKind','compositionProfileId'].some(key=>typeof unit[key]==='string'&&unit[key].trim())
      ||!Array.isArray(unit.upgrades)||seen.has(unit.unitInstanceId))
      reject('ROSTER_EXPERIMENT_PARTICIPANT_CONFIGURATION_SHAPE',{unit:copy(unit)});
    seen.add(unit.unitInstanceId);
  }
}
export function resolveRosterParticipantConfigurationsV1(scope,binding){
  validateRosterParticipantConfigurationsV1(scope?.participantConfigurations);
  validateRosterParticipantConfigurationsV1(binding?.participantConfigurations);
  const declared=scope?.participantConfigurations?.map(unit=>nativeSelection(unit)),
    prior=binding?.participantConfigurations?.map(unit=>nativeSelection(unit));
  if(declared?.length&&prior?.length&&!isDeepStrictEqual(declared,prior))
    reject('ROSTER_EXPERIMENT_PARTICIPANT_CONFIGURATION_CONFLICT',{
      declaredConfigurations:declared,requiredConfigurations:prior,
      reason:'A local repair cannot silently change its delegated experimental arm'});
  return copy(declared?.length?declared:prior??declared??[]);
}
// Native permits names and profile IDs as addresses of the SAME purchase.
// Resolve only against the frozen catalogue; preserve raw inputs and every
// non-address field (including nominated model identities) in the comparison.
function upgradeIdentity(upgrade,recordKey,profiles){
  // A faction-scoped menu may not describe the frozen opponent. In that case
  // retain strict raw identity; never guess its aliases from our own catalogue.
  if(!profiles?.some(p=>p.recordKey===recordKey))return upgrade;
  const matches=profiles.filter(p=>p.recordKey===recordKey&&(
    upgrade.purchasableUpgradeProfileId!=null?p.purchasableUpgradeProfileId===upgrade.purchasableUpgradeProfileId
      :p.upgradeName===upgrade.upgradeName));
  const profile=resolveArmyBuilderPurchasableUpgradeV1(profiles,recordKey,upgrade);
  if(matches.length!==1||!profile||profile.recordKey!==recordKey
    ||upgrade.upgradeName!=null&&upgrade.upgradeName!==profile.upgradeName)
    reject('ROSTER_EXPERIMENT_UPGRADE_IDENTITY_UNRESOLVED',{recordKey,upgrade:copy(upgrade),matches:matches.length});
  const {upgradeName,purchasableUpgradeProfileId,...selection}=upgrade;
  return {...selection,purchasableUpgradeProfileId:profile.purchasableUpgradeProfileId};
}
function canonical(value){
  if(Array.isArray(value))return value.map(canonical);
  if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));
  return value;
}
function selectedUnit(unit,upgradeProfiles){
  const value=canonical(nativeSelection(unit));
  if(Array.isArray(value?.upgrades))value.upgrades=value.upgrades.map(u=>canonical(upgradeIdentity(u,value.recordKey,upgradeProfiles)));
  if(Array.isArray(value?.upgrades))value.upgrades.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return value;
}
export const rosterParticipantSelectionsEqualV1=(left,right,upgradeProfiles)=>isDeepStrictEqual(selectedUnit(left,upgradeProfiles),selectedUnit(right,upgradeProfiles));
export function needsRosterParticipantConfigurationV1({scope,binding,operation}){
  return requiresSelection.has(operation)&&(!!binding||!!scope?.participantConfigurations?.length);
}
// Shared read-only projection for discovery and execution. A current model
// count never chooses a composition and a recipe never places a model.
export function projectRosterParticipantSourceV2({candidateInput,referenceArmyRecipes,ownSide,snapshot,upgradeProfiles}){
  const units=[];
  for(const sideKey of ['player1','player2']){
    const recipe=referenceArmyRecipes?.[sideKey];
    const selected=sideKey===ownSide&&candidateInput?candidateInput:recipe?.nativeCandidateInput;
    const selections=selected?.units??recipe?.units?.map(unit=>{
      const {upgradeNames,...selection}=unit;
      if(selection.upgrades===undefined&&Array.isArray(upgradeNames))
        selection.upgrades=upgradeNames.map(upgradeName=>({upgradeName}));
      return selection;
    });
    if(!Array.isArray(selections))reject('ROSTER_EXPERIMENT_PARTICIPANT_SOURCE_REQUIRED',{sideKey});
    for(const selection of selections)units.push({sideKey,
      sourceKind:sideKey===ownSide&&candidateInput?'selected_draft':'frozen_reference_recipe',selection:copy(selection)});
  }
  return {schema:'roster_participant_source_v2',sourceStateHash:snapshot.sourceStateHash,
    baseStateHash:snapshot.baseStateHash,units,
    ...(upgradeProfiles?{upgradeIdentitySource:{schema:'native_builder_upgrade_identity_v1',
      profiles:upgradeProfiles.filter(p=>units.some(u=>u.selection.recordKey===p.recordKey))
        .map(({recordKey,purchasableUpgradeProfileId,upgradeName})=>({recordKey,purchasableUpgradeProfileId,upgradeName})),
      instruction:'Frozen Native Builder addresses, not selected purchases. Compare resolved identities without rewriting saved selections; does not prove purchase legality or strategic value.'}}:{}),
    sceneUnits:snapshot.state.pieces.map(piece=>({unitId:piece.id,sideKey:piece.sideKey,
      recordKey:piece.officialUnitRecordKey??null,compositionKind:piece.compositionKind??null,
      combatTag:piece.combatTag??null,combatTags:piece.combatTags==null?null:copy(piece.combatTags),
      sizeCharacteristic:piece.sizeCharacteristic??null,isStructure:piece.isStructure??null,
      traitsSource:'same_frozen_native_scene_not_inferred_from_name_or_composition',
      selectedMaximumModels:piece.maxModels??null,
      livingModelCount:(piece.models??[]).filter(model=>!model.isDestroyed).length,
      onFieldModelCount:piece.isOnField===true?(piece.models??[]).filter(model=>!model.isDestroyed&&model.isOnField!==false).length:0,
      onTable:piece.isOnField===true,currentSupply:piece.currentSupply??null})),
    instruction:'Exact selected inputs of BOTH armies and separate current Native scene facts. Frozen enemy is an experimental reference, not hidden live knowledge. Neither selection nor an on-table position proves arrival, all declared premises, probability, comparative value or strategy approval.',
    mutatesSource:false,trainingTruth:false};
}

export function checkRosterParticipantConfigurationV1({scope,binding,operation,candidateInput,contextRef=null,participantSource=null,upgradeProfiles}){
  if(!needsRosterParticipantConfigurationV1({scope,binding,operation}))return null;
  const expected=resolveRosterParticipantConfigurationsV1(scope,binding);
  if(!Array.isArray(candidateInput?.units))reject('ROSTER_EXPERIMENT_PARTICIPANT_CONFIGURATION_UNAVAILABLE',{contextRef});
  const ownIds=new Set(candidateInput.units.map(unit=>unit.unitInstanceId));
  if(!participantSource&&(scope?.participantUnitIds??[]).some(id=>!ownIds.has(id)))
    reject('ROSTER_EXPERIMENT_PARTICIPANT_SOURCE_REQUIRED',{contextRef,
      requiredUnitIds:scope.participantUnitIds,reason:'Both-army source required; unknown IDs cannot disappear through own-army filtering'});
  const selections=participantSource?.units?.map(unit=>unit.selection)??candidateInput.units;
  const actualById=new Map(selections.map(unit=>[unit.unitInstanceId,unit]));
  if(actualById.size!==selections.length)reject('ROSTER_EXPERIMENT_PARTICIPANT_SOURCE_AMBIGUOUS',{contextRef});
  const sceneById=new Map((participantSource?.sceneUnits??[]).map(unit=>[unit.unitId,unit]));
  const participants=scope?.participantUnitIds??[];
  const unknownIds=participants.filter(id=>!actualById.has(id)&&!sceneById.has(id));
  if(unknownIds.length)reject('ROSTER_EXPERIMENT_PARTICIPANT_UNKNOWN',{contextRef,unknownUnitIds:unknownIds});
  // Runtime-created assets have no purchased army selection. Report their real
  // scene identity instead of manufacturing a unit recipe for them.
  const requiredIds=participants.filter(id=>actualById.has(id));
  const actualConfigurations=copy(selections.filter(unit=>requiredIds.includes(unit.unitInstanceId)
    ||expected.some(wanted=>wanted.unitInstanceId===unit.unitInstanceId)));
  const sceneParticipants=copy([...new Set([...participants,...expected.map(unit=>unit.unitInstanceId)])]
    .flatMap(id=>sceneById.has(id)?[sceneById.get(id)]:[]));
  if(requiredIds.some(id=>!expected.some(unit=>unit.unitInstanceId===id)))reject('ROSTER_EXPERIMENT_PARTICIPANT_CONFIGURATION_REQUIRED',{
    contextRef,requiredUnitIds:requiredIds,actualConfigurations,sceneParticipants,
    configurationScope:participantSource?'both_selected_armies':'own_candidate_only'});
  const differences=[];
  const profiles=upgradeProfiles??participantSource?.upgradeIdentitySource?.profiles;
  for(const wanted of expected){
    const actual=actualById.get(wanted.unitInstanceId);
    if(!actual){differences.push({unitInstanceId:wanted.unitInstanceId,field:'selection',reason:'unit_absent_from_selected_candidate'});continue;}
    const left=selectedUnit(wanted,profiles),right=selectedUnit(actual,profiles);
    for(const key of new Set([...Object.keys(left),...Object.keys(right)]))if(!isDeepStrictEqual(left[key],right[key]))
      differences.push({unitInstanceId:wanted.unitInstanceId,field:key,expected:copy(left[key]??null),actual:copy(right[key]??null)});
  }
  if(differences.length)reject('ROSTER_EXPERIMENT_PARTICIPANT_CONFIGURATION_MISMATCH',{
    contextRef,expectedConfigurations:expected,actualConfigurations,sceneParticipants,differences});
  return projectRosterParticipantConfigurationReadV1({operation,contextRef,participantConfigurationCheck:{schema:'roster_participant_configuration_check_v1',status:'matched',contextRef,
    expectedConfigurations:expected,actualConfigurations,sceneParticipants,
    configurationScope:participantSource?'both_selected_armies':'own_candidate_only',sceneAssumptionsChecked:false,
    source:participantSource?'selected_and_frozen_reference_inputs':'selected_candidate_input',
    ...(participantSource?{sourceStateHash:participantSource.sourceStateHash,baseStateHash:participantSource.baseStateHash}:{}),
    proves:'Exact declared selected-unit addressing only. Current scene counts are separate facts, not assumed equal to the roster. Does not prove all prose conditions, geometry, legality, combat, comparison identity or strategy value.',
    strategyApproved:false,trainingTruth:false}});
}
