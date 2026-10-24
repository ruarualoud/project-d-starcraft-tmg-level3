import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as framework from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
const [base, output] = process.argv.slice(2);
const d = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/plan-production-v31/A/workspace/drafts/rws-1b0a31ec-fd74-433b-8531-4a2ce7019535.json'));
const report = { providerCalls: 0, nativeQueryExecutions: 0, sourceDraftWrites: 0 };
try {
  const state = d.teachFramework.state;
  const pending = state.replyCorrections.findLast(r => r.status === 'pending' && r.kind === 'teach_framework_investigate');
  const output = pending.correction.previousOutput;
  const ids = state.investigation.dependencyContinuation.questionIds;
  framework.validateRosterTeachInvestigationProgressV1(output, state, ids);
  const q = output.queries.find(q => JSON.parse(q.toolRequestJson).queryKind === 'map.inspect');
  const prior = state.investigation.evidence.find(e => e.challengeId === 'q2-map-inspect-terrain-and-markers-native-spatial');
  const request = { kind: q.kind, toolRequest: JSON.parse(q.toolRequestJson) };
  const cached = framework.reuseRosterTeachReadOnlyEvidenceV1({ earlier: prior, request,
    queryId: q.queryId, questionId: q.questionId, currentDescriptorHash: prior.evidencePortDescriptorHash });
  assert(cached);
  assert.deepEqual(cached.sourceReceipt, prior.sourceReceipt);
  assert.equal(cached.cachedSourceReceiptHash, prior.receiptHash);
  assert.equal(cached.queryNotExecuted, true);
  assert.equal(framework.reuseRosterTeachReadOnlyEvidenceV1({ earlier: prior, request,
    queryId: q.queryId, questionId: q.questionId, currentDescriptorHash: 'changed' }), null);
  assert.equal(framework.reuseRosterTeachReadOnlyEvidenceV1({ earlier: prior,
    request: { kind: 'scenario', toolRequest: {} }, currentDescriptorHash: prior.evidencePortDescriptorHash }), null);
  report.ok = true;
} catch (error) { report.ok = false; report.failure = error.message; process.exitCode = 1; }
await fs.writeFile(output, JSON.stringify(report, null, 2), { mode: 0o600 }); console.log(JSON.stringify(report));
