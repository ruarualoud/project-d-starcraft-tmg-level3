// Resume a current (not yet taught) Plan through the existing product workflow.
// No roster/Room mutation. Owner-authorized, ledgered single network recovery.
import { readFile, writeFile, rename, open } from 'node:fs/promises';
import { spawn, execFileSync } from 'node:child_process';
import { isCurrentTeachTerminalV1 as terminalObservation } from './lib/teach-run-observation-v1.mjs';
import { isRosterTeachStaleCapabilityDeferralV1, resumeRosterTeachCapabilityDiscoveryV1,
  resumeRosterTeachDependentQueriesV1 } from '../packages/roster-strategist/roster-teach-capability-guide-v1.mjs';
import { normalizeRosterTeachQueryDispatchV1 } from '../packages/roster-strategist/roster-teach-query-dispatch-v1.mjs';
import { validateRosterTeachInvestigationProgressV1, reuseRosterTeachReadOnlyEvidenceV1 } from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
import { beginRosterTeachFactProbeV1, beginRosterTeachSynthesisReviewV1 }
  from '../packages/roster-strategist/roster-teach-fact-probe-v1.mjs';
const [base, arm, previousProgressPath, mode, runVersionArg, queryIdsArg] = process.argv.slice(2);
if (!base || !['A','B'].includes(arm) || !previousProgressPath) throw Error('EXPLICIT_ARM_AND_PRIOR_HANDLE_REQUIRED');
if (mode !== undefined && !['--resume-network','--observe-only','--resume-after-fix','--resume-not-sent','--recover-queries','--supplement','--investigation-progress-fix','--capability-refresh','--dependency-resume','--catalog-resume','--fact-probe','--resynthesize'].includes(mode)) throw Error('UNRECOGNIZED_RESUME_MODE');
const resynthesize = mode === '--resynthesize';
const factProbe = mode === '--fact-probe';
const capabilityRefresh = mode === '--capability-refresh';
const catalogResume = mode === '--catalog-resume';
const dependencyResume = mode === '--dependency-resume' || catalogResume;
const supplement = mode === '--supplement';
const progressFix = mode === '--investigation-progress-fix';
const recoverQueries = mode === '--recover-queries';
const targetedResume = recoverQueries || capabilityRefresh || dependencyResume || factProbe;
if (targetedResume !== Boolean(queryIdsArg?.startsWith('--query-ids='))) throw Error('EXPLICIT_QUERY_SELECTION_REQUIRED');
const queryIds = targetedResume ? queryIdsArg.slice('--query-ids='.length).split(',') : [];
if (targetedResume && (!queryIds.every(id => /^[a-zA-Z0-9_-]+$/u.test(id))
  || new Set(queryIds).size !== queryIds.length)) throw Error('INVALID_QUERY_SELECTION');
const observeOnly = mode === '--observe-only';
const resumeNetwork = mode === '--resume-network' || observeOnly;
const resumeAfterFix = mode === '--resume-after-fix';
const resumeNotSent = mode === '--resume-not-sent';
const resuming = resumeNetwork || resumeAfterFix || resumeNotSent || targetedResume || supplement || progressFix || resynthesize;
if (runVersionArg !== undefined && (!resuming || !/^--run-version=\d+$/u.test(runVersionArg)))
  throw Error('EXPLICIT_NETWORK_RECOVERY_VERSION_REQUIRED');
const version = runVersionArg ? Number(runVersionArg.split('=')[1]) : resumeNetwork ? 150 : 149;
if (!Number.isSafeInteger(version) || version < (resumeNetwork ? 150 : 149)) throw Error('INVALID_RUN_VERSION');
const tag = resynthesize ? 'teach-synthesis-review' : factProbe ? 'teach-fact-probe' : dependencyResume ? 'teach-dependency-resume' : capabilityRefresh ? 'teach-capability-refresh' : progressFix ? 'teach-evidence-resume' : supplement ? 'teach-supplement' : recoverQueries ? 'teach-query-recovery' : resumeNetwork || resumeNotSent ? 'teach-network-resume' : resumeAfterFix ? 'teach-fix-resume' : 'current-plan-teach';
const cfg = JSON.parse(await readFile(base + '/common-v79-plan-recovery-config.private.json','utf8'));
const row = cfg.rows.find(r => r.arm === arm);
const prior = JSON.parse(await readFile(previousProgressPath,'utf8'));
const dest = base + '/common-v' + version + '-' + arm + '-' + tag + '-progress.private.json';
const status = { version, pid:process.pid, arm, status:'checking_existing_workspace',
  startedAt:new Date().toISOString(), sameWorkspace:true,newRoom:false,
  automaticPlanApplication:false,paidHistoryReset:false,ABRestartBlockedUntilTeachResolved:true };
if(observeOnly)Object.assign(status,prior,{pid:process.pid,status:'reattaching_observer',
  observationResumedAt:new Date().toISOString(),observeOnly:true});
const pause = ms => new Promise(resolve=>setTimeout(resolve,ms));
const read = async()=>JSON.parse(await readFile(row.dataDirectory + '/drafts/' + row.sessionId + '.json','utf8'));
const save = async()=>{status.updatedAt=new Date().toISOString();
  await writeFile(dest+'.tmp',JSON.stringify(status,null,2),{mode:0o600});await rename(dest+'.tmp',dest);};
try {
  const before=await read(), plan=JSON.parse(before.planSerialized), old=before.teachFramework;
  if(before.status!=='planned')throw Error('PLANNED_WORKSPACE_REQUIRED');
  if (resynthesize) {
    if (old.status !== 'completed' || old.planHash !== plan.planHash) throw Error('EXACT_SYNTHESIS_REVIEW_STOP_REQUIRED');
    const inspectedState = structuredClone(old.state);
    beginRosterTeachSynthesisReviewV1(inspectedState);
    status.synthesisReview = inspectedState.synthesisReview;
  }
  if (factProbe) {
    if (old.status !== 'completed' || old.planHash !== plan.planHash) throw Error('EXACT_FACT_PROBE_TRIAL_STOP_REQUIRED');
    const inspectedState = structuredClone(old.state);
    beginRosterTeachFactProbeV1(inspectedState, queryIds);
    status.factProbeContinuation = inspectedState.investigation.factProbeContinuation;
  }
  if (dependencyResume) {
    if (old.status !== 'completed' || old.planHash !== plan.planHash) throw Error('EXACT_DEPENDENCY_CONTINUATION_STOP_REQUIRED');
    const inspectedState = structuredClone(old.state);
    resumeRosterTeachDependentQueriesV1(inspectedState, queryIds, { refreshToolCatalog: catalogResume });
    status.dependencyContinuation = { ...inspectedState.investigation.dependencyContinuation, historyReset: false };
  }
  if (capabilityRefresh) {
    if (old.status !== 'completed' || old.planHash !== plan.planHash) throw Error('EXACT_CAPABILITY_REFRESH_STOP_REQUIRED');
    resumeRosterTeachCapabilityDiscoveryV1(structuredClone(old.state), queryIds);
    status.capabilityRefresh = { questionIds: queryIds, maximumAdditionalBatches: 3, historyReset: false };
  }
  if(progressFix&&(old.status!=='completed'||old.planHash!==plan.planHash
    ||!old.state.investigation?.completed||!old.state.investigation.supplement
    ||old.state.investigation.supplement.progressContinuation))throw Error('EXACT_PROGRESS_FIX_STOP_REQUIRED');
  if(supplement&&(old.status!=='completed'||old.planHash!==plan.planHash
    ||old.state.investigation?.completed!==true||old.state.investigation.supplement
    ||!old.state.synthesis?.answers.some(a=>a.disposition==='unresolved')))
    throw Error('ONE_UNUSED_SUPPLEMENT_ON_COMPLETED_UNRESOLVED_TEACH_REQUIRED');
  const savedQueryCanRecover = id => {
    const operation=old.state.queryRecovery?.operations.find(op=>op.originalQueryId===id);
    if(operation)return operation.completed&&(operation.choice?.disposition==='retry'
      || isRosterTeachStaleCapabilityDeferralV1(operation));
    const saved=old.state.investigation?.operations.find(op=>op.queryId===id);
    return saved?.completed===true&&(old.state.investigation.evidence.some(e=>e.challengeId===id&&e.status==='unknown')
      || Boolean(normalizeRosterTeachQueryDispatchV1(saved.request).normalization));
  };
  if(recoverQueries&&(old.status!=='completed'||old.planHash!==plan.planHash
    ||old.state.investigation?.completed!==true
    ||queryIds.some(id=>!savedQueryCanRecover(id))))throw Error('EXACT_COMPLETED_QUERY_STOP_REQUIRED');
  if(!resuming&&(old.status!=='completed'||old.planHash===plan.planHash))
    throw Error('CURRENT_PLAN_MUST_BE_DIFFERENT_FROM_COMPLETED_OLDER_TEACH');
  if(resumeNetwork&&!observeOnly&&(old.status!=='failed'||old.planHash!==plan.planHash
    ||!['ROSTER_WORKSPACE_AMBIGUOUS_DISPATCH_STOP','ROSTER_WORKSPACE_RUN_INTERRUPTED_BY_RESTART','ROSTER_WORKSPACE_RETRY_REQUEST_CHANGED']
      .includes(old.failure?.code)))throw Error('EXACT_INTERRUPTED_CURRENT_TEACH_REQUIRED');
  const unsentIdentityFailure = old.failure?.code==='ROSTER_WORKSPACE_RETRY_AUTHORIZATION_CONSUMED'
    &&before.progress.rounds.at(-1)?.paidProviderCall===false;
  const savedNestedReplyFailure = old.failure?.code==='ROSTER_TEACH_RECOVERY_ARGUMENT_JSON_INVALID'
    &&old.state.replyCorrections?.some(r=>r.status==='pending'
      &&r.correction?.code===old.failure.code&&r.correction.previousOutput);
  const savedContextLimitFailure = old.failure?.code==='ROSTER_WORKSPACE_PROVIDER_RESPONSE_REJECTED'
    &&((old.state.phase==='synthesize'&&!old.state.synthesis
      &&before.providerDispatches.at(-1)?.roundKind==='teach_framework_synthesis')
      ||(old.state.phase==='investigate_evidence'&&old.state.investigation?.completed===false
        &&before.providerDispatches.at(-1)?.roundKind==='teach_framework_investigate'))
    &&before.providerDispatches.at(-1)?.status==='response_rejected'
    &&before.providerDispatches.at(-1)?.rejection?.contextLengthExceeded===true;
  const savedDeltaBoundaryFailure = old.failure?.code==='ROSTER_TEACH_QUERY_DELTA_OUTSIDE_FAILURE'
    &&old.state.replyCorrections?.some(r=>r.status==='pending'
      &&r.kind==='teach_framework_query_delta_recovery'
      &&r.correction?.code===old.failure.code&&r.correction.previousOutput);
  const savedExtraFieldFailure = old.failure?.code==='ROSTER_TEACH_FRAMEWORK_OUTPUT_INVALID'
    &&old.state.replyCorrections?.some(r=>r.status==='pending'
      &&r.correction?.code===old.failure.code&&r.correction.previousOutput
      &&JSON.parse(r.correction.detail).issues?.every(i=>i.code==='additional_property_forbidden'));
  const savedNoopFailure = old.failure?.code==='ROSTER_TEACH_QUERY_DELTA_NO_CHANGE'
    &&old.state.replyCorrections?.some(r=>r.status==='pending'
      &&r.kind==='teach_framework_query_delta_recovery'
      &&r.correction?.code===old.failure.code&&r.correction.previousOutput);
  const savedCandidateReferenceFailure = ['ROSTER_TEACH_CANDIDATE_SCENE_MISMATCH','ROSTER_TEACH_CANDIDATE_OPTION_INVALID'].includes(old.failure?.code)
    &&old.state.replyCorrections?.some(r=>r.status==='pending'
      &&r.correction?.code===old.failure.code&&r.correction.previousOutput?.kind==='candidate_parameters');
  const savedPartialLayoutFailure = old.failure?.code==='SELECTED_SPATIAL_MODEL_DENOMINATOR_INVALID'
    &&old.state.queryRecovery?.selection?.reexecuteSavedQuery===true
    &&old.state.phase==='read_only_queries';
  const savedIncompleteQueryFailure = old.failure?.code==='ROSTER_WORKSPACE_PROVIDER_OUTPUT_INCOMPLETE'
    &&before.failedProviderOutputs?.some(o=>o.providerStatus==='incomplete'
      &&o.providerIncompleteReason==='max_output_tokens'
      &&['teach_framework_query_recovery','teach_framework_query_delta_recovery'].includes(o.roundKind)
      &&o.contextHash===before.providerDispatches.at(-1)?.contextHash);
  let savedDispatchReplyFailure = false;
  let savedSuccessfulReadFailure = false;
  if (old.failure?.code === 'ROSTER_TEACH_INVESTIGATION_UNCHANGED_QUERY') {
    const pending = old.state.replyCorrections?.findLast(r => r.status === 'pending'
      && r.kind === 'teach_framework_investigate' && r.correction?.code === old.failure.code);
    const reply = pending?.correction.previousOutput;
    savedSuccessfulReadFailure = Boolean(reply?.queries.some(q => {
      const request = normalizeRosterTeachQueryDispatchV1({ kind: q.kind, toolRequest: JSON.parse(q.toolRequestJson) }).request;
      return old.state.investigation.evidence.some(earlier => reuseRosterTeachReadOnlyEvidenceV1({ earlier, request,
        queryId: q.queryId, questionId: q.questionId, currentDescriptorHash: earlier.evidencePortDescriptorHash }));
    }));
    if (savedSuccessfulReadFailure || reply?.queries.some(q => normalizeRosterTeachQueryDispatchV1({ kind: q.kind,
      toolRequest: JSON.parse(q.toolRequestJson) }).normalization)) {
      validateRosterTeachInvestigationProgressV1(reply, old.state,
        old.state.investigation.capabilityContinuation?.questionIds || old.state.agenda.questions.map(q => q.questionId));
      savedDispatchReplyFailure = true;
      status.retainedDispatchRepair = { originalPaidReplyPreserved: true, revalidateBeforeProviderCall: true };
    }
  }
  if(resumeAfterFix&&(old.status!=='failed'||old.planHash!==plan.planHash
    ||(!unsentIdentityFailure&&!savedNestedReplyFailure&&!savedContextLimitFailure&&!savedDeltaBoundaryFailure&&!savedExtraFieldFailure&&!savedNoopFailure&&!savedCandidateReferenceFailure&&!savedPartialLayoutFailure&&!savedIncompleteQueryFailure&&!savedDispatchReplyFailure)))
    throw Error('EXACT_FIXED_TEACH_FAILURE_REQUIRED');
  const notSent = before.providerDispatches.at(-1);
  if(resumeNotSent&&(old.status!=='failed'||old.planHash!==plan.planHash
    ||old.failure?.code!=='ROSTER_WORKSPACE_PROVIDER_SEND_FAILED'
    ||notSent?.planHash!==plan.planHash||notSent.status!=='definitely_not_sent'
    ||notSent.costStatus!=='not_sent'||notSent.transportFailure?.requestDefinitelyNotSent!==true))
    throw Error('EXACT_PROVEN_NOT_SENT_TEACH_REQUEST_REQUIRED');
  const pending=observeOnly?before.providerDispatches.filter(d=>d.requestId===prior.resumedRequestId):
    before.providerDispatches.filter(d=>['reserved','sending','sent','ambiguous'].includes(d.status)
      &&!before.publicOutputs.some(o=>o.contextHash===d.contextHash));
  if(!resumeNetwork&&pending.length)throw Error('UNRECONCILED_PAID_REQUEST_NO_AUTOMATIC_RETRY');
  if(resumeNetwork&&!observeOnly&&(pending.length!==1||pending[0].planHash!==plan.planHash
    ||!String(pending[0].roundKind).startsWith('teach_framework_')
    ||before.providerDispatches.some(d=>d.retryOfRequestId===pending[0].requestId)))
    throw Error('ONE_UNRETRIED_CURRENT_TEACH_DISPATCH_REQUIRED');
  if(observeOnly&&(pending.length!==1||prior.baselinePlanHash!==plan.planHash||!prior.hostPid))
    throw Error('OBSERVATION_SOURCE_CHANGED');
  const baseline=observeOnly?prior.baselineUsage:{calls:before.usage.calls,units:before.usage.totalUnits};
  if(!observeOnly)Object.assign(status,{baselineUsage:baseline,baselinePlanHash:plan.planHash,planVersion:plan.planVersion,
    previousTeachPlanHash:old.planHash,previousUnresolved:(old.state.synthesis?.answers||[])
      .filter(a=>a.disposition==='unresolved').map(a=>a.questionId),
    oldLearnedFrameworkPreserved:true,oldEvidenceAndPaidHistoryPreserved:true,
    ...(progressFix?{concreteFix:'pending_question_progress_v178',oneAdditionalChoiceAfterConcreteFix:true,
      retainedCompletedInvestigationRounds:old.state.investigation.rounds.length}:{}),
    ...(supplement?{concreteFix:'native_resource_selected_roster_and_repaired_evidence_delivery_v176',
      oneAuthorizedInvestigationSupplement:true,retainedCompletedInvestigationRounds:old.state.investigation.rounds.length}:{}),
    ...(recoverQueries?{recoverFailedQueryIds:queryIds,concreteFix:'focused_query_contract_repair_v'+version,
      oneAdditionalChoiceAfterConcreteFix:true}:{}),
    ...(resumeNotSent?{baselineFailureAt:old.failure.at,originalNotSentRequestId:notSent.requestId,
      originalRequestDefinitelyNotSent:true,additionalUnknownFeeAuthorization:false}:{}),
    ...(resumeAfterFix?{baselineFailureAt:old.failure.at,
      concreteFix:savedSuccessfulReadFailure?'retained_successful_read_reuse_v191':savedDispatchReplyFailure?'saved_native_query_family_dispatch_v185':unsentIdentityFailure?'exact_retry_request_identity_v152':savedNestedReplyFailure
        ?'retained_nested_query_reply_v154':savedIncompleteQueryFailure
          ?'one_bound_completion_of_truncated_readonly_query_v175':savedPartialLayoutFailure
          ?'failed_static_layout_avoids_native_action_enumeration_v173':savedCandidateReferenceFailure
          ?'typed_candidate_feedback_existing_bounded_semantic_repair_v172':savedNoopFailure
          ?'noop_correction_feedback_and_active_static_query_context_v167':savedExtraFieldFailure
          ?'retained_public_extensions_sidecar_v163':savedDeltaBoundaryFailure
          ?'retained_exact_failed_child_replacement_and_native_binding_v160':'shared_lossless_investigation_and_synthesis_interning_v177',
      resumedAfterUnsentEngineeringFailure:unsentIdentityFailure,
      retainedPaidReplyRevalidation:savedDispatchReplyFailure||savedNestedReplyFailure||savedDeltaBoundaryFailure||savedExtraFieldFailure||savedNoopFailure,
      retainedCompletedInvestigationRounds:old.state.investigation?.rounds.filter(r=>r.completed).length||0}:{}),
    ...(resumeNetwork?{resumedRequestId:pending[0].requestId,originalCostStatus:pending[0].costStatus,
      maximumPhysicalRetries:1,standingNetworkResumeConsent:true,baselineFailureAt:old.failure?.at,
      retainedCompletedInvestigationRounds:old.state.investigation?.rounds.filter(r=>r.completed).length||0}: {})});
  await save();
  if(observeOnly){
    const command=execFileSync('/bin/ps',['-p',String(prior.hostPid),'-o','command='],{encoding:'utf8'});
    if(!command.includes('serve-ticket-27-slice-271-roster-workspace-v1.mjs')
      ||!command.includes('--data-directory='+row.dataDirectory))throw Error('OBSERVED_HOST_IDENTITY_CHANGED');
  }else{
  if(prior.hostPid){
    let command='';
    try{command=execFileSync('/bin/ps',['-p',String(prior.hostPid),'-o','command='],{encoding:'utf8'});}
    catch(error){if(error.status!==1)throw error;}
    if(command.trim()){
      if(!command.includes('serve-ticket-27-slice-271-roster-workspace-v1.mjs')
        ||!command.includes('--data-directory='+row.dataDirectory))throw Error('HOST_IDENTITY_CHANGED');
      const response=await fetch(prior.origin+prior.apiPrefix+'/sessions/'+row.sessionId,
        {signal:AbortSignal.timeout(15000)});
      if(!response.ok)throw Error('EXISTING_HOST_UNAVAILABLE');
      const existing=(await response.json()).session;
      if(existing?.status!=='planned'||existing.teachFramework?.status==='running'
        ||existing.progress?.activeRoundKind)throw Error('EXISTING_HOST_NOT_IDLE');
      process.kill(prior.hostPid,'SIGTERM');
      for(let n=0;;n++){try{process.kill(prior.hostPid,0);}catch(e){if(e.code==='ESRCH')break;throw e;}
        if(n>=30)throw Error('IDLE_HOST_DID_NOT_EXIT');await pause(500);}
    }
  }
  const logBase=base+'/'+arm+'/workspace-host-v'+version+'-'+tag;
  const out=await open(logBase+'.stdout.private.log','wx',0o600);
  const err=await open(logBase+'.stderr.private.log','wx',0o600);
  const host=spawn('/usr/local/bin/node',['scripts/serve-ticket-27-slice-271-roster-workspace-v1.mjs',
    '--data-directory='+row.dataDirectory,'--fixture-root='+cfg.fixtureRoot,
    '--web-root='+cfg.webRoot,'--map-configuration-file='+cfg.mapConfigurationFile,
    '--enable-roster-flash'],{cwd:cfg.worktree,detached:true,stdio:['ignore',out.fd,err.fd]});
  await new Promise((resolve,reject)=>{host.once('spawn',resolve);host.once('error',reject);});
  host.unref();await out.close();await err.close();
  Object.assign(status,{hostPid:host.pid,status:'starting_existing_offline_workspace'});await save();
  let entry;
  while(!entry){process.kill(host.pid,0);
    entry=(await readFile(logBase+'.stdout.private.log','utf8')).split('\n').flatMap(line=>{
      try{const v=JSON.parse(line);return v.schemaVersion==='ticket27_slice271_roster_workspace_server_entry_v1'?[v]:[];}
      catch{return[];}}).at(-1);
    if(!entry)await pause(1000);
  }
  if(entry.liveRoomLaunchAttached!==false||entry.dataDirectory!==row.dataDirectory)throw Error('OFFLINE_BOUNDARY_CHANGED');
  Object.assign(status,{origin:entry.origin,apiPrefix:entry.apiPrefix,status:'submitting_once'});await save();
  const request={expectedPlanHash:plan.planHash,automaticNetworkRecovery:true,
    ...(factProbe?{startFactProbeForQuestionIds:queryIds}:{}),
    ...(resynthesize?{resynthesizeSavedEvidence:true}:{}),
    ...(progressFix?{resumeInvestigationAfterProgressFix:true}:{}),
    ...(capabilityRefresh?{refreshQueryCapabilitiesForQuestionIds:queryIds}:{}),
    ...(dependencyResume?{resumeDependentQueriesForQuestionIds:queryIds}:{}),
    ...(catalogResume?{refreshTeachToolCatalog:true}:{}),
    ...(supplement?{authorizeInvestigationSupplement:true}:{}),
    ...(recoverQueries?{recoverFailedQueryIds:queryIds,reexecuteSavedQuery:true}:{}),...(resumeNetwork?{
    resumeAfterNetworkInterrupt:true,expectedRequestId:pending[0].requestId}: {})};
  await writeFile(base+'/'+arm+'/v'+version+'-'+tag+'-request.private.json',JSON.stringify(request),
    {flag:'wx',mode:0o600});
  try{
    const response=await fetch(entry.origin+entry.apiPrefix+'/sessions/'+row.sessionId+'/teach-framework',
      {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(request),
        signal:AbortSignal.timeout(30000)});
    if(!response.ok)throw Error('HTTP_'+response.status+':'+(await response.text()).slice(0,700));
    await response.body?.cancel();
  }catch(error){if(error.name!=='TimeoutError')throw error;status.observationTimeout=true;await save();}
  }
  for(;;){
    process.kill(status.hostPid,0);
    const current=await read(),teach=current.teachFramework;
    if(teach.planHash!==plan.planHash)throw Error('CURRENT_PLAN_TEACH_NOT_STARTED');
    if(teach.status==='running')status.observedCurrentRun=true;
    Object.assign(status,{status:teach.status,phase:teach.state.phase,failure:teach.failure,
      newCalls:current.usage.calls-baseline.calls,newUnits:current.usage.totalUnits-baseline.units,
      cumulativeUsage:{calls:current.usage.calls,units:current.usage.totalUnits},
      currentPlanUnchanged:JSON.parse(current.planSerialized).planHash===plan.planHash,
      oldTeachRetained:resuming?teach.planHash===old.planHash:
        current.teachFrameworkHistory?.some(t=>t.planHash===old.planHash),
      ...(resumeNetwork?{retryDispatch:current.providerDispatches.filter(d=>d.retryOfRequestId===pending[0].requestId)
        .map(d=>({requestId:d.requestId,status:d.status,costStatus:d.costStatus,contextUnchanged:d.contextHash===pending[0].contextHash,
          requestBodyUnchanged:d.requestBodyHash===pending[0].requestBodyHash})),
        originalDispatchRetained:current.providerDispatches.some(d=>d.requestId===pending[0].requestId&&d.costStatus===pending[0].costStatus)}:{}),
      learnedFrameworkUnchanged:JSON.stringify(teach.state.framework)===JSON.stringify(old.state.framework),
      lastDispatch:current.providerDispatches.slice(-1).map(d=>({kind:d.roundKind,status:d.status})),
      investigationRounds:teach.state.investigation?.rounds.length,
      queryResults:teach.state.investigation?.evidence.map(e=>({id:e.challengeId,questionId:e.questionId,
        status:e.status,reason:e.unknownReasonCode})),
      unresolved:teach.state.synthesis?.answers.filter(a=>a.disposition==='unresolved').map(a=>a.questionId)});
    await save();if(terminalObservation(teach,current,status,resuming))break;await pause(20000);
  }
}catch(error){status.status='needs_inspection_no_blind_retry';status.failure=String(error.message).slice(0,1000);await save();}
