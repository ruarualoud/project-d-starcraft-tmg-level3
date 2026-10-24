// Reconstruct the observed v701 scheduling boundary, using its immutable real
// solver outputs. This is a scheduler proof, not a strategic/Native success.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRosterWorkflowCompletedMethodHandoffsV1} from '../packages/roster-strategist/roster-workflow-completed-method-handoff-v1.mjs';

const run=path.resolve(process.argv[2]);
const base=path.join(run,'workspace/decision-workflows/decision-58c2b2f9-e4cf-4b5d-9ac3-4c8c36bbb0e1');
const saved=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const pendingId='product:strategy-hypothesis:v1:e6ba825710ef1ccd0f58:purpose:v1:study:order0:scene-b';
const repairId=pendingId+':input-repair',choiceId=repairId+':order0:repair-choice';
const summaryId=repairId+':order0:summary';
const byId=new Map(saved.work.map(work=>[work.id,work]));
const readArtifact=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const actual=(id,fields={})=>{
  assert.ok(byId.has(id),'actual work must exist: '+id);
  const work=structuredClone(byId.get(id));
  // Explicit isolated reconstruction of the observed pre-handoff boundary.
  delete work.branchReturnRef;delete work.resolvedByWorkId;
  return Object.assign(work,fields);
};
const state={...saved,work:[
  actual(pendingId,{status:'needs_model_choice'}),
  actual(repairId,{status:'evidence_ready',resultRef:'12c0771712e029e844d44f56334b4cbaf68ba98706f3f85773a4e37d6a258fb0'}),
  ...['solve-marauder','solve-marine','solve-hydralisk'].map(step=>actual(repairId+':order0:'+step,{status:'evidence_ready'})),
  actual(summaryId,{status:'ready',resultRef:null}),
  actual(choiceId,{status:'waiting_dependency',resultRef:null}),
]};
const before=JSON.stringify(state);
for(const step of state.work.filter(work=>work.role==='roster_workflow_tool'&&work.status==='evidence_ready')){
  assert.equal((await readArtifact(step.resultRef)).value.status,'completed');
}
const handoffs=s=>createRosterWorkflowCompletedMethodHandoffsV1({state:s,readArtifact,tools:{}});
assert.equal((await handoffs(state)).length,0,
  'do not dispatch a competing return role while the existing repair choice can consume its ready summary');
for(const status of ['ready','running','needs_model_choice']){
  const sample=structuredClone(state);sample.work.find(work=>work.id===choiceId).status=status;
  assert.equal((await handoffs(sample)).length,0,'one return owner while existing continuation is '+status);
}
// A genuinely stalled continuation must not suppress the original escape
// route. Its completed method facts still return as facts, not Native success.
const stalled=structuredClone(state);
stalled.work.find(work=>work.id===summaryId).status='waiting_dependency';
const resumed=await handoffs(stalled);
assert.equal(resumed.length,1);
assert.equal(resumed[0].repairOf,pendingId);
assert.equal(resumed[0].completedMethodHandoff.nativeQueryAutomaticallyResolved,false);
const failed=structuredClone(state);failed.work.find(work=>work.id===choiceId).status='failed';
assert.equal((await handoffs(failed)).length,1);
const unrelated=structuredClone(state);unrelated.work.find(work=>work.id===choiceId).repairOf='another-explicit-question';
assert.equal((await handoffs(unrelated)).length,1,'an unrelated repair owner cannot suppress this return');
assert.equal(JSON.stringify(state),before,'selection must not mutate any status or saved result');
console.log(JSON.stringify({passed:true,actualSolverSources:true,isolatedObservedBoundary:true,
  singleActiveReturnOwner:true,stalledEscapePreserved:true,explicitOwnershipOnly:true,
  providerCalls:0,nativeCalls:0,productionWrites:0,strategyImprovementProven:false}));
