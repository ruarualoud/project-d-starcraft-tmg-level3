// Real A read loop: a static-formation result was incorrectly sought in inspect.
// Replay the role boundary in memory with injected replies, never real Provider.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const [root,out]=process.argv.slice(2),copy=structuredClone;
const read=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const work=state.work.find(w=>w.operationState?.correction?.originalReplyRef==='1fa6e57eab081279240af5174a19b7972e15d4820bc4eaf9818d2a90a792a1c9');
assert.ok(work,'Exact observed static-menu read-loop work must exist');
const saved=await read(work.operationState.calls.at(-1).requestRef);
const assignment=copy(saved.promptNodes.find(n=>n.kind==='workflow_role_assignment'));
assignment.evidenceDirectory=state.evidence.map((e,i)=>({...copy(e),number:i+1}));
const original=JSON.stringify(work),checks=[];
function harness(output=null){
  const memory=new Map();let captured=null,checkpoint=null,reads=0;
  const store={load:async()=>copy(state),get:async ref=>memory.has(ref)?copy(memory.get(ref)):read(ref),
    put:async value=>{const ref=hash(value);memory.set(ref,copy(value));return ref;}};
  const marker=Error('CAPTURE_ONLY');
  const role=createRosterWorkflowReadRoleExecutorV1({store,sessionId:saved.sessionId,
    onRequest:async q=>{captured=q;if(!output)throw marker;},
    deliberation:{deliberate:async q=>({output:copy(output),receipt:{sessionId:q.sessionId,
      roundIndex:q.roundIndex,roundKind:q.roundKind,contextHash:q.contextHash,
      outputHash:hash(output),outputContractRef:q.responseFormat.outputContractRef,fixture:true}})}});
  return {marker,get captured(){return captured;},get checkpoint(){return checkpoint;},get reads(){return reads;},
    run:()=>role(copy(assignment),{operationState:copy(work.operationState),
      checkpointOperation:async o=>{checkpoint=copy(o);},readEvidence:async()=>{reads++;throw Error('UNEXPECTED_NEW_SOURCE_READ');}})};
}
try{
  const probe=harness();await assert.rejects(probe.run(),e=>e===probe.marker);
  const request=probe.captured,actions=request.responseFormat.schema.properties.action.enum;
  assert.ok(actions.includes('finish'),'A nonexistent static solver result needs a preparation-query exit, not an endless read-only stage');
  assert.ok(!actions.includes('read')&&!actions.includes('catalogue'),'Spent preparation window must not be reopened by menu navigation');
  const stage=request.promptNodes.find(n=>n.kind==='required_choice_menu_preparation');
  assert.ok(stage);assert.equal(stage.issues[0].expectedOperation,'formation_scene');
  assert.equal(stage.issues[0].expectedSelectionKind,'formation');
  assert.deepEqual(stage.issues[0].producer,{operation:'spatial',queryKinds:['space.solve_static_formation']});
  assert.equal(stage.issues[0].acceptanceGranted,false);
  assert.equal(request.promptNodes.find(n=>n.kind==='experiment_evidence_window').phase,'synthesize');
  assert.ok(!request.promptNodes.some(n=>n.kind==='required_choice_menu_read'));
  checks.push({name:'actual-cold-read-loop-has-typed-producer-exit',pass:true});
  const failure=await read('29a9e36c3979b5a661a9eaa9fd9d5238bd4f3283d2f8ccf45d77da1288418375');
  const originalOrder=failure.value.failedWorkOrders[0].order;
  const order={...copy(originalOrder),steps:[copy(originalOrder.steps[0])],completionStepId:''};
  const output={action:'finish',reads:[],catalogueQueries:[],workOrders:[order],unresolvedQuestions:[],
    conclusion:null,publicReason:'Request only the originally selected bounded static solver on its saved parent. No option has been selected or applied; inspect does not generate static formations.'};
  const prepare=harness(output),result=await prepare.run();
  assert.equal(result.value.workOrders?.length,1,JSON.stringify(result));
  assert.equal(result.value.failedWorkOrders?.length,0,JSON.stringify(result));
  assert.equal(result.value.acceptanceGranted,false);assert.equal(prepare.reads,0);
  checks.push({name:'injected-query-only-method-accepted-without-native-or-model-call',pass:true});
  const wrong=copy(output);wrong.workOrders=[{...copy(order),steps:[{
    stepId:'wrong-choice',operation:'formation_scene',argumentsJson:JSON.stringify({selections:[{sourceEvidenceNumber:790,optionIndex:0}]}),
    bindings:[],guards:[],publicReason:'Deliberately invalid selected source for negative test'}]}];
  const rejected=harness(wrong);await rejected.run();
  assert.ok(rejected.checkpoint.correction.errors.some(e=>e.code==='menu_preparation_requires_producer_only'));
  const repeated=harness({...copy(output),action:'read',workOrders:[],reads:[{evidenceNumber:790,pointer:''}]});
  await repeated.run();assert.ok(repeated.checkpoint.correction.errors.some(e=>e.code==='schema'));
  assert.equal(repeated.reads,0);assert.equal(JSON.stringify(work),original);
  checks.push({name:'no-application-or-infinite-read-waiver-and-original-kept',pass:true});
  const report={pass:true,checks,workId:work.id,actualReadLoopTurns:work.operationState.turn,
    providerCalls:0,nativeCalls:0,productionWrites:0,formalPlanAccepted:false,
    excludes:'Actual solver success, strategic comparison and complete Teach acceptance'};
  await fs.writeFile(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}catch(error){const report={pass:false,checks,error:error.message,stack:error.stack?.split('\n').slice(0,7)};
  await fs.writeFile(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));process.exitCode=1;}
