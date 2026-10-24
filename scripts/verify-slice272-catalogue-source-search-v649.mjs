// Actual fixed-product catalogue query returned zero while the frozen source
// contains the requested Zone of Influence text. No Provider or Native calls.
import fs from 'node:fs/promises';import path from 'node:path';
import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
import * as catalogue from '../packages/roster-strategist/roster-workflow-catalogue-v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=path.join(root,'build/slice272-product-generation-v645-I7zekC/workspace/decision-workflows/decision-959c1d9c-d6e0-43b4-8196-faef5b42fc34');
const file=path.join(base,'workflow.json'),stateBytes=await fs.readFile(file),state=JSON.parse(stateBytes);
const artifact=ref=>path.join(base,'artifacts',ref+'.json');
const read=async ref=>JSON.parse(await fs.readFile(artifact(ref),'utf8'));
const directory=state.evidence.map((e,i)=>({number:i+1,...e}));
const actual=state.work.flatMap(w=>w.operationState?.catalogueSearches??[])
  .find(s=>s.query.query==='Zone of Influence'&&s.query.kind==='');
assert(actual,'real zero-match query must remain saved');
const oldBytes=await fs.readFile(artifact(actual.resultRef)),old=JSON.parse(oldBytes);
assert.equal(old.totalMatches,0);
const source=directory[42],sourceBytes=await fs.readFile(artifact(source.artifactRef)),record=JSON.parse(sourceBytes);
assert.match(JSON.stringify(record),/Zone of Influence/);
assert.match(JSON.stringify(record),/6\\\"/);
const search=catalogue.searchRosterWorkflowSourceCatalogueV1??catalogue.searchRosterWorkflowCatalogueV1;
let reads=0;const store={get:async ref=>{reads++;return read(ref);}},indexCache=new Map();
const found=await search(directory,actual.query,{store,indexCache});
assert(found.totalMatches>0,'zero metadata hits must not hide existing frozen rule text');
const hit=found.entries.find(e=>e.number===43);assert(hit,'actual rules source keeps its original evidence number');
assert.equal(found.evidenceBodiesRead,false,'search is navigation, not model body delivery');
assert(hit.sourceMatches.some(m=>m.pointer.startsWith('/rule/')));
const count=reads;
const repeat=await search(directory,actual.query,{store,indexCache});
assert.deepEqual(repeat,found);assert.equal(reads,count,'immutable source index is reused without new artifact reads');
const mission=await search(directory,{...actual.query,query:'mission_hold_position'},{store,indexCache});
assert(mission.entries.some(e=>e.number===87),'mission source embedded in an existing Rules receipt is discoverable too');
const typed=await search(directory,{...actual.query,kind:source.kind},{store,indexCache});
assert(typed.entries.some(e=>e.number===43),'the actual official_source kind must remain searchable');
const invalidKind=await search(directory,{...actual.query,kind:'__unregistered_fixture_kind__'},{store,indexCache});
assert.equal(invalidKind.queryDiagnostics.unknownKind,'__unregistered_fixture_kind__');
assert(invalidKind.queryDiagnostics.availableKinds.includes(source.kind));
assert((await fs.readFile(file)).equals(stateBytes));
assert((await fs.readFile(artifact(actual.resultRef))).equals(oldBytes));
assert((await fs.readFile(artifact(source.artifactRef))).equals(sourceBytes));
console.log(JSON.stringify({status:'passed',actualOldMatchCount:0,newMatches:found.totalMatches,
  zoneSourceNumber:43,missionSourceNumber:87,stableNumbers:true,queryLocalIndexReused:true,
  unknownKindExplained:true,oldQueriesAndSourcesUnchanged:true,providerCalls:0,nativeCalls:0,productionWrites:0,
  searchIsNotFactApproval:true,modelAdoptionProven:false}));
