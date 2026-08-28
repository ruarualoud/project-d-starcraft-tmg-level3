#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createCoreClauseCandidateDenominator,
  verifyCoreClauseCandidateDenominator,
} from "../packages/rule-atoms/core-clause-candidate-denominator-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const SOURCE_DIR = path.join(ROOT, "build", "source-intake", "official-rules");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const rawText = await readFile(path.join(SOURCE_DIR, "StarCraft-TMG_EN.raw.txt"), "utf8");
const anchorReport = JSON.parse(await readFile(path.join(OUTPUT_DIR, "core-rule-anchor-index-report.json"), "utf8"));
const anchorIndex = anchorReport.index;

const acceptance = [];
function check(id, fn) {
  try {
    fn();
    acceptance.push({ id, passed: true });
  } catch (error) {
    acceptance.push({ id, passed: false, error: String(error?.stack || error) });
  }
}

const denominator = createCoreClauseCandidateDenominator({
  anchorIndex,
  rawText,
  segmenter: { id: "Intl.Segmenter", version: "ecma402-sentence-en-v1", locale: "en" },
});
const audit = verifyCoreClauseCandidateDenominator({ anchorIndex, denominator });

check("all_192_anchor_regions_are_accounted", () => {
  assert.equal(audit.counts.anchorRegions, 192);
  assert.equal(audit.counts.unaccountedAnchorRegions, 0);
  assert.equal(audit.counts.duplicateAnchorRegions, 0);
});

check("mechanical_candidate_denominator_is_fixed_without_claiming_canonical_count", () => {
  assert.equal(audit.counts.clauseCandidates, 1638);
  assert.equal(denominator.candidateClauseCount, 1638);
  assert.equal(denominator.canonicalClauseCount, null);
  assert.equal(denominator.segmentationStatus, "candidate_segmentation_review_required");
});

check("all_eleven_part_preambles_are_separate_display_only_regions", () => {
  assert.equal(audit.counts.partPreambles, 11);
  assert.equal(audit.counts.unaccountedPartPreambles, 0);
  assert.deepEqual(denominator.partPreambles.map((preamble) => preamble.sourcePart), [
    "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12",
  ]);
  assert.ok(denominator.partPreambles.every((preamble) => preamble.disposition === "display_only"));
  assert.equal(denominator.anchorRegions
    .filter((region) => region.sourceAnchorId.startsWith("2."))
    .reduce((total, region) => total + region.candidateClauseCount, 0), 81);
});

check("decorative_glyph_only_lines_never_become_clause_candidates", () => {
  assert.equal(denominator.extraction.lineFilter?.version, "v2");
  assert.ok(denominator.extraction.lineFilter?.excludes
    .includes("decorative_glyph_only_including_whitespace"));
  const decorativeGlyphHashes = new Set(rawText
    .split(/[\r\n\f]+/u)
    .map((line) => line.trim())
    .filter((line) => line && /^[•\s]+$/u.test(line))
    .map((line) => createHash("sha256").update(line.normalize("NFC"), "utf8").digest("hex")));
  assert.ok(decorativeGlyphHashes.size > 0);
  assert.ok(denominator.clauseCandidates.every((candidate) => (
    !decorativeGlyphHashes.has(candidate.sourceTextHash)
  )));
});

check("four_parent_headers_are_explicit_structural_containers", () => {
  assert.deepEqual(audit.structuralContainerAnchorIds, [
    "core:numbered:2.6",
    "core:numbered:7.3",
    "core:numbered:8.5",
    "core:numbered:8.7",
  ]);
  assert.equal(audit.counts.structuralContainers, 4);
});

check("all_non_whitespace_source_characters_are_covered", () => {
  assert.equal(audit.counts.regionsWithUncoveredCharacters, 0);
  assert.ok(denominator.anchorRegions.every((region) => (
    region.coveredNonWhitespaceCharacterCount === region.nonWhitespaceCharacterCount
  )));
});

check("candidate_ids_hashes_and_anchor_links_are_unique", () => {
  assert.equal(audit.counts.duplicateCandidateIds, 0);
  assert.equal(audit.counts.candidatesWithMissingAnchor, 0);
  assert.ok(denominator.clauseCandidates.every((candidate) => (
    /^[a-f0-9]{64}$/u.test(candidate.sourceTextHash)
      && Number.isInteger(candidate.locator.anchorClauseOrdinal)
  )));
});

check("tracked_denominator_embeds_no_rule_text", () => {
  const serialized = JSON.stringify(denominator);
  assert.equal(serialized.includes('"text"'), false);
  assert.equal(serialized.includes('"excerpt"'), false);
  assert.equal(serialized.includes("Every Archon Studio miniature"), false);
});

check("every_candidate_remains_review_required_and_non_executable", () => {
  assert.ok(denominator.clauseCandidates.every((candidate) => candidate.disposition === "review_required"));
  assert.equal(denominator.rulesEligible, false);
  assert.equal(denominator.trainingTruth, false);
});

check("raw_extraction_drift_fails_closed", () => {
  assert.throws(() => createCoreClauseCandidateDenominator({
    anchorIndex,
    rawText: rawText.replace("Before the first shot", "BeforeX the first shot"),
    segmenter: { id: "Intl.Segmenter", version: "ecma402-sentence-en-v1", locale: "en" },
  }), /core_clause_raw_text_hash_mismatch/);
});

check("denominator_hash_detects_candidate_tamper", () => {
  const tampered = structuredClone(denominator);
  tampered.clauseCandidates[0].characterCount += 1;
  assert.throws(() => verifyCoreClauseCandidateDenominator({
    anchorIndex,
    denominator: tampered,
  }), /core_clause_candidate_denominator_hash_mismatch/);
});

check("candidate_denominator_does_not_grant_rule_or_training_truth", () => {
  assert.ok(denominator.blocks.includes("semantic_clause_boundaries_not_independently_reviewed"));
  assert.ok(denominator.blocks.includes("candidate_clauses_not_mapped_to_rule_atoms"));
  assert.equal(denominator.canAffectRules, false);
  assert.equal(denominator.trainingTruth, false);
});

const failures = acceptance.filter((item) => !item.passed);
const report = {
  schema: "starcraft_tmg_core_clause_candidate_denominator_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length - failures.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures,
  denominator,
  audit,
  rulesTruth: false,
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR, "core-clause-candidate-denominator-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  failures,
  denominatorHash: denominator.denominatorHash,
  counts: audit.counts,
  structuralContainerAnchorIds: audit.structuralContainerAnchorIds,
  canonicalClauseCount: null,
  rulesTruth: false,
  trainingTruth: false,
}, null, 2));
if (failures.length > 0) process.exitCode = 1;
