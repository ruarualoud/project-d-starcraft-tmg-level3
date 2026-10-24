import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { createRosterTeachEvidencePortV1 } from '../packages/roster-strategist/roster-teach-evidence-port-v1.mjs';
import { applyRosterTeachCandidateParametersV1 } from '../packages/roster-strategist/roster-teach-query-recovery-v1.mjs';
const [base, output] = process.argv.slice(2);
const report = { checks: [], providerCalls: 0, nativeActions: 0, sourceDraftWrites: 0 };
try {
  const source = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/native-movement-fixture.private.json', 'utf8')).state;
  const freeze = value => { if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
  const lab = createPregameSceneLaboratoryV1({ sourceState: source,
    armyBuilderPort: createOfficialArmyBuilderQueryPortV1({ unitCompositionUpgradeDataBundle: freeze(source.officialUnitCompositionUpgradeDataBundle) }),
    rulesRuntime: { descriptor: { runtimeHash: 'a'.repeat(64) },
      enumerate: () => ({ candidates: [], parameterDomains: [], searchSuggestions: [] }),
      instantiate: () => { throw Error('NO_NATIVE_ACTION'); }, apply: () => { throw Error('NO_APPLY'); } } });
  const port = createRosterTeachEvidencePortV1(lab);
  const scope = { mutationAuthority: false, initialFoundationHash: 'b'.repeat(64), sourceHashes: ['c'.repeat(64)] };
  const actor = source.pieces.find(p => p.id === 'player1-goliath-1');
  const blocker = source.pieces.find(p => p.id === 'player1-goliath-2');
  const anchor = p => ({ xInches: p.models[0].xInches, yInches: p.models[0].yInches });
  const request = { kind: 'scenario', toolRequest: { spec: { kind: 'hypothetical_geometry', phase: 'movement',
    activeSideKey: 'player1', clearTerrain: false, isolateToPlacedPieces: false,
    placements: [{ pieceId: actor.id, modelPositions: [{ modelId: actor.models[0].id, ...anchor(blocker) }] }] },
    followUps: [{ kind: 'spatial', queryKind: 'mission_marker_control', argumentsJson: '{}' }] } };
  const failure = await port.query({ ...scope, challengeId: 'overlap-static', request });
  assert.equal(failure.status, 'unknown');
  assert(failure.queryRepair.failureTargets.some(t => t.failureOrigin === 'scenario_geometry'));
  const queryReceipt = await port.query({ ...scope, challengeId: 'model-requested-layouts', request: {
    kind: 'spatial', toolRequest: { branchIdRef: 'overlap-static', queryKind: 'space.solve_static_formation',
      argumentsJson: JSON.stringify({ unitId: actor.id, anchors: [anchor(blocker), anchor(actor)],
        formationObjectives: [{ kind: 'compact', weight: 1, targetIds: [] }] }) } } });
  assert.equal(queryReceipt.status, 'advisory', 'A static placement repair must be queryable without a live action domain even on its failed-layout branch');
  const native = queryReceipt.sourceReceipt.queryReceipt;
  assert.equal(native.status, 'advisory_estimate');
  const result = native.result;
  assert.equal(result.formationOptions.length, 1);
  assert.equal(result.misses.length, 1);
  assert.equal(result.arrivalOrMovementLegalityProven, false);
  assert.equal(result.noLegalFormationProven, false);
  const option = result.formationOptions[0];
  assert.equal(option.staticGeometryProven, true);
  assert.equal(option.canonicalPlacement.pieceId, actor.id);
  assert.equal(option.canonicalPlacement.modelPositions.length, actor.models.length);
  assert.deepEqual(option.anchor, anchor(actor));
  report.checks.push('failed_static_scene_queries_shared_native_geometry_no_domain_no_anchor_guess_illegal_anchor_excluded');
  const selection = { receiptHash: queryReceipt.receiptHash, optionId: option.formationOptionId,
    requestPointer: '/toolRequest/spec/placements/0' };
  const inspections = [{ result: { queryReceipt } }];
  const repaired = applyRosterTeachCandidateParametersV1({ request, failure, selection, inspections });
  assert.deepEqual(repaired.toolRequest.followUps, request.toolRequest.followUps);
  assert.equal(repaired.toolRequest.spec.clearTerrain, false);
  assert.deepEqual(repaired.toolRequest.spec.placements[0].modelPositions, option.canonicalPlacement.modelPositions);
  const checked = await port.query({ ...scope, challengeId: 'static-repaired', request: repaired });
  assert.equal(checked.status, 'advisory');
  assert.equal(checked.sourceReceipt.hypotheticalPlacementAssessment.units[0].resultStatus, 'ok');
  const wrongScene = structuredClone(queryReceipt);
  wrongScene.sourceReceipt.baseStateHash = 'f'.repeat(64);
  assert.throws(() => applyRosterTeachCandidateParametersV1({ request, failure, selection,
    inspections: [{ result: { queryReceipt: wrongScene } }] }), /SCENE_MISMATCH/);
  assert(lab.proveMutationZero().sourceStateHashUnchanged);
  report.checks.push('model_selected_retained_option_copied_exactly_into_failed_unit_then_native_control_reexecuted_foreign_scene_denied');
  report.ok = true;
} catch (error) { report.ok = false; report.failure = error.message; process.exitCode = 1; }
await fs.writeFile(output, JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify(report));
