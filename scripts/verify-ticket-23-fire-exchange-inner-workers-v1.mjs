#!/usr/bin/env node
// Concrete single-query serial CPU bug via the ordinary authoritative adapter.
// Actual frozen terrain/Rules and local hypothetical; no Provider or Room writes.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { enumerateOfficialSelectedRosterRangedActionsV1 } from
  '../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs';
import { createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1 } from
  '../packages/online-agent-session/room-backed-spatial-rules-query-adapter-v1.mjs';
import { hashStarcraftTmgContract as hash } from
  '../packages/authoritative-engine/referee-crypto-v1.mjs';
const [capturePath, baselinePath] = process.argv.slice(2);
assert(capturePath && baselinePath);
const capture = JSON.parse(await readFile(capturePath, "utf8"));
const state = structuredClone(capture.aggregate.envelope.state);
const attacker = state.pieces.find(p => p.id === "player1-marine-3");
const targets = ["player2-hydralisk", "player2-kerrigan-raptor"]
  .map(id => state.pieces.find(p => p.id === id));
assert(attacker && targets.every(Boolean), "actual captured units required");
assert.equal(state.board.terrain.length, 1804);
const leader = attacker.models[2];
assert(leader && !leader.isDestroyed && leader.isOnField !== false);
for (const model of attacker.models) {
  model.isDestroyed = model !== leader;
  model.isOnField = model === leader;
}
attacker.destroyedModelIds = attacker.models.filter(m => m.isDestroyed).map(m => m.id);
attacker.currentModels = 1;
const profile = state.officialCombatProfileBundle.profiles
  .find(p => p.recordKey === attacker.officialUnitRecordKey);
attacker.currentSupply = profile.squadProfile.find(t =>
  t.minimumModels !== null && attacker.currentModels >= t.minimumModels
  && attacker.currentModels <= t.maximumModels).supply;
attacker.activatedPhases.assault = false;
attacker.xInches = leader.xInches;
attacker.yInches = leader.yInches;
for (const [index, target] of targets.entries()) {
  const live = target.models.find(m => !m.isDestroyed && m.isOnField !== false);
  assert(live, "actual live target required");
  const dx = leader.xInches + 5 - live.xInches;
  const dy = leader.yInches + index - live.yInches;
  for (const model of target.models) { model.xInches += dx; model.yInches += dy; }
  target.xInches += dx;
  target.yInches += dy;
  target.activatedPhases.assault = false;
}
state.pieces = [attacker, ...targets];
state.phase = "assault";
state.stage = "unit_activation";
state.activeSideKey = attacker.sideKey;
state.players[attacker.sideKey].passedPhases = {
  ...(state.players[attacker.sideKey].passedPhases || {}), assault: false,
};
state.phaseFirstActorByRound = {
  ...(state.phaseFirstActorByRound || {}),
  [`${Number(state.round)}:assault`]: {
    round: Number(state.round), phase: "assault",
    markerHolderSideKey: state.firstPlayerSideKey,
    chosenFirstActorSideKey: attacker.sideKey,
  },
};
state.selectedRosterActivationWindow = null;
state.pendingAction = null;
state.pendingReactionWindow = null;
delete state.pendingCurrentProductRangedSequence;
delete state.pendingCurrentProductRangedCasualtyChoice;
const targetIds = targets.map(p => p.id);
const enumeration = enumerateOfficialSelectedRosterRangedActionsV1(state, {
  sideKey: attacker.sideKey, includeDisabled: true,
});
const domain = enumeration.parameterDomains.find(d =>
  d.pieceId === attacker.id && d.weaponName.toLowerCase() === "c-14 rifle"
  && targetIds.every(id => d.parameterSchema.targetUnitId.enum.includes(id)));
assert(domain, "one actual Rules domain with both targets required");
const input = {
  state, seatKey: attacker.sideKey, currentLegalSpaceDomains: [domain],
  request: { subjectUnitIds: [attacker.id], targetIds, sampleBudgetPerAttack: 36 },
};

const sourceHash = hash(capture);
const originalHash = hash(state);
const aggregate = { stateRevision: capture.aggregate.stateRevision,
  envelope: { state, stateHash: originalHash,
    matchBindingHash: capture.aggregate.envelope.matchBindingHash } };
const authority = { roomId: capture.roomId, seatKey: attacker.sideKey,
  stateRevision: aggregate.stateRevision, stateHash: originalHash,
  matchBindingHash: aggregate.envelope.matchBindingHash,
  legalSpaceHash: hash(enumeration.parameterDomains) };
const request = { queryKind: 'fire_zone_exchange', authority,
  arguments: { ...input.request, currentLegalSpaceDomains: [domain] } };
const events = [];
let reads = 0;
const adapter = createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1({
  seatKey: attacker.sideKey,
  roomStore: { async loadRoom(id) { assert.equal(id, authority.roomId);
    reads += 1; return aggregate; } },
  rulesRuntime: { instantiate() { throw Error('READONLY_PROBE_INSTANTIATION_FORBIDDEN'); } },
  observeQueryBatchDiagnostic: event => events.push(structuredClone(event)),
});
const started = performance.now();
const [response] = await adapter.queryBatch([request]);
const elapsedMs = performance.now() - started;
assert.equal(response.precision, 'advisory_estimate');
assert.equal(response.result.attackEstimates.length, 2);
assert.deepEqual(response.result.attackEstimateFailures, []);
assert.equal(hash(state), originalHash);
assert.equal(hash(capture), sourceHash);
let baseline;
try { baseline = JSON.parse(await readFile(baselinePath, 'utf8')); }
catch(error) { if(error.code !== 'ENOENT') throw error;
  baseline = { originalHash, sourceHash, response, reads, elapsedMs };
  await writeFile(baselinePath, JSON.stringify(baseline), { mode: 0o600 }); }
assert.equal(baseline.sourceHash, sourceHash);
assert.equal(baseline.originalHash, originalHash);
assert.deepEqual(response, baseline.response,
  'ENTIRE original query response, graph, probabilities, casualty choices and hashes');
const completed = events.filter(e => e.stage === 'query_worker_completed');
const workerIds = new Set(completed.map(e => e.threadId));
const overlaps = completed.some((a,i) => completed.some((b,j) => i !== j
  && a.threadId !== b.threadId && Math.max(a.startedAtMs,b.startedAtMs)
    < Math.min(a.completedAtMs,b.completedAtMs)));
console.log(JSON.stringify({ operation: 'single_fire_exchange_inner_workers',
  revision: aggregate.stateRevision, terrainRows: 1804, queryCount: 1, attackCount: 2,
  originalElapsedMs: baseline.elapsedMs, elapsedMs, originalRoomReads: baseline.reads,
  roomReads: reads, workers: workerIds.size, completedJobs: completed.length,
  independentComputationsOverlap: overlaps, entireOriginalResponseEqual: true,
  sourceUnchanged: true, providerCalls: 0, originalRoomWrites: 0,
  fullActionPerformanceCertification: false, trainingTruth: false }));
assert(workerIds.size >= 2 && completed.length === 3 && overlaps,
  'SINGLE_FIRE_EXCHANGE_GRAPH_AND_ATTACKS_STILL_SERIAL');
assert.equal(reads, 2, 'own initial snapshot and final authority read');
// The direct single-query UI/tool entry must use the same decomposition.
const direct = await adapter.query(request);
assert.deepEqual(direct, baseline.response);
// Another seat can commit while inner workers yield. Do not stamp the old
// complete probability/geometry as the current authoritative room.
let changed = false;
const staleAdapter = createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1({
  seatKey: attacker.sideKey,
  roomStore: { async loadRoom() { return changed
    ? { ...aggregate, stateRevision: aggregate.stateRevision + 1 } : aggregate; } },
  rulesRuntime: { instantiate() { throw Error('not used'); } },
  observeQueryBatchDiagnostic: event => {
    if(event.stage === 'query_worker_completed') changed = true;
  },
});
const stale = await staleAdapter.query(request);
assert.equal(stale.precision, 'unknown');
assert.equal(stale.findingSeverity, 'High');
assert.equal(stale.reason, 'RULES_QUERY_AUTHORITY_CHANGED_DURING_COMPUTATION');
assert.equal(hash(state), originalHash);
assert.equal(hash(capture), sourceHash);
console.log(JSON.stringify({ directSingleQueryParity: true,
  concurrentRoomChangeRejected: true, providerCalls: 0,
  originalRoomWrites: 0, trainingTruth: false }));
