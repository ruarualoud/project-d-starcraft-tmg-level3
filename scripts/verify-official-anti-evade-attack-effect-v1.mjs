#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { OFFICIAL_COMMAND_CENTER_FACTION_DELTA_2026_08_25_V1 } from
  "../content/official-command-center-faction-delta-2026-08-25-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createOfficialAttackResolutionKernelV2 } from
  "../packages/rule-atoms/official-attack-resolution-kernel-v2.mjs";
import { createOfficialAttackResolutionKernelV3 } from
  "../packages/rule-atoms/official-attack-resolution-kernel-v3.mjs";
import {
  createOfficialAttackProfileCatalogueV1,
  getOfficialAttackProfileV1,
} from "../packages/source-data/official-attack-profile-catalogue-v1.mjs";
import { createOfficialCommandCenterDataset } from
  "../packages/source-data/official-command-center-adapter-v1.mjs";
import { applyOfficialCommandCenterFirestoreDelta } from
  "../packages/source-data/official-command-center-snapshot-delta-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const FIRESTORE_DIR = path.join(
  ROOT,
  "build",
  "source-intake",
  "official-rules",
  "command-center",
  "firestore",
);
const driftReport = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "official-command-center-community-drift-report.json"),
  "utf8",
));
const basePayloads = Object.fromEntries(await Promise.all([
  "army_units",
  "faction_cards",
  "rules_sections",
  "tactical_cards",
].map(async (collectionId) => [
  collectionId,
  JSON.parse(await readFile(path.join(FIRESTORE_DIR, `${collectionId}.json`), "utf8")),
])));
const application = applyOfficialCommandCenterFirestoreDelta({
  basePayload: basePayloads.faction_cards,
  delta: OFFICIAL_COMMAND_CENTER_FACTION_DELTA_2026_08_25_V1,
});
const firestorePayloads = {
  ...basePayloads,
  faction_cards: application.firestorePayload,
};
const snapshot = driftReport.currentOfficialSnapshot.snapshot;
const dataset = createOfficialCommandCenterDataset({ snapshot, firestorePayloads });
const catalogue = createOfficialAttackProfileCatalogueV1({ snapshot, dataset });
const glaiveCannon = getOfficialAttackProfileV1(catalogue, {
  recordKey: "army_units:adept",
  phase: "assault",
  weaponName: "Glaive Cannon",
});
const c14Rifle = getOfficialAttackProfileV1(catalogue, {
  recordKey: "army_units:marine",
  phase: "assault",
  weaponName: "C-14 rifle",
});
const kernelV2 = createOfficialAttackResolutionKernelV2();
const kernelV3 = createOfficialAttackResolutionKernelV3();

const acceptance = [];
function check(id, fn) {
  try {
    fn();
    acceptance.push({ id, passed: true });
  } catch (error) {
    acceptance.push({ id, passed: false, error: String(error?.stack || error) });
  }
}

function expectFailure(code, fn) {
  assert.throws(fn, (error) => String(error?.message || error).startsWith(code));
}

function target(input = {}) {
  return {
    armourThreshold: input.armourThreshold ?? 5,
    evadeThreshold: input.evadeThreshold === undefined ? 5 : input.evadeThreshold,
    combatTags: input.combatTags || ["biological", "ground", "light"],
  };
}

function engagedEvade() {
  return {
    eligible: true,
    reason: "target_engaged_and_suffering_ranged_damage",
  };
}

function rehashProfile(profile) {
  const body = Object.fromEntries(Object.entries(profile).filter(([key]) => key !== "profileHash"));
  profile.profileHash = hashStarcraftTmgContract(body);
  return profile;
}

check("historical_kernel_v2_remains_frozen_without_anti_evade", () => {
  assert.equal(
    kernelV2.descriptor.kernelHash,
    "63a686322c448c459b62260a7e8af6c2a1b0ccac46686d91e61431e29741cfe1",
  );
  expectFailure("ATTACK_EFFECT_HANDLER_UNAVAILABLE", () => kernelV2.plan({
    profile: glaiveCannon,
    target: target(),
    distanceInches: 0,
    evadeEligible: false,
  }));
});

check("kernel_v3_registers_anti_evade_as_an_independent_effect", () => {
  assert.deepEqual(kernelV3.descriptor.supportedEffectAtomIds, [
    "attack-effect:anti-evade-v1",
    "attack-effect:long-range-v1",
    "attack-effect:pierce-v1",
    "attack-effect:surge-armour-bypass-v1",
  ]);
  assert.deepEqual(kernelV3.descriptor.stages, [
    "declaration",
    "hit",
    "effects",
    "armour",
    "evade",
    "damage",
  ]);
});

check("official_glaive_profile_keeps_anti_evade_parameterized", () => {
  assert.equal(glaiveCannon.profileHash, "5e5b31ba33b2c1a1fb29b07acfdda721b7749f871ad970902657fa3c2491394a");
  assert.deepEqual(glaiveCannon.effects, [
    {
      effectAtomId: "attack-effect:surge-armour-bypass-v1",
      parameters: { targetTags: ["light"], diceExpression: "D3+1" },
      sourceKind: "surge",
    },
    {
      effectAtomId: "attack-effect:anti-evade-v1",
      parameters: { evadeThresholdModifier: -1 },
      sourceKind: "weapon_keyword",
    },
  ]);
});

check("anti_evade_modifies_the_target_number_before_preallocated_rolls", () => {
  const plan = kernelV3.plan({
    profile: glaiveCannon,
    target: target(),
    distanceInches: 0,
    evadeEligibility: engagedEvade(),
  });
  assert.deepEqual(plan.chance.layout, { hit: 2, surge: 1, armour: 2, evade: 2 });
  assert.equal(plan.chance.count, 7);
  assert.equal(plan.evade.baseThreshold, 5);
  assert.equal(plan.evade.modifier, -1);
  assert.equal(plan.evade.targetNumberDelta, 1);
  assert.equal(plan.evade.effectiveThreshold, 6);
  assert.equal(plan.evade.modifierAppliedBeforeRoll, true);
  assert.equal(plan.evade.modifiesDieResult, false);
});

check("surge_bypasses_armour_but_not_evade_and_one_die_is_confirmed_damage", () => {
  const plan = kernelV3.plan({
    profile: glaiveCannon,
    target: target(),
    distanceInches: 0,
    evadeEligibility: engagedEvade(),
  });
  const result = kernelV3.resolve(plan, [3, 3, 1, 6, 6, 5, 6]);
  assert.equal(result.stages.hit.hits, 2);
  assert.equal(result.stages.effects.bypassedArmourHits, 2);
  assert.equal(result.stages.armour.dice, 0);
  assert.deepEqual(result.stages.armour.unusedPreallocatedRolls, [6, 6]);
  assert.equal(result.stages.evade.damagePoolBeforeEvade, 2);
  assert.deepEqual(result.stages.evade.rolls, [5, 6]);
  assert.equal(result.stages.evade.saves, 1);
  assert.equal(result.stages.evade.confirmedDamageDice, 1);
  assert.equal(result.stages.damage.damagePoolDice, 1);
  assert.equal(result.stages.damage.totalDamage, 1);
});

check("natural_six_succeeds_natural_one_fails_and_threshold_is_bounded", () => {
  const tampered = structuredClone(glaiveCannon);
  tampered.effects.find((entry) => (
    entry.effectAtomId === "attack-effect:anti-evade-v1"
  )).parameters.evadeThresholdModifier = -10;
  rehashProfile(tampered);
  const plan = kernelV3.plan({
    profile: tampered,
    target: target({ evadeThreshold: 2 }),
    distanceInches: 0,
    evadeEligibility: engagedEvade(),
  });
  assert.equal(plan.evade.unboundedThreshold, 12);
  assert.equal(plan.evade.effectiveThreshold, 6);
  const result = kernelV3.resolve(plan, [3, 3, 1, 6, 6, 1, 6]);
  assert.equal(result.stages.evade.saves, 1);
  assert.deepEqual(result.stages.evade.naturalFailures, [1]);
  assert.deepEqual(result.stages.evade.naturalSuccesses, [6]);
});

check("a_null_evade_characteristic_cannot_roll_even_when_engaged", () => {
  expectFailure("ATTACK_EVADE_NULL_VALUE", () => kernelV3.plan({
    profile: glaiveCannon,
    target: target({ evadeThreshold: null }),
    distanceInches: 0,
    evadeEligibility: engagedEvade(),
  }));
});

check("without_an_evade_grant_no_evade_dice_are_added", () => {
  const plan = kernelV3.plan({
    profile: c14Rifle,
    target: target(),
    distanceInches: 8,
    evadeEligibility: { eligible: false, reason: "none" },
  });
  assert.equal(plan.evade.eligible, false);
  assert.equal(plan.chance.layout.evade, 0);
});

check("plan_and_resolution_hashes_bind_modifier_and_evade_results", () => {
  const plan = kernelV3.plan({
    profile: glaiveCannon,
    target: target(),
    distanceInches: 0,
    evadeEligibility: engagedEvade(),
  });
  const result = kernelV3.resolve(plan, [3, 3, 1, 6, 6, 5, 6]);
  assert.match(plan.planHash, /^[a-f0-9]{64}$/u);
  assert.match(result.resolutionHash, /^[a-f0-9]{64}$/u);
  const tampered = structuredClone(result);
  tampered.stages.evade.effectiveThreshold = 5;
  const body = Object.fromEntries(Object.entries(tampered).filter(([key]) => (
    key !== "resolutionHash"
  )));
  assert.notEqual(hashStarcraftTmgContract(body), result.resolutionHash);
});

const failures = acceptance.filter((entry) => !entry.passed);
const report = {
  schema: "starcraft_tmg_official_anti_evade_attack_effect_verification_v1",
  generatedAt: new Date().toISOString(),
  sourceSnapshotHash: snapshot.snapshotHash,
  normalizedDatasetHash: dataset.datasetHash,
  attackProfileCatalogueHash: catalogue.catalogueHash,
  historicalKernelHash: kernelV2.descriptor.kernelHash,
  kernelHash: kernelV3.descriptor.kernelHash,
  acceptancePassed: acceptance.length - failures.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures,
  effectHandlersExecutable: 4,
  effectHandlersRemaining: 9,
  trainingTruth: false,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-anti-evade-attack-effect-v1-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) process.exitCode = 1;
