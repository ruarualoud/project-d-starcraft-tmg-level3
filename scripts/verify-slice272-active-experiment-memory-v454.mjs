// Actual278 chose mission-start as the next step, but279 lost that working
// intention and repeated the initial repaired-move handoff instead.
import fs from 'node:fs/promises';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import {isolateRosterTeachFactProbeNodesV1 as project} from '../packages/roster-strategist/roster-teach-fact-probe-v1.mjs';
import {projectRosterProviderInstructionsV1 as instructions} from '../packages/roster-planning-workspace/roster-planning-secure-deliberation-factory-v1.mjs';
const read=async name=>JSON.parse(zlib.gunzipSync(await fs.readFile(`${process.argv[2]}/${name}`)));
const actual=await read('call-279.product-request.json.gz');
const prior=(await read('call-278.reply.json.gz')).output;
const find=k=>actual.promptNodes.find(n=>n.kind===k);
const evidence=find('fact_probe_tool_executions').currentBatchEvidence;
const questions=find('fact_probe_questions').questions;
const batch={publicReason:prior.publicReason,queries:prior.queries,
  questionProgress:prior.questionProgress,unresolved:prior.unresolved};
const nodes=[{kind:'frozen_plan_and_method',plan:{},framework:{},context:find('fact_probe_source_material').context},
  {kind:'current_investigation_assignment',pendingQuestionIds:questions.map(q=>q.questionId)},
  find('canonical_current_query_context'),find('current_query_capability_guide'),
  {kind:'questions_and_results',agenda:{questions},evidence:[],investigation:{
    evidence,operations:[],completedRoundCount:5,latestCompletedQueryIds:evidence.map(e=>e.challengeId),
    latestCompletedBatch:batch}}];
const before=JSON.stringify(nodes),result=project(nodes,new Map());
const memory=result.find(n=>n.kind==='active_experiment_handoff');
assert(memory,'The actual previous experimental intention is not delivered to the next fact turn');
assert.equal(memory.previousPublicReason,prior.publicReason);
assert.equal(memory.selectedQueries[0].purpose,prior.queries[0].purpose);
assert.equal(memory.selectedQueries[0].queryId,'probe-arrival-init-native-action');
assert.equal(memory.returnedResults[0].queryId,'probe-arrival-init-native-action');
assert.equal(memory.returnedResults[0].receiptHash,evidence[0].receiptHash);
assert.equal(memory.workingIntentIsNotObservedFact,true);
assert.equal(memory.mustReconcileBeforeHandoff,true);
assert.deepEqual(result.find(n=>n.kind==='fact_probe_tool_executions').currentBatchEvidence,evidence);
assert.equal(JSON.stringify(nodes),before);
assert(instructions({request:{...actual,promptNodes:result}}).includes('active_experiment_handoff as working memory'));
assert(!instructions({request:actual,version:'role_scoped_v2'}).includes('active_experiment_handoff as working memory'));
console.log(JSON.stringify({ok:true,actualPriorIntent:278,actualConsumer:279,latestIntentAndResultLinked:true,noInventedPlanOrFact:true,originalsUnchanged:true,providerCalls:0}));
