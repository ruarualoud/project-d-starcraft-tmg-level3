// Reproduce the actual v200 evidenceBindingVersion=3 cache leaking a false
// unknown into Plan revision after the numeric reader itself was fixed.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createRosterRevisionTeachEvidenceV1 }
  from '../packages/roster-strategist/roster-revision-teach-evidence-v1.mjs';
import * as teach from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const [draftPath, reportPath] = process.argv.slice(2);
const d = JSON.parse(await fs.readFile(draftPath, 'utf8'));
const s = d.teachFramework.state, id = 'q-timing-synergy-enabling-order';
const sourceEvidence = d.teachFramework.context.existingEvidence || [];
const report = { providerCalls: 0, nativeCalls: 0, sourceDraftWrites: 0, checks: [] };
const started = Date.now();
try {
  const saved = s.synthesis.answers.find(a => a.questionId === id);
  assert.equal(s.evidenceBindingVersion, 3);
  assert.equal(saved.quantitativeEvidence[0].status, 'unknown');
  const before = hash(s);
  const view = createRosterRevisionTeachEvidenceV1(s, sourceEvidence);
  const current = view.experience.synthesis.answers.find(a => a.questionId === id);
  assert.equal(current.quantitativeEvidence[0].status, 'receipt_bound',
    'Plan revision still reads the old raw-only cached binding instead of the current same-receipt reader');
  assert.equal(current.quantitativeEvidence[0].value, 1);
  assert.equal(current.quantitativeEvidence[1].status, 'unknown');
  assert(current.quantitativeEvidence[1].pathRepair);
  assert.equal(current.disposition, saved.disposition);
  assert.equal(view.experience.evidenceBindingVersion, teach.ROSTER_TEACH_EVIDENCE_BINDING_VERSION);
  assert(view.experience.evidenceBindingRefresh);
  assert.equal(hash(s), before, 'Read-only Plan projection may not mutate the saved draft');
  report.checks.push('real_B_plan_consumer_receives_current_bound_payment_and_local_unknown_feedback');
  const binding = teach.deriveRosterTeachSavedEvidenceBindingV1(s, sourceEvidence);
  assert.equal(binding.refreshed, true);
  assert.equal(hash(binding.synthesis), hash(view.experience.synthesis));
  const upgraded = { ...s, synthesis: binding.synthesis, evidenceBindingVersion: binding.evidenceBindingVersion };
  assert.equal(teach.deriveRosterTeachSavedEvidenceBindingV1(upgraded, sourceEvidence).refreshed, false);
  const absent = { ...s, synthesisRaw: undefined };
  assert.equal(teach.deriveRosterTeachSavedEvidenceBindingV1(absent, sourceEvidence).refreshed, false);
  report.checks.push('shared_workbench_derivation_idempotent_missing_raw_not_invented');
  const oldPath = `synthesis.answers.${s.synthesis.answers.findIndex(a => a.questionId === id)}.quantitativeEvidence.0.status`;
  const history = view.read({ receiptHash: view.experience.archiveReference.receiptHash, path: oldPath });
  assert.equal(history.result.value, 'unknown');
  assert.equal(view.receipt().rawSynthesisPreserved, true);
  report.checks.push('old_qualified_history_still_readable_current_view_not_a_new_model_answer');
  report.elapsedMs = Date.now() - started;
  report.ok = true;
} catch (error) { report.ok = false; report.failure = error.message; process.exitCode = 1; }
await fs.writeFile(reportPath, JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify(report));
