// e5580: source reads and an author-classification error occurred together.
// The old all-errors-must-be-reads condition stranded the deterministic reads.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1,projectRosterWorkflowSavedSchemaRevalidationV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const root=process.argv[2],get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
let state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const event=state.events.find(e=>e.sequence===5580);
const work=state.work.find(w=>w.id===event.workId);
const request=await get('ae0eccf5189eee2465139ba78818eab90938597b38dd87ec4f745403c9960ddf');
const reply=await get('99033730d76f1469349f984ab805d247fe7790f50a4b793718dc653f5b6f17be');
const assignment={...request.promptNodes.find(n=>n.kind==='workflow_role_assignment'),
  evidenceDirectory:(await get(work.inputRef)).evidenceDirectory};
const original=JSON.stringify(reply),memory=new Map();let serial=0,providerCalls=0;
const store={load:async()=>structuredClone(state),save:async value=>{state=structuredClone(value);},
  get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):get(ref),
  put:async value=>{const ref='isolated-v793-'+(++serial);memory.set(ref,structuredClone(value));return ref;}};
const graph=await createRosterDecisionWorkflowV1({store,execute:()=>{throw Error('NO_NATIVE_EXECUTION');}});
let operation={version:1,turn:0,reads:[],calls:[],correction:null,consecutiveCorrections:1};
const requested=[];
const executor=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'v793-saved-output-only',
  deliberation:{deliberate:async()=>{providerCalls++;return structuredClone(reply);}}});
const result=await executor(assignment,{operationState:operation,
  checkpointOperation:async value=>{operation=structuredClone(value);},
  readEvidence:async(evidenceId,pointer)=>{requested.push({evidenceId,pointer});
    return graph.dispatch({type:'read_evidence',consumer:work.id,evidenceId,pointer});}});
assert.equal(result.value.status,'evidence_reads_pending_recheck',
  'mechanical citation reads must proceed even while an independent author error remains');
assert.ok(requested.length>0);
assert.equal(new Set(requested.map(r=>JSON.stringify(r))).size,requested.length,'read once per exact source');
assert.ok(operation.correction.errors.some(e=>e.code==='author_choice_requires_author_action'),
  'reading sources cannot resolve a strategic author decision');
assert.equal(operation.consecutiveCorrections,1,'mixed-error hydration must not reset the semantic retry count');
assert.equal(result.value.conclusionAccepted,false);
assert.equal(state.draftRevision,3);assert.equal(state.acceptanceGranted,false);
assert.equal(JSON.stringify(reply),original);
const stoppedReply=await get(work.operationState.correction.originalReplyRef);
const stoppedCall=work.operationState.calls.findLast(c=>c.replyRef===work.operationState.correction.originalReplyRef);
const stoppedRequest=await get(stoppedCall.requestRef);
const recovery=projectRosterWorkflowSavedSchemaRevalidationV1({work,reply:stoppedReply,request:stoppedRequest});
assert.equal(recovery.repairKind,'mixed_citation_read_handoff');
assert.equal(recovery.providerReplayed,false);assert.equal(recovery.finalApprovalGranted,false);
const updated=structuredClone(stoppedRequest);
updated.promptNodes.push({kind:'citation_read_recovery_contract',version:2});
assert.equal(projectRosterWorkflowSavedSchemaRevalidationV1({work,reply:stoppedReply,request:updated}),null,
  'a failure already using the repaired contract gets no new recovery cycle');
assert.equal(projectRosterWorkflowSavedSchemaRevalidationV1({work:{...work,operationState:{...work.operationState,pending:{}}},
  reply:stoppedReply,request:stoppedRequest}),null,'never replay a still-pending request');
console.log(JSON.stringify({pass:true,fixtureReplyUses:providerCalls,realProviderCalls:0,
  nativeCalls:0,productionWrites:0,exactReads:requested.length,preservedAuthorError:true}));
