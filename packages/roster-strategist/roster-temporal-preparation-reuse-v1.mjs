// Reuse an already authorized, completed prerequisite across independent legs
// of ONE order. Never initialize a scene here or substitute a path observation.
import {isDeepStrictEqual as equal} from 'node:util';
import {createRosterWorkflowGraphV1} from './roster-workflow-graph-v1.mjs';
const copy=structuredClone;
export async function resolveRosterTemporalPreparationReuseV1({state,workId,selected,args,readArtifact}){
  const batch=selected.temporalBatchScope,source=args.stateRef;
  if(selected.operation!=='bounded_unit_temporal'||batch?.version!==1
    ||batch.kind!=='independent_single_unit_temporal_legs'||batch.jointWitness!==false
    ||batch.sharedTemporalState!==false||batch.authorParametersChanged!==false
    ||!batch.participantUnitIds?.includes(args.unitId)||args.start?.kind!=='reserve_entry'
    ||!selected.experimentId||source?.schema!=='roster_workflow_state_ref_v1')return null;
  const graph=createRosterWorkflowGraphV1(state),found=[],consumer=graph.get(workId);
  if(consumer?.role!=='roster_workflow_tool'||!graph.isFresh(workId)
    ||consumer.inputs?.request?.value?.experimentId!==selected.experimentId
    ||!equal(consumer.inputs.request.value.temporalBatchScope,batch))return null;
  const available=e=>e?.availability==='available'
    &&Object.entries(e.bindings??{}).every(([k,v])=>state.scope[k]===v);
  for(const work of state.work){
    const request=work.inputs?.request?.value;
    if(work.role!=='roster_workflow_tool'||work.status!=='evidence_ready'||!work.resolvedByWorkId
      ||!work.resultRef||work.operationState?.pending||!graph.isFresh(work.id)
      ||request?.operation!=='bounded_unit_temporal'||request.experimentId!==selected.experimentId
      ||!equal(request.temporalBatchScope,batch)||!equal(request.scenarioAssumptions,selected.scenarioAssumptions))continue;
    const resolved=await readArtifact(work.resultRef),value=resolved?.value;
    if(resolved.kind!=='tool_receipt'||resolved.continuation||value?.status!=='completed'
      ||value.operation!=='bounded_unit_temporal'||value.receipt?.resultStatus!=='ok')continue;
    for(const history of work.resultHistory??[]){
      const failed=await readArtifact(history.resultRef),failure=failed?.value;
      const detail=failure?.queryRepair?.detail,initialization=detail?.firstRoundInitialization;
      if(failure?.code!=='PREGAME_TEMPORAL_INPUT_INVALID'
        ||failure.queryRepair?.sourceContract!=='pregame_single_unit_temporal_v1'
        ||detail?.reason!=='native_start_not_initialized'||detail.searchStarted!==false
        ||initialization?.sourceEligible!==true||initialization.version!=='shared_official_first_round_setup_v2'
        ||initialization.workflowOperation!=='scenario'||!initialization.workflowArguments?.spec
        ||detail.baseStateHash!==source.stateHash||!equal(failure.submittedArguments?.stateRef,source))continue;
      for(const input of value.inputBindings??[]){
        if(input.argumentPointer!=='/stateRef'||!input.sourceEvidenceId)continue;
        const entry=state.evidence.find(e=>e.id===input.sourceEvidenceId);
        const prepare=state.work.find(w=>`tool:${w.id}`===entry?.id);
        if(!available(entry)||prepare?.role!=='roster_workflow_tool'||prepare.status!=='evidence_ready'
          ||!prepare.resultRef||prepare.operationState?.pending||!graph.isFresh(prepare.id))continue;
        const prepared=await readArtifact(prepare.resultRef),p=prepared?.value,receipt=p?.receipt;
        if(prepared.kind!=='tool_receipt'||prepared.continuation||p?.status!=='completed'||p.operation!=='scenario'
          ||receipt?.resultStatus!=='ok'||receipt.parentStateHash!==source.stateHash
          ||receipt.sourceStateHash!==source.sourceStateHash||receipt.rulesRuntimeHash!==state.scope.rules
          ||!equal(p.submittedArguments?.stateRef,source)
          ||!equal(p.submittedArguments?.spec,initialization.workflowArguments.spec)
          ||Object.keys(p.submittedArguments).some(k=>!['spec','stateRef'].includes(k))
          ||!prepare.inputs.request.value.guards?.some(g=>g.name==='temporalInitializationSource'&&equal(g.expected,source))
          ||receipt.hypotheticalPlacements?.length||receipt.branchStateRegisteredForQueries!==true
          ||p.stateRef?.stateHash!==receipt.branchStateHash||p.stateRef.sourceStateHash!==source.sourceStateHash
          ||p.stateRef.contextRef!==source.contextRef||!equal(input.value,p.stateRef)
          ||!equal(value.stateRef,p.stateRef)||!equal(await readArtifact(entry.artifactRef),p))continue;
        found.push({args:{...copy(args),stateRef:copy(p.stateRef)},binding:{
          normalization:'same_batch_temporal_preparation_v1',argumentPointer:'/stateRef',priorFieldPresent:true,
          priorValue:copy(source),value:copy(p.stateRef),batchExperimentId:selected.experimentId,
          originalFailedWorkId:work.id,originalFailureRef:history.resultRef,
          preparationWorkId:prepare.id,preparationResultRef:prepare.resultRef,preparationEvidenceId:entry.id,
          preparationArtifactRef:entry.artifactRef,preparationReceiptHash:receipt.receiptHash,
          preparationReused:true,newPreparation:false,queryParametersChanged:false,pathObservationReused:false,
          instruction:'Only the exact completed prerequisite is shared. This leg still needs its own Native query or exact existing-query match; no arrival, joint control or future VP is inherited.'}});
      }
    }
  }
  if(!found.length||found.some(p=>!equal(p.args.stateRef,found[0].args.stateRef)))return null;
  return found[0];
}
