// Actual964 declared completionStepId='', only prepared/inspected setup, then
// was routed to joint strategy;976/977 logged setup into another Plan revision.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {createRosterExperimentOwnerContinuationV1} from '../packages/roster-strategist/roster-workflow-experiment-owner-v1.mjs';
const base=path.resolve(process.argv[2],'workspace/decision-workflows/projection-owner');
const raw=await fs.readFile(path.join(base,'workflow.json'),'utf8'),state=JSON.parse(raw);
const owner=state.work.find(w=>w.id==='review-resolution:r4:map_and_arrival');assert(owner?.resultRef);
const result=JSON.parse(await fs.readFile(path.join(base,'artifacts',owner.resultRef+'.json'),'utf8'));
assert.equal(result.value.workOrders[0].completionStepId,'');
const summaryIds=[owner.id+':order0:summary'];assert(state.work.some(w=>w.id===summaryIds[0]&&w.resultRef));
const job=createRosterExperimentOwnerContinuationV1({state,owner,result,summaryIds});
assert.equal(job.role,'roster_workflow_experiment_planner','BUG: explicitly preliminary Native setup is prematurely promoted to a whole-Plan strategic revision');
assert.equal(job.experimentGoalId,owner.experimentGoalId);assert.equal(job.methodContinuationOf,owner.id);
assert(!job.investigationFrontierOf,'a mechanical continuation must not hold/retire the whole question');
assert.equal(job.inputs.batchFacts0.id,'role:'+summaryIds[0]);
assert.equal(job.inputs.previousMethod.id,'role:'+owner.id);
assert.deepEqual(job.inputs.originalNecessaryQuestions.value,result.value.unresolvedQuestions);
assert.deepEqual(job,createRosterExperimentOwnerContinuationV1({state,owner,result,summaryIds}),'cold recovery must use same work identity');
// A declared completed-method fixture still returns joint strategy. This is a
// control fixture, not a claim that the real method has completed.
const completed=structuredClone(result);completed.value.workOrders[0].completionStepId=completed.value.workOrders[0].steps.at(-1).stepId;
const frontier=createRosterExperimentOwnerContinuationV1({state,owner,result:completed,summaryIds});
assert.equal(frontier.role,'roster_workflow_strategy_decision');
assert.equal(frontier.investigationFrontierOf,owner.experimentGoalId);
const explicit=createRosterExperimentOwnerContinuationV1({state,owner,result,summaryIds,returnReason:'explicit_joint_strategy_return'});
assert.equal(explicit.role,'roster_workflow_strategy_decision','explicit control return must remain available');
assert.equal(await fs.readFile(path.join(base,'workflow.json'),'utf8'),raw);
console.log(JSON.stringify({passed:true,actualSource:'964',preliminaryReturnsToFactRole:true,declaredCompleteReturnsToStrategy:true,
  explicitReturnRetained:true,sameGoal:true,coldIdentityStable:true,newProviderCalls:0,newNativeCalls:0,productionWrites:0}));
