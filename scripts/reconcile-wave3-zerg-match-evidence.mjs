import assert from 'node:assert/strict';
import {read,save} from './support/wave3-raven-tabletop-room-v1.mjs';

const base='build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/';
const manifest=await read(base+'tabletop-raven-m01-v1/manifest.json');
const registry=await read(manifest.components.abilityIdentities.ref);
const identity=new Map(registry.definitions.map(row=>[row.definitionId,row]));
const legacy=await read(base+'inherited-zerg-standard-2.52.0/coverage-ledger.json');
const admitted=new Map();
for(const [version,faction] of [['2.51.0','kerrigan'],['2.53.0','malignant'],['2.57.0','swarm']]){
  const ref=base+'inherited-zerg-standard-'+version+'/'+faction+'.json';
  const record=await read(ref);
  assert.equal(record.manifestHash,manifest.manifestHash);
  for(const row of record.rows.filter(r=>r.registrationStatus==='executable_exact')){
    assert.equal(row.sourceFeatureHash,identity.get(row.definitionId)?.sourceFeatureHash,row.definitionId);
    admitted.set(row.definitionId,ref);
  }
}
const childCases={
  'unit:omega_worm/detection-any-phase@1':['omega-detection-v258/result.json',r=>
    r.coldExact && !r.hiddenAfter && r.conditionalRound===2 && r.fromGap>6000 && r.endGap<6000
    && r.removed.detectingSources.some(s=>s.definitionId==='unit:omega_worm/detection-any-phase@1'&&s.sourceFeatureHash===identity.get(s.definitionId).sourceFeatureHash)],
  'unit:omega_worm/source-of-creep-any-phase@1':['creep-footprints-v259/result.json',r=>r.worm.coldExact&&r.worm.inside.onCreep],
  'unit:omega_worm/structure-any-phase@1':['omega-structure-v260/result.json',r=>r.coldExact&&r.after.reason==='structure'],
  'unit:omega_worm/omega-network-any-phase@1':['omega-network-deployment-v261/result.json',r=>r.coldExact&&r.committedSupply===2&&r.remainingGlobal===5&&r.extraEntryRejected],
  'unit:roachling/underdeveloped-claws-any-phase@1':['roachling-burrow-v260/result.json',r=>r.coldExact&&r.eligibility.childCanMove&&!r.eligibility.childCanUseCard&&r.eligibility.raptorCanUseCard],
  'unit:roachling/claws-combat-phase@1':['roachling-claws-v260/result.json',r=>r.coldExact&&r.dice===6&&r.damage>0],
};
const inherited=[];
for(const row of legacy.rows){
  const id=row.definitionId, def=identity.get(id);
  assert(def,id);
  let reference=admitted.get(id),boundary='formal_roster_admission';
  if(!reference){
    const branch=childCases[id];
    assert(branch,id);
    reference=base+branch[0];
    assert(branch[1](await read(reference)),id);
    boundary='generated_unit_consumer';
  }
  inherited.push({id,sourceFeatureHash:def.sourceFeatureHash,boundary,reference});
}
const additionsRef='build/ticket-28-wave3-human-lobby-v1/zerg-definitions-288/result.public.json';
const additions=await read(additionsRef);
assert.equal(additions.exact,51);
assert.equal(additions.missing.length,0);
for(const row of additions.rows)assert.equal(row.hash,identity.get(row.id)?.sourceFeatureHash,row.id);
assert.equal(inherited.filter(r=>r.boundary==='formal_roster_admission').length,109);
assert.equal(inherited.filter(r=>r.boundary==='generated_unit_consumer').length,6);
assert.equal(new Set([...inherited,...additions.rows].map(r=>r.id)).size,166);
await save('build/ticket-28-wave3-human-lobby-v1/remaining-six/zerg-coverage.public.json',{
  manifestHash:manifest.manifestHash,inherited,additionsRef,verifiedNew:51,verifiedInherited:115,providerCalls:0,
  scope:'109 inherited roster registrations, six generated-unit consumers, 51 new source identities with prior product evidence.'});
