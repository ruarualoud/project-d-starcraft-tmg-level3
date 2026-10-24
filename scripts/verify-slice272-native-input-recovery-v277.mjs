// Actual C corrections cleared a missing branch and emitted an empty domain.
// Native correctly rejected them, but omitted its typed repair contract.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from './support/official-development-tranche-source-lock-fixture-v1.mjs';
import { createOfficialUnitCompositionUpgradeDataBundleV1 } from '../packages/source-data/official-unit-composition-upgrade-data-bundle-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import { createRosterTeachEvidencePortV1, reprojectRosterTeachNativeQueryRepairV1 } from '../packages/roster-strategist/roster-teach-evidence-port-v1.mjs';
import { hasRosterTeachCorrectableContinuationV1 } from '../packages/roster-strategist/roster-teach-query-recovery-v1.mjs';
const [base, mode = 'new_input'] = process.argv.slice(2);
assert(['new_input', 'retained_input'].includes(mode));
const directory = `${base}/roster-plan-matrix-v274/C/fresh-generation-v274/workspace/iterative-draft/sessions`;
const files = (await fs.readdir(directory)).filter(f => f.endsWith('.json'));
assert.equal(files.length, 1);
const saved = JSON.parse(await fs.readFile(`${directory}/${files[0]}`, 'utf8'));
const session = saved.value || saved;
const failures = session.draftTeachSnapshots.flatMap(s => s.state.queryRecovery?.operations || [])
  .filter(o => o.result?.unknownReasonCode === 'PREGAME_LAB_NATIVE_ACTION_DOMAIN_REQUIRED');
assert(failures.length >= 2, 'Use captured C paid corrections');
const state = JSON.parse(await fs.readFile(`${base}/query-contract-audit-v30/native-movement-fixture.private.json`, 'utf8')).state;
const before = hash(state);
const cfg = JSON.parse(await fs.readFile(`${base}/common-v79-plan-recovery-config.private.json`, 'utf8'));
const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root: cfg.fixtureRoot });
let actions = 0;
// This is an input-contract regression, not a repeated Native move test.
// A post-game fixture contains summons and cannot be fed to an INITIAL-state
// factory. No action is allowed or needed to reject an empty domain.
const runtime = { descriptor: { runtimeHash: hash('v277-input-only') },
  enumerate: () => ({ candidates: [], parameterDomains: [], searchSuggestions: [] }),
  instantiate() { actions++; throw Error('UNEXPECTED_ACTION'); },
  apply() { actions++; throw Error('UNEXPECTED_ACTION'); } };
const builder = createOfficialArmyBuilderQueryPortV1({ unitCompositionUpgradeDataBundle:
  createOfficialUnitCompositionUpgradeDataBundleV1({ dataset: source.dataset }) });
const lab = createPregameSceneLaboratoryV1({ sourceState: state, rulesRuntime: runtime, armyBuilderPort: builder });
const port = createRosterTeachEvidencePortV1(lab);
for (const [i, operation] of failures.slice(0, 2).entries()) {
  const request = operation.request, original = hash(request);
  const oldHash = hash(operation.result);
  const result = mode === 'retained_input'
    ? reprojectRosterTeachNativeQueryRepairV1({ request, receipt: operation.result,
      queryContext: port.describeQueryContext() })
    : await port.query({ mutationAuthority: false, initialFoundationHash: before,
      sourceHashes: [before], challengeId: `v277-empty-domain-${i}`, request });
  assert.equal(result.unknownReasonCode, 'PREGAME_LAB_NATIVE_ACTION_DOMAIN_REQUIRED');
  assert.equal(result.status, 'unknown', 'Do not accept an unselected action');
  assert.equal(result.queryRepair?.correctable, true, 'Source validation must return actionable repair, not terminate correction');
  assert.equal(result.queryRepair.sourceContract, 'pregame_native_action_input_v1');
  assert(result.queryRepair.actionSpace);
  assert.equal(result.queryRepair.hostSelectsDomain, false);
  assert.equal(result.queryRepair.failureTargets[0].requestPointer, '/toolRequest/argumentsJson');
  assert(hasRosterTeachCorrectableContinuationV1({ ...operation, result, completed: true }));
  assert.equal(hash(request), original);
  assert.equal(hash(operation.result), oldHash, 'Saved paid evidence stays immutable');
  if (mode === 'retained_input') {
    assert.equal(result.nativeInputRepairProjection.nativeExecutions, 0);
    assert.equal(result.nativeInputRepairProjection.originalReceiptHash, operation.result.receiptHash);
    assert.strictEqual(reprojectRosterTeachNativeQueryRepairV1({ request, receipt: result,
      queryContext: port.describeQueryContext() }), result, 'Projection is idempotent');
  }
}
assert.equal(actions, 0, 'Invalid input cannot execute or invent a Native action');
assert.equal(hash(state), before);
assert.equal(lab.proveMutationZero().sourceStateHashUnchanged, true);
console.log(JSON.stringify({ mode, pass: true, capturedCorrections: 2, correctableUnknown: true,
  automaticContinuationEligible: true, nativeActions: actions, providerCalls: 0, roomsCreated: 0 }));
