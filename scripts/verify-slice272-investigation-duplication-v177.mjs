import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as teach from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const [base, reportPath] = process.argv.slice(2);
const report = { checks: [], providerCalls: 0, nativeCalls: 0, originalWorkspaceWrites: 0 };
try {
  const d = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/roster-deliberation-live-v43/workspace/drafts/rws-6c164d9d-406a-425a-9f83-688bbe629226.json'));
  const s = d.teachFramework.state;
  assert(d.providerDispatches.some(x => x.roundKind === 'teach_framework_investigate' && x.rejection?.contextLengthExceeded));
  const nodes = [{ kind: 'frozen_plan_and_method', plan: JSON.parse(d.planSerialized), framework: s.framework,
    context: { ...d.teachFramework.context, selectedRosterReference: { candidateInput: d.selectedCandidateInput },
      existingEvidence: teach.projectRosterTeachRetainedEvidenceV1(d.teachFramework.context.existingEvidence || []) } },
  { kind: 'latest_completed_teach_findings', synthesis: s.synthesis,
    recoveredQueries: s.queryRecovery.operations.map(o => ({ questionId: o.questionId,
      queryId: o.queryId, request: o.request, result: o.result || o.currentFailure })) },
  { kind: 'questions_and_results', agenda: s.agenda, evidence: s.evidence,
    investigation: { rounds: s.investigation.rounds, evidence: s.investigation.evidence, operations: s.investigation.operations } }];
  const baseline = teach.projectRosterTeachPromptEvidenceV1(nodes);
  const projected = teach.projectRosterTeachRolePromptV1
    ? teach.projectRosterTeachRolePromptV1('teach_framework_investigate', nodes)
    : teach.projectRosterTeachPromptEvidenceV1(nodes);
  report.baselineBytes = Buffer.byteLength(JSON.stringify(baseline));
  report.projectedBytes = Buffer.byteLength(JSON.stringify(projected));
  assert(report.projectedBytes < report.baselineBytes, 'The rejected investigation role must use the shared lossless deduplication, not the unchanged repeated payload');
  function expand(value, seen = new Set()) {
    if (!value || typeof value !== 'object') return value;
    if (value.kind === 'same_prompt_evidence_reference_v1') {
      assert(!seen.has(value.targetJsonPointer));
      const target = value.targetJsonPointer.split('/').slice(1).reduce((node, key) => node[key.replaceAll('~1', '/').replaceAll('~0', '~')], projected);
      assert.notEqual(target, undefined);
      const output = expand(target, new Set([...seen, value.targetJsonPointer]));
      assert.equal(hash(output), value.contentHash);
      return output;
    }
    return Array.isArray(value) ? value.map(v => expand(v, seen))
      : Object.fromEntries(Object.entries(value).map(([key, v]) => [key, expand(v, seen)]));
  }
  assert.deepEqual(expand(projected), baseline);
  report.checks.push('actual_rejected_B_investigation_uses_same_prompt_references_with_exact_full_value_reconstruction');
  report.reduction = 1 - report.projectedBytes / report.baselineBytes;
  report.ok = true;
} catch (error) { report.ok = false; report.failure = error.message; process.exitCode = 1; }
await fs.writeFile(reportPath, JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify(report));
