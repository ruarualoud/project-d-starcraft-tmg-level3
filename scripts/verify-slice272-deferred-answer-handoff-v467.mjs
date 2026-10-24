import fs from 'node:fs/promises';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import {createRosterTeachSynthesisArchiveV1 as archiveFor,
  createRosterTeachSynthesisReaderStateV1 as stateFor,
  projectRosterTeachSynthesisReaderV1 as project} from '../packages/roster-strategist/roster-teach-synthesis-reader-v1.mjs';
const input=JSON.parse(zlib.gunzipSync(await fs.readFile(process.argv[2]+'/call-311.product-request.json.gz')));
const reply=JSON.parse(zlib.gunzipSync(await fs.readFile(process.argv[2]+'/call-310.reply.json.gz')));
const formal=JSON.parse(await fs.readFile(process.argv[3],'utf8'));
const saved=formal.teachFramework.state.synthesisReader;
const draft=saved.unreadEvidenceDrafts.at(-1);
const {schemaVersion,roundKind,...command}=reply.output;
assert.deepEqual(draft.command,command);
assert.equal(input.promptNodes[0].pendingAnswerDraft,undefined);
const archive=archiveFor([{kind:'question_evidence_reconciliation',questions:input.promptNodes[0].questions
  .map(q=>({questionId:q.questionId,originalQuestion:q.originalQuestion,evidence:[]}))}]);
const state=stateFor(archive);
state.pendingEvidenceReassessmentQuestionIds=structuredClone(saved.pendingEvidenceReassessmentQuestionIds);
state.unreadEvidenceDrafts=[structuredClone(draft)];
const original=JSON.stringify(state);
const workspace=project(archive,state)[0];
assert(workspace.pendingAnswerDrafts?.length===1,
  'The next input must carry the actual deferred paid draft, not only an older accepted ledger');
assert.deepEqual(workspace.pendingAnswerDrafts[0].page.value.command,command);
assert.equal(workspace.pendingAnswerDrafts[0].authority,'unaccepted_model_draft_not_rule_evidence');
assert.equal(workspace.pendingAnswerDrafts[0].original.documentId,'pending-answer-draft');
assert.equal(JSON.stringify(state),original);
state.pendingEvidenceReassessmentQuestionIds=[];
assert.equal(project(archive,state)[0].pendingAnswerDrafts,undefined);
console.log(JSON.stringify({pass:true,actualPaidReply:310,actualNextInput:311,exactDraftHandoff:true,
  draftNotEvidence:true,providerCalls:0,nativeCalls:0,originalWrites:0}));
