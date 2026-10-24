// Actual paid A reply names a native queryKind without the legacy kind tag.
// Isolate dispatch using one existing legal source model's explicit position;
// this is not proof that the paid multi-unit hypothetical anchors fit.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { createRosterTeachEvidencePortV1 } from '../packages/roster-strategist/roster-teach-evidence-port-v1.mjs';
const base = process.argv[2];
const draft = JSON.parse(await fs.readFile(base+'/query-contract-audit-v30/plan-production-v31/A/workspace/drafts/rws-1b0a31ec-fd74-433b-8531-4a2ce7019535.json','utf8'));
const paid = draft.publicOutputs.findLast(o => o.roundKind === 'teach_framework_query_recovery').sanitizedOutput;
const captured = JSON.parse(paid.toolRequestJson);
assert.equal(paid.kind, 'scenario');
assert.equal(captured.followUps[0].kind, undefined);
assert.equal(captured.followUps[0].queryKind, 'mission_marker_control');
const source = JSON.parse(await fs.readFile(base+'/query-contract-audit-v30/native-movement-fixture.private.json','utf8')).state;
const piece = source.pieces.find(p => p.isOnField && p.models.length === 1);
const model = piece.models[0];
const freeze = v => { if (v && typeof v === 'object' && !Object.isFrozen(v)) {
  Object.values(v).forEach(freeze); Object.freeze(v); } return v; };
const lab = createPregameSceneLaboratoryV1({ sourceState: source,
  armyBuilderPort: createOfficialArmyBuilderQueryPortV1({ unitCompositionUpgradeDataBundle: freeze(source.officialUnitCompositionUpgradeDataBundle) }),
  rulesRuntime: { descriptor: { runtimeHash: 'a'.repeat(64) }, enumerate() { return { candidates: [], parameterDomains: [], searchSuggestions: [] }; },
    instantiate() { throw Error('No game action'); }, apply() { throw Error('No mutation'); } } });
const port = createRosterTeachEvidencePortV1(lab);
const scope = { mutationAuthority: false, initialFoundationHash: 'b'.repeat(64), sourceHashes: ['c'.repeat(64)] };
const spec = { kind: 'hypothetical_geometry', phase: 'assault', activeSideKey: 'player1',
  isolateToPlacedPieces: true, clearTerrain: false, placements: [{ pieceId: piece.id,
    modelPositions: [{ modelId: model.id, xInches: model.xInches, yInches: model.yInches,
      rotationDegrees: model.baseRotationDegrees, elevation: model.elevation,
      supportTerrainIds: model.supportTerrainIds, adjacentAccessPointIds: model.adjacentAccessPointIds }] }] };
const request = { kind: 'scenario', toolRequest: { spec, followUps: captured.followUps } };
const original = JSON.stringify(request);
const result = await port.query({ ...scope, challengeId: 'paid-native-followup', request });
assert.equal(result.followUpReceipts?.length, 1, 'A named native follow-up must not disappear because redundant kind is absent');
assert.equal(result.followUpReceipts[0].kind, 'spatial');
assert.equal(result.followUpReceipts[0].receipt.queryKind, 'mission_marker_control');
assert.deepEqual(result.followUpReceipts[0].dispatchBinding, {
  requestedKind: null, nativeQueryKind: 'mission_marker_control', resolvedKind: 'spatial',
  bindingSource: 'shared_native_query_registry', semanticArgumentsChanged: false });
assert.equal(JSON.stringify(request), original);
const unknown = await port.query({ ...scope, challengeId: 'unknown-followup',
  request: { kind: 'scenario', toolRequest: { spec, followUps: [{ queryKind: 'not_a_registered_query', argumentsJson: '{}' }] } } });
assert.equal(unknown.followUpReceipts.length, 1);
assert.equal(unknown.status, 'unknown');
assert.equal(unknown.unknownReasonCode, 'ROSTER_TEACH_SCENARIO_FOLLOWUP_KIND_REQUIRED');
assert.equal(unknown.queryRepair.correctable, true);
assert(lab.proveMutationZero().sourceStateHashUnchanged);
console.log(JSON.stringify({ status: 'PASS', paidNativeFollowupExecuted: true, unknownFollowupNotSilentlyDropped: true,
  argumentsPreserved: true, providerCalls: 0, roomActions: 0, paidSceneGeometryProven: false }));
