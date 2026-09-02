#!/usr/bin/env node

import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createOfficialGameplayFaqReceipt } from
  "../packages/rule-atoms/official-gameplay-faq-source-v1.mjs";
import { createStarcraftTmgSourceProvenanceHttpAdapterV3 } from
  "../packages/localization/source-provenance-http-handler-v3.mjs";
import { createConfiguredStarcraftTmgSourceProvenanceRuntimeV3 } from
  "../packages/product-composition/source-provenance-factory-v3.mjs";
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from
  "./support/official-development-tranche-source-lock-fixture-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TICKET_11_BUILD = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const REPORT_DIR = path.join(ROOT, "build", "ticket-12-source-evidence-v3");
const REPORT_PATH = path.join(REPORT_DIR, "report.json");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function artifact(filename, key) {
  const report = JSON.parse(await readFile(path.join(TICKET_11_BUILD, filename), "utf8"));
  return report[key];
}

async function loadInputs() {
  const frozen = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root: ROOT });
  const [
    sourceManifest,
    coreAnchorIndex,
    historicalP2pAliasIndex,
    historicalFaqReceipt,
    historicalFaqExactReconciliation,
    historicalFaqSupplementalReconciliation,
  ] = await Promise.all([
    artifact("official-rule-source-manifest-report.json", "manifest"),
    artifact("core-rule-anchor-index-report.json", "index"),
    artifact("official-p2p-alias-precedence-report.json", "aliasIndex"),
    artifact("official-gameplay-faq-report.json", "receipt"),
    artifact("official-faq-exact-reconciliation-v2-report.json", "reconciliation"),
    artifact("official-faq-supplemental-clause-v3-report.json", "reconciliation"),
  ]);
  const currentFaqHtml = await readFile(frozen.lock.texts.gameplay_faq.cachePath, "utf8");
  const currentFaqReceipt = createOfficialGameplayFaqReceipt({
    html: currentFaqHtml,
    sourceUrl: frozen.lock.texts.gameplay_faq.requestedUrl,
    capturedAt: frozen.lock.capturedAt,
    categoryId: "9",
    sourceVersioning: {
      etag: null,
      lastModified: null,
      cachePolicy: "frozen_development_lock_explicit_refresh_only",
    },
  });
  return {
    ...frozen,
    sourceLock: frozen.lock,
    sourceLockAudit: frozen.audit,
    sourceManifest,
    coreAnchorIndex,
    historicalP2pAliasIndex,
    historicalFaqReceipt,
    historicalFaqExactReconciliation,
    historicalFaqSupplementalReconciliation,
    currentFaqReceipt,
  };
}

function createComposition(input) {
  return createConfiguredStarcraftTmgSourceProvenanceRuntimeV3({
    ...input,
    now: () => "2026-09-02T14:00:00.000Z",
  });
}

const input = await loadInputs();
const composition = createComposition(input);
const runtime = composition.runtime;
const http = createStarcraftTmgSourceProvenanceHttpAdapterV3({ runtime });
const inspection = runtime.inspect();
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

await check("frozen_current_source_chain_is_exact_and_never_refreshed", () => {
  assert(inspection.sourceEvidence.sourceLockHash === input.lock.lockHash, "source lock mismatch");
  assert(inspection.sourceEvidence.sourceSnapshotHash === input.snapshot.snapshotHash, "snapshot mismatch");
  assert(inspection.sourceEvidence.officialDatasetHash === input.dataset.datasetHash, "dataset mismatch");
  assert(inspection.sourceEvidence.sourceRefreshPolicy === "explicit_user_command_only", "refresh policy widened");
  assert(inspection.sourceEvidence.repositoryFallbackAllowed === false, "repository fallback enabled");
  assert(inspection.sourceEvidence.legacyFallbackAllowed === false, "legacy fallback enabled");
});

await check("all_current_records_and_public_fields_have_content_free_provenance", () => {
  const coverage = inspection.sourceEvidence.coverage;
  assert(coverage.records === 271 && coverage.currentRecordLocators === 271, "record locator denominator mismatch");
  assert(coverage.fields === 1440, "field evidence denominator mismatch");
  assert(inspection.sourceEvidence.rights.rawContentIncludedInPublicEvidence === false, "public evidence contains raw source");
});

await check("all_current_product_fields_bind_unchanged_p2p_page_history", () => {
  const coverage = inspection.sourceEvidence.coverage;
  assert(coverage.productRecordsWithP2pHistory === 83, "P2P product record coverage mismatch");
  assert(coverage.productFieldsWithP2pHistory === 617, "P2P product field coverage mismatch");
  assert(coverage.p2pPageLocators === 123, "P2P locator denominator mismatch");
  const adept = runtime.getFieldEvidence({
    recordType: "unit",
    canonicalId: "adept",
    fieldPath: "army_units[].name",
  });
  assert(adept.historicalP2pLocators.length === 1, "Adept P2P history missing");
  assert(adept.historicalP2pLocators[0].pdfPage === 1, "Adept P2P page mismatch");
  assert(adept.currentRecordLocator.officialDatasetHash === input.dataset.datasetHash, "Adept current source lost");
});

await check("all_rule_prose_fields_bind_reviewed_rulebook_page_ranges", () => {
  const coverage = inspection.sourceEvidence.coverage;
  assert(coverage.ruleSectionRecordsWithPageRanges === 15, "rule section locator denominator mismatch");
  assert(coverage.ruleFieldsWithPageRanges === 269, "rule field locator denominator mismatch");
  assert(coverage.coreStructuralAnchors === 192, "core anchor denominator mismatch");
  const partEightIndex = input.dataset.recordIndex.find((entry) => entry.recordKey === "rules_sections:iuUyObNTQ2M8xK4IUqzC");
  const partEight = runtime.getFieldEvidence({
    recordType: partEightIndex.recordType,
    canonicalId: partEightIndex.documentId,
    fieldPath: "rules_sections[].title",
  });
  assert(partEight.rulebookLocator.fromPdfPage === 56, "Part 8 start page mismatch");
  assert(partEight.rulebookLocator.toPdfPage === 74, "Part 8 end page mismatch");
  assert(partEight.rulebookLocator.exactFieldPageClaimed === false, "record range overclaimed field precision");
});

await check("community_fields_remain_display_only_without_official_page_claim", () => {
  const evidence = runtime.getFieldEvidence({
    recordType: "community_mission",
    canonicalId: "jvkHAaXJGa91Sbt751F1",
    fieldPath: "faction_cards[].name",
  });
  assert(evidence.authorityDisposition === "community_display_only", "community authority widened");
  assert(evidence.historicalP2pLocators.length === 0 && evidence.rulebookLocator === null, "community gained official page evidence");
  assert(evidence.rights.status === "per_author_unknown", "community rights status widened");
});

await check("current_faq_semantic_drift_is_quarantined", () => {
  const coverage = inspection.sourceEvidence.coverage;
  assert(coverage.faqCurrentEntries === 7 && coverage.faqDriftedEntries === 7, "current FAQ drift denominator mismatch");
  const current = runtime.getFaqEntryEvidence({ version: "current", entryId: "faq_9_43" });
  assert(current.reviewStatus === "quarantined_semantic_drift", "current FAQ was not quarantined");
  assert(current.mayOverrideCoreRules === false && current.rawContentIncluded === false, "current FAQ authority widened");
});

await check("historical_faq_review_remains_displayable_without_current_authority", () => {
  const historical = runtime.getFaqEntryEvidence({ version: "historical", entryId: "faq_9_43" });
  assert(historical.reviewStatus === "historical_display_and_pinned_replay_dependency_only", "historical FAQ was discarded");
  assert(historical.historicalReview.clauseLocatorRefs.length === 3, "historical FAQ clause locators missing");
  assert(historical.mayOverrideCoreRules === false, "historical FAQ gained current authority");
  assert(inspection.historicalVersionPolicy.olderSourcesRemainDisplayable === true, "old source display disabled");
  assert(inspection.historicalVersionPolicy.olderSourcesMayOverrideCurrent === false, "old source override enabled");
});

await check("product_value_precedence_has_no_p2p_or_repository_fallback", () => {
  const current = runtime.resolvePrecedence({ claimScope: "current_product_value" });
  const missing = runtime.resolvePrecedence({ claimScope: "current_product_value", currentValueAvailable: false });
  assert(current.winner === "starcraft-tmg.official.command-center" && current.fallbackUsed === false, "current product winner mismatch");
  assert(missing.winner === null && missing.quarantined === true, "missing current product did not quarantine");
  assert(missing.repositoryFallbackAllowed === false && missing.legacyFallbackAllowed === false, "fallback policy widened");
});

await check("rule_and_faq_precedence_preserve_pinned_rules_truth", () => {
  const core = runtime.resolvePrecedence({ claimScope: "canonical_general_rule" });
  const faq = runtime.resolvePrecedence({ claimScope: "faq_supplement" });
  const historicalRoom = runtime.resolvePrecedence({ claimScope: "historical_room" });
  assert(core.winner === "room_pinned_rule_kernel_and_core_rulebook", "general rule winner mismatch");
  assert(faq.quarantined === true && faq.retainedDisplaySource.endsWith("historical"), "FAQ conflict not isolated");
  assert(historicalRoom.winner === "exact_room_pinned_source_and_rule_dependencies", "historical room pin lost");
});

await check("rights_decisions_allow_only_content_free_provenance_metadata", () => {
  const sourceIds = inspection.sourceEvidence.sources.catalogue
    .filter((source) => source.currentCaptureBound === true)
    .map((source) => source.sourceId);
  for (const sourceId of sourceIds) {
    assert(runtime.checkRedistribution({ sourceId, requestedUse: "provenance_metadata_only" }).allowed === true, `metadata blocked:${sourceId}`);
    for (const requestedUse of ["raw_source_bytes", "extracted_source_text", "source_image", "source_payload", "translated_source_body", "public_display_render"]) {
      const decision = runtime.checkRedistribution({ sourceId, requestedUse });
      assert(decision.allowed === false && decision.productionReleaseGatePassed === false, `rights widened:${sourceId}:${requestedUse}`);
    }
  }
  assert(inspection.sourceEvidence.rights.unresolvedCurrentSources === 6, "unresolved-rights isolation denominator mismatch");
});

await check("public_http_contract_returns_provenance_without_source_body", async () => {
  const field = await http.handle({
    method: "GET",
    pathname: "/starcraft-tmg-level3/source/api/v3/fields/unit/adept",
    query: { fieldPath: "army_units[].name" },
  });
  const faq = await http.handle({
    method: "GET",
    pathname: "/starcraft-tmg-level3/source/api/v3/faq/current/faq_9_43",
  });
  assert(field.status === 200 && faq.status === 200, "public provenance endpoints failed");
  const serialized = JSON.stringify({ field, faq });
  assert(!serialized.includes('"text":"Adept"'), "public provenance leaked canonical source body");
  assert(!serialized.includes("semanticPayload"), "public provenance leaked FAQ body");
  assert(field.response.result.currentRecordLocator.payloadHash, "public field provenance lost content hash");
  assert(faq.response.result.reviewStatus === "quarantined_semantic_drift", "public FAQ drift status missing");
});

await check("tampered_locator_or_faq_receipt_fails_closed", () => {
  const tamperedAliasInput = { ...input, historicalP2pAliasIndex: clone(input.historicalP2pAliasIndex) };
  tamperedAliasInput.historicalP2pAliasIndex.aliases[0].locators[0].pdfPage = 14;
  assertThrows(() => createComposition(tamperedAliasInput), "tampered P2P alias accepted");
  const tamperedFaqInput = { ...input, currentFaqReceipt: clone(input.currentFaqReceipt) };
  tamperedFaqInput.currentFaqReceipt.entryIndex[0].answerHash = "0".repeat(64);
  assertThrows(() => createComposition(tamperedFaqInput), "tampered FAQ receipt accepted");
});

await check("translation_sidecar_and_dsh_remain_outside_source_authority", () => {
  const translation = runtime.resolvePrecedence({ claimScope: "translation_display" });
  assert(translation.winner === "canonical_source_payload", "translation became canonical");
  assert(translation.displaySidecarAllowed === true && translation.fallbackUsed === false, "translation sidecar policy mismatch");
  assert(inspection.translation.dshAllowed === false, "DSH entered source or translation runtime");
  assert(inspection.trainingTruth === false && inspection.sourceEvidence.trainingTruth === false, "source evidence became training truth");
});

function assertThrows(fn, message) {
  let threw = false;
  try {
    fn();
  } catch {
    threw = true;
  }
  assert(threw, message);
}

const ctx2skill = {
  ctx2skillLoopUsed: true,
  targetGames: ["starcraft-tmg"],
  roleRoutes: ["fact_probe"],
  skillsRead: 0,
  skillsGenerated: 0,
  judgeTestsRun: checks.length,
  crossTimeReplayResult: failures.length === 0
    ? "passed_historical_source_display_and_exact_room_dependency_precedence"
    : "failed",
  promotions: [],
  blocks: [
    "current_faq_semantic_drift_requires_new_review",
    "independent_rights_and_redistribution_review_not_passed",
    "real_translation_provider_waits_for_slice_115",
  ],
  remainingRuleGaps: [],
};
const report = {
  schema: "starcraft_tmg_official_source_evidence_precedence_verification_v3",
  generatedAt: new Date().toISOString(),
  ticket: 12,
  slice: 113,
  acceptancePassed: checks.length - failures.length,
  acceptanceTotal: checks.length,
  checks,
  failures,
  inspection: inspection.sourceEvidence,
  samples: {
    adept: runtime.getFieldEvidence({ recordType: "unit", canonicalId: "adept", fieldPath: "army_units[].name" }),
    currentFaq43: runtime.getFaqEntryEvidence({ version: "current", entryId: "faq_9_43" }),
    historicalFaq43: runtime.getFaqEntryEvidence({ version: "historical", entryId: "faq_9_43" }),
  },
  ctx2skill,
  rulesTruth: false,
  trainingTruth: false,
};

await mkdir(REPORT_DIR, { recursive: true });
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  failures,
  fieldEvidenceCatalogueHash: inspection.sourceEvidence.fieldEvidenceCatalogueHash,
  inspectionHash: inspection.sourceEvidence.inspectionHash,
  coverage: inspection.sourceEvidence.coverage,
  rights: inspection.sourceEvidence.rights,
  currentFaqReviewStatus: runtime.getFaqEntryEvidence({ version: "current", entryId: "faq_9_43" }).reviewStatus,
  ctx2skill,
}, null, 2));
if (failures.length > 0) process.exitCode = 1;
