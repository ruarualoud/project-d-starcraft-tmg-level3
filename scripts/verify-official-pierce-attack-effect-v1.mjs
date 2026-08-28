#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createOfficialAttackResolutionKernelV1 } from
  "../packages/rule-atoms/official-attack-resolution-kernel-v1.mjs";
import { createOfficialAttackResolutionKernelV2 } from
  "../packages/rule-atoms/official-attack-resolution-kernel-v2.mjs";
import {
  createOfficialAttackProfileCatalogueV1,
  getOfficialAttackProfileV1,
} from "../packages/source-data/official-attack-profile-catalogue-v1.mjs";
import { createOfficialCommandCenterDataset } from
  "../packages/source-data/official-command-center-adapter-v1.mjs";

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

const liveReport = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "official-live-source-snapshots-report.json"),
  "utf8",
));
const firestorePayloads = Object.fromEntries(await Promise.all([
  "army_units",
  "faction_cards",
  "rules_sections",
  "tactical_cards",
].map(async (collectionId) => [
  collectionId,
  JSON.parse(await readFile(path.join(FIRESTORE_DIR, `${collectionId}.json`), "utf8")),
])));
const snapshot = liveReport.commandSnapshot;
const dataset = createOfficialCommandCenterDataset({ snapshot, firestorePayloads });
const catalogue = createOfficialAttackProfileCatalogueV1({ snapshot, dataset });
const quadK12 = getOfficialAttackProfileV1(catalogue, {
  recordKey: "army_units:marauder",
  phase: "assault",
  weaponName: "Quad K12",
});
const kernelV1 = createOfficialAttackResolutionKernelV1();
const kernelV2 = createOfficialAttackResolutionKernelV2();

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

function target(combatTags) {
  return { armourThreshold: 3, combatTags };
}

check("historical_kernel_remains_frozen_without_pierce", () => {
  assert.equal(
    kernelV1.descriptor.kernelHash,
    "beb76453c6ba22ae2b42d4ce3b7659024a8177e28e5c05497d88200c126cf066",
  );
  expectFailure("ATTACK_EFFECT_HANDLER_UNAVAILABLE", () => kernelV1.plan({
    profile: quadK12,
    target: target(["armoured", "biological", "ground"]),
    distanceInches: 8,
    evadeEligible: false,
  }));
});

check("kernel_v2_declares_pierce_as_a_distinct_effect_handler", () => {
  assert.deepEqual(kernelV2.descriptor.supportedEffectAtomIds, [
    "attack-effect:long-range-v1",
    "attack-effect:pierce-v1",
    "attack-effect:surge-armour-bypass-v1",
  ]);
  assert.deepEqual(kernelV2.descriptor.stages, [
    "declaration",
    "hit",
    "effects",
    "armour",
    "evade",
    "damage",
  ]);
  assert.equal(kernelV2.descriptor.trainingTruth, false);
});

check("quad_k12_profile_keeps_base_damage_separate_from_pierce_parameters", () => {
  assert.equal(quadK12.damage, 1);
  assert.deepEqual(quadK12.effects.find((effect) => (
    effect.effectAtomId === "attack-effect:pierce-v1"
  )), {
    effectAtomId: "attack-effect:pierce-v1",
    parameters: { targetTag: "armoured", damage: 2 },
    sourceKind: "weapon_keyword",
  });
});

check("pierce_matches_armoured_and_replaces_damage_per_die", () => {
  const plan = kernelV2.plan({
    profile: quadK12,
    target: target(["armoured", "biological", "ground"]),
    distanceInches: 8,
    evadeEligible: false,
  });
  assert.deepEqual(plan.chance.layout, { hit: 3, surge: 1, armour: 3, evade: 0 });
  const result = kernelV2.resolve(plan, [3, 3, 1, 1, 1, 6, 6]);
  assert.equal(result.stages.hit.hits, 2);
  assert.equal(result.stages.effects.bypassedArmourHits, 1);
  assert.equal(result.stages.effects.pierceMatched, true);
  assert.equal(result.stages.effects.pierceTargetTag, "armoured");
  assert.equal(result.stages.armour.dice, 1);
  assert.equal(result.stages.armour.saves, 0);
  assert.equal(result.stages.damage.damagePoolDice, 2);
  assert.equal(result.stages.damage.baseDamagePerDie, 1);
  assert.equal(result.stages.damage.damagePerDie, 2);
  assert.equal(result.stages.damage.totalDamage, 4);
});

check("pierce_does_not_change_damage_for_a_nonmatching_tag", () => {
  const plan = kernelV2.plan({
    profile: quadK12,
    target: target(["biological", "ground", "light"]),
    distanceInches: 8,
    evadeEligible: false,
  });
  const result = kernelV2.resolve(plan, [3, 3, 1, 1, 1, 1, 6]);
  assert.equal(result.stages.effects.surgeMatched, false);
  assert.equal(result.stages.effects.pierceMatched, false);
  assert.equal(result.stages.damage.baseDamagePerDie, 1);
  assert.equal(result.stages.damage.damagePerDie, 1);
  assert.equal(result.stages.damage.totalDamage, 2);
});

check("pierce_parameters_fail_closed_when_the_profile_is_tampered", () => {
  const tampered = structuredClone(quadK12);
  const pierce = tampered.effects.find((effect) => (
    effect.effectAtomId === "attack-effect:pierce-v1"
  ));
  pierce.parameters.damage = 0;
  const body = Object.fromEntries(Object.entries(tampered).filter(([key]) => key !== "profileHash"));
  tampered.profileHash = hashStarcraftTmgContract(body);
  expectFailure("ATTACK_PIERCE_PARAMETERS_INVALID", () => kernelV2.plan({
    profile: tampered,
    target: target(["armoured", "biological", "ground"]),
    distanceInches: 8,
    evadeEligible: false,
  }));
});

check("known_effects_without_handlers_still_fail_closed", () => {
  const glaive = getOfficialAttackProfileV1(catalogue, {
    recordKey: "army_units:adept",
    phase: "assault",
    weaponName: "Glaive Cannon",
  });
  expectFailure("ATTACK_EFFECT_HANDLER_UNAVAILABLE", () => kernelV2.plan({
    profile: glaive,
    target: target(["biological", "ground", "light"]),
    distanceInches: 8,
    evadeEligible: false,
  }));
});

check("pierce_plan_and_resolution_hashes_bind_the_effect_result", () => {
  const plan = kernelV2.plan({
    profile: quadK12,
    target: target(["armoured", "biological", "ground"]),
    distanceInches: 8,
    evadeEligible: false,
  });
  const result = kernelV2.resolve(plan, [3, 3, 1, 1, 1, 6, 6]);
  assert.match(plan.planHash, /^[a-f0-9]{64}$/u);
  assert.match(result.resolutionHash, /^[a-f0-9]{64}$/u);
  const tampered = structuredClone(result);
  tampered.stages.damage.damagePerDie = 1;
  const body = Object.fromEntries(Object.entries(tampered).filter(([key]) => (
    key !== "resolutionHash"
  )));
  assert.notEqual(hashStarcraftTmgContract(body), result.resolutionHash);
});

const failed = acceptance.filter((entry) => !entry.passed);
const report = {
  schema: "starcraft_tmg_official_pierce_attack_effect_verification_v1",
  generatedAt: new Date().toISOString(),
  sourceSnapshotHash: snapshot.snapshotHash,
  normalizedDatasetHash: dataset.datasetHash,
  attackProfileCatalogueHash: catalogue.catalogueHash,
  historicalKernelHash: kernelV1.descriptor.kernelHash,
  kernelHash: kernelV2.descriptor.kernelHash,
  acceptancePassed: acceptance.length - failed.length,
  acceptanceTotal: acceptance.length,
  failures: failed,
  acceptance,
  trainingTruth: false,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-pierce-attack-effect-v1-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(JSON.stringify(report, null, 2));
if (failed.length > 0) process.exitCode = 1;
