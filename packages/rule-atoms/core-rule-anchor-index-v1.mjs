import { createHash } from "node:crypto";

import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";

export const CORE_RULE_ANCHOR_INDEX_SCHEMA = "starcraft_tmg_core_rule_anchor_index_v1";

export const CORE_GLOSSARY_ANCHORS_V1 = Object.freeze([
  "ACCESS POINT",
  "ACTIVE PLAYER",
  "ANTI-EVADE (X)",
  "ARMY SLOT",
  "AVAILABLE SUPPLY",
  "BLOCKING TERRAIN",
  "BUFF [Characteristic] (X)",
  "BULKY",
  "BURROWED",
  "BURST FIRE Y” (X)",
  "COMBAT TAGS",
  "CONCENTRATED FIRE (X)",
  "CONTROLLING PLAYER",
  "CRITICAL HIT (X)",
  "CURRENT SUPPLY VALUE",
  "DEBUFF [Characteristic] (X)",
  "DISPLACEMENT",
  "DODGE (X)",
  "EFFECTIVE SIZE",
  "ELEVATION LEVEL",
  "ENEMY",
  "ENGAGED",
  "ENGAGEMENT RANGE",
  "ENTRY EDGE",
  "FACTION TAGS",
  "FIGHTING RANK",
  "FIRST PLAYER MARKER",
  "FLYING",
  "FRIENDLY",
  "GRASS",
  "GROUND LEVEL",
  "HEAL (X)",
  "HIDDEN",
  "HIGH GROUND",
  "HITS X (Y)",
  "IMPACT (X) Y",
  "IMPASSABLE TERRAIN",
  "INDIRECT FIRE",
  "INSTANT",
  "LEADING MODEL",
  "LOCKED IN (X)",
  "LONG RANGE (X)",
  "MID GROUND",
  "MISSION MARKERS",
  "MODIFIER",
  "NON-LETHAL DAMAGE (X)",
  "ON CREEP",
  "PIERCE [TAG] X",
  "PINPOINT",
  "PLACE (X)",
  "PRECISION (X)",
  "READY",
  "REPEATABLE",
  "RESERVES",
  "RESPAWN (X)",
  "SHIELDED",
  "SIDEARM",
  "SIEGE MODE",
  "SPECIAL ABILITY",
  "SPECIALIST",
  "SPILLOVER",
  "STATIONARY",
  "STATUS",
  "STAY IN PLAY",
  "SUPPLY VALUE",
  "SUPPORTING RANK",
  "TACTICAL MASS",
  "TOUGH (X)",
  "UNENGAGED",
  "VISIBLE",
  "WHOLLY WITHIN",
  "WITHIN",
  "ZONE OF INFLUENCE",
]);

const EXPECTED_NUMBERED_BY_PART = Object.freeze({
  "2": 14,
  "3": 8,
  "4": 6,
  "5": 6,
  "6": 2,
  "7": 11,
  "8": 38,
  "9": 15,
  "10": 7,
  "12": 12,
});

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function requiredText(value, code) {
  const normalized = String(value || "").trim();
  if (!normalized) fail(code);
  return normalized;
}

function bytes(value, code) {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  fail(code);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function splitPages(rawText, expectedPages) {
  const pages = String(rawText || "").split("\f");
  if (pages.at(-1) === "") pages.pop();
  if (pages.length !== expectedPages) {
    fail("core_rulebook_raw_text_page_count_mismatch", `${pages.length}!=${expectedPages}`);
  }
  return pages;
}

function numberedAnchorKind(part) {
  return part === "12" ? "quick_reference_section" : "numbered_core_section";
}

function numberedAnchors(pages, sourceSnapshotId, sourceContentHash) {
  const anchors = [];
  const ranges = [[30, 83], [94, 115]];
  for (const [from, to] of ranges) {
    for (let pdfPage = from; pdfPage <= to; pdfPage += 1) {
      const lines = pages[pdfPage - 1].split(/\r?\n/u);
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
        const heading = lines[lineIndex].trim();
        const match = heading.match(/^(\d+\.\d+(?:\.\d+)?)([A-Z].*)$/u);
        if (!match) continue;
        const sourceAnchorId = match[1];
        const part = sourceAnchorId.split(".")[0];
        if (!Object.hasOwn(EXPECTED_NUMBERED_BY_PART, part)) continue;
        anchors.push({
          anchorId: `core:numbered:${sourceAnchorId}`,
          sourceAnchorId,
          anchorKind: numberedAnchorKind(part),
          sourceSnapshotId,
          sourceContentHash,
          locator: {
            pdfPage,
            printedPage: pdfPage - 2,
            lineOrdinal: lineIndex + 1,
          },
          headingHash: sha256(Buffer.from(heading, "utf8")),
          titleHash: sha256(Buffer.from(match[2], "utf8")),
          disposition: "review_required",
        });
      }
    }
  }
  const counts = Object.fromEntries(Object.keys(EXPECTED_NUMBERED_BY_PART).map((part) => [
    part,
    anchors.filter((anchor) => anchor.sourceAnchorId.startsWith(`${part}.`)).length,
  ]));
  for (const [part, expected] of Object.entries(EXPECTED_NUMBERED_BY_PART)) {
    if (counts[part] !== expected) fail("numbered_core_anchor_denominator_mismatch", `${part}:${counts[part]}!=${expected}`);
  }
  return anchors;
}

function glossaryAnchors(pages, sourceSnapshotId, sourceContentHash) {
  const lineIndex = new Map();
  for (let pdfPage = 84; pdfPage <= 93; pdfPage += 1) {
    const lines = pages[pdfPage - 1].split(/\r?\n/u);
    for (let ordinal = 0; ordinal < lines.length; ordinal += 1) {
      const heading = lines[ordinal].trim();
      if (!CORE_GLOSSARY_ANCHORS_V1.includes(heading)) continue;
      if (lineIndex.has(heading)) fail("duplicate_glossary_anchor_heading", heading);
      lineIndex.set(heading, { pdfPage, lineOrdinal: ordinal + 1, heading });
    }
  }
  const missing = CORE_GLOSSARY_ANCHORS_V1.filter((heading) => !lineIndex.has(heading));
  if (missing.length > 0) fail("glossary_anchor_denominator_mismatch", missing.join(","));
  return CORE_GLOSSARY_ANCHORS_V1.map((sourceAnchorId, index) => {
    const location = lineIndex.get(sourceAnchorId);
    return {
      anchorId: `core:glossary:${String(index + 1).padStart(3, "0")}:${sha256(Buffer.from(sourceAnchorId, "utf8")).slice(0, 12)}`,
      sourceAnchorId,
      anchorKind: "glossary_definition",
      sourceSnapshotId,
      sourceContentHash,
      locator: {
        pdfPage: location.pdfPage,
        printedPage: location.pdfPage - 2,
        lineOrdinal: location.lineOrdinal,
      },
      headingHash: sha256(Buffer.from(location.heading, "utf8")),
      titleHash: sha256(Buffer.from(sourceAnchorId, "utf8")),
      disposition: "review_required",
    };
  });
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function indexBody(index) {
  const { anchorIndexHash: _anchorIndexHash, ...body } = index;
  return body;
}

export function createCoreRuleAnchorIndex(input = {}) {
  const pdf = bytes(input.pdfBytes, "core_rulebook_pdf_required");
  const expectedContentHash = requiredText(input.expectedContentHash, "core_rulebook_expected_hash_required").toLowerCase();
  if (sha256(pdf) !== expectedContentHash) fail("core_rulebook_pdf_hash_mismatch");
  const expectedPdfPages = Number(input.expectedPdfPages);
  if (expectedPdfPages !== 128) fail("core_rulebook_pdf_page_denominator_mismatch");
  const pages = splitPages(input.rawText, expectedPdfPages);
  const sourceSnapshotId = requiredText(input.sourceSnapshotId, "core_rulebook_snapshot_id_required");
  const numbered = numberedAnchors(pages, sourceSnapshotId, expectedContentHash);
  const glossary = glossaryAnchors(pages, sourceSnapshotId, expectedContentHash);
  const anchors = [
    ...numbered.filter((anchor) => anchor.anchorKind === "numbered_core_section"),
    ...glossary,
    ...numbered.filter((anchor) => anchor.anchorKind === "quick_reference_section"),
  ];
  if (anchors.length !== 192) fail("core_rule_anchor_denominator_mismatch", String(anchors.length));
  if (new Set(anchors.map((anchor) => anchor.anchorId)).size !== anchors.length) fail("duplicate_core_rule_anchor_id");
  const body = {
    schema: CORE_RULE_ANCHOR_INDEX_SCHEMA,
    sourceSnapshot: {
      sourceSnapshotId,
      contentHash: expectedContentHash,
      pdfPages: expectedPdfPages,
    },
    extractor: {
      id: requiredText(input.extractor?.id, "core_anchor_extractor_id_required"),
      version: requiredText(input.extractor?.version, "core_anchor_extractor_version_required"),
      rawTextHash: sha256(Buffer.from(String(input.rawText), "utf8")),
    },
    anchors,
    sourceAnchorCount: 192,
    canonicalClauseCount: null,
    rulesEligible: false,
    blocks: [
      "anchors_not_split_into_normative_clauses",
      "tables_diagrams_notes_and_examples_not_semantically_classified",
      "independent_anchor_and_clause_review_not_passed",
    ],
    trainingTruth: false,
  };
  return deepFreeze({ ...body, anchorIndexHash: hashStarcraftTmgContract(body) });
}

export function verifyCoreRuleAnchorIndex(index) {
  if (!index || index.schema !== CORE_RULE_ANCHOR_INDEX_SCHEMA) fail("invalid_core_rule_anchor_index_schema");
  if (hashStarcraftTmgContract(indexBody(index)) !== index.anchorIndexHash) {
    fail("core_rule_anchor_index_hash_mismatch");
  }
  const ids = index.anchors.map((anchor) => anchor.anchorId);
  const unlocatedAnchors = index.anchors.filter((anchor) => !Number.isInteger(anchor.locator?.pdfPage));
  const numberedByPart = Object.fromEntries(Object.keys(EXPECTED_NUMBERED_BY_PART).map((part) => [
    part,
    index.anchors.filter((anchor) => anchor.sourceAnchorId.match(new RegExp(`^${part}\\.`))).length,
  ]));
  return deepFreeze({
    schema: "starcraft_tmg_core_rule_anchor_index_audit_v1",
    anchorIndexHash: index.anchorIndexHash,
    counts: {
      anchors: index.anchors.length,
      byKind: {
        numbered_core_section: index.anchors.filter((anchor) => anchor.anchorKind === "numbered_core_section").length,
        glossary_definition: index.anchors.filter((anchor) => anchor.anchorKind === "glossary_definition").length,
        quick_reference_section: index.anchors.filter((anchor) => anchor.anchorKind === "quick_reference_section").length,
      },
      numberedByPart,
      duplicateAnchorIds: ids.length - new Set(ids).size,
      unlocatedAnchors: unlocatedAnchors.length,
    },
    canonicalClauseCount: null,
    rulesEligible: false,
    trainingTruth: false,
  });
}
