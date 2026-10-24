// Actual call019 repeatedly reopens refuted claims because only batch progress exists.
import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {rosterTeachInvestigationWindowV1} from '../packages/roster-strategist/roster-teach-capability-guide-v1.mjs';
import {rosterTeachInvestigationContractV1,validateRosterTeachInvestigationProgressV1} from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
const [requestFile,replyFile,outputFile]=process.argv.slice(2);
const report={providerCalls:0,checks:[]};
try{
 const request=JSON.parse(gunzipSync(await fs.readFile(requestFile)));
 const output=JSON.parse(gunzipSync(await fs.readFile(replyFile))).output;
 const ids=request.promptNodes.find(n=>n.kind==='fact_probe_assignment').pendingQuestionIds;
 const active=[...new Set(output.queries.map(q=>q.questionId))];
 const annotated={...output,questionProgress:ids.map(questionId=>({questionId,
  disposition:active.includes(questionId)?'needs_tool_result':'plan_revision_required',
  evidenceQueryIds:[],publicReason:'Fixture models explicit per-question handoff; not an accepted real strategic answer.'}))};
 const state={agenda:{questions:ids.map(questionId=>({questionId}))},investigationPolicyVersion:'evidence_led_issue_progress_v1',
  investigation:{rounds:[{completed:true,output:annotated}],operations:[],evidence:[]}};
 const window=rosterTeachInvestigationWindowV1(state);
 assert.deepEqual([...window.questionIds].sort(),[...active].sort(),'Completed/refuted question handoffs are ignored and every question is reopened');
 const contract=rosterTeachInvestigationContractV1(ids).providerSchema;
 assert(contract.required.includes('questionProgress'));
 assert.equal(contract.properties.questionProgress.minItems,ids.length);
 report.checks.push('model_owned_handoffs_leave_only_questions_requiring_new_tool_results');
 const finished={...annotated,queries:[],questionProgress:active.map(questionId=>({questionId,disposition:'evidence_established',evidenceQueryIds:[],publicReason:'Fixture only'}))};
 state.investigation.rounds.push({completed:true,output:finished});
 const finalWindow=rosterTeachInvestigationWindowV1(state);
 assert.equal(finalWindow.progress.stopped,true);assert.deepEqual(finalWindow.questionIds,[]);
 assert.equal(state.phase,undefined);assert.equal(state.synthesis,undefined);
 report.checks.push('all_handoffs_end_investigation_without_accepting_plan_or_erasing_history');
 const bad={...annotated,questionProgress:annotated.questionProgress.map(p=>({...p,disposition:'evidence_established'}))};
 assert.throws(()=>validateRosterTeachInvestigationProgressV1(bad,{agenda:state.agenda,investigation:{operations:[],evidence:[]}},ids),
  e=>e.code==='ROSTER_TEACH_QUESTION_PROGRESS_INVALID');
 report.checks.push('contradictory_query_and_closed_status_returns_typed_correction');report.ok=true;
}catch(error){report.ok=false;report.failure=error.message;report.stack=error.stack;process.exitCode=1;}
await fs.writeFile(outputFile,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
