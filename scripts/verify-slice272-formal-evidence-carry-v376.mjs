import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {collectIterativeRosterEvidenceV1, projectIterativeRosterEvidenceV1,
  mergeIterativeSelectionQueryReceiptsV1} from '../packages/roster-strategist/iterative-roster-tool-port-v1.mjs';
const state=JSON.parse(await fs.readFile(process.argv[2],'utf8')).value;
const native=state.teachFeedback.evidence.toolReceipts.find(r=>r.queryId==='teach-teach2-kerrigan-goliath-distance');
assert.ok(native,'Actual paid Teach contains the original distance receipt');
const before=JSON.stringify(state);
const evidence=collectIterativeRosterEvidenceV1(state);
const carried=evidence.queries.find(r=>r.receipt.receiptHash===native.receiptHash);
assert.ok(carried,'Actual distance evidence must survive the next formal Plan handoff');
assert.deepEqual(carried?.receipt,native,'Formal Teach -> revised selector -> formal Plan must retain the exact Native receipt');
assert.ok(evidence.scenarios.some(r=>r.receipt.sourceReceipt.branchStateHash===native.baseStateHash));
assert.ok(projectIterativeRosterEvidenceV1(evidence).queries.some(r=>r.receipt.receiptHash===native.receiptHash));
assert.ok(mergeIterativeSelectionQueryReceiptsV1([],evidence).some(r=>r.receiptHash===native.receiptHash));
const unknown=state.teachFeedback.evidence.toolReceipts.find(r=>r.resultStatus==='unknown');
assert.deepEqual(evidence.queries.find(r=>r.receipt.receiptHash===unknown.receiptHash)?.receipt,unknown,'Unanswered original evidence is retained, not relabelled success');
for(const field of ['candidateHash','iterativeSessionId']) {
  const other=structuredClone(state);
  for(const f of [...other.teachFeedbackHistory,other.teachFeedback]) {
    if(field==='candidateHash') f.candidateHash='different-army';
    else f.sourceStrategy.iterativeSessionId='different-session';
  }
  assert.ok(!collectIterativeRosterEvidenceV1(other).queries.some(r=>r.receipt.receiptHash===native.receiptHash),field);
}
assert.equal(JSON.stringify(state),before,'Collection must not rewrite the saved source');
console.log(JSON.stringify({status:'passed',nativeReceipt:native.receiptHash,queries:evidence.queries.length,scenes:evidence.scenarios.length,providerCalls:0}));
