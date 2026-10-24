// Exact stopped v978 request: OWNER delivery exists, but the old packet still
// assigned the global ledger and already-closed comparison inline.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {projectRosterWorkflowFeedbackRecoveryV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const directory=process.argv[2];
const state=JSON.parse(await fs.readFile(directory+'/workflow.json','utf8'));
const work=state.work.find(w=>w.id.endsWith(':capability-delivery-reconsideration:v2'));
const call=work.operationState.calls.at(-1);
const get=async ref=>JSON.parse(await fs.readFile(directory+'/artifacts/'+ref+'.json','utf8'));
const request=await get(call.requestRef),reply=await get(call.replyRef);
assert.equal(call.replyRef,'768b85b79b36ca1352993f07b0ed2bb69be0844af463d9335c417a27ebdc2177');
const recovery=projectRosterWorkflowFeedbackRecoveryV1({work,reply,request});
assert.equal(recovery?.feedbackVersion,979,'Only the concretely repaired old scope packet can resume once');
assert.equal(recovery.repairKind,'scoped_semantic_correction_context');
assert.equal(recovery.additionalInvalidResultLimit,1);assert.equal(recovery.historyReset,false);
const fixed=structuredClone(request);
fixed.promptNodes.find(n=>n.kind==='strategy_owner_context').assignmentScope={questionCount:4,
  globalLedgerIsCurrentAssignment:false,closedComparisonIsCurrentAssignment:false,deferredObligationsDeleted:false};
assert.equal(projectRosterWorkflowFeedbackRecoveryV1({work,reply,request:fixed}),null);
assert.equal(projectRosterWorkflowFeedbackRecoveryV1({work:{...work,operationState:{...work.operationState,pending:{requestRef:'in-flight'}}},reply,request}),null);
assert.equal(projectRosterWorkflowFeedbackRecoveryV1({work:{...work,failure:{code:'UNRELATED_FAILURE',dispatchOutcome:'completed_no_progress'}},reply,request}),null);
console.log(JSON.stringify({ok:true,check:'actual_old_scope_one_recovery_no_renewal_or_inflight_override',
  providerCalls:0,nativeCalls:0,productionWrites:0}));
