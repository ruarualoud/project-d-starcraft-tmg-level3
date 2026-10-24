// Concrete P4/P5 bug: owner_returned could mean a comparison was still
// unmeasured/optional. The product must not equate that with "which is better".
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import * as cycleModule from '../packages/roster-planning-workspace/roster-hypothesis-cycle-v1.mjs';
const base=path.join(process.cwd(),'build/slice272-product-generation-v645-I7zekC/workspace/decision-workflows/decision-959c1d9c-d6e0-43b4-8196-faef5b42fc34');
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const get=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const draft=await get(state.draftRef),before=JSON.stringify(state);
const actual=await cycleModule.assessRosterProductHypothesisCycleV1({state,draft,readArtifact:get});
assert.equal(actual.ownerReturned,true,'actual strategic owner did return');
assert.equal(actual.comparisonResolved,false,'owner return is NOT evidence that the strategic comparison was completed');
const requests=[],run={requestStrategicComparisonReview:async input=>requests.push(input),requestDecision:async input=>requests.push(input)};
await cycleModule.progressRosterProductComparisonV1({run,state,draft,cycle:actual,allowDecision:false});
assert.equal(requests.length,1);assert.equal(requests[0].reviewRound,1);
assert.equal(requests[0].ownerWorkId,actual.ownerWorkId);
const review={id:requests[0].id,role:'roster_workflow_final_review',status:'evidence_ready',draftRevision:draft.revision,
  strategyComparisonCycleId:actual.id,reviewRound:1,resultRef:'controlled-comparison-review'};
const next={...structuredClone(state),work:[...structuredClone(state.work),review]};
let check={checkId:'strategy_comparison',verdict:'supported',publicReason:'CONTROLLED fixture, not a model result',requiredData:[],
  evidenceRefs:[{id:'controlled-condition-comparison'}],conditions:['one declared scene only']};
const readArtifact=ref=>ref===review.resultRef?Promise.resolve({kind:'proposal',value:{checks:[check]}}):get(ref);
const passed=await cycleModule.assessRosterProductHypothesisCycleV1({state:next,draft,readArtifact});
assert.equal(passed.comparisonResolved,true);assert.equal(passed.strategyImprovementProven,false,'a local comparison is not a win-rate proof');
check={...check,requiredData:['missing actual benefit after the extra action']};
const missing=await cycleModule.assessRosterProductHypothesisCycleV1({state:next,draft,readArtifact});
assert.equal(missing.comparisonResolved,false,'supported plus missing measurements must not pass');
requests.length=0;
await cycleModule.progressRosterProductComparisonV1({run,state:next,draft,cycle:missing,allowDecision:true});
assert.equal(requests.length,1);assert.equal(requests[0].inputs.comparisonReview.id,review.id);
assert.ok(requests[0].question.goal.includes('哪个更好'));
assert.equal(JSON.stringify(state),before);
console.log(JSON.stringify({passed:true,actualOwnerReturnedWithoutComparisonReproduced:true,
  explicitComparisonReviewRequired:true,missingBenefitStillBlocks:true,comparisonIsNotWinRateProof:true,
  controlledReviewFixture:true,providerCalls:0,nativeCalls:0,productionWrites:0,actualStrategyImprovementProven:false}));
