// REJECTED EXPERIMENT, not an acceptance gate: unchanged 128-budget search and
// the coarse-to-fine prototype BOTH returned zero. Do not rerun automatically.
// Actual four-unit local measurement prerequisite, not a new battle or a
// simplified roster. Restore its immutable geometry branch; no actions replay.
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createOfficialCurrentProductMatchRuntimeV1} from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import {createOfficialCurrentProductMatchRuntimeV6} from '../packages/product-composition/official-current-product-match-runtime-v6.mjs';
import {createOfficialUnitCompositionUpgradeDataBundleV1} from '../packages/source-data/official-unit-composition-upgrade-data-bundle-v1.mjs';
import {createOfficialArmyBuilderQueryPortV1} from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import {loadOfficialDevelopmentTrancheSourceLockFixtureV1} from './support/official-development-tranche-source-lock-fixture-v1.mjs';
import {queryStarcraftTmgStaticFormationV1} from '../packages/online-agent-session/static-formation-query-v1.mjs';
import {prepareStaticFormationAnchorSpaceV1} from '../packages/online-agent-session/static-formation-anchor-space-v1.mjs';
process.setUncaughtExceptionCaptureCallback(error=>{
  console.error(JSON.stringify({failed:true,code:error.code,message:String(error.message).replace(/data:text\/javascript;base64,[^\s"']+/gu,'[inline module]').slice(0,1800)}));
  process.exit(1);
});

const run=path.resolve(process.argv[2]),root=path.join(run,'workspace/decision-workflows/decision-fb3dd470-df44-4789-9fa7-d30ff4678c6c');
const read=async ref=>JSON.parse(await fs.readFile(`${root}/artifacts/${ref}.json`,'utf8'));
const query=(await read('0b1f23fc84016e75337ad9f2a19642158711fee618fafb2bd2458c8e5ccd82c9')).value;
const branch=(await read('8ae755a3ac9201917a8de5abe06efa74528e6246dcc127da0c1a22b0dca88854')).value;
assert.equal(query.receipt.queryReceipt.result.optionCount,0);
let authority;
for(const file of await fs.readdir(path.join(run,'workspace/laboratory-sources'))){
  if(!file.endsWith('.json.gz'))continue;
  const saved=JSON.parse(gunzipSync(await fs.readFile(path.join(run,'workspace/laboratory-sources',file))));
  if(hash(saved.authority.state)===query.receipt.sourceStateHash){authority=saved.authority;break;}
}
assert.ok(authority,'actual frozen source required');
console.log(JSON.stringify({stage:'actual_source_loaded',sourceStateHash:query.receipt.sourceStateHash}));
const config=JSON.parse(await fs.readFile('build/ticket-23-three-arm-performance-baseline-20261010-v1/common-v79-plan-recovery-config.private.json','utf8'));
const fixture=await loadOfficialDevelopmentTrancheSourceLockFixtureV1({root:config.fixtureRoot});
const runtime=createOfficialCurrentProductMatchRuntimeV6({legacyRuntime:createOfficialCurrentProductMatchRuntimeV1({dataset:fixture.dataset,state:structuredClone(authority.state)})});
const filename=path.resolve('packages/roster-strategist/pregame-scene-laboratory-v1.mjs');
let source=await fs.readFile(filename,'utf8');
// Debug-only read accessor at the actual resolved-state seam; no production
// source edit, alternative materializer, or hand-built model positions.
assert.equal(source.split('    captureSceneLayout,').length,2);
source=source.replace('    captureSceneLayout,','    probeResolvedState: query => resolveBaseState(query.base).state,\n    captureSceneLayout,');
source=source.replace(/\bfrom\s*["']([^"']+)["']/g,(_,name)=>'from '+JSON.stringify(name.startsWith('.')?pathToFileURL(path.resolve(path.dirname(filename),name)).href:name));
const {createPregameSceneLaboratoryV1}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const lab=createPregameSceneLaboratoryV1({laboratoryId:branch.receipt.laboratoryId,
  sourceRoomRef:branch.receipt.sourceRoomRef,sourceState:authority.state,matchBinding:authority.matchBinding,
  armyBuilderPort:createOfficialArmyBuilderQueryPortV1({unitCompositionUpgradeDataBundle:createOfficialUnitCompositionUpgradeDataBundleV1({dataset:fixture.dataset})}),
  rulesRuntime:runtime});
lab.restoreHypotheticalBranch({receipt:branch.receipt,spec:branch.request.spec});
const base={kind:'branch',branchStateHash:query.receipt.baseStateHash};
const state=lab.probeResolvedState({base}),before=hash(state),args=JSON.parse(query.request.argumentsJson);
assert.equal(before,query.receipt.baseStateHash);
console.log(JSON.stringify({stage:'actual_branch_restored',branchStateHash:before,actionReplayCount:0}));
const started=performance.now(),result=queryStarcraftTmgStaticFormationV1({state,arguments:args});
console.log(JSON.stringify({case:'actual_four_unit_regions',elapsedMs:Math.round(performance.now()-started),
  optionCount:result.optionCount,search:result.search,providerCalls:0,nativeActionsReplayed:0,productionWrites:0}));
assert.ok(result.optionCount>0,'bounded local search must find a jointly Native-checked witness in the supplied regions');
assert.ok(result.search.evaluations<=128,'do not hide a budget increase');
assert.equal(result.hostSelectedOption,false);
for(const option of result.formationOptions){
  assert.equal(option.jointGeometryProven,true);
  assert.equal(option.nativeGeometryResults.length,4);
  assert.equal(option.canonicalPlacements.length,4);
  for(const chosen of option.unitOptions)assert.ok(chosen.anchor.xInches>=2&&chosen.anchor.xInches<=10&&chosen.anchor.yInches>=2&&chosen.anchor.yInches<=10);
}
assert.equal(hash(state),before);
assert.equal(lab.proveMutationZero().sourceStateMutationCount,0);
const region={minimumXInches:2,maximumXInches:10,minimumYInches:2,maximumYInches:10,stepInches:0.5};
const all=[...prepareStaticFormationAnchorSpaceV1({anchorRegions:[region]}).candidates()];
assert.equal(all.length,289);
assert.equal(new Set(all.map(x=>JSON.stringify(x.anchor))).size,289,'coverage must not repeat grid points');
const preferred=[...prepareStaticFormationAnchorSpaceV1({anchors:[{xInches:1,yInches:1}],anchorRegions:[{...region,preferredAnchor:{xInches:3,yInches:4}}]}).candidates()];
assert.deepEqual(preferred[0].anchor,{xInches:1,yInches:1});
assert.deepEqual(preferred[1].anchor,{xInches:3,yInches:4},'explicit model preference remains authoritative');
const huge=prepareStaticFormationAnchorSpaceV1({anchorRegions:[{...region,stepInches:0.001}]}).candidates();
assert.equal(huge.next().done,false,'large grids remain lazy');
console.log(JSON.stringify({pass:true,sameActualScene:true,nativeWholeGroup:true,same128Budget:true,
  implicitRegionCoverageOnly:true,explicitPreferencePreserved:true,noSourceMutation:true,productionWrites:0}));
