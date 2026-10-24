// Real production failure: a Divide and Conquer purpose was executed on a
// frozen Hold Position source. Reproduce the orchestration seam BEFORE tools.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {assessRosterProductHypothesisCycleV1,progressRosterProductComparisonV1}
  from '../packages/roster-planning-workspace/roster-hypothesis-cycle-v1.mjs';
import {createRosterDecisionWorkspaceRunV1}
  from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
assert.equal(typeof createRosterDecisionWorkspaceRunV1,'function');
const root=path.resolve(process.argv[2]);
const saved=JSON.parse(await fs.readFile(path.join(root,'workflow.json'),'utf8'));
const original=JSON.stringify(saved),memory=new Map();
const read=async ref=>memory.has(ref)?memory.get(ref):JSON.parse(await fs.readFile(path.join(root,'artifacts',ref+'.json'),'utf8'));
const draft=await read(saved.draftRef);
const purpose=saved.work.findLast(work=>work.strategyComparisonDesignCycleId);
assert.ok(purpose);
const purposeValue=(await read(purpose.resultRef)).value.proposals[0].comparisonPurpose;
assert.ok(purposeValue.decisionQuestion.includes('Divide and Conquer'));
const scoring=saved.work.find(work=>work.id==='discovery:r0:scoring');
assert.equal((await read(scoring.resultRef)).value.receipt.missionScoringProfile.missionName,'Hold Position');
// Replay only the scheduling boundary; later actual work remains on disk.
const state=structuredClone(saved);
state.work=state.work.filter(work=>!work.id.startsWith(purpose.id+':study'));
const calls=[];
const run=new Proxy({}, {get:(_target,name)=>async value=>{calls.push({name,value});return {scheduled:[value.id]};}});
let cycle=await assessRosterProductHypothesisCycleV1({state,draft,readArtifact:read});
await progressRosterProductComparisonV1({run,state,draft,cycle});
assert.equal(calls[0]?.name,'requestStrategicComparisonDesignReview',
  'unreviewed model design is dispatched as an already-authorized experiment');
assert.ok(!calls.some(call=>call.name==='requestExperiment'));
const reviewRequest=calls[0].value;
assert.equal(reviewRequest.purposeResultRef,purpose.resultRef);
const review={id:reviewRequest.id,role:'roster_workflow_final_review',status:'evidence_ready',
  strategyComparisonDesignReviewCycleId:cycle.id,comparisonPurposeResultRef:purpose.resultRef,
  designReviewRound:1,resultRef:'controlled-review',bindings:purpose.bindings};
state.work.push(review);
memory.set(review.resultRef,{kind:'proposal',value:{checks:[
  {checkId:'frozen_context',verdict:'requires_revision',publicReason:'Wrong selected mission',
    evidenceRefs:[{id:'actual-scoring',artifactRef:scoring.resultRef}],dataQuestions:[],requiredData:[]},
  {checkId:'bounded_executable_design',verdict:'supported',publicReason:'No whole match requested',
    evidenceRefs:[{id:'purpose',artifactRef:purpose.resultRef}],dataQuestions:[],requiredData:[]},
]}});
calls.length=0;cycle=await assessRosterProductHypothesisCycleV1({state,draft,readArtifact:read});
await progressRosterProductComparisonV1({run,state,draft,cycle});
assert.equal(calls[0]?.name,'requestStrategicComparisonDesign');
assert.equal(calls[0].value.reviewWorkId,review.id);
assert.equal(calls[0].value.designRevision,2);
assert.ok(!calls.some(call=>call.name==='requestExperiment'));
// A passing preflight permits work, not a final Plan or strategic verdict.
memory.get(review.resultRef).value.checks[0].verdict='supported';
calls.length=0;cycle=await assessRosterProductHypothesisCycleV1({state,draft,readArtifact:read});
await progressRosterProductComparisonV1({run,state,draft,cycle});
assert.equal(calls[0]?.name,'requestExperiment');
assert.equal(cycle.comparisonResolved,false);
assert.equal(cycle.strategyImprovementProven,false);
assert.equal(calls[0].value.inputs.designPreflight.id,'role:'+review.id);
// Any unresolved question or incomplete coverage prevents execution.
memory.get(review.resultRef).value.checks[0].requiredDecisions=['Choose a valid endpoint'];
memory.get(review.resultRef).value.checks[0].dataQuestions=[
  {question:'Choose a valid endpoint',classification:'author_decision',publicReason:'Not defined yet',evidenceNumbers:[91]}];
calls.length=0;cycle=await assessRosterProductHypothesisCycleV1({state,draft,readArtifact:read});
await progressRosterProductComparisonV1({run,state,draft,cycle});
assert.ok(!calls.some(call=>call.name==='requestExperiment'));
assert.equal(JSON.stringify(saved),original);
console.log(JSON.stringify({passed:true,actualWrongMissionPurpose:true,reviewBeforeExecution:true,
  rejectedDesignReturnsToAuthor:true,unresolvedCannotStart:true,preflightNotApproval:true,
  providerCalls:0,nativeCalls:0,productionWrites:0}));
