// Reproduce call016 repeatedly injecting old branch menus alongside new facts.
import fs from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import * as probe from '../packages/roster-strategist/roster-teach-fact-probe-v1.mjs';
const [requestFile, previousReplyFile, outputFile]=process.argv.slice(2);
const report={providerCalls:0,checks:[]};
try {
 const input=JSON.parse(gunzipSync(await fs.readFile(requestFile)));
 const previous=JSON.parse(gunzipSync(await fs.readFile(previousReplyFile))).output;
 const executions=input.promptNodes.find(x=>x.kind==='fact_probe_tool_executions');
 assert.equal(typeof probe.organizeRosterTeachFactEvidenceV1,'function','Investigation reinjects cumulative branch menus without a current-batch/historical boundary');
 const archive=new Map();
 const result=probe.organizeRosterTeachFactEvidenceV1({receipts:executions.evidence,
  requests:executions.requests,latestQueryIds:previous.queries.map(x=>x.queryId),archive});
 const recent=new Set(previous.queries.map(x=>x.queryId));
 assert.deepEqual(result.currentBatchEvidence,executions.evidence.filter(x=>recent.has(x.challengeId)));
 const history=result.historyByQuestion.flatMap(x=>x.executions);
 assert.equal(history.length,executions.evidence.filter(x=>!recent.has(x.challengeId)).length);
 for(const entry of history){
  const original=executions.evidence.find(x=>(x.challengeId ?? x.queryId)===entry.queryId && x.receiptHash===entry.sourceReceiptHash);
  assert.deepEqual(archive.get(entry.fullEvidence.evidenceObjectHash),original);
  assert(!JSON.stringify(entry.observedResult).includes('"branchQueryContext":{'));
  assert.equal(entry.status,original.status);
 }
 report.checks.push('latest_batch_untouched_all_old_receipts_exactly_retrievable_and_failures_not_erased');
 const originalSize=JSON.stringify(executions).length, projectedSize=JSON.stringify(result).length;
 assert(projectedSize<originalSize,'Working set must remove repeated operational contexts, not duplicate them');
 report.sizes={originalSize,projectedSize};
 assert(history.some(x=>x.queryId==='q-post-loss-casualty-resolve-selection'));
 assert(history.some(x=>x.status==='unknown'));
 report.checks.push('completed_casualty_and_prior_unknowns_remain_indexed_by_question_without_old_action_menus');
 report.ok=true;
}catch(error){report.ok=false;report.failure=error.message;report.stack=error.stack;process.exitCode=1;}
await fs.writeFile(outputFile,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
