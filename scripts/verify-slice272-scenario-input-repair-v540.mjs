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
const root=process.cwd(),run=path.resolve(process.argv[2]);
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
let rejected;try{lab.runScenarioBranch({branchId:'actual82-input-check',...args});}catch(error){rejected=error;}
assert.ok(rejected);
assert.equal(rejected.queryRepair?.correctable,true,'BUG: out-of-bounds model inputs strand the repair owner');
assert.ok(rejected.queryRepair.failureTargets.length>=10,'all invalid coordinates returned together');
assert.equal(rejected.queryRepair.coordinateContext.unit,'inches');
assert.equal(rejected.queryRepair.coordinateContext.widthInches,54);
assert.equal(rejected.queryRepair.coordinateContext.heightInches,36);
const inspection=lab.inspectScenarioInput(args);
assert.equal(inspection.valid,false);
assert.deepEqual(inspection.queryRepair,rejected.queryRepair);
const executor=createRosterWorkflowLaboratoryExecutorV1({laboratory:lab,store:{}});
const oldFailure={operation:'scenario',request:args,code:'PREGAME_LAB_PLACEMENT_OUT_OF_BOUNDS',queryRepair:null,nativeSuccess:false};
const repair=executor.projectRepair(oldFailure);
assert.deepEqual(repair,inspection.queryRepair,'saved failure classified by same current source, no error-name allowlist');
assert.equal(oldFailure.queryRepair,null,'historical failure unchanged');
assert.equal(executor.projectRepair({operation:'scenario',request:{spec:{kind:'hypothetical_geometry'}},code:'INTERNAL_FATAL',nativeSuccess:false}),null,'valid input does not wash an internal failure into repair');
assert.equal(rulesCalls,0);
assert.equal(lab.proveMutationZero().sourceStateMutationCount,0);
assert.deepEqual(JSON.parse(await fs.readFile(path.join(run,'82.reply.json'),'utf8')),saved);
console.log(JSON.stringify({pass:true,invalidFields:rejected.queryRepair.failureTargets.length,sourceOwnedRepair:true,oldFailureUnchanged:true,providerCalls:0,productionWrites:0}));
