import assert from 'node:assert/strict';
import { registry, read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { inspectOfficialStandardReleaseOpeningCoverageV2, prepareOfficialStandardReleaseOpeningV2, OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY } from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import { createOfficialReleaseMatchRuntimeV2 } from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
const integration='build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const output=integration+'/raven-standard-v228';
const previous=await read(integration+'/raynor-match-v227/raven-upgrades.json');
const manifest=await read(integration+'/tabletop-raven-m01-v1/manifest.json');
const state=await read(integration+'/raynor-match-v227/factory-state.json');
const unit=(name,upgradeNames=[])=>({unitInstanceId:name,recordKey:'army_units:'+name,compositionKind:'small',upgradeNames});
const product=registry();
try {
  product.resolver.register(manifest);
  const [abilities,mission]=await Promise.all(['area_ability_inputs','mission_source'].map(purpose=>product.resolver.resolve({releaseId:manifest.releaseId,purpose})));
  const context={...abilities,resources:{...abilities.resources,...mission.resources}};
  const input={releaseContext:context,releaseMatchVersion:'2.28.0',dataset:context.dataset,snapshot:context.snapshot,
    recipes:{player1:{factionRecordKey:'tactical_cards:raynor_s_raiders',units:[unit('marine'),unit('raven',['Internal Tech Module','Explosive Shrapnel Shells'])],tacticalCardRecordKeys:[]},
      player2:{factionRecordKey:'tactical_cards:zerg_swarm',units:[unit('zergling')],tacticalCardRecordKeys:['tactical_cards:accelerating_creep']}},
    armySpendPolicy:OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY,missionRecordKey:state.officialMissionSetupBinding.missionRecordKey,deploymentRecordKey:state.officialDeploymentGeometryBinding.deploymentRecordKey};
  if(process.argv.includes('--optional-loadout')) {
    input.recipes.player1.units[1]=unit('raven',['Corvid Reactor','Seeker Missile']);
    const inspected=inspectOfficialStandardReleaseOpeningCoverageV2(input);
    const pending=inspected.definitions.filter(row=>row.registrationStatus!=='executable_exact').map(row=>row.definitionId);
    await save(output+'/optional-loadout.json',{upgrades:input.recipes.player1.units[1].upgradeNames,
      total:inspected.definitions.length,exact:inspected.definitions.length-pending.length,pending,
      selectedRavenDefinitions:inspected.definitions.filter(row=>row.definitionId.startsWith('unit:raven/')).map(row=>({id:row.definitionId,status:row.registrationStatus}))});
  } else {
  const opening=prepareOfficialStandardReleaseOpeningV2(input);
  const coverage=opening.openingRosterCoverage;
  const pending=coverage.definitions.filter(row=>row.registrationStatus!=='executable_exact').map(row=>row.definitionId);
  const restored=previous.pending.filter(id=>coverage.definitions.some(row=>row.definitionId===id&&row.registrationStatus==='executable_exact'));
  let inspection;
  try { inspection=await read(output+'/inspection.json'); }
  catch(error) {
    if(error.code!=='ENOENT') throw error;
    const inspected=inspectOfficialStandardReleaseOpeningCoverageV2(input).definitions;
    inspection={total:inspected.length,pending:inspected.filter(row=>row.registrationStatus!=='executable_exact').map(row=>row.definitionId),
      restored:previous.pending.filter(id=>inspected.some(row=>row.definitionId===id&&row.registrationStatus==='executable_exact')),previous:previous.registered};
    await save(output+'/inspection.json',inspection);
  }
  assert.deepEqual({total:coverage.definitions.length,pending,restored,previous:previous.registered},inspection);
  assert.deepEqual(pending,[]);assert.deepEqual(restored,previous.pending);
  await save(output+'/factory-state.json',opening.state);
  const runtime=createOfficialReleaseMatchRuntimeV2({context,state:opening.state,candidateVersion:input.releaseMatchVersion});
  const menu=runtime.enumerate(opening.state);
  const openingActions=[...new Set([...menu.candidates,...menu.parameterDomains].map(row=>row.actionType))];
  assert.deepEqual(openingActions,['resolve_mission_start_of_round']);
  await save(output+'/runtime.json',runtime.descriptor);
  await save(output+'/admission.json',{releaseId:manifest.releaseId,version:input.releaseMatchVersion,total:coverage.definitions.length,pending,restored,openingActions,modelCalls:0});
  }
} finally {product.close();}
