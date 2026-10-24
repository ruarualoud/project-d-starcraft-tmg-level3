// Reproduces actual request25: card identity existed only in the hidden ID,
// while the public directory exposed "Support source N". No Provider/replay.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {projectRosterCatalogueEntryV1,searchRosterWorkflowCatalogueV1} from '../packages/roster-strategist/roster-workflow-catalogue-v1.mjs';
const dir=path.resolve(process.argv[2]);
const state=JSON.parse(await fs.readFile(path.join(dir,'workspace/decision-workflows/projection-owner/workflow.json'),'utf8'));
const directory=state.evidence.map((e,index)=>({number:index+1,...e,validity:'current',access:'available_unread'}));
const before=JSON.stringify(directory),keys=['tactical_cards:academy','tactical_cards:barracks__tech_lab_','tactical_cards:supply_depot'];
const selections=[];
for(const key of keys){
  const entry=directory.find(e=>e.id.startsWith(`support-source:${key}:`));
  assert.ok(entry,'saved source exists');
  const projected=projectRosterCatalogueEntryV1(entry);
  assert.equal(projected.sourceRecordKey,key,'card identity must be visible without reading unrelated bodies');
  assert.ok(projected.title.includes(key),'legacy generic labels must be navigable');
  const page=searchRosterWorkflowCatalogueV1(directory,{query:key,kind:'official_source',validity:'current',offset:0,limit:10});
  assert.equal(page.totalMatches,1);assert.equal(page.evidenceBodiesRead,false);
  assert.equal(page.entries[0].number,entry.number);
  const original=JSON.parse(await fs.readFile(path.join(dir,'workspace/decision-workflows/projection-owner/artifacts',entry.artifactRef+'.json'),'utf8'));
  assert.equal(original.recordKey,projected.sourceRecordKey);
  selections.push({number:entry.number,sourceRecordKey:projected.sourceRecordKey});
}
assert.equal(JSON.stringify(directory),before,'immutable sources and numbers unchanged');
assert.deepEqual(projectRosterCatalogueEntryV1({number:1,title:'Plan',kind:'proposal',access:'available_unread',validity:'current',outline:[]}),
  {number:1,title:'Plan',kind:'proposal',access:'available_unread',validity:'current',outline:[]});
console.log(JSON.stringify({passed:true,selections,providerCalls:0,sourceMutation:0}));
