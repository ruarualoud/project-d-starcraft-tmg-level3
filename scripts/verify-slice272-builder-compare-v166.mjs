import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { createRosterTeachEvidencePortV1 } from '../packages/roster-strategist/roster-teach-evidence-port-v1.mjs';
const [base, output] = process.argv.slice(2);
const report = { checks: [], providerCalls: 0, nativeActions: 0, sourceDraftWrites: 0 };
try {
  const d = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/plan-production-v31/A/workspace/drafts/rws-1b0a31ec-fd74-433b-8531-4a2ce7019535.json', 'utf8'));
  const original = structuredClone(d.selectedCandidateInput || d.lockedRoster);
  const alternative = structuredClone(original);
  assert(alternative.units[0].upgrades.length > 0);
  alternative.units[0].upgrades.pop();
  const source = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/native-movement-fixture.private.json', 'utf8')).state;
  const freeze = value => { if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
  const builder = createOfficialArmyBuilderQueryPortV1({ unitCompositionUpgradeDataBundle: freeze(source.officialUnitCompositionUpgradeDataBundle) });
  const lab = createPregameSceneLaboratoryV1({ sourceState: source, armyBuilderPort: builder,
    rulesRuntime: { descriptor: { runtimeHash: 'a'.repeat(64) }, enumerate: () => ({ candidates: [], parameterDomains: [] }),
      instantiate: () => { throw Error('NO_ACTION'); }, apply: () => { throw Error('NO_APPLY'); } } });
  const port = createRosterTeachEvidencePortV1(lab);
  const candidates = [{ candidateRef: 'unchanged-selected', candidateInput: original },
    { candidateRef: 'model-hypothetical-upgrade-removal', candidateInput: alternative }];
  const expected = lab.compareCandidatesSameState({ comparisonId: 'direct-native-builder', candidates });
  const receipt = await port.query({ mutationAuthority: false, initialFoundationHash: 'b'.repeat(64), sourceHashes: ['c'.repeat(64)],
    challengeId: 'actual-selected-opportunity-cost', request: { kind: 'math', toolRequest: {
      mathKind: 'builder_candidate_comparison', argumentsJson: JSON.stringify({ candidates }) } } });
  assert.equal(receipt.status, 'advisory', 'Teach must expose the already working official Builder comparison rather than strand the actual selected-roster opportunity-cost question');
  assert.deepEqual(receipt.sourceReceipt.candidates, expected.candidates);
  assert.equal(receipt.sourceReceipt.candidates[0].mineralSpent, 2000);
  assert.equal(receipt.sourceReceipt.ranking, null);
  assert.equal(receipt.sourceReceipt.legalityAuthority, 'rules_owned_army_builder_port_only');
  assert(lab.describeQueryContext().capabilities.builderCandidateComparison);
  assert(lab.proveMutationZero().sourceStateHashUnchanged);
  assert.deepEqual(d.selectedCandidateInput || d.lockedRoster, original);
  report.checks.push('actual_A_selected_roster_native_candidate_comparison_exposed_to_Teach_no_plan_edit_no_host_ranking');
  report.ok = true;
} catch (error) { report.ok = false; report.failure = error.message; process.exitCode = 1; }
await fs.writeFile(output, JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify(report));
