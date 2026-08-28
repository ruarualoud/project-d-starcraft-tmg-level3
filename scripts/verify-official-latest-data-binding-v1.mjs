#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createStarcraftTmgRefereeCrypto } from "../packages/authoritative-engine/referee-crypto-v1.mjs";
import {
  certifyOfficialDataSnapshot,
  createOfficialRoomDataBinding,
  resolveHistoricalRoomDataBinding,
  selectOfficialLatestDataSnapshot,
  verifyOfficialDataCertification,
} from "../packages/source-data/official-latest-data-binding-v1.mjs";
import { verifyCommandCenterSnapshot } from "../packages/rule-atoms/official-live-source-snapshots-v1.mjs";
import {
  createOfficialCommandCenterDataset,
  verifyOfficialCommandCenterDataset,
} from "../packages/source-data/official-command-center-adapter-v1.mjs";
import { verifyOfficialDataReviewEvidenceBundle } from "../packages/source-data/official-p2p-alias-index-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const liveReport = JSON.parse(await readFile(path.join(OUTPUT_DIR, "official-live-source-snapshots-report.json"), "utf8"));
const currentSnapshot = liveReport.commandSnapshot;
verifyCommandCenterSnapshot(currentSnapshot);
const firestoreDir = path.join(ROOT, "build", "source-intake", "official-rules", "command-center", "firestore");
const firestorePayloads = Object.fromEntries(await Promise.all([
  "army_units",
  "faction_cards",
  "rules_sections",
  "tactical_cards",
].map(async (collectionId) => [
  collectionId,
  JSON.parse(await readFile(path.join(firestoreDir, `${collectionId}.json`), "utf8")),
])));
const currentDataset = createOfficialCommandCenterDataset({
  snapshot: currentSnapshot,
  firestorePayloads,
});
const currentDatasetAudit = verifyOfficialCommandCenterDataset({
  snapshot: currentSnapshot,
  dataset: currentDataset,
});
const p2pReport = JSON.parse(await readFile(path.join(OUTPUT_DIR, "official-p2p-alias-precedence-report.json"), "utf8"));
const currentAliasIndex = p2pReport.aliasIndex;
const currentReviewEvidenceBundle = p2pReport.evidenceBundle;
verifyOfficialDataReviewEvidenceBundle({
  snapshot: currentSnapshot,
  dataset: currentDataset,
  datasetAudit: currentDatasetAudit,
  aliasIndex: currentAliasIndex,
  evidenceBundle: currentReviewEvidenceBundle,
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

const unsignedSelection = selectOfficialLatestDataSnapshot({
  snapshots: [currentSnapshot],
  datasets: [currentDataset],
  certifications: [],
  selectedAt: "2026-08-24T00:00:00.000Z",
});

check("current_official_command_center_snapshot_is_the_only_candidate", () => {
  assert.equal(unsignedSelection.selectedSnapshotHash, currentSnapshot.snapshotHash);
  assert.deepEqual(unsignedSelection.selectedDataVersions, {
    cardsVersion: "69",
    rulesVersion: "48",
    unitsVersion: "71",
  });
  assert.equal(unsignedSelection.sourceId, "starcraft-tmg.official.command-center");
  assert.equal(unsignedSelection.selectedDatasetHash, currentDataset.datasetHash);
});

check("captured_unreviewed_latest_snapshot_cannot_enter_a_room", () => {
  assert.equal(unsignedSelection.roomBindingEligible, false);
  assert.equal(unsignedSelection.status, "selected_but_certification_required");
  assert.throws(() => createOfficialRoomDataBinding({
    selection: unsignedSelection,
    roomId: "room-blocked",
    boundAt: "2026-08-24T00:00:00.000Z",
  }), /official_latest_data_snapshot_not_room_eligible/);
});

check("repository_or_legacy_values_are_rejected_not_fallback_candidates", () => {
  assert.throws(() => selectOfficialLatestDataSnapshot({
    snapshots: [{ ...currentSnapshot, sourceId: "project-d.starcraft-tmg.legacy-data-pack-v0" }],
    datasets: [currentDataset],
    certifications: [],
    selectedAt: "2026-08-24T00:00:00.000Z",
  }), /non_official_current_data_source_forbidden|command_center_snapshot_hash_mismatch/);
});

const reviewCrypto = createStarcraftTmgRefereeCrypto({
  hmacSecret: Buffer.alloc(32, 7),
  keyId: "official-data-contract-fixture-key",
  trustLevel: "contract_fixture",
});
const REVIEW_EVIDENCE = Object.fromEntries([
  "recordSchemaReviewHash",
  "officialScopeReviewHash",
  "communityIsolationReviewHash",
  "p2pPrecedenceReviewHash",
].map((field) => [field, currentReviewEvidenceBundle[field]]));
const certification = certifyOfficialDataSnapshot({
  snapshot: currentSnapshot,
  dataset: currentDataset,
  datasetAudit: currentDatasetAudit,
  aliasIndex: currentAliasIndex,
  reviewEvidenceBundle: currentReviewEvidenceBundle,
  reviewEnvironment: "contract_fixture",
  reviewedAt: "2026-08-24T00:00:00.000Z",
  reviewerPrincipal: "fixture-reviewer",
  signer: reviewCrypto,
});

check("certification_is_signed_and_binds_snapshot_versions_and_reviews", () => {
  assert.equal(verifyOfficialDataCertification({
    snapshot: currentSnapshot,
    dataset: currentDataset,
    certification,
    signer: reviewCrypto,
  }), true);
  assert.equal(certification.snapshotHash, currentSnapshot.snapshotHash);
  assert.equal(certification.normalizedDatasetHash, currentDataset.datasetHash);
  assert.deepEqual(certification.dataVersions, currentSnapshot.dataVersions);
  assert.deepEqual(certification.evidence, REVIEW_EVIDENCE);
  assert.equal(certification.evidenceBundleHash, currentReviewEvidenceBundle.evidenceBundleHash);
});

check("missing_review_dimension_fails_closed", () => {
  const incompleteBundle = structuredClone(currentReviewEvidenceBundle);
  incompleteBundle.p2pPrecedenceReviewHash = null;
  assert.throws(() => certifyOfficialDataSnapshot({
    snapshot: currentSnapshot,
    dataset: currentDataset,
    datasetAudit: currentDatasetAudit,
    aliasIndex: currentAliasIndex,
    reviewEvidenceBundle: incompleteBundle,
    reviewEnvironment: "contract_fixture",
    reviewedAt: "2026-08-24T00:00:00.000Z",
    reviewerPrincipal: "fixture-reviewer",
    signer: reviewCrypto,
  }), /official_data_review_evidence_incomplete|official_data_review_evidence_bundle_hash_mismatch/);
});

check("certification_requires_the_normalized_official_dataset", () => {
  assert.throws(() => certifyOfficialDataSnapshot({
    snapshot: currentSnapshot,
    reviewEnvironment: "contract_fixture",
    reviewedAt: "2026-08-24T00:00:00.000Z",
    reviewerPrincipal: "fixture-reviewer",
    datasetAudit: currentDatasetAudit,
    aliasIndex: currentAliasIndex,
    reviewEvidenceBundle: currentReviewEvidenceBundle,
    signer: reviewCrypto,
  }), /official_normalized_dataset_required/);
});

check("contract_fixture_key_cannot_masquerade_as_production_review", () => {
  assert.throws(() => certifyOfficialDataSnapshot({
    snapshot: currentSnapshot,
    dataset: currentDataset,
    datasetAudit: currentDatasetAudit,
    aliasIndex: currentAliasIndex,
    reviewEvidenceBundle: currentReviewEvidenceBundle,
    reviewEnvironment: "production_review",
    reviewedAt: "2026-08-24T00:00:00.000Z",
    reviewerPrincipal: "fixture-reviewer",
    signer: reviewCrypto,
  }), /official_data_production_reviewer_key_required/);
});

const certifiedSelection = selectOfficialLatestDataSnapshot({
  snapshots: [currentSnapshot],
  datasets: [currentDataset],
  certifications: [certification],
  certificationSigner: reviewCrypto,
  selectedAt: "2026-08-24T00:00:00.000Z",
  environment: "contract_fixture",
});
const roomBinding = createOfficialRoomDataBinding({
  selection: certifiedSelection,
  roomId: "room-official-data-fixture",
  boundAt: "2026-08-24T00:00:00.000Z",
});

check("certified_latest_snapshot_binds_exactly_without_floating_latest_alias", () => {
  assert.equal(certifiedSelection.roomBindingEligible, true);
  assert.equal(roomBinding.dataSnapshotHash, currentSnapshot.snapshotHash);
  assert.equal(roomBinding.normalizedDatasetHash, currentDataset.datasetHash);
  assert.deepEqual(roomBinding.dataVersions, currentSnapshot.dataVersions);
  assert.equal(JSON.stringify(roomBinding).includes('"latest"'), false);
  assert.equal(roomBinding.trainingTruth, false);
});

check("historical_room_resolves_only_its_frozen_snapshot", () => {
  const resolved = resolveHistoricalRoomDataBinding({
    binding: roomBinding,
    snapshotsByHash: { [currentSnapshot.snapshotHash]: currentSnapshot },
    datasetsByHash: { [currentDataset.datasetHash]: currentDataset },
  });
  assert.equal(resolved.snapshotHash, currentSnapshot.snapshotHash);
  assert.throws(() => resolveHistoricalRoomDataBinding({
    binding: roomBinding,
    snapshotsByHash: {},
    datasetsByHash: { [currentDataset.datasetHash]: currentDataset },
  }), /historical_official_data_snapshot_missing/);
  assert.throws(() => resolveHistoricalRoomDataBinding({
    binding: roomBinding,
    snapshotsByHash: { [currentSnapshot.snapshotHash]: currentSnapshot },
    datasetsByHash: {},
  }), /historical_official_normalized_dataset_missing/);
});

check("same_version_different_content_is_a_conflict_not_last_write_wins", () => {
  const conflicting = structuredClone(currentSnapshot);
  conflicting.snapshotHash = "f".repeat(64);
  assert.throws(() => selectOfficialLatestDataSnapshot({
    snapshots: [currentSnapshot, conflicting],
    datasets: [currentDataset],
    certifications: [],
    selectedAt: "2026-08-24T00:00:00.000Z",
  }), /command_center_snapshot_hash_mismatch|official_data_same_version_conflict/);
});

check("selection_and_binding_are_content_hash_bound", () => {
  assert.match(unsignedSelection.selectionHash, /^[a-f0-9]{64}$/);
  assert.match(roomBinding.bindingHash, /^[a-f0-9]{64}$/);
});

check("official_data_binding_grants_no_rules_or_training_authority", () => {
  assert.equal(roomBinding.canAffectRules, false);
  assert.equal(roomBinding.trainingTruth, false);
  assert.equal(certification.reviewEnvironment, "contract_fixture");
});

const failures = acceptance.filter((item) => !item.passed);
const report = {
  schema: "starcraft_tmg_official_latest_data_binding_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length - failures.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures,
  currentOfficialSnapshot: {
    snapshotHash: currentSnapshot.snapshotHash,
    dataVersions: currentSnapshot.dataVersions,
    status: currentSnapshot.snapshotStatus,
  },
  productionSelection: unsignedSelection,
  contractFixture: {
    certificationHash: certification.certificationHash,
    roomBinding,
  },
  productionRoomBindingEligible: false,
  rulesTruth: false,
  trainingTruth: false,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR, "official-latest-data-binding-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  failures,
  selectedSnapshotHash: currentSnapshot.snapshotHash,
  selectedDataVersions: currentSnapshot.dataVersions,
  productionRoomBindingEligible: false,
  repositoryFallbackAllowed: false,
  rulesTruth: false,
  trainingTruth: false,
}, null, 2));
if (failures.length > 0) process.exitCode = 1;
