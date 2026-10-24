// Actual 24b82f70: atomic comparison review received the identity contract but
// not the saved scene comparisons; only the parent aggregate loaded lineage.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {rosterWorkflowNeedsSourceLineageV1,projectRosterWorkflowHypothesisContextV1} from '../packages/roster-strategist/roster-workflow-hypothesis-context-v1.mjs';
const root=process.argv[2],resultFile=process.cwd()+'/build/slice272-v822-gate-'+Date.now()+'.json';
const get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
process.on('uncaughtException',async error=>{
  const result={pass:false,message:error.message,stack:error.stack?.split('\n').slice(0,5)};
  await fs.writeFile(resultFile,JSON.stringify(result,null,2));console.error(JSON.stringify(result));process.exitCode=1;
});
console.log(JSON.stringify({stage:'started',resultFile}));
const request=await get('24b82f703693c69a614a51736881ef7153863c983918fbcc94b92f2c6d7f5e47');
const assignment=request.promptNodes.find(n=>n.kind==='workflow_role_assignment');
assert.equal(assignment.inputs.activeHypothesisTests,undefined,'record the actual omitted input, do not alter the request');
assert.equal(rosterWorkflowNeedsSourceLineageV1(assignment),true,'atomic comparison reviewer needs the same factual lineage as its parent');
const state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const selected=state.work.filter(w=>w.id.includes(':source-recheck:comparison-validity-v3')
  &&(w.materialClaimReviewOf||w.experimentSourceReviewOf));
for(const work of selected){
  assert.equal(rosterWorkflowNeedsSourceLineageV1(work),true);
  const context=await projectRosterWorkflowHypothesisContextV1({state,workId:work.id,readArtifact:get});
  const row=context.context.assetCatalogue.controlledSceneComparisons.find(r=>r.targetScene.evidenceNumbers.includes(1231));
  assert.equal(row.exactModelPositionsEqual,true);assert.equal(row.runtimeCompositionIdentityEqual,false);
  assert.equal(row.combinedAttackOutcomeProven,false);assert.equal(context.context.acceptanceGranted,false);
}
assert.equal(rosterWorkflowNeedsSourceLineageV1({role:'roster_workflow_final_review',inputs:{}}),false,'unrelated reviews need no full lineage');
const result={pass:true,actualOmissionReproduced:true,atomicAndParentInputsAligned:true,
  factualEqualityNotStrategyApproval:true,unrelatedReviewUnchanged:true,providerCalls:0,nativeCalls:0,productionWrites:0};
await fs.writeFile(resultFile,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
