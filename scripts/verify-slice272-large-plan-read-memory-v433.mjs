// Actual calls233/235: large Plan leaves currentPlan inline; its read sections
// disappeared after receipts replaced latestPages, provoking identical reads.
import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {createRosterTeachSynthesisArchiveV1,createRosterTeachSynthesisReaderStateV1,
  applyRosterTeachSynthesisReaderCommandV1,projectRosterTeachSynthesisReaderV1}
  from '../packages/roster-strategist/roster-teach-synthesis-reader-v1.mjs';
const [draftFile,runDirectory]=process.argv.slice(2);
const draft=JSON.parse(await fs.readFile(draftFile,'utf8'));
const plan=JSON.parse(draft.planSerialized);
const readCall=async(n,kind)=>JSON.parse(gunzipSync(await fs.readFile(`${runDirectory}/call-${n}.${kind}.json.gz`)));
const command=(await readCall('233','reply')).output;
const supplied=(await readCall('235','product-request')).promptNodes.find(n=>n.kind==='readonly_synthesis_workspace');
const receipt=supplied.latestPages.find(p=>p.documentId==='question-19'&&p.path==='/evidence/14').value;
const archive=createRosterTeachSynthesisArchiveV1([
  {kind:'current_plan_and_context',plan,context:{}},
  {kind:'question_evidence_reconciliation',questions:[{questionId:'arrival',originalQuestion:{questionId:'arrival'},evidence:[receipt]}]},
]);
const state=createRosterTeachSynthesisReaderStateV1(archive);
applyRosterTeachSynthesisReaderCommandV1(archive,state,command);
const sections=projectRosterTeachSynthesisReaderV1(archive,state)[0].latestPages.filter(p=>p.kind==='value');
assert.equal(sections.length,10,'All ten actual requested sections must be present before receipt read');
applyRosterTeachSynthesisReaderCommandV1(archive,state,{action:'read',reads:[{documentId:'question-1',path:'/evidence/0',offset:0}],answers:[],proposedPlanChanges:[],proposedRosterChanges:[],frameworkFeedback:[]});
const view=projectRosterTeachSynthesisReaderV1(archive,state)[0];
assert.equal(view.currentPlan.complete,false,'Use the actual oversized Plan, not a tiny fixture');
for(const section of sections){
  const carried=view.readMemory.pages.find(p=>p.documentId==='plan'&&p.path===section.path);
  assert(carried,`Actual previously read Plan section disappeared: ${section.path}`);
  assert.deepEqual(carried.value,section.value,'Carry original data, not generated summaries');
}
assert.deepEqual(view.latestPages[0].value,receipt,'Current Rules receipt is not displaced');
assert.deepEqual(projectRosterTeachSynthesisReaderV1(archive,JSON.parse(JSON.stringify(state)))[0].readMemory,view.readMemory,'Restart preserves exact read memory');
assert(view.readMemory.bytes<=view.readMemory.windowBytes,'Retain bounded transport');
assert.deepEqual(archive.documents.find(d=>d.id==='plan').value,plan,'No Plan mutation');
console.log(JSON.stringify({ok:true,actualPlanBytes:Buffer.byteLength(JSON.stringify(plan)),exactSections:sections.length,providerCalls:0,nativeQueries:0,readMemoryBytes:view.readMemory.bytes}));
