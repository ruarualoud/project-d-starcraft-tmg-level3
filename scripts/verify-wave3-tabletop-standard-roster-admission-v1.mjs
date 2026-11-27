import assert from 'node:assert/strict';
import { registry, sourceContext, sourceRef, read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { createOfficialWave3MissionSourceV1 } from '../packages/source-data/official-wave3-mission-source-v1.mjs';
import { createOfficialReleaseManifestV2 } from '../packages/source-data/official-release-context-v2.mjs';
import { inspectOfficialStandardReleaseOpeningCoverageV2, prepareOfficialStandardReleaseOpeningV2, OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY }
  from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import { createOfficialReleaseMatchRuntimeV2 } from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';

const integration = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const output = integration + '/tabletop-raven-m01-v1';
const missionRef = integration + '/wave3-template-release-bound-manifest.json';
const version = '2.26.0';
const recipe = (factionRecordKey, units, tacticalCardRecordKeys = []) => ({ factionRecordKey, tacticalCardRecordKeys, units });
const unit = (name, upgradeNames = []) => ({ unitInstanceId:name, recordKey:'army_units:'+name,compositionKind:'small',upgradeNames });
const opponent = recipe('tactical_cards:zerg_swarm',[unit('zergling')],['tactical_cards:accelerating_creep']);
const cases = [
  {id:'marine-control',player1:recipe('tactical_cards:raynor_s_raiders',[unit('marine')])},
  {id:'raven-upgrades',player1:recipe('tactical_cards:raynor_s_raiders',[unit('marine'),unit('raven',['Internal Tech Module','Explosive Shrapnel Shells'])])},
];
async function candidate(product) {
  const base = await sourceContext(product);
  const terrain = await read(missionRef);
  for (const key of ['snapshotHash','sourceRevisionHash','datasetHash']) assert.equal(base.manifest.source[key],terrain.source[key]);
  assert.equal(base.manifest.source.snapshotRef,terrain.source.snapshotRef);
  const source = base.manifest.source;
  const manifestInput = {
    releaseId:'wave3-standard-tabletop-admission-inputs-v1', dataset:base.dataset,snapshot:base.snapshot,
    sourceRevision:await read(source.sourceRevisionRef),sourceRevisionRef:source.sourceRevisionRef,
    snapshotRef:source.snapshotRef,datasetRef:source.datasetRef,sourcePolicy:source.policy,referenceSources:source.references,
    components:{...base.manifest.components,blastTemplateGeometry:terrain.components.blastTemplateGeometry},
  };
  const provisional = createOfficialReleaseManifestV2(manifestInput);
  const rebound = createOfficialWave3MissionSourceV1({...base,manifest:provisional});
  const original = await read(terrain.components.missionSource.ref);
  assert.deepEqual(rebound.missions,original.missions);
  assert.deepEqual(rebound.deploymentSources,original.deploymentSources);
  const missionComponent = {ref:await save(output+'/mission-source.json',rebound),version:rebound.semanticVersion,integrity:{field:'bundleHash',value:rebound.bundleHash}};
  const manifest = createOfficialReleaseManifestV2({...manifestInput,components:{...manifestInput.components,missionSource:missionComponent}});
  await save(output+'/manifest.json',manifest);
  product.resolver.register(manifest);
  const [ability,mission] = await Promise.all(['area_ability_inputs','mission_source'].map(purpose =>
    product.resolver.resolve({releaseId:manifest.releaseId,purpose})));
  assert.equal(ability.manifest.manifestHash,mission.manifest.manifestHash);
  return Object.freeze({...ability,resources:Object.freeze({...ability.resources,...mission.resources})});
}
async function inspect(context, scene, {id,player1}) {
  const factoryInput = {releaseContext:context,releaseMatchVersion:version,dataset:context.dataset,snapshot:context.snapshot,
    recipes:{player1,player2:opponent},armySpendPolicy:OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY,
    missionRecordKey:scene.officialMissionSetupBinding.missionRecordKey,deploymentRecordKey:scene.officialDeploymentGeometryBinding.deploymentRecordKey};
  const coverage = inspectOfficialStandardReleaseOpeningCoverageV2(factoryInput);
  const pending = coverage.definitions.filter(r=>r.registrationStatus!=='executable_exact').map(r=>r.definitionId).sort();
  const common = {id,registered:coverage.definitions.length-pending.length,total:coverage.definitions.length,pending};
  try {
    const opening = prepareOfficialStandardReleaseOpeningV2(factoryInput);
    assert.deepEqual(opening.openingRosterCoverage,coverage);
    const runtime = createOfficialReleaseMatchRuntimeV2({context,state:opening.state,candidateVersion:version});
    const menu = runtime.enumerate(opening.state);
    const choices = [...(menu.candidates||[]),...(menu.parameterDomains||[])];
    assert(choices.length>0);
    return {...common,admitted:true,runtimeVersion:runtime.descriptor.runtimeVersion,menuActions:[...new Set(choices.map(r=>r.actionType))]};
  } catch (error) {
    if (error.code!=='OFFICIAL_RELEASE_ROOM_ABILITY_COVERAGE_PENDING') throw error;
    assert.deepEqual([...error.detail.pendingSelectedDefinitionIds].sort(),pending);
    assert.equal(error.detail.releaseId,context.manifest.releaseId);
    return {...common,admitted:false,reason:error.code,identicalPending:true};
  }
}
const product = registry();
try {
  const context = await candidate(product);
  const scene = await read(integration + '/wave3-template-release-factory-checkpoint.json');
  const baseline = (await read('build/ticket-28-wave2-capabilities-20261113-v1/tank-spatial/compile.json')).candidatesBySide.player1;
  const positive = {id:'signed-tank-control',player1:{...baseline, units:baseline.units.map(u=>({...u,upgradeNames:u.upgrades.map(v=>v.upgradeName)}))}};
  const observations = [];
  for (const item of [...cases,positive]) {
    const observation = await inspect(context,scene,item);
    await save(output+'/'+item.id+'.json',observation);
    observations.push(observation);
  }
  assert(observations.find(item=>item.id===positive.id).admitted);
  await save(output+'/admission.json',{version,sourceRef,missionRef,releaseId:context.manifest.releaseId,
    manifestHash:context.manifest.manifestHash,observations,modelCalls:0});
} finally {product.close();}
