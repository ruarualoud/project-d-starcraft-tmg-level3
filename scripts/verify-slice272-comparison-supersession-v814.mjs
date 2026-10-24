// Actual v1/v2 studies still issued work after the model's accepted v3 design.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {createRosterWorkflowGraphV1} from '../packages/roster-strategist/roster-workflow-graph-v1.mjs';
import {assessRosterProductHypothesisCycleV1,progressRosterProductComparisonV1} from '../packages/roster-planning-workspace/roster-hypothesis-cycle-v1.mjs';
// Persist this relatively large snapshot check before reporting to an observer;
// an observation timeout must not erase its outcome or force a blind rerun.
const reportDirectory=await fs.mkdtemp(process.cwd()+'/build/slice272-v814-verification-');
console.log(JSON.stringify({stage:'started',reportDirectory}));
process.on('uncaughtException',error=>{
  const report={pass:false,error:error.code??error.message,detail:error.message?.slice(0,4000),
    location:error.stack?.split('\n').filter(line=>line.trimStart().startsWith('at ')).join('\n')};
  fs.writeFile(reportDirectory+'/result.json',JSON.stringify(report,null,2))
    .then(()=>{console.error(JSON.stringify(report));process.exitCode=1;})
    .catch(()=>{console.error(error);process.exitCode=1;});
});
const root=process.argv[2],getOriginal=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const source=JSON.parse(await fs.readFile(root+'/workflow.json','utf8')),original=JSON.stringify(source);
const draft=await getOriginal(source.draftRef),cycle=await assessRosterProductHypothesisCycleV1({state:source,draft,readArtifact:getOriginal});
assert.equal(cycle.comparisonDesignRevision,3);assert.equal(cycle.comparisonPreflightAccepted,true);
const oldGoals=[1,2].map(v=>`${cycle.id}:purpose:v${v}:study`),graph=createRosterWorkflowGraphV1(source);
const members=source.work.filter(w=>oldGoals.includes(graph.owner(w.id)?.goalId));
assert.ok(members.some(w=>['ready','needs_model_choice','waiting_dependency'].includes(w.status)));
assert.ok(!members.some(w=>w.status==='running'||w.operationState?.pending),'run after the real process reaches its safe boundary');
let saved=structuredClone(source),executions=0;const artifacts=new Map();
const store={load:async()=>structuredClone(saved),save:async s=>{saved=structuredClone(s);},
  get:async ref=>artifacts.has(ref)?structuredClone(artifacts.get(ref)):getOriginal(ref),
  put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');artifacts.set(ref,structuredClone(value));return ref;}};
let workflow=await createRosterDecisionWorkflowV1({store,execute:async()=>{executions++;throw Error('EXECUTION_FORBIDDEN');}});
const run={supersedeExperiment:command=>workflow.dispatch({type:'supersede_experiment_goal',...command}),
  requestExperiment:async()=>{throw Error('NEW_EXPERIMENT_FORBIDDEN');}};
await progressRosterProductComparisonV1({run,state:await workflow.inspect(),draft,cycle});
let after=await workflow.inspect();
assert.ok(members.every(w=>after.work.find(a=>a.id===w.id).status==='superseded'),'explicit old designs must stop scheduling when accepted replacement study exists');
for(const w of members){const a=after.work.find(a=>a.id===w.id);assert.equal(a.resultRef,w.resultRef);assert.equal(a.attempt,w.attempt);assert.deepEqual(a.operationState,w.operationState);}
const memberIds=new Set(members.map(w=>w.id));
for(const w of source.work.filter(w=>!memberIds.has(w.id))){const a=after.work.find(a=>a.id===w.id);assert.equal(a.resultRef,w.resultRef);assert.equal(a.status,w.status);}
assert.equal(after.draftRef,source.draftRef);
// inspect adds derived access/validity/readPaths. Compare the persisted entries
// to the original persisted entries, not a UI projection to a raw checkpoint.
assert.deepEqual(saved.evidence,source.evidence);
const events=after.events.length;
workflow=await createRosterDecisionWorkflowV1({store,execute:async()=>{executions++;throw Error('EXECUTION_FORBIDDEN');}});
await progressRosterProductComparisonV1({run,state:await workflow.inspect(),draft,cycle});after=await workflow.inspect();assert.equal(after.events.length,events);
// An unaccepted new proposal is not authority to retire an old execution.
saved=structuredClone(source);workflow=await createRosterDecisionWorkflowV1({store,execute:async()=>{throw Error('EXECUTION_FORBIDDEN');}});
await progressRosterProductComparisonV1({run,state:await workflow.inspect(),draft,cycle:{...cycle,comparisonPreflightAccepted:false,comparisonStopped:true,comparisonPreflightContractRepair:null}});
assert.ok(oldGoals.every(id=>(saved.work.find(w=>w.id===id).status!=='superseded')));
// Pending paid work remains untouched; no force-stop or lost receipt.
saved=structuredClone(source);const busy=saved.work.find(w=>w.id===oldGoals[0]);busy.status='running';busy.operationState={pending:{contextHash:'unreconciled-fixture'}};
workflow=await createRosterDecisionWorkflowV1({store,execute:async()=>{throw Error('EXECUTION_FORBIDDEN');}});
await progressRosterProductComparisonV1({run,state:await workflow.inspect(),draft,cycle});
// Core cold recovery owns this transition; the revision coordinator must not
// retire it or erase the unresolved paid dispatch. Do not expect running here.
const protectedWork=saved.work.find(w=>w.id===busy.id);
assert.equal(protectedWork.status,'needs_repair');
assert.equal(protectedWork.failure.code,'DISPATCH_OUTCOME_UNKNOWN');
assert.deepEqual(protectedWork.operationState.pending,busy.operationState.pending);
assert.equal(JSON.stringify(source),original);assert.equal(executions,0);
const report={pass:true,actualVersions:[1,2,3],retiredWork:members.length,
  productOrchestratorAndRealStateMachine:true,currentAndOtherWorkPreserved:true,allArtifactsAndFeesPreserved:true,
  coldIdempotent:true,pendingDispatchPreserved:true,providerCalls:0,nativeCalls:0,productionWrites:0};
await fs.writeFile(reportDirectory+'/result.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
