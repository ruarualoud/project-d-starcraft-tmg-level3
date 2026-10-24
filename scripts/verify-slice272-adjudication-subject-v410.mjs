import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createRosterTeachSynthesisArchiveV1, createRosterTeachSynthesisReaderStateV1,
  projectRosterTeachSynthesisReaderV1 } from '../packages/roster-strategist/roster-teach-synthesis-reader-v1.mjs';
const draft = JSON.parse(await fs.readFile(process.argv[2], 'utf8'));
const review = draft.teachFramework.state.sourceReviewQualificationHandoff.sourceReview;
const original = JSON.stringify(review);
const archive = createRosterTeachSynthesisArchiveV1([
  {kind:'current_plan_and_context', plan:JSON.parse(draft.planSerialized), context:{sourceReview:review}},
]);
const reader = createRosterTeachSynthesisReaderStateV1(archive);
const view = projectRosterTeachSynthesisReaderV1(archive,reader)[0].sourceReviewAdjudication;
assert.equal(view.verdictTarget,'plan_claim','Actual199 repeats the rejected allegation: source_supported must explicitly identify the Plan claim as its subject');
assert.equal(view.findings[0].reviewerAllegationDisposition,'refuted_by_source_qualification');
assert.match(view.findings[0].assessedPlanClaim.quote,/medic-1.*round 2/);
assert.equal(view.findings[0].claimAssessment,'source_supported');
assert.equal(view.findings[0].reviewerAllegation.publicReason,undefined,'Rejected rationale must be accessible as original evidence, not presented beside the active verdict as equally authoritative prose');
assert.equal(view.findings[0].original.path,'/sourceReview/qualifiedFindings/0');
assert.equal(JSON.stringify(review),original,'Source adjudication, old error and qualification identity remain unchanged');
assert.equal(archive.documents.find(d=>d.id==='context').value.sourceReview.qualificationHash,review.qualificationHash);
console.log(JSON.stringify({passed:true,actualFailure:199,typedVerdictSubject:true,oldAuditPreserved:true,providerCalls:0}));
