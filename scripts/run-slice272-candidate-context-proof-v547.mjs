// P3 capability proof, NOT recovery of an exhausted production inquiry and
// NOT final Plan acceptance. Model owns the alternative and scene assumptions.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRosterPlanningProductModuleV1} from '../packages/product-composition/roster-planning-product-module-v1.mjs';
import {createRosterPlanningSecureDeliberationFactoryV1,projectRosterProviderInstructionsV1} from '../packages/roster-planning-workspace/roster-planning-secure-deliberation-factory-v1.mjs';
import {encodeRosterProviderInputV1} from '../packages/roster-strategist/roster-prompt-evidence-encoding-v1.mjs';
const root=process.cwd(),sourceRun=path.resolve(process.argv[2]);
const sourceBase=path.join(sourceRun,'workspace/decision-workflows/p4-from-empty');
const saved=JSON.parse(await fs.readFile(path.join(sourceBase,'workflow.json'),'utf8'));
const draft=JSON.parse(await fs.readFile(path.join(sourceBase,'artifacts',saved.draftRef+'.json'),'utf8'));
const config=JSON.parse(await fs.readFile(path.join(root,'build/ticket-23-three-arm-performance-baseline-20261010-v1/common-v79-plan-recovery-config.private.json'),'utf8'));
const resumeAt=process.argv.indexOf('--resume');
const dir=resumeAt<0?await fs.mkdtemp(path.join(root,'build/slice272-candidate-model-v547-')):path.resolve(process.argv[resumeAt+1]);
if(!dir.startsWith(path.join(root,'build/slice272-candidate-model-v547-')))throw Error('CAPABILITY_PROOF_PATH_REQUIRED');
const suffix=resumeAt<0?'':'-continued-'+Date.now();
const save=(name,value)=>fs.writeFile(path.join(dir,name),JSON.stringify(value,null,2),{flag:'wx'});
let adapter,sequence=Math.max(0,...(await fs.readdir(dir)).filter(n=>/^\d+\.request\.json$/.test(n)).map(n=>Number(n.split('.')[0])));const numbers=new Map(),calls=[];
console.log(JSON.stringify({stage:'initializing',dir}));
try{
  adapter=await createRosterPlanningSecureDeliberationFactoryV1();
  const product=await createRosterPlanningProductModuleV1({root,fixtureRoot:config.fixtureRoot,dataDirectory:path.join(dir,'workspace'),
    mapConfiguration:JSON.parse(await fs.readFile(config.mapConfigurationFile,'utf8')),deliberationFactory:adapter.factory});
  const run=await product.openDecisionWorkflow({runId:'candidate-capability',candidateInput:draft.candidateInput,
    setup:{sideKey:draft.candidateInput.sideKey,missionBinding:draft.provenance.missionBinding},
    onEvent:e=>fs.appendFile(path.join(dir,'provider-events.jsonl'),JSON.stringify(e)+'\n'),
    onRequest:async request=>{const number=++sequence;numbers.set(request.contextHash,number);const encoded=encodeRosterProviderInputV1(request,'same_request_evidence_v1');
      await save(number+'.request.json',{request,providerInstructions:projectRosterProviderInstructionsV1({request,runKind:'teach-framework'}),encodedProviderInput:encoded.input,isExactPromptContent:true});
      console.log(JSON.stringify({stage:'dispatching',number,role:request.roundKind,inputCharacters:encoded.afterCharacters}));},
    onReply:async reply=>{const number=numbers.get(reply.receipt.contextHash);if(!number)throw Error('UNBOUND_REPLY');await save(number+'.reply.json',reply);
      calls.push({number,usage:reply.receipt.usage,latencyMs:reply.receipt.latencyMs});console.log(JSON.stringify({stage:'returned',...calls.at(-1)}));},
    onTool:async value=>{await fs.appendFile(path.join(dir,'tools.jsonl'),JSON.stringify(value)+'\n');console.log(JSON.stringify({stage:'tool',operation:value.operation,status:value.status,contextRef:value.contextRef??null}));},
  });
  await run.initializeDraft({candidateInput:draft.candidateInput,plan:null,provenance:draft.provenance,mode:'editable',planId:'candidate-capability-not-final'});
  const revalidateAt=process.argv.indexOf('--revalidate-role-reply');
  if(revalidateAt>=0)await run.revalidateRoleReply({workId:process.argv[revalidateAt+1],
    reason:'v551 concrete new-workflow fix: explicit evidence reads are not empty final work; the output-field discriminator alias is projected without changing any work order. Complete state-reference metadata is available at the same source paths. Revalidate saved paid reply once, preserve failed history/counters and original artifacts; no Provider replay.'});
  const repairAt=process.argv.indexOf('--resume-tool-repair');
  const continueAt=process.argv.indexOf('--continue-experiment');
  if(continueAt>=0){
    const previousWorkId=process.argv[continueAt+1];
    await run.continueExperiment({previousWorkId,id:`${previousWorkId}:owned-question-v557`});
  }
  const reasonAt=process.argv.indexOf('--resume-reason');
  if(repairAt>=0)await run.resumeToolRepair({workId:process.argv[repairAt+1],
    reason:reasonAt>=0?process.argv[reasonAt+1]:'v552 concrete P2/P3 fix: invalid-order correction now receives exact executed parent dependencies through recorded narrow evidence reads. Actual32 failure reproduced then passed once. One standing authorized extra recovery; no source replay or counter/fee reset.'});
  if(process.argv.includes('--compare-baseline')){
    const current=await run.inspect(),summaryId='completed-candidate-combat-summary-v556';
    const success=current.work.findLast(work=>work.role==='roster_workflow_tool'&&work.status==='evidence_ready'
      &&work.inputs.request?.value?.operation==='threat_exchange');
    if(!success)throw Error('COMPLETED_CANDIDATE_COMBAT_REQUIRED');
    const value=(await run.readArtifact(success.resultRef)).value;
    if(value.receipt?.resultStatus!=='ok'||!value.receipt.exchange?.attackEstimates?.length)
      throw Error('REAL_NATIVE_ATTACK_ESTIMATES_REQUIRED');
    if(!current.work.some(work=>work.id===summaryId))await run.summarizeExperiment({id:summaryId,
      toolWorkIds:[success.id],question:'请用中文解释本次已实际执行的攻击估计：提取与单位选择相关的具体数值、贡献模型数、反击尚未查询等边界。它只证明备选的条件火力，不证明三Medic比两Medic更好或更差；不要重查已成功场景。'});
    if(!current.work.some(work=>work.id==='baseline-same-conditions-comparison-v556'))await run.requestExperiment({
      id:'baseline-same-conditions-comparison-v556',inputs:{
        newFacts:{source:'work',id:summaryId,pointer:'/value'},candidate:{source:'evidence',id:'selected-candidate',pointer:''}},
      question:{goal:'P3的备选原生查询已成功，下一是与当前原表的同条件比较，不是重做原来的失败分支。复用已保存候选、合法几何和火力回执，选择并执行必要的原表对照，比较至少一个与3Medic/2Medic及其替代投资相关的实际量化差异。',
        comparison:'原表2000矿；备选实际1790矿，并将一队Marauder改小、增加Marine、减少Medic。必须说明这些混杂因素，不能只查两边共有而构成相同的单位就声称比较了替换收益。可选择局部相关场景，但要显式纳入所比较的变化；不要将遗漏单位当作没有该单位。预算尚未用满的备选不是最终准出军表。',
        protocol:'正式源为contextRef=null，备选源不同；原表与备选使用相同冻结对手/地图/任务，单位数量不同不能直接把另一源的模型ID复制过去。复用实际可读位置/来源并由原生工具验证，各条件由你明确选择。使用完整stateRef绑定，不手写回执。已有完整场景无需再次解决其旧失败；量化反击若未查询，不当作0。',
        finish:'给出中文事实比较、是否支持保留/修改原选择及其公开理由；还缺必要事实就查，不能把条件未知改为通过。不改正式军表、不启动对局，不恢复已用尽的旁支。'}});
  }
  if(resumeAt<0){
  await run.publishEvidence({id:'selected-candidate',kind:'proposal',title:'Actual retained 2000-point draft, not final accepted strategy',bindings:{},conditions:['Read-only prior draft fixture; no authority to edit it in this capability proof'],value:{candidateInput:draft.candidateInput,publicSummary:draft.plan?.publicSummaryText}});
  const menu=run.builderChoices({scaleId:draft.candidateInput.scaleId,factionRecordKey:draft.candidateInput.factionRecordKey,mineralBudget:draft.candidateInput.mineralBudget});
  await run.publishEvidence({id:'builder-menu',kind:'tool_receipt',title:'Frozen eligible roster choices; Native audit still required',bindings:{},conditions:['Source choices only, not strategy rankings'],value:menu});
  await run.prepareStrategyResources({ownFactionRecordKey:draft.candidateInput.factionRecordKey,opponentFactionRecordKey:'tactical_cards:kerrigan_s_swarm'});
  await run.requestExperiment({id:'alternative-roster-native-comparison',question:{
    goal:'新P3能力试验：当前实际2000分草案有3个Medic。请依据Skill/来源，自己选择一个保留2个Medic并使用剩余预算的合法备选，使用candidate_context创建私有原生上下文，比较至少一项与取舍直接相关的实际对抗/损失或支援能力结果。先选择备选和必要条件，再用工具查证，不手写工具结论。',
    protocol:'compare_armies仅审核费用和合法性，不模拟战斗。candidate_context可以建立备选原生源，返回contextRef；后续查询必须显式带该contextRef，并用inspect的实际单位/动作域。场景假设、参与者、位置由你选择，同条件对照；可以用最小相关场景控制变量，但必须解释其局限，不把局部实验当全局胜率。军表/Plan不在本试验修改。',
    finish:'提交真正可执行的工作单并观察工具结果。需进一步选择武器/位置时分块继续；最终中文汇总说明原表和备选差异、实际查询数值/范围、哪些结论成立及边界。不要求强行声称备选更好。工具能力不足要明确具体缺口，不能编造unknown数值或将未知当通过。',
  },inputs:{candidate:{source:'evidence',id:'selected-candidate',pointer:''}}});
  }else if(!(await run.inspect()).work.some(w=>w.id==='comparison-after-source-setup')){
    const summary=(await run.inspect()).work.findLast(w=>w.role==='roster_workflow_fact_summary'&&w.status==='evidence_ready');
    if(!summary)throw Error('RETAINED_FACT_SUMMARY_REQUIRED');
    await run.requestExperiment({id:'comparison-after-source-setup',question:{
      goal:'继续同一个P3能力试验：已由你选出合法的2Medic备选上下文，但尚未执行实际对抗比较。复用已保存候选与上下文，不重新生成、不重放已成功实验。请明确选择该contextRef查询真实备选，然后设计并实际执行同条件对照来回答至少一项与原3Medic取舍相关的问题。',
      correction:'当前工具合同已统一列出每个操作的contextRef；显式绑定可以直接提供这个可选参数，不必再重复null占位。旧inspect读取的是正式源而不是备选，不能作为备选证明；旧错误记录保持原样。原生回执以真实来源为准。',
      scope:'局部场景和备选构成都是你选择的假设。旧备选实际1790矿而不是声称剩80矿，要解释预算/构成差异的混杂影响，必要时通过真实菜单改选可比较备选。不要把合法/建场景作为已完成战损比较，也不要从这次局部比较推断全局胜率。先进行所需查询，随后根据真实结果继续后继实验选择。',
    },inputs:{candidate:{source:'evidence',id:'selected-candidate',pointer:''},previousFacts:{source:'evidence',id:'role:'+summary.id,pointer:''}}});
  }
  for(let tick=0;tick<60;tick++){
    const advanced=await run.advance({concurrency:2});
    console.log(JSON.stringify({stage:'boundary',tick,work:advanced.ran.map(w=>({id:w.id,status:w.status}))}));
    if(advanced.state.work.some(w=>w.status==='needs_repair')||!advanced.ran.length)break;
  }
  const state=await run.inspect();
  await save('result'+suffix+'.json',{schema:'candidate_context_model_capability_proof_v1',sourceRun,sourceDraftRef:saved.draftRef,calls,
    experimentOutcomes:await run.experimentOutcomes(),
    work:state.work.map(w=>({id:w.id,role:w.role,status:w.status,resultRef:w.resultRef})),formalPlanAccepted:false,gameStarted:false});
  console.log(JSON.stringify({stage:'saved',dir,knownCalls:calls.length}));
}catch(error){await save('failure'+suffix+'.json',{code:error.code||error.message,knownCalls:calls});console.error(error);process.exitCode=1;}
finally{await adapter?.close();}
