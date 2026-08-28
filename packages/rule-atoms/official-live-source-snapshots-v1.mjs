import { createHash } from "node:crypto";

import {
  canonicalStarcraftTmgJson,
  hashStarcraftTmgContract,
} from "../authoritative-engine/referee-crypto-v1.mjs";

export const COMMAND_CENTER_SNAPSHOT_SCHEMA = "starcraft_tmg_command_center_snapshot_v1";
export const RULES_NEWS_INDEX_RECEIPT_SCHEMA = "starcraft_tmg_rules_news_index_receipt_v1";

const REQUIRED_COLLECTIONS = Object.freeze([
  "army_units",
  "faction_cards",
  "rules_sections",
  "tactical_cards",
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

function bytes(value, code) {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  if (typeof value === "string") return Buffer.from(value, "utf8");
  fail(code);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function decodeFirestorePrimitive(field, code) {
  if (!object(field)) fail(code);
  for (const key of ["stringValue", "integerValue", "doubleValue", "booleanValue", "timestampValue"]) {
    if (Object.hasOwn(field, key)) return String(field[key]);
  }
  fail(code);
}

function normalizeCollection(collectionId, payload) {
  if (!object(payload) || !Array.isArray(payload.documents)) fail("invalid_firestore_collection_payload", collectionId);
  if (payload.nextPageToken) fail("paginated_firestore_collection_not_complete", collectionId);
  const seen = new Set();
  const recordIndex = payload.documents.map((document) => {
    const name = requiredText(document?.name, "firestore_document_name_required");
    const documentId = name.split("/").at(-1);
    if (seen.has(documentId)) fail("duplicate_firestore_document", `${collectionId}:${documentId}`);
    seen.add(documentId);
    const fields = object(document.fields) ? document.fields : {};
    return {
      documentId,
      fieldHash: hashStarcraftTmgContract(fields),
      recordHash: hashStarcraftTmgContract({ documentId, fields }),
      createTime: document.createTime || null,
      updateTime: document.updateTime || null,
      type: typeof fields.type?.stringValue === "string" ? fields.type.stringValue : null,
    };
  }).sort((left, right) => left.documentId.localeCompare(right.documentId));
  return {
    collectionId,
    documentCount: recordIndex.length,
    semanticContentHash: hashStarcraftTmgContract(recordIndex.map((record) => ({
      documentId: record.documentId,
      recordHash: record.recordHash,
    }))),
    rawResponseHash: hashStarcraftTmgContract(payload),
    paginated: false,
    recordIndex,
  };
}

function snapshotBody(snapshot) {
  const { snapshotHash: _snapshotHash, ...body } = snapshot;
  return body;
}

export function createCommandCenterSnapshot(input = {}) {
  const shellHtml = requiredText(input.shellHtml, "command_center_shell_required");
  const productVersion = shellHtml.match(/BETA\s+v\d+(?:\.\d+)*/u)?.[0] || null;
  if (productVersion !== "BETA v1.4") fail("command_center_product_version_mismatch", String(productVersion));
  const projectId = requiredText(input.projectId, "firebase_project_id_required");
  const databaseId = requiredText(input.databaseId, "firebase_database_id_required");
  const firebaseInit = bytes(input.firebaseInitJs, "firebase_init_source_required").toString("utf8");
  const configuredProjectId = firebaseInit.match(/projectId:\s*["']([^"']+)/u)?.[1];
  if (configuredProjectId !== projectId) fail("firebase_project_id_mismatch");

  const assetIds = new Set();
  const staticAssets = (input.staticAssets || []).map((asset) => {
    const assetId = requiredText(asset?.assetId, "static_asset_id_required");
    if (assetIds.has(assetId)) fail("duplicate_static_asset_id", assetId);
    assetIds.add(assetId);
    const content = bytes(asset.content, "static_asset_content_required");
    return {
      assetId,
      contentHash: sha256(content),
      byteLength: content.byteLength,
    };
  }).sort((left, right) => left.assetId.localeCompare(right.assetId));
  if (staticAssets.length !== 8) fail("command_center_static_asset_denominator_mismatch");

  if (!object(input.firestorePayloads)) fail("firestore_payloads_required");
  const collectionIds = Object.keys(input.firestorePayloads).sort();
  if (collectionIds.length !== REQUIRED_COLLECTIONS.length
    || REQUIRED_COLLECTIONS.some((collectionId) => !collectionIds.includes(collectionId))) {
    fail("firestore_collection_denominator_mismatch", collectionIds.join(","));
  }
  const firestoreCollections = collectionIds.map((collectionId) => normalizeCollection(
    collectionId,
    input.firestorePayloads[collectionId],
  ));
  const versionsFields = input.versionsPayload?.fields;
  if (!object(versionsFields)) fail("command_center_versions_payload_invalid");
  const dataVersions = Object.fromEntries([
    "cardsVersion",
    "rulesVersion",
    "unitsVersion",
  ].map((fieldName) => [
    fieldName,
    decodeFirestorePrimitive(versionsFields[fieldName], `command_center_version_missing:${fieldName}`),
  ]));
  const factionPayload = input.firestorePayloads.faction_cards;
  const factionTypes = factionPayload.documents.map((document) => document.fields?.type?.stringValue || "unknown");
  const factionCardScopes = {
    official_mission_candidate: factionTypes.filter((type) => type === "mission").length,
    official_deployment_candidate: factionTypes.filter((type) => type === "deployment").length,
    community_mission_display_only: factionTypes.filter((type) => type === "community_mission").length,
    community_deployment_display_only: factionTypes.filter((type) => type === "community_deployment").length,
  };
  if (Object.values(factionCardScopes).reduce((total, count) => total + count, 0) !== factionPayload.documents.length) {
    fail("unclassified_faction_card_source_scope");
  }
  const body = {
    schema: COMMAND_CENTER_SNAPSHOT_SCHEMA,
    sourceId: "starcraft-tmg.official.command-center",
    authority: "official_product_data_candidate",
    sourceUrl: requiredText(input.sourceUrl, "command_center_source_url_required"),
    capturedAt: new Date(input.capturedAt).toISOString(),
    productVersion,
    firebaseProjectId: projectId,
    firestoreDatabaseId: databaseId,
    shellHash: sha256(Buffer.from(shellHtml, "utf8")),
    staticAssets,
    dataVersions,
    firestoreCollections: firestoreCollections.map((collection) => ({
      collectionId: collection.collectionId,
      documentCount: collection.documentCount,
      semanticContentHash: collection.semanticContentHash,
      rawResponseHash: collection.rawResponseHash,
      paginated: false,
      recordIndex: collection.recordIndex.map((record) => ({
        documentId: record.documentId,
        fieldHash: record.fieldHash,
        recordHash: record.recordHash,
        createTime: record.createTime,
        updateTime: record.updateTime,
      })),
    })),
    factionCardScopes,
    snapshotStatus: "captured_unreviewed",
    rulesEligible: false,
    blocks: [
      "pdf_and_p2p_precedence_reconciliation_not_reviewed",
      "record_level_official_scope_not_independently_reviewed",
      "rules_sections_not_split_into_canonical_clauses",
      "card_records_not_mapped_to_p2p_source_aliases",
    ],
    trainingTruth: false,
  };
  return deepFreeze({ ...body, snapshotHash: hashStarcraftTmgContract(body) });
}

export function verifyCommandCenterSnapshot(snapshot) {
  if (!object(snapshot) || snapshot.schema !== COMMAND_CENTER_SNAPSHOT_SCHEMA) {
    fail("invalid_command_center_snapshot_schema");
  }
  if (hashStarcraftTmgContract(snapshotBody(snapshot)) !== snapshot.snapshotHash) {
    fail("command_center_snapshot_hash_mismatch");
  }
  const byCollection = Object.fromEntries(snapshot.firestoreCollections.map((collection) => [
    collection.collectionId,
    collection.documentCount,
  ]).sort(([left], [right]) => left.localeCompare(right)));
  return deepFreeze({
    schema: "starcraft_tmg_command_center_snapshot_audit_v1",
    snapshotHash: snapshot.snapshotHash,
    counts: {
      documents: snapshot.firestoreCollections.reduce((total, collection) => total + collection.documentCount, 0),
      byCollection,
      paginatedCollections: snapshot.firestoreCollections.filter((collection) => collection.paginated).length,
      factionCardScopes: { ...snapshot.factionCardScopes },
    },
    snapshotStatus: snapshot.snapshotStatus,
    rulesEligible: false,
    trainingTruth: false,
  });
}

function decodeNewsTitle(value) {
  return String(value || "")
    .replace(/&amp;/giu, "&")
    .replace(/&quot;/giu, "\"")
    .replace(/&#039;|&apos;/giu, "'")
    .replace(/\s+/gu, " ")
    .trim()
    .normalize("NFC");
}

function newsReceiptBody(receipt) {
  const { receiptHash: _receiptHash, ...body } = receipt;
  return body;
}

export function createRulesNewsIndexReceipt(input = {}) {
  const html = requiredText(input.html, "rules_news_html_required");
  const entries = [...html.matchAll(/<img[^>]+alt="([^"]+)"[^>]+data-url="(https:\/\/starcraft-tmg\.com\/news\/[^"]+)"[^>]*>[\s\S]*?<div class="text-14x24 mt-4">([^<]+)<\/div>/gu)]
    .map((match) => ({
      date: match[3].trim(),
      sourceUrl: match[2],
      title: decodeNewsTitle(match[1]),
    }));
  if (entries.length !== 6 || new Set(entries.map((entry) => entry.sourceUrl)).size !== 6) {
    fail("rules_news_entry_denominator_mismatch");
  }
  const semanticPayload = canonicalStarcraftTmgJson(entries);
  const body = {
    schema: RULES_NEWS_INDEX_RECEIPT_SCHEMA,
    sourceId: "starcraft-tmg.official.rules-news-index",
    authority: "official_preview_and_update_index",
    sourceUrl: requiredText(input.sourceUrl, "rules_news_source_url_required"),
    capturedAt: new Date(input.capturedAt).toISOString(),
    semanticContentHash: sha256(Buffer.from(semanticPayload, "utf8")),
    semanticByteLength: Buffer.byteLength(semanticPayload, "utf8"),
    rawHtmlHash: sha256(Buffer.from(html, "utf8")),
    entryIndex: entries,
    rulesEligible: false,
    blocks: [
      "preview_articles_do_not_override_frozen_rules",
      "individual_article_content_not_snapshotted",
    ],
    trainingTruth: false,
  };
  return deepFreeze({ ...body, receiptHash: hashStarcraftTmgContract(body) });
}

export function verifyRulesNewsIndexReceipt(receipt) {
  if (!object(receipt) || receipt.schema !== RULES_NEWS_INDEX_RECEIPT_SCHEMA) {
    fail("invalid_rules_news_receipt_schema");
  }
  if (hashStarcraftTmgContract(newsReceiptBody(receipt)) !== receipt.receiptHash) {
    fail("rules_news_receipt_hash_mismatch");
  }
  if (receipt.entryIndex?.length !== 6
    || receipt.semanticContentHash !== "64dbc1b1fcbe463ba5b539cae345e123bd965151eaa02baf12d8271b408982bd"
    || receipt.semanticByteLength !== 1023) fail("rules_news_semantic_index_mismatch");
  return deepFreeze({
    schema: "starcraft_tmg_rules_news_index_audit_v1",
    receiptHash: receipt.receiptHash,
    semanticContentHash: receipt.semanticContentHash,
    entryCount: receipt.entryIndex.length,
    rulesEligible: false,
    trainingTruth: false,
  });
}
