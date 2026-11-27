// A model supplies decision-bearing values. The Host retains the unexecuted
// method, identities, dependencies and serialization. No natural-language patch.
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {isDeepStrictEqual} from 'node:util';
import {createStarcraftTmgOutputContractV1,outputContractRefStarcraftTmgV1,
  validateStarcraftTmgProviderJsonSchemaValueV1 as validate} from '../structured-generation/output-contract-registry-v1.mjs';
import {assertSingleUnitTemporalInput,singleUnitTemporalParameterContractV1} from './pregame-single-unit-temporal-v1.mjs';
import {jointTemporalEntryParameterContractsV1} from './pregame-joint-temporal-v1.mjs';
const clone=value=>structuredClone(value);
const obj=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const tag=value=>({type:'string',enum:[value],minLength:1,maxLength:64});

// A completed read may reveal an input error only late in its private search.
// Retrieve its EXACT author's one-query method, never rebuild a method from
// prose or retry a mutation/multi-step prefix. The old receipt stays immutable.
export async function projectRosterRuntimeParameterInputV1({assignment,state,store}){
  if(assignment.role!=='roster_workflow_experiment_planner')return assignment;
  const work=state.work.find(w=>w.id===assignment.workId),failed=state.work.find(w=>w.id===work?.repairOf);
  const selected=failed?.inputs?.request?.value;
  if(failed?.role!=='roster_workflow_tool'||failed.status!=='needs_model_choice'||!failed.resultRef
    ||selected?.operation!=='bounded_unit_temporal'
    ||!isDeepStrictEqual(failed.bindings,assignment.scope)
    ||!isDeepStrictEqual(assignment.inputs.task?.value?.originalWork,selected))return assignment;
  const result=await store.get(failed.resultRef),receipt=result.value?.receipt;
  if(result.value?.operation!=='bounded_unit_temporal'||receipt?.mutatesSourceState!==false
    ||receipt.sourceStateHash!==assignment.scope.source||!receipt.failures?.length
    ||receipt.failures.some(f=>f.reason!=='PREGAME_LAB_NATIVE_ACTION_OUTCOME_INVALID'))return assignment;
  const owner=state.work.find(w=>w.id===failed.experimentOwnerId);
  if(!owner?.resultRef||!isDeepStrictEqual(owner.bindings,assignment.scope))return assignment;
  const orders=(await store.get(owner.resultRef)).value?.workOrders??[];
  const matches=orders.filter(order=>order.orderId===selected.orderId&&order.steps?.length===1
    &&order.steps[0].operation===selected.operation
    &&isDeepStrictEqual(JSON.parse(order.steps[0].argumentsJson),selected.args));
  if(matches.length!==1)return assignment;
  let diagnostic;
  try{assertSingleUnitTemporalInput(selected.args,{allowWorkflowReferences:true,
    boundArgumentPointers:(selected.bindings??[]).map(b=>b.pointer)});}catch(error){
    if(error.code==='PREGAME_TEMPORAL_INPUT_INVALID'&&error.detail?.field==='initiativeOutcome')
      diagnostic={code:error.code,detail:clone(error.detail)};
  }
  if(!diagnostic)return assignment;
  return {...assignment,inputs:{...assignment.inputs,parameterRepair:{source:'literal',value:{
    failedOrder:clone(matches[0]),error:diagnostic,origin:'completed_read_only_query',
    sourceWorkId:failed.id,sourceResultRef:failed.resultRef,authorResultRef:owner.resultRef,
    originalExecuted:true,originalOutcome:'unresolved',automaticRetry:false}}}};
}

// Source validators, not error prose or model guesses, identify the input.
// New tools can register their own parameter contract at this same seam.
function parameterTarget(task){
  if(!task?.failedOrder?.steps?.length||!task.error
    ||task.error.dispatchOutcome&&task.error.dispatchOutcome!=='not_dispatched')return null;
  const matches=[];
  for(const step of task.failedOrder.steps){
    if(!['bounded_unit_temporal','bounded_joint_temporal'].includes(step.operation))continue;
    let args;try{args=JSON.parse(step.argumentsJson);}catch{continue;}
    if(step.operation==='bounded_joint_temporal'){
      const repair=jointTemporalEntryParameterContractsV1(args,{allowWorkflowReferences:true,
        boundArgumentPointers:(step.bindings??[]).map(b=>b.argumentPointer)});
      if(repair&&task.error.code==='PREGAME_JOINT_TEMPORAL_INPUT_INVALID'
        &&task.error.detail?.field===repair.diagnostic.field)
        matches.push({stepId:step.stepId,args,...repair});
      continue;
    }
    try{assertSingleUnitTemporalInput(args,{allowWorkflowReferences:true,
      boundArgumentPointers:(step.bindings??[]).map(b=>b.argumentPointer)});}
    catch(error){
      const diagnostics=error.detail?.issues??[error.detail],slots=diagnostics.map(d=>singleUnitTemporalParameterContractV1(d?.field));
      if(slots.every(Boolean)&&error.code==='PREGAME_TEMPORAL_INPUT_INVALID'
        &&task.error.code===error.code&&task.error.detail?.field===error.detail.field
        &&diagnostics.every(d=>d.field!=='formationIntent'||d.reason==='required_parameter_missing')
        &&!slots.some(slot=>(step.bindings??[]).some(b=>b.argumentPointer==='/'+slot.argument)))
        matches.push({stepId:step.stepId,args,slots,diagnostic:clone(error.detail)});
    }
  }
  return matches.length===1?matches[0]:null;
}

export function rosterToolParameterNeedsGeometryV1(inputs){
  const target=parameterTarget(inputs?.parameterRepair?.value??inputs?.task?.value);
  return Boolean(target?.slots.some(slot=>slot.argument==='formationIntent'));
}

// One post-fix continuation through the existing product recovery mechanism.
// It is justified by the ACTUAL old input lacking this source-owned interface,
// not by another model error or a reset of its correction counter.
export function projectRosterToolParameterFeedbackRecoveryV1({work,request}){
  if(work?.role!=='roster_workflow_experiment_planner'||work.status!=='needs_repair'
    ||work.failure?.code!=='ROSTER_WORKFLOW_ROLE_NO_PROGRESS'
    ||work.failure.dispatchOutcome!=='completed_no_progress'
    ||work.failure.detail?.reason!=='unchanged_compiler_rejection'
    ||work.operationState?.pending||!work.operationState?.correction?.originalReplyRef
    ||request?.promptNodes?.some(n=>n.kind==='tool_parameter_command'))return null;
  const assignment=request?.promptNodes?.find(n=>n.kind==='workflow_role_assignment');
  if(assignment?.workId!==work.id||!isDeepStrictEqual(assignment.scope,work.bindings))return null;
  const task=assignment.inputs?.task?.value,target=parameterTarget(task);
  const errors=work.operationState.correction.errors??[];
  if(!target||!errors.length||!errors.every(e=>e.code==='unchanged_compiler_rejection'
    &&e.failureCode===task.error.code
    &&e.repeatedFailure?.error?.detail?.field===target.slots[0].argument))return null;
  const repairKind='source_owned_tool_parameter',feedbackVersion=
    target.slots.map(slot=>`${slot.sourceContract}:${slot.argument}:v${slot.version}`).join('|');
  return {workId:work.id,originalReplyRef:work.operationState.correction.originalReplyRef,
    repairKind,feedbackVersion,recoveryKey:hash({workId:work.id,repairKind,feedbackVersion}),
    additionalInvalidResultLimit:1,historyReset:false,originalPaidReplyPreserved:true,
    newCorrectiveProviderRequest:true,nativeReplayed:false,finalApprovalGranted:false};
}

export function prepareRosterToolParameterCommandV1(request){
  if(request.roundKind!=='roster_workflow_experiment_planner'||request.strategyRepairState)return null;
  const assignment=request.promptNodes.find(n=>n.kind==='workflow_role_assignment');
  const task=assignment?.inputs?.parameterRepair?.value??assignment?.inputs?.task?.value,target=parameterTarget(task);
  const props=request.responseFormat?.schema?.properties;
  if(!target||!props?.workOrders||!props.action?.enum.includes('finish'))return null;
  const order=task.failedOrder,slots=target.slots,fields=Object.assign({},...slots.map(slot=>clone(slot.fields)));
  const geometryReference=slots.some(slot=>slot.argument==='formationIntent')
    ?assignment.inputs?.currentSourceContext?.value:null;
  const variants=[obj({kind:tag('supply_parameters'),values:obj(fields)})];
  if(props.action.enum.includes('read'))variants.push(obj({kind:tag('read'),reads:clone(props.reads),catalogueQueries:clone(props.catalogueQueries)}));
  if(props.action.enum.includes('catalogue'))variants.push(obj({kind:tag('catalogue'),catalogueQueries:clone(props.catalogueQueries)}));
  if(props.action.enum.includes('conclude'))variants.push(obj({kind:tag('return_to_owner'),conclusion:clone(props.conclusion),
    unresolvedQuestions:clone(props.unresolvedQuestions)}));
  const schema=obj({publicReason:clone(props.publicReason),command:{anyOf:variants}});
  const contract=createStarcraftTmgOutputContractV1({id:'roster.tool_parameter_command',version:'1.2.0',
    schemaName:'roster_tool_parameter_command_v1',providerSchema:schema,modelOwnedFields:['publicReason','command'],
    hostOwnedFields:['retainedOrder','scope','bindings','argumentSerialization','executionReceipts'],
    mapperRef:{id:'roster.tool_parameter_command',version:'1.2.0',hash:hash('roster.tool_parameter_command.v1.2.joint_entry')},
    semanticValidatorRef:{id:'roster.workflow_read_role_semantics',version:'1.0.0',hash:hash('roster.workflow_read_role_semantics.v1')},
    description:'Explicit parameter values for one source-validated unexecuted method, with unchanged original compiler and Native checks.'});
  const node={kind:'tool_parameter_command',version:1,operation:order.steps.find(s=>s.stepId===target.stepId).operation,
    origin:task.origin??'unexecuted_compile_failure',
    ...(task.sourceResultRef?{originalResultRef:task.sourceResultRef,originalExecuted:true,originalOutcome:'unresolved'}:{}),
    proposedExperiment:{purpose:order.purpose,scope:clone(order.experimentScope),assumptions:clone(order.scenarioAssumptions),
      stop:order.stopAndReturnToModelWhen,proposalIsFact:false},
    unchangedArguments:Object.fromEntries(Object.entries(target.args).filter(([key])=>!slots.some(slot=>key===slot.argument))),
    rejectedValues:slots.map(slot=>({argument:slot.argument,value:clone(target.args[slot.argument])})),parameters:fields,
    currentInputProblem:clone(target.diagnostic),parameterContracts:slots.map(slot=>({sourceContract:slot.sourceContract,argument:slot.argument,version:slot.version})),
    ...(geometryReference?{sourceGeometryReference:clone(geometryReference)}:{}),
    ...(request.promptNodes.find(n=>n.kind==='local_contract_feedback')?{lastCommandErrors:
      clone(request.promptNodes.find(n=>n.kind==='local_contract_feedback').errors)}:{}),
    instruction:'Supply ONLY command={kind:"supply_parameters",values:{...the named parameters...}} plus publicReason. Each parameter is a semantic input, not serialized JSON. The Host replaces only the identified invalid arguments using these explicit values and retains the method, unit, target, parent, bounds, dependencies, completion and unknown questions. Do not restate workOrders, configuration, hashes or JSON pointers. '+slots.map(slot=>slot.instruction??'initiativeRolls are individual explicit conditional die outcomes, NOT die counts or totals, a probability estimate, expected damage or a predicted future fact. The original Native checks still validate count/order/range.').join(' ')+' The currentInputProblem is the source validator diagnosis; historical explanations are not a tool contract. If you cannot choose this assumption, read relevant saved evidence, or return_to_owner with blocked/strategy_required and unresolvedQuestions. This parameter operation cannot approve the hypothesis or change its objective. No witness is unknown, not a refutation. Public reasons only.'};
  // Keep source lookup and any explicitly requested read bodies, not global
  // strategy/draft/menus or old serialized method copies. Those stay in storage.
  const lookupKinds=new Set(['pending_operation_choice_contract','evidence_catalogue_search',
    'catalogue_search_results','exact_read_results','citation_access','immutable_read_progress']);
  const sourceNumbers=new Set(order.steps.flatMap(s=>(s.bindings??[]).map(b=>b.fromEvidenceNumber)).filter(n=>n>0));
  if(geometryReference?.evidenceNumber)sourceNumbers.add(geometryReference.evidenceNumber);
  const nodes=[{...assignment,inputs:{parameterTask:{source:'literal',value:{stepId:target.stepId,
    sourceContracts:slots.map(slot=>slot.sourceContract),methodRetainedByHost:true,acceptanceGranted:false}}}},
    ...request.promptNodes.filter(n=>lookupKinds.has(n.kind)).map(clone),
    ...request.promptNodes.filter(n=>n.kind==='available_evidence_directory').map(n=>({...n,
      entries:n.entries.filter(e=>sourceNumbers.has(e.number))})),node];
  const next={...request,promptNodes:nodes,userMessage:node.instruction,
    strategyRepairState:{originalResponseFormat:clone(request.responseFormat),toolParameterCommand:true,
      failedOrder:clone(order),target:clone(target),scopeHash:hash(assignment.scope)},
    responseFormat:{kind:'provider_strict_json_schema',schemaName:contract.schemaName,
      outputContractRef:outputContractRefStarcraftTmgV1(contract),schema}};
  next.contextHash=hash({priorContextHash:request.contextHash,promptNodes:nodes,userMessage:next.userMessage,responseFormat:next.responseFormat});
  return next;
}

export function projectRosterToolParameterCommandV1({request,output}){
  const reject=(code,detail={})=>({output:null,projection:[],errors:[{code,...detail}]});
  const check=validate(request.responseFormat.schema,output);
  if(!check.ok)return reject('tool_parameter_command_schema',{issues:check.issues});
  const saved=request.strategyRepairState,assignment=request.promptNodes.find(n=>n.kind==='workflow_role_assignment');
  if(!saved?.toolParameterCommand||saved.scopeHash!==hash(assignment.scope))return reject('tool_parameter_scope_changed');
  const command=output.command,result={action:command.kind,publicReason:output.publicReason,reads:clone(command.reads??[]),
    catalogueQueries:clone(command.catalogueQueries??[]),workOrders:[],unresolvedQuestions:[],conclusion:null};
  if(command.kind==='return_to_owner'){
    if(!['blocked','strategy_required'].includes(command.conclusion?.status))return reject('tool_parameter_not_fact_approval');
    return {output:{...result,action:'conclude',conclusion:clone(command.conclusion),unresolvedQuestions:clone(command.unresolvedQuestions)},projection:[],errors:[]};
  }
  if(command.kind!=='supply_parameters')return {output:result,projection:[],errors:[]};
  const order=clone(saved.failedOrder),step=order.steps.find(s=>s.stepId===saved.target.stepId);
  const args=JSON.parse(step.argumentsJson);
  const slots=saved.target.slots??[saved.target.contract]; // Immutable v1 paid requests keep their original mapping.
  for(const slot of slots){
    if(slot.path){
      let at=args;for(const key of slot.path.slice(0,-1))at=at[key];
      at[slot.path.at(-1)]=clone(command.values[slot.valueParameter]);continue;
    }
    if(slot.valueParameter){args[slot.argument]=clone(command.values[slot.valueParameter]);continue;}
    const assembled={};
    for(const [member,name] of Object.entries(slot.members)){
      const keys=member.split('.');let at=assembled;
      for(const key of keys.slice(0,-1))at=at[key]??=( {} );
      at[keys.at(-1)]=clone(command.values[name]);
    }
    args[slot.argument]=assembled;
  }
  step.argumentsJson=JSON.stringify(args);
  return {output:{...result,action:'finish',workOrders:[order]},errors:[],projection:[{
    rule:'source_owned_parameter_assembly_v1',stepId:step.stepId,arguments:slots.map(slot=>slot.argument),modelValues:clone(command.values),
    methodRetained:true,bindingsRetained:true,scopeRetained:true,originalReplyUnchanged:true,nativeExecuted:false,acceptanceGranted:false}]};
}
