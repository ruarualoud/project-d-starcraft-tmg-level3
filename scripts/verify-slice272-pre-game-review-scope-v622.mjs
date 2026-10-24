// Actual1025 asks for realized per-round VP before accepting an explicitly
// conditional pre-game target. The shared stage scope must reach all authors
// and domain reviewers, without silently changing that saved classification.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import * as questions from '../packages/roster-strategist/roster-review-data-questions-v1.mjs';
const dir=path.resolve(process.argv[2]),base=path.join(dir,'workspace/decision-workflows/projection-owner');
const raw=await fs.readFile(path.join(base,'workflow.json'),'utf8'),state=JSON.parse(raw),memory=new Map();
const store={get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8')),
  put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,structuredClone(value));return ref;},load:async()=>structuredClone(state)};
const actual=JSON.parse(await fs.readFile(path.join(dir,'1025.request.json'),'utf8')).request;
const assignment={...actual.promptNodes[0],evidenceDirectory:state.evidence.map(e=>({...e,validity:'current'}))};
assert.equal(assignment.workId,'final-review:r6:scoring_and_timing');
const work=state.work.find(w=>w.id===assignment.workId),operation=structuredClone(work.operationState);operation.pending=null;operation.correction=null;
let captured;const marker=Error('CAPTURE_ONLY');
const execute=createRosterWorkflowReadRoleExecutorV1({sessionId:'scope-fixture-only',store,
  deliberation:{deliberate:async()=>{throw Error('UNEXPECTED_PROVIDER');}},onRequest:async request=>{captured=request;throw marker;}});
await assert.rejects(()=>execute(assignment,{operationState:operation,checkpointOperation:async()=>{},readEvidence:async()=>{throw Error('UNEXPECTED_READ');}}),e=>e===marker);
const scope=captured.promptNodes.find(n=>n.kind==='acceptance_stage_contract');
assert.equal(scope?.stage,'pre_game_roster_plan','BUG: domain reviewer has no stage contract distinguishing feasibility from realized future outcomes');
assert.equal(scope.version,1);assert.equal(scope.realizedFutureResultsRequired,false);
assert(scope.requiredCurrentProofs.includes('rules_payment_and_spatial_feasibility'));
assert(scope.requiredCurrentProofs.includes('source_backing_for_adopted_measured_claims'));
assert(scope.requiredCurrentProofs.includes('reasoned_alternatives_and_synergy'));
assert.equal(scope.hostMayReclassifySavedQuestions,false);
for(const role of ['roster_workflow_experiment_planner','roster_workflow_strategy_decision','roster_workflow_local_teach']){
  assert.deepEqual(questions.rosterWorkflowAcceptanceStageV1({role,inputs:{}}),scope);
}
assert.equal(questions.rosterWorkflowAcceptanceStageV1({role:'roster_workflow_final_review',inputs:{review:{value:{experimentalSourceReviewVersion:3}}}}),null,'atomic source checks retain their exact factual job');
const originalReply=JSON.parse(await fs.readFile(path.join(dir,'1025.reply.json'),'utf8'));
const classified=questions.projectRosterReviewDataQuestionsV1(originalReply.output.checks[0]);
assert(classified.requiredData.length,'Host must not silently clear the old necessary_fact demand to make a test pass');
assert.equal(await fs.readFile(path.join(base,'workflow.json'),'utf8'),raw);
console.log(JSON.stringify({passed:true,actualSource:1025,reviewAndThreeAuthorsShareStage:true,atomicSourceScopeUnchanged:true,
  oldQuestionsUnmodified:true,newProviderCalls:0,newNativeCalls:0,productionWrites:0}));
