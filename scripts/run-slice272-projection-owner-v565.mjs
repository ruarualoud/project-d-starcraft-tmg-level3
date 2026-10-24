// New P3/P4 source-interpretation proof after the explicit scene-projection
// capability. Old exhausted work remains immutable; no replay or repair reset.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRosterPlanningProductModuleV1} from '../packages/product-composition/roster-planning-product-module-v1.mjs';
import {createRosterPlanningSecureDeliberationFactoryV1,projectRosterProviderInstructionsV1} from '../packages/roster-planning-workspace/roster-planning-secure-deliberation-factory-v1.mjs';
import {encodeRosterProviderInputV1} from '../packages/roster-strategist/roster-prompt-evidence-encoding-v1.mjs';
import {projectRosterExperimentSourceFactsV1} from '../packages/roster-strategist/roster-experiment-source-facts-v1.mjs';
const root=process.cwd(),sourceRun=path.resolve(process.argv[2]),priorRun=path.resolve(process.argv[3]);
const sourceBase=path.join(sourceRun,'workspace/decision-workflows/p4-from-empty');
const sourceState=JSON.parse(await fs.readFile(path.join(sourceBase,'workflow.json'),'utf8'));
const draft=JSON.parse(await fs.readFile(path.join(sourceBase,'artifacts',sourceState.draftRef+'.json'),'utf8'));
const projection=JSON.parse(await fs.readFile(path.join(root,'build/slice272-scene-projection-v564-result.json'),'utf8'));
const priorBase=path.join(priorRun,'workspace/decision-workflows/candidate-capability');
const prior=JSON.parse(await fs.readFile(path.join(priorBase,'workflow.json'),'utf8'));
let alternative;
for(const work of prior.work.filter(w=>w.role==='roster_workflow_tool'&&w.resultRef)){
  const value=JSON.parse(await fs.readFile(path.join(priorBase,'artifacts',work.resultRef+'.json'),'utf8')).value;
  if(value.operation==='threat_exchange'&&value.receipt?.baseStateHash===projection.referenceStateRef.stateHash
    &&value.receipt?.exchange?.attackEstimates?.length){alternative=value;break;}
}
if(!alternative||!projection.exchange.value.receipt.exchange.attackEstimates.length)throw Error('TWO_REAL_SAVED_EXCHANGES_REQUIRED');
const config=JSON.parse(await fs.readFile(path.join(root,'build/ticket-23-three-arm-performance-baseline-20261010-v1/common-v79-plan-recovery-config.private.json'),'utf8'));
const dir=await fs.mkdtemp(path.join(root,'build/slice272-projection-owner-v565-'));
const save=(name,value)=>fs.writeFile(path.join(dir,name),JSON.stringify(value,null,2),{flag:'wx'});
let adapter,sequence=0;const numbers=new Map(),calls=[];
console.log(JSON.stringify({stage:'initializing',dir}));
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
  await run.initializeDraft({candidateInput:draft.candidateInput,plan:null,provenance:draft.provenance,mode:'editable',planId:'projection-owner-not-final'});
  const sources=[['baseline-fire','原2000分军表：v564新原生火力16条，非此前空结果',projection.exchange.value],
    ['alternative-fire','备选1790分军表：此前已执行原生火力，原件只读复用',alternative],
    ['scene-projection','v564共同场景投影：共同位置、显式重排、排除项与证明边界',projection.projection.value]];
  const inputs={};
  for(const [id,title,value] of sources){
    await run.publishEvidence({id,kind:'tool_receipt',title,bindings:{},conditions:['Immutable capability fixture, not a live battle or final strategy'],value});
    const state=await run.inspect(),evidence=state.evidence.find(e=>e.id===id);
    const indexed=projectRosterExperimentSourceFactsV1({evidence,value});
    await run.publishEvidence({id:id+'-index',kind:'tool_receipt',title:title+'（精确计量索引）',bindings:{},conditions:['Index of the named immutable original; original detail remains readable'],value:indexed});
    inputs[id]={source:'evidence',id:id+'-index',pointer:''};
  }
  await run.requestExperiment({id:'projection-comparison-interpretation',inputs,question:{
    goal:'新P3能力已完成同参照场景的原生投影与两份真实火力回执。本子项只解释这次已执行的局部对照：Marauder从4模型减为2模型，在相同参照位置及所选目标条件下有什么量化代价？这对接受整张1790分备选有何支持或反对、尚不能证明什么？请给中文公开论证，交独立来源核对。',
    scope:'这不是续跑旧耗尽调查，也不是最终Plan准出。原2000分军表与备选1790分混有减Medic、加Marine、缩Marauder和未用预算。投影明确排除了未参与单位；不能由局部火力证明Medic支援、另一队Marine收益、到达路线或全局胜率。不要求本题重新调查这些全局事项；明确说本题不证明即可。',
    method:'先读两份原生计量索引和投影条件，再按需读原件的具体outcomes/assumptions/uncertainty。按同攻击者、同武器、同目标配对，保留样本数与几何适配差异。不要把两边各16条视为内容相同，不加总互斥武器/目标选择。读取已有数据不重算已成功查询，不虚构新表或回执。',
    finish:'输出可核对的定量比较、根据本题证据可支持的局部取舍建议、混杂因素与下一总体决策需要区分的边界。结论引用原生原件，不只引索引。无需修改正式军表、不启动对局。'}});
  for(let tick=0;tick<24;tick++){
    const step=await run.advance({concurrency:1});
    console.log(JSON.stringify({stage:'boundary',tick,work:step.ran.map(w=>({id:w.id,status:w.status}))}));
    const outcomes=await run.experimentOutcomes();
    if(outcomes.some(o=>o.acceptedForStrategy||o.status==='blocked')||step.state.work.some(w=>w.status==='needs_repair')||!step.ran.length)break;
  }
  await save('result.json',{calls,outcomes:await run.experimentOutcomes(),mutationProof:run.mutationProof(),formalPlanAccepted:false,gameStarted:false,
    sourceRun,priorRun,scope:'New P3 projection capability interpretation only, not old repair recovery or global strategy acceptance'});
  console.log(JSON.stringify({stage:'saved',dir,calls:calls.length}));
}catch(error){await save('failure.json',{code:error.code||error.message,calls});console.error(error);process.exitCode=1;}
finally{await adapter?.close();}
