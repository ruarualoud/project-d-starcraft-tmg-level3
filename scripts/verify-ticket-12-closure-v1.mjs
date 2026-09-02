#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createStarcraftTmgVerifiedSourceRevisionManifestV4 } from
  "../packages/source-data/official-source-import-workflow-v4.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "../packages/source-data/official-development-tranche-source-lock-v1.mjs";
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from
  "./support/official-development-tranche-source-lock-fixture-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_PATH = path.join(ROOT, "build/ticket-12-closure-v1/report.json");
const PATHS = Object.freeze({
  slice112: "build/official-source-localization-binding-v2/report.json",
  slice113: "build/ticket-12-source-evidence-v3/report.json",
  slice114: "build/ticket-12-source-import-v4/report.json",
  slice115: "build/ticket-12-direct-translation-provider-v1/report.json",
  slice116: "build/ticket-12-translation-review-store-v1/report.json",
  slice117: "build/ticket-12-source-review-ui-v1/report.json",
  ticket11: "build/ticket-11-closure-v1/report.json",
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value || {}).filter(([key]) => !keys.includes(key)));
}

async function load(relativePath) {
  return JSON.parse(await readFile(path.join(ROOT, relativePath), "utf8"));
}

function verifyReportHash(report) {
  return report.reportHash === hashStarcraftTmgContract(without(report, ["reportHash"]));
}

function rawCaptures(lock) {
  return Object.entries({ ...lock.firestore, ...lock.binaries, ...lock.texts }).map(([sourceId, record]) => ({
    sourceId,
    sourceClass: Object.hasOwn(lock.firestore, sourceId)
      ? "firestore"
      : Object.hasOwn(lock.binaries, sourceId) ? "binary" : "text",
    byteHash: record.byteHash,
    byteLength: record.byteLength,
  }));
}

const reports = Object.fromEntries(await Promise.all(Object.entries(PATHS).map(async ([key, value]) => [key, await load(value)])));
const frozen = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root: ROOT });
const frozenRevision = createStarcraftTmgVerifiedSourceRevisionManifestV4({
  captureId: frozen.lock.captureId,
  snapshot: frozen.snapshot,
  dataset: frozen.dataset,
  rawCaptures: rawCaptures(frozen.lock),
  upstreamVerificationHash: frozen.audit.auditHash,
});

const checks = [];
const failures = [];
async function check(id, fn) {
  try {
    await fn();
    checks.push({ id, passed: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    checks.push({ id, passed: false, error: message });
    failures.push(`${id}: ${message}`);
  }
}

await check("all_six_ticket_12_implementation_slices_pass_their_fixed_denominators", () => {
  assert(reports.slice112.ok && reports.slice112.checks.length === 11 && reports.slice112.failures.length === 0, "Slice112 gate mismatch");
  assert(reports.slice113.acceptancePassed === 13 && reports.slice113.acceptanceTotal === 13 && reports.slice113.failures.length === 0, "Slice113 gate mismatch");
  for (const [key, denominator] of [["slice114", 11], ["slice115", 11], ["slice116", 9], ["slice117", 11]]) {
    assert(reports[key].status === "passed" && reports[key].counts.passed === denominator
      && reports[key].counts.failed === 0 && verifyReportHash(reports[key]), `${key} gate/hash mismatch`);
  }
});

await check("frozen_official_source_chain_is_identical_across_rules_localization_and_import", () => {
  const expected = {
    lock: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
    snapshot: OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
    dataset: OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  };
  assert(reports.slice112.evidence.sourceLockHash === expected.lock, "Slice112 lock drift");
  assert(reports.slice112.evidence.sourceSnapshotHash === expected.snapshot, "Slice112 snapshot drift");
  assert(reports.slice112.evidence.officialDatasetHash === expected.dataset, "Slice112 dataset drift");
  assert(reports.slice113.inspection.sourceLockHash === expected.lock, "Slice113 lock drift");
  assert(reports.slice113.inspection.sourceSnapshotHash === expected.snapshot, "Slice113 snapshot drift");
  assert(reports.slice113.inspection.officialDatasetHash === expected.dataset, "Slice113 dataset drift");
  assert(reports.ticket11.frozenIdentities.sourceLockHash === expected.lock
    && reports.ticket11.frozenIdentities.sourceSnapshotHash === expected.snapshot
    && reports.ticket11.frozenIdentities.normalizedDatasetHash === expected.dataset, "Ticket11 source chain drift");
  assert(reports.slice114.sourceRevisionHash === frozenRevision.revisionHash, "Slice114 frozen revision drift");
});

await check("source_and_field_provenance_denominators_are_complete_and_content_free", () => {
  const coverage = reports.slice113.inspection.coverage;
  assert(coverage.records === 271 && coverage.fields === 1440 && coverage.currentRecordLocators === 271, "record/field locator denominator mismatch");
  assert(coverage.productRecordsWithP2pHistory === 83 && coverage.productFieldsWithP2pHistory === 617
    && coverage.p2pPageLocators === 123, "product/P2P denominator mismatch");
  assert(coverage.ruleSectionRecordsWithPageRanges === 15 && coverage.ruleFieldsWithPageRanges === 269
    && coverage.coreStructuralAnchors === 192, "rule/Core denominator mismatch");
  assert(coverage.fieldCountsByAuthorityDisposition.community_display_only === 554, "community field denominator mismatch");
  assert(reports.slice113.inspection.rights.rawContentIncludedInPublicEvidence === false, "public evidence contains source body");
});

await check("precedence_quarantine_and_historical_display_replay_remain_strict", () => {
  const inspection = reports.slice113.inspection;
  assert(inspection.precedence.currentProductValue === "frozen_command_center_wins_p2p_is_history_only", "product precedence drift");
  assert(inspection.precedence.generalRule === "room_pinned_rule_kernel_and_frozen_core_rulebook_win", "Rules precedence drift");
  assert(inspection.precedence.missingCurrentValue === "quarantine_without_p2p_repository_or_legacy_fallback", "missing-current fallback widened");
  assert(reports.slice113.samples.currentFaq43.reviewStatus === "quarantined_semantic_drift", "current FAQ left quarantine");
  assert(reports.slice113.samples.historicalFaq43.reviewStatus === "historical_display_and_pinned_replay_dependency_only", "historical FAQ discarded");
  assert(reports.slice113.ctx2skill.crossTimeReplayResult.startsWith("passed_historical"), "historical source cross-time replay missing");
});

await check("explicit_import_ledger_replay_rollback_and_room_pins_are_closed", () => {
  const report = reports.slice114;
  assert(report.frozenSourceRefreshPerformed === false, "Slice114 refreshed source");
  assert(report.counts.workflowRevisions === 4 && report.counts.roomPins === 2, "source workflow denominator mismatch");
  assert(report.ledgerHash && report.ctx2skill.crossTimeReplayResult === "passed", "source ledger replay missing");
  assert(report.checks.find((entry) => entry.id === "room_pins_survive_promotion_and_exact_rollback")?.passed, "room pin/rollback gate missing");
});

await check("direct_translation_provider_is_bounded_credential_safe_and_canonical_neutral", () => {
  const report = reports.slice115;
  assert(report.evidence.directAdapterWireSmoke === "passed", "direct Adapter wire smoke missing");
  assert(report.evidence.canonicalUnchanged === true && report.evidence.productionReady === false, "Provider authority/production claim widened");
  assert(report.counts.successfulAttemptCount === 2, "Provider retry accounting mismatch");
  assert(report.dshUsed === false && report.trainingPromotion === false, "translation Provider used DSH/training promotion");
});

await check("sqlite_postgres_review_lifecycle_and_audit_are_cross_adapter_identical", () => {
  const evidence = reports.slice116.evidence;
  assert(evidence.sqliteSemanticHash === evidence.postgresSemanticHash, "review-store semantic hash mismatch");
  assert(evidence.sqliteFileRestart === "passed" && evidence.postgresProtocolRestart === "passed", "review-store restart gate missing");
  assert(evidence.auditReplayHash && evidence.auditHeadHash, "review-store audit lineage missing");
  assert(evidence.livePostgresIntegration === "not_run_no_postgres_dsn_or_server" && evidence.productionReady === false, "live PostgreSQL claim widened");
});

await check("shared_web_app_review_ui_is_accessible_offline_safe_and_geometry_isolated", () => {
  const report = reports.slice117;
  assert(report.evidence.sharedContentHash && report.counts.surfaces === 2 && report.counts.responsiveLayouts === 3, "Web/App parity denominator mismatch");
  assert(report.counts.minimumTouchTargetCssPx === 44, "touch target minimum drift");
  assert(report.evidence.offlineBodiesCached === false && report.evidence.boardGeometryChanged === false, "offline body or board geometry boundary widened");
  assert(report.evidence.sourceRefreshPerformed === false && report.evidence.trainingTruth === false, "UI refreshed source or gained training truth");
});

await check("cross_slice_hashes_bind_source_translation_storage_and_ui_without_canonical_rewrite", () => {
  assert(reports.slice115.evidence.localizationDatasetHash === reports.slice112.evidence.localizationDatasetHash, "Provider/localization dataset mismatch");
  assert(reports.slice115.evidence.glossaryHash, "Provider glossary hash missing");
  assert(reports.slice116.evidence.sqliteSemanticHash === reports.slice116.evidence.postgresSemanticHash, "storage semantic identity missing");
  assert(reports.slice117.evidence.sharedContentHash, "shared UI content identity missing");
  assert(reports.slice112.evidence.trainingTruth === false
    && reports.slice115.trainingPromotion === false
    && reports.slice116.trainingPromotion === false
    && reports.slice117.trainingPromotion === false, "translation path entered training truth");
});

await check("ticket_reports_contain_no_provider_secret_or_raw_translation_body", () => {
  const publicArtifacts = Object.values(reports)
    .filter((report) => report.ticket === 12 || report.schemaVersion?.includes("official_source_localization"));
  const serialized = JSON.stringify(publicArtifacts);
  assert(!/Bearer\s+[A-Za-z0-9]/u.test(serialized), "Bearer credential leaked into report");
  assert(!/provider-secret-|vault:\/\/|\bsk-[A-Za-z0-9]/u.test(serialized), "Provider secret/reference leaked into report");
  assert(!serialized.includes("使徒（草稿") && !serialized.includes('"canonicalText":"Adept"'), "translation/source body leaked into report");
});

await check("ticket_11_rules_truth_remains_complete_and_unmodified_by_localization", () => {
  const rules = reports.ticket11.rulesMatrix;
  assert(reports.ticket11.status === "complete" && reports.ticket11.acceptancePassed === 12, "Ticket11 closure regressed");
  assert(rules.executableAtoms === 912 && rules.actionableAtoms === 912
    && rules.reviewRequiredAtoms === 0 && rules.displayOnlyAtomsRetained === 114, "RuleAtom denominator drift");
  assert(reports.ticket11.frozenIdentities.catalogueHash === "5b3bd5d65a6e3478e98536e7fb71133fd0624c99cccbc47c886c96f731c16d46", "Rules catalogue drift");
});

await check("ticket_closes_implementation_without_overclaiming_deployment_or_training", () => {
  const rights = reports.slice113.inspection.rights;
  assert(rights.unresolvedCurrentSources === 6 && rights.publicReleaseGatePassed === false, "rights gate overclaimed");
  assert(reports.slice115.evidence.liveExternalProviderSmoke.startsWith("not_run"), "external Provider smoke claim widened");
  assert(reports.slice116.evidence.productionReady === false && reports.slice117.evidence.productionReady === false, "deployment readiness overclaimed");
  for (const report of [reports.slice114, reports.slice115, reports.slice116, reports.slice117]) {
    assert(report.dshUsed === false && report.muzeroUsed === false && report.selfPlayUsed === false
      && report.trainingPromotion === false, "later-ticket capability ran during Ticket12");
  }
});

const focusedAssertions = 11 + 13 + 11 + 11 + 9 + 11;
const artifactHashes = Object.fromEntries(Object.entries(reports).map(([key, report]) => [
  key,
  report.reportHash || hashStarcraftTmgContract(without(report, ["generatedAt"])),
]));
const productionBlocks = [
  "current_faq_semantic_drift_requires_independent_re_review",
  "six_current_source_classes_require_rights_and_redistribution_review",
  "official_current_data_requires_independent_production_signature",
  "external_translation_provider_smoke_requires_user_supplied_credential",
  "live_postgresql_integration_requires_deployment_dsn_and_migration",
  "web_and_native_shell_mounting_requires_browser_and_real_device_evidence",
];
const report = {
  schema: "starcraft_tmg_ticket_12_closure_verification_v1",
  generatedAt: "2026-09-02T20:00:00.000Z",
  ticket: 12,
  status: failures.length === 0 ? "complete" : "failed",
  acceptancePassed: checks.filter((entry) => entry.passed).length,
  acceptanceTotal: checks.length,
  acceptance: checks,
  failures,
  sliceStatus: {
    planned: 7,
    complete: failures.length === 0 ? 7 : 6,
    slices: [112, 113, 114, 115, 116, 117, 118],
  },
  evidenceDenominator: {
    baseSliceReports: 6,
    baseSliceAssertions: focusedAssertions,
    aggregateReports: 7,
    aggregateAssertions: focusedAssertions + checks.length,
  },
  frozenIdentities: {
    sourceLockHash: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
    sourceSnapshotHash: OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
    officialDatasetHash: OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
    localizationDatasetHash: reports.slice112.evidence.localizationDatasetHash,
    sourceRevisionHash: frozenRevision.revisionHash,
    sourceEvidenceCatalogueHash: reports.slice113.inspection.fieldEvidenceCatalogueHash,
    sourceImportLedgerHash: reports.slice114.ledgerHash,
    providerReceiptHash: reports.slice115.evidence.providerReceiptHash,
    reviewStoreSemanticHash: reports.slice116.evidence.sqliteSemanticHash,
    reviewAuditReplayHash: reports.slice116.evidence.auditReplayHash,
    sharedUiContentHash: reports.slice117.evidence.sharedContentHash,
  },
  artifactHashes,
  sourceCoverage: cloneCoverage(reports.slice113.inspection.coverage),
  rulesMatrixUnchanged: reports.ticket11.rulesMatrix,
  productionBlocks,
  productProjectStatusAfterClosure: {
    completedTickets: failures.length === 0 ? 12 : 11,
    totalTickets: 22,
    nextTicket: 13,
  },
  productionReady: false,
  sourceRefreshPerformed: false,
  skillGenerated: false,
  dshRun: false,
  muzeroDataGenerated: false,
  selfPlayRun: false,
  trainingTruth: false,
  ctx2skill: {
    ctx2skillLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    roleRoutes: ["fact_probe"],
    skillsRead: 0,
    skillsGenerated: 0,
    judgeTests: checks.length,
    crossTimeReplayResult: failures.length === 0
      ? "passed_historical_source_room_audit_and_cache_version_replay"
      : "failed",
    promotions: [],
    blocks: productionBlocks,
    remainingRuleGaps: 0,
  },
};

function cloneCoverage(value) {
  return JSON.parse(JSON.stringify(value));
}

report.reportHash = hashStarcraftTmgContract(report);
await mkdir(path.dirname(REPORT_PATH), { recursive: true });
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) process.exitCode = 1;
