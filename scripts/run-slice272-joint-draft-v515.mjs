// P4 actual product client. New isolated Run from an empty army; historical
// Plan supplies only frozen scenario/source identity, never a copied army/Plan.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRosterPlanningProductModuleV1} from '../packages/product-composition/roster-planning-product-module-v1.mjs';
import {createRosterPlanProvenanceV1} from '../packages/roster-strategist/roster-plan-contracts-v1.mjs';
import {createRosterPlanningSecureDeliberationFactoryV1,projectRosterProviderInstructionsV1} from '../packages/roster-planning-workspace/roster-planning-secure-deliberation-factory-v1.mjs';
import {encodeRosterProviderInputV1} from '../packages/roster-strategist/roster-prompt-evidence-encoding-v1.mjs';
import {projectRosterWorkflowToolRepairV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
const root=process.cwd(),resumeIndex=process.argv.indexOf('--resume');
const dir=resumeIndex>=0?path.resolve(process.argv[resumeIndex+1]):await fs.mkdtemp(path.join(root,'build/slice272-joint-draft-v515-'));
if(!dir.startsWith(path.join(root,'build/slice272-joint-draft-v515-')))throw Error('NEW_JOINT_DRAFT_PATH_REQUIRED');
const config=JSON.parse(await fs.readFile(path.join(root,'build/ticket-23-three-arm-performance-baseline-20261010-v1/common-v79-plan-recovery-config.private.json'),'utf8'));
const fixture=JSON.parse(await fs.readFile(path.join(root,'build/slice272-role-workflow-prototype-v502-r5-20261019/decision.request.json'),'utf8'));
const sourcePlan=fixture.request.promptNodes.find(n=>n.kind==='current_full_plan_not_validated').plan;
const {sideKey,factionRecordKey,scaleId,mineralBudget}=sourcePlan.rosterCandidate;
const candidateInput={sideKey,factionRecordKey,scaleId,mineralBudget,tacticalCardRecordKeys:[],units:[]};
const provenance=createRosterPlanProvenanceV1({...sourcePlan.provenance,promptVersion:'roster_scoped_workflow_v1'});
const save=(name,v)=>fs.writeFile(path.join(dir,name),JSON.stringify(v,null,2),{flag:'wx'});
const seen=(await fs.readdir(dir)).filter(n=>/^\d+\.request\.json$/.test(n)).map(n=>Number(n.split('.')[0]));
const calls=[],requestNumbers=new Map();let sequence=Math.max(0,...seen),adapter;
const label=resumeIndex>=0?`-resume-${Date.now()}`:'';
console.log(JSON.stringify({stage:'initializing_product',dir}));
try{
  adapter=await createRosterPlanningSecureDeliberationFactoryV1();
  const product=await createRosterPlanningProductModuleV1({root,fixtureRoot:config.fixtureRoot,dataDirectory:path.join(dir,'workspace'),
    mapConfiguration:JSON.parse(await fs.readFile(config.mapConfigurationFile,'utf8')),deliberationFactory:adapter.factory});
  const run=await product.openDecisionWorkflow({runId:'p4-from-empty',candidateInput,
    networkRecoveryPolicy:{retryDefinitelyNotSent:true,ambiguousAuthorizationId:'user-standing-network-resume-2026-10-19'},
    setup:{sideKey,missionBinding:provenance.missionBinding},
    onEvent:e=>fs.appendFile(path.join(dir,'provider-events.jsonl'),JSON.stringify(e)+'\n'),
    onRequest:async request=>{
      const number=++sequence,encoded=encodeRosterProviderInputV1(request,'same_request_evidence_v1');requestNumbers.set(request.contextHash,number);
      await save(`${number}.request.json`,{request,providerInstructions:projectRosterProviderInstructionsV1({request,runKind:'teach-framework'}),encodedProviderInput:encoded.input,isExactPromptContent:true});
      console.log(JSON.stringify({stage:'dispatching',number,kind:request.roundKind,inputCharacters:encoded.afterCharacters}));
    },
    onReply:async reply=>{const number=requestNumbers.get(reply.receipt.contextHash);if(!number)throw Error('REQUEST_OBSERVATION_NOT_FOUND');
      await save(`${number}.reply.json`,reply);calls.push({number,contextHash:reply.receipt.contextHash,usage:reply.receipt.usage,
        latencyMs:reply.receipt.latencyMs,receiptHash:reply.receipt.receiptHash});
      console.log(JSON.stringify({stage:'returned',...calls.at(-1),action:reply.output?.action??'invalid_output'}));},
    onTool:async value=>{await fs.appendFile(path.join(dir,'tools.jsonl'),JSON.stringify(value)+'\n');
      console.log(JSON.stringify({stage:'tool_completed',operation:value.operation,status:value.status}));},
  });
  await run.initializeDraft({candidateInput,plan:null,provenance,mode:'editable',planId:'p4-from-empty-plan'});
  const networkWorkIds=process.argv.flatMap((arg,index)=>arg==='--retry-network-work'?[process.argv[index+1]]:[]);
  if(networkWorkIds.length){
    const events=(await fs.readFile(path.join(dir,'provider-events.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
    for(const workId of networkWorkIds){
      const work=(await run.inspect()).work.find(w=>w.id===workId);
      const dispatch=events.findLast(e=>e.type==='provider_dispatch'&&e.dispatch.contextHash===work?.operationState?.pending?.contextHash)?.dispatch;
      await run.retryProviderDispatch({workId,dispatch,authorizationId:'user-standing-network-resume-2026-10-19',allowUnknownCharge:true,
        reason:'One controlled retry under existing user network-recovery authorization; exact pending request, prior unknown fees and semantic counters retained.'});
    }
  }
  const correctionIndex=process.argv.indexOf('--resume-role-correction');
  const reasonIndex=process.argv.indexOf('--resume-reason');
  const toolRepairIndex=process.argv.indexOf('--resume-tool-repair');
  if(toolRepairIndex>=0){
    const current=await run.inspect(),workId=process.argv[toolRepairIndex+1];
    const work=current.work.find(w=>w.id===workId),reason=reasonIndex>=0?process.argv[reasonIndex+1]:null;
    if(!reason||work?.role!=='roster_workflow_tool'||work.status!=='needs_model_choice'||work.repairGeneration!==3)
      throw Error('SCOPED_FOURTH_TOOL_REPAIR_REQUIRES_STOPPED_THIRD_AND_FIX_REASON');
    const id=`${workId}:input-repair`;
    if(current.work.some(w=>w.id===id))throw Error('SCOPED_FOURTH_TOOL_REPAIR_ALREADY_SCHEDULED');
    const failed=await run.readArtifact(work.resultRef),queryRepair=projectRosterWorkflowToolRepairV1(failed.value);
    if(!queryRepair?.correctable)throw Error('SOURCE_OWNED_TOOL_REPAIR_REQUIRED');
    await run.enqueue([{id,role:'roster_workflow_experiment_planner',bindings:work.bindings,
      repairOf:workId,repairGeneration:4,controlledRecovery:{reason,priorGeneration:3,historyReset:false},
      inputs:{task:{source:'literal',value:{instruction:'One explicitly authorized recovery after a concrete new-workflow interface fix. Preserve the original factual question. You own conditional scenario choices. Use the current tools to execute them, then answer the original query; never treat read-only suggestions as scene changes. Existing successful queries remain available; do not replay them. Use completionStepId only for the original completed question, not preliminary geometry.',
        engineeringChange:reason,originalWork:work.inputs.request.value,failure:{...failed.value,queryRepair}}},
        tools:{source:'literal',value:run.tools()}}}]);
    console.log(JSON.stringify({stage:'controlled_fourth_tool_repair',workId,historyReset:false}));
  }
  if(correctionIndex>=0)await run.resumeRoleCorrection({workId:process.argv[correctionIndex+1],
    reason:reasonIndex>=0?process.argv[reasonIndex+1]:'New-flow read handoff repaired and v517 verified: receipt-view paths resolve exact immutable originals, read results retain selection numbers, and specific correction survives assembly. Preserve completed draft/Teach, paid replies and failed-read history.'});
  const revalidateIds=process.argv.flatMap((arg,index)=>arg==='--revalidate-role-reply'?[process.argv[index+1]]:[]);
  for(const workId of revalidateIds)await run.revalidateRoleReply({workId,
    reason:reasonIndex>=0?process.argv[reasonIndex+1]:'Writable Plan projection excludes source-owned derived audit fields; revalidate original paid reply without model request or strategy edit'});
  const reconcileIndex=process.argv.indexOf('--reconcile-provider-failure');
  if(reconcileIndex>=0){
    const workId=process.argv[reconcileIndex+1],work=(await run.inspect()).work.find(w=>w.id===workId);
    const events=(await fs.readFile(path.join(dir,'provider-events.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
    const event=events.findLast(e=>e.type==='round_failed'&&e.failedOutputRecord?.contextHash===work?.operationState?.pending?.contextHash);
    await run.reconcileProviderFailure({workId,event});
  }
  const retryIndex=process.argv.indexOf('--retry-draft');
  if(retryIndex>=0)await run.retryDraftCommit({workId:process.argv[retryIndex+1],reason:'P4 Adapter now maps model upgradeSelections to Native Builder upgrades; exact saved model reply, not a new paid call'});
  await run.prepareStrategyResources({ownFactionRecordKey:factionRecordKey,opponentFactionRecordKey:'tactical_cards:kerrigan_s_swarm'});
  const state=await run.inspect();
  const menu=run.builderChoices({scaleId,factionRecordKey,mineralBudget});
  const menuId=`builder:menu:${menu.unitCompositionUpgradeDataBundleHash}`;
  await run.publishEvidence({id:menuId,title:'Actual eligible army choices, compositions, upgrades and costs',kind:'tool_receipt',
    bindings:{},conditions:['Frozen source eligibility/cost catalogue; a complete candidate still needs Builder audit'],value:menu});
  if(state.draftRevision===0){
    await run.prepareContext();await run.advance({concurrency:2});
    if(!(await run.inspect()).work.some(w=>w.id==='initial-army-and-plan'))await run.requestDecision({id:'initial-army-and-plan',
      question:{goal:'从空军表开始形成可修改的初步军表和初步Plan，最终目标为合法2000分。先阅读必要的本族/对抗/通用Skill和真实单位规则，再选择构成。不能复制旧军表或把工程边界当战略理由。',
        scope:'这是新流程的首个草案，不是最终发布。说明获胜方式、每支单位用途、备选取舍、地图与对手假设；没有执行证据的到达/造伤/支付不得写成确定事实，记录具体后续查询。可以形成合理的阶段性合法表，后续Teach允许同时改表和Plan。',
        opponent:'tactical_cards:kerrigan_s_swarm；查询中的对手是冻结公开参考军表，不是尚未观察的隐藏真值。'},
      inputs:{menu:{source:'evidence',id:menuId,pointer:''},
        mission:{source:'evidence',id:'tool-view:discovery:r0:scoring',pointer:''}}});
  }
  // Observer work quanta, not a model strategy/review round quota. Every paid
  // reply and edit result is checkpointed by the product before the next step.
  for(let tick=0;tick<30;tick++){
    const advanced=await run.advance({concurrency:2});
    console.log(JSON.stringify({stage:'work_boundary',tick,draftRevision:advanced.state.draftRevision,
      work:advanced.ran.map(w=>({id:w.id,status:w.status}))}));
    if(advanced.state.draftRevision>(state.draftRevision??0)||advanced.state.work.some(w=>w.status==='needs_repair')||!advanced.ran.length)break;
  }
  if(process.argv.includes('--teach-cycle')&&(await run.currentDraft()).revision>0){
    const before=await run.currentDraft(),revision=before.revision;
    const teachId=`teach:r${revision}`,decisionId=`decision-after-teach:r${revision}`;
    await run.prepareContext();await run.advance({concurrency:2});
    if(!(await run.inspect()).work.some(w=>w.id===teachId))await run.requestTeach({id:teachId,
      question:'审视这个实际Builder已提交的初步军表/Plan。最终需求为2000分，不可把低分阶段草稿当完成。结合本族/对抗Skill、单位真实能力和任务：哪些选择有真实用途，哪些替代值得比较，当前缺少哪些必要查询，风险是否有可观测反例。保留合理风险与已成立方案，不为质疑而质疑。给选择者可执行的局部建议，不能自行改表或声称已模拟。',
      inputs:{draft:{source:'evidence',id:`draft:r${revision}:summary`,pointer:''},
        intent:{source:'evidence',id:`draft:r${revision}:plan:publicSummaryText`,pointer:''},
        mission:{source:'evidence',id:`tool-view:discovery:r${revision}:scoring`,pointer:''}}});
    for(let tick=0;tick<30;tick++){
      const advanced=await run.advance({concurrency:2});
      const work=advanced.state.work.find(w=>w.id===teachId);
      if(work?.status==='evidence_ready'||advanced.state.work.some(w=>w.status==='needs_repair')||!advanced.ran.length)break;
    }
    const afterTeach=await run.inspect();
    if(afterTeach.work.find(w=>w.id===teachId)?.status==='evidence_ready'&&!afterTeach.work.some(w=>w.id===decisionId))
      await run.requestDecision({id:decisionId,
        question:'依据局部Teach和当前完整战略意图继续选表与Plan。允许重选单位/升级/卡牌，同时更新相关Plan；不允许以当前已固定为保留理由。目标是合法2000分的连贯方案，但缺少必要实际查询时可以明确提出调查，不要伪造量化结论。根据证据采纳、驳回或调查，不机械服从Teach。',
        inputs:{teach:{source:'evidence',id:`role:${teachId}`,pointer:''},menu:{source:'evidence',id:menuId,pointer:''}}});
    for(let tick=0;tick<30;tick++){
      const advanced=await run.advance({concurrency:2});
      if(advanced.state.draftRevision>revision||advanced.state.work.some(w=>w.status==='needs_repair')||!advanced.ran.length)break;
    }
  }
  let finalAssessment=null;
  if(process.argv.includes('--resolve-review')){
    const revision=(await run.currentDraft()).revision;
    console.log(JSON.stringify({stage:'review_resolution_scheduled',...await run.resolveFinalReviews()}));
    for(let tick=0;tick<30;tick++){
      const advanced=await run.advance({concurrency:2});
      console.log(JSON.stringify({stage:'review_resolution_boundary',tick,draftRevision:advanced.state.draftRevision,
        work:advanced.ran.map(w=>({id:w.id,status:w.status}))}));
      if(advanced.state.draftRevision>revision||advanced.state.work.some(w=>w.status==='needs_repair')||!advanced.ran.length)break;
    }
  }
  if(process.argv.includes('--final-review')){
    const scheduled=await run.requestFinalReviews();
    console.log(JSON.stringify({stage:'final_review_scheduled',scheduled:scheduled.scheduled,
      mechanicalReady:scheduled.readiness.mechanicalReady,blockers:scheduled.readiness.mechanicalBlockers}));
    if(scheduled.readiness.mechanicalReady)for(let tick=0;tick<30;tick++){
      const advanced=await run.advance({concurrency:2});
      console.log(JSON.stringify({stage:'final_review_boundary',tick,work:advanced.ran.map(w=>({id:w.id,status:w.status}))}));
      const currentReviews=advanced.state.work.filter(w=>w.role==='roster_workflow_final_review'
        &&w.draftRevision===advanced.state.draftRevision);
      if(currentReviews.some(w=>w.status==='needs_repair')||currentReviews.every(w=>w.status==='evidence_ready')||!advanced.ran.length)break;
    }
    finalAssessment=await run.finalAssessment();
    await save(`final-assessment${label}.json`,finalAssessment);
  }
  const final=await run.inspect(),draft=await run.currentDraft(),outcomes=[];
  for(const work of final.work)if(work.draftOutcomeRef)outcomes.push({workId:work.id,outcome:await run.readArtifact(work.draftOutcomeRef)});
  await save(`draft${label}.json`,draft);await save(`result${label}.json`,{dir,calls,draftRevision:draft.revision,
    unitCount:draft.candidateInput.units.length,planVersion:draft.plan?.planVersion??null,outcomes,
    work:final.work.map(w=>({id:w.id,status:w.status,failure:w.failure??null})),
    sourceMutation:run.mutationProof(),finalAssessment,fullGenerationProven:false,acceptanceGranted:false,liveGameActions:0});
  console.log(JSON.stringify({stage:'finished',dir,draftRevision:draft.revision,unitCount:draft.candidateInput.units.length,planVersion:draft.plan?.planVersion??null,calls:calls.length}));
}catch(error){await save(`failure${label}.json`,{code:error.code||error.message,detail:error.detail??null,calls});console.error(error);process.exitCode=1;}
finally{await adapter?.close?.();}
