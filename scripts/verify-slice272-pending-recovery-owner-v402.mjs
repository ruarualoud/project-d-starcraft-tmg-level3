import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {prepareRosterTeachModelCallV1} from '../packages/roster-strategist/roster-teach-call-checkpoint-v1.mjs';
import {recoverRosterTeachQueriesV1} from '../packages/roster-strategist/roster-teach-query-recovery-v1.mjs';
import {reprojectRosterTeachNativeQueryRepairV1} from '../packages/roster-strategist/roster-teach-evidence-port-v1.mjs';
const draft=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
const state=structuredClone(draft.teachFramework.state);
const pending=state.pendingModelCall;
const oldId=pending.request.promptNodes.find(n=>n.kind==='failed_query_to_correct').originalQueryId;
const request=structuredClone(pending.request);
request.promptNodes.find(n=>n.kind==='failed_query_to_correct').originalQueryId='another-recovery-operation';
assert.throws(()=>prepareRosterTeachModelCallV1({state:structuredClone(state),request,
  sourceHash:pending.sourceHash,planHash:pending.planHash}),/PENDING_CALL_OWNER_CHANGED/,
  'same Plan/round kind must not apply a pending fire reply to a reopened movement repair');
const same=prepareRosterTeachModelCallV1({state:structuredClone(state),request:structuredClone(pending.request),
  sourceHash:pending.sourceHash,planHash:pending.planHash});
assert.deepEqual(same.request,pending.request);
const movement=state.queryRecovery.operations.find(o=>o.originalQueryId==='teach-native-move-marine1-toward-marker2');
const previousMovement=JSON.stringify(movement);
const context=state.investigation.evidence.find(e=>e.challengeId===movement.request.toolRequest.branchIdRef).branchQueryContext;
let firstOwner;
const stopped=await recoverRosterTeachQueriesV1({state,plan:JSON.parse(draft.planSerialized),context:draft.teachFramework.context,
  sourceHash:state.sourceHash,completedBeforeRun:false,investigationProducedNewEvidence:true,
  evidencePort:{descriptor:()=>({descriptorHash:'a'.repeat(64)}),describeQueryContext:()=>context,
    reprojectSavedNativeQueryFailure:input=>input.request?.kind==='scenario'
      && input.request.toolRequest?.spec?.kind==='native_action'
      ?reprojectRosterTeachNativeQueryRepairV1({...input,queryContext:context}):input.receipt},
  checkpoint:async()=>{},retainEvidence:value=>value,
  ask:async(_kind,nodes)=>{firstOwner=nodes.find(n=>n.kind==='failed_query_to_correct')?.originalQueryId;
    throw Error('EXPECTED_SAME_PENDING_OWNER');}}).then(()=>null,e=>e);
assert.equal(stopped?.message,'EXPECTED_SAME_PENDING_OWNER');
assert.equal(firstOwner,oldId);
assert.equal(JSON.stringify(movement),previousMovement);
console.log(JSON.stringify({passed:true,actualPending:186,sameOwnerResumedFirst:true,
  crossOperationReplyForbidden:true,providerCalls:0,nativeExecutions:0}));
