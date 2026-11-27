// Design owns the conditions; method owns search parameters and explicit source.
// No extraction of numbers/coordinates from prose and no second geometry engine.
import {isDeepStrictEqual} from 'node:util';
import {STATIC_FORMATION_RELATIONSHIP_SCHEMA_V1,normalizeStaticFormationRelationshipsV1}
  from '../online-agent-session/static-formation-relationships-v1.mjs';
const copy=structuredClone;
const requirementsSchema={type:'object',additionalProperties:false,
  required:['relationshipConstraints','preserveSourceUnitIds'],properties:{
    relationshipConstraints:{anyOf:[{...STATIC_FORMATION_RELATIONSHIP_SCHEMA_V1,
      description:'Exact design-owned Native static predicates. Null only if this arm has no distance/engagement conditions. Spell out bounds, including any tolerance: Host never converts approximately eight inches into 0–8 or chooses a tolerance.'},{type:'null'}]},
    preserveSourceUnitIds:{type:'array',minItems:0,items:{type:'string',minLength:1,maxLength:65536},
      description:'Units whose EXISTING model positions in the explicitly selected source may NOT be repacked during scene construction. This is NOT same positions across two future arms: that separate equality is checked by compare_scenes. [] permits method-selected placement; it does not prove cross-arm equality.'}}};
export const ROSTER_COMPARISON_SCENE_REQUIREMENTS_SCHEMA_V1={type:'object',additionalProperties:false,
  required:['current','alternative'],properties:{current:requirementsSchema,alternative:requirementsSchema}};
export const ROSTER_COMPARISON_SCENE_SOURCE_INTERFACE_V1=Object.freeze({version:1,
  operation:'spatial',queryKind:'space.solve_static_formation',argumentLocation:'step.argumentsJson',
  designEvidenceIsState:false,explicitFrozenSource:{base:{kind:'source'}},
  savedState:'Bind /stateRef to the whole /stateRef of an actual Native receipt or preceding step.',
  savedBranch:'Use outer base:{kind:"branch",branchStateHash:<actual saved branch hash>}.',
  nativeQueryArguments:'unitId, anchors/anchorRegions, jointUnits and relationshipConstraints belong under arguments or queryArguments, not beside queryKind.',
  instruction:'Choose the parent STATE of this spatial solver, not the design document and not the later formation_scene option. purposeSource identifies the immutable DESIGN only; its evidence number is NOT a Native state or a formation option. If the frozen root is intentionally chosen, explicitly set outer base:{kind:"source"}; this does not place off-table units. Otherwise bind the whole actual Native stateRef or name a real saved branch. The Host never picks the parent, coordinates or option for you. formation_scene uses selections from completed solver options in a separate operation.'});
export const ROSTER_COMPARISON_SCENE_INSTRUCTION_V1=
  'sceneRequirementsByArm is the single authored source for distance/engagement predicates and source-preserved units. Use the actual Native relationship shape and actual participant IDs. Methods choose bounded search regions and explicitly select a whole saved stateRef or base; they do not restate/change these predicates. Shared preparation is allowed only when both arms have identical requirements. Same positions ACROSS arms is not preserveSourceUnitIds: construct one common scene then branch and compare actual states. Geometry witnesses do not prove cover/Creep, phase, resource payment, legal reactions, charge success, strategic value or all other controls; those remain separately measured/source-checked. Missing witnesses are not negative strategy results.';
function fail(code,detail,design=false){
  throw Object.assign(Error(code),{code,detail,dispatchOutcome:'not_dispatched',queryRepair:{
    correctable:!design,controlReturn:design,sourceContract:'roster_comparison_scene_requirements_v1',
    ...(design?{failureClass:'comparison_design_required',resolutionRequired:'comparison_design_decision'}:{}),
    originalQueryNotAnswered:true,nativeExecuted:false,...detail,
    instruction:ROSTER_COMPARISON_SCENE_INSTRUCTION_V1+(design
      ?' Return to the design owner for explicit conditions. Do not reinterpret the old prose, edit the original design/reply, or keep retrying this method.'
      :' Correct the method only against the immutable design; changing that design needs its owner. No Native work has executed.')}});
}
function canonical(input){
  const c=normalizeStaticFormationRelationshipsV1(input);
  c.baseEdgeDistances.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
  c.unengagedUnitIds.sort();return c;
}
export function rosterComparisonSceneRequirementsV1(purpose,arm){
  const arms=purpose?.sceneRequirementsByArm;
  if(!arms)return null; // Historical text remains readable, not auto-upgraded.
  if(!['current','alternative','shared'].includes(arm))fail('ROSTER_COMPARISON_SCENE_ARM_INVALID',{arm});
  for(const name of ['current','alternative']){
    const c=arms[name];
    if(!c||!Object.hasOwn(c,'relationshipConstraints')||!Array.isArray(c.preserveSourceUnitIds)
      ||c.preserveSourceUnitIds.some(id=>typeof id!=='string'||!id.trim())
      ||new Set(c.preserveSourceUnitIds).size!==c.preserveSourceUnitIds.length)
      fail('ROSTER_COMPARISON_SCENE_DESIGN_REQUIRED',{reason:'invalid_scene_requirements',arm:name},true);
    if(c.relationshipConstraints!==null)try{normalizeStaticFormationRelationshipsV1(c.relationshipConstraints);}
      catch(error){fail('ROSTER_COMPARISON_SCENE_DESIGN_REQUIRED',{reason:error.message,arm:name},true);}
    const participants=new Set((purpose.participantConfigurationsByArm?.[name]??[]).map(p=>p.unitInstanceId));
    const ids=[...c.preserveSourceUnitIds,...(c.relationshipConstraints?.unengagedUnitIds??[]),
      ...(c.relationshipConstraints?.baseEdgeDistances??[]).flatMap(d=>[d.unitId,d.targetUnitId])];
    if(ids.some(id=>!participants.has(id)))fail('ROSTER_COMPARISON_SCENE_DESIGN_REQUIRED',{
      reason:'scene_condition_participant_not_in_arm',arm:name,unknownUnitIds:ids.filter(id=>!participants.has(id))},true);
  }
  const normalized=c=>({relationshipConstraints:c.relationshipConstraints===null?null:canonical(c.relationshipConstraints),
    preserveSourceUnitIds:[...c.preserveSourceUnitIds].sort()});
  if(arm==='shared'&&!isDeepStrictEqual(normalized(arms.current),normalized(arms.alternative)))
    return null; // Pure cross-arm aggregation is valid; one shared physical setup is not.
  return copy(arms[arm==='shared'?'current':arm]);
}
export function bindRosterComparisonSceneArgumentsV1({operation,args,binding,boundArgumentPointers=[],stepId=null}){
  if(operation!=='spatial'||args.queryKind!=='space.solve_static_formation'||!binding)return {args,projection:null};
  const c=requireRosterComparisonSceneRequirementsV1(binding);
  const explicit=Object.hasOwn(args,'stateRef')||['source','branch'].includes(args.base?.kind)
    ||boundArgumentPointers.some(p=>['/stateRef','/base','/base/branchStateHash'].includes(p));
  if(!explicit)fail('ROSTER_COMPARISON_SCENE_SOURCE_REQUIRED',{purposeSource:binding.purposeSource,
    stepId,sourceSelection:copy(ROSTER_COMPARISON_SCENE_SOURCE_INTERFACE_V1),
    reason:'comparison_scene_must_explicitly_select_its_source_not_fall_back_to_root'});
  // During compilation a whole input dependency is checked after resolution.
  // Runtime calls have no unresolved pointers and always execute this check.
  if(boundArgumentPointers.some(p=>['/queryArguments','/arguments','/argumentsJson'].includes(p)))return {args,projection:null};
  const raw=args.queryArguments??args.arguments??(args.argumentsJson?JSON.parse(args.argumentsJson):{});
  const moving=[raw.unitId,...(raw.jointUnits??[]).map(u=>u.unitId)];
  const changed=c.preserveSourceUnitIds.filter(id=>moving.includes(id));
  if(changed.length)fail('ROSTER_COMPARISON_SCENE_PRESERVED_UNIT_MOVED',{purposeSource:binding.purposeSource,unitIds:changed});
  if(Object.hasOwn(raw,'relationshipConstraints')&&(c.relationshipConstraints===null
    ||!isDeepStrictEqual(canonical(raw.relationshipConstraints),canonical(c.relationshipConstraints))))
    fail('ROSTER_COMPARISON_SCENE_CONDITION_DRIFT',{purposeSource:binding.purposeSource,
      expected:c.relationshipConstraints,submitted:raw.relationshipConstraints});
  const native=copy(raw);
  if(c.relationshipConstraints!==null)native.relationshipConstraints=copy(c.relationshipConstraints);
  // Preserve the input encoding so existing nested binding pointers keep their
  // meaning. Serialization is still owned by the ordinary spatial Adapter.
  const transported=Object.hasOwn(args,'queryArguments')?{...args,queryArguments:native}
    :Object.hasOwn(args,'argumentsJson')?{...args,argumentsJson:JSON.stringify(native)}:{...args,arguments:native};
  return {args:transported,projection:{rule:'design_owned_scene_requirements_v1',
    purposeSource:copy(binding.purposeSource),arm:binding.arm,conditions:copy(c),
    sourceChosenByHost:false,coordinatesChosenByHost:false,originalReplyChanged:false}};
}
export function requireRosterComparisonSceneRequirementsV1(binding){
  if(binding?.sceneRequirementsContractVersion===1&&binding.arm==='shared'
    &&binding.sceneRequirements===null&&binding.sceneRequirementsByArm)
    fail('ROSTER_COMPARISON_SCENE_SHARED_CONDITIONS_DIFFER',{
      reason:'this_physical_operation_requires_one_arm;cross_arm_result_aggregation_is_separate'});
  if(binding?.sceneRequirementsContractVersion!==1||!binding.sceneRequirements)
    fail('ROSTER_COMPARISON_SCENE_DESIGN_REQUIRED',{
      purposeSource:binding?.purposeSource,reason:'prose_conditions_have_no_executable_geometry_contract'},true);
  return binding.sceneRequirements;
}
export function assessRosterComparisonSceneResultV1({operation,queryKind,binding,receipt}){
  if(operation!=='spatial'||queryKind!=='space.solve_static_formation'||!binding)return null;
  if(!binding.sceneRequirements)return {version:1,status:'condition_mismatch',reason:'historical_design_has_no_executable_scene_requirements',
    strategyComparisonProven:false,impossibilityProven:false,otherControlsProven:false};
  const c=binding.sceneRequirements,result=receipt?.queryReceipt?.result,options=result?.formationOptions;
  const common={version:1,purposeSource:copy(binding.purposeSource),conditions:copy(c),
    strategyComparisonProven:false,impossibilityProven:false,otherControlsProven:false};
  if(!Array.isArray(options))return {...common,status:'condition_mismatch',reason:'native_options_missing'};
  if(!options.length)return {...common,status:'no_witness',reason:'bounded_search_without_witness_not_refutation'};
  const issues=[];
  for(const [index,option]of options.entries()){
    const assessment=option.relationshipAssessment;
    if(c.relationshipConstraints){
      if(assessment?.passed!==true||assessment.complete!==true)issues.push({index,reason:'native_relationship_assessment_missing_or_failed'});
      for(const d of c.relationshipConstraints.baseEdgeDistances??[]){
        const rows=(assessment?.baseEdgeDistances??[]).filter(r=>r.unitId===d.unitId&&r.targetUnitId===d.targetUnitId
          &&r.minimumMilliInches===d.minimumMilliInches&&r.maximumMilliInches===d.maximumMilliInches);
        if(!rows.some(r=>r.passed===true&&Number.isSafeInteger(r.distanceMilliInches)
          &&r.distanceMilliInches>=d.minimumMilliInches&&r.distanceMilliInches<=d.maximumMilliInches))
          issues.push({index,reason:'distance_not_witnessed',condition:d});
      }
      for(const unitId of c.relationshipConstraints.unengagedUnitIds??[])
        if(!(assessment?.unengagedUnits??[]).some(r=>r.unitId===unitId&&r.passed===true&&r.engaged===false))
          issues.push({index,reason:'unengaged_not_witnessed',unitId});
    }
    const placements=option.canonicalPlacements??[option.canonicalPlacement];
    if(placements.some(p=>c.preserveSourceUnitIds.includes(p?.pieceId)))issues.push({index,reason:'source_preserved_unit_repacked'});
  }
  return {...common,status:issues.length?'condition_mismatch':'conditions_witnessed',optionCount:options.length,issues};
}
export function isRosterComparisonSceneDesignFailureV1(failure){
  const e=failure?.error,r=e?.queryRepair;
  return e?.code==='ROSTER_COMPARISON_SCENE_DESIGN_REQUIRED'&&e.dispatchOutcome==='not_dispatched'
    &&r?.sourceContract==='roster_comparison_scene_requirements_v1'&&r.correctable===false
    &&r.controlReturn===true&&r.nativeExecuted===false&&r.failureClass==='comparison_design_required'
    &&r.resolutionRequired==='comparison_design_decision';
}
