// Real Native follow-through for the scope-loss bug already reproduced in the
// workflow Adapter gate. Reuse exact saved scene/formation, no new solver search,
// Provider, live room, or writes to the production run.
import fs from 'node:fs/promises';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createPregameSceneLaboratoryV1} from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import {createOfficialCurrentProductMatchRuntimeV1} from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import {createOfficialCurrentProductMatchRuntimeV6} from '../packages/product-composition/official-current-product-match-runtime-v6.mjs';
import {createOfficialUnitCompositionUpgradeDataBundleV1} from '../packages/source-data/official-unit-composition-upgrade-data-bundle-v1.mjs';
import {createOfficialArmyBuilderQueryPortV1} from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import {loadOfficialDevelopmentTrancheSourceLockFixtureV1} from './support/official-development-tranche-source-lock-fixture-v1.mjs';
const root=path.resolve(process.argv[2]),run=path.resolve(root,'../../..');
const state=JSON.parse(await fs.readFile(path.join(root,'workflow.json'),'utf8'));
const get=async ref=>JSON.parse(await fs.readFile(path.join(root,'artifacts',ref+'.json'),'utf8'));
const receipt=(await get('6da5583f4fb03a67cb43720cf16db5f5c5db2583252de121925934ce8126fce5')).value.receipt;
const option=receipt.queryReceipt.result.formationOptions[0];
let authority;
for(const file of await fs.readdir(path.join(run,'workspace/laboratory-sources'))){
  if(!file.endsWith('.json.gz'))continue;
  const source=JSON.parse(gunzipSync(await fs.readFile(path.join(run,'workspace/laboratory-sources',file))));
  if(hash(source.authority.state)===receipt.sourceStateHash){authority=source.authority;break;}
}
assert(authority,'exact saved source required');
console.log(JSON.stringify({stage:'source_loaded',sourceStateHash:receipt.sourceStateHash}));
const config=JSON.parse(await fs.readFile(path.join(process.cwd(),'build/ticket-23-three-arm-performance-baseline-20261010-v1/common-v79-plan-recovery-config.private.json'),'utf8'));
const source=await loadOfficialDevelopmentTrancheSourceLockFixtureV1({root:config.fixtureRoot});
const builder=createOfficialArmyBuilderQueryPortV1({unitCompositionUpgradeDataBundle:createOfficialUnitCompositionUpgradeDataBundleV1({dataset:source.dataset})});
const lab=createPregameSceneLaboratoryV1({laboratoryId:receipt.laboratoryId,sourceRoomRef:receipt.sourceRoomRef,
  sourceState:authority.state,matchBinding:authority.matchBinding,armyBuilderPort:builder,
  rulesRuntime:createOfficialCurrentProductMatchRuntimeV6({legacyRuntime:createOfficialCurrentProductMatchRuntimeV1({dataset:source.dataset,state:structuredClone(authority.state)})})});
const savedBranches=new Map();
for(const work of state.work){
  if(work.role!=='roster_workflow_tool'||!work.resultRef)continue;
  const value=(await get(work.resultRef)).value;
  if(value?.receipt?.branchStateHash&&value.receipt.sourceStateHash===receipt.sourceStateHash)
    savedBranches.set(value.receipt.branchStateHash,value);
}
const restored=new Set();
function restore(stateHash){
  if(stateHash===receipt.sourceStateHash||restored.has(stateHash))return;
  const saved=savedBranches.get(stateHash);assert(saved,'exact saved parent required');
  restore(saved.receipt.parentStateHash);
  const args={receipt:saved.receipt,base:saved.request.base,spec:saved.request.spec};
  if(saved.operation==='formation_scene')lab.restoreFormationSelectionBranch(args);
  else if(saved.operation==='project_scene')lab.restoreProjectedScenarioBranch(args);
  else if(saved.receipt.branchKind==='native_action')lab.restoreNativeActionBranch(args);
  else lab.restoreHypotheticalBranch(args);
  restored.add(stateHash);
}
restore(receipt.baseStateHash);
const base={kind:'branch',branchStateHash:receipt.baseStateHash},before=lab.captureSceneLayout({base});
const participants=option.jointUnitIds??[option.pieceId];
const scope={kind:'fixed_scenario_tactic',decisionQuestion:'Validate this exact local layout only.',
  decisionImpact:'Named local comparison, not a match.',
  participantUnitIds:participants,scenarioDescription:'Actual retained candidate, original terrain and source.',
  stopPredicate:'After this static observation.',collectScenarioExperience:false,hypothesisTest:null,comparisonBinding:null};
const narrow={...scope,participantUnitIds:participants.slice(1)};
const selection={base,selections:[{receipt,formationOptionId:option.formationOptionId}]};
assert.throws(()=>lab.runFormationSelectionBranch({...selection,branchId:'v728-denied-formation',executionScope:narrow}),
  error=>error.code==='ROSTER_EXPERIMENT_UNDECLARED_PARTICIPANT');
assert.deepEqual(lab.captureSceneLayout({base}),before);
const accepted=lab.runFormationSelectionBranch({...selection,branchId:'v728-allowed-formation',executionScope:scope});
const layout=lab.captureSceneLayout({base:{kind:'branch',branchStateHash:accepted.branchStateHash}});
const referenceParticipants=layout.units.filter(unit=>unit.onTable).map(unit=>unit.unitId);
assert(referenceParticipants.length);
assert.equal(layout.geometryFailures.length,0,'a complete real reference is necessary to test projection scope');
const projectionScope={...scope,participantUnitIds:referenceParticipants.slice(1)};
assert.throws(()=>lab.runProjectedScenarioBranch({branchId:'v728-denied-projection',base,
  referenceLayout:layout,changedUnits:[],unlistedUnits:'off_table',executionScope:projectionScope}),
  error=>error.code==='ROSTER_EXPERIMENT_UNDECLARED_PARTICIPANT');
assert.deepEqual(lab.captureSceneLayout({base}),before);
console.log(JSON.stringify({passed:true,realNativeLaboratory:true,providerCalls:0,productionWrites:0,
  successfulPrivateWrites:1,rejectedOutOfScopeWrites:2,solverSearches:0,
  participants,staticSceneOnly:true,arrivalOrStrategyProven:false,sourceUnchanged:true}));
