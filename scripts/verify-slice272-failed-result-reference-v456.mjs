// Actual285 lost the failed queryId while its current result pointer crossed
// the shared prompt evidence projector. Exercise that real producer/consumer seam.
import fs from 'node:fs/promises';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import {isolateRosterTeachFactProbeNodesV1 as isolate} from '../packages/roster-strategist/roster-teach-fact-probe-v1.mjs';
import {projectRosterTeachPromptEvidenceV1 as project} from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
const read=async n=>JSON.parse(zlib.gunzipSync(await fs.readFile(`${process.argv[2]}/${n}`)));
const actual=await read('call-285.product-request.json.gz');
const previous=(await read('call-284.reply.json.gz')).output;
const find=k=>actual.promptNodes.find(n=>n.kind===k);
const evidence=find('fact_probe_tool_executions').currentBatchEvidence;
const questions=find('fact_probe_questions').questions;
assert.equal(evidence[0].status,'unknown');
const nodes=[{kind:'frozen_plan_and_method',plan:{},framework:{},context:find('fact_probe_source_material').context},
  {kind:'current_investigation_assignment',pendingQuestionIds:questions.map(q=>q.questionId)},
  find('canonical_current_query_context'),find('current_query_capability_guide'),
  {kind:'questions_and_results',agenda:{questions},evidence:[],investigation:{evidence,operations:[],
    completedRoundCount:9,latestCompletedQueryIds:evidence.map(e=>e.challengeId),latestCompletedBatch:previous}}];
const memory=isolate(nodes,new Map()).find(n=>n.kind==='active_experiment_handoff');
const original=JSON.stringify(memory),archive=new Map([[evidence[0].receiptHash,evidence[0]]]);
const outgoing=project(memory,archive);
assert.equal(outgoing.returnedResults[0].queryId,previous.queries[0].queryId,
  'failed result pointer lost its query identity at actual prompt egress');
assert.equal(outgoing.returnedResults[0].resultLocation,'fact_probe_tool_executions.currentBatchEvidence');
assert.deepEqual(archive.get(evidence[0].receiptHash),evidence[0],
  'a pointer must not overwrite the actual full receipt under its identity');
assert.equal(outgoing.returnedResults[0].status,'unknown');
assert.equal(JSON.stringify(memory),original);
console.log(JSON.stringify({ok:true,actualConsumer:285,queryIdentityPreserved:true,
  fullReceiptNotOverwritten:true,unknownPreserved:true,providerCalls:0,nativeCalls:0}));
