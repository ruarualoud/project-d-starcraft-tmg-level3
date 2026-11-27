import {rosterHostStepKindWireSchemaV1,projectRosterHostStepKindsV1,rosterHostStepKindInstructionV1} from './roster-host-step-kind-v1.mjs';
import {prepareRosterOperationStepRepairV1,projectRosterOperationStepRepairV1} from './roster-operation-step-repair-v1.mjs';
import {rosterSemanticParameterStepSchemaV1,projectRosterSemanticParameterStepV1,ROSTER_SEMANTIC_PARAMETER_INSTRUCTION_V1,ROSTER_SEMANTIC_CONTEXT_INSTRUCTION_V2,ROSTER_SEMANTIC_COMPARISON_INSTRUCTION_V3} from './roster-semantic-parameters-v1.mjs';
import {isDeepStrictEqual} from 'node:util';
import {createRosterWorkflowGraphV1} from './roster-workflow-graph-v1.mjs';
import {rosterMethodPartitionContextV1,partitionRosterUnexecutedMethodV1} from './roster-work-order-partition-v1.mjs';
import {rosterDelegatedMethodControlV1,ROSTER_DELEGATED_METHOD_CONTROL_INSTRUCTION_V1,ROSTER_METHOD_DEPENDENCIES_V1} from './roster-delegated-method-control-v1.mjs';
import {rosterSavedSceneChoicesV1,rosterSavedSceneStepSchemaV1,projectRosterSavedSceneStepV1,rosterRetainedSpatialStepsV1,replaceRosterStepSceneV1,ROSTER_SAVED_SCENE_INSTRUCTION_V4} from './roster-saved-scene-choice-v1.mjs';
import {projectRosterEmptyCandidateFieldsV1,rosterComparisonCandidateChoicesV1,rosterComparisonCandidateStepSchemaV1,projectRosterComparisonCandidateStepV1,ROSTER_COMPARISON_CANDIDATE_INSTRUCTION_V1} from './roster-comparison-candidate-choice-v1.mjs';
import {JOINT_TEMPORAL_INPUT} from './pregame-joint-temporal-v1.mjs';
// Compile rejection has not executed any step of this order. Repair the retained
// method by explicit identity, never infer deletion from an incomplete new batch.
// Runtime repairs keep their existing saved-receipt/replacement settlement path.
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {createStarcraftTmgOutputContractV1,outputContractRefStarcraftTmgV1,
  validateStarcraftTmgHostJsonSchemaValueV1 as validate} from '../structured-generation/output-contract-registry-v1.mjs';
const clone=structuredClone;
const obj=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const arr=items=>({type:'array',minItems:0,items});
const nullable=value=>({anyOf:[value,{type:'null'}]});
const text={type:'string',minLength:0,maxLength:65536};
// Each operation exposes only its own model-owned fields. The Host expands the
// explicit command into the existing editor input; saved v2 replies keep v2.
function operationCommandSchema(schema){
  const p=schema.properties,tag=action=>({...text,minLength:1,enum:[action]});
  return obj({publicReason:clone(p.publicReason),command:{anyOf:p.action.enum.map(action=>{
    const names=action==='patch'?Object.keys(p).filter(k=>!['action','publicReason','conclusion','unresolvedQuestions','sceneStepId','sceneId'].includes(k))
      :action==='select_saved_scene'?['sceneStepId','sceneId']
      :['read','catalogue'].includes(action)?['reads','catalogueQueries']
      :action==='conclude'?['conclusion','unresolvedQuestions']:[];
    return obj({kind:tag(action),...Object.fromEntries(names.map(k=>[k,clone(action==='select_saved_scene'?p[k].anyOf.find(s=>s.type!=='null'):p[k])]))});
  })}});
}
function assignedComparisonPurpose(task){
  const error=task?.error,detail=error?.detail;
  return error?.dispatchOutcome==='not_dispatched'&&error.code==='ROSTER_COMPARISON_BINDING_INVALID'
    &&detail?.reason==='assigned_comparison_requires_binding'
    &&Number.isSafeInteger(detail.purposeEvidenceNumber)&&detail.purposeEvidenceNumber>0
    ?detail.purposeEvidenceNumber:null;
}
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
import {ROSTER_FORMATION_SELECTOR_COMMAND_INTERFACE_V1} from './roster-formation-selection-contract-v1.mjs';
import {ROSTER_COMPARISON_SCENE_SOURCE_INTERFACE_V1} from './roster-comparison-scene-contract-v1.mjs';
import {prepareRosterToolParameterCommandV1} from './roster-tool-parameter-command-v1.mjs';
import {PREGAME_MAP_WORKFLOW_CONTRACTS_V1} from './pregame-map-evidence-port-v1.mjs';
import {SINGLE_UNIT_TEMPORAL_INPUT,SINGLE_UNIT_TEMPORAL_BINDING_CONTRACT,
  inspectSingleUnitTemporalBindingsV1} from './pregame-single-unit-temporal-v1.mjs';
export function prepareRosterWorkOrderEditCommandV1(request,{sourceStateIdentities=[]}={}){
  const parameters=prepareRosterToolParameterCommandV1(request);if(parameters)return parameters;
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
  const delegation=request.promptNodes.find(n=>n.kind==='pending_operation_choice_contract');
  const delegatedControl=rosterDelegatedMethodControlV1(request,{retainedOrder:preparation?.order??order});
  const sceneChoices=rosterSavedSceneChoicesV1(request,{sourceStateIdentities});
  const candidateChoices=rosterComparisonCandidateChoicesV1(request);
  const sceneSteps=sceneChoices.length?rosterRetainedSpatialStepsV1(preparation?.order??order,4):[];
  const canInheritComparison=!delegatedControl&&Boolean(delegation?.delegatedComparison?.targetWorkId
    &&delegation.delegatedComparison.binding?.schema==='roster_comparison_observation_binding_v1');
  const retainedBinding=(preparation?.order??order).experimentScope?.comparisonBinding;
  const assignedPurpose=assignedComparisonPurpose(task);
  const bindingSchema=props.workOrders.items.properties.experimentScope?.properties?.comparisonBinding
    ?.anyOf?.find(s=>s.type==='object');
  const partitionContext=delegatedControl?null:rosterMethodPartitionContextV1(request,order);
  const canAssignComparison=!delegatedControl&&Boolean(!retainedBinding&&assignedPurpose&&bindingSchema);
  const canEditComparisonStage=!delegatedControl&&Boolean(retainedBinding&&Number.isSafeInteger(retainedBinding.purposeEvidenceNumber)
    &&retainedBinding.purposeEvidenceNumber>0&&typeof retainedBinding.arm==='string'
    &&Array.isArray(retainedBinding.measurementNumbers)&&retainedBinding.measurementNumbers.length
    &&retainedBinding.measurementNumbers.every(n=>Number.isSafeInteger(n)&&n>0));
  // The narrower observed-Native-choice command already preserves its one step.
  if(delegated&&order.steps.length===1&&order.steps[0].operation==='native_action')return null;
  const editSchema=obj({action:{...text,enum:[...props.action.enum.filter(a=>['read','catalogue','finish','conclude'].includes(a))
    .map(a=>a==='finish'?'patch':a),...(preparation?['confirm']:[]),...(sceneSteps.length&&props.action.enum.includes('finish')?['select_saved_scene']:[]),...(delegatedControl&&props.action.enum.includes('finish')?['resubmit']:[])]},publicReason:clone(props.publicReason),reads:clone(props.reads),
    catalogueQueries:clone(props.catalogueQueries),stepEdits:nullable(obj({
      upsert:arr(obj({step:rosterSemanticParameterStepSchemaV1(rosterComparisonCandidateStepSchemaV1(rosterSavedSceneStepSchemaV1(props.workOrders.items.properties.steps.items,sceneChoices,4),candidateChoices),sceneChoices),beforeStepId:nullable(text)})),
      remove:arr(obj({stepId:text,reason:{...text,minLength:1}}))})),
    completionStepId:nullable(text),
    ...(sceneSteps.length?{sceneStepId:nullable({...text,minLength:1,enum:sceneSteps.map(s=>s.stepId)}),sceneId:nullable({...text,minLength:1,enum:sceneChoices.map(s=>s.sceneId)})}:{}),
    ...(partitionContext?{comparisonPartitions:nullable(arr(obj({arm:{...text,enum:['current','alternative','shared']},stage:{...text,enum:['prerequisite','baseline','effect_endpoint']},stepIds:arr(text),observationStepIds:arr(text),completionStepId:text})))}:{}),
    ...(canInheritComparison?{comparisonBindingEdit:nullable({...text,enum:['inherit_delegated']})}:{}),
    ...(canAssignComparison?{comparisonAssignmentEdit:nullable(obj(Object.fromEntries(
      Object.entries(bindingSchema.properties).filter(([key])=>key!=='purposeEvidenceNumber').map(([key,value])=>[key,clone(value)]))))}:{}),
    ...(canEditComparisonStage?{comparisonStageEdit:nullable(obj({
      stage:{...text,enum:['prerequisite','baseline','effect_endpoint']},observationStepIds:arr(text)}))}:{}),
    conclusion:clone(props.conclusion),unresolvedQuestions:clone(props.unresolvedQuestions)});
  const hostStepKindSchema=operationCommandSchema(editSchema);
  const schema=rosterHostStepKindWireSchemaV1(hostStepKindSchema);
  const hasHypothesis=candidateChoices.some(choice=>choice.opponentHypothesis);
  const version=hasHypothesis?'3.14.0':'3.13.0';
  const contract=createStarcraftTmgOutputContractV1({id:'roster.work_order_edit_command',version,
    schemaName:'roster_work_order_edit_command_v1',providerSchema:schema,modelOwnedFields:Object.keys(schema.properties),
    hostOwnedFields:['step.kind','orderId','experimentScope','retainedSteps','executionReceipts'],
    mapperRef:{id:'roster.work_order_edit_command',version,hash:hash(hasHypothesis?'roster.work_order_edit_command.v3.14.hypothetical_opponent':'roster.work_order_edit_command.v3.13.single_temporal_parameters')},
    semanticValidatorRef:{id:'roster.workflow_read_role_semantics',version:'1.0.0',hash:hash('roster.workflow_read_role_semantics.v1')},
    description:'Explicit incremental edit of one unexecuted compile-failed method; original compiler and Native gates unchanged.'});
  const node={kind:'work_order_edit_command',version:2,commandFormVersion:1,positionContractVersion:3,mapArgumentContractVersion:2,repairOrigin,orderId:order.orderId,
    methodDependencies:clone(ROSTER_METHOD_DEPENDENCIES_V1),
    ...(delegatedControl?{delegatedControlVersion:1,delegatedControl}:{}),
    hostStepKindVersion:1,savedSceneChoiceVersion:4,savedSceneChoices:sceneChoices,candidateFieldOwnershipVersion:2,semanticParameterVersion:3,comparisonCandidateChoiceVersion:hasHypothesis?2:1,comparisonCandidateChoices:candidateChoices,
    ...(sceneSteps.length?{sceneOnlyEditVersion:1,sceneEditableSteps:sceneSteps}:{}),
    currentOperationInterfaces:{...(order.steps.some(step=>step.operation==='bounded_joint_temporal')?{bounded_joint_temporal:{inputContract:clone(JOINT_TEMPORAL_INPUT),bindingContract:clone(JOINT_TEMPORAL_INPUT.bindingContract)}}:{}),...(order.steps.some(step=>step.operation==='formation_scene')
      ?{formation_scene:clone(ROSTER_FORMATION_SELECTOR_COMMAND_INTERFACE_V1)}:{}),
      ...(order.steps.some(step=>step.operation==='bounded_unit_temporal')
        ?{bounded_unit_temporal:{inputContract:clone(SINGLE_UNIT_TEMPORAL_INPUT),bindingContract:clone(SINGLE_UNIT_TEMPORAL_BINDING_CONTRACT)}}:{}),
      ...Object.fromEntries(order.steps.filter(step=>PREGAME_MAP_WORKFLOW_CONTRACTS_V1[step.operation])
        .map(step=>[step.operation,clone(PREGAME_MAP_WORKFLOW_CONTRACTS_V1[step.operation])])),
      ...(order.steps.some(step=>step.operation==='spatial')
        ?{spatial_parent_state:clone(ROSTER_COMPARISON_SCENE_SOURCE_INTERFACE_V1)}:{})},
    currentRejection:clone(request.promptNodes.find(n=>n.kind==='local_contract_feedback')?.errors??task?.error??null),
    ...(task?.error?{retainedMethodRejection:clone(task.error)}:{}),
    proposalAuthority:false,
    ...(partitionContext?{methodPartitionVersion:1,approvedArmParticipants:Object.fromEntries(Object.entries(partitionContext.arms).map(([arm,units])=>[arm,units.map(u=>u.unitInstanceId)]))}:{}),
    currentDelegation:clone(delegation??null),
    ...(canInheritComparison?{comparisonBindingEditVersion:1}:{}),
    ...(canAssignComparison?{comparisonAssignmentEditVersion:1,assignedPurposeEvidenceNumber:assignedPurpose}:{}),
    ...(canEditComparisonStage?{comparisonStageEditVersion:1}:{}),
    retainedOrder:clone(preparation?.order??order),
    pendingStepIds:(preparation?.order??order).steps.map(s=>s.stepId),completionStepId:(preparation?.order??order).completionStepId,
    instruction:'Edit the retained failedOrder; omission NEVER cancels a pending step. action=patch uses stepEdits.upsert [{step,beforeStepId}] and remove [{stepId,reason}]. Supply only complete changed/new steps. Existing stepId replaces that step in place; beforeStepId=null preserves its position (appends a NEW step), a named existing step explicitly inserts/moves before it. Deletion requires remove with the exact stepId and reason. completionStepId=null keeps the original completion target; a string explicitly changes it. Do not restate the entire workOrder or change its scope, purpose, participants or assumptions. Other pending steps and already-saved evidence/tool capabilities remain available; a preliminary read does not complete the retained method. read/catalogue have stepEdits=null and completionStepId=null, and only retrieve saved evidence. New required queries can be explicit prerequisite steps; never fabricate their results or repeat completed actions. If this method needs a new objective or cannot be repaired within its scope, conclude strategy_required/blocked with exact evidence and unresolvedQuestions; do not silently drop its tail or claim answered. A patch is only a proposed method, still subject to the same source, dependency, scope and Native legality checks.'};
  node.instruction+=' If a patch also requests reads/catalogueQueries, it is PREPARATION ONLY: Host retains the proposed edits, performs those immutable queries, and returns their actual results before any method submission. Subsequent patch edits the retained UNCONFIRMED proposal incrementally; omissions preserve it. With a pending proposal, confirm with stepEdits=null, completionStepId=null, reads=[] and catalogueQueries=[] explicitly submits that exact proposal through the original compiler. It does not approve its legality. read/catalogue alone preserve the pending proposal. Never repeat successful actions. Missing/error query paths remain missing, and changing dependencies invalidates reuse.';
  node.instruction+=' Anchoring an EXISTING step before itself is an explicit no-move replacement, equivalent in position to beforeStepId=null. A NEW step cannot anchor to itself.';
  node.instruction+=' Edits are one atomic transaction: original steps explicitly removed in this patch still serve as position anchors during the ordered upserts, then are removed. An anchor must be an original step or an earlier upsert; unknown/future anchors and editing a step also removed are invalid. This only defines ordering, never cancels dependencies or approves a changed experiment objective.';
  node.instruction+=' If you only need saved evidence and are not editing any step, submit read/catalogue with actual numeric source addresses and stepEdits=null. A patch with no edits AND no queries is empty; saying that you will read a source does not submit a read.';
  if(partitionContext?.savedObservationPairOnly)node.instruction+=' This retained method only compares immutable saved observations; it does not construct a shared physical scene. Each source retains its own current/alternative participant configuration. Do not split the arithmetic into physical-arm experiments or repeat measurements. Use resubmit to keep the exact comparison, or patch only an actual semantic choice; comparisonPartitions=null. Host checks the selected sources against their own arms.';
  else if(partitionContext)node.instruction+=' comparisonPartitions may repartition ONLY this unexecuted, rejected method into the SAME authored current/alternative arms, with an optional shared preparation partition. The retained shared binding was proposed by the METHOD, not by the design author; its error does not establish a design inconsistency. Use action=patch, explicit partitions {arm,stage,stepIds,observationStepIds,completionStepId}, and stepEdits if tool parameters need repair. List every retained step exactly once, in the resulting method order; current and alternative must both occur. Host binds participant facts from the already-read design for each chosen arm. Purpose, metrics, assumptions, strategic choice and Native results do not change; the normal compiler still validates every step. No order has run. Do not return strategy_required merely because this unapproved shared binding was wrong. Reads may prepare the explicit proposal; confirm preserves its exact partition choices. For read/catalogue/conclude/confirm set comparisonPartitions=null. Do not combine partitions with another comparison metadata edit.';
  if(canInheritComparison)node.instruction+=' comparisonBindingEdit=null preserves the retained order binding. To repair an order-level comparison identity conflict, explicitly choose action=patch and comparisonBindingEdit="inherit_delegated": Host removes only the stale explicit comparisonBinding and the SAME compiler derives purpose/arm/metrics/stage from currentDelegation and actual local steps. stepEdits may be null for this identity-only edit. Do not copy comparison identity into step arguments or merely describe the correction in publicReason. No other scope/purpose/participant change is permitted. For read/catalogue/conclude/confirm use comparisonBindingEdit=null; a pending prepared proposal already retains its explicit edit. Inheritance is not approval of the scene, observation endpoint or strategy.';
  if(canAssignComparison)node.instruction+=' The compiler assigned this method to purpose evidence '+assignedPurpose+', but its binding is absent. Explicitly choose action=patch with comparisonAssignmentEdit={arm,stage,measurementNumbers,observationStepIds}; the fields use the SAME public comparison-binding contract. Host supplies only the already-assigned purpose identity, never the arm, stage, metrics or observations. stepEdits may be null for this metadata-only edit. Preparation uses stage=prerequisite and no observation steps; it does not answer the parent question. Do not merely describe this edit in publicReason or copy binding fields into step arguments. This cannot replace an existing binding or alter purpose, participants, assumptions, steps or results. For read/catalogue/conclude/confirm use comparisonAssignmentEdit=null. Do not combine comparison metadata edits. The original compiler still validates metric membership, scope and actual step semantics; no strategy or measurement is approved by this edit.';
  if(canEditComparisonStage)node.instruction+=' To correct only the retained local comparison stage or observation step references, explicitly submit action=patch with comparisonStageEdit={stage,observationStepIds}. stage is prerequisite, baseline or effect_endpoint; references must name steps retained after this patch. stepEdits may be null for this metadata-only edit. This cannot change purposeEvidenceNumber, arm, measurementNumbers, participants, assumptions or any result. Do not merely describe the edit in publicReason. Do not combine it with comparisonBindingEdit. For read/catalogue/conclude/confirm use comparisonStageEdit=null. Original compiler checks still determine whether the declared stage and actual operations agree. prerequisite with [] means no measurement yet, never completion of the comparison or approval of a strategy.';
  node.instruction='Repair currentRejection, not an older failure mentioned in retainedOrder prose. retainedOrder is an UNAPPROVED model proposal; its purpose/assumptions do not authorize a step forbidden by currentDelegation. An unchanged step reported as work_after_delegated_completion remains invalid even if completionStepId or another step changes. Explicit remove with a reason may remove an undelegated child step; it does NOT cancel the parent-owned queued successor. Host never removes it silently. If this cannot be repaired within the current delegation, return strategy_required/blocked instead of resubmitting the same refusal. '+node.instruction;
  if(order.steps.some(step=>step.operation==='bounded_unit_temporal')){
    node.temporalBindingContractVersion=SINGLE_UNIT_TEMPORAL_BINDING_CONTRACT.version;
    node.currentTemporalBindingProblems=(preparation?.order??order).steps.map(inspectSingleUnitTemporalBindingsV1).filter(Boolean);
    node.instruction+=' currentTemporalBindingProblems is the current source-owned parameter diagnostic for the retained method. Historical TEMPORAL_BOUNDS_MUST_BE_EXPLICIT was also raised for non-budget bindings; it does not mean valid maximumStates/path bounds are missing. '+SINGLE_UNIT_TEMPORAL_BINDING_CONTRACT.instruction;
  }
  if(repairOrigin==='local_selection_validation')node.instruction+=' This is the SAME retained method, rejected before dispatch by current-source selection validation. Treat retainedOrder as an UNCONFIRMED proposal, not a true statement of available actions. Repair the reported selection using the actual current finiteActions/parameterDomains or return strategy_required with the original question unresolved. A capability-reference route marked executable_exact describes implementation support, NOT membership in the current menu. matchCount=0 means the requested identity is absent; it is not a request to repeat the same selection or merely add parameters. Host will not pick a replacement action. If the original method purpose itself must change, return it to the owner rather than changing its scope through a step patch.';
  node.instruction+=' OUTPUT: return publicReason and ONE command. Use command.kind to select the operation. Put only that operation\'s fields inside command. For conclude, command.conclusion and command.unresolvedQuestions are SIBLINGS; never nest unresolvedQuestions inside conclusion. read/catalogue carry only reads/catalogueQueries; confirm carries only kind. Earlier references to inactive null fields describe the retained internal editor state, NOT additional output fields. Host supplies those inactive fields and retains identity. This output shape does not resolve a factual or strategic question.';
  node.instruction+=' For unmigrated queries use their legacy step kind. For migrated operations choose the *_parameters kind in this response schema and provide semantic parameters; Host handles the transport fields. '+ROSTER_SAVED_SCENE_INSTRUCTION_V4;
  if(candidateChoices.length)node.instruction+=' '+ROSTER_COMPARISON_CANDIDATE_INSTRUCTION_V1;
  if(sceneSteps.length)node.instruction+=' If ONLY the parent scene needs changing, prefer command.kind="select_saved_scene" with a non-null sceneStepId from sceneEditableSteps and sceneId from savedSceneChoices. Return no stepEdits, argumentsJson or bindings. Host copies that retained step and replaces only its parent source, preserving all query parameters, other bindings, guards, step order and completion target. This uses the retained method, not a malformed last rejected rewrite; it does not repair broken query parameters or approve a result. Use patch only when substantive query parameters also need changes.';
  if(delegatedControl)node.instruction+=' '+ROSTER_DELEGATED_METHOD_CONTROL_INSTRUCTION_V1+
    ' command.kind=resubmit (no other command fields) explicitly submits the retained parameters through the original compiler with Host-derived control metadata. Choose patch for actual parameter/step changes, read for missing evidence, or an honest conclusion. resubmit does not ignore other reported errors or grant approval; do not invent a parameter edit just to refresh metadata.';
  node.instruction+=' '+ROSTER_SEMANTIC_PARAMETER_INSTRUCTION_V1+' '+ROSTER_SEMANTIC_CONTEXT_INSTRUCTION_V2+' '+ROSTER_SEMANTIC_COMPARISON_INSTRUCTION_V3;
  const nodes=request.promptNodes.map(n=>repairOrigin==='local_selection_validation'&&n.kind==='local_contract_feedback'
    ?Object.fromEntries([...Object.entries(n).filter(([key])=>key!=='originalOutput'),['originalOutputRetainedByHost',true]]) :n);
  node.instruction=rosterHostStepKindInstructionV1(node.instruction);
  const next={...request,strategyRepairState:{hostStepKindSchema,originalResponseFormat:clone(request.responseFormat),editSchema,failedOrder:clone(order),
      repairOrigin,...(inline?{originalOutput:clone(inline.originalOutput)}:{}),
      ...(preparation?{preparation:clone(preparation)}:{})},
    promptNodes:[...nodes,node],userMessage:node.instruction,
    responseFormat:{kind:'provider_strict_json_schema',schemaName:contract.schemaName,
      outputContractRef:outputContractRefStarcraftTmgV1(contract),schema}};
  next.contextHash=hash({priorContextHash:request.contextHash,promptNodes:next.promptNodes,userMessage:next.userMessage,responseFormat:next.responseFormat});
  return prepareRosterOperationStepRepairV1(next);
}

// One correction for the concrete old map-parameter stop, NOT acceptance of its
// guessed deployment/base binding. New-contract failures earn no renewed grant.
export function projectRosterMapArgumentFeedbackRecoveryV1({work,request,reply}){
  const command=request?.promptNodes?.find(n=>n.kind==='work_order_edit_command');
  const sent=request?.promptNodes?.find(n=>n.kind==='workflow_role_assignment');
  const errors=work?.operationState?.correction?.errors??[];
  if(work?.role!=='roster_workflow_experiment_planner'||work.status!=='needs_repair'
    ||work.failure?.code!=='ROSTER_WORKFLOW_ROLE_NO_PROGRESS'
    ||work.failure.dispatchOutcome!=='completed_no_progress'
    ||work.failure.detail?.reason!=='unchanged_compiler_rejection'
    ||work.operationState?.pending||!work.operationState?.correction?.originalReplyRef
    ||!command||(command.mapArgumentContractVersion??0)>=2
    ||sent?.workId!==work.id||sent.role!==work.role
    ||Object.entries(work.bindings??{}).some(([k,v])=>sent.scope?.[k]!==v)
    ||!errors.length||!errors.every(e=>e.code==='unchanged_compiler_rejection'
      &&e.repeatedFailure?.error?.code==='ROSTER_WORKFLOW_MAP_ARGUMENT_CONTRACT'
      &&e.repeatedFailure.error.dispatchOutcome==='not_dispatched')
    ||reply?.output?.action!=='patch'||reply.output.stepEdits?.upsert?.length!==0
    ||reply.output.stepEdits?.remove?.length!==0||reply.output.reads?.length!==0
    ||reply.output.catalogueQueries?.length!==0)return null;
  return {workId:work.id,originalReplyRef:work.operationState.correction.originalReplyRef,
    repairKind:'map_argument_feedback',feedbackVersion:'c12-map-input-v2',
    recoveryKey:hash({workId:work.id,repairKind:'map_argument_feedback',version:2}),
    additionalInvalidResultLimit:1,historyReset:false,originalPaidReplyPreserved:true,
    newCorrectiveProviderRequest:true,nativeReplayed:false,finalApprovalGranted:false};
}
export function projectRosterTemporalBindingFeedbackRecoveryV1({work,request}){
  const command=request?.promptNodes?.find(n=>n.kind==='work_order_edit_command');
  const sent=request?.promptNodes?.find(n=>n.kind==='workflow_role_assignment');
  const errors=work?.operationState?.correction?.errors??[];
  if(work?.role!=='roster_workflow_experiment_planner'||work.status!=='needs_repair'
    ||work.failure?.code!=='ROSTER_WORKFLOW_ROLE_NO_PROGRESS'
    ||work.failure.dispatchOutcome!=='completed_no_progress'
    ||work.failure.detail?.reason!=='unchanged_compiler_rejection'
    ||work.operationState?.pending||!work.operationState?.correction?.originalReplyRef
    ||!command||command.temporalBindingContractVersion||sent?.workId!==work.id||sent.role!==work.role
    ||Object.entries(work.bindings??{}).some(([k,v])=>sent.scope?.[k]!==v)
    ||!errors.length||!errors.every(e=>e.code==='unchanged_compiler_rejection'
      &&e.repeatedFailure?.error?.code==='ROSTER_WORKFLOW_TEMPORAL_BOUNDS_MUST_BE_EXPLICIT'
      &&e.repeatedFailure.error.dispatchOutcome==='not_dispatched'
      &&e.repeatedFailure.order?.steps?.some(inspectSingleUnitTemporalBindingsV1)))return null;
  return {workId:work.id,originalReplyRef:work.operationState.correction.originalReplyRef,
    repairKind:'temporal_binding_feedback',feedbackVersion:'c12-temporal-binding-v1',
    recoveryKey:hash({workId:work.id,repairKind:'temporal_binding_feedback',version:1}),
    additionalInvalidResultLimit:1,historyReset:false,originalPaidReplyPreserved:true,
    newCorrectiveProviderRequest:true,nativeReplayed:false,finalApprovalGranted:false};
}
export function projectRosterWorkOrderEditCommandV1({request,output,preparationOnly=false}){
  const repaired=projectRosterOperationStepRepairV1({request,output});
  if(repaired){
    if(repaired.errors.length)return repaired;
    const mapped=projectRosterWorkOrderEditCommandV1({request:repaired.request,output:repaired.output,preparationOnly});
    return {...mapped,projection:[...repaired.projection,...mapped.projection]};
  }
  const internal=request.strategyRepairState?.hostStepKindSchema;
  if(internal){
    const kinds=projectRosterHostStepKindsV1(internal,output);
    if(kinds.errors.length)return {output:null,projection:kinds.projection,errors:kinds.errors};
    const mapped=projectRosterWorkOrderEditCommandV1({request:{...request,responseFormat:{...request.responseFormat,schema:internal},
      strategyRepairState:{...request.strategyRepairState,hostStepKindSchema:undefined}},output:kinds.output,preparationOnly});
    return {...mapped,projection:[...kinds.projection,...mapped.projection]};
  }
  const kinds=projectRosterHostStepKindsV1(request.responseFormat.schema,output);
  if(kinds.errors.length)return {output:null,projection:kinds.projection,errors:kinds.errors};
  if(kinds.projection.length){const mapped=projectRosterWorkOrderEditCommandV1({request,output:kinds.output,preparationOnly});
    return {...mapped,projection:[...kinds.projection,...mapped.projection]};}

  const reject=(code,detail={})=>({output:null,projection:[],errors:[{code,...detail}]});
  const inert=projectRosterEmptyCandidateFieldsV1(output);
  if(inert.projection.length){const mapped=projectRosterWorkOrderEditCommandV1({request,output:inert.output,preparationOnly});
    return {...mapped,projection:[...inert.projection,...mapped.projection]};}
  const checked=validate(request.responseFormat.schema,output);
  if(!checked.ok)return reject('work_order_edit_schema',{issues:checked.issues});
  if(request.promptNodes.some(n=>n.kind==='work_order_edit_command'&&n.commandFormVersion===1)){
    const schema=request.strategyRepairState?.editSchema;
    if(!schema?.properties?.action)return reject('work_order_edit_host_contract_missing');
    const expanded=Object.fromEntries(Object.keys(schema.properties).map(k=>[k,
      ['reads','catalogueQueries','unresolvedQuestions'].includes(k)?[]:null]));
    const {kind,...fields}=output.command;
    Object.assign(expanded,fields,{action:kind,publicReason:output.publicReason});
    const legacy={...request,responseFormat:{...request.responseFormat,schema},
      promptNodes:request.promptNodes.map(n=>n.kind==='work_order_edit_command'?{...n,commandFormVersion:0}:n)};
    return projectRosterWorkOrderEditCommandV1({request:legacy,output:expanded,preparationOnly});
  }
  const result={action:output.action,publicReason:output.publicReason,reads:clone(output.reads),
    catalogueQueries:clone(output.catalogueQueries),workOrders:[],conclusion:clone(output.conclusion),
    unresolvedQuestions:clone(output.unresolvedQuestions)};
  const pending=request.strategyRepairState?.preparation;
  const original=request.strategyRepairState?.failedOrder;
  const sceneOnlyProjection=[];
  let sceneOnlyStepId=null;
  if(output.action==='select_saved_scene'){
    const node=request.promptNodes.find(n=>n.kind==='work_order_edit_command'&&n.sceneOnlyEditVersion===1);
    if(!node?.sceneEditableSteps?.some(s=>s.stepId===output.sceneStepId)||!output.sceneId)return reject('scene_only_edit_selection_required');
    const selected=replaceRosterStepSceneV1({order:pending?.order??original,stepId:output.sceneStepId,sceneId:output.sceneId,choices:node.savedSceneChoices,version:node.savedSceneChoiceVersion??1});
    if(selected.errors.length)return {output:null,projection:[],errors:selected.errors};
    sceneOnlyProjection.push(...selected.projection);
    sceneOnlyStepId=selected.step.stepId;
    output={...output,action:'patch',sceneStepId:null,sceneId:null,stepEdits:{upsert:[{step:selected.step,beforeStepId:null}],remove:[]},completionStepId:null};
  }else if(output.sceneStepId!=null||output.sceneId!=null)return reject('scene_only_edit_mixed_operations');
  const assignment=request.promptNodes.find(n=>n.kind==='workflow_role_assignment');
  if(pending&&(pending.baseOrderHash!==hash(original)||pending.scopeHash!==hash(assignment.scope)))
    return reject('work_order_edit_preparation_stale');
  if(output.action!=='patch'&&(output.stepEdits!==null||output.completionStepId!==null||output.comparisonBindingEdit!=null||output.comparisonStageEdit!=null||output.comparisonAssignmentEdit!=null||output.comparisonPartitions!=null)
    ||output.action!=='conclude'&&output.conclusion!==null)return reject('work_order_edit_mixed_operations');
  if([output.comparisonBindingEdit,output.comparisonStageEdit,output.comparisonAssignmentEdit,output.comparisonPartitions].filter(v=>v!=null).length>1)
    return reject('work_order_edit_conflicting_comparison_edits');
  if(output.action==='conclude'&&!['blocked','strategy_required'].includes(output.conclusion?.status))
    return reject('work_order_edit_not_fact_approval');
  const confirming=output.action==='confirm';
  const delegatedControl=request.promptNodes.find(n=>n.kind==='work_order_edit_command'&&n.delegatedControlVersion===1)?.delegatedControl;
  const resubmitting=output.action==='resubmit'&&Boolean(delegatedControl);
  if(confirming&&(!pending||output.reads.length||output.catalogueQueries.length))
    return reject('work_order_edit_confirmation_requires_saved_proposal_and_no_queries');
  if(output.action!=='patch'&&!confirming&&!resubmitting)return {output:result,projection:[],errors:[]};
  const hasQueries=output.reads.length+output.catalogueQueries.length>0;
  if(output.action==='patch'&&hasQueries&&output.stepEdits===null&&output.completionStepId===null
    &&output.comparisonBindingEdit==null&&output.comparisonStageEdit==null&&output.comparisonAssignmentEdit==null&&output.comparisonPartitions==null&&output.conclusion===null){
    const action=output.reads.length?'read':'catalogue';
    if(request.responseFormat.schema.properties.action.enum.includes(action))return {
      output:{...result,action},projection:[{rule:'work_order_read_only_payload_v1',originalAction:'patch',
        action,proposalSubmitted:false,originalReplyUnchanged:true,nativeExecuted:false}],errors:[]};
  }
  const canPrepare=preparationOnly||request.promptNodes.some(n=>n.kind==='work_order_edit_command'&&n.version>=2);
  if(!confirming&&!resubmitting&&(!output.stepEdits&&!output.comparisonBindingEdit&&!output.comparisonStageEdit&&!output.comparisonAssignmentEdit&&!output.comparisonPartitions||hasQueries&&!canPrepare))return reject('work_order_edit_requires_patch_only');
  const edits=output.stepEdits??{upsert:[],remove:[]};
  if(!confirming&&!resubmitting&&!hasQueries&&!edits.upsert.length&&!edits.remove.length&&output.completionStepId===null
    &&output.comparisonBindingEdit==null&&output.comparisonStageEdit==null&&output.comparisonAssignmentEdit==null&&output.comparisonPartitions==null)
    return reject('work_order_edit_empty_patch',{instruction:'No edit or read was submitted. To read a contract, use action=read with the actual evidenceNumber and pointer from toolContractSource/sections, stepEdits=null. Public prose does not execute a read. Otherwise explicitly change the reported fields or return blocked/strategy_required; the unchanged rejected method will not be compiled again.'});
  const order=clone(pending?.order??original);
  if(!order?.steps?.length)return reject('work_order_edit_original_missing');
  const ids=order.steps.map(s=>s.stepId),seen=new Set(),removed=new Set(),positionProjection=[...sceneOnlyProjection];
  if(output.comparisonBindingEdit==='inherit_delegated'){
    const delegated=request.promptNodes.find(n=>n.kind==='pending_operation_choice_contract')?.delegatedComparison;
    if(!delegated?.targetWorkId||delegated.binding?.schema!=='roster_comparison_observation_binding_v1'
      ||!order.experimentScope)return reject('work_order_edit_delegation_required');
    positionProjection.push({rule:'explicit_delegated_comparison_inheritance_v1',
      targetWorkId:delegated.targetWorkId,previousBinding:clone(order.experimentScope.comparisonBinding??null),
      compilerValidationRequired:true,sourceApproved:false});
    order.experimentScope.comparisonBinding=null;
  }
  if(new Set(ids).size!==ids.length)return reject('work_order_edit_ambiguous_original');
  for(const removal of edits.remove){
    if(seen.has(removal.stepId)||!removal.reason.trim()||!ids.includes(removal.stepId))
      return reject('work_order_edit_invalid_remove',{stepId:removal.stepId});
    // Keep original positions as local transaction anchors until all upserts
    // are resolved. Only the model's explicit removals disappear at commit.
    seen.add(removal.stepId);removed.add(removal.stepId);
  }
  const sceneNode=request.promptNodes.find(n=>n.kind==='work_order_edit_command'&&[1,2,3,4].includes(n.savedSceneChoiceVersion));
  const sceneChoices=sceneNode?.savedSceneChoices??[];
  for(const originalEdit of edits.upsert){
    const semantic=projectRosterSemanticParameterStepV1(originalEdit.step,sceneNode?.semanticParameterVersion,sceneChoices);
    if(semantic.errors.length)return {output:null,projection:[],errors:semantic.errors};
    positionProjection.push(...semantic.projection);
    const candidate=projectRosterComparisonCandidateStepV1(semantic.step,[1,2].includes(sceneNode?.comparisonCandidateChoiceVersion)?sceneNode.comparisonCandidateChoices:[]);
    if(candidate.errors.length)return {output:null,projection:[],errors:candidate.errors};
    positionProjection.push(...candidate.projection);
    const mapped=sceneOnlyStepId===originalEdit.step.stepId?{step:clone(originalEdit.step),errors:[],projection:[]}
      :projectRosterSavedSceneStepV1(candidate.step,sceneChoices,sceneNode?.savedSceneChoiceVersion??1);
    if(mapped.errors.length)return {output:null,projection:[],errors:mapped.errors};
    const edit={...originalEdit,step:mapped.step};positionProjection.push(...mapped.projection);
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
      if(removed.has(edit.beforeStepId))positionProjection.push({rule:'removed_original_step_position_anchor_v1',
        stepId:id,beforeStepId:edit.beforeStepId,originalAnchorIndex:ids.indexOf(edit.beforeStepId),
        modelParametersUnchanged:true,explicitRemovalPreserved:true});
      if(index>=0)order.steps.splice(index,1);
      order.steps.splice(order.steps.findIndex(s=>s.stepId===edit.beforeStepId),0,clone(edit.step));
    }else if(index>=0)order.steps[index]=clone(edit.step);
    else order.steps.push(clone(edit.step));
  }
  order.steps=order.steps.filter(step=>!removed.has(step.stepId));
  if(output.completionStepId!==null)order.completionStepId=output.completionStepId;
  if(!order.steps.length||order.completionStepId&&!order.steps.some(s=>s.stepId===order.completionStepId))
    return reject('work_order_edit_completion_missing',{completionStepId:order.completionStepId});
  if(output.comparisonAssignmentEdit!=null){
    const purposeEvidenceNumber=assignedComparisonPurpose(assignment?.inputs?.task?.value),edit=output.comparisonAssignmentEdit;
    if(!purposeEvidenceNumber||!request.responseFormat.schema.properties.comparisonAssignmentEdit
      ||!order.experimentScope||order.experimentScope.comparisonBinding!=null)
      return reject('work_order_edit_assigned_comparison_required');
    if(new Set(edit.observationStepIds).size!==edit.observationStepIds.length
      ||edit.observationStepIds.some(id=>!order.steps.some(step=>step.stepId===id)))
      return reject('work_order_edit_comparison_observation_missing');
    if(new Set(edit.measurementNumbers).size!==edit.measurementNumbers.length)
      return reject('work_order_edit_comparison_measurement_duplicate');
    order.experimentScope.comparisonBinding={purposeEvidenceNumber,...clone(edit)};
    positionProjection.push({rule:'explicit_assigned_comparison_edit_v1',purposeEvidenceNumber,
      comparisonBinding:clone(order.experimentScope.comparisonBinding),compilerValidationRequired:true,
      sourceApproved:false,measurementCompleted:false});
  }
  if(output.comparisonStageEdit!=null){
    const binding=order.experimentScope?.comparisonBinding,edit=output.comparisonStageEdit;
    if(!binding||!request.responseFormat.schema.properties.comparisonStageEdit)
      return reject('work_order_edit_comparison_binding_required');
    if(new Set(edit.observationStepIds).size!==edit.observationStepIds.length
      ||edit.observationStepIds.some(id=>!order.steps.some(step=>step.stepId===id)))
      return reject('work_order_edit_comparison_observation_missing');
    order.experimentScope.comparisonBinding={...binding,stage:edit.stage,observationStepIds:clone(edit.observationStepIds)};
    positionProjection.push({rule:'explicit_comparison_stage_edit_v1',previousBinding:clone(binding),
      comparisonBinding:clone(order.experimentScope.comparisonBinding),compilerValidationRequired:true,
      sourceApproved:false,measurementCompleted:false});
  }
  if(delegatedControl){
    order.experimentScope=clone(delegatedControl.experimentScope);
    positionProjection.push({rule:'host_owned_delegated_method_control_v1',targetWorkId:delegatedControl.targetWorkId,
      compilerDerivedBinding:true,sourceApproved:false,originalReplyUnchanged:true});
  }
  const partitions=delegatedControl?null:confirming?pending?.comparisonPartitions:output.comparisonPartitions??pending?.comparisonPartitions;
  let partitioned=null;
  if(partitions){try{partitioned=partitionRosterUnexecutedMethodV1({request,original,order,partitions});}
    catch(error){if(error.code!=='work_order_partition_invalid')throw error;return reject(error.code,error.detail);}
    positionProjection.push(partitioned.projection);}
  // Both explicit reads and implicit source-delivery prerequisites must retain
  // this SAME merged proposal. A candidate is not submitted or approved merely
  // because the mapper can reconstruct it.
  const preparationCandidate={version:1,order:clone(order),baseOrder:clone(original),
    repairOrigin:request.strategyRepairState?.repairOrigin??'delegated_compile_failure',
    baseOrderHash:hash(original),scopeHash:hash(assignment.scope),approved:false,
    ...(partitions?{comparisonPartitions:clone(partitions)}:{})};
  if(hasQueries){
    result.action=output.reads.length?'read':'catalogue';
    return {output:result,preparation:preparationCandidate,
      projection:[...positionProjection,{rule:'work_order_read_preparation_v1',originalAction:output.action,proposalSubmitted:false,
        originalReplyUnchanged:true,nativeExecuted:false}],errors:[]};
  }
  result.action='finish';result.workOrders=partitioned?.orders??[order];
  return {output:result,preparationCandidate,projection:[...positionProjection,{rule:'model_authored_work_order_edits_v1',orderId:order.orderId,
    upsertedStepIds:edits.upsert.map(e=>e.step.stepId),removedStepIds:edits.remove.map(e=>e.stepId),
    retainedStepIds:ids.filter(id=>!seen.has(id)),scopeRetained:!partitioned,designRetained:true,nativeExecuted:false}],errors:[]};
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

// Recover a paid, explicitly ordered edit when later failed rewrites changed
// only envelope shape. Any changed executable choice or nonempty data rejects.
export async function projectRosterEmptyCandidateRecoveryV1({state,work,readArtifact}){
 const kind='candidate_host_empty_fields_v1',op=work?.operationState,errors=op?.correction?.errors??[];
 if(work?.role!=='roster_workflow_experiment_planner'||work.status!=='needs_repair'
   ||work.failure?.dispatchOutcome!=='completed_invalid'||op?.pending
   ||!createRosterWorkflowGraphV1(state).isFresh(work.id)
   ||!errors.length||errors.some(e=>e.code!=='work_order_edit_schema'))return null;
 const calls=op.calls??[],last=calls.at(-1);if(!last)return null;
 const latest=await readArtifact(last.replyRef);
 const semantic=output=>{const cleaned=projectRosterEmptyCandidateFieldsV1(output).output;
   if(cleaned?.command?.kind!=='patch'||!Array.isArray(cleaned.command.stepEdits?.upsert))return null;
   const cmd=clone(cleaned.command);cmd.stepEdits.upsert=cmd.stepEdits.upsert.map(edit=>{
     const step=clone(edit.step??edit);delete step.publicReason;return step;});return cmd;};
 const latestChoices=semantic(latest.output);if(!latestChoices)return null;
 for(const call of [...calls].reverse()){
   const [request,reply]=await Promise.all([readArtifact(call.requestRef),readArtifact(call.replyRef)]);
   const node=request.promptNodes?.find(n=>n.kind==='work_order_edit_command');
   const assigned=request.promptNodes?.find(n=>n.kind==='workflow_role_assignment');
   if(!node||work.candidateEmptyFieldRecoveryHistory?.some(r=>r.kind===kind&&r.requestRef===call.requestRef&&r.replyRef===call.replyRef)||assigned?.workId!==work.id
     ||assigned.role!==work.role||!Object.entries(work.bindings).every(([key,value])=>assigned.scope?.[key]===value)
     ||reply.receipt?.contextHash!==request.contextHash||!isDeepStrictEqual(call.receipt,reply.receipt))continue;
   const inert=projectRosterEmptyCandidateFieldsV1(reply.output);
   if(!inert.projection.length||!isDeepStrictEqual(semantic(reply.output),latestChoices))continue;
   const priorEdits=reply.output.command.stepEdits.upsert,lastEdits=latest.output.command.stepEdits.upsert;
   if(priorEdits.some((e,i)=>!e.step||!Object.hasOwn(e,'beforeStepId')
     ||Object.hasOwn(lastEdits[i],'beforeStepId')&&lastEdits[i].beforeStepId!==e.beforeStepId))continue;
   const mapped=projectRosterWorkOrderEditCommandV1({request,output:reply.output});
   if(mapped.errors.length||!mapped.output)continue;
   return {kind,repairKind:'candidate_host_empty_fields',workId:work.id,requestRef:call.requestRef,
     replyRef:call.replyRef,originalReplyRef:call.replyRef,latestReplyRef:last.replyRef,originalResultRef:work.resultRef,
     revalidationKey:hash({kind,requestRef:call.requestRef,replyRef:call.replyRef}),
     ignoredEmptyFields:inert.projection,providerReplayed:false,nativeReplayed:false,finalApprovalGranted:false,
     instruction:'Reconsume the saved explicitly ordered patch through normal source, scope and method gates. Only empty Host-owned candidate placeholders are removed. Later failed replies retain identical executable choices; original order anchors, arguments, costs and replies remain unchanged. No model rewrite, Native replay, factual/strategy approval or counter reset.'};
 }
 return null;
}
