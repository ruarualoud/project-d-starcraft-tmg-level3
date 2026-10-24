// Continue the NEW accepted v565 evidence Run into P4. No old exhausted lane
// is resumed. The model owns retain/change; Builder+Plan commit stays atomic.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRosterPlanningProductModuleV1} from '../packages/product-composition/roster-planning-product-module-v1.mjs';
import {createRosterPlanningSecureDeliberationFactoryV1,projectRosterProviderInstructionsV1} from '../packages/roster-planning-workspace/roster-planning-secure-deliberation-factory-v1.mjs';
import {encodeRosterProviderInputV1} from '../packages/roster-strategist/roster-prompt-evidence-encoding-v1.mjs';
import {compileRosterWorkflowExperimentV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
const root=process.cwd(),dir=path.resolve(process.argv[2]),base=path.join(dir,'workspace/decision-workflows/projection-owner');
if(!dir.startsWith(path.join(root,'build/slice272-projection-owner-v565-')))throw Error('NEW_PROJECTION_RUN_REQUIRED');
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const draft=JSON.parse(await fs.readFile(path.join(base,'artifacts',state.draftRef+'.json'),'utf8'));
const config=JSON.parse(await fs.readFile(path.join(root,'build/ticket-23-three-arm-performance-baseline-20261010-v1/common-v79-plan-recovery-config.private.json'),'utf8'));
const suffix=Date.now(),save=(name,value)=>fs.writeFile(path.join(dir,name),JSON.stringify(value,null,2),{flag:'wx'});
// Observer quanta are not strategy/repair quotas. Follow mode remains bounded
// by product correction/review stops and the next committed draft boundary.
const observationQuanta=process.argv.includes('--follow')?Infinity:24;
let adapter,sequence=Math.max(0,...(await fs.readdir(dir)).filter(n=>/^\d+\.request\.json$/.test(n)).map(n=>parseInt(n)));
const numbers=new Map(),calls=[];
console.log(JSON.stringify({stage:'p4-initializing',dir,startingRevision:draft.revision}));
try{
  adapter=await createRosterPlanningSecureDeliberationFactoryV1();
  const product=await createRosterPlanningProductModuleV1({root,fixtureRoot:config.fixtureRoot,dataDirectory:path.join(dir,'workspace'),
    mapConfiguration:JSON.parse(await fs.readFile(config.mapConfigurationFile,'utf8')),deliberationFactory:adapter.factory});
  const run=await product.openDecisionWorkflow({runId:'projection-owner',candidateInput:draft.candidateInput,
    setup:{sideKey:draft.candidateInput.sideKey,missionBinding:draft.provenance.missionBinding},
    onEvent:e=>fs.appendFile(path.join(dir,'provider-events.jsonl'),JSON.stringify(e)+'\n'),
    onRequest:async request=>{const number=++sequence;numbers.set(request.contextHash,number);const encoded=encodeRosterProviderInputV1(request,'same_request_evidence_v1');
      await save(number+'.request.json',{request,providerInstructions:projectRosterProviderInstructionsV1({request,runKind:'teach-framework'}),encodedProviderInput:encoded.input,isExactPromptContent:true});
      console.log(JSON.stringify({stage:'dispatching',number,role:request.roundKind,inputCharacters:encoded.afterCharacters}));},
    onReply:async reply=>{const number=numbers.get(reply.receipt.contextHash);if(!number)throw Error('UNBOUND_REPLY');await save(number+'.reply.json',reply);
      calls.push({number,usage:reply.receipt.usage,latencyMs:reply.receipt.latencyMs});console.log(JSON.stringify({stage:'returned',...calls.at(-1)}));},
    onTool:value=>fs.appendFile(path.join(dir,'tools.jsonl'),JSON.stringify(value)+'\n')});
  await run.prepareStrategyResources({ownFactionRecordKey:draft.candidateInput.factionRecordKey,opponentFactionRecordKey:'tactical_cards:kerrigan_s_swarm'});
  await run.prepareContext();
  // Committing a draft supersedes revision-scoped experiment work. That is
  // expected invalidation, not loss of the committed draft's provenance.
  // Resume Teach from that draft; require live experiment acceptance only when
  // performing the initial evidence adoption, never rerun the paid predecessor.
  if(!draft.plan){
  const accepted=(await run.experimentOutcomes()).find(o=>o.goalId==='projection-comparison-interpretation'&&o.acceptedForStrategy);
  if(!accepted)throw Error('ACCEPTED_NEW_EXPERIMENT_REQUIRED');
  const id='p4-comparison-informed-strategy-v566';
  if(!(await run.inspect()).work.some(w=>w.id===id))await run.requestDecision({id,
    inputs:{experimentConclusion:{source:'work',id:accepted.ownerWorkId,pointer:'/value'},
      sourceReview:{source:'work',id:accepted.reviewId,pointer:'/value'}},
    question:{goal:'进入新P4：把已经完成来源核对的局部对抗事实交回总体选表/Plan角色。依据当前军表、Skill与实际可查资料，自主选择保留或修改军表，并通过原子接口形成同步的战略Plan。允许保留，不为证明流程强迫改表。目标规模仍为2000矿，不能把1790分实验候选当最终表。',
      evidenceUse:'说明Marauder承担什么任务、缩编的量化代价是否值得，以及为什么；明确证据只来自特定条件场景。Medic、额外Marine、到达路线等未测项不能冒充已证收益，有必要的事实问题交相应角色查证。原件与完整Skill可按需读取，不重查已成功局部火力。',
      accuracy:'实验解释是可审视的提案而不是新规则。区分4对2模型的比较方向与sceneProjection记录的实际2→4重排方向；Rules版本相同而两套军表runtimeHash不同，不等于两套规则。以原生回执证明什么为界。',
      delivery:'输出军表保留/修改的公开依据与同步Plan：获胜/得分方式、单位具体用途、先后步骤、地图与对手假设、反制、失败触发与重规划。尚缺必要事实就显式交接，不用虚构数字填满字段。此处是新流程能力到P4提交的实际生产步骤，不是最终审核通过；本脚本在首个成功军表/Plan提交边界停，不启动对局。'}});
  for(let tick=0;tick<24;tick++){
    const step=await run.advance({concurrency:2}),now=await run.currentDraft();
    console.log(JSON.stringify({stage:'p4-boundary',tick,revision:now.revision,work:step.ran.map(w=>({id:w.id,status:w.status}))}));
    if(now.revision>draft.revision||step.state.work.some(w=>w.status==='needs_repair')||!step.ran.length)break;
  }
  }
  if(process.argv.includes('--teach-cycle')){
    const before=await run.currentDraft(),revision=before.revision;
    if(!before.plan)throw Error('P4_DRAFT_PLAN_REQUIRED_FOR_TEACH');
    const blocks=[
      ['components','componentPurposes','只审单位/卡牌/升级用途与取舍；尤其当前卡牌用途缺失。哪些是真正支持获胜路线、哪些只是泛称支援，缺什么可查询依据？保留已测Marauder局部论证，不将其扩成Medic必要性。'],
      ['scoring','scoreRoute','只审任务计分路线及条件时序。当前scheduleStatus未知不是最终答案；读取已具备的任务事实，区分规则每轮是否计分与战略想拿多少分。指出需要模型选择的目标及缺失的实际查询。'],
      ['losses','lossResourceBudget','只审损失与资源预算。容忍何种模型/武器/移动/Supply/控点能力损失是战略选择；具体损失后果须用事实。不要要求预测所有随机结果或把条件预算当保证。'],
      ['deployment','deploymentConcept','只审实际地图、部署/进场、顺序与反制。当前激活顺序未知且没有地图路线依据，具体需要哪些已支持查询才能形成可执行条件计划？不要手填坐标或假设到达成功。'],
    ];
    const prior=await run.inspect(),ids=[];
    for(const [domain,section,focus] of blocks){
      const teachId=`p4-block-teach:r${revision}:${domain}`;ids.push(teachId);
      const blockInputs=Array.isArray(before.plan[section])
        ?Object.fromEntries(before.plan[section].map((_,index)=>[`assignedPlanBlock${index}`,
          {source:'evidence',id:`draft:r${revision}:plan:${section}:${index}`,pointer:''}]))
        :{assignedPlanBlock:{source:'evidence',id:`draft:r${revision}:plan:${section}`,pointer:''}};
      if(!prior.work.some(w=>w.id===teachId))await run.requestTeach({id:teachId,
        question:{focus,protocol:'这是新P4同一草案的分块Teach。只提出本块的可执行采纳/驳回/查询建议，保留合理风险，不要求全局最优。引用当前原句、真实证据和Skill；不能自行改表或改Plan，不把未读当缺失。'},
        inputs:{draft:{source:'evidence',id:`draft:r${revision}:summary`,pointer:''},...blockInputs}});
    }
    for(let tick=0;tick<24;tick++){
      const step=await run.advance({concurrency:2});
      console.log(JSON.stringify({stage:'p4-block-teach',tick,work:step.ran.map(w=>({id:w.id,status:w.status}))}));
      if(ids.every(id=>step.state.work.find(w=>w.id===id)?.status==='evidence_ready')
        ||step.state.work.some(w=>w.status==='needs_repair')||!step.ran.length)break;
    }
    const taught=await run.inspect(),decisionId=`p4-after-block-teach:r${revision}`;
    if(ids.every(id=>taught.work.find(w=>w.id===id)?.status==='evidence_ready')&&!taught.work.some(w=>w.id===decisionId))
      await run.requestDecision({id:decisionId,
        inputs:Object.fromEntries(ids.map((id,index)=>[`teach${index}`,{source:'evidence',id:`role:${id}`,pointer:''}])),
        question:{goal:'合并四块Teach，作为总体策略负责人自主采纳/驳回/调查并修改当前军表和Plan。不要机械照单全收；保留成立的Marauder局部证据，补齐最终准出必须的卡牌用途、条件得分时序、损失预算和部署/顺序依据。',
          workflow:'需要事实时提出具体调查，现有工具查明后继续本轮；军表和Plan可共同变更。无法证明的必要工程事实不能清空requiredData当完成，战略条件可以明确声明；最终仍需独立审核。'}});
    for(let tick=0;tick<24;tick++){
      const step=await run.advance({concurrency:2}),now=await run.currentDraft();
      console.log(JSON.stringify({stage:'p4-after-teach',tick,revision:now.revision,work:step.ran.map(w=>({id:w.id,status:w.status}))}));
      if(now.revision>revision||step.state.work.some(w=>w.status==='needs_repair')||!step.ran.length)break;
    }
  }
  if(process.argv.includes('--recheck-required-data')){
    const current=await run.inspect();
    const prior=current.work.find(w=>w.id==='final-review:r2:component_choices');
    if(current.draftRevision!==2||prior?.status!=='evidence_ready')throw Error('EXACT_REVIEW_RECHECK_SOURCE_REQUIRED');
    const id='final-review:r2:component_choices:round2';
    if(!current.work.some(w=>w.id===id)){
      const original=JSON.parse(await fs.readFile(path.join(dir,'36.reply.json'),'utf8'));
      const evidenceId='review-contract-v569:original-reply36';
      await run.publishEvidence({id:evidenceId,title:'Original component review before erroneous requiredData-empty format feedback',
        kind:'proposal',bindings:current.scope,conditions:['Unmodified paid reply36; review assertion to reassess, not Rules truth'],value:original.output});
      await run.enqueue([{id,role:prior.role,reviewDomain:prior.reviewDomain,reviewRound:2,
        draftRevision:current.draftRevision,bindings:current.scope,inputs:{...prior.inputs,
          originalReview:{source:'evidence',id:evidenceId,pointer:''},
          savedReview:{source:'work',id:prior.id,pointer:'/value'},
          recheck:{source:'literal',value:'Recheck only component_choices after fixing a concrete contract defect: the old format check demanded an empty requiredData array for conditional, and the next reply deleted the pending evidence without resolving it. The attached original proposal is unchanged. Independently distinguish necessary missing proof from optional improvements using exact sources. Preserve necessary unresolved data for investigation; refute unnecessary requirements with reasons. Do not accept or reject solely because the old validator preferred a label. Other review domains are not repeated.'}}}]);
    }
  }
  if(process.argv.includes('--resume-formation-reference')){
    const current=await run.inspect();
    const failed=current.work.findLast(w=>w.role==='roster_workflow_tool'&&w.repairGeneration===3
      &&w.id.endsWith(':apply-formation')&&w.status==='needs_model_choice');
    if(!failed)throw Error('EXACT_FORMATION_REFERENCE_STOP_REQUIRED');
    const saved=await run.readArtifact(failed.resultRef);
    if(saved.value?.queryRepair?.requestedPointer!=='/value/receipt/evidenceNumber')throw Error('UNEXPECTED_FORMATION_REFERENCE_STOP');
    if(!current.work.some(w=>w.id===failed.id+':input-repair'))await run.resumeToolRepair({workId:failed.id,
      reason:'v570 fixes same-batch formation selection: selections [{fromStepId,optionIndex}] compile to an explicit predecessor dependency; already completed solver receipts retain {sourceEvidenceNumber,optionIndex}. Native receipts do not contain /receipt/evidenceNumber. Reuse the saved successful solver, do not run it again. This is a single authorized continuation after a concrete interface fix; static formation_scene alone does not prove deploy/arrival. Preserve original action domain and source when subsequently validating arrival.'});
  }
  if(process.argv.includes('--resume-native-selection')){
    const current=await run.inspect();
    const failed=current.work.findLast(w=>w.role==='roster_workflow_tool'&&w.repairGeneration===3
      &&w.id.endsWith(':repair-choice:order0:deploy-corrected')&&w.status==='needs_model_choice');
    if(!failed)throw Error('EXACT_NATIVE_SELECTION_STOP_REQUIRED');
    const saved=await run.readArtifact(failed.resultRef);
    if(saved.value?.code!=='PREGAME_LAB_NATIVE_ACTION_DOMAIN_NOT_IN_PARENT')throw Error('UNEXPECTED_NATIVE_SELECTION_STOP');
    if(!current.work.some(w=>w.id===failed.id+':input-repair'))await run.resumeToolRepair({workId:failed.id,
      reason:'v571 source-bound Native action interface passed its actual78 adapter regression. Use native_action {selection:{sourceEvidenceNumber OR fromStepId,kind:"finite"|"domain",index,parameters?,outcome?}} from the intended completed inspect. Host binds the exact parent/menu/seat together, no separate stateRef/base/action ID. Static formation_scene is geometry, not deployment; solver coordinates can be proposed as parameters on the original pre-deployment parent. Reuse completed evidence, retain model choice, and verify Native arrival. One authorized continuation after a concrete interface fix; no successful action replay.'});
  }
  if(process.argv.includes('--resume-order-source-contract')){
    const current=await run.inspect();
    const failed=current.work.findLast(w=>w.role==='roster_workflow_experiment_planner'&&w.orderRepairGeneration===3
      &&w.id.includes(':repair-choice:order0:deploy-corrected:input-repair:order-repair0')&&w.status==='evidence_ready');
    if(!failed)throw Error('EXACT_ORDER_SOURCE_CONTRACT_STOP_REQUIRED');
    const saved=await run.readArtifact(failed.resultRef),failure=saved.value.failedWorkOrders?.[0];
    if(saved.value.failedWorkOrders?.length!==1||failure.error?.code!=='ROSTER_WORKFLOW_NATIVE_SELECTION_INVALID')
      throw Error('UNEXPECTED_ORDER_SOURCE_CONTRACT_STOP');
    let currentError;
    try{compileRosterWorkflowExperimentV1({order:failure.order,scope:current.scope,namespace:'source-contract-diagnostic',evidenceDirectory:current.evidence});}
    catch(error){currentError={code:error.code||error.message,detail:error.detail??null};}
    if(!currentError?.detail?.issues?.some(i=>i.code==='receipt_evidence_number_does_not_exist'))
      throw Error('CONCRETE_SOURCE_CONTRACT_FIX_REQUIRED');
    const id=failed.id+':order-repair0';
    if(!current.work.some(w=>w.id===id))await run.enqueue([{id,role:failed.role,bindings:failed.bindings,
      orderRepairOf:failed.id,orderRepairGeneration:4,orderRepairLimit:4,
      controlledRecovery:{reason:'v572 actual82 source-contract diagnostic and inherited-failed-parent RED/GREEN passed; one standing-authorized continuation',historyReset:false},
      inputs:{task:{source:'literal',value:{failedOrder:failure.order,error:currentError,originalError:failure.error,
        instruction:'One authorized continuation after a concrete feedback fix. Correct only this work order. The previous binding referenced a nonexistent receipt evidenceNumber; use a literal selection.fromStepId for an earlier inspect, or a saved sourceEvidenceNumber. A future unknown menu requires an inspect-only batch then a model choice, not a guessed index. The inherited parent was rejected; geometry application is not deployment. Read the intended pre-deploy inspect if necessary. Keep the original question, saved successful evidence and model-owned parameters. Do not fabricate successful arrival or replay successful actions.'}},
        draft:{source:'evidence',id:`draft:r${current.draftRevision}:summary`,pointer:''},tools:{source:'literal',value:run.tools()}}}]);
  }
  if(process.argv.includes('--resolve-review')){
    const revision=(await run.currentDraft()).revision;
    console.log(JSON.stringify({stage:'p5-resolution-scheduled',...await run.resolveFinalReviews()}));
    for(let tick=0;tick<observationQuanta;tick++){
      const step=await run.advance({concurrency:2});
      console.log(JSON.stringify({stage:'p5-resolution',tick,revision:step.state.draftRevision,
        work:step.ran.map(w=>({id:w.id,status:w.status}))}));
      if(step.state.draftRevision>revision||step.state.work.some(w=>w.status==='needs_repair')||!step.ran.length)break;
    }
  }
  if(process.argv.includes('--final-review')){
    const scheduled=await run.requestFinalReviews();
    console.log(JSON.stringify({stage:'p5-final-review-scheduled',scheduled:scheduled.scheduled,
      mechanicalReady:scheduled.readiness.mechanicalReady,blockers:scheduled.readiness.mechanicalBlockers}));
    if(scheduled.readiness.mechanicalReady)for(let tick=0;tick<24;tick++){
      const step=await run.advance({concurrency:2});
      const reviews=step.state.work.filter(w=>w.role==='roster_workflow_final_review'&&w.draftRevision===step.state.draftRevision);
      console.log(JSON.stringify({stage:'p5-final-review',tick,work:step.ran.map(w=>({id:w.id,status:w.status}))}));
      if(reviews.some(w=>w.status==='needs_repair')||reviews.length&&reviews.every(w=>w.status==='evidence_ready')||!step.ran.length)break;
    }
  }
  const current=await run.currentDraft();
  await save('p4-result-'+suffix+'.json',{calls,startingRevision:draft.revision,currentDraft:current,
    readiness:await run.readiness(),finalAssessment:await run.finalAssessment(),mutationProof:run.mutationProof(),gameStarted:false});
  console.log(JSON.stringify({stage:'p4-saved',dir,revision:current.revision,calls:calls.length}));
}catch(error){await save('p4-failure-'+suffix+'.json',{code:error.code||error.message,calls});console.error(error);process.exitCode=1;}
finally{await adapter?.close();}
