import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {reconcileRosterFinalPlanReviewV1,buildRosterReviewFactPacketV1} from '../packages/roster-strategist/roster-final-plan-review-v1.mjs';
import {rosterReviewPremiseIssuesV1} from '../packages/roster-strategist/roster-review-premises-v1.mjs';
const [directory,formalFile]=process.argv.slice(2);
const saved=JSON.parse(await fs.readFile(formalFile,'utf8'));
const read=async(n,k)=>JSON.parse(gunzipSync(await fs.readFile(`${directory}/call-${n}.${k}.json.gz`)));
const request=await read('068','product-request');
const reply=await read('082','reply');
const actual=await read('082','product-request');
const input={plan:JSON.parse(saved.planSerialized),review:saved.planReview.review,
  sessionId:saved.sessionId,toolReceipts:saved.toolReceipts,
  selectedCandidateInputHash:hash(saved.selectedCandidateInput),
  selectionUnitRules:request.promptNodes.find(n=>n.kind==='verified-structured-facts').sourceFacts.selectionUnitRules,
  selectionJustificationPolicyVersion:'unit_role_comparison_v1',
  armyAudit:saved.working?.verdict?.audit || saved.lockedRoster?.lock?.verdict?.audit,
  recoveryCheckpoint:saved.reviewReconciliation.recoveryCheckpoint,
  retainedOutputs:saved.publicOutputs};
let checkpoint,nextRequest;
try {await reconcileRosterFinalPlanReviewV1({...input,onCheckpoint:c=>{checkpoint=c;},
  deliberation:{async deliberate(q){nextRequest=q;throw Error('CAPTURE_ONLY_NO_PROVIDER');}}});}
catch(e){assert.equal(e.message,'CAPTURE_ONLY_NO_PROVIDER');}
assert(checkpoint.attempts.some(a=>a.wireOutputHash===hash(reply.output)&&a.retainedPaidReply),
  'Paid actual082 is skipped on recovery rather than decoded and validated before any new call');
const packet=buildRosterReviewFactPacketV1(input);
const judgment=structuredClone(reply.output.judgments[0]);
judgment.sourceEvidence=judgment.sourceEvidence.map(e=>{const f=packet.evidenceCatalogue.find(f=>f.evidenceId===e.evidenceId);return {sourcePath:f.sourcePath,sourceQuote:f.text};});
judgment.counterEvidence=[];
const issues=rosterReviewPremiseIssuesV1({output:{judgments:[judgment]},targets:actual.promptNodes[0].targets,facts:packet.premiseFacts});
assert(issues.some(i=>i.code==='SCORING_QUANTITY_DOMAIN_MISMATCH'),
  'Control Supply must not be evaluated as marker VP or tell the model that its numeric value is VP');
assert(!issues.some(i=>i.code==='FACT_ASSESSMENT_CONFLICT'),'Wrong numeric domain must not invent a source contradiction');
if(nextRequest)assert(nextRequest.promptNodes.find(n=>n.kind==='failed-item-feedback').items.length,
  'Recovery must send actual validation feedback, not an empty new review');
assert.equal(JSON.parse(await fs.readFile(formalFile,'utf8')).planSerialized,saved.planSerialized);
console.log(JSON.stringify({pass:true,checks:4,actualPaidReplyRevalidated:true,wrongQuantityRejected:true,providerCalls:0,roomWrites:0}));
