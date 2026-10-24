// Fresh-v264 exposed a mixed successful/failed layout. The earlier all-failed
// fixture cannot catch successful assessment mutations missing after restore.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
const source = JSON.parse(await fs.readFile(process.argv[2] + '/query-contract-audit-v30/native-movement-fixture.private.json', 'utf8')).state;
const freeze = value => { if (value && typeof value === 'object' && !Object.isFrozen(value)) {
  Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
const make = () => createPregameSceneLaboratoryV1({ sourceState: source,
  armyBuilderPort: createOfficialArmyBuilderQueryPortV1({ unitCompositionUpgradeDataBundle: freeze(source.officialUnitCompositionUpgradeDataBundle) }),
  rulesRuntime: { descriptor: { runtimeHash: 'a'.repeat(64) },
    enumerate: () => ({ candidates: [], parameterDomains: [], searchSuggestions: [] }),
    instantiate() { throw Error('no action'); }, apply() { throw Error('no mutation'); } } });
const [first, second] = source.pieces.filter(p => p.models?.length === 1 && p.models[0].isOnField);
const spec = { kind: 'hypothetical_geometry', phase: 'assault', activeSideKey: 'player1',
  isolateToPlacedPieces: true, clearTerrain: true, placements: [
    { pieceId: first.id, xInches: 10, yInches: 10,
      modelPositions: [{ modelId: first.models[0].id, xInches: 10, yInches: 10 }] },
    { pieceId: second.id, xInches: 0, yInches: 0 },
  ] };
const before = make();
const receipt = before.runScenarioBranch({ branchId: 'mixed-geometry-restore-v266', spec });
assert.deepEqual(receipt.hypotheticalPlacementAssessment.units.map(x => x.resultStatus), ['ok', 'unknown']);
assert.equal(receipt.hypotheticalPlacementAssessment.units[0].coherencyStatus.derivedFromHypotheticalSnapshot, true);
const after = make();
const restored = after.restoreHypotheticalBranch({ receipt, spec });
assert.equal(restored.branchStateHash, receipt.branchStateHash);
assert.deepEqual(restored.hypotheticalPlacementAssessment, receipt.hypotheticalPlacementAssessment);
assert.equal(after.proveMutationZero().sourceStateHashUnchanged, true);
console.log(JSON.stringify({ pass: true, fullStateMatches: true, mixedLayoutFailurePreserved: true,
  providerCalls: 0, roomWrites: 0, trainingTruth: false }));
