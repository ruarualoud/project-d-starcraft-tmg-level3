// New workflow boundary; legacy sessions keep their existing recovery policy.
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {isDeepStrictEqual} from 'node:util';
import {isExplicitlyRecoverableProviderFailureV1,isExplicitLatestProviderRetryV1,reconcileStarcraftTmgProviderDispatchV1} from '../secure-provider-runtime/provider-dispatch-recovery-v1.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {rosterRoleReplyCommunicationErrorsV1} from '../roster-strategist/roster-role-communication-v1.mjs';
// Retired work keeps its unknown bill/dispatch for accounting, but is no longer
// executable. An active unknown remains a strict, explicitly authorized retry.
export function rosterWorkflowTransportResumeWorkV1({state,allowSingleRetry=false,workIds,additionalRetryPolicy={},localReplyWorkIds=new Set()}){
  const active=state.work.filter(w=>w.status!=='superseded'&&(!workIds||workIds.includes(w.id)));
  if(workIds&&active.length!==workIds.length)throw Error('ROSTER_PROVIDER_RECOVERY_WORK_SELECTION_INVALID');
  const latestRetry=w=>isExplicitLatestProviderRetryV1({dispatch:w.failure?.providerDispatch,
    currentDispatch:w.failure?.providerDispatch,retainedRetry:w.operationState?.retryProviderDispatch,
    authorizationId:additionalRetryPolicy.authorizationId,
    expectedRequestId:additionalRetryPolicy.expectedRequestIds?.[w.id],
    authorizeOneAdditionalDispatchRetry:additionalRetryPolicy.authorizeOneAdditionalDispatchRetry,
    history:w.failureHistory??[]});
  if(active.some(w=>w.status==='running'||w.operationState?.pending&&!localReplyWorkIds.has(w.id)&&!(allowSingleRetry&&w.status==='needs_repair'
    &&isExplicitlyRecoverableProviderFailureV1(w.failure)
    &&(!w.operationState.retryProviderDispatch||latestRetry(w)))))throw Error('UNRECONCILED_DISPATCH_MUST_NOT_RESTART');
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
export async function createRosterWorkflowProviderBoundaryV1({factory,onEvent,dispatchJournalFile,networkRecoveryPolicy=null,...input}){
  const completedFailures=new Map();
  const dispatches=new Map();
  const durableAttempts=new Map(),normalInFlight=new Set();
  let journalLoaded;
  function rememberDispatch(dispatch){
    if(!dispatch?.contextHash)return;
    if(!durableAttempts.has(dispatch.contextHash))durableAttempts.set(dispatch.contextHash,new Map());
    durableAttempts.get(dispatch.contextHash).set(dispatch.requestId,dispatch);
  }
  async function readJournal(){
    try{
      const saved=await fs.readFile(dispatchJournalFile,'utf8');
      for(const line of saved.split('\n'))if(line.trim())rememberDispatch(JSON.parse(line).dispatch);
    }catch(error){
      if(error.code==='ENOENT')return;
      throw Object.assign(Error('ROSTER_WORKFLOW_PROVIDER_DISPATCH_JOURNAL_UNREADABLE',{cause:error}),
        {code:'ROSTER_WORKFLOW_PROVIDER_DISPATCH_JOURNAL_UNREADABLE',dispatchOutcome:'not_dispatched'});
    }
  }
  function loadJournal(){
    journalLoaded??=readJournal();
    return journalLoaded;
  }
  const record=async event=>{
    if(event?.type==='provider_dispatch'&&event.dispatch?.contextHash){
      // The Secure Adapter emits identity/status/usage, never request headers
      // or response bodies here. Persist before egress independently of UI or
      // caller telemetry, including a crash before the core catches an error.
      const dispatch=structuredClone(event.dispatch);
      if(dispatchJournalFile){
        await loadJournal();
        await fs.mkdir(path.dirname(dispatchJournalFile),{recursive:true});
        await fs.appendFile(dispatchJournalFile,JSON.stringify({at:event.at??new Date().toISOString(),dispatch})+'\n');
        rememberDispatch(dispatch);
      }
      dispatches.set(dispatch.contextHash,dispatch);
    }
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
      const dispatch=dispatches.get(request.contextHash);
      if(dispatch)error.providerDispatch=structuredClone(dispatch);
      throw error; // Transport/auth/unknown outcomes never become content repair.
    }
  }
  // Workflow checkpoints can be restored independently of the wire ledger.
  // Check the latter at the shared egress boundary before a normal dispatch.
  async function assertUnissued(request){
    if(!dispatchJournalFile)return;
    await loadJournal();
    const {contextHash}=request;
    const previous=[...(durableAttempts.get(contextHash)?.values()??[])].reverse().find(dispatch=>
      ['sessionId','roundKind','roundIndex'].every(key=>dispatch[key]==null||dispatch[key]===request[key])
      &&!reconcileStarcraftTmgProviderDispatchV1({dispatchRecord:dispatch}).automaticResendAllowed);
    if(previous){
      const code='ROSTER_WORKFLOW_PROVIDER_EXISTING_DISPATCH_REQUIRES_RECONCILIATION';
      throw Object.assign(Error(code),{code,dispatchOutcome:'unknown',providerDispatch:structuredClone(previous)});
    }
  }
  async function deliberate(request){
    if(!dispatchJournalFile)return invoke(port,request);
    await assertUnissued(request);
    const {contextHash}=request;
    if(normalInFlight.has(contextHash)){
      const code='ROSTER_WORKFLOW_PROVIDER_LOGICAL_REQUEST_IN_FLIGHT';
      throw Object.assign(Error(code),{code,dispatchOutcome:'not_dispatched'});
    }
    normalInFlight.add(contextHash);
    try{return await invoke(port,request);}
    finally{normalInFlight.delete(contextHash);}
  }
  // Explicit authorization is about an unresolved attempt, not permission to
  // resend a logical request after its response arrives. Recheck the persisted
  // boundary after preparing the port; an old in-memory journal is insufficient.
  async function assertRetryHasNoReturnedResponse(request){
    if(!dispatchJournalFile)return;
    await readJournal();
    const returned=[...(durableAttempts.get(request.contextHash)?.values()??[])].reverse().find(dispatch=>
      ['response_received','completed'].includes(dispatch.status)
      &&['sessionId','roundKind','roundIndex'].every(key=>dispatch[key]==null||dispatch[key]===request[key]));
    if(!returned)return;
    const code='ROSTER_WORKFLOW_PROVIDER_EXISTING_DISPATCH_REQUIRES_RECONCILIATION';
    throw Object.assign(Error(code),{code,dispatchOutcome:'unknown',providerDispatch:structuredClone(returned)});
  }
  return {deliberate,assertUnissued,async retry(request,retryDispatch){
    if(retryDispatch?.providerHandoff){
      const target=retryDispatch.providerHandoff,actual=await factory.availability?.();
      if(actual?.supportsExplicitProviderHandoff!==true||actual.kind!==target.providerKind
        ||actual.modelVersion!==target.modelVersion)throw Error('ROSTER_WORKFLOW_PROVIDER_HANDOFF_TARGET_MISMATCH');
    }
    if(retryDispatch?.kind==='legacy_unrecorded_rejection_v1'){
      if(retryDispatch.contextHash!==request.contextHash||retryDispatch.sessionId!==request.sessionId
        ||retryDispatch.roundKind!==request.roundKind||retryDispatch.roundIndex!==request.roundIndex
        ||retryDispatch.allowUnknownCharge!==true||!retryDispatch.authorizationId||!retryDispatch.sourceRequestRef
        ||retryDispatch.requestId||retryDispatch.originalWireIdentityKnown!==false)
        throw Error('ROSTER_WORKFLOW_UNRECORDED_REJECTION_REQUEST_MISMATCH');
      // A newly recorded attempt of the exact saved semantic request, NOT a
      // fabricated old transport dispatch or a claim of identical wire bytes.
      return deliberate(request);
    }
    // Secure Provider verifies session, body hash, encoding and instruction
    // version before spending. No second automatic recovery of this retry.
    const retryPort=await factory.createForRun({...input,onEvent:record,retryDispatch});
    await assertRetryHasNoReturnedResponse(request);
    return invoke(retryPort,request);
  }};
}
