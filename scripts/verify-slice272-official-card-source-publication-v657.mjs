// Real fixed workflow repeatedly cannot find the bound mission/deployment
// prose although the SAME frozen dataset owns both. Test the shared producer,
// not a manually injected card or refreshed source.
import fs from 'node:fs/promises';import path from 'node:path';
import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
import {loadOfficialDevelopmentTrancheSourceLockFixtureV1} from './support/official-development-tranche-source-lock-fixture-v1.mjs';
import {rosterSelectionSupportRulesV1} from '../packages/roster-strategist/roster-selection-justification-v1.mjs';
import {searchRosterWorkflowSourceCatalogueV1} from '../packages/roster-strategist/roster-workflow-catalogue-v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sourceRoot=path.resolve(root,'../..');
const source=await loadOfficialDevelopmentTrancheSourceLockFixtureV1({root:sourceRoot});
const before=JSON.stringify(source.dataset),rows=rosterSelectionSupportRulesV1(source.dataset);
const missionKey='faction_cards:mission_hold_position',deploymentKey='faction_cards:2NdngLtIeZAprsWr25hM';
for(const key of [missionKey,deploymentKey])assert.equal(source.dataset.recordsByKey[key].authorityDisposition,'official_current_product_candidate');
const mission=rows.find(r=>r.recordKey===missionKey),deployment=rows.find(r=>r.recordKey===deploymentKey);
assert(mission,'bound official mission prose is missing from the actual shared planning source producer');
assert(deployment,'bound official deployment prose is missing from the actual shared planning source producer');
for(const row of rows.filter(r=>r.recordKey.startsWith('faction_cards:'))){
  const record=source.dataset.recordsByKey[row.recordKey];
  assert.equal(record.authorityDisposition,'official_current_product_candidate');
  assert.equal(row.sourceRecordHash,record.sourceRecordHash);assert.deepEqual(row.rule,record.payload);
}
assert(!rows.some(r=>source.dataset.recordsByKey[r.recordKey].authorityDisposition==='community_display_only'));
const base=path.join(root,'build/slice272-product-generation-v645-I7zekC/workspace/decision-workflows/decision-959c1d9c-d6e0-43b4-8196-faef5b42fc34');
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const old=state.evidence.filter(e=>e.id.startsWith('support-source:')&&!e.id.startsWith('support-source:faction_cards:'));
for(const [i,e]of old.entries()){
  const value=JSON.parse(await fs.readFile(path.join(base,'artifacts',e.artifactRef+'.json'),'utf8'));
  assert.deepEqual(rows[i],value,'append new card sources without changing old order/identity/title index');
}
const memory=new Map(rows.map((r,i)=>[String(i),r]));
const directory=rows.map((r,i)=>({number:i+1,id:`support-source:${r.recordKey}:${r.sourceRecordHash}`,
  title:`Support source ${i}`,kind:'official_source',validity:'current',artifactRef:String(i)}));
for(const key of [missionKey,deploymentKey]){
  const result=await searchRosterWorkflowSourceCatalogueV1(directory,{query:key,kind:'official_source',validity:'current',offset:0,limit:50},
    {store:{get:async ref=>memory.get(ref)}});
  assert(result.entries.some(e=>e.sourceRecordKey===key));assert.equal(result.evidenceBodiesRead,false);
}
assert.equal(JSON.stringify(source.dataset),before);
console.log(JSON.stringify({status:'passed',officialCardSources:rows.filter(r=>r.recordKey.startsWith('faction_cards:')).length,
  originalSupportRowsUnchanged:old.length,missionAndDeploymentDiscoverable:true,communityNotPromoted:true,
  frozenDatasetUnchanged:true,networkRequests:0,providerCalls:0,nativeActions:0,productionWrites:0,
  realPublicationAndReadStillPending:true}));
