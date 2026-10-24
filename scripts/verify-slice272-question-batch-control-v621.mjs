// Actual994 declares inspect-successor as batch completion, but the arrival
// QUESTION is not answered.1018 again wrote that menu observation into a Plan.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import * as owners from '../packages/roster-strategist/roster-workflow-experiment-owner-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {rosterWorkflowBindingsMatchV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
const dir=path.resolve(process.argv[2]),base=path.join(dir,'workspace/decision-workflows/projection-owner');
const raw=await fs.readFile(path.join(base,'workflow.json'),'utf8'),state=JSON.parse(raw),memory=new Map();
const get=async ref=>memory.has(ref)?structuredClone(memory.get(ref)):JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const store={get,put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,structuredClone(value));return ref;},load:async()=>structuredClone(state)};
const owner=state.work.find(w=>w.id==='review-resolution:r5:map_and_arrival'),result=await get(owner.resultRef);
const summaryIds=[owner.id+':order0:summary'];assert.equal(result.value.workOrders[0].completionStepId,'inspect-successor');
const continuation=owners.createRosterExperimentOwnerContinuationV1({state,owner,result,summaryIds});
assert.equal(continuation.role,'roster_workflow_experiment_planner','BUG: completed query batch is still mistaken for completed factual question');
assert.equal(continuation.experimentGoalId,owner.experimentGoalId);assert(!continuation.investigationFrontierOf);
assert.equal(continuation.inputs.previousMethod.id,'role:'+owner.id);
assert.deepEqual(continuation.inputs.originalNecessaryQuestions.value,result.value.unresolvedQuestions);
for(const status of ['blocked','strategy_required']){
  const pending={value:{publicReason:'Control fixture: actual saved sources need a strategic choice, not factual approval.',workOrders:[],
    unresolvedQuestions:['Original arrival question is still unresolved'],experimentConclusion:{status,answer:'Requires strategic choice',evidenceRefs:[]}}};
  const next=owners.createRosterExperimentOwnerContinuationV1({state,owner,result:pending,summaryIds:[owner.id]});
  assert.equal(next.role,'roster_workflow_strategy_decision');
  assert.equal(next.inputs.investigationFrontier.value.acceptanceGranted,false);
  assert.equal(next.inputs.investigationFrontier.value.unresolvedQuestions.length,1);
  assert.equal(await owners.createRosterExperimentSourceReviewV1({state,owner,result:pending,store}),null,'control return is not an answered fact to approve');
}
const answered={value:{experimentConclusion:{status:'answered'}}};
assert.equal(owners.createRosterExperimentOwnerContinuationV1({state,owner,result:answered,summaryIds}),null,'answered facts retain independent source review');
assert.equal(owners.createRosterExperimentOwnerContinuationV1({state,owner,result,summaryIds,returnReason:'explicit_owner_return'}).role,'roster_workflow_strategy_decision');
const progress=await owners.projectRosterExperimentBatchProgressV1({state,summaryIds,store});
assert.equal(progress.noNewObservation,false,'real Native transition is new information, even though the larger question is unfinished');
const receipt=await get(state.work.find(w=>w.id===owner.id+':order0:mission-start').resultRef);
const reused=structuredClone(receipt);reused.value.queryReuse={newObservation:false,originalResultRef:'saved-original'};
memory.set('reused',reused);memory.set('fresh',receipt);
const probe={work:[{id:'summary',inputs:{a:{source:'work',id:'tool-a'},b:{source:'work',id:'tool-b'}}},
  {id:'tool-a',role:'roster_workflow_tool',status:'evidence_ready',resultRef:'reused'},
  {id:'tool-b',role:'roster_workflow_tool',status:'evidence_ready',resultRef:'reused'}],evidence:[]};
assert.equal((await owners.projectRosterExperimentBatchProgressV1({state:probe,summaryIds:['summary'],store})).noNewObservation,true);
probe.work[2].resultRef='fresh';assert.equal((await owners.projectRosterExperimentBatchProgressV1({state:probe,summaryIds:['summary'],store})).noNewObservation,false);
// Real read-role seam, isolated typed control output. No Provider/Native call.
const original=JSON.parse(await fs.readFile(path.join(dir,'994.request.json'),'utf8')).request;
const assignment={...original.promptNodes[0],evidenceDirectory:state.evidence.map(e=>({...e,validity:rosterWorkflowBindingsMatchV1(e.bindings,state.scope)?'current':'historical'}))};
const operation=structuredClone(owner.operationState);operation.pending=null;operation.correction=null;
const n=assignment.evidenceDirectory.findIndex(e=>e.validity==='current'&&operation.reads.some(r=>r.evidenceId===e.id))+1;assert(n);
let captured;const execute=createRosterWorkflowReadRoleExecutorV1({sessionId:'control-fixture-only',store,
  deliberation:{deliberate:async request=>{captured=request;return {output:{action:'conclude',publicReason:'Fixture: strategic choice, not a factual answer.',
    reads:[],catalogueQueries:[],workOrders:[],unresolvedQuestions:['Choose whether this factual method should continue'],
    conclusion:{status:'strategy_required',answer:'Return the existing sources and unresolved question for strategic judgment.',evidenceNumbers:[n],conditions:['Control fixture only, not a production result']}},receipt:{contextHash:request.contextHash}};}},onRequest:async()=>{},onReply:async()=>{}});
const response=await execute(assignment,{operationState:operation,checkpointOperation:async()=>{},readEvidence:async()=>{throw Error('UNEXPECTED_READ');}});
assert.equal(response.value.experimentConclusion.status,'strategy_required');assert.equal(response.continuation,undefined);
assert(captured.responseFormat.schema.properties.conclusion.anyOf[0].properties.status.enum.includes('strategy_required'));
assert.equal(await fs.readFile(path.join(base,'workflow.json'),'utf8'),raw);
console.log(JSON.stringify({passed:true,actual994BatchCompletion:'inspect-successor',questionStillFactOwned:true,blockedAndStrategyReturnUnapproved:true,
  realNativeProgressPreserved:true,exactReuseReturnsControl:true,typedRoleOutputAccepted:true,newProviderCalls:0,newNativeCalls:0,productionWrites:0}));
