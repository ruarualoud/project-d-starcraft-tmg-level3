import {ROSTER_BUDGET_GENERATION_DESCRIPTION_V1} from './roster-budget-branch-query-v1.mjs';
import {inspectRosterTemporalMethodScopeV1} from './roster-role-responsibility-v1.mjs';
import {ROSTER_WORKFLOW_OPERATIONS_V1,ROSTER_WORKFLOW_PORTS_V1,ROSTER_REFERENCE_ARMY_PARAMETER_SCHEMA_V1} from './roster-workflow-operation-contracts-v1.mjs';
import {nativeTemporalInvariantErrorV1} from './pregame-native-temporal-invariant-v1.mjs';
import {assertJointTemporalInputV1} from './pregame-joint-temporal-v1.mjs';
import {assertRangedActivationSequenceV1,normalizeRangedActivationQueryArgumentsV1} from '../online-agent-session/ranged-activation-query-contract-v1.mjs';
// P3: the new scheduler calls the existing product laboratory. Work orders
// select operations/arguments, never manufacture results or Rules transitions.
import {isDeepStrictEqual} from 'node:util';
import {rosterWorkflowDelegatedStepKindV1} from './roster-workflow-graph-v1.mjs';
import {resolveRosterSavedNativeSourceV1} from './roster-saved-native-source-v1.mjs';
import {projectRosterBuilderInquiryStepV1} from './roster-builder-inquiry-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {rosterWorkflowReceiptPointerV1,rosterWorkflowBindingsMatchV1} from './roster-decision-workflow-v1.mjs';
import {parseRosterTeachEvidencePathV1} from './roster-teach-typed-evidence-v1.mjs';
import {describePregameMathInputContractsV1,describePregameWorkflowInputContractsV1,
   projectPregameFormationParentRepairV1,inspectPregameRequiredArgumentsV1,assertPregameProbabilityInputV1,assertPregameInspectInputV1,
    normalizePregameThreatExchangeInputV1,parsePregameNativeActionInputV1,
    describePregameNativeChanceOutcomeInputV1,describePregameScenarioInputContractV1,
    assertPregameStartOfRoundScenarioInputV1,assertPregameScenarioIntentV1} from './pregame-scene-laboratory-v1.mjs';
import {queryRosterBudgetBranchesV1,projectRosterBudgetBranchBaselineRepairV1} from './roster-budget-branch-query-v1.mjs';
import {assertRosterInterruptedQueryReplayV1} from './roster-read-only-query-recovery-v1.mjs';
import {ARMY_BUILDER_REJECTION_RECEIPT_SCHEMA,ARMY_BUILDER_CANDIDATE_INPUT_CONTRACT_V1,ARMY_BUILDER_CHOICE_PARAMETERS_V1} from './army-builder-query-port-v1.mjs';
import {PREGAME_MAP_WORKFLOW_CONTRACTS_V1,inspectPregameMapWorkflowArgumentsV1,describePregameMapParameterSchemaV1} from './pregame-map-evidence-port-v1.mjs';
import {STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1,inspectStarcraftTmgCurrentActionReferenceV1}
  from '../online-agent-session/spatial-query-contracts-v1.mjs';
import {findRepeatedFailedRosterSceneV1,findCompletedRosterQueryObservationV1,findCompletedRosterNativeSpatialActionV1,
  findCompletedRosterInspectObservationV1,findCompletedRosterBuilderObservationV1,
  findRepeatedTemporalMissingPremiseV1,
  createRosterQueryObservationFlightsV1,isReusableRosterQueryReceiptV1} from './roster-experiment-progress-v1.mjs';
import {createRosterWorkflowCandidateContextsV1,ROSTER_CANDIDATE_CONTEXT_INPUT_V1,describeRosterBuilderQueryParameterSchemaV1,describeRosterCandidateContextParameterSchemaV1,
  projectRosterCandidateFailureV1,projectRosterCandidateEditsV1} from './roster-workflow-candidate-context-v1.mjs';
import {projectRosterWorkflowStateReferenceV1,resolveRosterWorkflowStateReferenceV1,
  projectRosterWorkflowStateBindingFailureV1,
  projectRosterWorkflowDelegatedScenesV1,bindRosterWorkflowDelegatedSceneV1,
  normalizeRosterWorkflowStateReferenceArgumentsV1,isRosterWorkflowTypedStateAliasBindingV1} from './roster-workflow-state-reference-v1.mjs';
import {normalizeRosterFormationQueryInputV1,projectRosterJointFormationEnvelopeV1,ROSTER_STATIC_INTENT_COLLECTION_INPUT_V1} from './roster-formation-query-input-v1.mjs';
import {ROSTER_EXPERIMENT_SCOPE_SCHEMA_V1,validateRosterExperimentScopeV1,projectRosterExperimentOriginV1,
  assertRosterLocalScenarioPlacementsV1} from './roster-experiment-scope-v1.mjs';
import {resolveRosterComparisonBindingV1,bindRosterComparisonStepV1,assertRosterBoundParticipantPurposeV2,assertRosterSavedObservationPairV1} from './roster-comparison-observation-v1.mjs';
import {rosterToolProofScopeV1,projectRosterUnresolvedQueryReturnV1} from './roster-tool-proof-scope-v1.mjs';
import {projectRosterWorkflowToolChoiceV1 as projectChoiceSources} from './roster-workflow-tool-choice-v1.mjs';
import {projectRosterStaticFormationOptionV1} from './roster-workflow-receipt-view-v1.mjs';
import {projectPregameGeometryRepairContractV1,projectPregameProbabilityRepairContractV1} from './pregame-query-repair-contract-v1.mjs';
import {assertPregameSceneProjectionInputV1,PREGAME_SCENE_PROJECTION_ARGUMENTS_V1,projectPregameSceneProjectionFailureV1}
  from './pregame-scene-projection-v1.mjs';
import {assertPregameSceneComparisonInputV1} from './pregame-scene-conditions-v1.mjs';
import {rosterToolReplyCommunicationErrorsV1,quarantineRosterCommunicationV1} from './roster-role-communication-v1.mjs';
import {describeRosterMeasuredComparisonV1,validateRosterMeasuredComparisonV1,compareRosterMeasuredObservationsV1,projectRosterMeasuredDecisionEvaluationV2} from './roster-measured-comparison-v1.mjs';
import {describeRosterNativePopulationV1,validateRosterNativePopulationV1,summarizeRosterNativePopulationV1} from './roster-native-population-v1.mjs';
import {checkRosterParticipantConfigurationV1,needsRosterParticipantConfigurationV1} from './roster-participant-configuration-v1.mjs';
import {assertSingleUnitTemporalInput,inspectSingleUnitTemporalBindingsV1} from './pregame-single-unit-temporal-v1.mjs';
import {resolveRosterTemporalPreparationReuseV1} from './roster-temporal-preparation-reuse-v1.mjs';
import {assertPregameBoundedArrivalInputV1} from './pregame-bounded-arrival-control-v1.mjs';
import {bindRosterComparisonSceneArgumentsV1,assessRosterComparisonSceneResultV1,
  ROSTER_COMPARISON_SCENE_INSTRUCTION_V1} from './roster-comparison-scene-contract-v1.mjs';
import {createRosterComparisonSceneGateV1} from './roster-comparison-scene-entry-v1.mjs';
const clone=v=>structuredClone(v);
const fail=(code,detail)=>{throw Object.assign(Error(code),{code,detail,dispatchOutcome:'not_dispatched'});};
const physicalRangeContract={version:1,sourceContract:'roster_physical_range_v1',
  shape:{range:{value:'finite nonnegative number in the selected unit',unit:'inch | mm'}},
  instruction:'For a new within_and_wholly_within measurement supply range:{value,unit:"inch"|"mm"} in the Native query arguments. Use the actual physical value without pre-converting: 12 inches is {value:12,unit:"inch"}, 304.8 millimetres is {value:304.8,unit:"mm"}. Host converts once to Native milli-inches (1 inch = 1000 milli-inches = 25.4 mm). Do not also provide rangeMilliInches. Preserve the selected scene/source/target and intended physical distance; do not infer a distance from an old large number. Saved legacy numeric receipts retain their literal milli-inch meaning, not the prose intent. A reference marker is only a declared proxy, not a computed Creep effect.'};
function physicalRangeInput(kind,input,{requireExplicit=false,stepId=null}={}){
  if(kind!=='within_and_wholly_within')return {input,projection:null};
  if(!Object.hasOwn(input??{},'range')){
    if(requireExplicit)fail('ROSTER_WORKFLOW_PHYSICAL_RANGE_REQUIRED',{stepId,...physicalRangeContract,
      receivedRangeMilliInches:input?.rangeMilliInches??null,nativeExecuted:false});
    return {input,projection:null};
  }
  const range=input.range;
  if(!range||Array.isArray(range)||typeof range!=='object'||Object.keys(range).some(k=>!['value','unit'].includes(k))
    ||typeof range.value!=='number'||!Number.isFinite(range.value)||range.value<0
    ||!['inch','mm'].includes(range.unit)||Object.hasOwn(input,'rangeMilliInches'))
    fail('ROSTER_WORKFLOW_PHYSICAL_RANGE_INVALID',{stepId,...physicalRangeContract,nativeExecuted:false});
  const value=Math.round(range.value*(range.unit==='inch'?1000:1000/25.4));
  if(!Number.isSafeInteger(value))fail('ROSTER_WORKFLOW_PHYSICAL_RANGE_INVALID',{stepId,...physicalRangeContract,nativeExecuted:false});
  const {range:original,...rest}=input;
  return {input:{...rest,rangeMilliInches:value},projection:{normalization:'physical_range_v1',
    original:clone(original),valueMilliInches:value,sourceOrTargetChanged:false,sceneChanged:false}};
}
import {ROSTER_FORMATION_SELECTOR_COMMAND_INTERFACE_V1 as formationSelectorCommandInterface} from './roster-formation-selection-contract-v1.mjs';
const formationSelectorBindings=step=>(step.bindings??[]).filter(b=>['/selection','/selections'].some(p=>b.argumentPointer===p||b.argumentPointer.startsWith(p+'/')));
const formationSelectionRepair={correctable:true,sourceContract:'pregame_static_formation_selection_v1',repairContractVersion:3,originalQueryNotAnswered:true,
  commandInterface:formationSelectorCommandInterface,
  instruction:'Use nonempty selections [{sourceEvidenceNumber,optionIndex}] for completed evidence, or [{fromStepId,optionIndex}] for a preceding solver step in this response. The selected saved options carry their exact parent: when all share one parent and no parent is supplied, Host transports that identity, never a different scene or an option choice. An explicit stateRef/base must still match; conflicting parents are not overwritten. A whole_joint_formation option contains ALL its unitIds: select it ONCE, not once per unit. Host preserves unselected models/terrain and reassesses the whole scene; those are fixed semantics, not extra scenario flags. branchId/executionScope are Host metadata. optionIndex is zero-based in the exact source formationOptions array. Never invent coordinates/receipts or select from an empty result.'};
function formationSelectionInputProblem(args){
  const fields=Object.keys(args).filter(k=>!['base','selections','branchId','executionScope'].includes(k));
  if(fields.length)return {reason:'unsupported_fields',fields,allowedModelFields:['stateRef','base','selections']};
  if(!['source','branch'].includes(args.base?.kind))return {reason:'explicit_parent_required',field:'base'};
  if(!Array.isArray(args.selections)||!args.selections.length)return {reason:'nonempty_selections_required',field:'selections'};
  return null;
}
const operations=ROSTER_WORKFLOW_PORTS_V1;
const str={type:'string',minLength:0,maxLength:65536};
const obj=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const arr=items=>({type:'array',minItems:0,items});
const contextCapable=operation=>ROSTER_WORKFLOW_OPERATIONS_V1[operation]?.contextCapable===true;
const branchCapable=new Set(Object.keys(operations).filter(operation=>ROSTER_WORKFLOW_OPERATIONS_V1[operation].branchCapable));
const privateBranchOperations=new Set(Object.keys(operations).filter(operation=>ROSTER_WORKFLOW_OPERATIONS_V1[operation].producesPrivateState));
let sharedInputContracts;
const workflowInputContracts=()=>sharedInputContracts??=describePregameWorkflowInputContractsV1();
// The adapter envelope and Native projection share one diagnostic. Previously
// this boundary threw a bare code, so a rejected input had no correction owner.
// Re-inspect retained failures with this same validator; never rewrite or replay
// a receipt, infer a target from an alias, or choose omitted adaptation policy.
function assertWorkflowSceneProjectionInput(args){
  const fields=Object.keys(PREGAME_SCENE_PROJECTION_ARGUMENTS_V1);
  const unsupportedArguments=Object.keys(args).filter(key=>
    ![...fields,'base','branchId','executionScope'].includes(key));
  const missingArguments=fields.filter(key=>key!=='terrainPolicy'&&!Object.hasOwn(args,key));
  let sourceError;
  try{assertPregameSceneProjectionInputV1(args);}catch(error){sourceError=error;}
  if(!unsupportedArguments.length&&!missingArguments.length&&!sourceError)return;
  const inputProblem={unsupportedArguments,missingArguments,
    ...(sourceError?{sourceValidationCode:sourceError.code,sourceDetail:sourceError.detail??null}:{})};
  const queryRepair={...sourceError?.queryRepair,correctable:true,
    sourceContract:'pregame_scene_projection_v1',originalQueryNotAnswered:true,
    inputContract:clone(PREGAME_SCENE_PROJECTION_ARGUMENTS_V1),inputProblem,
    targetContract:'Use the complete target stateRef, or explicit legacy contextRef/base. targetContextRef is not a callable field. Bind /stateRef from the saved target receipt; referenceStateRef selects the separate reference geometry.',
    instruction:'Correct the reported projection input fields using the source-owned inputContract. Select the complete target stateRef and the separate saved referenceStateRef; do not infer or silently switch the target. Explicitly choose changedUnits and unlistedUnits using that contract. Preserve the original comparison and successful candidate/scene sources; do not recreate them. Host selects no target, adaptation, coordinates or successful result. If the method premise needs a strategic decision, return strategy_required with the evidence instead of manufacturing a projection.'};
  throw Object.assign(Error('ROSTER_WORKFLOW_SCENE_PROJECTION_INPUT_INVALID'),{
    code:'ROSTER_WORKFLOW_SCENE_PROJECTION_INPUT_INVALID',detail:inputProblem,queryRepair,
    dispatchOutcome:'not_dispatched'});
}
// A declared dynamic field gets its value from the explicit dependency. Requiring
// a second literal null creates no additional authority or validation. Keep
// unknown/nested destinations strict; Native still validates the supplied value.
const declaredRootBinding=(operation,pointer)=>/^\/[A-Za-z][A-Za-z0-9_]*$/u.test(pointer)
  &&(Object.hasOwn(workflowInputContracts()[operation]?.argumentsShape??{},pointer.slice(1))
    ||PREGAME_MAP_WORKFLOW_CONTRACTS_V1[operation]?.fields.includes(pointer.slice(1)));
const optionalBinding=(operation,pointer,binding)=>pointer==='/contextRef'&&contextCapable(operation)
  ||['/base/branchStateHash','/stateRef'].includes(pointer)&&branchCapable.has(operation)
  ||branchCapable.has(operation)&&isRosterWorkflowTypedStateAliasBindingV1(binding)
  ||declaredRootBinding(operation,pointer);
const stepReference={...str,description:'Earlier step in this order, or a uniquely named earlier step in another workOrder of THIS same response. For guards ONLY, this step itself means checking its result AFTER execution. Later/future or ambiguous references are not allowed. Use fromEvidenceNumber for an already completed prior response.'};
const evidenceSource={type:'integer',minimum:0,maximum:1_000_000_000,description:'0 for a prior step in this response; otherwise an exact current tool-receipt evidence number from the catalogue, with fromStepId empty. Reuse completed results without recreating their scenes.'};
export const ROSTER_WORKFLOW_EXPERIMENT_ORDER_SCHEMA_V1=obj({
  orderId:str,purpose:str,scenarioAssumptions:arr(str),
  experimentScope:ROSTER_EXPERIMENT_SCOPE_SCHEMA_V1,
  steps:arr(obj({stepId:str,operation:{...str,enum:Object.keys(operations)},argumentsJson:str,
    bindings:arr(obj({argumentPointer:{...str,description:'Dynamic argument supplied by the selected source. This binding replaces any literal at this address; use guards for equality requirements.'},fromStepId:stepReference,fromEvidenceNumber:evidenceSource,resultPointer:{...str,description:'Exact receipt address: /branchStateHash, displayed /receipt/branchStateHash, or full /value/receipt/branchStateHash are the same declared root. Do not prepend receipt twice.'}})),
    guards:arr(obj({fromStepId:stepReference,fromEvidenceNumber:evidenceSource,resultPointer:{...str,description:'Same receipt-root convention as bindings.resultPointer.'},equalsJson:str})),publicReason:str})),
  stopAndReturnToModelWhen:str,
});
// Empty for ordinary experiments. Old saved orders are normalized to empty
// by the read-role adapter; the strict Provider subset requires all properties.
ROSTER_WORKFLOW_EXPERIMENT_ORDER_SCHEMA_V1.properties.completionStepId={...str,
  description:'Optional preferred output step of THIS batch; use empty when no preference. This is not authority to complete the caller. Host matches actual operation/query/measurement identity and requires its successful Native result. A preliminary geometry/source step cannot complete a formation/action/measurement caller, even if named here.'};
ROSTER_WORKFLOW_EXPERIMENT_ORDER_SCHEMA_V1.required.push('completionStepId');
function exact(root,pointer){
  if(pointer==='')return root;
  const parsed=typeof pointer==='string'&&pointer.startsWith('/')?parseRosterTeachEvidencePathV1(pointer):null;
  if(!parsed)fail('ROSTER_WORKFLOW_TOOL_POINTER_INVALID',pointer);
  let value=root;
  for(const key of parsed.keys){
    if(['__proto__','constructor','prototype'].includes(key)||value===null||typeof value!=='object'||!Object.hasOwn(value,key))
      fail('ROSTER_WORKFLOW_TOOL_POINTER_MISSING',pointer);
    value=value[key];
  }
  return value;
}
function bind(request,pointer,value,operation){
  if(pointer==='/branchIdRef'&&branchCapable.has(operation)){
    // Compilation proves the source address; execution proves its whole value.
    // Never require a redundant null field, or accept a scalar scene alias.
    normalizeRosterWorkflowStateReferenceArgumentsV1({...request,branchIdRef:value});
    const prior=Object.hasOwn(request,'branchIdRef')?clone(request.branchIdRef):null;
    request.branchIdRef=clone(value);return prior;
  }
  // This declared optional routing input is itself provided by the explicit
  // binding. No redundant null literal or model re-generation is necessary.
  if(['/contextRef','/stateRef'].includes(pointer)&&!Object.hasOwn(request,pointer.slice(1))){
    request[pointer.slice(1)]=clone(value);return null;
  }
  if(declaredRootBinding(operation,pointer)&&!Object.hasOwn(request,pointer.slice(1))){
    request[pointer.slice(1)]=clone(value);return null;
  }
  if(pointer==='/base/branchStateHash'){
    if(request.base!==null&&request.base!==undefined&&(typeof request.base!=='object'||Array.isArray(request.base)
      ||request.base.kind&&request.base.kind!=='branch'))fail('ROSTER_WORKFLOW_BRANCH_BINDING_KIND_CONFLICT');
    const prior=request.base?.branchStateHash??null;
    request.base={...request.base,kind:'branch',branchStateHash:clone(value)};return clone(prior);
  }
  const parsed=parseRosterTeachEvidencePathV1(pointer);
  if(!pointer.startsWith('/')||!parsed?.keys.length)fail('ROSTER_WORKFLOW_TOOL_BINDING_INVALID',pointer);
  const prior=exact(request,pointer);
  // An explicit data dependency is the input source, not an equality guard.
  // Preserve the original literal in the receipt rather than asking a model
  // to repeat a mechanical successor substitution. Guards remain separate.
  let target=request;
  for(const key of parsed.keys.slice(0,-1))target=target[key];
  target[parsed.keys.at(-1)]=clone(value);
  return clone(prior);
}
function resolveBoundArguments(selected,inputs){
  const args=clone(selected.args);
  const inputBindings=selected.bindings.map(binding=>{
    const source=inputs[binding.name];
    if(!source||!Object.hasOwn(source,'value'))fail('ROSTER_WORKFLOW_TOOL_BINDING_SOURCE_MISSING',binding.name);
    let priorFieldPresent=true;try{exact(args,binding.pointer);}catch{priorFieldPresent=false;}
    const priorValue=bind(args,binding.pointer,source.value,selected.operation);
    return {argumentPointer:binding.pointer,priorValue,priorFieldPresent,value:clone(source.value),
      sourceWorkId:source.workId,sourceResultRef:source.resultRef,
      ...(source.evidenceId?{sourceEvidenceId:source.evidenceId}:{})};
  });
  if(branchCapable.has(selected.operation))try{normalizeRosterWorkflowStateReferenceArgumentsV1(args);}
  catch(error){
    // Retain the exact resolved submission for the same-question correction.
    // This validation runs before a pending dispatch or any Native operation.
    if(error.queryRepair?.correctable){error.boundArguments=clone(args);error.inputBindings=clone(inputBindings);}
    throw error;
  }
  if(selected.operation==='bounded_arrival_control')try{
    assertPregameBoundedArrivalInputV1(args,{allowWorkflowReferences:true});
  }catch(error){error.boundArguments=clone(args);error.inputBindings=clone(inputBindings);throw error;}
  return {args,inputBindings};
}
function parse(text,code,location={}){
  try{return JSON.parse(text);}catch{
    fail(code,{...location,diagnosticContract:{kind:'json_argument_encoding',version:1},expectedEncoding:'json_string',
      receivedType:text===null?'null':Array.isArray(text)?'array':typeof text,
      instruction:location.layer==='spatial_arguments_json'
        ?'The OUTER step.argumentsJson was decoded successfully. The failure is its INNER argumentsJson value: the legacy inner field requires a JSON-encoded string, not an object. Prefer one typed queryArguments object instead, with the exact Native fields from nativeInputContract. State/context/seat fields belong beside queryKind, outside queryArguments. Do not change the intended parent, coordinates, unit, or hypothesis to repair this encoding; no step executed. Do not mix typed and legacy encodings.'
        :'This JSON-encoded field could not be decoded. Correct only the indicated field encoding; its contents have not reached the Native argument validator. Do not infer missing gameplay fields or rewrite the intended operation from this syntax error. No step executed.'});
  }
}
const stepJsonLocation=step=>({stepId:step.stepId,operation:step.operation,
  layer:'step_arguments_json',parameter:'step.argumentsJson',decodedPointer:''});
function currentToolEvidence(directory,number,scope){
  const evidence=Number.isSafeInteger(number)&&number>0
    ?directory.find((entry,index)=>(entry.number??index+1)===number):null;
  const current=evidence&&(scope?rosterWorkflowBindingsMatchV1(evidence.bindings,scope):evidence.validity==='current');
  if(!current||evidence.kind!=='tool_receipt'
    ||!/^tool(?:-view)?:/.test(evidence.id))fail('ROSTER_WORKFLOW_TOOL_EVIDENCE_BINDING_INVALID',{
      evidenceNumber:number,instruction:'Choose an exact current Native tool receipt number. Proposals, derived fact indexes, historical facts and arbitrary hashes are not executable source bindings.'});
  return {evidence,workId:evidence.id.replace(/^tool(?:-view)?:/,'')};
}
export {nativeSelectionContract as validateRosterWorkflowNativeSelectionV1};
export function normalizeRosterWorkflowNativeSelectionV1(selection){
  if(selection?.kind!=='finite'||typeof selection.match!=='string'||!selection.match.trim())return {selection,projection:[]};
  return {selection:{...clone(selection),match:{actionType:selection.match}},projection:[{
    rule:'native_finite_action_type_v1',from:'/selection/match',to:'/selection/match/actionType',
    actionType:selection.match,semanticValuePreserved:true,sourceSelectionApproved:false,nativeExecuted:false}]};
}
function nativeSelectionContract(args,bindings=[]){
  const selection=normalizeRosterWorkflowNativeSelectionV1(args.selection).selection;
  const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
  const fields=object(selection)?selection:{};
  const sourceCount=Number(Object.hasOwn(fields,'sourceEvidenceNumber'))+Number(Object.hasOwn(fields,'fromStepId'));
  const byIndex=Object.hasOwn(fields,'index'),byMatch=Object.hasOwn(fields,'match');
  const match=fields.match;
  const issues=[];
  if(!object(selection))issues.push({code:'selection_object_required',pointer:'/selection'});
  if(sourceCount!==1)issues.push({code:'exactly_one_selection_source_required',pointer:'/selection',receivedSourceCount:sourceCount,
    alternatives:[{field:'sourceEvidenceNumber',meaning:'positive number of an already saved inspect or formation query'},
      {field:'fromStepId',meaning:'name of an earlier source step in this response; a literal dependency, not a receipt field'}]});
  for(const binding of bindings)issues.push({
    code:binding.argumentPointer==='/selection/sourceEvidenceNumber'&&/^\/(?:value\/)?(?:receipt\/)?evidenceNumber$/.test(binding.resultPointer)
      ?'receipt_evidence_number_does_not_exist':'selection_must_not_have_separate_argument_bindings',
    pointer:binding.argumentPointer,argumentPointer:binding.argumentPointer,fromStepId:binding.fromStepId,resultPointer:binding.resultPointer,
    instruction:'The selected source owns parent/seat/action; use bindings:[]. For an ALREADY SAVED menu use selection.sourceEvidenceNumber from the evidence directory, NOT a former response step name. Only an earlier step in this SAME response uses selection.fromStepId; its future menu still requires observation and model confirmation. An inspect receipt has no evidenceNumber field. Do not rebuild a saved inspect to invent a new step name.'});
  const extraArguments=Object.keys(args).filter(k=>k!=='selection');
  if(extraArguments.length)issues.push({code:'selection_parent_is_source_owned',pointer:'',extraArguments});
  if(!['finite','domain','formation'].includes(fields.kind))issues.push({code:'selection_kind_invalid',
    pointer:'/selection/kind',allowed:['finite','domain','formation']});
  if(Number(byIndex)+Number(byMatch)!==1)issues.push({code:'exactly_one_selection_selector_required',pointer:'/selection',
    alternatives:['index: nonnegative zero-based integer','match: nonempty object of exact primitive identity fields; finite alone may use a nonempty exact actionType string']});
  if(byIndex&&(!Number.isSafeInteger(fields.index)||fields.index<0))issues.push({code:'selection_index_invalid',
    pointer:'/selection/index',expected:'nonnegative safe integer'});
  if(byMatch&&(!object(match)||!Object.keys(match).length))issues.push({code:'selection_match_object_required',pointer:'/selection/match'});
  else if(byMatch)for(const [key,value]of Object.entries(match)){
    if(['__proto__','constructor','prototype'].includes(key)||value!==null&&!['string','number','boolean'].includes(typeof value))
      issues.push({code:'selection_match_primitive_required',pointer:'/selection/match/'+key});
  }
  const allowedFields=['sourceEvidenceNumber','fromStepId','kind','index','match','parameters','outcome'];
  for(const key of Object.keys(fields))if(!allowedFields.includes(key))issues.push({code:'selection_field_unknown',
    pointer:'/selection/'+key,allowedFields});
  if(['finite','formation'].includes(fields.kind)&&Object.hasOwn(fields,'parameters'))issues.push({
    code:'selection_parameters_source_owned',pointer:'/selection/parameters',kind:fields.kind});
  if(fields.kind==='domain'&&!object(fields.parameters))issues.push({code:'selection_domain_parameters_required',pointer:'/selection/parameters'});
  if(Object.hasOwn(fields,'sourceEvidenceNumber')&&(!Number.isSafeInteger(fields.sourceEvidenceNumber)||fields.sourceEvidenceNumber<=0))
    issues.push({code:'selection_saved_source_number_invalid',pointer:'/selection/sourceEvidenceNumber',expected:'positive safe integer'});
  if(Object.hasOwn(fields,'fromStepId')&&!(typeof fields.fromStepId==='string'&&fields.fromStepId.length))
    issues.push({code:'selection_step_source_invalid',pointer:'/selection/fromStepId',expected:'nonempty earlier step ID'});
  if(issues.length)
    fail('ROSTER_WORKFLOW_NATIVE_SELECTION_INVALID',{
      issues,receivedSelection:clone(selection??null),validationLayer:'selection_envelope',nativeExecuted:false,
      gameplayLegalityEvaluated:false,
      sourceExamples:[{selection:{fromStepId:'earlier-inspect-step',kind:'finite',index:0}},
        {selection:{sourceEvidenceNumber:1,kind:'domain',match:{actionType:'deploy',pieceId:'exact observed unit ID'},parameters:{}}}],
      examplesAreSyntaxOnly:true,
      instruction:'This is selection-envelope validation only; no menu lookup or Native legality check has run. Correct the listed fields, preserving the intended parent, question and candidates; this error is not evidence that a domain, ability or scenario is wrong. Select exactly one source and selector: an object of exact primitive field matches OR zero-based index; finite also accepts an exact actionType string which Host wraps as {actionType:value}. finite selects finiteActions[].action; domain selects parameterDomains[] and requires explicit parameters. formation selects a complete Native space.solve_formation/legal_formation_options entry and copies its canonicalParameters; finite/formation forbid parameters. A formationOptionId in match disambiguates a whole candidate. No Host ranking or unit substitution. Do not also bind parent/seat/action. Static formation_scene is NOT a Native action candidate. An unread menu requires read and model confirmation before execution.'});
  return selection;
}
function nativeSelectionIdentity(entry,kind){
  if(kind!=='finite')return entry;
  // The menu publishes candidateId/proposal.actionKey outside the action body.
  // Match those exact source fields; execution still copies proposal.actionKey
  // from the selected entry, never constructs one from an ID or display name.
  const identity={...entry.action};
  for(const [key,value] of Object.entries({candidateId:entry.candidateId,actionKey:entry.proposal?.actionKey})){
    if(value===undefined)continue;
    if(typeof value!=='string'||!value||Object.hasOwn(identity,key)&&identity[key]!==value)
      fail('ROSTER_WORKFLOW_NATIVE_SELECTION_IDENTITY_CONFLICT',{key});
    identity[key]=value;
  }
  return identity;
}
export function resolveRosterWorkflowNativeSelectionV1(args,source,{requireParameters=false}={}){
  const choice=nativeSelectionContract(args),value=source?.value;
  const formation=choice.kind==='formation';
  const savedSource=source?.source==='evidence'&&source.status==='read'
    &&source.validity==='current'&&source.kind==='tool_receipt'&&source.pointer===''
    &&/^(?:tool:|choice-source:)/u.test(source.evidenceId??'');
  if(!source?.workId&&!savedSource||value?.status!=='completed'||(formation
    ?value.operation!=='spatial'||!['space.solve_formation','legal_formation_options'].includes(value.receipt?.queryKind)
    :value.operation!=='inspect'))
    fail('ROSTER_WORKFLOW_NATIVE_SELECTION_SOURCE_INVALID','Select a completed inspect for finite/domain, or a completed current-domain Native formation query for formation; never a static geometry scene or proposal');
  const stateRef=projectRosterWorkflowStateReferenceV1(value),space=value.receipt?.actionSpace;
  const entries=formation?value.receipt?.queryReceipt?.result?.formationOptions:choice.kind==='finite'?space?.finiteActions:space?.parameterDomains;
  // Report the exact scene that was searched, not just a zero/ambiguous match.
  // An empty menu in one saved scene is not a global inability or another
  // branch's menu. Missing metadata remains unknown; no action is substituted.
  const sourceObservation={version:1,operation:value.operation,stateRef:clone(stateRef),
    phase:value.receipt?.phase??null,round:value.receipt?.round??null,
    activeSideKey:value.receipt?.activeSideKey??null,selectionKind:choice.kind,
    menuPointer:formation?'/receipt/queryReceipt/result/formationOptions'
      :choice.kind==='finite'?'/receipt/actionSpace/finiteActions':'/receipt/actionSpace/parameterDomains',
    menuPresent:Array.isArray(entries),entryCount:Array.isArray(entries)?entries.length:null};
  let item;
  if(choice.match){
    const matches=(entries??[]).filter(entry=>Object.entries(choice.match).every(([key,value])=>{
      const identity=nativeSelectionIdentity(entry,choice.kind);
      return identity&&Object.hasOwn(identity,key)&&isDeepStrictEqual(identity[key],value);
    }));
    if(matches.length!==1)fail('ROSTER_WORKFLOW_NATIVE_SELECTION_MATCH_NOT_UNIQUE',{
      match:choice.match,matchCount:matches.length,sourceObservation,
      availableIdentities:(entries??[]).map((entry,index)=>{const identity=nativeSelectionIdentity(entry,choice.kind);
        return {index,...(entry.domainId?{domainId:entry.domainId}:{}),
          readPointer:(formation?'/receipt/queryReceipt/result/formationOptions':choice.kind==='finite'?'/receipt/actionSpace/finiteActions':'/receipt/actionSpace/parameterDomains')+'/'+index,
          ...Object.fromEntries([...new Set(['candidateId','actionKey','actionType','pieceId','abilityName',
            'sideKey','chosenFirstActorSideKey',...Object.keys(choice.match)])]
          .filter(key=>identity&&Object.hasOwn(identity,key)).map(key=>[key,identity[key]]))};})});
    item=matches[0];
  }else item=entries?.[choice.index];
  if(!stateRef||!item)fail('ROSTER_WORKFLOW_NATIVE_SELECTION_NOT_PRESENT',{
    kind:choice.kind,index:choice.index,finiteCount:space?.finiteActions?.length??0,domainCount:space?.parameterDomains?.length??0,sourceObservation});
  if(formation){
    const request=value.request??{},queries=[];
    if(Object.hasOwn(request,'arguments'))queries.push(request.arguments);
    if(Object.hasOwn(request,'argumentsJson'))queries.push(parse(request.argumentsJson,'ROSTER_WORKFLOW_NATIVE_OPTION_QUERY_INVALID'));
    if(!queries.length||queries.some(q=>!q||typeof q!=='object'||Array.isArray(q)))
      fail('ROSTER_WORKFLOW_NATIVE_OPTION_QUERY_INVALID','The original query must contain its typed arguments or legacy argumentsJson; no default domain is inferred');
    if(queries.some(q=>!isDeepStrictEqual(q,queries[0])))
      fail('ROSTER_WORKFLOW_NATIVE_OPTION_QUERY_CONFLICT','Saved query argument encodings disagree; do not choose one or rewrite the source');
    const query=queries[0];
    if(item.rulesAuthority!==true||item.completeFormationPlacementChecked!==true
      ||!item.canonicalParameters||typeof item.canonicalParameters!=='object'||Array.isArray(item.canonicalParameters)
      ||item.domainId!==(query.domainId??query.candidateId))
      fail('ROSTER_WORKFLOW_NATIVE_OPTION_NOT_CANONICAL','Only a complete Rules-instantiated option for the source query domain can execute; static geometry is not an action');
  }
  const seatKey=formation?value.receipt.seatKey:choice.kind==='finite'?item.action?.sideKey:item.sideKey;
  const action=choice.kind==='finite'?{actionKey:item.proposal?.actionKey}:{domainId:item.domainId,
    parameters:clone(formation?item.canonicalParameters:choice.parameters)};
  if(!['player1','player2'].includes(seatKey)||!(action.actionKey??action.domainId))
    fail('ROSTER_WORKFLOW_NATIVE_SELECTION_IDENTITY_INVALID');
  if(Object.hasOwn(choice,'outcome'))action.outcome=clone(choice.outcome);
  const index=entries.indexOf(item),menuPointer=(formation?'/receipt/queryReceipt/result/formationOptions'
    :choice.kind==='finite'?'/receipt/actionSpace/finiteActions':'/receipt/actionSpace/parameterDomains')+'/'+index;
  if(requireParameters&&choice.kind==='domain'&&Array.isArray(item.parameterSchema?.required)){
    const missingFields=item.parameterSchema.required.filter(key=>!Object.hasOwn(choice.parameters,key));
    if(missingFields.length){
      const detail={domainId:item.domainId,pieceId:item.pieceId,menuPointer,missingFields,
        inputContract:clone(item.parameterSchema),nativeExecuted:false,gameplayLegalityEvaluated:false};
      const queryRepair={correctable:true,sourceContract:'native_selected_domain_parameters_v1',originalQueryNotAnswered:true,
        ...detail,instruction:'The exact selected domain exists, but its required action parameters are absent. Preserve the parent, unit and objective; supply explicit parameters or obtain and choose a complete Native current-domain formation option. A syntax example with parameters:{} is not an executable action. A read-only spatial domain selector needs no execution parameters. Host has not chosen coordinates, a formation or another action; full geometry/Rules validation still follows.'};
      throw Object.assign(Error('ROSTER_WORKFLOW_NATIVE_DOMAIN_PARAMETERS_INVALID'),{
        code:'ROSTER_WORKFLOW_NATIVE_DOMAIN_PARAMETERS_INVALID',dispatchOutcome:'not_dispatched',detail,queryRepair,
        resolvedSelection:{stateRef,seatKey,action}});
    }
  }
  return {stateRef,seatKey,action,item,index,menuPointer};
}
// A previously rejected selector may be confirmed once after the source fix.
// This proves only that its exact saved input now resolves, never execution.
export function projectRosterSavedMenuSelectorRecoveryV1({work,failedResult,savedInput}){
  const failed=failedResult?.value;
  if(work?.role!=='roster_workflow_tool'||work.status!=='needs_model_choice'
    ||work.repairGeneration!==3||!work.inputRef||work.operationState?.pending
    ||failed?.code!=='ROSTER_WORKFLOW_NATIVE_SELECTION_SOURCE_INVALID'
    ||failed.executed!==false||failed.nativeSuccess!==false
    ||failed.operation!=='native_action'||savedInput?.workId!==work.id
    ||!isDeepStrictEqual(savedInput.bindings,work.bindings))return null;
  const request=savedInput.inputs?.request?.value,source=savedInput.inputs?.[request?.nativeActionSource];
  if(source?.source!=='evidence'||!isDeepStrictEqual(request,work.inputs.request.value)
    ||!isDeepStrictEqual(request.args,failed.submittedArguments))return null;
  try{resolveRosterWorkflowNativeSelectionV1(request.args,source);}catch{return null;}
  return {engineeringChangeId:'saved_native_menu_source_v1',
    reason:'The saved Native selector was rejected solely because the adapter required a live work-result ID. Its exact immutable current full menu now passes the same selector as live work. Confirm only this saved choice once, preserving prior failures and fees; do not replay successful actions, broaden the experiment or approve a Plan.'};
}
function nativeSelectionInputBinding(args,bound,source){
  return {argumentPointer:'/selection',priorValue:clone(args.selection),priorFieldPresent:true,
    value:clone(bound),sourceWorkId:source.workId,sourceResultRef:source.resultRef,
    ...(source.source==='evidence'?{sourceEvidenceId:source.evidenceId,sourcePointer:source.pointer}:{})};
}
export function projectRosterWorkflowSelectedInputBindingV1(args,source){
  const {stateRef,seatKey,action}=resolveRosterWorkflowNativeSelectionV1(args,source);
  return nativeSelectionInputBinding(args,{stateRef,seatKey,action},source);
}
function bindNativeSelection(args,source,options){
  try{
    const {stateRef,seatKey,action}=resolveRosterWorkflowNativeSelectionV1(args,source,options);
    return {stateRef,seatKey,action};
  }catch(error){
    // Required parameters can fail AFTER an exact parent/domain was selected.
    // Preserve that identity; it is not an executed action or legal geometry.
    if(error.resolvedSelection)error.selectionInputBinding=nativeSelectionInputBinding(args,error.resolvedSelection,source);
    throw error;
  }
}
// Parent/context identify the queried world; they are never Native query data.
// Diagnose their layer without moving values or silently selecting a world.
function spatialEnvelopeIssue(args){
  const native=args?.queryArguments;
  if(!native||typeof native!=='object'||Array.isArray(native))return null;
  const fields=['stateRef','base','contextRef','seatKey'].filter(key=>Object.hasOwn(native,key));
  if(!fields.length)return null;
  return {correctable:true,sourceContract:'roster_spatial_envelope_v2',originalQueryNotAnswered:true,
    misplacedEnvelopeFields:fields,receivedEnvelope:Object.fromEntries(fields.map(key=>[key,clone(native[key])])),
    expectedEnvelope:'outer arguments object beside queryKind',
    instruction:'The fields in misplacedEnvelopeFields identify the queried state/context/seat and belong OUTSIDE queryArguments, beside queryKind. Native fields such as unitId, anchorRegions and jointUnits stay INSIDE queryArguments. Preserve the intended complete stateRef and all Native values; remove the misplaced copies. Do not delete the intended parent and fall back to the source root, move Native fields out, or change the chosen scene. If selection supplies a current-domain parent/seat, use that exact selection and do not add competing parent fields. Host has not moved any field or selected a parent. The old root-state failure did not query your requested branch.'};
}
function typedSceneQueryContract(args,bindings=[]){
  const allowed=args.selection?['selection','queryKind','queryArguments']
    :['base','stateRef','seatKey','contextRef','queryKind','queryArguments'];
  if(Object.keys(args).some(key=>!allowed.includes(key))||typeof args.queryKind!=='string'
    ||!args.queryArguments||Array.isArray(args.queryArguments)||typeof args.queryArguments!=='object'
    ||args.selection&&(args.selection.kind!=='domain'||Object.hasOwn(args.selection,'parameters')
      ||Object.hasOwn(args.selection,'outcome')||Object.hasOwn(args.queryArguments,'domainId')
      ||!['optional_candidate',true].includes(STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1[args.queryKind]?.domain))
    ||args.selection&&bindings.some(binding=>!binding.argumentPointer.startsWith('/queryArguments/')))
    fail('ROSTER_WORKFLOW_TYPED_SCENE_QUERY_INVALID',{
      instruction:'Use {queryKind,queryArguments:{...typed Native query fields}}. Do not also supply argumentsJson. For a current-domain query add selection:{sourceEvidenceNumber OR fromStepId,kind:"domain",match OR index}; Host owns the same inspect parent/seat/domainId. Do not put parameters/outcome in this read-only selector or a competing domainId in queryArguments. Bind dynamic values inside /queryArguments/field, never over an entire JSON string.'});
  const envelopeIssue=spatialEnvelopeIssue(args);
  if(envelopeIssue)fail('ROSTER_WORKFLOW_SPATIAL_ENVELOPE_INVALID',envelopeIssue);
  if(args.selection)nativeSelectionContract({selection:{...args.selection,parameters:{}}});
  return args.queryArguments;
}
// Pure wire compatibility: one complete explicitly chosen option has the same
// meaning as a one-item selections array. Never choose/fill an option or merge
// competing fields. Preserve this projection alongside the compiled request.
function projectWorkflowArguments(step){
  const args=parse(step.argumentsJson,'ROSTER_WORKFLOW_TOOL_ARGUMENT_JSON_INVALID',stepJsonLocation(step));
  if(step.operation==='scenario'&&args&&typeof args==='object'&&!Array.isArray(args)){
    // The source contract, not model prose, owns the inner spec fields. This is
    // a lossless wire projection like spatial queryArguments below; it neither
    // supplies a kind/phase nor executes any lifecycle or geometry operation.
    const fields=describePregameScenarioInputContractV1().properties;
    const keys=Object.keys(args).filter(key=>Object.hasOwn(fields,key));
    if(keys.length){
      const outer=new Set(['stateRef','base','contextRef','seatKey']);
      const unknownFields=Object.keys(args).filter(key=>!Object.hasOwn(fields,key)&&!outer.has(key)&&key!=='spec');
      const overlaps=(a,b)=>a===b||a.startsWith(b+'/')||b.startsWith(a+'/');
      const bindingConflicts=(step.bindings??[]).filter(b=>overlaps(b.argumentPointer,'/spec')
        ||keys.some(key=>overlaps(b.argumentPointer,'/'+key))).map(b=>b.argumentPointer);
      if(Object.hasOwn(args,'spec')||unknownFields.length||bindingConflicts.length)
        fail('ROSTER_WORKFLOW_SCENARIO_ENVELOPE_AMBIGUOUS',{stepId:step.stepId,unknownFields,bindingConflicts,
          competingSpec:Object.hasOwn(args,'spec'),
          instruction:'Use one spec object containing the source-owned scenario fields. Keep stateRef/base/contextRef/seatKey outside it. Host only wraps unambiguous literal fields; it cannot choose between a spec and duplicates or rewrite a dynamic binding. Preserve the intended phase, placements and source; no scenario has executed.'});
      const normalized={...args,spec:{}};
      const projection=keys.map(key=>{normalized.spec[key]=clone(args[key]);delete normalized[key];
        return {rule:'scenario_native_envelope_v1',from:'/'+key,to:'/spec/'+key,
          original:clone(args[key]),value:clone(args[key]),choiceChanged:false};});
      return {args:normalized,projection};
    }
  }
  if(step.operation==='spatial'&&args&&typeof args==='object'&&!Array.isArray(args)){
    // Native contracts own these fields. Move literal wire representation only;
    // never choose values, a parent, aliases, or the target of a dynamic binding.
    const contract=STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1[args.queryKind]?.arguments;
    const envelope=new Set(['queryKind','queryArguments','stateRef','base','contextRef','seatKey','selection','arguments','argumentsJson']);
    const keys=[...new Set([...(Array.isArray(contract?.required)?contract.required:[]),
      ...(Array.isArray(contract?.optional)?contract.optional:[])])]
      .filter(key=>!envelope.has(key)&&Object.hasOwn(args,key));
    if(keys.length){
      const native=args.queryArguments;
      const competingEncodings=['arguments','argumentsJson'].filter(key=>Object.hasOwn(args,key));
      const invalidContainer=Object.hasOwn(args,'queryArguments')
        &&(!native||typeof native!=='object'||Array.isArray(native));
      const duplicateFields=native&&typeof native==='object'?keys.filter(key=>Object.hasOwn(native,key)):[];
      const overlaps=(a,b)=>a===b||a.startsWith(b+'/')||b.startsWith(a+'/');
      const bindingConflicts=(step.bindings??[]).filter(binding=>
        overlaps(binding.argumentPointer,'/queryKind')||keys.some(key=>
          overlaps(binding.argumentPointer,'/'+key)||overlaps(binding.argumentPointer,'/queryArguments/'+key)))
        .map(binding=>binding.argumentPointer);
      if(competingEncodings.length||invalidContainer||duplicateFields.length||bindingConflicts.length)
        fail('ROSTER_WORKFLOW_SPATIAL_ENVELOPE_AMBIGUOUS',{
          correctable:true,sourceContract:'spatial_native_envelope_v1',competingEncodings,invalidContainer,
          duplicateFields,bindingConflicts,originalQueryNotAnswered:true,
          instruction:'Use one queryArguments object with Native fields and explicit bindings at their intended destinations. Host may relocate unambiguous literal Native fields only; it never chooses between duplicate values, legacy encodings or dynamic bindings. Preserve the intended state and strategy.'});
      const normalized={...args,queryArguments:clone(native??{})};
      const projection=keys.map(key=>{
        normalized.queryArguments[key]=clone(args[key]);delete normalized[key];
        return {rule:'spatial_native_envelope_v1',from:'/'+key,to:'/queryArguments/'+key,
          original:clone(args[key]),value:clone(args[key]),choiceChanged:false};
      });
      return {args:normalized,projection};
    }
  }
  if(step.operation!=='formation_scene'||!args||typeof args!=='object'||Array.isArray(args))return {args,projection:[]};
  if(Object.hasOwn(args,'sourceEvidenceNumber')||Object.hasOwn(args,'optionIndex')){
    if(Object.hasOwn(args,'selection')||Object.hasOwn(args,'selections')
      ||(step.bindings??[]).some(b=>['/sourceEvidenceNumber','/optionIndex'].includes(b.argumentPointer)))
      fail('ROSTER_WORKFLOW_FORMATION_SELECTOR_AMBIGUOUS',{
        instruction:'Use one explicit source/option pair or one selections array, never both or bindings overriding the chosen pair.'});
    if(Number.isSafeInteger(args.sourceEvidenceNumber)&&args.sourceEvidenceNumber>0
      &&Number.isSafeInteger(args.optionIndex)&&args.optionIndex>=0){
      const selection={sourceEvidenceNumber:args.sourceEvidenceNumber,optionIndex:args.optionIndex};
      const normalized={...args,selections:[selection]};delete normalized.sourceEvidenceNumber;delete normalized.optionIndex;
      return {args:normalized,projection:[{rule:'formation_direct_selection_v1',from:'/',to:'/selections/0',
        original:clone(selection),value:clone(selection),choiceChanged:false}]};
    }
  }
  if(!Object.hasOwn(args,'selection'))return {args,projection:[]};
  if(Object.hasOwn(args,'selections')||(step.bindings??[]).some(binding=>
    binding.argumentPointer==='/selection'||binding.argumentPointer.startsWith('/selection/')))
    fail('ROSTER_WORKFLOW_FORMATION_SELECTOR_AMBIGUOUS',{
      instruction:'Use one literal selections array. Do not combine singular/plural selector fields or bind over the selected option.'});
  const selection=args.selection;
  if(!selection||typeof selection!=='object'||Array.isArray(selection))return {args,projection:[]};
  const saved=Object.hasOwn(selection,'sourceEvidenceNumber'),prior=Object.hasOwn(selection,'fromStepId');
  if(Number(saved)+Number(prior)!==1
    ||saved&&(!Number.isSafeInteger(selection.sourceEvidenceNumber)||selection.sourceEvidenceNumber<=0)
    ||prior&&!(typeof selection.fromStepId==='string'&&selection.fromStepId.trim())
    ||!Number.isSafeInteger(selection.optionIndex)||selection.optionIndex<0
    ||Object.keys(selection).some(key=>!['sourceEvidenceNumber','fromStepId','optionIndex'].includes(key)))
    return {args,projection:[]};
  const normalized={...args,selections:[clone(selection)]};delete normalized.selection;
  return {args:normalized,projection:[{rule:'formation_single_selection_v1',from:'/selection',to:'/selections',
    original:clone(selection),value:[clone(selection)],choiceChanged:false}]};
}
export function compileRosterWorkflowExperimentV1(options) {
  try{
    if(Object.hasOwn(options,'inquiryAuthorization')){
      const scope=inspectRosterTemporalMethodScopeV1({order:options.order,authorization:options.inquiryAuthorization});
      if(scope)throw Object.assign(Error(scope.code),{code:scope.code,detail:scope,dispatchOutcome:'not_dispatched'});
    }
    return compileWorkflowExperiment(options);
  }
  catch(error){
    // This compiler does not execute tools. Preserve that fact for EVERY
    // source-owned validation error, including errors thrown by input modules.
    if(!error.dispatchOutcome)error.dispatchOutcome='not_dispatched';
    if(error.code==='ROSTER_WORKFLOW_METHOD_SCOPE_REQUIRES_AUTHOR')throw error;
    const {order,namespace,priorSteps=[],retainedWork=[]}=options;
    const steps=order?.steps;
    // Never reinterpret retained, already-dispatched work. On NEW invalid
    // orders use the same pure compiler to expose independently diagnosable
    // step errors together. This is diagnostic only, not partial enqueue.
    if(!error.code||!Array.isArray(steps)||steps.length<2
      ||new Set(steps.map(s=>s.stepId)).size!==steps.length
      ||retainedWork.some(w=>steps.some(s=>w.id===`${namespace}:${s.stepId}`)))throw error;
    const stepErrors=[];
    for(const [index,step]of steps.entries()){
      try{
        compileWorkflowExperiment({...options,retainedWork:[],
          order:{...order,steps:[step],completionStepId:step.stepId},
          priorSteps:[...priorSteps,...steps.slice(0,index).map(s=>({stepId:s.stepId,workId:`${namespace}:${s.stepId}`,operation:s.operation}))]});
      }catch(issue){
        // Order-level authorization/scope failures are not independent step
        // defects. Do not multiply them or pretend whole-order coverage.
        if(issue.detail?.stepId===step.stepId
          ||['ROSTER_WORKFLOW_SPATIAL_ENVELOPE_INVALID','ROSTER_WORKFLOW_SPATIAL_ENVELOPE_AMBIGUOUS',
            'ROSTER_WORKFLOW_TYPED_SCENE_QUERY_INVALID'].includes(issue.code))
          stepErrors.push({stepId:step.stepId,operation:step.operation,code:issue.code,detail:clone(issue.detail??null)});
      }
    }
    if(stepErrors.length>1)error.detail={...(error.detail&&typeof error.detail==='object'&&!Array.isArray(error.detail)
      ?error.detail:{originalDetail:clone(error.detail??null)}),workOrderDiagnostics:{version:1,
      source:'same_executable_compiler',scope:'step_local_preflight',completeValidation:false,nativeExecuted:false,
      steps:stepErrors,
      instruction:'These independently detected step-input errors belong to the SAME unchanged work order. Correct them together against each source-owned contract, preserving the selected scene, experiment and every valid sibling. No step was dispatched or silently corrected. This is not complete geometry/Rules/dependency validation: the full corrected order still goes through the normal compiler and Native checks. Do not assume a future selector/result exists merely because its producing step is listed.'}};
    throw error;
  }
}
// A batch of read-only legs is not a shared multi-unit simulation. Keep the
// author's batch, but give each executable temporal query its ONE participant.
function independentTemporalBatchScope(order){
  const scope=order.experimentScope,participants=scope?.participantUnitIds;
  if(scope?.kind!=='route_feasibility'||!Array.isArray(participants)||participants.length<2
    ||scope.hypothesisTest||scope.comparisonBinding||new Set(participants).size!==participants.length
    ||!order.steps.every(step=>['bounded_unit_temporal','map_deployment'].includes(step.operation)))return null;
  const legs=order.steps.filter(step=>step.operation==='bounded_unit_temporal');
  if(!legs.length||legs.some(step=>[...(step.bindings??[]),...(step.guards??[])].some(b=>b.fromStepId)))return null;
  let units;try{units=legs.map(step=>JSON.parse(step.argumentsJson).unitId);}catch{return null;}
  if(units.some(id=>!participants.includes(id))||participants.some(id=>!units.includes(id)))return null;
  return {version:1,kind:'independent_single_unit_temporal_legs',participantUnitIds:clone(participants),
    jointWitness:false,sharedTemporalState:false,authorParametersChanged:false};
}
function compileWorkflowExperiment({order,scope,namespace,retainedWork=[],evidenceDirectory=[],priorSteps=[],comparisonPurpose=null,choiceContract=null,builderCandidateAuthority=null}) {
  if(!order?.orderId||!order.purpose||!order.steps?.length||!order.stopAndReturnToModelWhen)
    fail('ROSTER_WORKFLOW_EXPERIMENT_ORDER_INCOMPLETE');
  const retained=order.steps.map(step=>retainedWork.find(w=>w.id===`${namespace}:${step.stepId}`));
  if(retained.some(Boolean)){
    // Enqueue is atomic. Restore the exact compiled work (including failures)
    // before applying NEW-input contracts; repair children own corrections.
    if(retained.some((w,i)=>!w||w.role!=='roster_workflow_tool'||!rosterWorkflowBindingsMatchV1(
      w.calculationInvalidation?w.preInvalidationBindings??w.bindings:w.bindings,scope)
      ||w.inputs.request.value.operation!==order.steps[i].operation
      ||!(isDeepStrictEqual(w.inputs.request.value.args,parse(order.steps[i].argumentsJson,'ROSTER_WORKFLOW_TOOL_ARGUMENT_JSON_INVALID',stepJsonLocation(order.steps[i])))
        ||isDeepStrictEqual(w.inputs.request.value.args,projectWorkflowArguments(order.steps[i]).args)
        ||builderCandidateAuthority&&[true,false].some(nativeUnits=>{
          // The old author-unit envelope is retained evidence only. New jobs
          // always use the shared Native projection below.
          try{return isDeepStrictEqual(w.inputs.request.value.args,projectWorkflowArguments(
            projectRosterBuilderInquiryStepV1(order.steps[i],builderCandidateAuthority,{nativeUnits})).args);}
          catch{return false;}
        }))))
      fail('ROSTER_WORKFLOW_RETAINED_ORDER_MISMATCH',namespace);
    // Restoring the original order is NOT reinstating its obsolete result.
    // Keep superseded status and invalidated bindings; the dedicated recovery
    // jobs alone can obtain new facts using the current implementation.
    return clone(retained);
  }
  if(builderCandidateAuthority)order={...order,steps:order.steps.map(step=>projectRosterBuilderInquiryStepV1(step,builderCandidateAuthority))};
  if(choiceContract){
    let completed=false;
    for(const step of order.steps){
      const args=parse(step.argumentsJson,'ROSTER_WORKFLOW_TOOL_ARGUMENT_JSON_INVALID',stepJsonLocation(step));
      const delegatedKind=rosterWorkflowDelegatedStepKindV1(choiceContract,{operation:step.operation,args});
      const target=delegatedKind==='completion',operationAllowed=delegatedKind!=='outside';
      const issue=!operationAllowed?'operation_not_delegated'
        :completed&&(choiceContract.operation!=='probability'||step.operation==='formation_scene')
          ?'work_after_delegated_completion':null;
      if(issue)
        fail('ROSTER_WORKFLOW_CHOICE_SCOPE_EXCEEDED',{stepId:step.stepId,operation:step.operation,
          issue,operationAllowed,
          choiceContract,instruction:choiceContract.instruction+
            ' Correct only the undelegated operation/order. No submitted step was silently dropped or dispatched. A preferred output step does not authorize downstream work or complete the caller; Host determines completion from the matching actual operation and Native result.'});
      if(step.operation==='project_scene'&&choiceContract.preparationScope?.kind==='selected_candidate_scene_projection'
        &&(!Array.isArray(args.changedUnits)||args.changedUnits.length!==0||args.unlistedUnits!=='off_table'
          ||(step.bindings??[]).some(binding=>/^\/(?:changedUnits|unlistedUnits)(?:\/|$)/u.test(binding.argumentPointer))))
        fail('ROSTER_WORKFLOW_PROJECTION_REPAIR_ADAPTATION_NOT_DELEGATED',{
          stepId:step.stepId,instruction:choiceContract.preparationInstruction});
      if(target)completed=true;
    }
  }
  validateRosterExperimentScopeV1(order.experimentScope);
  const temporalBatchScope=independentTemporalBatchScope(order);
  const comparisonBinding=resolveRosterComparisonBindingV1({order,scope,evidenceDirectory,comparisonPurpose,
    delegatedComparison:choiceContract?.delegatedComparison});
  const ids=new Set(),work=[];
  const stateProducers=priorSteps.filter(step=>privateBranchOperations.has(step.operation)||step.operation==='candidate_context');
  function resolveSource(reference){
    const number=reference.fromEvidenceNumber??0;
    if(number!==0){
      if(reference.fromStepId)fail('ROSTER_WORKFLOW_TOOL_BINDING_SOURCE_AMBIGUOUS');
      const saved=Number.isSafeInteger(number)&&number>0
        ?evidenceDirectory.find((entry,index)=>(entry.number??index+1)===number):null;
      // An unresolved observation did not invent its input state. Its immutable
      // server-produced state reference remains usable even though its measured
      // output is unknown. Do not make the model rebuild a successful setup just
      // to recover that same identity. Only the WHOLE input reference is allowed:
      // no unknown witness, damage, scalar hash, or other inferred result.
      const inputStatePointer=reference.resultPointer?.replace(/^\/value(?=\/|$)/u,'');
      if(saved?.id.startsWith('tool-attempt:')&&saved.kind==='tool_receipt'
        &&saved.availability==='available'&&rosterWorkflowBindingsMatchV1(saved.bindings,scope)
        &&['/stateRef','/submittedArguments/stateRef'].includes(inputStatePointer))
        return {source:'evidence',id:saved.id,pointer:inputStatePointer};
      // This is the immutable Native menu published at a normal choice point.
      // Its original tool may still await that choice, so binding through the
      // work would create a dependency cycle or later read a different result.
      // Bind the actual saved receipt, not a guessed work ID or model summary.
      if(saved?.id.startsWith('choice-source:')&&saved.kind==='tool_receipt'
        &&rosterWorkflowBindingsMatchV1(saved.bindings,scope)){
        return {source:'evidence',id:saved.id,
          pointer:rosterWorkflowReceiptPointerV1(reference.resultPointer).replace(/^\/value(?=\/|$)/u,'')};
      }
      currentToolEvidence(evidenceDirectory,number,scope);
      // A menu view selects its corresponding full immutable Native receipt,
      // not the producer's mutable status/result. A view alone is not proof.
      const source=resolveRosterSavedNativeSourceV1({directory:evidenceDirectory,number,scope,
        resultPointer:reference.resultPointer});
      if(!source)fail('ROSTER_WORKFLOW_TOOL_EVIDENCE_BINDING_INVALID',{
        evidenceNumber:number,instruction:'The selected saved source needs its available, current full Native receipt. A display projection cannot replace missing evidence.'});
      return source.input;
    }
    if(ids.has(reference.fromStepId))return {source:'work',id:`${namespace}:${reference.fromStepId}`,pointer:rosterWorkflowReceiptPointerV1(reference.resultPointer)};
    const external=priorSteps.filter(step=>step.stepId===reference.fromStepId);
    if(external.length>1)fail('ROSTER_WORKFLOW_TOOL_BINDING_AMBIGUOUS',{fromStepId:reference.fromStepId,matches:external});
    if(external.length===1)return {source:'work',id:external[0].workId,pointer:rosterWorkflowReceiptPointerV1(reference.resultPointer)};
    fail('ROSTER_WORKFLOW_TOOL_BINDING_NOT_PRIOR_STEP',{
      fromStepId:reference.fromStepId,instruction:'fromStepId names a prior step in this order or a uniquely named prior step in another order of this SAME response. For an already completed prior response, use its exact current fromEvidenceNumber and empty fromStepId; do not reconstruct a successful source.'});
  }
  for(const step of order.steps){
    if(!step.stepId||ids.has(step.stepId)||!Object.hasOwn(operations,step.operation))fail('ROSTER_WORKFLOW_EXPERIMENT_STEP_INVALID',step.stepId);
    let {args,projection:argumentProjection}=projectWorkflowArguments(step);
    const preparation=choiceContract?.preparationScope;
    const temporalCompletion=step.operation===choiceContract?.operation
      &&['single_unit_temporal_round_one','joint_temporal_round_one'].includes(preparation?.kind)
      &&preparation.originalTemporalArguments!==undefined;
    if(temporalCompletion){
      if(Object.keys(args).length&&!isDeepStrictEqual(args,preparation.originalTemporalArguments))
        fail('ROSTER_TEMPORAL_REPAIR_ORIGINAL_ARGUMENTS_REQUIRED',{stepId:step.stepId,
          instruction:'Use an empty argumentsJson object. The Host carries the original schedule and conditions.'});
      const bindings=step.bindings??[];
      const binding=bindings[0];
      if(bindings.length!==1||binding.argumentPointer!=='/stateRef'
        ||rosterWorkflowReceiptPointerV1(binding.resultPointer)!=='/value/stateRef')
        fail('ROSTER_TEMPORAL_REPAIR_PREPARED_SOURCE_REQUIRED',{stepId:step.stepId,
          instruction:'Bind the complete /stateRef from the successful round-one preparation.'});
      args=clone(preparation.originalTemporalArguments);
    }
    if(!args||Array.isArray(args)||typeof args!=='object'||Object.hasOwn(args,'queryId')||Object.hasOwn(args,'branchId'))
      fail('ROSTER_WORKFLOW_TOOL_ARGUMENTS_INVALID',step.stepId);
    const sceneBinding=bindRosterComparisonSceneArgumentsV1({operation:step.operation,args,binding:comparisonBinding,stepId:step.stepId,
      boundArgumentPointers:(step.bindings??[]).map(b=>b.argumentPointer)});
    args=sceneBinding.args;
    if(sceneBinding.projection)argumentProjection.push(sceneBinding.projection);
    if(step.operation==='compare_observations'){
      validateRosterMeasuredComparisonV1(args);
      if(step.bindings?.length)fail('ROSTER_MEASUREMENT_ARGUMENT_INVALID',{
        instruction:'Select immutable source receipts with left/right using fromEvidenceNumber OR fromStepId. Do not bind scalar arguments. weaponName may be omitted when the source contains exactly one matching attacker/target observation; multiple matching rows remain ambiguous. Measured values are Host-owned.'});
    }
    if(step.operation==='summarize_native_outcomes'){
      validateRosterNativePopulationV1(args);
      if(step.bindings?.length)fail('ROSTER_NATIVE_POPULATION_ARGUMENT_INVALID',{
        instruction:'Use sources fromEvidenceNumber/fromStepId; values, dice weights and terminal outcomes cannot be bound or authored.'});
    }
    if(step.operation==='inspect')assertPregameInspectInputV1(args,{allowWorkflowReferences:true});
    if(step.operation==='bounded_arrival_control')try{
      assertPregameBoundedArrivalInputV1(args,{allowWorkflowReferences:true,
        boundArguments:(step.bindings??[]).map(binding=>binding.argumentPointer)
          .filter(pointer=>/^\/[A-Za-z][A-Za-z0-9_]*$/u.test(pointer)).map(pointer=>pointer.slice(1))});
    }catch(error){error.detail={...error.detail,stepId:step.stepId};throw error;}
    if(step.operation==='probability')assertPregameProbabilityInputV1(args,{allowWorkflowReferences:true,
      boundArguments:(step.bindings??[]).map(binding=>binding.argumentPointer)
        .filter(pointer=>/^\/[A-Za-z][A-Za-z0-9_]*$/u.test(pointer)).map(pointer=>pointer.slice(1))});
    if(step.operation==='bounded_joint_temporal'){
      assertJointTemporalInputV1(args,{allowWorkflowReferences:true,boundArgumentPointers:(step.bindings??[]).map(b=>b.argumentPointer)});
      const actual=args.participants.map(p=>p.unitId).sort(),declared=[...order.experimentScope.participantUnitIds].sort();
      // The same bounded route schedule may answer a route question or a
      // fixed tactical-scene question. Category never expands Native actions,
      // round horizon, participants or the declared no-intervention assumption.
      if(!['route_feasibility','fixed_scenario_tactic'].includes(order.experimentScope.kind))
        fail('ROSTER_WORKFLOW_JOINT_SCOPE_KIND_INVALID',{stepId:step.stepId,
          actualKind:order.experimentScope.kind,allowedKinds:['route_feasibility','fixed_scenario_tactic'],
          instruction:'This operation only verifies a bounded route or fixed-scene schedule. Scope is owned by the work order; do not try to repair its kind by editing step parameters. Return the scope choice to its owner if the intended experiment is different.'});
      if(!isDeepStrictEqual(actual,declared))
        fail('ROSTER_WORKFLOW_JOINT_PARTICIPANTS_MISMATCH',{stepId:step.stepId,actual,declared});
    }
    if(step.operation==='bounded_unit_temporal'){
      const boundArgumentPointers=step.bindings.map(b=>b.argumentPointer);
      const bindingProblem=inspectSingleUnitTemporalBindingsV1(step);
      if(bindingProblem)fail('ROSTER_WORKFLOW_TEMPORAL_BINDING_ARGUMENT_INVALID',bindingProblem);
      assertSingleUnitTemporalInput(args,{allowWorkflowReferences:true,boundArgumentPointers});
      if(order.experimentScope.kind!=='route_feasibility'
        ||!temporalBatchScope&&(order.experimentScope.participantUnitIds.length!==1
          ||order.experimentScope.participantUnitIds[0]!==args.unitId))
        fail('ROSTER_WORKFLOW_TEMPORAL_SINGLE_PARTICIPANT_REQUIRED',{
          stepId:step.stepId,unitId:args.unitId,participantUnitIds:order.experimentScope.participantUnitIds,
          instruction:'Each temporal request searches exactly one unit. A multi-unit batch is supported only as independent read-only temporal legs (plus map_deployment), all from explicit saved/root sources, with every declared participant represented. Do not chain temporal results, insert Native actions, or claim a joint arrival/control witness.'});
    }
    if(step.operation==='threat_exchange')normalizePregameThreatExchangeInputV1(args,{allowWorkflowReferences:true,
      boundArguments:(step.bindings??[]).map(binding=>binding.argumentPointer)
        .filter(pointer=>/^\/[A-Za-z][A-Za-z0-9_]*$/u.test(pointer)).map(pointer=>pointer.slice(1))});
    if(step.operation==='compare_scenes')assertPregameSceneComparisonInputV1(args,{allowWorkflowReferences:true,
      boundArguments:(step.bindings??[]).map(binding=>binding.argumentPointer)
        .filter(pointer=>/^\/[A-Za-z][A-Za-z0-9_]*$/u.test(pointer)).map(pointer=>pointer.slice(1))});
    const missingArguments=inspectPregameRequiredArgumentsV1({operation:step.operation,args,
      boundArguments:(step.bindings??[]).map(binding=>binding.argumentPointer)
        .filter(pointer=>/^\/[A-Za-z][A-Za-z0-9_]*$/u.test(pointer)).map(pointer=>pointer.slice(1))});
    if(missingArguments.length)fail('ROSTER_WORKFLOW_TOOL_ARGUMENT_CONTRACT',{
      stepId:step.stepId,operation:step.operation,missingArguments,
      contract:clone(workflowInputContracts()[step.operation]),
      instruction:'No step of this new work order has executed. Supply the source-owned required arguments or their explicit value dependencies. If the choice requires a future inspect/menu, submit only that executable preparation prefix with completionStepId empty and choose after its actual result. A prose stopAndReturnToModelWhen promise is not a parameter or a pause before an incomplete queued call. Do not guess future choices, fabricate values or replay already completed sources.'});
    if(step.operation==='scenario'&&!step.bindings.some(binding=>binding.argumentPointer==='/spec'
      ||binding.argumentPointer.startsWith('/spec/'))){
      // The source validator is shared with execution. Dynamic spec values are
      // checked only after binding; a prose promise is never a deferred value.
      try{assertPregameScenarioIntentV1(args.spec);}
      catch(error){error.detail={...(error.detail&&typeof error.detail==='object'?error.detail:{}),
        stepId:step.stepId};throw error;}
      assertRosterLocalScenarioPlacementsV1({scope:order.experimentScope,args});
    }
    const spatialContract=step.operation==='spatial'&&STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1[args.queryKind];
    const typedQuery=step.operation==='spatial'&&(Object.hasOwn(args,'queryArguments')||Object.hasOwn(args,'selection'));
    if(typedQuery)typedSceneQueryContract(args,step.bindings);
    let nativeArgs=spatialContract?(typedQuery?args.queryArguments:args.argumentsJson
      ?parse(args.argumentsJson,'ROSTER_WORKFLOW_TOOL_ARGUMENT_JSON_INVALID',{
        stepId:step.stepId,operation:step.operation,queryKind:args.queryKind,
        layer:'spatial_arguments_json',parameter:'step.argumentsJson',decodedPointer:'/argumentsJson',
        preferredEncoding:'queryArguments_object',nativeInputContract:clone(spatialContract.arguments),
        outerStateFields:['stateRef','base','contextRef','seatKey']}) :args.arguments??{}):null;
    if(step.operation==='spatial'&&args.queryKind==='within_and_wholly_within')
      nativeArgs=physicalRangeInput(args.queryKind,nativeArgs,{requireExplicit:true,stepId:step.stepId}).input;
    if(step.operation==='spatial'&&args.queryKind==='ranged_activation_probability'){
      const boundArgumentPointers=(step.bindings??[]).flatMap(({argumentPointer:p})=>
        ['/argumentsJson','/arguments','/queryArguments','/queryKind'].includes(p)?['/steps']
          :['/queryArguments/','/arguments/'].some(prefix=>p.startsWith(prefix))?[p.slice(p.indexOf('/',1))]:[]);
      try{nativeArgs=normalizeRangedActivationQueryArgumentsV1(nativeArgs);assertRangedActivationSequenceV1(nativeArgs?.steps,{boundArgumentPointers});}
      catch(error){error.detail={...error.detail,stepId:step.stepId,nativeExecuted:false};throw error;}
    }
    if(args.queryKind==='space.solve_static_formation'&&nativeArgs)
      nativeArgs=projectRosterJointFormationEnvelopeV1(nativeArgs).input;
    const boundActionReference=step.bindings.some(binding=>[
      '/argumentsJson','/queryArguments','/queryArguments/domainId','/queryArguments/candidateId',
      '/queryArguments/proposal','/queryArguments/proposal/domainId',
    ].includes(binding.argumentPointer));
    const actionReference=spatialContract?.domain===true&&!args.selection&&!boundActionReference
      ?inspectStarcraftTmgCurrentActionReferenceV1(nativeArgs):null;
    if(actionReference?.issue)fail('ROSTER_WORKFLOW_CURRENT_ACTION_REFERENCE_INVALID',{
      stepId:step.stepId,queryKind:args.queryKind,...actionReference.issue,
      contract:spatialContract.domainReferenceContract,
      instruction:'No Rules query executed. Use the exact current-domain selection and parameters, or choose a tool that measures the intended conditional threat. Unit filters are not action references.'});
    if(spatialContract?.arguments?.required){
      const missingFields=spatialContract.arguments.required.filter(key=>
        !(key==='domainId'&&(typedQuery&&args.selection||boundActionReference||actionReference?.domainId))
        &&!Object.hasOwn(nativeArgs??{},key));
      if(missingFields.length)fail('ROSTER_WORKFLOW_SPATIAL_ARGUMENT_CONTRACT',{
        stepId:step.stepId,queryKind:args.queryKind,missingFields,contract:clone(spatialContract),
        expectedEnvelope:'queryArguments',misplacedTopLevelFields:missingFields.filter(key=>Object.hasOwn(args,key)),
        argumentExample:{queryKind:args.queryKind,queryArguments:Object.fromEntries(missingFields.map(key=>
          [key,Object.hasOwn(args,key)?clone(args[key]):'<supply from the actual Native contract>']))},
        instruction:'Correct only this invalid work order. The OUTER step.argumentsJson encodes {stateRef,queryKind,queryArguments:{...Native fields}}. Keep stateRef/base/contextRef/seatKey OUTSIDE queryArguments; these identify the queried world, not Native query data. Put unitId, anchorRegions, jointUnits and other Native query inputs INSIDE queryArguments, not beside queryKind. misplacedTopLevelFields identifies values already supplied at the wrong level: preserve their intended values rather than inventing a new choice. Do not mix queryArguments with the legacy inner argumentsJson string. Follow the exact Native field shapes in contract; an example containing only missing keys is not the complete query. Unit-level queries require their own unitId. No query has executed and Host has not moved or filled any field.'});
    }
    const mapIssue=inspectPregameMapWorkflowArgumentsV1(step.operation,args,{boundArguments:(step.bindings??[])
      .filter(b=>/^\/[A-Za-z][A-Za-z0-9_]*$/u.test(b.argumentPointer)).map(b=>b.argumentPointer.slice(1))});
    if(mapIssue){
        fail('ROSTER_WORKFLOW_MAP_ARGUMENT_CONTRACT',{stepId:step.stepId,operation:step.operation,
          ...mapIssue,
          instruction:'Map is already bound. Read exact selectors from mapQueries. baseId is a physical model footprint, NOT a deployment zone; map_deployment does not return a baseId. Alternatively use the originally intended unitId plus targetId. A route witness does not establish a round of arrival. Declared parameter bindings are preserved but their source pointers must actually exist; do not invent values or substitute another target.'});
    }
    const inputs={request:{source:'literal',value:{operation:step.operation,args,publicReason:step.publicReason,
      ...(builderCandidateAuthority?{builderCandidateAuthority:clone(builderCandidateAuthority)}:{}),
      ...(argumentProjection.length?{argumentProjection}:{}),
      orderId:order.orderId,purpose:order.purpose,scenarioAssumptions:clone(order.scenarioAssumptions),
      experimentScope:temporalBatchScope&&step.operation==='bounded_unit_temporal'
        ?{...clone(order.experimentScope),participantUnitIds:[args.unitId]}:clone(order.experimentScope),experimentId:namespace,
      ...(temporalBatchScope&&step.operation==='bounded_unit_temporal'?{temporalBatchScope:clone(temporalBatchScope)}:{}),
       ...(comparisonBinding?{comparisonBinding:bindRosterComparisonStepV1(comparisonBinding,step,args)}:{}),
      stopAndReturnToModelWhen:order.stopAndReturnToModelWhen,bindings:[],guards:[],resultGuards:[]}}};
    if(step.operation==='native_action'&&Object.hasOwn(args,'selection')){
      const selection=nativeSelectionContract(args,step.bindings);
      const source=resolveSource({fromStepId:selection.fromStepId??'',
        fromEvidenceNumber:selection.sourceEvidenceNumber??0,resultPointer:''});
      inputs.nativeActionSource={...source,pointer:source.source==='work'?'/value':''};
      inputs.request.value.nativeActionSource='nativeActionSource';
      if(selection.fromStepId)inputs.request.value.modelChoiceSources=[{name:'nativeActionSource',
        menuPointer:selection.kind==='formation'?'/receipt/queryReceipt/result/formationOptions':'/receipt/actionSpace',
        ...(selection.kind==='formation'?{choiceKind:'native_formation'}:{})}];
    }
    if(typedQuery&&args.selection){
      const source=resolveSource({fromStepId:args.selection.fromStepId??'',
        fromEvidenceNumber:args.selection.sourceEvidenceNumber??0,resultPointer:''});
      inputs.queryActionSource={...source,pointer:source.source==='work'?'/value':''};
      inputs.request.value.queryActionSource='queryActionSource';
      if(args.selection.fromStepId)inputs.request.value.modelChoiceSources=[{
        name:'queryActionSource',menuPointer:'/receipt/actionSpace',choiceKind:'action_domain'}];
    }
    if(step.operation==='formation_scene'&&(!Array.isArray(args.selections)||!args.selections.length))
      fail('ROSTER_WORKFLOW_FORMATION_SOURCE_SELECTION_INVALID',{reason:'nonempty_selection_array_required',
        stepId:step.stepId,commandInterface:clone(formationSelectorCommandInterface),
        receivedArguments:clone(args),receivedBindingTargets:(step.bindings??[]).map(b=>b.argumentPointer),
        instruction:formationSelectorCommandInterface.instruction});
    if(step.operation==='formation_scene'){
      const issues=[];
      for(const [index,selection]of args.selections.entries()){
        if(!selection||typeof selection!=='object'||Array.isArray(selection)){
          issues.push({code:'selection_object_required',index});continue;
        }
        const saved=Object.hasOwn(selection,'sourceEvidenceNumber'),prior=Object.hasOwn(selection,'fromStepId');
        if(Number(saved)+Number(prior)!==1)issues.push({code:'exactly_one_selector_source_required',index});
        if(prior&&!(typeof selection.fromStepId==='string'&&selection.fromStepId.trim()))
          issues.push({code:'empty_prior_step_selector',index});
        if(saved&&(!Number.isSafeInteger(selection.sourceEvidenceNumber)||selection.sourceEvidenceNumber<=0))
          issues.push({code:'positive_saved_source_required',index});
        if(!Number.isSafeInteger(selection.optionIndex)||selection.optionIndex<0)
          issues.push({code:'explicit_zero_based_option_required',index});
        if(Object.keys(selection).some(key=>!['sourceEvidenceNumber','fromStepId','optionIndex'].includes(key)))
          issues.push({code:'unsupported_selector_fields',index});
      }
      const selectionBindings=formationSelectorBindings(step);
      if(selectionBindings.length)issues.push({code:'selection_is_not_a_field_binding',argumentPointers:selectionBindings.map(b=>b.argumentPointer)});
      if(issues.length)fail('ROSTER_WORKFLOW_FORMATION_SELECTOR_CONTRACT',{
        sourceContract:'static_formation_selector_v2',stepId:step.stepId,issues,
        commandInterface:clone(formationSelectorCommandInterface),
        receivedSelections:clone(args.selections),
        savedSourceHints:[...new Set(selectionBindings.map(b=>b.fromEvidenceNumber).filter(n=>Number.isSafeInteger(n)&&n>0))]
          .map(number=>({evidenceNumber:number,title:evidenceDirectory.find((e,i)=>(e.number??i+1)===number)?.title??null})),
        instruction:'This is a FORMATION SELECTOR, not a generic argument binding. For an already saved Native solver receipt put {sourceEvidenceNumber: the actual receipt number, optionIndex: your chosen zero-based index} DIRECTLY in selections. Omit fromStepId entirely; an empty string is not a saved-source selector. For a preceding solver in THIS response use {fromStepId: its nonempty step name, optionIndex: your explicit index} and omit sourceEvidenceNumber. Remove all bindings targeting /selections or its children: optionIndex is your choice, NOT a field to fetch from the receipt. Host resolves the exact selected option and asks for required source confirmation. Other bindings keep their own normal contract. savedSourceHints only identifies sources YOU already referenced; it does not select or approve one. Do not rerun the solver, invent a receipt field, copy coordinates or change the parent state to hide a mismatch.'});
    }
    if(step.operation==='formation_scene')for(const [index,selection] of args.selections.entries()){
      if(!selection||Array.isArray(selection)||typeof selection!=='object')
        fail('ROSTER_WORKFLOW_FORMATION_SOURCE_SELECTION_INVALID',{reason:'selection_object_required'});
      if(Object.hasOwn(selection,'sourceEvidenceNumber')){
        if(Object.keys(selection).some(key=>!['sourceEvidenceNumber','optionIndex'].includes(key))
          ||!Number.isSafeInteger(selection.sourceEvidenceNumber)||selection.sourceEvidenceNumber<=0
          ||!Number.isSafeInteger(selection.optionIndex)||selection.optionIndex<0)
          fail('ROSTER_WORKFLOW_FORMATION_SOURCE_SELECTION_INVALID',{
            reason:selection.sourceEvidenceNumber===0?'zero_is_not_a_saved_evidence_number':'invalid_saved_formation_selector',
            selection:clone(selection),
            instruction:'sourceEvidenceNumber must be the actual positive saved tool number. 0 is NOT a placeholder for a future receipt. For an earlier solver in THIS response use {fromStepId:"exact earlier step name",optionIndex}; for completed earlier responses read their saved number from the assigned references. Do not bind a nonexistent /receipt/evidenceNumber or rerun successful solvers.'});
        currentToolEvidence(evidenceDirectory,selection.sourceEvidenceNumber,scope);
      }
      if(!Object.hasOwn(selection,'fromStepId'))continue;
      if(Object.keys(selection).some(key=>!['fromStepId','optionIndex'].includes(key))
        ||!Number.isSafeInteger(selection.optionIndex)||selection.optionIndex<0)
        fail('ROSTER_WORKFLOW_FORMATION_STEP_SELECTION_INVALID',{stepId:step.stepId,selection});
      const name=`formationSource${index}`;
      // The source is a dependency edge, not a nonexistent receipt.evidenceNumber.
      // Retain the model's original selection; resolve identities only at execution.
      inputs[name]={...resolveSource({fromStepId:selection.fromStepId,fromEvidenceNumber:0,resultPointer:''}),pointer:'/value'};
      inputs.request.value.formationSelectionSources??=[];
      inputs.request.value.formationSelectionSources.push({index,name});
      (inputs.request.value.modelChoiceSources??=[]).push({name,menuPointer:'/receipt/queryReceipt/result'});
    }
    // Step order is NOT a dependency edge. Once this method creates a new
    // world, a later consumer must explicitly choose that world or the root.
    // Selectors already own exact saved parents; never guess "the last scene".
    const ownsSelectedParent=!!args.selection||step.operation==='formation_scene';
    const selectsState=['stateRef','base','contextRef'].some(key=>Object.hasOwn(args,key))
      ||(step.bindings??[]).some(b=>['/stateRef','/base','/base/branchStateHash','/contextRef'].includes(b.argumentPointer)
        ||isRosterWorkflowTypedStateAliasBindingV1(b));
    if(branchCapable.has(step.operation)&&step.operation!=='compare_scenes'&&stateProducers.length
      &&!ownsSelectedParent&&!selectsState)
      fail('ROSTER_WORKFLOW_SCENE_SELECTION_REQUIRED',{stepId:step.stepId,operation:step.operation,
        earlierStateProducers:clone(stateProducers),sourceContract:'explicit_experiment_state_v1',
        instruction:'A preceding step creates a candidate/scene, but this operation selects no state. Ordering steps in an array does not make it query that scene. Explicitly bind the intended predecessor whole /stateRef to /stateRef; this creates the scheduling dependency. For an intentionally independent root observation explicitly use base:{kind:"source"} or its exact stateRef. Host must not choose a predecessor or silently use the root. Reuse completed sources; do not rerun them. No step of this new order has executed.'});
    const targetPointers=new Set();
    for(const [index,binding] of (step.bindings||[]).entries()){
      const source=resolveSource(binding);
      if(targetPointers.has(binding.argumentPointer))fail('ROSTER_WORKFLOW_TOOL_BINDING_DUPLICATE',binding.argumentPointer);
      targetPointers.add(binding.argumentPointer);
      try{if(!optionalBinding(step.operation,binding.argumentPointer,binding))exact(args,binding.argumentPointer);}catch(error){
        fail('ROSTER_WORKFLOW_BINDING_TARGET_MISSING',{stepId:step.stepId,argumentPointer:binding.argumentPointer,
          instruction:'This is an unsupported or missing nested destination in argumentsJson, not a missing source receipt. Declared top-level fields in the source-owned argumentsShape may be bound without a redundant null literal. For nested fields supply the supported enclosing structure. Do not invent a new tool argument.'});
      }
      const name=`binding${index}`;
      inputs[name]=source;
      inputs.request.value.bindings.push({name,pointer:binding.argumentPointer});
      if((step.operation==='native_action'||step.operation==='probability'&&binding.argumentPointer==='/domainId')
        &&binding.fromStepId){
        const choiceName=`choiceSource${index}`;
        inputs[choiceName]={...source,pointer:'/value'};
        (inputs.request.value.modelChoiceSources??=[]).push({name:choiceName,
          menuPointer:step.operation==='probability'?'/receipt/actionSpace':'/stateRef',
          ...(step.operation==='probability'?{choiceKind:'action_domain'}:{})});
      }
    }
    if(step.operation==='scenario'&&['single_unit_temporal_round_one','joint_temporal_round_one'].includes(choiceContract?.preparationScope?.kind)){
      const expected=choiceContract.preparationScope.sourceStateRef;
      const binding=(step.bindings??[]).find(b=>b.argumentPointer==='/stateRef');
      if((step.bindings??[]).some(b=>b.argumentPointer!=='/stateRef')
        ||Object.keys(args).some(key=>!['spec','stateRef'].includes(key))
        ||!binding&&(choiceContract.preparationScope.requiresSavedSourceBinding===true||!isDeepStrictEqual(args.stateRef,expected)))
        fail('ROSTER_TEMPORAL_INITIALIZATION_SOURCE_REQUIRED',{stepId:step.stepId});
      inputs.temporalInitializationSource=binding?resolveSource(binding):{source:'literal',value:clone(args.stateRef)};
      inputs.request.value.guards.push({name:'temporalInitializationSource',expected:clone(expected)});
    }
    if(temporalCompletion){
      const source=resolveSource(step.bindings[0]);
      inputs.temporalPreparationReceipt={...source,pointer:source.source==='work'?'/value':''};
      inputs.request.value.temporalPreparationCompletion={sourceStateRef:clone(preparation.sourceStateRef),
        spec:clone(preparation.workflowArguments.spec)};
    }
    if(step.operation==='compare_observations')for(const arm of ['left','right']){
      const source=resolveSource({...args[arm],resultPointer:''});
      inputs[`observation_${arm}`]={...source,pointer:source.source==='work'?'/value':''};
    }
    if(step.operation==='summarize_native_outcomes')for(const [index,reference]of args.sources.entries()){
      const source=resolveSource({...reference,resultPointer:''});
      inputs[`population_${index}`]={...source,pointer:source.source==='work'?'/value':''};
    }
    for(const [index,guard] of (step.guards||[]).entries()){
      if(guard.fromStepId===step.stepId&&!(guard.fromEvidenceNumber??0)){
        inputs.request.value.resultGuards.push({pointer:rosterWorkflowReceiptPointerV1(guard.resultPointer),
          expected:parse(guard.equalsJson,'ROSTER_WORKFLOW_TOOL_GUARD_JSON_INVALID')});continue;
      }
      const name=`guard${index}`;
      inputs[name]=resolveSource(guard);
      inputs.request.value.guards.push({name,expected:parse(guard.equalsJson,'ROSTER_WORKFLOW_TOOL_GUARD_JSON_INVALID')});
    }
    work.push({id:`${namespace}:${step.stepId}`,role:'roster_workflow_tool',bindings:clone(scope),inputs,
      // Native branch creation shares the immutable laboratory branch registry.
      // A future action still needs explicit arguments; exclusivity is not consent.
      ...(['scenario','native_action','formation_scene','project_scene'].includes(step.operation)
        ||step.operation==='candidate_context'&&args.comparisonScene?{exclusiveKey:`${namespace}:private-native`}:{})});
    ids.add(step.stepId);
    if(privateBranchOperations.has(step.operation)||step.operation==='candidate_context')
      stateProducers.push({stepId:step.stepId,workId:`${namespace}:${step.stepId}`,operation:step.operation});
  }
  if(order.completionStepId&&!ids.has(order.completionStepId))
    fail('ROSTER_WORKFLOW_REPAIR_COMPLETION_STEP_MISSING',order.completionStepId);
  return work;
}

function workflowChanceInput(repair){
  return {...repair,chanceInputContractVersion:2,
    workflowOutcomePaths:['/action/outcome','/selection/outcome'],
    outcomeInputContract:describePregameNativeChanceOutcomeInputV1(repair.nativeChanceContract),
    workflowOutcomeInstruction:'For the workflow native_action operation put the outcome INSIDE action.outcome (explicit action) or selection.outcome (selected saved menu entry). Never put outcome at the request root. outcome.chanceReveals is the ARRAY in outcomeInputContract, not the chance descriptor. Preserve the exact parent, selected action, parameters and explicit conditional dice assumption; correct only its transport. No successful action is replayed and no random outcome is selected by Host.'};
}
export function projectRosterWorkflowToolRepairV1(value){
  if(['bounded_unit_temporal','bounded_joint_temporal'].includes(value?.operation)
    &&value.status==='returned_to_model'&&value.code==='ROSTER_READ_QUERY_RETURNED_UNFINISHED'
    &&value.executionStatus==='interrupted_without_final_receipt'&&!value.receipt
    &&value.queryRepair?.sourceContract==='roster_interrupted_read_method_v1')return clone(value.queryRepair);
  const environment=projectPregameSceneProjectionFailureV1(value);if(environment)return environment;
  if(value.operation==='scenario'&&value.nativeSuccess===false
    &&value.code==='CURRENT_PRODUCT_FIRST_ROUND_SETUP_REQUIRED'){
    const spec=value.submittedArguments?.spec??value.request?.spec;
    try{assertPregameStartOfRoundScenarioInputV1(spec);}
    catch(error){
      if(error.code===value.code&&error.queryRepair)return clone(error.queryRepair);
      throw error;
    }
    // Valid parameters alone do not establish that the original source was
    // eligible. Preserve that unresolved failure instead of inventing a repair.
  }
  if(['roster_participant_configuration_v1','roster_comparison_participants_v2'].includes(value.queryRepair?.sourceContract))
    return clone(value.queryRepair);
  // Saved Native failures use the SAME source-owned input validator as a fresh
  // call. A malformed supplied dice object must not become an unschedulable
  // execution fault. Valid-shape Rules/runtime denials keep their original lane.
  if(value.operation==='native_action'&&value.nativeSuccess===false&&value.request?.argumentsJson!==undefined){
    try{parsePregameNativeActionInputV1(value.request);}
    catch(error){if(error.queryRepair)return error.code==='PREGAME_LAB_NATIVE_ACTION_OUTCOME_INVALID'
      ?workflowChanceInput(clone(error.queryRepair)):clone(error.queryRepair);throw error;}
  }
  if(value.operation==='native_action'&&value.code==='ROSTER_WORKFLOW_NATIVE_ACTION_INPUT_INVALID')
    return workflowChanceInput({correctable:true,sourceContract:'roster_workflow_native_action_input_v1',
      originalQueryNotAnswered:true,nativeExecuted:false,
      inputContract:clone(workflowInputContracts().native_action),
      instruction:'Correct this action ENVELOPE, not the intended action. Prefer native_action {selection:{sourceEvidenceNumber OR fromStepId,kind:"finite" OR "domain",match:{actionType,...} OR index,parameters if domain}} from the exact saved inspect. Host copies that selected menu entry, parent and seat. Do not put kind/candidateId beside stateRef or invent actionKey from candidateId. Legacy explicit input is {stateRef OR base,seatKey,action:{actionKey,...}} and still requires exact inspected data. Do not mix selection with a second parent/action. No Native action executed; preserve the original intention and successful predecessor.'});
  if(value.operation==='formation_scene'&&value.code==='ROSTER_WORKFLOW_FORMATION_SELECTION_INPUT_INVALID'
    &&value.detail?.reason==='explicit_parent_required'
    &&value.request?.base?.schema==='roster_workflow_state_ref_v1'){
    try{
      const normalized=normalizeRosterWorkflowStateReferenceArgumentsV1(value.request);
      return {...formationSelectionRepair,repairContractVersion:3,
        inputProblem:{reason:'whole_state_reference_in_legacy_base',field:'base',
          stateRef:normalized.args.stateRef},
        instruction:'The complete typed state reference was bound to legacy /base. The shared executor now resolves it through the SAME stateRef validator. Keep the exact saved parent and formation selection; bind the whole reference to /stateRef. Do not rerun the successful solver, invent positions, or change the intended scene. No formation was applied by the failed request.'};
    }catch(error){return error.queryRepair?clone(error.queryRepair):null;}
  }
  const probabilityScene=projectPregameProbabilityRepairContractV1(value);
  if(probabilityScene)return probabilityScene;
  if(value.operation==='project_scene'&&value.nativeSuccess===false
    &&value.code==='ROSTER_WORKFLOW_SCENE_PROJECTION_INPUT_INVALID'){
    try{assertWorkflowSceneProjectionInput(value.request??{});}
    catch(error){if(error.queryRepair)return clone(error.queryRepair);}
  }
  if(value.operation==='spatial'){
    const envelopeIssue=spatialEnvelopeIssue(value.submittedArguments);
    if(envelopeIssue)return {...envelopeIssue,reasonCode:value.code??value.receipt?.unknownReason??null};
  }
  const candidateFailure=projectRosterCandidateFailureV1(value);
  if(candidateFailure)return candidateFailure;
  // Unknown envelope/edit errors still use the current addressing contract.
  // A Native legality outcome above is not an addressing failure. Both fresh
  // execution and saved-role repair must use this single classification seam.
  if(value.operation==='candidate_context'&&value.queryRepair)return {...clone(value.queryRepair),
    inputContract:clone(ROSTER_CANDIDATE_CONTEXT_INPUT_V1),
    instruction:'Keep the actual Native rejection and original question. Use candidateEdits for explicit changes to the CURRENT draft without retyping untouched units/upgrades. Or use complete candidateInput. Same-army cost/slot checks still apply. comparisonScene explicitly projects the chosen existing scene; a new candidate source alone does not preserve phase or positions. No Host-chosen legal replacement or automatic strategy approval.'};
  if(value.reason==='guard_mismatch'&&value.executed===false&&value.mismatches?.length)
    return {correctable:true,controlReturn:true,sourceContract:'workflow_failed_prerequisite_control_v1',
      originalQueryNotAnswered:true,guardedOperationExecuted:false,hostRewritesGuard:false,
      mismatches:clone(value.mismatches),
      instruction:'The model-declared prerequisite did not match its actual source; this is a CONTROL RETURN, not proof that the Native query/Rules is broken. Read originalWork.guards and their actual source inputs. A workflow execution status and a Native receipt verdict are different namespaces: a completed query can return a legal or illegal verdict. If the pointer/expected value misstates the ORIGINAL intent, explicitly correct it with source-backed reasons. If the premise genuinely fails, return a scoped negative/blocked/strategy_required method conclusion so the parent can decide the next method. Never change expected to actual merely to force a pass, remove a meaningful prerequisite, invent success, or replay a successful source operation. The guarded query has NOT executed.'};
  if(value.operation==='builder_branches'&&value.code==='ROSTER_BUDGET_BRANCH_BASELINE_NOT_RULES_LEGAL')
    return value.queryRepair?.correctable?clone(value.queryRepair):projectRosterBudgetBranchBaselineRepairV1({
      candidateInput:value.request?.candidateInput??value.submittedArguments?.candidateInput,
      baselineAudit:value.detail?.baselineAudit??null});
  if(value.operation==='builder_audit'&&value.receipt?.schema===ARMY_BUILDER_REJECTION_RECEIPT_SCHEMA
    &&value.receipt.status==='invalid_candidate'&&value.receipt.rejectionKind==='candidate_addressing'
    &&value.receipt.rulesAuthority===null&&value.receipt.rulesErrorCode===null)
    return {correctable:true,sourceContract:'native_builder_candidate_addressing_v1',originalQueryNotAnswered:true,
      reasonCode:value.receipt.portErrorCode,nativeRejection:clone(value.receipt),
      candidateInputContract:clone(ARMY_BUILDER_CANDIDATE_INPUT_CONTRACT_V1),
      failureTargets:[{requestPointer:'/candidateInput',receivedValue:clone(value.request?.candidateInput??value.submittedArguments?.candidateInput),
        expectedSchema:clone(ARMY_BUILDER_CANDIDATE_INPUT_CONTRACT_V1),detail:clone(value.receipt.portErrorDetail)}],
      instruction:'The port rejected candidate ADDRESSING before the Rules audit. Correct the concrete fields using candidateInputContract (including explicit unitInstanceId and upgrades objects/[]); do not guess another profile ID to fix an omitted field, invent totals, or treat this as a legal/illegal army verdict. No unit/card/upgrade is selected or changed by Host.'};
  if(value.operation==='formation_scene'&&value.code==='ROSTER_WORKFLOW_FORMATION_SELECTION_INPUT_INVALID'
    &&value.detail?.evidenceNumber===0)
    return {correctable:true,sourceContract:'roster_workflow_explicit_formation_source_v1',originalQueryNotAnswered:true,
      instruction:'The source number0 is not a saved receipt and cannot resolve. Use the actual saved sourceEvidenceNumber from the assigned earlier solver receipts; same-response earlier solvers use fromStepId, never a numeric placeholder or nonexistent evidenceNumber receipt field. Keep your chosen units/options and read the original successful solver outputs. Correct the reference only; do not rerun them or fabricate coordinates.'};
  if(value.operation==='formation_scene'&&value.code==='PREGAME_LAB_FORMATION_SELECTION_SOURCE_MISMATCH')
    return projectPregameFormationParentRepairV1({detail:value.detail,requestedBase:value.request?.base??null});
  if(value.operation==='formation_scene'&&value.code==='ROSTER_WORKFLOW_FORMATION_SELECTION_INPUT_INVALID'
    &&value.detail==='source is not a static-formation receipt')
    return {correctable:true,sourceContract:'roster_workflow_native_vs_static_formation_v1',originalQueryNotAnswered:true,
      instruction:'The selected source is not a static placement receipt. Read its actual queryKind. A Native space.solve_formation/legal_formation_options candidate is executed by native_action {selection:{sourceEvidenceNumber,kind:"formation",index OR match:{formationOptionId}}}, which preserves its canonicalParameters and exact parent. Do NOT first apply formation_scene then deploy again. formation_scene accepts only solve_static_formation geometry. Correct the experimental METHOD for the original question; after obtaining actual facts, a local conclude can return that method to the question owner without pretending a different operation was the original Native receipt.'};
  if(value.operation==='spatial'&&value.receipt?.unknownReason==='SCENE_QUERY_ARGUMENTS_JSON_INVALID')
    return {correctable:true,sourceContract:'roster_workflow_typed_scene_query_v1',originalQueryNotAnswered:true,
      reasonCode:value.receipt.unknownReason,
      instruction:'The nested JSON request was invalid, not a negative game result. Prefer spatial {queryKind,queryArguments:{...}}. For a current-domain query use selection:{sourceEvidenceNumber OR fromStepId,kind:"domain",match:{actionType,pieceId,...}} and omit domainId from queryArguments. Host binds the exact inspect parent/seat/domain and serializes once. If using explicit field dependencies, bind /queryArguments/field, not the entire /argumentsJson string. Preserve the intended query and experimental choices; do not replay successful siblings.'};
  if(value.nativeSuccess===false&&['PREGAME_LAB_BRANCH_UNKNOWN','PREGAME_LAB_BASE_INVALID'].includes(value.code)){
    return {correctable:true,sourceContract:'roster_workflow_state_ref_v1',originalQueryNotAnswered:true,
      reasonCode:value.code,requestedBase:clone(value.request?.base??null),contextRef:value.contextRef??null,
      instruction:'The selected state reference failed before a factual query completed. Use the complete /stateRef from an actually saved inspect/scenario/candidate_context result, binding it whole to /stateRef. Verify that it is the intended candidate and phase; a root source is not an Assault branch merely because its hash can now resolve. Candidate creation proves its new source, not a combat scene. Read existing successful scene receipts instead of rebuilding them. Preserve the original comparison question, do not substitute an undeployed setup query for a requested combat query or replay completed actions.'};
  }
  if(value.operation==='formation_scene'&&value.code==='ROSTER_WORKFLOW_FORMATION_SELECTION_INPUT_INVALID'
    &&value.nativeSuccess===false){
    const problem=formationSelectionInputProblem(value.request??{});
    return {...clone(formationSelectionRepair),...(problem?{inputProblem:problem}:{}),originalFailureUnchanged:true};
  }
  const sourceRepair=value.queryRepair??value.receipt?.queryRepair;
  if(sourceRepair?.sourceContract==='roster_comparison_scene_requirements_v1'&&sourceRepair.controlReturn===true)
    return clone(sourceRepair);
  if(sourceRepair?.correctable===true){
    if(value.operation==='native_action'&&['PREGAME_LAB_NATIVE_ACTION_CHANCE_OUTCOME_REQUIRED',
      'PREGAME_LAB_NATIVE_ACTION_OUTCOME_INVALID'].includes(value.code??sourceRepair.reasonCode))
      return workflowChanceInput(clone(sourceRepair));
    const repair=projectPregameGeometryRepairContractV1(sourceRepair,value)??structuredClone(sourceRepair);
    if(repair.actualSource&&repair.requestedPointer){
      const keys=parseRosterTeachEvidencePathV1(repair.requestedPointer)?.keys??[];
      let current=repair.actualSource;const prefix=[];
      for(const key of keys){
        if(!current||typeof current!=='object'||!Object.hasOwn(current,key))break;
        current=current[key];prefix.push(key);
      }
      repair.sourcePreview={pointer:prefix.map(k=>'/'+String(k).replaceAll('~','~0').replaceAll('/','~1')).join(''),
        value:current,exactUntruncated:true};
      repair.sourceEvidenceId=`tool:${repair.sourceWorkId}`;
      repair.sourceReadInstruction='This is the exact nearest existing parent of the missing pointer, not a summary. The complete immutable source remains available through sourceEvidenceId. Read other sections only if needed; do not treat this preview as the complete source.';
      delete repair.actualSource;
    }
    return repair;
  }
  const scene=value.receipt;
  if(scene?.unknownReason==='PREGAME_LAB_HYPOTHETICAL_FORMATION_NOT_FOUND'
    &&scene.sceneScope?.kind==='hypothetical_branch'&&scene.baseStateHash
    &&Array.isArray(scene.hypotheticalPlacementAssessment?.units)){
    return projectPregameGeometryRepairContractV1({correctable:true,sourceContract:'pregame_hypothetical_geometry_repair_v1',
      originalQueryNotAnswered:true,reasonCode:scene.unknownReason,baseStateHash:scene.baseStateHash,
      placementAssessment:clone(scene.hypotheticalPlacementAssessment),
      currentInputContract:clone(STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1['space.solve_static_formation']),
    },value);
  }
  const native=value.receipt?.queryReceipt;
  if(native?.mayRepairSameChoice!==true||!native.repairContext)return projectRosterUnresolvedQueryReturnV1(value);
  return {correctable:true,sourceContract:'native_spatial_same_choice_repair_v1',originalQueryNotAnswered:true,
    reasonCode:native.reason,repairContext:structuredClone(native.repairContext),
    currentInputContract:structuredClone(STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1[value.request?.queryKind]??null),
    instruction:'Native explicitly permits correcting this same query. Keep the original branch, question and intended choice. Use currentInputContract for callable input shape; older saved repair text is preserved as history. Unknown is not zero or a positive result. Do not re-run successful siblings or select a different strategy to manufacture success.'};
}
function normalizeBuilderAuditOutcome(result){
  if(result?.value?.operation!=='builder_audit')return result;
  const repair=projectRosterWorkflowToolRepairV1(result.value);
  if(!repair)return result;
  return {...result,continuation:true,value:{...result.value,status:'returned_to_model',
    reason:'builder_candidate_addressing',code:result.value.receipt.portErrorCode,
    nativeSuccess:false,nativeRulesExecuted:false,queryRepair:repair}};
}
export async function projectRosterWorkflowComparisonSceneFailureV1({required,args,inputBindings,readArtifact}){
  if(!required)return null;
  const binding=inputBindings.find(input=>input.argumentPointer==='/stateRef');
  const source=binding?.sourceResultRef?await readArtifact(binding.sourceResultRef):null;
  const value=source?.value,submitted=value?.submittedArguments??value?.request;
  if(source?.kind==='tool_receipt'&&value.operation==='project_scene'&&value.status==='completed'
    &&value.receipt?.resultStatus==='ok'&&value.contextRef===required.targetContextRef
    &&isDeepStrictEqual(projectRosterWorkflowStateReferenceV1(value),args.stateRef)
    &&isDeepStrictEqual(submitted?.referenceStateRef,required.referenceStateRef)
    &&Array.isArray(submitted?.changedUnits)&&submitted.changedUnits.length===0
    &&submitted.unlistedUnits==='off_table')return null;
  return {code:'ROSTER_WORKFLOW_COMPARISON_SCENE_REQUIRED',
    reason:'A candidate setup identity is not the selected reference combat scene; preserve the comparison instead of dropping its geometry.',
    queryRepair:{correctable:true,sourceContract:'roster_workflow_state_ref_v1',originalQueryNotAnswered:true,
      requiredSceneProjection:clone(required),
      instruction:'Use project_scene with the original saved referenceStateRef and the original candidate stateRef, changedUnits:[], unlistedUnits:"off_table". Then bind the successful projected /stateRef directly to this original query. The source setup state or another scene cannot replace the selected comparison. Projection is a prerequisite, not a measurement or a roster edit.'}};
}
export function createRosterWorkflowLaboratoryExecutorV1({laboratory,store,builderPort,getCandidateInput,createCandidateLaboratory,onTool=async()=>{},shouldStopReadQuery}) {
  const descriptor=laboratory.labDescriptor();
  const comparisonScenes=createRosterComparisonSceneGateV1();
  const queryFlights=createRosterQueryObservationFlightsV1();
  const contexts=createRosterWorkflowCandidateContextsV1({laboratory,builderPort,getCandidateInput,createCandidateLaboratory,
    projectCandidateScene:({laboratory:target,args})=>projectScene(args,target)});
  async function projectScene(args,target){
    assertWorkflowSceneProjectionInput(args);
    const reference=contexts.get(args.referenceStateRef?.contextRef);
    const resolved=resolveRosterWorkflowStateReferenceV1({stateRef:args.referenceStateRef},reference.labDescriptor());
    return target.runProjectedScenarioBranch({base:args.base,branchId:args.branchId,
      referenceLayout:reference.captureSceneLayout({base:resolved.base}),
      changedUnits:args.changedUnits,unlistedUnits:args.unlistedUnits,terrainPolicy:args.terrainPolicy,executionScope:args.executionScope});
  }
  function compareScenes(args,target){
    assertPregameSceneComparisonInputV1(args);
    const reference=contexts.get(args.referenceStateRef.contextRef);
    const resolved=resolveRosterWorkflowStateReferenceV1({stateRef:args.referenceStateRef},reference.labDescriptor());
    return target.compareSceneConditions({queryId:args.queryId,base:args.base,
      referenceSnapshot:reference.captureComparisonSnapshot({base:resolved.base})});
  }
  // Condition metadata belongs to the same immutable measured pair, not to a
  // new strategic experiment. Reuse the explicit tool's Native implementation.
  // Cache only complete successful observations; concurrent role readers share
  // the read but never share a mutable receipt or retain a transient failure.
  const sceneConditionReads=new Map();
  async function compareSavedSceneConditions({referenceStateRef,targetStateRef}){
    const pair=clone({referenceStateRef,targetStateRef}),key=hash(pair);
    if(!sceneConditionReads.has(key)){
      const reading=Promise.resolve().then(()=>{
        const target=contexts.get(pair.targetStateRef?.contextRef);
        const resolved=resolveRosterWorkflowStateReferenceV1({stateRef:pair.targetStateRef},target.labDescriptor());
        return compareScenes({queryId:'measurement-conditions:'+key,base:resolved.base,
          referenceStateRef:pair.referenceStateRef},target);
      });
      sceneConditionReads.set(key,reading);
      reading.then(receipt=>{
        if(receipt?.resultStatus!=='ok'||receipt.comparison?.complete!==true)sceneConditionReads.delete(key);
      },()=>sceneConditionReads.delete(key));
    }
    return clone(await sceneConditionReads.get(key));
  }
  const mathContracts=describePregameMathInputContractsV1();
  const sourceInputContracts=workflowInputContracts();
  const builderMethods=builderPort&&getCandidateInput?{
    evaluateRosterCandidate:async args=>builderPort.evaluateRosterCandidate(args.candidateInput??await getCandidateInput()),
    enumerateArmyBuildingChoices:async args=>{const c=await getCandidateInput();return builderPort.enumerateArmyBuildingChoices({
      scaleId:c.scaleId,factionRecordKey:c.factionRecordKey,mineralBudget:c.mineralBudget,...args});},
    queryRosterBudgetBranches:async args=>queryRosterBudgetBranchesV1({...args,armyBuilderPort:builderPort,
      candidateInput:args.candidateInput??await getCandidateInput()}),
  }:{};
  async function readSavedFormationSelections(args,contextRef){
    const reject=detail=>{throw Object.assign(Error('ROSTER_WORKFLOW_FORMATION_SELECTION_INPUT_INVALID'),{
      code:'ROSTER_WORKFLOW_FORMATION_SELECTION_INPUT_INVALID',detail,queryRepair:clone(formationSelectionRepair)});};
    if(!Array.isArray(args.selections)||!args.selections.length)reject({reason:'nonempty_selections_required'});
    const state=await store.load(),selections=[];
    for(const selected of args.selections){
      if(!selected||typeof selected!=='object')reject('selection must be an object');
      const typed=Object.hasOwn(selected,'sourceEvidenceNumber')||Object.hasOwn(selected,'optionIndex');
      let sourceWorkId;
      if(typed){
        if(Object.keys(selected).some(k=>!['sourceEvidenceNumber','sourceWorkId','optionIndex'].includes(k))
          ||Object.hasOwn(selected,'sourceEvidenceNumber')&&Object.hasOwn(selected,'sourceWorkId')
          ||!Number.isSafeInteger(selected.optionIndex)||selected.optionIndex<0)
          reject({reason:'selection_requires_source_evidence_and_nonnegative_option_index',selection:selected});
        try{sourceWorkId=selected.sourceWorkId??currentToolEvidence(state.evidence,selected.sourceEvidenceNumber,state.scope).workId;}
        catch(error){reject(error.detail??error.message);}
      }else{
        // Retained clients/replies keep their explicit legacy meaning. New
        // model-facing descriptors advertise only the source-bound choice.
        if(Object.keys(selected).some(k=>!['sourceWorkId','formationOptionId'].includes(k))
          ||!selected.sourceWorkId||!selected.formationOptionId)reject('selection requires sourceEvidenceNumber and optionIndex');
        sourceWorkId=selected.sourceWorkId;
      }
      const work=state.work.find(w=>w.id===sourceWorkId);
      if(work?.role!=='roster_workflow_tool'||work.status!=='evidence_ready'
        ||work.bindings.source!==descriptor.sourceStateHash||!work.resultRef)reject('source work unavailable or belongs to a different draft');
      const source=(await store.get(work.resultRef)).value;
      if(contextRef!==undefined&&(source.contextRef??null)!==contextRef)reject('source belongs to a different candidate context');
      if(source.operation!=='spatial'||source.receipt?.queryKind!=='space.solve_static_formation')reject('source is not a static-formation receipt');
      const options=source.receipt.queryReceipt?.result?.formationOptions??[];
      if(typed&&!options[selected.optionIndex])reject({reason:'selected_option_not_present',
        sourceEvidenceNumber:selected.sourceEvidenceNumber,optionIndex:selected.optionIndex,availableOptionCount:options.length,
        availableOptions:options.map(projectRosterStaticFormationOptionV1),
        misses:source.receipt.queryReceipt?.result?.misses??[]});
      const formationOptionId=typed?options[selected.optionIndex].formationOptionId:selected.formationOptionId;
      if(!options.some(option=>option.formationOptionId===formationOptionId))reject('selected option is not in the saved source');
      selections.push({receipt:source.receipt,formationOptionId,
        stateRef:projectRosterWorkflowStateReferenceV1(source),sourceWorkId,sourceResultRef:work.resultRef});
    }
    return selections;
  }
  async function applySavedFormationSelection(args,selectedLaboratory,contextRef){
    const problem=formationSelectionInputProblem(args);if(problem)throw Object.assign(Error('ROSTER_WORKFLOW_FORMATION_SELECTION_INPUT_INVALID'),{
      code:'ROSTER_WORKFLOW_FORMATION_SELECTION_INPUT_INVALID',detail:problem,queryRepair:clone(formationSelectionRepair)});
    const sources=await readSavedFormationSelections(args,contextRef);
    const selections=sources.map(({receipt,formationOptionId})=>({receipt,formationOptionId}));
    return selectedLaboratory.runFormationSelectionBranch({base:args.base,branchId:args.branchId,selections,
      executionScope:args.executionScope});
  }
  const methodFor=(operation,selectedLaboratory=laboratory,contextRef=null)=>operation==='compare_observations'
    ?compareRosterMeasuredObservationsV1:operation==='summarize_native_outcomes'?summarizeRosterNativePopulationV1:operation==='candidate_context'
    ? (contexts.available?contexts.create:null):operation==='formation_scene'
    ? (typeof selectedLaboratory.runFormationSelectionBranch==='function'?args=>applySavedFormationSelection(args,selectedLaboratory,contextRef):null)
    :operation==='project_scene'?args=>projectScene(args,selectedLaboratory)
    :operation==='compare_scenes'?(typeof selectedLaboratory.compareSceneConditions==='function'
      &&typeof selectedLaboratory.captureComparisonSnapshot==='function'?args=>compareScenes(args,selectedLaboratory):null)
    :operation.startsWith('builder_')?builderMethods[operations[operation]]
    :typeof selectedLaboratory[operations[operation]]==='function'?selectedLaboratory[operations[operation]].bind(selectedLaboratory):null;
  async function restoreValue(value){
    if(value.operation==='candidate_context'&&value.receipt?.resultStatus==='ok')return contexts.restore(value.receipt);
    if(value.operation==='candidate_context'&&value.detail?.candidateReceipt)return contexts.restore(value.detail.candidateReceipt);
    if(!['scenario','native_action','formation_scene','project_scene'].includes(value.operation)||!value.receipt?.branchStateHash)return;
    const {receipt,request}=value;
    const selectedLaboratory=contexts.get(value.contextRef);
    if(value.operation==='project_scene')await selectedLaboratory.restoreProjectedScenarioBranch({receipt,base:request.base});
    else if(value.operation==='formation_scene')await selectedLaboratory.restoreFormationSelectionBranch({receipt,base:request.base});
    else if(receipt.branchKind==='native_action')await selectedLaboratory.restoreNativeActionBranch({receipt,base:request.base});
    else await selectedLaboratory.restoreHypotheticalBranch({receipt,spec:request.spec,base:request.base});
  }
  async function restoreCompleted(assignment,control){
    const operation=clone(control.operationState),ref=operation.completedRef;
    const result=normalizeBuilderAuditOutcome(await store.get(ref));
    const selected=assignment.inputs.request.value,errors=[];
    if(result?.value?.operation!==selected.operation)errors.push({field:'operation',
      expected:selected.operation,actual:result?.value?.operation??null});
    if(result?.kind==='tool_receipt'){
      const selectedDescriptor=contexts.get(result.value.contextRef).labDescriptor();
      errors.push(...rosterToolReplyCommunicationErrorsV1({receipt:result.value.receipt,
        descriptor:selectedDescriptor,args:result.value.request??selected.args}));
    }
    await quarantineRosterCommunicationV1({errors,operation,replyRef:ref,
      requestRef:operation.pending?.requestRef??null,store,control,lane:'saved_tool'});
    annotateComparisonScene(result,selected);
    await restoreValue(result.value);
    qualifyComparisonScene(result,selected,{restoring:true});return result;
  }
  // A shared round-one preparation opens the native start menu. Single-arm
  // geometry and measurement still require their own verified scene.
  function isSharedRoundOnePreparation(selected,value){
    const binding=selected.comparisonBinding,receipt=value?.receipt,spec=value?.request?.spec;
    return binding?.arm==='shared'&&binding.stage==='prerequisite'&&selected.operation==='scenario'
      &&value?.operation==='scenario'&&spec?.phase==='start_of_round'&&spec.preservePositions===true
      &&receipt?.resultStatus==='ok'&&receipt.branchKind==='hypothetical_geometry'
      &&receipt.branchStateRegisteredForQueries===true&&receipt.rulesLifecycleTransitionsApplied===0
      &&receipt.hypotheticalActivation?.phase==='start_of_round'
      &&receipt.hypotheticalActivation.positionsPreserved===true;
  }
  function qualifyComparisonScene(result,selected,{entry=null,restoring=false}={}){
    const binding=selected.comparisonBinding,value=result.value,receipt=value?.receipt;
    if(!binding||!receipt)return;
    if(isSharedRoundOnePreparation(selected,value))return;
    const selectedLaboratory=contexts.get(value.contextRef);
    if(['scenario','formation_scene','project_scene'].includes(selected.operation)&&receipt.branchStateHash){
      let assessment;
      try{assessment=comparisonScenes.constructed({binding,laboratory:selectedLaboratory,
        base:{kind:'branch',branchStateHash:receipt.branchStateHash},
        parentBase:receipt.parentStateHash===receipt.sourceStateHash?{kind:'source'}:{kind:'branch',branchStateHash:receipt.parentStateHash},
        contextRef:value.contextRef});}
      catch(error){assessment={status:'not_ready',code:error.code??error.message,detail:error.detail??null,strategyComparisonProven:false};}
      value.comparisonSceneReadiness=assessment;
      if(assessment.status==='ready')value.comparisonSceneEntry=comparisonScenes.enter({binding,laboratory:selectedLaboratory,
        base:{kind:'branch',branchStateHash:receipt.branchStateHash},contextRef:value.contextRef});
      else{
        result.continuation=true;value.status='returned_to_model';value.reason='comparison_constructed_scene_not_ready';
        delete value.comparisonSceneEntry;
        result.conditions.push('Constructed/restored Native state retained, but its actual entry geometry failed the declared conditions. Do not replay this completed construction or call it a comparison result.');
      }
    }else if(selected.operation==='native_action'&&receipt.branchStateHash){
      const verified=restoring?comparisonScenes.restoreNative({binding,entry:value.comparisonSceneEntry,
        receipt,laboratory:selectedLaboratory,contextRef:value.contextRef})
        :comparisonScenes.advance({binding,entry,receipt,contextRef:value.contextRef});
      if(verified&&!restoring)value.comparisonSceneEntry=verified;
      if(!verified){
        delete value.comparisonSceneEntry;result.continuation=true;value.status='returned_to_model';
        value.reason='comparison_native_entry_lineage_unverified';
        result.conditions.push('Native action receipt retained; the declared experimental entry is not proven. No action replay or outcome relabelling.');
      }
    }else if(entry)value.comparisonSceneEntry=clone(entry);
  }
  function annotateComparisonScene(result,selected){
    const assessment=assessRosterComparisonSceneResultV1({operation:selected.operation,
      queryKind:result.value?.request?.queryKind??selected.args?.queryKind,binding:selected.comparisonBinding,receipt:result.value?.receipt});
    if(!assessment)return;
    result.value.comparisonSceneAssessment=assessment;
    if(assessment.status!=='conditions_witnessed'){
      result.continuation=true;result.value.status='returned_to_model';
      result.value.reason=assessment.status==='no_witness'?'comparison_scene_no_witness':'comparison_scene_condition_mismatch';
      result.conditions.push('Native receipt preserved, but this preparation has no valid condition witness. No strategy result, refutation or impossible-scene claim is granted.');
    }
  }
  return {
    compareSavedSceneConditions,
    async recoverSharedRoundOnePreparation({selected,result,sourceResultRef}){
      const value=result.value;
      if(result.kind!=='tool_receipt'||result.continuation!==true
        ||value?.status!=='returned_to_model'||value.reason!=='comparison_constructed_scene_not_ready'
        ||value.comparisonSceneReadiness?.code!=='ROSTER_COMPARISON_SCENE_SHARED_CONDITIONS_DIFFER'
        ||value.comparisonSceneReadiness.detail?.reason!=='this_physical_operation_requires_one_arm;cross_arm_result_aggregation_is_separate'
        ||!isSharedRoundOnePreparation(selected,value))return null;
      const stateRef=projectRosterWorkflowStateReferenceV1(value);
      if(!stateRef||!isDeepStrictEqual(stateRef,value.stateRef))return null;
      await restoreValue(value);
      const recovered=clone(result);
      delete recovered.continuation;
      delete recovered.value.reason;
      delete recovered.value.comparisonSceneReadiness;
      recovered.value.status='completed';
      recovered.conditions=recovered.conditions.filter(text=>!text.startsWith('Constructed/restored Native state retained, but its actual entry geometry'));
      recovered.resolution={sourceResultRef,originalFailurePreserved:true,toolReexecuted:false,
        comparisonWitnessGranted:false,reason:'native_shared_round_one_preparation'};
      return recovered;
    },
    // Read-only preflight for cold recovery, using the exact execution binder.
    // This validates transport, never Native legality or an experiment result.
    validateBindings:(selected,inputs)=>resolveBoundArguments(selected,inputs),
    projectChoice:projectChoiceSources,
    projectRepair(value){
      // This source-owned transport rejection precedes context/Native input
      // validation. Its exact rejected wire is intentionally NOT a Native base.
      // Preserve the originating repair instead of probing a lower layer with
      // invalid arguments (which would throw before the repair can be queued).
      if(value.executed===false&&value.nativeSuccess===false
        &&value.dispatchOutcome==='not_dispatched'
        &&value.queryRepair?.correctable===true
        &&value.queryRepair.sourceContract==='roster_workflow_state_ref_v1')
        return clone(value.queryRepair);
      let selectedLaboratory;
      try{selectedLaboratory=contexts.get(value.contextRef);}catch(error){return error.queryRepair;}
      // Reclassify saved rejected INPUTS with the same source validator used
      // for new execution. Never replay Native or rewrite the old failure.
      if(value.operation==='scenario'&&value.nativeSuccess===false&&selectedLaboratory.inspectScenarioInput){
        const checked=selectedLaboratory.inspectScenarioInput(value.request??{});
        if(!checked.valid)return checked.queryRepair;
      }
      if(value.receipt?.resultStatus==='unknown'&&selectedLaboratory.inspectQueryPrerequisites
        &&value.receipt.sourceStateHash===selectedLaboratory.labDescriptor().sourceStateHash){
        const prerequisite=selectedLaboratory.inspectQueryPrerequisites({base:{kind:'branch',branchStateHash:value.receipt.baseStateHash},
          queryKind:value.receipt.queryKind??value.request?.queryKind});
        if(prerequisite?.unknownReason===value.receipt.unknownReason)return prerequisite.queryRepair;
      }
      return projectRosterWorkflowToolRepairV1(value);
    },
    participantSource:()=>laboratory.readParticipantConfigurations?.()??null,
    descriptor:()=>({schema:'roster_workflow_tools_v1',laboratory:descriptor,
      ...(laboratory.opponentKnowledge?.()?{opponentKnowledge:laboratory.opponentKnowledge()}:{}),
      ...(laboratory.describeComparisonInterventions?{nativeInterventions:laboratory.describeComparisonInterventions()}:{}),
      experimentScopeContract:{schema:clone(ROSTER_EXPERIMENT_SCOPE_SCHEMA_V1),
        policy:'Local army/Plan decision tests only: firepower, routes, resource/rule checks, roster comparisons or a fixed tactical scene. No complete match/multi-round army rehearsal. Ordinary native_action successors cannot cross the current round. The dedicated bounded_unit_temporal searches one specified unit; bounded_joint_temporal accepts route_feasibility or fixed_scenario_tactic and verifies an explicit finite participant/action schedule on shared Native state through at most round two. The joint tool can also verify a declared two-sided spatial schedule to Assault readiness; only named units take scheduled spatial actions. It measures qualification at the exact checkpoint without scoring. The separate single-side scoring checkpoint reports awards on its witnessed branch only. Neither tool simulates combat or a whole match, proves earliest arrival or guarantees a real outcome. Route/schedule arithmetic alone is not an arrival proof. Scenario experience is separate from live-room memory and cannot auto-promote Skills.'},
      ...(laboratory.describeMapQueries?{mapQueries:laboratory.describeMapQueries()}:{}),
      operations:Object.entries(operations).filter(([operation])=>typeof methodFor(operation)==='function')
        .map(([operation,method])=>({operation,method,scope:['scenario','native_action','formation_scene','project_scene'].includes(operation)?'private_clone_only':'read_only',
          proofScope:rosterToolProofScopeV1(operation),
          ...(contextCapable(operation)?{contextSelection:'Optional outer contextRef returned by candidate_context; omit for the current formal draft. Pass the SAME contextRef on every query/scene/action for that alternative, independently of base.branchStateHash.'}:{}),
          ...(branchCapable.has(operation)?{stateReferenceBinding:{preferredTarget:'/stateRef',sourcePointer:'/stateRef',
            legacyTypedTarget:'/branchIdRef',
            instruction:'For this workflow bind the COMPLETE saved /stateRef to /stateRef. Old Native branchIdRef prose is not a scene name: the exact whole typed value is accepted as a compatibility alias only, through the SAME resolver. Strings/partial hashes/conflicting state fields never select the initial scene. Compilation preserves the source binding; execution validates the resolved identity before Native.'}}:{}),
          ...(sourceInputContracts[operation]?clone(sourceInputContracts[operation]):{}),
          ...(operation==='compare_observations'?describeRosterMeasuredComparisonV1():{}),
          ...(operation==='summarize_native_outcomes'?describeRosterNativePopulationV1():{}),
          ...(PREGAME_MAP_WORKFLOW_CONTRACTS_V1[operation]?{argumentsContract:clone(PREGAME_MAP_WORKFLOW_CONTRACTS_V1[operation]),inputSchema:describePregameMapParameterSchemaV1(operation)}:{}),
          ...(operation==='reference_rosters'?{inputSchema:clone(ROSTER_REFERENCE_ARMY_PARAMETER_SCHEMA_V1),argumentsShape:{sideKey:'optional player1|player2; omit for both'},
            purpose:'Read the exact frozen source army recipes: faction, tactical cards, unit/composition and upgrade names. Includes selected own draft and reference opponent. Not hidden live-enemy truth. Use this for full opponent composition, NOT roster_route.'}:{}),
          ...(operation==='inspect'?{argumentsShape:{base:'optional {kind:branch,branchStateHash}; omit for immutable source',seatKey:'optional player1|player2'},
            reusePolicy:'inspect returns the complete menu for one immutable state. If that exact state was already inspected, use the ordinary evidence read operation on its saved /receipt/actionSpace/parameterDomains or the option readPointer in actionEligibility. Reading a deploy parameter domain neither selects nor executes deployment and needs NO second inspect. Missing body delivery is an evidence-read task, not another Native query. Inspect again only for a genuinely different state or seat.'}:{}),
          ...(operation==='candidate_context'?{semanticParameterSchemas:['input','delta'].flatMap(mode=>[false,true].map(projected=>({mode,projected,parameters:describeRosterCandidateContextParameterSchemaV1(mode,projected)}))),argumentsShape:{
            opponentCandidateInput:ROSTER_CANDIDATE_CONTEXT_INPUT_V1.opponentCandidateInput,
            candidateInput:ROSTER_CANDIDATE_CONTEXT_INPUT_V1.candidateInput,
            candidateEdits:clone(ROSTER_CANDIDATE_CONTEXT_INPUT_V1.candidateEdits),
            comparisonScene:ROSTER_CANDIDATE_CONTEXT_INPUT_V1.comparisonScene},
            result:ROSTER_CANDIDATE_CONTEXT_INPUT_V1.result,
            scope:'private_candidate_and_explicit_projection_only'}:{}),
          ...(operation==='scenario'?{argumentsShape:{spec:'the exact scenarioConstruction spec object, without outer kind/toolRequest wrapper',
            base:'optional {kind:branch,branchStateHash}',seatKey:'optional player1|player2'},
            nativeActionSelection:'Use native_action operation for explicit actions, not this geometry constructor.'}:{}),
          ...(operation==='native_action'?{argumentsShape:{
            selection:'PREFERRED entire args: {selection:{sourceEvidenceNumber,kind:"finite"|"domain",match:{actionType:"exact action",pieceId:"exact unit ID"},parameters?,outcome?}}. For finite, match may also be the exact nonempty actionType string; Host wraps it without guessing or ranking. Object match compares exact primitive fields in parameterDomains[] or finiteActions[].action; exactly one must match. Add observed identity fields to disambiguate. This preserves intended unit/action without counting array positions. Alternatively replace match with zero-based index. Domain requires parameters; finite forbids parameters. Replace sourceEvidenceNumber with fromStepId for an earlier inspect in this response (normal choice point). No additional parent/seat/stateRef/action or bindings.',
            base:'LEGACY {kind:branch,branchStateHash} from the inspected parent',seatKey:'LEGACY player1|player2',
             action:'LEGACY typed {actionKey,outcome?} OR {domainId,parameters,outcome?} from that parent'},
             ...workflowChanceInput({}),
            scopeNote:'The model chooses the menu entry, parameters and any explicit chance assumption. Host binds its exact parent, seat and identifier, then invokes unchanged Native validation. A same-response future menu is a CHOICE POINT: only the preceding query runs; the proposed index is not executed until a model has received that actual menu and selected from saved evidence. This is normal scheduling, not an error repair. Geometry solver output may inform parameters on the original parent; applying a formation_scene does not deploy or grant a new copy of an old domain.'}:{}),
          ...(operation==='native_action'?{nativeFormationSelection:{
            argumentsShape:'{selection:{sourceEvidenceNumber OR fromStepId,kind:"formation",index OR match:{formationOptionId:"exact saved option ID"},outcome?}}',
            meaning:'After reading a Native space.solve_formation/legal_formation_options menu, explicitly select ONE whole option. Host copies its exact canonicalParameters, domain, parent and seat; no coordinate retyping or Host ranking. No parameters/base/seat/action fields may compete. Static solve_static_formation and formation_scene never qualify. Unread future options yield back to the model before execution; unchanged Native validation still decides legality.'}}:{}),
          ...(operation==='spatial'?{preferredTypedQuery:{
            argumentsShape:'{stateRef: <complete selected scene reference>, queryKind:"exact Native kind", queryArguments:{...the typed Native query fields}}; no argumentsJson string is needed. stateRef/base/contextRef/seatKey are OUTER fields, never children of queryArguments; retain them only when no selection is used. Omit stateRef only for an intentionally selected frozen source, not to repair a misplaced parent.',
            currentDomainQuery:'{queryKind,selection:{sourceEvidenceNumber OR fromStepId,kind:"domain",match:{actionType,pieceId,...} OR index},queryArguments:{...}}. Host owns parent,seat,domainId from that inspect; do not also supply those fields or selection.parameters/outcome.',
            formationUse:'For actual deploy/move placement use space.solve_formation with a selected current domain. This read-only solver returns native canonicalParameters. Static formation is only hypothetical geometry and does not establish action legality.',
            binding:'Bind a dynamic /queryArguments/field when needed; never replace an entire JSON string with a scalar domain ID. Old saved argumentsJson requests retain their original meaning.'}}:{}),
          ...(operation==='spatial'?{physicalRange:clone(physicalRangeContract)}:{}),
          ...(operation==='spatial'?{comparisonSceneContract:ROSTER_COMPARISON_SCENE_INSTRUCTION_V1}:{}),
          ...(operation==='spatial'?{staticIntentCollectionInput:clone(ROSTER_STATIC_INTENT_COLLECTION_INPUT_V1)}:{}),
          ...(operation==='formation_scene'?{argumentsShape:{
            selections:'Nonempty array of WHOLE options, not one entry per unit. Select each option ONCE: a joint option already includes ALL its jointUnitIds and applies them together; never repeat it for each member. Completed source: {sourceEvidenceNumber,optionIndex}. Earlier solver in THIS response: {fromStepId,optionIndex}; compiler adds the dependency and Host resolves the work/option identity when it is complete. optionIndex is zero-based. Never bind a nonexistent /receipt/evidenceNumber or retype model positions.'},
            scopeNote:'Applies the explicitly selected static geometry only; does not deploy a unit, consume Supply or prove movement/arrival. Native actions remain separate.'}:{}),
          ...(operation.startsWith('math_')?{inputSchema:clone(mathContracts[operation.slice(5)].inputSchema),argumentsShape:clone(mathContracts[operation.slice(5)].inputs||mathContracts[operation.slice(5)].argumentsJsonShape),
            inputContract:'Direct typed fields shown here; the Adapter preserves them exactly inside the existing Native inputs object.'}:{}),
          ...(operation==='math'?{argumentsShape:{mathKind:'one actual math kind',inputs:'the complete object in mathContracts[kind].inputs OR argumentsJsonShape'},
            legacyEnvelope:true,preferred:'Use the corresponding math_* operation with direct typed arguments. Never put sideKey/windows beside mathKind.'}:{}),
          ...(['builder_audit','builder_branches'].includes(operation)?{candidateRevision:{version:1,
            candidateEdits:clone(ROSTER_CANDIDATE_CONTEXT_INPUT_V1.candidateEdits),
            instruction:'For a revision, bind /candidateInput to the chosen saved builder_audit source /value/request/candidateInput, then provide only candidateEdits. Unmentioned units, cards and upgrades are preserved exactly. Omitting candidateInput edits the CURRENT formal draft, which may still be empty; it does not select the latest audited candidate. To only inspect legal budget neighbours, use builder_branches with the same explicit saved candidate. Host does not choose a candidate, fill the budget or rank strategy. Native still audits every result.'}}:{}),
          ...(operation==='builder_audit'?{inputSchema:describeRosterBuilderQueryParameterSchemaV1(operation),argumentsShape:{candidateInput:'optional complete baseline candidate; may bind the exact saved candidate',candidateEdits:clone(ROSTER_CANDIDATE_CONTEXT_INPUT_V1.candidateEdits)},
            reusePolicy:'The exact explicit candidate under unchanged frozen rules/Builder is audited once. Read its saved result instead of resubmitting it. A new order name or a claim of added upgrades is not a change: the actual candidateInput must contain the chosen changes. A reused prerequisite can support other new operations but is not a new experiment or strategic comparison. Current-draft default audits and changed rules remain fresh.',
            result:'Full native Builder audit including minerals, gas, slots, models and specialist assignments. Read-only, does not select or submit a roster.'}:{}),
          ...(operation==='builder_choices'?{inputSchema:clone(ARMY_BUILDER_CHOICE_PARAMETERS_V1),argumentsShape:{scaleId:'optional current default',factionRecordKey:'optional current default',mineralBudget:'optional current default'},
            reusePolicy:'An identical explicit scale/faction/budget query under the same frozen Builder has one saved menu. Read the existing receipt to see its exact choices; do not issue the same query merely because a new role has not read it. Changed selectors remain fresh. Menu entries are not selected purchases or a legality verdict.',
            result:'Source-owned eligible unit/composition/upgrade/card menu, not a strategy recommendation.'}:{}),
          ...(operation==='builder_branches'?{inputSchema:describeRosterBuilderQueryParameterSchemaV1(operation),argumentsShape:{candidateInput:'optional current draft default; use saved candidate binding to avoid retyping',candidateEdits:clone(ROSTER_CANDIDATE_CONTEXT_INPUT_V1.candidateEdits),maximumEvaluations:'optional 1..256, default24',
            preserveUnitIds:'Optional existing unit IDs whose composition/upgrades must remain unchanged',excludedNewUnitRecordKeys:'Optional exact menu unit types not to add during refill; current units of that type remain',startOffset:'optional page offset, default0',maximumMutationDepth:'optional 1..6, default5',
            generationPolicy:ROSTER_BUDGET_GENERATION_DESCRIPTION_V1},
            reusePolicy:'Same explicit/materialized candidate, frozen Builder and normalized page/depth/policy returns the saved original receipt without recalculation. Default and explicit equivalent bounds are the same query. Changed actual edits/pages remain fresh; source/menu cursor guards and caller postconditions still apply. Reuse is not new evidence or strategy approval.',
            result:'Rules-audited neighbours of the EDITED baseline, including removal/replacement when candidateEdits explicitly selects it. At full budget, remove or replace selected units/upgrades/cards before bounded refill; without edits the default search remains additive. Native audits each returned candidate. This is not a strategy rank or proof of impossibility; model chooses the eventual edit.'}:{}),
        })).map(entry=>!contextCapable(entry.operation)?entry:{...entry,
          argumentsShape:{...entry.argumentsShape,contextRef:'Optional outer candidate context from candidate_context. Omit for formal draft; bind /contextRef from creation (no redundant null placeholder required). Never infer it from branchStateHash.',
            ...(branchCapable.has(entry.operation)?{stateRef:entry.operation==='native_action'?'Legacy direct action only. Omit when using selection; selection already includes its inspected state.':'PREFERRED: complete /stateRef returned or derived from any inspect/scenario/candidate_context receipt. Bind it whole to /stateRef; Host selects its exact candidate and root/branch. Do not also assemble contextRef/base.',
              base:'Legacy explicit {kind:"source"} or {kind:"branch",branchStateHash:"exact saved hash"}. Prefer whole stateRef; if needed, /base/branchStateHash binding supplies the branch reference directly.'}:{})},
          ...(entry.argumentsContract?{argumentsContract:{...entry.argumentsContract,fields:[...entry.argumentsContract.fields,'contextRef']}}:{})}),
      arguments:'Use the shown operation argumentsShape. math_* accepts direct typed inputs and wraps them losslessly for Native; generic math requires {mathKind,inputs}. Do not supply queryId/branchId; Host binds those. Omit base for the selected context source; an explicit /base/branchStateHash binding supplies the branch reference directly. Each native action is explicitly selected. No automatic pass, actor selection, dice or lifecycle skipping.',
      bindingContract:'bound_arguments_v3: explicit prior-step binding owns the argument; the unique earlier step may be in another workOrder of the SAME response. Declared /contextRef and /base/branchStateHash references may be supplied by binding without duplicate null literals; original inputs and actual values are recorded. Use guards for assertions. Already completed responses use fromEvidenceNumber, never fabricate a hash.',
      bindingExample:{argumentPointer:'/base/branchStateHash',fromStepId:'create-scene',fromEvidenceNumber:0,resultPointer:'/branchStateHash'},
      savedBindingExample:{argumentPointer:'/base/branchStateHash',fromStepId:'',fromEvidenceNumber:'exact current tool evidence number',resultPointer:'/baseStateHash'},
      stateReferenceBindingExample:{argumentPointer:'/stateRef',fromStepId:'create-scene',fromEvidenceNumber:0,resultPointer:'/stateRef'},
      stateReferenceContract:'Prefer one complete Host-generated stateRef over separate contextRef/base. Every current or historical Native inspect/scenario and successful candidate_context exposes a derived /stateRef without changing its original receipt. A created candidate yields its NEW source reference unless an explicit comparisonScene produced its projected branch. Pass it unchanged; it is an identity, not a combat or arrival result.',
      guardExample:{fromStepId:'inspect-scene',fromEvidenceNumber:0,resultPointer:'/phase',equalsJson:'"movement"'},
      guardSemantics:'References to earlier steps are checked before execution. A guard naming its OWN step checks the actual result after execution; it is not a cyclic input dependency. A failed postcondition retains the executed result and stops dependent work, never replays that operation.',
      observationReuse:'Identical completed or concurrently in-flight spatial/probability/threat_exchange/bounded_arrival_control/bounded_unit_temporal/bounded_joint_temporal queries share the exact saved receipt with queryReuse.newObservation=false under the same source, parent, parameters and implementation. Plan-only wording changes do not invalidate a physical observation; army/map/rules/context changes still do. A completed bounded search with no witness may be reused but remains unknown/returned_to_model, never approved. A temporal search with Native failures is not cached as a successful observation; its isolated transitions never become real history. Each request keeps its own identity and postconditions; sharing is not another trial or more evidence coverage. Inspect still reads its current menu; live/private action commands are never replayed or substituted by this policy.',
      stopPolicy:'Invalid input, unknown query results, unavailable choices or chance requirements return to the model. Native isolation invariant failures stop as engineering failures; they are never sent to model input repair. Only declared steps may run. A supported local transition never proves an optimal or guaranteed future.'}),
    async execute(assignment,control){
      if(control.operationState?.nativeTemporalFailure){
        const saved=await store.get(control.operationState.nativeTemporalFailure.failureRef);
        throw nativeTemporalInvariantErrorV1({...saved.detail,retainedFailureRef:control.operationState.nativeTemporalFailure.failureRef,coldStop:true});
      }
      if(control.operationState?.noProgressStop)throw Object.assign(Error('ROSTER_WORKFLOW_TOOL_NO_PROGRESS'),{
        dispatchOutcome:'completed_no_progress',detail:clone(control.operationState.noProgressStop)});
      const selected=assignment.inputs.request.value;
      if(control.operationState?.completedRef){
        return restoreCompleted(assignment,control);
      }
      let experimentOrigin=null;
      try{
        if(selected.experimentScope||['scenario','native_action','formation_scene','project_scene'].includes(selected.operation)
          ||selected.operation==='candidate_context'&&selected.args?.comparisonScene){
          validateRosterExperimentScopeV1(selected.experimentScope);
          experimentOrigin=projectRosterExperimentOriginV1({scope:selected.experimentScope,workId:assignment.workId,
            experimentId:selected.experimentId??assignment.workId,bindings:assignment.scope,
            comparisonBinding:selected.comparisonBinding});
        }
        if(Object.hasOwn(selected.args??{},'executionScope'))fail('ROSTER_EXPERIMENT_SCOPE_MUST_BE_WORK_ORDER_METADATA');
      }catch(error){return {kind:'interpretation',continuation:true,value:{operation:selected.operation,
        status:'returned_to_model',executed:false,nativeSuccess:false,code:error.code||error.message,
        queryRepair:clone(error.queryRepair??null),detail:clone(error.detail??null)},
        conditions:['No tool dispatched; declare a permitted local scope or return to the strategic owner']};}
      if(!methodFor(selected.operation))fail('ROSTER_WORKFLOW_TOOL_UNAVAILABLE',selected.operation);
      let args=clone(selected.args);
      if(selected.modelChoiceSources?.length){
        const sources=selected.modelChoiceSources.map(({name,menuPointer,choiceKind})=>{
          const input=assignment.inputs[name];
          if(!input?.workId)fail('ROSTER_WORKFLOW_CHOICE_SOURCE_UNAVAILABLE',name);
          return {sourceWorkId:input.workId,sourceResultRef:input.resultRef,menuPointer,...(choiceKind?{choiceKind}:{}),
            sourceOperation:input.value?.operation,stateRef:projectRosterWorkflowStateReferenceV1(input.value)};
        });
        return {kind:'interpretation',continuation:true,value:projectChoiceSources({operation:selected.operation,status:'awaiting_model_choice',
          reason:'unobserved_choice_result',executed:false,sourceReads:sources,
          question:{purpose:selected.purpose,publicReason:selected.publicReason,scenarioAssumptions:selected.scenarioAssumptions},
          unconfirmedProposal:clone(selected.args)}),
          conditions:['Queries completed; the proposed future menu index has NOT executed','Normal observation-to-choice handoff, not a Native error or a proven action']};
      }
      let bound;
      try{bound=resolveBoundArguments(selected,assignment.inputs);}
      catch(error){
        if(error.queryRepair?.correctable!==true)throw error;
        const stateFailure=projectRosterWorkflowStateBindingFailureV1({selected,error});
        if(stateFailure)return stateFailure;
        return {kind:'interpretation',continuation:true,value:{operation:selected.operation,
          submittedArguments:clone(selected.args),request:clone(error.boundArguments??selected.args),
          inputBindings:clone(error.inputBindings??[]),status:'returned_to_model',
          executed:false,nativeSuccess:false,dispatchOutcome:'not_dispatched',
          code:error.code||error.message,detail:clone(error.detail??null),queryRepair:clone(error.queryRepair)},
          conditions:['Bound input rejected before any Native dispatch; preserve its exact source and question for parameter repair']};
      }
      args=bound.args;const inputBindings=bound.inputBindings;
      try{
        const scene=bindRosterComparisonSceneArgumentsV1({operation:selected.operation,args,binding:selected.comparisonBinding});
        args=scene.args;if(scene.projection)inputBindings.push(scene.projection);
      }catch(error){return {kind:'interpretation',continuation:true,value:{operation:selected.operation,
        submittedArguments:clone(selected.args),request:args,inputBindings,status:'returned_to_model',
        executed:false,nativeSuccess:false,code:error.code||error.message,detail:clone(error.detail??null),queryRepair:clone(error.queryRepair??null)},
        conditions:['No Native dispatch: design conditions and explicit source must survive method binding unchanged']};}
      const preparation=selected.temporalPreparationCompletion;
      if(preparation){
        const source=assignment.inputs.temporalPreparationReceipt?.value,receipt=source?.receipt;
        const original=preparation.sourceStateRef;
        if(source?.operation!=='scenario'||source.status!=='completed'||receipt?.resultStatus!=='ok'
          ||!isDeepStrictEqual(source.request?.spec,preparation.spec)
          ||receipt.sourceStateHash!==original.sourceStateHash||receipt.parentStateHash!==original.stateHash
          ||source.contextRef!==original.contextRef||receipt.branchStateHash===original.stateHash
          ||!args.stateRef||!isDeepStrictEqual(projectRosterWorkflowStateReferenceV1(source),args.stateRef)){
          const code='ROSTER_TEMPORAL_REPAIR_PREPARED_SOURCE_MISMATCH';
          return {kind:'interpretation',continuation:true,value:{operation:selected.operation,status:'returned_to_model',
            submittedArguments:clone(selected.args),request:args,inputBindings,executed:false,nativeSuccess:false,
            code,queryRepair:{correctable:true,originalQueryNotAnswered:true,nativeExecuted:false,
              sourceContract:'pregame_temporal_preparation_source_v1',
              instruction:'Bind /stateRef from the completed round-one preparation on the original inspected state. The original query was not executed.'}},
            conditions:['No Native dispatch; this repair requires its exact prepared successor']};
        }
      }
      const sceneFailure=await projectRosterWorkflowComparisonSceneFailureV1({required:assignment.requiredSceneProjection,
        args,inputBindings,readArtifact:store.get});
      if(sceneFailure)return {kind:'interpretation',continuation:true,value:{operation:selected.operation,
        submittedArguments:clone(args),request:clone(args),inputBindings,status:'returned_to_model',
        executed:false,nativeSuccess:false,...sceneFailure},
        conditions:['No Native operation executed; the original selected comparison scene is still required']};
      for(const binding of selected.formationSelectionSources??[]){
        const source=assignment.inputs[binding.name],selection=args.selections[binding.index];
        if(!source?.workId||source.value?.operation!=='spatial')
          fail('ROSTER_WORKFLOW_FORMATION_DEPENDENCY_INVALID',{source:binding.name});
        const value={sourceWorkId:source.workId,optionIndex:selection.optionIndex};
        args.selections[binding.index]=value;
        inputBindings.push({argumentPointer:`/selections/${binding.index}`,priorValue:clone(selection),priorFieldPresent:true,
          value:clone(value),sourceWorkId:source.workId,sourceResultRef:source.resultRef});
      }
      const mismatches=selected.guards.filter(g=>!isDeepStrictEqual(assignment.inputs[g.name].value,g.expected))
        .map(g=>({...g,actualValue:clone(assignment.inputs[g.name].value),
          sourceWorkId:assignment.inputs[g.name].workId,sourceResultRef:assignment.inputs[g.name].resultRef}));
      if(mismatches.length){
        const failure={operation:selected.operation,contextRef:args.contextRef??null,
          request:clone(args),submittedArguments:clone(args),status:'returned_to_model',reason:'guard_mismatch',mismatches,executed:false};
        failure.queryRepair=projectRosterWorkflowToolRepairV1(failure);
        return {kind:'interpretation',continuation:true,value:failure,conditions:['No tool execution; original order remains unproven']};
      }
      // Validate actual bound inputs, not an unresolved placeholder. The
      // compiler checks literals; every execution crosses this same source
      // contract after binding and before any pending Native dispatch.
      if(selected.operation==='scenario')try{
        assertPregameScenarioIntentV1(args.spec);
        assertRosterLocalScenarioPlacementsV1({scope:selected.experimentScope,args});
      }catch(error){
        return {kind:'interpretation',continuation:true,value:{operation:selected.operation,
          submittedArguments:clone(selected.args),request:clone(args),inputBindings,
          status:'returned_to_model',executed:false,nativeSuccess:false,
          code:error.code||error.message,detail:clone(error.detail??null),
          queryRepair:clone(error.queryRepair??null)},
          conditions:['No tool dispatched; local scenario construction cannot execute a Native action or automatic lifecycle.']};
      }
      const submittedArguments=clone(args);
      const boundMapIssue=inspectPregameMapWorkflowArgumentsV1(selected.operation,args);
      if(boundMapIssue)return {kind:'interpretation',continuation:true,value:{operation:selected.operation,
        submittedArguments,request:args,inputBindings,status:'returned_to_model',executed:false,nativeSuccess:false,
        code:'ROSTER_WORKFLOW_MAP_ARGUMENT_CONTRACT',detail:boundMapIssue},conditions:['No map query executed; bound arguments must satisfy the same source-owned contract.']};
      if(['builder_audit','builder_branches'].includes(selected.operation)&&Object.hasOwn(args,'candidateEdits')){
        try{
          const baseline=Object.hasOwn(args,'candidateInput')?args.candidateInput:await getCandidateInput();
          const candidate=projectRosterCandidateEditsV1(baseline,args.candidateEdits);
          inputBindings.push({rule:'explicit_builder_candidate_delta_v1',sourceCandidateHash:hash(baseline),
            edits:clone(args.candidateEdits),candidateHash:hash(candidate),hostSelectedChoices:false});
          const {candidateEdits,...rest}=args;args={...rest,candidateInput:candidate};
        }catch(error){return {kind:'interpretation',continuation:true,value:{operation:selected.operation,
          submittedArguments,request:args,inputBindings,status:'returned_to_model',executed:false,nativeSuccess:false,
          code:error.code||error.message,detail:clone(error.detail??null),
          queryRepair:{correctable:true,sourceContract:'builder_candidate_delta_v1',candidateEdits:clone(ROSTER_CANDIDATE_CONTEXT_INPUT_V1.candidateEdits),
            instruction:'Correct only the explicit candidate delta against the selected baseline. No Native audit executed; no fallback to another candidate, silent card removal or inferred purchase is allowed.'}},
          conditions:['Invalid candidate edit; original candidate and all saved audit results are unchanged.']};}
      }
      if(selected.operation==='spatial'&&Object.hasOwn(args,'queryArguments')){
        try{
          typedSceneQueryContract(args);
          let queryArguments=clone(args.queryArguments);
          if(selected.queryActionSource){
            const source=assignment.inputs[selected.queryActionSource];
            const bound=bindNativeSelection({selection:{...args.selection,parameters:{}}},source);
            queryArguments={...queryArguments,domainId:bound.action.domainId};
            inputBindings.push({argumentPointer:'/selection',priorValue:clone(args.selection),priorFieldPresent:true,
              value:{stateRef:bound.stateRef,seatKey:bound.seatKey,domainId:bound.action.domainId},
              sourceWorkId:source.workId,sourceResultRef:source.resultRef});
            args={stateRef:bound.stateRef,seatKey:bound.seatKey,queryKind:args.queryKind,queryArguments};
          }
          const {queryArguments:typed,selection,...outer}=args;
          args={...outer,argumentsJson:JSON.stringify(typed)};
        }catch(error){return {kind:'interpretation',continuation:true,value:{operation:'spatial',submittedArguments,
          status:'returned_to_model',executed:false,nativeSuccess:false,code:error.code||error.message,detail:clone(error.detail??null),
          queryRepair:error.detail?.sourceContract==='roster_spatial_envelope_v2'?clone(error.detail):{correctable:true,sourceContract:'roster_workflow_typed_scene_query_v1',originalQueryNotAnswered:true,
            instruction:'Correct only this typed read-only query/source selection. Choose a completed inspect with the intended exact current domain; use queryArguments as an object. No query executed, zero/multiple matches are not proof about other states. Do not change the intended unit to fit an incorrect selector or fabricate a receipt.'}},
          conditions:['Typed query rejected before Native; actual selection/type error retained']};
        }
      }
      if(selected.nativeActionSource){
        const source=assignment.inputs[selected.nativeActionSource];
        try{
          args=bindNativeSelection(args,source,{requireParameters:true});
          inputBindings.push(nativeSelectionInputBinding(submittedArguments,args,source));
        }catch(error){return {kind:'interpretation',continuation:true,value:{operation:selected.operation,submittedArguments,
          status:'returned_to_model',executed:false,nativeSuccess:false,code:error.code||error.message,detail:clone(error.detail??null),
          inputBindings:[...inputBindings,...(error.selectionInputBinding?[clone(error.selectionInputBinding)]:[])],
          queryRepair:clone(error.queryRepair??{correctable:true,sourceContract:'native_inspect_selection_v1',originalQueryNotAnswered:true,
            instruction:'Choose the intended completed inspect finite/domain entry, or a read Native current-domain formation option with kind:"formation" and exact option index/formationOptionId. Whole Native options copy canonicalParameters without retyping positions; static geometry does not qualify. Exactly one source entry must match. Correct the selector rather than switching the intended unit; preserve explicit chance assumptions. Never substitute a geometry-only parent for arrival.'})},
          conditions:['No Native action executed; selected inspected source must be valid']};}
      }
       if(selected.operation==='formation_scene'&&!['stateRef','base','contextRef'].some(key=>Object.hasOwn(args,key))){
         try{
           const sources=await readSavedFormationSelections(args),stateRef=sources[0]?.stateRef;
           if(!stateRef||sources.some(source=>!isDeepStrictEqual(source.stateRef,stateRef)))
             fail('ROSTER_WORKFLOW_FORMATION_PARENT_AMBIGUOUS',{reason:'selected_options_have_different_parents',
               parents:sources.map(({stateRef,sourceWorkId,sourceResultRef})=>({stateRef,sourceWorkId,sourceResultRef}))});
           args.stateRef=clone(stateRef);
           inputBindings.push({argumentPointer:'/stateRef',priorFieldPresent:false,value:clone(stateRef),
             normalization:'selected_static_formation_parent_v1',hostSelectedOption:false,
             sources:sources.map(({sourceWorkId,sourceResultRef,formationOptionId})=>({sourceWorkId,sourceResultRef,formationOptionId}))});
         }catch(error){return {kind:'interpretation',continuation:true,value:{operation:selected.operation,submittedArguments,
           request:args,inputBindings,status:'returned_to_model',executed:false,nativeSuccess:false,
           code:error.code||error.message,detail:clone(error.detail??null),queryRepair:clone(error.queryRepair??formationSelectionRepair)},
           conditions:['No Native operation executed; selected options must identify an exact common saved parent']};}
       }
       if(branchCapable.has(selected.operation))try{
        const normalized=normalizeRosterWorkflowStateReferenceArgumentsV1(args);
        args=normalized.args;if(normalized.binding)inputBindings.push(normalized.binding);
      }catch(error){return {kind:'interpretation',continuation:true,value:{operation:selected.operation,
        submittedArguments,request:args,inputBindings,status:'returned_to_model',executed:false,nativeSuccess:false,
        code:error.code||error.message,detail:error.detail??null,queryRepair:clone(error.queryRepair??null)},
        conditions:['No Native operation executed; typed state identity must be valid and nonconflicting']};}
      if(branchCapable.has(selected.operation)&&!Object.hasOwn(args,'stateRef')&&!Object.hasOwn(args,'contextRef')
        &&(args.base?.kind==='branch'||selected.operation==='spatial'&&!Object.hasOwn(args,'base'))){
        try{
          const scenes=await projectRosterWorkflowDelegatedScenesV1({state:await store.load(),
            workId:assignment.workId,readArtifact:ref=>store.get(ref)});
          const bound=bindRosterWorkflowDelegatedSceneV1({args,scenes});
          args=bound.args;if(bound.binding)inputBindings.push(bound.binding);
        }catch(error){return {kind:'interpretation',continuation:true,value:{operation:selected.operation,
          submittedArguments,request:args,inputBindings,status:'returned_to_model',executed:false,nativeSuccess:false,
          code:error.code||error.message,detail:error.detail??null,queryRepair:clone(error.queryRepair??null)},
          conditions:['No Native operation executed; ambiguous delegated scene identity needs an explicit whole stateRef']};}
      }
      if(selected.operation==='bounded_unit_temporal'&&selected.temporalBatchScope&&args.stateRef){
        const prepared=await resolveRosterTemporalPreparationReuseV1({state:await store.load(),workId:assignment.workId,
          selected,args,readArtifact:ref=>store.get(ref)});
        if(prepared){args=prepared.args;inputBindings.push(prepared.binding);}
      }
      if(Object.hasOwn(args,'stateRef')){
        try{
          if(!branchCapable.has(selected.operation))fail('ROSTER_WORKFLOW_STATE_REF_OPERATION_UNSUPPORTED');
          args=resolveRosterWorkflowStateReferenceV1(args,contexts.get(args.stateRef?.contextRef).labDescriptor());
        }catch(error){return {kind:'interpretation',continuation:true,value:{operation:selected.operation,
          submittedArguments,request:args,inputBindings,status:'returned_to_model',nativeSuccess:false,
          code:error.code||error.message,queryRepair:clone(error.queryRepair??null)},
          conditions:['No Native operation executed; complete selected state reference must resolve']};}
      }
      const contextRef=args.contextRef??null;
      // Context is owned by this scheduler. Never leak it as an unknown field
      // into Native, nor silently run a builder operation on a different army.
      delete args.contextRef;
      if(selected.operation.startsWith('math_'))args={mathKind:selected.operation.slice(5),inputs:args};
      if(selected.operation==='native_action'){
        if(Object.keys(args).some(k=>!['base','seatKey','action'].includes(k))||!args.action||!args.base){
          const value={operation:selected.operation,submittedArguments,request:clone(args),inputBindings,
            status:'returned_to_model',executed:false,nativeSuccess:false,dispatchOutcome:'not_dispatched',
            code:'ROSTER_WORKFLOW_NATIVE_ACTION_INPUT_INVALID',
            detail:{unexpectedFields:Object.keys(args).filter(k=>!['base','seatKey','action'].includes(k)),
              missingFields:['base','action'].filter(k=>!args[k])}};
          value.queryRepair=projectRosterWorkflowToolRepairV1(value);
          return {kind:'interpretation',continuation:true,value,
            conditions:['Action input rejected before Native dispatch; original intention requires model correction']};
        }
        args={base:args.base,seatKey:args.seatKey,spec:{kind:'native_action'},argumentsJson:JSON.stringify(args.action)};
      }
      if(privateBranchOperations.has(selected.operation))args.branchId=assignment.workId;
      if(privateBranchOperations.has(selected.operation))args.executionScope=clone(selected.experimentScope);
      else if(!privateBranchOperations.has(selected.operation)&&!['inspect','mission_scoring','candidate_context'].includes(selected.operation)
        &&!selected.operation.startsWith('builder_'))args.queryId=assignment.workId;
      if(selected.operation==='candidate_context'&&args.comparisonScene){
        args.branchId=assignment.workId;args.executionScope=clone(selected.experimentScope);
      }
      if(selected.operation==='spatial')try{
        const input=args.argumentsJson?parse(args.argumentsJson,'ROSTER_WORKFLOW_TOOL_ARGUMENT_JSON_INVALID'):args.arguments;
        const physical=physicalRangeInput(args.queryKind,input);
        if(physical.projection){
          inputBindings.push({argumentPointer:'/argumentsJson/rangeMilliInches',...physical.projection});
          const {arguments:legacy,...outer}=args;
          args={...outer,argumentsJson:JSON.stringify(physical.input)};
        }
        const projected=normalizeRosterFormationQueryInputV1(args);
        if(projected.normalizations.length)inputBindings.push({argumentPointer:'/argumentsJson',priorFieldPresent:true,
          priorValue:args.argumentsJson,value:projected.args.argumentsJson,normalization:projected.normalizations.some(change=>change.rule==='ordered_joint_group_envelope_v1')
            ?'ordered_joint_group_envelope_v1':projected.normalizations.some(change=>change.pointer.endsWith('/anchorRegions'))
            ?'static_formation_region_collection_v1':'static_formation_intent_collection_v1',
          changes:projected.normalizations});
        args=projected.args;
      }catch(error){
        return {kind:'interpretation',continuation:true,value:{operation:selected.operation,contextRef,submittedArguments,
          request:args,status:'returned_to_model',nativeSuccess:false,executed:false,dispatchOutcome:'not_dispatched',
          code:error.code||error.message,detail:error.detail??null,
          queryRepair:error.detail?.sourceContract==='roster_physical_range_v1'?{correctable:true,...clone(error.detail),originalQueryNotAnswered:true}:{correctable:true,sourceContract:'roster_static_intent_collection_v1',
            reasonCode:error.code||error.message,originalQueryNotAnswered:true,
            expectedArguments:clone(ROSTER_STATIC_INTENT_COLLECTION_INPUT_V1),
            instruction:'Correct only the explicit field reported by the SAME Native formation-input validator. A single objective or anchor-region object is already canonicalized to a list; do not change valid anchors, region bounds/step, unit, intent or targets merely to change collection syntax. Unsupported intent/weight/target data and invalid region values are not approximated.'}},
          conditions:['Source formation-input validation failed before Native query dispatch; no Rules result or Plan approval']};
      }
      const operation=clone(control.operationState??{});
      if(operation.completedRef){
        return restoreCompleted(assignment,{...control,operationState:operation});
      }
      if(operation.pending&&!operation.retryInterruptedQuery)fail('ROSTER_WORKFLOW_TOOL_OUTCOME_UNRECONCILED',assignment.workId);
      let selectedLaboratory;
      try{
        if(contextRef&&(selected.operation==='candidate_context'||selected.operation.startsWith('builder_')))
          fail('ROSTER_WORKFLOW_OPERATION_CONTEXT_NOT_SUPPORTED',selected.operation);
        selectedLaboratory=contexts.get(contextRef);
      }catch(error){
        return {kind:'interpretation',continuation:true,value:{operation:selected.operation,contextRef,
          submittedArguments,request:args,status:'returned_to_model',nativeSuccess:false,
          code:error.code||error.message,queryRepair:clone(error.queryRepair??null),detail:clone(error.detail??null)},
          conditions:['No query executed; requested candidate source was not resolved']};
      }
      // Includes queued pre-update orders and dynamically bound specs. Completed
      // receipts have already returned above and remain immutable.
      if(selected.operation==='spatial'&&args.queryKind==='ranged_activation_probability')try{
        const input=args.argumentsJson?parse(args.argumentsJson,'ROSTER_WORKFLOW_TOOL_ARGUMENT_JSON_INVALID'):args.arguments;
        assertRangedActivationSequenceV1(normalizeRangedActivationQueryArgumentsV1(input)?.steps);
      }catch(error){return {kind:'interpretation',continuation:true,value:{operation:selected.operation,contextRef,
        request:args,submittedArguments,inputBindings,status:'returned_to_model',executed:false,nativeSuccess:false,
        dispatchOutcome:'not_dispatched',code:error.code||error.message,detail:clone(error.detail??null),queryRepair:clone(error.queryRepair??null)},
        conditions:['Shared Native sequence-input validation failed before dispatch; exact field diagnosis only, no combat result or inferred target']};}
      if(selected.operation==='scenario')try{assertPregameScenarioIntentV1(args.spec);}
      catch(error){return {kind:'interpretation',continuation:true,value:{operation:selected.operation,contextRef,
        request:args,submittedArguments,inputBindings,status:'returned_to_model',executed:false,nativeSuccess:false,
        dispatchOutcome:'not_dispatched',code:error.code||error.message,detail:clone(error.detail??null),queryRepair:clone(error.queryRepair??null)},
        conditions:['No scenario executed; invalid parameters returned with the source-owned contract']};}
      if(selected.operation==='inspect')try{assertPregameInspectInputV1(args);}
      catch(error){return {kind:'interpretation',continuation:true,value:{operation:selected.operation,contextRef,
        request:args,submittedArguments,inputBindings,status:'returned_to_model',executed:false,nativeSuccess:false,
        dispatchOutcome:'not_dispatched',code:error.code||error.message,detail:clone(error.detail??null),queryRepair:clone(error.queryRepair??null)},
        conditions:['No scene inspected; unsupported arguments cannot silently select the initial scene']};}
      if(selected.operation==='probability')try{assertPregameProbabilityInputV1(args);}
      catch(error){return {kind:'interpretation',continuation:true,value:{operation:selected.operation,contextRef,
        request:args,submittedArguments,inputBindings,status:'returned_to_model',executed:false,nativeSuccess:false,
        code:error.code||error.message,detail:clone(error.detail??null),queryRepair:clone(error.queryRepair??null)},
        conditions:['No probability query executed; selected attack domain and nested Native parameters must be explicit']};}
      if(selected.operation==='threat_exchange')try{
        const normalized=normalizePregameThreatExchangeInputV1(args);
        if(normalized.normalizations.length)inputBindings.push({argumentPointer:'/',
          normalization:'pregame_threat_exchange_input_v1',changes:normalized.normalizations});
        args=normalized.query;
      }catch(error){return {kind:'interpretation',continuation:true,value:{operation:selected.operation,contextRef,
        request:args,submittedArguments,inputBindings,status:'returned_to_model',executed:false,nativeSuccess:false,
        code:error.code||error.message,detail:clone(error.detail??null),queryRepair:clone(error.queryRepair??null)},
        conditions:['No threat query executed; participant filters must be consumed without silent widening']};}
      let comparisonEntry=null,comparisonSourceEntries=null,observationPairCheck=null;
      try{
        if(selected.comparisonBinding){
          const statefulObservation=selected.operation==='native_action'||['probability','threat_exchange'].includes(selected.operation)
            ||selected.operation==='spatial'&&selected.comparisonBinding.role==='observation_candidate';
          if(statefulObservation)comparisonEntry=comparisonScenes.enter({binding:selected.comparisonBinding,
            laboratory:selectedLaboratory,base:args.base,contextRef});
          const sources=selected.operation==='compare_observations'
            ?[{value:assignment.inputs.observation_left?.value,arm:'current'},{value:assignment.inputs.observation_right?.value,arm:'alternative'}]
            :selected.operation==='summarize_native_outcomes'
              ?selected.args.sources.map((_,index)=>({value:assignment.inputs[`population_${index}`]?.value,arm:selected.comparisonBinding.arm})):null;
          if(sources){
            if(selected.operation==='compare_observations')observationPairCheck=assertRosterSavedObservationPairV1({
              binding:selected.comparisonBinding,spec:selected.args,
              sources:{left:assignment.inputs.observation_left,right:assignment.inputs.observation_right}});
            if(!comparisonScenes.sourcesMatch(selected.comparisonBinding,sources))fail('ROSTER_COMPARISON_MEASUREMENT_ENTRY_UNVERIFIED',{
              instruction:'Read the original measured sources and their verified entry conditions. Old outcomes without that proof cannot be relabelled as this design. Return the missing proof to its owner; do not replay successful actions or silently drop a source.'});
            comparisonSourceEntries=sources.flatMap(({value})=>value?.comparisonSceneEntries??(value?.comparisonSceneEntry?[value.comparisonSceneEntry]:[]));
          }
        }
      }catch(error){return {kind:'interpretation',continuation:true,value:{operation:selected.operation,contextRef,
        request:args,submittedArguments,inputBindings,status:'returned_to_model',executed:false,nativeSuccess:false,
        code:error.code||error.message,detail:clone(error.detail??null),queryRepair:clone(error.queryRepair??null)},
        conditions:['No Native action or measurement dispatched: comparison entry/source qualification is missing or contradicted']};}
      const selectedDescriptor=selectedLaboratory.labDescriptor();
      let interruptedQueryAttempt=null;
      if(operation.pending){
        interruptedQueryAttempt=assertRosterInterruptedQueryReplayV1({pending:operation.pending,
          recovery:operation.retryInterruptedQuery,savedRequest:await store.get(operation.pending.requestRef),
          actualRequest:{operation:selected.operation,contextRef,args},sourceStateHash:selectedDescriptor.sourceStateHash});
      }
      // Verify model-declared arm selection before cache reuse OR Native work.
      // Scenario prose/coordinates never buy upgrades or select a composition.
      let participantConfigurationCheck=observationPairCheck;
      try{
        const selection={scope:selected.experimentScope,binding:selected.comparisonBinding,operation:selected.operation};
        if(needsRosterParticipantConfigurationV1(selection)){
          const participantSource=selectedLaboratory.readParticipantConfigurations?.({base:args.base})??null;
          assertRosterBoundParticipantPurposeV2({...selection,participantSource});
          participantConfigurationCheck=checkRosterParticipantConfigurationV1({
            ...selection,candidateInput:await contexts.candidateInput(contextRef),contextRef,participantSource});
        }
      }catch(error){return {kind:'interpretation',continuation:true,value:{operation:selected.operation,contextRef,
        request:args,submittedArguments,inputBindings,status:'returned_to_model',executed:false,nativeSuccess:false,
        code:error.code||error.message,detail:clone(error.detail??null),queryRepair:clone(error.queryRepair??null)},
        conditions:['No Native work or reuse; declared experimental configuration must match the explicitly selected candidate']};}
      // Same executor/guards/checkpoint/recovery as every other product tool.
      // The operands come from dependency-resolved originals, not args scalars.
      const method=selected.operation==='compare_observations'
        ?()=>compareRosterMeasuredObservationsV1({spec:selected.args,sources:{
          left:assignment.inputs.observation_left,right:assignment.inputs.observation_right}})
        :selected.operation==='summarize_native_outcomes'
          ?()=>summarizeRosterNativePopulationV1({spec:selected.args,binding:selected.comparisonBinding,
            sources:selected.args.sources.map((_,index)=>assignment.inputs[`population_${index}`])})
        :methodFor(selected.operation,selectedLaboratory,contextRef);
      const queryIdentity={operation:selected.operation,descriptor:selectedDescriptor,args,contextRef,scope:assignment.scope};
      const missingPremise=await findRepeatedTemporalMissingPremiseV1({store,...queryIdentity,excludeWorkId:assignment.workId});
      if(missingPremise){
        const {receipt,...priorObservation}=missingPremise;
        const value={operation:selected.operation,contextRef,submittedArguments,request:args,receipt,inputBindings,
          status:'returned_to_model',executed:false,nativeSuccess:false,reason:missingPremise.reason,priorObservation,
          toolProofScope:rosterToolProofScopeV1(selected.operation,submittedArguments),...(experimentOrigin?{experimentOrigin}:{})};
        value.queryRepair=projectRosterWorkflowToolRepairV1(value);
        const result={kind:'tool_receipt',continuation:true,value,
          conditions:['No new search executed. Receipt is the explicit prior observation, not a result under the proposed larger bounds.',
            missingPremise.reason==='paused_search_unused_budget_expansion'
              ?'A cooperative pause did not exhaust the original bounds. Increasing only those bounds does not resume a saved frontier. Read the current geometry and choose an explicit method/restart; no automatic retry or strategic verdict.'
              :'Unchanged missing conditional premise returned to method owner; no invented rolls, negative reachability or strategic verdict.']};
        operation.completedRef=await store.put(result);operation.pending=null;
        await control.checkpointOperation(operation);await onTool(value);return result;
      }
      const duplicateAction=selected.operation==='native_action'
        ?await findCompletedRosterNativeSpatialActionV1({store,...queryIdentity,excludeWorkId:assignment.workId}):null;
      if(duplicateAction){
        operation.noProgressStop={version:1,reason:'identical_completed_native_spatial_action',
          ...duplicateAction,newObservation:false,executed:false,
          instruction:'Stop this repeated operation. The original transition is still readable and its saved successor may be used explicitly. Repair the method/evidence handoff before resuming; no automatic retry, substituted action, scope waiver or Plan approval.'};
        await control.checkpointOperation(operation);
        throw Object.assign(Error('ROSTER_WORKFLOW_TOOL_NO_PROGRESS'),{
          dispatchOutcome:'completed_no_progress',detail:clone(operation.noProgressStop)});
      }
      const flight=queryFlights.join(queryIdentity);
      try{
      const shared=flight&&!flight.owner?await flight.wait:null;
      const completed=shared??await (['builder_audit','builder_choices','builder_branches'].includes(selected.operation)
        ?findCompletedRosterBuilderObservationV1:findCompletedRosterQueryObservationV1)({store,...queryIdentity,excludeWorkId:assignment.workId});
      if(completed){
        const unresolved=completed.receipt.resultStatus==='unknown';
        const result={kind:'tool_receipt',...(unresolved?{continuation:true}:{}),value:{operation:selected.operation,contextRef,submittedArguments,request:args,
          receipt:completed.receipt,inputBindings,status:unresolved?'returned_to_model':'completed',executed:false,
          ...(unresolved?{reason:'tool_result_unresolved'}:{}),
          ...(participantConfigurationCheck?{participantConfigurationCheck}:{}),
          toolProofScope:rosterToolProofScopeV1(selected.operation,submittedArguments),
          ...(experimentOrigin?{experimentOrigin}:{}),
          queryReuse:{originalWorkId:completed.originalWorkId,originalResultRef:completed.originalResultRef,
            newObservation:false,reason:`same_${shared?'inflight':'frozen'}_${selected.operation}_observation`}},
          conditions:['Exact completed read-only query reused without Native execution; NO new evidence or changed state',
            'Original receipt identity, filters, conditions and proof limits preserved; no strategy or Plan approval']};
        annotateComparisonScene(result,selected);
        qualifyComparisonScene(result,selected,{entry:comparisonEntry});
        if(comparisonSourceEntries?.length)result.value.comparisonSceneEntries=clone(comparisonSourceEntries);
        if(selected.operation==='compare_observations'&&selected.comparisonBinding?.decisionTest)
          result.value.comparisonDecisionEvaluation=projectRosterMeasuredDecisionEvaluationV2({receipt:result.value.receipt,
            sources:{left:assignment.inputs.observation_left,right:assignment.inputs.observation_right},binding:selected.comparisonBinding,
            nativeInterventions:laboratory.describeComparisonInterventions?.()});
        const stateRef=projectRosterWorkflowStateReferenceV1(result.value);if(stateRef)result.value.stateRef=stateRef;
        // A new caller's postconditions still apply even though Native is not
        // replayed. Never bypass its explicit guard on a cached observation.
        const checks=(selected.resultGuards??[]).map(guard=>{
          try{return {...guard,actual:clone(exact(result,guard.pointer)),matched:isDeepStrictEqual(exact(result,guard.pointer),guard.expected)};}
          catch(error){return {...guard,matched:false,code:error.code||error.message};}
        });
        if(checks.length)result.value.resultGuards=checks;
        if(checks.some(check=>!check.matched)){result.continuation=true;result.value.status='returned_to_model';result.value.reason='postcondition_mismatch';}
        operation.completedRef=await store.put(result);operation.pending=null;
        if(interruptedQueryAttempt)operation.interruptedQueryAttempts=[...(operation.interruptedQueryAttempts??[]),
          {...interruptedQueryAttempt,reusedCompletedObservation:true}];
        delete operation.retryInterruptedQuery;await control.checkpointOperation(operation);
        flight?.complete(completed);await onTool(result.value);return result;
      }
      const repeated=selected.operation==='scenario'
        ? await findRepeatedFailedRosterSceneV1({store,descriptor:selectedDescriptor,args,excludeWorkId:assignment.workId}):null;
      if(repeated){
        // A retained diagnostic branch is available, not newly successful.
        // Save exact reuse/stop evidence before returning to the model owner.
        const result={kind:'tool_receipt',continuation:true,value:{operation:selected.operation,
          contextRef,submittedArguments,request:args,receipt:repeated.receipt,executed:false,
          ...(participantConfigurationCheck?{participantConfigurationCheck}:{}),
          status:'returned_to_model',reason:'unchanged_failed_experiment',
          reusedFromWorkId:repeated.previousWorkId,reusedFromResultRef:repeated.previousResultRef,
          queryRepair:repeated.queryRepair},
          conditions:['Same deterministic failed scene reused without execution; no new proof or state change','Original failure and scene remain available; model must select a real change']};
        operation.completedRef=await store.put(result);await control.checkpointOperation(operation);
        await restoreValue(result.value);await onTool(result.value);return result;
      }
      operation.pending={requestRef:await store.put({operation:selected.operation,contextRef,args}),sourceStateHash:selectedDescriptor.sourceStateHash};
      if(interruptedQueryAttempt)operation.interruptedQueryAttempts=[...(operation.interruptedQueryAttempts??[]),interruptedQueryAttempt];
      delete operation.retryInterruptedQuery;
      await control.checkpointOperation(operation);
      let receipt;
      try{
        if(selected.operation==='scenario'){
          assertPregameScenarioIntentV1(args.spec);
          assertRosterLocalScenarioPlacementsV1({scope:selected.experimentScope,args});
        }
        receipt=['bounded_unit_temporal','bounded_joint_temporal'].includes(selected.operation)
          ?await method(args,{shouldStop:shouldStopReadQuery}):await method(args);
      }
      catch(error){
        if(error.nativeTemporalInvariant===true){
          const failureRef=await store.put({status:'engineering_stopped',operation:selected.operation,
            contextRef,request:args,code:error.code,detail:clone(error.detail),modelRepairAllowed:false});
          operation.nativeTemporalFailure={failureRef,code:error.code};operation.pending=null;
          await control.checkpointOperation(operation);
          throw nativeTemporalInvariantErrorV1({...error.detail,retainedFailureRef:failureRef});
        }
        const failure={status:'returned_to_model',reason:'tool_input_or_execution_failure',operation:selected.operation,contextRef,request:args,submittedArguments,inputBindings,
          code:error.code||error.message,queryRepair:clone(error.queryRepair??null),detail:clone(error.detail??null),nativeSuccess:false};
        operation.failureRef=await store.put(failure);operation.pending=null;await control.checkpointOperation(operation);
        await onTool(failure);
        return {kind:'interpretation',value:failure,conditions:[failure.queryRepair?.rulesQuestionAnswered===true
          ?'Native rejected this exact candidate; its legality is answered. No candidate combat scene or combat result was produced, and the strategic comparison remains unresolved.'
          :'Failed query is not a factual answer; Native errors preserved'],continuation:true};
      }
      const communicationErrors=rosterToolReplyCommunicationErrorsV1({receipt,descriptor:selectedDescriptor,args});
      if(communicationErrors.length)await quarantineRosterCommunicationV1({errors:communicationErrors,operation,
        replyRef:await store.put({receipt:receipt??null}),requestRef:operation.pending.requestRef,store,control,lane:'tool'});
      const conditions=['Private laboratory source; no live room mutation','Tool receipt retains its original assumptions and authority; no optimality or future certainty inferred'];
      const unknown=receipt?.resultStatus==='unknown'||receipt?.resultStatus==='error'||receipt?.resultStatus==='failed'
        ||selected.operation==='builder_audit'&&receipt?.status==='unknown';
      // Constructing/registering a diagnostic scene is successful Native work,
      // but unresolved placements are NOT a ready prerequisite for its fan-out.
      // Return at the common constructor once instead of allowing every later
      // probability/route query to spawn its own repair of the same scene.
      const sceneGeometryPending=['scenario','formation_scene','project_scene'].includes(selected.operation)
        &&receipt?.branchStateHash
        &&receipt.hypotheticalPlacementAssessment?.units?.some(unit=>unit.resultStatus!=='ok');
      const scenePrerequisite=sceneGeometryPending&&selectedLaboratory.inspectQueryPrerequisites
        ?selectedLaboratory.inspectQueryPrerequisites({base:{kind:'branch',branchStateHash:receipt.branchStateHash}}):null;
      const unresolved=unknown||sceneGeometryPending;
      const result=normalizeBuilderAuditOutcome({kind:'tool_receipt',value:{operation:selected.operation,contextRef,submittedArguments,request:args,receipt,inputBindings,
        ...(participantConfigurationCheck?{participantConfigurationCheck}:{}),
        toolProofScope:rosterToolProofScopeV1(selected.operation,submittedArguments),
        ...(experimentOrigin?{experimentOrigin}:{}),
        ...(sceneGeometryPending?{status:'returned_to_model',reason:'scene_geometry_not_ready',
          sceneReadiness:{branchConstructed:true,geometryReady:false,
            branchStateHash:receipt.branchStateHash,source:'native_hypothetical_placement_assessment'},
          ...(scenePrerequisite?.queryRepair?{queryRepair:clone(scenePrerequisite.queryRepair)}:{})}
          :unknown?{status:'returned_to_model',reason:'tool_result_unresolved'}:{status:'completed'})},conditions,
        ...(unresolved?{continuation:true}:{})});
      annotateComparisonScene(result,selected);
      qualifyComparisonScene(result,selected,{entry:comparisonEntry});
      if(comparisonSourceEntries?.length)result.value.comparisonSceneEntries=clone(comparisonSourceEntries);
      if(selected.operation==='compare_observations'&&selected.comparisonBinding?.decisionTest)
        result.value.comparisonDecisionEvaluation=projectRosterMeasuredDecisionEvaluationV2({receipt,
          sources:{left:assignment.inputs.observation_left,right:assignment.inputs.observation_right},binding:selected.comparisonBinding,
          nativeInterventions:laboratory.describeComparisonInterventions?.()});
      if(sceneGeometryPending)result.conditions.push(
        'The original diagnostic branch is registered and readable, but its Native geometry prerequisites are unresolved. Dependent measurement waits at this shared preparation step; no completed construction is replayed and no Host placement is chosen.');
      if(selected.operation==='inspect'&&!unknown){
        // Compare exactly what the evidence reader will deliver on BOTH sides.
        // Native own-undefined slots are not present in the JSON store; do not
        // compare a live object with a persisted one or edit the Native value.
        const inspectionComparisonRef=await store.put({receipt,request:args});
        const delivered=await store.get(inspectionComparisonRef);
        result.value.inspectionComparisonRef=inspectionComparisonRef;
        const prior=await findCompletedRosterInspectObservationV1({store,descriptor:selectedDescriptor,
          args:delivered.request,receipt:delivered.receipt,contextRef,scope:assignment.scope,excludeWorkId:assignment.workId});
        if(prior){
          result.value.queryReuse={...prior,newObservation:false,readOnlyInspectionExecuted:true,
            reason:'same_complete_current_inspect_result',comparisonBasis:'exact_current_persisted_transport'};
          // Idempotent reads are successful prerequisites, not input failures.
          // The batch progress lane already reports newObservation:false to
          // its owner; do not spawn an unrelated geometry repair or block the
          // following attack/control query merely because inspection is equal.
          result.conditions.push('Complete current inspection equals the saved observation; successful read, no new experimental evidence');
        }
      }
      const stateRef=projectRosterWorkflowStateReferenceV1(result.value);
      if(stateRef)result.value.stateRef=stateRef;
      const postconditions=(selected.resultGuards??[]).map(guard=>{
        try{const actual=exact(result,guard.pointer);return {...guard,actual:clone(actual),matched:isDeepStrictEqual(actual,guard.expected)};}
        catch(error){return {...guard,matched:false,code:error.code||error.message};}
      });
      if(postconditions.length)result.value.resultGuards=postconditions;
      if(postconditions.some(g=>!g.matched)){
        result.continuation=true;result.value.status='returned_to_model';result.value.reason='postcondition_mismatch';
        result.conditions.push('Actual executed receipt retained; postcondition failed, so dependent work stops. Do not replay the completed operation.');
      }
      if(experimentOrigin?.collectScenarioExperience)result.value.scenarioExperienceRef=await store.put(experimentOrigin);
      operation.completedRef=await store.put(result);operation.pending=null;
      await control.checkpointOperation(operation);
      if(isReusableRosterQueryReceiptV1(selected.operation,receipt))flight?.complete({receipt,originalWorkId:assignment.workId,originalResultRef:operation.completedRef});
      await onTool(result.value);return result;
      }finally{
        // Includes Native rejection, checkpoint failure and cancellation. Never
        // strand another reader on an owner that did not publish an observation.
        flight?.complete(null);
      }
    },
    async restore({workflowState}){
      // Rehydrate only recorded branch results, in their actual completion order.
      // The Native restore methods do not re-apply successful game actions.
      for(const event of workflowState.events.filter(e=>e.type==='result_saved')){
        const work=workflowState.work.find(w=>w.id===event.workId);
        if(work?.role!=='roster_workflow_tool'||work.bindings.source!==descriptor.sourceStateHash)continue;
        const result=await store.get(event.resultRef);await restoreValue(result.value);
        // Rebuild only explicitly recorded current-design witnesses. Historical
        // scenes remain readable; they do not gain a witness from old prose.
        if(work.inputs.request.value.comparisonBinding?.sceneRequirementsContractVersion===1)
          qualifyComparisonScene(result,work.inputs.request.value,{restoring:true});
      }
    },
  };
}
