// Actual paid r14 review approved a no-immediate-marker-delta comparison even
// though an enabling ability's subsequent action was not measured. Its one
// positive verdict cannot replace an independent experiment-design check.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import * as cycle from '../packages/roster-planning-workspace/roster-hypothesis-cycle-v1.mjs';
const base=path.join(process.cwd(),'build/slice272-product-generation-v645-M86Cg9/workspace/decision-workflows/decision-58c2b2f9-e4cf-4b5d-9ac3-4c8c36bbb0e1');
const original=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const get=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const actual=original.work.find(w=>w.strategyComparisonCycleId&&w.draftRevision===14);
const event=original.events.find(e=>e.type==='draft_committed'&&e.revision===14);
assert(actual?.resultRef&&event?.draftRef,'use the actual saved r14 review and draft');
const draft=await get(event.draftRef),state=structuredClone(original);
state.scope.plan=draft.plan.planHash;state.draftRevision=14;state.draftRef=event.draftRef;
// Explicit isolated reconstruction of the historical assessment seam only;
// the real r14 work remains superseded and its paid reply is immutable.
state.work=state.work.filter(w=>!w.strategyComparisonCycleId||w.id===actual.id);
Object.assign(state.work.find(w=>w.id===actual.id),{status:'evidence_ready'});
const verdict=(await get(actual.resultRef)).value.checks.find(c=>c.checkId==='strategy_comparison');
assert.equal(verdict.verdict,'supported');assert.equal(verdict.requiredData.length,0);
const assessed=await cycle.assessRosterProductHypothesisCycleV1({state,draft,readArtifact:get});
assert.equal(assessed.comparisonResolved,false,'actual paid positive comparison alone must not pass without design validity');
assert.ok(assessed.comparisonMissingCheckIds.includes('comparison_design'));
const simulated=structuredClone(state);const row=simulated.work.find(w=>w.id===actual.id);
row.resultRef='CONTROLLED-design-review';row.comparisonContractVersion=2;
let design={checkId:'comparison_design',verdict:'needs_evidence',publicReason:'effect not observed after it could generate value',
  evidenceRefs:[{id:'controlled-observation'}],requiredData:['measure the enabled action benefit'],conditions:[]};
const readArtifact=ref=>ref===row.resultRef?Promise.resolve({kind:'proposal',value:{checks:[design,verdict]}}):get(ref);
assert.equal((await cycle.assessRosterProductHypothesisCycleV1({state:simulated,draft,readArtifact})).comparisonResolved,false);
design={...design,verdict:'supported',requiredData:[]};
const accepted=await cycle.assessRosterProductHypothesisCycleV1({state:simulated,draft,readArtifact});
assert.equal(accepted.comparisonResolved,true);assert.equal(accepted.strategyImprovementProven,false);
const captured=[];
await cycle.progressRosterProductComparisonV1({run:{requestStrategicComparisonReview:async value=>captured.push(value)},
  state,draft,cycle:assessed,allowDecision:false});
assert.equal(captured.length,1);assert.equal(captured[0].reviewRound,actual.reviewRound);
assert.ok(captured[0].id.endsWith(':design-contract-v2'),'one typed read-only recheck, not rewriting the strategic choice');
assert.deepEqual(cycle.ROSTER_STRATEGIC_COMPARISON_OBLIGATIONS_V1.map(o=>o.checkId),['comparison_design','strategy_comparison']);
console.log(JSON.stringify({passed:true,actualPaidPositiveReviewUsed:true,historicalSeamReconstruction:true,
  absentOrFailedDesignCannotPass:true,bothIndependentObligationsRequired:true,typedReviewKeepsRound:true,
  successBranchControlledOnly:true,providerCalls:0,nativeCalls:0,productionWrites:0,actualBenefitProven:false}));
