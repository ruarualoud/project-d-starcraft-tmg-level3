// The actual v3 Plan calls pool-zero Medics unable to contribute marker Supply.
// Exercise the shared revision/review fact builder, not a second prompt fixture.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {buildRosterFinalPlanVerifiedFactsV1} from '../packages/roster-strategist/roster-final-plan-review-v1.mjs';
const d=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
const plan=JSON.parse(d.planSerialized),context=d.teachFramework.context;
assert(plan.deploymentConcept.reinforcementPolicyText.includes('should never be counted as marker supply'));
const input={plan,toolReceipts:d.toolReceipts,teachState:d.teachFramework.state,
  selectedCandidateInputHash:context.selectedCandidateInputHash,
  selectionUnitRules:context.sourceFacts.selectionUnitRules,
  selectionSupportRules:context.sourceFacts.selectionSupportRules};
const before=JSON.stringify(plan),facts=buildRosterFinalPlanVerifiedFactsV1(input).sourceFacts;
assert.equal(facts.supplyValueContexts?.poolSupply.context,'supply_pool_calculation',
  'Actual shared facts omit the context boundary of poolSupply');
assert.equal(facts.supplyValueContexts.poolSupply.replacesCurrentSupply,false);
assert.equal(facts.supplyValueContexts.missionControl.context,'mission_marker_control');
assert.equal(facts.supplyValueContexts.missionControl.requiresCurrentNativeState,true);
const discounted=facts.roundSupplySchedule.entries.filter(e=>e.poolSupply===0&&e.startingSupply>0);
assert.equal(discounted.length,2);
for(const e of discounted)assert.equal(e.startingSupply,1);
assert.equal(JSON.stringify(plan),before);
console.log(JSON.stringify({ok:true,planVersion:plan.planVersion,discountedUnits:discounted.length,
  sourcePlanUnchanged:true,sharedRevisionAndReviewProjection:true,providerCalls:0}));
