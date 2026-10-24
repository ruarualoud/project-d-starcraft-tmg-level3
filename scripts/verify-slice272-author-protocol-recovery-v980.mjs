// Concrete saved v979 stop: mixed diagnostics disabled the owner command.
// This checks only post-fix recovery eligibility, not strategic convergence.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {projectRosterWorkflowFeedbackRecoveryV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {prepareRosterAuthorCommandV1} from '../packages/roster-strategist/roster-workflow-author-command-v1.mjs';
const directory=process.argv[2];
const state=JSON.parse(await fs.readFile(directory+'/workflow.json','utf8'));
const work=state.work.find(w=>w.status==='needs_repair'&&w.id.endsWith(':capability-delivery-reconsideration:v2'));
assert(work);
const call=work.operationState.calls.at(-1);
assert.equal(call.replyRef,'66e5a10b77a0effa17f07ea208ef031489430f7b5e32de5ee944084534048116');
const get=async ref=>JSON.parse(await fs.readFile(directory+'/artifacts/'+ref+'.json','utf8'));
const request=await get(call.requestRef),reply=await get(call.replyRef);
const recovery=projectRosterWorkflowFeedbackRecoveryV1({work,reply,request});
assert.equal(recovery?.feedbackVersion,980,'The fixed mixed-diagnostic protocol needs one explicit continuation');
assert.equal(recovery.repairKind,'owner_handoff_command_continuity');
assert.equal(recovery.additionalInvalidResultLimit,1);assert.equal(recovery.historyReset,false);
const typed=prepareRosterAuthorCommandV1(request);assert(typed);
assert.equal(projectRosterWorkflowFeedbackRecoveryV1({work,reply,request:typed}),null,'The new command cannot renew its own grant');
const malformed=structuredClone(request);
delete malformed.promptNodes.find(n=>n.kind==='local_contract_feedback').originalOutput.decisions[0].nextInvestigation;
assert.equal(projectRosterWorkflowFeedbackRecoveryV1({work,reply,request:malformed}),null);
assert.equal(projectRosterWorkflowFeedbackRecoveryV1({work:{...work,operationState:{...work.operationState,pending:{requestRef:'in-flight'}}},reply,request}),null);
assert.equal(projectRosterWorkflowFeedbackRecoveryV1({work:{...work,failure:{code:'UNRELATED_FAILURE',dispatchOutcome:'completed_no_progress'}},reply,request}),null);
console.log(JSON.stringify({ok:true,checks:['actual_old_protocol_one_recovery','typed_command_cannot_renew','malformed_inflight_unrelated_denied'],providerCalls:0,nativeCalls:0,productionWrites:0}));
