// Reproduce the actual v200 paid reply: it cites a path exported to the model,
// but the old qualifier reads only the unprojected Native receipt.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { projectRosterTeachPromptEvidenceV1, qualifyRosterTeachFrameworkSynthesisV1 }
  from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
const [draftPath, reportPath] = process.argv.slice(2);
const draft = JSON.parse(await fs.readFile(draftPath, 'utf8'));
const state = draft.teachFramework.state;
const questionId = 'q-timing-synergy-enabling-order';
const report = { providerCalls: 0, nativeCalls: 0, sourceDraftWrites: 0, checks: [] };
try {
  const answer = state.synthesisRaw.answers.find(a => a.questionId === questionId);
  const evidence = state.investigation.evidence.filter(e => e.questionId === questionId);
  const payment = evidence.findLast(e => e.challengeId === questionId + '-orders-native-action-movement');
  const projection = projectRosterTeachPromptEvidenceV1(payment);
  const cited = answer.quantitativeEvidence[0];
  assert.equal(cited.path, 'nativeActionEvidence[0].nativeEvents[0].resourceCost');
  assert.equal(projection.nativeActionEvidence[0].nativeEvents[0].resourceCost, 1);
  assert.equal(payment.sourceReceipt.nativeEvents[0].resourceCost, 1);
  report.checks.push('actual_paid_citation_names_actual_displayed_native_event');
  const before = hash({ answer, evidence });
  const synthesis = { answers: [structuredClone(answer)], frameworkFeedback: [] };
  const qualified = qualifyRosterTeachFrameworkSynthesisV1({ synthesis, evidence });
  assert.equal(qualified.answers[0].quantitativeEvidence[0].status, 'receipt_bound',
    'A numeric path actually exported in this receipt view must bind, not become unknown');
  assert.equal(qualified.answers[0].quantitativeEvidence[0].value, 1);
  assert.equal(qualified.answers[0].quantitativeEvidence[0].receiptHash, payment.receiptHash);
  report.checks.push('same_receipt_displayed_path_binds_exact_native_payment');
  assert.equal(qualified.answers[0].quantitativeEvidence[1].status, 'unknown',
    'The separate invented control path must not be guessed from nearby numbers');
  assert.equal(qualified.answers[0].disposition, answer.disposition,
    'Binding one fact must not promote the whole strategy or change model judgment');
  const invalid = structuredClone(synthesis);
  invalid.answers[0].quantitativeEvidence = [
    { ...cited, path: 'nativeActionEvidence[0].nativeEvents[0].unobservedCost' },
    { ...cited, receiptRef: 'f'.repeat(64) },
  ];
  const rejected = qualifyRosterTeachFrameworkSynthesisV1({ synthesis: invalid, evidence });
  assert(rejected.answers[0].quantitativeEvidence.every(e => e.status === 'unknown'));
  report.checks.push('missing_paths_and_other_receipt_ids_remain_unknown');
  assert.equal(hash({ answer, evidence }), before);
  assert.equal(payment.sourceReceipt.provenArrivalHistory, false);
  report.checks.push('no_source_mutation_no_arrival_or_strategy_promotion');
  report.sourceReceiptHash = payment.sourceReceipt.receiptHash;
  report.ok = true;
} catch (error) {
  report.ok = false; report.failure = error.message; process.exitCode = 1;
}
await fs.writeFile(reportPath, JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify(report));
