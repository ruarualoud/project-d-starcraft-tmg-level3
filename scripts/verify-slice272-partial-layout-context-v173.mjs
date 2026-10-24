import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { createRosterTeachEvidencePortV1 } from '../packages/roster-strategist/roster-teach-evidence-port-v1.mjs';
const [base, output] = process.argv.slice(2);
const report = { checks: [], providerCalls: 0, nativeActions: 0, sourceDraftWrites: 0 };
try {
  const source = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/native-movement-fixture.private.json')).state;
  // The saved combat fixture has one casualty. Reproduce A's complete
  // two-model Hydralisk before packing, not that unrelated survivor snapshot.
  for (const model of source.pieces.find(p => p.id === 'player2-hydralisk').models) {
    model.isDestroyed = false; model.isOnField = true;
  }
  const freeze = x => { if (x && typeof x === 'object' && !Object.isFrozen(x)) { Object.values(x).forEach(freeze); Object.freeze(x); } return x; };
  let invalidEnumerations = 0;
  const lab = createPregameSceneLaboratoryV1({ sourceState: source,
    armyBuilderPort: createOfficialArmyBuilderQueryPortV1({ unitCompositionUpgradeDataBundle: freeze(source.officialUnitCompositionUpgradeDataBundle) }),
    rulesRuntime: { descriptor: { runtimeHash: 'a'.repeat(64) }, enumerate: state => {
      const actor = state.pieces.find(p => p.id === 'player2-hydralisk');
      if (actor.isOnField && actor.models.some(m => !m.isDestroyed && m.isOnField === false)) {
        invalidEnumerations++; throw Object.assign(Error('SELECTED_SPATIAL_MODEL_DENOMINATOR_INVALID:player2-hydralisk'), { code: 'SELECTED_SPATIAL_MODEL_DENOMINATOR_INVALID' });
      }
      return { candidates: [], parameterDomains: [], searchSuggestions: [] };
    }, instantiate: () => { throw Error('NO_ACTION'); }, apply: () => { throw Error('NO_APPLY'); } } });
  const port = createRosterTeachEvidencePortV1(lab);
  const scope = { mutationAuthority: false, initialFoundationHash: 'b'.repeat(64), sourceHashes: ['c'.repeat(64)] };
  const blocker = source.pieces.find(p => p.id === 'player1-goliath-2').models[0];
  const failure = await port.query({ ...scope, challengeId: 'partial-hydra', request: { kind: 'scenario', toolRequest: {
    spec: { kind: 'hypothetical_geometry', phase: 'assault', activeSideKey: 'player1', clearTerrain: false,
      placements: [{ pieceId: 'player2-hydralisk', xInches: blocker.xInches, yInches: blocker.yInches }] },
    followUps: [{ kind: 'spatial', queryKind: 'mission_marker_control', argumentsJson: '{}' }] } } });
  assert.equal(failure.status, 'unknown');
  assert.equal(failure.queryRepair.scenarioContinuation.branchIdRef, 'partial-hydra');
  const context = await port.describeQueryContext('partial-hydra');
  assert.equal(context.actionSpaceUnavailableReason, 'hypothetical_geometry_requires_repair');
  const original = source.pieces.find(p => p.id === 'player2-hydralisk').models[0];
  const result = await port.query({ ...scope, challengeId: 'hydra-fit', request: { kind: 'spatial', toolRequest: {
    branchIdRef: 'partial-hydra', queryKind: 'space.solve_static_formation', argumentsJson: JSON.stringify({ unitId: 'player2-hydralisk',
      anchors: [{ xInches: original.xInches, yInches: original.yInches }] }) } } });
  assert.equal(result.status, 'advisory');
  const native = result.sourceReceipt.queryReceipt.result;
  // This regression tests query availability, not guaranteed packing at an
  // arbitrary fixture anchor. A bounded miss is an honest supported outcome.
  assert(native.formationOptions.some(o => o.canonicalPlacement.modelPositions.length === 2)
    || native.misses.length === 1 && native.misses[0].impossibilityProven === false);
  assert.equal(native.noLegalFormationProven, false);
  assert.equal(invalidEnumerations, 0);
  assert(lab.proveMutationZero().sourceStateHashUnchanged);
  report.checks.push('two_model_failed_layout_keeps_native_static_repair_without_premature_action_enumeration_or_source_mutation');
  report.ok = true;
} catch (error) { report.ok = false; report.failure = error.message; process.exitCode = 1; }
await fs.writeFile(output, JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify(report));
