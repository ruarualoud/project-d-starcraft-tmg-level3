import { createHash } from "node:crypto";

import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyCoreRuleAnchorIndex } from "./core-rule-anchor-index-v1.mjs";

const DENOMINATOR_SCHEMA = "starcraft_tmg_core_clause_candidate_denominator_v1";
const EXPECTED_CANDIDATE_COUNT = 1638;
const EXPECTED_SOURCE_PARTS = Object.freeze([
  "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12",
]);
const EXPECTED_STRUCTURAL_CONTAINERS = Object.freeze([
  "core:numbered:2.6",
  "core:numbered:7.3",
  "core:numbered:8.5",
  "core:numbered:8.7",
]);

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function splitPages(rawText, expectedPages) {
  const pages = String(rawText || "").split("\f");
  if (pages.at(-1) === "") pages.pop();
  if (pages.length !== expectedPages) fail("core_clause_raw_text_page_count_mismatch");
  return pages.map((page) => page.split(/\r?\n/u));
}

function sourcePartForAnchor(anchor) {
  if (anchor.anchorKind === "numbered_core_section") {
    return String(anchor.sourceAnchorId || "").split(".")[0];
  }
  if (anchor.anchorKind === "glossary_definition") return "11";
  if (anchor.anchorKind === "quick_reference_section") return "12";
  fail("core_clause_anchor_kind_has_no_source_part", String(anchor.anchorKind || ""));
}

function findPartHeadings(pages) {
  const headings = new Map();
  const finalPdfPage = Math.min(115, pages.length);
  for (let pdfPage = 30; pdfPage <= finalPdfPage; pdfPage += 1) {
    const pageLines = pages[pdfPage - 1];
    for (let lineIndex = 0; lineIndex < pageLines.length; lineIndex += 1) {
      const match = pageLines[lineIndex].trim().match(/^PART(\d+):$/u);
      if (!match || !EXPECTED_SOURCE_PARTS.includes(match[1])) continue;
      if (headings.has(match[1])) fail("core_clause_part_heading_duplicate", match[1]);
      headings.set(match[1], { pdfPage, lineOrdinal: lineIndex + 1 });
    }
  }
  const missing = EXPECTED_SOURCE_PARTS.filter((sourcePart) => !headings.has(sourcePart));
  if (missing.length > 0) fail("core_clause_part_heading_missing", missing.join(","));
  return headings;
}

function endBoundaryFor(anchor, nextAnchor, partHeadings) {
  const sourcePart = sourcePartForAnchor(anchor);
  if (nextAnchor && sourcePartForAnchor(nextAnchor) === sourcePart) {
    return {
      pdfPage: nextAnchor.locator.pdfPage,
      lineOrdinal: nextAnchor.locator.lineOrdinal,
      kind: "next_anchor_exclusive",
    };
  }
  if (nextAnchor) {
    const nextSourcePart = sourcePartForAnchor(nextAnchor);
    const nextPartHeading = partHeadings.get(nextSourcePart);
    if (!nextPartHeading) fail("core_clause_next_part_heading_missing", nextSourcePart);
    return {
      ...nextPartHeading,
      kind: "next_part_header_exclusive",
    };
  }
  return { pdfPage: 116, lineOrdinal: 1, kind: "source_scope_end_exclusive" };
}

function includeSourceLine(line) {
  const compact = String(line || "").trim();
  if (!compact) return false;
  if (/^\d+(?: \d+)*$/u.test(compact)) return false;
  if (/^BACKTOTABLE OF CONTENTS$/iu.test(compact)) return false;
  if (/^[•\s]+$/u.test(compact)) return false;
  return true;
}

function extractSourceSpan(pages, start, boundary, options = {}) {
  const includeStart = options.includeStart === true;
  const lines = [];
  for (let pdfPage = start.pdfPage; pdfPage <= boundary.pdfPage; pdfPage += 1) {
    const pageLines = pages[pdfPage - 1];
    const from = pdfPage === start.pdfPage
      ? start.lineOrdinal - (includeStart ? 1 : 0)
      : 0;
    const to = pdfPage === boundary.pdfPage ? boundary.lineOrdinal - 1 : pageLines.length;
    for (let lineIndex = from; lineIndex < to; lineIndex += 1) {
      if (includeSourceLine(pageLines[lineIndex])) lines.push(pageLines[lineIndex].trim());
    }
  }
  return lines.join(" ").replace(/\s+/gu, " ").trim().normalize("NFC");
}

function nonWhitespaceLength(value) {
  return [...String(value).replace(/\s+/gu, "")].length;
}

function denominatorBody(denominator) {
  const { denominatorHash: _denominatorHash, ...body } = denominator;
  return body;
}

export function createCoreClauseCandidateDenominator(input = {}) {
  const { anchorIndex } = input;
  verifyCoreRuleAnchorIndex(anchorIndex);
  const rawText = String(input.rawText || "");
  if (sha256(Buffer.from(rawText, "utf8")) !== anchorIndex.extractor.rawTextHash) {
    fail("core_clause_raw_text_hash_mismatch");
  }
  const segmenterSpec = input.segmenter;
  if (!object(segmenterSpec)
    || segmenterSpec.id !== "Intl.Segmenter"
    || segmenterSpec.version !== "ecma402-sentence-en-v1"
    || segmenterSpec.locale !== "en") {
    fail("core_clause_segmenter_contract_invalid");
  }
  const segmenter = new Intl.Segmenter("en", { granularity: "sentence" });
  const pages = splitPages(rawText, anchorIndex.sourceSnapshot.pdfPages);
  const partHeadings = findPartHeadings(pages);
  const anchors = [...anchorIndex.anchors].sort((left, right) => (
    left.locator.pdfPage - right.locator.pdfPage
      || left.locator.lineOrdinal - right.locator.lineOrdinal
  ));
  const partPreambles = EXPECTED_SOURCE_PARTS.map((sourcePart) => {
    const heading = partHeadings.get(sourcePart);
    const firstAnchor = anchors.find((anchor) => sourcePartForAnchor(anchor) === sourcePart);
    if (!firstAnchor) fail("core_clause_part_has_no_anchor", sourcePart);
    const boundary = {
      pdfPage: firstAnchor.locator.pdfPage,
      lineOrdinal: firstAnchor.locator.lineOrdinal,
      kind: "first_part_anchor_exclusive",
    };
    const preambleText = extractSourceSpan(pages, heading, boundary, { includeStart: true });
    const normalizedPreambleHash = sha256(Buffer.from(preambleText, "utf8"));
    if (nonWhitespaceLength(preambleText) === 0) {
      fail("core_clause_part_preamble_empty", sourcePart);
    }
    return {
      preambleId: `core:part:${sourcePart}:preamble:${normalizedPreambleHash.slice(0, 12)}`,
      sourcePart,
      sourceSnapshotId: anchorIndex.sourceSnapshot.sourceSnapshotId,
      sourceContentHash: anchorIndex.sourceSnapshot.contentHash,
      sourceSpan: {
        start: { ...heading },
        endExclusive: boundary,
      },
      normalizedPreambleHash,
      normalizedCharacterCount: [...preambleText].length,
      nonWhitespaceCharacterCount: nonWhitespaceLength(preambleText),
      disposition: "display_only",
      reasonCode: "part_overview_non_normative",
      executable: false,
      trainingTruth: false,
    };
  });
  const anchorRegions = [];
  const clauseCandidates = [];
  for (let index = 0; index < anchors.length; index += 1) {
    const anchor = anchors[index];
    const sourcePart = sourcePartForAnchor(anchor);
    const boundary = endBoundaryFor(anchor, anchors[index + 1], partHeadings);
    const regionText = extractSourceSpan(pages, anchor.locator, boundary);
    const segments = [...segmenter.segment(regionText)]
      .map((segment) => segment.segment.trim())
      .filter(Boolean);
    const candidateIds = [];
    for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex += 1) {
      const text = segments[segmentIndex];
      const sourceTextHash = sha256(Buffer.from(text, "utf8"));
      const ordinal = segmentIndex + 1;
      const clauseCandidateId = `${anchor.anchorId}:candidate-${String(ordinal).padStart(3, "0")}:${sourceTextHash.slice(0, 12)}`;
      candidateIds.push(clauseCandidateId);
      clauseCandidates.push({
        clauseCandidateId,
        anchorId: anchor.anchorId,
        sourceAnchorId: anchor.sourceAnchorId,
        sourcePart,
        sourceSnapshotId: anchor.sourceSnapshotId,
        sourceContentHash: anchor.sourceContentHash,
        locator: {
          anchorPdfPage: anchor.locator.pdfPage,
          anchorLineOrdinal: anchor.locator.lineOrdinal,
          anchorClauseOrdinal: ordinal,
        },
        sourceTextHash,
        characterCount: [...text].length,
        nonWhitespaceCharacterCount: nonWhitespaceLength(text),
        segmentationBasis: "ecma402_sentence_candidate",
        disposition: "review_required",
        executable: false,
        trainingTruth: false,
      });
    }
    const nonWhitespaceCharacterCount = nonWhitespaceLength(regionText);
    const coveredNonWhitespaceCharacterCount = segments
      .reduce((total, segment) => total + nonWhitespaceLength(segment), 0);
    anchorRegions.push({
      anchorId: anchor.anchorId,
      sourceAnchorId: anchor.sourceAnchorId,
      sourcePart,
      anchorKind: anchor.anchorKind,
      sourceSpan: {
        start: {
          pdfPage: anchor.locator.pdfPage,
          lineOrdinal: anchor.locator.lineOrdinal + 1,
        },
        endExclusive: boundary,
      },
      normalizedRegionHash: sha256(Buffer.from(regionText, "utf8")),
      normalizedCharacterCount: [...regionText].length,
      nonWhitespaceCharacterCount,
      coveredNonWhitespaceCharacterCount,
      uncoveredNonWhitespaceCharacterCount: nonWhitespaceCharacterCount - coveredNonWhitespaceCharacterCount,
      candidateClauseCount: candidateIds.length,
      candidateClauseIds: candidateIds,
      regionStatus: candidateIds.length === 0 ? "structural_container_only" : "candidate_segmented",
    });
  }
  if (clauseCandidates.length !== EXPECTED_CANDIDATE_COUNT) {
    fail("core_clause_candidate_denominator_mismatch", String(clauseCandidates.length));
  }
  const structuralContainers = anchorRegions
    .filter((region) => region.regionStatus === "structural_container_only")
    .map((region) => region.anchorId);
  if (JSON.stringify(structuralContainers) !== JSON.stringify(EXPECTED_STRUCTURAL_CONTAINERS)) {
    fail("core_clause_structural_container_denominator_mismatch", structuralContainers.join(","));
  }
  if (anchorRegions.some((region) => region.uncoveredNonWhitespaceCharacterCount !== 0)) {
    fail("core_clause_candidate_source_coverage_incomplete");
  }
  const body = {
    schema: DENOMINATOR_SCHEMA,
    sourceSnapshot: { ...anchorIndex.sourceSnapshot },
    anchorIndexHash: anchorIndex.anchorIndexHash,
    extraction: {
      rawTextHash: anchorIndex.extractor.rawTextHash,
      anchorExtractor: { ...anchorIndex.extractor },
      segmenter: { ...segmenterSpec },
      lineFilter: {
        id: "official_pdf_text_line_filter",
        version: "v2",
        excludes: [
          "blank",
          "standalone_page_number",
          "back_to_contents",
          "decorative_glyph_only_including_whitespace",
        ],
      },
    },
    partPreambles,
    anchorRegions,
    clauseCandidates,
    partPreambleCount: partPreambles.length,
    sourceAnchorCount: anchorRegions.length,
    candidateClauseCount: clauseCandidates.length,
    canonicalClauseCount: null,
    segmentationStatus: "candidate_segmentation_review_required",
    rulesEligible: false,
    canAffectRules: false,
    blocks: [
      "part_preambles_display_only_not_rule_clauses",
      "semantic_clause_boundaries_not_independently_reviewed",
      "tables_diagrams_notes_and_examples_not_semantically_classified",
      "candidate_clauses_not_mapped_to_rule_atoms",
      "faq_supplemental_clauses_not_merged",
    ],
    trainingTruth: false,
  };
  return deepFreeze({ ...body, denominatorHash: hashStarcraftTmgContract(body) });
}

export function verifyCoreClauseCandidateDenominator(input = {}) {
  const { anchorIndex, denominator } = input;
  verifyCoreRuleAnchorIndex(anchorIndex);
  if (!object(denominator) || denominator.schema !== DENOMINATOR_SCHEMA) {
    fail("core_clause_candidate_denominator_schema_invalid");
  }
  if (hashStarcraftTmgContract(denominatorBody(denominator)) !== denominator.denominatorHash) {
    fail("core_clause_candidate_denominator_hash_mismatch");
  }
  if (denominator.anchorIndexHash !== anchorIndex.anchorIndexHash
    || denominator.sourceSnapshot?.contentHash !== anchorIndex.sourceSnapshot.contentHash
    || denominator.extraction?.rawTextHash !== anchorIndex.extractor.rawTextHash) {
    fail("core_clause_candidate_denominator_dependency_mismatch");
  }
  if (!Array.isArray(denominator.partPreambles)
    || !Array.isArray(denominator.anchorRegions)
    || !Array.isArray(denominator.clauseCandidates)) {
    fail("core_clause_candidate_denominator_collections_invalid");
  }
  const anchorIds = new Set(anchorIndex.anchors.map((anchor) => anchor.anchorId));
  const preambleParts = denominator.partPreambles.map((preamble) => preamble.sourcePart);
  const duplicatePartPreambles = preambleParts.length - new Set(preambleParts).size;
  const unaccountedPartPreambles = EXPECTED_SOURCE_PARTS
    .filter((sourcePart) => !preambleParts.includes(sourcePart)).length;
  for (const preamble of denominator.partPreambles) {
    if (Object.hasOwn(preamble, "text") || Object.hasOwn(preamble, "excerpt")) {
      fail("copyrighted_rule_text_embedded");
    }
    if (preamble.disposition !== "display_only"
      || preamble.reasonCode !== "part_overview_non_normative"
      || preamble.executable !== false
      || preamble.trainingTruth !== false) {
      fail("core_clause_part_preamble_premature_authority", String(preamble.sourcePart || ""));
    }
    if (preamble.sourceSnapshotId !== anchorIndex.sourceSnapshot.sourceSnapshotId
      || preamble.sourceContentHash !== anchorIndex.sourceSnapshot.contentHash) {
      fail("core_clause_part_preamble_dependency_mismatch", String(preamble.sourcePart || ""));
    }
  }
  const regionIds = denominator.anchorRegions.map((region) => region.anchorId);
  const duplicateAnchorRegions = regionIds.length - new Set(regionIds).size;
  const unaccountedAnchorRegions = [...anchorIds].filter((anchorId) => !regionIds.includes(anchorId)).length;
  const candidateIds = denominator.clauseCandidates.map((candidate) => candidate.clauseCandidateId);
  const duplicateCandidateIds = candidateIds.length - new Set(candidateIds).size;
  let candidatesWithMissingAnchor = 0;
  for (const candidate of denominator.clauseCandidates) {
    if (!anchorIds.has(candidate.anchorId)) candidatesWithMissingAnchor += 1;
    if (Object.hasOwn(candidate, "text") || Object.hasOwn(candidate, "excerpt")) {
      fail("copyrighted_rule_text_embedded");
    }
    if (candidate.disposition !== "review_required" || candidate.executable !== false) {
      fail("core_clause_candidate_premature_authority");
    }
  }
  for (const region of denominator.anchorRegions) {
    if (region.candidateClauseCount !== region.candidateClauseIds.length) {
      fail("core_clause_candidate_region_count_mismatch", region.anchorId);
    }
    if (region.candidateClauseIds.some((candidateId) => !candidateIds.includes(candidateId))) {
      fail("core_clause_candidate_region_reference_missing", region.anchorId);
    }
  }
  const structuralContainerAnchorIds = denominator.anchorRegions
    .filter((region) => region.regionStatus === "structural_container_only")
    .map((region) => region.anchorId);
  return deepFreeze({
    schema: "starcraft_tmg_core_clause_candidate_denominator_audit_v1",
    denominatorHash: denominator.denominatorHash,
    counts: {
      partPreambles: denominator.partPreambles.length,
      anchorRegions: denominator.anchorRegions.length,
      clauseCandidates: denominator.clauseCandidates.length,
      structuralContainers: structuralContainerAnchorIds.length,
      unaccountedAnchorRegions,
      duplicateAnchorRegions,
      duplicateCandidateIds,
      candidatesWithMissingAnchor,
      unaccountedPartPreambles,
      duplicatePartPreambles,
      regionsWithUncoveredCharacters: denominator.anchorRegions
        .filter((region) => region.uncoveredNonWhitespaceCharacterCount !== 0).length,
    },
    structuralContainerAnchorIds,
    canonicalClauseCount: null,
    rulesEligible: false,
    canAffectRules: false,
    trainingTruth: false,
  });
}
