import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';

export function rosterPlanRevisionRecoveryV1(session,plan) {
  if(session.status==='failed' && ['DEBUG_BOUNDARY_INSPECTION_REQUIRED',
    'ROSTER_WORKSPACE_RUN_INTERRUPTED_BY_RESTART'].includes(session.failure?.code)) {
    const dispatch=session.providerDispatches?.at(-1);
    const retained=session.publicOutputs?.findLast(r=>r.contextHash===dispatch?.contextHash
      && r.roundKind==='revision' && r.roundIndex===plan?.planVersion+1);
    if(dispatch?.status==='completed' && dispatch.planHash===plan?.planHash
      && retained?.outputContractRef?.id?.startsWith('ticket27.plan_edit_tools.')
      && retained.outputHash===dispatch.outputHash && hash(retained.sanitizedOutput)===retained.outputHash) {
      return {canContinue:true,reason:'paid_revision_batch_retained_for_same_plan',
        planHash:plan.planHash,contextHash:dispatch.contextHash,requestId:dispatch.requestId,
        paidOriginalRetained:true};
    }
  }
  const round=session.progress?.rounds?.at(-1);
  if(session.status!=='failed' || session.failure?.code!=='ROSTER_WORKSPACE_PROVIDER_OUTPUT_INCOMPLETE'
    || round?.roundKind!=='revision' || round.roundIndex!==plan?.planVersion+1
    || round.failureCode!=='ROSTER_WORKSPACE_PROVIDER_OUTPUT_INCOMPLETE') return {canContinue:false};
  const dispatch=session.providerDispatches?.find(d=>d.requestId===round.dispatchRequestId);
  const record=session.failedProviderOutputs?.findLast(r=>r.contextHash===dispatch?.contextHash
    && r.roundKind==='revision' && r.roundIndex===round.roundIndex);
  const valid=dispatch?.status==='response_received' && dispatch.planHash===plan.planHash
    && record?.outputContractRef?.id?.startsWith('ticket27.plan_edit_tools.')
    && rosterInterruptedEditDraftV1(record);
  return valid ? {canContinue:true,reason:'known_incomplete_same_plan_revision',
    requestId:dispatch.requestId,contextHash:record.contextHash,rawTextHash:record.rawTextHash,
    planHash:plan.planHash,paidOriginalRetained:true} : {canContinue:false};
}

export function rosterInterruptedEditDraftV1(record) {
  if (record?.roundKind !== 'revision' || record.providerStatus !== 'incomplete'
    || record.providerIncompleteReason !== 'max_output_tokens'
    || typeof record.rawText !== 'string' || hash(record.rawText) !== record.rawTextHash) return null;
  // This is an explicitly incomplete, untrusted preview, NEVER a completed tool
  // call. The paid original stays intact. Do not feed a repeated citation tail
  // back to the model or infer missing JSON/strategy/source selections.
  const citationStart = record.rawText.indexOf(',"factIds":');
  const end = Math.min(citationStart >= 0 ? citationStart : record.rawText.length, 12000);
  return {sourceContextHash:record.contextHash,rawTextHash:record.rawTextHash,
    incompletePublicDraft:record.rawText.slice(0,end),omittedCharacters:record.rawText.length-end,
    sourceOutcome:'incomplete_not_accepted',applied:false,trainingTruth:false,
    instruction:'This is an unaccepted fragment of a paid interrupted response, not a Plan or Rules evidence. Reconsider it against the same sources, then return complete structured tool arguments. No missing statement or citation is inferred. The host retains the entire original.'};
}

export function createRosterPlanEditRecoveryPortV1({port,retainedIncompleteOutputs=[]}) {
  return Object.freeze({...port,async deliberate(request) {
    const saved = retainedIncompleteOutputs.findLast(record =>
      record.contextHash === request.contextHash && record.roundIndex === request.roundIndex
      && record.outputContractRef?.hash === request.responseFormat?.outputContractRef?.hash
      && rosterInterruptedEditDraftV1(record));
    if (saved) throw Object.assign(new Error('ROSTER_WORKSPACE_PROVIDER_OUTPUT_INCOMPLETE'),{
      code:'ROSTER_WORKSPACE_PROVIDER_OUTPUT_INCOMPLETE',providerIncompleteReason:'max_output_tokens',
      failedOutputRecord:structuredClone(saved),replayedFailure:true});
    return port.deliberate(request);
  }});
}
