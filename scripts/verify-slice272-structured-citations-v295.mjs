import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import { qualifyRosterTeachFrameworkSynthesisV1 } from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
import { readRosterTeachTypedEvidenceV1 } from '../packages/roster-strategist/roster-teach-typed-evidence-v1.mjs';
const [directory] = process.argv.slice(2);
const session = JSON.parse(await fs.readFile(`${directory}/workspace/drafts/rws-5c8ed89c-06a0-4c29-910d-f33d17421516.json`, 'utf8'));
const state = session.teachFramework.state;
const evidence = [...state.evidence, ...state.investigation.evidence,
  ...state.queryRecovery.operations.map(o => o.result).filter(Boolean)];
const request = JSON.parse(gunzipSync(await fs.readFile(`${directory}/request-207.private.json.gz`)));
const issues = request.promptNodes[0].citationFeedback.correctableFailures.filter(e => e.code === 'ROSTER_TEACH_EVIDENCE_VALUE_TYPE_UNSUPPORTED');
assert.equal(issues.length, 7, 'Actual A207 whole-table/relationship citations');
const answers = issues.map(issue => ({ questionId: issue.questionId, disposition: 'retain',
  evidenceRefs: [issue.receiptRef], quantitativeEvidence: [{ receiptRef: issue.receiptRef,
    path: issue.path, interpretation: 'Reference this saved table; no aggregate number or conclusion is inferred.' }], qualitativeEvidence: [] }));
const original = JSON.stringify(answers);
const result = qualifyRosterTeachFrameworkSynthesisV1({ synthesis: { answers, frameworkFeedback: [] },
  evidence, sourceEvidence: session.teachFramework.context });
const rejected = result.answers.flatMap(a => [...a.quantitativeEvidence, ...a.qualitativeEvidence])
  .filter(c => c.pathRepair?.code === 'ROSTER_TEACH_EVIDENCE_VALUE_TYPE_UNSUPPORTED');
assert.equal(rejected.length, 0, 'Exact structures may be references without pretending to be a numeric scalar');
for (const answer of result.answers) {
  assert.equal(answer.quantitativeEvidence.length, 0, 'Whole table cannot qualify as a number');
  const citation = answer.qualitativeEvidence[0];
  assert.equal(citation.valueType, 'structured_reference');
  assert.equal(citation.value.kind, 'exact_structure_reference');
  assert.equal(citation.value.numericUseAllowed, false);
  assert.equal(citation.interpretationVerified, false);
  assert(!Object.hasOwn(citation.value, 'sourceValue'), 'Do not duplicate huge table bodies in every answer');
  assert(!citation.pathRepair || citation.pathRepair.code === 'ROSTER_TEACH_EVIDENCE_RECEIPT_UNRESOLVED');
}
const actual = evidence.find(e => e.receiptHash === issues[0].receiptRef);
assert.equal(readRosterTeachTypedEvidenceV1(actual, '/sourceReceipt/result/rows').category, 'qualitativeEvidence');
assert.equal(readRosterTeachTypedEvidenceV1(actual, '/sourceReceipt/result/rows/0/ownMinusOpponentCumulativeMarkerVp').valueType, 'number');
assert.equal(readRosterTeachTypedEvidenceV1(actual, '/sourceReceipt/result/nonexistent').ok, false);
const unknown = evidence.find(e => e.status === 'unknown' && e.queryRepair);
assert(unknown);
const unknownAnswer = { questionId: unknown.questionId || unknown.challengeId, disposition: 'retain',
  evidenceRefs: [unknown.receiptHash], quantitativeEvidence: [], qualitativeEvidence: [{ receiptRef: unknown.receiptHash,
    path: 'queryRepair', interpretation: 'Failed query diagnostics, not game success.' }] };
const stillUnknown = qualifyRosterTeachFrameworkSynthesisV1({ synthesis: { answers: [unknownAnswer], frameworkFeedback: [] }, evidence });
assert.equal(stillUnknown.answers[0].qualitativeEvidence[0].pathRepair.code, 'ROSTER_TEACH_EVIDENCE_RECEIPT_UNRESOLVED');
assert.equal(JSON.stringify(answers), original);
console.log(JSON.stringify({ pass: true, actualStructureCitations: issues.length,
  scalarizedStructures: 0, paidArgumentsChanged: false, unknownNotPromoted: true, providerCalls: 0, nativeCalls: 0 }));
