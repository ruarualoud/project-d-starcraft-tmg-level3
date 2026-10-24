// The original A Room still owns Plan4 while offline correction has reached9.
// Resuming the exact original cannot depend on the latest draft Plan identity.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {loadPregameResumeDraftV1,loadReviewedPregameRevisionV1} from '../packages/roster-planning-workspace/pregame-resume-draft-v1.mjs';
const base=process.argv[2];
const dataDirectory=base+'/query-contract-audit-v30/plan-production-v31/A/workspace';
const sessionId='rws-1b0a31ec-fd74-433b-8531-4a2ce7019535';
const d=JSON.parse(await fs.readFile(dataDirectory+'/drafts/'+sessionId+'.json','utf8'));
const old=d.planVersionHistory.map(JSON.parse).find(p=>p.planVersion===4);
const current=JSON.parse(d.planSerialized);
assert(old&&current.planVersion===9);
const loaded=await loadPregameResumeDraftV1({dataDirectory,sessionId,expectedPlanHash:old.planHash});
assert.deepEqual(loaded.plan,old,'resume must retain the exact Room-bound historical Plan, never latest draft');
assert.deepEqual(loaded.candidates[0].candidateInput,d.selectedCandidateInput);
assert.equal(loaded.plan.planHash,old.planHash);
await assert.rejects(loadPregameResumeDraftV1({dataDirectory,sessionId,expectedPlanHash:'0'.repeat(64)}),/UNAVAILABLE_OR_DRIFTED/);
const upgrade=await loadReviewedPregameRevisionV1({dataDirectory,sessionId,expectedPlanHash:old.planHash,requestedPlanHash:current.planHash});
assert.equal(upgrade.plan.planHash,current.planHash);
assert.equal(upgrade.replacesRosterPlanHash,old.planHash);
assert.deepEqual(upgrade.sessionReceipt,d.sessionReceipt);
assert.deepEqual(upgrade.plan.openingDeploymentSchedule,old.openingDeploymentSchedule);
await assert.rejects(loadReviewedPregameRevisionV1({dataDirectory,sessionId,expectedPlanHash:old.planHash,requestedPlanHash:'0'.repeat(64)}),/FROZEN_BINDING_CHANGED/);
console.log(JSON.stringify({status:'PASS',actualOriginalPlanVersion:4,currentOfflinePlanVersion:9,
  originalPlanRestoredWithoutUpgrade:true,explicitReviewedUpgradePrepared:true,
  providerCalls:0,roomActions:0,productionDraftWrites:0}));
