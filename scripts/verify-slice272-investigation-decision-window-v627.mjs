// Actual r6 map batch 2 completed and automatically created batch 3, without
// a joint decision. A finite query window must yield control, not fail/pass.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {createRosterExperimentOwnerContinuationV1} from '../packages/roster-strategist/roster-workflow-experiment-owner-v1.mjs';
const base=path.resolve(process.argv[2],'workspace/decision-workflows/projection-owner');
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const get=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const owner=state.work.find(w=>w.id==='review-resolution:r6:map_and_arrival:method:ff67791af985b6ba');
assert.equal(owner.status,'evidence_ready');assert.equal(owner.experimentBatchIndex,2);
const result=await get(owner.resultRef);assert(result.value.workOrders.length>0);assert(!result.value.experimentConclusion);
const summaryIds=result.value.workOrders.map((_,i)=>owner.returnedOrders?.[i]?.summaryId??`${owner.id}:order${i}:summary`);
assert(summaryIds.every(id=>state.work.find(w=>w.id===id)?.status==='evidence_ready'));
const draft=await get(state.draftRef),args={state,owner,result,summaryIds,draft,requirements:{targetMinerals:2000}};
const oldResult=structuredClone(result),oldOwner=structuredClone(owner);
const next=createRosterExperimentOwnerContinuationV1(args);
assert.equal(next.role,'roster_workflow_strategy_decision','BUG: completed fact batches can renew indefinitely without a joint decision checkpoint');
assert.equal(next.investigationFrontierOf,owner.experimentGoalId);
const frontier=next.inputs.investigationFrontier.value;
assert.equal(frontier.returnReason,'investigation_decision_window_complete');
assert.equal(frontier.decisionWindow.completedBatches,3);assert.equal(frontier.decisionWindow.maximumCompletedBatches,3);
assert.equal(frontier.decisionWindow.investigationMayContinueAfterDecision,true);
assert.equal(frontier.acceptanceGranted,false);
assert.deepEqual(frontier.unresolvedQuestions,result.value.unresolvedQuestions);
assert.deepEqual(next.inputs.wholeDraft.value.candidateInput,draft.candidateInput);
assert.deepEqual(next.inputs.wholeDraft.value.plan,draft.plan);
assert(summaryIds.every(id=>Object.values(next.inputs).some(i=>i.source==='evidence'&&i.id==='role:'+id)));
// A first finite batch still returns to its factual method. This is not the
// former every-mechanical-step-to-strategy design, nor a total query cap.
const first=structuredClone(owner);first.experimentBatchIndex=0;
assert.equal(createRosterExperimentOwnerContinuationV1({...args,owner:first}).role,'roster_workflow_experiment_planner');
const configured=structuredClone(owner);configured.experimentBatchIndex=1;
configured.inputs.investigationDecisionWindow={source:'literal',value:{maximumCompletedBatches:2}};
assert.equal(createRosterExperimentOwnerContinuationV1({...args,owner:configured}).role,'roster_workflow_strategy_decision');
const extended=structuredClone(owner);extended.inputs.investigationDecisionWindow={source:'literal',value:{maximumCompletedBatches:5}};
assert.equal(createRosterExperimentOwnerContinuationV1({...args,owner:extended}).role,'roster_workflow_experiment_planner');
const unanswered=structuredClone(result);unanswered.value.experimentConclusion={status:'blocked',answer:'Specific unavailable fact',evidenceRefs:[]};
assert.equal(createRosterExperimentOwnerContinuationV1({...args,owner:first,result:unanswered}).role,'roster_workflow_strategy_decision');
const answered=structuredClone(result);answered.value.experimentConclusion={status:'answered'};
assert.equal(createRosterExperimentOwnerContinuationV1({...args,result:answered}),null,'answered still requires its independent review, not a new method');
assert.equal(createRosterExperimentOwnerContinuationV1({...args,summaryIds:null}),null,'never interrupt unfinished Native batches');
assert.deepEqual(owner,oldOwner);assert.deepEqual(result,oldResult);
console.log(JSON.stringify({passed:true,actualThirdBatchReturnsJointDecision:true,firstBatchKeepsMethod:true,
  configurableWindowNotGlobalQueryCap:true,unknownsAndWholeDraftRetained:true,unfinishedBatchNotInterrupted:true,
  noApprovalByCheckpoint:true,newProviderCalls:0,newNativeCalls:0,productionWrites:0}));
