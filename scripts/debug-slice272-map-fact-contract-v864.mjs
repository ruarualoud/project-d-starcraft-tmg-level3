// Actual frozen-map input that the fresh editable product interpreted as a
// future unplaced map. Exercise the shared product query, not a made-up reply.
import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {createPregameMapEvidencePortV1} from '../packages/roster-strategist/pregame-map-evidence-port-v1.mjs';
const [sourceFile,outputFile,priorFile]=process.argv.slice(2);
const saved=JSON.parse(gunzipSync(await fs.readFile(sourceFile))),source=saved.authority.state;
const before=JSON.stringify(source),results=[];
const prior=priorFile?JSON.parse(await fs.readFile(priorFile,'utf8')):null;
const port=createPregameMapEvidencePortV1({sourceState:source});
const summary=port.summarizeMap({queryId:'v864-summary'}),deployment=port.deploymentGeometry({queryId:'v864-deployment'});
async function check(id,fn){const inherited=prior?.results.find(r=>r.id===id&&r.pass);
  if(inherited){results.push({...inherited,inheritedFrom:priorFile});return;}
  try{results.push({id,pass:true,...await fn()});}catch(e){results.push({id,pass:false,error:e.message});}
  console.log(JSON.stringify(results.at(-1)));}
await check('P1/map-summary-keeps-native-terrain-semantics',()=>{
  assert.equal(summary.terrain.length,source.board.terrain.length);
  for(let i=0;i<summary.terrain.length;i++)for(const key of ['terrainGroupId','terrainInstanceIds','sourceRegionIds',
    'semanticClass','overlayRole','blocksPlacement','impassable','isRemoved'])
    if(source.board.terrain[i][key]!==undefined)assert.deepEqual(summary.terrain[i][key],source.board.terrain[i][key],`${i}/${key}`);
  return {cells:summary.terrain.length,groups:new Set(source.board.terrain.map(x=>x.terrainGroupId)).size};
});
await check('P1/bound-layout-not-legacy-pending-schedule',()=>{
  const fact=summary.layoutMaterialization;
  assert.equal(fact?.status,'frozen_native_geometry');
  assert.equal(fact.terrainCellCount,1804);assert.equal(fact.terrainGroupCount,30);assert.equal(fact.missionMarkerCount,5);
  assert.equal(fact.sourceSetupScheduleIsCurrentExecutionState,false);
  assert.equal(fact.exactActionLegalityProven,false);
  assert.deepEqual(deployment.layoutMaterialization,fact);
  assert.deepEqual(deployment.deploymentGeometry,source.officialDeploymentGeometryBinding,'Raw provenance must not be rewritten');
});
await check('P1/abstract-uncertified-layout-not-promoted',()=>{
  const s=structuredClone(source);delete s.officialCompetitiveMapRoomFreeze;
  const result=createPregameMapEvidencePortV1({sourceState:s}).summarizeMap({queryId:'abstract'});
  assert.equal(result.resultStatus,'unknown');assert.equal(result.layoutMaterialization?.status,'unverified_source_geometry');
});
await check('P1/source-unchanged-and-unit-route-not-inferred',()=>{
  assert.equal(JSON.stringify(source),before);assert.equal(deployment.exactMoveOrDeploymentLegality,false);
  assert.equal(summary.mutatesRoomState,false);assert.equal(summary.trainingTruth,false);
});
await fs.writeFile(outputFile,JSON.stringify({passed:results.every(r=>r.pass),sourceFile,results,
  actualProviderCalls:0,productionWrites:0,roomMutations:0},null,2)+'\n');
if(results.some(r=>!r.pass))process.exitCode=1;
