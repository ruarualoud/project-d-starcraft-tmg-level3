#!/usr/bin/env node

// Concrete bug: one ranged Apply enumerates the same validated state twice.
// Isolate local miss/defender-choice transitions, preserving all frozen terrain.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { Session } from "node:inspector";
import * as ranged from
  "../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs";
import { hashStarcraftTmgContract as hash } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";

const [capturePath, baselinePath] = process.argv.slice(2);
assert(capturePath && baselinePath);
const capture = JSON.parse(await readFile(capturePath, "utf8"));
const state = structuredClone(capture.aggregate.envelope.state);
assert.equal(state.board.terrain.length, 1804);
const attacker = state.pieces.find(p => p.id === "player1-marine-3");
const defender = state.pieces.find(p => p.id === "player2-kerrigan-raptor");
assert(attacker && defender);
const leader = attacker.models[2];
assert(leader && !leader.isDestroyed && leader.isOnField !== false);
function isolateModels(piece, liveIds) {
  for (const model of piece.models) {
    model.isDestroyed = !liveIds.includes(model.id);
    model.isOnField = liveIds.includes(model.id);
  }
  piece.destroyedModelIds = piece.models.filter(m => m.isDestroyed).map(m => m.id);
  piece.currentModels = liveIds.length;
  const profile = state.officialCombatProfileBundle.profiles
    .find(p => p.recordKey === piece.officialUnitRecordKey);
  piece.currentSupply = profile.squadProfile.find(t =>
    t.minimumModels !== null && piece.currentModels >= t.minimumModels
    && piece.currentModels <= t.maximumModels).supply;
  piece.activatedPhases.assault = false;
}
isolateModels(attacker, [leader.id]);
const liveDefenders = defender.models.filter(m => !m.isDestroyed && m.isOnField !== false)
  .slice(0, 3);
assert.equal(liveDefenders.length, 3);
isolateModels(defender, liveDefenders.map(m => m.id));
attacker.xInches = leader.xInches;
attacker.yInches = leader.yInches;
const dx = leader.xInches + 5 - liveDefenders[0].xInches;
const dy = leader.yInches - liveDefenders[0].yInches;
for (const model of defender.models) { model.xInches += dx; model.yInches += dy; }
defender.xInches += dx;
defender.yInches += dy;
state.pieces = [attacker, defender];
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
const enumeration = ranged.enumerateOfficialSelectedRosterRangedActionsV1(state, {
  sideKey: attacker.sideKey, includeDisabled: true,
});
const domain = enumeration.parameterDomains.find(d =>
  d.pieceId === attacker.id && d.weaponName.toLowerCase() === "c-14 rifle"
  && d.parameterSchema.targetUnitId.enum.includes(defender.id));
assert(domain, "actual Rules-owned attack domain required");
const { action } = ranged.instantiateOfficialSelectedRosterRangedActionV1(
  state, domain, { targetUnitId: defender.id });
const chance = action.rangedPlan.chance;
assert(chance.layout.hit >= 2);
const misses = Array(chance.count).fill(1);
const hits = misses.map((roll, index) => index < chance.layout.hit ? 6 : roll);
const inputHash = hash({ state, action, misses, hits });
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
  result = [misses, hits].map(chanceReveals =>
    ranged.applyOfficialSelectedRosterRangedActionV1(state, action, { chanceReveals }));
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
assert(Number.isInteger(enumerationCalls));
assert(!result[0].state.pendingCurrentProductRangedCasualtyChoice, "miss settles ordinary sequence");
assert(result[1].state.pendingCurrentProductRangedCasualtyChoice, "hit opens defender-owned choice");
const stale = structuredClone(action);
stale.rangedPlan.attackPlanHash = "altered";
assert.throws(() => ranged.applyOfficialSelectedRosterRangedActionV1(state, stale,
  { chanceReveals: hits }), /SELECTED_RANGED_ACTION_STALE/);
assert.equal(hash({ state, action, misses, hits }), inputHash);
let baseline;
try { baseline = JSON.parse(await readFile(baselinePath, "utf8")); }
catch (error) {
  if (error.code !== "ENOENT") throw error;
  baseline = { inputHash, result, enumerationCalls, instrumentedMs };
  await writeFile(baselinePath, JSON.stringify(baseline), { mode: 0o600 });
}
assert.equal(inputHash, baseline.inputHash);
assert.deepEqual(result, baseline.result,
  "ENTIRE post-state, dice, casualty ownership, event and hash outputs unchanged");
console.log(JSON.stringify({ operation: "ranged_apply_enumeration_reuse",
  originalRevision: capture.aggregate.stateRevision, terrainRows: 1804, transitions: 2,
  missSequenceAndDefenderChoiceExercised: true, staleActionRejected: true,
  originalEnumerationCalls: baseline.enumerationCalls, enumerationCalls,
  fullOriginalResultEqual: true, inputUnchanged: true,
  instrumentedMs, instrumentedTimingIsPerformanceCertification: false,
  providerCalls: 0, originalRoomWrites: 0, trainingTruth: false }));
assert.equal(enumerationCalls, 2, "RANGED_APPLY_REPEATS_SAME_RULES_ENUMERATION");
