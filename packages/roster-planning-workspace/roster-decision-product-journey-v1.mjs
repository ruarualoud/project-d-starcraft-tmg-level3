import {rosterOpponentIsUnknownV1,rosterImportedExperienceHasFrozenOpponentV1} from '../roster-strategist/roster-opponent-knowledge-v1.mjs';
import {rosterResourceChoiceRequestV1} from '../roster-strategist/roster-resource-choice-v1.mjs';
import {projectRosterConstructionInquiryRecoveryV1} from '../roster-strategist/roster-construction-inquiry-return-v1.mjs';
import {projectRosterBudgetCapabilityRecoveryV1} from '../roster-strategist/roster-budget-capability-recovery-v1.mjs';
import {projectRosterHostStepKindRecoveryV1,projectRosterSavedProposalRecoveryV1} from '../roster-strategist/roster-host-step-recovery-v1.mjs';
import {projectRosterEmptyCandidateRecoveryV1} from '../roster-strategist/roster-work-order-edit-command-v1.mjs';
import {projectRosterInventoryClaimRecoveryV1,projectRosterInventoryInterpretationRecoveryV1} from '../roster-strategist/roster-inventory-claims-v1.mjs';
// P6 Web/App job control around the SAME P0–P6 Run. This module owns job/trace
// persistence, not another army, Plan, Rules engine or model correction loop.
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {isDeepStrictEqual} from 'node:util';
import {isExplicitlyRecoverableProviderDispatchV1,isExplicitLatestProviderRetryV1,matchesReturnedRosterProviderReplyV1} from '../secure-provider-runtime/provider-dispatch-recovery-v1.mjs';
import {createInterface} from 'node:readline';
import {encodeRosterProviderInputV1} from '../roster-strategist/roster-prompt-evidence-encoding-v1.mjs';

export function rosterProductConstructionTeachInputV1(work){
  return {source:'evidence',id:'role:'+work.id,pointer:'',
    scopeUsage:work.status==='superseded'?'historical_reference':'current_dependency'};
}

export async function reconcileRosterProductOwnerBoundaryV1({run,readiness}){
  // Only the source-qualified, once-only reconsideration constructor may
  // schedule here. A generic restart still stops on an unchanged blocker.
  if((await run.reconsiderParticipantConfiguration()).scheduled.length)return true;
  return Boolean(readiness.workflowBlockers?.length);
}
import {projectRosterProviderInstructionsV1} from './roster-planning-secure-deliberation-factory-v1.mjs';
import {rosterWorkflowTransportResumeWorkV1} from './roster-workflow-provider-boundary-v1.mjs';
import {projectRosterCompletedReadRecoveryV1,projectRosterWorkflowSavedSchemaRevalidationV1,projectRosterWorkflowFeedbackRecoveryV1} from '../roster-strategist/roster-workflow-read-role-v1.mjs';
import {projectRosterCommandEnvelopeRecoveryV1} from '../roster-strategist/roster-decision-envelope-v1.mjs';
import {projectRosterAuthorDecisionHandoffV1} from '../roster-strategist/roster-workflow-author-handoff-v1.mjs';
import {projectRosterNativeRejectionRevalidationV1,projectRosterDiagnosticFeedbackRecoveryV1,projectRosterControlDiagnosticsRevalidationV1,projectRosterParticipantBindingRevalidationV1} from '../roster-strategist/roster-native-fact-claims-v1.mjs';
import {requestRosterHypothesisCycleV1,assessRosterProductHypothesisCycleV1,rosterProductHypothesisCycleIdV1,
  progressRosterProductComparisonV1,authorizeRosterComparisonContinuationV1} from './roster-hypothesis-cycle-v1.mjs';
import {createRosterWorkflowAcceptanceV1,rosterWorkflowAcceptanceMatchesDraftV1} from './roster-workflow-acceptance-v1.mjs';
import {publishRosterWorkflowAcceptanceFileV1} from './roster-workflow-acceptance-store-v1.mjs';
import {projectRosterWorkflowReadDeliveryRecoveryV1} from '../roster-strategist/roster-workflow-read-context-v1.mjs';
import {createRosterWorkflowGraphV1} from '../roster-strategist/roster-workflow-graph-v1.mjs';
import {ROSTER_WORKFLOW_INPUT_DELIVERY_VERSION_V1,rosterWorkflowCanReflowInputV1} from '../roster-strategist/roster-workflow-input-delivery-v1.mjs';
import {projectRosterReadOnlyToolFixV1} from '../roster-strategist/roster-read-only-query-recovery-v1.mjs';
import {projectRosterSavedMenuSelectorRecoveryV1} from '../roster-strategist/roster-workflow-laboratory-v1.mjs';
import {projectRosterCandidateMultiplicityRecoveryV1} from '../roster-strategist/roster-workflow-candidate-context-v1.mjs';
import {projectRosterComparisonParticipantRevalidationV1} from '../roster-strategist/roster-comparison-participant-preflight-v1.mjs';
import {projectRosterMapOfferRecoveryV1} from '../roster-strategist/roster-tool-proof-scope-v1.mjs';
import {projectRosterBudgetOwnerRecoveryV1} from '../roster-strategist/roster-workflow-readiness-v1.mjs';
import {projectRosterComparisonResourceRevalidationV1} from '../roster-strategist/roster-comparison-owner-choice-v1.mjs';
import {projectRosterBuilderChoiceFeedbackRecoveryV1} from '../roster-strategist/roster-author-question-contract-v1.mjs';

const validId=id=>/^[A-Za-z0-9_-]{1,80}$/u.test(id||'');
const fail=(code,status=409)=>{throw Object.assign(Error(code),{code,httpStatus:status});};
function decodeTraceRecord(line,lineNumber){
  if(!line.trim())return null;
  try{
    const item=JSON.parse(line);
    if(item&&typeof item==='object'&&!Array.isArray(item))return item;
  }catch{/* Retain original bytes on disk; expose the gap without inventing its contents. */}
  return {kind:'trace_record_unreadable',lineNumber,byteLength:Buffer.byteLength(line),contentRecovered:false};
}
export async function createRosterDecisionProductJourneyV1({directory,openWorkflow,prepareSeed,prepareExisting,liveAvailable,readConditionalExperiences,prepareConditionalExperienceImport,readLaunchDraft}){
  await fs.mkdir(directory,{recursive:true});
  const active=new Map(),runs=new Map(),terminalErrors=new Map();
  const folder=id=>{if(!validId(id))fail('ROSTER_DECISION_JOURNEY_ID_INVALID',400);return path.join(directory,id);};
  const readJson=async file=>JSON.parse(await fs.readFile(file,'utf8'));
  const record=async id=>readJson(path.join(folder(id),'journey.json')).catch(error=>{
    if(error.code==='ENOENT')fail('ROSTER_DECISION_JOURNEY_NOT_FOUND',404);throw error;});
  async function save(id,value){
    const target=path.join(folder(id),'journey.json'),temporary=target+'.'+randomUUID()+'.tmp';
    await fs.writeFile(temporary,JSON.stringify(value,null,2));await fs.rename(temporary,target);
  }
  async function event(id,value){
    const file=await fs.open(path.join(folder(id),'trace.jsonl'),'a+');
    try{
      const {size}=await file.stat(),tail=Buffer.alloc(1);
      if(size)await file.read(tail,0,1,size-1);
      // A prior interrupted append may lack a newline. Never concatenate the
      // new record into it, truncate it, or pretend to recover its contents.
      const separator=size&&tail[0]!==10?'\n':'';
      await file.writeFile(separator+JSON.stringify({at:new Date().toISOString(),...value})+'\n');
    }finally{await file.close();}
  }
  async function providerDispatches(id,state,contexts){
    const latest=new Map(),byRequest=new Map(),times=new Map();
    const files=[path.join(folder(id),'trace.jsonl'),
      path.join(directory,'..','decision-workflows',id,'provider-dispatches.jsonl')];
    for(const file of files){
      try{await fs.access(file);}catch(error){if(error.code==='ENOENT')continue;throw error;}
      const lines=createInterface({input:createReadStream(file),crlfDelay:Infinity});
      for await(const line of lines){
        if(!line.trim())continue;
        const e=JSON.parse(line),d=e.dispatch??(e.kind==='provider_event'&&e.value?.type==='provider_dispatch'?e.value.dispatch:null);
        if(!d||!contexts.has(d.contextHash))continue;
        byRequest.set(d.requestId,d);
        const at=Date.parse(e.at??e.value?.at??'')||0;
        if(at>=(times.get(d.contextHash)??0)){latest.set(d.contextHash,d);times.set(d.contextHash,at);}
      }
    }
    for(const work of state.work){
      const d=work.failure?.providerDispatch;
      if(d&&contexts.has(d.contextHash)&&d.contextHash===work.operationState?.pending?.contextHash){
        // The checkpoint is a fallback for legacy unjournaled failures.
        // Never overwrite a durable update for this attempt or context.
        if(!byRequest.has(d.requestId))byRequest.set(d.requestId,d);
        if(!latest.has(d.contextHash))latest.set(d.contextHash,d);
      }
    }
    return {latest,byRequest};
  }
  async function open(id,metadata){
    if(runs.has(id))return runs.get(id);
    const pending=openWorkflow({runId:id,setup:metadata.seed.setup,candidateInput:metadata.seed.candidateInput,
      networkRecoveryPolicy:{retryDefinitelyNotSent:true},
      // Transient job control, never a model parameter or persisted Rules input.
      // Read queries may return partial evidence at a safe Native boundary;
      // Provider calls and commands still drain their whole current operation.
      shouldStopReadQuery:()=>active.get(id)?.stop===true,
      onEvent:value=>event(id,{kind:'provider_event',value}),
      onRequest:async request=>{
        const traceId=randomUUID(),encoded=encodeRosterProviderInputV1(request);
        await fs.writeFile(path.join(folder(id),traceId+'.json'),JSON.stringify({request,
          providerInstructions:projectRosterProviderInstructionsV1({request,runKind:'teach-framework'}),
          encodedProviderInput:encoded.input,isExactPromptContent:true},null,2),{flag:'wx'});
        await event(id,{kind:'request',traceId,contextHash:request.contextHash,role:request.roundKind,inputCharacters:encoded.afterCharacters});
      },
      onReply:async reply=>{
        const traceId=randomUUID();
        await fs.writeFile(path.join(folder(id),traceId+'.json'),JSON.stringify(reply,null,2),{flag:'wx'});
        await event(id,{kind:'reply',traceId,contextHash:reply.receipt.contextHash,usage:reply.receipt.usage,latencyMs:reply.receipt.latencyMs});
      },
      onTool:value=>event(id,{kind:'tool',operation:value.operation,status:value.status,stateRef:value.stateRef??null,
        receiptHash:value.receipt?.receiptHash??null})});
    runs.set(id,pending);
    try{return await pending;}catch(error){runs.delete(id);throw error;}
  }
  async function read(id){
    const metadata=await record(id),run=await open(id,metadata),[state,draft]=await Promise.all([run.inspect(),run.currentDraft()]);
    const localFailure=terminalErrors.get(id),strategyCycle=await assessRosterProductHypothesisCycleV1({state,draft,readArtifact:run.readArtifact});
    const published=await readAcceptanceFile(id);
    const formalPlanAccepted=rosterWorkflowAcceptanceMatchesDraftV1(published,state,draft,{workflowId:id});
    const acceptanceFailure=!formalPlanAccepted&&(published||metadata.status==='accepted')
      ?{code:published?'ROSTER_DECISION_ACCEPTANCE_STALE_REVISION':'ROSTER_DECISION_ACCEPTANCE_REQUIRED'}:null;
    const blocked=Boolean(localFailure||acceptanceFailure);
    const recordedFailure=localFailure??acceptanceFailure??metadata.failure??null;
    // Old jobs persisted NO_READY when value-review exhaustion was omitted
    // from the outer assessment. Preserve that record, expose its actual
    // current cause; reading a stopped job must never schedule recovery.
    const failure=!active.has(id)&&recordedFailure?.code==='ROSTER_DECISION_NO_READY_WORK'&&strategyCycle.comparisonStop
      ?{code:'ROSTER_DECISION_RECONCILIATION_REQUIRED',stoppedReviewDomains:[strategyCycle.comparisonStop],previousFailure:recordedFailure}
      :recordedFailure;
    return {schema:'roster_decision_product_journey_v1',workflowId:id,status:active.has(id)?'running':formalPlanAccepted?'accepted':blocked?'blocked':metadata.status==='running'?'interrupted':metadata.status,
      running:active.has(id),pauseRequested:active.get(id)?.stop===true,setup:metadata.seed.setup,mode:metadata.seed.mode,
      draftRevision:state.draftRevision,draft,progress:metadata.progress??null,failure,
      interrupted:metadata.status==='running'&&!active.has(id),
      work:state.work.map(work=>({id:work.id,role:work.role,status:work.status,failure:work.failure??null})),
      strategyCycle,evidenceCount:state.evidence.length,evidenceDirectory:state.evidence.map((source,index)=>({
        number:index+1,title:source.title,kind:source.kind,id:source.id})),readyForRelease:!blocked&&metadata.status==='ready_for_release'&&strategyCycle.ownerReturned&&strategyCycle.comparisonResolved,
      formalPlanAccepted,acceptance:formalPlanAccepted?{draftRevision:published.draftRevision,
        planHash:published.plan.planHash,acceptedAt:published.sessionReceipt.acceptedAt,strategyImprovementProven:false}:null,
      roomStarted:false,trainingTruth:false};
  }
  async function create(input={}){
    const seed=await prepareSeed(input),id='decision-'+randomUUID();
    await fs.mkdir(folder(id),{recursive:false});
    const metadata={schema:'roster_decision_product_job_v1',workflowId:id,seed,status:'draft',createdAt:new Date().toISOString(),failure:null};
    await save(id,metadata);const run=await open(id,metadata);
    await run.initializeDraft({candidateInput:seed.candidateInput,plan:null,provenance:seed.provenance,mode:seed.mode,planningEntry:seed.planningEntry,planId:id+'-plan'});
    await event(id,{kind:'created',mode:seed.mode,initialPlanCopied:false,initialArmySize:seed.candidateInput.units.length});
    return read(id);
  }
  async function registerExisting({runId:id,setup,expectedRevision,expectedDraftRef}={}){
    // Intentionally server-only: the HTTP adapter exposes neither filesystem
    // paths nor a way for callers to supply a supposedly accepted Plan/review.
    if(!validId(id))fail('ROSTER_DECISION_JOURNEY_ID_INVALID',400);
    if(typeof prepareExisting!=='function')fail('ROSTER_DECISION_REGISTRATION_UNAVAILABLE',503);
    if(!Number.isSafeInteger(expectedRevision)||expectedRevision<0||!/^[a-f0-9]{64}$/u.test(expectedDraftRef??''))
      fail('ROSTER_DECISION_REGISTRATION_IDENTITY_REQUIRED',400);
    if(active.has(id))fail('ROSTER_DECISION_JOURNEY_WRITER_BUSY');
    await fs.mkdir(folder(id),{recursive:true});
    const release=await claim(id);
    try{
      const {seed,origin}=await prepareExisting({runId:id,setup,expectedRevision,expectedDraftRef});
      let metadata;
      try{metadata=await record(id);}catch(error){if(error.code!=='ROSTER_DECISION_JOURNEY_NOT_FOUND')throw error;}
      if(metadata){
        if(!isDeepStrictEqual(metadata.seed,seed)||!isDeepStrictEqual(metadata.origin,origin))
          fail('ROSTER_DECISION_REGISTRATION_CONFLICT');
      }else{
        metadata={schema:'roster_decision_product_job_v1',workflowId:id,seed,origin,
          status:'registered',createdAt:new Date().toISOString(),failure:null};
        await save(id,metadata);
      }
      const lines=await fs.readFile(path.join(folder(id),'trace.jsonl'),'utf8').catch(error=>{
        if(error.code==='ENOENT')return '';throw error;});
      if(!lines.split('\n').some((line,index)=>decodeTraceRecord(line,index+1)?.kind==='existing_workflow_registered'))
        await event(id,{kind:'existing_workflow_registered',origin,initializedDraft:false,
          replayedProvider:false,replayedNative:false,acceptanceGranted:false});
      return await read(id);
    }finally{await release();}
  }
  async function claim(id){
    const lease=path.join(folder(id),'writer.lock');
    try{
      const handle=await fs.open(lease,'wx');await handle.writeFile(JSON.stringify({pid:process.pid,at:new Date().toISOString()}));
      return async()=>{await handle.close();await fs.rename(lease,lease+'.closed-'+randomUUID());};
    }catch(error){
      if(error.code!=='EEXIST')throw error;
      const previous=await readJson(lease);let exists=true;
      try{process.kill(previous.pid,0);}catch(probe){if(probe.code==='ESRCH')exists=false;else throw probe;}
      if(exists)fail('ROSTER_DECISION_JOURNEY_WRITER_BUSY');
      // Preserve a dead writer's lease as evidence; never infer that its paid
      // pending requests were not sent. The Run retains transport reconciliation.
      await fs.rename(lease,lease+'.interrupted-'+randomUUID());
      await event(id,{kind:'dead_writer_recovered',pid:previous.pid,paidRequestsReplayed:false});return claim(id);
    }
  }
  // Server-only single-step clients share the same writer lease as start().
  // This grants no retry by itself: the Run still verifies the saved request.
  async function withWorkflowWriter(id,execute){
    if(typeof execute!=='function')fail('ROSTER_DECISION_WRITER_CALLBACK_REQUIRED',400);
    await record(id);
    const release=await claim(id);let held=true;
    const ownership=Object.freeze({kind:'product_single_writer_lease',get held(){return held;}});
    runs.delete(id);
    try{return await execute({ownership});}
    finally{held=false;runs.delete(id);await release();}
  }
  async function readAcceptanceFile(id){
    return readJson(path.join(folder(id),'acceptance.json')).catch(error=>{
      if(error.code==='ENOENT')return null;throw error;});
  }
  async function readAccepted(id){
    const metadata=await record(id),bundle=await readAcceptanceFile(id);
    if(!bundle)fail('ROSTER_DECISION_ACCEPTANCE_REQUIRED');
    let state,draft;
    if(readLaunchDraft){
      ({state,draft}=await readLaunchDraft({runId:id,seed:metadata.seed}));
    }else{
      const run=await open(id,metadata);
      [state,draft]=await Promise.all([run.inspect(),run.currentDraft()]);
    }
    if(!rosterWorkflowAcceptanceMatchesDraftV1(bundle,state,draft,{workflowId:id})){
      fail('ROSTER_DECISION_ACCEPTANCE_STALE_REVISION');
    }
    return bundle;
  }
  async function acknowledgeAcceptance(id,metadata,bundle){
    // The immutable accepted artifact is authoritative. A crash after its
    // publication must not re-run generation/Teach/audit or leave job metadata
    // forever ready_for_release. Called only while holding the writer lease;
    // ordinary GET/read paths remain read-only.
    const expected={draftRevision:bundle.draftRevision,planHash:bundle.plan.planHash};
    if(metadata.status!=='accepted'||metadata.failure
      ||metadata.acceptance?.draftRevision!==expected.draftRevision
      ||metadata.acceptance?.planHash!==expected.planHash){
      metadata.status='accepted';metadata.failure=null;metadata.acceptance=expected;
      await save(id,metadata);
    }
    let recorded=false,lineNumber=0;
    const stream=createReadStream(path.join(folder(id),'trace.jsonl'),{encoding:'utf8'});
    const lines=createInterface({input:stream,crlfDelay:Infinity});
    try{
      for await(const line of lines){
        const item=decodeTraceRecord(line,++lineNumber);
        if(!item)continue;
        if(item.kind==='plan_accepted'&&item.draftRevision===bundle.draftRevision&&item.planHash===bundle.plan.planHash){recorded=true;break;}
      }
    }catch(error){if(error.code!=='ENOENT')throw error;}
    finally{lines.close();stream.destroy();}
    if(!recorded)await event(id,{kind:'plan_accepted',draftRevision:bundle.draftRevision,
      planHash:bundle.plan.planHash,strategyImprovementProven:false,originalDraftRewritten:false});
    terminalErrors.delete(id);
  }
  async function accept(id,{expectedRevision}={}){
    if(active.has(id))fail('ROSTER_DECISION_JOURNEY_WRITER_BUSY');
    if(!Number.isSafeInteger(expectedRevision))fail('ROSTER_DECISION_ACCEPTANCE_REVISION_REQUIRED',400);
    const release=await claim(id);
    try{
      const metadata=await record(id),run=await open(id,metadata),[state,draft]=await Promise.all([run.inspect(),run.currentDraft()]);
      if(state.draftRevision!==expectedRevision||draft?.revision!==expectedRevision)
        fail('ROSTER_DECISION_ACCEPTANCE_STALE_REVISION');
      const existing=await readAcceptanceFile(id);
      if(existing){
        if(!rosterWorkflowAcceptanceMatchesDraftV1(existing,state,draft,{workflowId:id}))fail('ROSTER_DECISION_ACCEPTANCE_STALE_REVISION');
        await acknowledgeAcceptance(id,metadata,existing);
        return {workflow:await read(id),acceptance:existing};
      }
      if(metadata.status==='accepted')fail('ROSTER_DECISION_ACCEPTANCE_REQUIRED');
      if(terminalErrors.has(id))fail('ROSTER_DECISION_JOB_PERSISTENCE_FAILED');
      const [assessment,strategyCycle]=await Promise.all([run.finalAssessment(),
        assessRosterProductHypothesisCycleV1({state,draft,readArtifact:run.readArtifact})]);
      if(!strategyCycle.comparisonResolved)fail('ROSTER_DECISION_STRATEGY_COMPARISON_REQUIRED');
      await run.archiveConditionalConclusion();
      const builderVerdict=draft?.builderVerdictRef?await run.readArtifact(draft.builderVerdictRef):null;
      const bundle=createRosterWorkflowAcceptanceV1({workflowId:id,state,draft,assessment,strategyCycle,builderVerdict,
        acceptedAt:new Date().toISOString()});
      // Immutable accepted snapshot. A failed metadata save is recoverable by
      // the same acceptance/read port; never repeat generation or paid work.
      await publishRosterWorkflowAcceptanceFileV1(folder(id),bundle);
      await acknowledgeAcceptance(id,metadata,bundle);
      return {workflow:await read(id),acceptance:bundle};
    }finally{await release();}
  }
  async function prepare(run,metadata){
    const seed=metadata.seed;
    await run.initializeDraft({candidateInput:seed.candidateInput,plan:null,provenance:seed.provenance,mode:seed.mode,planningEntry:seed.planningEntry,planId:metadata.workflowId+'-plan'});
    await run.prepareStrategyResources({ownFactionRecordKey:seed.setup.factionRecordKey,opponentFactionRecordKey:seed.setup.opponentFactionRecordKey});
    const state=await run.inspect(),menuId='product:builder-menu';
    if(!state.evidence.some(e=>e.id===menuId))await run.publishEvidence({id:menuId,title:'Frozen Rules-owned army choices',
      kind:'tool_receipt',bindings:{},conditions:['Eligibility/cost options, not a strategy ranking'],
      value:run.builderChoices({factionRecordKey:seed.setup.factionRecordKey,scaleId:seed.candidateInput.scaleId,mineralBudget:seed.candidateInput.mineralBudget})});
    if(seed.setup.opponentInformationBoundary==='unknown_roster'&&!state.evidence.some(e=>e.id==='product:opponent-public-menu'))
      await run.publishEvidence({id:'product:opponent-public-menu',title:'Known opponent faction: PUBLIC purchase possibilities, no actual selected army',
        kind:'tool_receipt',bindings:{},conditions:['Public catalogue only; no frequencies or actual opponent selections'],
        value:run.builderChoices({factionRecordKey:seed.setup.opponentFactionRecordKey,scaleId:seed.candidateInput.scaleId,mineralBudget:seed.candidateInput.mineralBudget})});
    await run.prepareContext();
  }
  async function revalidateRepairedSchemaReplies(run,metadata){
    const state=await run.inspect();let recovered=0;
    for(const work of state.work.filter(w=>w.status==='evidence_ready')){
      const interpretation=await projectRosterInventoryInterpretationRecoveryV1({state,work,readArtifact:run.readArtifact});
      if(!interpretation)continue;
      await run.reinterpretInventoryClaims(interpretation);
      await event(metadata.workflowId,{kind:'inventory_comparison_reinterpretation_queued',...interpretation});
      recovered++;
    }
    for(const work of state.work.filter(w=>['needs_repair','needs_model_choice','ready'].includes(w.status)&&!w.operationState?.pending)){
      const ref=work.operationState?.correction?.originalReplyRef;if(!ref)continue;
      const call=work.operationState.calls.findLast(c=>c.replyRef===ref);if(!call)continue;
      const [reply,request]=await Promise.all([run.readArtifact(ref),run.readArtifact(call.requestRef)]);
      const envelope=await projectRosterCommandEnvelopeRecoveryV1({state,work,readArtifact:run.readArtifact})
        ??await projectRosterInventoryClaimRecoveryV1({state,work,readArtifact:run.readArtifact})
        ??projectRosterCompletedReadRecoveryV1({state,work,reply,request,
          directory:state.evidence.map((entry,index)=>({...entry,number:index+1}))});
      if(envelope){
        await run.revalidateRoleReply({workId:work.id,reason:envelope.kind?.startsWith('inventory_')?'Inventory subject/accounting guard repaired. Reconsume the exact paid extraction through current Native comparisons and ordinary role checks; preserve quotes, choices, failures, counters and fees. No new Provider/Native call or Plan approval.':'Host projects only the exact schema-owned transport fields recorded by the shared command envelope decoder. Reconsume the original paid reply through normal semantics; preserve choices, failures, counters and fees. No new Provider/Native call or approval.'});
        const record={...envelope,originalFailure:work.failure,at:new Date().toISOString()};
        metadata.schemaRevalidations=[...(metadata.schemaRevalidations??[]),record];
        await save(metadata.workflowId,metadata);await event(metadata.workflowId,{...record,kind:'saved_schema_revalidation_queued'});
        recovered++;continue;
      }
      if(work.status!=='needs_repair')continue;
      const handoff=await projectRosterAuthorDecisionHandoffV1({role:work.role,operation:work.operationState,store:{get:run.readArtifact}});
      if(handoff){
        await run.handoffStrategyAuthor({workId:work.id});
        const record={workId:work.id,sourceReplyRef:handoff.sourceReplyRef,
          questionCount:handoff.questions.length,at:new Date().toISOString(),acceptanceGranted:false};
        metadata.authorDecisionHandoffs=[...(metadata.authorDecisionHandoffs??[]),record];
        await save(metadata.workflowId,metadata);await event(metadata.workflowId,{kind:'strategy_author_handoff',...record});
        recovered++;continue;
      }
      const delivery=await projectRosterWorkflowReadDeliveryRecoveryV1({state,work,store:{get:run.readArtifact}});
      if(delivery&&!metadata.feedbackRecoveries?.some(record=>record.recoveryKey===delivery.recoveryKey)){
        await run.resumeRoleCorrection({workId:work.id,
          reason:'Concrete read-delivery source fix v706 prioritizes not-yet-delivered small sources before repeated old prefixes. The failed request had no body delivery for its cited sources, although their fetches succeeded; the corrected next request actually includes them. One additional author-confirmation correction only: read the delivered bodies and confirm or revise the pending proposal. Do not revalidate the old reply as accepted, waive source checks, reset history/fees or replay Native.'});
        const record={...delivery,originalFailure:work.failure,at:new Date().toISOString()};
        metadata.feedbackRecoveries=[...(metadata.feedbackRecoveries??[]),record];
        await save(metadata.workflowId,metadata);await event(metadata.workflowId,{kind:'read_delivery_recovery_queued',...record});
        recovered++;continue;
      }
      const plan=await projectRosterSavedProposalRecoveryV1({state,work,readArtifact:run.readArtifact})
         ??await projectRosterHostStepKindRecoveryV1({state,work,readArtifact:run.readArtifact})
         ??await projectRosterEmptyCandidateRecoveryV1({state,work,readArtifact:run.readArtifact})
        ??await projectRosterInventoryClaimRecoveryV1({state,work,readArtifact:run.readArtifact})
        ??projectRosterWorkflowSavedSchemaRevalidationV1({state,work,reply,request,
        directory:state.evidence.map((entry,index)=>({...entry,number:index+1}))})
        ??await projectRosterNativeRejectionRevalidationV1({state,work,reply,readArtifact:run.readArtifact})
        ??await projectRosterControlDiagnosticsRevalidationV1({state,work,reply,request,readArtifact:run.readArtifact})
        ??await projectRosterParticipantBindingRevalidationV1({state,work,reply,request,readArtifact:run.readArtifact})
        ??await projectRosterComparisonParticipantRevalidationV1({state,work,readArtifact:run.readArtifact})
        ??projectRosterComparisonResourceRevalidationV1({state,work,reply,request});
      if(!plan){
        const sourceRequest=work.operationState.correction.errors?.every(e=>e.code==='unchanged_investigation_authorization')
          ?await run.readArtifact(work.operationState.calls[0].requestRef):undefined;
        const feedback=await run.refreshBuilderRejectionDiagnostics?.({workId:work.id,request})
          ??await projectRosterMapOfferRecoveryV1({state,work,request,descriptor:run.tools(),readArtifact:run.readArtifact})
          ??await projectRosterBudgetCapabilityRecoveryV1({state,work,request,readArtifact:run.readArtifact})
          ??projectRosterConstructionInquiryRecoveryV1({state,work,request})
          ??projectRosterBudgetOwnerRecoveryV1({state,work,request})
          ??await projectRosterBuilderChoiceFeedbackRecoveryV1({state,work,request,readArtifact:run.readArtifact})
          ??await projectRosterDiagnosticFeedbackRecoveryV1({state,work,reply,request,readArtifact:run.readArtifact})
          ??projectRosterWorkflowFeedbackRecoveryV1({work,reply,request,sourceRequest});
        if(!feedback||metadata.feedbackRecoveries?.some(r=>r.recoveryKey===feedback.recoveryKey))continue;
          const reason=['construction_inquiry_scope','construction_inquiry_context','construction_inquiry_instruction','map_proof_offer_registration','budget_search_capability','budget_author_responsibility','builder_candidate_choice_handoff','plan_source_read_phase','operation_step_parameters'].includes(feedback.repairKind)?feedback.instruction
            :feedback.repairKind==='scoped_coverage_form'
            ?'C12 coverage form repair: the old wire schema allowed an empty dataQuestions table although semantic coverage required every authorized observation. The current form explicitly requires the same local observation identities, including answered ones. Fill each classification, publicReason and actual evidenceNumbers yourself; prose alone does not classify it. One corrected review only, no source approval, new experiment, Native replay, historical rewrite or renewed recovery under form v1. Parent questions remain with their owner.'
            :feedback.repairKind==='native_missing_path_feedback'
            ?'E105 source diagnostic repair: the previous evidence_not_read error referred to a nonexistent Native field. Current feedback distinguishes missing addresses from valid unread fields and lists source-owned parent/keys. Select an actual field, read it and confirm the corrected conclusion; do not repeat the nonexistent address or treat it as missing game capability. One corrected conclusion only, retaining old calls, costs, facts and unresolved coverage. No Native replay, automatic strategy/Plan approval or renewed grant once the new diagnostic has been delivered.'
            :feedback.repairKind==='native_leaf_address_feedback'
            ?'C12 exact-source navigation repair: the failed current Native pointers used the wrong parent. Current feedback lists every real occurrence of the same field name in the immutable original, including its full pointer and source identity. Choose and cite the actual field, reading it if not already delivered; Host does not select a match, rewrite the saved claim/value or rerun the query. One corrected conclusion only; preserve original replies, costs, missing parent questions and every source/coverage gate. No automatic Plan approval or renewed grant after these addresses were delivered.'
            :feedback.repairKind==='builder_constraint_diagnostics'
            ?'C12 Native feedback repair: the old illegal candidate receipts discarded already-computed slot/resource totals. Newly published read-only audits preserve the exact candidates, frozen dataset and illegal verdicts, and expose source-owned per-unit slot usage, per-card additions and capacity or gas costs. Read the current investigation continuation diagnosticSource addresses; Marauder classification must come from its Native row, not prior prose. Make your own explicit revised candidate/Plan choice or justified handoff. Repeating an already answered candidate remains invalid. One additional correction only; no automatic roster selection, legalized candidate, source refresh, old receipt rewrite or counter/fee reset.'
            :feedback.repairKind==='temporal_binding_feedback'
            ?'C12 source diagnostic repair: the old temporal compiler mislabeled non-budget coordinate bindings as missing search bounds. Current source feedback identifies exact invalid paths and the permitted parent/entry bindings. Keep valid bounds and the same unit/target/scope. Read actual marker geometry and explicitly choose scalar coordinates, or return the unresolved method; Host will not select a marker or execute the old malformed proposal. One additional correction, preserving paid replies, history and fees; no automatic reachability/Plan approval or repeated grant under the new contract.'
            :feedback.repairKind==='map_argument_feedback'
            ?'C12 map-input source fix: map_route baseId means physical model footprint, NOT deployment zone; map_deployment returns deploymentGeometry, not /player1/baseId. Current operation interfaces now state this explicitly, and compilation recognizes declared parameter bindings. The saved empty patch did NOT request the reads mentioned in prose and is NOT accepted. Read the current mapQueries selectors with actual source addresses, then explicitly repair the retained route parameters or return an honest unresolved method. Preserve targets, original scope, paid records and facts. One additional corrective result; no Native replay, inferred arrival, silently selected footprint or automatic Plan approval.'
            :feedback.repairKind==='blocker_command_diagnostic'
            ?'P2/P3/P5 product repair: the Web/App facade now exposes the existing Native bounded_arrival_control and bounded_unit_temporal methods. Read the CURRENT descriptor; the previous missing-offer list is historical, not current capability truth. The rejected reply also mixed disposition=revise and a non-null mutation with workflowBlocker, whose command requires retain/mutation=null/nextInvestigation=null. Choose your next operation explicitly: an actual independent revision with workflowBlocker=null and necessary questions preserved, a supported inquiry, or a supported external blocker without mutation. The temporal tool only proves a bounded single-unit conditional arrival, not earliest arrival, a whole-army schedule, guaranteed control or future VP. One author correction after this concrete source fix; no host-selected roster/strategy, edited paid reply, automatic answer, Native replay, counter/fee reset or renewed grant under the new diagnostic.'
            :feedback.repairKind==='inquiry_selection_feedback'
            ?'C12 exact inquiry-selection feedback now shows the actual selected predicate and its current classification, available necessary-fact addresses and the first append address. The old stopped correction omitted this distinction and excluded the selected answered question from focus. One author correction only: explicitly choose a genuinely new necessary question or make the intended structured draft/Plan decision; preserve the already answered candidate audit. A preliminary conditional Plan need not await final-budget release, but Host selects neither roster nor strategy. Preserve old calls, questions, counters and fees; no Native replay, automatic answer, new global Teach or renewed grant under selection v1.'
            :feedback.repairKind==='author_exact_question_merge'
            ?'P2/P5 actual A ledger contract repair: old command preserved every numbered entry but offered no way to merge exact duplicate predicates rejected by coverage. One explicit author merge may choose classification/reason/sources; Host only preserves originals and remaps references. Different predicates, conflicting operations and competing proof obligations cannot be silently merged. No question/fact/Plan approval, edited paid reply, Native replay or counter/fee reset. Current merge-version requests cannot renew this grant.'
            :feedback.repairKind==='comparison_review_scope_selection'
            ?'P2/P5 actual B closure-review source repair: audit premise IDs and exact measured-comparison keys are now selected from the current contract, separate from quote-only author context. Empty comparison keys require no numericAssertions, not an invented key for two raw receipts. One reviewer correction with independent semantic findings and original evidence preserved; qualifiers already present and strategic worth are not arithmetic contradictions. No automatic acceptance, edited reply, new experiment, counter/fee reset or renewed grant under scoped selection.'
            :feedback.repairKind==='local_author_correction_focus'
            ?'P2/P5 concrete local-author input repair: the failed command still carried unrelated global review/read bodies beside three exact pending questions. Keep the complete question ledger, current army/Plan, selected exact sources and all freshly requested reads; move old unrelated bodies to immutable ordinary-reader pointers. Schema-derived command shape names the required decision.disposition address without choosing it. One old-context author correction; preserve original malformed output, counters, fees and every semantic/source/Builder gate. No inferred disposition, question deletion, Native replay or renewal under focused context v2/command protocol3.'
            :feedback.repairKind==='scoped_investigation_progress_alignment'
            ?'C12 fixes an actual contradictory dispatch instruction: null inquiry was described as returning required unresolved work, while the progress validator rejected it. One author correction under the shared scoped policy, not a new experiment or automatic approval. Decide or revise required author choices; query only genuinely necessary external facts; retain optional hypotheses and unrelated parent questions as unresolved without inventing evidence. Original replies, counters and fees remain; requests already carrying v4 cannot renew this grant.'
            :feedback.repairKind==='comparison_quote_selection'
            ?'C12 concrete quote-interface repair: choose numbered sources from the CURRENT author text instead of retyping exact quotes. Host binds the selected original text only; the reviewer still owns verdicts, evidence and reasons. One additional local correction, with the prior rejection and unmeasured risks preserved. No automatic approval, Native replay, history/counter/fee reset or renewed grant under the source-number contract.'
            :feedback.repairKind==='experiment_operation_command'
            ?'C12 concrete operation-contract repair replaces the contradictory flat read/workOrders envelope with one explicit typed command. One additional model choice only: submit the exact retained unexecuted batch, propose a different batch, read necessary evidence or return an honest scoped conclusion. Host never turns the old read reply into execution. Original compiler/source/Native/release gates, unknown questions, paid replies, counters and fees remain; no Native replay or renewed grant for this command contract.'
            :feedback.repairKind==='tool_outcome_diagnostic_feedback'
           ?'C12 source-owned failure-diagnostic feedback now separates actual query failures/reuse metadata from Native computed observations and lists their real paths. One additional author correction of this blocked control return only; retain all unresolved measurements, valid facts and source references. Do not silently trim/rewrite the saved reply, treat unknown as zero, replay a query, waive source review, reset history/fees or renew this grant under the new diagnostic navigation.'
           :feedback.repairKind==='formation_fact_address_feedback'
           ?'C12 source-address repair: displayed exact Native search fields now resolve through the same registered-original mapper used for reading. Updated feedback gives exact nested source addresses; a nonexistent flattened address remains invalid and must be corrected by the author. One additional local correction of this blocked control return only. Preserve the no-candidate observation and every unresolved parent measurement; zero candidates is not impossibility or zero strategic benefit. No Native replay, source/value/Plan approval, model-output rewrite, history/counter/fee reset or renewed grant under source-navigation v2.'
           :feedback.repairKind==='current_read_availability'
          ?'C12 concrete source-delivery repair: the stopped request carried exact bodies together with the PRIOR fetch receipt calling those same bodies notDelivered. New request assembly computes current availability from the actual outgoing exact bodies and labels historical identity separately. One new author confirmation only; use the delivered evidence or name genuinely missing detail. Repeated current-body reads still stop. Preserve old requests/replies, fees, questions and counters/history; do not approve a fact/Plan, replay Native or renew this grant under current availability v2.'
          :feedback.repairKind==='delegated_comparison_binding_edit'
          ?'C12 concrete edit-capability repair: the stopped local compiler-repair command could edit steps but not the order-level comparison identity rejected by the compiler. The new command allows an explicit model choice comparisonBindingEdit=inherit_delegated; the same resolver derives only the saved pending operation identity. Choose that correction or return a precise unresolved control handoff. One new author correction only; no automatic rewrite of the paid reply, scope/participant/strategy change, endpoint approval, Native replay, history/fee reset or renewed grant under binding-edit v1.'
          :feedback.repairKind==='inline_order_incremental_correction'
          ?'Concrete P1/P2/P5 v961 connects same-role pre-dispatch selector corrections to the existing incremental work-order ledger. Retain all unmentioned steps, successful reads, original scope and failed replies; only explicit patches change the proposal. Zero menu matches means absent, not ambiguous or an instruction to copy a capability route. One additional corrected command only, or an explicit model-owned return to the method owner. No Native replay, automatic alternative choice, source/legality waiver, history/fee reset or renewed grant under the new command.'
          :feedback.repairKind==='comparison_control_command'
          ?'Concrete P2/P4/P5 v929 comparison control separates a model-selected investigate/redesign/close/revise/block operation from generic purpose rewriting. Current Plan/army and exact source values remain; repeated metadata is losslessly factored and global history remains readable. One new-contract attempt only, no counter/history reset, automatic choice, source approval, Native replay or renewed grant under the new control contract.'
          :feedback.repairKind==='host_projection_fact_channel'
          ?'Concrete P1/P2/P5 v904 source contract separates Host interface wording from saved candidate configuration and Native computed facts. The former sourceContext incorrectly looked like an address for the whole projection although it stored only scope/instructions. One additional author correction with explicit available paths and original configuration handles; never convert Host metadata into a Native observation or fabricate a missing field. The model must read/cite actual saved selections separately and keep computed facts on their Native sources. Preserve raw replies, errors, costs and all independent coverage/semantic gates. No Native replay, auto-approval or renewed grant for a v2 Host projection source.'
          :feedback.repairKind==='explicit_inquiry_dispatch'
          ?'Concrete P1/P2/P5 v892 repair separates the unresolved question ledger from explicit inquiry authorization in the shared validator and BOTH product scheduling paths. The previous feedback allowed retain with unresolved facts, but another gate rejected it and forced a repeated inquiry. One additional corrected author decision only. Preserve all original questions, calls, fees and factual/Builder/release checks. A null authorization now dispatches no inquiry; remaining facts and required author choices stay unresolved and cannot approve a Plan. Choose a supported next operation yourself; no Host reclassification, answer rewriting, repeated Native query or renewal under investigation_dispatch_contract v2.'
          :feedback.repairKind==='owner_handoff_command_continuity'
          ?`Concrete P2/P4/P5 author-command continuity repair protocol ${feedback.feedbackVersion} connects strategic-owner corrections to the same explicit command. Neither a persisted handoff nor mixed citation/semantic diagnostics may switch a structurally valid owner decision back to the rejected full answer template. One additional old-contract correction; current army authority, pending questions, original replies/fees and all Builder/source/semantic checks remain. The model must issue its own next operation. No automatic choice, Native replay, history reset or renewed grant for an already command-form request.`
          :feedback.repairKind==='native_receipt_view_source'
          ?'Concrete P1/P3/P5 v876 source fix resolves registered tool views through the SAME exact pointer mapper as the evidence reader, then validates immutable Native values. Old feedback incorrectly rejected every view and induced metadata citations. One local author confirmation with exact source navigation; /sections metadata is still not a Native value, no tool replay, source waiver, value rewrite, history reset or automatic semantic/Plan approval. Requests already carrying native_receipt_view_source cannot renew this grant.'
          :feedback.repairKind==='current_plan_source_navigation'
          ?'Concrete P1/P2/P5 v874 feedback fix supplies exact current Plan block addresses for the historical blocks actually cited by this reply. Read current counterparts and explicitly confirm/correct the citations and claims. One additional local correction only; unchanged contents are not automatically rebound, changed blocks are not silently promoted, original replies/errors/fees remain. No Native replay, forced strategic choice, skipped source review or renewed grant for requests already carrying sourceNavigation v1.'
          :feedback.repairKind==='host_projection_source_citation'
          ?'Concrete P1/P2/P5 v854 source-publication fix gives the delivered Host projection instructions an immutable source number through the normal evidence reader. This source proves only its own interface wording, not a Native result, causal verdict, or an unavailable historical reviewer statement. One additional local correction only; preserve old replies, errors, fees and the self-citation guard. The model must cite the actual source or return an accurate unresolved/revision verdict; no claim or Plan is automatically approved.'
          :feedback.repairKind==='review_patch_continuity'
          ?'Concrete P2/P5 v836 repair-continuity fix keeps the original rejected check and its source errors separate from a malformed patch attempt. The old request fell back to a full review carrying patch-format errors but lost the original semantic obligation. One additional corrected request only; preserve exact reads, raw replies, failed attempts and fees. No host verdict, Native replay, source-check waiver or renewed grant under review_repair_continuity_contract v1.'
          :feedback.repairKind==='hypothesis_source_identity'
          ?'Concrete P2/P5 v819 source-identity repair removes a false inline hypothesis citation: the old asset index attached its parent declaration to the first factual scene receipt, which actually has hypothesisTest=null. New context uses the same immutable origin as validation and keeps all factual navigation. One additional old-contract correction; model chooses citations and scoped verdict, independent source/coverage review remains. Preserve all prior calls, errors, fees and counters; no hand-edited answer, Native replay or renewal under the new source contract.'
          :feedback.repairKind==='author_decision_command'
          ?'Concrete P2/P4/P5 v803 replaces a verbatim repeated owner reply with an explicit model-owned next-operation command and numbered question updates. The original answer is retained as Host projection state/readable context, not the inline output template. One extra old-wire correction; preserve all unedited obligations, fees and counters. Original semantic/Builder/source checks still apply; no forced candidate, hidden edit, repeated grant or Native replay.'
          :feedback.repairKind==='incoming_author_ownership'
          ?`Concrete P2/P5 owner-input repair protocol ${feedback.feedbackVersion} keeps the typed responsibility return as the CURRENT strategic assignment during correction. Prior role restrictions and old strategic replies are readable historical context, not the owner task or output template. Interface-delivery repair does not prove a missing Native capability or an unexecuted historical experiment. One additional old-protocol decision only; the model must choose actual mutation/retain/necessary new inquiry through the existing author command. Preserve old replies, counters, fees, source checks and all unresolved obligations. No forced candidate adoption, Native replay or renewed grant for requests carrying strategy_owner_assignment.`
          :feedback.repairKind==='typed_inquiry_command'
          ?'Concrete P2/P5 v801 correction-route fix gives the strategic author an explicit authorize_inquiry command for the NEXT operation instead of retyping an inconsistent whole reply. The command remains model-selected; original questions, source checks, mutations, costs and failures are preserved. One additional old-wire correction only; no Host decision, Native replay or repeated grant for the localized protocol.'
          :feedback.repairKind==='partial_choice_next_operation'
          ?'Concrete joint-choice contract fix v800 separates resolved per-question choices from the NEXT operation. The old request incorrectly prohibited decided_here together with a valid investigation of a different necessary fact. One additional author correction only; do not rewrite the old chosen operation, delete unknowns, reset fees/counters, rerun Native or grant another recovery for the new protocol.'
          :feedback.repairKind==='typed_semantic_repair'
          ?'Concrete P2/P5 semantic repair protocol v796 accepts explicit model-authored question patches or a replacement decision, then runs the unchanged original source/semantic checks. One additional correction only for the exhausted old full-output protocol; no reply edits, automatic classification, Native replay or renewed grant for the new protocol. Preserve old calls and fees.'
          :feedback.repairKind==='scoped_semantic_correction_context'
          ?`Concrete P2 scoped-input repair protocol ${feedback.feedbackVersion} retains current army/Plan, assigned questions, returned facts and existing acceptance semantics while moving global historical obligations and already-closed comparison bodies to exact same-reader sources. Global obligations remain recorded but are not newly assigned tasks; closed comparison status does not authorize another closure operation. One additional corrected owner decision only; preserve every old reply, error and fee. No Host reclassification, automatic strategy approval, Native replay or another recovery for a request already carrying the repaired scope contract.`
          :feedback.repairKind==='selected_native_menu'
          ?'Concrete selected-menu source repair v682 uses the SAME execution selector to identify wrong primitive matches and the exact chosen body pointer. Current feedback is recomputed from the immutable source, not another full actionSpace demand. One additional local correction only; preserve paid replies, selected intent, evidence and counters. No Host action substitution or Native replay.'
          :feedback.repairKind==='review_obligation_handles'
          ?'Concrete reviewer identity repair v3 replaces long causal IDs with supplied short handles and identifies the exact missing/duplicate questions. Preserve all 21 original obligations, source reads, old replies and fees. One additional correction only; no answer or verdict is supplied by the host.'
          :feedback.repairKind==='syntax_diagnostic'
          ?'Concrete feedback repair v2 now provides the exact saved JSON parser offset and local text, instead of falsely claiming a schema definition. One additional local correction, original proposal/evidence/fees retained; do not repeat the same malformed text. No Native replay.'
          :'Concrete feedback repair v2 explains how a source reviewer must return needs_evidence for missing proof rather than repeatedly label it supported without citations. One additional local correction, no factual or Plan approval; keep actual unknowns and old costs.';
        await run.resumeRoleCorrection({workId:work.id,reason});
        const record={...feedback,originalFailure:work.failure,at:new Date().toISOString()};
        metadata.feedbackRecoveries=[...(metadata.feedbackRecoveries??[]),record];
        await save(metadata.workflowId,metadata);await event(metadata.workflowId,{kind:'local_feedback_recovery_queued',...record});
        recovered++;continue;
      }
      if(!plan||metadata.schemaRevalidations?.some(r=>r.revalidationKey===plan.revalidationKey))continue;
       const reason=['candidate_host_empty_fields','comparison_resource_fact_identity'].includes(plan.repairKind)?plan.instruction:plan.repairKind==='premise_aggregate_author_handoff'
         ?'P5 review responsibility repair: exact supported aggregate labels cannot override a reviewer-rejected premise/tradeoff. Host derives rejection from the unchanged detailed findings and returns it to the strategic author rather than asking the reviewer to duplicate the rejection. Revalidate the saved paid reply once through ordinary schema, source and quote checks. No evidence, Plan, strategy or closure approval; no new Provider/Native call, counter reset or history rewrite. The author must address the retained rejection.'
         :plan.repairKind==='comparison_participant_arm_scope'
         ?'C12 concrete participant-gate repair: configuration replacements use the explicit actor union across arms, v6 measurement subjects remain required in their own arm, and frozen opponent upgrade aliases come from the same bound Native source rather than an own-faction-only menu. The unchanged paid reply now passes this deterministic check. Revalidate it ONCE through the original request and all ordinary schema/read/semantic gates. No participant insertion, altered reply, strategy approval, Provider/Native replay, counter reset or renewed recovery under diagnostic v3.'
         :plan.repairKind==='comparison_schema_owned_projection'
         ?'P2/P5 typed-command integration repair: use the model-selected unique operation schema and the shared one-hop ownership projector; discard only exact known redundant null/empty no-ops. Revalidate the SAME paid reply through all original source, read and semantic gates. Preserve selected operation, policy, evidence numbers, reasons, raw reply, history, counters and fees. Conflicting fields, nonempty edits and ambiguous operations remain invalid. No Provider/Native replay, new evidence, strategy choice or final approval.'
         :plan.repairKind==='author_commitment_citation'
         ?'C12 author-intent/source separation: a public commitment is not an empirical observation. Revalidate the exact paid reply once through the complete role executor; do not invent a citation, rewrite a classification, erase a necessary question or approve any fact/strategy/Plan. Actual answered facts, original delegated predicates, source/coverage and release checks remain. Prior calls, fees and failed attempts are retained; no Provider/Native replay or renewed grant under choice-lane v5.'
         :plan.repairKind==='unissued_method_compiler_contract'
         ?'P3/P5 unissued-method source repair: the exact saved order now compiles with current bindings and the SAME complete compiler, delegation and explicit dependency graph. No compiled child exists. Revalidate this paid command once through normal source/read/semantic checks, then execute only if accepted. Do not edit the saved order, invent state, grant Native legality, buy a corrective rewrite, reset counters or replay an issued action.'
         :plan.repairKind==='lossless_author_question_writes'
         ?'C12 paid command consumption repair: overlapping updates agree exactly on classification and selected evidence, so retain BOTH authored reasons without last-write-wins; differing classifications/sources still reject. New commands expose only one write channel for duplicate identities. Revalidate the immutable original reply once through all original source/semantic gates; no Provider/Native replay, silent reason deletion, new factual conclusion, counter reset or Plan approval.'
         :plan.repairKind==='typed_control_diagnostics'
         ?'C12 blocked-control source repair: decode the actual typed operation command and verify its diagnostic against the immutable tool source. The action eligibility view is recomputed through the SAME display projector and remains a control diagnostic, not a raw measurement, arrival proof, global impossibility or approved causal explanation. Actual read, state identity, source currency and exact value still apply. Revalidate the same paid reply; no Provider/Native replay, new observation or Plan approval.'
         :plan.repairKind==='typed_participant_binding_address'
         ?'C12 exact producer-contract address repair: the old schema incorrectly placed selected-participant identity under /receipt, but the unchanged executed source stores its typed participantConfigurationCheck at the envelope root. Revalidate the same paid command through its original schema, read/currency/value checks and source review. Record the exact address resolution and identity-only scope; do not rewrite the saved answer, supply a value, approve combat/Plan, reset counters, replay Native or call the provider again.'
         :plan.repairKind==='explicit_hypothesis_citation_union'
         ?'C12 citation-ledger repair derives the parent conclusion inventory only from source numbers ALREADY explicitly selected in this same paid reply hypothesis assessment. Revalidate the original reply once through unchanged actual-read, hypothesis-origin, Native-value and source/coverage checks. Do not buy a citation-copying request, add an unselected source, change the verdict/unknowns or execute Native. Original reply, failures, costs and history stay immutable; no final Plan approval.'
         :plan.repairKind==='immutable_reads_saved_request'
         ?'C12 product saved-read restoration fix: the prior local revalidation incorrectly applied the NEXT synthesis schema to the already-paid read. Re-enter only that saved response against its ORIGINAL request/schema, then close reading and request the next decision. No paid request resend, Native replay, source/strategy approval or new generic retry cycle; retain the failed revalidation and all history/costs.'
         :plan.repairKind==='immutable_reads_decision_handoff'
         ?'C12 restores the existing finite preparation-to-decision transition: reprocess only the saved redundant read, fetch nothing again, then require a necessary executable method or honest unresolved control return. One saved-reply continuation after this concrete source fix; preserve all prior calls, failures, costs, questions and source limits. No Native replay, strategy choice or final approval. A new-contract repeated read cannot renew this grant.'
         :plan.repairKind==='immutable_scope_owner_return'
         ?'C12 immutable-scope ownership repair: revalidate this exact paid proposal once so the pure compiler diagnostic returns to the experiment owner instead of another step-only correction. Do not edit the saved scope, infer a selection, buy a model retry, execute Native or approve any fact/Plan. Prior reply, failure and fee records remain unchanged; no renewed grant for the same saved reply.'
         :plan.repairKind==='native_choice_local_comparison_identity'
         ?'C12 Host template repair: the one-action chooser copied parent observation step IDs despite using a new local step ID. Only an exact copy of that saved parent identity now uses the existing delegated compiler mapping. Revalidate the SAME paid selection once; source/index/parameters/outcome and original reply remain unchanged. Changed arms/metrics/stages still fail. No Provider/Native replay, new strategy, endpoint approval, history/fee reset or skipped source/legality checks.'
         :plan.repairKind==='native_rejection_fact'
        ?'Concrete v932 negative-result contract verifies the original Rules rejection separately from successful combat. Revalidate the exact saved paid reply once through ordinary current-source/read/value/coverage checks. Only its exact candidate illegality/reason is eligible; no combat result, replacement impossibility, strategic approval, Provider/Native replay or history/counter reset.'
        :plan.repairKind==='native_menu_candidate_identity'
        ?'Concrete v888 source identity fix matches the finite candidateId/actionKey actually published by the selected Native inspect menu, not only fields inside its action. Revalidate the same paid selection through the SAME exact read/execution resolver; no guessed ID, alternate candidate, Provider/Native replay or Plan approval. Duplicate, absent or conflicting identities still fail; preserve the original rejection and fees.'
        :plan.repairKind==='work_order_self_anchor'
        ?'Concrete P1/P2/P5 incremental position repair treats an EXISTING step anchored before itself as an in-place replacement. Revalidate the exact paid command, preserving every authored argument, source, unmentioned step and original scope; unknown/new self anchors still fail. This is not a legality verdict: normal compiler/source/Native checks remain. No Provider/Native replay, author rewrite, new scope, fee/history reset or renewed grant under positionContractVersion 2.'
        :plan.repairKind==='work_order_read_preparation'
        ?'Concrete P1/P2/P5 v959 imports the saved mixed work-order command into READ PREPARATION ONLY. Retain its explicit incremental proposal, fetch requested immutable sources, then require author confirmation/revision before the original compiler and Native gates. Preserve old requests, errors, counters/history and fees; no Provider/Native replay, automatic proposal submission, missing-source approval or new experiment scope. One recorded recovery only.'
        :plan.repairKind==='explicit_experiment_conclusion_discriminator'
        ?'Concrete v887 operation routing repair recognizes an explicit conclusion with no reads/searches/work orders despite its finish label. Revalidate the same paid reply through the normal schema, source and semantic checks; preserve its blocked/answered/strategy_required status, conditions and unresolved questions. No Provider/Native replay, rewritten conclusion or strategic approval.'
        :plan.repairKind==='read_only_payload_discriminator'
        ?'Concrete v886 read-only routing fix reuses this paid reply once. Explicit reads with no proposal/conclusion do not finish the task. In a closed preparation window, repeated completed reads return to the author without fetching again or granting further preparation. Preserve original reply, unresolved questions, reads, failures and fees; no Provider/Native replay or acceptance.'
        :plan.repairKind==='native_fact_json_value'
        ?'Concrete v872 fact-value correction compares exact JSON observations, including objects, arrays and explicitly present null, rather than falsely classifying every non-scalar as unknown. Revalidate the same paid answer through current source/read/value/semantic checks; do not replace any value or interpret null as zero. Explicit unknown/error results and wrong coordinates still fail. Preserve original records, calls and costs; no Provider/Native replay or strategic approval.'
        :plan.repairKind==='native_fact_receipt_envelope'
        ?'Concrete v871 source-envelope correction recognizes direct official Builder audit results alongside laboratory operation/receipt wrappers. Revalidate this exact paid reply once through the normal current-source, actual-read, exact-value and semantic checks. Preserve the original reply, old rejection, calls and fees; no Provider/Native replay, rewritten values or Plan/strategy approval. Wrong values, stale sources and unknown observations still fail.'
        :plan.repairKind==='selected_candidate_read_handoff'
        ?'Concrete v804 selected-candidate read repair uses the immutable original source, not its receipt-view address, and routes missing candidate delivery through the ordinary exact-read -> author-confirmation boundary. Revalidate the paid model selection once without Provider/Native replay; do not auto-adopt, change its chosen army or grant final approval. Preserve the original failure and fees. New candidate source reads must actually be delivered before the author confirms.'
        :plan.repairKind==='mixed_citation_read_handoff'
        ?'Concrete v793 source fix separates deterministic citation reads from independent semantic correction. Revalidate the exact paid proposal once to fetch its explicitly selected immutable sources, retaining every author/strategy error for one further correction. No new Provider request to recreate the proposal, no Native replay, no acceptance or historical fee reset.'
        :plan.repairKind==='typed_future_premise_review'
        ?'A source-check contract fix no longer demands an already-realized opponent receipt for an explicitly conditional, premises-bearing, purely future_condition review. Revalidate this same paid reply once; preserve all current necessary facts and questions. No Provider/Native replay and no factual or Plan approval.'
        :plan.repairKind==='completed_json_syntax_projection'
        ?'The completed paid raw reply has a unique local single-container-close grammar recovery. Preserve every original byte and the insertion proof; revalidate the projected object once through schema, actual-read and semantic checks. No Provider/Native replay or strategy approval.'
        :plan.repairKind==='inert_envelope_projection'
        ?'A schema-guided projection preserves inert null/empty-array/empty-object extras as non-executable envelope annotations. The actual mutation and meaningful fields are unchanged. Revalidate this paid reply once through normal read/semantic checks; preserve the original and fees. No Provider or Native replay.'
        :plan.repairKind==='explicit_question_citation_union'
        ?'A lossless structural projection derives the parent review inventory from source numbers explicitly selected by the model in dataQuestions. Revalidate this exact paid reply once through normal actual-read and semantic checks; do not invent sources, alter strategy/unknowns or replay Provider/Native.'
        :plan.repairKind==='inventory_compound_accounting'
        ?'E190 compound accounting source repair: reinterpret the exact original extraction before incorrect Host feedback changed it. Preserve all original claims/quotes, raw replies, failures, counters and fees; Native still decides each inventory match. No model/native replay or strategy approval.'
        :'A deployed output-contract repair now accepts this exact saved reply while its original schema rejected it. Revalidate once through the normal role semantics; preserve the original reply, failures, reads, fees and unproven questions. No Provider or Native replay.';
      await run.revalidateRoleReply({workId:work.id,reason});
      const record={...plan,originalFailure:work.failure,at:new Date().toISOString()};
      metadata.schemaRevalidations=[...(metadata.schemaRevalidations??[]),record];
      await save(metadata.workflowId,metadata);await event(metadata.workflowId,{...record,recoveryKind:record.kind??record.repairKind,kind:'saved_schema_revalidation_queued'});
      recovered++;
    }
    return recovered;
  }
  async function resumeCorrectedHostBranchFaults(run,metadata){
    const state=await run.inspect(),graph=createRosterWorkflowGraphV1(state);
    if(state.work.some(w=>w.status==='running'||w.operationState?.pending))return 0;
    const fixedObservation=await projectRosterReadOnlyToolFixV1({state,readArtifact:run.readArtifact});
    if(fixedObservation){
      await run.requestDecision({id:fixedObservation.id,
        question:'原作者保留的必要查询因已确认的工程适配错误而未得到答案。依据当前工具合同重新决定如何完成同一查询并推进当前军表和Plan；旧失败不能证明不可达，修复通知也不是新事实。不要重复纠正骰值或扩大实验范围。',
        inputs:{priorAuthorDecision:{source:'evidence',id:fixedObservation.ownerEvidenceId,pointer:''},
          failedObservation:{source:'evidence',id:fixedObservation.sourceEvidenceId,pointer:''},
          implementationCorrection:{source:'literal',value:fixedObservation}}});
      await event(metadata.workflowId,{kind:'completed_read_only_tool_fix_return',...fixedObservation});
      return 1;
    }
    let count=0;
    for(const work of state.work.filter(w=>w.role==='roster_workflow_tool'&&w.status==='needs_model_choice'
      // Local experiments deliberately depend on army/map/rules/source, not a
      // Plan prose revision. Reuse the graph's declared-dependency semantics;
      // an absent Plan binding is not a stale one. Explicit stale bindings fail.
      &&w.repairGeneration===3&&w.resultRef&&graph.isCurrent(w.id))){
      if(work.branchReturnRef||state.work.some(w=>w.id===work.id+':input-repair'))continue;
       const failedResult=await run.readArtifact(work.resultRef),failure=failedResult.value,request=failure?.request;
       const menuFix=failure?.code==='ROSTER_WORKFLOW_NATIVE_SELECTION_SOURCE_INVALID'&&work.inputRef
         ?projectRosterSavedMenuSelectorRecoveryV1({work,failedResult,savedInput:await run.readArtifact(work.inputRef)}):null;
        const cardFix=/^ROSTER_WORKFLOW_CANDIDATE_CARD_(ADD|REMOVE)_INVALID$/.test(failure?.code??'')&&work.inputRef
          ?projectRosterCandidateMultiplicityRecoveryV1({work,failedResult,savedInput:await run.readArtifact(work.inputRef)}):null;
        if(!menuFix&&!cardFix&&(!['formation_scene','scenario'].includes(failure?.operation)
        ||failure.operation==='formation_scene'&&failure.nativeSuccess!==false
         ||failure.operation==='scenario'&&failure.status!=='returned_to_model'))continue;
      let change,reason;
       if(menuFix){change=menuFix.engineeringChangeId;reason=menuFix.reason;}
        else if(cardFix){change=cardFix.engineeringChangeId;reason=cardFix.reason;}
       else if(failure.code==='ROSTER_WORKFLOW_FORMATION_SELECTION_INPUT_INVALID'
        &&failure.detail==='explicit parent and selections required'
        &&request?.queryId===work.id&&request.branchId===work.id&&['source','branch'].includes(request.base?.kind)
        &&request.selections?.length&&!Object.keys(request).some(key=>!['base','selections','branchId','queryId'].includes(key))){
        change='private_branch_host_identity_v672';
        reason='The actual parent and selected saved formation option were already supplied. The Host incorrectly appended queryId to the branch-only interface; that source bug is now fixed. Continue the SAME explicit selection/parent through the existing tool repair, not new geometry or replay of successful actions. One additional generation only; all old failed receipts, attempts and fees remain.';
      }else if(failure.code==='PREGAME_LAB_FORMATION_SELECTION_SOURCE_MISMATCH'
        &&failure.queryRepair?.sourceContract==='pregame_static_formation_selection_v1'
        &&request?.base&&request.selections?.length
        &&!graph.ancestors(work.id).some(parent=>parent.completedMethodHandoff)){
        change='formation_parent_feedback_v752';
        reason='The saved failure received generic internal option-ID feedback although the actual conflict was mixing selections from different parents. The source contract now explains exact-parent identity, preserves unselected positions and uses public evidence/index selectors. One additional local model correction on the ORIGINAL return chain only; do not revive the competing handoff, reset prior attempts, replay successful sources, drop unknowns or approve the Plan.';
       }else{
         // Source adapters version their corrective interface, not the saved
         // failure. Verify what the producing model ACTUALLY received before
         // allowing the user's one post-fix continuation. A fresh failure, an
         // unchanged contract, or a missing paid input is not an upgrade.
         const current=run.projectToolRepair?.(failure);
         if(!current?.correctable||!current.inputProblem||!current.originalQueryNotAnswered
           ||!Number.isSafeInteger(current.repairContractVersion)||current.repairContractVersion<1)continue;
         const producer=state.work.find(row=>row.id===work.experimentOwnerId);
         const call=producer?.operationState?.calls?.at(-1);if(!call?.requestRef||!call.replyRef)continue;
         const paidInput=await run.readArtifact(call.requestRef);
         const delivered=paidInput.promptNodes?.find(node=>node.kind==='workflow_role_assignment')?.inputs?.task?.value?.failure?.queryRepair;
         if(delivered?.sourceContract!==current.sourceContract
           ||(delivered.repairContractVersion??0)>=current.repairContractVersion)continue;
         change=`source_repair_contract:${current.sourceContract}:v${current.repairContractVersion}`;
         reason='The saved producing request demonstrably contained an older source-owned repair contract. The current source validator now returns a precise inputProblem and the shared role-input seam delivers it to retained work. One additional correction of the SAME failed operation only; do not clear history, replay Native, broaden the local experiment or approve a Plan. Original paid request: '+call.requestRef;
       }
      if(metadata.hostToolRecoveries?.some(r=>r.workId===work.id&&r.engineeringChangeId===change)
        ||graph.ancestors(work.id).some(parent=>parent.controlledRecovery?.engineeringChangeId===change))continue;
      await run.resumeToolRepair({workId:work.id,expectedGeneration:3,engineeringChangeId:change,
        reason});
      metadata.hostToolRecoveries=[...(metadata.hostToolRecoveries??[]),{workId:work.id,engineeringChangeId:change,
        originalResultRef:work.resultRef,originalRepairGeneration:work.repairGeneration,
        additionalGenerationLimit:1,historyReset:false,at:new Date().toISOString()}];
      await save(metadata.workflowId,metadata);await event(metadata.workflowId,{kind:'source_fixed_host_tool_recovery',
        workId:work.id,engineeringChangeId:change,originalResultRef:work.resultRef,historyReset:false});count++;
    }
    return count;
  }
  async function resumeCapacityRejectedInputs(run,metadata){
    const state=await run.inspect();
    const work=state.work.filter(w=>w.status==='needs_repair'&&w.operationState?.pending
      &&w.failure?.code==='ROSTER_WORKSPACE_PROVIDER_RESPONSE_REJECTED'
      &&!w.operationState.contextReflows?.some(r=>r.inputDeliveryVersion===ROSTER_WORKFLOW_INPUT_DELIVERY_VERSION_V1));
    if(!work.length)return 0;
    const contexts=new Set(work.map(w=>w.operationState.pending.contextHash));
    const {latest}=await providerDispatches(metadata.workflowId,state,contexts);
    let count=0;
    for(const w of work){
      const dispatch=latest.get(w.operationState.pending.contextHash);
      if(dispatch?.status!=='response_rejected'||dispatch.rejection?.httpStatus!==400
        ||dispatch.rejection.contextLengthExceeded!==true)continue;
      const request=await run.readArtifact(w.operationState.pending.requestRef);
      if(!rosterWorkflowCanReflowInputV1({operationState:w.operationState,request,
        inputDeliveryVersion:ROSTER_WORKFLOW_INPUT_DELIVERY_VERSION_V1}))continue;
      await run.reflowProviderContext({workId:w.id,dispatch,inputDeliveryVersion:ROSTER_WORKFLOW_INPUT_DELIVERY_VERSION_V1,
        reason:'Rebuild only the explicitly context-rejected older input with shared source directories and exact child reads; retain original request, sources, counters and unknown fee. Never retry identical current-version input.'});
      await event(metadata.workflowId,{kind:'capacity_rejected_input_reflowed',workId:w.id,
        originalRequestId:dispatch.requestId,originalContextHash:dispatch.contextHash,
        originalCostStatus:dispatch.costStatus,historyReset:false,nativeReplay:false});count++;
    }
    return count;
  }
  async function reconsiderCapabilities(id,policy={}){
    if(active.has(id))fail('ROSTER_DECISION_JOURNEY_WRITER_BUSY');
    if(typeof policy.authorizationId!=='string'||!policy.authorizationId.trim()
      ||policy.authorizationId.length>256)fail('ROSTER_DECISION_RECOVERY_AUTHORIZATION_REQUIRED',400);
    const release=await claim(id);
    try{
      const metadata=await record(id),run=await open(id,metadata);
      const reconsideration=await run.reconsiderUnstartedInvestigationCapabilities({goalId:policy.goalId,
        expectedSourceReplyRef:policy.expectedSourceReplyRef,expectedDraftRevision:policy.expectedDraftRevision,
        reason:policy.reason,requiredDeliveryVersion:policy.requiredDeliveryVersion});
      if(!(metadata.capabilityReconsiderations??[]).some(r=>r.decisionId===reconsideration.decisionId)){
        const entry={...reconsideration,authorizationId:policy.authorizationId,at:new Date().toISOString()};
        metadata.capabilityReconsiderations=[...(metadata.capabilityReconsiderations??[]),entry];
        await save(id,metadata);await event(id,{kind:'capability_delivery_reconsideration',...entry});
      }
      return {reconsideration,workflow:await read(id)};
    }finally{await release();}
  }
  async function handoffNoProgress(id,policy={}){
    if(active.has(id))fail('ROSTER_DECISION_JOURNEY_WRITER_BUSY');
    if(typeof policy.authorizationId!=='string'||!policy.authorizationId.trim()
      ||policy.authorizationId.length>256)fail('ROSTER_DECISION_RECOVERY_AUTHORIZATION_REQUIRED',400);
    const release=await claim(id);
    try{
      const metadata=await record(id),run=await open(id,metadata);
      const handoff=await run.handoffRepeatedInspection({workId:policy.workId,
        expectedOwnerResultRef:policy.expectedOwnerResultRef,engineeringChangeId:policy.engineeringChangeId,reason:policy.reason});
      if(!(metadata.noProgressHandoffs??[]).some(r=>r.reportRef===handoff.reportRef)){
        const entry={...handoff,workId:policy.workId,authorizationId:policy.authorizationId,
          engineeringChangeId:policy.engineeringChangeId,at:new Date().toISOString()};
        metadata.noProgressHandoffs=[...(metadata.noProgressHandoffs??[]),entry];
        metadata.status='recovery_ready';metadata.failure=null;
        await save(id,metadata);await event(id,{kind:'no_progress_owner_handoff',...entry});
      }
      terminalErrors.delete(id);
      return {handoff,workflow:await read(id)};
    }finally{await release();}
  }
  async function reprepareIncompleteOutput(id,policy={}){
    if(active.has(id))fail('ROSTER_DECISION_JOURNEY_WRITER_BUSY');
    if(!policy.workId||!policy.engineeringChangeId||!policy.targetContract||!policy.reason)fail('ROSTER_INCOMPLETE_OUTPUT_RECOVERY_REQUIRED',400);
    const release=await claim(id);
    try{
      const metadata=await record(id),run=await open(id,metadata),state=await run.inspect();
      const work=state.work.find(w=>w.id===policy.workId),contextHash=work?.operationState?.pending?.contextHash;
      if(!contextHash)fail('ROSTER_INCOMPLETE_OUTPUT_RECOVERY_NOT_PENDING');
      let matched=null;
      const lines=createInterface({input:createReadStream(path.join(folder(id),'trace.jsonl')),crlfDelay:Infinity});
      for await(const line of lines){if(!line.trim())continue;const entry=JSON.parse(line);
        if(entry.kind==='provider_event'&&entry.value?.failedOutputRecord?.contextHash===contextHash)matched=entry.value;}
      if(!matched)fail('ROSTER_INCOMPLETE_OUTPUT_RECORD_MISSING');
      const recovery=await run.reprepareIncompleteOutput({workId:work.id,event:matched,engineeringChangeId:policy.engineeringChangeId,
        targetContract:policy.targetContract,reason:policy.reason});
      metadata.recoveryHistory=[...(metadata.recoveryHistory??[]),{at:new Date().toISOString(),kind:'incomplete_output_new_contract',
        workId:work.id,previousFailure:metadata.failure??null,...recovery}];
      metadata.status='recovery_ready';await save(id,metadata);
      await event(id,{kind:'incomplete_output_recovery_ready',...recovery,rawOutputAccepted:false});
      return {workflow:await read(id),recovery};
    }finally{await release();}
  }
  async function retainedReturnedProviderReply(id,{dispatch,readRequest}){
    if(!['response_received','completed'].includes(dispatch.status)||!dispatch.providerReceiptHash)return null;
    const matches=new Map();let request;
    const input=createReadStream(path.join(folder(id),'trace.jsonl'));
    try{
      const rows=createInterface({input,crlfDelay:Infinity});
      for await(const line of rows){
        if(!line.trim())continue;
        const event=JSON.parse(line);
        if(event.kind!=='reply'||event.contextHash!==dispatch.contextHash||!/^[a-f0-9-]{36}$/u.test(event.traceId??''))continue;
        const reply=await readJson(path.join(folder(id),event.traceId+'.json')).catch(error=>{
          if(error.code==='ENOENT')return null;
          throw error;
        });
        if(!reply)continue;
        request??=await readRequest();
        if(matchesReturnedRosterProviderReplyV1({request,reply,dispatch}))
          matches.set(reply.receipt.receiptHash,{reply,traceId:event.traceId});
      }
    }catch(error){
      if(error.code==='ENOENT')return null;
      throw error;
    }
    return matches.size===1?matches.values().next().value:null;
  }
  function canReattachReturnedProviderReply(work){
    return work?.status==='needs_repair'&&work.role!=='roster_workflow_tool'
      &&work.operationState?.pending&&!work.operationState.noProgressStop;
  }
  async function reattachReturnedProviderReply(run,item){
    return run.reattachReturnedProviderReply({workId:item.workId,expectedRequestRef:item.expectedRequestRef,
      dispatchRecord:item.dispatch,...item.saved,
      reason:'Attach the local paid reply through its exact returned dispatch; use the original role request and never resend.'});
  }
  async function recoverReturnedProviderRepliesOnStart(id,run,entry){
    const state=await run.inspect();
    const waiting=state.work.filter(canReattachReturnedProviderReply);
    if(!waiting.length||entry.stop)return;
    const graph=createRosterWorkflowGraphV1(state),current=waiting.filter(work=>graph.isFresh(work.id));
    if(!current.length)return;
    const {latest}=await providerDispatches(id,state,new Set(current.map(work=>work.operationState.pending.contextHash)));
    for(const work of current){
      if(entry.stop)return;
      const pending=work.operationState.pending,dispatch=latest.get(pending.contextHash);
      if(!dispatch)continue;
      const saved=await retainedReturnedProviderReply(id,{dispatch,readRequest:()=>run.readArtifact(pending.requestRef)});
      if(!saved||entry.stop)continue;
      const restored=await reattachReturnedProviderReply(run,{workId:work.id,expectedRequestRef:pending.requestRef,dispatch,saved});
      await event(id,{kind:'returned_provider_reply_recovered_on_start',workId:work.id,requestRef:restored.requestRef,
        replyRef:restored.replyRef,dispatchRequestId:dispatch.requestId,replyTraceId:saved.traceId,providerReplayed:false});
    }
  }
  async function recoverProvider(id,policy={}){
    if(active.has(id))fail('ROSTER_DECISION_JOURNEY_WRITER_BUSY');
    if(typeof policy.authorizationId!=='string'||!policy.authorizationId.trim()
      ||policy.authorizationId.length>256)fail('ROSTER_DECISION_RECOVERY_AUTHORIZATION_REQUIRED',400);
    const release=await claim(id);
    try{
      const metadata=await record(id),run=await open(id,metadata),state=await run.inspect();
      if(policy.workIds!==undefined&&(!Array.isArray(policy.workIds)||!policy.workIds.length
        ||policy.workIds.some(x=>typeof x!=='string'||!x)||new Set(policy.workIds).size!==policy.workIds.length))
        fail('ROSTER_DECISION_RECOVERY_WORK_SELECTION_INVALID',400);
      if(policy.expectedRequestIds!==undefined&&(!policy.expectedRequestIds||typeof policy.expectedRequestIds!=='object'
        ||Array.isArray(policy.expectedRequestIds)||Object.entries(policy.expectedRequestIds).some(([key,value])=>
          typeof value!=='string'||!value||policy.workIds&&!policy.workIds.includes(key))))
        fail('ROSTER_DECISION_RECOVERY_REQUEST_SELECTION_INVALID',400);
      const pendingWork=state.work.filter(w=>w.status!=='superseded'&&w.operationState?.pending
        &&(!policy.workIds||policy.workIds.includes(w.id)));
      const contexts=new Set(pendingWork.map(w=>w.operationState.pending.contextHash));
      const {latest,byRequest}=await providerDispatches(id,state,contexts),savedReplies=new Map();
      for(const work of pendingWork){
        const pending=work.operationState.pending,dispatch=latest.get(pending.contextHash);
        if(!canReattachReturnedProviderReply(work)||!['response_received','completed'].includes(dispatch?.status))continue;
        const expected=policy.expectedRequestIds?.[work.id];
        if(expected!==undefined&&dispatch.requestId!==expected)fail('ROSTER_DECISION_RECOVERY_REQUEST_SELECTION_INVALID',400);
        const saved=await retainedReturnedProviderReply(id,{dispatch,readRequest:()=>run.readArtifact(pending.requestRef)});
        if(!saved)fail('ROSTER_DECISION_RECOVERY_REQUIRES_RECONCILIATION');
        savedReplies.set(work.id,saved);
      }
      // Recovering a local paid reply requires no authorization for unknown
      // charges and never grants a transport retry for an interrupted request.
      const work=rosterWorkflowTransportResumeWorkV1({state,allowSingleRetry:true,workIds:policy.workIds,
        additionalRetryPolicy:policy,localReplyWorkIds:new Set(savedReplies.keys())});
      if(!work.length)fail('ROSTER_DECISION_NO_PENDING_PROVIDER_RECOVERY');
      const planned=work.map(w=>{
        const pending=w.operationState.pending;
        let dispatch=latest.get(pending.contextHash);
        if(!dispatch)fail('ROSTER_DECISION_RECOVERY_DISPATCH_NOT_FOUND');
        if(savedReplies.has(w.id))return {workId:w.id,dispatch,expectedRequestRef:pending.requestRef,saved:savedReplies.get(w.id)};
        // A bounded DNS retry may also prove zero physical sends. The existing
        // core retry port owns its ORIGINAL pending request; retain both failed
        // attempts, and authorize only that original, never a new prompt.
        if(dispatch.status==='definitely_not_sent'&&dispatch.retryOfNotSentRequestId){
          const parent=byRequest.get(dispatch.retryOfNotSentRequestId);
          if(parent?.status!=='definitely_not_sent'||parent.transportFailure?.requestDefinitelyNotSent!==true)
            fail('ROSTER_DECISION_RECOVERY_REQUIRES_RECONCILIATION');
          dispatch=parent;
        }
        const notSent=dispatch.status==='definitely_not_sent'
          &&dispatch.transportFailure?.requestDefinitelyNotSent===true;
        const unknownCharge=!notSent;
        const expectedRequestId=policy.expectedRequestIds?.[w.id];
        if(expectedRequestId!==undefined&&dispatch.requestId!==expectedRequestId)
          fail('ROSTER_DECISION_RECOVERY_REQUEST_SELECTION_INVALID',400);
        const additionalLeaf=isExplicitLatestProviderRetryV1({dispatch,currentDispatch:w.failure?.providerDispatch,
          retainedRetry:w.operationState?.retryProviderDispatch,authorizationId:policy.authorizationId,expectedRequestId,
          authorizeOneAdditionalDispatchRetry:policy.authorizeOneAdditionalDispatchRetry,history:w.failureHistory??[]});
        if(!isExplicitlyRecoverableProviderDispatchV1(dispatch)
          ||(dispatch.retryOfRequestId||dispatch.retryOfNotSentRequestId)&&!additionalLeaf)
          fail('ROSTER_DECISION_RECOVERY_REQUIRES_RECONCILIATION');
        if(unknownCharge&&policy.allowUnknownCharge!==true)
          fail('ROSTER_DECISION_UNKNOWN_CHARGE_AUTHORIZATION_REQUIRED');
        return {workId:w.id,dispatch,allowUnknownCharge:unknownCharge,
          authorizeOneAdditionalDispatchRetry:additionalLeaf,expectedRequestId,
          authorizationId:policy.authorizationId,
          reason:'Explicit product recovery of exact saved Provider boundary. Preserve unknown costs, paid replies, native actions and semantic counters; at most one core-authorized retry, no new generation.'};
      });
      for(const item of planned){
        if(item.saved)await reattachReturnedProviderReply(run,item);
        else await run.retryProviderDispatch(item);
      }
      metadata.recoveryHistory=[...(metadata.recoveryHistory||[]),{at:new Date().toISOString(),
        authorizationId:policy.authorizationId,previousFailure:metadata.failure??null,
        requests:planned.map(p=>({workId:p.workId,requestId:p.dispatch.requestId,
          contextHash:p.dispatch.contextHash,originalStatus:p.dispatch.status,
          originalCostStatus:p.dispatch.costStatus,unknownChargeAllowed:p.allowUnknownCharge??false,
          ...(p.saved?{localReplyTraceId:p.saved.traceId,providerReplayed:false}:{})}))}];
      metadata.status='recovery_ready';await save(id,metadata);
      await event(id,{kind:'provider_recovery_authorized',authorizationId:policy.authorizationId,
        workIds:planned.map(p=>p.workId),unknownCostRecordsPreserved:true,nativeReplay:false});
      return {workflow:await read(id),recovery:{queuedRequests:planned.length,
        unknownChargeRequests:planned.filter(p=>p.allowUnknownCharge).length,
        originalCostsPreserved:true,newGenerationCreated:false}};
    }finally{await release();}
  }
  async function recoverUnrecordedRejectedRequest(id,policy={}){
    if(active.has(id))fail('ROSTER_DECISION_JOURNEY_WRITER_BUSY');
    if(typeof policy.authorizationId!=='string'||!policy.authorizationId.trim()||policy.authorizationId.length>256
      ||policy.allowUnknownCharge!==true)fail('ROSTER_DECISION_UNKNOWN_CHARGE_AUTHORIZATION_REQUIRED');
    const release=await claim(id);
    try{
      const metadata=await record(id),run=await open(id,metadata),state=await run.inspect();
      const work=state.work.find(w=>w.id===policy.workId),pending=work?.operationState?.pending;
      if(!pending||pending.requestRef!==policy.expectedRequestRef||pending.contextHash!==policy.expectedContextHash)
        fail('ROSTER_WORKFLOW_UNRECORDED_REJECTION_RECOVERY_INVALID');
      const {latest}=await providerDispatches(id,state,new Set([pending.contextHash]));
      if(latest.has(pending.contextHash))fail('ROSTER_WORKFLOW_UNRECORDED_REJECTION_RECOVERY_INVALID');
      await run.retryUnrecordedRejectedRequest({...policy,
        reason:'Explicit once-only recovery of a saved rejected semantic request whose legacy writer lost transport diagnostics. Preserve the original unknown cost and all counters; do not manufacture an old transport receipt or claim identical network bytes.'});
      const recovery={kind:'legacy_unrecorded_rejection_v1',workId:work.id,sourceRequestRef:pending.requestRef,
        authorizationId:policy.authorizationId,originalCostStatus:'unknown',originalWireIdentityKnown:false,historyReset:false};
      metadata.recoveryHistory=[...(metadata.recoveryHistory??[]),{at:new Date().toISOString(),...recovery}];
      metadata.status='recovery_ready';await save(id,metadata);await event(id,{kind:'unrecorded_rejection_recovery_authorized',...recovery});
      return {recovery,workflow:await read(id)};
    }finally{await release();}
  }
  async function recoverComparison(id,policy={}){
    if(active.has(id))fail('ROSTER_DECISION_JOURNEY_WRITER_BUSY');
    const release=await claim(id);
    try{
      const metadata=await record(id),run=await open(id,metadata);
      const recovery=await authorizeRosterComparisonContinuationV1({run,state:await run.inspect(),draft:await run.currentDraft(),policy});
      if(!recovery.alreadyAuthorized){
        metadata.status='recovery_ready';metadata.failure=null;await save(id,metadata);
        await event(id,{kind:'comparison_continuation_authorized',authorizationId:policy.authorizationId,
          sourceReviewResultRef:policy.sourceReviewResultRef,...recovery,priorReviewsPreserved:true,nativeReplay:false});
      }
      terminalErrors.delete(id);
      return {workflow:await read(id),recovery};
    }finally{await release();}
  }
  async function start(id){
    if(active.has(id))return read(id);
    if(await readAcceptanceFile(id)){await readAccepted(id);return read(id);}
    if(!liveAvailable())fail('ROSTER_DECISION_PROVIDER_UNAVAILABLE',503);
    const metadata=await record(id),entry={stop:false,task:null};
    active.set(id,entry);terminalErrors.delete(id);let release;
    try{release=await claim(id);}catch(error){active.delete(id);throw error;}
    entry.task=(async()=>{
      try{
        metadata.status='running';metadata.failure=null;await save(id,metadata);
        const run=await open(id,metadata);
        await recoverReturnedProviderRepliesOnStart(id,run,entry);
        if(entry.stop){metadata.status='paused';return;}
        // Only start(), after claim(), may retry interrupted immutable reads.
        // Merely opening/reading a stopped workflow never queues another query.
        if(run.recoverInterruptedQueries)await run.recoverInterruptedQueries({ownership:{kind:'product_single_writer_lease',held:true}});
        await prepare(run,metadata);
        await revalidateRepairedSchemaReplies(run,metadata);
        await resumeCorrectedHostBranchFaults(run,metadata);
        await resumeCapacityRejectedInputs(run,metadata);
        while(!entry.stop){
          await run.prepareContext();
          if(entry.stop)break;
          await prepareRosterProductNextStageV1(run,metadata);
          if(entry.stop)break;
          const beforeStepCycle=await assessRosterProductHypothesisCycleV1({state:await run.inspect(),
            draft:await run.currentDraft(),readArtifact:run.readArtifact});
          if(entry.stop)break;
          const step=await run.advance({concurrency:2,priorityComparisonPurposeWorkId:
            beforeStepCycle.comparisonResolved?null:beforeStepCycle.comparisonPurposeWorkId}),coreAssessment=await run.finalAssessment();
          const strategyCycle=await assessRosterProductHypothesisCycleV1({state:await run.inspect(),
            draft:await run.currentDraft(),readArtifact:run.readArtifact});
          const assessment={...coreAssessment,strategyCycle,
            readyForRelease:coreAssessment.readyForRelease&&strategyCycle.ownerReturned&&strategyCycle.comparisonResolved};
          metadata.progress={draftRevision:step.state.draftRevision,lastCompleted:step.ran,
            assessment,at:new Date().toISOString()};await save(id,metadata);
          if(entry.stop)break;
          if(assessment.readyForRelease){metadata.status='ready_for_release';break;}
          // Prior final-audit cycles stay stopped and still block release.
          // The NEW comparison-purpose/decision stage may repair the draft;
          // it does not rerun or waive those three failed audit rounds.
          const comparisonRepairPending=!strategyCycle.comparisonResolved&&!strategyCycle.comparisonStopped
            &&Boolean(strategyCycle.comparisonPurposeWorkId);
          metadata.progress.deferredStoppedReviewDomains=comparisonRepairPending?assessment.stoppedReviewDomains:[];
          const failureGraph=createRosterWorkflowGraphV1(step.state);
          const blockingFailures=step.state.work.filter(w=>failureGraph.isBlockingFailure(w.id));
          if(assessment.stoppedReviewDomains.length&&!comparisonRepairPending||strategyCycle.comparisonStopped||blockingFailures.length){
            if(await revalidateRepairedSchemaReplies(run,metadata))continue;
            if(await resumeCapacityRejectedInputs(run,metadata))continue;
            metadata.status='blocked';metadata.failure={code:'ROSTER_DECISION_RECONCILIATION_REQUIRED',
              stoppedReviewDomains:[...assessment.stoppedReviewDomains,...(strategyCycle.comparisonStopped
                ?[strategyCycle.comparisonStop??{domain:'strategy_comparison',round:strategyCycle.comparisonRound,reason:'three_comparison_review_rounds_without_convergence'}]:[])],
              work:blockingFailures.map(w=>({id:w.id,failure:w.failure}))};break;
          }
          if(!step.ran.length){
            if(await resumeCorrectedHostBranchFaults(run,metadata))continue;
            // A stage may be queued at the next boundary after the last result.
            await prepareRosterProductNextStageV1(run,metadata);const after=await run.inspect();
            // A ready-shaped task may still be held or stale. Do not spin the
            // job forever when the shared scheduler cannot dispatch it.
            const afterGraph=createRosterWorkflowGraphV1(after);
            const dispatchHolds=new Set(step.blockedWorkIds??[]);
            if(after.work.some(w=>afterGraph.canRun(w.id)&&!dispatchHolds.has(w.id)))continue;
            metadata.status='blocked';metadata.failure={code:'ROSTER_DECISION_NO_READY_WORK',
              ...(dispatchHolds.size?{blockedWorkIds:[...dispatchHolds]}:{}),assessment};break;
          }
        }
        if(entry.stop&&metadata.status==='running')metadata.status='paused';
      }catch(error){metadata.status='blocked';metadata.failure={code:error.code||error.message,
        dispatchOutcome:error.dispatchOutcome??null,automaticRequestReplay:false,
        ...(error.code==='ROSTER_DECISION_WORKFLOW_BLOCKED'?{workflowBlockers:error.workflowBlockers}:{} )};}
      finally{
        try{await save(id,metadata);await event(id,{kind:'job_boundary',status:metadata.status,failure:metadata.failure});}
        finally{try{await release();}finally{active.delete(id);}}
      }
    })();
    // Return before any long model request. The background task saves all
    // faults and always releases its one-writer lease at an observation edge.
    entry.task.catch(error=>{terminalErrors.set(id,{code:'ROSTER_DECISION_JOB_PERSISTENCE_FAILED',cause:error.code||error.message});});return read(id);
  }
  async function searchConditionalExperiences(query=''){
    if(typeof query!=='string')fail('ROSTER_DECISION_EXPERIENCE_QUERY_INVALID',400);
    if(!readConditionalExperiences)fail('ROSTER_DECISION_EXPERIENCE_QUERY_UNAVAILABLE',503);
    const entries=[],unavailableSources=[];
    for(const entry of await fs.readdir(directory,{withFileTypes:true})){
      if(!entry.isDirectory()||!validId(entry.name))continue;
      try{
        await record(entry.name);
        const snapshot=await readConditionalExperiences({runId:entry.name,query});
        for(const category of ['entries','conclusions','deferredHypotheses','retainedDecisions'])
          for(const item of snapshot[category]??[]){
            const {sourceBindingsMatchCurrent,...value}=item;
            entries.push({sourceWorkflowId:entry.name,category,...value,
              sourceBindingsMatchOrigin:sourceBindingsMatchCurrent,
              bindingComparisonScope:'source_workflow_only',usableWithoutApplicabilityReview:false});
          }
      }catch(error){unavailableSources.push({sourceWorkflowId:entry.name,reason:error.code??error.message});}
    }
    return {schema:'roster_workspace_conditional_experience_query_v1',entries,unavailableSources,
      complete:unavailableSources.length===0,advisorySkillPromotion:false,canAffectRules:false,trainingTruth:false};
  }
  async function importConditionalExperience(id,input={}){
    if(!input||Object.keys(input).some(key=>!['sourceWorkflowId','evidenceId'].includes(key))
      ||!validId(input.sourceWorkflowId)||typeof input.evidenceId!=='string'||!input.evidenceId)
      fail('ROSTER_CONDITIONAL_EXPERIENCE_IMPORT_INVALID',400);
    if(id===input.sourceWorkflowId)fail('ROSTER_CONDITIONAL_EXPERIENCE_ALREADY_LOCAL',400);
    if(!prepareConditionalExperienceImport)fail('ROSTER_DECISION_EXPERIENCE_QUERY_UNAVAILABLE',503);
    const sourceMetadata=await record(input.sourceWorkflowId);
    if(active.has(id))fail('ROSTER_DECISION_JOURNEY_WRITER_BUSY');
    return withWorkflowWriter(id,async()=>{
      if(await readAcceptanceFile(id))fail('ROSTER_CONDITIONAL_EXPERIENCE_ACCEPTED_TARGET');
      const targetMetadata=await record(id),blindOpponent=rosterOpponentIsUnknownV1(targetMetadata.seed.setup);
      if(blindOpponent&&!rosterOpponentIsUnknownV1(sourceMetadata.seed.setup))fail('ROSTER_CONDITIONAL_EXPERIENCE_OPPONENT_DISCLOSURE',409);
      const run=await open(id,targetMetadata),state=await run.inspect();
      if(state.work.some(w=>w.status==='running'||w.operationState?.pending))fail('ROSTER_DECISION_JOURNEY_WRITER_BUSY');
      const publication=await prepareConditionalExperienceImport(input);
      if(blindOpponent&&rosterImportedExperienceHasFrozenOpponentV1(publication.value))fail('ROSTER_CONDITIONAL_EXPERIENCE_OPPONENT_DISCLOSURE',409);
      const previous=state.evidence.find(e=>e.id===publication.id);
      if(previous){
        if(!isDeepStrictEqual(await run.readArtifact(previous.artifactRef),publication.value))
          fail('ROSTER_CONDITIONAL_EXPERIENCE_SOURCE_CONFLICT');
        return {evidence:previous,alreadyImported:true,planChanged:false};
      }
      const evidence=await run.publishEvidence(publication);
      await event(id,{kind:'conditional_experience_imported',sourceWorkflowId:input.sourceWorkflowId,
        sourceEvidenceId:input.evidenceId,evidenceId:publication.id,planChanged:false,advisorySkillPromotion:false});
      return {evidence,alreadyImported:false,planChanged:false};
    });
  }
  return Object.freeze({
    searchConditionalExperiences,importConditionalExperience,
    descriptor:()=>({workflow:'P0-P6',available:true,liveGenerationAvailable:liveAvailable(),
      sameDecisionRun:true,legacyJourneyCalled:false,pauseAfterCurrentOperation:true,
      temporalReadPauseAtNativeBoundary:true,roomLaunchAvailable:false}),
    create,registerExisting,read,start,withWorkflowWriter,recoverProvider,reprepareIncompleteOutput,recoverUnrecordedRejectedRequest,recoverComparison,reconsiderCapabilities,handoffNoProgress,accept,readAccepted,
    async close(){const entries=[...active.values()];for(const entry of entries)entry.stop=true;
      await Promise.allSettled(entries.map(entry=>entry.task));},
    async pause(id){await record(id);const entry=active.get(id);if(entry)entry.stop=true;return read(id);},
    async list(){
      const entries=await fs.readdir(directory,{withFileTypes:true}),out=[];
      for(const entry of entries.filter(e=>e.isDirectory()&&validId(e.name))){let item;
        try{item=await record(entry.name);}catch(error){
          // A refused/interrupted registration may have a retained lease but
          // no committed job. Preserve it, without breaking the jobs list.
          if(error.code==='ROSTER_DECISION_JOURNEY_NOT_FOUND')continue;throw error;
        }
        out.push({workflowId:item.workflowId,status:active.has(item.workflowId)?'running':item.status,setup:item.seed.setup,
          mode:item.seed.mode,createdAt:item.createdAt,draftRevision:item.progress?.draftRevision??0});}return out;
    },
    async trace(id){await record(id);const lines=await fs.readFile(path.join(folder(id),'trace.jsonl'),'utf8').catch(error=>{
      if(error.code==='ENOENT')return '';throw error;});return lines.split('\n').map((line,index)=>decodeTraceRecord(line,index+1)).filter(Boolean);},
    async readTrace(id,traceId){await record(id);if(!/^[a-f0-9-]{36}$/u.test(traceId||''))fail('ROSTER_DECISION_TRACE_ID_INVALID',400);
      return readJson(path.join(folder(id),traceId+'.json'));},
    async readEvidence(id,number){const metadata=await record(id),run=await open(id,metadata),state=await run.inspect(),e=state.evidence[number-1];
      if(!Number.isSafeInteger(number)||number<1||!e)fail('ROSTER_DECISION_EVIDENCE_NOT_FOUND',404);
      const blindOpponent=rosterOpponentIsUnknownV1(metadata.seed.setup);
      if(blindOpponent&&e.id.startsWith('imported-experience:')&&!e.artifactRef)fail('ROSTER_CONDITIONAL_EXPERIENCE_OPPONENT_DISCLOSURE',409);
      const artifact=await run.readArtifact(e.artifactRef);
      if(blindOpponent&&rosterImportedExperienceHasFrozenOpponentV1(artifact))
        fail('ROSTER_CONDITIONAL_EXPERIENCE_OPPONENT_DISCLOSURE',409);
      return {source:e,artifact};},
    async conditionalExperiences(id,query=''){
      if(typeof query!=='string')fail('ROSTER_DECISION_EXPERIENCE_QUERY_INVALID',400);
      const metadata=await record(id);
      if(readConditionalExperiences)return readConditionalExperiences({runId:id,query,blindOpponent:rosterOpponentIsUnknownV1(metadata.seed.setup)});
      const run=await open(id,metadata);
      if(typeof run.conditionalExperiences!=='function')fail('ROSTER_DECISION_EXPERIENCE_QUERY_UNAVAILABLE',503);
      // The same Run owns source identity, dependency matching and review state.
      // Reading never invokes archive, accept, a Provider or a room mutation;
      // neither a caller flag nor retrieval promotes an experience to a Skill.
      return run.conditionalExperiences(query);
    },
  });
}

export async function prepareRosterProductNextStageV1(run,metadata){
  const [state,draft,readiness]=await Promise.all([run.inspect(),run.currentDraft(),run.readiness()]);
  if(await reconcileRosterProductOwnerBoundaryV1({run,readiness}))return;
  // Old completed Teach judged rule/roster summaries without its actual Plan
  // subject. Keep it as history, not a pass for the new subject-aware stage.
  const revision=draft.revision,initialId='product:initial-army-and-plan',
    teachId=`product:teach:r${revision}:subject-v1`,decisionId=`product:after-teach:r${revision}:subject-v1`;
  if(!draft.plan){
    if(readiness.activeWork.length)return;
    const fixedRoster=draft.mode==='fixed';
    if(!state.work.some(w=>w.id===initialId))await run.requestDecision({id:initialId,
      inputs:{menu:{source:'evidence',id:'product:builder-menu',pointer:''}},
      question:{goal:fixedRoster
        ?`根据冻结Skill、地图、任务和对手参照，为当前已审计的 ${draft.candidateInput.mineralBudget} 矿固定军表制定初步Plan。Plan与公开理由使用中文。`
        :`根据冻结Skill、地图、任务和对手参照形成可修改军表与初步Plan，最终必须合法满${draft.candidateInput.mineralBudget}矿。Plan与公开理由使用中文。`,
        mode:fixedRoster?'军表不可修改；Plan同等深入审视。':'允许逐步选单位／卡／升级，同时形成并修订获胜方式和Plan。',
        scope:'先读必要Skill和真实来源。公开说明用途、备选、地图路线、对手假设与反制。未执行的到达／支付／伤亡不写成事实，缺必要证据则提出具体工具调查。不能复制旧Plan、把快照已固定当战略理由或把草稿当最终产物。',
        opponent:metadata.seed.setup.opponentFactionRecordKey}});return;
  }
  // A user-required resource choice is generation work, not a strategic
  // reviewer veto. Run prepares exact Native facts; the ordinary author decides.
  if(readiness.mechanicalReady&&readiness.generationReady===false){
    if(!readiness.activeWork.length&&readiness.resourceChoice.status==='author_choice_required'
      &&!state.work.some(work=>work.id===readiness.resourceChoice.workId))
      await run.requestDecision(rosterResourceChoiceRequestV1(readiness.resourceChoice));
    return;
  }
  // Challenge the allocation while it is still being built. This stage is
  // read-only and may overlap an unrelated fact query. Do not create an early
  // second strategic writer; ordinary owner/frontier decisions receive the
  // completed proposal through the same Run below.
  const hypothesisId=rosterProductHypothesisCycleIdV1(state,draft);
  if(!state.work.some(w=>w.id===hypothesisId+':teach')){
    await requestRosterHypothesisCycleV1({run,id:hypothesisId,phase:'challenge'});return;
  }
  const earlyCycle=await assessRosterProductHypothesisCycleV1({state,draft,readArtifact:run.readArtifact});
  // A reviewed retention resolves the semantic choice before its held execution
  // tree is retired. Settle that existing responsibility before activeWork can
  // block the next author. The shared graph/closure command retain identity,
  // busy-operation and review checks; this neither approves the Plan nor queries.
  const retained=earlyCycle.initialRetentionReturn;
  if(retained?.accepted&&retained.heldComparison
    &&createRosterWorkflowGraphV1(state).isActive(retained.heldComparison.goalId)){
    await progressRosterProductComparisonV1({run,state,draft,cycle:earlyCycle,allowDecision:true});
    return;
  }
  if(earlyCycle.challengeReady&&!earlyCycle.comparisonResolved){
    // advance serializes draft writers and prioritizes this explicit purpose
    // subtree. Old fact queues need not empty before its owner can decide.
    const progress=await progressRosterProductComparisonV1({run,state,draft,cycle:earlyCycle,
      allowDecision:earlyCycle.comparisonPurposeReady||Boolean(earlyCycle.comparisonDesignReturn)
        ||readiness.mechanicalReady&&!readiness.activeWork.some(work=>work.role==='roster_workflow_strategy_decision')});
    // An unresolved initial comparison must obtain its owner before broad
    // Teach can revise the Plan again. A pending operation is still advanced
    // by the shared Run; this stage does not retry it or select a strategy.
    if(progress.scheduled.length||readiness.mechanicalReady)return;
  }
  // Construction owns the next writer while the actual target/Plan fields
  // remain unfinished. Keep early Teach and already-authorized fact/choice
  // work; do not buy a broad critique after every partial prose revision.
  // This changes scheduling, not the model's selected army or release gates.
  if(readiness.mechanicalBlockers.length){
    if(readiness.activeWork.length)return;
    const signature=createHash('sha256').update(JSON.stringify(readiness.mechanicalBlockers)).digest('hex').slice(0,16);
    // Minerals remain the requested finished-army target. Gas is an upper
    // limit; a reasoned retention is reviewed without forced purchases.
    // Keep prior v1 outcomes intact; one new contract-owned task, not a
    // replayed reply, reset correction counter or automatically chosen army.
    const id=`product:complete:r${revision}:requirements-v4:${signature}`;
    const earlyTeach=state.work.find(w=>w.id===hypothesisId+':teach'&&w.resultRef);
    const priorTeach=state.work.find(w=>w.id===teachId&&w.resultRef&&w.status==='evidence_ready');
    if(!state.work.some(w=>w.id===id))await run.requestDecision({id,
      inputs:{draft:{source:'evidence',id:`draft:r${revision}:summary`,pointer:''},
        menu:{source:'evidence',id:'product:builder-menu',pointer:''},
        ...(earlyTeach?{earlyTeach:rosterProductConstructionTeachInputV1(earlyTeach)}:{}),
        ...(priorTeach?{teach:{source:'evidence',id:'role:'+priorTeach.id,pointer:''}}:{}),
        completionObligations:{source:'literal',value:{version:5,stage:'construct_army_and_plan',mode:draft.mode,
          mechanicalBlockers:readiness.mechanicalBlockers,mechanicalFacts:readiness.mechanicalFacts,
          requestedMineralBudget:draft.candidateInput.mineralBudget,
          requestedVespeneTarget:readiness.mechanicalFacts.resourceAllocation?.vespene?.targetRequired
            ?readiness.mechanicalFacts.resourceAllocation.vespene.target:null,
          instruction:'Host/Builder owns measurements and legality, not unit choices or Plan prose. These are current unfinished product requirements, not optional future work and not a strategy score. You own completing the permitted army/Plan. Use the preserved early Teach and meaningful alternatives to make a reasoned construction step; necessary factual questions remain queryable. Broader final critique follows construction, so do not await that later stage to choose your current units/cards/upgrades.'}}},
      question:{goal:'完成交付给你的当前军表与Plan建设缺项，保留已有有依据策略并实际通过修改端口提交。不要仅把缺项归为“工程问题／后续Builder”后保留不变；工具不替你选军表、补卡牌用途或制定激活计划。',
        permission:draft.mode==='fixed'?'军表严格不变；完善Plan中的用途、顺序、条件与依据。':'允许分步添加、替换单位／卡／升级，并同步修改Plan；最终成品达到要求的矿物分数；气不必花满，可以在比较合法选项后给出充分理由保留余额。中间草案可不足，不必穷举或证明全局最优才推进；确实无法完成须指出有证据的具体限制，不能冒称完成。',
        evidence:'先复用已交付事实和早期Teach，只有影响当前选择的缺失事实才调查。未知的事实不能手写补齐；未来对手选择用明确条件与应对，不要求未来对局已经发生。公开说明本轮改变什么、为何改变或为何确实无法推进。',
        acceptance:'中间修订不等于最终验收。建设缺项完成后仍经完整Teach、策略比较与受影响审核；不得以清空未知、合法性或文字增长宣称策略更优。'}});
    return;
  }
  const teach=state.work.find(w=>w.id===teachId);
  if(!teach){await run.requestTeach({id:teachId,
    inputs:{draft:{source:'evidence',id:`draft:r${revision}:summary`,pointer:''}},
    question:{goal:'用中文局部审视当前军表与Plan的真实用途、量化对抗、地图／进场／控点、损失后能力、备选取舍和对手反制。质疑框架来自同源Skill，不能为质疑而削弱有依据策略。',
      affectedSections:draft.pendingReviewSections,scope:draft.mode==='fixed'?'只改Plan，不改锁表；其余Teach标准相同。':'允许依据证据同时改军表和Plan。',
      evidence:'先查保存事实；缺必要事实要明确提问，不用未来对手未知或条件措辞掩盖工程未知。实际工具结果之外不伪造概率／回执。'}});return;}
  // Teach is an independent, version-bound READ of the current Plan. It may
  // overlap fact/source work; an army/Plan decision and release still wait.
  if(readiness.activeWork.length)return;
  if(teach.status==='evidence_ready'&&!state.work.some(w=>w.id===decisionId)){
    await run.requestDecision({id:decisionId,inputs:{teach:{source:'evidence',id:'role:'+teachId,pointer:''},
      menu:{source:'evidence',id:'product:builder-menu',pointer:''}},
      question:{goal:'依据局部Teach与实际工具证据推进最终连贯方案。采纳或有依据驳回，必要时查证。允许在权限内同步改表/Plan，不强迫改表作演示。',
        completion:'满目标分、组件用途与替代有论证、地图/时序/能力支付/控点事实有来源。先完成必要事实，再申请最终发布；没有依据的未知不能清空放过。'}});return;
  }
  if(readiness.mechanicalReady){
    const strategyCycle=await assessRosterProductHypothesisCycleV1({state,draft,readArtifact:run.readArtifact});
    if(!strategyCycle.comparisonResolved&&(!strategyCycle.comparisonPurposeReady||!strategyCycle.comparisonPurposeAdopted)){
      await progressRosterProductComparisonV1({run,state,draft,cycle:strategyCycle,allowDecision:true});return;
    }
    if(!strategyCycle.ownerReturned){
      await requestRosterHypothesisCycleV1({run,id:strategyCycle.id});return;
    }
    if(!strategyCycle.comparisonResolved){
      await progressRosterProductComparisonV1({run,state,draft,cycle:strategyCycle,allowDecision:true});return;
    }
    await run.requestFinalReviews();
  }
}
