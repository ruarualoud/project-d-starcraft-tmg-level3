// Actual v998 confirmation had a v2 original-question contract but its command
// ledger contained only the child's replacement. Exercise the real compiler
// and decoder on that saved request, preserving its original paid wire state.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {prepareRosterAuthorCommandV1,projectRosterAuthorCommandV1} from '../packages/roster-strategist/roster-workflow-author-command-v1.mjs';
import {rosterAuthorOriginalQuestionContractV1,rosterAuthorOriginalQuestionCoverageErrorV1} from '../packages/roster-strategist/roster-author-question-contract-v1.mjs';
const dir=process.argv[2],copy=structuredClone,read=async ref=>JSON.parse(await fs.readFile(dir+'/artifacts/'+ref+'.json','utf8'));
const request=await read('05beb9ef5720605d2f79476189b0129097ace25c7bd7a89af651c08d90eacb47');
const actual=await read('f673d26fd6483e504dd665d1fdd5219056e71d605d17f63afdf2ff7637c93269');
const assignment=await read('c48bd834f0c2ae41a4300ac054d6630f57ffbca42825aa78f063a2d25c034b13');
const before=copy(request),contract=rosterAuthorOriginalQuestionContractV1(assignment);
const plain={...copy(request),responseFormat:copy(request.strategyRepairState.originalResponseFormat),
  promptNodes:request.promptNodes.filter(n=>n.kind!=='strategy_semantic_repair').map(n=>
    n.kind==='evidence_delivery_handoff'?{...copy(n),pendingProposal:copy(request.strategyRepairState.originalOutput)}:
    n.kind==='author_original_question_contract'?copy(contract):copy(n))};
const prepared=prepareRosterAuthorCommandV1(plain),node=prepared.promptNodes.find(n=>n.kind==='strategy_semantic_repair');
const index=node.questions.findIndex(q=>q.question===contract.questions[0]);
console.log(JSON.stringify({actualSavedRequest:true,canonicalQuestionInCommand:index>=0,
  providerCalls:0,nativeCalls:0,productionWrites:0}));
assert(index>=0,'Actual command compiler dropped the assigned factual question from its editable ledger');
const oldQuestions=request.strategyRepairState.originalOutput.decisions[0].dataQuestions;
assert.deepEqual(node.questions.slice(0,oldQuestions.length).map(({questionNumber,...q})=>q),oldQuestions);
assert.deepEqual(prepared.strategyRepairState.originalOutput,request.strategyRepairState.originalOutput);
assert.equal(node.stage,'scope_reconciliation');
assert(prepared.userMessage.includes(contract.questions[0]));
assert(!prepared.userMessage.includes('NORMAL SOURCE CONFIRMATION'));
const incoming=copy(actual.output),selected=node.questions[index];
incoming.questionUpdates=[{questionNumber:selected.questionNumber,classification:'necessary_fact',
  publicReason:'Controlled injection: original predicate remains unresolved; this is not a measured answer.',evidenceNumbers:[]}];
const mapped=projectRosterAuthorCommandV1({request:prepared,output:incoming});
assert.deepEqual(mapped.errors,[]);
assert.deepEqual(mapped.output.decisions[0].dataQuestions.slice(0,oldQuestions.length),oldQuestions);
assert.equal(mapped.output.decisions[0].dataQuestions[index].question,contract.questions[0]);
assert.equal(rosterAuthorOriginalQuestionCoverageErrorV1({contract,decision:mapped.output.decisions[0]}),null);
assert(mapped.projection.some(p=>p.rule==='retained_original_assignment_question_v1'));
// Existing paid commands decode ONLY with their original ledger, not today's.
const legacy=projectRosterAuthorCommandV1({request,output:actual.output});
assert.deepEqual(legacy.errors,[]);assert.equal(legacy.output.decisions[0].dataQuestions.length,oldQuestions.length);
assert.deepEqual(request,before);
console.log(JSON.stringify({passed:true,oldQuestionIndicesPreserved:true,newOriginalPredicateExplicitlyEditable:true,
  legacyPaidReplyUnchanged:true,retainedFactNotAnswered:true,providerCalls:0,nativeCalls:0,productionWrites:0}));
