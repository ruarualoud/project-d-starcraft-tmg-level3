// Concrete production stop: failed_fixed_anchor branches have no complete
// modelPositions and must survive restart as failed geometry, not success.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createRosterTeachEvidencePortV1 } from '../packages/roster-strategist/roster-teach-evidence-port-v1.mjs';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
const source = JSON.parse(await fs.readFile(process.argv[2] + '/query-contract-audit-v30/native-movement-fixture.private.json', 'utf8')).state;
const freeze = v => { if (v && typeof v === 'object' && !Object.isFrozen(v)) {
  Object.values(v).forEach(freeze); Object.freeze(v); } return v; };
const makeLab = () => createPregameSceneLaboratoryV1({ sourceState: source,
  armyBuilderPort: createOfficialArmyBuilderQueryPortV1({ unitCompositionUpgradeDataBundle: freeze(source.officialUnitCompositionUpgradeDataBundle) }),
  rulesRuntime: { descriptor: { runtimeHash: 'a'.repeat(64) },
    enumerate() { return { candidates: [], parameterDomains: [], searchSuggestions: [] }; },
    instantiate() { throw Error('No action execution'); }, apply() { throw Error('No room mutation'); } } });
const unit = source.pieces.find(p => p.models?.some(m => !m.isDestroyed));
const request = { kind: 'scenario', toolRequest: { spec: { kind: 'hypothetical_geometry',
  phase: 'assault', activeSideKey: 'player1', isolateToPlacedPieces: false, clearTerrain: false,
  placements: [{ pieceId: unit.id, xInches: 0, yInches: 0 }] }, followUps: [] } };
const first = makeLab();
const receipt = first.runScenarioBranch({ branchId: 'failed-anchor-restore-fixture', spec: request.toolRequest.spec });
assert.equal(receipt.hypotheticalPlacements[0].layoutSource, 'failed_fixed_anchor');
assert.equal(receipt.hypotheticalPlacementAssessment.units[0].resultStatus, 'unknown');
const second = makeLab();
let scenarioReruns = 0;
const port = createRosterTeachEvidencePortV1({ ...second,
  runScenarioBranch() { scenarioReruns++; throw Error('Restore must not re-solve an old scenario'); } },
  { retainedScenarios: [{ challengeId: 'saved-partial', request, receipt: { sourceReceipt: receipt } }] });
const restored = port.describeQueryContext('saved-partial');
assert.equal(restored.baseStateHash, receipt.branchStateHash);
assert.equal(restored.actionSpaceUnavailableReason, 'hypothetical_geometry_requires_repair',
  'Failed geometry must not become valid strategy evidence');
assert.equal(scenarioReruns, 0);
assert.equal(second.proveMutationZero().sourceStateHashUnchanged, true);
console.log(JSON.stringify({ status: 'pass', case: 'native_partial_scene_restores_without_resolve',
  providerCalls: 0, restoredStateMatches: true, stillGeometryRepairOnly: true, scenarioReruns, roomWrites: 0 }));
