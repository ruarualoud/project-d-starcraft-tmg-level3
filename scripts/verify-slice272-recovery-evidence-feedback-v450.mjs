// Concrete live bug: paid272 repaired a local move, but its unresolved strategic
// question went straight to synthesis without consuming the new Native result.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { rosterTeachInvestigationWindowV1 as windowFor } from '../packages/roster-strategist/roster-teach-capability-guide-v1.mjs';
const draft=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
const state=draft.teachFramework.state;
assert.equal(state.investigation.completed,true);
assert.equal(state.queryRecovery.operations.length,1);
const op=state.queryRecovery.operations[0];
assert.equal(op.result.receiptHash,'e8e97e476a088eb5f1cf18fb609611dbe6ca5faf3bf93fe9bf86e676f1039db9');
assert.equal(op.result.evidenceReadiness.usableForClaim,true);
const originalResult=JSON.stringify(op.result),originalPlan=draft.planSerialized;
// Equivalent to the existing UNSENT-boundary recovery, not changing disk data.
delete state.pendingModelCall;
const handoff=windowFor(state).recoveryReplan;
assert(handoff,'Successful query repair bypasses its unresolved question owner');
assert.equal(handoff.reason,'repaired_native_result_requires_question_interpretation');
assert.deepEqual(handoff.questionIds,[op.questionId]);
assert.deepEqual(handoff.recoveryReceiptHashes,[op.result.receiptHash]);
assert.equal(handoff.automaticallyAnswered,false);
assert.equal(handoff.historyReset,false);
state.investigation.recoveryReplanHistory=[...(state.investigation.recoveryReplanHistory||[]),handoff];
state.investigation.recoveryReplanContinuation=handoff;
state.investigation.completed=false;
let active=windowFor(state);
assert.deepEqual(active.questionIds,[op.questionId]);
assert.equal(active.limit,handoff.startRound+1);
assert.equal(active.recoveryReplan,undefined);
state.investigation.rounds.push({completed:true,output:{queries:[],unresolved:[{questionId:op.questionId,missingEvidence:'Full arrival still needs a Native sequence'}],questionProgress:[{questionId:op.questionId,disposition:'unresolved_handoff',evidenceQueryIds:[op.queryId],publicReason:'A local move is not a full arrival'}]}});
state.investigation.completed=true;
active=windowFor(state);
assert.equal(active.recoveryReplan,undefined,'Identical result must not reopen again');
assert.equal(active.progress.stopped,true);
assert.equal(JSON.stringify(op.result),originalResult);
assert.equal(draft.planSerialized,originalPlan);
console.log(JSON.stringify({ok:true,actualPaidSelection:272,nativeReceipt:op.result.receiptHash,questionCount:1,oneFeedbackPerReceipt:true,unknownNotAccepted:true,providerCalls:0,nativeExecutions:0,originalsUnchanged:true}));
