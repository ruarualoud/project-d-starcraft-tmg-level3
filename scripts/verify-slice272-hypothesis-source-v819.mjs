// e7303/e7312/e7321: input advertised scene 1211 as a hypothesis-bearing
// source although its immutable receipt has hypothesisTest=null.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {rosterHypothesisOriginV1} from '../packages/roster-strategist/roster-hypothesis-test-v1.mjs';
import {projectRosterWorkflowHypothesisContextV1} from '../packages/roster-strategist/roster-workflow-hypothesis-context-v1.mjs';
import {projectRosterWorkflowFeedbackRecoveryV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const root=process.argv[2],resultFile=process.cwd()+'/build/slice272-v819-gate-'+Date.now()+'.json';
const get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
process.on('uncaughtException',async error=>{
  const result={pass:false,message:error.message,stack:error.stack?.split('\n').slice(0,6)};
  await fs.writeFile(resultFile,JSON.stringify(result,null,2));console.error(JSON.stringify(result));process.exitCode=1;
});
console.log(JSON.stringify({stage:'started',resultFile}));
const request=await get('91d7870b627f7d5e7a0efc0d14e77f1750d795e3fb810a052d25f6b8f8a90cba');
const reply=await get('c084a2747a83092d03bb7fc0aaac984e32a73654736ffd24bd070fd953938a32');
const state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const work=state.work.find(w=>w.id.endsWith(':method:c8748d16f139bf05'));
const unchanged=hash({state,request,reply});
const args={state,workId:work.id,readArtifact:get};
const context=await projectRosterWorkflowHypothesisContextV1(args);
const design=context.sourceInputs.hypothesisDesignSource0;
const source=state.evidence[design.evidenceNumber-1];
const actual=rosterHypothesisOriginV1(await get(source.artifactRef));
assert.deepEqual(actual?.hypothesisTest,design.value,
  'advertised hypothesis source must contain the exact design; cannot attach a declaration to the first supporting scene');
assert.equal(design.evidenceNumber,1213);
assert.deepEqual(context.context.entries[0].sourceEvidenceNumbers,[1213]);
assert.ok(context.context.entries[0].relatedSourceEvidenceNumbers.includes(1211),'keep factual scene navigation, not a false design citation');
assert.deepEqual(design.value,request.promptNodes[0].inputs.hypothesisDesignSource0.value,'no changed hypothesis or model strategy');
const beforeContext=request.promptNodes[0].inputs.activeHypothesisTests.value;
assert.deepEqual(context.context.assetCatalogue.comparisonCoverage,beforeContext.assetCatalogue.comparisonCoverage,
  'source identity repair must not change measured comparison coverage');
assert.equal(context.context.acceptanceGranted,false);
assert.ok(context.context.sourceIdentityVersion>=1);
// All cited carriers absent/mismatched: keep declaration/purpose, but never
// manufacture an inline read or reinterpret another design as the current one.
const candidates=new Set(context.context.entries[0].relatedSourceEvidenceNumbers.map(n=>state.evidence[n-1].artifactRef));
for(const replacement of [null,{...design.value,claim:'a different declaration'}]){
  const absent=await projectRosterWorkflowHypothesisContextV1({...args,readArtifact:async ref=>{
    const value=await get(ref);if(candidates.has(ref))value.experimentOrigin.hypothesisTest=replacement;return value;
  }});
  assert.equal(absent.sourceInputs.hypothesisDesignSource0,undefined);
  assert.equal(absent.context.entries[0].assessmentSourceEvidenceNumber,null);
  assert.deepEqual(absent.context.entries[0].hypothesisTest,design.value);
  assert.equal(absent.context.originalTestStillNeedsAssessment,true);
}
const recovery=projectRosterWorkflowFeedbackRecoveryV1({work,reply,request});
assert.equal(recovery?.repairKind,'hypothesis_source_identity');
assert.equal(recovery.additionalInvalidResultLimit,1);
assert.equal(recovery.historyReset,false);
const newRequest=structuredClone(request);
newRequest.promptNodes[0].inputs.activeHypothesisTests.value=context.context;
assert.equal(projectRosterWorkflowFeedbackRecoveryV1({work,reply,request:newRequest}),null,'new contract cannot renew the same recovery');
const otherError=structuredClone(work);otherError.operationState.correction.errors=[{code:'unrelated_failure'}];
assert.equal(projectRosterWorkflowFeedbackRecoveryV1({work:otherError,reply,request}),null);
const pending=structuredClone(work);pending.operationState.pending={requestRef:'in-flight'};
assert.equal(projectRosterWorkflowFeedbackRecoveryV1({work:pending,reply,request}),null);
assert.equal(hash({state,request,reply}),unchanged,'no mutation of raw reply, counters, formal draft or saved state');
const result={pass:true,actualInputSource:1211,correctSource:1213,exactStoredDesign:true,
  factualNavigationAndComparisonCoveragePreserved:true,noCarrierRemainsUnresolved:true,
  boundedOldContractRecovery:true,rawReplyAndCountersKept:true,providerCalls:0,nativeCalls:0,productionWrites:0,
  strategyProven:false};
await fs.writeFile(resultFile,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
