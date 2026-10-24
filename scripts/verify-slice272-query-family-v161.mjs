import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createRosterTeachEvidencePortV1 } from '../packages/roster-strategist/roster-teach-evidence-port-v1.mjs';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { supportsRosterTeachQueryDeltaV1 } from '../packages/roster-strategist/roster-teach-query-delta-v1.mjs';
const [base, output] = process.argv.slice(2);
const report = { checks: [], providerCalls: 0, nativeActions: 0, sourceDraftWrites: 0 };
try {
  const d = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/plan-production-v31/A/workspace/drafts/rws-1b0a31ec-fd74-433b-8531-4a2ce7019535.json', 'utf8'));
  const request = d.teachFramework.state.investigation.operations.find(o => o.queryId === 'query-r3-7e3f2bc0879ba1fd18857cf2').request;
  const source = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/native-movement-fixture.private.json', 'utf8')).state;
  const freeze = v => { if (v && typeof v === 'object' && !Object.isFrozen(v)) { Object.values(v).forEach(freeze); Object.freeze(v); } return v; };
  const lab = createPregameSceneLaboratoryV1({ sourceState: source,
    armyBuilderPort: createOfficialArmyBuilderQueryPortV1({ unitCompositionUpgradeDataBundle: freeze(source.officialUnitCompositionUpgradeDataBundle) }),
    rulesRuntime: { descriptor: { runtimeHash: 'a'.repeat(64) },
      enumerate() { return { candidates: [], parameterDomains: [], searchSuggestions: [] }; },
      instantiate() { throw Error('NO_EXECUTION'); }, apply() { throw Error('NO_MUTATION'); } } });
  let routes = 0, spatial = 0;
  const port = createRosterTeachEvidencePortV1({ ...lab,
    routeToObjective() { routes++; return { resultStatus: 'unknown', unknownReason: 'side_identity_required',
      receiptHash: 'b'.repeat(64), mapBinding: { sourceStateHash: lab.labDescriptor().sourceStateHash } }; },
    querySpatial(args) { spatial++; assert.equal(args.queryKind, 'map.inspect');
      assert.equal(args.argumentsJson, request.toolRequest.argumentsJson);
      return { resultStatus: 'ok', receiptHash: 'c'.repeat(64) }; } });
  const scope = { mutationAuthority: false, initialFoundationHash: 'a'.repeat(64), sourceHashes: ['b'.repeat(64)] };
  const failure = await port.query({ ...scope, challengeId: 'actual-map-family', request });
  assert.equal(routes, 0, 'The actual map.inspect request must not execute the different route_to_objective tool');
  assert.equal(failure.status, 'unknown');
  assert.equal(failure.queryRepair.requiredRequestKind, 'spatial');
  assert.equal(failure.queryRepair.correctable, true);
  assert.equal(supportsRosterTeachQueryDeltaV1(request, failure), false, 'A family correction cannot be restricted to edits inside toolRequest');
  report.checks.push('wrong_query_family_not_executed_specific_correction_available');
  const corrected = { ...request, kind: 'spatial' };
  const result = await port.query({ ...scope, challengeId: 'corrected-map-family', request: corrected });
  assert.equal(result.status, 'advisory'); assert.equal(routes, 0); assert.equal(spatial, 1);
  report.checks.push('corrected_same_native_query_and_arguments_dispatched'); report.ok = true;
} catch (e) { report.ok = false; report.failure = e.message; process.exitCode = 1; }
await fs.writeFile(output, JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify(report));
