import assert from 'node:assert/strict';
import { registry, read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { inspectOfficialStandardReleaseOpeningCoverageV2, prepareOfficialStandardReleaseOpeningV2,
  OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY } from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import { createOfficialReleaseMatchRuntimeV2 } from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
const integration = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const output = integration+'/nova-shared-standard-v230';
const manifest = await read(integration+'/tabletop-raven-m01-v1/manifest.json');
const previous = await read(integration+'/raven-seeker-standard-v229/nova-rosters.json');
const originalState = await read(integration+'/raven-seeker-standard-v229/factory-state.json');
const recipes = Object.fromEntries(previous.map(row => [row.mode,row.player1]));
const specOps = previous[0].player1.units.find(unit => unit.recordKey === 'army_units:spec_ops_marauder__marauder_');
recipes.specops = {...previous[0].player1, units:[specOps]};
const unit = name => ({unitInstanceId:name,recordKey:'army_units:'+name,compositionKind:'small',upgradeNames:[]});
const player2 = {factionRecordKey:'tactical_cards:zerg_swarm', units:[unit('zergling')], tacticalCardRecordKeys:['tactical_cards:accelerating_creep']};
const product = registry();
try {
  product.resolver.register(manifest);
  const [abilities,mission] = await Promise.all(['area_ability_inputs','mission_source'].map(purpose =>
    product.resolver.resolve({releaseId:manifest.releaseId,purpose})));
  const context = {...abilities,resources:{...abilities.resources,...mission.resources}};
  const input={releaseContext:context,releaseMatchVersion:'2.31.0',dataset:context.dataset,snapshot:context.snapshot,
    recipes:{player1:recipes.specops,player2:{...player2,units:[...player2.units,unit('queen')]}},
    armySpendPolicy:OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY,missionRecordKey:originalState.officialMissionSetupBinding.missionRecordKey,
    deploymentRecordKey:originalState.officialDeploymentGeometryBinding.deploymentRecordKey};
  const check=inspectOfficialStandardReleaseOpeningCoverageV2(input);
  const pending=check.definitions.filter(row=>row.registrationStatus!=='executable_exact').map(row=>row.definitionId);
  assert.deepEqual(pending,[]);
  const opening=prepareOfficialStandardReleaseOpeningV2(input);
  const runtime=createOfficialReleaseMatchRuntimeV2({context,state:opening.state,candidateVersion:'2.31.0'});
  const sources=opening.state.officialUnitLifecycleFamilySourceBundle;
  assert(sources.definitionIds.includes('card:nova_covert_ops/griffin-support-any@1'));
  assert(sources.definitionIds.includes('unit:queen/spawn-creep-tumor-any-phase@1'));
  assert.deepEqual(runtime.enumerate(opening.state).candidates.map(a=>a.actionType),['resolve_mission_start_of_round']);
  await save(output+'/mixed-queen.json',{exact:check.definitions.length,sources:sources.definitionIds,version:runtime.descriptor.runtimeVersion,runtimeHash:runtime.descriptor.runtimeHash});
} finally {product.close();}
