import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {isolateRosterTeachFactProbeNodesV1} from '../packages/roster-strategist/roster-teach-fact-probe-v1.mjs';
const [sessionFile,requestFile,outputFile]=process.argv.slice(2);
const report={providerCalls:0,checks:[]};
try{
 const session=JSON.parse(await fs.readFile(sessionFile,'utf8')).value;
 const record=session.draftTeachSnapshots.at(-1),state=record.state;
 const request=JSON.parse(gunzipSync(await fs.readFile(requestFile)));
 const nodes=[{kind:'frozen_plan_and_method',context:record.context,plan:record.plan,framework:state.framework},
  {kind:'current_investigation_assignment',pendingQuestionIds:state.agenda.questions.map(q=>q.questionId)},
  request.promptNodes.find(n=>n.kind==='canonical_current_query_context'),
  request.promptNodes.find(n=>n.kind==='current_query_capability_guide'),
  {kind:'questions_and_results',agenda:state.agenda,evidence:state.evidence,
   investigation:{completedRoundCount:0,latestCompletedQueryIds:[],evidence:[],operations:[]}}];
 const view=isolateRosterTeachFactProbeNodesV1(nodes,new Map()).find(n=>n.kind==='fact_probe_tool_executions');
 assert.equal(view.currentBatchEvidence.length,state.evidence.length,'First agenda results were wrongly classified as old history');
 const failed=state.evidence.filter(r=>r.status==='unknown');
 assert(failed.length);
 for(const source of failed){const actual=view.currentBatchEvidence.find(r=>r.challengeId===source.challengeId);
  assert.deepEqual(actual,source,'Exact current failure and repair context must be retained');}
 report.checks.push('actual_first_batch_keeps_all_eight_results_and_full_current_failure_repair_context');
 const later=structuredClone(nodes);
 later.at(-1).investigation.completedRoundCount=1;
 later.at(-1).investigation.latestCompletedQueryIds=[state.evidence[0].challengeId];
 const next=isolateRosterTeachFactProbeNodesV1(later,new Map()).find(n=>n.kind==='fact_probe_tool_executions');
 assert.equal(next.currentBatchEvidence.length,1);
 assert.equal(next.historyByQuestion.flatMap(g=>g.executions).length,state.evidence.length-1);
 report.checks.push('later_rounds_keep_only_actual_latest_batch_and_preserve_history');report.ok=true;
}catch(error){report.ok=false;report.failure=error.message;process.exitCode=1;}
await fs.writeFile(outputFile,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
