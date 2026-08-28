import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialRuleSourceManifest } from "../rule-atoms/official-rule-source-manifest-v1.mjs";
import {
  getOfficialCurrentProductRecord,
  verifyOfficialCommandCenterDataset,
} from "./official-command-center-adapter-v1.mjs";

const ALIAS_INDEX_SCHEMA = "starcraft_tmg_official_p2p_alias_index_v1";
const CURRENT_SOURCE_ID = "starcraft-tmg.official.command-center";
const EXPECTED_PAGE_KIND = Object.freeze({
  deployment: "mission_deployment_sheet",
  mission: "mission_deployment_sheet",
  tactical_card: "faction_tactical_creep_sheet",
  unit: "unit_card_sheet",
});

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function aliasIndexBody(aliasIndex) {
  return without(aliasIndex, ["aliasIndexHash"]);
}

function datasetAuditBody(audit) {
  return without(audit, ["auditHash"]);
}

function assertHash(value, code) {
  if (!/^[a-f0-9]{64}$/u.test(String(value || ""))) fail(code);
  return value;
}

function assertAliasIndexIntegrity(aliasIndex) {
  if (!object(aliasIndex) || aliasIndex.schema !== ALIAS_INDEX_SCHEMA) {
    fail("official_p2p_alias_index_schema_invalid");
  }
  if (hashStarcraftTmgContract(aliasIndexBody(aliasIndex)) !== aliasIndex.aliasIndexHash) {
    fail("official_p2p_alias_index_hash_mismatch");
  }
}

function productRecordIndex(dataset) {
  return dataset.recordIndex.filter((record) => (
    record.authorityDisposition === "official_current_product_candidate"
  ));
}

export function createOfficialP2pAliasIndex(input = {}) {
  const { snapshot, dataset, sourceManifest, reviewedBinding } = input;
  verifyOfficialCommandCenterDataset({ snapshot, dataset });
  verifyOfficialRuleSourceManifest(sourceManifest);
  if (!object(reviewedBinding)
    || reviewedBinding.schema !== "starcraft_tmg_official_p2p_reviewed_alias_binding_v1") {
    fail("official_p2p_reviewed_binding_invalid");
  }
  if (reviewedBinding.sourceSnapshotHash !== snapshot.snapshotHash
    || reviewedBinding.normalizedDatasetHash !== dataset.datasetHash
    || reviewedBinding.sourceManifestHash !== sourceManifest.manifestHash) {
    fail("official_p2p_reviewed_binding_dependency_mismatch");
  }
  if (reviewedBinding.valueParityClaimed !== false) fail("official_p2p_value_parity_claim_forbidden");

  const productByKey = new Map(productRecordIndex(dataset).map((record) => [record.recordKey, record]));
  const p2pSources = new Map(sourceManifest.pdfSources
    .filter((source) => source.sourceKind === "p2p_card_sheets")
    .map((source) => [source.sourceId, source]));
  const aliases = [];
  const seen = new Set();
  for (const reviewedAlias of reviewedBinding.aliases || []) {
    const recordKey = String(reviewedAlias?.recordKey || "");
    if (seen.has(recordKey)) fail("duplicate_official_p2p_alias", recordKey);
    seen.add(recordKey);
    const current = productByKey.get(recordKey);
    if (!current) fail("unexpected_official_p2p_alias_record", recordKey);
    if (!Array.isArray(reviewedAlias.locators) || reviewedAlias.locators.length === 0) {
      fail("official_p2p_alias_locator_required", recordKey);
    }
    const locators = reviewedAlias.locators.map((locator) => {
      const source = p2pSources.get(String(locator?.sourceId || ""));
      const pdfPage = Number(locator?.pdfPage);
      if (!source || !Number.isInteger(pdfPage)) fail("official_p2p_alias_source_page_invalid", recordKey);
      const pageAnchor = source.pageAnchors.find((anchor) => anchor.pdfPage === pdfPage);
      if (!pageAnchor) fail("official_p2p_alias_source_page_invalid", recordKey);
      if (pageAnchor.pageKind !== EXPECTED_PAGE_KIND[current.recordType]) {
        fail("official_p2p_alias_page_kind_invalid", `${recordKey}:${pageAnchor.pageKind}`);
      }
      const matchBasis = String(locator.matchBasis || "").trim();
      if (!matchBasis.startsWith("reviewed_")) fail("official_p2p_alias_match_basis_invalid", recordKey);
      return {
        sourceId: source.sourceId,
        sourceContentHash: source.contentHash,
        sourceFileVersion: source.fileVersion,
        pdfPage,
        pageKind: pageAnchor.pageKind,
        matchBasis,
      };
    }).sort((left, right) => left.sourceId.localeCompare(right.sourceId) || left.pdfPage - right.pdfPage);
    if (new Set(locators.map((locator) => `${locator.sourceId}:${locator.pdfPage}`)).size !== locators.length) {
      fail("duplicate_official_p2p_alias_locator", recordKey);
    }
    aliases.push({
      recordKey,
      recordType: current.recordType,
      currentSourceRecordHash: current.sourceRecordHash,
      currentPayloadHash: current.payloadHash,
      locators,
    });
  }
  aliases.sort((left, right) => left.recordKey.localeCompare(right.recordKey));
  const missing = [...productByKey.keys()].filter((recordKey) => !seen.has(recordKey));
  if (missing.length > 0) fail("official_p2p_alias_denominator_incomplete", missing.join(","));
  const normalizedReviewedBinding = {
    schema: reviewedBinding.schema,
    sourceSnapshotHash: reviewedBinding.sourceSnapshotHash,
    normalizedDatasetHash: reviewedBinding.normalizedDatasetHash,
    sourceManifestHash: reviewedBinding.sourceManifestHash,
    reviewMethod: reviewedBinding.reviewMethod,
    valueParityClaimed: false,
    aliases: aliases.map((alias) => ({
      recordKey: alias.recordKey,
      locators: alias.locators.map((locator) => ({
        sourceId: locator.sourceId,
        pdfPage: locator.pdfPage,
        matchBasis: locator.matchBasis,
      })),
    })),
  };
  const body = {
    schema: ALIAS_INDEX_SCHEMA,
    sourceSnapshotHash: snapshot.snapshotHash,
    normalizedDatasetHash: dataset.datasetHash,
    sourceManifestHash: sourceManifest.manifestHash,
    reviewedBindingHash: hashStarcraftTmgContract(normalizedReviewedBinding),
    reviewMethod: reviewedBinding.reviewMethod,
    valueParityClaimed: false,
    aliases,
    precedence: {
      currentValueSourceId: CURRENT_SOURCE_ID,
      currentValueSnapshotHash: snapshot.snapshotHash,
      currentValueDatasetHash: dataset.datasetHash,
      p2pRole: "historical_display_and_cross_check_only",
      onDifference: "command_center_current_value_with_drift_receipt",
      onMissingCurrentValue: "quarantine_without_p2p_or_repository_fallback",
      historicalRoomPolicy: "use_room_frozen_source_and_dataset_dependencies",
      repositoryFallbackAllowed: false,
    },
    independentProductionSignatureRequired: true,
    canAffectRules: false,
    trainingTruth: false,
  };
  return deepFreeze({ ...body, aliasIndexHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialP2pAliasIndex(input = {}) {
  const { snapshot, dataset, sourceManifest, aliasIndex } = input;
  verifyOfficialCommandCenterDataset({ snapshot, dataset });
  verifyOfficialRuleSourceManifest(sourceManifest);
  assertAliasIndexIntegrity(aliasIndex);
  if (aliasIndex.sourceSnapshotHash !== snapshot.snapshotHash
    || aliasIndex.normalizedDatasetHash !== dataset.datasetHash
    || aliasIndex.sourceManifestHash !== sourceManifest.manifestHash) {
    fail("official_p2p_alias_index_dependency_mismatch");
  }
  if (aliasIndex.precedence?.currentValueSourceId !== CURRENT_SOURCE_ID
    || aliasIndex.precedence?.currentValueSnapshotHash !== snapshot.snapshotHash
    || aliasIndex.precedence?.currentValueDatasetHash !== dataset.datasetHash
    || aliasIndex.precedence?.p2pRole !== "historical_display_and_cross_check_only"
    || aliasIndex.precedence?.onDifference !== "command_center_current_value_with_drift_receipt"
    || aliasIndex.precedence?.onMissingCurrentValue !== "quarantine_without_p2p_or_repository_fallback"
    || aliasIndex.precedence?.repositoryFallbackAllowed !== false) {
    fail("official_current_value_precedence_invalid");
  }
  const productByKey = new Map(productRecordIndex(dataset).map((record) => [record.recordKey, record]));
  const sourceById = new Map(sourceManifest.pdfSources.map((source) => [source.sourceId, source]));
  const seen = new Set();
  let invalidPageKinds = 0;
  let unexpectedAliasRecords = 0;
  const aliasesByRecordType = {};
  let locators = 0;
  for (const alias of aliasIndex.aliases) {
    if (seen.has(alias.recordKey)) fail("duplicate_official_p2p_alias", alias.recordKey);
    seen.add(alias.recordKey);
    const current = productByKey.get(alias.recordKey);
    if (!current) {
      unexpectedAliasRecords += 1;
      continue;
    }
    if (alias.recordType !== current.recordType
      || alias.currentPayloadHash !== current.payloadHash
      || alias.currentSourceRecordHash !== current.sourceRecordHash) {
      fail("official_p2p_alias_current_record_mismatch", alias.recordKey);
    }
    aliasesByRecordType[alias.recordType] = (aliasesByRecordType[alias.recordType] || 0) + 1;
    for (const locator of alias.locators) {
      locators += 1;
      const source = sourceById.get(locator.sourceId);
      const pageAnchor = source?.pageAnchors.find((anchor) => anchor.pdfPage === locator.pdfPage);
      if (!source
        || source.contentHash !== locator.sourceContentHash
        || pageAnchor?.pageKind !== EXPECTED_PAGE_KIND[current.recordType]
        || locator.pageKind !== pageAnchor?.pageKind) invalidPageKinds += 1;
    }
  }
  const missingCurrentProductRecords = [...productByKey.keys()].filter((recordKey) => !seen.has(recordKey)).length;
  const sortedAliasesByRecordType = Object.fromEntries(Object.entries(aliasesByRecordType)
    .sort(([left], [right]) => left.localeCompare(right)));
  if (missingCurrentProductRecords || unexpectedAliasRecords || invalidPageKinds) {
    fail("official_p2p_alias_index_coverage_invalid");
  }
  return deepFreeze({
    schema: "starcraft_tmg_official_p2p_alias_index_audit_v1",
    aliasIndexHash: aliasIndex.aliasIndexHash,
    counts: {
      aliases: aliasIndex.aliases.length,
      locators,
      aliasesByRecordType: sortedAliasesByRecordType,
      missingCurrentProductRecords,
      unexpectedAliasRecords,
      invalidPageKinds,
    },
    currentValueSourceId: CURRENT_SOURCE_ID,
    p2pRole: "historical_display_and_cross_check_only",
    canAffectRules: false,
    trainingTruth: false,
  });
}

export function resolveCurrentOfficialProductWithHistory(input = {}) {
  const { dataset, aliasIndex } = input;
  assertAliasIndexIntegrity(aliasIndex);
  if (aliasIndex.normalizedDatasetHash !== dataset?.datasetHash) {
    fail("official_p2p_alias_index_dataset_mismatch");
  }
  const record = getOfficialCurrentProductRecord(dataset, input.recordKey);
  const alias = aliasIndex.aliases.find((entry) => entry.recordKey === record.recordKey);
  if (!alias) fail("official_p2p_alias_missing_for_current_record", record.recordKey);
  if (alias.currentPayloadHash !== record.payloadHash) fail("official_p2p_alias_current_record_mismatch", record.recordKey);
  return deepFreeze({
    schema: "starcraft_tmg_current_official_product_resolution_v1",
    recordKey: record.recordKey,
    current: {
      sourceId: CURRENT_SOURCE_ID,
      sourceSnapshotHash: dataset.sourceSnapshotHash,
      datasetHash: dataset.datasetHash,
      payloadHash: record.payloadHash,
      payload: record.payload,
    },
    historicalP2p: alias.locators.map((locator) => ({ ...locator })),
    fallbackUsed: false,
    canAffectRules: false,
    trainingTruth: false,
  });
}

export function createOfficialDataReviewEvidenceBundle(input = {}) {
  const { snapshot, dataset, datasetAudit, aliasIndex } = input;
  if (!object(datasetAudit)
    || datasetAudit.datasetHash !== dataset.datasetHash
    || datasetAudit.sourceSnapshotHash !== snapshot.snapshotHash
    || hashStarcraftTmgContract(datasetAuditBody(datasetAudit)) !== datasetAudit.auditHash) {
    fail("official_data_dataset_audit_invalid");
  }
  assertAliasIndexIntegrity(aliasIndex);
  if (aliasIndex.sourceSnapshotHash !== snapshot.snapshotHash
    || aliasIndex.normalizedDatasetHash !== dataset.datasetHash) {
    fail("official_data_review_alias_dependency_mismatch");
  }
  const reviewBase = {
    sourceSnapshotHash: snapshot.snapshotHash,
    normalizedDatasetHash: dataset.datasetHash,
    datasetAuditHash: datasetAudit.auditHash,
  };
  const body = {
    schema: "starcraft_tmg_official_data_review_evidence_bundle_v1",
    ...reviewBase,
    recordSchemaReviewHash: hashStarcraftTmgContract({
      schema: "starcraft_tmg_official_record_schema_review_v1",
      ...reviewBase,
      recordCount: datasetAudit.counts.records,
      transformer: dataset.transformer,
      result: "machine_contract_passed",
    }),
    officialScopeReviewHash: hashStarcraftTmgContract({
      schema: "starcraft_tmg_official_scope_review_v1",
      ...reviewBase,
      officialProductByType: datasetAudit.counts.officialProductByType,
      result: "machine_contract_passed",
    }),
    communityIsolationReviewHash: hashStarcraftTmgContract({
      schema: "starcraft_tmg_community_isolation_review_v1",
      ...reviewBase,
      dispositions: datasetAudit.counts.byAuthorityDisposition,
      productLookupDisposition: "official_current_product_candidate_only",
      result: "machine_contract_passed",
    }),
    p2pPrecedenceReviewHash: aliasIndex.aliasIndexHash,
    reviewStatus: "machine_review_complete_independent_production_signature_required",
    independentProductionSignatureRequired: true,
    canAffectRules: false,
    trainingTruth: false,
  };
  return deepFreeze({ ...body, evidenceBundleHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialDataReviewEvidenceBundle(input = {}) {
  const evidenceBundle = input.evidenceBundle;
  if (!object(evidenceBundle)
    || evidenceBundle.schema !== "starcraft_tmg_official_data_review_evidence_bundle_v1") {
    fail("official_data_review_evidence_bundle_invalid");
  }
  const { evidenceBundleHash: _evidenceBundleHash, ...body } = evidenceBundle;
  if (hashStarcraftTmgContract(body) !== evidenceBundle.evidenceBundleHash) {
    fail("official_data_review_evidence_bundle_hash_mismatch");
  }
  const expected = createOfficialDataReviewEvidenceBundle(input);
  if (expected.evidenceBundleHash !== evidenceBundle.evidenceBundleHash) {
    fail("official_data_review_evidence_bundle_content_mismatch");
  }
  return true;
}
