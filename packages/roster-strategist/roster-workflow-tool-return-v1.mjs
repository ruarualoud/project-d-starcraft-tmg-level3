// One work constructor for parameter correction and unresolved-method returns.
// The original Native receipt is retained; the new work is a model decision,
// never a successful replacement query or an automatic replay instruction.
import {createRosterWorkflowGraphV1} from './roster-workflow-graph-v1.mjs';
import {projectRosterExperimentSourceFactsV1} from './roster-experiment-source-facts-v1.mjs';
import {projectRosterWorkflowReceiptViewV1} from './roster-workflow-receipt-view-v1.mjs';
import {isRosterWorkOrderCapabilityReturnV1} from './roster-workflow-order-failure-v1.mjs';
import {projectRosterBuilderAuthorFailureV1} from './roster-builder-inquiry-v1.mjs';

const legacyToolRepairInstruction='Correct only this failed tool input using the actual source-owned repair contract. Preserve the question and valid assumptions. For a missing source binding, choose explicit parameters from the real source; a description/schema is not a selected scenario. Return exactly one workOrder ending in the same corrected operation, or only necessary preliminary reads if a new model choice must follow. Preliminary reads do NOT resolve the failed query. Do not re-run successful sibling queries. Never fabricate a receipt.';
export const ROSTER_REPAIR_METHOD_RESOLUTION_V1=Object.freeze({
  version:1,sameOperationRequired:false,unresolvedReturnAllowed:true,
  questionPreserved:true,hostChoosesMethod:false,factsApproved:false,
  instruction:'Preserve the original question, not a disproved experimental premise. First distinguish a malformed parameter from an operation that cannot produce the intended observation. If parameters alone fix the method, submit one necessary replacement ending in the corrected operation; preserve successful siblings and use actual source bindings. Otherwise conclude strategy_required with the precise unresolved choice/assumption, or blocked with the specific unavailable capability and its source. Do not construct a different baseline merely to satisfy a same-operation repair. This does not authorize a different experiment, changed army, invented casualties, a factual answer or Plan approval. Preliminary reads are not completion; a successful operation is not proof of its intended effect.'});
function currentToolRepairTask(task){
  return {...task,instruction:'Correct only the actual failed input when its intended observation remains achievable. A source description is not a selected scenario; use explicit source-owned parameters. Never fabricate a receipt. '+ROSTER_REPAIR_METHOD_RESOLUTION_V1.instruction,
    methodResolution:structuredClone(ROSTER_REPAIR_METHOD_RESOLUTION_V1)};
}
// Fresh request projection only: persisted paid prompts/replies keep their old
// identity. Constructor and sender consume the same policy for queued repairs.
export function prepareRosterToolRepairMethodRequestV1(request){
  const assignment=request.promptNodes?.find(n=>n.kind==='workflow_role_assignment');
  const task=assignment?.inputs?.task?.value;
  if(assignment?.role==='roster_workflow_experiment_planner'&&task?.originalWork
    &&task.failure?.queryRepair&&task.failure.queryRepair.controlReturn!==true)
    request={...request,promptNodes:request.promptNodes.map(node=>node===assignment
      ?{...node,inputs:{...node.inputs,task:{...node.inputs.task,value:currentToolRepairTask(task)}}}:node)};
  // Old Native input diagnostics merged unit lookup with marker lookup. Clarify
  // only that already-delivered diagnostic; do not rewrite its receipt, infer
  // a valid unit/source, select a new experiment, or renew a retry allowance.
  const selections=new Map();
  const visit=value=>{
    if(!value||typeof value!=='object')return;
    if(value.code==='PREGAME_JOINT_TEMPORAL_INPUT_INVALID'
      &&value.detail?.field==='participants'&&value.detail.reason==='not_in_common_native_source'
      &&typeof value.detail.participant?.markerId==='string'
      &&/^(0|[1-9]\d*)$/.test(value.detail.participant.markerId)){
      const p=value.detail.participant;
      selections.set(JSON.stringify(p),{unitId:p.unitId,printedMarkerNumber:p.markerId});
    }
    for(const child of Object.values(value))visit(child);
  };
  for(const node of request.promptNodes??[])visit(node);
  if(!selections.size)return request;
  const correction={kind:'temporal_input_diagnostic_revision',version:1,
    sourceContract:'pregame_temporal_marker_selection_v1',affectedSelections:[...selections.values()],
    originalRecordsPreserved:true,nativeMeasurementSupplied:false,unitAvailabilityProven:false,
    reachabilityProven:false,retryAllowanceChanged:false,
    instruction:'The delivered legacy not_in_common_native_source diagnostic conflated a unit identity failure with a marker identity failure. It does NOT establish that the unit is absent, that reserves cannot deploy, or that the route is illegal. The current Host accepts either an exact Native marker ID or its unique printed decimal number, and resolves participant targets, anchors and control objectives against the SAME Native map. Preserve the selected units, start, target, schedule and bounds when revisiting only this identity error; no replacement source or new strategy is required merely to translate a printed number. Actual Native execution still decides validity and reachability. Do not claim a successful measurement from this clarification, treat an old model interpretation as a Rules fact, or increase search bounds automatically.'};
  return {...request,promptNodes:[...request.promptNodes.filter(n=>n.kind!=='temporal_input_diagnostic_revision'),correction]};
}
// One explicit migration of a demonstrated conflicting old instruction. A
// model proposal is retained, not relabelled false. Any issued child excludes
// this recovery: it would require a different, evidence-aware handoff.
export async function projectRosterUnstartedToolRepairReconsiderationV1({state,workId,expectedResultRef,readArtifact}){
  const work=state.work.find(w=>w.id===workId),graph=createRosterWorkflowGraphV1(state);
  if(work?.role!=='roster_workflow_experiment_planner'||work.status!=='evidence_ready'
    ||!work.repairOf||work.resultRef!==expectedResultRef||!graph.isCurrent(work.id)
    ||state.work.some(w=>w.status==='running'||w.operationState?.pending))return null;
  const source=state.work.find(w=>w.id===work.repairOf);
  if(source?.role!=='roster_workflow_tool'||source.status!=='needs_model_choice')return null;
  const call=work.operationState?.calls?.at(-1);if(!call)return null;
  const request=await readArtifact(call.requestRef);
  const assignment=request.promptNodes?.find(n=>n.kind==='workflow_role_assignment'&&n.workId===workId);
  if(assignment?.inputs?.task?.value?.instruction!==legacyToolRepairInstruction)return null;
  const result=await readArtifact(work.resultRef);
  if(result.value?.experimentConclusion||result.value?.failedWorkOrders?.length||!result.value?.workOrders?.length)return null;
  const children=graph.descendants(work.id,{kinds:['execution','repair','choice','continuation']}).filter(w=>w.id!==work.id);
  if(!children.length||children.some(w=>!['ready','waiting_dependency'].includes(w.status)
    ||w.resultRef||w.inputRef||w.operationState||w.attempt))return null;
  return {version:1,sourceWorkId:work.id,sourceResultRef:work.resultRef,sourceRequestRef:call.requestRef,
    sourceReplyRef:call.replyRef,unexecutedWorkIds:children.map(w=>w.id),
    methodExecuted:false,oldInstructionWasConflicting:true,
    originalRecordsPreserved:true,historyReset:false,factsApproved:false,planApproved:false};
}

// Publication precedes any consumer snapshot, including failed sibling
// corrections. The completed tool result is immutable; this never executes it.
export async function publishRosterWorkflowCompletedToolSourcesV1({state,readArtifact,publish}){
  for(const work of state.work){
    if(work.role!=='roster_workflow_tool'||work.status!=='evidence_ready'||!work.resultRef
      ||work.operationState?.pending||!Object.entries(work.bindings??{}).every(([k,v])=>state.scope[k]===v))continue;
    const id=`tool:${work.id}`,viewId=`tool-view:${work.id}`;
    const originalExists=state.evidence.some(e=>e.id===id),viewExists=state.evidence.some(e=>e.id===viewId);
    if(originalExists&&viewExists)continue;
    const result=await readArtifact(work.resultRef);
    if(result?.kind!=='tool_receipt'||result.continuation===true||result.value?.status!=='completed')continue;
    if(!originalExists)await publish({type:'publish_evidence',id,title:`${result.value.operation}: ${work.id}`,
      kind:'tool_receipt',bindings:work.bindings,conditions:result.conditions,value:result.value});
    if(!viewExists)await publish({type:'publish_evidence',id:viewId,title:`Receipt view: ${work.id}`,
      kind:'tool_receipt',bindings:work.bindings,conditions:result.conditions,
      value:projectRosterWorkflowReceiptViewV1({evidenceId:id,value:result.value,conditions:result.conditions})});
  }
}

// A returned method may have completed siblings even when its last local
// repair concluded "blocked". Deliver the original order's actual sources,
// not only that last model conclusion or its failure citations. This is a
// read projection of explicit ownership/resolution links, never a strategy
// choice, an alias of different queries, or a rewritten historical summary.
export async function projectRosterWorkflowReturnedMethodFactsV1({assignment,state,readArtifact}){
  const byId=new Map((state.work??[]).map(work=>[work.id,work]));
  const evidence=new Map((state.evidence??[]).map(entry=>[entry.id,entry]));
  const graph=createRosterWorkflowGraphV1(state),reportRefs=new Set();
  const addEvidence=id=>{const entry=evidence.get(id);if(entry)reportRefs.add(entry.artifactRef);};
  const visitedMethods=new Set();
  const addWork=work=>{
    if(!work||visitedMethods.has(work.id))return;
    visitedMethods.add(work.id);
    // Method continuations consume their actual earlier batch, including a
    // typed order-repair owner. Do not rely on a model summary of its failure.
    if(work.methodContinuationOf)addWork(byId.get(work.methodContinuationOf));
    for(const child of state.work??[])if(child.orderRepairOf===work.id)addWork(child);
    for(const returned of Object.values(work.returnedOrders??{}))reportRefs.add(returned.reportRef);
    addEvidence(work.inputs?.returnScope?.value?.completeReportEvidenceId);
    const branch=work.inputs?.branchReturn;
    if(branch?.source==='evidence')addEvidence(branch.id??branch.evidenceId);
  };
  addEvidence(assignment.inputs?.returnScope?.value?.completeReportEvidenceId);
  for(const input of Object.values(assignment.inputs??{})){
    const id=input.evidenceId??input.id;
    if(input.source==='evidence'&&id?.startsWith('branch-return:'))addEvidence(id);
    if(input.source==='evidence'&&id?.startsWith('role:'))addWork(byId.get(id.slice(5)));
    if(input.source==='work')addWork(byId.get(id));
  }
  // A correction receives only its immediate task, while its method owner
  // retains the last returned batch. Follow the existing graph to the nearest
  // returned method; do not inject the whole experiment/history into a child.
  if(!reportRefs.size&&assignment.workId){
    for(const work of graph.ancestors(assignment.workId)){
      addWork(work);if(reportRefs.size)break;
    }
  }
  const methods=[];
  for(const reportRef of reportRefs){
    const report=await readArtifact(reportRef);
    if(!['model_branch_return_not_native_success','tool_branch_return_not_native_success'].includes(report?.kind)||!report.originalOrder?.steps)continue;
    const owner=byId.get(report.control?.ownerWorkId);
    if(!owner||!graph.isCurrent(owner.id))continue;
    const namespace=`${owner.id}:order${report.control.orderIndex}`,steps=[];
    for(const step of report.originalOrder.steps){
      const logical=byId.get(`${namespace}:${step.stepId}`);
      if(!logical)continue;
      const row={stepId:step.stepId,logicalWorkId:logical.id,status:logical.status,
        operation:logical.inputs?.request?.value?.operation,originalStepUnchanged:true};
      let actual=logical;const seen=new Set();
      while(actual?.resolvedByWorkId&&!seen.has(actual.id)){
        seen.add(actual.id);actual=byId.get(actual.resolvedByWorkId);
      }
      // Returning control retires a method, not its completed facts. isCurrent
      // intentionally excludes branchReturnRef for scheduling; isFresh checks
      // source/dependency validity and keeps retained Native facts readable.
      if(actual&&actual.status==='evidence_ready'&&graph.isFresh(actual.id)&&!seen.has(actual.id)){
        const result=await readArtifact(actual.resultRef),entry=evidence.get(`tool:${actual.id}`);
        if(result.kind==='tool_receipt'&&result.continuation!==true&&result.value?.status==='completed'&&entry){
          const source=await readArtifact(entry.artifactRef);
          row.actualWorkId=actual.id;row.actualResultRef=actual.resultRef;
          row.sourceEvidenceId=entry.id;row.sourceArtifactRef=entry.artifactRef;
          row.sourceEvidenceNumber=state.evidence.indexOf(entry)+1;
          row.facts=projectRosterExperimentSourceFactsV1({evidence:entry,value:source.value??source});
          row.actualRequest=structuredClone(result.value.request??{});
          row.resolvedThroughRecordedSuccess=logical.id!==actual.id;
        }
      }
      if(!row.actualResultRef&&logical.resultRef){
        const unresolved=await readArtifact(logical.resultRef),value=unresolved?.value;
        if(value?.status==='returned_to_model'&&value.code){
          row.unresolvedDiagnostic={sourceWorkId:logical.id,sourceResultRef:logical.resultRef,
            operation:value.operation,code:value.code,detail:structuredClone(value.detail??null),
            originalQueryAnswered:false,nativeSuccess:false};
        }
      }
      steps.push(row);
    }
    methods.push({reportRef,ownerWorkId:owner.id,orderIndex:report.control.orderIndex,steps});
  }
  return methods.length?{schema:'roster_returned_method_facts_v1',methods,
    originalArtifactsUnchanged:true,acceptanceGranted:false,
    instruction:'These source-labelled facts are the ACTUAL current results of the returned order, following explicit recorded repairs. A blocked sibling or old model summary does not mean every sibling is unmeasured. Preserve original failures as history and unresolved steps as unresolved. Compare the actual stateRef, parameters and proof scope; a repaired scene is not the old scene and a successful query does not by itself prove comparable arms, strategy improvement or Plan acceptance. Read exact source sections when needed. Do not repeat a measured query merely because an older summary omitted it.'}:null;
}
// A work may later resolve to a different receipt. Use the immutable attempt,
// not tool:<workId>, for negative observations and normal unresolved returns.
export const rosterWorkflowUnresolvedSourceIdV1=work=>`tool-attempt:${work.id}:${work.resultRef}`;
export async function publishRosterWorkflowUnresolvedSourcesV1({state,readArtifact,publish}){
  for(const work of state.work){
    if(work.role!=='roster_workflow_tool'||!work.resultRef
      ||!['needs_model_choice','returned_to_owner','needs_repair'].includes(work.status))continue;
    const id=rosterWorkflowUnresolvedSourceIdV1(work);
    if(state.evidence.some(entry=>entry.id===id))continue;
    const result=await readArtifact(work.resultRef),value=result?.value;
    if(!['tool_receipt','interpretation'].includes(result?.kind)||!(value?.status==='returned_to_model'
      ||['unknown','failed','error'].includes(value?.receipt?.resultStatus)))continue;
    await publish({type:'publish_evidence',id,kind:result.kind,bindings:work.bindings,
      title:`Unresolved ${value.operation} observation: ${work.id}`,
      conditions:[...(result.conditions??[]),
        'Original unresolved tool attempt, not a successful measurement; unknown is not zero. Read its actual reason and scope before citing.'],
      value});
  }
}
export function rosterWorkflowReturnedFailureInputsV1({state,report}){
  const inputs={};
  for(const stopped of report.stoppedWork??[]){
    if(!stopped.resultRef)continue;
    const id=rosterWorkflowUnresolvedSourceIdV1(stopped);
    if(state.evidence.some(entry=>entry.id===id))
      inputs[`returnedFailure${Object.keys(inputs).length}`]={source:'evidence',id,pointer:''};
  }
  return inputs;
}
export function createRosterWorkflowToolReturnWorkV1({state,work,failure,queryRepair,toolDescriptor,sourceInputs}){
  if(!queryRepair||work.role!=='roster_workflow_tool'||work.status!=='needs_model_choice'
    ||work.branchReturnRef||work.operationState?.pending)return null;
  const id=`${work.id}:input-repair`;
  if(state.work.some(row=>row.id===id))return null;
  queryRepair=projectRosterBuilderAuthorFailureV1({request:work.inputs?.request?.value,failure})??queryRepair;
  // An immutable purpose belongs to its author, not to an input-repair role.
  // Reuse the compiler's deterministic control return for retained tool work;
  // this consumes no extra model/Native attempt, even on an exhausted method.
  const designFailure={order:null,originalRequest:structuredClone(work.inputs.request.value),error:{
    code:failure.code,detail:structuredClone(failure.detail??null),queryRepair:structuredClone(queryRepair),
    dispatchOutcome:queryRepair.failureClass==='bounded_observation'?'completed_unresolved'
      :queryRepair.failureClass==='author_candidate_baseline_illegal'?'completed_illegal_baseline'
      :failure.executed===false||queryRepair.projectionExecuted===false?'not_dispatched':null},
    ...(queryRepair.failureClass==='author_candidate_baseline_illegal'?{observedToolFailure:structuredClone(failure)}:{})};
  if(['comparison_design_required','scene_environment_mismatch','author_candidate_input_invalid','author_candidate_baseline_illegal','bounded_observation'].includes(queryRepair.failureClass)&&isRosterWorkOrderCapabilityReturnV1(designFailure))
    return {id,role:'roster_workflow_experiment_planner',bindings:work.bindings,repairOf:work.id,
      repairGeneration:work.repairGeneration??0,inputs:{...sourceInputs,
        orderFailureReturn:{source:'literal',value:{version:1,sourceKind:'tool',sourceWorkId:work.id,
          sourceResultRef:work.resultRef,failure:designFailure}}}};
  const graph=createRosterWorkflowGraphV1(state),generation=graph.repairGeneration(work.id)+1;
  // The old adapter sent a nested parent to Native on the root and exposed only
  // a Native-fields error. One named source-contract correction, not a reset.
  const envelopeRecovery=generation>3&&queryRepair.sourceContract==='roster_spatial_envelope_v2'
    &&failure.receipt?.queryReceipt?.repairContext?.validationMessage?.startsWith('STATIC_FORMATION_ARGUMENTS_INVALID:unrecognized_fields:')
    &&queryRepair.misplacedEnvelopeFields?.length
    &&![work,...graph.ancestors(work.id)].some(w=>w.controlledRecovery?.engineeringChangeId==='spatial_envelope_v813');
  // Source advice required the Native action-domain solver, but the delegated
  // role could only call static geometry. One recovery after correcting that
  // shared permission, not another coordinate-guessing/reset loop.
  const nativeFormationRecovery=generation>3&&work.inputs?.request?.value?.operation==='native_action'
    &&queryRepair.sourceContract==='pregame_native_action_input_v1'
    &&queryRepair.failureStage==='instantiate_current_rules_domain'
    &&typeof queryRepair.parameterContract?.domainId==='string'
    &&['leadingModelId','path','placements'].every(field=>queryRepair.parameterContract.requiredFields?.includes(field))
    &&![work,...graph.ancestors(work.id)].some(w=>w.controlledRecovery?.engineeringChangeId==='native_action_formation_delegation_v957');
   // The previous source omitted both workflow nesting and the actual dice
   // array shape. One explicit correction for that OLD contract, not a higher
   // retry limit for failures already receiving the new contract.
   const nativeChanceRecovery=generation>3&&work.inputs?.request?.value?.operation==='native_action'
     &&queryRepair.chanceInputContractVersion===2&&failure.queryRepair?.chanceInputContractVersion!==2
     &&(failure.code==='ROSTER_WORKFLOW_NATIVE_ACTION_INPUT_INVALID'
       &&failure.detail?.unexpectedFields?.length===1&&failure.detail.unexpectedFields[0]==='outcome'
       &&!failure.detail?.missingFields?.length
       ||['PREGAME_LAB_NATIVE_ACTION_CHANCE_OUTCOME_REQUIRED','PREGAME_LAB_NATIVE_ACTION_OUTCOME_INVALID'].includes(failure.code))
     &&![work,...graph.ancestors(work.id)].some(w=>w.controlledRecovery?.engineeringChangeId==='native_chance_envelope_v2');
   const temporalEntryRecovery=generation>3&&queryRepair.sourceContract==='pregame_temporal_entry_selection_v1'
     &&queryRepair.legacySelectionRecoveryEligible===true&&queryRepair.entryFilters?.length>0
     &&![work,...graph.ancestors(work.id)].some(w=>w.controlledRecovery?.engineeringChangeId==='temporal_entry_selection_e293');
   if(generation>3&&!envelopeRecovery&&!nativeFormationRecovery&&!nativeChanceRecovery&&!temporalEntryRecovery)return null; // Other exhausted chains stay stopped.
  return {id,role:'roster_workflow_experiment_planner',bindings:work.bindings,
    repairOf:work.id,repairGeneration:generation,
    ...(temporalEntryRecovery?{controlledRecovery:{engineeringChangeId:'temporal_entry_selection_e293',
      reason:'Old receipt hid an entry-ID filter mismatch as no-witness. One correction with source-selected entry, not a reset or repeated unchanged search.',
      originalResultRef:work.resultRef,priorGeneration:generation-1,additionalConfirmationLimit:1,historyReset:false}}:{}),
    ...(envelopeRecovery?{controlledRecovery:{engineeringChangeId:'spatial_envelope_v813',
      reason:'Actual nested parent passed into Native on the wrong root; the shared adapter now diagnoses exact outer versus Native fields before dispatch.',
      originalResultRef:work.resultRef,priorGeneration:generation-1,additionalConfirmationLimit:1,historyReset:false}}:{}),
    ...(nativeFormationRecovery?{controlledRecovery:{engineeringChangeId:'native_action_formation_delegation_v957',
      reason:'The shared Native-action delegation now exposes the action-domain formation solver required by this exact parameter repair; prior static witnesses and failures remain unchanged.',
      originalResultRef:work.resultRef,priorGeneration:generation-1,additionalConfirmationLimit:1,historyReset:false}}:{}),
    ...(nativeChanceRecovery?{controlledRecovery:{engineeringChangeId:'native_chance_envelope_v2',
      reason:'The source now declares the same Native dice array and product outcome nesting on fresh and retained feedback. Only the model corrects its old payload; original roll assumptions, failures and counters remain unchanged.',
      originalResultRef:work.resultRef,priorGeneration:generation-1,additionalConfirmationLimit:1,historyReset:false}}:{}),inputs:{
      task:{source:'literal',value:{instruction:queryRepair.controlReturn===true
        ?queryRepair.instruction
        :currentToolRepairTask({}).instruction,
        ...(queryRepair.controlReturn===true?{}:{methodResolution:structuredClone(ROSTER_REPAIR_METHOD_RESOLUTION_V1)}),
        completionContract:'Set workOrder.completionStepId only for the step answering the original failed question. A geometry/source read is preliminary, not completion of a combat query. For an unspecified original queryKind, explicitly select the correct kind and completing step; the host cannot infer that strategic choice.',
        originalWork:structuredClone(work.inputs.request.value),
        failure:{...structuredClone(failure),queryRepair:structuredClone(queryRepair)}}},
      ...sourceInputs,
      ...(work.resultRef?{failedObservation:{source:'evidence',id:rosterWorkflowUnresolvedSourceIdV1(work),pointer:''}}:{}),
      tools:{source:'literal',value:toolDescriptor}}};
}
