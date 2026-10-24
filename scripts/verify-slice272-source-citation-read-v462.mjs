// Actual301 cited Armed and Ready without reading its indexed rule original.
import fs from 'node:fs/promises';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import {createRosterTeachSynthesisArchiveV1 as archiveFor,
  createRosterTeachSynthesisReaderStateV1 as stateFor,
  applyRosterTeachSynthesisReaderCommandV1 as apply,
  projectRosterTeachSynthesisReaderV1 as project} from '../packages/roster-strategist/roster-teach-synthesis-reader-v1.mjs';
const input=JSON.parse(zlib.gunzipSync(await fs.readFile(process.argv[2]+'/call-301.product-request.json.gz')));
const reply=JSON.parse(zlib.gunzipSync(await fs.readFile(process.argv[2]+'/call-301.reply.json.gz')));
const formal=JSON.parse(await fs.readFile(process.argv[3],'utf8'));
const questionId='q-timing-armed-and-ready-cap';
const question=input.promptNodes[0].questions.find(q=>q.questionId===questionId);
const answer=reply.output.answers.find(a=>a.questionId===questionId);
const archive=archiveFor([{kind:'current_plan_and_context',plan:{planVersion:3},context:formal.teachFramework.context},
  {kind:'question_evidence_reconciliation',questions:[{questionId,originalQuestion:question.originalQuestion,evidence:[]}]}]);
const state=stateFor(archive);
const command={...reply.output,answers:[answer],proposedPlanChanges:[],proposedRosterChanges:[],frameworkFeedback:[]};
const unchanged=JSON.stringify(command);
apply(archive,state,command);
assert.equal(state.answers.length,0,'Unread source-fact citations must not be saved as conclusions');
assert.equal(state.completedSteps.at(-1).action,'answer_deferred_for_unread_evidence');
const rulePage=state.latestPages.find(p=>p.documentId==='context'&&p.path==='/sourceFacts/selectionSupportRules/4');
assert.equal(rulePage?.kind,'value');
assert.equal(rulePage.value.recordKey,'tactical_cards:barracks__proxy_');
assert(JSON.stringify(rulePage.value).includes('Armed and Ready'));
assert.equal(JSON.stringify(command),unchanged,'Host must not repair the model argument');
assert.equal(state.unreadEvidenceDrafts[0].command.answers[0].publicReason,answer.publicReason);
apply(archive,state,command); // After real original delivery, the model may resubmit; semantic review stays separate.
assert.equal(state.answers.length,1);
assert.equal(state.answers[0].publicReason,answer.publicReason);
const state2=stateFor(archive);
apply(archive,state2,{...command,action:'read',reads:[{documentId:'context',path:'',offset:0}],answers:[]});
assert.equal(state2.latestPages[0].kind,'children');
apply(archive,state2,command);
assert.equal(state2.answers.length,0,'A directory is not reading the underlying rule text');
console.log(JSON.stringify({pass:true,actualReply:301,sourceOriginalAutoDelivered:true,indexNotEvidence:true,modelMeaningUntouched:true,providerCalls:0,nativeCalls:0,originalWrites:0}));
