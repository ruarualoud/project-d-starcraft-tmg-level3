import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import { reconcileRosterTeachSynthesisReaderV1 } from '../packages/roster-strategist/roster-teach-synthesis-reader-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const [directory] = process.argv.slice(2);
const oldRequest = JSON.parse(gunzipSync(await fs.readFile(`${directory}/request-110.private.json.gz`)));
const oldArchive = oldRequest.promptNodes.find(n => n.kind === 'readonly_synthesis_workspace').archiveHash;
const name = (await fs.readdir(`${directory}/workspace/iterative-draft/sessions`)).find(n => n.endsWith('.json'));
const stored = JSON.parse(await fs.readFile(`${directory}/workspace/iterative-draft/sessions/${name}`));
const session = stored.value ?? stored, actual = session.draftTeachSnapshots.at(-1).state;
const previous = actual.synthesisReaderHistory.find(r => r.archiveHash === oldArchive);
assert(previous?.completedSteps.length >= 26, 'Actual C first archive still holds paid steps');
assert(actual.synthesisReader.readSourceContinuations?.length, 'Actual C has already recovered the second segment');
const state = { synthesisReader: structuredClone(actual.synthesisReader),
  synthesisReaderHistory: structuredClone(actual.synthesisReaderHistory) };
const current = structuredClone(state.synthesisReader), oldHistory = hash(state.synthesisReaderHistory);
const archive = { version: current.version, archiveHash: current.archiveHash,
  questions: actual.agenda.questions.map(q => ({ questionId: q.questionId })) };
reconcileRosterTeachSynthesisReaderV1(archive, state, { readOnlyContinuation: true });
assert.equal(state.synthesisReader.completedSteps.length, previous.completedSteps.length + current.completedSteps.length,
  'C archive A→B→A must recover the first segment too, without duplicating the recovered second segment');
for (const answer of current.answers) {
  assert.equal(hash(state.synthesisReader.answers.find(a => a.questionId === answer.questionId)), hash(answer));
}
assert.equal(hash(state.synthesisReaderHistory), oldHistory);
const stable = hash(state.synthesisReader);
reconcileRosterTeachSynthesisReaderV1(archive, state, { readOnlyContinuation: true });
assert.equal(hash(state.synthesisReader), stable);
console.log(JSON.stringify({ pass: true, earlierPaidStepsRecovered: previous.completedSteps.length,
  currentPaidStepsPreserved: current.completedSteps.length, latestAnswersPreserved: current.answers.length,
  noHistoryRewrite: true, noDuplicateMerge: true, providerCalls: 0, nativeCalls: 0 }));
