// Model chooses a delivered scene; Host copies its identity, never its outcome.
import {isDeepStrictEqual} from 'node:util';
import {ROSTER_WORKFLOW_SCENE_OPERATIONS_V1} from './roster-workflow-operation-contracts-v1.mjs';
const clone=structuredClone;
const obj=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const tag=value=>({type:'string',minLength:1,maxLength:128,enum:[value]});
export function rosterSavedSceneChoicesV1(request,{sourceStateIdentities=[]}={}){
 const seen=new Set(),choices=[];
 const delivered=[...(request.promptNodes?.find(n=>n.kind==='delegated_scene_identities')?.scenes??[]),
  ...[...sourceStateIdentities,...(request.promptNodes?.filter(n=>n.kind==='read_source_scene_identity')??[]).flatMap(n=>n.sources??[])].map(s=>({
   stateRef:s.stateRef,sourceResultRef:s.sourceArtifactRef,sourceWorkId:s.sourceWorkId??null,
   proof:{sourceEvidenceId:s.sourceEvidenceId,readViaEvidenceId:s.readViaEvidenceId,selectionOnly:true,fullSourceReadGranted:false}}))];
 for(const scene of delivered){
  const ref=scene.stateRef;
  if(ref?.schema!=='roster_workflow_state_ref_v1'||!ref.sourceStateHash||!ref.stateHash||!scene.sourceResultRef)continue;
  const key=JSON.stringify(ref);if(seen.has(key))continue;seen.add(key);
  choices.push({sceneId:'saved-scene-'+(choices.length+1),stateRef:clone(ref),
   sourceWorkId:scene.sourceWorkId,sourceResultRef:scene.sourceResultRef,
   staticGeometryRepairParent:scene.staticGeometryRepairParent===true,proof:scene.proof});
 }
 return choices;
}
const sceneOperations=version=>version>=4?ROSTER_WORKFLOW_SCENE_OPERATIONS_V1:version>=2?['spatial','inspect']:['spatial'];
const sceneKind=operation=>operation==='inspect'?'scene_inspection':operation==='spatial'?'spatial_query':'scene_tool';
export function rosterSavedSceneStepSchemaV1(schema,choices,version=1){
 if(!choices.length&&version<3)return clone(schema);
 if(schema.anyOf)return {...clone(schema),anyOf:schema.anyOf.flatMap(s=>{const mapped=rosterSavedSceneStepSchemaV1(s,choices,version);return mapped.anyOf??[mapped];})};
 const operations=schema.properties?.operation?.enum;
 const selected=operations?.filter(o=>sceneOperations(version).includes(o))??[];
 if(!selected.length)return clone(schema);
 const groups=Object.groupBy(selected,sceneKind);
 const variants=Object.values(groups).map(group=>{
 const operation=group[0],spatial=clone(schema);spatial.properties.operation.enum=group;
 spatial.properties.kind=tag(sceneKind(operation));if(!spatial.required.includes('kind'))spatial.required.push('kind');
 spatial.properties.sceneSource={anyOf:[...(choices.length?[obj({kind:tag('saved_scene'),sceneId:{type:'string',minLength:1,maxLength:128,enum:choices.map(c=>c.sceneId)}})]:[]),
  ...(version>=3?[obj({kind:tag('initial_state')}),obj({kind:tag('prior_step'),stepId:{type:'string',minLength:1,maxLength:512}})]:[obj({kind:tag('authored_arguments')})]),
  ...(version>=4&&operation==='spatial'?[obj({kind:tag('action_selection')})]:[])]};
 spatial.required.push('sceneSource');
 return spatial;
 });
 if(operations.length===selected.length)return variants.length===1?variants[0]:{anyOf:variants};
 const other=clone(schema);other.properties.operation.enum=operations.filter(o=>!selected.includes(o));
 if(!other.properties.kind){other.properties.kind=tag('tool');other.required.push('kind');}
 return {anyOf:[other,...variants]};
}
export function projectRosterSavedSceneStepV1(step,choices,version=1){
 const unchanged=()=>({step:clone(step),projection:[],errors:[]});
 if(!choices?.length&&version<3)return unchanged();
 const {sceneSource,kind,...rest}=step;
 if(!sceneOperations(version).includes(step.operation))return {step:clone(rest),projection:[],errors:[]};
 const reject=code=>({step:null,projection:[],errors:[{code,stepId:step.stepId}]});
 if(version<3&&sceneSource?.kind==='authored_arguments')return {step:clone(rest),projection:[],errors:[]};
 let args;try{args=JSON.parse(step.argumentsJson);}catch{return reject('saved_scene_arguments_invalid');}
 if(!args||typeof args!=='object'||Array.isArray(args))return reject('saved_scene_arguments_invalid');
 const owned=['stateRef','base','contextRef'];
 if(owned.some(k=>Object.hasOwn(args,k)))return reject('saved_scene_source_conflict');
 const ownsPointer=b=>owned.some(k=>b.argumentPointer==='/'+k||b.argumentPointer?.startsWith('/'+k+'/'));
 const repeated=(step.bindings??[]).filter(ownsPointer);
 const derived=version>=3&&sceneSource?.kind==='prior_step'&&typeof sceneSource.stepId==='string'&&sceneSource.stepId.trim()
  ?{argumentPointer:'/stateRef',fromStepId:sceneSource.stepId,fromEvidenceNumber:0,resultPointer:'/stateRef'}:null;
 // Old saved replies sometimes repeat the exact binding already owned by
 // sceneSource. Remove only full equality, never choose between two sources.
 if(repeated.length&&(!derived||repeated.some(b=>!isDeepStrictEqual(b,derived))))return reject('saved_scene_source_conflict');
 const deduplicated=repeated.length?[{rule:'identical_host_scene_binding_deduplicated_v1',stepId:step.stepId,
  removedBindings:clone(repeated),semanticChoiceUnchanged:true,sourceApproved:false,nativeExecuted:false}]:[];
 if(repeated.length)rest.bindings=(rest.bindings??[]).filter(b=>!ownsPointer(b));
 if(version>=4&&step.operation==='spatial'){
  // The selected action menu already owns its parent and seat. An independent
  // scene must not be added to this source-derived call, even when it is equal.
  if(sceneSource?.kind==='action_selection'){
   if(!args.selection||typeof args.selection!=='object'||Array.isArray(args.selection))return reject('saved_scene_action_selection_required');
   return {step:clone(rest),errors:[],projection:[{rule:'native_menu_owns_query_scene_v1',stepId:step.stepId,nativeExecuted:false}]};
  }
  if(Object.hasOwn(args,'selection'))return reject('saved_scene_action_selection_conflict');
 }
 if(version>=3&&sceneSource?.kind==='initial_state')return {step:{...clone(rest),argumentsJson:JSON.stringify({...args,base:{kind:'source'}})},errors:[],projection:[{rule:'model_explicitly_selected_initial_state_v1',stepId:step.stepId,nativeExecuted:false}]};
 if(version>=3&&sceneSource?.kind==='prior_step'){
  if(typeof sceneSource.stepId!=='string'||!sceneSource.stepId.trim())return reject('saved_scene_prior_step_required');
  return {step:{...clone(rest),bindings:[...clone(rest.bindings??[]),{argumentPointer:'/stateRef',fromStepId:sceneSource.stepId,fromEvidenceNumber:0,resultPointer:'/stateRef'}]},errors:[],projection:[...deduplicated,{rule:'model_selected_prior_step_state_v1',stepId:step.stepId,fromStepId:sceneSource.stepId,compilerValidationRequired:true,nativeExecuted:false}]};
 }
 if(sceneSource?.kind!=='saved_scene')return reject('saved_scene_choice_required');
 const chosen=choices.find(c=>c.sceneId===sceneSource.sceneId);if(!chosen)return reject('saved_scene_choice_unknown');
 return {step:{...clone(rest),argumentsJson:JSON.stringify({...args,stateRef:clone(chosen.stateRef)})},
  errors:[],projection:[{rule:'model_selected_saved_scene_v1',stepId:step.stepId,sceneId:chosen.sceneId,
   sourceResultRef:chosen.sourceResultRef,stateRef:clone(chosen.stateRef),sourceApproved:false,nativeExecuted:false}]};
}
export function rosterRetainedSpatialStepsV1(order,version=1){
 const steps=order?.steps??[];
 if(new Set(steps.map(s=>s.stepId)).size!==steps.length)return [];
 return steps.filter(s=>{
  if(!sceneOperations(version).includes(s.operation))return false;
  try{const a=JSON.parse(s.argumentsJson);return a&&typeof a==='object'&&!Array.isArray(a)
    &&!(version>=4&&s.operation==='spatial'&&Object.hasOwn(a,'selection'));}catch{return false;}
 }).map(s=>({stepId:s.stepId,queryKind:JSON.parse(s.argumentsJson).queryKind??null}));
}
export function replaceRosterStepSceneV1({order,stepId,sceneId,choices,version=1}){
 const reject=code=>({step:null,projection:[],errors:[{code,stepId}]});
 if(!choices?.some(c=>c.sceneId===sceneId))return reject('saved_scene_choice_unknown');
 if(!rosterRetainedSpatialStepsV1(order,version).some(s=>s.stepId===stepId))return reject(version>=2?'retained_scene_step_unavailable':'retained_spatial_step_unavailable');
 const original=order.steps.find(s=>s.stepId===stepId),args=JSON.parse(original.argumentsJson);
 const owned=['stateRef','base','contextRef'];for(const key of owned)delete args[key];
 // This explicit edit replaces the old parent, not any query/strategy fields.
 const mapped=projectRosterSavedSceneStepV1({...clone(original),kind:sceneKind(original.operation),
  sceneSource:{kind:'saved_scene',sceneId},argumentsJson:JSON.stringify(args),
  bindings:(original.bindings??[]).filter(b=>!owned.some(k=>b.argumentPointer==='/'+k||b.argumentPointer?.startsWith('/'+k+'/')))},choices,version);
 if(mapped.errors.length)return mapped;
 return {...mapped,projection:[...mapped.projection,{rule:'explicit_retained_step_scene_edit_v1',stepId,
  queryParametersRetained:true,otherBindingsRetained:true,stepPositionRetained:true,nativeExecuted:false}]};
}
export const ROSTER_SAVED_SCENE_INSTRUCTION_V1='For every spatial step, select sceneSource explicitly. To use a listed savedSceneChoices scene, return sceneSource:{kind:"saved_scene",sceneId:<listed id>}; Host inserts its whole stateRef. Omit stateRef/base/contextRef from argumentsJson and all bindings to those paths; do not invent evidenceNumber 0 or an empty prior step. Your region, formation objectives and other query arguments remain yours. To intentionally use another actual source or a preceding step, select sceneSource:{kind:"authored_arguments"} and provide the existing explicit source arguments/bindings. There is no default scene. A saved failed-geometry scene is only a parent state, not a legal layout, completed experiment or strategy proof.';
export const ROSTER_SAVED_SCENE_INSTRUCTION_V2=ROSTER_SAVED_SCENE_INSTRUCTION_V1.replace('every spatial step','every spatial or inspect step')+' An inspect step uses kind="scene_inspection". Inspect with authored_arguments and no source arguments explicitly reads the frozen ROOT, never the scene mentioned in publicReason. Select saved_scene to read a listed branch. An initial branch menu cannot by itself explain a later within-sequence failure; distinguish the returned state from later states.';
export const ROSTER_SAVED_SCENE_INSTRUCTION_V3='For EVERY spatial or inspect step select sceneSource: {kind:"saved_scene",sceneId:<listed id>}, {kind:"initial_state"}, or {kind:"prior_step",stepId:<earlier state-producing step in this batch>}. Host assembles the exact parent reference. Never provide stateRef/base/contextRef in argumentsJson or bindings. Empty arguments do not choose a scene; publicReason cannot select it. initial_state explicitly means the frozen root, not the last experiment. Use kind="spatial_query" for spatial and "scene_inspection" for inspect. Inspect the actual failure state to explain a later batch failure; an initial menu is not a later-state diagnostic. Parent selection is not approval of geometry or strategy.';
export const ROSTER_SAVED_SCENE_INSTRUCTION_V4=`For these operations select sceneSource explicitly: ${ROSTER_WORKFLOW_SCENE_OPERATIONS_V1.join(', ')}. Use {kind:"saved_scene",sceneId:<listed id>}, {kind:"initial_state"}, or {kind:"prior_step",stepId:<earlier state-producing step>}; Host copies the parent identity. For spatial with a Native domain selection instead use {kind:"action_selection"}: selection itself identifies the exact menu, parent and seat, so no independent scene is allowed. Omit stateRef/base/contextRef and bindings to them from argumentsJson in either form. Other Native fields, experiment conditions and query parameters remain yours; Native still validates them. Use kind="spatial_query" for spatial, "scene_inspection" for inspect, "scene_tool" for the other listed operations. native_action and formation_scene already derive parents from their explicit menu/option selections and do not take sceneSource. compare_scenes additionally needs its separate referenceStateRef source under its source contract. An empty object, prose or the latest call never selects a scene. initial_state means the selected formal frozen root, not the last experiment; a candidate-context root must be selected by its returned reference. Selection does not approve geometry, facts or strategy.`;
