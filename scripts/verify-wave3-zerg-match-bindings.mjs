import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { resolveWave3StandardContext } from './support/wave3-standard-action-room-v1.mjs';
import { inspectOfficialStandardReleaseOpeningCoverageV2, prepareOfficialStandardReleaseOpeningV2,
  OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY } from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import { wave3HumanMapConfiguration } from '../packages/product-composition/wave3-human-match-v1.mjs';

const base = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const dir = 'build/ticket-28-wave3-human-lobby-v1/zerg-definitions-288';
const setup = (await read('content/wave3-human-match-setups-v1.json')).find(s => s.scale === 'Standard');
const context = await resolveWave3StandardContext(await read(setup.releaseRef),'area_ability_inputs');
assert.equal(context.manifest.manifestHash,setup.sourceHash);
const inventory = (await read('coordination/wave3/new-definition-inventory.json')).entries.filter(e=>e.race==='Zerg');
const refs = {
  zagara: base+'/zerg-forty-formal-admission-v251/recipes.json',
  ravager: base+'/zagara-standard-admission-v239/mixed-ravager-v240/recipes.json',
  cocoon: base+'/wave3-artefact-cocoon-v223-v1/factory-preflight.public.json',
};
const bindings = new Map();
for (const [name,ref] of Object.entries(refs)) {
  const version = name === 'zagara' ? '2.87.0' : '2.88.0';
  const source = await read(ref);
  const recipes = structuredClone(name === 'cocoon' ? source.find(row=>row.status==='compiled').recipes : source);
  if (name === 'ravager') {
    const unit = recipes.player2.units.find(row=>row.recordKey==='army_units:ravager');
    unit.upgradeNames = ['Bloated Bile Ducts','Burrow Ambush','Potent Bile'];
  }
  const proofFile = (name === 'zagara' ? 'build/ticket-28-wave3-human-lobby-v1/zerg-definitions-287' : dir)+'/'+name+'.public.json';
  let record = await read(proofFile).catch(e=>{if(e.code!=='ENOENT') throw e;});
  if (record) {
    assert.equal(record.version,version);
    assert.equal(record.manifestHash,setup.sourceHash);
    assert.deepEqual(record.recipes,recipes);
  } else {
    const input = {roomId:'zerg-bindings-287-'+name,releaseContext:context, releaseMatchVersion:version,
      dataset:context.dataset, snapshot:context.snapshot,recipes,missionRecordKey:setup.missionRecordKey,deploymentRecordKey:setup.deploymentRecordKey,
      mapConfiguration:wave3HumanMapConfiguration(setup),armySpendPolicy:OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY};
    try {
      const inspected = inspectOfficialStandardReleaseOpeningCoverageV2(input);
      const opening = prepareOfficialStandardReleaseOpeningV2(input);
      assert.deepEqual(opening.pendingNativeDefinitionIds,[]);
      assert(isDeepStrictEqual(inspected,opening.openingRosterCoverage),'read-only and formal factory differ');
      const defs = inspected.definitions.map(row=>{
        const native = opening.nativeActions.catalogue.definitions.find(d=>d.definitionId===row.definitionId);
        assert.equal(native.sourceFeatureHash,row.sourceFeatureHash);
        assert.equal(native.execution.status,'executable_exact');
        assert.equal(row.registrationStatus,native.execution.status);
        assert(native.execution.adapterId && row.owners.length);
        return {id:row.definitionId,recordKey:row.recordKey,hash:row.sourceFeatureHash,owners:row.owners,adapter:native.execution.adapterId};
      });
      record = {name,version,sourceRecipe:ref,recipes,manifestHash:setup.sourceHash,mission:setup.missionRecordKey,deployment:setup.deploymentRecordKey,
        pending:opening.pendingNativeDefinitionIds,phase:opening.state.phase,definitions:defs,providerCalls:0};
      await save(proofFile,record);
    } catch(e) {
      await save(dir+'/stop-'+name+'-'+Date.now()+'.public.json',{name,version,reason:e.message,detail:e.detail});
      throw e;
    }
  }
  for (const row of record.definitions) {
    if (!bindings.has(row.id)) bindings.set(row.id,[]);
    bindings.get(row.id).push({proofFile,...row});
  }
  console.log(name,record.definitions.length);
}
const rows = inventory.map(entry=>{
  const id = entry.semanticId+'@'+entry.semanticVersion;
  const identity = context.resources.abilityIdentities.definitions.find(d=>d.definitionId===id);
  assert.equal(identity.recordKey,entry.normalizedSourceRef.recordKey);
  const matches = bindings.get(id) ?? [];
  for (const row of matches) {
    assert.equal(row.hash,identity.sourceFeatureHash);
    assert.equal(row.recordKey,identity.recordKey);
  }
  return {id,hash:identity.sourceFeatureHash,confirmedBy:matches.map(r=>r.proofFile)};
});
const missing = rows.filter(r=>!r.confirmedBy.length).map(r=>r.id);
await save(dir+'/result.public.json',{versions:{zagara:'2.87.0',ravager:'2.88.0',cocoon:'2.88.0'},manifestHash:setup.sourceHash,total:rows.length,exact:rows.length-missing.length,missing,rows,
  scope:'selected definitions in read-only admission, strict Standard openings and native registry',providerCalls:0});
console.log('frozen Zerg',rows.length-missing.length,'/',rows.length,missing);
assert.equal(missing.length,0);
