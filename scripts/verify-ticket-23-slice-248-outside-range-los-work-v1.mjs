#!/usr/bin/env node

// Concrete sampled formation bottleneck: a target wholly beyond every weapon's
// maximum range still caused full per-model LOS traces and assessment hashes.
// Exercise the REAL frozen cards and 1804 terrain rows, including base-edge range.
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
const attacker = state.pieces.find(p => p.id === "player1-marine-3");
const target = state.pieces.find(p => p.id === "player2-hydralisk");
assert(attacker?.isOnField && target?.isOnField);
const attackingModels = attacker.models.slice(2, 4);
for (const model of attacker.models) {
  model.isDestroyed = !attackingModels.includes(model);
  model.isOnField = attackingModels.includes(model);
}
attacker.currentModels = attackingModels.length;
attacker.destroyedModelIds = attacker.models.filter(m => m.isDestroyed).map(m => m.id);
attacker.activatedPhases.assault = false;
state.pieces = [attacker, target];
state.phase = "assault";
state.stage = "unit_activation";
state.activeSideKey = attacker.sideKey;
state.players[attacker.sideKey].passedPhases.assault = false;
state.selectedRosterActivationWindow = null;
state.pendingAction = null;
state.pendingReactionWindow = null;
delete state.pendingCurrentProductRangedSequence;
delete state.pendingCurrentProductRangedCasualtyChoice;
const profile = state.officialAttackProfileCatalogue.profiles.find(p => (
  p.recordKey === attacker.officialUnitRecordKey
    && p.weaponName.toLowerCase() === "c-14 rifle" && p.phase === "assault"
));
assert(profile);
const normalRange = profile.range.normalRangeInches;
const boundaryOffset = normalRange
  + (attackingModels[0].baseWidthInches + target.models[0].baseWidthInches) / 2 - 0.01;
const inputFor = offset => {
  const input = structuredClone(state);
  const movingTarget = input.pieces[1];
  for (const [index, model] of movingTarget.models.entries()) {
    model.xInches = attackingModels[0].xInches + offset;
    model.yInches = attackingModels[0].yInches
      + index * (model.baseWidthInches + 0.1);
  }
  movingTarget.xInches = movingTarget.models[0].xInches;
  movingTarget.yInches = movingTarget.models[0].yInches;
  return input;
};

const nativeUpdate = Hash.prototype.update;
const results = [];
try {
  for (const [name, offset] of [["near", 5], ["base_edge_boundary", boundaryOffset],
    ["outside_all_ranges", 25]]) {
    const input = inputFor(offset);
    const inputHash = hash(input);
    let physicalLosHashCount = 0;
    Hash.prototype.update = function (data, ...args) {
      if (typeof data === "string" && data.includes(
        '"schemaVersion":"starcraft_tmg_selected_roster_ranged_los_v1"',
      ) && JSON.parse(data).schemaVersion === "starcraft_tmg_selected_roster_ranged_los_v1") {
        physicalLosHashCount += 1;
      }
      return Reflect.apply(nativeUpdate, this, [data, ...args]);
    };
    const started = performance.now();
    const enumeration = enumerate(input, { sideKey: attacker.sideKey, includeDisabled: true });
    const elapsedMs = performance.now() - started;
    Hash.prototype.update = nativeUpdate;
    assert.equal(hash(input), inputHash);
    if (name === "outside_all_ranges") {
      assert.equal(enumeration.parameterDomains.length, 0);
      assert(enumeration.candidates.some(c =>
        c.disabledReason === "SELECTED_RANGED_NO_VISIBLE_TARGET_IN_RANGE"));
    } else {
      assert(enumeration.parameterDomains.some(d => d.profileKey === profile.profileKey),
        `${name}: exact base-edge range must retain the real C-14 target`);
    }
    results.push({ name, offset, inputHash, enumeration, physicalLosHashCount, elapsedMs });
  }
} finally { Hash.prototype.update = nativeUpdate; }

// Same out-of-range geometry must still reject corrupt source/elevation inputs.
const invalidResults = [];
for (const corruption of ["los_bundle", "second_model_support"]) {
  const invalid = inputFor(25);
  if (corruption === "los_bundle") invalid.officialTerrainLosDataBundle.bundleHash = "altered";
  else invalid.pieces[1].models[1].supportTerrainIds = ["missing-terrain"];
  let enumeration = null;
  let failure = null;
  try { enumeration = enumerate(invalid, { sideKey: attacker.sideKey, includeDisabled: true }); }
  catch (error) { failure = String(error.message); }
  assert(failure || (enumeration.parameterDomains.length === 0
    && enumeration.candidates.some(c => c.disabledReason
      !== "SELECTED_RANGED_NO_VISIBLE_TARGET_IN_RANGE")),
  "out-of-range rejection must not hide invalid Rules input");
  invalidResults.push({ corruption, enumeration, failure });
}

let baseline;
try { baseline = JSON.parse(await readFile(baselinePath, "utf8")); }
catch (error) {
  if (error.code !== "ENOENT") throw error;
  baseline = { sourceRevision: capture.current.stateRevision, results, invalidResults };
  await writeFile(baselinePath, JSON.stringify(baseline), { mode: 0o600 });
}
assert.equal(capture.current.stateRevision, baseline.sourceRevision);
for (const [index, result] of results.entries()) {
  assert.equal(result.inputHash, baseline.results[index].inputHash);
  assert.deepEqual(result.enumeration, baseline.results[index].enumeration,
    "the ENTIRE original candidates, target domains, disabled reasons and hashes stay equal");
}
assert.deepEqual(invalidResults, baseline.invalidResults,
  "original corrupt-source/elevation rejection must stay exact");
console.log(JSON.stringify({ operation: "outside_maximum_range_before_los_traces",
  sourceRevision: capture.current.stateRevision, terrainRows: state.board.terrain.length,
  modelPairCount: attackingModels.length * target.models.length,
  results: results.map((result, index) => ({ name: result.name, offset: result.offset,
    physicalLosHashCount: result.physicalLosHashCount,
    originalPhysicalLosHashCount: baseline.results[index].physicalLosHashCount,
    elapsedMs: result.elapsedMs, originalElapsedMs: baseline.results[index].elapsedMs,
    enumerationHash: hash(result.enumeration), domainCount: result.enumeration.parameterDomains.length })),
  completeOriginalEnumerationsEqual: true, corruptInputRejectionsEqual: true,
  providerCalls: 0, originalRoomWrites: 0 }));
assert.equal(results.find(r => r.name === "outside_all_ranges").physicalLosHashCount,
  0, "RANGED_ENUMERATION_TRACES_WHOLLY_OUTSIDE_MAXIMUM_RANGE");
console.log(JSON.stringify({ status: "passed", trainingTruth: false }));
