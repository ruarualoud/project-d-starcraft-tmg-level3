// New workflow boundary; legacy sessions keep their existing recovery policy.
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {isDeepStrictEqual} from 'node:util';
import {rosterRoleReplyCommunicationErrorsV1} from '../roster-strategist/roster-role-communication-v1.mjs';
// Retired work keeps its unknown bill/dispatch for accounting, but is no longer
// executable. An active unknown remains a strict, explicitly authorized retry.
export function rosterWorkflowTransportResumeWorkV1({state,allowSingleRetry=false}){
  const active=state.work.filter(w=>w.status!=='superseded');
  if(active.some(w=>w.status==='running'||w.operationState?.pending&&!(allowSingleRetry&&w.status==='needs_repair'
    &&['ROSTER_WORKSPACE_PROVIDER_SEND_FAILED','ROSTER_WORKSPACE_AMBIGUOUS_DISPATCH_STOP'].includes(w.failure?.code)
    &&!w.operationState.retryProviderDispatch)))throw Error('UNRECONCILED_DISPATCH_MUST_NOT_RESTART');
  return active.filter(w=>w.operationState?.pending);
}
export function rosterWorkflowCompletedOutputFailureV1(event,contextHash){
  const record=event?.failedOutputRecord;
  if(event?.type!=='round_failed'||event.code!=='ROSTER_WORKSPACE_OUTPUT_UNPARSEABLE'
    ||record?.contextHash!==contextHash||typeof record.rawText!=='string'
    ||typeof record.roundKind!=='string'||!Number.isSafeInteger(record.roundIndex)
    ||event.roundKind!==undefined&&event.roundKind!==record.roundKind
    ||event.roundIndex!==undefined&&event.roundIndex!==record.roundIndex
    ||record.rawTextHash!==hash(record.rawText)||event.paidProviderCall!==true
    ||!Number.isSafeInteger(event.usage?.totalUnits)||event.usage.totalUnits<0)return null;
  return {output:null,providerFailure:structuredClone(record),receipt:{contextHash,
    roundKind:record.roundKind,roundIndex:record.roundIndex,outputContractRef:structuredClone(record.outputContractRef),
    usage:structuredClone(event.usage),latencyMs:event.latencyMs,receiptHash:event.receiptHash,
    providerReceiptHash:event.receiptHash,paidProviderCall:true,outputUnavailable:true},
    failureCode:event.code,dispatchOutcome:'completed_invalid'};
}
// Historical completed failure records already contain Host-assigned identity.
// Restore only the omitted envelope field, never invent it from a request or
// parse/accept malformed strategy text. Contradictory identity stays quarantined.
export function projectRosterCompletedFailureIdentityV1({request,reply}){
  const record=reply?.providerFailure,receipt=reply?.receipt;
  if(!request||reply?.failureCode!=='ROSTER_WORKSPACE_OUTPUT_UNPARSEABLE'||reply.output!==null
    ||reply.dispatchOutcome!=='completed_invalid'||receipt?.paidProviderCall!==true
    ||record?.schema!=='starcraft_tmg_roster_failed_provider_output_v1'
    ||record.contextHash!==request?.contextHash||receipt.contextHash!==request.contextHash
    ||record.roundKind!==request.roundKind||record.roundIndex!==request.roundIndex
    ||!isDeepStrictEqual(record.outputContractRef,request.responseFormat?.outputContractRef)
    ||typeof record.rawText!=='string'||record.rawTextHash!==hash(record.rawText)
    ||receipt.roundKind!==undefined
    ||receipt.roundIndex!==undefined&&receipt.roundIndex!==record.roundIndex
    ||receipt.outputContractRef!==undefined&&!isDeepStrictEqual(receipt.outputContractRef,record.outputContractRef)
    ||!Number.isSafeInteger(receipt.usage?.totalUnits)||receipt.usage.totalUnits<0)return null;
  const projected={...structuredClone(reply),receipt:{...structuredClone(receipt),roundKind:record.roundKind,
    roundIndex:record.roundIndex,outputContractRef:structuredClone(record.outputContractRef)},
    failureIdentityProjection:{version:1,source:'saved_failed_output_record',originalReplyUnchanged:true}};
  return rosterRoleReplyCommunicationErrorsV1(request,projected).length?null:projected;
}
export async function reconcileRosterCompletedFailureIdentityV1({workflow,store}){
  const state=await workflow.inspect(),recovered=[];
  for(const work of state.work){
    const failure=work.failure,op=work.operationState,detail=failure?.detail;
    if(work.status!=='needs_repair'||failure?.code!=='ROSTER_WORKFLOW_REPLY_IDENTITY_MISMATCH'
      ||failure.dispatchOutcome!=='completed_unattributed'||!op?.pending
      ||detail?.requestRef!==op.pending.requestRef||detail.lane!=='provider'
      ||!detail.errors?.length||!detail.errors.every(e=>e.field==='roundKind'&&e.actual===null))continue;
    const request=await store.get(detail.requestRef),original=await store.get(detail.replyRef);
    if(request.contextHash!==op.pending.contextHash)continue;
    const reply=projectRosterCompletedFailureIdentityV1({request,reply:original});if(!reply)continue;
    await workflow.dispatch({type:'reconcile_provider_reply',workId:work.id,reply,
      reason:'v877: completed malformed output identity is present in the same saved failure document; restore its omitted wrapper field and enter existing content correction. Original reply '+detail.replyRef+' retained, no Provider replay, value edit, counter reset or strategy approval.'});
    recovered.push(work.id);
  }
  return recovered;
}
export async function createRosterWorkflowProviderBoundaryV1({factory,onEvent,networkRecoveryPolicy=null,...input}){
  const completedFailures=new Map();
  const record=async event=>{
    const contextHash=event?.failedOutputRecord?.contextHash;
    const saved=contextHash?rosterWorkflowCompletedOutputFailureV1(event,contextHash):null;
    if(saved)completedFailures.set(contextHash,saved);
    await onEvent?.(event);
  };
  const recoverNetworkDispatch=async dispatch=>{
    if(!networkRecoveryPolicy||dispatch.retryOfRequestId||dispatch.retryOfNotSentRequestId)return null;
    const status=Number(dispatch.transportFailure?.status);
    if(status>=400&&status<500&&status!==429)return null;
    if(dispatch.status==='definitely_not_sent'&&dispatch.transportFailure?.requestDefinitelyNotSent===true
      &&networkRecoveryPolicy.retryDefinitelyNotSent===true)return dispatch;
    if(dispatch.status==='ambiguous'&&networkRecoveryPolicy.ambiguousAuthorizationId)
      return {...dispatch,retryAuthorizationId:networkRecoveryPolicy.ambiguousAuthorizationId};
    return null;
  };
  const port=await factory.createForRun({...input,onEvent:record,recoverNetworkDispatch});
  async function invoke(selected,request){
    try{return await selected.deliberate(request);}
    catch(error){const completed=completedFailures.get(request.contextHash);
      if(completed&&error.message===completed.failureCode){completedFailures.delete(request.contextHash);
        return completed;}
      throw error; // Transport/auth/unknown outcomes never become content repair.
    }
  }
  return {deliberate:request=>invoke(port,request),async retry(request,retryDispatch){
    // Secure Provider verifies session, body hash, encoding and instruction
    // version before spending. No second automatic recovery of this retry.
    const retryPort=await factory.createForRun({...input,onEvent:record,retryDispatch});
    return invoke(retryPort,request);
  }};
}
