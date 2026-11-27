import {upgradeRosterStaticFormationSchemaV1} from './roster-semantic-parameters-v1.mjs';
// Partial transport repair preserves the selected method. Source-defined semantic
// fields and scene choice stay with the model; Host owns ids/order/serialization.
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {projectRosterHostStepKindsV1,rosterHostStepKindWireSchemaV1} from './roster-host-step-kind-v1.mjs';
import {createStarcraftTmgOutputContractV1,outputContractRefStarcraftTmgV1,validateStarcraftTmgHostJsonSchemaValueV1 as validate} from '../structured-generation/output-contract-registry-v1.mjs';
const clone=structuredClone,obj=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const variants=s=>s.anyOf??[s],tag=kind=>({type:'string',minLength:1,maxLength:64,enum:[kind]});
function pendingRepair(request,output){
 const schema=request.strategyRepairState?.hostStepKindSchema;
  const mode=output?.command?.kind;
  if(!schema||!['submit_work_orders','patch'].includes(mode))return null;
  const entries=mode==='patch'?output.command.stepEdits?.upsert:output.command.workOrders?.flatMap(o=>o.steps??[]);
  if(!entries?.length)return null;
 const diagnosed=projectRosterHostStepKindsV1(schema,output);
 if(!diagnosed.errors.length||diagnosed.errors.some(e=>e.code!=='operation_step_parameters_invalid'))return null;
  const submit=variants(schema.properties.command).find(v=>v.properties.kind.enum[0]===mode);
 if(!submit)return null;
 // Validate all unchanged method fields independently of the invalid step bodies.
  const outer=clone(schema),body=clone(output),outerSubmit=variants(outer.properties.command).find(v=>v.properties.kind.enum[0]===mode);
 const heldFields=['stepId','guards','publicReason'];
  const editBody=s=>variants(s.properties.stepEdits).find(v=>v.type==='object');
  const stepSchema=mode==='patch'?editBody(submit)?.properties.upsert.items.properties.step:submit.properties.workOrders.items.properties.steps.items;
  if(!stepSchema)return null;
  const originalStep=variants(stepSchema)[0],heldSchema=obj(Object.fromEntries(heldFields.map(k=>[k,clone(originalStep.properties[k])])));
  const held=step=>Object.fromEntries(heldFields.map(k=>[k,clone(step[k])]));
  if(mode==='patch'){
    editBody(outerSubmit).properties.upsert.items.properties.step=heldSchema;
    for(const entry of body.command.stepEdits.upsert)entry.step=held(entry.step);
  }else{
    outerSubmit.properties.workOrders.items.properties.steps.items=heldSchema;
    for(const order of body.command.workOrders)order.steps=order.steps.map(held);
  }
 if(!validate(outer,body).ok)return null;
 const targets=[];
 for(const e of diagnosed.errors){
    const match=(mode==='patch'?/^\/command\/stepEdits\/upsert\/(\d+)\/step$/u:/^\/command\/workOrders\/(\d+)\/steps\/(\d+)$/u).exec(e.path);if(!match)return null;
    const location=mode==='patch'?{editIndex:Number(match[1])}:{orderIndex:Number(match[1]),stepIndex:Number(match[2])};
    const step=mode==='patch'?output.command.stepEdits.upsert[location.editIndex]?.step:output.command.workOrders[location.orderIndex]?.steps?.[location.stepIndex];
    const options=variants(stepSchema)
   .filter(s=>s.properties.operation.enum.includes(step?.operation)).map(s=>{const copy=clone(s);
    for(const held of ['stepId','guards','publicReason']){delete copy.properties[held];copy.required=copy.required.filter(k=>k!==held);}
    copy.properties.operation.enum=[step.operation];return copy;});
  if(!step||!options.length)return null;
    targets.push({key:'step'+(targets.length+1),...location,stepId:step.stepId,operation:step.operation,
   parameterSchema:options.length===1?options[0]:{anyOf:options},diagnostic:e});
 }
  return {schema,targets,mode};
}
export function prepareRosterOperationStepRepairV1(request){
 if(request.operationStepRepairState)return request;
 const feedback=request.promptNodes.find(n=>n.kind==='local_contract_feedback'),baseline=feedback?.originalOutput;
  if(!feedback?.errors?.length||!feedback.errors.every(e=>['experiment_operation_command_schema','work_order_edit_schema','operation_step_parameters_invalid'].includes(e.code)))return request;
 const pending=pendingRepair(request,baseline);if(!pending)return request;
 const internal=clone(pending.schema),commandVariants=variants(internal.properties.command);
 commandVariants.push(obj({kind:tag('repair_steps'),repairs:obj(Object.fromEntries(pending.targets.map(t=>[t.key,t.parameterSchema])))}));
  // An incremental repair already retains its full edit transaction. Do not
  // resend the entire all-tools patch schema alongside the one failed step.
  internal.properties.command={anyOf:pending.mode==='patch'?commandVariants.filter(v=>v.properties.kind.enum[0]!=='patch'):commandVariants};
  const schema=rosterHostStepKindWireSchemaV1(internal),version='1.1.0';
 const contract=createStarcraftTmgOutputContractV1({id:'roster.operation_step_repair',version,schemaName:'roster_operation_step_repair_v1',providerSchema:schema,
  modelOwnedFields:Object.keys(schema.properties),hostOwnedFields:['stepId','guards','step.publicReason','artifactRef','acceptanceGranted'],
   mapperRef:{id:'roster.operation_step_repair',version,hash:hash('roster.operation_step_repair.v1.1.submit-and-edit')},
  semanticValidatorRef:{id:'roster.workflow_read_role_semantics',version:'1.0.0',hash:hash('roster.workflow_read_role_semantics.v1')},
  description:'Correct only explicitly selected semantic parameter fields; retain the unchanged method and Native checks.'});
  const node={kind:'operation_step_parameter_repair',version:2,mode:pending.mode,sourceReplyRef:feedback.originalReplyRef,
  targets:pending.targets.map(({parameterSchema,...t})=>t),
   retainedOrders:(baseline.command.workOrders??[request.strategyRepairState.failedOrder]).filter(Boolean).map(o=>({orderId:o.orderId,purpose:o.purpose,scenarioAssumptions:o.scenarioAssumptions,
   completionStepId:o.completionStepId,stopAndReturnToModelWhen:o.stopAndReturnToModelWhen,stepIds:o.steps.map(s=>s.stepId)})),
   instruction:'The prior method has NOT executed. Use command.kind=repair_steps and fill ONLY the named repairs fields with semantic parameters and an explicit actual sceneSource. Host retains every other step, ids, guards, comparison scope, ordering, stop boundary, edit positions and original unknowns. Do not copy old argumentsJson for a source-defined parameters interface, and do not add step.kind. Read a missing saved source first; reading does not select it or approve it. A saved_scene choice refers only to its displayed exact identity, never the scene mentioned in prose; prior_step names an actual earlier step in this batch, never a placeholder for a saved scene. '+
    (pending.mode==='patch'?'This local form retains the existing edit transaction; it does not request a full patch rewrite. ':'Full submit_work_orders remains available for an intentional method change. ')+
    'Conclude remains available under the original role contract. All ordinary source/compiler/Native checks still run.'};
  const next={...request,operationStepRepairState:{version:2,mode:pending.mode,originalOutput:clone(baseline),sourceReplyRef:feedback.originalReplyRef,
  targets:pending.targets.map(({parameterSchema,diagnostic,...t})=>t),internalSchema:internal,originalResponseFormat:clone(request.responseFormat)},
  strategyRepairState:{...request.strategyRepairState,originalOutput:clone(baseline)},
  promptNodes:[...request.promptNodes.map(n=>n===feedback?{...n,originalOutput:undefined,originalOutputRetainedByHost:true,errors:pending.targets.map(t=>t.diagnostic)}:n),node],
  userMessage:request.userMessage+'\n'+node.instruction,responseFormat:{kind:'provider_strict_json_schema',schemaName:contract.schemaName,outputContractRef:outputContractRefStarcraftTmgV1(contract),schema}};
 next.contextHash=hash({priorContextHash:request.contextHash,promptNodes:next.promptNodes,userMessage:next.userMessage,responseFormat:next.responseFormat});return next;
}
export function projectRosterOperationStepRepairV1({request,output}){
 const state=request.operationStepRepairState;if(!state)return null;
 const {operationStepRepairState,...base}=request;const restored={...base,responseFormat:state.originalResponseFormat};
 if(output?.command?.kind!=='repair_steps')return {request:restored,output,projection:[],errors:[]};
 const localSchema=upgradeRosterStaticFormationSchemaV1(state.internalSchema);
 const kinds=projectRosterHostStepKindsV1(localSchema,output);
 if(kinds.errors.length)return {output:null,projection:[],errors:kinds.errors};
 const checked=validate(localSchema,kinds.output);
 if(!checked.ok)return {output:null,projection:[],errors:[{code:'operation_step_repair_schema',issues:checked.issues}]};
 const result=clone(state.originalOutput);result.publicReason=output.publicReason;
  if(state.mode!=='patch')result.unresolvedQuestions=[...new Set([...result.unresolvedQuestions,...output.unresolvedQuestions])];
  for(const t of state.targets){const original=state.mode==='patch'?result.command.stepEdits.upsert[t.editIndex].step:result.command.workOrders[t.orderIndex].steps[t.stepIndex];
   const repaired={...clone(kinds.output.command.repairs[t.key]),stepId:original.stepId,guards:clone(original.guards),publicReason:original.publicReason};
   if(state.mode==='patch')result.command.stepEdits.upsert[t.editIndex].step=repaired;
   else result.command.workOrders[t.orderIndex].steps[t.stepIndex]=repaired;}
 restored.strategyRepairState={...restored.strategyRepairState,hostStepKindSchema:upgradeRosterStaticFormationSchemaV1(restored.strategyRepairState.hostStepKindSchema)};
 return {request:restored,output:result,errors:[],projection:[...kinds.projection,{rule:'explicit_operation_step_parameter_repair_v1',
  sourceReplyRef:state.sourceReplyRef,stepIds:state.targets.map(t=>t.stepId),methodControlRetained:true,nativeExecuted:false,sourceApproved:false}]};
}
export function projectRosterOperationStepFeedbackRecoveryV1({work,reply,request}){
 if(work?.role!=='roster_workflow_experiment_planner'||work.status!=='needs_repair'||work.operationState?.pending
  ||work.failure?.dispatchOutcome!=='completed_invalid'||request.operationStepRepairState)return null;
 const assignment=request.promptNodes?.find(n=>n.kind==='workflow_role_assignment');
 if(assignment?.workId!==work.id||Object.entries(work.bindings).some(([k,v])=>assignment.scope?.[k]!==v))return null;
 const errors=work.operationState?.correction?.errors;
  if(!errors?.length||!errors.every(e=>['experiment_operation_command_schema','work_order_edit_schema','operation_step_parameters_invalid'].includes(e.code))
  ||!pendingRepair(request,reply?.output))return null;
 const feedback=request.promptNodes?.find(n=>n.kind==='local_contract_feedback');
 const sourceMismatch=reply.output?.command?.kind==='patch'
  &&!feedback?.originalOutput?.command
  &&feedback?.errors?.length&&feedback.errors.every(e=>e.code==='operation_step_parameters_invalid'
    &&e.path?.startsWith('/command/stepEdits/'));
 const version=sourceMismatch?2:1;
 return {workId:work.id,originalReplyRef:work.operationState.correction.originalReplyRef,repairKind:'operation_step_parameters',
  feedbackVersion:sourceMismatch?'e251-rejected-wire-feedback-source-v2':'e207-step-parameters-v1',
  rejectedWireFeedbackSourceRepaired:sourceMismatch,
  recoveryKey:hash({workId:work.id,repairKind:'operation_step_parameters',version}),
  additionalInvalidResultLimit:1,historyReset:false,originalPaidReplyPreserved:true,newCorrectiveProviderRequest:true,
  nativeReplayed:false,finalApprovalGranted:false,
   instruction:'The source interface now exposes the failed operation parameter fields for both initial submission and incremental edits. Choose the actual saved scene and semantic values; Host retains the original method, edit positions and successful measurements. One semantic correction through the product form, no regenerated complete method, Native replay, Host scene selection, discarded unknowns or reset of old fees/counters. This recovery cannot recur after the form is delivered.'};
}
