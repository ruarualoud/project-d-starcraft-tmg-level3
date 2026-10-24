// The actual paid A response used a native tool name as follow-up kind and
// replaced exactly that failed child. Neither changes the requested predicate.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { applyRosterTeachQueryDeltaV1 } from '../packages/roster-strategist/roster-teach-query-delta-v1.mjs';
import { createRosterTeachEvidencePortV1 } from '../packages/roster-strategist/roster-teach-evidence-port-v1.mjs';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const [base, output] = process.argv.slice(2);
const report = { checks: [], failures: [], providerCalls: 0, nativeActions: 0, sourceDraftWrites: 0 };
const d = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/plan-production-v31/A/workspace/drafts/rws-1b0a31ec-fd74-433b-8531-4a2ce7019535.json', 'utf8'));
const state = d.teachFramework.state;
const paid = state.replyCorrections.find(r => r.correction?.code === 'ROSTER_TEACH_QUERY_DELTA_OUTSIDE_FAILURE').correction.previousOutput;
const op = state.queryRecovery.operations.find(o => o.originalQueryId === 'query-r3-6ddcff8a535b64da03e9f55d');
const replacement = JSON.parse(paid.edits[0].valueJson);
let request = structuredClone(op.request);
request.toolRequest.followUps[0] = replacement;
try {
  const fixed = applyRosterTeachQueryDeltaV1({ request: op.request, failure: op.currentFailure, reply: paid });
  assert.deepEqual(fixed, request);
  assert.deepEqual(fixed.toolRequest.spec, op.request.toolRequest.spec);
  assert.throws(() => applyRosterTeachQueryDeltaV1({ request: op.request, failure: op.currentFailure,
    reply: { ...paid, edits: [{ op: 'remove', path: paid.edits[0].path, valueJson: '' }] } }), /OUTSIDE_FAILURE/);
  report.checks.push('saved_paid_replacement_of_exact_failed_child_preserves_other_fields');
} catch (e) { report.failures.push(e.message); }
try {
  const source = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/native-movement-fixture.private.json', 'utf8')).state;
  const freeze = v => { if (v && typeof v === 'object' && !Object.isFrozen(v)) { Object.values(v).forEach(freeze); Object.freeze(v); } return v; };
  const lab = createPregameSceneLaboratoryV1({ sourceState: source,
    armyBuilderPort: createOfficialArmyBuilderQueryPortV1({ unitCompositionUpgradeDataBundle: freeze(source.officialUnitCompositionUpgradeDataBundle) }),
    rulesRuntime: { descriptor: { runtimeHash: 'a'.repeat(64) },
      enumerate() { return { candidates: [], parameterDomains: [], searchSuggestions: [] }; },
      instantiate() { throw Error('NO_NATIVE_EXECUTION'); }, apply() { throw Error('NO_NATIVE_MUTATION'); } } });
  let dispatched = 0;
  const spatialReceipt = { resultStatus: 'ok', receiptHash: 'c'.repeat(64) };
  const port = createRosterTeachEvidencePortV1({ ...lab,
    describeQueryContext() { return lab.describeQueryContext({ base: { kind: 'source' } }); },
    runScenarioBranch() { return { resultStatus: 'ok', receiptHash: 'd'.repeat(64), branchStateHash: 'e'.repeat(64) }; },
    querySpatial(args) {
      dispatched++;
      assert.equal(args.queryKind, 'mission_marker_control');
      assert.deepEqual(JSON.parse(args.argumentsJson), { markerIds: replacement.markerIds, unitIds: replacement.unitIds });
      assert.deepEqual(args.base, { kind: 'branch', branchStateHash: 'e'.repeat(64) });
      return spatialReceipt;
    } });
  const scope = { mutationAuthority: false, initialFoundationHash: 'a'.repeat(64), sourceHashes: ['b'.repeat(64)] };
  const receipt = await port.query({ ...scope, challengeId: 'saved-native-tool-name', request });
  assert.equal(dispatched, 1, 'A source-declared native tool name must dispatch that exact native tool, not fail as an unknown family');
  assert.equal(receipt.status, 'advisory');
  assert.equal(receipt.requestHash, hash(request));
  assert.equal(receipt.followUpReceipts[0].dispatchBinding.nativeQueryKind, 'mission_marker_control');
  const conflict = structuredClone(request);
  conflict.toolRequest.followUps[0].queryKind = 'base_edge_distance';
  const rejected = await port.query({ ...scope, challengeId: 'conflicting-tool-names', request: conflict });
  assert.equal(rejected.status, 'unknown'); assert.equal(dispatched, 1);
  report.checks.push('real_adapter_binds_exact_native_name_and_arguments_conflicting_names_not_executed');
} catch (e) { report.failures.push(e.message); }
report.ok = report.failures.length === 0;
await fs.writeFile(output, JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify(report));
if (!report.ok) process.exitCode = 1;
