// Internal control result, never a Provider/schema failure or a Rules fact.
// Only throw before issuing external work; an already issued call must settle.
export class RosterWorkflowDispatchPause extends Error {
  constructor(stage,detail={}){
    super('ROSTER_WORKFLOW_PAUSED_BEFORE_DISPATCH');
    this.code='ROSTER_WORKFLOW_PAUSED_BEFORE_DISPATCH';
    this.dispatchOutcome='not_dispatched';
    this.detail={stage,...detail};
  }
}
export function assertRosterWorkflowDispatchAllowedV1(shouldStop,stage,detail){
  if(shouldStop?.()===true)throw new RosterWorkflowDispatchPause(stage,detail);
}

// Host-only observation of a legacy request which had no durable phase marker.
// This is not a Provider receipt and cannot be supplied as model/tool evidence.
export function projectRosterObservedUnissuedRequestV1({work,request,observation}){
  const p=work?.operationState?.pending,op=work?.operationState;
  const c=observation?.controller,s=observation?.session,j=observation?.providerJournal;
  // A retired in-process verification attempt can release its scheduling
  // barrier only with a Host observation of that exact local adapter exit.
  // This does not reopen the old writer or reinterpret a transport failure.
  if(observation?.kind==='host_observed_retired_isolated_attempt_v1'){
    const sha256=value=>/^[a-f0-9]{64}$/u.test(value??'');
    if(!p||p.phase!=='provider_entered'||work.status!=='superseded'
      ||op.retryProviderDispatch||op.revalidateReplyRef
      ||work.failure?.dispatchOutcome!=='unknown'||!work.failure.code
      ||work.failure.providerDispatch||work.failure.providerRejection
      ||request.contextHash!==p.contextHash||request.roundKind!==work.role||request.roundIndex!==op.turn+1
      ||c?.adapterKind!=='in_process_fixture'||c.processExited!==true||c.exitCode!==0
      ||c.workId!==work.id||c.dispatchKey!==work.dispatchKey
      ||c.requestRef!==p.requestRef||c.contextHash!==p.contextHash||c.failureCode!==work.failure.code
      ||c.externalProviderCalls!==0||c.completedReplies!==0
      ||!sha256(c.adapterSourceHash)||!sha256(c.exitRecordHash)
      ||!Number.isFinite(Date.parse(observation.observedAt)))return null;
    return {version:1,kind:'read_role_observed_before_provider',workId:work.id,
      dispatchKey:work.dispatchKey,inputRef:work.inputRef,requestRef:p.requestRef,contextHash:p.contextHash,
      observationKind:observation.kind,retiredWorkPreserved:true,providerReplayed:false,nativeReplayed:false,
      countersReset:false,historyReset:false,factsApproved:false};
  }
  // Legacy external send gates ran after the role's Provider-entry marker but
  // before the secure Adapter. Only an explicit Host observation of that known
  // guard can reconcile it; absence of a transport row alone proves nothing.
  if(observation?.kind==='host_observed_pre_dispatch_guard_v1'){
    if(!p||p.phase!=='provider_entered'||work.status!=='needs_repair'
      ||op.retryProviderDispatch||op.revalidateReplyRef
      ||work.failure?.code!=='DS_QUOTA_EXHAUSTED_PAUSED'
      ||work.failure?.providerDispatch||work.failure?.providerRejection
      ||request.contextHash!==p.contextHash||request.roundKind!==work.role||request.roundIndex!==op.turn+1
      ||c?.status!=='blocked_before_provider'||c.workId!==work.id
      ||c.requestRef!==p.requestRef||c.contextHash!==p.contextHash
      ||c.failureCode!==work.failure.code||c.providerInvoked!==false
      ||!c.sourcePath||!c.sourceGuard||!c.resultPath||!c.pauseRecordPath
      ||!Number.isFinite(Date.parse(c.startedAt))||!Number.isFinite(Date.parse(c.finishedAt))
      ||Date.parse(c.finishedAt)<Date.parse(c.startedAt)||!/^[a-f0-9]{64}$/u.test(c.sourceHash??'')
      ||j?.contextHash!==p.contextHash||!/^[a-f0-9]{64}$/u.test(j.byteHash??'')
      ||!Array.isArray(j.matchingDispatches)||j.matchingDispatches.length
      ||observation.processesExited!==true||!observation.observedAt)return null;
    return {version:1,kind:'read_role_observed_before_provider',workId:work.id,
      dispatchKey:work.dispatchKey,inputRef:work.inputRef,requestRef:p.requestRef,contextHash:p.contextHash,
      observationKind:observation.kind,providerReplayed:false,nativeReplayed:false,
      countersReset:false,historyReset:false,factsApproved:false};
  }
  const allowed=new Set(['metadata','runtime.set_binding','permission.set_mode','profile.bind']);
  if(observation?.kind!=='host_observed_kimi_preflight_only_v1'||!p||p.phase
    ||op.retryProviderDispatch||op.revalidateReplyRef||work.status!=='needs_repair'
    ||work.failure?.providerDispatch||work.failure?.providerRejection
    ||request.contextHash!==p.contextHash||request.roundKind!==work.role||request.roundIndex!==op.turn+1
    ||c?.status!=='product_stopped'||!c.completedAt||c.workId!==work.id||c.dispatch||c.receipt
    ||c.after?.pending?.requestRef!==p.requestRef||c.after.pending.contextHash!==p.contextHash
    ||c.before?.calls!==op.calls.length||c.after?.calls!==op.calls.length
    ||c.after?.failure?.code!==work.failure?.code||c.before.draftRef!==c.after.draftRef
    ||c.events?.length!==1||c.events[0].type!=='preflight'||c.events[0].modelCalls!==0
    ||s?.schema!=='kimi_unsent_session_observation_v1'||s.sessionId!==c.events[0].sessionId
    ||s.recordedModelRequests!==0||!s.byteHash||!s.eventTypes?.includes('profile.bind')
    ||!s.eventTypes.every(t=>allowed.has(t))
    ||j?.contextHash!==p.contextHash||!j.byteHash||j.matchingDispatches?.length!==0
    ||observation.processesExited!==true||!observation.observedAt)return null;
  return {version:1,kind:'read_role_observed_before_provider',workId:work.id,
    dispatchKey:work.dispatchKey,inputRef:work.inputRef,requestRef:p.requestRef,contextHash:p.contextHash,
    kimiSessionId:s.sessionId,providerReplayed:false,nativeReplayed:false,
    countersReset:false,historyReset:false,factsApproved:false};
}
