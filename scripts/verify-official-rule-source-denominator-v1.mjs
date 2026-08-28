#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createOfficialRuleSourceDenominator,
  verifyOfficialRuleSourceDenominator,
} from "../packages/rule-atoms/official-source-denominator-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const SOURCE_DIR = path.join(ROOT, "build", "source-intake", "official-rules");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const EXPECTED_PDF_HASH = "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54";

const pdfBytes = await readFile(path.join(SOURCE_DIR, "StarCraft-TMG_EN.pdf"));
const extractedText = await readFile(path.join(SOURCE_DIR, "StarCraft-TMG_EN.txt"), "utf8");

const input = {
  gameId: "starcraft-tmg",
  sourceSnapshotId: "starcraft-tmg.archon.rulebook.en@sha256-27639c562e6d",
  sourceUrl: "https://archon-studio.com/files/manuals/sc/StarCraft-TMG_EN.pdf",
  expectedContentHash: EXPECTED_PDF_HASH,
  expectedByteLength: 15_688_406,
  expectedPdfPages: 128,
  capturedAt: "2026-08-24T00:00:00.000Z",
  language: "en",
  pdfBytes,
  extractedText,
  extractor: {
    id: "pdftotext-layout",
    version: "25.06.0",
    commandContract: "pdftotext -layout INPUT.pdf OUTPUT.txt",
  },
  visualPageOverrides: [
    {
      pdfPage: 97,
      extractionStatus: "image_only_reviewed",
      sourceScope: "interstitial_art",
      initialDisposition: "display_only",
      reasonCode: "non_rules_chapter_art_page",
    },
    {
      pdfPage: 127,
      extractionStatus: "image_only_reviewed",
      sourceScope: "promotional_art",
      initialDisposition: "display_only",
      reasonCode: "non_rules_promotional_page",
    },
  ],
};

const acceptance = [];
function check(id, fn) {
  try {
    fn();
    acceptance.push({ id, passed: true });
  } catch (error) {
    acceptance.push({ id, passed: false, error: String(error?.stack || error) });
  }
}

const denominator = createOfficialRuleSourceDenominator(input);
const verification = verifyOfficialRuleSourceDenominator(denominator);

check("official_pdf_identity_is_exact", () => {
  assert.equal(denominator.sourceSnapshot.contentHash, EXPECTED_PDF_HASH);
  assert.equal(denominator.sourceSnapshot.byteLength, 15_688_406);
  assert.equal(denominator.sourceSnapshot.pdfPages, 128);
});

check("all_pdf_pages_are_accounted", () => {
  assert.equal(denominator.pageLedger.length, 128);
  assert.equal(verification.counts.unaccountedPages, 0);
  assert.deepEqual(verification.unaccountedPdfPages, []);
});

check("image_only_page_is_explicit_not_silently_dropped", () => {
  const page = denominator.pageLedger.find((entry) => entry.pdfPage === 127);
  assert.equal(page.extractionStatus, "image_only_reviewed");
  assert.equal(page.sourceScope, "promotional_art");
  assert.equal(page.initialDisposition, "display_only");
  assert.equal(page.candidateBlockCount, 0);
});

check("source_scope_ranges_cover_the_complete_document", () => {
  assert.deepEqual(verification.counts.pagesByScope, {
    front_matter: 5,
    overview: 1,
    worked_example: 23,
    core_rules: 64,
    quick_reference: 21,
    interstitial_art: 1,
    index: 1,
    map_layouts: 10,
    promotional_art: 1,
    back_cover: 1,
  });
});

check("candidate_blocks_are_hash_bound_and_page_located", () => {
  assert.ok(denominator.candidateBlocks.length > 500);
  for (const block of denominator.candidateBlocks) {
    assert.match(block.textHash, /^[a-f0-9]{64}$/);
    assert.ok(Number.isInteger(block.locator.page) && block.locator.page >= 1 && block.locator.page <= 128);
    assert.ok(block.locator.section);
    assert.equal(block.sourceContentHash, EXPECTED_PDF_HASH);
  }
});

check("tracked_denominator_does_not_embed_copyrighted_rule_text", () => {
  for (const block of denominator.candidateBlocks) {
    assert.equal("text" in block, false);
    assert.equal("excerpt" in block, false);
  }
});

check("core_and_reference_material_stays_non_executable_pending_semantic_review", () => {
  assert.equal(denominator.sourceDenominatorStatus, "block_inventory_only");
  assert.equal(denominator.rulesEligible, false);
  assert.equal(denominator.trainingTruth, false);
  assert.ok(verification.blocks.includes("semantic_clause_segmentation_not_reviewed"));
  assert.ok(verification.blocks.includes("official_faq_supplement_not_merged"));
});

check("normalization_is_reproducible", () => {
  assert.equal(createOfficialRuleSourceDenominator(input).denominatorHash, denominator.denominatorHash);
});

check("pdf_or_text_tamper_fails_closed", () => {
  assert.throws(
    () => createOfficialRuleSourceDenominator({ ...input, pdfBytes: Buffer.concat([pdfBytes, Buffer.from("x")]) }),
    /official_pdf_hash_mismatch/,
  );
  assert.throws(
    () => createOfficialRuleSourceDenominator({ ...input, extractedText: `${extractedText}tampered` }),
    /pdf_text_page_count_mismatch/,
  );
});

check("denominator_hash_detects_metadata_tamper", () => {
  const tampered = structuredClone(denominator);
  tampered.pageLedger[0].sourceScope = "core_rules";
  assert.throws(() => verifyOfficialRuleSourceDenominator(tampered), /source_denominator_hash_mismatch/);
});

const failures = acceptance.filter((item) => !item.passed);
const report = {
  schema: "starcraft_tmg_official_rule_source_denominator_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length - failures.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures,
  denominatorHash: denominator.denominatorHash,
  verification,
  trainingTruth: false,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR, "official-source-block-denominator-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) process.exitCode = 1;
