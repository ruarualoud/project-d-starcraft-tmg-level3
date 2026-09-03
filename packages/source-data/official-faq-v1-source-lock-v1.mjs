import { createHash } from "node:crypto";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

export const OFFICIAL_FAQ_V1_SOURCE_LOCK_SCHEMA =
  "starcraft_tmg_official_faq_v1_source_lock_v1";
export const OFFICIAL_FAQ_V1_PDF_HASH =
  "eeeffb7a3a11f7616116bcd0e8fd5a437cd50c47c2454a3c865e32f34783e62c";
export const OFFICIAL_FAQ_V1_RAW_TEXT_HASH =
  "af19f323144c323756cb9213e86e6ce96e092a4f24964d098db72148647820e9";
export const OFFICIAL_FAQ_V1_DOWNLOAD_INVENTORY_HASH =
  "31d6310a99f9fb7e8bd611e59541b188f3fa9c72347ef64827c06dbf7861651b";
export const OFFICIAL_FAQ_V1_SEMANTIC_INDEX_HASH =
  "a79d27c5fe740ab2f199aba93e00cdf84b3f2d5b70b3c4563a9ec19c906ae90f";

const FAQ_URL =
  "https://starcraft-tmg.com/files/downloads/StarCraft-TMG-FAQ_EN.pdf";
const DOWNLOADS_URL = "https://starcraft-tmg.com/downloads";
const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const SECTION_ROWS = Object.freeze([
  Object.freeze({ id: "units_characteristics", label: "Units & Characteristics", count: 4 }),
  Object.freeze({ id: "measuring_movement", label: "Measuring & Movement", count: 10 }),
  Object.freeze({ id: "battlefield", label: "The Battlefield", count: 5 }),
  Object.freeze({ id: "deployment_entry_edges_zoi", label: "Deployment, Entry Edges, & Zone of Influence", count: 8 }),
  Object.freeze({ id: "attack_sequence", label: "Attack Sequence", count: 6 }),
  Object.freeze({ id: "abilities_tactics_cards", label: "Abilities & Tactics Cards", count: 19 }),
  Object.freeze({ id: "keywords", label: "Keywords", count: 12 }),
  Object.freeze({ id: "templates_spillover", label: "Templates & Spillover", count: 4 }),
]);

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function bytes(value, code) {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  if (typeof value === "string") return Buffer.from(value, "utf8");
  fail(code);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizedLine(value) {
  return String(value || "").replaceAll("\f", " ").replaceAll(/\s+/gu, " ").trim();
}

function sectionForLine(line) {
  if (/^Units & Characteristics$/iu.test(line)) return "units_characteristics";
  if (/^Measuring & Movement$/iu.test(line)) return "measuring_movement";
  if (/^The Battlefield$/iu.test(line)) return "battlefield";
  if (/^Deployment, Entry Edges,/iu.test(line)) return "deployment_entry_edges_zoi";
  if (/^Attack Sequence$/iu.test(line)) return "attack_sequence";
  if (/^Abilities & Tactics Cards$/iu.test(line)) return "abilities_tactics_cards";
  if (/^Keywords$/iu.test(line)) return "keywords";
  if (/^Templates & Spillover$/iu.test(line)) return "templates_spillover";
  return null;
}

function entryIndexFromRawText(rawText) {
  const entries = [];
  let section = null;
  let current = null;
  let mode = null;
  function finish() {
    if (!current) return;
    const question = normalizedLine(current.question.join(" "));
    const answer = normalizedLine(current.answer.join(" "));
    if (!question || !answer || !section) fail("OFFICIAL_FAQ_V1_ENTRY_INVALID");
    entries.push({
      entryId: `faq-v1:${String(entries.length + 1).padStart(2, "0")}`,
      section: current.section,
      questionHash: sha256(question),
      answerHash: sha256(answer),
    });
    current = null;
    mode = null;
  }
  for (const rawLine of String(rawText || "").split(/\r?\n/gu)) {
    const line = normalizedLine(rawLine);
    if (!line) continue;
    if (/^A Special Thank You/iu.test(line)) {
      finish();
      break;
    }
    const nextSection = sectionForLine(line);
    if (nextSection) {
      finish();
      section = nextSection;
      continue;
    }
    if (!section) continue;
    if (/^Q:/u.test(line)) {
      finish();
      current = { section, question: [line.slice(2)], answer: [] };
      mode = "question";
      continue;
    }
    if (/^A:/u.test(line) && current) {
      mode = "answer";
      current.answer.push(line.slice(2));
      continue;
    }
    if (!current || /^(?:BACKTOTABLE OF CONTENTS|© 2026|Manufactured in|of Blizzard|by, and used under|[2-5])$/iu.test(line)) continue;
    current[mode === "answer" ? "answer" : "question"].push(line);
  }
  finish();
  return entries;
}

function pdfUrlsFromDownloadsHtml(html) {
  return [...new Set([...String(html || "").matchAll(
    /https:\/\/starcraft-tmg\.com\/files\/downloads\/[^"?\s]+\.pdf/gu,
  )].map((match) => match[0]))].sort();
}

function lockBody(input) {
  const pdf = bytes(input.pdfBytes, "OFFICIAL_FAQ_V1_PDF_BYTES_REQUIRED");
  const rawText = bytes(input.rawText, "OFFICIAL_FAQ_V1_RAW_TEXT_REQUIRED");
  const downloadsHtml = bytes(input.downloadsHtml, "OFFICIAL_FAQ_V1_DOWNLOADS_HTML_REQUIRED");
  if (sha256(pdf) !== OFFICIAL_FAQ_V1_PDF_HASH || pdf.length !== 333711) {
    fail("OFFICIAL_FAQ_V1_PDF_IDENTITY_MISMATCH");
  }
  if (sha256(rawText) !== OFFICIAL_FAQ_V1_RAW_TEXT_HASH) {
    fail("OFFICIAL_FAQ_V1_RAW_TEXT_IDENTITY_MISMATCH");
  }
  const entryIndex = entryIndexFromRawText(rawText.toString("utf8"));
  const sectionCounts = Object.fromEntries(SECTION_ROWS.map((section) => [
    section.id,
    entryIndex.filter((entry) => entry.section === section.id).length,
  ]));
  if (entryIndex.length !== 68
    || SECTION_ROWS.some((section) => sectionCounts[section.id] !== section.count)
    || hashStarcraftTmgContract(entryIndex) !== OFFICIAL_FAQ_V1_SEMANTIC_INDEX_HASH) {
    fail("OFFICIAL_FAQ_V1_SEMANTIC_DENOMINATOR_MISMATCH");
  }
  const pdfUrls = pdfUrlsFromDownloadsHtml(downloadsHtml.toString("utf8"));
  if (pdfUrls.length !== 24
    || !pdfUrls.includes(FAQ_URL)
    || hashStarcraftTmgContract(pdfUrls) !== OFFICIAL_FAQ_V1_DOWNLOAD_INVENTORY_HASH) {
    fail("OFFICIAL_FAQ_V1_DOWNLOAD_INVENTORY_MISMATCH");
  }
  return {
    schema: OFFICIAL_FAQ_V1_SOURCE_LOCK_SCHEMA,
    gameId: "starcraft-tmg",
    captureId: "official-faq-v1-2026-09-03",
    capturedAt: "2026-09-03T06:14:08.000Z",
    source: {
      sourceId: "official-faq-v1-en",
      requestedUrl: FAQ_URL,
      finalUrl: FAQ_URL,
      publisherDomain: "starcraft-tmg.com",
      documentTitle: "FAQ V1.0",
      contentType: "application/pdf",
      byteLength: pdf.length,
      byteHash: OFFICIAL_FAQ_V1_PDF_HASH,
      etag: "\"6a96e50b-5178f\"",
      lastModified: "Tue, 01 Sep 2026 14:45:31 GMT",
      pages: 5,
      pdfVersion: "1.5",
    },
    downloadsInventory: {
      sourceUrl: DOWNLOADS_URL,
      pdfLinkCount: pdfUrls.length,
      pdfUrlIndexHash: OFFICIAL_FAQ_V1_DOWNLOAD_INVENTORY_HASH,
      faqListed: true,
    },
    semanticIndex: {
      extractor: "pdftotext-raw",
      extractorVersionObserved: "26.04.0",
      derivedRawTextHash: OFFICIAL_FAQ_V1_RAW_TEXT_HASH,
      entryCount: entryIndex.length,
      sectionCounts,
      entryIndex,
      entryIndexHash: OFFICIAL_FAQ_V1_SEMANTIC_INDEX_HASH,
      rawTextIsRulesAuthority: false,
    },
    precedence: "faq_clarification_requires_entry_review_core_and_product_sources_retained",
    priorSourceLock: {
      lockHash: "1adbdb652fafc09d01887981a3ae86f69e65e1f1480d804156a8da1d4d1757a1",
      mutationAllowed: false,
      historicalRoomDisplayRetained: true,
      historicalReplayRetained: true,
    },
    sourceUse: {
      publicPublisherUrl: true,
      capturedForRulesVerification: true,
      redistributionLicenseDeterminedByProject: false,
      independentThirdPartyRightsReviewCompleted: false,
    },
    policy: {
      automaticRefreshAllowed: false,
      repositoryFallbackAllowed: false,
      silentSourceReplacementAllowed: false,
      exactEntryReconciliationRequired: true,
      crossTimeReplayRequired: true,
    },
    rulesEligible: false,
    productionRoomEligible: false,
    trainingTruth: false,
  };
}

export function createOfficialFaqV1SourceLockV1(input = {}) {
  const body = lockBody(input);
  return freeze({ ...body, lockHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialFaqV1SourceLockV1(lock, input = {}) {
  if (!object(lock) || lock.schema !== OFFICIAL_FAQ_V1_SOURCE_LOCK_SCHEMA
    || !HASH_PATTERN.test(String(lock.lockHash || ""))) {
    fail("OFFICIAL_FAQ_V1_SOURCE_LOCK_INVALID");
  }
  const expected = createOfficialFaqV1SourceLockV1(input);
  if (hashStarcraftTmgContract(lock) !== hashStarcraftTmgContract(expected)) {
    fail("OFFICIAL_FAQ_V1_SOURCE_LOCK_MISMATCH");
  }
  return true;
}

export function parseOfficialFaqV1SemanticIndexV1(rawText) {
  return freeze(entryIndexFromRawText(rawText));
}
