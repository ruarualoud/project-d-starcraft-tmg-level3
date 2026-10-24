// A declaration of the arm to test is not a mutation of the selected army.
// Reuse Native's unit-selection shape, then compare it with the exact selected
// candidate before executing a comparison. Never infer selections from prose.
import {isDeepStrictEqual} from 'node:util';
import {ARMY_BUILDER_CANDIDATE_INPUT_CONTRACT_V1} from './army-builder-query-port-v1.mjs';
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
export const ROSTER_PARTICIPANT_CONFIGURATIONS_SCHEMA_V1={type:'array',minItems:0,
  items:providerSelectionSchema(unitSchema),description:'Exact intended Native selections of participating OWN-army units (unitInstanceId, recordKey, compositionKind OR compositionProfileId, upgrades, optional startingModelIds). Null means an omitted optional Native field, never a default; at least one composition address and one address per upgrade are required. Required for comparison scenes/measurements; [] for preparation or inherited local repairs. This declares what must be selected; it does NOT change any unit. Use candidate_context to create a different legal selection, then bind that context. Enemy roster remains frozen in the laboratory source.'};
const requiresSelection=new Set(['scenario','native_action','formation_scene','project_scene','spatial','probability','threat_exchange','compare_scenes']);
const instruction='Keep the original comparison intention. participantConfigurations declares exact intended OWN-unit Native selections; prose does not resize a unit or buy upgrades. '+
  'The actualConfigurations below are saved selections, not a Native combat result. Read the current candidate or candidate_context receipt. '+
  'If a different arm is intended, explicitly create it with candidate_context candidateEdits/candidateInput, then bind its complete stateRef/contextRef on the scene and measurements. '+
  'Native alone checks candidate legality; do not alter an expectation to actual merely to force a pass. '+
  'If the intended legal arm cannot be constructed, return its concrete failure to the strategic owner. No query, formal army/Plan mutation or strategy approval occurred.';
function reject(code,detail={}){
  throw Object.assign(Error(code),{code,detail,dispatchOutcome:'not_dispatched',queryRepair:{
    correctable:true,sourceContract:'roster_participant_configuration_v1',repairContractVersion:1,
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
// Upgrade ordering is not a different selection. Preserve all upgrade fields,
// including nominated model identities; don't guess equivalent profile aliases.
function canonical(value){
  if(Array.isArray(value))return value.map(canonical);
  if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));
  return value;
}
function selectedUnit(unit){
  const value=canonical(unit);
  if(Array.isArray(value?.upgrades))value.upgrades.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return value;
}
export function needsRosterParticipantConfigurationV1({scope,binding,operation}){
  return requiresSelection.has(operation)&&(!!binding||!!scope?.participantConfigurations?.length);
}
export function checkRosterParticipantConfigurationV1({scope,binding,operation,candidateInput,contextRef=null}){
  if(!needsRosterParticipantConfigurationV1({scope,binding,operation}))return null;
  const expected=resolveRosterParticipantConfigurationsV1(scope,binding);
  if(!Array.isArray(candidateInput?.units))reject('ROSTER_EXPERIMENT_PARTICIPANT_CONFIGURATION_UNAVAILABLE',{contextRef});
  const actualById=new Map(candidateInput.units.map(unit=>[unit.unitInstanceId,unit]));
  const requiredIds=(scope?.participantUnitIds??[]).filter(id=>actualById.has(id));
  const actualConfigurations=copy(candidateInput.units.filter(unit=>requiredIds.includes(unit.unitInstanceId)
    ||expected.some(wanted=>wanted.unitInstanceId===unit.unitInstanceId)));
  if(!expected.length&&requiredIds.length)reject('ROSTER_EXPERIMENT_PARTICIPANT_CONFIGURATION_REQUIRED',{
    contextRef,requiredUnitIds:requiredIds,actualConfigurations});
  const differences=[];
  for(const id of requiredIds)if(!expected.some(unit=>unit.unitInstanceId===id))
    differences.push({unitInstanceId:id,field:'selection',reason:'participating_own_unit_not_declared'});
  for(const wanted of expected){
    const actual=actualById.get(wanted.unitInstanceId);
    if(!actual){differences.push({unitInstanceId:wanted.unitInstanceId,field:'selection',reason:'unit_absent_from_selected_candidate'});continue;}
    const left=selectedUnit(wanted),right=selectedUnit(actual);
    for(const key of new Set([...Object.keys(left),...Object.keys(right)]))if(!isDeepStrictEqual(left[key],right[key]))
      differences.push({unitInstanceId:wanted.unitInstanceId,field:key,expected:copy(left[key]??null),actual:copy(right[key]??null)});
  }
  if(differences.length)reject('ROSTER_EXPERIMENT_PARTICIPANT_CONFIGURATION_MISMATCH',{
    contextRef,expectedConfigurations:expected,actualConfigurations,differences});
  return {schema:'roster_participant_configuration_check_v1',status:'matched',contextRef,
    expectedConfigurations:expected,actualConfigurations,source:'selected_candidate_input',
    proves:'Exact selected own-unit addressing only, not actual deployed count, geometry, legality, combat or strategy value',
    strategyApproved:false,trainingTruth:false};
}
