// A changed observation contract can notify its currently blocked owner once.
// This does not adjudicate the model's claim or manufacture a replacement fact.
const copy=structuredClone;
export async function projectRosterActionAvailabilityReconsiderationV1({state,readArtifact}){
  if(state.work.some(w=>w.status==='ready'||w.status==='running'||w.operationState?.pending))return null;
  const current=w=>w&&w.status!=='superseded'&&Object.entries(w.bindings??{}).every(([k,v])=>state.scope[k]===v);
  for(const goal of [...state.work].reverse()){
    const prior=state.work.find(w=>w.id===goal.investigationHandoff?.decisionId);
    if(!current(goal)||!current(prior)||prior.role!=='roster_workflow_strategy_decision'
      ||prior.status!=='evidence_ready'||!prior.resultRef||!prior.draftOutcomeRef
      ||prior.inputs.actionAvailabilityContractChange)continue;
    const result=await readArtifact(prior.resultRef),decision=result.value?.decisions?.[0];
    if(decision?.disposition!=='retain'||decision.nextInvestigation!==null
      ||decision.workflowBlocker?.kind!=='capability_unavailable')continue;
    const outcome=await readArtifact(prior.draftOutcomeRef);
    if(outcome.applied!==false||!['retain','retained'].includes(outcome.status))continue;
    const id=prior.id+':action-availability-v1';if(state.work.some(w=>w.id===id))continue;
    const inspections=[];
    for(const ref of decision.evidenceRefs??[]){
      let artifact=await readArtifact(ref.artifactRef),sourceRef=ref;
      if(artifact.schema==='roster_workflow_receipt_view_v1'){
        const original=state.evidence.find(e=>e.id===artifact.evidenceId);if(!original)continue;
        sourceRef={id:original.id,artifactRef:original.artifactRef};artifact=await readArtifact(original.artifactRef);
      }
      const value=artifact.kind==='tool_receipt'?artifact.value:artifact;
      if(value.operation!=='inspect'||!value.receipt?.actionSpace||value.receipt.actionSpace.actionAvailability)continue;
      if(!inspections.some(r=>r.sourceArtifactRef===sourceRef.artifactRef))inspections.push({
        sourceEvidenceId:sourceRef.id,sourceArtifactRef:sourceRef.artifactRef,
        baseStateHash:value.receipt.baseStateHash,contextRef:value.contextRef??null,
        diagnosticAbsentInOriginal:true});
    }
    if(!inspections.length)continue;
    const change={version:1,sourceContract:'starcraft_tmg_native_action_availability_v1',
      sourceWorkId:prior.id,sourceResultRef:prior.resultRef,inspections,
      nativeReplayed:false,historyReset:false,blockerDisproven:false,planApproved:false,
      instruction:'Your current capability blocker cited an old inspect result that omitted Native disabled-action reasons. New inspect on the explicitly selected SAME saved state/context exposes actionSpace.actionAvailability, separate from capability routes/phases and executable domains. Reconsider only this assigned blocker. If needed, authorize a bounded fresh diagnostic inspection of that saved state; do not replay attacks/solver or create another army/scene merely to refresh diagnostics. A current disabledReason is not global unsupported capability; an absent reason is not proof either. Keep any genuine remaining capability/input gap and the original required questions. This notification itself supplies no eligibility answer, no strategy choice and no approval.'};
    return {id,role:prior.role,bindings:copy(prior.bindings),draftRevision:state.draftRevision,
      investigationFrontierOf:goal.id,investigationOwnerId:prior.investigationOwnerId,
      reconsidersFrontierOf:prior.id,reconsidersDecisionOf:prior.id,
      inputs:{...copy(prior.inputs),
        previousStrategicDecision:{source:'evidence',id:'role:'+prior.id,pointer:'',scopeUsage:'historical_reference'},
        actionAvailabilityContractChange:{source:'literal',value:change},
        question:{source:'literal',value:{goal:'当前不可用与能力未实现分开：按新诊断合同重新处理原能力阻塞，不重做实验。',
          originalAssignment:copy(prior.inputs.question?.value??null),instruction:change.instruction}}}};
  }
  return null;
}
