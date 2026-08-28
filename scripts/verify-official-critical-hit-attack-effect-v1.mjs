#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { OFFICIAL_COMMAND_CENTER_FACTION_DELTA_2026_08_25_V1 } from
  "../content/official-command-center-faction-delta-2026-08-25-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createOfficialCriticalHitResolutionKernelV1 } from
  "../packages/rule-atoms/official-critical-hit-resolution-kernel-v1.mjs";
import {
  createOfficialAttackProfileCatalogueV1,
  getOfficialAttackProfileV1,
} from "../packages/source-data/official-attack-profile-catalogue-v1.mjs";
import {
  createOfficialAttackProfileCatalogueV2,
  getOfficialAttackProfileV2,
  verifyOfficialAttackProfileCatalogueV2,
} from "../packages/source-data/official-attack-profile-catalogue-v2.mjs";
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
const historicalCatalogue = createOfficialAttackProfileCatalogueV1({ snapshot, dataset });
const historicalBlades = getOfficialAttackProfileV1(historicalCatalogue, {
  recordKey: "army_units:kerrigan",
  phase: "combat",
  weaponName: "Blades",
});
const catalogue = createOfficialAttackProfileCatalogueV2({
  previousCatalogue: historicalCatalogue,
});
const audit = verifyOfficialAttackProfileCatalogueV2(catalogue);
const blades = getOfficialAttackProfileV2(catalogue, {
  recordKey: "army_units:kerrigan",
  phase: "combat",
  weaponName: "Blades",
});
const kernel = createOfficialCriticalHitResolutionKernelV1();

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

function noDodge() {
  return {
    present: false,
    reduction: 0,
    source: "target_official_profile_and_effect_state",
  };
}

check("historical_v1_catalogue_and_wrongly_named_field_remain_frozen", () => {
  assert.equal(
    historicalCatalogue.catalogueHash,
    "b74f20b677feb0c6a2d0814f0b2317cd16eb411f5156f336c9521c3ead11ba11",
  );
  assert.equal(historicalBlades.schema, "starcraft_tmg_official_attack_profile_v1");
  assert.deepEqual(historicalBlades.effects, [{
    effectAtomId: "attack-effect:critical-hit-v1",
    parameters: { additionalHits: 2 },
    sourceKind: "weapon_keyword",
  }]);
});

check("v2_migration_renames_the_parameter_without_mutating_v1", () => {
  assert.equal(catalogue.schema, "starcraft_tmg_official_attack_profile_catalogue_v2");
  assert.equal(catalogue.previousCatalogueHash, historicalCatalogue.catalogueHash);
  assert.equal(audit.counts.attackProfiles, 51);
  assert.equal(audit.counts.criticalHitProfiles, 1);
  assert.equal(blades.schema, "starcraft_tmg_official_attack_profile_v2");
  assert.equal(blades.previousProfileHash, historicalBlades.profileHash);
  assert.deepEqual(blades.effects, [{
    effectAtomId: "attack-effect:critical-hit-v1",
    parameters: { bypassArmourDice: 2 },
    sourceKind: "weapon_keyword",
  }]);
  assert.equal("additionalHits" in blades.effects[0].parameters, false);
  assert.deepEqual(historicalBlades.effects[0].parameters, { additionalHits: 2 });
});

check("critical_hit_moves_at_most_x_and_never_more_than_the_armour_pool", () => {
  const plan = kernel.plan({ profile: blades, targetDodge: noDodge() });
  assert.equal(plan.maximumBypassArmourDice, 2);
  assert.equal(plan.additionalChanceDice, 0);
  const oneHit = kernel.resolve(plan, { attackPoolHits: 1 });
  assert.equal(oneHit.bypassedArmourDice, 1);
  assert.equal(oneHit.armourPoolDice, 0);
  assert.equal(oneHit.damagePoolBypassDice, 1);
  const fourHits = kernel.resolve(plan, { attackPoolHits: 4 });
  assert.equal(fourHits.bypassedArmourDice, 2);
  assert.equal(fourHits.armourPoolDice, 2);
  assert.equal(fourHits.damagePoolBypassDice, 2);
});

check("critical_hit_is_resolved_before_armour_without_creating_hits", () => {
  const plan = kernel.plan({ profile: blades, targetDodge: noDodge() });
  const result = kernel.resolve(plan, { attackPoolHits: 3 });
  assert.deepEqual(kernel.descriptor.stages, [
    "attack_pool",
    "resolve_surge_and_critical_hit",
    "armour_pool",
    "damage_pool",
  ]);
  assert.equal(result.attackPoolHits, 3);
  assert.equal(result.bypassedArmourDice + result.armourPoolDice, 3);
  assert.equal(result.generatedAdditionalHits, 0);
});

check("dodge_interaction_stays_fail_closed_until_its_own_atom_is_executable", () => {
  expectFailure("CRITICAL_HIT_DODGE_INTERACTION_UNSUPPORTED", () => kernel.plan({
    profile: blades,
    targetDodge: {
      present: true,
      reduction: 1,
      source: "target_official_profile_and_effect_state",
    },
  }));
});

check("legacy_or_tampered_parameter_shapes_are_rejected_by_v2", () => {
  const tampered = structuredClone(blades);
  tampered.effects[0].parameters = { additionalHits: 2 };
  const body = Object.fromEntries(Object.entries(tampered).filter(([key]) => key !== "profileHash"));
  tampered.profileHash = hashStarcraftTmgContract(body);
  expectFailure("CRITICAL_HIT_PROFILE_INVALID", () => kernel.plan({
    profile: tampered,
    targetDodge: noDodge(),
  }));
});

check("current_source_and_training_boundaries_remain_exact", () => {
  assert.deepEqual(catalogue.dataVersions, {
    cardsVersion: "69",
    rulesVersion: "48",
    unitsVersion: "71",
  });
  assert.equal(catalogue.sourceSnapshotHash, snapshot.snapshotHash);
  assert.equal(catalogue.normalizedDatasetHash, dataset.datasetHash);
  assert.equal(catalogue.canAffectRules, false);
  assert.equal(catalogue.trainingTruth, false);
  assert.equal(kernel.descriptor.trainingTruth, false);
});

const failures = acceptance.filter((entry) => !entry.passed);
const report = {
  schema: "starcraft_tmg_official_critical_hit_attack_effect_verification_v1",
  generatedAt: new Date().toISOString(),
  sourceSnapshotHash: snapshot.snapshotHash,
  normalizedDatasetHash: dataset.datasetHash,
  historicalCatalogueHash: historicalCatalogue.catalogueHash,
  catalogueHash: catalogue.catalogueHash,
  historicalProfileHash: historicalBlades.profileHash,
  officialProfileHash: blades.profileHash,
  kernelHash: kernel.descriptor.kernelHash,
  acceptancePassed: acceptance.length - failures.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures,
  rulesTruth: "official_critical_hit_armour_pool_bypass_without_dodge_subset",
  trainingTruth: false,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-critical-hit-attack-effect-v1-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);
console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  failures,
  historicalCatalogueHash: report.historicalCatalogueHash,
  catalogueHash: report.catalogueHash,
  officialProfileHash: report.officialProfileHash,
  kernelHash: report.kernelHash,
  rulesTruth: report.rulesTruth,
  trainingTruth: report.trainingTruth,
}, null, 2));
if (failures.length > 0) process.exitCode = 1;
