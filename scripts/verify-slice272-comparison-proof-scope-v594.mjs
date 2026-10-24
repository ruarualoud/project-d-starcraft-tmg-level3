// Concrete590/596 promoted two sampled baseline numbers to Medic contribution,
// although the Native source explicitly excludes optional reaction effects.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {projectRosterExperimentSourceFactsV1} from '../packages/roster-strategist/roster-experiment-source-facts-v1.mjs';
import {createRosterExperimentSourceReviewV1} from '../packages/roster-strategist/roster-workflow-experiment-owner-v1.mjs';
const base=process.cwd()+'/build/slice272-projection-owner-v565-inlKbk/workspace/decision-workflows/projection-owner';
const state=JSON.parse(await fs.readFile(base+'/workflow.json','utf8'));
const get=async ref=>JSON.parse(await fs.readFile(base+'/artifacts/'+ref+'.json','utf8'));
const evidence=state.evidence[1123],value=await get(evidence.artifactRef),before=JSON.stringify(value);
const native=value.receipt.exchange.attackEstimates[0];
assert.equal(native.reactionOpportunitySet.baselineOutcomeDistributionExcludesOptionalReactionEffects,true);
const projected=projectRosterExperimentSourceFactsV1({evidence,value});
assert.equal(projected.exchange.estimates[0].reactionOpportunityScope?.baselineOutcomeDistributionExcludesOptionalReactionEffects,true,
  'source review must see the exact Native optional-effect exclusion beside the numbers');
assert.deepEqual(projected.exchange.estimates[0].uncertainty,native.uncertainty);
assert.deepEqual(projected.exchange.estimates[0].precision,native.precision);
assert.equal(JSON.stringify(value),before,'source receipt must not be rewritten');
const owner=state.work.find(w=>w.resultRef==='fdaa61218415ed2345360c931dca9f79e1eabc68e12c894fbc97aca10566143a')
  ??state.work.find(w=>w.experimentGoalId?.endsWith(':component_choices')&&w.resultRef);
// Use a synthetic unscheduled owner identity ONLY to inspect the real source-
// review assignment. No Provider/Native call, no production write or approval.
const review=await createRosterExperimentSourceReviewV1({state,owner:{...owner,id:'scope-regression-owner'},
  result:{value:{experimentConclusion:{status:'answered',evidenceRefs:[{id:evidence.id}]}}},store:{get}});
const criterion=review.inputs.review.value.obligations.find(c=>c.checkId==='source_fidelity').criterion;
assert.match(criterion,/causal/u);
assert.match(criterion,/optional reaction/iu);
assert.match(criterion,/combined/u);
assert.match(criterion,/phase.*trigger.*target.*payment/u);
console.log(JSON.stringify({passed:true,concreteReplies:[590,596],nativeOptionalEffectExclusionPreserved:true,
  sourceUnchanged:true,samplingUncertaintyPreserved:true,causalAndAggregationReviewRequired:true,
  providerCalls:0,productionWrites:0,proves:'Source scope delivery and reviewer criteria; real corrected conclusion still required'}));
