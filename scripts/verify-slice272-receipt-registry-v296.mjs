import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { qualifyRosterTeachFrameworkSynthesisV1 } from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
const [directory] = process.argv.slice(2);
const names = (await fs.readdir(`${directory}/workspace/iterative-draft/sessions`)).filter(n => n.endsWith('.json'));
assert.equal(names.length, 1);
const raw = JSON.parse(await fs.readFile(`${directory}/workspace/iterative-draft/sessions/${names[0]}`, 'utf8'));
const session = raw.value ?? raw, snapshot = session.draftTeachSnapshots.at(-1), state = snapshot.state;
const evidence = [...state.evidence, ...state.investigation.evidence,
  ...state.queryRecovery.operations.map(o => o.result).filter(Boolean)];
const cases = [
  ['f24e7c1252e081720a404be684e89b923312118d1f1cd0df045944d500eb49d7', 'resultStatus', 'derivable'],
  ['421bd3abb76c2dcb4b9df46ee35ddf0dab60058d9f5d2ba6f27a3571e7a79585', 'status', null],
  ['26c1fed695e4c2880431185e2dfe4f3d0305887142bf3816accf944f959ea855', 'status', 'illegal'],
];
const answer = (ref, path) => ({ questionId: 'exact-saved-record', disposition: 'retain', evidenceRefs: [ref],
  quantitativeEvidence: [], qualitativeEvidence: [{ receiptRef: ref, path, interpretation: 'Original record status only.' }] });
const bind = (source, rows, answers) => qualifyRosterTeachFrameworkSynthesisV1({
  synthesis: { answers, frameworkFeedback: [] }, sourceEvidence: source, evidence: rows });
// Actual D101 feedback saw only {reference,receiptHash}; these immutable Native/
// port receipts must win over references. Two originals are in the current
// input; the comparison body is only in an older snapshot and must NOT be
// fabricated from its current reference-only copies.
const result = bind(snapshot.context, evidence, cases.map(([ref, path]) => answer(ref, path)));
const failed = result.answers.filter((a, index) => a.qualitativeEvidence[0]?.value !== cases[index][2]);
assert.equal(failed.length, 0, 'References cannot replace present originals or invent an absent body');
for (const a of result.answers) assert.equal(a.qualitativeEvidence[0].interpretationVerified, false);
assert.equal(result.answers[1].qualitativeEvidence[0].pathRepair.code, 'ROSTER_TEACH_EVIDENCE_RECEIPT_UNKNOWN');
const retained = session.draftTeachSnapshots[0].state.evidence.find(e => e.receiptHash === cases[1][0]);
assert(retained, 'The old original is persisted but not in the latest source input');
assert.equal(bind([snapshot.context, retained], evidence, [answer(cases[1][0], 'status')])
  .answers[0].qualitativeEvidence[0].value, 'advisory', 'Only supplying the actual original can resolve this reference');

const ref = cases[0][0], stub = { reference: ref, receiptHash: ref };
const onlyStub = bind([stub], [], [answer(ref, 'reference')]);
assert.equal(onlyStub.answers[0].qualitativeEvidence[0].pathRepair.code, 'ROSTER_TEACH_EVIDENCE_RECEIPT_UNKNOWN');
const citation = { receiptHash: ref, receiptRef: ref, path: 'status', value: 123,
  status: 'receipt_bound', interpretationVerified: false };
const onlyCitation = bind({ synthesis: { answers: [{ quantitativeEvidence: [citation] }] } }, [], [answer(ref, 'value')]);
assert.equal(onlyCitation.answers[0].qualitativeEvidence[0].pathRepair.code, 'ROSTER_TEACH_EVIDENCE_RECEIPT_UNKNOWN');
const scope = { receiptHash: ref, status: 'advisory', sourceStateHash: 'not-an-original-body' };
const onlyScope = bind({ issueLedger: { questions: [{ evidenceScopes: [scope] }] } }, [], [answer(ref, 'status')]);
assert.equal(onlyScope.answers[0].qualitativeEvidence[0].pathRepair.code, 'ROSTER_TEACH_EVIDENCE_RECEIPT_UNKNOWN');
const nav = { navigationOnly: true, entries: [{ receiptHash: ref, status: 'advisory', original: { documentId: 'source', path: '' } }] };
const onlyNav = bind(nav, [], [answer(ref, 'status')]);
assert.equal(onlyNav.answers[0].qualitativeEvidence[0].pathRepair.code, 'ROSTER_TEACH_EVIDENCE_RECEIPT_UNKNOWN');
for (const source of [[stub, snapshot.context], [snapshot.context, stub]]) {
  assert.equal(bind(source, evidence, [answer(ref, 'resultStatus')]).answers[0].qualitativeEvidence[0].value, 'derivable');
}
console.log(JSON.stringify({ pass: true, currentOriginalsRecovered: 2,
  retainedOriginalResolvedOnlyWhenSupplied: 1, referenceOnlyRejected: 4,
  orderIndependent: true, providerCalls: 0, nativeCalls: 0 }));
