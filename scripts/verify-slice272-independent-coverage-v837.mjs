// Actual e8723 coverage false-positive: separate original question/measurements
// from the author's answer and the source judges' conclusions. No Provider call.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {prepareRosterSourceReviewRequestV1} from '../packages/roster-strategist/roster-source-review-presentation-v1.mjs';
import {rosterInquiryReviewStageMismatchV1} from '../packages/roster-strategist/roster-inquiry-review-stage-v1.mjs';
import {createRosterExperimentSourceReviewV1} from '../packages/roster-strategist/roster-workflow-experiment-owner-v1.mjs';
const root=process.argv[2],get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const review=state.work.find(w=>w.id==='product:after-teach:r4:subject-v1:investigation:frontier-return:403af790345b61b2:source-review:v2');
const request=await get(review.operationState.calls.at(-1).requestRef);
const before=JSON.stringify(request),original=request.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs;
const projected=prepareRosterSourceReviewRequestV1(request);
const contract=projected.promptNodes.find(n=>n.kind==='inquiry_independent_coverage_contract');
assert.ok(contract,'Coverage must independently align the authorized question with measurements, not inherit answer/pass prose');
const inputs=projected.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs;
assert.deepEqual(inputs.question,original.question);
assert.deepEqual(inputs.measurementConfigurations,original.measurementConfigurations);
assert.equal(inputs.proposedConclusion,undefined);
assert.equal(Object.keys(inputs).some(k=>/^claimCheck\d+$/.test(k)),false);
assert.ok(contract.deferredInterpretations.length>=10);
for(const row of contract.deferredInterpretations){
  assert.ok(Number.isInteger(row.read.evidenceNumber));
  assert.equal(state.evidence[row.read.evidenceNumber-1].id,row.evidenceId);
  assert.ok(await get(state.evidence[row.read.evidenceNumber-1].artifactRef));
}
assert.equal(JSON.stringify(request),before,'The actual paid request remains immutable');
const mismatch=await rosterInquiryReviewStageMismatchV1({review,readArtifact:get});
assert.equal(mismatch?.missingIndependentCoverage,true,'A positive old judgment must still detect this missing separation');
const repaired=structuredClone(request);repaired.promptNodes.push(contract);
assert.equal(await rosterInquiryReviewStageMismatchV1({review,readArtifact:async ref=>ref===review.operationState.calls.at(-1).requestRef?repaired:get(ref)}),null);
const claim=state.work.find(w=>w.id===review.id+':claim:1');
const atomicRequest=await get(claim.operationState.calls.at(-1).requestRef);
assert.equal(prepareRosterSourceReviewRequestV1(atomicRequest).promptNodes.some(n=>n.kind==='inquiry_independent_coverage_contract'),false,
  'A sentence reviewer must not inherit the whole experiment question');
const memory=new Map(),store={get,put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,value);return ref;}};
const owner=state.work.find(w=>w.id===review.experimentSourceReviewOf);
const next=await createRosterExperimentSourceReviewV1({state,owner,result:await get(owner.resultRef),store});
assert.ok(next?.sourceReviewRepairHandoff,'Actual old positive coverage must be re-audited before its unissued strategy consumer');
assert.equal(next.claimReviews?.length??0,0,'All nine valid source checks must be reused');
assert.equal(next.sourceReviewRepairHandoff.nativeReplay,false);
assert.equal(next.sourceReviewRepairHandoff.factsApproved,false);
console.log(JSON.stringify({pass:true,actualFailure:'e8723',exactQuestionAndMeasurementsPreserved:true,
  interpretationBodiesDeferredNotDeleted:true,atomicReviewsNotExpanded:true,positiveCoverageRechecked:true,
  nineSourceChecksReused:true,providerCalls:0,nativeCalls:0,productionWrites:0,
  modelJudgmentCorrectness:'not_proven_requires_real_coverage_review'}));
