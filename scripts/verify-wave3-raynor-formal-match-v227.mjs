import assert from 'node:assert/strict';
import {registry, read, save} from './support/wave3-raven-tabletop-room-v1.mjs';
import {inspectOfficialStandardReleaseOpeningCoverageV2, prepareOfficialStandardReleaseOpeningV2, OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY} from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import {createOfficialReleaseMatchRuntimeV2} from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';

const integration = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const source = integration + '/tabletop-raven-m01-v1';
const output = integration + '/raynor-match-v227';
const version = '2.27.0';
const unit = (name, upgradeNames = []) => ({unitInstanceId:name, recordKey:'army_units:'+name, compositionKind:'small', upgradeNames});
const product = registry();
try {
  const manifest = await read(source+'/manifest.json');
  product.resolver.register(manifest);
  const [abilities, mission] = await Promise.all(['area_ability_inputs','mission_source'].map(purpose => product.resolver.resolve({releaseId:manifest.releaseId,purpose})));
  const context = {...abilities, resources:{...abilities.resources,...mission.resources}};
  const scene = await read(integration+'/wave3-template-release-factory-checkpoint.json');
  const prior = await read(source+'/admission.json');
  const cards = ['card:raynor_s_raiders/rapid-ingress-any@1','card:raynor_s_raiders/ready-for-pickup-any@1'];
  const observations = [];
  for (const id of ['marine-control','raven-upgrades']) {
    const previous = prior.observations.find(item => item.id===id);
    const units = [unit('marine')];
    if (id==='raven-upgrades') units.push(unit('raven',['Internal Tech Module','Explosive Shrapnel Shells']));
    const factoryInput = {releaseContext:context,dataset:context.dataset,snapshot:context.snapshot,releaseMatchVersion:version,
      recipes:{player1:{factionRecordKey:'tactical_cards:raynor_s_raiders',units,tacticalCardRecordKeys:[]},
        player2:{factionRecordKey:'tactical_cards:zerg_swarm',units:[unit('zergling')],tacticalCardRecordKeys:['tactical_cards:accelerating_creep']}},
      armySpendPolicy:OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY,missionRecordKey:scene.officialMissionSetupBinding.missionRecordKey,deploymentRecordKey:scene.officialDeploymentGeometryBinding.deploymentRecordKey};
    const coverage = inspectOfficialStandardReleaseOpeningCoverageV2(factoryInput);
    const pending = coverage.definitions.filter(r=>r.registrationStatus!=='executable_exact').map(r=>r.definitionId).sort();
    assert.deepEqual(previous.pending.filter(key=>!pending.includes(key)).sort(), [...cards].sort());
    const result = {id,total:coverage.definitions.length,registered:coverage.definitions.length-pending.length,pending};
    if (id==='marine-control') {
      const opening = prepareOfficialStandardReleaseOpeningV2(factoryInput);
      assert.deepEqual(opening.openingRosterCoverage,coverage);
      const runtime = createOfficialReleaseMatchRuntimeV2({context,state:opening.state,candidateVersion:version});
      const menu = runtime.enumerate(opening.state);
      result.openingActions = [...new Set([...(menu.candidates??[]),...(menu.parameterDomains??[])].map(row=>row.actionType))];
      assert(result.openingActions.length>0);
      await save(output+'/factory-state.json',opening.state);
      await save(output+'/runtime.json',runtime.descriptor);
    } else {
      assert.throws(()=>prepareOfficialStandardReleaseOpeningV2(factoryInput), error => error.code==='OFFICIAL_RELEASE_ROOM_ABILITY_COVERAGE_PENDING' && JSON.stringify([...error.detail.pendingSelectedDefinitionIds].sort())===JSON.stringify(pending));
    }
    observations.push(result);
    await save(output+'/'+id+'.json',result);
  }
  await save(output+'/admission.json',{version,manifestHash:manifest.manifestHash,observations,modelCalls:0});
} finally {product.close();}
