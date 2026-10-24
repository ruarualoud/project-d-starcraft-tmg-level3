import fs from 'node:fs/promises';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import {prepareRosterTeachPremiseAuditV1,validateRosterTeachPremiseAuditV1,applyRosterTeachPremiseAuditV1} from '../packages/roster-strategist/roster-teach-source-review-v1.mjs';
const dir=process.argv[2];
const read=async suffix=>JSON.parse(zlib.gunzipSync(await fs.readFile(`${dir}/call-257.${suffix}.json.gz`)));
const request=await read('product-request'), reply=await read('reply');
const {plan,context}=request.promptNodes.find(n=>n.kind==='current_plan_and_frozen_context');
const state={agenda:structuredClone(reply.output)};
if(process.argv.includes('--diagnostics-only')) {
 const r=JSON.parse(zlib.gunzipSync(await fs.readFile(`${dir}/call-259.product-request.json.gz`)));
 const audit=r.promptNodes.find(n=>n.kind==='question_premise_audit');
 const o=JSON.parse(zlib.gunzipSync(await fs.readFile(`${dir}/call-261.reply.json.gz`))).output;
 // The actual audit also includes the generation issues attached after agenda.
 state.agenda.questions=audit.questions;
 // Preserve the request's exact agenda identity without rebuilding its omitted
 // evidenceRequest fields: read the original saved state at this boundary.
 const formal=JSON.parse(await fs.readFile(process.argv[process.argv.indexOf('--diagnostics-only')+1],'utf8'));
 state.agenda=formal.teachFramework.state.agenda;
 let error; try{validateRosterTeachPremiseAuditV1({state,audit,output:o});}catch(e){error=e;}
 assert.equal(error?.code,'ROSTER_TEACH_PREMISE_CURRENT_PLAN_QUOTE_NOT_BOUND');
 assert(error.message.includes('q-post-loss-marker5-contestant'),'Automatic repair must identify the exact bad question');
 assert(error.message.includes('deploymentConcept.reinforcementPolicyText'),'Automatic repair must identify the exact source field');
 console.log(JSON.stringify({pass:true,actualReply:261,preciseSourceCorrection:true,providerCalls:0}));
 process.exit(0);
}
const before=JSON.stringify({plan,context,reply});
const audit=prepareRosterTeachPremiseAuditV1({state,sourceReview:context.sourceReview,plan,previousInquiry:context.previousInquiry});
assert(audit,'A changed Plan with copied obsolete questions must enter automatic premise reconciliation before any query');
assert.equal(audit.currentPlanHash,plan.planHash);
const q=state.agenda.questions.find(q=>q.questionId==='q-timing-round4-committed');
assert(q.claim.includes('reach exactly 12'));
const current=audit.currentPlanClaims.find(c=>c.path==='deploymentConcept.deploymentConceptText'&&c.text.includes('Round 4 (cap 12, committed 10)'));
assert(current,'Exact current schedule prose must reach the audit; the old component allegation no longer exists');
const patch={questionId:q.questionId,premiseQuote:'reach exactly 12',qualificationFindingIndices:[],
 currentPlanEvidence:[{path:current.path,quote:current.text}],publicReason:'The prior allegation is not the current Plan claim.',
 claim:current.text,question:'Is the current conditional schedule supported by the delivered schedule facts?',
 alternatives:[],scenarioAssumptions:q.scenarioAssumptions,falsification:'A different current Rules schedule would refute this premise.',
 evidencePlan:'Read the current schedule and retained evidence before selecting any new query.'};
const output={publicReason:'Reconcile current prose without adjudicating strategy.',corrections:[patch]};
assert.throws(()=>validateRosterTeachPremiseAuditV1({state,audit,output:{...output,corrections:[{...patch,currentPlanEvidence:[{path:current.path,quote:'invented current claim'}]}]}}),/CURRENT_PLAN_QUOTE/);
assert.equal(applyRosterTeachPremiseAuditV1({state,audit,output}),true);
assert.equal(state.agenda.questions.find(x=>x.questionId===q.questionId).evidenceRequest,undefined,'An obsolete compulsory query cannot survive its corrected question');
assert.equal(state.questionPremiseAudit.priorAgenda.questions.find(x=>x.questionId===q.questionId).evidenceRequest.kind,'math');
assert.equal(prepareRosterTeachPremiseAuditV1({state,sourceReview:context.sourceReview,plan,previousInquiry:context.previousInquiry}),null,'A completed exact audit must not loop');
assert.equal(JSON.stringify({plan,context,reply}),before,'No mutation of paid replies, Plan or source context');
console.log(JSON.stringify({pass:true,actualReply:257,questions:state.agenda.questions.length,currentPlanClaims:audit.currentPlanClaims.length,paidReplyUnchanged:true,noQueriesOrProviderCalls:true}));
