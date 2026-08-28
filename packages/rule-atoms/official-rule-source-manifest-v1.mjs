import { createHash } from "node:crypto";

import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialGameplayFaqReceipt } from "./official-gameplay-faq-source-v1.mjs";

export const OFFICIAL_RULE_SOURCE_MANIFEST_SCHEMA = "starcraft_tmg_official_rule_source_manifest_v1";

const REQUIRED_PDF_SOURCE_IDS = Object.freeze([
  "core-rules-en",
  "p2p-protoss-en",
  "p2p-terran-en",
  "p2p-zerg-en",
]);
const P2P_PAGE_KINDS = Object.freeze([
  "unit_card_sheet",
  "faction_tactical_creep_sheet",
  "mission_deployment_sheet",
]);

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

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function splitExtractedPages(extractedText, expectedPages, sourceId) {
  const pages = String(extractedText || "").split("\f");
  if (pages.at(-1) === "") pages.pop();
  if (pages.length !== expectedPages) fail("official_source_text_page_count_mismatch", sourceId);
  return pages;
}

function normalizePageAnchors(source, expectedPages) {
  if (source.sourceKind !== "p2p_card_sheets") {
    if (source.pageRoles?.length) fail("core_rulebook_page_roles_forbidden");
    return [];
  }
  if (!Array.isArray(source.pageRoles) || source.pageRoles.length === 0) {
    fail("p2p_page_roles_required", source.sourceId);
  }
  const pageRoles = new Map();
  for (const range of source.pageRoles) {
    const from = Number(range?.from);
    const to = Number(range?.to);
    const kind = requiredText(range?.kind, "p2p_page_role_kind_required");
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < from || to > expectedPages) {
      fail("invalid_p2p_page_role_range", source.sourceId);
    }
    if (!P2P_PAGE_KINDS.includes(kind)) fail("invalid_p2p_page_role_kind", kind);
    for (let page = from; page <= to; page += 1) {
      if (pageRoles.has(page)) fail("duplicate_p2p_page_role", `${source.sourceId}:${page}`);
      pageRoles.set(page, kind);
    }
  }
  if (pageRoles.size !== expectedPages) fail("p2p_page_role_denominator_mismatch", source.sourceId);
  return [...pageRoles.entries()].map(([pdfPage, pageKind]) => ({ pdfPage, pageKind }));
}

function normalizePdfSource(source) {
  if (!object(source)) fail("invalid_official_pdf_source");
  const sourceId = requiredText(source.sourceId, "official_pdf_source_id_required");
  const pdfBytes = Buffer.isBuffer(source.pdfBytes)
    ? source.pdfBytes
    : source.pdfBytes instanceof Uint8Array
      ? Buffer.from(source.pdfBytes)
      : null;
  if (!pdfBytes) fail("official_source_pdf_bytes_required", sourceId);
  const expectedHash = requiredText(source.expectedContentHash, "official_pdf_expected_hash_required").toLowerCase();
  if (sha256(pdfBytes) !== expectedHash) fail("official_source_pdf_hash_mismatch", sourceId);
  if (pdfBytes.byteLength !== Number(source.expectedByteLength)) fail("official_source_pdf_byte_length_mismatch", sourceId);
  const expectedPages = Number(source.expectedPdfPages);
  if (!Number.isInteger(expectedPages) || expectedPages < 1) fail("official_source_pdf_pages_invalid", sourceId);
  const textPages = splitExtractedPages(source.extractedText, expectedPages, sourceId);
  const sourceKind = requiredText(source.sourceKind, "official_pdf_source_kind_required");
  if (!['core_rulebook', 'p2p_card_sheets'].includes(sourceKind)) fail("unsupported_official_pdf_source_kind", sourceKind);
  const pageAnchors = normalizePageAnchors({ ...source, sourceId, sourceKind }, expectedPages);
  let structuralAnchorPlan = null;
  if (sourceKind === "core_rulebook") {
    if (!object(source.structuralAnchorPlan)
      || source.structuralAnchorPlan.expectedAnchors !== 192
      || source.structuralAnchorPlan.status !== "materialized_verified") {
      fail("core_structural_anchor_plan_invalid");
    }
    structuralAnchorPlan = {
      expectedAnchors: 192,
      status: "materialized_verified",
    };
  }
  return {
    sourceId,
    sourceKind,
    authority: sourceKind === "core_rulebook" ? "official_frozen_rule" : "official_frozen_card",
    sourceUrl: requiredText(source.sourceUrl, "official_pdf_source_url_required"),
    fileVersion: source.fileVersion === null ? null : requiredText(source.fileVersion, "official_pdf_file_version_invalid"),
    contentHash: expectedHash,
    byteLength: pdfBytes.byteLength,
    pdfPages: expectedPages,
    textExtractionHash: sha256(Buffer.from(String(source.extractedText), "utf8")),
    textLayerPageCount: textPages.length,
    emptyTextLayerPdfPages: textPages.map((page, index) => page.trim() ? null : index + 1).filter(Boolean),
    pageAnchors,
    structuralAnchorPlan,
    rawContentStoredOutsideManifest: true,
    redistributionAllowed: false,
  };
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function manifestBody(manifest) {
  const { manifestHash: _manifestHash, ...body } = manifest;
  return body;
}

export function createOfficialRuleSourceManifest(input = {}) {
  const pdfSources = (input.pdfSources || []).map(normalizePdfSource)
    .sort((left, right) => left.sourceId.localeCompare(right.sourceId));
  const ids = pdfSources.map((source) => source.sourceId);
  if (ids.length !== REQUIRED_PDF_SOURCE_IDS.length
    || REQUIRED_PDF_SOURCE_IDS.some((sourceId) => !ids.includes(sourceId))) {
    fail("official_pdf_source_denominator_mismatch", ids.join(","));
  }
  if (new Set(ids).size !== ids.length) fail("duplicate_official_pdf_source");
  verifyOfficialGameplayFaqReceipt(input.faqReceipt);
  const externalSources = (input.externalSources || []).map((source) => ({
    sourceId: requiredText(source?.sourceId, "external_source_id_required"),
    status: requiredText(source?.status, "external_source_status_required"),
    requiredFor: requiredText(source?.requiredFor, "external_source_scope_required"),
    snapshotHash: source?.status === "captured"
      ? requiredText(source?.snapshotHash, "captured_external_source_snapshot_hash_required")
      : null,
  })).sort((left, right) => left.sourceId.localeCompare(right.sourceId));
  if (new Set(externalSources.map((source) => source.sourceId)).size !== externalSources.length) {
    fail("duplicate_external_source_id");
  }
  for (const source of externalSources.filter((entry) => entry.status === "captured")) {
    if (!/^[a-f0-9]{64}$/u.test(source.snapshotHash)) fail("invalid_external_source_snapshot_hash", source.sourceId);
  }
  const missingRequiredSourceIds = externalSources
    .filter((source) => source.status !== "captured")
    .map((source) => source.sourceId);
  const body = {
    schema: OFFICIAL_RULE_SOURCE_MANIFEST_SCHEMA,
    gameId: requiredText(input.gameId, "source_manifest_game_id_required"),
    capturedAt: new Date(input.capturedAt).toISOString(),
    pdfSources,
    faqSource: {
      sourceId: input.faqReceipt.sourceId,
      authority: input.faqReceipt.authority,
      semanticContentHash: input.faqReceipt.semanticContentHash,
      semanticByteLength: input.faqReceipt.semanticByteLength,
      semanticSerializationHash: hashStarcraftTmgContract(input.faqReceipt.semanticSerialization),
      entryCount: input.faqReceipt.entryIndex.length,
      precedence: input.faqReceipt.precedence,
      rulesEligible: false,
    },
    externalSources,
    sourceManifestStatus: missingRequiredSourceIds.length === 0 ? "captured" : "partial",
    canonicalClauseCount: null,
    blocks: [
      ...missingRequiredSourceIds.map((sourceId) => `required_source_missing:${sourceId}`),
      "core_192_structural_anchors_not_split_into_canonical_clauses",
      "p2p_pages_not_split_into_card_clauses",
      "canonical_clause_denominator_not_built",
      "independent_rules_review_not_passed",
    ],
    rulesEligible: false,
    trainingTruth: false,
  };
  return deepFreeze({ ...body, manifestHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialRuleSourceManifest(manifest) {
  if (!object(manifest) || manifest.schema !== OFFICIAL_RULE_SOURCE_MANIFEST_SCHEMA) {
    fail("invalid_official_rule_source_manifest_schema");
  }
  if (hashStarcraftTmgContract(manifestBody(manifest)) !== manifest.manifestHash) {
    fail("official_rule_source_manifest_hash_mismatch");
  }
  const missingRequiredSourceIds = manifest.externalSources
    .filter((source) => source.status !== "captured")
    .map((source) => source.sourceId)
    .sort((left, right) => left.localeCompare(right));
  const p2pAnchors = manifest.pdfSources
    .filter((source) => source.sourceKind === "p2p_card_sheets")
    .flatMap((source) => source.pageAnchors);
  const p2pPagesByKind = Object.fromEntries(P2P_PAGE_KINDS.map((kind) => [
    kind,
    p2pAnchors.filter((anchor) => anchor.pageKind === kind).length,
  ]));
  return deepFreeze({
    schema: "starcraft_tmg_official_rule_source_manifest_audit_v1",
    manifestHash: manifest.manifestHash,
    counts: {
      pdfSources: manifest.pdfSources.length,
      pdfPages: manifest.pdfSources.reduce((total, source) => total + source.pdfPages, 0),
      pdfBytes: manifest.pdfSources.reduce((total, source) => total + source.byteLength, 0),
      textLayerPages: manifest.pdfSources.reduce((total, source) => total + source.textLayerPageCount, 0),
      textLayerPageMismatches: manifest.pdfSources.filter((source) => source.textLayerPageCount !== source.pdfPages).length,
      p2pPageAnchors: p2pAnchors.length,
      p2pPagesByKind,
      faqEntries: manifest.faqSource.entryCount,
      missingRequiredSources: missingRequiredSourceIds.length,
    },
    missingRequiredSourceIds,
    sourceManifestStatus: manifest.sourceManifestStatus,
    rulesEligible: false,
    trainingTruth: false,
  });
}
