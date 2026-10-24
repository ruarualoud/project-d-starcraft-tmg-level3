// Actual v200 control citation names a missing wrapper path. It must receive
// local same-receipt repair context, not silently become an unexplained unknown.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { qualifyRosterTeachFrameworkSynthesisV1 }
  from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
const [draftPath, reportPath] = process.argv.slice(2);
const d = JSON.parse(await fs.readFile(draftPath, 'utf8'));
const s = d.teachFramework.state;
const report = { providerCalls: 0, nativeCalls: 0, sourceDraftWrites: 0, checks: [] };
try {
  const evidence = [...s.evidence, ...s.investigation.evidence,
    ...(s.queryRecovery?.operations.filter(o => o.result).map(o => o.result) || [])];
  const result = qualifyRosterTeachFrameworkSynthesisV1({ synthesis: s.synthesisRaw, evidence });
  const answer = result.answers.find(a => a.questionId === 'q-timing-synergy-enabling-order');
  const item = answer.quantitativeEvidence[1];
  assert.equal(item.status, 'unknown');
  assert.equal(item.path, 'sourceReceipt.result.markerResults[1].supplyTotals.player1');
  assert(item.pathRepair, 'An invalid delivered numeric reference needs explicit same-receipt repair feedback');
  assert.equal(item.pathRepair.rawStructure.resolvedPath, 'sourceReceipt');
  assert.equal(item.pathRepair.rawStructure.missingSegment, 'result');
  const wrapper = item.pathRepair.rawStructure.availableFields.find(f => f.key === 'queryReceipt');
  assert(wrapper.childKeys.includes('result'));
  assert.equal(item.pathRepair.requiresNativeReexecution, false);
  assert.equal(item.pathRepair.automaticallySelectedReplacement, false);
  assert.equal(answer.disposition, s.synthesisRaw.answers.find(a => a.questionId === answer.questionId).disposition);
  report.checks.push('real_missing_wrapper_returns_actual_structure_without_guess_or_promotion');
  const invalid = structuredClone(s.synthesisRaw);
  const row = invalid.answers.find(a => a.questionId === answer.questionId);
  row.quantitativeEvidence = [{ ...row.quantitativeEvidence[1], receiptRef: 'f'.repeat(64) }];
  const unknown = qualifyRosterTeachFrameworkSynthesisV1({ synthesis: invalid, evidence }).answers
    .find(a => a.questionId === answer.questionId).quantitativeEvidence[0];
  assert.equal(unknown.pathRepair.code, 'ROSTER_TEACH_NUMERIC_RECEIPT_UNKNOWN');
  assert.equal(unknown.pathRepair.rawStructure, null);
  report.checks.push('unknown_receipt_does_not_borrow_another_receipts_shape');
  report.ok = true;
} catch (error) { report.ok = false; report.failure = error.message; process.exitCode = 1; }
await fs.writeFile(reportPath, JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify(report));
