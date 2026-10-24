import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {reviewRosterFinalPlanV3,buildRosterFinalPlanVerifiedFactsV1} from '../packages/roster-strategist/roster-final-plan-review-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const base=path.resolve(process.argv[2]);
const d=JSON.parse(await readFile(path.join(base,'query-contract-audit-v30/plan-production-v31/A/workspace/drafts/rws-1b0a31ec-fd74-433b-8531-4a2ce7019535.json'),'utf8'));
const versions=[...d.planVersionHistory.map(x=>JSON.parse(x)),JSON.parse(d.planSerialized)];
const plan=versions.find(p=>p.planVersion===7),previous=versions.find(p=>p.planVersion===6);
assert(plan&&previous,'Actual A6/A7 required');
const old=[...d.planReviewHistory,d.planReview].find(r=>r.planHash===previous.planHash&&r.status==='completed');
assert(old,'Actual completed A6 review required');
const input={plan,incrementalFrom:{plan:previous,review:old.review},sessionId:d.sessionId,
  armyAudit:d.working.verdict.audit,toolReceipts:d.toolReceipts,
  selectedCandidateInputHash:hash(d.selectedCandidateInput),
  selectionUnitRules:d.teachFramework.context.sourceFacts.selectionUnitRules,
  relatedRepairClaimPaths:[],adaptiveReview:true,allowFullReviewOnDependencyChange:false};
const prior=buildRosterFinalPlanVerifiedFactsV1({...input,plan:previous}).sourceFacts;
const current=buildRosterFinalPlanVerifiedFactsV1(input).sourceFacts;
console.log(JSON.stringify({factFieldsChanged:Object.keys(current).filter(k=>hash(prior[k])!==hash(current[k]))}));
let observed,error;
try {await reviewRosterFinalPlanV3({...input,deliberation:{async deliberate(request){
  observed=request.promptNodes.find(n=>n.kind==='frozen-plan-claims').sources.map(s=>s.path);
  throw Object.assign(new Error('CAPTURE_ONLY_NO_PROVIDER'),{code:'CAPTURE_ONLY_NO_PROVIDER'});
}}});}catch(e){error=e;}
assert.equal(error?.code,'CAPTURE_ONLY_NO_PROVIDER',`Actual A7 falls back to a whole-plan review instead of the four changed claims: ${error?.message}`);
assert.deepEqual([...observed].sort(),['componentPurposes.player1-faction','componentPurposes.player1-marine-1','scoreRoute.fallbackRouteText','publicSummaryText'].sort());
const altered=structuredClone(plan);altered.openingDeploymentSchedule.entries[0].round+=1;
let badError,badDispatches=0;
try {await reviewRosterFinalPlanV3({...input,plan:altered,deliberation:{async deliberate(){badDispatches++;throw Error('should not dispatch');}}});}catch(e){badError=e;}
assert.equal(badError?.code,'ROSTER_INCREMENTAL_REVIEW_DEPENDENCY_CHANGED');
assert.equal(badDispatches,0);
console.log(JSON.stringify({status:'PASS',actualA6ToA7OnlyFourClaims:true,changedScheduleStillRejected:true,providerCalls:0,roomActions:0}));
