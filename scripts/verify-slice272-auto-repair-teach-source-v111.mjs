// B18's completed Teach belongs to B14. Automatic repair must explicitly
// forward that identity to the workspace's existing frozen-dependency check.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {runReviewedRosterPlanRepairV1} from '../packages/roster-planning-workspace/reviewed-plan-auto-repair-v1.mjs';
const base=process.argv[2];
const d=JSON.parse(await fs.readFile(base+'/query-contract-audit-v30/roster-deliberation-live-v43/workspace/drafts/rws-6c164d9d-406a-425a-9f83-688bbe629226.json','utf8'));
const plan=[...d.planVersionHistory.map(JSON.parse),JSON.parse(d.planSerialized)].find(x=>x.planVersion===18);
assert(plan&&d.teachFramework.status==='completed');
assert.notEqual(plan.planHash,d.teachFramework.planHash);
// Isolate the confirmed citation defect as one concrete review finding. This
// is not a paid review or a claim that the current stored review detected it.
const current={status:'planned',plan,teachFramework:{status:d.teachFramework.status,planHash:d.teachFramework.planHash},
  planReview:{status:'completed',planHash:plan.planHash,review:{planHash:plan.planHash,
    findings:[{severity:'high',category:'geometry',claimPath:'deploymentConcept.threatTradeText',
      claimQuote:'u-marauder-1 at (27,18)',reason:'Original recovered coordinates differ; marker distance does not prove attack.'}]}}};
let request;
await assert.rejects(runReviewedRosterPlanRepairV1({sessionId:d.sessionId,expectedPlanHash:plan.planHash,
  authorizeAdditionalCycle:true,service:{readSession:()=>current,
    revisePlan:async(_id,r)=>{request=r;throw Error('CAPTURED_AUTO_REPAIR');}}}),/CAPTURED_AUTO_REPAIR/);
assert(request);
assert.equal(request.sourceTeachPlanHash,d.teachFramework.planHash,
  'automatic repair must retain the actual completed source Teach, not silently omit it after Plan revision');
assert(request.targetedClaimPaths.includes('deploymentConcept.threatTradeText'));
console.log(JSON.stringify({status:'PASS',capturedB18AutomaticRepair:true,originalTeachIdentityForwarded:true,
  providerCalls:0,roomActions:0,productionDraftWrites:0}));
