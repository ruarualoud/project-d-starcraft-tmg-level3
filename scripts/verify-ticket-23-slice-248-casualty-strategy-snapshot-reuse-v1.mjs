#!/usr/bin/env node

// Concrete incoming-fire pattern: one fixed snapshot, multiple casualty choices
// and overlapping weapon queries repeat the unchanged mission-control baseline.
import assert from "node:assert/strict";
import { Hash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import * as ranged from
  "../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs";
import * as combat from
  "../packages/online-agent-session/combat-estimation-runtime-v1.mjs";
import { hashStarcraftTmgContract as hash } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";

const [capturePath, baselinePath, verificationPhase = "all"] = process.argv.slice(2);
assert(capturePath && baselinePath);
const capture = JSON.parse(await readFile(capturePath, "utf8"));
const state = structuredClone(capture.aggregate.envelope.state);
state.pieces = state.pieces.filter(p =>
  ["player1-marine-3", "player2-kerrigan-raptor"].includes(p.id));
assert.equal(state.pieces.length, 2);
assert.equal(state.board.terrain.length, 1804);
const target = state.pieces.find(p => p.id === "player2-kerrigan-raptor");
const liveIds = target.models.filter(m => !m.isDestroyed && m.isOnField !== false)
  .map(m => m.id);
assert(liveIds.length > 1);
const choices = [[liveIds[0]], [liveIds[1]], [liveIds[0]]];
const inputHash = hash(state);
const nativeUpdate = Hash.prototype.update;
function measured(operation) {
  let controls = 0;
  Hash.prototype.update = function (data, ...args) {
    if (typeof data === "string"
      && data.includes('"schemaVersion":"starcraft_tmg_official_mission_marker_control_kernel_v2"')
      && JSON.parse(data).schemaVersion
        === "starcraft_tmg_official_mission_marker_control_kernel_v2") controls += 1;
    return Reflect.apply(nativeUpdate, this, [data, ...args]);
  };
  const start = performance.now();
  try { return { result: operation(), controls, elapsedMs: performance.now() - start }; }
  finally { Hash.prototype.update = nativeUpdate; }
}
if (verificationPhase !== "probability_only") {
const createBatch = ranged.createOfficialSelectedRosterCasualtyStrategyBatchV1;
const batchResult = measured(() => {
  const batch = createBatch?.(state);
  return choices.map(ids => batch ? batch.project(target.id, ids)
    : ranged.projectOfficialSelectedRosterCasualtyStrategyV1(state, target.id, ids));
});
let baseline;
try { baseline = JSON.parse(await readFile(baselinePath, "utf8")); }
catch (error) {
  if (error.code !== "ENOENT") throw error;
  baseline = { inputHash, ...batchResult };
  await writeFile(baselinePath, JSON.stringify(baseline), { mode: 0o600 });
}
assert.equal(inputHash, baseline.inputHash);
assert.deepEqual(batchResult.result, baseline.result, "ENTIRE original casualty strategies unchanged");
assert(batchResult.result.every(r => r.missionMarkerControlConsequences.status
  === "exact_current_geometry"), "actual casualty/control seam must be exercised");
assert.equal(hash(state), inputHash);
console.log(JSON.stringify({ operation: "fixed_snapshot_casualty_strategy_reuse",
  originalRevision: capture.aggregate.stateRevision, choices: choices.length,
  uniqueLosses: 2, terrainRows: 1804, originalControlProjections: baseline.controls,
  controlProjections: batchResult.controls, originalMs: baseline.elapsedMs,
  currentMs: batchResult.elapsedMs, fullOriginalResultsEqual: true,
  providerCalls: 0, originalRoomWrites: 0, trainingTruth: false }));
assert.equal(batchResult.controls, 3,
  "CASUALTY_STRATEGY_REPEATS_BASELINE_CONTROL_AND_IDENTICAL_LOSS");
assert.equal(typeof createBatch, "function");

const mutable = structuredClone(state);
const owned = createBatch(mutable);
mutable.pieces.find(p => p.id === target.id).models[0].xInches += 2;
assert.deepEqual(owned.project(target.id, choices[0]), baseline.result[0]);
assert(Object.isFrozen(owned.project(target.id, choices[0])));
assert.throws(() => owned.project(target.id, ["missing-model"]),
  /SELECTED_RANGED_CASUALTY_MODEL_UNKNOWN/);
assert.throws(() => owned.project("missing-unit", []),
  /SELECTED_RANGED_CONTRIBUTION_PIECE_UNKNOWN/);
const changed = structuredClone(state);
changed.pieces.find(p => p.id === target.id).models.find(m => m.id === liveIds[0])
  .xInches += 0.125;
assert.deepEqual(createBatch(changed).project(target.id, choices[0]),
  ranged.projectOfficialSelectedRosterCasualtyStrategyV1(changed, target.id, choices[0]),
  "a new snapshot must not reuse old geometry");
}

// Same ordinary probability interface used by incoming stationary fire. Keep
// the complete terrain and source bundles; only local actor/target placement and
// one-model attacker isolate overlapping sample queries, never write a Room.
const probabilityState = structuredClone(capture.aggregate.envelope.state);
const attacker = probabilityState.pieces.find(p => p.id === "player1-marine-3");
const defender = probabilityState.pieces.find(p => p.id === "player2-hydralisk");
const leader = attacker.models[2];
for (const model of attacker.models) {
  model.isDestroyed = model !== leader;
  model.isOnField = model === leader;
}
attacker.destroyedModelIds = attacker.models.filter(m => m.isDestroyed).map(m => m.id);
attacker.currentModels = 1;
const attackerProfile = probabilityState.officialCombatProfileBundle.profiles
  .find(p => p.recordKey === attacker.officialUnitRecordKey);
attacker.currentSupply = attackerProfile.squadProfile.find(t =>
  t.minimumModels !== null && attacker.currentModels >= t.minimumModels
  && attacker.currentModels <= t.maximumModels).supply;
attacker.activatedPhases.assault = false;
attacker.xInches = leader.xInches;
attacker.yInches = leader.yInches;
const firstDefender = defender.models.find(m => !m.isDestroyed && m.isOnField !== false);
const dx = leader.xInches + 5 - firstDefender.xInches;
const dy = leader.yInches - firstDefender.yInches;
for (const model of defender.models) { model.xInches += dx; model.yInches += dy; }
defender.xInches += dx;
defender.yInches += dy;
defender.activatedPhases.assault = false;
probabilityState.pieces = [attacker, defender];
probabilityState.phase = "assault";
probabilityState.stage = "unit_activation";
probabilityState.activeSideKey = attacker.sideKey;
probabilityState.players[attacker.sideKey].passedPhases = {
  ...(probabilityState.players[attacker.sideKey].passedPhases || {}), assault: false,
};
probabilityState.phaseFirstActorByRound = {
  ...(probabilityState.phaseFirstActorByRound || {}),
  [`${Number(probabilityState.round)}:assault`]: {
    round: Number(probabilityState.round), phase: "assault",
    markerHolderSideKey: probabilityState.firstPlayerSideKey,
    chosenFirstActorSideKey: attacker.sideKey,
  },
};
probabilityState.selectedRosterActivationWindow = null;
probabilityState.pendingAction = null;
probabilityState.pendingReactionWindow = null;
delete probabilityState.pendingCurrentProductRangedSequence;
delete probabilityState.pendingCurrentProductRangedCasualtyChoice;
const probabilityHash = hash(probabilityState);
const probabilityBatch = combat.createStarcraftTmgAttackProbabilityBatchV1({
  state: probabilityState, sideKey: attacker.sideKey,
});
const domain = probabilityBatch.enumeration.parameterDomains.find(d =>
  d.weaponName.toLowerCase() === "c-14 rifle"
  && d.parameterSchema.targetUnitId.enum.includes(defender.id));
assert(domain, "ordinary Rules-owned ranged domain required");
const query = { domain, parameters: { targetUnitId: defender.id }, sampleBudget: 36 };
const cold = measured(() => combat.estimateStarcraftTmgAttackProbabilityV1({
  state: probabilityState, ...query,
}));
const first = measured(() => probabilityBatch.estimate(query));
const second = measured(() => probabilityBatch.estimate(query));
assert.deepEqual(first.result, cold.result, "all dice, probabilities, losses and result hashes unchanged");
assert.deepEqual(second.result, cold.result);
assert(first.controls > 0, "probability call must exercise actual casualty mission control");
assert.equal(second.controls, 0, "ordinary probability batch must reuse unchanged casualty strategies");
assert.equal(hash(probabilityState), probabilityHash);
const stale = structuredClone(domain);
stale.constraints.targetPlans[0].attackPlanHash = "altered";
assert.throws(() => probabilityBatch.estimate({ ...query, domain: stale }),
  /SELECTED_RANGED_PARAMETER_DOMAIN_STALE/);
console.log(JSON.stringify({ status: "passed", standaloneControls: cold.controls,
  firstBatchControls: first.controls, secondBatchControls: second.controls,
  entireProbabilityResultsEqual: true, newSnapshotsIndependent: true,
  callerMutationIsolated: true, staleDomainRejected: true,
  providerCalls: 0, originalRoomWrites: 0, trainingTruth: false }));
