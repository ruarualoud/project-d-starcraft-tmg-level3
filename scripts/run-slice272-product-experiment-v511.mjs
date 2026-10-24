// Actual P3 client of the product composition entry. This is a new isolated
// Run, never a replay/resumption of the old investigation or an A-F live game.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRosterPlanningProductModuleV1} from '../packages/product-composition/roster-planning-product-module-v1.mjs';
import {deriveRosterWorkspaceCandidateInputV1} from '../packages/roster-planning-workspace/roster-planning-workspace-service-v1.mjs';
import {createRosterPlanningSecureDeliberationFactoryV1,projectRosterProviderInstructionsV1}
  from '../packages/roster-planning-workspace/roster-planning-secure-deliberation-factory-v1.mjs';
import {encodeRosterProviderInputV1} from '../packages/roster-strategist/roster-prompt-evidence-encoding-v1.mjs';
const root=process.cwd();
const resumeIndex=process.argv.indexOf('--resume');
const dir=resumeIndex>=0?path.resolve(process.argv[resumeIndex+1]):await fs.mkdtemp(path.join(root,'build/slice272-product-experiment-v511-'));
if(!dir.startsWith(path.join(root,'build/slice272-product-experiment-v511-')))throw Error('NEW_WORKFLOW_RUN_PATH_REQUIRED');
const config=JSON.parse(await fs.readFile(path.join(root,'build/ticket-23-three-arm-performance-baseline-20261010-v1/common-v79-plan-recovery-config.private.json'),'utf8'));
const original=JSON.parse(await fs.readFile(path.join(root,'build/slice272-role-workflow-prototype-v502-r5-20261019/decision.request.json'),'utf8'));
const plan=original.request.promptNodes.find(n=>n.kind==='current_full_plan_not_validated').plan;
const candidateInput=deriveRosterWorkspaceCandidateInputV1(plan.rosterCandidate);
const save=(name,v)=>fs.writeFile(path.join(dir,name),JSON.stringify(v,null,2),{flag:'wx'});
const existingNumbers=(await fs.readdir(dir)).filter(n=>/^\d+\.request\.json$/u.test(n)).map(n=>Number(n.split('.')[0]));
let adapter,sequence=Math.max(0,...existingNumbers);const calls=[],requestNumbers=new Map();
const passLabel=resumeIndex>=0?`-resume-${Date.now()}`:'';
console.log(JSON.stringify({stage:'initializing_product',dir}));
try{
  adapter=await createRosterPlanningSecureDeliberationFactoryV1();
  const product=await createRosterPlanningProductModuleV1({root,fixtureRoot:config.fixtureRoot,dataDirectory:path.join(dir,'workspace'),
    mapConfiguration:JSON.parse(await fs.readFile(config.mapConfigurationFile,'utf8')),deliberationFactory:adapter.factory});
  const run=await product.openDecisionWorkflow({runId:'p3-counterfactual-scoring',candidateInput,planHash:plan.planHash,
    setup:{sideKey:plan.sideKey,missionBinding:plan.provenance.missionBinding},
    onEvent:e=>fs.appendFile(path.join(dir,'provider-events.jsonl'),JSON.stringify(e)+'\n'),
    onRequest:async request=>{const number=++sequence,encoded=encodeRosterProviderInputV1(request,'same_request_evidence_v1');
      requestNumbers.set(request.contextHash,number);
      await save(`${number}.request.json`,{request,providerInstructions:projectRosterProviderInstructionsV1({request,runKind:'teach-framework'}),encodedProviderInput:encoded.input,isExactPromptContent:true});
      console.log(JSON.stringify({stage:'dispatching',number,kind:request.roundKind,inputCharacters:encoded.afterCharacters}));},
    onReply:async reply=>{const number=requestNumbers.get(reply.receipt.contextHash);if(!number)throw Error('REQUEST_OBSERVATION_NOT_FOUND');
      await save(`${number}.reply.json`,reply);calls.push({number,contextHash:reply.receipt.contextHash,usage:reply.receipt.usage,latencyMs:reply.receipt.latencyMs,receiptHash:reply.receipt.receiptHash});
      console.log(JSON.stringify({stage:'returned',...calls.at(-1),action:reply.output.action}));},
    onTool:async value=>{await fs.appendFile(path.join(dir,'tools.jsonl'),JSON.stringify(value)+'\n');
      console.log(JSON.stringify({stage:'tool_completed',operation:value.operation,status:value.status,receiptHash:value.receipt?.receiptHash??null}));},
  });
  await run.prepareContext();await run.advance({concurrency:2});
  await run.publishPlan(plan);
  if(!(await run.inspect()).work.some(w=>w.id==='compare-marker-patterns'))await run.requestExperiment({id:'compare-marker-patterns',question:{
    question:'围绕当前 Plan 的条件计分路线，设计并实际查询至少两种有战略意义的标记控制模式；自己选择变化的点和回合，并说明比较的目的。计算实际规则下逐回合/累计 marker VP，不要自行填写得分或声称这些控制模式必然可达。',
    boundaries:'这是条件计分实验，不启动实际对局、不改表/Plan、不执行部署，不包含击杀分；进场路线证据不构成本算术查询的数据依赖。保留原Plan作为被检验假设。'},
    inputs:{mathContracts:{source:'evidence',id:'tool:discovery:context',pointer:'/receipt/capabilities/mathContracts'},
      missionAuthority:{source:'evidence',id:'tool:discovery:scoring',pointer:'/receipt'},
      originalScoringPlan:{source:'evidence',id:'plan:scoreRoute',pointer:''}}});
  // Observation quantum only; completed tool results are retained across reads
  // and caller advances. No retry of failed/unknown Provider dispatches here.
  async function settle(){for(let tick=0;tick<12;tick++){
      const result=await run.advance({concurrency:2});
      if(result.state.work.some(w=>w.status==='needs_repair'))break;
      if(!result.ran.length||result.state.work.every(w=>w.status==='evidence_ready'))break;
    }}
  await settle();
  if(process.argv.includes('--native')){
    if(!(await run.inspect()).work.some(w=>w.id==='prepare-native-branch'))await run.requestExperiment({id:'prepare-native-branch',
      question:'按实际 firstRoundInitialization 合同，只准备一个保留原军表/地图/预备队的私有 start_of_round 分支，然后 inspect 这个分支。不要执行任何 Native 动作，不要选择先手，不要猜测尚未见到的 actionKey。准备结果到 inspect 的 base 必须用工作单 binding 传递。',
      inputs:{construction:{source:'evidence',id:'tool:discovery:context',pointer:'/receipt/scenarioConstruction'}}});
    await settle();
    const prepared=await run.inspect();
    let inspectWork;
    for(const work of prepared.work.filter(w=>w.id.startsWith('prepare-native-branch:')&&w.role==='roster_workflow_tool'&&w.status==='evidence_ready')){
      const r=await run.readArtifact(work.resultRef);if(r.value.operation==='inspect')inspectWork=work;
    }
    if(inspectWork&&!prepared.work.some(w=>w.id==='native-round-start')){
      await run.requestExperiment({id:'native-round-start',question:'对刚 inspect 的私有分支，选择其中实际存在的 resolve_mission_start_of_round 动作执行一次，再 inspect 后态。只验证该初始化动作；停在必须选择先手之前，不选 choose_first_actor、不部署、不Pass。动作选择必须来自这份真实菜单，后态检查的 base 用 binding 引用新结果。',
        inputs:{actions:{source:'evidence',id:`tool:${inspectWork.id}`,pointer:'/receipt/actionSpace'},
          parent:{source:'evidence',id:`tool:${inspectWork.id}`,pointer:'/receipt/baseStateHash'},
          phase:{source:'evidence',id:`tool:${inspectWork.id}`,pointer:'/receipt/phase'},
          actor:{source:'evidence',id:`tool:${inspectWork.id}`,pointer:'/receipt/activeSideKey'}}});
      await settle();
    }
  }
  if(process.argv.includes('--receipt-view')){
    const id='native-round-start:scoped-summary-v514';
    if(!(await run.inspect()).work.some(w=>w.id===id))await run.summarizeExperiment({id,
      question:'仅核对已执行的私有回合初始化动作及后态：执行了什么、当前阶段/行动方、下一步有哪些选择、是否已经选择先手。区分原生结果和假设；不要据此声称部署/抵达或控点已实现。不重跑工具。',
      toolWorkIds:['native-round-start:order0:resolve-mission-start','native-round-start:order0:inspect-post-state']});
    await settle();
  }
  const state=await run.inspect(),outputs=[];
  for(const work of state.work)if(work.resultRef)outputs.push({workId:work.id,role:work.role,status:work.status,result:await run.readArtifact(work.resultRef)});
  await save(`outputs${passLabel}.json`,outputs);await save(`result${passLabel}.json`,{status:state.work.every(w=>w.status==='evidence_ready')?'completed':'held',dir,calls,
    jobs:state.work.map(w=>({id:w.id,role:w.role,status:w.status,failure:w.failure??null})),
    productEntry:'createRosterPlanningProductModuleV1/openDecisionWorkflow',liveGameActions:0,
    privateNativeTransitions:[...new Map(outputs.map(o=>o.result.value?.receipt).filter(r=>r?.nativeTransitionsApplied)
      .map(r=>[r.receiptHash,r])).values()].reduce((n,r)=>n+r.nativeTransitionsApplied,0),
    mutationProof:run.mutationProof(),formalPlanMutations:0,armyMutations:0,
    originalPlanHash:plan.planHash,scope:state.scope,acceptanceGranted:false,fullGenerationProven:false});
  console.log(JSON.stringify({stage:'finished',dir,calls:calls.length,jobs:state.work.map(w=>({id:w.id,status:w.status}))}));
}catch(error){await save(`failure${passLabel}.json`,{code:error.code||error.message,detail:error.detail??null,calls,unknownCostRetained:true});console.error(error);process.exitCode=1;}
finally{await adapter?.close?.();}
