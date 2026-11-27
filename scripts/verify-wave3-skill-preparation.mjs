import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createStarcraftProductServerV1} from './serve-starcraft-product-v1.mjs';
import {createSqliteStarcraftTmgStrategyReleaseStoreV1} from '../packages/strategy-skills/sqlite-strategy-release-store-v1.mjs';
import {verifySeal} from '../packages/skill-production/common.mjs';
import {atomicWrite} from './lib/development-context.mjs';

const root=process.cwd(),dir=path.resolve('build/ticket-28-wave3-skill-preparation');
const options={root,dataDirectory:dir,fixtureRoot:root,webRoot:path.resolve('build/ticket-28-wave3-geometry-web/web'),
  port:0,liveEnabled:false,autoDrive:false,mapConfiguration:{seedId:'standard-d6-1'}};
const api='/starcraft-tmg-level3/roster-planning/v1/';
const headers={'x-starcraft-match-setup':'wave3-standard-v1'};
const server=await createStarcraftProductServerV1(options);
let preparation;
try {
  const res=await fetch(server.origin+api+'skill-refresh-preview',{method:'POST',headers});
  assert.equal(res.status,200);
  ({preparation}=await res.json());
  verifySeal(preparation);
  const jobs=preparation.jobs;
  assert.equal(jobs.length,17);
  const delivered=new Set(),counts={};let changed=0,indirect=0,newFaction=0;
  const examples={};
  async function section(job,slot,preparationHash=preparation.hash) {
    const args=new URLSearchParams({preparation:preparationHash,skillId:job.skillId, section:slot});
    return fetch(server.origin+api+'skill-refresh-section?'+args,{headers});
  }
  for(const job of jobs) {
    assert(job.requires.every(key=>delivered.has(key)));
    assert(!delivered.has(job.skillId));delivered.add(job.skillId);
    counts[job.role]=(counts[job.role]??0)+1;
    for(const slot of job.sections) {
      const response=await section(job,slot.section);
      assert.equal(response.status,200);
      const {packet}=await response.json(); verifySeal(packet);
      assert.equal(packet.preparationHash,preparation.hash);assert.equal(packet.parentHash,job.parentHash);
      assert.equal(packet.runtimeAccepted,false);assert.equal(packet.published,false);
      if(job.parentHash) {
        assert(packet.previousSection);assert(!packet.factionSource);
        if(slot.status==='review_changed_sources') {assert(packet.changedFacts.length);changed++;}
        else {assert.equal(slot.status,'no_direct_match_requires_coverage_review');indirect++;}
      } else {
        assert.equal(packet.previousSection,null);
        assert.equal(packet.factionSource.recordKey,job.factionRecordKey);
        assert.equal(packet.factionSource.payload.isFactionCard,true);newFaction++;
      }
      if(!examples[slot.status])examples[slot.status]={skillId:job.skillId,section:slot.section,hash:packet.hash};
    }
  }
  assert.deepEqual(counts,{general:1,faction:10,matchup:6});
  assert.deepEqual([changed,indirect,newFaction],[58,6,6]);
  assert.equal((await section(jobs[0],'missing')).status,404);
  assert.equal((await section(jobs[0],jobs[0].sections[0].section,'old-release')).status,409);
  await fs.mkdir(dir,{recursive:true});
  await atomicWrite(path.join(dir,'result.public.json'),JSON.stringify({preparation:preparation.hash,release:preparation.releaseHash,
    orderedJobs:counts,existingSectionsToReview:changed,existingSectionsWithoutDirectEvidence:indirect,
    missingFactionScopePackets:newFaction,examples,unknownSection:404,crossVersion:409,providerCalls:0},null,2)+'\n');
} finally {await server.close();}
const store=createSqliteStarcraftTmgStrategyReleaseStoreV1({filename:path.join(dir,'skill-refresh.sqlite')});
try {
  const stored=await store.getArtifact('wave3-preparation:'+preparation.hash);
  assert.deepEqual(stored.artifact,preparation);
  const file=path.join(dir,'result.public.json');
  const result=JSON.parse(await fs.readFile(file,'utf8'));result.coldReopen=true;
  await atomicWrite(file,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
} finally {await store.close();}
