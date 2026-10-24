// Calls025→026 replaced earlier scoring evidence before any answer was saved.
import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {createRosterTeachSynthesisArchiveV1,createRosterTeachSynthesisReaderStateV1,
 applyRosterTeachSynthesisReaderCommandV1,projectRosterTeachSynthesisReaderV1} from '../packages/roster-strategist/roster-teach-synthesis-reader-v1.mjs';
const [earlierFile,laterFile,outputFile]=process.argv.slice(2);
const report={providerCalls:0,checks:[]};
try{
 const earlier=JSON.parse(gunzipSync(await fs.readFile(earlierFile))).promptNodes[0];
 const later=JSON.parse(gunzipSync(await fs.readFile(laterFile))).promptNodes[0];
 const first=earlier.latestPages.find(p=>p.documentId==='question-1' && p.kind==='value');
 const second=later.latestPages.find(p=>p.documentId==='question-8' && p.kind==='value');
 assert(first && second);
 const archive=createRosterTeachSynthesisArchiveV1([{kind:'current_plan_and_context',plan:earlier.currentPlan.value,context:{}},
  {kind:'question_evidence_reconciliation',questions:[
   {questionId:'scoring',originalQuestion:{questionId:'scoring'},evidence:[first.value]},
   {questionId:'reserve',originalQuestion:{questionId:'reserve'},evidence:[second.value]}]}]);
 const state=createRosterTeachSynthesisReaderStateV1(archive);
 const read=documentId=>({action:'read',reads:[{documentId,path:'/evidence/0',offset:0}],answers:[],proposedPlanChanges:[],proposedRosterChanges:[],frameworkFeedback:[]});
 applyRosterTeachSynthesisReaderCommandV1(archive,state,read('question-1'));
 applyRosterTeachSynthesisReaderCommandV1(archive,state,read('question-2'));
 const view=projectRosterTeachSynthesisReaderV1(archive,state)[0];
 const remembered=view.readMemory?.pages?.find(p=>p.documentId==='question-1');
 assert(remembered,'Stateless synthesis lost previously read scoring evidence while its answer was still pending');
 assert.deepEqual(remembered.value,first.value);
 const restored=projectRosterTeachSynthesisReaderV1(archive,JSON.parse(JSON.stringify(state)))[0];
 assert.deepEqual(restored.readMemory,view.readMemory);
 report.checks.push('unanswered_exact_read_evidence_survives_next_page_and_state_restart_without_rule_replay');
 state.answers.push({questionId:'scoring',disposition:'revise'});
 const answered=projectRosterTeachSynthesisReaderV1(archive,state)[0];
 assert(!answered.readMemory.pages.some(p=>p.documentId==='question-1'));
 assert(answered.readMemory.directory.some(p=>p.documentId==='question-1'));
 assert.deepEqual(archive.documents.find(d=>d.id==='question-1').value.evidence[0],first.value);
 report.checks.push('saved_answer_releases_inline_evidence_but_exact_original_and_read_directory_remain');report.ok=true;
}catch(error){report.ok=false;report.failure=error.message;report.stack=error.stack;process.exitCode=1;}
await fs.writeFile(outputFile,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
