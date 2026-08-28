#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { OFFICIAL_COMMAND_CENTER_FACTION_DELTA_2026_08_25_V1 } from
  "../content/official-command-center-faction-delta-2026-08-25-v1.mjs";
import {
  createOfficialReplacementWeaponLoadoutV1,
  OFFICIAL_REPLACEMENT_WEAPON_LOADOUT_ATOM_IDS,
  verifyOfficialReplacementWeaponLoadoutV1,
} from "../packages/rule-atoms/official-weapon-replacement-loadout-v1.mjs";
import { createOfficialAttackProfileCatalogueV1 } from
  "../packages/source-data/official-attack-profile-catalogue-v1.mjs";
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

function create(selectedWeaponUpgradeNames) {
  return createOfficialReplacementWeaponLoadoutV1({
    catalogue,
    recordKey: "army_units:jim_raynor",
    phase: "assault",
    selectedWeaponUpgradeNames,
    modelIds: ["p1-raynor-m1"],
  });
}

check("four_upgrade_and_replacement_rule_atoms_are_explicit", () => {
  assert.deepEqual(OFFICIAL_REPLACEMENT_WEAPON_LOADOUT_ATOM_IDS, [
    "rule-atom:singleton:core-5-2-replacement:91b9f418d86b",
    "rule-atom:singleton:core-5-2-upgrade:191e2715a36e",
    "rule-atom:singleton:core-9-1-7-replacement-weapon-effect:cfcd72d74c46",
    "rule-atom:singleton:core-9-1-7-unit-wide-upgrade-effect:3ecc0ca27ffc",
  ]);
});

check("unselected_replacement_is_not_part_of_the_active_loadout", () => {
  const receipt = create([]);
  assert.deepEqual(receipt.availableWeaponNames, ["“Justice” Revolver", "Commando Rifle"]);
  assert.deepEqual(receipt.replacements, []);
  assert.equal(receipt.availableWeaponNames.includes("C-14 rifle"), false);
});

check("selected_c14_replaces_commando_rifle_unit_wide", () => {
  const receipt = create(["C-14 rifle"]);
  assert.deepEqual(receipt.availableWeaponNames, ["“Justice” Revolver", "C-14 rifle"]);
  assert.deepEqual(receipt.replacements, [{
    replacementWeaponName: "C-14 rifle",
    originalWeaponName: "Commando Rifle",
    appliedToModelIds: ["p1-raynor-m1"],
  }]);
  assert.equal(receipt.availableWeaponNames.includes("Commando Rifle"), false);
  assert.equal(verifyOfficialReplacementWeaponLoadoutV1({ catalogue, receipt }), true);
});

check("unknown_or_duplicate_upgrade_selection_fails_closed", () => {
  expectFailure("WEAPON_LOADOUT_SELECTED_UPGRADE_UNKNOWN", () => create(["Gauss Rifle"]));
  expectFailure("WEAPON_LOADOUT_SELECTED_UPGRADE_DUPLICATE", () => (
    create(["C-14 rifle", "C-14 rifle"])
  ));
});

check("replacement_receipt_hash_detects_active_weapon_tamper", () => {
  const receipt = structuredClone(create(["C-14 rifle"]));
  receipt.availableWeaponNames.push("Commando Rifle");
  expectFailure("WEAPON_LOADOUT_RECEIPT_HASH_MISMATCH", () => (
    verifyOfficialReplacementWeaponLoadoutV1({ catalogue, receipt })
  ));
});

check("loadout_is_non_training_rule_truth", () => {
  const receipt = create(["C-14 rifle"]);
  assert.equal(receipt.rulesTruth, "official_selected_replacement_weapon_loadout");
  assert.equal(receipt.trainingTruth, false);
  assert.match(receipt.loadoutHash, /^[a-f0-9]{64}$/u);
});

const failures = acceptance.filter((entry) => !entry.passed);
const selectedReceipt = create(["C-14 rifle"]);
const report = {
  schema: "starcraft_tmg_official_weapon_replacement_loadout_verification_v1",
  generatedAt: new Date().toISOString(),
  sourceSnapshotHash: snapshot.snapshotHash,
  normalizedDatasetHash: dataset.datasetHash,
  attackProfileCatalogueHash: catalogue.catalogueHash,
  acceptancePassed: acceptance.length - failures.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures,
  selectedReceipt,
  rulesTruth: "official_selected_replacement_weapon_loadout",
  trainingTruth: false,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-weapon-replacement-loadout-v1-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);
console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  failures,
  selectedLoadoutHash: selectedReceipt.loadoutHash,
  availableWeaponNames: selectedReceipt.availableWeaponNames,
  rulesTruth: report.rulesTruth,
  trainingTruth: report.trainingTruth,
}, null, 2));
if (failures.length > 0) process.exitCode = 1;
