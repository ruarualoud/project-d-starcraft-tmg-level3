// Actual r5: 20k DFS compounds starve later mutation families. Observe the
// generator with the real frozen menu, not fake strategic/Rules conclusions.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {queryRosterBudgetBranchesV1} from '../packages/roster-strategist/roster-budget-branch-query-v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=path.join(root,'build/slice272-product-generation-v645-M86Cg9/workspace/decision-workflows/decision-58c2b2f9-e4cf-4b5d-9ac3-4c8c36bbb0e1');
const get=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const draft=await get(state.draftRef),baseline=await get(draft.builderVerdictRef),menu=await get(state.evidence.find(e=>e.id==='product:builder-menu').artifactRef);
assert.equal(draft.revision,5);assert.equal(baseline.summary.mineralSpent,1610);
const execute=args=>{let calls=0;return queryRosterBudgetBranchesV1({candidateInput:draft.candidateInput,
  maximumEvaluations:256,maximumMutationDepth:5,...args,armyBuilderPort:{enumerateArmyBuildingChoices:()=>structuredClone(menu),
    evaluateRosterCandidate:()=>++calls===1?structuredClone(baseline):{
      schema:'controlled_generator_observation_not_rules_verdict',status:'unknown',rejectionKind:'controlled_observation_only'}}});};
const signature=r=>r.rejectedBranches.map(b=>({branchId:b.branchId,candidateHash:b.candidateHash,steps:b.steps}));
const legacy=execute({startOffset:0}),legacyFixture=path.join(root,'build/slice272-budget-generation-v674-legacy.json');
try{assert.deepEqual(signature(legacy),JSON.parse(await fs.readFile(legacyFixture,'utf8')));}
catch(error){if(error.code!=='ENOENT')throw error;await fs.writeFile(legacyFixture,JSON.stringify(signature(legacy)),{flag:'wx'});}
const count=r=>r.rejectedBranches.filter(b=>b.mutationKind==='compound'&&b.steps.every(s=>s.mutationKind==='add_upgrade')).length;
assert.equal(count(legacy),0,'the actual old-frontier starvation pattern must be reproduced');
const started=performance.now(),wide=execute({startOffset:0,generationPolicy:'breadth_first_v2'}),elapsedMs=performance.now()-started;
assert.equal(wide.generationPolicy,'breadth_first_v2');
// The final audit-page order still prefers slot-fit and budget proximity. The
// bug is population starvation BEFORE that sort, not a requirement that every
// first page contain every family.
assert(wide.generationCoverage.upgradeOnlyCompounds>0,'the finite population must cover upgrade-only combinations before final page ordering');
assert.equal(wide.nextPage.generationPolicy,'breadth_first_v2');assert.equal(wide.nextPage.maximumMutationDepth,5);
assert.equal(wide.nextPage.maximumEvaluations,256);
const explicitLegacy=execute({startOffset:0,generationPolicy:'legacy_depth_first_v1'});
assert.deepEqual(signature(explicitLegacy),signature(legacy));
const next=execute(wide.nextPage);assert.equal(next.startOffset,wide.nextOffset);
assert(!signature(next).some(b=>signature(wide).some(p=>p.branchId===b.branchId)));
assert.equal(wide.exactBudgetImpossibilityClaimed,false);assert.equal(wide.strategyRankingPerformed,false);
console.log(JSON.stringify({status:'passed',sourceRevision:5,legacyPureUpgradeCompounds:count(legacy),
  newPagePureUpgradeCompounds:count(wide),newPopulationCoverage:wide.generationCoverage,elapsedMs,
  legacyCandidateOrderPreserved:true,newCursorCarriesSearchPolicy:true,
  providerCalls:0,nativeCalls:0,productionWrites:0,builderRejectionsControlled:true,
  actualRulesLegalityAndModelAdoptionStillPending:true}));
