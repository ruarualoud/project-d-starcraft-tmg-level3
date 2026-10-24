// Actual291 deployed9 Marines successfully. Unsent292 incorrectly marked the
// original rejected query current and hid the successful successor in history.
import fs from 'node:fs/promises';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import {projectRosterTeachRecoveredQueriesV1 as recovered} from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
import {isolateRosterTeachFactProbeNodesV1 as isolate} from '../packages/roster-strategist/roster-teach-fact-probe-v1.mjs';
const read=async n=>JSON.parse(zlib.gunzipSync(await fs.readFile(`${process.argv[2]}/${n}`)));
const actual=await read('call-292.product-request.json.gz'),prior=(await read('call-288.reply.json.gz')).output;
const doc=JSON.parse(await fs.readFile(process.argv[3],'utf8')),state=doc.teachFramework.state;
const find=k=>actual.promptNodes.find(n=>n.kind===k),handoff=find('dependent_query_window');
const operation=state.queryRecovery.operations.find(op=>handoff.recoveryReceiptHashes.includes(op.result?.receiptHash));
assert.equal(operation.result.sourceReceipt.resultStatus,'ok');
const reads=[],before=JSON.stringify(operation);
const results=recovered([operation],handoff,ref=>{reads.push(ref);return {
  sourceStateHash:operation.result.sourceReceipt.sourceStateHash,
  baseStateHash:operation.result.sourceReceipt.branchStateHash,
  phase:'movement',activeSideKey:'player1',actionSpace:{parameterDomains:[],finiteActions:[]}};});
const nodes=[{kind:'frozen_plan_and_method',plan:{},framework:{},context:find('fact_probe_source_material').context},
  {kind:'current_investigation_assignment',pendingQuestionIds:handoff.questionIds},handoff,
  find('canonical_current_query_context'),find('current_query_capability_guide'),
  {kind:'latest_completed_teach_findings',recoveredQueries:results},
  {kind:'questions_and_results',agenda:{questions:find('fact_probe_questions').questions},evidence:[],
    investigation:{evidence:find('fact_probe_tool_executions').currentBatchEvidence,operations:[],
      completedRoundCount:13,latestCompletedQueryIds:prior.queries.map(q=>q.queryId),latestCompletedBatch:prior}}];
const output=isolate(nodes,new Map()),current=output.find(n=>n.kind==='fact_probe_tool_executions').currentBatchEvidence;
assert.deepEqual(current.map(r=>r.challengeId),[operation.queryId],
  'new successful repair, not its old failed parent, must be the immediate result');
assert.equal(current[0].sourceReceipt.resultStatus,'ok');
assert.deepEqual(reads,[operation.queryId],'read only the new successful successor');
assert(current[0].branchQueryContext);
const memory=output.find(n=>n.kind==='active_experiment_handoff');
assert.equal(memory.selectedQueries[0].queryId,operation.queryId);
assert.equal(memory.selectedQueries[0].toolRequestJson,JSON.stringify(operation.request.toolRequest));
assert.equal(memory.previousPublicReason,operation.choice.publicReason);
assert(output.find(n=>n.kind==='fact_probe_tool_executions').historyByQuestion.some(g=>
  g.executions.some(e=>e.queryId===operation.originalQueryId&&e.status==='unknown')));
assert.equal(JSON.stringify(operation),before);
console.log(JSON.stringify({ok:true,actualNativeSuccess:291,actualUnsentConsumer:292,
  correctCurrentReceipt:true,exactSuccessorQueried:true,oldFailurePreserved:true,providerCalls:0,nativeCalls:0}));
