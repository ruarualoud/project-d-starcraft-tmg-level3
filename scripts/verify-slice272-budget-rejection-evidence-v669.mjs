// Actual editable r5 keeps getting empty budget pages. Observe one candidate
// through the SAME frozen Builder and prove its rejection is not discarded.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadOfficialDevelopmentTrancheSourceLockFixtureV1} from './support/official-development-tranche-source-lock-fixture-v1.mjs';
import {createOfficialUnitCompositionUpgradeDataBundleV1} from '../packages/source-data/official-unit-composition-upgrade-data-bundle-v1.mjs';
import {createOfficialArmyBuilderQueryPortV1,ARMY_BUILDER_REJECTION_RECEIPT_SCHEMA} from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import {queryRosterBudgetBranchesV1} from '../packages/roster-strategist/roster-budget-branch-query-v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=path.join(root,'build/slice272-product-generation-v645-M86Cg9/workspace/decision-workflows/decision-58c2b2f9-e4cf-4b5d-9ac3-4c8c36bbb0e1');
const stateBytes=await fs.readFile(path.join(base,'workflow.json')),state=JSON.parse(stateBytes);
const draftBytes=await fs.readFile(path.join(base,'artifacts',state.draftRef+'.json')),draft=JSON.parse(draftBytes);
assert.equal(draft.revision,5);
const fixtureRoot=path.resolve(root,'../..'),source=await loadOfficialDevelopmentTrancheSourceLockFixtureV1({root:fixtureRoot});
const builder=createOfficialArmyBuilderQueryPortV1({unitCompositionUpgradeDataBundle:createOfficialUnitCompositionUpgradeDataBundleV1({dataset:source.dataset})});
const observed=[];
const port={enumerateArmyBuildingChoices:builder.enumerateArmyBuildingChoices,evaluateRosterCandidate:input=>{
  const verdict=builder.evaluateRosterCandidate(input);observed.push(verdict);return verdict;}};
const started=performance.now();
const result=queryRosterBudgetBranchesV1({armyBuilderPort:port,candidateInput:draft.candidateInput,
  maximumEvaluations:1,startOffset:48,maximumMutationDepth:5});
const elapsedMs=performance.now()-started,rejection=observed.find(v=>v.schema===ARMY_BUILDER_REJECTION_RECEIPT_SCHEMA);
assert(rejection,'actual page must reproduce a Rules/candidate rejection before testing lost diagnostics');
console.log(JSON.stringify({stage:'actual_rejection_observed',elapsedMs,verdict:rejection}));
assert.equal(result.rejectedBranches?.length,1,'budget page must return the actual rejection, not an unexplained empty branch list');
assert.deepEqual(result.rejectedBranches[0].builderVerdict,rejection);
assert.equal(result.branches.length,0);assert.equal(result.evaluatedMutationCount,1);
assert.equal(result.rejectionSummary.total,1);
assert.equal(result.searchScope.exactBudgetImpossibilityClaimed??result.exactBudgetImpossibilityClaimed,false);
assert((await fs.readFile(path.join(base,'artifacts',state.draftRef+'.json'))).equals(draftBytes));
console.log(JSON.stringify({status:'passed',draftRevision:draft.revision,elapsedMs,
  evaluations:observed.length,sourceRejectionKind:rejection.rejectionKind,
  sourceError:rejection.rulesErrorCode??rejection.portErrorCode,originalDraftUnchanged:true,
  originalNativeOrModelActionReplayed:false,providerCalls:0,nativeCalls:0,productionWrites:0,
  actualModelUseOfRejectionStillPending:true}));
