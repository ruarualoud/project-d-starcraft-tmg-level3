import fs from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import * as teach from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
const [directory] = process.argv.slice(2);
const request = JSON.parse(gunzipSync(await fs.readFile(`${directory}/request-137.private.json.gz`)));
const workspace = request.promptNodes.find(n => n.kind === 'readonly_synthesis_workspace');
const receipt = workspace.latestPages.find(p => p.documentId === 'question-7').value;
const saved = workspace.latestPages.find(p => p.documentId === 'answer-ledger').value.answers
  .find(a => a.questionId === 'q7-robustness-switch-conditions');
const item = saved.qualitativeEvidence.find(e => e.receiptRef === receipt.receiptHash
  && e.path === '/result/markerResults/2/result');
assert(item, 'Actual stopped D citation must be present');
const answer = { ...saved, evidenceRefs: [receipt.receiptHash], quantitativeEvidence: [], qualitativeEvidence: [item] };
const synth = { answers: [answer], proposedPlanChanges: [], proposedRosterChanges: [], frameworkFeedback: [] };
const qualify = (root, value = synth) => teach.qualifyRosterTeachFrameworkSynthesisV1({ synthesis: value,
  evidence: [root], sourceEvidence: [root] });
const originalBytes = JSON.stringify({ receipt, synth });
const bound = qualify(receipt).answers[0].qualitativeEvidence[0];
assert.equal(bound.status, 'receipt_bound', 'Exact Native field is under declared sourceReceipt.queryReceipt, not missing');
assert.equal(bound.value, receipt.sourceReceipt.queryReceipt.result.markerResults[2].result);
assert.equal(bound.receiptHash, receipt.sourceReceipt.queryReceipt.queryReceiptHash);
assert.equal(bound.receiptRef, item.receiptRef, 'Do not rewrite the paid model reference');
assert.equal(bound.path, item.path, 'Do not rewrite the paid model path');
assert.equal(bound.interpretationVerified, false);
assert.equal(JSON.stringify({ receipt, synth }), originalBytes);
const rootWins = structuredClone(receipt);
rootWins.result = { markerResults: [{}, {}, { result: 'root-scope-is-authoritative' }] };
assert.equal(qualify(rootWins).answers[0].qualitativeEvidence[0].value, 'root-scope-is-authoritative');
const missing = structuredClone(synth);
missing.answers[0].qualitativeEvidence[0].path = '/result/markerResults/2/nonexistent';
assert.equal(qualify(receipt, missing).answers[0].qualitativeEvidence[0].status, 'unknown');
const unknown = structuredClone(receipt);
unknown.sourceReceipt.queryReceipt.status = 'unknown';
assert.equal(qualify(unknown).answers[0].qualitativeEvidence[0].status, 'unknown');
const unrelated = structuredClone(receipt);
unrelated.unrelatedScenario = unrelated.sourceReceipt.queryReceipt;
delete unrelated.sourceReceipt;
assert.equal(qualify(unrelated).answers[0].qualitativeEvidence[0].status, 'unknown', 'No recursive suffix search');
const reader = { noProgressSteps: 3, answers: [{ questionId: saved.questionId, disposition: 'unresolved' }],
  citationFeedback: { correctableFailures: [] }, queuedReads: [], completedSteps: [], status: 'reading' };
const options = { reader, previouslyCorrectableCount: 1, questionIds: [saved.questionId] };
assert.equal(teach.allowRosterTeachResolvedCitationHandoffV1(options), true);
assert.equal(reader.noProgressSteps, 3, 'A concrete-fix retry does not clear the old counter');
assert.equal(reader.answers[0].disposition, 'unresolved');
assert.equal(reader.status, 'reading', 'Still requires the model to finish');
assert.equal(teach.allowRosterTeachResolvedCitationHandoffV1(options), true, 'An interrupted same logical step remains resumable');
reader.completedSteps.push({ action: 'read' });
assert.equal(teach.allowRosterTeachResolvedCitationHandoffV1(options), false, 'Only one extra after the proven binding fix');
const stillBad = { ...reader, resolvedCitationHandoff: undefined, citationFeedback: { correctableFailures: [{}] } };
assert.equal(teach.allowRosterTeachResolvedCitationHandoffV1({ ...options, reader: stillBad }), false);
console.log(JSON.stringify({ pass: true, actualDNativeFieldRecovered: true, noReceiptOrPathRewrite: true,
  noFuzzySearch: true, unknownPreserved: true, oneConcreteFixHandoff: true, providerCalls: 0, nativeCalls: 0 }));
