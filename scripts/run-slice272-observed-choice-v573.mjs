// Real P3 capability proof via the product Run. Archived failed lanes stay
// stopped; this independently tests the fixed observe -> choose -> act protocol.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRosterPlanningProductModuleV1} from '../packages/product-composition/roster-planning-product-module-v1.mjs';
import {createRosterPlanningSecureDeliberationFactoryV1,projectRosterProviderInstructionsV1} from '../packages/roster-planning-workspace/roster-planning-secure-deliberation-factory-v1.mjs';
import {encodeRosterProviderInputV1} from '../packages/roster-strategist/roster-prompt-evidence-encoding-v1.mjs';
const root=process.cwd(),dir=path.resolve(process.argv[2]),base=path.join(dir,'workspace/decision-workflows/projection-owner');
if(!dir.startsWith(path.join(root,'build/slice272-projection-owner-v565-')))throw Error('CURRENT_NEW_RUN_REQUIRED');
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const state=await read(path.join(base,'workflow.json')),draft=await read(path.join(base,'artifacts',state.draftRef+'.json'));
const config=await read(path.join(root,'build/ticket-23-three-arm-performance-baseline-20261010-v1/common-v79-plan-recovery-config.private.json'));
const save=(name,value)=>fs.writeFile(path.join(dir,name),JSON.stringify(value,null,2),{flag:'wx'});
const supplyOnly=process.argv.includes('--supply');
const id=supplyOnly?'p3-native-arrival-supply-proof-v576':'p3-observed-menu-arrival-proof-v573',numbers=new Map(),calls=[];
let sequence=Math.max(0,...(await fs.readdir(dir)).filter(n=>/^\d+\.request\.json$/.test(n)).map(n=>parseInt(n))),adapter;
console.log(JSON.stringify({stage:'initializing',dir,id}));
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
  if(!(await run.inspect()).work.some(w=>w.id===id)){
    const evidence=number=>state.evidence[number-1]?.id;
    if(!(supplyOnly?[279,342,343]:[279,290,295]).every(n=>/^tool(?:-view)?:/.test(evidence(n))))throw Error('EXACT_SAVED_NATIVE_SOURCES_REQUIRED');
    if(supplyOnly)await run.requestExperiment({id,inputs:{
      beforeState:{source:'evidence',id:evidence(279),pointer:'/stateRef'},
      afterState:{source:'evidence',id:evidence(343),pointer:'/stateRef'},
      arrivalEvents:{source:'evidence',id:evidence(342),pointer:'/receipt/nativeEvents'},
    },question:{
      goal:'补齐同一次已成功Marine1进场的Supply核对：用当前产品inspect读取同一前态与后态，确认两侧部署容量/已上场/可用Supply及Marine1的Current Supply。不重做部署，不改军表/Plan，不启动对局。',
      interface:'inspect已接入与Native部署合法性完全相同的计算，返回deploymentSupplyBySide和availableUnits[].currentSupply。原旧inspect记录未包含此新字段，应对所给两个精确stateRef各做一次新的只读inspect，不能把旧记录缺字段当事实未知，也不能用空动作菜单推断Supply。两条独立查询可同批。',
      verification:'依据实际返回比较前后容量、committed与available。区分Current Supply、Supply Pool贡献与任务控制Supply。没有实际数据就不能声称已核对；这项任务必须回答Supply差值，不能把它列未证后仍说answered。',
      finish:'给中文结论并引用两份新Native查询原件，交独立来源/问题覆盖审核。此结论只闭合本次条件进场资源事实，不证明全表到达、最早轮次、控点或策略优势。'}});
    else await run.requestExperiment({id,inputs:{
      originalMenu:{source:'evidence',id:evidence(279),pointer:'/receipt/actionSpace'},
      originalState:{source:'evidence',id:evidence(279),pointer:'/stateRef'},
      solvedFormation:{source:'evidence',id:evidence(290),pointer:'/receipt/queryReceipt/result'},
      geometryState:{source:'evidence',id:evidence(295),pointer:'/stateRef'},
    },question:{
      goal:'P3新调度能力真实验证：依据已返回的原生菜单和队形证据，选择并实际执行u_marine_1的合法进场，再读取后继确认。所有操作在私有实验，不进入对局。不要重启旧纠错链或重做初始化。',
      observedFacts:'originalMenu及originalState是进场前的真实inspect；solvedFormation是该父态的已有静态求解结果；geometryState是后来把队形静态放入场内的分支，不是进场历史。执行时从你已看到的正确菜单选择相关单位与动作，不能猜未来菜单index。几何坐标可以提议为动作参数，仍须Native验证。',
      method:'复用成功证据。必要的真实查询可提出；工作单遇到尚未读到的菜单会先停在正常选择点，工具返回后由你选择。使用sourceEvidenceNumber和真实序号，模型自己决定所有参数。执行成功后读取原生后态，核对单位onTable、位置和Supply变化。',
      conclusion:'给出中文公开结论：哪些进场/几何谓词被实际执行证明，哪些控点/最早到达/全表方案尚未证明。引用实际工具原件，交独立来源审核。不修改正式军表/Plan，也不把单单位成功当全表或最终策略验收。'}});
  }
  for(let tick=0;tick<48;tick++){
    const step=await run.advance({concurrency:1});
    console.log(JSON.stringify({stage:'advance',tick,work:step.ran.map(w=>({id:w.id,status:w.status}))}));
    const outcome=(await run.experimentOutcomes()).find(o=>o.goalId===id);
    if(outcome?.acceptedForStrategy||outcome?.status==='blocked'||step.state.work.some(w=>w.status==='needs_repair')||!step.ran.length)break;
  }
  await save('p3-choice-v573-result-'+Date.now()+'.json',{calls,outcome:(await run.experimentOutcomes()).find(o=>o.goalId===id),
    mutationProof:run.mutationProof(),formalPlanAccepted:false,gameStarted:false});
}catch(error){await save('p3-choice-v573-failure-'+Date.now()+'.json',{code:error.code||error.message,calls});console.error(error);process.exitCode=1;}
finally{await adapter?.close();}
