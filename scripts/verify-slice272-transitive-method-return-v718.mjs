// Replay the actual v717 duplicate-return boundary. No Provider, solver or
// production writes: the saved Native v2 result remains the only method fact.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRosterWorkflowCompletedMethodHandoffsV1} from '../packages/roster-strategist/roster-workflow-completed-method-handoff-v1.mjs';

const run=path.resolve(process.argv[2]);
const base=path.join(run,'workspace/decision-workflows/decision-a6d75905-a910-49a7-b260-f6eb8f7558d5');
const saved=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const byId=new Map(saved.work.map(work=>[work.id,work]));
const pendingId=saved.work.find(work=>work.id.endsWith(':order0:apply-concentrated-formation')).id;
const observedId=pendingId+':observed-choice';
const firstSolverId=observedId+':order0:solve-concentrated-formation-v2';
const firstSummaryId=observedId+':order0:summary';
const firstChoiceId=observedId+':order0:repair-choice';
const repairId=firstChoiceId+':order-repair0';
const solverId=repairId+':order0:solve-concentrated-formation-v3';
const summaryId=repairId+':order0:summary';
const choiceId=repairId+':order0:repair-choice';
const actual=(id,fields)=>{
  assert.ok(byId.has(id),'saved production work must exist: '+id);
  const work=structuredClone(byId.get(id));
  delete work.branchReturnRef;delete work.resolvedByWorkId;
  return Object.assign(work,fields);
};
const state={...saved,work:[
  actual(pendingId,{status:'needs_model_choice'}),
  actual(observedId,{status:'evidence_ready'}),
  actual(firstSolverId,{status:'evidence_ready'}),
  actual(firstSummaryId,{status:'evidence_ready'}),
  actual(firstChoiceId,{status:'evidence_ready'}),
  actual(repairId,{status:'evidence_ready'}),
  actual(solverId,{status:'running',resultRef:null}),
  actual(summaryId,{status:'waiting_dependency',resultRef:null}),
  actual(choiceId,{status:'waiting_dependency',resultRef:null}),
]};
const readArtifact=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
assert.equal((await readArtifact(byId.get(firstSolverId).resultRef)).value.status,'completed');
const handoffs=value=>createRosterWorkflowCompletedMethodHandoffsV1({state:value,readArtifact,tools:{}});
const before=JSON.stringify(state);
assert.equal((await handoffs(state)).length,0,
  'actual running solver -> unpublished tool-view -> waiting summary -> waiting choice is one progressing return owner');
// The actual v3 solver has not returned; do not manufacture a completed result
// with a null artifact merely to vary its state in this scheduling probe.
for(const status of ['ready','running']){
  const sample=structuredClone(state);sample.work.find(work=>work.id===solverId).status=status;
  assert.equal((await handoffs(sample)).length,0,'do not race the transitive leaf while '+status);
}
const stalled=structuredClone(state);
Object.assign(stalled.work.find(work=>work.id===solverId),{status:'waiting_dependency',
  inputs:{missing:{source:'work',id:'missing-explicit-prerequisite',pointer:''}}});
const returned=await handoffs(stalled);
assert.equal(returned.length,1,'a truly missing prerequisite still permits the completed-fact escape');
assert.equal(returned[0].repairOf,pendingId);
assert.equal(returned[0].completedMethodHandoff.nativeQueryAutomaticallyResolved,false);
const cyclic=structuredClone(state);
cyclic.work.find(work=>work.id===summaryId).inputs={cycle:{source:'work',id:choiceId,pointer:''}};
assert.equal((await handoffs(cyclic)).length,1,'a dependency cycle is not progress');
const stale=structuredClone(state);
stale.work.find(work=>work.id===solverId).bindings={...state.scope,map:'a-different-map'};
assert.equal((await handoffs(stale)).length,1,'a different-bound solver is not this return owner');
const unrelated=structuredClone(state);
unrelated.work.find(work=>work.id===choiceId).choiceOf='another-explicit-question';
assert.equal((await handoffs(unrelated)).length,1,'ID similarity alone does not transfer ownership');
assert.equal(JSON.stringify(state),before,'selection cannot mutate production status or evidence');
console.log(JSON.stringify({passed:true,actualSavedNativeSource:true,transitiveReturnOwner:true,
  missingAndCyclicEscapePreserved:true,explicitOwnershipOnly:true,
  providerCalls:0,nativeCalls:0,productionWrites:0,strategyImprovementProven:false}));
