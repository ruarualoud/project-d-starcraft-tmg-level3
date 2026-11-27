import assert from 'node:assert/strict';
import { registry, read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { inspectOfficialStandardReleaseOpeningCoverageV2, prepareOfficialStandardReleaseOpeningV2, OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY } from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import { createOfficialReleaseMatchRuntimeV2 } from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
const integration='build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const output=integration+'/raven-seeker-standard-v229';
const previous=await read(integration+'/raven-standard-v228/optional-loadout.json');
const manifest=await read(integration+'/tabletop-raven-m01-v1/manifest.json');
const state=await read(integration+'/raynor-match-v227/factory-state.json');
const unit=(name,upgradeNames=[])=>({unitInstanceId:name,recordKey:'army_units:'+name,compositionKind:'small',upgradeNames});
const product=registry();
try {
  product.resolver.register(manifest);
  const [abilities,mission]=await Promise.all(['area_ability_inputs','mission_source'].map(purpose=>product.resolver.resolve({releaseId:manifest.releaseId,purpose})));
  const context={...abilities,resources:{...abilities.resources,...mission.resources}};
  const input={releaseContext:context,releaseMatchVersion:'2.29.0',dataset:context.dataset,snapshot:context.snapshot,
    recipes:{player1:{factionRecordKey:'tactical_cards:raynor_s_raiders',units:[unit('marine'),unit('raven',['Corvid Reactor','Seeker Missile'])],tacticalCardRecordKeys:[]},
      player2:{factionRecordKey:'tactical_cards:zerg_swarm',units:[unit('zergling')],tacticalCardRecordKeys:['tactical_cards:accelerating_creep']}},
    armySpendPolicy:OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY,missionRecordKey:state.officialMissionSetupBinding.missionRecordKey,deploymentRecordKey:state.officialDeploymentGeometryBinding.deploymentRecordKey};
  const summary=coverage=>({total:coverage.definitions.length,exact:coverage.definitions.filter(r=>r.registrationStatus==='executable_exact').length,
    pending:coverage.definitions.filter(r=>r.registrationStatus!=='executable_exact').map(r=>r.definitionId)});
  if (process.argv.includes('--previous-binding')) {
    const prior = await read(integration+'/raven-standard-v228/manifest.json');
    const priorProduct = registry();
    try {
      priorProduct.resolver.register(prior);
      const [component, priorMission] = await Promise.all(['area_ability_component','mission_source'].map(purpose => priorProduct.resolver.resolve({releaseId:prior.releaseId,purpose})));
      const bound = createOfficialReleaseMatchRuntimeV2({context:{...component,resources:{...component.resources,...priorMission.resources}},state:await read(integration+'/raven-standard-v228/factory-state.json'),boundRuntimeManifest:prior});
      assert.deepEqual(bound.descriptor,await read(integration+'/raven-standard-v228/runtime.json'));
      await save(output+'/previous-binding.json',{version:bound.descriptor.runtimeVersion,runtimeHash:bound.descriptor.runtimeHash,identical:true});
    } finally { priorProduct.close(); }
  } else if (process.argv.includes('--next-rosters')) {
    const variants = [];
    for (const mode of ['nova_stealth_mode','nova_assault_mode']) {
      const player1 = {factionRecordKey:'tactical_cards:nova_covert_ops',units:[unit(mode),unit('spec_ops_marauder__marauder_')],tacticalCardRecordKeys:[]};
      const coverage = inspectOfficialStandardReleaseOpeningCoverageV2({...input,recipes:{...input.recipes,player1}});
      variants.push({mode,player1,...summary(coverage)});
    }
    await save(output+'/nova-rosters.json',variants);
  } else {
    const inspected=inspectOfficialStandardReleaseOpeningCoverageV2(input);
    assert.deepEqual(summary(inspected),{total:previous.total,exact:21,pending:[]});
    await save(output+'/inspection.json',summary(inspected));
    const opening=prepareOfficialStandardReleaseOpeningV2(input);
    assert.deepEqual(summary(opening.openingRosterCoverage),summary(inspected));
    const runtime=createOfficialReleaseMatchRuntimeV2({context,state:opening.state,candidateVersion:input.releaseMatchVersion});
    assert.deepEqual(runtime.enumerate(opening.state).candidates.map(a=>a.actionType),['resolve_mission_start_of_round']);
    await save(output+'/factory-state.json',opening.state);
    await save(output+'/runtime.json',runtime.descriptor);
    await save(output+'/admission.json',{version:input.releaseMatchVersion,releaseId:manifest.releaseId,
      previousExact:previous.exact,...summary(inspected),modelCalls:0});
  }
} finally {product.close();}
