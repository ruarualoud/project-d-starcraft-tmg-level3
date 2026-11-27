// An explicit source selection, never a parser for strategic prose.
import {STATIC_FORMATION_OBJECTIVE_CONTRACT_V1,STATIC_FORMATION_OBJECTIVES_INPUT_SCHEMA_V1} from '../online-agent-session/formation-intent-contract-v1.mjs';
const copy=structuredClone,object=v=>v&&typeof v==='object'&&!Array.isArray(v);
export function temporalFormationParameterSchemaV1(){
 const integer={type:'integer',minimum:Number.MIN_SAFE_INTEGER,maximum:Number.MAX_SAFE_INTEGER};
 return {type:'object',additionalProperties:false,required:['maximumOptions'],
  anyOf:[{required:['preferredAnchor']},{required:['preferredAnchorTarget']}],properties:{
   preferredAnchor:{type:'object',additionalProperties:false,required:['xMilliInches','yMilliInches'],properties:{xMilliInches:copy(integer),yMilliInches:copy(integer)}},
   preferredAnchorTarget:{type:'object',additionalProperties:false,required:['kind','markerId'],properties:{kind:{type:'string',enum:['mission_marker']},markerId:{type:'string',minLength:1,description:'Current Native marker ID or its unique printed decimal number; Host binds identity from this map.'}}},
   maximumOptions:{type:'integer',minimum:1,maximum:Number.MAX_SAFE_INTEGER},
   // Canonical semantic wire uses a list, including for one objective. The
   // Native legacy object alias remains accepted by its existing interface.
   formationObjectives:copy(STATIC_FORMATION_OBJECTIVES_INPUT_SCHEMA_V1),
   tacticalPurpose:{type:'string',description:'Record-only public purpose; does not supply executable geometry.'}
  }};
}
export const TEMPORAL_FORMATION_INTENT_V1=Object.freeze({
 anchorChoice:'Exactly one of preferredAnchor or preferredAnchorTarget. Never fill dummy (0,0) for an unknown target. An explicit coordinate remains an allowed author preference.',
 preferredAnchor:{xMilliInches:'safe integer, when choosing explicit coordinates',yMilliInches:'safe integer, when choosing explicit coordinates'},
 preferredAnchorTarget:{kind:'mission_marker',markerId:'Current Native marker ID or its unique printed decimal number. Host resolves identity and coordinates from the current map; no invented point or alternate target.'},
 maximumOptions:'required positive integer',formationObjectives:{acceptedForms:['single_object','array_of_objects'],...copy(STATIC_FORMATION_OBJECTIVE_CONTRACT_V1)},
 tacticalPurpose:'Optional explanation for records ONLY. It does not set coordinates, targets, objectives or weights. Use a real anchor/target selection and explicit formationObjectives for executable intent.'});
export function inspectTemporalFormationIntentV1(intent){
 const issues=[],invalid=(field,reason)=>issues.push({field,reason});
 if(!object(intent)||Object.keys(intent).some(k=>!['preferredAnchor','preferredAnchorTarget','maximumOptions','formationObjectives','tacticalPurpose'].includes(k))){
  invalid('formationIntent',intent===undefined?'required_parameter_missing':'invalid_formation_intent');return issues;
 }
 const hasPoint=Object.hasOwn(intent,'preferredAnchor'),hasTarget=Object.hasOwn(intent,'preferredAnchorTarget');
 if(hasPoint===hasTarget)invalid('formationIntent','exactly_one_anchor_source_required');
 if(hasPoint&&(!object(intent.preferredAnchor)||!Number.isSafeInteger(intent.preferredAnchor.xMilliInches)||!Number.isSafeInteger(intent.preferredAnchor.yMilliInches)||Object.keys(intent.preferredAnchor).some(k=>!['xMilliInches','yMilliInches'].includes(k))))invalid('formationIntent.preferredAnchor','safe_integer_milli_inches_required');
 if(hasTarget&&(!object(intent.preferredAnchorTarget)||intent.preferredAnchorTarget.kind!=='mission_marker'||typeof intent.preferredAnchorTarget.markerId!=='string'||!intent.preferredAnchorTarget.markerId.trim()||Object.keys(intent.preferredAnchorTarget).some(k=>!['kind','markerId'].includes(k))))invalid('formationIntent.preferredAnchorTarget','exact_mission_marker_reference_required');
 if(!Number.isSafeInteger(intent.maximumOptions)||intent.maximumOptions<1)invalid('formationIntent.maximumOptions','positive_integer_required');
 return issues;
}
export function resolveTemporalFormationIntentV1({intent,state}){
 const fail=reason=>{const detail={field:'formationIntent.preferredAnchorTarget',reason,selectedTarget:copy(intent?.preferredAnchorTarget??null)};throw Object.assign(Error('PREGAME_TEMPORAL_ANCHOR_TARGET_INVALID'),{code:'PREGAME_TEMPORAL_ANCHOR_TARGET_INVALID',detail,
  queryRepair:{correctable:true,originalQueryNotAnswered:true,nativeExecuted:false,sourceContract:'pregame_temporal_formation_intent_v1',inputContract:copy(TEMPORAL_FORMATION_INTENT_V1),detail}});};
 if(inspectTemporalFormationIntentV1(intent).length)fail('invalid_anchor_source');
 if(!Object.hasOwn(intent,'preferredAnchorTarget'))return copy(intent);
 intent=compileTemporalMarkerSelectionsV1({query:{formationIntent:intent},markers:state?.board?.missionMarkers}).query.formationIntent;
 const matches=(state?.board?.missionMarkers??[]).filter(m=>m.id===intent.preferredAnchorTarget.markerId);
 if(matches.length!==1)fail('selected_marker_not_unique_in_current_source');
 const marker=matches[0];if(marker.isRemoved===true)fail('selected_marker_removed');
 if(!Number.isFinite(marker.xInches)||!Number.isFinite(marker.yInches))fail('selected_marker_coordinate_unavailable');
 const point={xMilliInches:Math.round(marker.xInches*1000),yMilliInches:Math.round(marker.yInches*1000)};
 if(!Number.isSafeInteger(point.xMilliInches)||!Number.isSafeInteger(point.yMilliInches))fail('selected_marker_coordinate_not_safe_milli_inches');
 const {preferredAnchorTarget,...rest}=copy(intent);return {...rest,preferredAnchor:point};
}

// Select from the actual Native map. No inferred prefixes or fuzzy names.
export function resolveTemporalMarkerSelectionV1({selection,markers,field='markerId'}){
 const matches=(markers??[]).filter(m=>m.id===selection
  ||typeof selection==='string'&&/^(0|[1-9]\d*)$/.test(selection)&&Number.isSafeInteger(m.number)&&String(m.number)===selection);
 if(matches.length!==1){const detail={field,reason:matches.length?'ambiguous_marker_selection':'marker_not_in_bound_map',selection,
  matchingMarkers:matches.map(m=>({id:m.id,number:m.number})),availableMarkers:(markers??[]).map(m=>({id:m.id,number:m.number})),unitAvailabilityImplied:false};
  throw Object.assign(Error('PREGAME_TEMPORAL_MARKER_SELECTION_INVALID'),{code:'PREGAME_TEMPORAL_MARKER_SELECTION_INVALID',detail,
   queryRepair:{correctable:true,originalQueryNotAnswered:true,nativeExecuted:false,sourceContract:'pregame_temporal_marker_selection_v1',detail}});}
 return matches[0].id;
}
export function compileTemporalMarkerSelectionsV1({query,markers}){
 const value=copy(query),bindings=[];
 const select=(selection,field)=>{const id=resolveTemporalMarkerSelectionV1({selection,markers,field});
  if(selection!==id)bindings.push({field,selectedValue:selection,nativeId:id,source:'current_native_map_number',strategicChoiceChanged:false});return id;};
 const intent=(v,path)=>{if(!v)return;
  if(v.preferredAnchorTarget?.kind==='mission_marker')v.preferredAnchorTarget.markerId=select(v.preferredAnchorTarget.markerId,path+'/preferredAnchorTarget/markerId');
  const objectives=Array.isArray(v.formationObjectives)?v.formationObjectives:v.formationObjectives?[v.formationObjectives]:[];
  objectives.forEach((o,i)=>{if(o.kind==='control_objective'&&Array.isArray(o.targetIds))o.targetIds=o.targetIds.map((id,j)=>select(id,path+'/formationObjectives/'+i+'/targetIds/'+j));});};
 if(Object.hasOwn(value,'markerId'))value.markerId=select(value.markerId,'/markerId');
 value.participants?.forEach((p,i)=>{p.markerId=select(p.markerId,'/participants/'+i+'/markerId');});
 intent(value.formationIntent,'/formationIntent');
 value.actionSchedule?.forEach((s,i)=>intent(s.formationIntent,'/actionSchedule/'+i+'/formationIntent'));
 return {query:value,bindings};
}

// Deployment identities belong to the bound Native map, not player-name guesses.
export function assertTemporalDeploymentEntriesV1({query,entryEdgesByPlayer}){
 const selections=[];
 if(query.start?.kind==='reserve_entry')selections.push({field:'/start/entrySegmentId',selection:query.start.entrySegmentId,side:query.seatKey});
 query.actionSchedule?.forEach((step,index)=>{
  if(step.actionType!=='deploy')return;
  const side=query.participants?.find(p=>p.unitId===step.unitId)?.sideKey??query.seatKey;
  selections.push({field:'/actionSchedule/'+index+'/entrySegmentId',selection:step.entrySegmentId,side});
 });
 for(const {side,...selected} of selections){
  const entries=entryEdgesByPlayer?.[side]?.segments??[];
  const availableEntries=entries.map(e=>({entrySegmentId:e.segmentId,side:e.side,startInches:e.startInches,endInches:e.endInches}));
  if(entries.filter(e=>e.segmentId===selected.selection).length===1)continue;
  const detail={...selected,seatKey:side,reason:entries.length?'entry_not_in_bound_side':'bound_side_entries_unavailable',availableEntries,
   sourceField:'/officialDeploymentGeometryBinding/entryEdgesByPlayer/'+side+'/segments',searchStarted:false,reachabilityEvaluated:false};
  throw Object.assign(Error('PREGAME_TEMPORAL_ENTRY_SELECTION_INVALID'),{code:'PREGAME_TEMPORAL_ENTRY_SELECTION_INVALID',detail,
   queryRepair:{correctable:true,originalQueryNotAnswered:true,nativeExecuted:false,sourceContract:'pregame_temporal_entry_selection_v1',detail,
    instruction:'Select an exact entrySegmentId from availableEntries for this same Native map and side. A missing selection is not failed movement or unreachable terrain. Do not guess player-prefix aliases, change the unit/target, increase search bounds, or replace a deployment entry with a terrain accessPoint.'}});
 }
 return selections.map(({side,...s})=>({...s,nativeEntrySegmentId:s.selection,seatKey:side,source:'current_native_deployment_binding',strategicChoiceChanged:false}));
}
