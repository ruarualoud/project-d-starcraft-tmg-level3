// Concrete v205 regression: two probability objects and one categorical result
// were incorrectly reported as missing numeric evidence by the Plan consumer.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as teach from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
import { createRosterRevisionTeachEvidenceV1 }
  from '../packages/roster-strategist/roster-revision-teach-evidence-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';

const [draftPath, reportPath] = process.argv.slice(2);
const draft = JSON.parse(await fs.readFile(draftPath, 'utf8'));
const state = draft.teachFramework.state;
const source = draft.teachFramework.context.existingEvidence || [];
const report = { providerCalls: 0, nativeCalls: 0, sourceDraftWrites: 0, checks: [], failures: [] };
const started = Date.now();
const check = (name, fn) => {
  try { fn(); report.checks.push(name); }
  catch (error) { report.failures.push({ name, message: error.message }); }
};
try {
  const before = hash(state), rawBefore = hash(state.synthesisRaw);
  const view = createRosterRevisionTeachEvidenceV1(state, source);
  const synthesis = view.experience.synthesis;
  const capability = synthesis.answers.find(a => a.questionId === 'q-capability-demand-named-opponent-action');
  const robustness = synthesis.answers.find(a => a.questionId === 'q-robustness-predeclared-replacement');
  check('actual_two_probability_containers_are_typed_numeric_bindings', () => {
    assert.equal(capability.quantitativeEvidence.length, 2);
    for (const row of capability.quantitativeEvidence) {
      assert.equal(row.status, 'receipt_bound', 'Saved probability result exists but Plan sees unknown');
      assert.equal(row.valueType, 'probability_estimate');
      assert.equal(typeof row.value, 'number');
      assert.equal(row.typedValues[0].sourceValue.value, row.value);
      assert.equal(row.typedValues[0].resolvedPath, row.path + '.value');
      assert(row.typedValues[0].sourceValue.uncertainty95);
    }
  });
  check('actual_control_string_is_qualitative_not_numeric_unknown', () => {
    assert.equal(robustness.quantitativeEvidence.length, 0);
    assert.equal(robustness.qualitativeEvidence.length, 1);
    const row = robustness.qualitativeEvidence[0];
    assert.equal(row.status, 'receipt_bound');
    assert.equal(row.valueType, 'string');
    assert.equal(row.value, 'no_contest_sticky_control');
    assert.equal(row.citationPlacement.from, 'quantitativeEvidence');
    assert.equal(row.interpretation, state.synthesisRaw.answers.find(a => a.questionId === robustness.questionId)
      .quantitativeEvidence[0].interpretation, 'Binding must not silently rewrite strategy');
    assert.equal(row.interpretationVerified, false);
  });
  if (report.failures.length) throw Error('ACTUAL_V205_TYPED_EVIDENCE_REPRODUCED');

  const derived = teach.deriveRosterTeachSavedEvidenceBindingV1(state, source);
  check('shared_binding_plan_consumer_and_original_public_history', () => {
    assert.equal(hash(derived.synthesis), hash(synthesis));
    assert.equal(hash(state), before);
    assert.equal(hash(state.synthesisRaw), rawBefore);
    assert.equal(view.experience.evidenceBindingVersion, teach.ROSTER_TEACH_EVIDENCE_BINDING_VERSION);
    assert.equal(teach.deriveRosterTeachSavedEvidenceBindingV1({ ...state, synthesis,
      evidenceBindingVersion: teach.ROSTER_TEACH_EVIDENCE_BINDING_VERSION }, source).refreshed, false);
    for (const answer of synthesis.answers) {
      const raw = state.synthesisRaw.answers.find(a => a.questionId === answer.questionId);
      assert.equal(answer.disposition, raw.disposition);
      assert.equal(answer.publicReason, raw.publicReason);
    }
    const index = state.synthesis.answers.findIndex(a => a.questionId === capability.questionId);
    assert.equal(view.read({ receiptHash: view.experience.archiveReference.receiptHash,
      path: `synthesis.answers.${index}.quantitativeEvidence.0.status` }).result.value, 'unknown');
  });

  // The same seam must not guess arbitrary object members, coerce strings or
  // mix a known numeric value with an unknown member selected by a wildcard.
  const id = 'typed-evidence-regression', receiptHash = 'a'.repeat(64);
  const probability = { value: 0.25, percent: 25, successes: 1, denominator: 4,
    uncertainty95: { low: 0.1, high: 0.7 } };
  const receipt = { receiptHash, questionId: id, status: 'advisory', requestKind: 'math',
    result: { probability, text: '0.25', boolean: false, arbitrary: { value: 0.25 },
      mixed: [1, { missing: true }], zero: 0, marker: { result: 'no_contest_sticky_control',
        previousControlSideKey: null, nextControlSideKey: null } } };
  const reference = path => ({ receiptRef: receiptHash, path, interpretation: 'Captured type regression, no strategic assertion.' });
  const raw = { answers: [{ questionId: id, disposition: 'revise', evidenceRefs: [receiptHash],
    publicReason: 'conditional', tradeoff: 'unspecified', replanTrigger: 'inspect real state',
    quantitativeEvidence: ['result.probability', 'result.text', 'result.boolean', 'result.arbitrary',
      'result.mixed.*', 'result.zero', 'result.missing'].map(reference),
    qualitativeEvidence: [reference('result.marker.result')] }], proposedPlanChanges: [],
    proposedRosterChanges: [], frameworkFeedback: [] };
  const qualified = teach.qualifyRosterTeachFrameworkSynthesisV1({ synthesis: raw, evidence: [receipt] }).answers[0];
  check('typed_contract_is_noncoercing_and_preserves_unknowns_and_zero', () => {
    const byPath = new Map([...qualified.quantitativeEvidence, ...qualified.qualitativeEvidence].map(row => [row.path, row]));
    assert.equal(byPath.get('result.probability').value, 0.25);
    assert.equal(byPath.get('result.text').value, '0.25');
    assert.equal(byPath.get('result.text').valueType, 'string');
    assert.equal(byPath.get('result.boolean').value, false);
    assert.equal(byPath.get('result.zero').value, 0);
    for (const path of ['result.arbitrary', 'result.mixed.*', 'result.missing']) {
      assert.equal(byPath.get(path).status, 'unknown', path);
      assert(byPath.get(path).pathRepair);
    }
    assert.equal(byPath.get('result.arbitrary').pathRepair.code, 'ROSTER_TEACH_EVIDENCE_VALUE_TYPE_UNSUPPORTED');
    assert.equal(byPath.get('result.missing').pathRepair.code, 'ROSTER_TEACH_EVIDENCE_PATH_NOT_FOUND');
    assert.equal(byPath.get('result.marker.result').value, 'no_contest_sticky_control');
  });
  check('failed_receipts_and_wrong_references_cannot_acquire_bound_values', () => {
    const failed = teach.qualifyRosterTeachFrameworkSynthesisV1({ synthesis: raw,
      evidence: [{ ...receipt, resultStatus: 'unknown' }] }).answers[0];
    assert([...failed.quantitativeEvidence, ...failed.qualitativeEvidence].every(row => row.status === 'unknown'));
    const wrong = structuredClone(raw); wrong.answers[0].quantitativeEvidence = [reference('result.zero')];
    wrong.answers[0].quantitativeEvidence[0].receiptRef = 'b'.repeat(64);
    assert.equal(teach.qualifyRosterTeachFrameworkSynthesisV1({ synthesis: wrong,
      evidence: [receipt] }).answers[0].quantitativeEvidence[0].status, 'unknown');
  });
  check('future_provider_contract_supports_qualitative_citations', () => {
    const contract = teach.rosterTeachFrameworkContractV1('teach_framework_synthesis');
    const output = { schemaVersion: 'starcraft_tmg_teach_framework_generation_v1',
      roundKind: 'teach_framework_synthesis', ...raw };
    assert.equal(teach.inspectRosterTeachPublicOutputV1(contract, output).validation.ok, true);
    assert(contract.providerSchema.properties.answers.items.properties.qualitativeEvidence);
  });
  report.current = { quantitative: synthesis.answers.flatMap(a => a.quantitativeEvidence).length,
    qualitative: synthesis.answers.flatMap(a => a.qualitativeEvidence).length,
    unknown: synthesis.answers.flatMap(a => [...a.quantitativeEvidence, ...a.qualitativeEvidence])
      .filter(row => row.status === 'unknown').length,
    probabilityValues: capability.quantitativeEvidence.map(row => row.value),
    qualitativeValue: robustness.qualitativeEvidence[0].value };
} catch (error) { report.terminalMessage = error.message; }
report.elapsedMs = Date.now() - started;
report.ok = report.failures.length === 0 && !report.terminalMessage;
if (!report.ok) process.exitCode = 1;
await fs.writeFile(reportPath, JSON.stringify(report, null, 2), { mode: 0o600, flag: 'wx' });
console.log(JSON.stringify(report));
