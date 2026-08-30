#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  canonicalStarcraftTmgJson,
  hashStarcraftTmgContract,
} from "../packages/authoritative-engine/referee-crypto-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TRANCHE_ID = "ticket-11-slices-75-111";
const CAPTURE_ID = "official-development-tranche-s75-111-v1";
const CACHE_ROOT = path.join(
  ROOT,
  "build/source-intake/official-rules/development-tranches",
  CAPTURE_ID,
);
const LOCK_PATH = path.join(
  ROOT,
  "content/official-development-tranche-s75-111-source-lock-v1.json",
);
const FIRESTORE_ROOT =
  "https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents";

const FIRESTORE_SOURCES = Object.freeze({
  army_units: `${FIRESTORE_ROOT}/army_units?pageSize=1000`,
  tactical_cards: `${FIRESTORE_ROOT}/tactical_cards?pageSize=1000`,
  faction_cards: `${FIRESTORE_ROOT}/faction_cards?pageSize=1000`,
  rules_sections: `${FIRESTORE_ROOT}/rules_sections?pageSize=1000`,
  system_metadata_versions: `${FIRESTORE_ROOT}/system_metadata/versions`,
});

const BINARY_SOURCES = Object.freeze({
  core_rulebook: "https://starcraft-tmg.com/files/downloads/StarCraft-TMG_EN.pdf",
  protoss_p2p:
    "https://starcraft-tmg.com/files/downloads/StarCraft-Protoss-P2P-Card-Sheets-A4_EN.pdf",
  terran_p2p:
    "https://starcraft-tmg.com/files/downloads/StarCraft-Terran-P2P-Card-Sheets-A4_EN.pdf",
  zerg_p2p:
    "https://starcraft-tmg.com/files/downloads/StarCraft-Zerg-P2P-Card-Sheets-A4_EN.pdf",
});

const TEXT_SOURCES = Object.freeze({
  command_center_shell: "https://sc.starcraft-tmg.com/",
  command_center_script: "https://sc.starcraft-tmg.com/script.js",
  command_center_firebase_init: "https://sc.starcraft-tmg.com/modules/firebase-init.js",
  command_center_factions: "https://sc.starcraft-tmg.com/modules/factions.js",
  command_center_rules: "https://sc.starcraft-tmg.com/modules/rules.js",
  command_center_army_builder: "https://sc.starcraft-tmg.com/modules/army_builder.js",
  command_center_rules_checker: "https://sc.starcraft-tmg.com/modules/rules_checker.js",
  command_center_mission_cards: "https://sc.starcraft-tmg.com/modules/mission_cards.js",
  command_center_deployment_maps: "https://sc.starcraft-tmg.com/modules/deployment_maps.js",
  gameplay_faq: "https://starcraft-tmg.com/faq",
  rules_news: "https://starcraft-tmg.com/news/rules",
});

const BINARY_FILE_NAMES = Object.freeze({
  core_rulebook: "StarCraft-TMG_EN.pdf",
  protoss_p2p: "StarCraft-Protoss-P2P-Card-Sheets-A4_EN.pdf",
  terran_p2p: "StarCraft-Terran-P2P-Card-Sheets-A4_EN.pdf",
  zerg_p2p: "StarCraft-Zerg-P2P-Card-Sheets-A4_EN.pdf",
});

const TEXT_FILE_NAMES = Object.freeze({
  command_center_shell: "command-center.html",
  command_center_script: "command-center/script.js",
  command_center_firebase_init: "command-center/modules/firebase-init.js",
  command_center_factions: "command-center/modules/factions.js",
  command_center_rules: "command-center/modules/rules.js",
  command_center_army_builder: "command-center/modules/army_builder.js",
  command_center_rules_checker: "command-center/modules/rules_checker.js",
  command_center_mission_cards: "command-center/modules/mission_cards.js",
  command_center_deployment_maps: "command-center/modules/deployment_maps.js",
  gameplay_faq: "gameplay-faq.html",
  rules_news: "rules-news.html",
});

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function fetchBytes(url, sourceId) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
      if (!response.ok) {
        lastError = new Error(`HTTP_${response.status}`);
        continue;
      }
      return {
        bytes: Buffer.from(await response.arrayBuffer()),
        finalUrl: response.url,
        contentType: response.headers.get("content-type") || "application/octet-stream",
        etag: response.headers.get("etag") || null,
        lastModified: response.headers.get("last-modified") || null,
      };
    } catch (error) {
      lastError = error;
    }
  }
  fail("OFFICIAL_TRANCHE_SOURCE_FETCH_FAILED", `${sourceId}:${lastError?.message || lastError}`);
}

function relativeCachePath(fileName) {
  return path.relative(ROOT, path.join(CACHE_ROOT, fileName));
}

function sourceRecord(sourceId, sourceUrl, fileName, response, extra = {}) {
  return {
    sourceId,
    requestedUrl: sourceUrl,
    finalUrl: response.finalUrl,
    cachePath: relativeCachePath(fileName),
    byteLength: response.bytes.length,
    byteHash: sha256(response.bytes),
    contentType: response.contentType,
    etag: response.etag,
    lastModified: response.lastModified,
    ...extra,
  };
}

function firestoreVersion(document, field) {
  const value = document?.fields?.[field];
  const raw = value?.integerValue ?? value?.stringValue;
  if (raw === undefined || raw === null || String(raw).trim() === "") {
    fail("OFFICIAL_TRANCHE_VERSION_FIELD_MISSING", field);
  }
  return String(raw);
}

if (await exists(LOCK_PATH) || await exists(CACHE_ROOT)) {
  fail("OFFICIAL_TRANCHE_SOURCE_LOCK_ALREADY_EXISTS", CAPTURE_ID);
}

const capturedAt = new Date().toISOString();
const allRequests = [
  ...Object.entries(FIRESTORE_SOURCES).map(([sourceId, url]) => ({
    sourceClass: "firestore",
    sourceId,
    url,
  })),
  ...Object.entries(BINARY_SOURCES).map(([sourceId, url]) => ({
    sourceClass: "binary",
    sourceId,
    url,
  })),
  ...Object.entries(TEXT_SOURCES).map(([sourceId, url]) => ({
    sourceClass: "text",
    sourceId,
    url,
  })),
];
const fetched = Object.fromEntries(await Promise.all(allRequests.map(async (request) => [
  request.sourceId,
  { ...request, response: await fetchBytes(request.url, request.sourceId) },
])));

const firestorePayloads = {};
for (const sourceId of Object.keys(FIRESTORE_SOURCES)) {
  try {
    firestorePayloads[sourceId] = JSON.parse(fetched[sourceId].response.bytes.toString("utf8"));
  } catch (error) {
    fail("OFFICIAL_TRANCHE_FIRESTORE_JSON_INVALID", `${sourceId}:${error.message}`);
  }
}
for (const collectionId of ["army_units", "tactical_cards", "faction_cards", "rules_sections"]) {
  const payload = firestorePayloads[collectionId];
  if (!Array.isArray(payload.documents) || payload.documents.length === 0) {
    fail("OFFICIAL_TRANCHE_FIRESTORE_COLLECTION_EMPTY", collectionId);
  }
  if (payload.nextPageToken) {
    fail("OFFICIAL_TRANCHE_FIRESTORE_COLLECTION_PAGINATED", collectionId);
  }
}

await mkdir(CACHE_ROOT, { recursive: true });
await mkdir(path.join(CACHE_ROOT, "firestore"), { recursive: true });
await mkdir(path.join(CACHE_ROOT, "command-center/modules"), { recursive: true });

const firestore = {};
for (const [sourceId, sourceUrl] of Object.entries(FIRESTORE_SOURCES)) {
  const fileName = `firestore/${sourceId}.json`;
  const payload = firestorePayloads[sourceId];
  const serialized = `${JSON.stringify(payload, null, 2)}\n`;
  await writeFile(path.join(CACHE_ROOT, fileName), serialized, "utf8");
  firestore[sourceId] = sourceRecord(
    sourceId,
    sourceUrl,
    fileName,
    fetched[sourceId].response,
    {
      canonicalHash: sha256(`${canonicalStarcraftTmgJson(payload)}\n`),
      ...(Array.isArray(payload.documents) ? { documentCount: payload.documents.length } : {}),
    },
  );
}

const binaries = {};
for (const [sourceId, sourceUrl] of Object.entries(BINARY_SOURCES)) {
  const fileName = BINARY_FILE_NAMES[sourceId];
  const response = fetched[sourceId].response;
  await writeFile(path.join(CACHE_ROOT, fileName), response.bytes);
  binaries[sourceId] = sourceRecord(sourceId, sourceUrl, fileName, response);
}

const texts = {};
for (const [sourceId, sourceUrl] of Object.entries(TEXT_SOURCES)) {
  const fileName = TEXT_FILE_NAMES[sourceId];
  const response = fetched[sourceId].response;
  await writeFile(path.join(CACHE_ROOT, fileName), response.bytes);
  texts[sourceId] = sourceRecord(sourceId, sourceUrl, fileName, response);
}

const versionDocument = firestorePayloads.system_metadata_versions;
const body = {
  schema: "starcraft_tmg_official_development_tranche_source_lock_v1",
  gameId: "starcraft-tmg",
  trancheId: TRANCHE_ID,
  captureId: CAPTURE_ID,
  capturedAt,
  sourceAuthority: "official_primary_and_official_product_backend_candidate",
  dataVersions: {
    unitsVersion: firestoreVersion(versionDocument, "unitsVersion"),
    cardsVersion: firestoreVersion(versionDocument, "cardsVersion"),
    rulesVersion: firestoreVersion(versionDocument, "rulesVersion"),
  },
  firestore,
  binaries,
  texts,
  policy: {
    automaticRefreshAllowed: false,
    networkVerificationDuringSliceDevelopmentAllowed: false,
    explicitUserCommandRequiredForNewCapture: true,
    repositoryFallbackAllowed: false,
    silentSourceReplacementAllowed: false,
    priorLockMutationAllowed: false,
    roomBindingsRemainSnapshotPinned: true,
  },
  rulesEligible: false,
  productionRoomEligible: false,
  trainingTruth: false,
};
const lock = { ...body, lockHash: hashStarcraftTmgContract(body) };
await writeFile(LOCK_PATH, `${JSON.stringify(lock, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  schema: lock.schema,
  trancheId: lock.trancheId,
  capturedAt: lock.capturedAt,
  dataVersions: lock.dataVersions,
  collectionCounts: Object.fromEntries(Object.entries(lock.firestore)
    .filter(([, record]) => Number.isInteger(record.documentCount))
    .map(([sourceId, record]) => [sourceId, record.documentCount])),
  sourceCount: Object.keys(lock.firestore).length
    + Object.keys(lock.binaries).length
    + Object.keys(lock.texts).length,
  lockHash: lock.lockHash,
  repositoryFallbackAllowed: lock.policy.repositoryFallbackAllowed,
  automaticRefreshAllowed: lock.policy.automaticRefreshAllowed,
  trainingTruth: lock.trainingTruth,
}, null, 2));
