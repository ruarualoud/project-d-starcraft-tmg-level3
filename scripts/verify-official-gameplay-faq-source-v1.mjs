#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createOfficialGameplayFaqReceipt,
  verifyOfficialGameplayFaqReceipt,
} from "../packages/rule-atoms/official-gameplay-faq-source-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const SOURCE_PATH = path.join(ROOT, "build", "source-intake", "official-rules", "starcraft-tmg-faq-2026-08-24.html");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const html = await readFile(SOURCE_PATH, "utf8");
const SOURCE_VERSIONING = {
  etag: null,
  lastModified: null,
  cachePolicy: "no-cache, private",
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

const receipt = createOfficialGameplayFaqReceipt({
  html,
  sourceUrl: "https://starcraft-tmg.com/faq",
  capturedAt: "2026-08-24T00:00:00.000Z",
  categoryId: "9",
  sourceVersioning: SOURCE_VERSIONING,
});
const verification = verifyOfficialGameplayFaqReceipt(receipt);

check("semantic_snapshot_is_exact_and_reproducible", () => {
  assert.equal(receipt.semanticContentHash, "e894f5f0a7da88776df7e399d2156acf69cc40284c1f231907f28dd990b0cd92");
  assert.equal(receipt.semanticByteLength, 2176);
  assert.equal(createOfficialGameplayFaqReceipt({
    html,
    sourceUrl: "https://starcraft-tmg.com/faq",
    capturedAt: "2026-08-24T00:00:00.000Z",
    categoryId: "9",
    sourceVersioning: SOURCE_VERSIONING,
  }).semanticContentHash, receipt.semanticContentHash);
});

check("all_seven_gameplay_entries_are_stably_identified", () => {
  assert.deepEqual(receipt.entryIndex.map((entry) => entry.entryId), [
    "faq_9_41", "faq_9_42", "faq_9_43", "faq_9_44", "faq_9_45", "faq_9_46", "faq_9_47",
  ]);
  assert.equal(receipt.entryIndex.length, 7);
});

check("rules_candidates_are_separate_from_product_explanation", () => {
  assert.deepEqual(receipt.normativeCandidateEntryIds, ["faq_9_42", "faq_9_43", "faq_9_46"]);
  assert.deepEqual(receipt.displayOnlyEntryIds, ["faq_9_41", "faq_9_44", "faq_9_45", "faq_9_47"]);
});

check("mutable_html_is_not_used_as_semantic_identity", () => {
  assert.match(receipt.retrieval.rawHtmlHash, /^[a-f0-9]{64}$/);
  assert.equal(receipt.sourceVersioning.etag, null);
  assert.equal(receipt.sourceVersioning.lastModified, null);
  assert.equal(receipt.sourceVersioning.cachePolicy, "no-cache, private");
  assert.equal(receipt.sourceVersioning.frozenBySemanticContentHash, true);
});

check("receipt_does_not_embed_faq_text", () => {
  for (const entry of receipt.entryIndex) {
    assert.equal("question" in entry, false);
    assert.equal("answer" in entry, false);
    assert.match(entry.questionHash, /^[a-f0-9]{64}$/);
    assert.match(entry.answerHash, /^[a-f0-9]{64}$/);
  }
});

check("faq_never_overrides_pdf_or_enters_rules_automatically", () => {
  assert.equal(receipt.precedence, "supplemental_review_only_pdf_remains_primary");
  assert.equal(receipt.rulesEligible, false);
  assert.equal(receipt.trainingTruth, false);
  assert.ok(receipt.blocks.includes("faq_to_pdf_clause_reconciliation_not_reviewed"));
});

check("missing_or_duplicate_gameplay_entries_fail_closed", () => {
  assert.throws(
    () => createOfficialGameplayFaqReceipt({ html: html.replace(/faq_9_47/g, "faq_8_47"), sourceUrl: "https://starcraft-tmg.com/faq", capturedAt: "2026-08-24", categoryId: "9", sourceVersioning: SOURCE_VERSIONING }),
    /gameplay_faq_entry_denominator_mismatch/,
  );
  assert.throws(
    () => createOfficialGameplayFaqReceipt({ html: html.replace(/faq_9_47/g, "faq_9_46"), sourceUrl: "https://starcraft-tmg.com/faq", capturedAt: "2026-08-24", categoryId: "9", sourceVersioning: SOURCE_VERSIONING }),
    /gameplay_faq_entry_denominator_mismatch|duplicate_gameplay_faq_entry/,
  );
});

check("receipt_hash_detects_tamper", () => {
  const tampered = structuredClone(receipt);
  tampered.entryIndex[0].questionHash = "f".repeat(64);
  assert.throws(() => verifyOfficialGameplayFaqReceipt(tampered), /gameplay_faq_receipt_hash_mismatch/);
});

const failures = acceptance.filter((item) => !item.passed);
const report = {
  schema: "starcraft_tmg_official_gameplay_faq_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length - failures.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures,
  receipt,
  verification,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR, "official-gameplay-faq-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  failures,
  semanticContentHash: receipt.semanticContentHash,
  entryCount: receipt.entryIndex.length,
  normativeCandidateEntryIds: receipt.normativeCandidateEntryIds,
  rulesEligible: false,
  trainingTruth: false,
}, null, 2));
if (failures.length > 0) process.exitCode = 1;
