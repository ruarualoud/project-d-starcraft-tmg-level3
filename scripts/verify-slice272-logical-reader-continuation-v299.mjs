import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import { reconcileRosterTeachSynthesisReaderV1 } from '../packages/roster-strategist/roster-teach-synthesis-reader-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const [directory] = process.argv.slice(2);
const oldRequest = JSON.parse(gunzipSync(await fs.readFile(`${directory}/request-111.private.json.gz`)));
const oldArchive = oldRequest.promptNodes.find(n => n.kind === 'readonly_synthesis_workspace').archiveHash;
const name = (await fs.readdir(`${directory}/workspace/iterative-draft/sessions`)).find(n => n.endsWith('.json'));
const stored = JSON.parse(await fs.readFile(`${directory}/workspace/iterative-draft/sessions/${name}`));
const session = stored.value ?? stored, teach = session.draftTeachSnapshots.at(-1);
const actual = teach.state, oldReader = actual.synthesisReaderHistory.findLast(r => r.archiveHash === oldArchive);
assert(oldReader && oldReader.completedSteps.length >= 25, 'Actual F paid reader must still exist in history');
assert.equal(actual.investigation.completed, true);
assert(actual.investigation.operations.every(op => op.completed));
assert(actual.queryRecovery.operations.every(op => op.completed));
const state = { synthesisReader: structuredClone(actual.synthesisReader),
  synthesisReaderHistory: structuredClone(actual.synthesisReaderHistory) };
const current = structuredClone(state.synthesisReader);
const archive = { version: current.version, archiveHash: current.archiveHash,
  questions: actual.agenda.questions.map(q => ({ questionId: q.questionId })) };
assert.notEqual(oldReader.archiveHash, archive.archiveHash, 'Actual delivery changed despite the same Teach');
const historyHash = hash(state.synthesisReaderHistory);
reconcileRosterTeachSynthesisReaderV1(archive, state, { readOnlyContinuation: true });
assert.equal(state.synthesisReader.completedSteps.length,
  oldReader.completedSteps.length + current.completedSteps.length,
  'Same-source readonly resume must recover discarded paid steps, not start at zero');
for (const prior of oldReader.answers) {
  const expected = current.answers.find(a => a.questionId === prior.questionId) || prior;
  assert.equal(hash(state.synthesisReader.answers.find(a => a.questionId === prior.questionId)), hash(expected));
}
assert.equal(hash(state.synthesisReaderHistory), historyHash, 'Original histories remain immutable');
assert.equal(state.synthesisReader.noProgressSteps, Math.max(oldReader.noProgressSteps, current.noProgressSteps));
assert.equal(state.synthesisReader.status, 'reading', 'Retained drafts are not admitted answers');
const afterFirst = hash(state.synthesisReader);
reconcileRosterTeachSynthesisReaderV1(archive, state, { readOnlyContinuation: true });
assert.equal(hash(state.synthesisReader), afterFirst, 'Ordinary repeated reconciliation cannot duplicate paid work');
const changedArchive = { ...archive, archiveHash: 'different-delivery-view' };
reconcileRosterTeachSynthesisReaderV1(changedArchive, state, { readOnlyContinuation: true });
assert.equal(state.synthesisReader.completedSteps.length, oldReader.completedSteps.length + current.completedSteps.length);
const differentInquiry = { synthesisReader: structuredClone(oldReader) };
reconcileRosterTeachSynthesisReaderV1(archive, differentInquiry, { readOnlyContinuation: false });
assert.equal(differentInquiry.synthesisReader.answers.length, 0, 'Changed/non-readonly source does not inherit answers');
console.log(JSON.stringify({ pass: true, discardedPaidStepsRestored: oldReader.completedSteps.length,
  newPaidStepsPreserved: current.completedSteps.length, idempotent: true,
  unknownAnswersRemainDrafts: true, differentSourceNotImported: true, providerCalls: 0, nativeCalls: 0 }));
