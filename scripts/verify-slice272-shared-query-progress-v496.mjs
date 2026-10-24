import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {deriveRosterTeachQuestionProgressV1, validateRosterTeachQuestionProgressV1,
  projectRosterTeachQuestionProgressV1,rosterTeachReferencedQueryIdsV1} from '../packages/roster-strategist/roster-teach-question-progress-v1.mjs';
import {validateRosterTeachInvestigationProgressV1} from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
const request=JSON.parse(gunzipSync(await fs.readFile(process.argv[2])));
const reply=JSON.parse(gunzipSync(await fs.readFile(process.argv[3])));
const questionIds=request.promptNodes.find(n=>n.kind==='fact_probe_assignment').pendingQuestionIds;
const original=structuredClone(reply.output);
const state={investigation:{operations:[],evidence:[],rounds:[]}};
const derived=deriveRosterTeachQuestionProgressV1(original);
assert.doesNotThrow(()=>validateRosterTeachInvestigationProgressV1(derived.output,state,questionIds),
  'Actual369 explicitly links two questions to one real initialization query; it must not demand a duplicate query');
assert.equal(derived.output.queries.length,3);
assert.deepEqual(derived.output.queries,original.queries);
assert.deepEqual(reply.output,original);
const shared='q-victory-route-arrival-timing';
assert.equal(derived.output.questionProgress.find(q=>q.questionId===shared).disposition,'needs_tool_result');
const projected=projectRosterTeachQuestionProgressV1(questionIds,[{completed:true,output:derived.output}]);
assert.ok(projected.pendingQuestionIds.includes(shared));
assert.ok(projected.pendingQuestionIds.includes('generation-b170a1f618268d5b092cba616efa5751'));
assert.equal(projected.planAccepted,false);
assert.deepEqual([...rosterTeachReferencedQueryIdsV1([shared],[{completed:true,output:derived.output}])],
  ['probe-arrival-first-round-init'],'retain the shared query when only its secondary question remains pending');
const absent=structuredClone(original);
absent.questionProgress.find(q=>q.questionId===shared).evidenceQueryIds=['nonexistent-query'];
assert.throws(()=>validateRosterTeachQuestionProgressV1(absent,questionIds),
  e=>e.code==='ROSTER_TEACH_DEPENDENT_QUERY_MISSING');
const ambiguous=structuredClone(original);
ambiguous.queries.push(structuredClone(ambiguous.queries[0]));
assert.throws(()=>validateRosterTeachQuestionProgressV1(ambiguous,questionIds),
  e=>e.code==='ROSTER_TEACH_DEPENDENT_QUERY_MISSING');
const premature=structuredClone(original);
premature.questionProgress.find(q=>q.questionId===shared).disposition='evidence_established';
const corrected=deriveRosterTeachQuestionProgressV1(premature);
assert.equal(corrected.output.questionProgress.find(q=>q.questionId===shared).disposition,'needs_tool_result');
assert.equal(corrected.corrections.find(q=>q.questionId===shared).factsOrStrategyResolved,false);
console.log(JSON.stringify({pass:true,actual369:true,queries:3,sharedQuestions:2,
  duplicateExecution:false,unknownNotAccepted:true,providerCalls:0}));
