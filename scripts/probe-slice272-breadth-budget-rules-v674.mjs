// One read-only real Rules probe of the new search on the actual 1610 draft.
// This is capability evidence, not a model-selected army or production commit.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadOfficialDevelopmentTrancheSourceLockFixtureV1} from './support/official-development-tranche-source-lock-fixture-v1.mjs';
import {createOfficialUnitCompositionUpgradeDataBundleV1} from '../packages/source-data/official-unit-composition-upgrade-data-bundle-v1.mjs';
import {createOfficialArmyBuilderQueryPortV1} from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import {queryRosterBudgetBranchesV1} from '../packages/roster-strategist/roster-budget-branch-query-v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=path.join(root,'build/slice272-product-generation-v645-M86Cg9/workspace/decision-workflows/decision-58c2b2f9-e4cf-4b5d-9ac3-4c8c36bbb0e1');
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const draftBytes=await fs.readFile(path.join(base,'artifacts',state.draftRef+'.json')),draft=JSON.parse(draftBytes);
assert.equal(draft.revision,5);
const source=await loadOfficialDevelopmentTrancheSourceLockFixtureV1({root:path.resolve(root,'../..')});
const builder=createOfficialArmyBuilderQueryPortV1({unitCompositionUpgradeDataBundle:createOfficialUnitCompositionUpgradeDataBundleV1({dataset:source.dataset})});
const started=performance.now(),receipt=queryRosterBudgetBranchesV1({armyBuilderPort:builder,candidateInput:draft.candidateInput,
  generationPolicy:'breadth_first_v2',maximumEvaluations:8,startOffset:0,maximumMutationDepth:5});
const elapsedMs=performance.now()-started;
const output=path.join(root,'build/slice272-breadth-budget-real-rules-v674.json');
await fs.writeFile(output,JSON.stringify({sourceDraftRef:state.draftRef,sourceRevision:5,elapsedMs,receipt},null,2),{flag:'wx'});
assert(receipt.branches.length>0,'new covered candidates must include an actual full-Builder-legal constructive branch');
assert((await fs.readFile(path.join(base,'artifacts',state.draftRef+'.json'))).equals(draftBytes));
console.log(JSON.stringify({status:'passed',sourceRevision:5,elapsedMs,evaluated:receipt.evaluatedMutationCount,
  legalBranches:receipt.branches.length,rejected:receipt.rejectedBranches.length,
  legalMineralTotals:receipt.branches.map(b=>b.mineralSpent),exactBudgetBranches:receipt.branches.filter(b=>b.exactBudget).length,
  generationCoverage:receipt.generationCoverage,output,providerCalls:0,
  realBuilderCalls:receipt.evaluatedMutationCount+1,liveRoomWrites:0,productionWrites:0,
  modelSelectionAndFinalRosterStillPending:true}));
