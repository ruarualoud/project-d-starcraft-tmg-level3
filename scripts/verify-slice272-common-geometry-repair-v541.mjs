// Actual82 out-of-map coordinates were rejected without a repair contract.
import fs from 'node:fs/promises';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterWorkflowLaboratoryExecutorV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import {createPregameSceneLaboratoryV1} from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import {createOfficialUnitCompositionUpgradeDataBundleV1} from '../packages/source-data/official-unit-composition-upgrade-data-bundle-v1.mjs';
import {createOfficialArmyBuilderQueryPortV1} from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import {loadOfficialDevelopmentTrancheSourceLockFixtureV1} from './support/official-development-tranche-source-lock-fixture-v1.mjs';
const root=process.cwd(),run=path.resolve(process.argv[2]),base=path.join(run,'workspace/decision-workflows/p4-from-empty');
const saved=JSON.parse(await fs.readFile(path.join(run,'82.reply.json'),'utf8'));
const args=JSON.parse(saved.output.workOrders[0].steps[0].argumentsJson);
const workflow=JSON.parse(await fs.readFile(path.join(run,'workspace/decision-workflows/p4-from-empty/workflow.json'),'utf8'));
let authority;
for(const file of await fs.readdir(path.join(run,'workspace/laboratory-sources'))){
  if(!file.endsWith('.json.gz'))continue;
  const value=JSON.parse(gunzipSync(await fs.readFile(path.join(run,'workspace/laboratory-sources',file))));
  if(hash(value.authority.state)===workflow.scope.source){authority=value.authority;break;}
}
assert.ok(authority,'retained actual source exists');
const config=JSON.parse(await fs.readFile(path.join(root,'build/ticket-23-three-arm-performance-baseline-20261010-v1/common-v79-plan-recovery-config.private.json'),'utf8'));
const source=await loadOfficialDevelopmentTrancheSourceLockFixtureV1({root:config.fixtureRoot});
const builder=createOfficialArmyBuilderQueryPortV1({unitCompositionUpgradeDataBundle:createOfficialUnitCompositionUpgradeDataBundleV1({dataset:source.dataset})});
let rulesCalls=0;
const noRules=()=>{rulesCalls++;throw Error('Invalid input must not run rules');};
const lab=createPregameSceneLaboratoryV1({sourceState:authority.state,armyBuilderPort:builder,
  rulesRuntime:{descriptor:{runtimeHash:workflow.scope.rules},enumerate:noRules,instantiate:noRules,apply:noRules}});
const failedWork=workflow.work.find(w=>w.id==='review-resolution:r4:round2:plan_continuity:order0:query-combat');
const get=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const failure=(await get(failedWork.resultRef)).value;
let scene;
for(const work of workflow.work){if(work.role!=='roster_workflow_tool'||!work.resultRef)continue;const value=(await get(work.resultRef)).value;if(value.operation==='scenario'&&value.receipt?.branchStateHash===failure.receipt.baseStateHash){scene=value;break;}}
assert.ok(scene);assert.equal(scene.receipt.parentStateHash,workflow.scope.source);
lab.restoreHypotheticalBranch({receipt:scene.receipt,spec:scene.request.spec,base:scene.request.base});
const queryBase={kind:'branch',branchStateHash:failure.receipt.baseStateHash};
const exchange=await lab.queryThreatExchange({queryId:'actual84-exchange',base:queryBase});
const probability=await lab.queryProbability({queryId:'actual84-probability',base:queryBase,attackerUnitId:'u_marine_1',targetUnitId:'player2-hydralisk'});
for(const receipt of [exchange,probability]){
  assert.equal(receipt.resultStatus,'unknown');
  assert.ok(receipt.hypotheticalPlacementAssessment,'BUG: combat wrapper dropped the common geometry evidence');
  assert.equal(receipt.queryRepair?.correctable,true);
  assert.equal(receipt.queryRepair?.originalQueryNotAnswered,true);
  assert.equal(receipt.sceneScope.baseStateHash,queryBase.branchStateHash);
}
assert.deepEqual(exchange.queryRepair,probability.queryRepair);
const executor=createRosterWorkflowLaboratoryExecutorV1({laboratory:lab,store:{}});
assert.deepEqual(executor.projectRepair(failure),exchange.queryRepair,'retained failure classified without rerunning query');
assert.equal(failure.receipt.hypotheticalPlacementAssessment,undefined,'old receipt unchanged');
assert.equal(rulesCalls,0);
assert.equal(lab.proveMutationZero().sourceStateMutationCount,0);
console.log(JSON.stringify({pass:true,commonCombatPrerequisite:true,failedUnits:exchange.hypotheticalPlacementAssessment.units.filter(u=>u.resultStatus!=='ok').length,sourceMutation:0,providerCalls:0,productionWrites:0}));
