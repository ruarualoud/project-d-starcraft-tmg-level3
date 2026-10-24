// Reproduce #742's missing executable measurement contract at the actual
// work-order compiler/executor seam. No LLM, Rules call or production writes.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {compileRosterWorkflowExperimentV1,createRosterWorkflowLaboratoryExecutorV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
const reportFile=process.argv[2],prior=process.argv[3]?JSON.parse(await fs.readFile(process.argv[3],'utf8')):null;
const scope={source:'source',rules:'rules',map:'map',army:'army',plan:'plan'};
const bindings={left:{fromEvidenceNumber:1,fromStepId:'',attackerUnitId:'goliath',targetUnitId:'target',weaponName:'Ares'},
  right:{fromEvidenceNumber:2,fromStepId:'',attackerUnitId:'goliath',targetUnitId:'target',weaponName:'Ares'}};
const argumentsValue={metric:'expectedCasualties',operator:'greater_than',minimumDifference:0.25,...bindings};
const directory=[1,2].map((n,i)=>({number:n,id:'tool:'+['left','right'][i],kind:'tool_receipt',bindings:scope}));
const source=(n,value)=>({operation:'threat_exchange',status:'completed',receipt:{resultStatus:'ok',queryId:'observed-'+n,
  exchange:{attackEstimates:[{attackerUnitId:'goliath',targetUnitId:'target',weaponName:'Ares',
    outcomes:{sampleCount:100,expectedCasualties:value,expectedDamage:value*2}}]}}});
const sources={left:source(1,2),right:source(2,3)};
const order=args=>({orderId:'compare',purpose:'比较指定单攻击行的采样估计差，不宣称整局优劣',scenarioAssumptions:['局部条件已固定，另行审核控制条件'],
  experimentScope:{kind:'firepower_comparison',decisionQuestion:'指定攻击行的伤亡估计差是否大于0.25？',decisionImpact:'提供作者选择的局部事实',
    participantUnitIds:['goliath','target'],scenarioDescription:'注入同场景的两个单攻击观测',stopPredicate:'返回差值，不执行新攻击',
    collectScenarioExperience:false,hypothesisTest:null,comparisonBinding:null},
  completionStepId:'difference',stopAndReturnToModelWhen:'返回当前局部比较',steps:[{stepId:'difference',operation:'compare_observations',argumentsJson:JSON.stringify(args),bindings:[],guards:[],publicReason:'用已保存的两条原件做确定算术'}]});
const compile=args=>compileRosterWorkflowExperimentV1({order:order(args),scope,namespace:'test',evidenceDirectory:directory});
const results=[],steps=[];
async function check(id,fn){const passed=prior?.results.find(r=>r.id===id&&r.pass);if(passed){results.push({...passed,inheritedFrom:process.argv[3]});return;}
  try{results.push({id,pass:true,...await fn()});}catch(error){results.push({id,pass:false,error:error.message,stack:error.stack?.split('\n').slice(0,4)});}
  console.log(JSON.stringify(results.at(-1)));}
async function execute(job,overrides={}){
  const artifacts=new Map(),store={put:async value=>{const ref=hash(value);artifacts.set(ref,structuredClone(value));return ref;},
    get:async ref=>structuredClone(artifacts.get(ref)),load:async()=>({scope,work:[],evidence:[]})};
  let operationState={},nativeCalls=0;
  const executor=createRosterWorkflowLaboratoryExecutorV1({store,laboratory:{labDescriptor:()=>({sourceStateHash:'source',rulesRuntimeHash:'rules',builderBundleHash:'builder'}),
    queryThreatExchange:()=>{nativeCalls++;throw Error('MUST_NOT_REPLAY_OBSERVATIONS');}}});
  const inputs=structuredClone(job.inputs);
  for(const [key,input]of Object.entries(inputs))if(input.source==='work')inputs[key]={...input,workId:input.id,resultRef:'saved-'+input.id,
    value:structuredClone(overrides[input.id]??sources[input.id])};
  const assignment={workId:job.id,scope,inputs};
  const control={operationState,checkpointOperation:async value=>{operationState=structuredClone(value);}};
  const result=await executor.execute(assignment,control);
  steps.push({stage:'compile→actual executor',assignment,result,checkpoint:operationState});
  const cold=await executor.execute(assignment,{...control,operationState});
  assert.deepEqual(cold,result,'Restoring a completed comparator cannot recompute or remeasure');
  assert.equal(nativeCalls,0);
  return result;
}

await check('P1P3/source-bound-comparison-is-callable',async()=>{
  const jobs=compile(argumentsValue);assert.equal(jobs.length,1);
  const result=await execute(jobs[0]);
  assert.equal(result.value.receipt.executionStatus,'completed');
  assert.equal(result.value.receipt.observation.referenceValue,2);
  assert.equal(result.value.receipt.observation.candidateValue,3);
  assert.equal(result.value.receipt.observation.difference,1);
  assert.equal(result.value.receipt.predicate.satisfied,true);
  assert.equal(result.value.receipt.observation.interpretation,'sample_point_estimate_difference');
  assert.equal(result.value.receipt.strategyApprovalGranted,false);
  assert.equal(result.value.receipt.hypothesisVerdict,'not_assessed');
});
await check('P1P3/unsupported-combined-volley-rejected-before-execution',async()=>{
  assert.throws(()=>compile({...argumentsValue,metric:'sequential_combined_volley_casualties'}),
    error=>error.code==='ROSTER_MEASUREMENT_METRIC_UNSUPPORTED'&&error.dispatchOutcome==='not_dispatched');
});
await check('P1P3/unknown-or-wrong-participant-is-not-zero',async()=>{
  const [job]=compile(argumentsValue);
  const unknown=await execute(job,{right:{...source(2,0),receipt:{resultStatus:'unknown',unknownReason:'missing_native_query'}}});
  assert.equal(unknown.value.receipt.executionStatus,'source_unresolved');
  assert.equal(unknown.value.receipt.predicate,null);
  assert.equal(unknown.value.receipt.observation,null);
  const mismatch=source(2,3);mismatch.receipt.exchange.attackEstimates[0].targetUnitId='different-target';
  const bad=await execute(job,{right:mismatch});
  assert.equal(bad.value.receipt.executionStatus,'invalid_input');assert.equal(bad.value.receipt.predicate,null);
});
await check('P1P3/handwritten-observation-not-an-argument',async()=>{
  assert.throws(()=>compile({...argumentsValue,referenceValue:999}),error=>error.code==='ROSTER_MEASUREMENT_ARGUMENT_INVALID');
  assert.throws(()=>compile({...argumentsValue,minimumDifference:-1}),error=>error.code==='ROSTER_MEASUREMENT_ARGUMENT_INVALID');
  assert.throws(()=>compile({...argumentsValue,left:{...bindings.left,value:999}}),error=>error.code==='ROSTER_MEASUREMENT_ARGUMENT_INVALID');
});
await fs.writeFile(reportFile,JSON.stringify({passed:results.every(r=>r.pass),providerCalls:0,nativeCalls:0,
  results,steps,productionWrites:0,strategyImprovementProven:false},null,2)+'\n');
console.log(JSON.stringify({reportFile,passed:results.every(r=>r.pass)}));
if(results.some(r=>!r.pass))process.exitCode=1;
