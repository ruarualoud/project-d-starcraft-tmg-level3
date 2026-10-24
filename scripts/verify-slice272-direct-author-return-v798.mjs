// Actual e5663 dead end: a direct frontier retain has no child-investigation
// response envelope. Return control, NOT source/fact or final approval.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRosterWorkflowFrontierReturnsV1} from '../packages/roster-strategist/roster-workflow-frontier-return-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
const root=process.argv[2],get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
let state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const response=state.work.find(w=>w.operationState?.authorDecisionHandoff?.phase==='submitted_for_review');
assert.ok(response);assert.equal(response.operationState.turn,9);
const goal=state.work.find(w=>w.id===response.investigationFrontierOf);
const draftRef=state.draftRef,oldWork=JSON.stringify(state.work),memory=new Map();
const store={load:async()=>structuredClone(state),save:async v=>{state=structuredClone(v);},
  get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):get(ref),
  put:async v=>{const ref=createHash('sha256').update(JSON.stringify(v)).digest('hex');memory.set(ref,structuredClone(v));return ref;}};
const jobs=await createRosterWorkflowFrontierReturnsV1({state,readArtifact:store.get});
const job=jobs.find(w=>w.resumesStrategyFrontierOf===response.id);
assert.ok(job,'a settled direct author decision must return to its exact held fact owner');
assert.equal(job.completedStrategicDecisionId,response.id);
assert.equal(job.experimentGoalId,goal.id);
assert.equal(job.methodContinuationOf,response.investigationOwnerId);
assert.ok(Object.keys(job.inputs).some(k=>/^returnedQuestionFact/.test(k)));
assert.equal(JSON.stringify(state.work),oldWork,'planning the transition cannot rewrite history');
let graph=await createRosterDecisionWorkflowV1({store,execute:async()=>{throw Error('NO_MODEL_OR_NATIVE_EXPECTED');}});
await graph.dispatch({type:'enqueue',work:[job]});
const returned=state.work.find(w=>w.id===goal.id);
assert.equal(returned.investigationHandoff,undefined);
assert.equal(returned.investigationHandoffHistory.at(-1).completedStrategicDecisionId,response.id);
assert.equal(state.work.find(w=>w.id===job.id).status,'ready');
assert.equal(state.draftRef,draftRef);assert.equal(state.acceptanceGranted,false);
assert.deepEqual(state.work.find(w=>w.id===response.id),response);
graph=await createRosterDecisionWorkflowV1({store,execute:async()=>{throw Error('NO_DISPATCH_EXPECTED');}});
assert.ok(!(await createRosterWorkflowFrontierReturnsV1({state:await graph.inspect(),readArtifact:store.get}))
  .some(w=>w.resumesStrategyFrontierOf===response.id),'cold resume cannot duplicate the return');
const {rosterFrontierResponseRouteV1}=await import('../packages/roster-strategist/roster-workflow-frontier-return-v1.mjs');
const child={id:'fixture-child',role:'roster_workflow_experiment_planner',status:'evidence_ready',bindings:goal.bindings,investigationFor:response.id};
const childResponse={...response,id:'fixture-child-response',inputs:{investigation:{source:'evidence',id:'role:'+child.id},newFacts0:{source:'evidence',id:'role:measured'}}};
const fixture={...state,work:[...state.work,child,childResponse]};
assert.equal(rosterFrontierResponseRouteV1({state:fixture,frontier:response,response:childResponse}).kind,'child_response');
assert.equal(rosterFrontierResponseRouteV1({state:fixture,frontier:response,response:{...childResponse,bindings:{...goal.bindings,army:'wrong'}}}),null);
assert.equal(rosterFrontierResponseRouteV1({state:fixture,frontier:response,response:{...childResponse,inputs:{}}}),null);
console.log(JSON.stringify({pass:true,actualStop:'e5663',directOwnerReturn:true,childInterfaceChecked:true,
  sourceApprovalGranted:false,draftUnchanged:true,unresolvedOtherBranchesNotDeleted:true,
  coldRestoreNoDuplicate:true,realProviderCalls:0,nativeCalls:0,productionWrites:0}));
