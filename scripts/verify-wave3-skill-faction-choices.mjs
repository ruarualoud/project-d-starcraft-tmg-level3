import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {createStarcraftProductServerV1} from './serve-starcraft-product-v1.mjs';
import {verifySeal} from '../packages/skill-production/common.mjs';
import {atomicWrite} from './lib/development-context.mjs';

const root = process.cwd();
const directory = path.resolve('build/ticket-28-wave3-skill-faction-choices');
const previous = JSON.parse(await readFile('build/ticket-28-wave3-skill-preparation/result.public.json','utf8'));
const dataset = JSON.parse(await readFile('build/ticket-28-wave3-source-candidate-20261112-v1/compiled/dataset.json','utf8'));
const api = '/starcraft-tmg-level3/roster-planning/v1/';
const server = await createStarcraftProductServerV1({root, dataDirectory:directory, fixtureRoot:root,
  webRoot:directory, port:0, liveEnabled:false, autoDrive:false});
try {
  const headers = {'x-starcraft-match-setup':'wave3-standard-v1'};
  const response = await fetch(server.origin+api+'skill-refresh-preview',{method:'POST',headers});
  assert.equal(response.status,200);
  const {preparation} = await response.json();
  assert.equal(preparation.hash,previous.preparation);
  const jobs = preparation.jobs.filter(job => job.sections.some(slot=>slot.status==='needs_new_coverage'));
  const evidence = [];
  const request = (job, extra = {}, scope = headers) => {
    const query = new URLSearchParams({skillId:job.skillId,section:job.sections[0].section,preparation:preparation.hash,...extra});
    return fetch(server.origin+api+'skill-refresh-section?'+query,{headers:scope});
  };
  for (const job of jobs) {
    const initial = await request(job);
    assert.equal(initial.status,200);
    const {packet,lookups} = await initial.json();
    assert.deepEqual(lookups.eligibleFactions,[job.factionRecordKey]);
    const faction = job.factionRecordKey;
    const catalogue = await request(job,{faction});
    assert.equal(catalogue.status,200);
    const {choice:menu} = await catalogue.json();
    verifySeal(menu);
    assert.equal(menu.sectionInputHash,packet.hash);
    assert.equal(menu.roomRelease.normalizedDatasetHash,dataset.datasetHash);
    assert(menu.candidates.length>0 && !menu.selection);
    const chosen = menu.candidates.find(key=>key.startsWith('army_units:'));
    const detail = await request(job,{faction,record:chosen});
    assert.equal(detail.status,200);
    const {choice} = await detail.json();verifySeal(choice);
    assert.equal(choice.menuReceiptHash,menu.menuReceiptHash);
    assert(!choice.candidates);
    assert.equal(choice.selection.sourceRecordHash,dataset.recordsByKey[chosen].sourceRecordHash);
    assert.deepEqual(choice.selection.officialProfile,dataset.recordsByKey[chosen].payload);
    assert(choice.selection.option.compositionOptions.some(row=>Number.isInteger(row.mineralCost)));
    assert.equal((await request(job,{faction,record:'army_units:does-not-exist'})).status,404);
    evidence.push({faction,count:menu.candidates.length,chosen,menuReceipt:menu.menuReceiptHash});
  }
  assert.equal(evidence.length,6);
  const match = preparation.jobs.find(job=>job.role==='matchup');
  const scoped = await request(match);
  const {lookups} = await scoped.json();
  assert.equal(new Set(lookups.eligibleFactions).size,2);
  const otherFaction = jobs.map(job=>job.factionRecordKey).find(key=>!lookups.eligibleFactions.includes(key));
  assert.equal((await request(match,{faction:otherFaction})).status,422);
  const general = preparation.jobs.find(job=>job.role==='general');
  assert.equal((await request(general,{faction:otherFaction})).status,422);
  const data = {status:'passed',evidence,matchupFactions:lookups.eligibleFactions,
    unrelatedFactionRejected:true,unknownUnitRejected:true,unchangedPreparation:preparation.hash,providerCalls:0};
  await atomicWrite(path.join(directory,'result.public.json'),JSON.stringify(data,null,2)+'\n');
  console.log(JSON.stringify(data));
} finally { await server.close(); }
