// Real source-review v2 rejected matched placements by opaque identity alone.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {projectRosterWorkflowHypothesisContextV1} from '../packages/roster-strategist/roster-workflow-hypothesis-context-v1.mjs';
import {rosterComparisonValidityContractV1} from '../packages/roster-strategist/roster-comparison-purpose-v1.mjs';
const root=process.argv[2],resultFile=process.cwd()+'/build/slice272-v820-gate-'+Date.now()+'.json';
const get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
process.on('uncaughtException',async error=>{
  const result={pass:false,message:error.message,stack:error.stack?.split('\n').slice(0,6)};
  await fs.writeFile(resultFile,JSON.stringify(result,null,2));console.error(JSON.stringify(result));process.exitCode=1;
});
console.log(JSON.stringify({stage:'started',resultFile}));
const state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const work=state.work.find(w=>w.id.endsWith(':method:c8748d16f139bf05:source-revision:order-repair0'));
const baseline=state.evidence[1211-1],candidate=state.evidence[1231-1];
const before=hash(state),base=await get(baseline.artifactRef),raw=await get(candidate.artifactRef);
assert.notEqual(base.receipt.rulesRuntimeHash,raw.receipt.sceneProjectionReceipt.rulesRuntimeHash);
assert.deepEqual(base.receipt.hypotheticalPlacements.map(x=>x.modelPositions),
  raw.receipt.sceneProjectionReceipt.hypotheticalPlacements.map(x=>x.modelPositions));
const project=readArtifact=>projectRosterWorkflowHypothesisContextV1({state,workId:work.id,readArtifact});
const context=await project(get);
const rows=context.context.assetCatalogue.controlledSceneComparisons;
assert.ok(rows?.length,'the same role input must expose actual controlled scene comparisons, not just opaque hashes');
const row=rows.find(r=>r.targetScene.evidenceNumbers.includes(1231));
assert.ok(row.referenceScene.evidenceNumbers.includes(1211));
assert.equal(row.exactModelPositionsEqual,true);
assert.equal(row.wholeStateIdentityEqual,false);
assert.equal(row.runtimeCompositionIdentityEqual,false);
assert.equal(row.projectionCompatibility.rulesContract.rulesVersion,'official-current-product-standard-2000-singleton-identity-v6');
assert.equal(row.projectionCompatibility.terrainPreserved,true);
assert.equal(row.combinedAttackOutcomeProven,false);
assert.equal(row.strategyImprovementProven,false);
assert.equal(row.allControlledConditionsApproved,false);
// Local changed placement and missing source must not inherit an equality label.
for(const change of ['position','missing']){
  const changed=await project(async ref=>{
    const value=await get(ref);
    if(ref===candidate.artifactRef){
      const receipt=value.receipt.sceneProjectionReceipt;
      if(change==='position')receipt.hypotheticalPlacements[0].modelPositions[0].xInches+=1;
      else delete receipt.hypotheticalPlacements;
    }
    return value;
  });
  const actual=changed.context.assetCatalogue.controlledSceneComparisons.find(r=>r.targetScene.evidenceNumbers.includes(1231));
  assert.equal(actual.exactModelPositionsEqual,change==='position'?false:null);
  assert.equal(actual.allControlledConditionsApproved,false);
}
for(const role of ['roster_workflow_experiment_planner','roster_workflow_final_review','roster_workflow_strategy_decision']){
  const contract=rosterComparisonValidityContractV1({role,inputs:{comparisonPurpose:{}}});
  assert.ok(contract.version>=3);
  assert.equal(contract.identitySemantics.unequalIdentifiersProveControlledConditionMismatch,false);
  assert.equal(contract.hostChoosesStrategy,false);
}
assert.equal(hash(state),before);
const report={pass:true,actualDifferentRuntimeIdentities:true,actualSamePositions:true,
  changedPositionsDetected:true,missingPositionsRemainUnknown:true,sourcePathsKept:true,
  combinedOutcomeAndStrategyNotApproved:true,sharedThreeRoleContract:true,
  providerCalls:0,nativeCalls:0,productionWrites:0};
await fs.writeFile(resultFile,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
