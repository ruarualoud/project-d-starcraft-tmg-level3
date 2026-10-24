// Concrete e8707 regression: a malformed repair must not erase its source issue.
// Saved production artifacts are read-only; scripted replies are NOT live evidence.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1,projectRosterWorkflowFeedbackRecoveryV1}
  from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const root=process.argv[2];
const get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const work=state.work.find(w=>w.id.endsWith('frontier-return:403af790345b61b2:source-review:v2:claim:0'));
const assignment=await get(work.inputRef);
const mixedRef='e941cf14e21fb4b2937b9c0a1a86b06b7da143da45bc603853c5af086f1e453f';
const mixed=await get(mixedRef);
const failed=await get('d30ad6d9f4ef13e49c1fa40b65f9cb1294984c70658374e3fc4de994c2b58932');
const rawBefore=JSON.stringify(mixed);
let operation={...structuredClone(work.operationState),turn:3,
  calls:structuredClone(work.operationState.calls.slice(0,3)),pending:null,
  consecutiveCorrections:2,correction:{errors:failed.value.errors,originalReplyRef:mixedRef,
    instruction:'Correct only this local reply. Saved evidence and successful reads remain available.'}};
const memory=new Map();
const store={load:async()=>structuredClone(state),get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):get(ref),
  put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');
    memory.set(ref,structuredClone(value));return ref;}};
let calls=0;const requests=[];
const patch=structuredClone(mixed.output);patch.reads=[];
const execute=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'v836-offline-repair-continuity',
  deliberation:{deliberate:async request=>{
    requests.push(request);calls++;
    const node=request.promptNodes.find(n=>n.kind==='review_semantic_repair');
    const feedback=request.promptNodes.find(n=>n.kind==='local_contract_feedback');
    assert.ok(node,'Malformed patch must retain the typed per-check lane, not revert to a full review');
    assert.deepEqual(node.flaggedCheckIds,['q1']);
    assert.ok(feedback.errors.some(e=>e.code==='review_subject_is_not_evidence'),
      'The original source defect must survive patch syntax/operation errors');
    assert.ok(feedback.repairAttempt?.errors.some(e=>e.code==='review_patch_read_and_write_mixed'));
    assert.deepEqual(feedback.repairAttempt.rejectedOutput,mixed.output);
    assert.ok(!request.responseFormat.schema.properties.checks);
    const output=calls===1?{action:'read',publicReason:'Read the exact operation before repairing the cited proof.',
      reads:[{evidenceNumber:1228,pointer:'/operations/6'}],checkPatches:[]}:structuredClone(patch);
    return {output,receipt:{contextHash:request.contextHash,roundKind:request.roundKind,
      sessionId:request.sessionId,roundIndex:request.roundIndex,outputHash:hash(output),
      outputContractRef:structuredClone(request.responseFormat.outputContractRef),paidProviderCall:false,trainingTruth:false}};
  }}});
const control=()=>({operationState:structuredClone(operation),checkpointOperation:async value=>{operation=structuredClone(value);},
  readEvidence:async(id,pointer)=>{
    const entry=state.evidence.find(e=>e.id===id);assert.ok(entry);
    assert.equal(pointer,'/operations/6');const body=await get(entry.artifactRef);
    return {status:'read',evidenceId:id,pointer,validity:'current',kind:entry.kind,value:body.operations[6]};
  }});
const first=await execute(assignment,control());
assert.equal(first.value.status,'reads_completed');assert.equal(operation.consecutiveCorrections,2);
assert.equal(operation.correction.originalReplyRef,mixedRef,'Read alone must not approve or replace the pending correction');
const second=await execute(assignment,control());
assert.equal(second.kind,'proposal');assert.equal(operation.correction,null);
assert.equal(second.value.checks[0].checkId,'source_fidelity');
assert.equal(second.value.checks[0].verdict,'supported');
assert.equal(second.value.checks[0].evidenceRefs.some(e=>e.id===state.evidence[1338].id),false);
assert.equal(JSON.stringify(await get(mixedRef)),rawBefore,'Paid reply must remain immutable');
const last=work.operationState.calls.at(-1),request=await get(last.requestRef),reply=await get(last.replyRef);
const recovery=projectRosterWorkflowFeedbackRecoveryV1({work,request,reply});
assert.equal(recovery?.repairKind,'review_patch_continuity');
assert.equal(recovery.additionalInvalidResultLimit,1);
assert.equal(projectRosterWorkflowFeedbackRecoveryV1({work:{...work,operationState:{...work.operationState,pending:{requestRef:'pending'}}},request,reply}),null);
const repaired=structuredClone(request);repaired.promptNodes.push({kind:'review_repair_continuity_contract',version:1});
assert.equal(projectRosterWorkflowFeedbackRecoveryV1({work,request:repaired,reply}),null,'A current-contract failure cannot obtain repeated grants');
assert.equal(projectRosterWorkflowFeedbackRecoveryV1({work:{...work,role:'roster_workflow_strategy_decision'},request,reply}),null);
console.log(JSON.stringify({pass:true,actualFailure:'e8707',scriptedModelCalls:calls,
  typedPatchPreserved:true,originalSourceObligationPreserved:true,readThenAuthorConfirmation:true,
  immutableReplies:true,exactRecoveryOnly:true,providerCalls:0,nativeCalls:0,productionWrites:0}));
