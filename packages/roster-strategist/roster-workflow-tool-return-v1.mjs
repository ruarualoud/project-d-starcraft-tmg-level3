// One work constructor for parameter correction and unresolved-method returns.
// The original Native receipt is retained; the new work is a model decision,
// never a successful replacement query or an automatic replay instruction.
import {createRosterWorkflowGraphV1} from './roster-workflow-graph-v1.mjs';
import {projectRosterExperimentSourceFactsV1} from './roster-experiment-source-facts-v1.mjs';

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
  const addWork=work=>{
    if(!work)return;
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
    if(report?.kind!=='model_branch_return_not_native_success'||!report.originalOrder?.steps)continue;
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
  if(generation>3&&!envelopeRecovery&&!nativeFormationRecovery)return null; // Other exhausted chains stay stopped.
  return {id,role:'roster_workflow_experiment_planner',bindings:work.bindings,
    repairOf:work.id,repairGeneration:generation,
    ...(envelopeRecovery?{controlledRecovery:{engineeringChangeId:'spatial_envelope_v813',
      reason:'Actual nested parent passed into Native on the wrong root; the shared adapter now diagnoses exact outer versus Native fields before dispatch.',
      originalResultRef:work.resultRef,priorGeneration:generation-1,additionalConfirmationLimit:1,historyReset:false}}:{}),
    ...(nativeFormationRecovery?{controlledRecovery:{engineeringChangeId:'native_action_formation_delegation_v957',
      reason:'The shared Native-action delegation now exposes the action-domain formation solver required by this exact parameter repair; prior static witnesses and failures remain unchanged.',
      originalResultRef:work.resultRef,priorGeneration:generation-1,additionalConfirmationLimit:1,historyReset:false}}:{}),inputs:{
      task:{source:'literal',value:{instruction:queryRepair.controlReturn===true
        ?queryRepair.instruction
        :'Correct only this failed tool input using the actual source-owned repair contract. Preserve the question and valid assumptions. For a missing source binding, choose explicit parameters from the real source; a description/schema is not a selected scenario. Return exactly one workOrder ending in the same corrected operation, or only necessary preliminary reads if a new model choice must follow. Preliminary reads do NOT resolve the failed query. Do not re-run successful sibling queries. Never fabricate a receipt.',
        completionContract:'Set workOrder.completionStepId only for the step answering the original failed question. A geometry/source read is preliminary, not completion of a combat query. For an unspecified original queryKind, explicitly select the correct kind and completing step; the host cannot infer that strategic choice.',
        originalWork:structuredClone(work.inputs.request.value),
        failure:{...structuredClone(failure),queryRepair:structuredClone(queryRepair)}}},
      ...sourceInputs,
      ...(work.resultRef?{failedObservation:{source:'evidence',id:rosterWorkflowUnresolvedSourceIdV1(work),pointer:''}}:{}),
      tools:{source:'literal',value:toolDescriptor}}};
}
