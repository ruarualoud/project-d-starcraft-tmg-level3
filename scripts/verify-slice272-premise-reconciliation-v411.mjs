import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as source from '../packages/roster-strategist/roster-teach-source-review-v1.mjs';
import {reconcileRosterTeachSynthesisReaderV1} from '../packages/roster-strategist/roster-teach-synthesis-reader-v1.mjs';
import {rosterTeachFrameworkContractV1,inspectRosterTeachPublicOutputV1} from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
const draft=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
const state=structuredClone(draft.teachFramework.state);
const review=state.sourceReviewQualificationHandoff.sourceReview;
assert(state.agenda.questions.find(q=>q.questionId==='q-post-loss-medic-arrival').falsification.includes('before arriving'));
assert.equal(typeof source.prepareRosterTeachPremiseAuditV1,'function','Actual200 still uses a disproved question after source qualification; the product needs a durable question-premise reconciliation before using those answers');
const audit=source.prepareRosterTeachPremiseAuditV1({state,sourceReview:review});
assert(audit);
assert.equal(audit.verdictTarget,'plan_claim');
assert.equal(audit.sourceQualifications[0].reviewerAllegationDisposition,'refuted');
const id='q-post-loss-medic-arrival', old=state.agenda.questions.find(q=>q.questionId===id);
const output={publicReason:'Test-only model operation for the observed mistaken predicate.',corrections:[{
  questionId:id,premiseQuote:old.falsification,qualificationFindingIndices:[46],
  publicReason:'Before arrival is not after arrival in the same round.',
  claim:'The Plan considers an on-table loss after arrival within the same round.',
  question:'Which conditional control consequences follow from such a loss?',
  alternatives:['Keep the supported conditional contingency.','Revise the response if new control evidence contradicts it.'],
  scenarioAssumptions:['Deployment precedes the hypothetical loss.'],
  falsification:'A cited rule forbids the conditional sequence, or a scoped control result contradicts the consequence.',
  evidencePlan:'Use the retained qualified claim and its exact source scope; no new execution is claimed.'}]};
const beforeEvidence=JSON.stringify(state.evidence), beforeReader=JSON.stringify(state.synthesisReader);
assert(inspectRosterTeachPublicOutputV1(rosterTeachFrameworkContractV1('teach_framework_premise_audit'),
  {schemaVersion:'starcraft_tmg_teach_framework_generation_v1',roundKind:'teach_framework_premise_audit',...output}).validation.ok);
source.applyRosterTeachPremiseAuditV1({state,audit,output});
assert.equal(state.questionPremiseAudit.status,'completed');
assert.equal(state.agenda.questions.find(q=>q.questionId===id).question,output.corrections[0].question);
assert.equal(JSON.stringify(state.evidence),beforeEvidence);
assert.equal(JSON.stringify(state.synthesisReader),beforeReader,'Reader invalidation is deferred to its archive reconciliation, not a manual answer rewrite');
assert(state.questionPremiseAudit.priorAgenda.questions.find(q=>q.questionId===id).falsification.includes('before arriving'));
assert.equal(source.prepareRosterTeachPremiseAuditV1({state,sourceReview:review}),null,'Durable completed audit is not bought again');
assert.throws(()=>source.applyRosterTeachPremiseAuditV1({state:structuredClone(draft.teachFramework.state),audit,
  output:{...output,corrections:[{...output.corrections[0],premiseQuote:'not in the question'}]}}),/PREMISE_QUOTE/);
// Reproduce the stale-answer resurrection path with the actual saved reader.
state.synthesisReader.answers.push({questionId:id,disposition:'revise',publicReason:old.claim});
const archive={version:state.synthesisReader.version,archiveHash:'test-reframed-question-view',questions:state.agenda.questions};
reconcileRosterTeachSynthesisReaderV1(archive,state,{readOnlyContinuation:true});
assert(!state.synthesisReader.answers.some(a=>a.questionId===id));
assert(state.synthesisReader.answers.some(a=>a.questionId==='q-opportunity-cost-builder-comparison'));
assert(state.synthesisReaderHistory.at(-1).answers.some(a=>a.questionId===id));
assert.equal(state.synthesisReader.proposedPlanChanges.length,0);
assert(state.synthesisReader.premiseReconciliation.previousProposals.proposedPlanChanges.length>0);
console.log(JSON.stringify({passed:true,actualFailure:200,correctionUsesProductOperation:true,originalsPreserved:true,idempotent:true,providerCalls:0}));
