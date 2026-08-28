#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createCommandCenterSnapshot,
  createRulesNewsIndexReceipt,
  verifyCommandCenterSnapshot,
  verifyRulesNewsIndexReceipt,
} from "../packages/rule-atoms/official-live-source-snapshots-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const SOURCE_DIR = path.join(ROOT, "build", "source-intake", "official-rules");
const COMMAND_DIR = path.join(SOURCE_DIR, "command-center");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");

async function bytes(relativePath) {
  return readFile(path.join(COMMAND_DIR, relativePath));
}

const firestorePayloads = Object.fromEntries(await Promise.all([
  "army_units",
  "tactical_cards",
  "faction_cards",
  "rules_sections",
].map(async (collectionId) => [
  collectionId,
  JSON.parse(await readFile(path.join(COMMAND_DIR, "firestore", `${collectionId}.json`), "utf8")),
])));

const commandInput = {
  capturedAt: "2026-08-24T00:00:00.000Z",
  sourceUrl: "https://sc.starcraft-tmg.com/",
  projectId: "starcrafttmgbeta",
  databaseId: "starcrafttmgbeta",
  shellHtml: await readFile(path.join(SOURCE_DIR, "starcraft-tmg-command-center-2026-08-24.html"), "utf8"),
  firebaseInitJs: await bytes("modules/firebase-init.js"),
  staticAssets: [
    { assetId: "script.js", content: await bytes("script.js") },
    { assetId: "modules/firebase-init.js", content: await bytes("modules/firebase-init.js") },
    { assetId: "modules/factions.js", content: await bytes("modules/factions.js") },
    { assetId: "modules/rules.js", content: await bytes("modules/rules.js") },
    { assetId: "modules/army_builder.js", content: await bytes("modules/army_builder.js") },
    { assetId: "modules/rules_checker.js", content: await bytes("modules/rules_checker.js") },
    { assetId: "modules/mission_cards.js", content: await bytes("modules/mission_cards.js") },
    { assetId: "modules/deployment_maps.js", content: await bytes("modules/deployment_maps.js") },
  ],
  firestorePayloads,
  versionsPayload: JSON.parse(await readFile(path.join(COMMAND_DIR, "firestore", "system_metadata_versions.json"), "utf8")),
};

const newsInput = {
  capturedAt: "2026-08-24T00:00:00.000Z",
  sourceUrl: "https://starcraft-tmg.com/news/rules",
  html: await readFile(path.join(SOURCE_DIR, "starcraft-tmg-rules-news-2026-08-24.html"), "utf8"),
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

const commandSnapshot = createCommandCenterSnapshot(commandInput);
const commandAudit = verifyCommandCenterSnapshot(commandSnapshot);
const newsReceipt = createRulesNewsIndexReceipt(newsInput);
const newsAudit = verifyRulesNewsIndexReceipt(newsReceipt);

check("command_center_shell_and_assets_are_content_bound", () => {
  assert.equal(commandSnapshot.productVersion, "BETA v1.4");
  assert.equal(commandSnapshot.staticAssets.length, 8);
  assert.match(commandSnapshot.shellHash, /^[a-f0-9]{64}$/);
  assert.ok(commandSnapshot.staticAssets.every((asset) => /^[a-f0-9]{64}$/.test(asset.contentHash)));
});

check("firestore_collection_denominator_is_complete", () => {
  assert.deepEqual(commandAudit.counts.byCollection, {
    army_units: 26,
    faction_cards: 191,
    rules_sections: 15,
    tactical_cards: 37,
  });
  assert.equal(commandAudit.counts.documents, 269);
  assert.equal(commandAudit.counts.paginatedCollections, 0);
});

check("official_and_community_cards_are_separated", () => {
  assert.deepEqual(commandAudit.counts.factionCardScopes, {
    official_mission_candidate: 10,
    official_deployment_candidate: 10,
    community_mission_display_only: 127,
    community_deployment_display_only: 44,
  });
});

check("command_center_versions_are_frozen", () => {
  assert.deepEqual(commandSnapshot.dataVersions, {
    cardsVersion: "69",
    rulesVersion: "48",
    unitsVersion: "71",
  });
});

check("snapshot_excludes_raw_records_and_public_config_token", () => {
  const serialized = JSON.stringify(commandSnapshot);
  assert.equal(serialized.includes("documents"), false);
  assert.equal(/apiKey|AIza/u.test(serialized), false);
  assert.equal(commandSnapshot.firebaseProjectId, "starcrafttmgbeta");
});

check("app_data_remains_unreviewed_and_non_authoritative", () => {
  assert.equal(commandSnapshot.snapshotStatus, "captured_unreviewed");
  assert.equal(commandSnapshot.rulesEligible, false);
  assert.equal(commandSnapshot.trainingTruth, false);
  assert.ok(commandSnapshot.blocks.includes("pdf_and_p2p_precedence_reconciliation_not_reviewed"));
});

check("rules_news_index_has_exact_six_item_semantic_identity", () => {
  assert.equal(newsReceipt.entryIndex.length, 6);
  assert.equal(newsReceipt.semanticContentHash, "64dbc1b1fcbe463ba5b539cae345e123bd965151eaa02baf12d8271b408982bd");
  assert.equal(newsReceipt.semanticByteLength, 1023);
  assert.equal(newsAudit.entryCount, 6);
});

check("news_is_drift_input_not_rule_authority", () => {
  assert.equal(newsReceipt.authority, "official_preview_and_update_index");
  assert.equal(newsReceipt.rulesEligible, false);
  assert.equal(newsReceipt.trainingTruth, false);
});

check("snapshot_hashes_detect_tamper", () => {
  const commandTamper = structuredClone(commandSnapshot);
  commandTamper.dataVersions.rulesVersion = "latest";
  assert.throws(() => verifyCommandCenterSnapshot(commandTamper), /command_center_snapshot_hash_mismatch/);
  const newsTamper = structuredClone(newsReceipt);
  newsTamper.entryIndex.pop();
  assert.throws(() => verifyRulesNewsIndexReceipt(newsTamper), /rules_news_receipt_hash_mismatch/);
});

check("source_normalization_is_order_independent", () => {
  assert.equal(createCommandCenterSnapshot({
    ...commandInput,
    staticAssets: [...commandInput.staticAssets].reverse(),
    firestorePayloads: Object.fromEntries(Object.entries(firestorePayloads).reverse()),
  }).snapshotHash, commandSnapshot.snapshotHash);
});

const failures = acceptance.filter((item) => !item.passed);
const report = {
  schema: "starcraft_tmg_official_live_source_snapshot_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length - failures.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures,
  commandSnapshot,
  commandAudit,
  newsReceipt,
  newsAudit,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR, "official-live-source-snapshots-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  failures,
  commandCenterSnapshotHash: commandSnapshot.snapshotHash,
  rulesNewsReceiptHash: newsReceipt.receiptHash,
  commandCounts: commandAudit.counts,
  newsSemanticContentHash: newsReceipt.semanticContentHash,
  rulesEligible: false,
  trainingTruth: false,
}, null, 2));
if (failures.length > 0) process.exitCode = 1;
