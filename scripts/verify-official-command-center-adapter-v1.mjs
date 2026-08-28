#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  classifyOfficialCommandCenterRecord,
  createOfficialCommandCenterDataset,
  getOfficialCurrentProductRecord,
  verifyOfficialCommandCenterDataset,
} from "../packages/source-data/official-command-center-adapter-v1.mjs";
import { hashStarcraftTmgContract } from "../packages/authoritative-engine/referee-crypto-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const FIRESTORE_DIR = path.join(ROOT, "build", "source-intake", "official-rules", "command-center", "firestore");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const liveReport = JSON.parse(await readFile(path.join(OUTPUT_DIR, "official-live-source-snapshots-report.json"), "utf8"));
const snapshot = liveReport.commandSnapshot;
const payloads = Object.fromEntries(await Promise.all([
  "army_units",
  "faction_cards",
  "rules_sections",
  "tactical_cards",
].map(async (collectionId) => [
  collectionId,
  JSON.parse(await readFile(path.join(FIRESTORE_DIR, `${collectionId}.json`), "utf8")),
])));

const acceptance = [];
function check(id, fn) {
  try {
    fn();
    acceptance.push({ id, passed: true });
  } catch (error) {
    acceptance.push({ id, passed: false, error: String(error?.stack || error) });
  }
}

const dataset = createOfficialCommandCenterDataset({ snapshot, firestorePayloads: payloads });
const audit = verifyOfficialCommandCenterDataset({ snapshot, dataset });

function rebindSnapshotCollection(originalSnapshot, collectionId, payload) {
  const rebound = structuredClone(originalSnapshot);
  const collection = rebound.firestoreCollections.find((entry) => entry.collectionId === collectionId);
  collection.rawResponseHash = hashStarcraftTmgContract(payload);
  const byDocumentId = new Map(payload.documents.map((document) => {
    const documentId = document.name.split("/").at(-1);
    return [documentId, document];
  }));
  collection.recordIndex = collection.recordIndex.map((record) => {
    const document = byDocumentId.get(record.documentId);
    return {
      ...record,
      fieldHash: hashStarcraftTmgContract(document.fields),
      recordHash: hashStarcraftTmgContract({ documentId: record.documentId, fields: document.fields }),
    };
  });
  collection.semanticContentHash = hashStarcraftTmgContract(collection.recordIndex.map((record) => ({
    documentId: record.documentId,
    recordHash: record.recordHash,
  })));
  const { snapshotHash: _snapshotHash, ...body } = rebound;
  rebound.snapshotHash = hashStarcraftTmgContract(body);
  return rebound;
}

check("all_source_records_are_accounted_by_strict_scope", () => {
  assert.equal(audit.counts.records, 269);
  assert.deepEqual(audit.counts.byAuthorityDisposition, {
    community_display_only: 171,
    official_current_product_candidate: 83,
    official_rule_prose_review_required: 15,
  });
  assert.equal(audit.counts.unclassified, 0);
});

check("official_current_product_denominator_is_exact", () => {
  assert.deepEqual(audit.counts.officialProductByType, {
    deployment: 10,
    mission: 10,
    tactical_card: 37,
    unit: 26,
  });
});

check("dataset_binds_the_exact_latest_official_snapshot_and_versions", () => {
  assert.equal(dataset.sourceId, "starcraft-tmg.official.command-center");
  assert.equal(dataset.sourceSnapshotHash, snapshot.snapshotHash);
  assert.deepEqual(dataset.dataVersions, snapshot.dataVersions);
  assert.match(dataset.datasetHash, /^[a-f0-9]{64}$/);
});

check("decoded_product_values_come_from_official_firestore_payload", () => {
  const raw = payloads.army_units.documents.find((entry) => entry.name.endsWith("/adept"));
  const record = getOfficialCurrentProductRecord(dataset, "army_units:adept");
  assert.equal(record.payload.id, raw.fields.id.stringValue);
  assert.equal(record.payload.name, raw.fields.name.stringValue);
  assert.equal(record.payload.small.cost, Number(raw.fields.small.mapValue.fields.cost.integerValue));
  assert.equal(record.sourceRecordHash, snapshot.firestoreCollections
    .find((entry) => entry.collectionId === "army_units").recordIndex
    .find((entry) => entry.documentId === "adept").recordHash);
});

check("community_and_rule_prose_records_cannot_enter_product_lookup", () => {
  const community = dataset.recordIndex.find((entry) => entry.authorityDisposition === "community_display_only");
  const prose = dataset.recordIndex.find((entry) => entry.authorityDisposition === "official_rule_prose_review_required");
  assert.throws(() => getOfficialCurrentProductRecord(dataset, community.recordKey), /official_current_product_record_required/);
  assert.throws(() => getOfficialCurrentProductRecord(dataset, prose.recordKey), /official_current_product_record_required/);
});

check("official_scope_uses_collection_type_and_the_game_marker_not_user_flags", () => {
  assert.deepEqual(classifyOfficialCommandCenterRecord({
    collectionId: "faction_cards",
    fields: { type: "mission", faction: "the_game" },
  }), {
    authorityDisposition: "official_current_product_candidate",
    recordType: "mission",
  });
  assert.deepEqual(classifyOfficialCommandCenterRecord({
    collectionId: "faction_cards",
    fields: { type: "community_mission", faction: "the_game", isOfficial: true, status: "approved" },
  }), {
    authorityDisposition: "community_display_only",
    recordType: "community_mission",
  });
});

check("unknown_collection_or_faction_card_type_fails_closed", () => {
  assert.throws(() => classifyOfficialCommandCenterRecord({ collectionId: "legacy_values", fields: {} }), /command_center_record_scope_unclassified/);
  assert.throws(() => classifyOfficialCommandCenterRecord({
    collectionId: "faction_cards",
    fields: { type: "mission", faction: "protoss" },
  }), /command_center_record_scope_unclassified/);
});

check("source_payload_tamper_is_detected_before_normalization", () => {
  const tampered = structuredClone(payloads);
  tampered.army_units.documents[0].fields.name.stringValue += " altered";
  assert.throws(() => createOfficialCommandCenterDataset({
    snapshot,
    firestorePayloads: tampered,
  }), /command_center_collection_payload_hash_mismatch|command_center_record_hash_mismatch/);
});

check("field_type_or_schema_drift_fails_closed", () => {
  const tampered = structuredClone(payloads);
  const value = tampered.tactical_cards.documents[0].fields.cost.integerValue;
  tampered.tactical_cards.documents[0].fields.cost = { stringValue: value };
  const driftSnapshot = rebindSnapshotCollection(snapshot, "tactical_cards", tampered.tactical_cards);
  assert.throws(() => createOfficialCommandCenterDataset({
    snapshot: driftSnapshot,
    firestorePayloads: tampered,
  }), /command_center_field_type_drift/);
  assert.throws(() => classifyOfficialCommandCenterRecord({
    collectionId: "faction_cards",
    fields: { type: "unexpected_official_type", faction: "the_game" },
  }), /command_center_record_scope_unclassified/);
});

check("normalization_is_collection_map_order_independent", () => {
  const reversedPayloads = Object.fromEntries(Object.entries(payloads).reverse());
  assert.equal(createOfficialCommandCenterDataset({
    snapshot,
    firestorePayloads: reversedPayloads,
  }).datasetHash, dataset.datasetHash);
});

check("normalized_dataset_is_not_yet_a_rules_or_training_grant", () => {
  assert.equal(dataset.reviewStatus, "normalized_pending_independent_certification");
  assert.equal(dataset.productionRoomBindingEligible, false);
  assert.equal(dataset.canAffectRules, false);
  assert.equal(dataset.trainingTruth, false);
});

const failures = acceptance.filter((item) => !item.passed);
const report = {
  schema: "starcraft_tmg_official_command_center_adapter_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length - failures.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures,
  dataset: {
    schema: dataset.schema,
    datasetHash: dataset.datasetHash,
    sourceSnapshotHash: dataset.sourceSnapshotHash,
    dataVersions: dataset.dataVersions,
    recordIndexHash: dataset.recordIndexHash,
    reviewStatus: dataset.reviewStatus,
  },
  audit,
  productionRoomBindingEligible: false,
  repositoryFallbackAllowed: false,
  rulesTruth: false,
  trainingTruth: false,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR, "official-command-center-adapter-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  failures,
  datasetHash: dataset.datasetHash,
  sourceSnapshotHash: dataset.sourceSnapshotHash,
  dataVersions: dataset.dataVersions,
  counts: audit.counts,
  productionRoomBindingEligible: false,
  repositoryFallbackAllowed: false,
  rulesTruth: false,
  trainingTruth: false,
}, null, 2));
if (failures.length > 0) process.exitCode = 1;
