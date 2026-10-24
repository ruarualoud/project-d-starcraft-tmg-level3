// P6 Web/App job control around the SAME P0–P6 Run. This module owns job/trace
// persistence, not another army, Plan, Rules engine or model correction loop.
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {createInterface} from 'node:readline';
import {encodeRosterProviderInputV1} from '../roster-strategist/roster-prompt-evidence-encoding-v1.mjs';
import {projectRosterProviderInstructionsV1} from './roster-planning-secure-deliberation-factory-v1.mjs';
import {rosterWorkflowTransportResumeWorkV1} from './roster-workflow-provider-boundary-v1.mjs';
import {projectRosterWorkflowSavedSchemaRevalidationV1,projectRosterWorkflowFeedbackRecoveryV1} from '../roster-strategist/roster-workflow-read-role-v1.mjs';
import {projectRosterAuthorDecisionHandoffV1} from '../roster-strategist/roster-workflow-author-handoff-v1.mjs';
import {projectRosterNativeRejectionRevalidationV1} from '../roster-strategist/roster-native-fact-claims-v1.mjs';
import {requestRosterHypothesisCycleV1,assessRosterProductHypothesisCycleV1,rosterProductHypothesisCycleIdV1,
  progressRosterProductComparisonV1,authorizeRosterComparisonContinuationV1} from './roster-hypothesis-cycle-v1.mjs';
import {createRosterWorkflowAcceptanceV1,rosterWorkflowAcceptanceMatchesDraftV1} from './roster-workflow-acceptance-v1.mjs';
import {projectRosterWorkflowReadDeliveryRecoveryV1} from '../roster-strategist/roster-workflow-read-context-v1.mjs';
import {createRosterWorkflowGraphV1} from '../roster-strategist/roster-workflow-graph-v1.mjs';
import {ROSTER_WORKFLOW_INPUT_DELIVERY_VERSION_V1,rosterWorkflowCanReflowInputV1} from '../roster-strategist/roster-workflow-input-delivery-v1.mjs';

const validId=id=>/^[A-Za-z0-9_-]{1,80}$/u.test(id||'');
const fail=(code,status=409)=>{throw Object.assign(Error(code),{code,httpStatus:status});};
export async function createRosterDecisionProductJourneyV1({directory,openWorkflow,prepareSeed,liveAvailable}){
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
  async function event(id,value){await fs.appendFile(path.join(folder(id),'trace.jsonl'),JSON.stringify({at:new Date().toISOString(),...value})+'\n');}
  async function open(id,metadata){
    if(runs.has(id))return runs.get(id);
    const pending=openWorkflow({runId:id,setup:metadata.seed.setup,candidateInput:metadata.seed.candidateInput,
      networkRecoveryPolicy:{retryDefinitelyNotSent:true},
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
    const published=await readAcceptanceFile(id),formalPlanAccepted=rosterWorkflowAcceptanceMatchesDraftV1(published,state,draft);
    return {schema:'roster_decision_product_journey_v1',workflowId:id,status:active.has(id)?'running':localFailure?'blocked':metadata.status==='running'?'interrupted':metadata.status,
      running:active.has(id),pauseRequested:active.get(id)?.stop===true,setup:metadata.seed.setup,mode:metadata.seed.mode,
      draftRevision:state.draftRevision,draft,progress:metadata.progress??null,failure:localFailure??metadata.failure??null,
      interrupted:metadata.status==='running'&&!active.has(id),
      work:state.work.map(work=>({id:work.id,role:work.role,status:work.status,failure:work.failure??null})),
      strategyCycle,evidenceCount:state.evidence.length,evidenceDirectory:state.evidence.map((source,index)=>({
        number:index+1,title:source.title,kind:source.kind,id:source.id})),readyForRelease:!localFailure&&metadata.status==='ready_for_release'&&strategyCycle.ownerReturned&&strategyCycle.comparisonResolved,
      formalPlanAccepted,acceptance:formalPlanAccepted?{draftRevision:published.draftRevision,
        planHash:published.plan.planHash,acceptedAt:published.sessionReceipt.acceptedAt,strategyImprovementProven:false}:null,
      roomStarted:false,trainingTruth:false};
  }
  async function create(input={}){
    const seed=await prepareSeed(input),id='decision-'+randomUUID();
    await fs.mkdir(folder(id),{recursive:false});
    const metadata={schema:'roster_decision_product_job_v1',workflowId:id,seed,status:'draft',createdAt:new Date().toISOString(),failure:null};
    await save(id,metadata);const run=await open(id,metadata);
    await run.initializeDraft({candidateInput:seed.candidateInput,plan:null,provenance:seed.provenance,mode:seed.mode,planId:id+'-plan'});
    await event(id,{kind:'created',mode:seed.mode,initialPlanCopied:false,initialArmySize:seed.candidateInput.units.length});
    return read(id);
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
  async function readAcceptanceFile(id){
    return readJson(path.join(folder(id),'acceptance.json')).catch(error=>{
      if(error.code==='ENOENT')return null;throw error;});
  }
  async function readAccepted(id){
    const metadata=await record(id),run=await open(id,metadata),[state,draft,bundle]=await Promise.all([
      run.inspect(),run.currentDraft(),readAcceptanceFile(id)]);
    if(!bundle)fail('ROSTER_DECISION_ACCEPTANCE_REQUIRED');
    if(!rosterWorkflowAcceptanceMatchesDraftV1(bundle,state,draft))fail('ROSTER_DECISION_ACCEPTANCE_STALE_REVISION');
    return bundle;
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
        if(!rosterWorkflowAcceptanceMatchesDraftV1(existing,state,draft))fail('ROSTER_DECISION_ACCEPTANCE_STALE_REVISION');
        return {workflow:await read(id),acceptance:existing};
      }
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
      await fs.writeFile(path.join(folder(id),'acceptance.json'),JSON.stringify(bundle,null,2),{flag:'wx'});
      metadata.status='accepted';metadata.acceptance={draftRevision:bundle.draftRevision,planHash:bundle.plan.planHash};
      await save(id,metadata);await event(id,{kind:'plan_accepted',draftRevision:bundle.draftRevision,
        planHash:bundle.plan.planHash,strategyImprovementProven:false,originalDraftRewritten:false});
      return {workflow:await read(id),acceptance:bundle};
    }finally{await release();}
  }
  async function prepare(run,metadata){
    const seed=metadata.seed;
    await run.initializeDraft({candidateInput:seed.candidateInput,plan:null,provenance:seed.provenance,mode:seed.mode,planId:metadata.workflowId+'-plan'});
    await run.prepareStrategyResources({ownFactionRecordKey:seed.setup.factionRecordKey,opponentFactionRecordKey:seed.setup.opponentFactionRecordKey});
    const state=await run.inspect(),menuId='product:builder-menu';
    if(!state.evidence.some(e=>e.id===menuId))await run.publishEvidence({id:menuId,title:'Frozen Rules-owned army choices',
      kind:'tool_receipt',bindings:{},conditions:['Eligibility/cost options, not a strategy ranking'],
      value:run.builderChoices({factionRecordKey:seed.setup.factionRecordKey,scaleId:seed.candidateInput.scaleId,mineralBudget:seed.candidateInput.mineralBudget})});
    await run.prepareContext();
  }
  async function nextStage(run,metadata){
    const [state,draft,readiness]=await Promise.all([run.inspect(),run.currentDraft(),run.readiness()]);
    if((await run.reconsiderParticipantConfiguration()).scheduled.length)return;
    // Old completed Teach judged rule/roster summaries without its actual Plan
    // subject. Keep it as history, not a pass for the new subject-aware stage.
    const revision=draft.revision,initialId='product:initial-army-and-plan',
      teachId=`product:teach:r${revision}:subject-v1`,decisionId=`product:after-teach:r${revision}:subject-v1`;
    if(!draft.plan){
      if(readiness.activeWork.length)return;
      if(!state.work.some(w=>w.id===initialId))await run.requestDecision({id:initialId,
        inputs:{menu:{source:'evidence',id:'product:builder-menu',pointer:''}},
        question:{goal:`根据冻结Skill、地图、任务和对手参照形成可修改军表与初步Plan，最终必须合法满${draft.candidateInput.mineralBudget}矿。Plan与公开理由使用中文。`,
          mode:draft.mode==='fixed'?'军表不可修改；Plan同等深入审视。':'允许逐步选单位／卡／升级，同时形成并修订获胜方式和Plan。',
          scope:'先读必要Skill和真实来源。公开说明用途、备选、地图路线、对手假设与反制。未执行的到达／支付／伤亡不写成事实，缺必要证据则提出具体工具调查。不能复制旧Plan、把快照已固定当战略理由或把草稿当最终产物。',
          opponent:metadata.seed.setup.opponentFactionRecordKey}});return;
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
    if(earlyCycle.challengeReady&&!earlyCycle.comparisonResolved){
      // advance serializes draft writers and prioritizes this explicit purpose
      // subtree. Old fact queues need not empty before its owner can decide.
      const progress=await progressRosterProductComparisonV1({run,state,draft,cycle:earlyCycle,
        allowDecision:earlyCycle.comparisonPurposeReady});
      if(progress.scheduled.length)return;
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
    // A valid intermediate Plan can finish its Teach/fact handoffs while the
    // user target or required sections are still incomplete. Those are work
    // for the strategic author, not a reason to strand the job as NO_READY_WORK.
    // One owner per exact revision/obligation set: no unbounded repeat dispatch
    // if it returns unchanged. New revisions create their own normal stage.
    if(readiness.mechanicalBlockers.length){
      const signature=createHash('sha256').update(JSON.stringify(readiness.mechanicalBlockers)).digest('hex').slice(0,16);
      const id=`product:complete:r${revision}:requirements-v1:${signature}`;
      if(!state.work.some(w=>w.id===id))await run.requestDecision({id,
        inputs:{draft:{source:'evidence',id:`draft:r${revision}:summary`,pointer:''},
          menu:{source:'evidence',id:'product:builder-menu',pointer:''},
          completionObligations:{source:'literal',value:{mode:draft.mode,
            mechanicalBlockers:readiness.mechanicalBlockers,mechanicalFacts:readiness.mechanicalFacts,
            requestedMineralBudget:draft.candidateInput.mineralBudget,
            instruction:'Host/Builder owns measurements and legality, not unit choices or Plan prose. These are current unfinished product requirements, not optional future work and not a strategy score. The model owns completing the permitted draft/Plan or identifying a concrete missing fact.'}}},
        question:{goal:'完成交付给你的当前缺项，保留已有有依据策略并实际通过修改端口提交。不要仅把缺项归为“工程问题／后续Builder”后保留不变；校验器不替你选军表、补卡牌用途或制定激活计划。',
          permission:draft.mode==='fixed'?'军表严格不变；完善Plan中的用途、顺序、条件与依据。':'允许分步添加、替换单位／卡／升级，并同步修改Plan；以合法满目标分为最终要求，不必穷举所有分支或证明全局最优才可推进下一版。',
          evidence:'先复用已交付事实，只有影响当前选择的缺失事实才调查。未知的事实不能手写补齐；未来对手选择用明确条件与应对，不要求未来对局已经发生。公开说明本轮改变什么、为何改变或为何确实无法推进。',
          acceptance:'中间修订不等于最终验收。后续仍经Teach与受影响审核；不得以清空未知、合法性或文字增长宣称策略更优。'}});
      return;
    }
    if(readiness.mechanicalReady){
      const strategyCycle=await assessRosterProductHypothesisCycleV1({state,draft,readArtifact:run.readArtifact});
      if(!strategyCycle.comparisonPurposeReady||!strategyCycle.comparisonPurposeAdopted){
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
  async function revalidateRepairedSchemaReplies(run,metadata){
    const state=await run.inspect();let recovered=0;
    for(const work of state.work.filter(w=>w.status==='needs_repair'&&!w.operationState?.pending)){
      const ref=work.operationState?.correction?.originalReplyRef;if(!ref)continue;
      const call=work.operationState.calls.findLast(c=>c.replyRef===ref);if(!call)continue;
      const [reply,request]=await Promise.all([run.readArtifact(ref),run.readArtifact(call.requestRef)]);
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
      const plan=projectRosterWorkflowSavedSchemaRevalidationV1({work,reply,request})
        ??await projectRosterNativeRejectionRevalidationV1({state,work,reply,readArtifact:run.readArtifact});
      if(!plan){
        const sourceRequest=work.operationState.correction.errors?.every(e=>e.code==='unchanged_investigation_authorization')
          ?await run.readArtifact(work.operationState.calls[0].requestRef):undefined;
        const feedback=projectRosterWorkflowFeedbackRecoveryV1({work,reply,request,sourceRequest});
        if(!feedback||metadata.feedbackRecoveries?.some(r=>r.recoveryKey===feedback.recoveryKey))continue;
        const reason=feedback.repairKind==='inline_order_incremental_correction'
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
      const reason=plan.repairKind==='native_rejection_fact'
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
        :'A deployed output-contract repair now accepts this exact saved reply while its original schema rejected it. Revalidate once through the normal role semantics; preserve the original reply, failures, reads, fees and unproven questions. No Provider or Native replay.';
      await run.revalidateRoleReply({workId:work.id,reason});
      const record={...plan,originalFailure:work.failure,at:new Date().toISOString()};
      metadata.schemaRevalidations=[...(metadata.schemaRevalidations??[]),record];
      await save(metadata.workflowId,metadata);await event(metadata.workflowId,{kind:'saved_schema_revalidation_queued',...record});
      recovered++;
    }
    return recovered;
  }
  async function resumeCorrectedHostBranchFaults(run,metadata){
    const state=await run.inspect(),graph=createRosterWorkflowGraphV1(state);
    if(state.work.some(w=>w.status==='running'||w.operationState?.pending))return 0;
    let count=0;
    for(const work of state.work.filter(w=>w.role==='roster_workflow_tool'&&w.status==='needs_model_choice'
      // Local experiments deliberately depend on army/map/rules/source, not a
      // Plan prose revision. Reuse the graph's declared-dependency semantics;
      // an absent Plan binding is not a stale one. Explicit stale bindings fail.
      &&w.repairGeneration===3&&w.resultRef&&graph.isCurrent(w.id))){
      if(work.branchReturnRef||state.work.some(w=>w.id===work.id+':input-repair'))continue;
      const failure=(await run.readArtifact(work.resultRef)).value,request=failure?.request;
      if(!['formation_scene','scenario'].includes(failure?.operation)
        ||failure.operation==='formation_scene'&&failure.nativeSuccess!==false
        ||failure.operation==='scenario'&&failure.status!=='returned_to_model')continue;
      let change,reason;
      if(failure.code==='ROSTER_WORKFLOW_FORMATION_SELECTION_INPUT_INVALID'
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
    const contexts=new Set(work.map(w=>w.operationState.pending.contextHash)),latest=new Map();
    const lines=createInterface({input:createReadStream(path.join(folder(metadata.workflowId),'trace.jsonl')),crlfDelay:Infinity});
    for await(const line of lines){
      if(!line.trim())continue;
      const e=JSON.parse(line),d=e.kind==='provider_event'&&e.value?.type==='provider_dispatch'?e.value.dispatch:null;
      if(d&&contexts.has(d.contextHash))latest.set(d.contextHash,d);
    }
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
  async function recoverProvider(id,policy={}){
    if(active.has(id))fail('ROSTER_DECISION_JOURNEY_WRITER_BUSY');
    if(typeof policy.authorizationId!=='string'||!policy.authorizationId.trim()
      ||policy.authorizationId.length>256)fail('ROSTER_DECISION_RECOVERY_AUTHORIZATION_REQUIRED',400);
    const release=await claim(id);
    try{
      const metadata=await record(id),run=await open(id,metadata),state=await run.inspect();
      const work=rosterWorkflowTransportResumeWorkV1({state,allowSingleRetry:true});
      if(!work.length)fail('ROSTER_DECISION_NO_PENDING_PROVIDER_RECOVERY');
      const contexts=new Set(work.map(w=>w.operationState.pending.contextHash));
      const latest=new Map(),byRequest=new Map();
      // Read only boundary records for the exact pending contexts. Do not load
      // old prompts/replies or treat a stale lease as evidence of non-delivery.
      const lines=createInterface({input:createReadStream(path.join(folder(id),'trace.jsonl')),crlfDelay:Infinity});
      for await(const line of lines){
        if(!line.trim())continue;
        const e=JSON.parse(line),d=e.kind==='provider_event'&&e.value?.type==='provider_dispatch'?e.value.dispatch:null;
        if(d&&contexts.has(d.contextHash)){latest.set(d.contextHash,d);byRequest.set(d.requestId,d);}
      }
      const planned=work.map(w=>{
        let dispatch=latest.get(w.operationState.pending.contextHash);
        if(!dispatch)fail('ROSTER_DECISION_RECOVERY_DISPATCH_NOT_FOUND');
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
        const ambiguous=dispatch.status==='ambiguous';
        if(!notSent&&!ambiguous||dispatch.retryOfRequestId||dispatch.retryOfNotSentRequestId)
          fail('ROSTER_DECISION_RECOVERY_REQUIRES_RECONCILIATION');
        if(ambiguous&&policy.allowUnknownCharge!==true)
          fail('ROSTER_DECISION_UNKNOWN_CHARGE_AUTHORIZATION_REQUIRED');
        return {workId:w.id,dispatch,allowUnknownCharge:ambiguous,
          authorizationId:policy.authorizationId,
          reason:'Explicit product recovery of exact saved Provider boundary. Preserve unknown costs, paid replies, native actions and semantic counters; at most one core-authorized retry, no new generation.'};
      });
      for(const item of planned)await run.retryProviderDispatch(item);
      metadata.recoveryHistory=[...(metadata.recoveryHistory||[]),{at:new Date().toISOString(),
        authorizationId:policy.authorizationId,previousFailure:metadata.failure??null,
        requests:planned.map(p=>({workId:p.workId,requestId:p.dispatch.requestId,
          contextHash:p.dispatch.contextHash,originalStatus:p.dispatch.status,
          originalCostStatus:p.dispatch.costStatus,unknownChargeAllowed:p.allowUnknownCharge}))}];
      metadata.status='recovery_ready';await save(id,metadata);
      await event(id,{kind:'provider_recovery_authorized',authorizationId:policy.authorizationId,
        workIds:planned.map(p=>p.workId),unknownCostRecordsPreserved:true,nativeReplay:false});
      return {workflow:await read(id),recovery:{queuedRequests:planned.length,
        unknownChargeRequests:planned.filter(p=>p.allowUnknownCharge).length,
        originalCostsPreserved:true,newGenerationCreated:false}};
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
        const run=await open(id,metadata);await prepare(run,metadata);
        await revalidateRepairedSchemaReplies(run,metadata);
        await resumeCorrectedHostBranchFaults(run,metadata);
        await resumeCapacityRejectedInputs(run,metadata);
        while(!entry.stop){
          await run.prepareContext();
          if(entry.stop)break;
          await nextStage(run,metadata);
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
                ?[{domain:'strategy_comparison',round:strategyCycle.comparisonRound,reason:'three_comparison_review_rounds_without_convergence'}]:[])],
              work:blockingFailures.map(w=>({id:w.id,failure:w.failure}))};break;
          }
          if(!step.ran.length){
            if(await resumeCorrectedHostBranchFaults(run,metadata))continue;
            // A stage may be queued at the next boundary after the last result.
            await nextStage(run,metadata);const after=await run.inspect();
            if(after.work.some(w=>w.status==='ready'))continue;
            metadata.status='blocked';metadata.failure={code:'ROSTER_DECISION_NO_READY_WORK',assessment};break;
          }
        }
        if(entry.stop&&metadata.status==='running')metadata.status='paused';
      }catch(error){metadata.status='blocked';metadata.failure={code:error.code||error.message,
        dispatchOutcome:error.dispatchOutcome??null,automaticRequestReplay:false};}
      finally{
        try{await save(id,metadata);await event(id,{kind:'job_boundary',status:metadata.status,failure:metadata.failure});}
        finally{try{await release();}finally{active.delete(id);}}
      }
    })();
    // Return before any long model request. The background task saves all
    // faults and always releases its one-writer lease at an observation edge.
    entry.task.catch(error=>{terminalErrors.set(id,{code:'ROSTER_DECISION_JOB_PERSISTENCE_FAILED',cause:error.code||error.message});});return read(id);
  }
  return Object.freeze({
    descriptor:()=>({workflow:'P0-P6',available:true,liveGenerationAvailable:liveAvailable(),
      sameDecisionRun:true,legacyJourneyCalled:false,pauseAfterCurrentOperation:true,roomLaunchAvailable:false}),
    create,read,start,recoverProvider,recoverComparison,reconsiderCapabilities,handoffNoProgress,accept,readAccepted,
    async close(){const entries=[...active.values()];for(const entry of entries)entry.stop=true;
      await Promise.allSettled(entries.map(entry=>entry.task));},
    async pause(id){await record(id);const entry=active.get(id);if(entry)entry.stop=true;return read(id);},
    async list(){
      const entries=await fs.readdir(directory,{withFileTypes:true}),out=[];
      for(const entry of entries.filter(e=>e.isDirectory()&&validId(e.name))){const item=await record(entry.name);
        out.push({workflowId:item.workflowId,status:active.has(item.workflowId)?'running':item.status,setup:item.seed.setup,
          mode:item.seed.mode,createdAt:item.createdAt,draftRevision:item.progress?.draftRevision??0});}return out;
    },
    async trace(id){await record(id);const lines=await fs.readFile(path.join(folder(id),'trace.jsonl'),'utf8').catch(error=>{
      if(error.code==='ENOENT')return '';throw error;});return lines.trim()?lines.trim().split('\n').map(JSON.parse):[];},
    async readTrace(id,traceId){await record(id);if(!/^[a-f0-9-]{36}$/u.test(traceId||''))fail('ROSTER_DECISION_TRACE_ID_INVALID',400);
      return readJson(path.join(folder(id),traceId+'.json'));},
    async readEvidence(id,number){const run=await open(id,await record(id)),state=await run.inspect(),e=state.evidence[number-1];
      if(!Number.isSafeInteger(number)||number<1||!e)fail('ROSTER_DECISION_EVIDENCE_NOT_FOUND',404);
      return {source:e,artifact:await run.readArtifact(e.artifactRef)};},
    async conditionalExperiences(id,query=''){
      if(typeof query!=='string')fail('ROSTER_DECISION_EXPERIENCE_QUERY_INVALID',400);
      const run=await open(id,await record(id));
      if(typeof run.conditionalExperiences!=='function')fail('ROSTER_DECISION_EXPERIENCE_QUERY_UNAVAILABLE',503);
      // The same Run owns source identity, dependency matching and review state.
      // Reading never invokes archive, accept, a Provider or a room mutation;
      // neither a caller flag nor retrieval promotes an experience to a Skill.
      return run.conditionalExperiences(query);
    },
  });
}
