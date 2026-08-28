#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { OFFICIAL_P2P_ALIAS_BINDING_V1 } from "../content/official-p2p-alias-binding-v1.mjs";
import {
  createOfficialDataReviewEvidenceBundle,
  createOfficialP2pAliasIndex,
  resolveCurrentOfficialProductWithHistory,
  verifyOfficialP2pAliasIndex,
} from "../packages/source-data/official-p2p-alias-index-v1.mjs";
import {
  createOfficialCommandCenterDataset,
  verifyOfficialCommandCenterDataset,
} from "../packages/source-data/official-command-center-adapter-v1.mjs";
import { verifyOfficialRuleSourceManifest } from "../packages/rule-atoms/official-rule-source-manifest-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const FIRESTORE_DIR = path.join(ROOT, "build", "source-intake", "official-rules", "command-center", "firestore");
const liveReport = JSON.parse(await readFile(path.join(OUTPUT_DIR, "official-live-source-snapshots-report.json"), "utf8"));
const sourceReport = JSON.parse(await readFile(path.join(OUTPUT_DIR, "official-rule-source-manifest-report.json"), "utf8"));
const snapshot = liveReport.commandSnapshot;
const sourceManifest = sourceReport.manifest;
verifyOfficialRuleSourceManifest(sourceManifest);
const firestorePayloads = Object.fromEntries(await Promise.all([
  "army_units",
  "faction_cards",
  "rules_sections",
  "tactical_cards",
].map(async (collectionId) => [
  collectionId,
  JSON.parse(await readFile(path.join(FIRESTORE_DIR, `${collectionId}.json`), "utf8")),
])));
const dataset = createOfficialCommandCenterDataset({ snapshot, firestorePayloads });
const datasetAudit = verifyOfficialCommandCenterDataset({ snapshot, dataset });

const acceptance = [];
function check(id, fn) {
  try {
    fn();
    acceptance.push({ id, passed: true });
  } catch (error) {
    acceptance.push({ id, passed: false, error: String(error?.stack || error) });
  }
}

const aliasIndex = createOfficialP2pAliasIndex({
  snapshot,
  dataset,
  sourceManifest,
  reviewedBinding: OFFICIAL_P2P_ALIAS_BINDING_V1,
});
const aliasAudit = verifyOfficialP2pAliasIndex({ snapshot, dataset, sourceManifest, aliasIndex });
const evidenceBundle = createOfficialDataReviewEvidenceBundle({
  snapshot,
  dataset,
  datasetAudit,
  aliasIndex,
});

check("all_83_current_product_records_have_historical_p2p_aliases", () => {
  assert.equal(aliasAudit.counts.aliases, 83);
  assert.equal(aliasAudit.counts.missingCurrentProductRecords, 0);
  assert.equal(aliasAudit.counts.unexpectedAliasRecords, 0);
  assert.deepEqual(aliasAudit.counts.aliasesByRecordType, {
    deployment: 10,
    mission: 10,
    tactical_card: 37,
    unit: 26,
  });
});

check("every_alias_locator_is_a_hash_bound_page_of_the_expected_kind", () => {
  assert.equal(aliasAudit.counts.locators, 123);
  assert.equal(aliasAudit.counts.invalidPageKinds, 0);
  assert.ok(aliasIndex.aliases.every((alias) => alias.locators.every((locator) => (
    /^[a-f0-9]{64}$/u.test(locator.sourceContentHash)
      && Number.isInteger(locator.pdfPage)
      && locator.pdfPage > 0
  ))));
});

check("command_center_is_current_value_authority_and_p2p_is_history_only", () => {
  assert.equal(aliasIndex.precedence.currentValueSourceId, "starcraft-tmg.official.command-center");
  assert.equal(aliasIndex.precedence.currentValueDatasetHash, dataset.datasetHash);
  assert.equal(aliasIndex.precedence.p2pRole, "historical_display_and_cross_check_only");
  assert.equal(aliasIndex.precedence.onDifference, "command_center_current_value_with_drift_receipt");
  assert.equal(aliasIndex.precedence.onMissingCurrentValue, "quarantine_without_p2p_or_repository_fallback");
  assert.equal(aliasIndex.precedence.repositoryFallbackAllowed, false);
});

check("runtime_resolution_returns_current_official_payload_not_p2p_content", () => {
  const resolved = resolveCurrentOfficialProductWithHistory({
    dataset,
    aliasIndex,
    recordKey: "army_units:adept",
  });
  assert.equal(resolved.current.datasetHash, dataset.datasetHash);
  assert.equal(resolved.current.payloadHash, dataset.recordsByKey["army_units:adept"].payloadHash);
  assert.equal(resolved.historicalP2p.length, 1);
  assert.equal(Object.hasOwn(resolved.historicalP2p[0], "payload"), false);
});

check("missing_current_record_never_falls_back_to_a_p2p_page", () => {
  assert.throws(() => resolveCurrentOfficialProductWithHistory({
    dataset,
    aliasIndex,
    recordKey: "army_units:not_in_latest_official_snapshot",
  }), /official_current_product_record_required/);
});

check("alias_binding_is_exactly_snapshot_dataset_and_manifest_bound", () => {
  assert.equal(aliasIndex.sourceSnapshotHash, snapshot.snapshotHash);
  assert.equal(aliasIndex.normalizedDatasetHash, dataset.datasetHash);
  assert.equal(aliasIndex.sourceManifestHash, sourceManifest.manifestHash);
  assert.match(aliasIndex.aliasIndexHash, /^[a-f0-9]{64}$/u);
});

check("p2p_alias_index_contains_no_gameplay_values_or_rule_text", () => {
  const serialized = JSON.stringify(aliasIndex);
  assert.equal(serialized.includes('"payload"'), false);
  assert.equal(serialized.includes('"cost"'), false);
  assert.equal(serialized.includes('"stats"'), false);
  assert.equal(aliasIndex.valueParityClaimed, false);
});

check("alias_or_precedence_tamper_fails_closed", () => {
  const tampered = structuredClone(aliasIndex);
  tampered.precedence.currentValueSourceId = "p2p-protoss-en";
  assert.throws(() => verifyOfficialP2pAliasIndex({
    snapshot,
    dataset,
    sourceManifest,
    aliasIndex: tampered,
  }), /official_p2p_alias_index_hash_mismatch|official_current_value_precedence_invalid/);
});

check("reviewed_binding_order_does_not_change_the_index_identity", () => {
  assert.equal(createOfficialP2pAliasIndex({
    snapshot,
    dataset,
    sourceManifest,
    reviewedBinding: {
      ...OFFICIAL_P2P_ALIAS_BINDING_V1,
      aliases: [...OFFICIAL_P2P_ALIAS_BINDING_V1.aliases].reverse(),
    },
  }).aliasIndexHash, aliasIndex.aliasIndexHash);
});

check("four_real_review_dimensions_are_content_hash_bound", () => {
  assert.match(evidenceBundle.recordSchemaReviewHash, /^[a-f0-9]{64}$/u);
  assert.match(evidenceBundle.officialScopeReviewHash, /^[a-f0-9]{64}$/u);
  assert.match(evidenceBundle.communityIsolationReviewHash, /^[a-f0-9]{64}$/u);
  assert.equal(evidenceBundle.p2pPrecedenceReviewHash, aliasIndex.aliasIndexHash);
  assert.equal(evidenceBundle.independentProductionSignatureRequired, true);
});

check("source_review_artifacts_grant_no_rules_or_training_authority", () => {
  assert.equal(aliasIndex.canAffectRules, false);
  assert.equal(aliasIndex.trainingTruth, false);
  assert.equal(evidenceBundle.canAffectRules, false);
  assert.equal(evidenceBundle.trainingTruth, false);
});

const failures = acceptance.filter((item) => !item.passed);
const report = {
  schema: "starcraft_tmg_official_p2p_alias_precedence_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length - failures.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures,
  aliasIndex,
  aliasAudit,
  evidenceBundle,
  productionRoomBindingEligible: false,
  repositoryFallbackAllowed: false,
  rulesTruth: false,
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR, "official-p2p-alias-precedence-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  failures,
  aliasIndexHash: aliasIndex.aliasIndexHash,
  counts: aliasAudit.counts,
  evidence: evidenceBundle,
  currentValueSourceId: aliasIndex.precedence.currentValueSourceId,
  p2pRole: aliasIndex.precedence.p2pRole,
  productionRoomBindingEligible: false,
  repositoryFallbackAllowed: false,
  rulesTruth: false,
  trainingTruth: false,
}, null, 2));
if (failures.length > 0) process.exitCode = 1;
