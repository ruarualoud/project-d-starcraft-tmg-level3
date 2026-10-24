import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { projectRosterTeachCapabilityGuideV1 } from '../packages/roster-strategist/roster-teach-capability-guide-v1.mjs';
const [base, output] = process.argv.slice(2);
const report = { providerCalls: 0, nativeQueryExecutions: 0, sourceDraftWrites: 0 };
try {
  const source = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/native-movement-fixture.private.json')).state;
  const freeze = value => { if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
  const lab = createPregameSceneLaboratoryV1({ sourceState: source,
    armyBuilderPort: createOfficialArmyBuilderQueryPortV1({ unitCompositionUpgradeDataBundle: freeze(source.officialUnitCompositionUpgradeDataBundle) }),
    rulesRuntime: { descriptor: { runtimeHash: 'a'.repeat(64) },
      enumerate: () => ({ candidates: [], parameterDomains: [], searchSuggestions: [] }),
      instantiate: () => { throw Error('NO_ACTION'); }, apply: () => { throw Error('NO_APPLY'); } } });
  const context = lab.describeQueryContext();
  const contract = context.nativeSpatialQueryTransport;
  assert(contract.toolRequestFields.includes('branchIdRef'),
    'The Teach native-query transport omits its implemented branch selector');
  assert.equal(contract.branchSelection.omittedOrEmpty, 'immutable_source');
  assert.equal(contract.branchSelection.nonempty, 'retained_scenario_query_id');
  assert.equal(contract.branchSelection.automaticallyUsesLatestScenario, false);
  assert.deepEqual(projectRosterTeachCapabilityGuideV1(context).toolSurfaceCatalog
    .nativeSpatialSubqueries.argumentContract, contract);
  assert(lab.proveMutationZero().sourceStateHashUnchanged);
  report.ok = true;
} catch (error) { report.ok = false; report.failure = error.message; process.exitCode = 1; }
await fs.writeFile(output, JSON.stringify(report, null, 2), { mode: 0o600 }); console.log(JSON.stringify(report));
