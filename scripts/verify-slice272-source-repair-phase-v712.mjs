// Actual necessary return-fire question survived three prose revisions without
// any new workOrder. Exercise the existing revision factory and real request.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {createRosterExperimentReviewRevisionV1} from '../packages/roster-strategist/roster-workflow-experiment-owner-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const base=path.resolve(process.argv[2],'workspace/decision-workflows/decision-959c1d9c-d6e0-43b4-8196-faef5b42fc34');
const original=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const get=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const root='product:strategy-hypothesis:v1:3621f50797e05ed31755:purpose:v1:study:method:bd48028a7fec8b8d:source-revision:strategy-frontier:investigation:method:288957f57a0080a9';
const owner=original.work.find(w=>w.id===root+':source-revision');assert.ok(owner);
const state=structuredClone(original);state.work=state.work.filter(w=>w.id!==owner.id+':source-revision');
const revision=await createRosterExperimentReviewRevisionV1({state,owner,store:{get}});assert.ok(revision);
assert.equal(revision.inputs.sourceRepairStage?.value?.phase,'missing_fact_investigation',
  'necessary new measurements must not be routed as undifferentiated prose correction');
assert.ok(revision.inputs.sourceRepairStage.value.necessaryQuestions.some(q=>q.question.includes('return fire')));
assert.equal(revision.experimentReviewRound,owner.experimentReviewRound+1,'existing rounds are retained');
assert.deepEqual(revision.inputs.originalNecessaryQuestions,owner.inputs.originalNecessaryQuestions,'parent obligations remain intact');
const legacy=original.work.find(w=>w.id===root+':source-revision:source-revision');
const assignment=await get(legacy.inputRef),memory=new Map();let next=0,request;
const store={load:async()=>original,get:async ref=>memory.has(ref)?memory.get(ref):get(ref),
  put:async value=>{const ref='phase-capture-'+(++next);memory.set(ref,structuredClone(value));return ref;}};
const executor=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'source-phase-capture',deliberation:{},
  onRequest:async value=>{request=value;throw Error('CAPTURE_ONLY_NO_PROVIDER');}});
await assert.rejects(executor(assignment,{operationState:{version:1,turn:0,reads:[],calls:[],correction:null,consecutiveCorrections:0},
  checkpointOperation:async()=>{}}),/CAPTURE_ONLY_NO_PROVIDER/);
const stage=request.promptNodes.find(n=>n.kind==='source_review_repair_stage');assert.ok(stage,'queued legacy revision gets the same typed repair stage');
assert.equal(stage.phase,'missing_fact_investigation');assert.ok(stage.necessaryQuestions.length);
assert.equal(stage.hostChoosesStrategy,false);assert.equal(stage.reviewIsRulesTruth,false);
// A review with an unresolved Provider dispatch is never a semantic retry.
const current=original.work.find(w=>w.id===root+':source-revision:source-revision:source-revision');assert.ok(current);
const pendingReview=original.work.findLast(w=>w.experimentSourceReviewOf===current.id);
if(pendingReview.status!=='evidence_ready')assert.equal(await createRosterExperimentReviewRevisionV1({state:original,owner:current,store:{get}}),null);
console.log(JSON.stringify({passed:true,actualRepeatedProseRevision:true,revisionFactoryAndRealPrompt:true,
  typedNecessaryQuestions:true,oldObligationsAndRoundsRetained:true,providerCalls:0,nativeCalls:0,productionWrites:0,
  actualNewMeasurementProven:false,strategyImprovementProven:false}));
