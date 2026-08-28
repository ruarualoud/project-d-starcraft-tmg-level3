import { createHash } from "node:crypto";

import {
  canonicalStarcraftTmgJson,
  hashStarcraftTmgContract,
} from "../authoritative-engine/referee-crypto-v1.mjs";

export const OFFICIAL_GAMEPLAY_FAQ_RECEIPT_SCHEMA = "starcraft_tmg_official_gameplay_faq_receipt_v1";

const EXPECTED_ENTRY_IDS = Object.freeze([
  "faq_9_41",
  "faq_9_42",
  "faq_9_43",
  "faq_9_44",
  "faq_9_45",
  "faq_9_46",
  "faq_9_47",
]);
const NORMATIVE_CANDIDATES = Object.freeze(["faq_9_42", "faq_9_43", "faq_9_46"]);
const ENTITY_MAP = Object.freeze({
  amp: "&",
  quot: "\"",
  apos: "'",
  "#039": "'",
  nbsp: " ",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  ndash: "–",
  mdash: "—",
});

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

function decodeEntities(value) {
  return value
    .replace(/&#x([0-9a-f]+);/giu, (_match, encoded) => String.fromCodePoint(Number.parseInt(encoded, 16)))
    .replace(/&#(\d+);/gu, (_match, encoded) => String.fromCodePoint(Number(encoded)))
    .replace(/&([a-z0-9#]+);/giu, (match, name) => ENTITY_MAP[String(name).toLowerCase()] ?? match);
}

function normalizeField(htmlFragment) {
  return decodeEntities(String(htmlFragment || "").replace(/<[^>]+>/gu, " "))
    .normalize("NFC")
    .replace(/\s+/gu, " ")
    .trim();
}

function extractGameplayEntries(html, categoryId) {
  const categoryPattern = new RegExp(
    `<div class="jsFaqCategory\\s+hidden\\s*" data-id="${categoryId}">([\\s\\S]*?)<div class="jsFaqCategory\\s+hidden\\s*" data-id="(?:${Number(categoryId) + 1})">`,
  );
  const category = String(html || "").match(categoryPattern)?.[1];
  if (!category) fail("gameplay_faq_category_not_found", categoryId);
  const itemPattern = new RegExp(
    `data-slide="faq_${categoryId}_(\\d+)">[\\s\\S]*?<div class="pr-48 relative font-semibold[^>]*>([\\s\\S]*?)<div class="absolute[\\s\\S]*?<div class="jsSlideItem[^>]*data-slide="faq_${categoryId}_\\1">([\\s\\S]*?)<\\/div>\\s*<\\/div>`,
    "g",
  );
  const entries = [...category.matchAll(itemPattern)].map((match) => ({
    answer: normalizeField(match[3]),
    id: `faq_${categoryId}_${match[1]}`,
    question: normalizeField(match[2]),
  }));
  const ids = entries.map((entry) => entry.id);
  if (new Set(ids).size !== ids.length) fail("duplicate_gameplay_faq_entry");
  if (ids.length !== EXPECTED_ENTRY_IDS.length
    || ids.some((id, index) => id !== EXPECTED_ENTRY_IDS[index])) {
    fail("gameplay_faq_entry_denominator_mismatch", ids.join(","));
  }
  return entries;
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function receiptBody(receipt) {
  const { receiptHash: _receiptHash, ...body } = receipt;
  return body;
}

export function createOfficialGameplayFaqReceipt(input = {}) {
  const html = requiredText(input.html, "gameplay_faq_html_required");
  const categoryId = requiredText(input.categoryId, "gameplay_faq_category_id_required");
  if (categoryId !== "9") fail("unsupported_gameplay_faq_category", categoryId);
  const entries = extractGameplayEntries(html, categoryId);
  const semanticPayload = canonicalStarcraftTmgJson(entries);
  const semanticBytes = Buffer.from(semanticPayload, "utf8");
  const sourceVersioning = input.sourceVersioning;
  if (!object(sourceVersioning)) fail("gameplay_faq_source_versioning_required");
  if (sourceVersioning.etag !== null || sourceVersioning.lastModified !== null) {
    fail("unexpected_gameplay_faq_http_version_marker");
  }
  const body = {
    schema: OFFICIAL_GAMEPLAY_FAQ_RECEIPT_SCHEMA,
    sourceId: "starcraft-tmg.official.gameplay-faq",
    authority: "official_mutable_supplement",
    sourceUrl: requiredText(input.sourceUrl, "gameplay_faq_source_url_required"),
    capturedAt: new Date(input.capturedAt).toISOString(),
    categoryId,
    semanticSerialization: {
      canonicalization: "RFC8785",
      entryOrder: "DOM",
      objectKeyOrder: ["answer", "id", "question"],
      unicodeNormalization: "NFC",
      whitespaceNormalization: "unicode_runs_to_u0020_trim",
      trailingNewline: false,
      entityDecoder: "starcraft_tmg_faq_entity_map_v1",
    },
    semanticContentHash: sha256(semanticBytes),
    semanticByteLength: semanticBytes.byteLength,
    retrieval: {
      rawHtmlHash: sha256(Buffer.from(html, "utf8")),
      rawHtmlByteLength: Buffer.byteLength(html, "utf8"),
      rawHtmlIsSemanticIdentity: false,
    },
    sourceVersioning: {
      etag: null,
      lastModified: null,
      cachePolicy: requiredText(sourceVersioning.cachePolicy, "gameplay_faq_cache_policy_required"),
      frozenBySemanticContentHash: true,
    },
    entryIndex: entries.map((entry, index) => ({
      entryId: entry.id,
      ordinal: index + 1,
      questionHash: sha256(Buffer.from(entry.question, "utf8")),
      answerHash: sha256(Buffer.from(entry.answer, "utf8")),
      questionCharacterCount: [...entry.question].length,
      answerCharacterCount: [...entry.answer].length,
      initialDisposition: NORMATIVE_CANDIDATES.includes(entry.id) ? "review_required" : "display_only",
    })),
    normativeCandidateEntryIds: [...NORMATIVE_CANDIDATES],
    displayOnlyEntryIds: EXPECTED_ENTRY_IDS.filter((entryId) => !NORMATIVE_CANDIDATES.includes(entryId)),
    precedence: "supplemental_review_only_pdf_remains_primary",
    rulesEligible: false,
    blocks: [
      "faq_to_pdf_clause_reconciliation_not_reviewed",
      "faq_has_no_semantic_version_or_errata_status",
      "normative_candidates_not_mapped_to_rule_atoms",
    ],
    trainingTruth: false,
  };
  return deepFreeze({ ...body, receiptHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialGameplayFaqReceipt(receipt) {
  if (!object(receipt) || receipt.schema !== OFFICIAL_GAMEPLAY_FAQ_RECEIPT_SCHEMA) {
    fail("invalid_gameplay_faq_receipt_schema");
  }
  if (hashStarcraftTmgContract(receiptBody(receipt)) !== receipt.receiptHash) {
    fail("gameplay_faq_receipt_hash_mismatch");
  }
  const ids = receipt.entryIndex?.map((entry) => entry.entryId) || [];
  if (ids.length !== EXPECTED_ENTRY_IDS.length
    || ids.some((id, index) => id !== EXPECTED_ENTRY_IDS[index])) {
    fail("gameplay_faq_entry_denominator_mismatch");
  }
  if (receipt.semanticContentHash !== "e894f5f0a7da88776df7e399d2156acf69cc40284c1f231907f28dd990b0cd92"
    || receipt.semanticByteLength !== 2176) fail("gameplay_faq_semantic_snapshot_mismatch");
  return deepFreeze({
    schema: "starcraft_tmg_official_gameplay_faq_audit_v1",
    receiptHash: receipt.receiptHash,
    semanticContentHash: receipt.semanticContentHash,
    entryCount: ids.length,
    normativeCandidateCount: receipt.normativeCandidateEntryIds.length,
    displayOnlyCount: receipt.displayOnlyEntryIds.length,
    rulesEligible: false,
    trainingTruth: false,
  });
}
