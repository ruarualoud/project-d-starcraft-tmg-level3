// The joint checkpoint received a generic task and expanded follow-ups, but
// lost the original domain review obligation. Exercise the real handoff seam.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {createRosterExperimentOwnerContinuationV1} from '../packages/roster-strategist/roster-workflow-experiment-owner-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const base=path.resolve(process.argv[2],'workspace/decision-workflows/projection-owner');
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const get=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const owner=state.work.find(w=>w.id==='review-resolution:r6:map_and_arrival:method:ff67791af985b6ba');
const root=state.work.find(w=>w.id===owner.experimentGoalId),result=await get(owner.resultRef),draft=await get(state.draftRef);
assert(root.inputs.reviewIssues?.value.length);const original=structuredClone(root.inputs.reviewIssues);
const summaries=result.value.workOrders.map((_,i)=>owner.returnedOrders?.[i]?.summaryId??`${owner.id}:order${i}:summary`);
const next=createRosterExperimentOwnerContinuationV1({state,owner,result,summaryIds:summaries,draft});
assert.equal(next.role,'roster_workflow_strategy_decision');
assert.deepEqual(next.inputs.originalReviewIssues,original,'BUG: joint checkpoint drops the original requiredData and domain obligation');
assert.deepEqual(next.inputs.originalTask,root.inputs.task);
assert.equal(next.inputs.originalInvestigationScope.value.rootWorkId,root.id);
assert.equal(next.inputs.originalInvestigationScope.value.reviewIsFallibleProposal,true);
assert.deepEqual(next.inputs.investigationFrontier.value.unresolvedQuestions,result.value.unresolvedQuestions);
// Source references remain first-class inputs so the product resolver actually
// delivers them; do not bury unmaterialized evidence refs inside literal text.
const custom=structuredClone(state),customRoot=custom.work.find(w=>w.id===root.id);
customRoot.inputs.decision={source:'evidence',id:'role:original-strategy-decision',pointer:'/value'};
const child=structuredClone(owner);child.inputs.task={source:'literal',value:'Later broadened method'};
const linked=createRosterExperimentOwnerContinuationV1({state:custom,owner:child,result,summaryIds:summaries,draft});
assert.deepEqual(linked.inputs.originalStrategicDecision,customRoot.inputs.decision);
assert.deepEqual(linked.inputs.originalTask,root.inputs.task,'use the root assignment, not a later method task');
assert.equal(linked.inputs.originalInvestigationScope.value.originalDraftRevision,root.draftRevision);
assert.deepEqual(root.inputs.reviewIssues,original);
// Already queued checkpoints keep their original saved inputs. Their NEXT
// actual request must also receive the same original scope through projection.
const legacy=state.work.find(w=>w.investigationFrontierOf===root.id)??next;
const legacyInputs=structuredClone(legacy.inputs);for(const k of Object.keys(legacyInputs))if(k.startsWith('original'))delete legacyInputs[k];
let captured;const marker=Error('CAPTURE_ORIGINAL_SCOPE');const memory=new Map();
const executor=createRosterWorkflowReadRoleExecutorV1({store:{load:async()=>state,get,
  put:async value=>{memory.set('temporary-request',value);return 'temporary-request';}},sessionId:'isolated-v628',
  deliberation:{deliberate:async()=>{throw Error('UNEXPECTED_PROVIDER');}},onRequest:async request=>{captured=request;throw marker;}});
await assert.rejects(()=>executor({workId:legacy.id,role:legacy.role,scope:state.scope,inputs:legacyInputs,
  evidenceDirectory:state.evidence.map(e=>({...e,validity:'current'}))},
  {checkpointOperation:async()=>{},readEvidence:async()=>{throw Error('UNEXPECTED_SOURCE_READ');}}),e=>e===marker);
const scopeNode=captured.promptNodes.find(n=>n.kind==='original_investigation_assignment');assert(scopeNode);
assert.equal(scopeNode.scope.rootWorkId,root.id);assert.deepEqual(scopeNode.assignments.originalReviewIssues.value,original.value);
assert.equal(scopeNode.claimsAreRulesTruth,false);
console.log(JSON.stringify({passed:true,actualOriginalObligationPreserved:true,laterQuestionsNotOriginalAuthority:true,
  evidenceRefsRemainResolvableInputs:true,queuedCheckpointPromptAlsoProjected:true,
  rootAssignmentNotOverwritten:true,newProviderCalls:0,newNativeCalls:0,productionWrites:0}));
