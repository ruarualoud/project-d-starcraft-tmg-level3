// Call017 showed history index wrappers being reinterpreted as signed receipts.
import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {organizeRosterTeachFactEvidenceV1} from '../packages/roster-strategist/roster-teach-fact-probe-v1.mjs';
import {projectRosterTeachSynthesisPromptV1} from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
const [requestFile,outputFile]=process.argv.slice(2);
const report={providerCalls:0,checks:[]};
try{
 const request=JSON.parse(gunzipSync(await fs.readFile(requestFile)));
 const executions=request.promptNodes.find(x=>x.kind==='fact_probe_tool_executions');
 const archive=new Map();
 const organized=organizeRosterTeachFactEvidenceV1({receipts:executions.evidence,requests:executions.requests,latestQueryIds:[],archive});
 const projected=projectRosterTeachSynthesisPromptV1([{kind:'fact_probe_tool_executions',...organized}],archive)[0];
 const all=projected.historyByQuestion.flatMap(g=>g.executions);
 for(const original of executions.evidence){
  const id=original.challengeId ?? original.queryId;
  assert(all.some(e=>e.queryId===id),`History index lost query identity during receipt projection: ${id}`);
 }
 report.checks.push('actual_final_prompt_keeps_all_history_index_query_ids_including_unknown_receipts');
 for(const entry of organized.historyByQuestion.flatMap(g=>g.executions)){
  const value=archive.get(entry.fullEvidence.evidenceObjectHash);
  assert.equal(value.challengeId ?? value.queryId,entry.queryId);
  assert(!Object.hasOwn(entry,'receiptHash'),'Index metadata must not impersonate a Native receipt');
 }
 report.checks.push('history_index_never_overwrites_native_receipt_identity_in_archive');report.ok=true;
}catch(error){report.ok=false;report.failure=error.message;report.stack=error.stack;process.exitCode=1;}
await fs.writeFile(outputFile,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
