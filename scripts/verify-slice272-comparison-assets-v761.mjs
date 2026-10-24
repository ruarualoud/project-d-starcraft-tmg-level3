// Actual failed queries were omitted from the comparison directory; repeated
// full candidate rows also inflated the actual 693059-character request.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import * as assets from '../packages/roster-strategist/roster-workflow-experiment-assets-v1.mjs';
import {publishRosterWorkflowUnresolvedSourcesV1} from '../packages/roster-strategist/roster-workflow-tool-return-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const root=path.resolve(process.argv[2]),state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const memory=new Map(),read=async ref=>memory.get(ref)??JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
await publishRosterWorkflowUnresolvedSourcesV1({state,readArtifact:read,publish:async p=>{
  const artifactRef=hash(p.value);memory.set(artifactRef,structuredClone(p.value));
  state.evidence.push({id:p.id,title:p.title,kind:p.kind,bindings:p.bindings,conditions:p.conditions,artifactRef});
}});
const before=JSON.stringify(state);
const work=state.work.find(w=>w.resultRef==='a2aaff4504650298f9d875081028e4dc227a7e662347eda80f98d70338a46a5e');
assert(work);
const projected=await assets.projectRosterWorkflowExperimentAssetsV1({state,workId:work.id,readArtifact:read});
const coverage=projected.catalogue.comparisonCoverage;
assert(coverage);
const candidates=coverage.candidateDirectory??coverage.measurements.flatMap(m=>m.candidates);
const failed=candidates.filter(c=>c.sourceStatus==='returned_to_model');
assert(failed.some(c=>state.evidence[c.sourceEvidenceNumber-1]?.id.includes('raptor-vs-goliath-attack')),
  'comparison owner must see the actual failed query, not only successful predecessors');
for(const c of failed){
  assert.equal(c.endpointReached,null);
  assert.equal(c.sourceApproved,false);
  assert.equal(c.nativeResultReadByModel,false);
}
const request=await read('57eb4242983def520b6ef926176a8bef9b61b6d61db7dd4e7a4370d53d1cfc77');
const original=request.promptNodes.find(n=>n.kind==='workflow_role_assignment')
  .inputs.activeHypothesisTests.value.assetCatalogue.comparisonCoverage;
assert.equal(original.measurements.reduce((n,m)=>n+m.candidates.length,0),89);
const normalized=assets.normalizeRosterComparisonCoverageV1(original);
assert.equal(normalized.schema,'roster_comparison_candidate_directory_v2');
assert.equal(normalized.candidateDirectory.length,44);
for(const [index,m] of normalized.measurements.entries()){
  assert.deepEqual(m.candidateNumbers.map(number=>normalized.candidateDirectory[number-1]),
    original.measurements[index].candidates,'ordered candidates and every field must survive normalization');
  assert.equal(m.description,original.measurements[index].description);
  assert.equal(m.number,original.measurements[index].number);
}
for(const key of ['comparisonId','unboundToolResultCount','endpointReached','strategyImprovementProven'])
  assert.deepEqual(normalized[key],original[key]);
assert(normalized.instruction.startsWith(original.instruction));
assert(JSON.stringify(normalized).length<JSON.stringify(original).length*.6);
assert.deepEqual(assets.normalizeRosterComparisonCoverageV1(normalized),normalized,'normalization is idempotent');
assert.equal(JSON.stringify(state),before);
console.log(JSON.stringify({passed:true,failedCandidatesIncluded:failed.length,
  repeatedRows:89,uniqueCandidates:44,
  originalCharacters:JSON.stringify(original).length,normalizedCharacters:JSON.stringify(normalized).length,
  allCandidateFieldsAndOrderingPreserved:true,sourceReadOrApprovalNotGranted:true,
  providerCalls:0,nativeCalls:0,productionWrites:0}));
