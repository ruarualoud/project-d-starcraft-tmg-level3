// Concrete bug: generated summaries omitted experimentOwnerId, so an explicitly
// superseded comparison left an active orphan in the release inventory.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {createRosterWorkflowGraphV1} from '../packages/roster-strategist/roster-workflow-graph-v1.mjs';

try{
  const root=process.argv[2],readArtifact=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
  const source=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
  const id='product:strategy-hypothesis:v1:3f2b13756bb2d2dfc2fa:purpose:v2:study:source-revision:order0:summary';
  const summary=source.work.find(w=>w.id===id);
  assert.ok(summary&&!summary.experimentOwnerId&&summary.status==='waiting_dependency');
  const producers=Object.values(summary.inputs).filter(i=>i.source==='evidence').map(i=>source.work.find(w=>'tool-view:'+w.id===i.id));
  assert.ok(producers.length&&producers.every(Boolean));
  const owner=source.work.find(w=>w.id===producers[0].experimentOwnerId);
  const goal=source.work.find(w=>w.id===owner.experimentGoalId),replacement=source.work.find(w=>w.id===goal.supersededByGoalId);
  assert.ok(owner.resultRef&&goal.experimentSupersessionRef&&replacement);
  const generic={...structuredClone(summary),id:'independent-summary-not-generated-by-this-order'};
  const base={schema:source.schema,scope:source.scope,evidence:[],reads:[],events:[],acceptanceGranted:false,
    work:[goal,owner,...producers,summary,replacement,generic].filter((w,i,a)=>a.findIndex(v=>v.id===w.id)===i).map(w=>structuredClone(w))};
  let saved=structuredClone(base),executions=0;const artifacts=new Map();
  const store={load:async()=>structuredClone(saved),save:async value=>{saved=structuredClone(value);},
    get:async ref=>artifacts.has(ref)?structuredClone(artifacts.get(ref)):readArtifact(ref),
    put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');artifacts.set(ref,structuredClone(value));return ref;}};
  const open=()=>createRosterDecisionWorkflowV1({store,execute:async()=>{executions++;throw Error('EXECUTION_FORBIDDEN');}});
  await open();
  const after=saved.work.find(w=>w.id===id);
  assert.equal(after.experimentOwnerId,owner.id,'saved generated summary must recover its exact original order owner');
  assert.equal(after.status,'superseded','old unresolved summary must not block final release after its goal was explicitly replaced');
  assert.equal(after.experimentSupersessionRef,goal.experimentSupersessionRef);
  assert.deepEqual(after.inputs,summary.inputs);assert.equal(after.resultRef,summary.resultRef);
  assert.deepEqual(saved.work.find(w=>w.id===generic.id),generic,'same facts do not imply delegated control ownership');
  const graph=createRosterWorkflowGraphV1(saved);
  assert.equal(graph.owner(id)?.goalId,goal.id);assert.equal(graph.isActive(id),false);
  const eventCount=saved.events.length;await open();assert.equal(saved.events.length,eventCount,'cold recovery must be idempotent');
  // Current goals stay live; pending/unknown paid calls cannot be retired.
  saved=structuredClone(base);const currentGoal=saved.work.find(w=>w.id===goal.id);
  delete currentGoal.supersededByGoalId;delete currentGoal.experimentSupersessionRef;currentGoal.status='evidence_ready';
  await open();assert.equal(saved.work.find(w=>w.id===id).status,'waiting_dependency');
  saved=structuredClone(base);const busy=saved.work.find(w=>w.id===id);
  busy.status='needs_repair';busy.failure={code:'DISPATCH_OUTCOME_UNKNOWN'};busy.operationState={pending:{contextHash:'fixture-unreconciled'}};
  await open();const preserved=saved.work.find(w=>w.id===id);
  assert.equal(preserved.status,'needs_repair');assert.deepEqual(preserved.operationState,busy.operationState);
  assert.equal(executions,0);
  console.log(JSON.stringify({pass:true,actualSavedSummary:id,originalOrderOwner:owner.id,originalInputsRetained:true,
    independentReaderUnchanged:true,coldIdempotent:true,currentGoalActive:true,pendingPaidWorkPreserved:true,
    providerCalls:0,nativeCalls:0,productionWrites:0}));
}catch(error){console.error(JSON.stringify({pass:false,error:error.message?.slice(0,1600),location:error.stack?.split('\n').filter(l=>l.trimStart().startsWith('at ')).slice(0,4)}));process.exitCode=1;}
