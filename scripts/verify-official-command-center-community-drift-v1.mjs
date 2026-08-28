#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { OFFICIAL_COMMAND_CENTER_FACTION_DELTA_2026_08_25_V1 } from "../content/official-command-center-faction-delta-2026-08-25-v1.mjs";
import {
  createCommandCenterSnapshot,
  verifyCommandCenterSnapshot,
} from "../packages/rule-atoms/official-live-source-snapshots-v1.mjs";
import {
  createOfficialCommandCenterDataset,
  verifyOfficialCommandCenterDataset,
} from "../packages/source-data/official-command-center-adapter-v1.mjs";
import {
  applyOfficialCommandCenterFirestoreDelta,
  createOfficialSameVersionDisplayOnlyDriftReceipt,
  verifyOfficialSameVersionDisplayOnlyDriftReceipt,
} from "../packages/source-data/official-command-center-snapshot-delta-v1.mjs";
import {
  resolveHistoricalRoomDataBinding,
  selectOfficialLatestDataSnapshot,
} from "../packages/source-data/official-latest-data-binding-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const SOURCE_DIR = path.join(ROOT, "build", "source-intake", "official-rules");
const COMMAND_DIR = path.join(SOURCE_DIR, "command-center");
const FIRESTORE_DIR = path.join(COMMAND_DIR, "firestore");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const COLLECTION_IDS = Object.freeze([
  "army_units",
  "faction_cards",
  "rules_sections",
  "tactical_cards",
]);

async function commandBytes(relativePath) {
  return readFile(path.join(COMMAND_DIR, relativePath));
}

const basePayloads = Object.fromEntries(await Promise.all(COLLECTION_IDS.map(async (collectionId) => [
  collectionId,
  JSON.parse(await readFile(path.join(FIRESTORE_DIR, `${collectionId}.json`), "utf8")),
])));
const baseLiveReport = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "official-live-source-snapshots-report.json"),
  "utf8",
));
const baseBindingReport = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "official-latest-data-binding-report.json"),
  "utf8",
));
const baseSnapshot = baseLiveReport.commandSnapshot;
const baseDataset = createOfficialCommandCenterDataset({
  snapshot: baseSnapshot,
  firestorePayloads: basePayloads,
});

const commonSnapshotInput = {
  sourceUrl: "https://sc.starcraft-tmg.com/",
  projectId: "starcrafttmgbeta",
  databaseId: "starcrafttmgbeta",
  shellHtml: await readFile(path.join(SOURCE_DIR, "starcraft-tmg-command-center-2026-08-24.html"), "utf8"),
  firebaseInitJs: await commandBytes("modules/firebase-init.js"),
  staticAssets: [
    { assetId: "script.js", content: await commandBytes("script.js") },
    { assetId: "modules/firebase-init.js", content: await commandBytes("modules/firebase-init.js") },
    { assetId: "modules/factions.js", content: await commandBytes("modules/factions.js") },
    { assetId: "modules/rules.js", content: await commandBytes("modules/rules.js") },
    { assetId: "modules/army_builder.js", content: await commandBytes("modules/army_builder.js") },
    { assetId: "modules/rules_checker.js", content: await commandBytes("modules/rules_checker.js") },
    { assetId: "modules/mission_cards.js", content: await commandBytes("modules/mission_cards.js") },
    { assetId: "modules/deployment_maps.js", content: await commandBytes("modules/deployment_maps.js") },
  ],
  versionsPayload: JSON.parse(await readFile(
    path.join(FIRESTORE_DIR, "system_metadata_versions.json"),
    "utf8",
  )),
};

function snapshotFor(firestorePayloads, capturedAt = "2026-08-25T00:00:00.000Z") {
  return createCommandCenterSnapshot({
    ...commonSnapshotInput,
    capturedAt,
    firestorePayloads,
  });
}

const application = applyOfficialCommandCenterFirestoreDelta({
  basePayload: basePayloads.faction_cards,
  delta: OFFICIAL_COMMAND_CENTER_FACTION_DELTA_2026_08_25_V1,
});
const latestPayloads = {
  ...basePayloads,
  faction_cards: application.firestorePayload,
};
const latestSnapshot = snapshotFor(latestPayloads);
const latestDataset = createOfficialCommandCenterDataset({
  snapshot: latestSnapshot,
  firestorePayloads: latestPayloads,
});
const driftReceipt = createOfficialSameVersionDisplayOnlyDriftReceipt({
  baseSnapshot,
  resultSnapshot: latestSnapshot,
  baseDataset,
  resultDataset: latestDataset,
  firestoreDeltaReceipt: application.receipt,
});
const latestSelection = selectOfficialLatestDataSnapshot({
  snapshots: [baseSnapshot, latestSnapshot],
  datasets: [baseDataset, latestDataset],
  certifications: [],
  sameVersionDriftReceipts: [driftReceipt],
  selectedAt: "2026-08-25T00:00:00.000Z",
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

check("frozen_delta_reconstructs_the_exact_latest_official_faction_payload", () => {
  assert.equal(application.receipt.changedRecordCount, 2);
  assert.equal(application.receipt.baseRawResponseHash, "836f9e8c5dcf3b572e34ed9bbbb4b42457b2309049543bc4794d1cfe5740060a");
  assert.equal(application.receipt.resultRawResponseHash, "d04c40cbd79ccc85bacdd5c241679d294ba8d58d98009c53262f955a6348d30e");
  assert.equal(application.receipt.baseSemanticContentHash, "08b93ee71ccef1d8b7adf34bddfe6f30c344d8c80dec50f08d666a07d98a1e45");
  assert.equal(application.receipt.resultSemanticContentHash, "395e1394895f764b635244a4c5a7a12b08a327df418b80884f975ddccfb93bac");
  assert.deepEqual(application.receipt.changedRecords.map((entry) => entry.documentId), [
    "3TLSupHClPWA8DGwSkhm",
    "qbBhCOE79NqHUC1lz8eK",
  ]);
});

check("both_changed_documents_are_community_display_only_upvote_changes", () => {
  assert.ok(application.receipt.changedRecords.every((entry) => (
    entry.authorityDisposition === "community_display_only"
      && entry.recordType === "community_mission"
      && entry.changedFields.length === 1
      && entry.changedFields[0] === "upvotes"
  )));
  assert.equal(driftReceipt.officialProductChangeCount, 0);
  assert.equal(driftReceipt.ruleProseChangeCount, 0);
  assert.equal(driftReceipt.communityDisplayOnlyChangeCount, 2);
});

check("same_versions_with_verified_display_only_drift_select_the_newer_capture", () => {
  assert.deepEqual(latestSnapshot.dataVersions, baseSnapshot.dataVersions);
  assert.equal(latestSelection.selectedSnapshotHash, latestSnapshot.snapshotHash);
  assert.equal(latestSelection.selectedDatasetHash, latestDataset.datasetHash);
  assert.deepEqual(latestSelection.sameVersionDriftReceiptHashes, [driftReceipt.receiptHash]);
  assert.equal(latestSelection.roomBindingEligible, false);
  assert.equal(latestSelection.canAffectRules, false);
  assert.equal(latestSelection.trainingTruth, false);
});

check("same_versions_without_a_drift_receipt_remain_fail_closed", () => {
  assert.throws(() => selectOfficialLatestDataSnapshot({
    snapshots: [baseSnapshot, latestSnapshot],
    datasets: [baseDataset, latestDataset],
    certifications: [],
    selectedAt: "2026-08-25T00:00:00.000Z",
  }), /official_data_same_version_conflict/);
});

check("delta_or_receipt_tamper_is_rejected", () => {
  const tamperedDelta = structuredClone(OFFICIAL_COMMAND_CENTER_FACTION_DELTA_2026_08_25_V1);
  tamperedDelta.changes[0].operations[0].value = "tampered-voter";
  assert.throws(() => applyOfficialCommandCenterFirestoreDelta({
    basePayload: basePayloads.faction_cards,
    delta: tamperedDelta,
  }), /official_firestore_delta_hash_mismatch/);
  const tamperedReceipt = structuredClone(driftReceipt);
  tamperedReceipt.communityDisplayOnlyChangeCount = 3;
  assert.throws(() => verifyOfficialSameVersionDisplayOnlyDriftReceipt({
    receipt: tamperedReceipt,
    baseSnapshot,
    resultSnapshot: latestSnapshot,
    baseDataset,
    resultDataset: latestDataset,
    firestoreDeltaReceipt: application.receipt,
  }), /official_same_version_drift_receipt_hash_mismatch/);
});

check("same_version_official_product_drift_is_never_display_only", () => {
  const productDriftPayloads = structuredClone(latestPayloads);
  productDriftPayloads.army_units.documents[0].fields.name.stringValue += " altered";
  const productDriftSnapshot = snapshotFor(productDriftPayloads, "2026-08-25T00:01:00.000Z");
  const productDriftDataset = createOfficialCommandCenterDataset({
    snapshot: productDriftSnapshot,
    firestorePayloads: productDriftPayloads,
  });
  assert.throws(() => createOfficialSameVersionDisplayOnlyDriftReceipt({
    baseSnapshot: latestSnapshot,
    resultSnapshot: productDriftSnapshot,
    baseDataset: latestDataset,
    resultDataset: productDriftDataset,
    firestoreDeltaReceipt: application.receipt,
  }), /official_same_version_non_display_drift_forbidden|official_same_version_delta_snapshot_mismatch/);
});

check("capture_time_must_advance_for_same_version_drift", () => {
  const nonAdvancingSnapshot = snapshotFor(latestPayloads, baseSnapshot.capturedAt);
  const nonAdvancingDataset = createOfficialCommandCenterDataset({
    snapshot: nonAdvancingSnapshot,
    firestorePayloads: latestPayloads,
  });
  assert.throws(() => createOfficialSameVersionDisplayOnlyDriftReceipt({
    baseSnapshot,
    resultSnapshot: nonAdvancingSnapshot,
    baseDataset,
    resultDataset: nonAdvancingDataset,
    firestoreDeltaReceipt: application.receipt,
  }), /official_same_version_capture_time_not_advanced/);
});

check("historical_room_still_resolves_the_old_snapshot_and_dataset_exactly", () => {
  const historicalBinding = baseBindingReport.contractFixture.roomBinding;
  const resolved = resolveHistoricalRoomDataBinding({
    binding: historicalBinding,
    snapshotsByHash: {
      [baseSnapshot.snapshotHash]: baseSnapshot,
      [latestSnapshot.snapshotHash]: latestSnapshot,
    },
    datasetsByHash: {
      [baseDataset.datasetHash]: baseDataset,
      [latestDataset.datasetHash]: latestDataset,
    },
  });
  assert.equal(resolved.snapshotHash, baseSnapshot.snapshotHash);
  assert.equal(resolved.normalizedDatasetHash, baseDataset.datasetHash);
});

check("new_capture_is_valid_but_still_requires_independent_certification", () => {
  const snapshotAudit = verifyCommandCenterSnapshot(latestSnapshot);
  const datasetAudit = verifyOfficialCommandCenterDataset({
    snapshot: latestSnapshot,
    dataset: latestDataset,
  });
  assert.equal(snapshotAudit.counts.documents, 269);
  assert.equal(datasetAudit.counts.records, 269);
  assert.equal(latestSelection.status, "selected_but_certification_required");
});

const failures = acceptance.filter((item) => !item.passed);
const report = {
  schema: "starcraft_tmg_official_command_center_community_drift_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length - failures.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures,
  deltaReceipt: application.receipt,
  sameVersionDriftReceipt: driftReceipt,
  previousOfficialSnapshot: {
    snapshotHash: baseSnapshot.snapshotHash,
    normalizedDatasetHash: baseDataset.datasetHash,
    capturedAt: baseSnapshot.capturedAt,
    dataVersions: baseSnapshot.dataVersions,
  },
  currentOfficialSnapshot: {
    snapshot: latestSnapshot,
    datasetHash: latestDataset.datasetHash,
    capturedAt: latestSnapshot.capturedAt,
    dataVersions: latestSnapshot.dataVersions,
  },
  currentSelection: latestSelection,
  officialProductChanges: 0,
  ruleProseChanges: 0,
  communityDisplayOnlyChanges: 2,
  completedRuleSlices: 24,
  executableRuleAtoms: 283,
  remainingActionableRuleAtoms: 629,
  rulesTruth: false,
  trainingTruth: false,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-command-center-community-drift-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);
console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  failures,
  previousSnapshotHash: baseSnapshot.snapshotHash,
  currentSnapshotHash: latestSnapshot.snapshotHash,
  currentDatasetHash: latestDataset.datasetHash,
  sameVersionDriftReceiptHash: driftReceipt.receiptHash,
  officialProductChanges: 0,
  ruleProseChanges: 0,
  communityDisplayOnlyChanges: 2,
  rulesTruth: false,
  trainingTruth: false,
}, null, 2));
if (failures.length > 0) process.exitCode = 1;
