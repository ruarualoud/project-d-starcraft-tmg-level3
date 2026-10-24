// Reproduce fresh production reply55: prose positions were silently ignored,
// returning resultStatus=ok and the unchanged setup hash as a combat scene.
import fs from 'node:fs/promises';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createPregameSceneLaboratoryV1} from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import {createOfficialUnitCompositionUpgradeDataBundleV1} from '../packages/source-data/official-unit-composition-upgrade-data-bundle-v1.mjs';
import {createOfficialArmyBuilderQueryPortV1} from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import {loadOfficialDevelopmentTrancheSourceLockFixtureV1} from './support/official-development-tranche-source-lock-fixture-v1.mjs';
const root=process.cwd(),run=path.resolve(process.argv[2]);
const saved=JSON.parse(await fs.readFile(path.join(run,'55.reply.json'),'utf8'));
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
const reject=request=>{let error;try{lab.runScenarioBranch(request);}catch(e){error=e;}
  assert.ok(error,'BUG: malformed scene accepted with ignored model intentions');
  assert.equal(error.queryRepair?.correctable,true);
  assert.equal(error.queryRepair?.originalQueryNotAnswered,true);
  return error;};
const invalid=reject({branchId:'actual55-no-silent-noop',...args});
assert.equal(invalid.code,'PREGAME_LAB_BRANCH_FIELDS_UNSUPPORTED');
const schema=invalid.queryRepair.failureTargets[0].expectedSchema;
assert.equal(schema.additionalProperties,false);
assert.ok(schema.properties.placements);
assert.equal(schema.properties.positions,undefined);
assert.equal(reject({branchId:'phase-not-applied',spec:{kind:'hypothetical_geometry',phase:'assault',activeSideKey:'player1'}}).code,'PREGAME_LAB_BRANCH_PLACEMENTS_REQUIRED');
assert.equal(reject({branchId:'prose-not-placement',spec:{kind:'hypothetical_geometry',placements:'in range'}}).code,'PREGAME_LAB_BRANCH_PLACEMENTS_INVALID');
assert.equal(reject({branchId:'terrain-not-applied',spec:{kind:'hypothetical_geometry',clearTerrain:true}}).code,'PREGAME_LAB_BRANCH_PLACEMENTS_REQUIRED');
const phase=lab.runScenarioBranch({branchId:'explicit-phase-only',spec:{kind:'hypothetical_geometry',phase:'assault',activeSideKey:'player1',preservePositions:true,placements:[]}});
assert.equal(phase.hypotheticalActivation.phase,'assault');
assert.equal(phase.hypotheticalActivation.positionsPreserved,true);
assert.equal(phase.hypotheticalActivation.arrivalHistoryProven,false);
assert.equal(rulesCalls,0);
assert.equal(lab.proveMutationZero().sourceStateMutationCount,0);
assert.deepEqual(JSON.parse(await fs.readFile(path.join(run,'55.reply.json'),'utf8')),saved);
console.log(JSON.stringify({pass:true,actual55RejectedBeforeExecution:true,sourceMutation:0,providerCalls:0,productionWrites:0,explicitPhaseOnlyStillSupported:true}));
