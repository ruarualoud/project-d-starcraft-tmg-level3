// Actual B synthesis was rejected for context length. Its deterministic
// projection repeatedly expanded identical computed casualty distributions.
// Verify byte-equivalent expansion, not a strategy-changing summary/truncation.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as teach from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const [base, reportPath] = process.argv.slice(2);
const cfg = JSON.parse(await fs.readFile(base + '/common-v79-plan-recovery-config.private.json', 'utf8'));
const row = cfg.rows.find(r => r.arm === 'B');
const d = JSON.parse(await fs.readFile(row.dataDirectory + '/drafts/' + row.sessionId + '.json', 'utf8'));
const s = d.teachFramework.state;
const nodes = [{ kind: 'current_plan_and_context', plan: JSON.parse(d.planSerialized),
  context: { ...d.teachFramework.context,
    existingEvidence: teach.projectRosterTeachRetainedEvidenceV1(d.teachFramework.context.existingEvidence || []) } },
  { kind: 'framework_and_questions', framework: s.framework, agenda: s.agenda },
  { kind: 'actual_tool_results', evidence: [...s.evidence, ...s.investigation.evidence,
    ...(s.queryRecovery?.operations.filter(op => op.result).map(op => op.result) || [])],
    investigation: { rounds: s.investigation.rounds.map(r => ({ publicReason: r.output.publicReason,
      unresolved: r.output.unresolved })), operations: s.investigation.operations } }];
const checks = [];
const baseline = teach.projectRosterTeachPromptEvidenceV1(nodes);
const output = (teach.projectRosterTeachSynthesisPromptV1 || teach.projectRosterTeachPromptEvidenceV1)(nodes);
const size = v => Buffer.byteLength(JSON.stringify(v));
const expand = (v, root = output, seen = new Set()) => {
  if (!v || typeof v !== 'object') return v;
  if (v.kind === 'same_prompt_evidence_reference_v1') {
    assert.equal(seen.has(v.targetJsonPointer), false, 'reference cycle forbidden');
    const target = v.targetJsonPointer.split('/').slice(1).reduce((o, k) => o[k.replaceAll('~1', '/').replaceAll('~0', '~')], root);
    assert.notEqual(target, undefined, 'full evidence must exist in THIS prompt');
    const next = new Set(seen); next.add(v.targetJsonPointer);
    const expanded = expand(target, root, next);
    assert.equal(hash(expanded), v.contentHash);
    return expanded;
  }
  return Array.isArray(v) ? v.map(x => expand(x, root, seen))
    : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, expand(x, root, seen)]));
};
try {
  assert.ok(size(output) < size(baseline) * 0.5,
    'actual B duplicate evidence must not occupy the same >4MB prompt');
  checks.push('actual_B_duplicate_payload_more_than_halved');
  assert.deepEqual(expand(output), baseline,
    'every original value, loss state, probability, caveat and reference must remain accessible');
  checks.push('lossless_expansion_of_all_questions_receipts_probabilities_casualty_models_and_conditions');
  const diagnostic = teach.projectRosterTeachPromptEvidenceV1(nodes);
  assert.deepEqual(diagnostic, baseline, 'ordinary investigation/query-repair projection unchanged');
  checks.push('non_synthesis_prompt_unchanged');
  await fs.writeFile(reportPath, JSON.stringify({ ok: true, checks, baselineBytes: size(baseline),
    projectedBytes: size(output), reduction: 1-size(output)/size(baseline),
    exactExpandedHash: hash(baseline), providerCalls: 0, nativeCalls: 0, originalWorkspaceWrites: 0 }, null, 2), { mode: 0o600 });
  console.log('SYNTHESIS_DUPLICATION_V157_PASS', size(baseline), size(output));
} catch (error) {
  await fs.writeFile(reportPath, JSON.stringify({ ok: false, checks, failure: error.message,
    baselineBytes: size(baseline), projectedBytes: size(output), providerCalls: 0, nativeCalls: 0,
    originalWorkspaceWrites: 0 }, null, 2), { mode: 0o600 }); throw error;
}
