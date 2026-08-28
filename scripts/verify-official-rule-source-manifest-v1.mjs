#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createOfficialGameplayFaqReceipt } from "../packages/rule-atoms/official-gameplay-faq-source-v1.mjs";
import {
  verifyCommandCenterSnapshot,
  verifyRulesNewsIndexReceipt,
} from "../packages/rule-atoms/official-live-source-snapshots-v1.mjs";
import {
  createOfficialRuleSourceManifest,
  verifyOfficialRuleSourceManifest,
} from "../packages/rule-atoms/official-rule-source-manifest-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const SOURCE_DIR = path.join(ROOT, "build", "source-intake", "official-rules");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");

async function pdfSource(spec) {
  return {
    ...spec,
    pdfBytes: await readFile(path.join(SOURCE_DIR, spec.filename)),
    extractedText: await readFile(path.join(SOURCE_DIR, spec.filename.replace(/\.pdf$/u, ".txt")), "utf8"),
  };
}

const pdfSources = await Promise.all([
  pdfSource({
    sourceId: "core-rules-en",
    sourceKind: "core_rulebook",
    filename: "StarCraft-TMG_EN.pdf",
    sourceUrl: "https://starcraft-tmg.com/files/downloads/StarCraft-TMG_EN.pdf",
    fileVersion: null,
    expectedContentHash: "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54",
    expectedByteLength: 15_688_406,
    expectedPdfPages: 128,
    structuralAnchorPlan: { expectedAnchors: 192, status: "materialized_verified" },
  }),
  pdfSource({
    sourceId: "p2p-protoss-en",
    sourceKind: "p2p_card_sheets",
    filename: "StarCraft-Protoss-P2P-Card-Sheets-A4_EN.pdf",
    sourceUrl: "https://starcraft-tmg.com/files/downloads/StarCraft-Protoss-P2P-Card-Sheets-A4_EN.pdf",
    fileVersion: "May 2026 v1.0",
    expectedContentHash: "4e8547b2df8d545df3d0ebb7d7821521a888dc0437d6f4dde21d82145337a212",
    expectedByteLength: 3_233_470,
    expectedPdfPages: 14,
    pageRoles: [{ from: 1, to: 7, kind: "unit_card_sheet" }, { from: 8, to: 10, kind: "faction_tactical_creep_sheet" }, { from: 11, to: 14, kind: "mission_deployment_sheet" }],
  }),
  pdfSource({
    sourceId: "p2p-terran-en",
    sourceKind: "p2p_card_sheets",
    filename: "StarCraft-Terran-P2P-Card-Sheets-A4_EN.pdf",
    sourceUrl: "https://starcraft-tmg.com/files/downloads/StarCraft-Terran-P2P-Card-Sheets-A4_EN.pdf",
    fileVersion: "May 2026 v1.0",
    expectedContentHash: "afa3f229db61444d0673dea35e31772530a4c39dadaa0e281ba1bae0d271109c",
    expectedByteLength: 2_609_994,
    expectedPdfPages: 14,
    pageRoles: [{ from: 1, to: 7, kind: "unit_card_sheet" }, { from: 8, to: 10, kind: "faction_tactical_creep_sheet" }, { from: 11, to: 14, kind: "mission_deployment_sheet" }],
  }),
  pdfSource({
    sourceId: "p2p-zerg-en",
    sourceKind: "p2p_card_sheets",
    filename: "StarCraft-Zerg-P2P-Card-Sheets-A4_EN.pdf",
    sourceUrl: "https://starcraft-tmg.com/files/downloads/StarCraft-Zerg-P2P-Card-Sheets-A4_EN.pdf",
    fileVersion: "May 2026 v1.0",
    expectedContentHash: "6810f46ee422ac5d8f3cc169c3eda3ccb9551f01ab71a1f7e4ac8c266817b364",
    expectedByteLength: 3_465_781,
    expectedPdfPages: 20,
    pageRoles: [{ from: 1, to: 12, kind: "unit_card_sheet" }, { from: 13, to: 16, kind: "faction_tactical_creep_sheet" }, { from: 17, to: 20, kind: "mission_deployment_sheet" }],
  }),
]);

const faqHtml = await readFile(path.join(SOURCE_DIR, "starcraft-tmg-faq-2026-08-24.html"), "utf8");
const faqReceipt = createOfficialGameplayFaqReceipt({
  html: faqHtml,
  sourceUrl: "https://starcraft-tmg.com/faq",
  capturedAt: "2026-08-24T00:00:00.000Z",
  categoryId: "9",
  sourceVersioning: { etag: null, lastModified: null, cachePolicy: "no-cache, private" },
});
const liveSourceReport = JSON.parse(await readFile(path.join(OUTPUT_DIR, "official-live-source-snapshots-report.json"), "utf8"));
verifyCommandCenterSnapshot(liveSourceReport.commandSnapshot);
verifyRulesNewsIndexReceipt(liveSourceReport.newsReceipt);

const baseInput = {
  gameId: "starcraft-tmg",
  capturedAt: "2026-08-24T00:00:00.000Z",
  pdfSources,
  faqReceipt,
  externalSources: [
    { sourceId: "official-command-center", status: "captured", requiredFor: "current_card_and_scenario_precedence", snapshotHash: liveSourceReport.commandSnapshot.snapshotHash },
    { sourceId: "official-rules-news-index", status: "captured", requiredFor: "source_drift_monitoring", snapshotHash: liveSourceReport.newsReceipt.receiptHash },
  ],
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

const manifest = createOfficialRuleSourceManifest(baseInput);
const verification = verifyOfficialRuleSourceManifest(manifest);

check("four_official_rule_pdfs_are_content_frozen", () => {
  assert.equal(manifest.pdfSources.length, 4);
  assert.equal(verification.counts.pdfSources, 4);
  assert.equal(verification.counts.pdfPages, 176);
  assert.equal(verification.counts.pdfBytes, 24_997_651);
});

check("all_pdf_text_layers_cover_their_page_denominator", () => {
  assert.equal(verification.counts.textLayerPages, 176);
  assert.equal(verification.counts.textLayerPageMismatches, 0);
});

check("p2p_page_anchor_denominator_is_exact", () => {
  assert.equal(verification.counts.p2pPageAnchors, 48);
  assert.deepEqual(verification.counts.p2pPagesByKind, {
    unit_card_sheet: 26,
    faction_tactical_creep_sheet: 10,
    mission_deployment_sheet: 12,
  });
});

check("core_192_is_a_materialized_structural_anchor_plan", () => {
  const core = manifest.pdfSources.find((source) => source.sourceId === "core-rules-en");
  assert.deepEqual(core.structuralAnchorPlan, { expectedAnchors: 192, status: "materialized_verified" });
  assert.equal(manifest.canonicalClauseCount, null);
});

check("faq_semantic_snapshot_is_bound", () => {
  assert.equal(manifest.faqSource.semanticContentHash, "e894f5f0a7da88776df7e399d2156acf69cc40284c1f231907f28dd990b0cd92");
  assert.equal(manifest.faqSource.entryCount, 7);
});

check("app_and_news_snapshots_are_receipt_bound", () => {
  assert.deepEqual(verification.missingRequiredSourceIds, []);
  assert.equal(manifest.sourceManifestStatus, "captured");
  assert.ok(manifest.externalSources.every((source) => /^[a-f0-9]{64}$/u.test(source.snapshotHash)));
});

check("raw_pdf_and_faq_text_are_not_embedded", () => {
  const serialized = JSON.stringify(manifest);
  assert.equal(serialized.includes("pdfBytes"), false);
  assert.equal(serialized.includes("extractedText"), false);
  assert.equal(serialized.includes("question"), false);
  assert.equal(serialized.includes("answer"), false);
});

check("source_manifest_grants_no_rule_or_training_authority", () => {
  assert.equal(manifest.rulesEligible, false);
  assert.equal(manifest.trainingTruth, false);
  assert.ok(manifest.blocks.includes("canonical_clause_denominator_not_built"));
});

check("manifest_is_order_independent", () => {
  assert.equal(createOfficialRuleSourceManifest({
    ...baseInput,
    pdfSources: [...pdfSources].reverse(),
    externalSources: [...baseInput.externalSources].reverse(),
  }).manifestHash, manifest.manifestHash);
});

check("source_byte_tamper_fails_closed", () => {
  const tamperedSources = [...pdfSources];
  tamperedSources[0] = { ...tamperedSources[0], pdfBytes: Buffer.concat([tamperedSources[0].pdfBytes, Buffer.from("x")]) };
  assert.throws(() => createOfficialRuleSourceManifest({ ...baseInput, pdfSources: tamperedSources }), /official_source_pdf_hash_mismatch/);
});

const failures = acceptance.filter((item) => !item.passed);
const report = {
  schema: "starcraft_tmg_official_rule_source_manifest_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length - failures.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures,
  manifest,
  verification,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR, "official-rule-source-manifest-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  failures,
  manifestHash: manifest.manifestHash,
  counts: verification.counts,
  missingRequiredSourceIds: verification.missingRequiredSourceIds,
  rulesEligible: false,
  trainingTruth: false,
}, null, 2));
if (failures.length > 0) process.exitCode = 1;
