import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createStarcraftProductServerV1} from './serve-starcraft-product-v1.mjs';
import {resolveStarcraftTmgBattlefieldUnitMediaV1} from '../packages/client-domain/battlefield-media-catalog-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';

const root=process.cwd(),dir=path.resolve('build/ticket-28-wave3-catalogue-coverage');
const index=JSON.parse(await fs.readFile('coordination/wave3/match-increment-facts.json','utf8'));
const server=await createStarcraftProductServerV1({root,dataDirectory:dir,fixtureRoot:root,webRoot:dir,
  offlineWave3MatchVersion:'2.99.2',port:0,liveEnabled:false,autoDrive:false,mapConfiguration:{seedId:'standard-d6-1'}});
try {
  const response=await fetch(server.origin+'/starcraft-tmg-level3/roster-planning/v1/match-setup',
    {headers:{'x-starcraft-match-setup':'wave3-standard-v1'}});
  assert.equal(response.status,200);
  const {catalogue,setup}=await response.json();
  assert.equal(catalogue.source.officialDatasetHash,index.datasetHash);
  assert.equal(catalogue.source.sourceSnapshotHash,index.wave3SnapshotHash);
  const byId=new Map();
  for (const [name,records,field] of [['army_units',catalogue.units,'upgrades'],['tactical_cards',catalogue.cards,'boosts']]) {
    for(const record of records) for(const [sourceIndex,feature] of record[field].entries()) {
      const fact=feature.ruleTiming, key=name+':'+record.id;
      assert(fact && !byId.has(fact.definitionId),key+' duplicate or missing definition');
      assert.equal(fact.sourceIndex,sourceIndex,key);
      byId.set(fact.definitionId,{key,fact});
    }
  }
  const byRace={},byChange={};
  for(const row of index.rows.filter(r=>r.wave3)) {
    const actual=byId.get(row.id);
    assert(actual,row.id);
    assert.equal(actual.key,row.wave3.recordKey,row.id);
    for(const [actualKey,expectedKey] of [['name','definitionName'],['sourceIndex','sourceIndex'],['sourceFeatureHash','sourceFeatureHash']])
      assert.equal(actual.fact[actualKey],row.wave3[expectedKey],row.id);
    byId.delete(row.id);
    byRace[row.race]=(byRace[row.race]??0)+1;byChange[row.sourceChange]=(byChange[row.sourceChange]??0)+1;
  }
  assert.deepEqual([...byId.keys()],[]);
  const variants=catalogue.units.map(u=>u.id).filter(id=>id.includes('zergling')||id.includes('roach')||id==='vileling');
  const media=Object.fromEntries(variants.map(id=>[id,resolveStarcraftTmgBattlefieldUnitMediaV1('army_units:'+id)?.unitKey??null]));
  for(const [id,key] of Object.entries(media)) assert.equal(key,['roach','zergling'].includes(id)?id:null,id);
  const result={setup:setup.id,source:catalogue.source.sourceSnapshotHash,units:catalogue.units.length,cards:catalogue.cards.length,
    definitions:Object.values(byRace).reduce((a,b)=>a+b,0),byRace,byChange,media,providerCalls:0};
  await atomicWrite(path.join(dir,'result.public.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result));
} finally {await server.close();}
