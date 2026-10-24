// Reproduce a real authorized inquiry receiving the broad pre-game contract.
// Scripted Provider replies exercise the product executor; never call a model.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {rosterWorkflowAcceptanceStageV1,rosterReviewCheckPassedV1} from '../packages/roster-strategist/roster-review-data-questions-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const [root,priorFile]=process.argv.slice(2),copy=structuredClone;
const originalText=await fs.readFile(root+'/workflow.json','utf8'),original=JSON.parse(originalText);
const target=original.work.find(w=>w.resultRef==='638669bb0f8511ba997cbbcbb50d6d4dff03dfe031ce92fc3403172a1a4cdfe5');
assert(target,'saved failing coverage request must exist');
const read=async r=>JSON.parse(await fs.readFile(root+'/artifacts/'+r+'.json','utf8'));
const previous=priorFile?JSON.parse(await fs.readFile(priorFile,'utf8')):null,results=[];
async function test(name,fn){const passed=previous?.results.find(r=>r.name===name&&r.pass);
 if(passed){results.push({...passed,inheritedFrom:priorFile});return;}
 try{results.push({name,pass:true,...await fn()});}catch(e){results.push({name,pass:false,error:e.message});}
 console.log(JSON.stringify(results.at(-1)));}
await test('真实授权调查不能被投影为整体赛前审核',async()=>{
 const saved=await read(target.operationState.calls.at(-1).requestRef);
 assert.equal(saved.promptNodes.find(n=>n.kind==='acceptance_stage_contract').stage,'pre_game_roster_plan');
 const stage=rosterWorkflowAcceptanceStageV1(target);
 assert.equal(stage.stage,'current_scoped_strategy_experiment');
 assert.equal(stage.currentAuthorizedMeasurementsRequired,true);
 assert.deepEqual(stage.authorizedInquiry,target.inputs.question.value);
});
await test('职责隔离：事实方法和覆盖审核同范围，逐句审核与总体作者不扩权',async()=>{
 for(const role of ['roster_workflow_experiment_planner','roster_workflow_final_review']){
   const stage=rosterWorkflowAcceptanceStageV1({...copy(target),role});
   assert.equal(stage.currentAuthorizedMeasurementsRequired,true);
   assert.deepEqual(stage.authorizedInquiry.authorization,target.inputs.question.value.authorization);
 }
 for(const role of ['roster_workflow_strategy_decision','roster_workflow_local_teach']){
   assert.equal(rosterWorkflowAcceptanceStageV1({...copy(target),role}).stage,'pre_game_roster_plan');
 }
 const atomic=copy(target);atomic.inputs.question={source:'literal',value:{scope:'one_material_source_assertion'}};
 assert.equal(rosterWorkflowAcceptanceStageV1(atomic).stage,'pre_game_roster_plan');
 const noAuthorization=copy(target);noAuthorization.inputs.question.value.authorization=null;
 assert.equal(rosterWorkflowAcceptanceStageV1(noAuthorization).stage,'pre_game_roster_plan');
});
for(const verdict of ['supported','needs_evidence'])await test(`注入${verdict}但必要比较缺失，实际执行器保留未决且不批准`,async()=>{
 let state=copy(original);const memory=new Map(),requests=[];
 const item=state.work.find(w=>w.id===target.id);item.status='ready';item.operationState=null;item.resultRef=null;item.failure=null;
 const store={load:async()=>copy(state),save:async v=>{state=copy(v);},get:async r=>memory.has(r)?copy(memory.get(r)):read(r),
   put:async v=>{const r=hash(v);memory.set(r,copy(v));return r;}};
 const reply=await read(target.operationState.calls.at(-1).replyRef);
 const execute=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'scripted-inquiry-v833',deliberation:{deliberate:async request=>{
   requests.push(request);
   const stage=request.promptNodes.find(n=>n.kind==='acceptance_stage_contract');
   assert.equal(stage.stage,'current_scoped_strategy_experiment');
   assert.deepEqual(stage.authorizedInquiry.authorization,target.inputs.question.value.authorization);
   const output=copy(reply.output),check=output.checks[0];
   check.verdict=verdict;check.publicReason='模拟故障：已测的是保留同一因素的三个组合，尚未完成原授权的因素替换比较。';
   check.evidenceNumbers=[1213];check.dataQuestions=[{question:target.inputs.question.value.necessaryQuestions[0],
     classification:'necessary_fact',publicReason:check.publicReason,evidenceNumbers:[1213]}];
   return {output,receipt:{contextHash:request.contextHash,roundKind:request.roundKind,sessionId:request.sessionId,
     roundIndex:request.roundIndex,outputHash:hash(output),outputContractRef:copy(request.responseFormat.outputContractRef),
     paidProviderCall:false,trainingTruth:false}};
 }}});
 const workflow=await createRosterDecisionWorkflowV1({store,execute});
 for(let n=0;n<3;n++){
   await workflow.dispatch({type:'run_ready',workIds:[target.id],concurrency:1});
   const current=state.work.find(w=>w.id===target.id);
   if(current.status==='evidence_ready')break;
   assert.equal(current.status,'needs_model_choice',JSON.stringify(current.failure));
   await workflow.dispatch({type:'continue_work',workId:target.id});
 }
 const current=state.work.find(w=>w.id===target.id);assert.equal(current.status,'evidence_ready');
 const check=(await store.get(current.resultRef)).value.checks[0];
 assert.equal(rosterReviewCheckPassedV1(check),false);assert.equal(check.dataQuestions[0].classification,'necessary_fact');
 assert.equal(state.acceptanceGranted,false);assert.equal(state.draftRef,original.draftRef);
 return {scriptedCalls:requests.length,unresolvedQuestions:check.requiredData};
});
assert.equal(await fs.readFile(root+'/workflow.json','utf8'),originalText);
const report={pass:results.every(r=>r.pass),results,providerCalls:0,nativeCalls:0,productionWrites:0,
 boundary:'Proves stage delivery and unresolved-question routing, NOT that arbitrary dishonest semantic claims can be recognized deterministically.'};
const file=`build/slice272-v833-inquiry-stage-${Date.now()}.json`;await fs.writeFile(file,JSON.stringify(report,null,2));
console.log(JSON.stringify({file,...report}));if(!report.pass)process.exitCode=1;
