import fs from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createRosterTeachSynthesisArchiveV1, createRosterTeachSynthesisReaderStateV1,
  readRosterTeachSynthesisDocumentV1 } from '../packages/roster-strategist/roster-teach-synthesis-reader-v1.mjs';
const [directory] = process.argv.slice(2);
const request = JSON.parse(gunzipSync(await fs.readFile(`${directory}/request-108.private.json.gz`)));
const workspace = request.promptNodes.find(n => n.kind === 'readonly_synthesis_workspace');
const delivered = workspace.latestPages.find(p => p.documentId === 'question-3').value;
const ref = delivered.originalQuestion.evidenceObjectHash;
assert.equal(ref, '21bf150e05f315d3b7ca8e7567d0e676559b135dd78cb6e28d181bc0b563d7b9');
const name = (await fs.readdir(`${directory}/workspace/iterative-draft/sessions`)).find(n => n.endsWith('.json'));
const stored = JSON.parse(await fs.readFile(`${directory}/workspace/iterative-draft/sessions/${name}`));
const session = stored.value ?? stored;
const original = session.draftTeachSnapshots.flatMap(s => s.state?.agenda?.questions || []).find(q => hash(q) === ref);
assert(original, 'Actual F question original must exist, not a newly invented receipt');
const nodes = [{ kind: 'saved_question', value: original },
  { kind: 'question_evidence_reconciliation', questions: [
    { questionId: original.questionId, originalQuestion: delivered.originalQuestion,
      originalQuestionAuthority: delivered.originalQuestionAuthority, evidence: [] },
    { questionId: 'same-prompt-copy', originalQuestion: {
      kind: 'same_prompt_evidence_reference_v1', targetJsonPointer: '/0/value', contentHash: hash(original) }, evidence: [] },
  ] }];
const archive = createRosterTeachSynthesisArchiveV1(nodes, { retainedEvidence: new Map([[ref, original]]) });
const state = createRosterTeachSynthesisReaderStateV1(archive);
const before = hash({ nodes, original, state, archiveHash: archive.archiveHash });
const read = (documentId, path = '') => readRosterTeachSynthesisDocumentV1(archive, { documentId, path }, state);
const page = read('question-1');
assert.equal(page.value?.originalQuestion && hash(page.value.originalQuestion), hash(original),
  'Actual F read must deliver the question, not a sameContentAsEarlierObject transport stub');
assert.equal(page.value.originalQuestionAuthority, 'model_hypotheses_not_observed_facts');
assert.equal(read('question-1', '/originalQuestion/questionId').value, original.questionId);
assert.equal(hash(read('question-2', '/originalQuestion').value), hash(original));
assert.equal(read('question-2', '/originalQuestion/questionId').value, original.questionId);
assert.equal(hash({ nodes, original, state, archiveHash: archive.archiveHash }), before,
  'Read projection must not reset the source/archive/paid ledger');
const huge = createRosterTeachSynthesisArchiveV1([{ kind: 'large', repeated: Array(100).fill(delivered.originalQuestion) }],
  { retainedEvidence: new Map([[ref, original]]) });
const paged = readRosterTeachSynthesisDocumentV1(huge, { documentId: 'node-0', path: '/repeated' });
assert.equal(paged.kind, 'children', 'Expansion stays within the existing read window');
assert.equal(readRosterTeachSynthesisDocumentV1(huge,
  { documentId: 'node-0', path: '/repeated/99/questionId' }).value, original.questionId);
const absent = createRosterTeachSynthesisArchiveV1([{ kind: 'absent', payload: delivered.originalQuestion }]);
assert.equal(readRosterTeachSynthesisDocumentV1(absent,
  { documentId: 'node-0', path: '/payload' }).kind, 'reference_error', 'A missing original is explicit, never a fact-like stub');
console.log(JSON.stringify({ pass: true, actualF108OriginalRecovered: true,
  bothReferenceFormsTransparent: true, expandedPageBounded: true,
  archiveSourceAndReaderUnchanged: true, providerCalls: 0, nativeCalls: 0 }));
