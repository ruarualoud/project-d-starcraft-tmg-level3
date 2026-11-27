import assert from 'node:assert/strict';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { resolveWave3StandardContext } from './support/wave3-standard-action-room-v1.mjs';
import { inspectOfficialStandardReleaseOpeningCoverageV2, OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY }
  from '../packages/product-composition/official-standard-room-factory-v1.mjs';

const base = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const version = process.argv[2] ?? '2.63.0';
assert(/^2\.\d+\.0$/.test(version));
const variant = process.argv[3] ?? 'caste';
const suiteDirectory = {caste:'templar-standard', 'storm-and-gale':'templar-storm-gale-standard', nerazim:'nerazim-standard', 'immortal-transport':'immortal-transport-standard', 'immortal-stock':'immortal-stock-standard', 'khassar-supply':'khassar-supply-standard'};
assert(Object.hasOwn(suiteDirectory, variant));
const directory = v => base + '/' + suiteDirectory[variant] + '-' + v;
const out = directory(version);
const reference = base + '/inherited-zerg-standard-2.53.0/malignant.json';
const prior = await read(reference);
const source = await read(prior.manifestRef);
const context = await resolveWave3StandardContext(source,'area_ability_inputs');
function unit(id, upgradeNames = []) {
  return {unitInstanceId:id, recordKey:'army_units:'+id,compositionKind:'small',upgradeNames};
}
// Same faction, card, and equipment used by the signed Khassar component scenario.
const casteRecipes = {player1:prior.recipes.player1,player2:{
  factionRecordKey:'tactical_cards:templar_caste',tacticalCardRecordKeys:['tactical_cards:templar_archives'],
  units:[unit('tassadar'),unit('high_templar',['Farsight']),unit('sentry'),unit('zealot')],
}};
const stormRecipes = {
  player1: { factionRecordKey:'tactical_cards:raynor_s_raiders',tacticalCardRecordKeys:[],
    units:[unit('marine'),unit('raven',['Corvid Reactor','Seeker Missile'])] },
  player2: { factionRecordKey:'tactical_cards:templar_caste',tacticalCardRecordKeys:['tactical_cards:templar_archives'],
    units:[unit('zealot'),{...unit('high_templar',['Psionic Storm']),compositionKind:'large'},unit('twilight_templar__high_templar_')] },
};
// Same two rosters as the accepted Zeratul / Watchers component room. Probe the formal factory with both sides selected.
const nerazimRecipes = {
  player1: {factionRecordKey:'tactical_cards:nerazim', tacticalCardRecordKeys:['tactical_cards:robotics_facility','tactical_cards:gateway'],
    units:[{...unit('zeratul'),unitInstanceId:'zeratul1'},{...unit('stalker'),unitInstanceId:'stalker1'}]},
  player2: {factionRecordKey:'tactical_cards:nerazim', tacticalCardRecordKeys:['tactical_cards:robotics_facility'],
    units:[{...unit('nerazim_watchers__adept_'),unitInstanceId:'watchers2'},{...unit('stalker'),unitInstanceId:'stalker2'}]},
};
// Keep both actual loadouts: a purchased Phase Disruptor replaces that arm's Photon Disruptor.
const immortalRecipes = {
  player1: {...nerazimRecipes.player1,
    tacticalCardRecordKeys:[...nerazimRecipes.player1.tacticalCardRecordKeys,'tactical_cards:void_seeker'],
    units:[...nerazimRecipes.player1.units,{...unit('nerazim_watchers__adept_'),unitInstanceId:'watchers1'}]},
  player2: {factionRecordKey:'tactical_cards:khalai', tacticalCardRecordKeys:['tactical_cards:robotics_facility'],
    units:[unit('zealot'), unit('immortal'), {...unit('immortal',[
      'Left Phase Disruptor','Right Phase Disruptor','Shield Overcharge','For the Ancients','Fury Unyielding',
    ]),unitInstanceId:'immortal2'}]},
};
// This roster has no Zeratul or Robotics Facility to provide a second source of defence choices.
const stockRecipes = { player1: { factionRecordKey:'tactical_cards:raynor_s_raiders',tacticalCardRecordKeys:[],units:[unit('marine')] },
  player2:{factionRecordKey:'tactical_cards:khalai',tacticalCardRecordKeys:[],units:[
    unit('zealot'),unit('immortal',['Shield Overcharge','Fury Unyielding','For the Ancients'])]} };
// The attacking side must own Khassar and have an already-activated Biological recipient.
const supplyRecipes = {
  player1:{factionRecordKey:'tactical_cards:templar_caste',tacticalCardRecordKeys:['tactical_cards:templar_archives'],
    units:[unit('high_templar'),unit('adept')]},
  player2:{factionRecordKey:'tactical_cards:templar_caste',tacticalCardRecordKeys:['tactical_cards:templar_archives','tactical_cards:gateway'],
    units:[unit('twilight_templar__high_templar_'),unit('zealot')]},
};
const recipes = {caste:casteRecipes, 'storm-and-gale':stormRecipes, nerazim:nerazimRecipes,
  'immortal-transport':immortalRecipes, 'immortal-stock':stockRecipes, 'khassar-supply':supplyRecipes}[variant];
const ids = new Set((await read('coordination/wave3/new-definition-inventory.json')).entries.map(e=>e.semanticId + '@' + e.semanticVersion));
try {
  const coverage = inspectOfficialStandardReleaseOpeningCoverageV2({releaseContext:context,
    dataset:context.dataset,snapshot:context.snapshot,releaseMatchVersion:version,recipes,
    armySpendPolicy:OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY,
    missionRecordKey:prior.mission,deploymentRecordKey:prior.deployment});
  assert(coverage.definitions.length);
  const rows = coverage.definitions.map(({definitionId,sourceFeatureHash,registrationStatus})=>({
    definitionId,sourceFeatureHash,registrationStatus,newWaveDefinition:ids.has(definitionId)}));
  const pending = rows.filter(r=>r.registrationStatus!=='executable_exact');
  const requiredWaveIds = variant === 'immortal-transport'
    ? [...ids].filter(id=>id.startsWith('unit:immortal/') || id.startsWith('card:void_seeker/'))
    : variant === 'immortal-stock' ? [...ids].filter(id=>id.startsWith('unit:immortal/') && !id.includes('-phase-disruptor-'))
    : variant === 'nerazim' ? ['card:nerazim/might-of-the-nerazim-any@1',
    'unit:zeratul/void-prison-movement-phase@1','unit:nerazim_watchers__adept_/psionic-transfer-movement-phase@1']
    : ['card:templar_caste/khassar-de-templari-any@1'];
  for (const id of requiredWaveIds) assert(rows.some(row=>row.definitionId===id && row.newWaveDefinition),id);
  if (variant === 'khassar-supply') {
    for (const id of ['unit:adept/psionic-presence-any-phase@1','unit:adept/psionic-transfer-movement-phase@1',
      'unit:twilight_templar__high_templar_/bound-by-the-khala-any-phase@1','card:gateway/quick-strikes-any@1']) {
      assert(rows.some(r=>r.definitionId===id),'missing condition for supply-loss scenario '+id);
    }
  }
  if (variant === 'immortal-stock') {
    assert(!rows.some(r=>r.definitionId.startsWith('card:void_seeker/') || r.definitionId.includes('-phase-disruptor-')));
    assert.deepEqual(pending,[]);
  }
  let comparedTo;
  if (variant === 'storm-and-gale') {
    for (const id of ['unit:high_templar/psionic-storm-movement-phase@1',
      'unit:twilight_templar__high_templar_/psionic-gale-movement-phase@1','unit:raven/seeker-missile-movement-phase@1']) {
      assert(rows.some(r=>r.definitionId===id),'missing selected unit or purchased definition '+id);
    }
  }
  const increments = variant === 'nerazim' ? {
    '2.81.0': {previous:'2.80.0', ids:['card:gateway/quick-strikes-any@1','card:nerazim/darkness-descends-any@1',
      'card:nerazim/might-of-the-nerazim-any@1','card:robotics_facility/plasma-shields-any@1','unit:zeratul/prophetic-vision-any-phase@1']},
    '2.80.0': {previous:'2.79.0', ids:['unit:nerazim_watchers__adept_/nerazim-farsight-any-phase@1','unit:nerazim_watchers__adept_/psionic-transfer-movement-phase@1']},
    '2.79.0': {previous:'2.78.0', ids:['unit:nerazim_watchers__adept_/path-of-shadows-any-phase@1','unit:zeratul/one-with-the-shadows-any-phase@1']},
    '2.78.0': {previous:'2.77.0', ids:['unit:zeratul/devastating-charge-assault-phase@1','unit:zeratul/sentenced-to-death-movement-phase@1']},
    '2.77.0': {previous:'2.76.0', ids:['unit:zeratul/void-blink-assault-phase@1','unit:zeratul/void-prison-movement-phase@1']},
   } : variant === 'khassar-supply' ? {
    '2.84.0': {previous:'2.83.0', ids:['unit:adept/psionic-presence-any-phase@1','unit:adept/psionic-transfer-movement-phase@1']},
  } : variant === 'immortal-stock' ? {} : variant === 'immortal-transport' ? {
    '2.83.0': {previous:'2.82.0', ids:[
      'devastating-charge-assault-phase','for-the-ancients-assault-phase','fury-unyielding-assault-phase','improved-barrier-any-phase',
      'indomitable-assault-phase','left-photon-disruptor-assault-phase','right-photon-disruptor-assault-phase','shield-overcharge-any-phase',
    ].map(name=>'unit:immortal/'+name+'@1')},
    '2.82.0': {previous:'2.81.0', ids:['card:void_seeker/anakh-su-n-any@1','card:void_seeker/personal-transport-any@1']},
  } : variant === 'storm-and-gale' ? {
    '2.76.0': {previous:'2.75.0', ids:['unit:high_templar/psionic-storm-movement-phase@1',
      'unit:twilight_templar__high_templar_/psionic-gale-movement-phase@1']},
    '2.75.0': {previous:'2.74.0', ids:['unit:twilight_templar__high_templar_/bound-by-the-khala-any-phase@1',
      'unit:twilight_templar__high_templar_/warp-in-movement-phase@1']},
  } : {
    '2.64.0': {previous:'2.63.0', ids:['unit:high_templar/farsight-movement-phase@1']},
    '2.73.0': {previous:'2.72.0', ids:['card:templar_caste/khassar-de-templari-any@1']},
    '2.72.0': {previous:'2.71.0', ids:['unit:sentry/force-field-movement-phase@1']},
    '2.71.0': {previous:'2.70.0', ids:['unit:sentry/restoration-any-phase@1']},
    '2.70.0': {previous:'2.69.0', ids:['unit:sentry/guardian-shield-movement-phase@1']},
    '2.69.0': {previous:'2.68.0', ids:['card:templar_caste/our-duty-is-unending-any@1']},
    '2.68.0': {previous:'2.67.0', ids:['unit:tassadar/force-wall-movement-phase@1', 'unit:tassadar/psi-lightning-assault-phase@1', 'unit:tassadar/telekinetic-push-assault-phase@1']},
    '2.67.0': {previous:'2.66.0', ids:['unit:tassadar/executor-s-will-movement-phase@1', 'unit:tassadar/khala-s-gift-movement-phase@1']},
    '2.66.0': {previous:'2.65.0', ids:['card:templar_archives/ancestral-wisdom-any@1']},
    '2.65.0': {previous:'2.64.0', ids:['unit:high_templar/feedback-movement-phase@1','unit:high_templar/our-minds-as-one-any-phase@1']},
  };
  if (increments[version]) {
    const increment = increments[version];
    const previous = await read(directory(increment.previous)+'/coverage.json');
    assert.deepEqual(previous.recipes,recipes);
    assert.equal(previous.manifestHash,source.manifestHash);
    const byId = new Map(previous.rows.map(row=>[row.definitionId,row]));
    assert.equal(byId.size, rows.length);
    const changed = rows.filter(r => {
      const before = byId.get(r.definitionId);
      assert.equal(before?.sourceFeatureHash,r.sourceFeatureHash);
      return before.registrationStatus !== r.registrationStatus;
    });
    assert.deepEqual(changed.map(r=>[r.definitionId,r.registrationStatus]),
      increment.ids.map(id=>[id,'executable_exact']));
    comparedTo = {version:previous.version,exact:previous.exact,total:previous.total,
      changedDefinitionIds:changed.map(r=>r.definitionId),allSourceHashesEqual:true};
  }
  await save(out+'/coverage.json',{version,comparedTo,manifestRef:prior.manifestRef,manifestHash:source.manifestHash,
    mission:prior.mission,deployment:prior.deployment,recipes,rows,pending,
    exact:rows.length-pending.length,total:rows.length,scope:'formal_opening_coverage',providerCalls:0});
  console.log('formal',variant,'roster',rows.length-pending.length,'of',rows.length,'registered');
} catch(e) {
  await save(out+'/stop-'+Date.now()+'.json',{version,recipes,reason:e.message,detail:e.detail??e.constraintDiagnostics});
  throw e;
}
