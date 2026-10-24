// Actual B correction retained both marker IDs using the native {kind,id}
// contract; the scope guard falsely rejected them as missing targetIds.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {assessRosterTeachQueryCorrectionScopeV1,recoverRosterTeachQueriesV1} from '../packages/roster-strategist/roster-teach-query-recovery-v1.mjs';
const d=JSON.parse(await fs.readFile(process.argv[2]+'/query-contract-audit-v30/roster-deliberation-live-v43/workspace/drafts/rws-6c164d9d-406a-425a-9f83-688bbe629226.json','utf8'));
const original=d.teachFramework.state.queryRecovery.operations.find(o=>o.originalQueryId==='q-capability-demand-2-4-reach-scenario-v4');
assert.equal(original.status,'scope_changed_not_executed');
assert.deepEqual(original.result.missingScopeValues,['mission-marker-2','mission-marker-4']);
const op=structuredClone(original),failures=[];
if(!assessRosterTeachQueryCorrectionScopeV1(op.originalRequest,op.request).sameNamedScope) failures.push('native typed marker IDs falsely rejected');
const missing=structuredClone(op.request);
missing.toolRequest.followUps=missing.toolRequest.followUps.filter(f=>JSON.parse(f.argumentsJson).target.id!=='mission-marker-4');
missing.toolRequest.note='mission-marker-4';
if(assessRosterTeachQueryCorrectionScopeV1(op.originalRequest,missing).sameNamedScope)failures.push('prose must not substitute missing typed target');
let calls=0,asks=0;
const state={agenda:{questions:[{questionId:op.questionId,evidenceRequest:op.originalRequest}]},evidence:[],
  investigation:{operations:[{queryId:op.originalQueryId,questionId:op.questionId,request:op.originalRequest}],evidence:[op.originalResult]},
  queryRecovery:{selection:{queryIds:[op.originalQueryId]},operations:[op]}};
await recoverRosterTeachQueriesV1({state,plan:{},context:{},sourceHash:'c'.repeat(64),completedBeforeRun:true,
  checkpoint:async()=>{},ask:async()=>{asks++;return{disposition:'defer',publicReason:'unexpected fresh correction'};},
  evidencePort:{descriptor:()=>({descriptorHash:'a'.repeat(64)}),query:async q=>{calls++;assert.deepEqual(q.request,original.request);
    return{status:'advisory',receiptHash:'b'.repeat(64)};}}});
if(calls!==1||asks!==0)failures.push('reuse the exact paid structurally scoped correction without buying it again');
if(op.choices.length!==1||op.maximumAttempts!==3)failures.push('retain original attempt accounting');
assert.deepEqual(failures,[]);
console.log(JSON.stringify({status:'PASS',actualTypedTargetsRetained:true,missingTargetStillRejected:true,
  exactPaidRequestExecutedAtBoundary:true,providerCalls:0,roomActions:0,geometryOrStrategyProven:false}));
