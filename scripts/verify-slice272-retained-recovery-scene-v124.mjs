// Concrete resume bug: a saved recovery scene is absent from the fresh
// evidence-port registry, even though its complete model positions survived.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { createRosterTeachEvidencePortV1 } from '../packages/roster-strategist/roster-teach-evidence-port-v1.mjs';
import { recoverRosterTeachQueriesV1 } from '../packages/roster-strategist/roster-teach-query-recovery-v1.mjs';
const base = process.argv[2];
const captured = JSON.parse(await fs.readFile(base + '/common-v121-partial-query-evidence-fixture.private.json', 'utf8'));
assert.equal(captured.unknownReasonCode, 'CURRENT_ACTION_QUERY_DOMAIN_REFERENCE_REQUIRED');
assert(captured.sourceReceipt.hypotheticalPlacements.every(p => p.modelPositions.length === 9));
const source = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/native-movement-fixture.private.json', 'utf8')).state;
const freeze = v => { if (v && typeof v === 'object' && !Object.isFrozen(v)) {
  Object.values(v).forEach(freeze); Object.freeze(v); } return v; };
const makeLab = () => createPregameSceneLaboratoryV1({ sourceState: source,
  armyBuilderPort: createOfficialArmyBuilderQueryPortV1({ unitCompositionUpgradeDataBundle: freeze(source.officialUnitCompositionUpgradeDataBundle) }),
  rulesRuntime: { descriptor: { runtimeHash: 'a'.repeat(64) },
    enumerate() { return { candidates: [], parameterDomains: [], searchSuggestions: [] }; },
    instantiate() { throw Error('No action'); }, apply() { throw Error('No mutation'); } } });
const pieces = source.pieces.filter(p => p.isOnField && p.models.length === 1).slice(0, 2);
assert.equal(pieces.length, 2);
const request = { kind: 'scenario', toolRequest: { spec: { kind: 'hypothetical_geometry',
  phase: 'movement', activeSideKey: 'player1', clearTerrain: false, isolateToPlacedPieces: true,
  placements: pieces.map(p => ({ pieceId: p.id, modelPositions: p.models.map(m => ({
    modelId: m.id, xInches: m.xInches, yInches: m.yInches, rotationDegrees: m.baseRotationDegrees,
    elevation: m.elevation, supportTerrainIds: m.supportTerrainIds, adjacentAccessPointIds: m.adjacentAccessPointIds })) })) },
  followUps: [{ queryKind: 'coherency_after_candidate_placement', argumentsJson: '{}' }] } };
const scope = { mutationAuthority: false, initialFoundationHash: 'b'.repeat(64), sourceHashes: ['c'.repeat(64)] };
const originalLab = makeLab(), originalPort = createRosterTeachEvidencePortV1(originalLab);
const receipt = await originalPort.query({ ...scope, challengeId: 'saved-recovery', request });
assert.equal(receipt.unknownReasonCode, captured.unknownReasonCode);
const beforeContext = originalPort.describeQueryContext('saved-recovery');
const freshLab = makeLab();
let restores = 0, followups = 0;
const resumedPort = createRosterTeachEvidencePortV1({ ...freshLab,
  runScenarioBranch(input) {
    restores++;
    assert(input.spec.placements.every(p => Array.isArray(p.modelPositions)), 'restore exact positions, never re-solve');
    assert(!input.followUps?.length, 'do not rerun successful or failed children to restore context');
    return freshLab.runScenarioBranch(input);
  },
  querySpatial() { followups++; throw Error('Context restoration must not query'); },
}, { retainedScenarios: [{ challengeId: 'saved-recovery', request, receipt }] });
const afterContext = resumedPort.describeQueryContext('saved-recovery');
assert.deepEqual(afterContext, beforeContext, 'same branch means the exact same current query context');
assert.equal(restores, 1);
assert.deepEqual(resumedPort.describeQueryContext('saved-recovery'), beforeContext);
assert.equal(restores, 1, 'repeated inspection uses the registered immutable branch');
assert.equal(followups, 0);
const draft = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/plan-production-v31/A/workspace/drafts/rws-1b0a31ec-fd74-433b-8531-4a2ce7019535.json', 'utf8'));
const saved = draft.teachFramework.state.queryRecovery.operations.find(o => o.originalQueryId === 'query-r4-b4c5d6e7f8091a2b3c4d5e6f');
const op = structuredClone(saved);
const originalChoices = structuredClone(op.choices);
const state = { framework: {}, agenda: { questions: [{ questionId: op.questionId, evidenceRequest: op.originalRequest }] }, evidence: [],
  investigation: { operations: [{ queryId: op.originalQueryId, questionId: op.questionId, request: op.originalRequest }], evidence: [] },
  queryRecovery: { selection: { queryIds: [op.originalQueryId], reexecuteSavedQuery: true }, operations: [op] } };
let asks = 0;
const run = () => recoverRosterTeachQueriesV1({ state, plan: {}, context: {}, sourceHash: 'c'.repeat(64),
  completedBeforeRun: true, checkpoint: async () => {},
  evidencePort: { descriptor: () => ({ descriptorHash: op.result.evidencePortDescriptorHash }), query() { throw Error('No saved-query repeat'); } },
  ask: async () => { asks++; return { disposition: 'defer', kind: 'spatial', toolRequestJson: '{}', publicReason: 'Scripted one authorized correction choice, not a model success.' }; } });
await run();
assert.equal(asks, 1, 'one additional choice only after the concrete prerequisite contract fix');
assert.equal(op.maximumAttempts, 4);
assert.deepEqual(op.choices.slice(0, 3), originalChoices);
assert.equal(op.prerequisiteInspectionRecovery.historyReset, false);
await run();
assert.equal(asks, 1, 'the same migration cannot grant another choice');
assert.equal(freshLab.proveMutationZero().sourceStateHashUnchanged, true);
console.log(JSON.stringify({ status: 'PASS', retainedRecoveryBranchRestored: true,
  exactContextPreserved: true, explicitPositionsNoSolver: true, restoredOnce: restores,
  childQueriesRepeated: followups, attemptsReset: false, singleAdditionalChoice: true,
  providerCalls: 0, roomActions: 0, actualModelOrRouteCompletionProven: false }));
