import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as framework from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
const [base, output] = process.argv.slice(2);
const report = { checks: [], providerCalls: 0, nativeActions: 0, sourceDraftWrites: 0 };
try {
  const d = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/roster-deliberation-live-v43/workspace/drafts/rws-6c164d9d-406a-425a-9f83-688bbe629226.json'));
  const old = d.failedProviderOutputs.at(-1);
  assert.equal(old.providerIncompleteReason, 'max_output_tokens');
  assert.throws(() => JSON.parse(old.rawText));
  const recover = framework.rosterTeachIncompleteQueryRecoveryV1 || (() => null);
  const recovery = recover({ kind: old.roundKind, baseContextHash: old.contextHash, records: [old] });
  assert(recovery, 'Known max-output truncation of a readonly query needs one bounded completion recovery');
  assert.equal(recovery.maximumRetries, 1);
  assert.equal(recovery.originalRawTextHash, old.rawTextHash);
  assert.equal(recovery.partialArgumentsAccepted, false);
  assert.equal(recovery.historyOrUsageReset, false);
  assert(!JSON.stringify(recovery).includes(old.rawText.slice(-200)), 'Repeated truncated body must not be injected into retry prompt');
  assert.equal(recover({ kind: 'teach_framework_synthesis', baseContextHash: old.contextHash, records: [old] }), null);
  assert.equal(recover({ kind: old.roundKind, baseContextHash: 'f'.repeat(64), records: [old] }), null);
  assert.equal(recover({ kind: old.roundKind, baseContextHash: old.contextHash,
    records: [{ ...old, providerIncompleteReason: 'network' }] }), null);
  report.checks.push('actual_truncated_B_query_gets_one_exact_context_completion_recovery_no_partial_parse_no_old_loop_text_no_network_or_other_role_retry');
  report.ok = true;
} catch (error) { report.ok = false; report.failure = error.message; process.exitCode = 1; }
await fs.writeFile(output, JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify(report));
