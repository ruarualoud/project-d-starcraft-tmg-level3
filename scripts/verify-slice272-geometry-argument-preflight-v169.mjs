import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { createRosterTeachEvidencePortV1 } from '../packages/roster-strategist/roster-teach-evidence-port-v1.mjs';
import { applyRosterTeachCandidateParametersV1 } from '../packages/roster-strategist/roster-teach-query-recovery-v1.mjs';
const [base, output] = process.argv.slice(2);
const report = { checks: [], providerCalls: 0, nativeActions: 0, sourceDraftWrites: 0 };
try {
  const source = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/native-movement-fixture.private.json')).state;
  const freeze = value => { if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
  const lab = createPregameSceneLaboratoryV1({ sourceState: source,
    armyBuilderPort: createOfficialArmyBuilderQueryPortV1({ unitCompositionUpgradeDataBundle: freeze(source.officialUnitCompositionUpgradeDataBundle) }),
    rulesRuntime: { descriptor: { runtimeHash: 'a'.repeat(64) }, enumerate: () => ({ candidates: [], parameterDomains: [], searchSuggestions: [] }),
      instantiate: () => { throw Error('NO_ACTION'); }, apply: () => { throw Error('NO_APPLY'); } } });
  const port = createRosterTeachEvidencePortV1(lab);
  const scope = { mutationAuthority: false, initialFoundationHash: 'b'.repeat(64), sourceHashes: ['c'.repeat(64)] };
  const actor = source.pieces.find(p => p.id === 'player1-goliath-1');
  const blocker = source.pieces.find(p => p.id === 'player1-goliath-2');
  const anchor = p => ({ xInches: p.models[0].xInches, yInches: p.models[0].yInches });
  const request = { kind: 'scenario', toolRequest: { spec: { kind: 'hypothetical_geometry', phase: 'movement', activeSideKey: 'player1',
    clearTerrain: false, placements: [{ pieceId: actor.id, ...anchor(blocker) }] }, followUps: [{ kind: 'spatial',
      queryKind: 'mission_marker_control', argumentsJson: JSON.stringify({ subjectUnitIds: [actor.id], targetIds: ['mission-marker-1'], intent: 'control_objective' }) }] } };
  const failure = await port.query({ ...scope, challengeId: 'layout-and-args', request });
  const targets = failure.queryRepair.failureTargets;
  assert(targets.some(t => t.failureOrigin === 'scenario_geometry'));
  assert(targets.some(t => t.requestPointer === '/toolRequest/followUps/0'
    && t.unknownReasonCode === 'MARKER_CONTROL_QUERY_ARGUMENTS_INVALID'), 'Native argument error must not be hidden by an invalid layout');
  const queryReceipt = await port.query({ ...scope, challengeId: 'layout-option', request: { kind: 'spatial', toolRequest: {
    branchIdRef: 'layout-and-args', queryKind: 'space.solve_static_formation', argumentsJson: JSON.stringify({ unitId: actor.id, anchors: [anchor(actor)] }) } } });
  const option = queryReceipt.sourceReceipt.queryReceipt.result.formationOptions[0];
  const edits = [{ op: 'replace', path: '/toolRequest/followUps/0/argumentsJson',
    valueJson: JSON.stringify({ unitIds: [actor.id], markerIds: ['mission-marker-1'] }) }];
  const selection = { selections: [{ receiptHash: queryReceipt.receiptHash, optionId: option.formationOptionId,
    requestPointer: '/toolRequest/spec/placements/0' }] };
  const inspections = [{ result: { queryReceipt } }];
  const repaired = applyRosterTeachCandidateParametersV1({ request, failure, selection, inspections, edits });
  const checked = await port.query({ ...scope, challengeId: 'joint-repaired', request: repaired });
  assert.equal(checked.status, 'advisory');
  assert.deepEqual(repaired.toolRequest.spec.placements[0].modelPositions, option.canonicalPlacement.modelPositions);
  assert.throws(() => applyRosterTeachCandidateParametersV1({ request, failure, selection, inspections,
    edits: [{ op: 'replace', path: '/toolRequest/spec/placements/0/xInches', valueJson: '1' }] }), /GEOMETRY_EDIT_REQUIRES_CANDIDATE/);
  assert(lab.proveMutationZero().sourceStateHashUnchanged);
  report.checks.push('source_argument_preflight_exposes_geometry_and_wrong_tool_fields_together_native_candidate_plus_bound_argument_delta_repairs_both_no_geometry_override');
  report.ok = true;
} catch (error) { report.ok = false; report.failure = error.message; process.exitCode = 1; }
await fs.writeFile(output, JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify(report));
