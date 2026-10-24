// Reproduce A's actual missing-side query at the shared native map adapter.
// Reads frozen fixtures only: no Provider, room writes or action execution.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createPregameMapEvidencePortV1 } from '../packages/roster-strategist/pregame-map-evidence-port-v1.mjs';
import { createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1 } from '../packages/online-agent-session/room-backed-spatial-rules-query-adapter-v1.mjs';

const base = process.argv[2];
const state = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/native-movement-fixture.private.json', 'utf8')).state;
const saved = JSON.parse(await fs.readFile(base + '/A/fresh-generation-v249/workspace/drafts/rws-8d1ff678-3b59-40d7-b282-4c38d4eafa46.json', 'utf8'));
const request = saved.teachFramework.state.investigation.operations.find(o => o.queryId === 'q-terrain-route-vs-range-vs-control-repair-1').request;
assert.equal(request.toolRequest.queryKind, 'map.route_access');
const args = JSON.parse(request.toolRequest.argumentsJson);
assert.equal(args.sideId, undefined);
const sourceHash = hash(state);
const authority = { roomId: 'read-only-map-selector-fixture', matchBindingHash: 'a'.repeat(64),
  stateRevision: 0, stateHash: sourceHash, legalSpaceHash: 'b'.repeat(64), seatKey: 'player1' };
let actions = 0;
const adapterFor = source => createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1({
  roomStore: { async loadRoom() { return { stateRevision: 0, envelope: {
    matchBindingHash: authority.matchBindingHash, stateHash: authority.stateHash, state: source } }; } },
  seatKey: 'player1', rulesRuntime: { instantiate() { actions++; throw Error('No actions'); } },
});
const adapter = adapterFor(state);
const query = input => adapter.query({ authority, queryKind: 'map.route_access', arguments: input });
const missing = await query(args);
assert.equal(missing.reason, 'side_identity_required');
assert.equal(missing.mayRepairSameChoice, true, 'Missing side is a correctable selector error, not unavailable map evidence');
assert.deepEqual(missing.repairContext.requiredArguments, ['sideId', 'baseId', 'targetId']);
assert.deepEqual(missing.repairContext.invalidArguments, ['sideId']);
assert.deepEqual(missing.repairContext.availableSelectors.sideIds, ['player1', 'player2']);
assert.equal(missing.repairContext.suggestionExecuted, false);
assert.equal(missing.result, null);
const direct = createPregameMapEvidencePortV1({ sourceState: state });
const fixed = await query({ ...args, sideId: 'player1' });
const expected = direct.routeToObjective({ ...args, sideId: 'player1', queryId: 'scene-map-route-access' });
assert.equal(fixed.precision, 'advisory_estimate');
assert.deepEqual(fixed.result, expected);
for (const [field, badValue] of [['baseId', 'unrecognized-base'], ['targetId', 'unrecognized-target']]) {
  const failure = await query({ ...args, sideId: 'player1', [field]: badValue });
  assert.equal(failure.mayRepairSameChoice, true);
  assert.deepEqual(failure.repairContext.invalidArguments, [field]);
}
const abstract = structuredClone(state);
delete abstract.officialCompetitiveMapRoomFreeze;
const unavailable = await adapterFor(abstract).query({ authority, queryKind: 'map.route_access', arguments: args });
assert.equal(unavailable.reason, 'abstract_fixture_no_certified_map');
assert.notEqual(unavailable.mayRepairSameChoice, true, 'Missing certification must not become a parameter-fix claim');
assert.equal(hash(state), sourceHash);
assert.equal(actions, 0);
console.log(JSON.stringify({ status: 'PASS', actualMissingSideRepairable: true,
  validSelectorsFromFrozenAudit: true, correctedNativeResultMatchesDirectPort: true,
  unavailableEvidenceStillUnknown: true, providerCalls: 0, roomWrites: 0, nativeActions: 0 }));
