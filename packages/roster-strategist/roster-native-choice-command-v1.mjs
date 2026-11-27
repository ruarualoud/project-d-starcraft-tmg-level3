// A menu choice does not re-author its containing experiment. The model selects
// a saved source/entry and explicit parameters; the normal compiler and Native
// executor still own source identity, legality and application.
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {projectRosterDelegatedNativeChoiceScopeV1} from './roster-comparison-observation-v1.mjs';
import {validateRosterWorkflowNativeSelectionV1,normalizeRosterWorkflowNativeSelectionV1} from './roster-workflow-laboratory-v1.mjs';
import {createStarcraftTmgOutputContractV1,outputContractRefStarcraftTmgV1,
  validateStarcraftTmgProviderJsonSchemaValueV1 as validate} from '../structured-generation/output-contract-registry-v1.mjs';
const clone=structuredClone;
const obj=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const nullable=value=>({anyOf:[value,{type:'null'}]});
const text={type:'string',minLength:0,maxLength:65536};
// Normal experiment steps use the same source-owned selection as recovery.
// Only the wire changes: the existing compiler retains all execution authority.
export function rosterNativeSelectionStepSchemaV1(stepSchema){
  const props=stepSchema.properties,jsonText=clone(props.argumentsJson);
  return obj({kind:{...text,enum:['native_selection']},stepId:clone(props.stepId),operation:{...clone(props.operation),enum:['native_action']},
    nativeSelection:obj({
      source:{anyOf:[
        obj({kind:{...text,enum:['saved_menu']},evidenceNumber:{type:'integer',minimum:1,maximum:1000000}}),
        obj({kind:{...text,enum:['batch_step']},stepId:{...clone(props.stepId),minLength:1}})]},
      selector:{anyOf:[
        obj({kind:{...text,enum:['index']},index:{type:'integer',minimum:0,maximum:1000000}}),
        obj({kind:{...text,enum:['action_type']},actionType:{...text,minLength:1}}),
        obj({kind:{...text,enum:['match']},matchJson:{...jsonText,minLength:2,description:'JSON object of exact primitive identity fields. For finite only, a JSON string means exact actionType.'}})]},
      kind:{...text,enum:['finite','domain','formation']},
      parametersJson:nullable(jsonText),outcomeJson:nullable(jsonText)}),
    guards:clone(props.guards),publicReason:clone(props.publicReason)});
}
export function projectRosterNativeSelectionStepV1(step){
  const input=step.nativeSelection;let selection={kind:input.kind};const projection=[];
  try{
    if(Object.hasOwn(input,'source')||Object.hasOwn(input,'selector')){
      if(input.source?.kind==='saved_menu')selection.sourceEvidenceNumber=input.source.evidenceNumber;
      if(input.source?.kind==='batch_step')selection.fromStepId=input.source.stepId;
      if(input.selector?.kind==='index')selection.index=input.selector.index;
      if(input.selector?.kind==='match')selection.match=JSON.parse(input.selector.matchJson);
      if(input.selector?.kind==='action_type')selection.match={actionType:input.selector.actionType};
    }else{
      // Saved 1.2.0 requests retain their original wire and original rejection.
      for(const field of ['sourceEvidenceNumber','fromStepId','index'])
        if(input[field]!==null)selection[field]=input[field];
      if(input.matchJson!==null)selection.match=JSON.parse(input.matchJson);
    }
    for(const [wire,field] of [['parametersJson','parameters'],['outcomeJson','outcome']])
      if(input[wire]!==null)selection[field]=JSON.parse(input[wire]);
    // Do not create another set of Native argument rules in the Provider mapper.
    const normalized=normalizeRosterWorkflowNativeSelectionV1(selection);
    projection.push(...normalized.projection);
    selection=validateRosterWorkflowNativeSelectionV1({selection:normalized.selection});
  }catch(error){return {step:null,errors:[{code:'native_selection_step_invalid',stepId:step.stepId,
    cause:error.code??'selection_json_invalid',detail:error.detail??error.message,nativeExecuted:false}]};}
  const {kind,nativeSelection,...retained}=clone(step);
  return {step:{...retained,argumentsJson:JSON.stringify({selection}),bindings:[]},projection,errors:[]};
}
export function prepareRosterNativeChoiceCommandV1(request){
  if(request.roundKind!=='roster_workflow_experiment_planner')return null;
  const assignment=request.promptNodes.find(n=>n.kind==='workflow_role_assignment'),inputs=assignment?.inputs??{};
  const task=inputs.task?.value;
  const order=clone(task?.failedOrder??inputs.nativeChoiceTemplate?.value);
  // Multi-step repairs remain with their method owner: never silently discard
  // a prerequisite, output guard or experimental step to fit this command.
  if(order?.steps?.length!==1||order.steps[0].operation!=='native_action')return null;
  order.experimentScope=projectRosterDelegatedNativeChoiceScopeV1(order.experimentScope,
    request.promptNodes.find(n=>n.kind==='pending_operation_choice_contract')?.delegatedComparison);
  let proposed;try{proposed=JSON.parse(order.steps[0].argumentsJson);}catch{return null;}
  if(!proposed?.selection)return null;
  const props=request.responseFormat.schema.properties;
  const allowedActions=props.action.enum.filter(action=>['read','catalogue','finish','conclude'].includes(action))
    .map(action=>action==='finish'?'select':action);
  const allowedSources=[...new Set((inputs.nativeChoiceSources?.value.entries??[]).flatMap(e=>e.allowedEvidenceNumbers))];
  const formationOnly=inputs.nativeChoiceSources?.value.entries?.length>0
    &&inputs.nativeChoiceSources.value.entries.every(e=>e.kind==='formation');
  const schema=obj({action:{...text,enum:allowedActions},publicReason:clone(props.publicReason),
    reads:clone(props.reads),catalogueQueries:clone(props.catalogueQueries),
    selection:nullable(obj({sourceEvidenceNumber:{type:'integer',minimum:1,maximum:1000000},
      kind:{...text,enum:formationOnly?['formation']:['finite','domain','formation']},index:{type:'integer',minimum:0,maximum:1000000},
      parametersJson:nullable(text),outcomeJson:nullable(text)})),
    conclusion:clone(props.conclusion),unresolvedQuestions:clone(props.unresolvedQuestions)});
  const contract=createStarcraftTmgOutputContractV1({id:'roster.native_choice_command',version:'1.0.0',
    schemaName:'roster_native_choice_command_v1',providerSchema:schema,modelOwnedFields:Object.keys(schema.properties),
    hostOwnedFields:['experimentScope','stepId','bindings','guards'],
    mapperRef:{id:'roster.native_choice_command',version:'1.0.0',hash:hash('roster.native_choice_command.v1')},
    semanticValidatorRef:{id:'roster.workflow_read_role_semantics',version:'1.0.0',hash:hash('roster.workflow_read_role_semantics.v1')},
    description:'Select one observed Native entry; immutable containing experiment and unchanged source/legality validation.'});
  const node={kind:'native_choice_command',version:1,purpose:order.purpose,experimentScope:clone(order.experimentScope),allowedSourceEvidenceNumbers:allowedSources,
    scenarioAssumptions:clone(order.scenarioAssumptions),stopWhen:order.stopAndReturnToModelWhen,
    previousSelection:clone(proposed.selection),previousError:clone(task?.error??null),
    instruction:'Choose only the pending Native action. read/catalogue access immutable saved evidence; they do not run inspect or change the scene. Use select with the exact saved sourceEvidenceNumber, kind and zero-based menu index AFTER observing the entry. Finite entries have parametersJson=null; domain entries require their explicit parameter JSON object; formation selects a whole candidate with parametersJson=null. outcomeJson is null unless an explicitly authorized outcome is needed. Never supply fromStepId, a parent state, bindings, a new inspect, a work order, or a new experiment: Host retains the original purpose/scope/guards and binds the saved source using the normal compiler. previousSelection is unconfirmed history, not an instruction to reuse its old step name. If the scene/menu cannot support the intended action or a new prerequisite/strategy is needed, conclude strategy_required or blocked with exact sources/questions for the owner. Do not conclude answered. No choice is executed or fact approved by this response. All normal source-read, scope, Native legality and successor gates remain. Do not replay an inspect merely to obtain a same-response step name.'};
  const keep=new Set(['pending_operation_choice_contract','delegated_scene_identities','citation_read_recovery_contract',
    'selected_native_menu_read_contract','citation_access','available_evidence_directory','assigned_evidence_references',
    'evidence_catalogue_search','catalogue_search_results','exact_read_results','fetched_source_read_navigation',
    'previously_delivered_source_facts','registered_native_measurement_supplements','conditional_native_action_evidence',
    'registered_source_record_supplements','historical_evidence_directory','local_contract_feedback',
    'experiment_evidence_window','read_preparation_return','required_choice_menu_read','required_choice_menu_preparation']);
  const next={...request,strategyRepairState:{originalResponseFormat:clone(request.responseFormat),nativeChoiceOrder:clone(order)},
    promptNodes:[{kind:'workflow_role_assignment',workId:assignment.workId,role:assignment.role,scope:assignment.scope,
      inputs:Object.fromEntries(Object.entries(inputs).filter(([key])=>/^(?:observedSource|nativeChoiceSource|nativeChoiceParameterContracts|nativeChoiceFormationSource)\d+$/.test(key)||['localObligation','choiceContext','nativeChoiceSources'].includes(key)))},
      ...request.promptNodes.filter(n=>keep.has(n.kind)),node],userMessage:node.instruction,
    responseFormat:{kind:'provider_strict_json_schema',schemaName:contract.schemaName,
      outputContractRef:outputContractRefStarcraftTmgV1(contract),schema}};
  next.contextHash=hash({priorContextHash:request.contextHash,promptNodes:next.promptNodes,userMessage:next.userMessage,responseFormat:next.responseFormat});
  return next;
}
export function projectRosterNativeChoiceCommandV1({request,output}){
  const reject=(code,detail={})=>({output:null,projection:[],errors:[{code,...detail}]});
  const checked=validate(request.responseFormat.schema,output);
  if(!checked.ok)return reject('native_choice_command_schema',{issues:checked.issues});
  if(output.action!=='select'&&output.selection!==null||output.action!=='conclude'&&output.conclusion!==null)
    return reject('native_choice_command_mixed_operations');
  const projection=[];
  const result={action:output.action,publicReason:output.publicReason,reads:clone(output.reads),catalogueQueries:clone(output.catalogueQueries),
    workOrders:[],unresolvedQuestions:clone(output.unresolvedQuestions),conclusion:clone(output.conclusion)};
  if(output.action==='conclude'&&!['blocked','strategy_required'].includes(output.conclusion?.status))
    return reject('native_choice_command_not_fact_approval');
  if(output.action==='select'){
    if(!output.selection||output.reads.length||output.catalogueQueries.length)return reject('native_choice_command_requires_single_selection');
    const {sourceEvidenceNumber,kind,index,parametersJson,outcomeJson}=output.selection;
    const allowed=request.promptNodes.find(n=>n.kind==='native_choice_command')?.allowedSourceEvidenceNumbers??[];
    if(allowed.length&&!allowed.includes(sourceEvidenceNumber))return reject('native_choice_command_wrong_pending_source',{
      sourceEvidenceNumber,allowedSourceEvidenceNumbers:allowed,instruction:'Use the actual inline menu for this pending operation, not a different scene. Return to its owner if a different parent is needed.'});
    const selection={sourceEvidenceNumber,kind,index};
    if(kind==='domain'?(parametersJson===null):(parametersJson!==null))return reject('native_choice_command_parameters');
    try{
      if(parametersJson!==null){selection.parameters=JSON.parse(parametersJson);
        if(!selection.parameters||Array.isArray(selection.parameters)||typeof selection.parameters!=='object')return reject('native_choice_command_parameters');}
      if(outcomeJson!==null)selection.outcome=JSON.parse(outcomeJson);
    }catch{return reject('native_choice_command_json');}
    const order=clone(request.strategyRepairState?.nativeChoiceOrder);
    if(order?.steps?.length!==1)return reject('native_choice_command_original_missing');
    const delegated=request.promptNodes.find(n=>n.kind==='pending_operation_choice_contract')?.delegatedComparison;
    const localScope=projectRosterDelegatedNativeChoiceScopeV1(order.experimentScope,delegated);
    if(order.experimentScope?.comparisonBinding&&localScope?.comparisonBinding===null)
      projection.push({rule:'native_choice_local_comparison_identity_v1',targetWorkId:delegated.targetWorkId,
        originalBinding:clone(order.experimentScope.comparisonBinding),selectionUnchanged:true,sourceApproved:false});
    order.experimentScope=localScope;
    // The immutable source owns parent and action identity. No separate state
    // binding survives; this is exactly the compiler's source-owned contract.
    order.steps[0].argumentsJson=JSON.stringify({selection});order.steps[0].bindings=[];
    order.steps[0].publicReason=output.publicReason;
    result.action='finish';result.workOrders=[order];
  }
  return {output:result,projection:[...projection,{rule:'model_authored_native_choice_command_v1',action:output.action,
    scopeRetained:true,nativeExecuted:false}],errors:[]};
}
