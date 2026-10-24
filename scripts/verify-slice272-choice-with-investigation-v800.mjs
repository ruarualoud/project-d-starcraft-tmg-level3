// Actual v799 reply exposes two incompatible validators for a legitimate
// partial decision plus a different remaining fact. No fixture is production.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {rosterDecidedHereErrorsV1} from '../packages/roster-strategist/roster-workflow-author-handoff-v1.mjs';
import {rosterDecisionInvestigationErrorV1} from '../packages/roster-strategist/roster-workflow-fact-inquiry-v1.mjs';
import {projectRosterReviewDataQuestionsV1} from '../packages/roster-strategist/roster-review-data-questions-v1.mjs';
import {projectRosterWorkflowFeedbackRecoveryV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const root=process.argv[2],get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const reply=await get('e88720df5d4734761dc9bd9641f3151cbb4f5103733f455232b5ebc424ff9fe8');
const original=JSON.stringify(reply),decision=structuredClone(reply.output.decisions[0]);
assert.equal(rosterDecisionInvestigationErrorV1(decision)?.code,'bounded_investigation_authorization_invalid');
decision.disposition='investigate'; // isolate the exact action requested by existing error feedback
assert.equal(rosterDecisionInvestigationErrorV1(decision),null);
assert.deepEqual(rosterDecidedHereErrorsV1(decision),[],'per-question choices must not forbid investigation of OTHER pending facts');
const resolved=projectRosterReviewDataQuestionsV1(decision,{allowDecidedHere:true});
assert.equal(resolved.requiredData.length,1);assert.equal(resolved.decidedHere.length,2);
assert.deepEqual(decision.nextInvestigation.questionNumbers,[3]);
assert.ok(rosterDecisionInvestigationErrorV1({...decision,nextInvestigation:null}));
assert.ok(rosterDecisionInvestigationErrorV1({...decision,nextInvestigation:{...decision.nextInvestigation,questionNumbers:[4]}}));
assert.ok(rosterDecidedHereErrorsV1({...decision,disposition:'record_facts'}).length);
assert.equal(JSON.stringify(reply),original);
const state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const work=state.work.find(w=>w.status==='needs_repair'&&w.id.endsWith('frontier-return:e75757ed2707aeb1:strategy-frontier'));
assert.ok(work);
const latest=work.operationState.calls.at(-1),savedReply=await get(latest.replyRef),request=await get(latest.requestRef);
assert.equal(projectRosterWorkflowFeedbackRecoveryV1({work,reply:savedReply,request}).repairKind,'partial_choice_next_operation');
const repaired=structuredClone(request);
repaired.promptNodes.find(n=>n.kind==='strategic_question_lanes').partialChoicesCanCoexistWithInvestigation=true;
assert.equal(projectRosterWorkflowFeedbackRecoveryV1({work,reply:savedReply,request:repaired}),null,'new contract may not renew its own grant');
console.log(JSON.stringify({pass:true,actualReplyUnchanged:true,choicesAndPendingFactCoexist:true,
  missingFactNotApproved:true,incorrectInquiryStillRejected:true,realProviderCalls:0,nativeCalls:0,productionWrites:0}));
