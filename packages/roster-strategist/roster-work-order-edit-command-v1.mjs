// Compile rejection has not executed any step of this order. Repair the retained
// method by explicit identity, never infer deletion from an incomplete new batch.
// Runtime repairs keep their existing saved-receipt/replacement settlement path.
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {createStarcraftTmgOutputContractV1,outputContractRefStarcraftTmgV1,
  validateStarcraftTmgProviderJsonSchemaValueV1 as validate} from '../structured-generation/output-contract-registry-v1.mjs';
const clone=structuredClone;
const obj=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const arr=items=>({type:'array',minItems:0,items});
const nullable=value=>({anyOf:[value,{type:'null'}]});
const text={type:'string',minLength:0,maxLength:65536};
// These failures are raised while resolving an observed selection BEFORE any
// work order is published/dispatched. Keep the same author's method as the
// baseline, just as for the separately delegated compile-repair entry.
export function rosterInlineWorkOrderCorrectionV1(request){
  const feedback=request.promptNodes?.find(n=>n.kind==='local_contract_feedback');
  const output=feedback?.originalOutput;
  if(request.roundKind!=='roster_workflow_experiment_planner'||output?.action!=='finish'
    ||output.workOrders?.length!==1||!output.workOrders[0].steps?.length
    ||!feedback.errors?.length||!feedback.errors.every(e=>[
      'ROSTER_WORKFLOW_NATIVE_SELECTION_MATCH_NOT_UNIQUE','ROSTER_WORKFLOW_NATIVE_SELECTION_NOT_PRESENT',
      'ROSTER_WORKFLOW_NATIVE_SELECTION_INVALID',
    ].includes(e.code)))return null;
  return {order:output.workOrders[0],originalOutput:output};
}
export function prepareRosterWorkOrderEditCommandV1(request){
  if(request.roundKind!=='roster_workflow_experiment_planner')return null;
  const assignment=request.promptNodes.find(n=>n.kind==='workflow_role_assignment');
  const task=assignment?.inputs?.task?.value;
  const preparation=request.promptNodes.find(n=>n.kind==='work_order_edit_preparation');
  const inline=rosterInlineWorkOrderCorrectionV1(request);
  const delegated=task?.error?.dispatchOutcome==='not_dispatched'?task.failedOrder:null;
  const order=delegated??(preparation?.repairOrigin==='local_selection_validation'?preparation.baseOrder:null)??inline?.order;
  const repairOrigin=delegated?'delegated_compile_failure':'local_selection_validation';
  const props=request.responseFormat.schema.properties;
  if(!order?.steps?.length||!props.workOrders)return null;
  // The narrower observed-Native-choice command already preserves its one step.
  if(delegated&&order.steps.length===1&&order.steps[0].operation==='native_action')return null;
  const schema=obj({action:{...text,enum:[...props.action.enum.filter(a=>['read','catalogue','finish','conclude'].includes(a))
    .map(a=>a==='finish'?'patch':a),...(preparation?['confirm']:[])]},publicReason:clone(props.publicReason),reads:clone(props.reads),
    catalogueQueries:clone(props.catalogueQueries),stepEdits:nullable(obj({
      upsert:arr(obj({step:clone(props.workOrders.items.properties.steps.items),beforeStepId:nullable(text)})),
      remove:arr(obj({stepId:text,reason:{...text,minLength:1}}))})),
    completionStepId:nullable(text),conclusion:clone(props.conclusion),unresolvedQuestions:clone(props.unresolvedQuestions)});
  const contract=createStarcraftTmgOutputContractV1({id:'roster.work_order_edit_command',version:'2.3.0',
    schemaName:'roster_work_order_edit_command_v1',providerSchema:schema,modelOwnedFields:Object.keys(schema.properties),
    hostOwnedFields:['orderId','experimentScope','retainedSteps','executionReceipts'],
    mapperRef:{id:'roster.work_order_edit_command',version:'2.3.0',hash:hash('roster.work_order_edit_command.v2.3')},
    semanticValidatorRef:{id:'roster.workflow_read_role_semantics',version:'1.0.0',hash:hash('roster.workflow_read_role_semantics.v1')},
    description:'Explicit incremental edit of one unexecuted compile-failed method; original compiler and Native gates unchanged.'});
  const node={kind:'work_order_edit_command',version:2,positionContractVersion:2,repairOrigin,orderId:order.orderId,
    currentRejection:clone(task?.error??request.promptNodes.find(n=>n.kind==='local_contract_feedback')?.errors??null),
    proposalAuthority:false,
    currentDelegation:clone(request.promptNodes.find(n=>n.kind==='pending_operation_choice_contract')??null),
    retainedOrder:clone(preparation?.order??order),
    pendingStepIds:(preparation?.order??order).steps.map(s=>s.stepId),completionStepId:(preparation?.order??order).completionStepId,
    instruction:'Edit the retained failedOrder; omission NEVER cancels a pending step. action=patch uses stepEdits.upsert [{step,beforeStepId}] and remove [{stepId,reason}]. Supply only complete changed/new steps. Existing stepId replaces that step in place; beforeStepId=null preserves its position (appends a NEW step), a named existing step explicitly inserts/moves before it. Deletion requires remove with the exact stepId and reason. completionStepId=null keeps the original completion target; a string explicitly changes it. Do not restate the entire workOrder or change its scope, purpose, participants or assumptions. Other pending steps and already-saved evidence/tool capabilities remain available; a preliminary read does not complete the retained method. read/catalogue have stepEdits=null and completionStepId=null, and only retrieve saved evidence. New required queries can be explicit prerequisite steps; never fabricate their results or repeat completed actions. If this method needs a new objective or cannot be repaired within its scope, conclude strategy_required/blocked with exact evidence and unresolvedQuestions; do not silently drop its tail or claim answered. A patch is only a proposed method, still subject to the same source, dependency, scope and Native legality checks.'};
  node.instruction+=' If a patch also requests reads/catalogueQueries, it is PREPARATION ONLY: Host retains the proposed edits, performs those immutable queries, and returns their actual results before any method submission. Subsequent patch edits the retained UNCONFIRMED proposal incrementally; omissions preserve it. With a pending proposal, confirm with stepEdits=null, completionStepId=null, reads=[] and catalogueQueries=[] explicitly submits that exact proposal through the original compiler. It does not approve its legality. read/catalogue alone preserve the pending proposal. Never repeat successful actions. Missing/error query paths remain missing, and changing dependencies invalidates reuse.';
  node.instruction+=' Anchoring an EXISTING step before itself is an explicit no-move replacement, equivalent in position to beforeStepId=null. A NEW step cannot anchor to itself.';
  node.instruction='Repair currentRejection, not an older failure mentioned in retainedOrder prose. retainedOrder is an UNAPPROVED model proposal; its purpose/assumptions do not authorize a step forbidden by currentDelegation. An unchanged step reported as work_after_delegated_completion remains invalid even if completionStepId or another step changes. Explicit remove with a reason may remove an undelegated child step; it does NOT cancel the parent-owned queued successor. Host never removes it silently. If this cannot be repaired within the current delegation, return strategy_required/blocked instead of resubmitting the same refusal. '+node.instruction;
  if(repairOrigin==='local_selection_validation')node.instruction+=' This is the SAME retained method, rejected before dispatch by current-source selection validation. Treat retainedOrder as an UNCONFIRMED proposal, not a true statement of available actions. Repair the reported selection using the actual current finiteActions/parameterDomains or return strategy_required with the original question unresolved. A capability-reference route marked executable_exact describes implementation support, NOT membership in the current menu. matchCount=0 means the requested identity is absent; it is not a request to repeat the same selection or merely add parameters. Host will not pick a replacement action. If the original method purpose itself must change, return it to the owner rather than changing its scope through a step patch.';
  const nodes=request.promptNodes.map(n=>repairOrigin==='local_selection_validation'&&n.kind==='local_contract_feedback'
    ?Object.fromEntries([...Object.entries(n).filter(([key])=>key!=='originalOutput'),['originalOutputRetainedByHost',true]]) :n);
  const next={...request,strategyRepairState:{originalResponseFormat:clone(request.responseFormat),failedOrder:clone(order),
      repairOrigin,...(inline?{originalOutput:clone(inline.originalOutput)}:{}),
      ...(preparation?{preparation:clone(preparation)}:{})},
    promptNodes:[...nodes,node],userMessage:node.instruction,
    responseFormat:{kind:'provider_strict_json_schema',schemaName:contract.schemaName,
      outputContractRef:outputContractRefStarcraftTmgV1(contract),schema}};
  next.contextHash=hash({priorContextHash:request.contextHash,promptNodes:next.promptNodes,userMessage:next.userMessage,responseFormat:next.responseFormat});
  return next;
}
export function projectRosterWorkOrderEditCommandV1({request,output,preparationOnly=false}){
  const reject=(code,detail={})=>({output:null,projection:[],errors:[{code,...detail}]});
  const checked=validate(request.responseFormat.schema,output);
  if(!checked.ok)return reject('work_order_edit_schema',{issues:checked.issues});
  const result={action:output.action,publicReason:output.publicReason,reads:clone(output.reads),
    catalogueQueries:clone(output.catalogueQueries),workOrders:[],conclusion:clone(output.conclusion),
    unresolvedQuestions:clone(output.unresolvedQuestions)};
  const pending=request.strategyRepairState?.preparation;
  const original=request.strategyRepairState?.failedOrder;
  const assignment=request.promptNodes.find(n=>n.kind==='workflow_role_assignment');
  if(pending&&(pending.baseOrderHash!==hash(original)||pending.scopeHash!==hash(assignment.scope)))
    return reject('work_order_edit_preparation_stale');
  if(output.action!=='patch'&&(output.stepEdits!==null||output.completionStepId!==null)
    ||output.action!=='conclude'&&output.conclusion!==null)return reject('work_order_edit_mixed_operations');
  if(output.action==='conclude'&&!['blocked','strategy_required'].includes(output.conclusion?.status))
    return reject('work_order_edit_not_fact_approval');
  const confirming=output.action==='confirm';
  if(confirming&&(!pending||output.reads.length||output.catalogueQueries.length))
    return reject('work_order_edit_confirmation_requires_saved_proposal_and_no_queries');
  if(output.action!=='patch'&&!confirming)return {output:result,projection:[],errors:[]};
  const hasQueries=output.reads.length+output.catalogueQueries.length>0;
  const canPrepare=preparationOnly||request.promptNodes.some(n=>n.kind==='work_order_edit_command'&&n.version>=2);
  if(!confirming&&(!output.stepEdits||hasQueries&&!canPrepare))return reject('work_order_edit_requires_patch_only');
  const edits=output.stepEdits??{upsert:[],remove:[]};
  const order=clone(pending?.order??original);
  if(!order?.steps?.length)return reject('work_order_edit_original_missing');
  const ids=order.steps.map(s=>s.stepId),seen=new Set(),positionProjection=[];
  if(new Set(ids).size!==ids.length)return reject('work_order_edit_ambiguous_original');
  for(const removal of edits.remove){
    if(seen.has(removal.stepId)||!removal.reason.trim()||!ids.includes(removal.stepId))
      return reject('work_order_edit_invalid_remove',{stepId:removal.stepId});
    seen.add(removal.stepId);order.steps=order.steps.filter(s=>s.stepId!==removal.stepId);
  }
  for(const edit of edits.upsert){
    const id=edit.step.stepId;
    if(!id.trim()||seen.has(id))return reject('work_order_edit_conflicting_id',{stepId:id});
    seen.add(id);
    const index=order.steps.findIndex(s=>s.stepId===id);
    if(edit.beforeStepId!==null){
      if(edit.beforeStepId===id&&index>=0){
        order.steps[index]=clone(edit.step);
        positionProjection.push({rule:'existing_step_self_anchor_no_move_v1',stepId:id,position:index,
          modelParametersUnchanged:true});
        continue;
      }
      if(!order.steps.some(s=>s.stepId===edit.beforeStepId))
        return reject('work_order_edit_invalid_before',{stepId:id,beforeStepId:edit.beforeStepId});
      if(index>=0)order.steps.splice(index,1);
      order.steps.splice(order.steps.findIndex(s=>s.stepId===edit.beforeStepId),0,clone(edit.step));
    }else if(index>=0)order.steps[index]=clone(edit.step);
    else order.steps.push(clone(edit.step));
  }
  if(output.completionStepId!==null)order.completionStepId=output.completionStepId;
  if(!order.steps.length||order.completionStepId&&!order.steps.some(s=>s.stepId===order.completionStepId))
    return reject('work_order_edit_completion_missing',{completionStepId:order.completionStepId});
  // Both explicit reads and implicit source-delivery prerequisites must retain
  // this SAME merged proposal. A candidate is not submitted or approved merely
  // because the mapper can reconstruct it.
  const preparationCandidate={version:1,order:clone(order),baseOrder:clone(original),
    repairOrigin:request.strategyRepairState?.repairOrigin??'delegated_compile_failure',
    baseOrderHash:hash(original),scopeHash:hash(assignment.scope),approved:false};
  if(hasQueries){
    result.action=output.reads.length?'read':'catalogue';
    return {output:result,preparation:preparationCandidate,
      projection:[...positionProjection,{rule:'work_order_read_preparation_v1',originalAction:output.action,proposalSubmitted:false,
        originalReplyUnchanged:true,nativeExecuted:false}],errors:[]};
  }
  result.action='finish';result.workOrders=[order];
  return {output:result,preparationCandidate,projection:[...positionProjection,{rule:'model_authored_work_order_edits_v1',orderId:order.orderId,
    upsertedStepIds:edits.upsert.map(e=>e.step.stepId),removedStepIds:edits.remove.map(e=>e.stepId),
    retainedStepIds:ids.filter(id=>!seen.has(id)),scopeRetained:true,nativeExecuted:false}],errors:[]};
}

// Old paid v1 commands keep their old semantics. The explicitly recorded
// recovery may import ONLY a schema-valid mixed command into preparation;
// it cannot turn the old reply into an approved method or replay a mutation.
export function projectRosterSavedWorkOrderPreparationV1({request,output}){
  if(!request?.promptNodes?.some(n=>n.kind==='work_order_edit_command'&&n.version===1)
    ||output?.action!=='patch'||!output.stepEdits||!((output.reads?.length??0)+(output.catalogueQueries?.length??0)))return null;
  const result=projectRosterWorkOrderEditCommandV1({request,output,preparationOnly:true});
  return result.preparation&&!result.errors.length?result:null;
}
