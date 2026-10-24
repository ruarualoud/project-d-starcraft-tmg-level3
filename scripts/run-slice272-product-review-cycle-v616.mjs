// A client of the same product Run, not another roster/Plan implementation.
// Resume the actual current draft; never re-create broad historical inquiries.
import fs from 'node:fs/promises';import path from 'node:path';
import {createRosterPlanningProductModuleV1} from '../packages/product-composition/roster-planning-product-module-v1.mjs';
import {createRosterPlanningSecureDeliberationFactoryV1,projectRosterProviderInstructionsV1} from '../packages/roster-planning-workspace/roster-planning-secure-deliberation-factory-v1.mjs';
import {encodeRosterProviderInputV1} from '../packages/roster-strategist/roster-prompt-evidence-encoding-v1.mjs';
import {rosterWorkflowTransportResumeWorkV1} from '../packages/roster-planning-workspace/roster-workflow-provider-boundary-v1.mjs';
import {requestRosterHypothesisCycleV1} from '../packages/roster-planning-workspace/roster-hypothesis-cycle-v1.mjs';
const root=process.cwd(),dir=path.resolve(process.argv[2]),base=path.join(dir,'workspace/decision-workflows/projection-owner');
if(!dir.startsWith(path.join(root,'build/slice272-projection-owner-v565-')))throw Error('CURRENT_NEW_RUN_REQUIRED');
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const initial=await read(path.join(base,'workflow.json')),draft=await read(path.join(base,'artifacts',initial.draftRef+'.json'));
const resumeTransport=process.argv.includes('--resume-transport-once');
const revalidateIndex=process.argv.findIndex(arg=>['--revalidate-read-only','--revalidate-read-only-label'].includes(arg));
const revalidateWorkId=revalidateIndex<0?null:process.argv[revalidateIndex+1];
if(revalidateIndex>=0&&!revalidateWorkId)throw Error('READ_ONLY_REVALIDATION_WORK_ID_REQUIRED');
const followupIndex=process.argv.indexOf('--resume-followup-contract');
const followupWorkId=followupIndex<0?null:process.argv[followupIndex+1];
if(followupIndex>=0&&!followupWorkId)throw Error('FOLLOWUP_CONTRACT_WORK_ID_REQUIRED');
const operationChoiceIndex=process.argv.indexOf('--resume-operation-choice');
const operationChoiceWorkId=operationChoiceIndex<0?null:process.argv[operationChoiceIndex+1];
if(operationChoiceIndex>=0&&!operationChoiceWorkId)throw Error('OPERATION_CHOICE_WORK_ID_REQUIRED');
const menuSourceIndex=process.argv.indexOf('--resume-menu-source');
const menuSourceWorkId=menuSourceIndex<0?null:process.argv[menuSourceIndex+1];
if(menuSourceIndex>=0&&!menuSourceWorkId)throw Error('MENU_SOURCE_WORK_ID_REQUIRED');
const menuReadIndex=process.argv.indexOf('--resume-menu-read-stage');
const menuReadWorkId=menuReadIndex<0?null:process.argv[menuReadIndex+1];
if(menuReadIndex>=0&&!menuReadWorkId)throw Error('MENU_READ_STAGE_WORK_ID_REQUIRED');
// Draft revision can retire a pending fact investigation before its authorized
// retry executes. Keep that old unknown bill, but never replay a retired request
// or let it prevent opening the current Run. Active pending work stays strict.
const resumeWork=rosterWorkflowTransportResumeWorkV1({state:initial,allowSingleRetry:resumeTransport});
const config=await read(path.join(root,'build/ticket-23-three-arm-performance-baseline-20261010-v1/common-v79-plan-recovery-config.private.json'));
let adapter,sequence=Math.max(0,...(await fs.readdir(dir)).filter(n=>/^\d+\.request\.json$/.test(n)).map(n=>parseInt(n))),stopRequested=false;
const numbers=new Map(),calls=[];
const save=(name,value)=>fs.writeFile(path.join(dir,name),JSON.stringify(value,null,2),{flag:'wx'});
const stop=()=>{stopRequested=true;console.log(JSON.stringify({stage:'stop-requested',afterCurrentAdvance:true}));};
process.on('SIGTERM',stop);process.on('SIGINT',stop);
console.log(JSON.stringify({stage:'initializing',currentRevision:initial.draftRevision,roomReinitialized:false}));
try{
  adapter=await createRosterPlanningSecureDeliberationFactoryV1();
  const product=await createRosterPlanningProductModuleV1({root,fixtureRoot:config.fixtureRoot,dataDirectory:path.join(dir,'workspace'),
    mapConfiguration:await read(config.mapConfigurationFile),deliberationFactory:adapter.factory});
  const run=await product.openDecisionWorkflow({runId:'projection-owner',candidateInput:draft.candidateInput,
    setup:{sideKey:draft.candidateInput.sideKey,missionBinding:draft.provenance.missionBinding},
    onEvent:e=>fs.appendFile(path.join(dir,'provider-events.jsonl'),JSON.stringify(e)+'\n'),
    onRequest:async request=>{const number=++sequence;numbers.set(request.contextHash,number);const encoded=encodeRosterProviderInputV1(request,'same_request_evidence_v1');
      await save(number+'.request.json',{request,providerInstructions:projectRosterProviderInstructionsV1({request,runKind:'teach-framework'}),encodedProviderInput:encoded.input,isExactPromptContent:true});
      console.log(JSON.stringify({stage:'dispatching',number,role:request.roundKind,inputCharacters:encoded.afterCharacters}));},
    onReply:async reply=>{const number=numbers.get(reply.receipt.contextHash);if(!number)throw Error('UNBOUND_REPLY');await save(number+'.reply.json',reply);
      calls.push({number,usage:reply.receipt.usage,latencyMs:reply.receipt.latencyMs});console.log(JSON.stringify({stage:'returned',...calls.at(-1)}));},
    onTool:value=>fs.appendFile(path.join(dir,'tools.jsonl'),JSON.stringify(value)+'\n')});
  if(process.argv.includes('--strategy-hypothesis-cycle')){
    const current=await run.inspect(),id=`p4-strategy-hypothesis-v638:r${current.draftRevision}`;
    if(!current.work.some(w=>w.id===id))await run.requestDecision({id,
      question:'P4正式产品能力验收：从当前军表、Plan和Teach中选择一项真正影响获胜路线或组件取舍的未决战略假设。先读取已有证据和Skill，明确可信备选、什么不变、什么变化、什么观察会支持或推翻它，以及不同结果会怎样改变军表或Plan；不要把普通合法性确认当作战略收益。可据足够证据直接修订或有依据保留；否则以investigate授权一个有决策价值的局部对照，使用hypothesisTest声明设计。模型自主选择假设和参数，Host不指定单位、结论或偏好。实验仅允许用户已批准的火力、路线、资源或固定争点场景及明确反制，不做整场模拟或全军逐回合实得分演练。复用原件，不重放成功动作，不追求未来比赛的确定性。得到结果后必须回交总体决策、记录采纳/驳回和实际意图变化或保留理由，再做受影响审核；字段齐全、表合法、查询成功均不能代替该闭环或最终发布。当前仍须完成整个P0–P6和六项证明，本项不缩小最终验收。'});
    console.log(JSON.stringify({stage:'product-strategic-hypothesis-cycle',workId:id,
      modelChoosesHypothesis:true,forcedRosterEdit:false,roomReinitialized:false}));
  }
  if(process.argv.includes('--teach-hypothesis-cycle')){
    const current=await run.inspect();
    const scheduled=await requestRosterHypothesisCycleV1({run,id:`p4-strategy-hypothesis-v639:r${current.draftRevision}`});
    console.log(JSON.stringify({stage:'product-teach-hypothesis-cycle',...scheduled,roomReinitialized:false}));
  }
  if(process.argv.includes('--verify-fact-recording')){
    const current=await run.inspect(),id=`p4-fact-recording-v630:r${current.draftRevision}`;
    if(!current.work.some(w=>w.id===id))await run.requestDecision({id,
      question:'P4真实能力检查：比较此前r6总体决策与当前草案。此前1171主要把私有Native观察（Goliath部署、储备、当前actionSpace）写入Plan，没有新的选表、目标、行动顺序或风险取舍证据。读取给出的真实来源，独立判断这类观察更新应走哪种操作；若只是证据更新，不要为了记日志再次改Plan。保留必要工程未知和未来条件，不为演示强迫改军表，不宣称整个Plan通过或策略更优。不重建Native场景、不重跑旧查询、不启动对局。',
      inputs:{previousDraft:{source:'evidence',id:'draft:r6:summary',pointer:'',scopeUsage:'historical_reference'},
        previousDecision:{source:'evidence',id:'role:review-resolution:r6:scoring_and_timing:method:80e444810cdaf385:strategy-frontier',pointer:'',scopeUsage:'historical_reference'},
        observation:{source:'evidence',id:'tool-view:review-resolution:r6:scoring_and_timing:method:97191d031ce4b258:order0:inspect-after-deploy',pointer:''}}});
    console.log(JSON.stringify({stage:'product-decision-kind-check',workId:id,forcedDisposition:false,roomReinitialized:false}));
  }
  if(revalidateWorkId){
    const work=(await run.inspect()).work.find(w=>w.id===revalidateWorkId);
    const errors=work?.operationState?.correction?.errors??[];
    const allowed=new Set(['read_requires_reads_only','catalogue_queries_require_catalogue_action','catalogue_requires_metadata_queries_only',
      'repeated_reads_no_progress','repeated_catalogue_no_progress']);
    const completed=work?.failure?.dispatchOutcome==='completed_invalid'
      ||work?.failure?.dispatchOutcome==='completed_no_progress'&&['ROSTER_WORKFLOW_ROLE_READS_NOT_CONVERGED','ROSTER_WORKFLOW_ROLE_CATALOGUE_NOT_CONVERGED'].includes(work.failure.code);
    if(work?.status!=='needs_repair'||!completed
      ||!errors.length||errors.some(e=>!allowed.has(e.code)))throw Error('EXACT_READ_ONLY_DISCRIMINATOR_FAILURE_REQUIRED');
    const reply=await run.readArtifact(work.operationState.correction.originalReplyRef),output=reply.output;
    const proposals=work.role==='roster_workflow_final_review'?output?.checks:output?.workOrders;
    if(!['read','catalogue'].includes(output?.action)||!Array.isArray(output.reads)||!Array.isArray(output.catalogueQueries)
      ||!Array.isArray(proposals)||proposals.length||output.conclusion||!output.reads.length&&!output.catalogueQueries.length)
      throw Error('UNAMBIGUOUS_READ_ONLY_PAYLOAD_REQUIRED');
    await run.revalidateRoleReply({workId:work.id,
      reason:'Standing one-extra-after-concrete-fix authorization: v624 revalidates exact immutable read/catalogue payloads and returns duplicate preparation to decision, rather than failing or buying another reply. The extra allowance covers only this failed reply; successful recovery restores its normal independent correction cycle. Keep paid replies, calls, source scope and billing history.'});
    console.log(JSON.stringify({stage:'paid-read-only-reply-revalidation-scheduled',workId:work.id,newProviderCallRequired:false,historyReset:false}));
  }
  if(operationChoiceWorkId){
    const work=(await run.inspect()).work.find(w=>w.id===operationChoiceWorkId);
    const errors=work?.operationState?.correction?.errors??[];
    if(work?.status!=='needs_repair'||work.failure?.code!=='ROSTER_WORKFLOW_ROLE_CORRECTION_NOT_CONVERGED'
      ||work.failure.dispatchOutcome!=='completed_invalid'||work.operationState?.pending
      ||!errors.length||errors.some(e=>e.code!=='experiment_conclusion_requires_conclude_action')
      ||work.failureHistory?.some(h=>h.reason?.includes('v633-operation-choice')))
      throw Error('EXACT_OPERATION_CHOICE_FAILURE_REQUIRED');
    const reply=await run.readArtifact(work.operationState.correction.originalReplyRef);
    if(reply.output?.action!=='finish'||!reply.output.workOrders?.length||!reply.output.conclusion)
      throw Error('UNMODIFIED_MIXED_OPERATION_REQUIRED');
    await run.resumeRoleCorrection({workId:work.id,
      reason:'Standing one-extra-after-concrete-fix authorization: v633-operation-choice provides exact conflicting field, observed action and mutually exclusive next operations in schema and local feedback. Request one actual author correction, not Host deletion/normalization or old reply approval. Keep all unknowns, paid calls, failures and fees.'});
    console.log(JSON.stringify({stage:'operation-choice-author-correction-scheduled',workId:work.id,
      maximumAdditionalInvalidReplies:1,oldReplyRevalidated:false,historyReset:false}));
  }
  if(menuSourceWorkId){
    const work=(await run.inspect()).work.find(w=>w.id===menuSourceWorkId);
    const errors=work?.operationState?.correction?.errors??[];
    if(work?.status!=='needs_repair'||work.failure?.code!=='ROSTER_WORKFLOW_ROLE_CORRECTION_NOT_CONVERGED'
      ||work.failure.dispatchOutcome!=='completed_invalid'||work.operationState?.pending
      ||!errors.length||errors.some(e=>e.code!=='evidence_not_read'||e.requiredPointer!=='/receipt/actionSpace')
      ||work.failureHistory?.some(h=>h.reason?.includes('v635-menu-source')))
      throw Error('EXACT_UNREAD_ACTION_MENU_FAILURE_REQUIRED');
    await run.resumeRoleCorrection({workId:work.id,
      reason:'Standing one-extra-after-concrete-fix authorization: v635-menu-source distinguishes a source lacking a menu from an unread menu, gives registered same-state saved inspection handles, and retains the paid invalid reply/necessary questions. One actual author correction; no Host choice substitution, no original setup replay and no counter/fee history reset.'});
    console.log(JSON.stringify({stage:'menu-source-author-correction-scheduled',workId:work.id,
      maximumAdditionalInvalidReplies:1,oldReplyRevalidated:false,historyReset:false}));
  }
  if(menuReadWorkId){
    const work=(await run.inspect()).work.find(w=>w.id===menuReadWorkId);
    const errors=work?.operationState?.correction?.errors??[];
    if(work?.status!=='needs_repair'||work.failure?.code!=='ROSTER_WORKFLOW_ROLE_CORRECTION_NOT_CONVERGED'
      ||work.failure.dispatchOutcome!=='completed_invalid'||work.operationState?.pending
      ||!errors.length||errors.some(e=>e.code!=='choice_menu_source_has_no_menu')
      ||work.failureHistory?.some(h=>h.reason?.includes('v636-menu-read-stage')))
      throw Error('EXACT_MENU_SOURCE_STAGE_FAILURE_REQUIRED');
    await run.resumeRoleCorrection({workId:work.id,
      reason:'Standing one-extra-after-concrete-fix authorization: v636-menu-read-stage now forbids action submission until the actual matching menu is delivered; a typed read/catalogue/control-return phase replaces another unconstrained old-proposal retry. v637 requires local experiment scope and separates conditional scenario experience. Keep 1289/old failures/fees; no Host field substitution or round/room reinitialization.'});
    console.log(JSON.stringify({stage:'menu-source-read-stage-scheduled',workId:work.id,
      maximumAdditionalInvalidReplies:1,oldReplyRevalidated:false,historyReset:false}));
  }
  if(followupWorkId){
    const work=(await run.inspect()).work.find(w=>w.id===followupWorkId);
    const errors=work?.operationState?.correction?.errors??[];
    if(work?.status!=='needs_repair'||work.failure?.code!=='ROSTER_WORKFLOW_ROLE_CORRECTION_NOT_CONVERGED'
      ||work.failure.dispatchOutcome!=='completed_invalid'||work.operationState?.pending
      ||!errors.length||errors.some(e=>e.code!=='experiment_answer_has_unresolved_necessary_facts'))
      throw Error('EXACT_FOLLOWUP_CONTRACT_FAILURE_REQUIRED');
    const reply=await run.readArtifact(work.operationState.correction.originalReplyRef);
    if(reply.output?.action!=='conclude'||reply.output.conclusion?.status!=='answered'||!reply.output.unresolvedQuestions?.length)
      throw Error('UNMODIFIED_CONFLICTING_CONCLUSION_REQUIRED');
    await run.resumeRoleCorrection({workId:work.id,
      reason:'Standing one-extra-after-concrete-fix authorization: v625 makes necessary-fact vs future-condition semantics explicit in the output schema and precise local feedback, including the original saved questions. Request one real author correction; do NOT revalidate the old semantically invalid reply or classify/delete its uncertainty in Host. Preserve all paid calls, failures and unknown fees.'});
    console.log(JSON.stringify({stage:'followup-contract-author-correction-scheduled',workId:work.id,
      maximumAdditionalInvalidReplies:1,oldReplyRevalidated:false,historyReset:false}));
  }
  if(resumeTransport){
    const events=(await fs.readFile(path.join(dir,'provider-events.jsonl'),'utf8')).trim().split('\n').map(line=>JSON.parse(line));
    for(const work of resumeWork){
      const event=events.findLast(e=>e.type==='provider_dispatch'&&e.dispatch.contextHash===work.operationState.pending.contextHash
        &&['ambiguous','definitely_not_sent'].includes(e.dispatch.status));
      if(!event)throw Error('EXACT_SAVED_TRANSPORT_FAILURE_REQUIRED');
      await run.retryProviderDispatch({workId:work.id,dispatch:event.dispatch,allowUnknownCharge:true,
        authorizationId:'standing-network-recovery:'+event.dispatch.requestId,
        reason:'User standing authorization: one controlled retry of this exact network-failed request; retain its unknown charge, request, counters and all successful work.'});
      console.log(JSON.stringify({stage:'single-transport-retry-authorized',workId:work.id,requestId:event.dispatch.requestId,oldChargeRetained:true}));
    }
  }
  let reviewedRevision=null,terminalReason='client_observation_quantum_completed';
  for(let tick=0;tick<96;tick++){
    if(stopRequested){terminalReason='requested_observation_boundary';break;}
    const current=await run.inspect();
    if(current.work.some(w=>w.status==='needs_repair')){terminalReason='product_needs_repair';break;}
    if(current.draftRevision!==reviewedRevision){const scheduled=await run.requestFinalReviews();reviewedRevision=current.draftRevision;
      console.log(JSON.stringify({stage:'current-draft-reviews',revision:reviewedRevision,scheduled:scheduled.scheduled,
        carriedQuestions:scheduled.readiness.strategyQuestions,mechanicalBlockers:scheduled.readiness.mechanicalBlockers}));}
    const assessment=await run.finalAssessment();
    if(assessment.readyForRelease){terminalReason='candidate_ready_for_release_not_user_acceptance';break;}
    const step=await run.advance({concurrency:2});
    console.log(JSON.stringify({stage:'advance',tick,revision:step.state.draftRevision,work:step.ran.map(w=>({id:w.id,status:w.status,failure:w.failure}))}));
    if(!step.ran.length){terminalReason='no_ready_work';break;}
  }
  const result={terminalReason,calls,currentDraft:await run.currentDraft(),readiness:await run.readiness(),
    assessment:await run.finalAssessment(),formalPlanAccepted:false,gameStarted:false};
  await save('product-review-v616-result-'+Date.now()+'.json',result);
  console.log(JSON.stringify({stage:'finished',terminalReason,revision:result.currentDraft.revision,
    candidateReady:result.assessment.readyForRelease,mechanicalBlockers:result.readiness.mechanicalBlockers,
    semanticIssues:result.assessment.semanticIssues.length,activeWork:result.assessment.activeWork.length}));
}catch(error){await save('product-review-v616-failure-'+Date.now()+'.json',{code:error.code||error.message,calls});console.error(error);process.exitCode=1;}
finally{await adapter?.close();process.off('SIGTERM',stop);process.off('SIGINT',stop);}
