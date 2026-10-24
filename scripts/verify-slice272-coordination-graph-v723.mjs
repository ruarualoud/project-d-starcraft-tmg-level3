// Actual source-claim reviewers were in priority ancestry but absent from the
// question-owner graph. Exercise their real saved relation at the product seam.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRosterWorkflowOwnershipIndexV1} from '../packages/roster-strategist/roster-workflow-ownership-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {assessRosterWorkflowReadinessV1} from '../packages/roster-strategist/roster-workflow-readiness-v1.mjs';

const root=path.resolve(process.argv[2]);
const state=JSON.parse(await fs.readFile(path.join(root,'workflow.json'),'utf8'));
const read=async ref=>JSON.parse(await fs.readFile(path.join(root,'artifacts',ref+'.json'),'utf8'));
const original=JSON.stringify(state),owns=createRosterWorkflowOwnershipIndexV1(state);
const review=state.work.find(work=>work.materialClaimReviewOf&&work.status!=='superseded'&&owns(work.materialClaimReviewOf)?.goalId);
assert.ok(review,'actual current material-claim review required');
const expected=owns(review.materialClaimReviewOf);
assert.equal(owns(review.id)?.goalId,expected.goalId,
  'actual source reviewer loses its explicit question owner although priority traversal includes it');

const {createRosterWorkflowGraphV1}=await import('../packages/roster-strategist/roster-workflow-graph-v1.mjs');
const graph=createRosterWorkflowGraphV1(state);
assert.equal(graph.owner(review.id).goalId,expected.goalId);
assert.ok(graph.ancestors(review.id).some(work=>work.id===review.materialClaimReviewOf));
const draft=await read(state.draftRef),verdict=await read(draft.builderVerdictRef);
const readiness=assessRosterWorkflowReadinessV1({draft,verdict,work:state.work});
assert.deepEqual(readiness.activeWork,graph.activeWork());
const returned=state.work.find(work=>work.methodHandoffYield&&work.status==='returned_to_owner');
assert.ok(returned,'actual ownership return required');
assert.equal(graph.isActive(returned.id),false);
const invalidReturn={...returned,methodHandoffYield:null,branchReturnRef:'unregistered-return'};
assert.equal(createRosterWorkflowGraphV1({...state,work:[invalidReturn]}).isActive(returned.id),true);

// A held fact investigation must also hold its source-review children. The
// strategic owner receiving that return must remain runnable to resolve it.
let checkpoint=structuredClone(state),executions=[];
checkpoint.work.find(work=>work.id===review.id).status='ready';
const goal=checkpoint.work.find(work=>work.id===expected.goalId);
const decisionId='verification:explicit-strategic-return';
goal.investigationHandoff={decisionId,reportRef:'verification-report'};
checkpoint.work.push({id:decisionId,role:'roster_workflow_strategy_decision',status:'ready',
  investigationFrontierOf:goal.id,investigationOwnerId:goal.id,bindings:state.scope,
  inputs:{task:{source:'literal',value:'Only decide this returned question.'}}});
const memory=new Map();
const store={load:async()=>structuredClone(checkpoint),save:async value=>{checkpoint=structuredClone(value);},
  get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):read(ref),
  put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,structuredClone(value));return ref;}};
const workflow=await createRosterDecisionWorkflowV1({store,execute:async assignment=>{
  executions.push(assignment.workId);return {kind:'proposal',value:{status:'verification_only'},conditions:['controlled orchestration fixture']};
}});
assert.deepEqual(await workflow.dispatch({type:'run_ready',workIds:[review.id]}),[]);
await workflow.dispatch({type:'run_ready',workIds:[decisionId]});
assert.deepEqual(executions,[decisionId]);

const scope={rules:'r'};
const dependencyState={scope,evidence:[],work:[
  {id:'producer',role:'roster_workflow_tool',status:'running',bindings:scope,inputs:{}},
  {id:'summary',status:'waiting_dependency',bindings:scope,inputs:{source:{source:'evidence',id:'tool-view:producer'}}},
  {id:'choice',status:'waiting_dependency',bindings:scope,inputs:{source:{source:'work',id:'summary'}}},
  {id:'choice:unrelated',status:'ready',bindings:scope,inputs:{}},
]};
const dependencies=createRosterWorkflowGraphV1(dependencyState);
assert.equal(dependencies.canProgress('choice'),true);
assert.equal(dependencies.isAncestor('choice','choice:unrelated'),false,'a similar ID is not a control relation');
dependencyState.work[1].inputs.source.id='missing-static-source';
assert.equal(createRosterWorkflowGraphV1(dependencyState).canProgress('choice'),false);
dependencyState.work[1].inputs.source={source:'work',id:'choice'};
assert.equal(createRosterWorkflowGraphV1(dependencyState).canProgress('choice'),false);
assert.equal(JSON.stringify(state),original,'real checkpoint is read-only');
console.log(JSON.stringify({passed:true,actualReviewOwner:review.id,realReviewHeld:true,strategicReturnRunnable:true,
  readinessUsesSameLifecycle:true,unpublishedProducerAndMissingCycleDistinguished:true,
  providerCalls:0,nativeCalls:0,productionWrites:0,finalPlanAccepted:false}));
