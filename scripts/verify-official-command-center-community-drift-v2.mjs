#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { OFFICIAL_COMMAND_CENTER_FACTION_DELTA_2026_08_25_V1 } from
  "../content/official-command-center-faction-delta-2026-08-25-v1.mjs";
import { OFFICIAL_COMMAND_CENTER_FACTION_DELTA_2026_08_26_V1 } from
  "../content/official-command-center-faction-delta-2026-08-26-v1.mjs";
import { createCommandCenterSnapshot } from
  "../packages/rule-atoms/official-live-source-snapshots-v1.mjs";
import {
  createOfficialCommandCenterDataset,
  getOfficialCurrentProductRecord,
} from "../packages/source-data/official-command-center-adapter-v1.mjs";
import {
  applyOfficialCommandCenterFirestoreDelta,
  createOfficialSameVersionDisplayOnlyDriftReceipt,
  verifyOfficialSameVersionDisplayOnlyDriftReceipt,
} from "../packages/source-data/official-command-center-snapshot-delta-v1.mjs";
import { selectOfficialLatestDataSnapshot } from
  "../packages/source-data/official-latest-data-binding-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const SOURCE_DIR = path.join(ROOT, "build", "source-intake", "official-rules");
const COMMAND_DIR = path.join(SOURCE_DIR, "command-center");
const FIRESTORE_DIR = path.join(COMMAND_DIR, "firestore");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const CAPTURED_AT = "2026-08-26T00:00:00.000Z";
const COLLECTION_IDS = Object.freeze([
  "army_units",
  "faction_cards",
  "rules_sections",
  "tactical_cards",
]);
const STATIC_ASSET_IDS = Object.freeze([
  "script.js",
  "modules/firebase-init.js",
  "modules/factions.js",
  "modules/rules.js",
  "modules/army_builder.js",
  "modules/rules_checker.js",
  "modules/mission_cards.js",
  "modules/deployment_maps.js",
]);

const basePayloads = Object.fromEntries(await Promise.all(COLLECTION_IDS.map(
  async (collectionId) => [
    collectionId,
    JSON.parse(await readFile(
      path.join(FIRESTORE_DIR, `${collectionId}.json`),
      "utf8",
    )),
  ],
)));
const previousReport = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "official-command-center-community-drift-report.json"),
  "utf8",
));
const previousSnapshot = previousReport.currentOfficialSnapshot.snapshot;
const previousApplication = applyOfficialCommandCenterFirestoreDelta({
  basePayload: basePayloads.faction_cards,
  delta: OFFICIAL_COMMAND_CENTER_FACTION_DELTA_2026_08_25_V1,
});
const currentApplication = applyOfficialCommandCenterFirestoreDelta({
  basePayload: previousApplication.firestorePayload,
  delta: OFFICIAL_COMMAND_CENTER_FACTION_DELTA_2026_08_26_V1,
});
const previousPayloads = {
  ...basePayloads,
  faction_cards: previousApplication.firestorePayload,
};
const currentPayloads = {
  ...basePayloads,
  faction_cards: currentApplication.firestorePayload,
};
const currentSnapshot = createCommandCenterSnapshot({
  sourceUrl: "https://sc.starcraft-tmg.com/",
  projectId: "starcrafttmgbeta",
  databaseId: "starcrafttmgbeta",
  shellHtml: await readFile(
    path.join(SOURCE_DIR, "starcraft-tmg-command-center-2026-08-24.html"),
    "utf8",
  ),
  firebaseInitJs: await readFile(
    path.join(COMMAND_DIR, "modules", "firebase-init.js"),
    "utf8",
  ),
  staticAssets: await Promise.all(STATIC_ASSET_IDS.map(async (assetId) => ({
    assetId,
    content: await readFile(path.join(COMMAND_DIR, assetId)),
  }))),
  versionsPayload: JSON.parse(await readFile(
    path.join(FIRESTORE_DIR, "system_metadata_versions.json"),
    "utf8",
  )),
  capturedAt: CAPTURED_AT,
  firestorePayloads: currentPayloads,
});
const previousDataset = createOfficialCommandCenterDataset({
  snapshot: previousSnapshot,
  firestorePayloads: previousPayloads,
});
const currentDataset = createOfficialCommandCenterDataset({
  snapshot: currentSnapshot,
  firestorePayloads: currentPayloads,
});
const sameVersionDriftReceipt = createOfficialSameVersionDisplayOnlyDriftReceipt({
  baseSnapshot: previousSnapshot,
  resultSnapshot: currentSnapshot,
  baseDataset: previousDataset,
  resultDataset: currentDataset,
  firestoreDeltaReceipt: currentApplication.receipt,
});
const selection = selectOfficialLatestDataSnapshot({
  snapshots: [previousSnapshot, currentSnapshot],
  datasets: [previousDataset, currentDataset],
  certifications: [],
  sameVersionDriftReceipts: [sameVersionDriftReceipt],
  selectedAt: CAPTURED_AT,
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

check("previous_same_version_snapshot_remains_strictly_frozen", () => {
  assert.equal(
    previousSnapshot.snapshotHash,
    "243ecbae04073569ccd9b0cb091ab72ac566da5b0ff0fc81a25a84baee70571c",
  );
  assert.equal(
    previousDataset.datasetHash,
    "225c4628b281fbc05af88b601989ee84789ae6945dbecb7c80edb2d3ce442021",
  );
});

check("second_delta_is_exactly_nine_display_only_community_upvotes", () => {
  assert.equal(currentApplication.receipt.changedRecordCount, 9);
  assert.equal(currentApplication.receipt.officialProductChangeCount, 0);
  assert.equal(currentApplication.receipt.ruleProseChangeCount, 0);
  assert.ok(currentApplication.receipt.changedRecords.every((row) => (
    row.authorityDisposition === "community_display_only"
      && row.recordType === "community_mission"
      && row.changedFields.length === 1
      && row.changedFields[0] === "upvotes"
  )));
});

check("mixed_case_document_ids_are_compared_with_one_stable_order", () => {
  assert.deepEqual(
    currentApplication.receipt.changedRecords.map((row) => row.documentId),
    [...OFFICIAL_COMMAND_CENTER_FACTION_DELTA_2026_08_26_V1.changes]
      .map((row) => row.documentId)
      .sort((left, right) => left.localeCompare(right)),
  );
  assert.equal(
    verifyOfficialSameVersionDisplayOnlyDriftReceipt({
      receipt: sameVersionDriftReceipt,
      baseSnapshot: previousSnapshot,
      resultSnapshot: currentSnapshot,
      baseDataset: previousDataset,
      resultDataset: currentDataset,
      firestoreDeltaReceipt: currentApplication.receipt,
    }),
    true,
  );
});

check("new_capture_binds_current_same_version_snapshot_and_dataset", () => {
  assert.deepEqual(currentSnapshot.dataVersions, {
    cardsVersion: "69",
    rulesVersion: "48",
    unitsVersion: "71",
  });
  assert.equal(
    currentSnapshot.snapshotHash,
    "2407d2536278776692c9116cb74c4147e15f2aa6ff9af9204141e5620220bd78",
  );
  assert.equal(
    currentDataset.datasetHash,
    "40ba72534a2165131288ec77ccf67984baf5f740e58c4f94283b46137a54757a",
  );
  assert.equal(
    sameVersionDriftReceipt.receiptHash,
    "46c7e82f34f6a666ebe2b51f0f5b8ff44c20a518ee1b115e19d2a5f446d5b5a4",
  );
});

check("current_official_product_and_rule_indexes_are_unchanged", () => {
  assert.equal(sameVersionDriftReceipt.officialProductChangeCount, 0);
  assert.equal(sameVersionDriftReceipt.ruleProseChangeCount, 0);
  const previousPowerField = getOfficialCurrentProductRecord(
    previousDataset,
    "tactical_cards:power_field",
  );
  const currentPowerField = getOfficialCurrentProductRecord(
    currentDataset,
    "tactical_cards:power_field",
  );
  assert.deepEqual(currentPowerField, previousPowerField);
  assert.equal(
    currentPowerField.sourceRecordHash,
    "65bc452416df2ab8c4275810e8333d5557e990de1ce9ae88bc135771637bdc58",
  );
});

check("latest_selection_requires_and_uses_the_adjacent_drift_receipt", () => {
  assert.equal(selection.selectedSnapshotHash, currentSnapshot.snapshotHash);
  assert.equal(selection.selectedDatasetHash, currentDataset.datasetHash);
  assert.throws(() => selectOfficialLatestDataSnapshot({
    snapshots: [previousSnapshot, currentSnapshot],
    datasets: [previousDataset, currentDataset],
    certifications: [],
    sameVersionDriftReceipts: [],
    selectedAt: CAPTURED_AT,
  }), /official_data_same_version_conflict/);
});

check("captured_unreviewed_data_stays_out_of_production_and_training", () => {
  assert.equal(currentSnapshot.snapshotStatus, "captured_unreviewed");
  assert.equal(currentSnapshot.rulesEligible, false);
  assert.equal(currentDataset.productionRoomBindingEligible, false);
  assert.equal(currentDataset.trainingTruth, false);
  assert.equal(OFFICIAL_COMMAND_CENTER_FACTION_DELTA_2026_08_26_V1.canAffectRules, false);
});

const failures = acceptance.filter((entry) => !entry.passed);
const report = {
  schema: "starcraft_tmg_official_command_center_community_drift_v2_report",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length - failures.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures,
  previousOfficialSnapshot: {
    snapshotHash: previousSnapshot.snapshotHash,
    datasetHash: previousDataset.datasetHash,
    capturedAt: previousSnapshot.capturedAt,
  },
  currentOfficialSnapshot: {
    snapshot: currentSnapshot,
    datasetHash: currentDataset.datasetHash,
    capturedAt: currentSnapshot.capturedAt,
    dataVersions: currentSnapshot.dataVersions,
  },
  deltaReceipt: currentApplication.receipt,
  sameVersionDriftReceipt,
  currentSelection: selection,
  officialProductChanges: sameVersionDriftReceipt.officialProductChangeCount,
  ruleProseChanges: sameVersionDriftReceipt.ruleProseChangeCount,
  communityDisplayOnlyChanges: sameVersionDriftReceipt.changedRecords.length,
  rulesTruth: "same_version_display_only_drift_chain_verified",
  trainingTruth: false,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-command-center-community-drift-v2-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);
console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  failures,
  snapshotHash: currentSnapshot.snapshotHash,
  datasetHash: currentDataset.datasetHash,
  driftReceiptHash: sameVersionDriftReceipt.receiptHash,
  communityDisplayOnlyChanges: report.communityDisplayOnlyChanges,
  officialProductChanges: report.officialProductChanges,
  ruleProseChanges: report.ruleProseChanges,
  rulesTruth: report.rulesTruth,
  trainingTruth: report.trainingTruth,
}, null, 2));
if (failures.length > 0) process.exitCode = 1;
