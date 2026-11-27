import assert from 'node:assert/strict';
import {read, save} from './support/wave3-raven-tabletop-room-v1.mjs';
import {resolveWave3StandardContext} from './support/wave3-standard-action-room-v1.mjs';
import {inspectOfficialStandardReleaseOpeningCoverageV2, prepareOfficialStandardReleaseOpeningV2, OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY} from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import {createOfficialReleaseMatchRuntimeV2} from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';

import { wave3HumanMapConfiguration } from '../packages/product-composition/wave3-human-match-v1.mjs';

const web = process.argv.includes('--web');
const dir='build/ticket-28-wave3-human-lobby-v1/remaining-six/'+(web?'web-openings':'openings');
const base='build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const reference=await read(base+'/khassar-supply-standard-2.84.0/coverage.json');
const setup = web && (await read('content/wave3-human-match-setups-v1.json')).find(s => s.scale === 'Standard');
const context=await resolveWave3StandardContext(await read(web ? setup.releaseRef : reference.manifestRef),'area_ability_inputs');
const unit=(name,upgradeNames=[])=>({unitInstanceId:name,recordKey:'army_units:'+name,compositionKind:'small',upgradeNames});
const army=(faction,units,cards=[])=>({factionRecordKey:'tactical_cards:'+faction,units,tacticalCardRecordKeys:cards.map(c=>'tactical_cards:'+c)});
const enemy=army('raynor_s_raiders',[unit('marine')]);
const cases={
  'protoss-support':army('daelaam',[unit('adept',['Glaive Strike','Guidance','Resonating Glaives']),
    unit('sentry',['Hallucination','Solid-Field Projectors'])],['forge','gate_chronoboosted','nexus','observer','warp_gate']),
  armour:army('terran_armed_forces',[unit('goliath',['Ares-Class Targeting System'])],['factory__tech_lab_']),
  support:army('terran_armed_forces',[unit('medic',['Advanced Medic Facilities','A-13 Flash Grenade Launcher'])],
    ['academy','barracks','engineering_bay','orbital_command']),
  'support-weapons':army('terran_armed_forces',[unit('medic',['A-13 Flash Grenade Launcher'])],['dropship']),
  marauder:army('terran_armed_forces',[unit('marauder',['Kinetic Foam','Laser Targeting Systems','Veteran of Tarsonis'])]),
  raiders:army('raynor_s_raiders',[unit('raynor_s_raider__marine_')]),
  artanis:army('khalai',[unit('artanis')]),
  praetor:army('khalai',[unit('praetor_guard__zealot_')]),
};
const opponents={
  'protoss-support':army('khalai',[unit('stalker',['Fury of the Nerazim','Path of Shadows']),
    unit('zealot',['Leg Enhancements','My Life for Aiur','We Stand as One','Zealous Round'])],
    ['overcharged_nexus','power_field','twilight_council','warp_prism']),
  armour:army('terran_armed_forces',[unit('siege_tank',['Mode Transformation','Coordinated Strike'])],['factory__tech_lab_']),
  'support-weapons':army('terran_armed_forces',[unit('siege_tank',['Mode Transformation','Shaped Blast','Smart Shells'])],['factory__tech_lab_']),
  support:army('terran_armed_forces',[unit('siege_tank',['Mode Transformation','Shaped Blast','Smart Shells'])],
    ['factory__tech_lab_','armory','barracks__tech_lab_','vanadium_plating']),
};
// Identical pair, with only the overcharged Nexus card omitted to isolate its reserve reaction.
cases['protoss-field-support']=cases['protoss-support'];
opponents['protoss-field-support']={...opponents['protoss-support'],
  tacticalCardRecordKeys:opponents['protoss-support'].tacticalCardRecordKeys.filter(k=>k!=='tactical_cards:overcharged_nexus')};
const version=process.env.W3_MATCH_CANDIDATE??'2.89.0';
for(const name of process.argv.slice(2).filter(a => a !== '--web')){
  const retainedOpenings={
    'immortal-support': 'immortal-transport-standard-2.83.0',
    'templar-support': 'templar-standard-2.73.0',
    'storm-gale-support': 'templar-storm-gale-standard-2.76.0',
  };
  assert(Object.hasOwn(cases,name)||Object.hasOwn(retainedOpenings,name));
  const recipes=Object.hasOwn(retainedOpenings,name)
    ? (await read(base+'/'+retainedOpenings[name]+'/coverage.json')).recipes
    : {player1:cases[name],player2:opponents[name]??enemy};
  const params={releaseContext:context,releaseMatchVersion:version,dataset:context.dataset,snapshot:context.snapshot,recipes,
    ...(web ? {roomId:'formal-'+name,mapConfiguration:wave3HumanMapConfiguration(setup)} : {}),
    missionRecordKey:web?setup.missionRecordKey:reference.mission,deploymentRecordKey:web?setup.deploymentRecordKey:reference.deployment,armySpendPolicy:OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY};
  const record={name,version,manifestHash:context.manifest.manifestHash,manifestRef:web?setup.releaseRef:reference.manifestRef,recipes,providerCalls:0};
  try{
    const coverage=inspectOfficialStandardReleaseOpeningCoverageV2(params);
    record.definitions=coverage.definitions.map(d=>({id:d.definitionId,hash:d.sourceFeatureHash,recordKey:d.recordKey,
      registrationStatus:d.registrationStatus,componentActionTypes:d.componentActionTypes,owners:d.owners}));
    record.pending=record.definitions.filter(d=>d.registrationStatus!=='executable_exact').map(d=>d.id);
    const opening=prepareOfficialStandardReleaseOpeningV2(params);
    assert.deepEqual(opening.openingRosterCoverage,coverage);
    assert.deepEqual(opening.pendingNativeDefinitionIds,[]);
    const runtime=createOfficialReleaseMatchRuntimeV2({context,state:opening.state,candidateVersion:version});
    record.menu=runtime.enumerate(opening.state).candidates.filter(c=>c.isEnabled!==false).map(c=>c.actionType);
    assert(record.menu.includes('resolve_mission_start_of_round'));
    record.admitted=true;record.runtimeHash=runtime.descriptor.runtimeHash;
  }catch(error){
    record.admitted=false;record.diagnostic={code:error.code??error.name,message:error.message,detail:error.detail};
  }
  const ref=dir+'/'+name+'-'+version+'.public.json';
  let prior;
  try {prior=await read(ref);} catch(error){if(error.code!=='ENOENT')throw error;}
  if(prior && !prior.admitted) await save(dir+'/'+name+'-'+version+'-stop-'+Date.now()+'.public.json',prior);
  await save(ref,record);
  console.log(name,record.admitted,record.pending?.length,record.diagnostic?.message);
}
