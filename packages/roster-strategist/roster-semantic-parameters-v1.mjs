import {staticFormationSemanticParametersV1} from '../online-agent-session/static-formation-query-v1.mjs';
import {describeRosterBuilderQueryParameterSchemaV1,describeRosterCandidateContextParameterSchemaV1} from './roster-workflow-candidate-context-v1.mjs';
import {describePregameMapParameterSchemaV1,PREGAME_MAP_WORKFLOW_CONTRACTS_V1} from './pregame-map-evidence-port-v1.mjs';
import {ARMY_BUILDER_CHOICE_PARAMETERS_V1} from './army-builder-query-port-v1.mjs';
import {PREGAME_SCENE_PROJECTION_PARAMETER_SCHEMA_V1} from './pregame-scene-projection-v1.mjs';
import {describeRosterMeasuredComparisonParameterSchemaV1,compileRosterMeasuredComparisonParametersV1} from './roster-measured-comparison-v1.mjs';
import {ROSTER_REFERENCE_ARMY_PARAMETER_SCHEMA_V1} from './roster-workflow-operation-contracts-v1.mjs';
import {projectRosterSavedSceneStepV1} from './roster-saved-scene-choice-v1.mjs';
import {singleUnitTemporalParameterSchemaV1,assertSingleUnitTemporalInput} from './pregame-single-unit-temporal-v1.mjs';
import {jointTemporalParameterSchemaV1,assertJointTemporalInputV1} from './pregame-joint-temporal-v1.mjs';
// Source-defined semantic values -> existing Host work-order transport.
// No parsing of model-authored JSON strings; no inferred scene or strategy.
import {describePregameScenarioInputContractV1,describePregameWorkflowInputContractsV1,describePregameMathParameterSchemaV1} from './pregame-scene-laboratory-v1.mjs';
import {rosterLocalScenarioInputContractV1} from './roster-experiment-scope-v1.mjs';
import {rangedActivationSemanticParametersV1,compileRangedActivationSemanticParametersV1} from '../online-agent-session/ranged-activation-query-contract-v1.mjs';
const clone=structuredClone;
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const reject=(code,detail)=>{throw Object.assign(new TypeError(code),{code,detail});};

// Provider requires every property. An optional source field is nullable ONLY
// on this wire; null means omitted. Required source fields are never defaulted.
export function strictRosterSemanticSchemaV1(source){
 if(source?.anyOf&&!source.type)return {anyOf:source.anyOf.map(strictRosterSemanticSchemaV1)};
 if(!source||!['object','array','string','integer','number','boolean'].includes(source.type))
  reject('ROSTER_PARAMETER_SOURCE_SCHEMA_MISSING',{type:source?.type});
 const schema={type:source.type};
 for(const key of ['description','enum','minimum','maximum','minLength','maxLength','minItems','maxItems','uniqueItems'])
  if(Object.hasOwn(source,key))schema[key]=clone(source[key]);
 if(source.type==='object'){
  if(!source.properties||!Object.keys(source.properties).length)reject('ROSTER_PARAMETER_SOURCE_PROPERTIES_MISSING');
  schema.properties=Object.fromEntries(Object.entries(source.properties).map(([key,field])=>{
   const item=strictRosterSemanticSchemaV1(field);
   return [key,source.required?.includes(key)?item:{anyOf:[item,{type:'null'}]}];
  }));
  schema.required=Object.keys(schema.properties);schema.additionalProperties=false;
 }else if(source.type==='array'){schema.items=strictRosterSemanticSchemaV1(source.items);schema.minItems??=0;}
 else if(source.type==='string'){schema.minLength??=0;schema.maxLength??=65536;}
 else if(source.type==='integer'){schema.minimum??=Number.MIN_SAFE_INTEGER;schema.maximum??=Number.MAX_SAFE_INTEGER;}
 if(source.anyOf?.every(s=>Array.isArray(s.required)))schema.description=(schema.description?schema.description+' ':'')+'Supply at least one complete alternative: '+source.anyOf.map(s=>s.required.join(' + ')).join(' OR ')+'.';
 return schema;
}
export function compileRosterSemanticValuesV1(source,values){
 if(source.anyOf&&!source.type){
  const variants=source.anyOf.filter(s=>{
   if(s.type==='array')return Array.isArray(values);
   if(s.type==='object')return object(values)&&Object.entries(s.properties??{}).every(([key,p])=>
    !p.enum||!s.required?.includes(key)||p.enum.includes(values[key]));
   return s.type===typeof values;
  });
  if(variants.length!==1)reject('ROSTER_PARAMETER_SEMANTIC_VARIANT_REQUIRED');
  return compileRosterSemanticValuesV1(variants[0],values);
 }
 if(source.type==='object'){
  if(!object(values))reject('ROSTER_PARAMETER_OBJECT_REQUIRED');
  const extra=Object.keys(values).filter(k=>!Object.hasOwn(source.properties,k));
  if(extra.length)reject('ROSTER_PARAMETER_UNDECLARED_FIELDS',extra);
  const result={};
  for(const [key,field]of Object.entries(source.properties)){
   if(!Object.hasOwn(values,key)){if(source.required?.includes(key))reject('ROSTER_PARAMETER_REQUIRED',key);continue;}
   if(values[key]===null&&!source.required?.includes(key))continue;
   result[key]=compileRosterSemanticValuesV1(field,values[key]);
  }
  if(source.anyOf?.every(s=>Array.isArray(s.required))&&!source.anyOf.some(s=>s.required.every(k=>Object.hasOwn(result,k))))
   reject('ROSTER_PARAMETER_SEMANTIC_CHOICE_REQUIRED',source.anyOf.map(s=>s.required));
  return result;
 }
 if(source.type==='array'){if(!Array.isArray(values))reject('ROSTER_PARAMETER_ARRAY_REQUIRED');return values.map(v=>compileRosterSemanticValuesV1(source.items,v));}
 if(values===null)reject('ROSTER_PARAMETER_REQUIRED_VALUE');
 return clone(values);
}
const scenarioSource=()=>({type:'object',additionalProperties:false,required:['spec'],properties:{spec:rosterLocalScenarioInputContractV1(describePregameScenarioInputContractV1())}});
const optionalSeatSource=()=>describePregameWorkflowInputContractsV1().inspect.inputContract.semanticParameters;
const mathKinds=['budget_fit','vp_schedule_delta','integer_sum','mission_marker_schedule','builder_candidate_comparison'];
const contextSourceSchema=choices=>{
 const tag=kind=>({type:'string',minLength:1,maxLength:64,enum:[kind]});
 const obj=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
 const saved=choices.filter(c=>c.stateRef?.contextRef);
 return {anyOf:[obj({kind:tag('formal_draft')}),obj({kind:tag('prior_candidate'),stepId:{type:'string',minLength:1,maxLength:512}}),
  ...(saved.length?[obj({kind:tag('saved_candidate'),sceneId:{type:'string',minLength:1,maxLength:128,enum:saved.map(c=>c.sceneId)}})]:[])]};
};
const emptyParameters=()=>({type:'object',additionalProperties:false,properties:{},required:[]});
const referenceSceneSchema=(choices,optional=false)=>{const variants=[
 ...(optional?[{type:'object',additionalProperties:false,required:['kind'],properties:{kind:{type:'string',minLength:1,maxLength:64,enum:['none']}}}]:[]),
 ...(choices.length?[{type:'object',additionalProperties:false,required:['kind','sceneId'],properties:{kind:{type:'string',minLength:1,maxLength:64,enum:['saved_scene']},sceneId:{type:'string',minLength:1,maxLength:128,enum:choices.map(c=>c.sceneId)}}}]:[]),
 {type:'object',additionalProperties:false,required:['kind','stepId'],properties:{kind:{type:'string',minLength:1,maxLength:64,enum:['prior_step']},stepId:{type:'string',minLength:1,maxLength:512}}}];return variants.length===1?variants[0]:{anyOf:variants};};
export const ROSTER_SEMANTIC_PARAMETER_DEFINITIONS_V1=Object.freeze({
 bounded_unit_temporal_parameters:{operation:'bounded_unit_temporal',sourceContract:'pregame_single_unit_temporal_v1',source:singleUnitTemporalParameterSchemaV1,compile:v=>{assertSingleUnitTemporalInput(v);return v;}},
 bounded_joint_temporal_parameters:{operation:'bounded_joint_temporal',sourceContract:'pregame_joint_temporal_v1',source:jointTemporalParameterSchemaV1,
  compile:v=>{assertJointTemporalInputV1(v);return v;}},
 reference_rosters_parameters:{operation:'reference_rosters',sourceContract:'roster_reference_armies_v1',contextSelection:true,source:()=>clone(ROSTER_REFERENCE_ARMY_PARAMETER_SCHEMA_V1),compile:v=>v},
 mission_scoring_parameters:{operation:'mission_scoring',sourceContract:'pregame_mission_scoring_authority_v1',contextSelection:true,source:emptyParameters,compile:v=>v},
 compare_armies_parameters:{operation:'compare_armies',sourceContract:'native_builder_candidate_comparison_v1',contextSelection:true,source:()=>describePregameMathParameterSchemaV1('builder_candidate_comparison'),compile:v=>v},
 compare_observations_parameters:{operation:'compare_observations',sourceContract:'roster_measured_comparison_v1',source:describeRosterMeasuredComparisonParameterSchemaV1,compile:compileRosterMeasuredComparisonParametersV1},
 project_scene_parameters:{operation:'project_scene',sourceContract:'pregame_scene_projection_v1',source:()=>clone(PREGAME_SCENE_PROJECTION_PARAMETER_SCHEMA_V1),referencePointer:'/referenceStateRef',compile:v=>v},
 compare_scenes_parameters:{operation:'compare_scenes',sourceContract:'pregame_scene_conditions_v1',source:emptyParameters,referencePointer:'/referenceStateRef',compile:v=>v},
 candidate_context_parameters:{operation:'candidate_context',sourceContract:'roster_candidate_context_v1',
  source:()=>describeRosterCandidateContextParameterSchemaV1('choice','optional'),
  compile:v=>{const {candidate,...shared}=v;
   if(Object.hasOwn(candidate,'candidateInput')===Object.hasOwn(candidate,'candidateEdits'))reject('ROSTER_PARAMETER_CANDIDATE_CHOICE_REQUIRED');
   const {kind,...selection}=candidate;return {...selection,...shared};},
  referencePointer:'/comparisonScene/referenceStateRef',referenceOptional:true},
 // Retain old saved replies, but do not repeat identical opponent/scene schemas
 // in new provider requests.
 ...Object.fromEntries(['input','delta'].flatMap(mode=>[false,true].map(projected=>['candidate_'+mode+(projected?'_projected':'')+'_parameters',{
  operation:'candidate_context',sourceContract:'roster_candidate_context_v1',source:()=>describeRosterCandidateContextParameterSchemaV1(mode,projected||'optional'),compile:v=>v,
  referencePointer:'/comparisonScene/referenceStateRef',referenceOptional:!projected,legacyWireOnly:true}]))),
 ...Object.fromEntries(Object.keys(PREGAME_MAP_WORKFLOW_CONTRACTS_V1).map(operation=>[operation+'_parameters',{operation,sourceContract:'pregame_map_'+operation+'_v1',contextSelection:true,source:()=>describePregameMapParameterSchemaV1(operation),compile:v=>v}])),
 ...Object.fromEntries(mathKinds.filter(kind=>kind!=='builder_candidate_comparison').map(kind=>['math_'+kind+'_parameters',{operation:'math_'+kind,sourceContract:'pregame_math_'+kind+'_v1',contextSelection:true,source:()=>describePregameMathParameterSchemaV1(kind),compile:v=>v}])),
 ...Object.fromEntries(mathKinds.map(kind=>['generic_math_'+kind+'_parameters',{operation:'math',partialOperation:true,legacyWireOnly:true,sourceContract:'pregame_math_'+kind+'_v1',contextSelection:true,source:()=>describePregameMathParameterSchemaV1(kind),compile:v=>({mathKind:kind,inputs:v})}])),
 ...Object.fromEntries(['builder_audit','builder_branches'].map(operation=>[operation+'_parameters',{operation,sourceContract:'roster_builder_query_parameters_v1',source:()=>describeRosterBuilderQueryParameterSchemaV1(operation),compile:v=>v}])),
 builder_choices_parameters:{operation:'builder_choices',sourceContract:'army_builder_choice_parameters_v1',source:()=>clone(ARMY_BUILDER_CHOICE_PARAMETERS_V1),compile:v=>v},

 scenario_parameters:{operation:'scenario',sourceContract:'roster_local_scenario_intent_v1',source:scenarioSource,compile:v=>v},
 inspection_parameters:{operation:'inspect',sourceContract:'pregame_inspect_input_v1',source:optionalSeatSource,compile:v=>v},
 static_formation_parameters:{operation:'spatial',queryKind:'space.solve_static_formation',sourceContract:'static_formation_query_v1',source:staticFormationSemanticParametersV1,compile:v=>({queryKind:'space.solve_static_formation',queryArguments:v})},
 ranged_activation_parameters:{operation:'spatial',queryKind:'ranged_activation_probability',sourceContract:'ranged_activation_sequence_v1',
  source:rangedActivationSemanticParametersV1,compile:v=>({queryKind:'ranged_activation_probability',queryArguments:compileRangedActivationSemanticParametersV1(v)})},
});
export function rosterSemanticParameterStepSchemaV1(schema,choices=[]){
 if(schema.anyOf){const variants=schema.anyOf.flatMap(s=>{const m=rosterSemanticParameterStepSchemaV1(s,choices);return m.anyOf??[m];});return variants.length===1?variants[0]:{anyOf:variants};}
 const operations=schema.properties?.operation?.enum;
 if(!operations||!schema.properties.argumentsJson)return clone(schema);
 const definitions=Object.entries(ROSTER_SEMANTIC_PARAMETER_DEFINITIONS_V1).filter(([,d])=>operations.includes(d.operation));
 if(!definitions.length)return clone(schema);
 const remaining=operations.filter(o=>!definitions.some(([,d])=>d.operation===o&&!d.queryKind&&(!d.partialOperation||d.legacyWireOnly)));
 const variants=[];
 if(remaining.length){const old=clone(schema);old.properties.operation.enum=remaining;variants.push(old);}
 for(const [kind,definition]of definitions.filter(([,d])=>!d.legacyWireOnly)){
  const variant=clone(schema);
  for(const key of ['argumentsJson','bindings']){delete variant.properties[key];variant.required=variant.required.filter(k=>k!==key);}
  variant.properties.kind={type:'string',minLength:1,maxLength:64,enum:[kind]};
  variant.properties.operation.enum=[definition.operation];
  const source=definition.source();
  variant.required=[...new Set([...variant.required,'kind'])];
  if(source.anyOf?.length||Object.keys(source.properties??{}).length){
   variant.properties.parameters=strictRosterSemanticSchemaV1(source);variant.required.push('parameters');
  }
  if(definition.contextSelection){variant.properties.contextSource=contextSourceSchema(choices);variant.required.push('contextSource');}
  if(definition.referencePointer){variant.properties.referenceScene=referenceSceneSchema(choices,definition.referenceOptional);variant.required.push('referenceScene');}
  // This query has an explicit selected scene; action_selection is unrelated.
  if(definition.queryKind&&variant.properties.sceneSource?.anyOf)variant.properties.sceneSource.anyOf=variant.properties.sceneSource.anyOf.filter(s=>s.properties.kind.enum[0]!=='action_selection');
  variants.push(variant);
 }
 return variants.length===1?variants[0]:{anyOf:variants};
}
export function projectRosterSemanticParameterStepV1(step,version,choices=[]){
 const unchanged=()=>({step:clone(step),projection:[],errors:[]});
 if(![1,2,3].includes(version))return unchanged();
 const definition=ROSTER_SEMANTIC_PARAMETER_DEFINITIONS_V1[step.kind];
 if(!definition)return unchanged();
 try{
  if(step.operation!==definition.operation||Object.hasOwn(step,'argumentsJson')||Object.hasOwn(step,'bindings'))
   reject('ROSTER_PARAMETER_HOST_FIELD_CONFLICT');
  const source=definition.source();
  const requiresParameters=source.anyOf?.length||Object.keys(source.properties??{}).length;
  const values=compileRosterSemanticValuesV1(source,requiresParameters?step.parameters:{});
  const args=definition.compile(values);
  const bindings=[];
  if(definition.contextSelection){
   if(step.contextSource?.kind==='formal_draft'){}
   else if(step.contextSource?.kind==='saved_candidate'){
    const selected=choices.find(c=>c.sceneId===step.contextSource.sceneId);
    if(!selected?.stateRef?.contextRef)reject('ROSTER_PARAMETER_CANDIDATE_SOURCE_UNKNOWN');
    args.contextRef=clone(selected.stateRef.contextRef);
   }else if(step.contextSource?.kind==='prior_candidate'&&typeof step.contextSource.stepId==='string'&&step.contextSource.stepId.trim()){
    bindings.push({argumentPointer:'/contextRef',fromStepId:step.contextSource.stepId,fromEvidenceNumber:0,resultPointer:'/contextRef'});
   }else reject('ROSTER_PARAMETER_CANDIDATE_SOURCE_REQUIRED');
  }
  if(definition.referenceOptional&&!args.comparisonScene&&step.referenceScene?.kind!=='none')reject('ROSTER_PARAMETER_UNUSED_REFERENCE');
  if(definition.referencePointer&&(!definition.referenceOptional||args.comparisonScene)){
   const resolved=projectRosterSavedSceneStepV1({stepId:step.stepId,operation:'inspect',sceneSource:step.referenceScene,argumentsJson:'{}',bindings:[]},choices,4);
   if(resolved.errors.length)reject(resolved.errors[0].code,resolved.errors[0]);
   const reference=JSON.parse(resolved.step.argumentsJson).stateRef;
   if(reference){const keys=definition.referencePointer.slice(1).split('/');let at=args;for(const key of keys.slice(0,-1))at=at[key];at[keys.at(-1)]=clone(reference);}
   else if(resolved.step.bindings.length===1)bindings.push({...resolved.step.bindings[0],argumentPointer:definition.referencePointer});
   else reject('ROSTER_PARAMETER_REFERENCE_SCENE_REQUIRED');
  }
  const {parameters,contextSource,referenceScene,...retained}=clone(step);
  return {step:{...retained,argumentsJson:JSON.stringify(args),bindings},errors:[],projection:[{
   rule:'source_owned_semantic_parameter_compilation_v1',stepId:step.stepId,sourceContract:definition.sourceContract,
   semanticValuesRetained:true,sourceApproved:false,nativeExecuted:false,
  }]};
 }catch(error){return {step:null,projection:[],errors:[{code:error.code??'ROSTER_SEMANTIC_PARAMETER_INVALID',stepId:step.stepId,detail:error.detail??error.message}]};}
}
export const ROSTER_SEMANTIC_PARAMETER_INSTRUCTION_V1='For scenario, inspect, space.solve_static_formation and the target-only weapon sequence ranged_activation_probability method, select the corresponding *_parameters step kind and fill parameters directly with semantic values from its schema. Do not encode JSON strings or provide bindings/stateRef. sceneSource separately chooses the exact parent; Host assembles it. Optional parameter null means omitted, not zero/false or a default chosen by Host. scenario coordinates are the explicit model centres in inches, not an implied base-edge distance. ranged_activation_parameters shots choose each ordered weapon and its target; casualtyPreferences chooses each defender removal order. Host converts that list to Native casualtyPolicy and serializes the call without changing any choice. Native still checks every parameter, scene, profile, range and result. bounded_unit_temporal and bounded_joint_temporal use parameters directly: select each deploy entrySegmentId from the same saved map_deployment source, preserve the explicit participant/marker assignment and ordered schedule, and select sceneSource separately. Host serializes the method; Native validates it. If an entry is not known, read its source before submitting rather than inserting a guessed entry. Other query families remain on their declared legacy interface until their source schemas are migrated; that coverage is NOT complete.';

export const ROSTER_SEMANTIC_CONTEXT_INSTRUCTION_V2='Migrated map/math steps select contextSource explicitly: formal_draft for the selected current army source, saved_candidate with a listed sceneId for that candidate context, or prior_candidate with the preceding candidate_context step label. Host supplies its contextRef/dependency; never type a hash or JSON pointer. Candidate context chooses a roster source, NOT a combat state or an arrival history. Zero-parameter map_summary/map_deployment have no parameters field. map_route accepts an exact unitId+targetId or sideId/baseId/targetId; baseId is a footprint, never a deployment-zone ID. Arithmetic inputs are your explicit hypotheses; Native alone calculates values. None of these calls proves a future real score or strategic superiority.';

export const ROSTER_SEMANTIC_COMPARISON_INSTRUCTION_V3='For candidate_context outside a fixed authored comparison arm, select candidate_input_parameters or candidate_delta_parameters and supply the chosen roster input or edits. Optional comparisonScene parameters additionally select referenceScene; use referenceScene:{kind:"none"} when there is no projection. No referenceStateRef/hash is authored. Fixed authored-arm methods still only select comparison_candidate and cannot change that army. project_scene and compare_scenes use referenceScene separately from sceneSource: referenceScene selects the reference geometry, sceneSource selects the target. Select a listed saved_scene or an explicit prior_step; Host copies its exact stateRef or builds the dependency. compare_observations selects reference and candidate participants and immutable source handles; Host maps them to left/reference and right/candidate, then the existing calculator uses candidate minus reference. Do not write measured values, difference, outcome, winner or internal pointers. A source selection is not a completed experiment or strategic approval.';

// A retained reply keeps its original scene choices and full method. Add only
// the newly source-defined static parameter variant to its local decoding schema;
// this does not claim that an older request advertised that variant.
export function upgradeRosterStaticFormationSchemaV1(schema){
 const staticVariant=s=>{const v=clone(s);for(const k of ['argumentsJson','bindings']){delete v.properties[k];v.required=v.required.filter(x=>x!==k);}
  v.properties.operation.enum=['spatial'];v.properties.kind={type:'string',minLength:1,maxLength:64,enum:['static_formation_parameters']};v.properties.parameters=strictRosterSemanticSchemaV1(staticFormationSemanticParametersV1());v.required=[...new Set([...v.required,'kind','parameters'])];return v;};
 const eligible=s=>s?.properties?.kind?.enum?.length===1&&s.properties.operation?.enum?.includes('spatial')&&s.properties.argumentsJson;
 function walk(s,inAlternatives=false){if(Array.isArray(s))return s.map(v=>walk(v));if(!object(s))return s;
  if(s.anyOf){const old=s.anyOf.find(eligible),has=s.anyOf.some(v=>v.properties?.kind?.enum?.includes('static_formation_parameters'));
   return {...clone(s),anyOf:[...s.anyOf.map(v=>walk(v,true)),...(old&&!has?[staticVariant(old)]:[])]};}
  if(!inAlternatives&&eligible(s))return {anyOf:[clone(s),staticVariant(s)]};
  return Object.fromEntries(Object.entries(s).map(([k,v])=>[k,walk(v)]));}
 return walk(schema);
}
