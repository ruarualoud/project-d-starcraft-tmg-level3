#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createOfficialFaqV1SourceLockV1,
  OFFICIAL_FAQ_V1_DOWNLOAD_INVENTORY_HASH,
  OFFICIAL_FAQ_V1_PDF_HASH,
  OFFICIAL_FAQ_V1_RAW_TEXT_HASH,
  OFFICIAL_FAQ_V1_SEMANTIC_INDEX_HASH,
  verifyOfficialFaqV1SourceLockV1,
} from "../packages/source-data/official-faq-v1-source-lock-v1.mjs";
import { OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH } from
  "../packages/source-data/official-development-tranche-source-lock-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_DIR = path.join(ROOT, "build/source-intake/official-rules/faq-v1-2026-09-03");
const OUTPUT_DIR = path.join(ROOT, "build/faq-v1-rules-refresh");
const [pdfBytes, rawText, downloadsHtml] = await Promise.all([
  readFile(path.join(SOURCE_DIR, "StarCraft-TMG-FAQ_EN.pdf")),
  readFile(path.join(SOURCE_DIR, "StarCraft-TMG-FAQ_EN.raw.txt")),
  readFile(path.join(SOURCE_DIR, "downloads.html")),
]);
const sourceInput = { pdfBytes, rawText, downloadsHtml };
const lock = createOfficialFaqV1SourceLockV1(sourceInput);
const acceptance = [];
function accept(description, check) {
  check();
  acceptance.push(`${String(acceptance.length + 1).padStart(2, "0")}_${description}`);
}

accept("official_pdf_identity_and_http_metadata_are_frozen", () => {
  assert.equal(lock.source.byteHash, OFFICIAL_FAQ_V1_PDF_HASH);
  assert.equal(lock.source.byteLength, 333711);
  assert.equal(lock.source.etag, "\"6a96e50b-5178f\"");
  assert.equal(lock.source.lastModified, "Tue, 01 Sep 2026 14:45:31 GMT");
});
accept("downloads_inventory_contains_exactly_24_official_pdf_links", () => {
  assert.equal(lock.downloadsInventory.pdfLinkCount, 24);
  assert.equal(lock.downloadsInventory.pdfUrlIndexHash, OFFICIAL_FAQ_V1_DOWNLOAD_INVENTORY_HASH);
  assert.equal(lock.downloadsInventory.faqListed, true);
});
accept("faq_has_exact_68_entry_semantic_denominator", () => {
  assert.equal(lock.semanticIndex.entryCount, 68);
  assert.equal(lock.semanticIndex.entryIndexHash, OFFICIAL_FAQ_V1_SEMANTIC_INDEX_HASH);
  assert.equal(lock.semanticIndex.derivedRawTextHash, OFFICIAL_FAQ_V1_RAW_TEXT_HASH);
});
accept("eight_section_counts_are_exact", () => {
  assert.deepEqual(lock.semanticIndex.sectionCounts, {
    units_characteristics: 4,
    measuring_movement: 10,
    battlefield: 5,
    deployment_entry_edges_zoi: 8,
    attack_sequence: 6,
    abilities_tactics_cards: 19,
    keywords: 12,
    templates_spillover: 4,
  });
});
accept("semantic_index_contains_hashes_not_faq_body", () => {
  const serialized = JSON.stringify(lock.semanticIndex.entryIndex);
  assert.equal(serialized.includes("question\""), false);
  assert.equal(serialized.includes("answer\""), false);
  assert(lock.semanticIndex.entryIndex.every((entry) => (
    /^[a-f0-9]{64}$/u.test(entry.questionHash) && /^[a-f0-9]{64}$/u.test(entry.answerHash)
  )));
});
accept("old_lock_is_referenced_unchanged_and_historical_display_is_retained", () => {
  assert.equal(lock.priorSourceLock.lockHash, OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH);
  assert.equal(lock.priorSourceLock.mutationAllowed, false);
  assert.equal(lock.priorSourceLock.historicalRoomDisplayRetained, true);
  assert.equal(lock.priorSourceLock.historicalReplayRetained, true);
});
accept("new_lock_is_not_rules_production_or_training_truth_before_reconciliation", () => {
  assert.equal(lock.rulesEligible, false);
  assert.equal(lock.productionRoomEligible, false);
  assert.equal(lock.trainingTruth, false);
  assert.equal(lock.policy.exactEntryReconciliationRequired, true);
});
accept("source_use_does_not_overclaim_redistribution_license_or_rights_review", () => {
  assert.equal(lock.sourceUse.publicPublisherUrl, true);
  assert.equal(lock.sourceUse.redistributionLicenseDeterminedByProject, false);
  assert.equal(lock.sourceUse.independentThirdPartyRightsReviewCompleted, false);
});
accept("content_addressed_lock_recomputes_exactly", () => {
  assert.equal(verifyOfficialFaqV1SourceLockV1(lock, sourceInput), true);
  assert.match(lock.lockHash, /^[a-f0-9]{64}$/u);
});
accept("tampered_pdf_text_or_inventory_fails_closed", () => {
  assert.throws(() => createOfficialFaqV1SourceLockV1({
    ...sourceInput, pdfBytes: Buffer.concat([pdfBytes, Buffer.from("x")]),
  }), /OFFICIAL_FAQ_V1_PDF_IDENTITY_MISMATCH/u);
  assert.throws(() => createOfficialFaqV1SourceLockV1({
    ...sourceInput, rawText: Buffer.concat([rawText, Buffer.from("x")]),
  }), /OFFICIAL_FAQ_V1_RAW_TEXT_IDENTITY_MISMATCH/u);
  assert.throws(() => createOfficialFaqV1SourceLockV1({
    ...sourceInput, downloadsHtml: Buffer.from(downloadsHtml.toString("utf8").replaceAll(
      "https://starcraft-tmg.com/files/downloads/StarCraft-TMG-FAQ_EN.pdf", "",
    )),
  }), /OFFICIAL_FAQ_V1_DOWNLOAD_INVENTORY_MISMATCH/u);
});

const report = {
  schema: "starcraft_tmg_official_faq_v1_source_lock_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  lock,
  sourceRefreshPerformed: true,
  repositoryFallbackUsed: false,
  priorLockMutated: false,
  rulesTruth: false,
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR, "faq-f1-source-lock-report.json"),
  `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  lockHash: lock.lockHash,
  pdfHash: lock.source.byteHash,
  entries: lock.semanticIndex.entryCount,
  sections: lock.semanticIndex.sectionCounts,
  priorLockMutated: false,
  rulesTruth: false,
  trainingTruth: false,
}, null, 2));
