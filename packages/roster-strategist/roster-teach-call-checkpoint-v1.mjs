import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
const fail=code=>{throw Object.assign(Error(code),{code});};

export function retireRosterTeachUnsentDownstreamCallV1({state,retainedPublicOutputs,retainedDispatches}) {
  const pending=state.pendingModelCall;
  if (!pending || pending.kind==='teach_framework_investigate') return false;
  const request=pending.request, contextHash=request?.contextHash;
  if (!contextHash || !Array.isArray(retainedPublicOutputs) || !Array.isArray(retainedDispatches)
    || retainedPublicOutputs.some(row=>row.contextHash===contextHash)
    || retainedDispatches.some(row=>row.contextHash===contextHash)
    || state.calls?.some(row=>row.contextHash===contextHash)) {
    fail('ROSTER_TEACH_UPSTREAM_CONTINUATION_REQUIRES_SETTLED_DOWNSTREAM');
  }
  (state.supersededUnsentModelCalls||=[]).push({kind:pending.kind,
    sourceHash:pending.sourceHash,planHash:pending.planHash,
    previousRequest:structuredClone(request),
    reason:'productive_upstream_result_not_yet_consumed',providerDispatches:0,paidRepliesUnchanged:true});
  delete state.pendingModelCall;
  return true;
}

export function rosterTeachRecoveryCallOwnerV1(request) {
  const query=request?.promptNodes?.find(node=>node.kind==='failed_query_to_correct');
  return typeof query?.originalQueryId==='string' ? query.originalQueryId : null;
}

// A sequential model step is a durable request, not a regenerated view of the
// in-memory branch cache. Provider dispatch/reply records remain authoritative
// for sending/retry/fees; this module only restores the unfinished workflow step.
export function prepareRosterTeachModelCallV1({state,request,sourceHash,planHash,
  retainedPublicOutputs=[],retainedDispatches=[]}) {
  const previous=state.pendingModelCall;
  const feedback=previous?.request?.promptNodes?.find(node=>node.kind==='repair_completed_public_reply');
  const resolved=feedback?.previousOutput && state.replyCorrections?.find(row=>
    row.kind===previous.kind && row.status==='resolved_by_current_validator'
    && row.revalidation?.reusedPaidOutput===true
    && hash(row.correction?.previousOutput)===hash(feedback.previousOutput));
  if(resolved && previous.sourceHash===sourceHash && previous.planHash===planHash){
    // The original paid choice was accepted by the current validator. A later
    // correction may also have finished before that source fix landed. Preserve
    // that exact paid proposal, but do not mistake it for an unknown dispatch or
    // replay it as the next workflow operation. Ambiguous sends still stop.
    const outputs=retainedPublicOutputs.filter(row=>row.contextHash===previous.request.contextHash);
    const dispatches=retainedDispatches.filter(row=>row.contextHash===previous.request.contextHash);
    const completed=outputs.length===1 && outputs[0].roundKind===previous.kind
      && outputs[0].sanitizedOutput && hash(outputs[0].sanitizedOutput)===outputs[0].outputHash
      && dispatches.length>0 && dispatches.every(row=>row.status==='completed'
        && row.sessionId===previous.request.sessionId && row.planHash===planHash
        && row.roundKind===previous.kind && row.outputHash===outputs[0].outputHash
        && row.requestId===outputs[0].dispatchRequestId
        && row.outputContractRef?.hash===outputs[0].outputContractRef?.hash);
    if((dispatches.length || outputs.length) && !completed)
      fail('ROSTER_TEACH_CORRECTION_DISPATCH_RECONCILIATION_REQUIRED');
    state.retiredCorrectionRequests||=[];
    state.retiredCorrectionRequests.push({contextHash:previous.request.contextHash,
      kind:previous.kind,sourceHash,planHash,acceptedOriginalContextHash:resolved.baseContextHash,
      reason:'original_paid_reply_accepted_by_current_validator',newProviderCalls:0,
      ...(completed?{settlement:'completed_paid_correction_superseded',
        completedOutputHash:outputs[0].outputHash,completedDispatchRequestId:outputs[0].dispatchRequestId,
        request:structuredClone(previous.request),paidCorrectionRetained:true}:{}),
      originalPaidRecordPreserved:true});
    delete state.pendingModelCall;
  }
  let pending=state.pendingModelCall;
  // Citation repair and ordinary reader steps share one read-only owner. A
  // source fix can remove the citation error before its reserved call is sent.
  // Retire only a provably unsent operation; paid/ambiguous requests and a new
  // Plan/source/session must continue through their existing reconciliation.
  const readerKinds = new Set(['teach_framework_citation_patch','teach_framework_citation_delta','teach_framework_synthesis_step']);
  const isReader = value => value?.promptNodes?.some(node =>
    node.kind === 'readonly_synthesis_workspace' && node.version === 'readonly_synthesis_reader_v1');
  if (pending?.request && pending.kind !== request.roundKind
    && readerKinds.has(pending.kind) && readerKinds.has(request.roundKind)
    && pending.sourceHash === sourceHash && pending.planHash === planHash
    && pending.request.sessionId === request.sessionId
    && isReader(pending.request) && isReader(request)
    && !retainedDispatches.some(row => row.contextHash === pending.request.contextHash)
    && !retainedPublicOutputs.some(row => row.contextHash === pending.request.contextHash)
    && !state.calls?.some(row => row.contextHash === pending.request.contextHash)) {
    (state.supersededUnsentModelCalls ||= []).push({kind:pending.kind,sourceHash,planHash,
      previousRequest:structuredClone(pending.request),replacementContextHash:request.contextHash,
      replacementKind:request.roundKind,reason:'same_reader_unsent_operation_reselected',
      providerDispatches:0,paidRepliesUnchanged:true});
    delete state.pendingModelCall;
    pending = null;
  }
  if (pending && (pending.sourceHash!==sourceHash || pending.planHash!==planHash
    || pending.kind!==request.roundKind)) fail('ROSTER_TEACH_PENDING_CALL_SOURCE_CHANGED');
  if(pending?.request && rosterTeachRecoveryCallOwnerV1(pending.request)!==rosterTeachRecoveryCallOwnerV1(request))
    fail('ROSTER_TEACH_PENDING_CALL_OWNER_CHANGED');
  if(pending?.request&&pending.request.contextHash!==request.contextHash
    &&!retainedDispatches.some(row=>row.contextHash===pending.request.contextHash)
    &&!retainedPublicOutputs.some(row=>row.contextHash===pending.request.contextHash)
    &&!state.calls?.some(row=>row.contextHash===pending.request.contextHash)){
    (state.supersededUnsentModelCalls||=[]).push({kind:pending.kind,sourceHash,planHash,
      previousRequest:structuredClone(pending.request),replacementContextHash:request.contextHash,
      reason:'same_owner_unsent_source_view_refreshed',providerDispatches:0,paidRepliesUnchanged:true});
    pending.request=structuredClone(request);
  }
  if (pending?.request) return {request:structuredClone(pending.request),retained:null,providerCallRequired:true};
  const completed=retainedPublicOutputs.filter(output=>{
    if (output.roundKind!==request.roundKind || !output.sanitizedOutput
      || state.calls?.some(call=>call.contextHash===output.contextHash)
      || hash(output.sanitizedOutput)!==output.outputHash) return false;
    return retainedDispatches.some(dispatch=>dispatch.requestId===output.dispatchRequestId
      && dispatch.sessionId===request.sessionId && dispatch.planHash===planHash
      && dispatch.roundKind===output.roundKind && dispatch.contextHash===output.contextHash
      && dispatch.status==='completed' && dispatch.outputHash===output.outputHash
      && dispatch.outputContractRef?.hash===output.outputContractRef?.hash);
  });
  if (completed.length>1) fail('ROSTER_TEACH_PENDING_REPLY_AMBIGUOUS');
  if (pending?.retainedContextHash && completed[0]?.contextHash!==pending.retainedContextHash)
    fail('ROSTER_TEACH_PENDING_REPLY_MISSING');
  const retained=completed[0]||null;
  state.pendingModelCall={version:1,kind:request.roundKind,sourceHash,planHash,
    ...(retained ? {retainedContextHash:retained.contextHash,retainedDispatchRequestId:retained.dispatchRequestId}
      : {request:structuredClone(request)})};
  return {request,retained,providerCallRequired:!retained};
}
