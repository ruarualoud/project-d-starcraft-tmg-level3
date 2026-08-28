#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { OFFICIAL_COMMAND_CENTER_FACTION_DELTA_2026_08_25_V1 } from
  "../content/official-command-center-faction-delta-2026-08-25-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createOfficialAttackResolutionKernelV4 } from
  "../packages/rule-atoms/official-attack-resolution-kernel-v4.mjs";
import { createOfficialAttackResolutionKernelV5 } from
  "../packages/rule-atoms/official-attack-resolution-kernel-v5.mjs";
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
const commandoRifle = getOfficialAttackProfileV1(catalogue, {
  recordKey: "army_units:jim_raynor",
  phase: "assault",
  weaponName: "Commando Rifle",
});
const kernelV4 = createOfficialAttackResolutionKernelV4();
const kernelV5 = createOfficialAttackResolutionKernelV5();
const engagementGraphHash = hashStarcraftTmgContract({
  schema: "starcraft_tmg_bulky_kernel_engagement_fixture_v1",
  modelEdges: [],
});

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

function engagement(engaged) {
  return {
    engaged,
    source: "official_engagement_graph_v2",
    graphHash: engagementGraphHash,
  };
}

function rehashProfile(profile) {
  const body = Object.fromEntries(Object.entries(profile).filter(([key]) => key !== "profileHash"));
  profile.profileHash = hashStarcraftTmgContract(body);
  return profile;
}

check("historical_kernel_v4_remains_frozen_without_bulky", () => {
  assert.equal(
    kernelV4.descriptor.kernelHash,
    "820d1b7b7ebb1e7d6a5cf0bf5e6f8be5f300c14af0c1711e9e08b273e4fc8afe",
  );
  expectFailure("ATTACK_EFFECT_HANDLER_UNAVAILABLE", () => kernelV4.plan({
    profile: commandoRifle,
    target: target(),
    distanceInches: 12,
    evadeEligibility: unengaged(),
  }));
});

check("kernel_v5_registers_bulky_as_one_independent_effect", () => {
  assert.deepEqual(kernelV5.descriptor.supportedEffectAtomIds, [
    "attack-effect:anti-evade-v1",
    "attack-effect:bulky-v1",
    "attack-effect:burst-fire-v1",
    "attack-effect:long-range-v1",
    "attack-effect:pierce-v1",
    "attack-effect:surge-armour-bypass-v1",
  ]);
});

check("official_commando_rifle_keeps_bulky_parameterless", () => {
  assert.equal(
    commandoRifle.profileHash,
    "0fa6eb192876d3cda244d90850df04fea4c5c1875a1ae49bf04523713ee0550e",
  );
  assert.equal(commandoRifle.rateOfAttack, 3);
  assert.equal(commandoRifle.range.normalRangeInches, 18);
  assert.deepEqual(commandoRifle.effects, [
    {
      effectAtomId: "attack-effect:surge-armour-bypass-v1",
      parameters: { targetTags: ["armoured"], diceExpression: "D3" },
      sourceKind: "surge",
    },
    {
      effectAtomId: "attack-effect:bulky-v1",
      parameters: {},
      sourceKind: "weapon_keyword",
    },
    {
      effectAtomId: "attack-effect:pierce-v1",
      parameters: { targetTag: "armoured", damage: 3 },
      sourceKind: "weapon_keyword",
    },
  ]);
});

check("bulky_unengaged_attacker_keeps_the_printed_attack_profile", () => {
  const plan = kernelV5.plan({
    profile: commandoRifle,
    target: target(),
    distanceInches: 18,
    evadeEligibility: unengaged(),
    attackerEngagement: engagement(false),
  });
  assert.equal(plan.printedRateOfAttack, 3);
  assert.equal(plan.effectiveRateOfAttack, 3);
  assert.deepEqual(plan.chance.layout, { hit: 3, surge: 1, armour: 3, evade: 0 });
  assert.equal(plan.chance.count, 7);
  assert.deepEqual(plan.bulky, {
    effectAtomId: "attack-effect:bulky-v1",
    attackerEngaged: false,
    prohibitionCheckedBeforeChance: true,
  });
});

check("bulky_engaged_attacker_is_prohibited_before_chance", () => {
  expectFailure("ATTACK_BULKY_ENGAGED_PROHIBITION", () => kernelV5.plan({
    profile: commandoRifle,
    target: target(),
    distanceInches: 1,
    evadeEligibility: unengaged(),
    attackerEngagement: engagement(true),
  }));
});

check("bulky_requires_rules_derived_engagement_evidence", () => {
  expectFailure("ATTACK_ENGAGEMENT_EVIDENCE_REQUIRED", () => kernelV5.plan({
    profile: commandoRifle,
    target: target(),
    distanceInches: 12,
    evadeEligibility: unengaged(),
  }));
});

check("bulky_parameter_drift_fails_closed", () => {
  const invalid = structuredClone(commandoRifle);
  invalid.effects.find((entry) => (
    entry.effectAtomId === "attack-effect:bulky-v1"
  )).parameters = { exception: "invented" };
  rehashProfile(invalid);
  expectFailure("ATTACK_BULKY_PARAMETERS_INVALID", () => kernelV5.plan({
    profile: invalid,
    target: target(),
    distanceInches: 12,
    evadeEligibility: unengaged(),
    attackerEngagement: engagement(false),
  }));
});

check("bulky_resolution_preserves_the_existing_damage_pipeline", () => {
  const plan = kernelV5.plan({
    profile: commandoRifle,
    target: target(),
    distanceInches: 12,
    evadeEligibility: unengaged(),
    attackerEngagement: engagement(false),
  });
  const result = kernelV5.resolve(plan, [3, 1, 1, 1, 1, 6, 6]);
  assert.equal(result.stages.hit.hits, 1);
  assert.equal(result.stages.effects.bulkyEngagedProhibitionChecked, true);
  assert.equal(result.stages.effects.attackerEngaged, false);
  assert.equal(result.stages.effects.surgeMatched, false);
  assert.equal(result.stages.armour.dice, 1);
  assert.equal(result.stages.armour.saves, 0);
  assert.equal(result.stages.damage.totalDamage, 1);
});

check("plan_and_resolution_hashes_bind_bulky_and_engagement", () => {
  const plan = kernelV5.plan({
    profile: commandoRifle,
    target: target(),
    distanceInches: 12,
    evadeEligibility: unengaged(),
    attackerEngagement: engagement(false),
  });
  const result = kernelV5.resolve(plan, Array.from({ length: 7 }, () => 1));
  assert.match(plan.planHash, /^[a-f0-9]{64}$/u);
  assert.match(result.resolutionHash, /^[a-f0-9]{64}$/u);
  const tampered = structuredClone(plan);
  tampered.attackerEngagement.engaged = true;
  const body = Object.fromEntries(Object.entries(tampered).filter(([key]) => key !== "planHash"));
  assert.notEqual(hashStarcraftTmgContract(body), plan.planHash);
});

const failures = acceptance.filter((entry) => !entry.passed);
const report = {
  schema: "starcraft_tmg_official_bulky_attack_effect_verification_v1",
  generatedAt: new Date().toISOString(),
  sourceSnapshotHash: snapshot.snapshotHash,
  normalizedDatasetHash: dataset.datasetHash,
  attackProfileCatalogueHash: catalogue.catalogueHash,
  officialProfileHash: commandoRifle.profileHash,
  historicalKernelHash: kernelV4.descriptor.kernelHash,
  kernelHash: kernelV5.descriptor.kernelHash,
  acceptancePassed: acceptance.length - failures.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures,
  rulesTruth: "official_bulky_engaged_ranged_attack_prohibition",
  trainingTruth: false,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-bulky-attack-effect-v1-report.json"),
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
