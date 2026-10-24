import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {buildRosterReviewFactPacketV1,reconcileRosterFinalPlanReviewV1,effectiveRosterFinalPlanReviewFindingsV1} from '../packages/roster-strategist/roster-final-plan-review-v1.mjs';
import {normalizeRosterReviewEvidenceReferencesV1,rosterReviewPremiseIssuesV1} from '../packages/roster-strategist/roster-review-premises-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const base=process.argv[2],cfg=JSON.parse(await fs.readFile(base+'/common-v79-plan-recovery-config.private.json','utf8'));
const a=cfg.rows.find(r=>r.arm==='A'),file=a.dataDirectory+'/drafts/'+a.sessionId+'.json';
const before=await fs.readFile(file,'utf8'),d=JSON.parse(before),plan=JSON.parse(d.planSerialized);
const packet=buildRosterReviewFactPacketV1({plan,toolReceipts:d.toolReceipts,
  selectedCandidateInputHash:hash(d.selectedCandidateInput),armyAudit:d.working.verdict.audit,
  selectionUnitRules:d.teachFramework.context.sourceFacts.selectionUnitRules});
const paid=d.publicOutputs.findLast(o=>o.roundKind==='final_review_reconciliation'
  &&o.sanitizedOutput.judgments.some(j=>j.findingIndex===88&&j.factChecks.some(c=>c.factId.startsWith('fact:')))
  &&o.sanitizedOutput.judgments.some(j=>j.findingIndex===90));
assert(paid,'captured real v83 reply required');
const output=structuredClone(paid.sanitizedOutput);
output.judgments=output.judgments.filter(j=>[88,90].includes(j.findingIndex));
for(const j of output.judgments)j.sourceEvidence=j.sourceEvidence.map(e=>{
  const f=packet.evidenceCatalogue.find(f=>f.evidenceId===e.evidenceId);assert(f);
  return {sourcePath:f.sourcePath,sourceQuote:f.text};
});
const targets=output.judgments.map(j=>({...d.planReview.review.findings[j.findingIndex],findingIndex:j.findingIndex,
  claimText:d.planReview.review.findings[j.findingIndex].claimQuote}));
const result=normalizeRosterReviewEvidenceReferencesV1({output,facts:packet.premiseFacts});
const issues=rosterReviewPremiseIssuesV1({output:result.output,targets,facts:packet.premiseFacts});
console.log(JSON.stringify({issues:issues.map(i=>({code:i.code,findingIndex:i.findingIndex,factId:i.factId})),recoveries:result.recoveries},null,2));
assert.deepEqual(issues,[]);
const invalid=structuredClone(result.output);invalid.judgments.find(j=>j.findingIndex===88).factChecks[0].factId='fact:invented';
assert(rosterReviewPremiseIssuesV1({output:invalid,targets,facts:packet.premiseFacts}).some(i=>i.code==='FACT_PREMISE_NOT_BOUND'));
let freshCalls=0;
const restored=await reconcileRosterFinalPlanReviewV1({plan,review:d.planReview.review,sessionId:d.sessionId,
  toolReceipts:d.toolReceipts,retainedOutputs:d.publicOutputs,
  selectedCandidateInputHash:hash(d.selectedCandidateInput),armyAudit:d.working.verdict.audit,
  selectionUnitRules:d.teachFramework.context.sourceFacts.selectionUnitRules,
  deliberation:{async deliberate(){freshCalls++;throw Error('DO_NOT_REPURCHASE_COMPLETED_REPLIES');}}});
assert.equal(freshCalls,0);
assert.equal(restored.reviewAdjudication.reconciliation.unresolvedJudgments.length,0);
assert.equal(effectiveRosterFinalPlanReviewFindingsV1({plan,review:restored}).filter(f=>f.severity==='high').length,0);
assert.equal(await fs.readFile(file,'utf8'),before);
console.log(JSON.stringify({status:'PASS',providerCalls:0,roomActions:0,originalPaidOutputUnchanged:true,
  exactCatalogueIdsOnly:true,nonnumericExtraIsNotAnAssertion:true}));
