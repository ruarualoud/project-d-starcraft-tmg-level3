import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { createRosterTeachEvidencePortV1 } from '../packages/roster-strategist/roster-teach-evidence-port-v1.mjs';
import * as recovery from '../packages/roster-strategist/roster-teach-query-recovery-v1.mjs';
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
    clearTerrain: false, isolateToPlacedPieces: false, placements: [{ pieceId: actor.id, ...anchor(blocker) }] },
    followUps: [{ kind: 'spatial', queryKind: 'mission_marker_control', argumentsJson: '{}' }] } };
  const failure = await port.query({ ...scope, challengeId: 'packing-miss', request });
  assert.equal(failure.status, 'unknown');
  assert.equal(failure.queryRepair?.scenarioContinuation?.branchIdRef, 'packing-miss', 'A packing miss must retain the failed scene for the static tool');
  assert.equal(failure.queryRepair.failureTargets[0].requestPointer, '/toolRequest/spec/placements/0');
  const receipt = await port.query({ ...scope, challengeId: 'repair-layout', request: { kind: 'spatial', toolRequest: {
    branchIdRef: 'packing-miss', queryKind: 'space.solve_static_formation', argumentsJson: JSON.stringify({ unitId: actor.id, anchors: [anchor(actor)] }) } } });
  const option = receipt.sourceReceipt.queryReceipt.result.formationOptions[0];
  assert(option?.staticGeometryProven);
  report.checks.push('packing_miss_retains_exact_failed_branch_and_native_solver_supplies_complete_bases');
  const questionId = 'original-geometry-question';
  const state = { framework: {}, agenda: { questions: [{ questionId, evidenceRequest: request }] }, evidence: [],
    investigation: { operations: [{ queryId: 'packing-miss', questionId, request }], evidence: [failure] } };
  let asks = 0, executions = 0, typedFeedback = false;
  await recovery.recoverRosterTeachQueriesV1({ state, plan: {}, context: {}, sourceHash: 'a'.repeat(64), completedBeforeRun: false,
    checkpoint: async () => {}, evidencePort: { descriptor: () => port.descriptor(), query: async args => { executions++; return port.query(args); } },
    ask: async (_kind, nodes, instruction) => {
      asks++;
      const workflow = nodes.find(n => n.kind === 'geometry_repair_workflow');
      assert.equal(workflow?.layoutOwner, 'native_static_formation_tool');
      assert.equal(workflow?.branchIdRef, 'packing-miss');
      assert(!instruction.includes('For example, an available space.solve_formation'));
      if (asks === 1) return { disposition: 'retry', kind: 'patch', toolRequestJson: '', publicReason: 'Handwritten coordinate repair',
        edits: [{ op: 'replace', path: '/toolRequest/spec/placements/0/xInches', valueJson: String(anchor(actor).xInches) }] };
      typedFeedback = nodes.some(n => n.result?.unknownReasonCode === 'ROSTER_TEACH_GEOMETRY_TOOL_REFERENCE_REQUIRED');
      state.queryRecovery.operations[0].inspections = [{ result: { queryReceipt: receipt } }];
      return { disposition: 'retry', kind: 'candidate_parameters', edits: [], publicReason: 'Choose the returned Native layout',
        toolRequestJson: JSON.stringify({ selections: [{ receiptHash: receipt.receiptHash, optionId: option.formationOptionId,
          requestPointer: '/toolRequest/spec/placements/0' }] }) };
    } });
  assert.equal(asks, 2); assert.equal(executions, 1); assert(typedFeedback);
  const op = state.queryRecovery.operations[0];
  assert.equal(op.result.status, 'advisory');
  assert.deepEqual(op.request.toolRequest.spec.placements[0].modelPositions, option.canonicalPlacement.modelPositions);
  assert(lab.proveMutationZero().sourceStateHashUnchanged);
  report.checks.push('raw_geometry_patch_gets_typed_tool_feedback_without_execution_then_batch_reference_uses_native_coordinates_original_query_passes');
  report.ok = true;
} catch (error) { report.ok = false; report.failure = error.message; process.exitCode = 1; }
await fs.writeFile(output, JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify(report));
