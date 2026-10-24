#!/usr/bin/env node

// Reproduce repeated Rules enumeration in the ordinary fire-exchange consumer.
// This is a local hypothetical from a captured Room, never a Room mutation.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { Session } from "node:inspector";
import { enumerateOfficialSelectedRosterRangedActionsV1 } from
  "../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs";
import { estimateStarcraftTmgFireZoneExchangeV1 } from
  "../packages/online-agent-session/combat-estimation-runtime-v1.mjs";
import { hashStarcraftTmgContract as hash } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";

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
const inputHash = hash(input);
const session = new Session();
session.connect();
const post = (method, parameters = {}) => new Promise((resolve, reject) =>
  session.post(method, parameters, (error, result) => error ? reject(error) : resolve(result)));
let result;
let coverage;
const started = performance.now();
try {
  await post("Profiler.enable");
  await post("Profiler.startPreciseCoverage", { callCount: true, detailed: true });
  result = estimateStarcraftTmgFireZoneExchangeV1(input);
  coverage = await post("Profiler.takePreciseCoverage");
} finally {
  await post("Profiler.stopPreciseCoverage");
  session.disconnect();
}
const instrumentedMs = performance.now() - started;
const rangedCoverage = coverage.result.find(r =>
  r.url.endsWith("/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs"));
const enumerationCalls = rangedCoverage?.functions.find(f =>
  f.functionName === "enumerateOfficialSelectedRosterRangedActionsV1")?.ranges[0]?.count;
assert(Number.isInteger(enumerationCalls), "actual enumeration instrumentation required");
assert.equal(result.attackEstimates.length, 2, "both targets must reach real probability evaluation");
assert.deepEqual(result.attackEstimateFailures, []);
assert.equal(hash(input), inputHash);
let baseline;
try { baseline = JSON.parse(await readFile(baselinePath, "utf8")); }
catch (error) {
  if (error.code !== "ENOENT") throw error;
  baseline = { inputHash, enumerationCalls, instrumentedMs, result };
  await writeFile(baselinePath, JSON.stringify(baseline), { mode: 0o600 });
}
assert.equal(inputHash, baseline.inputHash);
assert.deepEqual(result, baseline.result,
  "ENTIRE fire-exchange output, distributions, losses and hashes unchanged");
console.log(JSON.stringify({ operation: "fire_exchange_shared_probability_batch",
  originalRevision: capture.aggregate.stateRevision, terrainRows: 1804, targets: 2,
  originalEnumerationCalls: baseline.enumerationCalls, enumerationCalls,
  fullOriginalResultEqual: true, inputUnchanged: true,
  instrumentedMs, instrumentedTimingIsPerformanceCertification: false,
  providerCalls: 0, originalRoomWrites: 0, trainingTruth: false }));
assert.equal(enumerationCalls, 1, "FIRE_EXCHANGE_REPEATS_UNCHANGED_RULES_ENUMERATION");
