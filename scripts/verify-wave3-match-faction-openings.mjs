import assert from 'node:assert/strict';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { resolveWave3StandardContext } from './support/wave3-standard-action-room-v1.mjs';
import { prepareOfficialStandardReleaseOpeningV2, OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY } from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import { createOfficialReleaseMatchRuntimeV2 } from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import { wave3HumanMapConfiguration } from '../packages/product-composition/wave3-human-match-v1.mjs';

const base = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const baseline = 'build/ticket-28-wave3-human-lobby-v1/standard-faction-openings';
const setups = await read('content/wave3-human-match-setups-v1.json');
const standard = setups.find(setup => setup.scale === 'Standard');
const version = process.argv[2] ?? standard.version;
assert(['2.84.0','2.85.0'].includes(version));
const out = version === '2.84.0' ? baseline : baseline + '-' + version;
const small = setups.find(setup => setup.scale === 'Skirmish');
const manifest = await read(standard.releaseRef);
assert.equal(manifest.manifestHash,standard.sourceHash);
const context = await resolveWave3StandardContext(manifest,'area_ability_inputs');
const map = wave3HumanMapConfiguration(standard);
async function recipes(ref) {
  const file = await read(base+'/'+ref);
  return file.recipes ?? file;
}
const pairs = [
  Object.fromEntries(small.presets.map((p,i)=>['player'+(i+1),p.recipe])),
  await recipes('zagara-standard-admission-v239/recipes.json'),
  await recipes('immortal-transport-standard-2.83.0/coverage.json'),
  {player1:standard.presets[0].recipe, player2:(await recipes('inherited-zerg-standard-2.57.0/swarm.json')).player2},
  {player1:(await recipes('immortal-stock-standard-2.83.0/coverage.json')).player1, player2:(await recipes('sentry-field-standard-2.72/opening.json')).player1},
];
const denominator=Object.values(context.dataset.recordsByKey).filter(row=>row.collectionId==='tactical_cards' && row.payload.isFactionCard).map(row=>row.recordKey).sort();
assert.deepEqual(pairs.flatMap(pair=>Object.values(pair).map(r=>r.factionRecordKey)).sort(),denominator);
const results=[];
for(const pair of pairs) {
  const factions=Object.values(pair).map(r=>r.factionRecordKey);
  const id=factions.map(f=>f.split(':')[1]).join('-');
  const evidence=out+'/'+id+'.public.json';
  const previous=await read(evidence).catch(err=>{if(err.code!=='ENOENT')throw err;});
  if(previous?.source===standard.sourceHash && previous.version===version && previous.startApplied) {results.push(previous);continue;}
  const record={id,factions,recipes:pair,source:standard.sourceHash,version};
  // The repaired pair already went through the same factory, native start and supply check.
  if (version === '2.85.0' && id === 'templar_caste-zerg_swarm') {
    const repaired = await read('build/ticket-28-wave3-human-lobby-v1/mixed-reactions-285/khassar/opening.public.json');
    const original = await read(repaired.sourceRef);
    assert.deepEqual(original.recipes,pair);
    assert.equal(repaired.version,version);
    assert.equal(repaired.manifestHash,standard.sourceHash);
    assert.equal(repaired.phase,'movement');
    assert.deepEqual(Object.keys(repaired.supply).sort(),['player1','player2']);
    Object.assign(record,{startApplied:true,phase:repaired.phase,defs:repaired.definitionCount,runtimeHash:repaired.runtimeHash});
  } else try {
    const opening=prepareOfficialStandardReleaseOpeningV2({releaseContext:context,releaseMatchVersion:version,
      roomId:'t28-standard-'+id,dataset:context.dataset,snapshot:context.snapshot,recipes:pair,armySpendPolicy:OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY,
      missionRecordKey:standard.missionRecordKey,deploymentRecordKey:standard.deploymentRecordKey,mapConfiguration:map});
    assert.deepEqual(opening.pendingNativeDefinitionIds,[]);
    const runtime=createOfficialReleaseMatchRuntimeV2({context,state:opening.state,candidateVersion:version});
    const options=runtime.enumerate(opening.state,{sideKey:opening.state.firstPlayerSideKey}).candidates.filter(row=>row.isEnabled);
    const action=options.find(a=>a.actionType==='resolve_mission_start_of_round');
    assert(action,'round start absent from formal menu');
    const successor=runtime.apply(opening.state,action,{sideKey:opening.state.firstPlayerSideKey}).state;
    assert.equal(successor.phase,'movement');
    assert.deepEqual(Object.keys(successor.officialRoundSupplyState.supplyPoolBySide).sort(),['player1','player2']);
    Object.assign(record,{startApplied:true,phase:successor.phase,defs:opening.openingRosterCoverage.definitions.length,runtimeHash:runtime.descriptor.runtimeHash});
  } catch(error) {
    Object.assign(record,{startApplied:false,error:error.message,code:error.code,pending:error.detail?.pendingSelectedDefinitionIds,
      pendingReactions:error.detail?.pendingReactions});
  }
  if(previous && !previous.startApplied) await save(out+'/'+id+'-prior-'+Date.now()+'.json',previous);
  await save(evidence,record);
  results.push(record);
}
const passed=results.filter(r=>r.startApplied);
await save(out+'/result.public.json',{version,denominator,admittedFactions:passed.flatMap(r=>r.factions),pairCount:results.length,
  passedPairs:passed.length,failed:results.filter(r=>!r.startApplied),source:standard.sourceHash,paidCalls:0});
console.log(passed.length+'/'+pairs.length+' paired openings');
if(passed.length!==pairs.length)process.exitCode=1;
