// A selected a branch domain but omitted base; diagnose actual queried state,
// not a speculative wrong weapon. No new Native/model/production calls.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {projectRosterWorkflowToolRepairV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
const [root,out,previous]=process.argv.slice(2),copy=structuredClone;
const get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const saved=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const work=saved.work.find(w=>w.id.endsWith('method:7fe5f74e6c244223:order0:s1_marauder_vs_kerrigan:input-repair'));
const failure=work.inputs.task.value.failure;
const prior=previous?JSON.parse(await fs.readFile(previous,'utf8')):null,checks=[];
async function check(name,fn){const p=prior?.checks.find(c=>c.name===name&&c.pass);if(p){checks.push({...p,inheritedFrom:previous});return;}
  try{checks.push({name,pass:true,...await fn()});}catch(e){checks.push({name,pass:false,error:{message:e.message,stack:e.stack}});}
  await fs.writeFile(out,JSON.stringify({complete:false,checks},null,2)+'\n');console.log(JSON.stringify({...checks.at(-1),...(!checks.at(-1).pass?{error:checks.at(-1).error.message.slice(0,500)}:{})}));}
await check('actual-failed-query-reports-resolved-source-and-no-implicit-scene-selection',()=>{
  const before=JSON.stringify(failure),r=projectRosterWorkflowToolRepairV1(failure);
  assert.equal(r.sourceContract,'pregame_probability_scene_selection_v1');
  assert.equal(r.actualScene.baseStateHash,failure.receipt.baseStateHash);
  assert.equal(r.actualScene.isRootSource,true);assert.equal(r.requestedBase,null);
  assert.equal(r.estimateAvailable,false);assert.equal(r.automaticSceneSelection,false);
  assert.equal(r.requestedDomainId,failure.request.domainId);assert.equal(JSON.stringify(failure),before);
  const explicit=copy(failure);explicit.request.base={kind:'branch',branchStateHash:'explicit-scene'};
  const p=projectRosterWorkflowToolRepairV1(explicit);assert.equal(p.baseWasOmitted,false);
  assert.equal(p.requestedBase.branchStateHash,'explicit-scene');
  const success=copy(failure);success.receipt.resultStatus='ok';success.receipt.unknownReason=null;
  assert.notEqual(projectRosterWorkflowToolRepairV1(success)?.sourceContract,'pregame_probability_scene_selection_v1');
  return {actualSource:failure.receipt.baseStateHash,wrongSceneNotWrongTarget:true,negativeCases:2};
});
await check('existing-role-prompt-receives-current-source-feedback-with-old-receipt-retained',async()=>{
  let state=copy(saved),calls=0,captured;const memory=new Map();
  // The live node has already returned to its owner. Do not revive that held
  // graph node in the fixture; isolate its identical assignment in a new job.
  const probeId='v880-isolated-probability-feedback';
  state.work.push({id:probeId,role:work.role,bindings:copy(work.bindings),inputs:copy(work.inputs),
    status:'ready',resultRef:null,inputRef:null,attempt:0,dispatchKey:null,failure:null,
    operationState:{version:1,turn:0,reads:[],calls:[],correction:null,consecutiveCorrections:0}});
  const store={load:async()=>copy(state),save:async s=>{state=copy(s);},get:async ref=>memory.has(ref)?copy(memory.get(ref)):get(ref),
    put:async v=>{const ref=hash(v);memory.set(ref,copy(v));return ref;}};
  const execute=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'v880-failure-input',deliberation:{deliberate:async request=>{
    calls++;captured=request;const assignment=request.promptNodes.find(n=>n.kind==='workflow_role_assignment');
    const f=assignment.inputs.task.value.failure;
    assert.equal(f.queryRepair.sourceContract,'pregame_probability_scene_selection_v1');
    assert.equal(f.queryRepair.actualScene.baseStateHash,failure.receipt.baseStateHash);
    assert.deepEqual(f.receipt,failure.receipt);assert.deepEqual(f.request,failure.request);
    const output={action:'read',publicReason:'Read the intended existing scene before selecting the exact base.',
      reads:[{evidenceNumber:321,pointer:'/receipt/actionParameterContracts'}],catalogueQueries:[],workOrders:[],unresolvedQuestions:[],conclusion:null};
    return {output,receipt:{fixture:true,contextHash:request.contextHash,roundKind:request.roundKind,sessionId:request.sessionId,
      roundIndex:request.roundIndex,outputHash:hash(output)}};
  }}});
  const workflow=await createRosterDecisionWorkflowV1({store,execute});
  await workflow.dispatch({type:'run_ready',workIds:[probeId],concurrency:1});
  const after=state.work.find(w=>w.id===probeId);
  assert.equal(calls,1,JSON.stringify({status:after.status,failure:after.failure}));assert.ok(captured);
  assert.equal(state.draftRef,saved.draftRef);assert.equal(state.acceptanceGranted,false);
  assert.notEqual(after.status,'needs_repair',JSON.stringify(after.failure));
  return {scriptedReplies:1,actualProviderCalls:0,nativeCalls:0,noAutomaticBranchChange:true};
});
await fs.writeFile(out,JSON.stringify({pass:checks.every(c=>c.pass),complete:true,checks,actualProviderCalls:0,nativeCalls:0,productionWrites:0,trainingTruth:false},null,2)+'\n');
process.exitCode=checks.every(c=>c.pass)?0:1;
