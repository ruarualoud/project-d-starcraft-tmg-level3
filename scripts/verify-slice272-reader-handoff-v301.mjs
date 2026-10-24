import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import { createRosterTeachSynthesisArchiveV1, projectRosterTeachSynthesisReaderV1,
  applyRosterTeachSynthesisReaderCommandV1, assembleRosterTeachSynthesisReaderV1 } from '../packages/roster-strategist/roster-teach-synthesis-reader-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';

const [directory] = process.argv.slice(2);
const request = JSON.parse(gunzipSync(await fs.readFile(`${directory}/request-224.private.json.gz`)));
const paid = request.promptNodes.find(n => n.kind === 'readonly_synthesis_workspace');
assert.equal(paid.answerLedger.answers.length, paid.questions.length);
assert.equal(paid.citationFeedback.correctableFailures.length, 0);
assert(paid.answerLedger.answers.some(a => a.disposition === 'unresolved'));
const file = (await fs.readdir(`${directory}/workspace/drafts`)).find(n => n.endsWith('.json'));
const session = JSON.parse(await fs.readFile(`${directory}/workspace/drafts/${file}`));
const actual = session.teachFramework.state.synthesisReader;
assert(actual.completedSteps.slice(-10).every(s => s.action === 'answer' && s.newReadPages === 0),
  'Actual paid A repeatedly rewrote a complete ledger without new reads');
const archive = createRosterTeachSynthesisArchiveV1([{ kind: 'question_evidence_reconciliation',
  questions: paid.questions.map(q => ({ questionId: q.questionId, originalQuestion: q.originalQuestion, evidence: [] })) }]);
const reader = structuredClone(actual);
reader.archiveHash = archive.archiveHash;
reader.latestPages = [];
const original = hash(actual);
const view = projectRosterTeachSynthesisReaderV1(archive, reader)[0];
assert.equal(view.workflow?.nextAction, 'finish',
  'A fully saved, reference-valid ledger must request handoff instead of another answer batch');
assert.equal(view.workflow.finalAdmission, false);
assert.equal(view.workflow.unresolvedQuestionIds.length, reader.answers.filter(a => a.disposition === 'unresolved').length);
assert.equal(reader.status, 'reading', 'A routing hint does not manufacture the model finish');
const command = { action: view.workflow.nextAction, reads: [], answers: [],
  proposedPlanChanges: [], proposedRosterChanges: [], frameworkFeedback: [] };
applyRosterTeachSynthesisReaderCommandV1(archive, reader, command);
assert.equal(assembleRosterTeachSynthesisReaderV1(reader).answers.filter(a => a.disposition === 'unresolved').length,
  actual.answers.filter(a => a.disposition === 'unresolved').length, 'Handoff must preserve real unknowns');
assert.equal(hash(actual), original);
const pending = structuredClone(actual);
pending.archiveHash = archive.archiveHash; pending.latestPages = []; pending.answers.pop();
assert.equal(projectRosterTeachSynthesisReaderV1(archive, pending)[0].workflow.nextAction, 'answer_pending');
pending.answers = structuredClone(actual.answers);
pending.citationFeedback = { correctableFailures: [{ questionId: pending.answers[0].questionId, code: 'invalid_path' }] };
assert.equal(projectRosterTeachSynthesisReaderV1(archive, pending)[0].workflow.nextAction, 'repair_citations');
pending.citationFeedback = { correctableFailures: [] };
pending.queuedReads = [{ documentId: 'question-1', path: '', offset: 0 }];
assert.equal(projectRosterTeachSynthesisReaderV1(archive, pending)[0].workflow.nextAction, 'read');
console.log(JSON.stringify({ pass: true, actualPaidRepeatedAnswers: 10,
  completeLedgerRoutesToFinish: true, unresolvedPreserved: true, noAutomaticAdmission: true,
  missingAnswersAndReferencesStillRepairable: true, providerCalls: 0, nativeCalls: 0 }));
