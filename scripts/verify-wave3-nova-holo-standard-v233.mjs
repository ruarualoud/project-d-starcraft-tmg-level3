import assert from 'node:assert/strict';
import { registry, read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { inspectOfficialStandardReleaseOpeningCoverageV2, prepareOfficialStandardReleaseOpeningV2,
  OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY } from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import { createOfficialReleaseMatchRuntimeV2 } from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
const base='build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const stealthShooting=process.argv.includes('--stealth-shooting');
const out=base+(stealthShooting?'/nova-stealth-standard-v235':'/nova-holo-standard-v233');
const [manifest,recipes,baseState] = await Promise.all([read(base+'/tabletop-raven-m01-v1/manifest.json'),
  read(base+'/raven-seeker-standard-v229/nova-rosters.json'),read(base+'/nova-shared-standard-v230/factory-state.json')]);
const product=registry();
try {
  product.resolver.register(manifest);
  const [abilities,mission]=await Promise.all(['area_ability_inputs','mission_source']
    .map(purpose=>product.resolver.resolve({releaseId:manifest.releaseId,purpose})));
  const context={...abilities,resources:{...abilities.resources,...mission.resources}};
  const scene=process.argv.at(-1);
  const legacy=scene==='legacy-v232';
  const mode=stealthShooting?'nova_stealth_mode':(scene==='assets'||legacy?'nova_assault_mode':scene);
  const recipe=recipes.find(row=>row.mode===mode);
  assert(recipe);
  const player2={factionRecordKey:'tactical_cards:zerg_swarm',units:[{unitInstanceId:'zergling',recordKey:'army_units:zergling',compositionKind:'small',upgradeNames:[]}],tacticalCardRecordKeys:['tactical_cards:accelerating_creep']};
  const player1=structuredClone(recipe.player1);
  if (scene==='stealth-factory') player1.tacticalCardRecordKeys.push('tactical_cards:factory');
  if (scene==='assets') {
    player1.tacticalCardRecordKeys.push('tactical_cards:dropship');
    player2.tacticalCardRecordKeys.push('tactical_cards:overlord');
  }
  const version=stealthShooting?(scene==='legacy-v234'?'2.34.0':'2.35.0'):(legacy?'2.32.0':'2.33.0');
  const input={releaseContext:context,releaseMatchVersion:version,dataset:context.dataset,snapshot:context.snapshot,
    recipes:{player1,player2},armySpendPolicy:OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY,
    missionRecordKey:baseState.officialMissionSetupBinding.missionRecordKey,deploymentRecordKey:baseState.officialDeploymentGeometryBinding.deploymentRecordKey};
  const coverage=inspectOfficialStandardReleaseOpeningCoverageV2(input);
  const pending=coverage.definitions.filter(row=>row.registrationStatus!=='executable_exact').map(row=>row.definitionId);
  const prior=await read(base+'/nova-modes-standard-v232/'+mode+'/verified.json');
  const expected=stealthShooting && scene!=='legacy-v234'?[]:legacy?prior.pending:mode==='nova_assault_mode'?[]:prior.pending.filter(id=>!id.includes('/holo-decoy-'));
  const result={mode,scene,releaseMatchVersion:input.releaseMatchVersion,total:coverage.definitions.length,exact:coverage.definitions.length-pending.length,pending};
  await save(out+'/'+scene+'/coverage.json',result);
  if(scene!=='assets' && scene!=='stealth-factory') assert.equal(result.total,prior.total);
  assert.deepEqual(pending,expected);
  if (legacy) assert.equal(result.exact,prior.exact);
  if (pending.length) {
    assert.throws(()=>prepareOfficialStandardReleaseOpeningV2(input),e=>e.code==='OFFICIAL_RELEASE_ROOM_ABILITY_COVERAGE_PENDING'
      && JSON.stringify(e.detail.pendingSelectedDefinitionIds)===JSON.stringify(expected));
  } else {
    const opening=prepareOfficialStandardReleaseOpeningV2(input);
    const runtime=createOfficialReleaseMatchRuntimeV2({context,state:opening.state,candidateVersion:input.releaseMatchVersion});
    assert.deepEqual(runtime.enumerate(opening.state).candidates.map(row=>row.actionType),['resolve_mission_start_of_round']);
    assert(runtime.descriptor.releaseHoloRoundEnd);
    if (stealthShooting) {
      const actions=runtime.descriptor.executorManifest.flatMap(row=>row.actionTypes);
      assert(actions.includes('declare_ranged_attack') && actions.includes('resolve_ranged_card_refresh'));
      assert(opening.state.officialRangedDeclarationPolicy.numericWeaponsSupported);
    }
    await save(out+'/'+scene+'/factory-state.json',opening.state);
    result.runtimeHash=runtime.descriptor.runtimeHash;
  }
  await save(out+'/'+scene+'/admission.json',result);
} finally {product.close();}
