#!/usr/bin/env node

// Reproduce the sampled r71 hotspot: the same ordered physical model pair is
// serialized/hashed again for each weapon in one complete ranged enumeration.
// Frozen real cards and all 1804 terrain records remain present; no Room opens.
import assert from "node:assert/strict";
import { Hash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { enumerateOfficialSelectedRosterRangedActionsV1 as enumerate } from
  "../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs";
import { hashStarcraftTmgContract as hash } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";

const [capturePath, baselinePath] = process.argv.slice(2);
assert(capturePath && baselinePath);
const capture = JSON.parse(await readFile(capturePath, "utf8"));
const state = structuredClone(capture.current.state);
const attacker = state.pieces.find(p => p.id === "player1-goliath-2");
const target = state.pieces.find(p => p.id === "player2-hydralisk");
assert(attacker?.isOnField && target?.isOnField);
const attackerModel = attacker.models[0];
const targetModel = target.models[0];
for (const model of target.models) {
  model.isDestroyed = model !== targetModel;
  model.isOnField = model === targetModel;
}
target.destroyedModelIds = target.models.filter(m => m.isDestroyed).map(m => m.id);
target.currentModels = 1;
state.pieces = [attacker, target];
state.phase = "assault";
state.stage = "unit_activation";
state.activeSideKey = attacker.sideKey;
state.players[attacker.sideKey].passedPhases.assault = false;
state.phaseFirstActorByRound[`${state.round}:assault`] = {
  ...state.phaseFirstActorByRound["1:assault"], round: state.round,
  phase: "assault", chosenFirstActorSideKey: attacker.sideKey,
};
attacker.activatedPhases.assault = false;
state.selectedRosterActivationWindow = null;
state.pendingAction = null;
state.pendingReactionWindow = null;
delete state.pendingCurrentProductRangedSequence;
delete state.pendingCurrentProductRangedCasualtyChoice;

const nativeUpdate = Hash.prototype.update;
const cases = [];
try {
  // Different positions keep the same public unit/model IDs. A cache must not
  // escape its enumeration and reuse the first geometry in the next call.
  for (const offset of [5, 15]) {
    targetModel.xInches = attackerModel.xInches + offset;
    targetModel.yInches = attackerModel.yInches;
    target.xInches = targetModel.xInches;
    target.yInches = targetModel.yInches;
    const inputHash = hash(state);
    const physicalCanonicalUses = new Map();
    Hash.prototype.update = function (data, ...args) {
      if (typeof data === "string" && data.includes(
        '"schemaVersion":"starcraft_tmg_selected_roster_ranged_los_v1"',
      )) {
        const body = JSON.parse(data);
        if (body.schemaVersion === "starcraft_tmg_selected_roster_ranged_los_v1") {
          physicalCanonicalUses.set(data, (physicalCanonicalUses.get(data) || 0) + 1);
        }
      }
      return Reflect.apply(nativeUpdate, this, [data, ...args]);
    };
    const started = performance.now();
    const enumeration = enumerate(state, {
      sideKey: attacker.sideKey, includeDisabled: true,
    });
    const elapsedMs = performance.now() - started;
    Hash.prototype.update = nativeUpdate;
    assert.equal(hash(state), inputHash, "enumeration must not mutate its caller");
    assert(enumeration.parameterDomains.length > 0,
      "the real long-range weapon must keep an executable target");
    const totalPhysicalHashes = [...physicalCanonicalUses.values()]
      .reduce((sum, count) => sum + count, 0);
    assert(physicalCanonicalUses.size > 0, "probe must reach real ranged LOS");
    cases.push({ offset, inputHash, enumeration, elapsedMs, totalPhysicalHashes,
      distinctPhysicalHashes: physicalCanonicalUses.size });
  }
} finally { Hash.prototype.update = nativeUpdate; }

let baseline;
try { baseline = JSON.parse(await readFile(baselinePath, "utf8")); }
catch (error) {
  if (error.code !== "ENOENT") throw error;
  baseline = { sourceRevision: capture.current.stateRevision, cases };
  await writeFile(baselinePath, JSON.stringify(baseline), { mode: 0o600 });
}
assert.equal(capture.current.stateRevision, baseline.sourceRevision);
for (const [index, result] of cases.entries()) {
  assert.equal(result.inputHash, baseline.cases[index].inputHash);
  assert.deepEqual(result.enumeration, baseline.cases[index].enumeration,
    "complete weapon-specific candidates, domains, disabled reasons and hashes stay equal");
}
assert.notDeepEqual(cases[0].enumeration, cases[1].enumeration,
  "changed geometry with unchanged IDs must not reuse the old result");
console.log(JSON.stringify({ operation: "same_pair_multiple_weapon_enumeration",
  sourceRevision: capture.current.stateRevision,
  terrainRows: state.board.terrain.length,
  cases: cases.map((result, index) => ({ offset: result.offset,
    totalPhysicalHashes: result.totalPhysicalHashes,
    distinctPhysicalHashes: result.distinctPhysicalHashes,
    originalPhysicalHashes: baseline.cases[index].totalPhysicalHashes,
    elapsedMs: result.elapsedMs, originalElapsedMs: baseline.cases[index].elapsedMs,
    domainCount: result.enumeration.parameterDomains.length,
    enumerationHash: hash(result.enumeration) })),
  completeOriginalEnumerationsEqual: true, callerStateUnchanged: true,
  changedGeometryObserved: true, providerCalls: 0, originalRoomWrites: 0 }));
for (const result of cases) assert.equal(result.totalPhysicalHashes,
  result.distinctPhysicalHashes, "RANGED_ENUMERATION_REHASHES_IDENTICAL_PHYSICAL_PAIR");
console.log(JSON.stringify({ status: "passed", trainingTruth: false }));
