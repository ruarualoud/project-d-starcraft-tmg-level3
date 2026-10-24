import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createRosterTeachSynthesisArchiveV1, createRosterTeachSynthesisReaderStateV1,
  projectRosterTeachSynthesisReaderV1, readRosterTeachSynthesisDocumentV1 }
  from '../packages/roster-strategist/roster-teach-synthesis-reader-v1.mjs';

// Real A185: later successful receipts are hidden behind anonymous large-array
// entries while the actual reader chose /evidence/0 and /evidence/1 failures.
const [base] = process.argv.slice(2);
const request = JSON.parse(gunzipSync(await fs.readFile(`${base}/A/fresh-generation-v264/request-185.private.json.gz`)));
const nodes = request.promptNodes, original = JSON.stringify(nodes);
const archive = createRosterTeachSynthesisArchiveV1(nodes);
const state = createRosterTeachSynthesisReaderStateV1(archive);
const view = projectRosterTeachSynthesisReaderV1(archive, state)[0];
const terrain = view.questions.find(q => q.questionId === 'q-terrain-five-predicates');
assert(terrain, 'Use the actual terrain question');
assert(terrain.evidenceDirectory, 'Large question must expose an addressable receipt directory before the model guesses array indices');
const directory = readRosterTeachSynthesisDocumentV1(archive,
  { documentId: terrain.evidenceDirectory.documentId, path: '' });
assert.equal(directory.kind, 'value');
assert.equal(directory.value.navigationOnly, true);
assert.equal(directory.value.infersPredicateCoverage, false);
const entries = directory.value.entries;
assert(entries.length > 20, 'Retain the full history, not only first failures or a selected success');
assert(entries.some(e => e.status === 'unknown'));
assert(entries.some(e => e.status === 'advisory'));
for (const entry of entries) {
  assert(entry.original.documentId && entry.original.path !== undefined);
  const page = readRosterTeachSynthesisDocumentV1(archive, entry.original);
  assert(!['document_error', 'path_error'].includes(page.kind));
}
assert.equal(JSON.stringify(nodes), original, 'Navigation cannot edit paid inputs');
assert.equal(archive.archiveHash, hash({ nodes, originalBindings: [] }), 'Derived navigation must not reset the existing reader/answers');
assert.equal(state.answers.length, 0, 'Host cannot choose a strategic answer');
// Metadata remains navigation, not a new receipt or automatically resolved fact.
assert(!Object.hasOwn(directory.value, 'receiptHash'));
console.log(JSON.stringify({ pass: true, actualQuestion: terrain.questionId,
  entries: entries.length, statuses: terrain.evidenceDirectory.statusCounts,
  unchangedArchive: true, providerCalls: 0, nativeCalls: 0 }));
