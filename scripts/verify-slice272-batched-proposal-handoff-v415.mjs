import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import * as reader from '../packages/roster-strategist/roster-teach-synthesis-reader-v1.mjs';
import {rosterTeachFrameworkContractV1,inspectRosterTeachPublicOutputV1} from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
const draft=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
const state=structuredClone(draft.teachFramework.state.synthesisReader);
const paid=JSON.parse(gunzipSync(await fs.readFile(process.argv[3])).toString()).output;
assert.equal(state.answers.length,21);
assert(state.answers.filter(a=>a.disposition==='revise').length>5);
assert.equal(paid.proposedPlanChanges.length,1,'Actual205 supplied only its current batch proposal');
assert.equal(state.proposedPlanChanges.length,1,'Actual saved ledger lost the complete proposal list');
assert.equal(typeof reader.prepareRosterTeachProposalConsolidationV1,'function',
 'Actual205 overwrites global proposals after partial answers; require model-owned complete-ledger handoff, not host-authored fixes or last-batch-only handoff');
const request=reader.prepareRosterTeachProposalConsolidationV1(state);
assert.equal(request.answers.length,21);
assert(request.priorPremiseProposals,'Original pre-reframing proposals remain visible but non-authoritative');
const unchanged=JSON.stringify(state.answers);
const output={publicReason:'Test-only complete-ledger reduction, not a model strategy result.',
 proposedPlanChanges:request.answers.filter(a=>a.disposition==='revise').map(a=>a.publicReason),
 proposedRosterChanges:[],frameworkFeedback:[],
 unresolvedQuestionIds:request.answers.filter(a=>a.disposition==='unresolved').map(a=>a.questionId),
 questionActions:request.answers.map(a=>({questionId:a.questionId,
   planChangeIndices:a.disposition==='revise'?[request.answers.filter(x=>x.disposition==='revise').findIndex(x=>x.questionId===a.questionId)]:[],
   rosterChangeIndices:[],publicReason:a.publicReason}))};
const inspect=inspectRosterTeachPublicOutputV1(rosterTeachFrameworkContractV1('teach_framework_proposal_consolidation'),
 {schemaVersion:'starcraft_tmg_teach_framework_generation_v1',roundKind:'teach_framework_proposal_consolidation',...output});
assert(inspect.validation.ok,JSON.stringify(inspect.validation));
assert.throws(()=>reader.applyRosterTeachProposalConsolidationV1(state,request,{...output,questionActions:output.questionActions.slice(1)}),/COVERAGE/);
// v416 owns this mechanical set in the Host; its actual209 regression covers
// ignored model echoes, preserved originals and unchanged substantive answers.
const mapped=structuredClone(output);mapped.questionActions.find(a=>a.planChangeIndices.length).planChangeIndices=[999];
assert.throws(()=>reader.applyRosterTeachProposalConsolidationV1(state,request,mapped),/PROPOSAL_INDEX/);
reader.applyRosterTeachProposalConsolidationV1(state,request,output);
assert.equal(JSON.stringify(state.answers),unchanged,'No answer, source, citation or unknown rewritten');
assert.equal(state.proposedPlanChanges.length,output.proposedPlanChanges.length);
assert.equal(reader.prepareRosterTeachProposalConsolidationV1(state),null,'Completed unchanged handoff must not be purchased again');
state.answers[0].publicReason+=' A new substantive correction.';
assert(reader.prepareRosterTeachProposalConsolidationV1(state),'Changed conclusions need a new complete handoff');
console.log(JSON.stringify({passed:true,actualReply:205,answers:21,originalAnswersPreserved:true,unresolvedPreserved:true,providerCalls:0}));
