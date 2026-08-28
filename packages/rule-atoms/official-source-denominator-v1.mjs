import { createHash } from "node:crypto";

import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";

export const OFFICIAL_RULE_SOURCE_DENOMINATOR_SCHEMA = "starcraft_tmg_official_rule_source_denominator_v1";

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requiredText(value, code) {
  const normalized = String(value || "").trim();
  if (!normalized) fail(code);
  return normalized;
}

function sha256Bytes(value) {
  return createHash("sha256").update(value).digest("hex");
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function sourceScopeForPage(pdfPage) {
  if (pdfPage <= 5) return "front_matter";
  if (pdfPage === 6) return "overview";
  if (pdfPage <= 29) return "worked_example";
  if (pdfPage <= 93) return "core_rules";
  if (pdfPage <= 115) return "quick_reference";
  if (pdfPage === 116) return "index";
  if (pdfPage <= 126) return "map_layouts";
  if (pdfPage === 127) return "promotional_art";
  return "back_cover";
}

function initialDispositionForScope(sourceScope) {
  return ["core_rules", "quick_reference", "map_layouts"].includes(sourceScope)
    ? "review_required"
    : "display_only";
}

function normalizePageBlocks(pageText) {
  const withoutBoilerplate = String(pageText || "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((line) => {
      const compact = line.replace(/[•]/g, " ").trim();
      if (!compact) return true;
      if (/^\d{1,3}$/.test(compact)) return false;
      if (/^BACK TO TABLE OF CONTENTS$/i.test(compact)) return false;
      return true;
    })
    .join("\n")
    .trim();
  if (!withoutBoilerplate) return [];
  return withoutBoilerplate
    .split(/\n\s*\n+/)
    .map((block) => block.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function splitPdfPages(extractedText, expectedPdfPages) {
  const pages = String(extractedText || "").split("\f");
  if (pages.at(-1) === "") pages.pop();
  if (pages.length !== expectedPdfPages) {
    fail("pdf_text_page_count_mismatch", `${pages.length}!=${expectedPdfPages}`);
  }
  return pages;
}

function bodyWithoutHash(denominator) {
  const { denominatorHash: _denominatorHash, ...body } = denominator;
  return body;
}

export function createOfficialRuleSourceDenominator(input = {}) {
  const pdfBytes = Buffer.isBuffer(input.pdfBytes)
    ? input.pdfBytes
    : input.pdfBytes instanceof Uint8Array
      ? Buffer.from(input.pdfBytes)
      : null;
  if (!pdfBytes) fail("official_pdf_bytes_required");
  const expectedContentHash = requiredText(input.expectedContentHash, "expected_pdf_hash_required").toLowerCase();
  const actualContentHash = sha256Bytes(pdfBytes);
  if (actualContentHash !== expectedContentHash) fail("official_pdf_hash_mismatch");
  if (pdfBytes.byteLength !== Number(input.expectedByteLength)) fail("official_pdf_byte_length_mismatch");
  const expectedPdfPages = Number(input.expectedPdfPages);
  if (!Number.isInteger(expectedPdfPages) || expectedPdfPages < 1) fail("expected_pdf_pages_invalid");
  const pages = splitPdfPages(input.extractedText, expectedPdfPages);
  if (!object(input.extractor)) fail("extractor_contract_required");
  const extractor = {
    id: requiredText(input.extractor.id, "extractor_id_required"),
    version: requiredText(input.extractor.version, "extractor_version_required"),
    commandContract: requiredText(input.extractor.commandContract, "extractor_command_contract_required"),
    extractedTextHash: sha256Bytes(Buffer.from(String(input.extractedText), "utf8")),
  };
  const visualOverrides = new Map();
  for (const override of input.visualPageOverrides || []) {
    if (!object(override) || !Number.isInteger(override.pdfPage)
      || override.pdfPage < 1 || override.pdfPage > expectedPdfPages) fail("invalid_visual_page_override");
    if (visualOverrides.has(override.pdfPage)) fail("duplicate_visual_page_override");
    visualOverrides.set(override.pdfPage, {
      extractionStatus: requiredText(override.extractionStatus, "visual_page_status_required"),
      sourceScope: requiredText(override.sourceScope, "visual_page_scope_required"),
      initialDisposition: requiredText(override.initialDisposition, "visual_page_disposition_required"),
      reasonCode: requiredText(override.reasonCode, "visual_page_reason_required"),
    });
  }

  const sourceSnapshotId = requiredText(input.sourceSnapshotId, "source_snapshot_id_required");
  const language = requiredText(input.language, "source_language_required");
  const pageLedger = [];
  const candidateBlocks = [];
  for (let index = 0; index < pages.length; index += 1) {
    const pdfPage = index + 1;
    const pageBlocks = normalizePageBlocks(pages[index]);
    const override = visualOverrides.get(pdfPage);
    if (override && pageBlocks.length > 0) fail("visual_override_has_extracted_text", String(pdfPage));
    const sourceScope = override?.sourceScope || sourceScopeForPage(pdfPage);
    const initialDisposition = override?.initialDisposition || initialDispositionForScope(sourceScope);
    const extractionStatus = override?.extractionStatus || (pageBlocks.length > 0 ? "text_extracted" : "unaccounted");
    const pageTextHash = sha256Bytes(Buffer.from(pageBlocks.join("\n\n"), "utf8"));
    const blockIds = [];
    for (let blockIndex = 0; blockIndex < pageBlocks.length; blockIndex += 1) {
      const blockText = pageBlocks[blockIndex];
      const textHash = sha256Bytes(Buffer.from(blockText, "utf8"));
      const blockOrdinal = blockIndex + 1;
      const clauseId = `${sourceSnapshotId}:pdf-${String(pdfPage).padStart(3, "0")}:block-${String(blockOrdinal).padStart(3, "0")}:${textHash.slice(0, 12)}`;
      blockIds.push(clauseId);
      candidateBlocks.push({
        clauseId,
        sourceSnapshotId,
        sourceContentHash: actualContentHash,
        locator: {
          page: pdfPage,
          section: `${sourceScope}:block-${String(blockOrdinal).padStart(3, "0")}`,
        },
        textHash,
        language,
        authority: "official_primary",
        sourceScope,
        initialDisposition,
        characterCount: [...blockText].length,
      });
    }
    pageLedger.push({
      pdfPage,
      sourceScope,
      initialDisposition,
      extractionStatus,
      reasonCode: override?.reasonCode || null,
      pageTextHash,
      candidateBlockCount: blockIds.length,
      candidateBlockIds: blockIds,
    });
  }

  const body = {
    schema: OFFICIAL_RULE_SOURCE_DENOMINATOR_SCHEMA,
    gameId: requiredText(input.gameId, "game_id_required"),
    sourceSnapshot: {
      sourceSnapshotId,
      authority: "official_primary",
      immutableLocator: requiredText(input.sourceUrl, "source_url_required"),
      contentHash: actualContentHash,
      byteLength: pdfBytes.byteLength,
      pdfPages: expectedPdfPages,
      mediaType: "application/pdf",
      language,
      capturedAt: new Date(input.capturedAt).toISOString(),
      redistributionAllowed: false,
    },
    extractor,
    pageLedger,
    candidateBlocks,
    sourceDenominatorStatus: "block_inventory_only",
    rulesEligible: false,
    blocks: [
      "semantic_clause_segmentation_not_reviewed",
      "candidate_blocks_not_mapped_to_rule_atoms",
      "official_faq_supplement_not_merged",
      "independent_rules_review_not_passed",
    ],
    trainingTruth: false,
  };
  return deepFreeze({ ...body, denominatorHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialRuleSourceDenominator(denominator) {
  if (!object(denominator) || denominator.schema !== OFFICIAL_RULE_SOURCE_DENOMINATOR_SCHEMA) {
    fail("invalid_source_denominator_schema");
  }
  const expectedHash = hashStarcraftTmgContract(bodyWithoutHash(denominator));
  if (expectedHash !== denominator.denominatorHash) fail("source_denominator_hash_mismatch");
  const expectedPages = Number(denominator.sourceSnapshot?.pdfPages);
  if (denominator.pageLedger?.length !== expectedPages) fail("source_denominator_page_count_mismatch");
  const seenPages = new Set();
  const blockIds = new Set();
  for (let index = 0; index < denominator.pageLedger.length; index += 1) {
    const page = denominator.pageLedger[index];
    if (page.pdfPage !== index + 1 || seenPages.has(page.pdfPage)) fail("source_denominator_page_sequence_invalid");
    seenPages.add(page.pdfPage);
    if (page.candidateBlockCount !== page.candidateBlockIds.length) fail("source_denominator_page_block_count_mismatch");
    for (const blockId of page.candidateBlockIds) {
      if (blockIds.has(blockId)) fail("duplicate_source_candidate_block_id");
      blockIds.add(blockId);
    }
  }
  const candidateIds = new Set();
  for (const block of denominator.candidateBlocks || []) {
    if (candidateIds.has(block.clauseId)) fail("duplicate_source_candidate_block");
    candidateIds.add(block.clauseId);
    if (!seenPages.has(block.locator?.page)) fail("candidate_block_page_missing");
    if (!blockIds.has(block.clauseId)) fail("candidate_block_not_in_page_ledger");
    if (block.sourceContentHash !== denominator.sourceSnapshot.contentHash) fail("candidate_block_source_hash_mismatch");
    if ("text" in block || "excerpt" in block) fail("copyrighted_rule_text_embedded");
  }
  if (candidateIds.size !== blockIds.size) fail("page_ledger_candidate_block_missing");
  const unaccountedPdfPages = denominator.pageLedger
    .filter((page) => page.extractionStatus === "unaccounted")
    .map((page) => page.pdfPage);
  const pagesByScope = {};
  const blocksByScope = {};
  for (const page of denominator.pageLedger) {
    pagesByScope[page.sourceScope] = (pagesByScope[page.sourceScope] || 0) + 1;
  }
  for (const block of denominator.candidateBlocks) {
    blocksByScope[block.sourceScope] = (blocksByScope[block.sourceScope] || 0) + 1;
  }
  return deepFreeze({
    schema: "starcraft_tmg_official_rule_source_denominator_audit_v1",
    denominatorHash: denominator.denominatorHash,
    counts: {
      pdfPages: expectedPages,
      candidateBlocks: denominator.candidateBlocks.length,
      unaccountedPages: unaccountedPdfPages.length,
      pagesByScope,
      blocksByScope,
    },
    unaccountedPdfPages,
    blocks: [...denominator.blocks],
    rulesEligible: false,
    trainingTruth: false,
  });
}
