#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { OFFICIAL_COMMAND_CENTER_FACTION_DELTA_2026_08_25_V1 } from
  "../content/official-command-center-faction-delta-2026-08-25-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createOfficialAttackResolutionKernelV3 } from
  "../packages/rule-atoms/official-attack-resolution-kernel-v3.mjs";
import { createOfficialAttackResolutionKernelV4 } from
  "../packages/rule-atoms/official-attack-resolution-kernel-v4.mjs";
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
const factionApplication = applyOfficialCommandCenterFirestoreDelta({
  basePayload: basePayloads.faction_cards,
  delta: OFFICIAL_COMMAND_CENTER_FACTION_DELTA_2026_08_25_V1,
});
const firestorePayloads = {
  ...basePayloads,
  faction_cards: factionApplication.firestorePayload,
};
const snapshot = driftReport.currentOfficialSnapshot.snapshot;
const dataset = createOfficialCommandCenterDataset({ snapshot, firestorePayloads });
const catalogue = createOfficialAttackProfileCatalogueV1({ snapshot, dataset });
const c14Rifle = getOfficialAttackProfileV1(catalogue, {
  recordKey: "army_units:jim_raynor",
  phase: "assault",
  weaponName: "C-14 rifle",
});
const kernelV3 = createOfficialAttackResolutionKernelV3();
const kernelV4 = createOfficialAttackResolutionKernelV4();

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

function target() {
  return {
    armourThreshold: 5,
    evadeThreshold: 5,
    combatTags: ["biological", "ground", "light"],
  };
}

function unengaged() {
  return { eligible: false, reason: "none" };
}

function rehashProfile(profile) {
  const body = Object.fromEntries(Object.entries(profile).filter(([key]) => key !== "profileHash"));
  profile.profileHash = hashStarcraftTmgContract(body);
  return profile;
}

check("historical_kernel_v3_remains_frozen_without_burst_fire", () => {
  assert.equal(
    kernelV3.descriptor.kernelHash,
    "6dbe0456b5e4a641fa13952dc805f65df2877aadbd5fbc663015fef21d6c1749",
  );
  expectFailure("ATTACK_EFFECT_HANDLER_UNAVAILABLE", () => kernelV3.plan({
    profile: c14Rifle,
    target: target(),
    distanceInches: 8,
    evadeEligibility: unengaged(),
  }));
});

check("kernel_v4_registers_burst_fire_as_one_independent_effect", () => {
  assert.deepEqual(kernelV4.descriptor.supportedEffectAtomIds, [
    "attack-effect:anti-evade-v1",
    "attack-effect:burst-fire-v1",
    "attack-effect:long-range-v1",
    "attack-effect:pierce-v1",
    "attack-effect:surge-armour-bypass-v1",
  ]);
});

check("official_raynor_profile_keeps_burst_fire_parameterized", () => {
  assert.equal(c14Rifle.profileHash, "a5f5beda031eacdbaeba5949b4dd03cff662432a1acfb35b908bab56165e3ac3");
  assert.equal(c14Rifle.rateOfAttack, 6);
  assert.deepEqual(c14Rifle.effects, [
    {
      effectAtomId: "attack-effect:surge-armour-bypass-v1",
      parameters: { targetTags: ["light"], diceExpression: "D3+1" },
      sourceKind: "surge",
    },
    {
      effectAtomId: "attack-effect:burst-fire-v1",
      parameters: { maximumDistanceInches: 8, additionalRateOfAttack: 3 },
      sourceKind: "weapon_keyword",
    },
  ]);
});

check("burst_fire_applies_at_the_inclusive_eight_inch_boundary", () => {
  const plan = kernelV4.plan({
    profile: c14Rifle,
    target: target(),
    distanceInches: 8,
    evadeEligibility: unengaged(),
  });
  assert.equal(plan.printedRateOfAttack, 6);
  assert.equal(plan.effectiveRateOfAttack, 9);
  assert.deepEqual(plan.burstFire, {
    effectAtomId: "attack-effect:burst-fire-v1",
    maximumDistanceInches: 8,
    additionalRateOfAttack: 3,
    applied: true,
  });
  assert.deepEqual(plan.chance.layout, { hit: 9, surge: 1, armour: 9, evade: 0 });
  assert.equal(plan.chance.count, 19);
});

check("burst_fire_does_not_apply_outside_its_distance", () => {
  const plan = kernelV4.plan({
    profile: c14Rifle,
    target: target(),
    distanceInches: 8.001,
    evadeEligibility: unengaged(),
  });
  assert.equal(plan.effectiveRateOfAttack, 6);
  assert.equal(plan.burstFire.applied, false);
  assert.deepEqual(plan.chance.layout, { hit: 6, surge: 1, armour: 6, evade: 0 });
  assert.equal(plan.chance.count, 13);
});

check("effective_roa_drives_hit_allocation_and_the_existing_damage_pipeline", () => {
  const plan = kernelV4.plan({
    profile: c14Rifle,
    target: target(),
    distanceInches: 8,
    evadeEligibility: unengaged(),
  });
  const result = kernelV4.resolve(plan, [
    3, 1, 1, 1, 1, 1, 1, 1, 1,
    1,
    6, 6, 6, 6, 6, 6, 6, 6, 6,
  ]);
  assert.equal(result.stages.hit.dice, 9);
  assert.equal(result.stages.hit.hits, 1);
  assert.equal(result.stages.effects.burstFireApplied, true);
  assert.equal(result.stages.effects.printedRateOfAttack, 6);
  assert.equal(result.stages.effects.effectiveRateOfAttack, 9);
  assert.equal(result.stages.effects.bypassedArmourHits, 1);
  assert.equal(result.stages.armour.dice, 0);
  assert.equal(result.stages.damage.totalDamage, 1);
});

check("invalid_burst_fire_parameters_fail_closed", () => {
  const invalid = structuredClone(c14Rifle);
  invalid.effects.find((entry) => (
    entry.effectAtomId === "attack-effect:burst-fire-v1"
  )).parameters.maximumDistanceInches = 0;
  rehashProfile(invalid);
  expectFailure("ATTACK_BURST_FIRE_PARAMETERS_INVALID", () => kernelV4.plan({
    profile: invalid,
    target: target(),
    distanceInches: 0,
    evadeEligibility: unengaged(),
  }));
});

check("plan_and_resolution_hashes_bind_burst_distance_and_effective_roa", () => {
  const plan = kernelV4.plan({
    profile: c14Rifle,
    target: target(),
    distanceInches: 8,
    evadeEligibility: unengaged(),
  });
  const result = kernelV4.resolve(plan, Array.from({ length: 19 }, () => 1));
  assert.match(plan.planHash, /^[a-f0-9]{64}$/u);
  assert.match(result.resolutionHash, /^[a-f0-9]{64}$/u);
  const tampered = structuredClone(plan);
  tampered.effectiveRateOfAttack = 6;
  const body = Object.fromEntries(Object.entries(tampered).filter(([key]) => key !== "planHash"));
  assert.notEqual(hashStarcraftTmgContract(body), plan.planHash);
});

const failures = acceptance.filter((entry) => !entry.passed);
const report = {
  schema: "starcraft_tmg_official_burst_fire_attack_effect_verification_v1",
  generatedAt: new Date().toISOString(),
  sourceSnapshotHash: snapshot.snapshotHash,
  normalizedDatasetHash: dataset.datasetHash,
  attackProfileCatalogueHash: catalogue.catalogueHash,
  officialProfileHash: c14Rifle.profileHash,
  historicalKernelHash: kernelV3.descriptor.kernelHash,
  kernelHash: kernelV4.descriptor.kernelHash,
  acceptancePassed: acceptance.length - failures.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures,
  rulesTruth: "official_parameterized_burst_fire_distance_and_effective_rate_of_attack",
  trainingTruth: false,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-burst-fire-attack-effect-v1-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);
console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  failures,
  officialProfileHash: report.officialProfileHash,
  historicalKernelHash: report.historicalKernelHash,
  kernelHash: report.kernelHash,
  rulesTruth: report.rulesTruth,
  trainingTruth: report.trainingTruth,
}, null, 2));
if (failures.length > 0) process.exitCode = 1;
