// Observe the ordinary product Run endpoint from the existing v319 session.
// No scripted strategy, synthetic tool verdicts, old A–F resume or room launch.
import fs from 'node:fs/promises';
import path from 'node:path';
import { AsyncLocalStorage } from 'node:async_hooks';
import { gzipSync, gunzipSync } from 'node:zlib';
import { randomUUID, createHash } from 'node:crypto';
import { createRosterPlanningProductModuleV1 } from '../packages/product-composition/roster-planning-product-module-v1.mjs';
import { createRosterPlanningSecureDeliberationFactoryV1 } from '../packages/roster-planning-workspace/roster-planning-secure-deliberation-factory-v1.mjs';
import { createStarcraftTmgStructuredProviderWorkerPortV1 } from '../packages/secure-provider-runtime/structured-provider-worker-port-v1.mjs';
import { ROSTER_PLANNING_WORKSPACE_API_PREFIX as prefix } from '../packages/roster-planning-workspace/roster-planning-workspace-http-v1.mjs';
import { priceStarcraftTmgDeepSeekCurrentUsageV2 } from '../packages/secure-provider-runtime/provider-pricing-v2.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { verifyRetainedFormalDebugReplyV1 } from './retained-formal-debug-reply-v1.mjs';
import { canReencodeRejectedRosterReviewV1 } from '../packages/roster-strategist/roster-review-catalogue-transport-v1.mjs';

if (!process.argv[2] || !process.argv.includes('--continue-through-generation')) {
  throw Error('EXPLICIT_GENERATION_CONTINUATION_REQUIRED');
}
const resumeObserved = process.argv.includes('--resume-observed');
const debugBoundaries = process.argv.includes('--debug-boundaries');
const freshFromEmpty = process.argv.includes('--fresh-from-empty');
if (freshFromEmpty && resumeObserved) throw Error('FRESH_AND_RESUME_ARE_DISTINCT_OPERATIONS');
const suppliedDirectory = path.resolve(process.argv[2]);
const source = freshFromEmpty ? await fs.mkdtemp(path.join(suppliedDirectory,'walkthrough-v326-'))
  : resumeObserved ? path.dirname(suppliedDirectory) : suppliedDirectory;
const prior = freshFromEmpty ? {} : JSON.parse(await fs.readFile(path.join(source, 'status.json'), 'utf8'));
if (!freshFromEmpty && prior.status !== 'fresh_product_session_created'
  && (prior.status !== 'first_decision_committed_and_paused' || prior.finalRevision !== 1)) {
  throw Error('FIRST_STEP_MUST_BE_COMMITTED_BEFORE_CONTINUATION');
}
const previousRun = resumeObserved
  ? JSON.parse(await fs.readFile(path.join(suppliedDirectory, 'status.json'), 'utf8')) : null;
let observerOnlyFailure = false;
let knownRepair = false;
let settledProductRecovery = false;
let networkProductRecovery = false;
let capacityProductRecovery = false;
let repairedProductRecovery = false;
if (process.argv.includes('--resume-product-repair')) {
  if (!resumeObserved || previousRun?.status!=='stopped') throw Error('STOPPED_PRODUCT_OWNER_REQUIRED');
  let alive=true;
  try { process.kill(previousRun.pid,0); } catch(error) { if(error.code==='ESRCH')alive=false;else throw error; }
  if(alive)throw Error('PREVIOUS_OBSERVER_STILL_RUNNING');
  const saved=JSON.parse(await fs.readFile(path.join(source,'workspace/iterative-draft/sessions',
    createHash('sha256').update(prior.sessionId).digest('hex')+'.json'),'utf8')).value;
  if(saved.sessionId!==prior.sessionId || previousRun.sessionId!==prior.sessionId)
    throw Error('PRODUCT_REPAIR_SESSION_IDENTITY_CHANGED');
  // The ordinary Run endpoint owns dispatch/persistence/paid-reply recovery.
  // An observer must not add a second, exception-string-specific state machine.
  // No pending business record or authorization is changed here.
  repairedProductRecovery=true;
}
if (process.argv.includes('--resume-capacity-rejection')) {
  if (!resumeObserved || previousRun?.status !== 'stopped'
    || previousRun.failure !== 'ROSTER_WORKSPACE_PROVIDER_RESPONSE_REJECTED') throw Error('KNOWN_CAPACITY_REJECTION_REQUIRED');
  let alive=true;
  try { process.kill(previousRun.pid,0); } catch(error) { if(error.code==='ESRCH')alive=false;else throw error; }
  if(alive)throw Error('PREVIOUS_OBSERVER_STILL_RUNNING');
  const formalId=previousRun.journey?.teachSessionId;
  if(!/^rws-[a-zA-Z0-9-]+$/.test(formalId||''))throw Error('KNOWN_CAPACITY_OWNER_REQUIRED');
  const formal=JSON.parse(await fs.readFile(path.join(source,'workspace/drafts',formalId+'.json'),'utf8'));
  if(!canReencodeRejectedRosterReviewV1(formal)
    || formal.providerDispatches.at(-1).contextHash!==previousRun.debugBoundary?.detail.contextHash)
    throw Error('KNOWN_CAPACITY_REJECTION_NOT_BOUND');
  // Same predicate as the product service. Observer never edits business state.
  capacityProductRecovery=true;
}
if (process.argv.includes('--resume-network-interrupt')) {
  if (!resumeObserved || previousRun?.status !== 'stopped'
    || previousRun.failure !== 'ROSTER_WORKSPACE_AMBIGUOUS_DISPATCH_STOP') throw Error('TERMINATED_NETWORK_STOP_REQUIRED');
  let alive=true;
  try { process.kill(previousRun.pid,0); } catch(error) { if(error.code==='ESRCH')alive=false;else throw error; }
  if(alive)throw Error('PREVIOUS_OBSERVER_STILL_RUNNING');
  // No state edits or dispatch authorisation here. The ordinary Run endpoint
  // checks the actual persisted request, termination and one-retry lineage.
  networkProductRecovery=true;
}
if (process.argv.includes('--resume-settled-product-boundary')) {
  if (!resumeObserved || previousRun?.status !== 'stopped') throw Error('SETTLED_PRODUCT_STOP_REQUIRED');
  let alive = true;
  try { process.kill(previousRun.pid,0); } catch(error) { if(error.code==='ESRCH')alive=false;else throw error; }
  if (alive) throw Error('PREVIOUS_OBSERVER_STILL_RUNNING');
  const saved=JSON.parse(await fs.readFile(path.join(source,'workspace/iterative-draft/sessions',
    createHash('sha256').update(prior.sessionId).digest('hex')+'.json'),'utf8')).value;
  if (saved.pendingDecision) throw Error('PRODUCT_STATE_NOT_SETTLED_PAUSED');
  if (saved.status !== 'paused') {
    // The formal writer can commit successfully while the observer's next read
    // fails. Its iterative selector remains active, but must not repurchase that
    // completed revision. Admit only an exact, already-inspected committed reply.
    const boundary=previousRun.debugBoundary, formalId=previousRun.journey?.teachSessionId;
    if(saved.status!=='active' || boundary?.kind!=='reply' || boundary.waiting!==false
      || !/^rws-[a-zA-Z0-9-]+$/.test(formalId||'')) throw Error('PRODUCT_STATE_NOT_SETTLED_PAUSED');
    const formal=JSON.parse(await fs.readFile(path.join(source,'workspace/drafts',formalId+'.json'),'utf8'));
    const plan=JSON.parse(formal.planSerialized), commit=formal.planEditToolHistory?.at(-1);
    const round=formal.progress?.rounds?.find(r=>r.receiptHash===boundary.detail.receiptHash);
    const settledRevision=round?.roundKind==='revision' && round.roundIndex===plan.planVersion
      && formal.progress?.phase==='completed' && commit?.execution?.applied===true && commit.toPlanHash===plan.planHash;
    const framework=formal.teachFramework, lastCall=framework?.state?.calls?.at(-1);
    const settledPremise=round?.roundKind==='teach_framework_current_plan_premise_audit'
      && framework?.planHash===plan.planHash && framework.status==='failed'
      && framework.failure?.code==='ROSTER_WORKSPACE_INTERNAL_FAILURE'
      && !framework.state.pendingModelCall && framework.state.phase==='investigate_evidence'
      && framework.state.questionPremiseAudit?.status==='completed'
      && framework.state.questionPremiseAudit.currentPlanHash===plan.planHash
      && lastCall?.receipt?.receiptHash===round.receiptHash;
    if(formal.status!=='planned' || !round || !['completed','replayed'].includes(round.status)
      || (!settledRevision && !settledPremise)
      || formal.agentSelectedStrategySource?.iterativeSessionId!==prior.sessionId
      || formal.agentSelectedCandidateHash!==saved.currentCandidate?.candidateHash
      || (formal.providerDispatches||[]).some(d=>['reserved','sending','sent','ambiguous'].includes(d.status)
        && !(formal.publicOutputs||[]).some(o=>o.contextHash===d.contextHash))) {
      throw Error('PRODUCT_FORMAL_COMMIT_NOT_SETTLED');
    }
  }
  settledProductRecovery = true;
}
let unstartedDebugRecovery = false;
let verifiedUnsentDecision = null;
let verifiedRetainedDecision = null;
let verifiedRetainedFormal = false;
if (process.argv.includes('--resume-retained-debug-boundary')) {
  const boundary = previousRun?.debugBoundary;
  const retainedContextStop = previousRun?.status === 'stopped'
    && previousRun.failure === 'ITERATIVE_ROSTER_RETAINED_CONTEXT_MISMATCH';
  const retainedAdmissionStop = previousRun?.status === 'stopped'
    && previousRun.failure === 'PRODUCT_RUN_STATUS_400'
    && JSON.parse(await fs.readFile(path.join(suppliedDirectory,'run-response.json'),'utf8'))
      .response?.reason === 'AGENT_SELECTED_JOURNEY_RECONCILIATION_REQUIRED';
  if (!resumeObserved || !debugBoundaries || previousRun?.status !== 'running' && !retainedContextStop && !retainedAdmissionStop
    || boundary?.kind !== 'reply' || !boundary.waiting) throw Error('RETAINED_DEBUG_REPLY_REQUIRED');
  let alive = true;
  try { process.kill(previousRun.pid, 0); } catch (error) { if (error.code === 'ESRCH') alive = false; else throw error; }
  if (alive) throw Error('PREVIOUS_OBSERVER_STILL_RUNNING');
  const stem = `call-${String(boundary.number).padStart(3,'0')}`;
  const input = JSON.parse(gunzipSync(await fs.readFile(path.join(suppliedDirectory,stem+'.product-request.json.gz'))));
  const reply = JSON.parse(gunzipSync(await fs.readFile(path.join(suppliedDirectory,stem+'.reply.json.gz'))));
  const saved = JSON.parse(await fs.readFile(path.join(source,'workspace/iterative-draft/sessions',
    createHash('sha256').update(prior.sessionId).digest('hex')+'.json'),'utf8')).value;
  const alreadyApproved = await fs.stat(path.join(suppliedDirectory,boundary.approvalFile))
    .then(()=>true,error=>{if(error.code==='ENOENT')return false;throw error;});
  if (input.roundKind !== 'iterative_roster_decision') {
    const formalId=previousRun.journey?.teachSessionId;
    if (!formalId || !/^rws-[a-zA-Z0-9-]+$/.test(formalId) || alreadyApproved)
      throw Error('RETAINED_DEBUG_REPLY_NOT_BOUND');
    const formal=JSON.parse(await fs.readFile(path.join(source,'workspace/drafts',formalId+'.json'),'utf8'));
    verifiedRetainedFormal=verifyRetainedFormalDebugReplyV1({request:input,reply,session:formal,
      expectedSessionId:formalId,expectedReceiptHash:boundary.detail.receiptHash});
    if (!verifiedRetainedFormal || saved.pendingDecision) throw Error('RETAINED_DEBUG_REPLY_NOT_BOUND');
  } else {
  if (!saved.pendingDecision
    || saved.pendingDecision.sourceRequestKey || input.roundIndex !== saved.pendingDecision.nextRevision
    || saved.pendingDecision.nextRevision !== saved.revision + 1
    || input.contextHash !== reply.receipt?.contextHash
    || reply.receipt?.receiptHash !== boundary.detail.receiptHash
    || reply.receipt?.paidProviderCall !== true
    || input.promptNodes[0]?.content?.decisionState?.sessionId !== prior.sessionId
    || alreadyApproved) throw Error('RETAINED_DEBUG_REPLY_NOT_BOUND');
  verifiedRetainedDecision = { requestKey:saved.pendingDecision.requestKey,
    sessionId:prior.sessionId,nextRevision:saved.pendingDecision.nextRevision };
  }
}
if (process.argv.includes('--resume-unstarted-debug-boundary')
  || repairedProductRecovery && previousRun?.debugBoundary?.kind==='input'
    && previousRun.debugBoundary.waiting
    && previousRun.debugBoundary.detail?.roundKind==='iterative_roster_decision') {
  const boundary = previousRun?.debugBoundary;
  const repairedUnsentFormal = previousRun?.status === 'stopped'
    && previousRun.failure === 'ROSTER_TEACH_PENDING_CALL_SOURCE_CHANGED';
  const unfinishedInput = previousRun?.status === 'running'
    || previousRun?.status === 'stopped' && previousRun.failure === 'ITERATIVE_ROSTER_SESSION_BUSY'
    || previousRun?.status === 'stopped' && previousRun.failure === 'DEBUG_BOUNDARY_INSPECTION_REQUIRED'
     || repairedUnsentFormal || repairedProductRecovery;
  if (!resumeObserved || !debugBoundaries || !unfinishedInput
    || boundary?.kind !== 'input' || !boundary.waiting) throw Error('UNSTARTED_DEBUG_BOUNDARY_REQUIRED');
  let alive = true;
  try { process.kill(previousRun.pid, 0); } catch (error) { if (error.code === 'ESRCH') alive = false; else throw error; }
  if (alive) throw Error('PREVIOUS_OBSERVER_STILL_RUNNING');
  const events=(await fs.readFile(path.join(suppliedDirectory,'trace.jsonl'),'utf8'))
    .trim().split('\n').map(JSON.parse);
  if (events.some(event=>event.number===boundary.number
    && ['actual_provider_request','model_output_boundary'].includes(event.kind))) throw Error('DEBUG_REQUEST_ALREADY_SENT');
  if (repairedUnsentFormal) {
    const formalId=previousRun.journey?.teachSessionId;
    if (!/^rws-[a-zA-Z0-9-]+$/.test(formalId||'')) throw Error('DEBUG_FORMAL_OWNER_MISSING');
    const formal=JSON.parse(await fs.readFile(path.join(source,'workspace/drafts',formalId+'.json'),'utf8'));
    const pending=formal.teachFramework?.state?.pendingModelCall;
    if (pending?.request?.contextHash!==boundary.detail.contextHash
      || pending.request.sessionId!==formalId
      || (formal.providerDispatches||[]).some(d=>d.contextHash===boundary.detail.contextHash)
      || (formal.publicOutputs||[]).some(o=>o.contextHash===boundary.detail.contextHash)
      || (formal.teachFramework.state.calls||[]).some(c=>c.contextHash===boundary.detail.contextHash)) {
      throw Error('DEBUG_FORMAL_REQUEST_NOT_PROVEN_UNSENT');
    }
  }
  const saved=JSON.parse(await fs.readFile(path.join(source,'workspace/iterative-draft/sessions',
    createHash('sha256').update(prior.sessionId).digest('hex')+'.json'),'utf8')).value;
  if (saved.draftTeachSnapshots?.some(row=>row.dispatches?.some(dispatch=>
    dispatch.contextHash===boundary.detail.contextHash))) throw Error('DEBUG_REQUEST_ALREADY_RESERVED');
  if (saved.pendingDecision) {
    const input=JSON.parse(gunzipSync(await fs.readFile(path.join(suppliedDirectory,boundary.detail.file))));
    if (input.roundKind!=='iterative_roster_decision'
      || input.contextHash!==boundary.detail.contextHash
      || input.roundIndex!==saved.pendingDecision.nextRevision
      || saved.pendingDecision.nextRevision!==saved.revision+1
       || saved.pendingDecision.sourceRequestKey
       || events.some(e=>e.number===boundary.number && e.kind==='product_provider_event')) throw Error('DEBUG_DECISION_NOT_PROVEN_UNSENT');
    // recoveryRequired also marks local debug-boundary exceptions. It says
    // nothing about dispatch. Durable pre-send events + dead owner prove that;
    // a rejected/absent approval file must not override the actual journal.
    verifiedUnsentDecision={status:'not_dispatched',requestKey:saved.pendingDecision.requestKey,
      sessionId:prior.sessionId,nextRevision:saved.pendingDecision.nextRevision};
  }
  unstartedDebugRecovery=true;
}
if (process.argv.includes('--resume-known-repair') && previousRun?.status === 'stopped'
  && ['AGENT_SELECTED_JOURNEY_RECONCILIATION_REQUIRED', 'ITERATIVE_ROSTER_RECONCILIATION_REQUIRED']
    .includes(previousRun.failure)) {
  const saved = JSON.parse(await fs.readFile(path.join(source,'workspace/iterative-draft/sessions',
    createHash('sha256').update(prior.sessionId).digest('hex')+'.json'),'utf8')).value;
  knownRepair = !saved.pendingDecision && saved.status === 'requires_reconciliation'
    && saved.iterations.at(-1)?.decisionKind === 'repair_needed';
}
if (previousRun?.status === 'stopped' && previousRun.failure === 'EEXIST') {
  const entries = (await fs.readFile(path.join(suppliedDirectory, 'trace.jsonl'), 'utf8'))
    .trim().split('\n').map(line => JSON.parse(line));
  const restartAt = previousRun.resumptions?.at(-1)?.at;
  const last = entries.at(-1);
  observerOnlyFailure = Boolean(restartAt && last?.kind === 'observer_stop'
    && last.stack?.includes('/initial-existing-state.json.gz')
    && !entries.some(entry => entry.at >= restartAt && entry.kind === 'actual_provider_request'));
}
if (previousRun && (previousRun.sessionId !== prior.sessionId
   || (previousRun.status !== 'paused' && !observerOnlyFailure && !knownRepair && !unstartedDebugRecovery && !verifiedRetainedDecision && !verifiedRetainedFormal && !settledProductRecovery && !networkProductRecovery && !capacityProductRecovery && !repairedProductRecovery))) {
  throw Error('ONLY_THE_SETTLED_PAUSED_OBSERVATION_CAN_RESUME');
}
const directory = resumeObserved ? suppliedDirectory
  : await fs.mkdtemp(path.join(source, 'continuation-v320-'));
let sessionId = prior.sessionId;
const context = new AsyncLocalStorage();
const status = { version:320, pid:process.pid, startedAt:new Date().toISOString(),
  source, directory, sessionId, status:'attaching_same_product_session',
  originalFirstRequestRetained:!freshFromEmpty, freshFromEmpty,
  originalArmsResumed:false, gamesStarted:0,
  requests:0, physicalRequests:0, completedCalls:0, outputEventCount:0, unknownFeeDispatches:[],
  usage:{inputUnits:0,outputUnits:0,totalUnits:0}, estimatedCostUsd:0,
  priorFirstCallUsage:prior.usage, trainingTruth:false,
  ...(previousRun || {}), pid:process.pid, status:'attaching_same_product_session' };
if (previousRun) {
  delete status.finishedAt; delete status.failure;
  status.resumptions ||= [];
  status.resumptions.push({at:new Date().toISOString(),previousPid:previousRun.pid,
    previousStatus:previousRun.status,previousFinishedAt:previousRun.finishedAt,
    reason:networkProductRecovery?'same_product_bounded_network_recovery':settledProductRecovery?'verified_settled_product_boundary_recovery':(verifiedRetainedDecision||verifiedRetainedFormal)?'verified_retained_paid_reply_recovery':unstartedDebugRecovery?'verified_unsent_debug_boundary_restart':'same_session_generation_continues_after_operator_inspection',countersPreserved:true});
  await fs.rename(path.join(directory,'pause-requested'),path.join(directory,
    `pause-requested.completed-${status.resumptions.length}.txt`))
    .catch(error => { if (error.code !== 'ENOENT') throw error; });
}
const segment = previousRun ? `-resume-${status.resumptions.length}` : '';
const snapshotName = stem => `${stem}${segment}.json.gz`;
const sensitive = /^(authorization|api[_-]?key|access[_-]?token|refresh[_-]?token|credentialBytes|secret)$/i;
function sanitize(value) {
  if (typeof value === 'string') return value.replace(/\b(?:jsk|sk)-[A-Za-z0-9_-]{16,}\b/g,'<REDACTED>');
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value)
    .map(([key,child])=>[key,sensitive.test(key)?'<REDACTED>':sanitize(child)]));
  return value;
}
async function write(name,value) {
  const dest=path.join(directory,name), temp=dest+'.'+randomUUID()+'.tmp';
  await fs.writeFile(temp,JSON.stringify(sanitize(value),null,2),{mode:0o600});
  await fs.rename(temp,dest);
}
async function zipped(name,value) {
  await fs.writeFile(path.join(directory,name),gzipSync(JSON.stringify(sanitize(value))),{flag:'wx',mode:0o600});
}
const persist=()=>write('status.json',status);
const event=async value=>fs.appendFile(path.join(directory,'trace.jsonl'),JSON.stringify(sanitize({at:new Date().toISOString(),...value}))+'\n',{mode:0o600});
async function debugBoundary(kind, number, detail) {
  if (!debugBoundaries) return;
  const name = `debug-${String(number).padStart(3,'0')}-${kind}.approved.json`;
  status.debugBoundary={kind,number,detail,approvalFile:name,waiting:true};
  await event({kind:'debug_boundary',...status.debugBoundary}); await persist();
  while (true) {
    const approval=await fs.readFile(path.join(directory,name),'utf8')
      .then(JSON.parse).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
    if (approval) {
      if (approval.number!==number || approval.kind!==kind || !approval.inspection)
        throw Error('DEBUG_BOUNDARY_INSPECTION_REQUIRED');
      await event({kind:'debug_boundary_inspected',number,boundary:kind,inspection:approval.inspection});
      status.debugBoundary.waiting=false; await persist(); return;
    }
    await new Promise(resolve=>setTimeout(resolve,1000));
  }
}
let secure,product,lastCheckpointHash,stopRequested=false;
async function checkpoint(view) {
  const identity=hash(view);
  if(identity===lastCheckpointHash)return;
  lastCheckpointHash=identity;
  status.journey=view;
  await event({kind:'product_checkpoint',view});
  await write('latest-journey.json',view);
}
try {
  await persist();
  console.log(JSON.stringify({status:status.status,directory,pid:process.pid,sessionId}));
  const cfg=JSON.parse(await fs.readFile(path.join(path.dirname(source),'common-v79-plan-recovery-config.private.json'),'utf8'));
  const mapConfiguration=JSON.parse(await fs.readFile(cfg.mapConfigurationFile,'utf8'));
  secure=await createRosterPlanningSecureDeliberationFactoryV1({createWorker(options){
    const worker=createStarcraftTmgStructuredProviderWorkerPortV1(options);
    return {...worker,async send(request){
      const physical=++status.physicalRequests;
      const number=context.getStore()?.number||null;
      const filename=`provider-${String(physical).padStart(3,'0')}.prompt.json.gz`;
      await zipped(filename,request.body);
      const startedAt=new Date().toISOString();
      await event({kind:'actual_provider_request',number,physical,requestId:request.requestId,
        file:filename,model:request.body.model,bodyHash:hash(request.body),
        displayedBodyHash:hash(sanitize(request.body)),bytes:Buffer.byteLength(JSON.stringify(request.body))});
      status.activeProvider={number,physical,requestId:request.requestId,startedAt};await persist();
      try {
        const result=await worker.send(request);
        await event({kind:'actual_provider_transport',number,physical,status:result.status,receipt:result.transportReceipt});
        return result;
      } catch(error) {
        status.unknownFeeDispatches.push({requestId:request.requestId,code:error.code||error.message});
        await event({kind:'transport_error',number,physical,code:error.code||error.message,safeReceipt:error.safeReceipt||null});
        throw error;
      }
    }};
  }});
  const factory={availability:secure.factory.availability,
    async confirmUnsentRequest(identity){
      if (!verifiedUnsentDecision || !['requestKey','sessionId','nextRevision']
        .every(key=>identity[key]===verifiedUnsentDecision[key])) return {status:'unknown'};
      await event({kind:'verified_unsent_decision_recovery',...verifiedUnsentDecision,
        priorBoundaryNumber:previousRun.debugBoundary.number,originalRequestRetained:true});
      const proof=verifiedUnsentDecision;verifiedUnsentDecision=null;return proof;
    },createForRun:async config=>{
    const port=await secure.factory.createForRun({...config,onEvent:async value=>{
      await config.onEvent?.(value); // Product persistence first; observer never substitutes it.
      const number=context.getStore()?.number||null;
      const {sanitizedOutputRecord,failedOutputRecord,...metadata}=value;
      if(sanitizedOutputRecord||failedOutputRecord) await zipped(
        `event-${String(++status.outputEventCount).padStart(3,'0')}.public-output.json.gz`,
        sanitizedOutputRecord||failedOutputRecord);
      await event({kind:'product_provider_event',number,runKind:config.runKind,sessionId:config.sessionId,event:metadata});
      status.lastEvent={type:value.type,number,roundKind:value.roundKind,roundIndex:value.roundIndex,at:value.at||new Date().toISOString()};
      if(['round_completed','round_failed'].includes(value.type)&&value.paidProviderCall===true&&value.usage){
        status.completedCalls++;
        for(const k of ['inputUnits','outputUnits','totalUnits'])status.usage[k]+=value.usage[k]||0;
        try {
          const cost=priceStarcraftTmgDeepSeekCurrentUsageV2({providerId:'deepseek-openai-compatible-direct',
            requestedModel:'deepseek-flash',reportedModel:'deepseek-flash',
            startedAt:status.activeProvider.startedAt,usage:value.usage});
          status.estimatedCostUsd+=Number(cost.calculatedCostUsd);
          await event({kind:'frozen_price_estimate',number,cost});
        } catch(error){await event({kind:'cost_estimate_unavailable',number,code:error.code||error.message});}
      }
      await persist();
    }});
    return {descriptor:port.descriptor,async deliberate(request){
      const number=++status.requests;
      const stem=`call-${String(number).padStart(3,'0')}`;
      await zipped(stem+'.product-request.json.gz',request);
      await event({kind:'model_input_boundary',number,runKind:config.runKind,roundKind:request.roundKind,
        roundIndex:request.roundIndex,contextHash:request.contextHash,file:stem+'.product-request.json.gz'});
      await debugBoundary('input',number,{roundKind:request.roundKind,contextHash:request.contextHash,
        file:stem+'.product-request.json.gz'});
      return context.run({number},async()=>{
        try {
          const result=await port.deliberate(request);
          await zipped(stem+'.reply.json.gz',result);
          await event({kind:'model_output_boundary',number,roundKind:request.roundKind,
            publicOutput:result.output,receipt:result.receipt,
            meaning:'回复已由产品保存；具体动作随后由产品解码、规则校验和提交'});
          await debugBoundary('reply',number,{roundKind:request.roundKind,
            file:stem+'.reply.json.gz',receiptHash:result.receipt?.receiptHash});
          return result;
        } catch(error){
          await event({kind:'model_boundary_error',number,code:error.code||error.message});throw error;
        }
      });
    }};
  }};
  product=await createRosterPlanningProductModuleV1({root:path.resolve('.'),fixtureRoot:cfg.fixtureRoot,
    dataDirectory:path.join(source,'workspace'),mapConfiguration,enableIterativeDraft:true,deliberationFactory:factory});
  if (freshFromEmpty) {
    const row=cfg.rows.find(row=>row.arm==='B');
    if (!row) throw Error('FROZEN_B_SETUP_NOT_FOUND');
    const frozen=JSON.parse(await fs.readFile(path.join(row.dataDirectory,'drafts',row.sessionId+'.json'),'utf8')).setup;
    const setup={factionRecordKey:frozen.factionRecordKey,opponentFactionRecordKey:frozen.opponentFactionRecordKey,
      engagementScale:'Standard',mineralBudget:2000,teachFeedbackPolicy:'skill_teach_roster_coevolution_v1'};
    const created=await product.handle({method:'POST',pathname:prefix+'/iterative/sessions',body:{setup}});
    if(created.status!==201)throw Error(`PRODUCT_CREATE_STATUS_${created.status}`);
    sessionId=created.response.journey.sessionId;status.sessionId=sessionId;
    await write('session-created.json',created);await write('setup.json',setup);
    await write('../status.json',{status:'fresh_product_session_created',sessionId,
      freshFromEmpty:true,originalArmsResumed:false,gamesStarted:0});
    await event({kind:'fresh_empty_product_session',sessionId,setup,originalArmsResumed:false});
  }
  const initial=await product.iterativeDraft.read(sessionId);
   if(!repairedProductRecovery && initial.pendingDecision && initial.pendingDecision.requestKey!==verifiedUnsentDecision?.requestKey
     && initial.pendingDecision.requestKey!==verifiedRetainedDecision?.requestKey)
     throw Error('UNSETTLED_DECISION_MUST_NOT_BE_REPURCHASED');
  await zipped(snapshotName('initial-existing-state'),initial);
  status.initialStateArtifact = snapshotName('initial-existing-state');
  await write('product-descriptor.json',product.descriptor());
  await checkpoint(await product.iterativeJourney.read(sessionId));
  const started=await product.handle({method:'POST',pathname:prefix+`/iterative/sessions/${sessionId}/run`,body:{
    ...(networkProductRecovery || process.argv.includes('--automatic-network-recovery')
      ? {automaticNetworkRecovery:true} : {}) }});
  await write('run-response.json',started);
  if(started.status!==202)throw Error(`PRODUCT_RUN_STATUS_${started.status}`);
  status.status='running';await persist();
  let lastObservedPhase;
  while(true){
    const pause=await fs.stat(path.join(directory,'pause-requested')).then(()=>true).catch(e=>{if(e.code==='ENOENT')return false;throw e});
    if(pause&&!stopRequested){stopRequested=true;await product.iterativeJourney.pause(sessionId);}
    const progress=await product.iterativeJourney.read(sessionId,{progressOnly:true});
    status.runtimeProgress=progress;
    if(!progress.running || progress.phase!==lastObservedPhase){
      const view=await product.iterativeJourney.read(sessionId);
      await checkpoint(view);
      lastObservedPhase=progress.phase;
      if(!view.running){
        status.status=view.stage==='source_review_completed_clean'?'completed':stopRequested?'paused':'stopped';
        status.failure=status.status==='stopped'?(view.stoppedReason||view.stage):null;
        await persist();
        break;
      }
    }
    await persist();
    await new Promise(r=>setTimeout(r,5000));
  }
  const experience=await product.iterativeJourney.exportExperience(sessionId);
  await zipped(snapshotName('experience'),experience);
  status.experienceArtifact = snapshotName('experience');
  if(status.journey.teachSessionId){
    const taught=product.service.readSession(status.journey.teachSessionId);
    await zipped(snapshotName('final-teach-session'),taught);
    status.teachSessionArtifact = snapshotName('final-teach-session');
    if(taught.plan)await write('final-plan.json',taught.plan);
  }
  await write('final-roster-and-selection-plan.json',{candidate:experience.finalCandidate,plan:experience.finalSelectionPlan});
} catch(error){
  status.status='stopped';status.failure=String(error.code||error.message);
  await event({kind:'observer_stop',code:status.failure,stack:String(error.stack||'').slice(0,2000)});
} finally {
  await secure?.close();
  status.finishedAt=new Date().toISOString();await persist();
  console.log(JSON.stringify({status:status.status,directory,failure:status.failure,requests:status.requests,usage:status.usage}));
  setImmediate(()=>process.exit(status.status==='completed'||status.status==='paused'?0:1));
}
