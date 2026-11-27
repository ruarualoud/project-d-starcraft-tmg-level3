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
  const mode = process.argv.at(-1);
  if (mode === 'previous') {
    const prior = await read(integration+'/raven-seeker-standard-v229/runtime.json');
    const bound = createOfficialReleaseMatchRuntimeV2({context,state:originalState,candidateVersion:prior.runtimeVersion});
    assert.deepEqual(bound.descriptor,prior);
    await save(output+'/previous-runtime.json',{version:prior.runtimeVersion,runtimeHash:prior.runtimeHash,identical:true});
  } else {
  const recipe = recipes[mode];
  assert(recipe, 'choose a known frozen recipe');
  const input = {releaseContext:context,releaseMatchVersion:'2.30.0',dataset:context.dataset,snapshot:context.snapshot,
    recipes:{player1:recipe,player2},armySpendPolicy:OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY,
    missionRecordKey:originalState.officialMissionSetupBinding.missionRecordKey,
    deploymentRecordKey:originalState.officialDeploymentGeometryBinding.deploymentRecordKey};
  const coverage = inspectOfficialStandardReleaseOpeningCoverageV2(input);
  const pending = coverage.definitions.filter(row=>row.registrationStatus!=='executable_exact').map(row=>row.definitionId);
  const result = {mode,total:coverage.definitions.length,exact:coverage.definitions.length-pending.length,pending};
  await save(output+'/'+mode+'/coverage.json',result);
  if (mode === 'specops') {
    assert.deepEqual(pending,[]);
    const opening = prepareOfficialStandardReleaseOpeningV2(input);
    const runtime = createOfficialReleaseMatchRuntimeV2({context,state:opening.state,candidateVersion:input.releaseMatchVersion});
    assert.deepEqual(runtime.enumerate(opening.state).candidates.map(a=>a.actionType),['resolve_mission_start_of_round']);
    await save(output+'/factory-state.json',opening.state);
    await save(output+'/runtime.json',runtime.descriptor);
    await save(output+'/admission.json',{...result,version:runtime.descriptor.runtimeVersion,openingAction:'resolve_mission_start_of_round'});
  } else {
    const prior = previous.find(row=>row.mode===mode);
    const shared = previous[0].pending.filter(id=>previous[1].pending.includes(id));
    assert.equal(shared.length,6);
    assert.deepEqual(pending, prior.pending.filter(id=>!shared.includes(id)));
    assert.throws(()=>prepareOfficialStandardReleaseOpeningV2(input), error=>String(error).includes('COVERAGE'));
    await save(output+'/'+mode+'/verified.json',{...result,added:shared,openingBlocked:true});
  }
  }
} finally {product.close();}
