import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
const [base, output] = process.argv.slice(2);
const report = { checks: [], providerCalls: 0, nativeActions: 0, sourceDraftWrites: 0 };
try {
  const source = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/native-movement-fixture.private.json')).state;
  assert(source.cardResources?.player1?.length, 'Actual source fixture must contain native resource cards');
  const freeze = value => { if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
  const lab = createPregameSceneLaboratoryV1({ sourceState: source,
    armyBuilderPort: createOfficialArmyBuilderQueryPortV1({ unitCompositionUpgradeDataBundle: freeze(source.officialUnitCompositionUpgradeDataBundle) }),
    rulesRuntime: { descriptor: { runtimeHash: 'a'.repeat(64) },
      enumerate: () => ({ candidates: [], parameterDomains: [], searchSuggestions: [] }),
      instantiate: () => { throw Error('NO_ACTION'); }, apply: () => { throw Error('NO_APPLY'); } } });
  const context = lab.describeQueryContext();
  assert.deepEqual(context.cardResources, source.cardResources,
    'Teach must receive the exact same Native card resources as live planning; availability cannot be inferred from weapon exchanges');
  assert.equal(context.resourceEvidenceScope.paymentOrFutureReadinessProven, false);
  assert(Object.isFrozen(context.cardResources));
  assert(lab.proveMutationZero().sourceStateHashUnchanged);
  report.checks.push('actual_native_card_identity_resource_readiness_and_face_delivered_losslessly_without_payment_or_future_claim');
  report.ok = true;
} catch (error) { report.ok = false; report.failure = error.message; process.exitCode = 1; }
await fs.writeFile(output, JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify(report));
