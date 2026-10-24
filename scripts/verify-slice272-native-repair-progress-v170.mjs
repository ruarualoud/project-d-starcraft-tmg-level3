import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as recovery from '../packages/roster-strategist/roster-teach-query-recovery-v1.mjs';
const [base, output] = process.argv.slice(2);
const report = { checks: [], providerCalls: 0, nativeActions: 0, sourceDraftWrites: 0 };
try {
  const b = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/roster-deliberation-live-v43/workspace/drafts/rws-6c164d9d-406a-425a-9f83-688bbe629226.json'));
  const op = structuredClone(b.teachFramework.state.queryRecovery.operations.find(o => o.originalQueryId === 'query-r3-5af92593ef8720ed363eaabc'));
  assert.equal(op.result.sourceReceipt.hypotheticalPlacementAssessment.units.filter(u => u.resultStatus === 'ok').length, 1);
  const previous = structuredClone(op), advance = recovery.continueRosterTeachNativeGeometryProgressV1 || (() => false);
  assert.equal(advance(op), true, 'Actual Native 3-to-2 unresolved geometry progress must continue the same bounded repair');
  assert.equal(op.maximumAttempts, previous.maximumAttempts + 1);
  assert.equal(op.completed, false);
  assert.equal(op.currentFailure.receiptHash, previous.result.receiptHash);
  assert.deepEqual(op.choices, previous.choices);
  assert.equal(advance(op), false, 'Same receipt must not grant twice');
  const unchanged = structuredClone(previous);
  unchanged.result = structuredClone(unchanged.currentFailure);
  assert.equal(advance(unchanged), false);
  assert.equal(unchanged.maximumAttempts, previous.maximumAttempts);
  const invented = structuredClone(previous);
  invented.result.sourceReceipt.hypotheticalPlacementAssessment.units.find(u => u.resultStatus === 'ok').resultStatus = 'unknown';
  assert.equal(advance(invented), false, 'Model selection alone is not progress without Native success');
  report.checks.push('actual_B_native_geometry_progress_continues_once_history_and_nonprogress_bound_preserved');
  const a = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/plan-production-v31/A/workspace/drafts/rws-1b0a31ec-fd74-433b-8531-4a2ce7019535.json'));
  const old = a.teachFramework.state.queryRecovery.operations.find(o => o.originalQueryId === 'query-r3-ec8e48f0a9f55fb3da921596');
  const normalized = recovery.normalizeRosterTeachSavedRecoveryRequestV1?.(old.request);
  assert(normalized?.normalization?.redundantEnvelopeRemoved);
  assert.deepEqual(normalized.request.toolRequest, old.request.toolRequest.toolRequest);
  assert.deepEqual(old.request.toolRequest.kind, 'scenario');
  assert.throws(() => recovery.normalizeRosterTeachSavedRecoveryRequestV1({ ...old.request,
    toolRequest: { ...old.request.toolRequest, unexpected: true } }), /ENVELOPE_CONFLICT/);
  report.checks.push('actual_A_saved_double_envelope_uses_existing_lossless_decoder_ambiguous_siblings_rejected');
  report.ok = true;
} catch (error) { report.ok = false; report.failure = error.message; process.exitCode = 1; }
await fs.writeFile(output, JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify(report));
