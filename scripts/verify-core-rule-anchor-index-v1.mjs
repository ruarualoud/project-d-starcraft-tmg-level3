#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  CORE_GLOSSARY_ANCHORS_V1,
  createCoreRuleAnchorIndex,
  verifyCoreRuleAnchorIndex,
} from "../packages/rule-atoms/core-rule-anchor-index-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const SOURCE_DIR = path.join(ROOT, "build", "source-intake", "official-rules");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const pdfBytes = await readFile(path.join(SOURCE_DIR, "StarCraft-TMG_EN.pdf"));
const rawText = await readFile(path.join(SOURCE_DIR, "StarCraft-TMG_EN.raw.txt"), "utf8");

const baseInput = {
  sourceSnapshotId: "core-rules-en@27639c562e6d",
  expectedContentHash: "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54",
  expectedPdfPages: 128,
  pdfBytes,
  rawText,
  extractor: { id: "pdftotext-raw", version: "25.06.0" },
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

const index = createCoreRuleAnchorIndex(baseInput);
const verification = verifyCoreRuleAnchorIndex(index);

check("corrected_anchor_denominator_is_192_not_190", () => {
  assert.equal(index.anchors.length, 192);
  assert.equal(verification.counts.anchors, 192);
  assert.deepEqual(verification.counts.byKind, {
    numbered_core_section: 107,
    glossary_definition: 73,
    quick_reference_section: 12,
  });
});

check("numbered_part_counts_match_the_official_body", () => {
  assert.deepEqual(verification.counts.numberedByPart, {
    "2": 14, "3": 8, "4": 6, "5": 6, "6": 2,
    "7": 11, "8": 38, "9": 15, "10": 7, "12": 12,
  });
});

check("glossary_has_buff_and_debuff_missing_from_initial_research", () => {
  assert.equal(CORE_GLOSSARY_ANCHORS_V1.length, 73);
  assert.ok(CORE_GLOSSARY_ANCHORS_V1.includes("BUFF [Characteristic] (X)"));
  assert.ok(CORE_GLOSSARY_ANCHORS_V1.includes("DEBUFF [Characteristic] (X)"));
  const glossary = index.anchors.filter((anchor) => anchor.anchorKind === "glossary_definition");
  assert.deepEqual(glossary.map((anchor) => anchor.sourceAnchorId), CORE_GLOSSARY_ANCHORS_V1);
});

check("all_anchors_have_pdf_and_printed_page_locators", () => {
  for (const anchor of index.anchors) {
    assert.equal(anchor.locator.printedPage, anchor.locator.pdfPage - 2);
    assert.ok(anchor.locator.pdfPage >= 30 && anchor.locator.pdfPage <= 115);
    assert.match(anchor.headingHash, /^[a-f0-9]{64}$/);
  }
});

check("anchor_ids_and_source_locations_are_unique", () => {
  assert.equal(new Set(index.anchors.map((anchor) => anchor.anchorId)).size, 192);
  assert.equal(verification.counts.duplicateAnchorIds, 0);
  assert.equal(verification.counts.unlocatedAnchors, 0);
});

check("anchor_index_is_not_a_clause_or_rule_atom_claim", () => {
  assert.equal(index.canonicalClauseCount, null);
  assert.equal(index.rulesEligible, false);
  assert.equal(index.trainingTruth, false);
  assert.ok(index.blocks.includes("anchors_not_split_into_normative_clauses"));
});

check("pdf_and_extraction_tamper_fail_closed", () => {
  assert.throws(() => createCoreRuleAnchorIndex({
    ...baseInput,
    pdfBytes: Buffer.concat([pdfBytes, Buffer.from("x")]),
  }), /core_rulebook_pdf_hash_mismatch/);
  assert.throws(() => createCoreRuleAnchorIndex({
    ...baseInput,
    rawText: `${rawText}tampered`,
  }), /core_rulebook_raw_text_page_count_mismatch/);
});

check("anchor_index_hash_detects_tamper", () => {
  const tampered = structuredClone(index);
  tampered.anchors[0].locator.pdfPage += 1;
  assert.throws(() => verifyCoreRuleAnchorIndex(tampered), /core_rule_anchor_index_hash_mismatch/);
});

const failures = acceptance.filter((item) => !item.passed);
const report = {
  schema: "starcraft_tmg_core_rule_anchor_index_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length - failures.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures,
  index,
  verification,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR, "core-rule-anchor-index-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  failures,
  anchorIndexHash: index.anchorIndexHash,
  counts: verification.counts,
  canonicalClauseCount: null,
  rulesEligible: false,
  trainingTruth: false,
}, null, 2));
if (failures.length > 0) process.exitCode = 1;
