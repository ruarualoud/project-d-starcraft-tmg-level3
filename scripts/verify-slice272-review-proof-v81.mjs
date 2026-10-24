// Captured B: a correct control-transfer quote was rejected because its
// numeric value was not the FIRST token and it lacked a second Plan quote.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { reconcileRosterFinalPlanReviewV1, effectiveRosterFinalPlanReviewFindingsV1,
  buildRosterReviewFactPacketV1 } from '../packages/roster-strategist/roster-final-plan-review-v1.mjs';
import { rosterReviewPremiseIssuesV1 } from '../packages/roster-strategist/roster-review-premises-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const base=process.argv[2];
const cfg=JSON.parse(await fs.readFile(base+'/common-v79-plan-recovery-config.private.json','utf8'));
const b=cfg.rows.find(r=>r.arm==='B');
const filename=b.dataDirectory+'/drafts/'+b.sessionId+'.json';
const before=await fs.readFile(filename,'utf8');const draft=JSON.parse(before);
const plan=JSON.parse(draft.planSerialized);
const inputs={plan,review:draft.planReview.review,sessionId:draft.sessionId,
  toolReceipts:draft.toolReceipts,retainedOutputs:draft.publicOutputs,
  selectionUnitRules:draft.teachFramework.context.sourceFacts.selectionUnitRules,
  selectedCandidateInputHash:hash(draft.selectedCandidateInput),
  selectionJustificationPolicyVersion:draft.agentSelectedStrategySource.selectionJustificationPolicyVersion,
  armyAudit:draft.working.verdict.audit};
const facts=buildRosterReviewFactPacketV1(inputs).premiseFacts;
let calls=0;
const result=await reconcileRosterFinalPlanReviewV1({...inputs,deliberation:{async deliberate(request){
  calls++; const targets=request.promptNodes.find(n=>n.kind==='literal-claims-to-qualify').targets;
  // The two 3VP transfer claims must recover from the exact paid FIRST reply.
  console.log(JSON.stringify({remaining:targets.map(t=>({index:t.findingIndex,quote:t.claimQuote}))}));
  assert.equal(targets.length,1,'source-bound transfer claims must reuse paid proof, not demand another Plan quote');
  assert.equal(targets[0].claimPath,'scoreRoute.routeText');
  const texts=request.promptNodes.find(n=>n.kind==='shared-rules-fact-catalogue').texts;
  return {output:{schemaVersion:'starcraft_tmg_roster_review_reconciliation_v1',roundKind:'final_review_reconciliation',
    judgments:[{findingIndex:targets[0].findingIndex,claimAssessment:'source_supported',evidenceScope:'settled_fact',
      publicReason:'Holding the named markers conditionally gives 2+1=3, not guaranteed control.',
      factChecks:[{factId:'',claimedValue:'3',claimValueQuote:'3 VP per scoring round',
        calculation:{operation:'sum',factIds:['marker-group:player1:player1:1,3','marker-group:player1:null:5']}}],
      sourceEvidence:texts.filter(t=>['marker-group:player1:player1:1,3','marker-group:player1:null:5'].includes(t.sourcePath))
        .map(t=>({evidenceId:t.evidenceId})),counterEvidence:[]}],publicSummary:'Local concrete contract check, not a paid strategy judgment.'},
    receipt:{paidProviderCall:false}};
}}});
assert.equal(calls,1);assert.equal(result.reviewAdjudication.reconciliation.unresolvedJudgments.length,0);
assert.equal(effectiveRosterFinalPlanReviewFindingsV1({plan,review:result}).filter(f=>f.severity==='high').length,0);
const target={findingIndex:0,category:'scoring',claimQuote:'Holding the named markers gives 4 VP.',claimText:'Holding the named markers gives 4 VP.'};
const wrong={findingIndex:0,claimAssessment:'source_supported',evidenceScope:'settled_fact',sourceEvidence:[],
  factChecks:[{factId:'',claimedValue:'4',claimValueQuote:'4 VP',calculation:{operation:'sum',
    factIds:['marker-group:player1:player1:1,3','marker-group:player1:null:5']}}]};
assert(rosterReviewPremiseIssuesV1({output:{judgments:[wrong]},targets:[target],facts}).some(i=>i.code==='FACT_ASSESSMENT_CONFLICT'));
const missing=structuredClone(wrong);missing.factChecks[0].calculation.factIds=['invented:fact'];
assert(rosterReviewPremiseIssuesV1({output:{judgments:[missing]},targets:[target],facts}).some(i=>i.code==='FACT_PREMISE_NOT_BOUND'));
assert.equal(await fs.readFile(filename,'utf8'),before);
console.log(JSON.stringify({status:'PASS',providerCalls:0,originalPaidProofReused:true,wrongSumStillRejected:true,
  absentSourceStillRejected:true,originalDraftUnchanged:true,roomActions:0}));
