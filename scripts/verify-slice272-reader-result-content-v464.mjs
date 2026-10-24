// Actual305 called Kerrigan fire uncomputed after reading receipt directories only.
import fs from 'node:fs/promises';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import {projectRosterTeachPromptEvidenceV1 as evidenceView} from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
import {createRosterTeachSynthesisArchiveV1 as archiveFor,
  createRosterTeachSynthesisReaderStateV1 as stateFor,
  applyRosterTeachSynthesisReaderCommandV1 as apply,
  projectRosterTeachSynthesisReaderV1 as project} from '../packages/roster-strategist/roster-teach-synthesis-reader-v1.mjs';
const load = async name => JSON.parse(zlib.gunzipSync(await fs.readFile(`${process.argv[2]}/${name}`)));
const input=await load('call-306.product-request.json.gz');
const paid=await load('call-305.reply.json.gz');
const formal=JSON.parse(await fs.readFile(process.argv[3], 'utf8'));
const id='generation-b61ea531987c3cad92d258a91d336c10';
const question=input.promptNodes[0].questions.find(q=>q.questionId===id);
const raw=[...formal.teachFramework.state.evidence,...formal.teachFramework.state.investigation.evidence]
  .filter(e=>(e.questionId||e.challengeId)===id);
assert(raw.some(e=>e.sourceReceipt?.exchange?.attackEstimates?.length));
const originals=new Map();
const nodes=evidenceView([{kind:'question_evidence_reconciliation',questions:[{
  questionId:id,originalQuestion:question.originalQuestion,evidence:raw}]}],originals);
const unchanged=JSON.stringify(raw);
const archive=archiveFor(nodes,{retainedEvidence:originals});
const state=stateFor(archive);
const command={...paid.output,answers:paid.output.answers.filter(a=>a.questionId===id),
  proposedPlanChanges:[],proposedRosterChanges:[],frameworkFeedback:[]};
const read=reads=>apply(archive,state,{...command,action:'read',reads,answers:[]});
read(archive.questions[0].evidenceDirectory.originals);
while(state.queuedReads.length)read([]);
assert(state.latestPages.some(p=>p.kind==='children'));
apply(archive,state,command);
assert.equal(state.answers.length,0,'Directory-only reads must not accept a conclusion when actual result views remain unread');
const resultTargets=archive.questions[0].evidenceDirectory.resultReadTargets;
assert(resultTargets.length>=2);
while(state.queuedReads.length)read([]);
// Follow the same retained-original read protocol to deliver all result pages.
const pending=[...resultTargets];
while(pending.length){
  const request=pending.shift();read([request]);
  const page=state.latestPages[0];
  if(page.kind==='children'){
    pending.push(...page.children.filter(c=>!Object.hasOwn(c,'value')).map(c=>({documentId:request.documentId,path:c.path,offset:0})));
  }
  if(page.nextOffset!==null&&page.nextOffset!==undefined)pending.push({...request,offset:page.nextOffset});
}
apply(archive,state,command);
assert.equal(state.answers.length,1,'Reading results permits model reassessment; it does not rewrite or certify its semantic conclusion');
assert.equal(state.answers[0].publicReason,command.answers[0].publicReason);
const views=archive.documents.filter(d=>resultTargets.some(t=>t.documentId===d.id)).map(d=>d.value);
assert(views.some(v=>v.fireExchangeEvidence?.some(e=>e.attackEstimateCount===3)));
assert.equal(JSON.stringify(raw),unchanged);
assert(project(archive,state)[0].evidenceNavigation.includes('result'));
console.log(JSON.stringify({pass:true,actualReply:305,resultViewsDelivered:true,directoryNotResult:true,
  nativeFireEstimateCount:3,modelMeaningUnchanged:true,providerCalls:0,nativeCalls:0,originalWrites:0}));
