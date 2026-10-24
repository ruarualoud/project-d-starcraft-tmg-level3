// Concrete v210 HTTP400 context overflow. Capture the actual B revision input;
// red saves its projected evidence, green must reconstruct it byte-for-byte.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { gzipSync, gunzipSync } from 'node:zlib';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createRosterStrategistRuntimeV1 } from '../packages/roster-strategist/roster-strategist-runtime-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
const [base, mode] = process.argv.slice(2);
assert(['red', 'red-corrected', 'green'].includes(mode));
const reportPath = base + '/common-v211-revision-duplication-' + mode + '.private.json';
const reservation = await fs.open(reportPath, 'wx', 0o600); await reservation.close();
const report = { providerCalls: 0, nativeCalls: 0, sourceWrites: 0, checks: [] };
const started = Date.now();
try {
  const cfg = JSON.parse(await fs.readFile(base + '/common-v79-plan-recovery-config.private.json', 'utf8'));
  const row = cfg.rows.find(r => r.arm === 'B');
  const file = row.dataDirectory + '/drafts/' + row.sessionId + '.json';
  const original = await fs.readFile(file, 'utf8'), draft = JSON.parse(original);
  const plan = JSON.parse(draft.planSerialized), experience = draft.teachFramework.state;
  assert.equal(plan.planVersion, 19);
  assert.equal(draft.providerDispatches.at(-1).rejection.contextLengthExceeded, true);
  const request = JSON.parse(await fs.readFile(base + '/B/v210-plan-revision-request.private.json', 'utf8'));
  const state = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/native-movement-fixture.private.json', 'utf8')).state;
  function freeze(value) { if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value); } return value; }
  const builder = createOfficialArmyBuilderQueryPortV1({ unitCompositionUpgradeDataBundle: freeze(state.officialUnitCompositionUpgradeDataBundle) });
  const laboratory = createPregameSceneLaboratoryV1({ sourceState: state, armyBuilderPort: builder,
    rulesRuntime: { descriptor: { runtimeHash: 'a'.repeat(64) },
      enumerate() { throw Error('NO_NATIVE'); }, instantiate() { throw Error('NO_NATIVE'); }, apply() { throw Error('NO_NATIVE'); } } });
  const strategist = createRosterStrategistRuntimeV1({ armyBuilderPort: builder, laboratory,
    strategyPack: { foundational: { entries: Array.from({ length: 5 }, () => ({})) }, receipt: { hash: 'b'.repeat(64) } },
    selectionUnitRules: draft.teachFramework.context.sourceFacts.selectionUnitRules });
  const baselinePath = base + '/common-v211-original-revision-evidence.private.json.gz';
  let captured = false;
  await strategist.reviseRosterPlan({ ...request, plan,
    armyAudit: draft.working.verdict.audit, missionProfile: laboratory.missionScoringAuthority().missionScoringProfile,
    toolReceipts: draft.toolReceipts, teachFrameworkExperience: experience,
    finalPlanReview: draft.planReview,
  }, { deliberation: {
    descriptor: () => ({ modelVersion: 'zero_provider_v211', promptVersion: 'v210_actual_repro' }),
    async deliberate(input) {
      captured = true;
      const node = input.promptNodes.find(n => n.nodeType === 'teach-framework-experience');
      const projected = node.content.experience;
      report.promptBytes = Buffer.byteLength(JSON.stringify(input));
      report.evidenceBytes = Buffer.byteLength(JSON.stringify(projected.evidence));
      report.nodeBytes = Object.fromEntries(input.promptNodes.map(n => [n.nodeType, Buffer.byteLength(JSON.stringify(n))]));
      if (mode === 'red') await fs.writeFile(baselinePath, gzipSync(JSON.stringify(projected.evidence)), { flag: 'wx', mode: 0o600 });
      const originalEvidence = JSON.parse(gunzipSync(await fs.readFile(baselinePath)));
      const pointer = p => p === '' ? projected.evidence : p.slice(1).split('/').reduce((value, k) => value[k.replaceAll('~1', '/').replaceAll('~0', '~')], projected.evidence);
      let references = 0;
      function expand(value, chain = new Set()) {
        if (!value || typeof value !== 'object') return value;
        if (value.kind === 'same_prompt_evidence_reference_v1') {
          assert(!chain.has(value.targetJsonPointer), 'reference cycle'); references++;
          const result = expand(pointer(value.targetJsonPointer), new Set([...chain, value.targetJsonPointer]));
          assert.equal(hash(result), value.contentHash, 'reference must reconstruct its exact original');
          return result;
        }
        return Array.isArray(value) ? value.map(v => expand(v, chain)) : Object.fromEntries(Object.entries(value).map(([k, v]) => [k, expand(v, chain)]));
      }
      assert.equal(hash(JSON.parse(JSON.stringify(expand(projected.evidence)))), hash(originalEvidence),
        'no lost transmitted number, condition, failure or unique outcome');
      report.references = references;
      report.originalEvidenceBytes = Buffer.byteLength(JSON.stringify(originalEvidence));
      assert(report.evidenceBytes < report.originalEvidenceBytes * 0.5,
        'actual revision still expands repeated outcomes: reduce this exact input by >50% without dropping any evidence');
      assert.deepEqual(projected.synthesis, experience.synthesis);
      assert.deepEqual(projected.agenda, experience.agenda);
      assert.deepEqual(projected.framework, experience.framework);
      assert(projected.evidenceReferenceScope.includes('experience.evidence'));
      report.checks.push('actual_B_revision_same_prompt_references_expand_to_identical_pre_fix_evidence', 'all_current_questions_framework_and_synthesis_unchanged');
      throw Error('CAPTURE_COMPLETE_NO_PROVIDER');
    },
  } }).catch(error => { if (error.message !== 'CAPTURE_COMPLETE_NO_PROVIDER') throw error; });
  assert(captured);
  assert.equal(await fs.readFile(file, 'utf8'), original);
  assert(laboratory.proveMutationZero().sourceStateHashUnchanged);
  report.checks.push('original_draft_and_rules_state_unchanged_zero_provider');
  report.ok = true;
} catch (error) { report.ok = false; report.failure = error.message.slice(0, 1500); process.exitCode = 1; }
report.elapsedMs = Date.now() - started;
await fs.writeFile(reportPath, JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify(report));
