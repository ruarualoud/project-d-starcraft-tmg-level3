import assert from 'node:assert/strict';
import { registry, read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { inspectOfficialStandardReleaseOpeningCoverageV2, prepareOfficialStandardReleaseOpeningV2,
  OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY } from '../packages/product-composition/official-standard-room-factory-v1.mjs';

import { createOfficialReleaseMatchRuntimeV2 } from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';

const base = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const output = base + '/nova-modes-standard-v232';
const [manifest, recipes, initial] = await Promise.all([
  read(base + '/tabletop-raven-m01-v1/manifest.json'), read(base + '/raven-seeker-standard-v229/nova-rosters.json'),
  read(base + '/nova-shared-standard-v230/factory-state.json'),
]);
const product = registry();
try {
  product.resolver.register(manifest);
  const [abilities, mission] = await Promise.all(['area_ability_inputs','mission_source']
    .map(purpose => product.resolver.resolve({ releaseId: manifest.releaseId, purpose })));
  const context = {...abilities, resources: {...abilities.resources, ...mission.resources}};
  const player2 = {factionRecordKey:'tactical_cards:zerg_swarm', units:[{ unitInstanceId:'zergling',
    recordKey:'army_units:zergling', compositionKind:'small', upgradeNames:[] }], tacticalCardRecordKeys:['tactical_cards:accelerating_creep']};
  const [first, second] = recipes;
  const selectedMode = process.argv.at(-1);
  const recipe = recipes.find(row => row.mode === selectedMode);
  const input = { releaseContext:context, releaseMatchVersion:'2.32.0', dataset:context.dataset, snapshot:context.snapshot,
    recipes:{player1:recipe?.player1 || first.player1, player2}, armySpendPolicy:OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY,
    missionRecordKey:initial.officialMissionSetupBinding.missionRecordKey, deploymentRecordKey:initial.officialDeploymentGeometryBinding.deploymentRecordKey };
  if (selectedMode === 'legacy') {
    const prior = await read(base+'/nova-shared-standard-v230/mixed-queen.json');
    const specOps = first.player1.units.filter(row=>row.recordKey==='army_units:spec_ops_marauder__marauder_');
    const queen = {unitInstanceId:'queen',recordKey:'army_units:queen',compositionKind:'small',upgradeNames:[]};
    const opening = prepareOfficialStandardReleaseOpeningV2({...input,releaseMatchVersion:prior.version,
      recipes:{player1:{...first.player1,units:specOps},player2:{...player2,units:[...player2.units,queen]}}});
    const runtime=createOfficialReleaseMatchRuntimeV2({context,state:opening.state,candidateVersion:prior.version});
    assert.equal(runtime.descriptor.runtimeHash,prior.runtimeHash);
    await save(output+'/legacy-descriptor.json',{version:prior.version,runtimeHash:prior.runtimeHash,exact:true});
  } else if (selectedMode === 'mutually-exclusive') {
    const mixed = {...first.player1, units:[...first.player1.units, second.player1.units[0]]};
    assert.throws(() => prepareOfficialStandardReleaseOpeningV2({...input, recipes:{player1:mixed,player2}}),
      error => [error.code,error.message,JSON.stringify(error.detail)].some(text => text?.includes('MUTUALLY_EXCLUSIVE')));
    await save(output+'/mutually-exclusive.json',{status:'pass',bothModesRejected:true});
  } else {
    assert(recipe);
    const prior = await read(base+'/nova-shared-standard-v230/'+selectedMode+'/verified.json');
    const coverage = inspectOfficialStandardReleaseOpeningCoverageV2(input);
    const pending = coverage.definitions.filter(row=>row.registrationStatus !== 'executable_exact').map(row=>row.definitionId);
    const prefix = 'unit:'+selectedMode+'/';
    const expected = ['battle-preparation-any-phase','ghost-visor-any-phase','super-stimpack-movement-phase'];
    if (selectedMode === 'nova_stealth_mode') expected.push('tactical-stealth-suit-any-phase');
    const added = expected.map(name=>prefix+name+'@1');
    const result = {mode:selectedMode,total:coverage.definitions.length,exact:coverage.definitions.length-pending.length,added,pending};
    await save(output+'/'+selectedMode+'/observed.json',result);
    assert.equal(result.total,prior.total);
    assert.deepEqual(pending,prior.pending.filter(id=>!added.includes(id)));
    assert.equal(result.exact,prior.exact+added.length);
    assert.throws(()=>prepareOfficialStandardReleaseOpeningV2(input),error=>
      error.code==='OFFICIAL_RELEASE_ROOM_ABILITY_COVERAGE_PENDING' && JSON.stringify(error.detail.pendingSelectedDefinitionIds)===JSON.stringify(pending));
    await save(output+'/'+selectedMode+'/verified.json',result);
  }
} finally { product.close(); }
