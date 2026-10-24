// Concrete bug: prepareContext creates an unscoped order and therefore cannot
// start a fresh product Run after the v637 compile-time scope requirement.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {createRosterDecisionWorkspaceRunV1} from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
const directory=await fs.mkdtemp(path.resolve('build/slice272-discovery-scope-v638-'));
const scope={army:'public-reference-armies',plan:'unplanned',rules:'frozen-rules',map:'frozen-map',source:'frozen-source'};
let queries=0;
const laboratory={labDescriptor:()=>({sourceStateHash:scope.source}),
  describeQueryContext:async()=>{queries++;return {resultStatus:'ok',sourceStateHash:scope.source};},
  missionScoringAuthority:async()=>{queries++;return {resultStatus:'ok',fixtureAuthority:true};}};
const run=await createRosterDecisionWorkspaceRunV1({directory,laboratory,scope,sessionId:'isolated-fresh-discovery',
  deliberation:{deliberate:async()=>{throw Error('PROVIDER_NOT_AUTHORIZED_IN_DISCOVERY_GATE');}}});
await run.prepareContext();
const before=await run.inspect();
assert.equal(before.work.length,2);
assert(before.work.every(w=>w.inputs.request.value.experimentScope.kind==='rules_resource_check'));
assert(before.work.every(w=>w.inputs.request.value.experimentScope.hypothesisTest===null));
assert(before.work.every(w=>w.inputs.request.value.experimentScope.collectScenarioExperience===false));
await run.advance({concurrency:2});
const after=await run.inspect();
assert.equal(queries,2);
assert(after.work.every(w=>w.status==='evidence_ready'));
for(const work of after.work){
  const result=await run.readArtifact(work.resultRef);
  assert.equal(result.value.experimentOrigin.evidenceClass,'factual_probe');
  assert.equal(result.value.experimentOrigin.mayWriteLiveRoomMemory,false);
}
console.log(JSON.stringify({passed:true,actualProductEntry:'prepareContext → compile → advance',
  isolatedDirectory:directory,scopedReadOnlyTools:queries,providerCalls:0,nativeActionCalls:0,
  productionRunWrites:0,fixtureLaboratory:true,strategyImprovementProven:false}));
