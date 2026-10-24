// Actual131 accepted arrival while leaving Supply unconfirmed. Query the same
// restored Native states at an after-action point with no deploy action menu.
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
const root=process.cwd(),run=path.resolve(process.argv[2]),base=path.join(run,'workspace/decision-workflows/projection-owner');
const before=await fs.readFile(path.join(base,'workflow.json'),'utf8'),state=JSON.parse(before);
const get=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const action=await get(state.evidence[341].artifactRef),parent=action.receipt.parentStateHash,target=action.receipt.branchStateHash;
let authority;
for(const file of await fs.readdir(path.join(run,'workspace/laboratory-sources'))){
  if(!file.endsWith('.json.gz'))continue;
  const saved=JSON.parse(gunzipSync(await fs.readFile(path.join(run,'workspace/laboratory-sources',file))));
  if(hash(saved.authority.state)===action.receipt.sourceStateHash){authority=saved.authority;break;}
}
assert.ok(authority);
const config=JSON.parse(await fs.readFile(path.join(root,'build/ticket-23-three-arm-performance-baseline-20261010-v1/common-v79-plan-recovery-config.private.json'),'utf8'));
const fixture=await loadOfficialDevelopmentTrancheSourceLockFixtureV1({root:config.fixtureRoot});
const builder=createOfficialArmyBuilderQueryPortV1({unitCompositionUpgradeDataBundle:createOfficialUnitCompositionUpgradeDataBundleV1({dataset:fixture.dataset})});
const lab=createPregameSceneLaboratoryV1({laboratoryId:action.receipt.laboratoryId,sourceRoomRef:action.receipt.sourceRoomRef,
  sourceState:authority.state,matchBinding:authority.matchBinding,armyBuilderPort:builder,
  rulesRuntime:createOfficialCurrentProductMatchRuntimeV6({legacyRuntime:createOfficialCurrentProductMatchRuntimeV1({dataset:fixture.dataset,state:structuredClone(authority.state)})})});
const branches=new Map();
for(const work of state.work.filter(w=>w.role==='roster_workflow_tool'&&w.resultRef)){
  const value=(await get(work.resultRef)).value;
  if(value.receipt?.branchStateHash&&value.receipt.sourceStateHash===action.receipt.sourceStateHash)branches.set(value.receipt.branchStateHash,value);
}
const restored=new Set([action.receipt.sourceStateHash]);
function restore(stateHash){
  if(restored.has(stateHash))return;
  const value=branches.get(stateHash);assert.ok(value,'saved branch required: '+stateHash);
  restore(value.receipt.parentStateHash??value.receipt.baseStateHash);
  if(value.receipt.branchKind==='native_action')lab.restoreNativeActionBranch({receipt:value.receipt,base:value.request.base});
  else if(value.operation==='formation_scene')lab.restoreFormationSelectionBranch({receipt:value.receipt,base:value.request.base});
  else lab.restoreHypotheticalBranch({receipt:value.receipt,spec:value.request.spec,base:value.request.base});
  restored.add(stateHash);
}
restore(target);
const prior=lab.describeQueryContext({base:{kind:'branch',branchStateHash:parent},seatKey:'player1'});
const next=lab.describeQueryContext({base:{kind:'branch',branchStateHash:target},seatKey:'player1'});
// Persist the actual observation before assertions so an interrupted observer
// cannot lose the failure evidence or tempt a blind rerun.
await fs.writeFile(path.join(root,'build/slice272-deployment-supply-v576-observation.json'),JSON.stringify({
  parent,target,prior:prior.deploymentSupplyBySide??null,next:next.deploymentSupplyBySide??null,
  currentSupply:next.availableUnits.find(u=>u.unitId==='u_marine_1').currentSupply??null,
  deployDomainCount:next.actionSpace.parameterDomains.filter(d=>d.actionType==='deploy').length},null,2));
assert.deepEqual(prior.deploymentSupplyBySide?.player1,{capacity:6,committed:0,available:6},'inspect must expose Native deployment Supply independently of an enabled deploy domain');
assert.deepEqual(next.deploymentSupplyBySide.player1,{capacity:6,committed:1,available:5});
assert.equal(next.actionSpace.parameterDomains.filter(d=>d.actionType==='deploy').length,0,'the actual after-action fixture has no deploy domains');
assert.equal(next.availableUnits.find(u=>u.unitId==='u_marine_1').currentSupply,1);
assert.equal(next.availableUnits.find(u=>u.unitId==='u_marine_1').onTable,true);
assert.equal(lab.proveMutationZero().sourceStateMutationCount,0);
assert.equal(await fs.readFile(path.join(base,'workflow.json'),'utf8'),before);
console.log(JSON.stringify({passed:true,parent,target,prior:prior.deploymentSupplyBySide,next:next.deploymentSupplyBySide,
  actualNativeQuery:true,noDeployDomainRequired:true,coldRestore:true,sourceMutations:0,providerCalls:0,productionWrites:0}));
