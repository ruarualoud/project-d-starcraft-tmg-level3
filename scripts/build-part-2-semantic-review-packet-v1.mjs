#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hashStarcraftTmgContract } from "../packages/authoritative-engine/referee-crypto-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const SOURCE_DIR = path.join(ROOT, "build", "source-intake", "official-rules");
const sourcePart = String(process.argv[2] || "2");
const expectedByPart = Object.freeze({
  "2": Object.freeze({ anchorCount: 14, candidateCount: 81 }),
  "3": Object.freeze({ anchorCount: 8, candidateCount: 52 }),
  "4": Object.freeze({ anchorCount: 6, candidateCount: 81 }),
  "5": Object.freeze({ anchorCount: 6, candidateCount: 137 }),
  "6": Object.freeze({ anchorCount: 2, candidateCount: 30 }),
  "7": Object.freeze({ anchorCount: 11, candidateCount: 118 }),
  "8": Object.freeze({ anchorCount: 38, candidateCount: 464 }),
  "9": Object.freeze({ anchorCount: 15, candidateCount: 156 }),
  "10": Object.freeze({ anchorCount: 7, candidateCount: 69 }),
  "11": Object.freeze({ anchorCount: 73, candidateCount: 351 }),
  "12": Object.freeze({ anchorCount: 12, candidateCount: 99 }),
});
const expected = expectedByPart[sourcePart];
assert.ok(expected, `unsupported semantic review source part: ${sourcePart}`);
const report = JSON.parse(await readFile(path.join(OUTPUT_DIR, "core-clause-candidate-denominator-report.json"), "utf8"));
const denominator = report.denominator;
const rawText = await readFile(path.join(SOURCE_DIR, "StarCraft-TMG_EN.raw.txt"), "utf8");
const rawTextHash = createHash("sha256").update(rawText, "utf8").digest("hex");
assert.equal(rawTextHash, denominator.extraction.rawTextHash, "review packet raw source drift");
const pages = rawText.split("\f").map((page) => page.split(/\r?\n/u));
const segmenter = new Intl.Segmenter("en", { granularity: "sentence" });

function includeSourceLine(line) {
  const compact = String(line || "").trim();
  return Boolean(compact)
    && !/^\d+(?: \d+)*$/u.test(compact)
    && !/^BACKTOTABLE OF CONTENTS$/iu.test(compact)
    && !/^[•\s]+$/u.test(compact);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function reconstructRegion(region) {
  const lines = [];
  const { start, endExclusive } = region.sourceSpan;
  for (let pdfPage = start.pdfPage; pdfPage <= endExclusive.pdfPage; pdfPage += 1) {
    const pageLines = pages[pdfPage - 1];
    const from = pdfPage === start.pdfPage ? start.lineOrdinal - 1 : 0;
    const to = pdfPage === endExclusive.pdfPage ? endExclusive.lineOrdinal - 1 : pageLines.length;
    for (let lineIndex = from; lineIndex < to; lineIndex += 1) {
      if (includeSourceLine(pageLines[lineIndex])) lines.push(pageLines[lineIndex].trim());
    }
  }
  return lines.join(" ").replace(/\s+/gu, " ").trim().normalize("NFC");
}

const sourceCandidates = new Map(denominator.clauseCandidates.map((candidate) => [candidate.clauseCandidateId, candidate]));
const anchorPackets = denominator.anchorRegions
  .filter((region) => region.sourcePart === sourcePart)
  .map((region) => {
    const text = reconstructRegion(region);
    assert.equal(sha256(Buffer.from(text, "utf8")), region.normalizedRegionHash, `region drift: ${region.anchorId}`);
    const segments = [...segmenter.segment(text)].map((entry) => entry.segment.trim()).filter(Boolean);
    assert.equal(segments.length, region.candidateClauseCount, `candidate count drift: ${region.anchorId}`);
    const candidates = segments.map((candidateText, index) => {
      const clauseCandidateId = region.candidateClauseIds[index];
      const candidate = sourceCandidates.get(clauseCandidateId);
      assert.ok(candidate, `candidate missing: ${clauseCandidateId}`);
      assert.equal(sha256(Buffer.from(candidateText, "utf8")), candidate.sourceTextHash, `candidate text drift: ${clauseCandidateId}`);
      return {
        clauseCandidateId,
        ordinal: index + 1,
        sourceTextHash: candidate.sourceTextHash,
        text: candidateText,
      };
    });
    return {
      anchorId: region.anchorId,
      sourceAnchorId: region.sourceAnchorId,
      anchorKind: region.anchorKind,
      normalizedRegionHash: region.normalizedRegionHash,
      regionStatus: region.regionStatus,
      candidates,
    };
  });

const body = {
  schema: `starcraft_tmg_part_${sourcePart}_semantic_review_packet_v1`,
  sourceContentHash: denominator.sourceSnapshot.contentHash,
  rawTextHash,
  anchorIndexHash: denominator.anchorIndexHash,
  candidateDenominatorHash: denominator.denominatorHash,
  sourcePart,
  anchorCount: anchorPackets.length,
  candidateCount: anchorPackets.reduce((total, anchor) => total + anchor.candidates.length, 0),
  containsCopyrightText: true,
  storageScope: "gitignored_build_evidence_only",
  anchorPackets,
  rulesEligible: false,
  trainingTruth: false,
};
assert.equal(body.anchorCount, expected.anchorCount);
assert.equal(body.candidateCount, expected.candidateCount);
const packet = { ...body, packetHash: hashStarcraftTmgContract(body) };
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR, `part-${sourcePart}-semantic-review-packet.json`), `${JSON.stringify(packet, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  schema: packet.schema,
  packetHash: packet.packetHash,
  anchorCount: packet.anchorCount,
  candidateCount: packet.candidateCount,
  storageScope: packet.storageScope,
  rulesEligible: false,
  trainingTruth: false,
}, null, 2));
