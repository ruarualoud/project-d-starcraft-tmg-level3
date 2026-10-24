// The paid v996 owner was bound to a child's rewritten choice rather than the
// original selected factual predicate. Test its actual pre-prompt assignment.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {rosterAuthorOriginalQuestionContractV1,rosterAuthorOriginalQuestionCoverageErrorV1}
  from '../packages/roster-strategist/roster-author-question-contract-v1.mjs';
import {projectRosterIncomingAuthorContextV1} from '../packages/roster-strategist/roster-workflow-strategy-owner-context-v1.mjs';
const dir=process.argv[2],read=async ref=>JSON.parse(await fs.readFile(dir+'/artifacts/'+ref+'.json','utf8'));
const assignment=await read('c48bd834f0c2ae41a4300ac054d6630f57ffbca42825aa78f063a2d25c034b13');
const before=structuredClone(assignment),original=assignment.inputs.originalStrategicDecision.value.decisions[0];
const expected=original.nextInvestigation.questionNumbers.map(n=>original.dataQuestions[n-1].question);
const returned=assignment.inputs.investigationFrontier.value.unresolvedQuestions;
assert.notDeepEqual(expected,returned);
const contract=rosterAuthorOriginalQuestionContractV1(assignment);
console.log(JSON.stringify({actualSavedAssignment:true,originalQuestionRetained:JSON.stringify(contract.questions)===JSON.stringify(expected),providerCalls:0,productionWrites:0}));
assert.deepEqual(contract.questions,expected);
assert.deepEqual(contract.returnedQuestionProposals,returned);
assert.equal(contract.questionSource.originalReplyRef,assignment.inputs.originalStrategicDecision.value.originalReplyRef);
const projected=projectRosterIncomingAuthorContextV1(assignment);
assert.deepEqual(projected.node.questions,expected);assert.deepEqual(projected.node.returnedQuestionProposals,returned);
assert.deepEqual(projected.history.originalStrategicDecision,assignment.inputs.originalStrategicDecision);
const reply=await read('6f676f60abf0daf5a8c277eb96bc97f84020395ad184b6e041c9cef9c563d1ef');
const old=reply.output.decisions[0];
assert.equal(rosterAuthorOriginalQuestionCoverageErrorV1({contract,decision:old}).code,'author_original_question_coverage');
const renamed=structuredClone(old);renamed.dataQuestions[0].question=expected[0];
assert.equal(rosterAuthorOriginalQuestionCoverageErrorV1({contract,decision:renamed}).code,'factual_question_replaced_by_choice');
const unresolved=structuredClone(renamed);unresolved.dataQuestions[0].classification='necessary_fact';
assert.equal(rosterAuthorOriginalQuestionCoverageErrorV1({contract,decision:unresolved}),null);
// Coverage is not evidence approval; later ordinary source/Plan gates still apply.
const answered=structuredClone(renamed);answered.dataQuestions[0].classification='answered_fact';
assert.equal(rosterAuthorOriginalQuestionCoverageErrorV1({contract,decision:answered}),null);
assert.deepEqual(assignment,before);
const historical=structuredClone(assignment);historical.inputs.originalStrategicDecision.validity='historical';
assert.deepEqual(rosterAuthorOriginalQuestionContractV1(historical).questions,returned);
console.log(JSON.stringify({passed:true,sourceIdentityRetained:true,childProposalNotAuthority:true,
  factualChoiceSubstitutionRejected:true,noHostAnswer:true,providerCalls:0,nativeCalls:0,productionWrites:0}));
