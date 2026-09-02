import { STARCRAFT_TMG_OFFICIAL_SOURCE_EVIDENCE_BINDING_V3 } from
  "../../content/official-source-evidence-binding-v3.mjs";
import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyCoreRuleAnchorIndex } from
  "../rule-atoms/core-rule-anchor-index-v1.mjs";
import { verifyOfficialGameplayFaqReceipt } from
  "../rule-atoms/official-gameplay-faq-source-v1.mjs";
import { verifyOfficialRuleSourceManifest } from
  "../rule-atoms/official-rule-source-manifest-v1.mjs";
import { verifyOfficialCommandCenterDataset } from
  "./official-command-center-adapter-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "./official-development-tranche-source-lock-v1.mjs";

export const STARCRAFT_TMG_OFFICIAL_SOURCE_EVIDENCE_REGISTRY_V3_VERSION =
  "starcraft_tmg_official_source_evidence_registry_v3";

const HASH = /^[a-f0-9]{64}$/u;
const CURRENT_COMMAND_CENTER_SOURCE_ID = "starcraft-tmg.official.command-center";
const CURRENT_FAQ_SOURCE_ID = "starcraft-tmg.official.gameplay-faq.current";
const HISTORICAL_FAQ_SOURCE_ID = "starcraft-tmg.official.gameplay-faq.historical";
const SOURCE_LOCK_BINARY_BY_MANIFEST_ID = Object.freeze({
  "core-rules-en": "core_rulebook",
  "p2p-protoss-en": "protoss_p2p",
  "p2p-terran-en": "terran_p2p",
  "p2p-zerg-en": "zerg_p2p",
});
const P2P_PAGE_KIND_BY_RECORD_TYPE = Object.freeze({
  deployment: "mission_deployment_sheet",
  mission: "mission_deployment_sheet",
  tactical_card: "faction_tactical_creep_sheet",
  unit: "unit_card_sheet",
});
const CLAIM_SCOPES = new Set([
  "current_product_value",
  "canonical_general_rule",
  "faq_supplement",
  "community_display",
  "translation_display",
  "historical_room",
]);
const REDISTRIBUTION_USES = new Set([
  "provenance_metadata_only",
  "raw_source_bytes",
  "extracted_source_text",
  "source_image",
  "source_payload",
  "translated_source_body",
  "public_display_render",
]);

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value || {}).filter(([key]) => !keys.includes(key)));
}

function fieldKey(input = {}) {
  return [input.recordType, input.canonicalId, input.fieldPath]
    .map((value) => String(value || ""))
    .join("\u001f");
}

function assertContractHash(value, hashKey, code) {
  if (!value || !HASH.test(String(value[hashKey] || ""))
    || hashStarcraftTmgContract(without(value, [hashKey])) !== value[hashKey]) {
    fail(code);
  }
}

function validateBinding(binding) {
  assertContractHash(binding, "bindingHash", "OFFICIAL_SOURCE_EVIDENCE_BINDING_INVALID");
  if (binding.bindingHash !== STARCRAFT_TMG_OFFICIAL_SOURCE_EVIDENCE_BINDING_V3.bindingHash
    || binding.sourceLockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || binding.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || binding.officialDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || binding.sourceRefreshPolicy !== "explicit_user_command_only"
    || binding.repositoryFallbackAllowed !== false
    || binding.legacyFallbackAllowed !== false
    || binding.canAffectRules !== false
    || binding.trainingTruth !== false) {
    fail("OFFICIAL_SOURCE_EVIDENCE_BINDING_DEPENDENCY_MISMATCH");
  }
  return binding;
}

function validateCurrentSourceChain(input, binding) {
  const { sourceLock, sourceLockAudit, snapshot, dataset, sourceBinding } = input;
  assertContractHash(sourceLock, "lockHash", "OFFICIAL_SOURCE_EVIDENCE_LOCK_INVALID");
  assertContractHash(sourceLockAudit, "auditHash", "OFFICIAL_SOURCE_EVIDENCE_LOCK_AUDIT_INVALID");
  assertContractHash(sourceBinding, "bindingHash", "OFFICIAL_SOURCE_EVIDENCE_LOCALIZATION_BINDING_INVALID");
  if (sourceLock.lockHash !== binding.sourceLockHash
    || sourceLockAudit.lockHash !== binding.sourceLockHash
    || sourceLockAudit.snapshotHash !== binding.sourceSnapshotHash
    || sourceLockAudit.normalizedDatasetHash !== binding.officialDatasetHash
    || snapshot?.snapshotHash !== binding.sourceSnapshotHash
    || dataset?.datasetHash !== binding.officialDatasetHash
    || sourceBinding.sourceLockHash !== binding.sourceLockHash
    || sourceBinding.sourceSnapshotHash !== binding.sourceSnapshotHash
    || sourceBinding.officialDatasetHash !== binding.officialDatasetHash
    || sourceLock.policy?.automaticRefreshAllowed !== false
    || sourceLock.policy?.explicitUserCommandRequiredForNewCapture !== true
    || sourceLock.policy?.repositoryFallbackAllowed !== false) {
    fail("OFFICIAL_SOURCE_EVIDENCE_CURRENT_CHAIN_MISMATCH");
  }
  verifyOfficialCommandCenterDataset({ snapshot, dataset });
}

function validateRuleSources(input, binding) {
  const { sourceLock, sourceManifest, coreAnchorIndex } = input;
  verifyOfficialRuleSourceManifest(sourceManifest);
  const coreAudit = verifyCoreRuleAnchorIndex(coreAnchorIndex);
  if (sourceManifest.manifestHash !== binding.reviewedRuleSourceManifestHash
    || coreAnchorIndex.anchorIndexHash !== binding.reviewedCoreAnchorIndexHash
    || coreAnchorIndex.sourceSnapshot?.contentHash !== binding.coreRulebookContentHash
    || coreAudit.counts.anchors !== 192
    || coreAudit.counts.unlocatedAnchors !== 0) {
    fail("OFFICIAL_SOURCE_EVIDENCE_RULE_SOURCE_DEPENDENCY_MISMATCH");
  }
  for (const source of sourceManifest.pdfSources) {
    const lockId = SOURCE_LOCK_BINARY_BY_MANIFEST_ID[source.sourceId];
    if (!lockId
      || source.contentHash !== sourceLock.binaries?.[lockId]?.byteHash
      || source.byteLength !== sourceLock.binaries?.[lockId]?.byteLength) {
      fail("OFFICIAL_SOURCE_EVIDENCE_PDF_LOCK_MISMATCH", source.sourceId);
    }
  }
  return coreAudit;
}

function validateAndRebindP2p(input, binding) {
  const { dataset, sourceManifest, historicalP2pAliasIndex } = input;
  assertContractHash(
    historicalP2pAliasIndex,
    "aliasIndexHash",
    "OFFICIAL_SOURCE_EVIDENCE_P2P_ALIAS_INVALID",
  );
  if (historicalP2pAliasIndex.aliasIndexHash !== binding.reviewedHistoricalP2pAliasIndexHash
    || historicalP2pAliasIndex.sourceManifestHash !== sourceManifest.manifestHash
    || historicalP2pAliasIndex.valueParityClaimed !== false
    || historicalP2pAliasIndex.precedence?.p2pRole !== "historical_display_and_cross_check_only"
    || historicalP2pAliasIndex.precedence?.repositoryFallbackAllowed !== false) {
    fail("OFFICIAL_SOURCE_EVIDENCE_P2P_ALIAS_DEPENDENCY_MISMATCH");
  }
  const currentByKey = new Map(dataset.recordIndex
    .filter((record) => record.authorityDisposition === "official_current_product_candidate")
    .map((record) => [record.recordKey, record]));
  const sourceById = new Map(sourceManifest.pdfSources.map((source) => [source.sourceId, source]));
  const rebound = new Map();
  let locatorCount = 0;
  for (const alias of historicalP2pAliasIndex.aliases || []) {
    const current = currentByKey.get(alias.recordKey);
    if (!current
      || current.recordType !== alias.recordType
      || current.payloadHash !== alias.currentPayloadHash
      || current.sourceRecordHash !== alias.currentSourceRecordHash
      || rebound.has(alias.recordKey)) {
      fail("OFFICIAL_SOURCE_EVIDENCE_P2P_RECORD_DRIFT", alias.recordKey);
    }
    const locators = (alias.locators || []).map((locator) => {
      const source = sourceById.get(locator.sourceId);
      const pageAnchor = source?.pageAnchors?.find((entry) => entry.pdfPage === locator.pdfPage);
      if (!source
        || source.contentHash !== locator.sourceContentHash
        || locator.pageKind !== P2P_PAGE_KIND_BY_RECORD_TYPE[current.recordType]
        || pageAnchor?.pageKind !== locator.pageKind) {
        fail("OFFICIAL_SOURCE_EVIDENCE_P2P_LOCATOR_INVALID", alias.recordKey);
      }
      locatorCount += 1;
      return clone(locator);
    });
    if (locators.length === 0) fail("OFFICIAL_SOURCE_EVIDENCE_P2P_LOCATOR_MISSING", alias.recordKey);
    rebound.set(alias.recordKey, deepFreeze({
      recordKey: alias.recordKey,
      recordType: current.recordType,
      currentSourceRecordHash: current.sourceRecordHash,
      currentPayloadHash: current.payloadHash,
      reviewedAgainstHistoricalSnapshotHash: historicalP2pAliasIndex.sourceSnapshotHash,
      locatorReviewCarriedForward: true,
      carryForwardBasis: "record_and_pdf_hashes_exactly_unchanged",
      locators,
    }));
  }
  if (rebound.size !== currentByKey.size || rebound.size !== 83 || locatorCount !== 123) {
    fail("OFFICIAL_SOURCE_EVIDENCE_P2P_DENOMINATOR_MISMATCH");
  }
  return { rebound, locatorCount };
}

function validateRuleSectionLocators(input, binding) {
  const { dataset, coreAnchorIndex } = input;
  const records = dataset.recordIndex.filter((record) => (
    record.authorityDisposition === "official_rule_prose_review_required"
  ));
  const recordByKey = new Map(records.map((record) => [record.recordKey, record]));
  const locatorByRecordKey = new Map();
  for (const locator of binding.ruleSectionLocators) {
    const record = recordByKey.get(locator.recordKey);
    const payload = dataset.recordsByKey?.[locator.recordKey]?.payload;
    if (!record
      || record.payloadHash !== locator.payloadHash
      || hashStarcraftTmgContract(payload?.title) !== locator.titleHash
      || !Number.isInteger(locator.fromPdfPage)
      || !Number.isInteger(locator.toPdfPage)
      || locator.fromPdfPage < 1
      || locator.toPdfPage < locator.fromPdfPage
      || locator.toPdfPage > 128
      || !String(locator.matchBasis || "").startsWith("reviewed_")
      || locatorByRecordKey.has(locator.recordKey)) {
      fail("OFFICIAL_SOURCE_EVIDENCE_RULE_SECTION_LOCATOR_INVALID", locator.recordKey);
    }
    const relevantAnchors = coreAnchorIndex.anchors.filter((anchor) => (
      anchor.locator.pdfPage >= locator.fromPdfPage
      && anchor.locator.pdfPage <= locator.toPdfPage
    ));
    locatorByRecordKey.set(locator.recordKey, deepFreeze({
      sourceId: "core-rules-en",
      sourceContentHash: binding.coreRulebookContentHash,
      fromPdfPage: locator.fromPdfPage,
      toPdfPage: locator.toPdfPage,
      pageLocatorPrecision: "record_scope_page_range",
      matchBasis: locator.matchBasis,
      structuralAnchorCount: relevantAnchors.length,
      exactFieldPageClaimed: false,
    }));
  }
  if (recordByKey.size !== 15 || locatorByRecordKey.size !== recordByKey.size) {
    fail("OFFICIAL_SOURCE_EVIDENCE_RULE_SECTION_DENOMINATOR_MISMATCH");
  }
  return locatorByRecordKey;
}

function validateFaqVersions(input, binding) {
  const {
    sourceLock,
    currentFaqReceipt,
    historicalFaqReceipt,
    historicalFaqExactReconciliation,
    historicalFaqSupplementalReconciliation,
  } = input;
  assertContractHash(currentFaqReceipt, "receiptHash", "OFFICIAL_SOURCE_EVIDENCE_CURRENT_FAQ_INVALID");
  verifyOfficialGameplayFaqReceipt(historicalFaqReceipt);
  assertContractHash(
    historicalFaqExactReconciliation,
    "reconciliationHash",
    "OFFICIAL_SOURCE_EVIDENCE_HISTORICAL_FAQ_EXACT_INVALID",
  );
  assertContractHash(
    historicalFaqSupplementalReconciliation,
    "reconciliationHash",
    "OFFICIAL_SOURCE_EVIDENCE_HISTORICAL_FAQ_SUPPLEMENT_INVALID",
  );
  if (sourceLock.texts?.gameplay_faq?.byteHash !== binding.currentFaq.lockRawByteHash
    || currentFaqReceipt.retrieval?.rawHtmlHash !== binding.currentFaq.decodedTextHash
    || currentFaqReceipt.receiptHash !== binding.currentFaq.receiptHash
    || currentFaqReceipt.semanticContentHash !== binding.currentFaq.semanticContentHash
    || currentFaqReceipt.semanticByteLength !== binding.currentFaq.semanticByteLength
    || historicalFaqReceipt.receiptHash !== binding.historicalFaq.receiptHash
    || historicalFaqReceipt.semanticContentHash !== binding.historicalFaq.semanticContentHash
    || historicalFaqExactReconciliation.reconciliationHash
      !== binding.historicalFaq.exactReconciliationHash
    || historicalFaqSupplementalReconciliation.reconciliationHash
      !== binding.historicalFaq.supplementalReconciliationHash
    || historicalFaqExactReconciliation.faqReceiptHash !== historicalFaqReceipt.receiptHash
    || historicalFaqSupplementalReconciliation.faqReceiptHash !== historicalFaqReceipt.receiptHash
    || historicalFaqSupplementalReconciliation.exactReconciliationV2Hash
      !== historicalFaqExactReconciliation.reconciliationHash
    || currentFaqReceipt.semanticContentHash === historicalFaqReceipt.semanticContentHash) {
    fail("OFFICIAL_SOURCE_EVIDENCE_FAQ_VERSION_DEPENDENCY_MISMATCH");
  }
  const historicalById = new Map(historicalFaqReceipt.entryIndex.map((entry) => [entry.entryId, entry]));
  const currentById = new Map(currentFaqReceipt.entryIndex.map((entry) => [entry.entryId, entry]));
  if (historicalById.size !== 7 || currentById.size !== 7
    || [...historicalById.keys()].some((entryId) => !currentById.has(entryId))) {
    fail("OFFICIAL_SOURCE_EVIDENCE_FAQ_ENTRY_DENOMINATOR_MISMATCH");
  }
  const driftedEntryIds = [...currentById.keys()].filter((entryId) => {
    const current = currentById.get(entryId);
    const historical = historicalById.get(entryId);
    return current.questionHash !== historical.questionHash || current.answerHash !== historical.answerHash;
  });
  if (driftedEntryIds.length === 0 || binding.currentFaq.mayReuseHistoricalReconciliation !== false) {
    fail("OFFICIAL_SOURCE_EVIDENCE_FAQ_DRIFT_NOT_ISOLATED");
  }
  const exactById = new Map(historicalFaqExactReconciliation.entries.map((entry) => [entry.entryId, entry]));
  return { currentById, historicalById, exactById, driftedEntryIds };
}

function validateFieldProvenance(input) {
  const { sourceBinding, fieldProvenanceCatalogue, dataset } = input;
  assertContractHash(
    fieldProvenanceCatalogue,
    "catalogueHash",
    "OFFICIAL_SOURCE_EVIDENCE_FIELD_CATALOGUE_INVALID",
  );
  if (fieldProvenanceCatalogue.catalogueHash !== sourceBinding.fieldProvenanceCatalogueHash
    || fieldProvenanceCatalogue.fieldCount !== fieldProvenanceCatalogue.fields?.length
    || fieldProvenanceCatalogue.fieldCount !== 1440) {
    fail("OFFICIAL_SOURCE_EVIDENCE_FIELD_CATALOGUE_DEPENDENCY_MISMATCH");
  }
  const recordKeys = new Set(dataset.recordIndex.map((record) => record.recordKey));
  for (const field of fieldProvenanceCatalogue.fields) {
    if (!recordKeys.has(field.recordKey)
      || field.sourceSnapshotHash !== dataset.sourceSnapshotHash
      || field.officialDatasetHash !== dataset.datasetHash
      || field.translationMayOverrideCanonical !== false
      || field.canAffectRules !== false
      || field.trainingTruth !== false) {
      fail("OFFICIAL_SOURCE_EVIDENCE_FIELD_PROVENANCE_INVALID", field.recordKey);
    }
  }
}

function rightsForDisposition(disposition) {
  const status = disposition === "community_display_only"
    ? "per_author_unknown"
    : disposition === "official_rule_prose_review_required"
      ? "publisher_copyright_independent_redistribution_review_required"
      : "official_product_copyright_independent_redistribution_review_required";
  return {
    status,
    publicMetadataEnvelopeMode: "hash_locator_status_only_no_source_body",
    rawSourceRedistributionAllowed: false,
    extractedSourceTextRedistributionAllowed: false,
    translatedSourceBodyPublicReleaseAllowed: false,
    publicDisplayReleaseGatePassed: false,
  };
}

function sourceCatalogue(input, binding) {
  const { sourceLock, sourceManifest, historicalP2pAliasIndex } = input;
  const pdfSources = sourceManifest.pdfSources.map((source) => ({
    sourceId: source.sourceId,
    sourceKind: source.sourceKind,
    sourceVersion: source.fileVersion,
    contentHash: source.contentHash,
    locatorDenominator: source.sourceKind === "core_rulebook" ? 192 : source.pdfPages,
    currentCaptureBound: true,
    rawContentIncluded: false,
    rightsStatus: "publisher_copyright_independent_redistribution_review_required",
    redistributionAllowed: false,
  }));
  return [
    {
      sourceId: CURRENT_COMMAND_CENTER_SOURCE_ID,
      sourceKind: "official_product_backend_candidate",
      sourceVersion: clone(sourceLock.dataVersions),
      contentHash: binding.sourceSnapshotHash,
      locatorDenominator: 271,
      currentCaptureBound: true,
      rawContentIncluded: false,
      rightsStatus: "official_product_copyright_independent_redistribution_review_required",
      redistributionAllowed: false,
    },
    ...pdfSources,
    {
      sourceId: CURRENT_FAQ_SOURCE_ID,
      sourceKind: "official_mutable_supplement",
      sourceVersion: binding.currentFaq.semanticContentHash,
      contentHash: binding.currentFaq.lockRawByteHash,
      locatorDenominator: 7,
      currentCaptureBound: true,
      reviewStatus: "quarantined_semantic_drift",
      rawContentIncluded: false,
      rightsStatus: "publisher_copyright_independent_redistribution_review_required",
      redistributionAllowed: false,
    },
    {
      sourceId: HISTORICAL_FAQ_SOURCE_ID,
      sourceKind: "official_mutable_supplement_historical_version",
      sourceVersion: binding.historicalFaq.semanticContentHash,
      contentHash: binding.historicalFaq.receiptHash,
      locatorDenominator: 7,
      currentCaptureBound: false,
      reviewStatus: binding.historicalFaq.retention,
      rawContentIncluded: false,
      rightsStatus: "publisher_copyright_independent_redistribution_review_required",
      redistributionAllowed: false,
    },
    {
      sourceId: "starcraft-tmg.official.command-center.historical-p2p-alias-review",
      sourceKind: "historical_review_dependency",
      sourceVersion: historicalP2pAliasIndex.sourceSnapshotHash,
      contentHash: historicalP2pAliasIndex.aliasIndexHash,
      locatorDenominator: 123,
      currentCaptureBound: false,
      reviewStatus: "retained_locator_review_exact_record_and_pdf_hash_match",
      rawContentIncluded: false,
      rightsStatus: "metadata_only",
      redistributionAllowed: false,
    },
  ];
}

function precedenceResolution(input, binding) {
  const claimScope = String(input.claimScope || "");
  if (!CLAIM_SCOPES.has(claimScope)) fail("OFFICIAL_SOURCE_PRECEDENCE_SCOPE_UNSUPPORTED", claimScope);
  let resolution;
  if (claimScope === "current_product_value") {
    resolution = input.currentValueAvailable === false
      ? {
        winner: null,
        quarantined: true,
        reason: "current_value_missing_no_historical_or_repository_fallback",
        losingSources: ["p2p_card_sheets", "repository", "legacy_pack"],
      }
      : {
        winner: CURRENT_COMMAND_CENTER_SOURCE_ID,
        quarantined: false,
        reason: binding.precedencePolicy.currentProductValue,
        losingSources: ["p2p_card_sheets", "repository", "legacy_pack"],
      };
  } else if (claimScope === "canonical_general_rule") {
    resolution = {
      winner: "room_pinned_rule_kernel_and_core_rulebook",
      quarantined: false,
      reason: binding.precedencePolicy.generalRule,
      losingSources: [CURRENT_COMMAND_CENTER_SOURCE_ID, CURRENT_FAQ_SOURCE_ID, "translation", "community"],
    };
  } else if (claimScope === "faq_supplement") {
    resolution = {
      winner: "room_pinned_rule_kernel_and_core_rulebook",
      quarantined: true,
      reason: binding.precedencePolicy.faq,
      losingSources: [CURRENT_FAQ_SOURCE_ID],
      retainedDisplaySource: HISTORICAL_FAQ_SOURCE_ID,
    };
  } else if (claimScope === "community_display") {
    resolution = {
      winner: null,
      quarantined: false,
      reason: binding.precedencePolicy.community,
      losingSources: [],
      displayOnly: true,
    };
  } else if (claimScope === "translation_display") {
    resolution = {
      winner: "canonical_source_payload",
      quarantined: false,
      reason: binding.precedencePolicy.translation,
      losingSources: ["translation_sidecar"],
      displaySidecarAllowed: true,
    };
  } else {
    resolution = {
      winner: "exact_room_pinned_source_and_rule_dependencies",
      quarantined: false,
      reason: binding.precedencePolicy.historicalRoom,
      losingSources: ["newest_unpinned_source"],
    };
  }
  return deepFreeze({
    schema: `${STARCRAFT_TMG_OFFICIAL_SOURCE_EVIDENCE_REGISTRY_V3_VERSION}.precedence-resolution`,
    claimScope,
    ...resolution,
    fallbackUsed: false,
    repositoryFallbackAllowed: false,
    legacyFallbackAllowed: false,
    canAffectRules: false,
    trainingTruth: false,
  });
}

export function createStarcraftTmgOfficialSourceEvidenceRegistryV3(options = {}) {
  const binding = validateBinding(
    options.reviewedBinding || STARCRAFT_TMG_OFFICIAL_SOURCE_EVIDENCE_BINDING_V3,
  );
  validateCurrentSourceChain(options, binding);
  const coreAudit = validateRuleSources(options, binding);
  const p2p = validateAndRebindP2p(options, binding);
  const ruleLocatorByRecordKey = validateRuleSectionLocators(options, binding);
  const faq = validateFaqVersions(options, binding);
  validateFieldProvenance(options);

  const fieldEvidenceByKey = new Map();
  const fieldEvidence = options.fieldProvenanceCatalogue.fields.map((field) => {
    const base = {
      schema: `${STARCRAFT_TMG_OFFICIAL_SOURCE_EVIDENCE_REGISTRY_V3_VERSION}.field-evidence`,
      fieldRef: {
        recordType: field.recordType,
        canonicalId: field.canonicalId,
        fieldPath: field.fieldPath,
        canonicalTextHash: field.canonicalTextHash,
      },
      authorityDisposition: field.authorityDisposition,
      currentRecordLocator: {
        sourceId: CURRENT_COMMAND_CENTER_SOURCE_ID,
        sourceLockHash: field.sourceLockHash,
        sourceSnapshotHash: field.sourceSnapshotHash,
        officialDatasetHash: field.officialDatasetHash,
        collectionId: field.collectionId,
        documentId: field.documentId,
        recordKey: field.recordKey,
        sourceRecordHash: field.sourceRecordHash,
        payloadHash: field.payloadHash,
      },
      historicalP2pLocators: [],
      rulebookLocator: null,
      sourceScopeReview: null,
      rights: rightsForDisposition(field.authorityDisposition),
      canonicalSourceUnchanged: true,
      translationMayAffectRules: false,
      trainingTruth: false,
    };
    if (field.authorityDisposition === "official_current_product_candidate") {
      base.historicalP2pLocators = clone(p2p.rebound.get(field.recordKey).locators);
      base.sourceScopeReview = "current_record_and_historical_p2p_page_locator_verified";
    } else if (field.authorityDisposition === "official_rule_prose_review_required") {
      base.rulebookLocator = clone(ruleLocatorByRecordKey.get(field.recordKey));
      base.sourceScopeReview = "rulebook_record_page_range_verified_field_exact_page_not_claimed";
    } else if (field.authorityDisposition === "community_display_only") {
      base.sourceScopeReview = "community_display_only_no_official_page_claim";
    } else {
      fail("OFFICIAL_SOURCE_EVIDENCE_FIELD_DISPOSITION_UNSUPPORTED", field.authorityDisposition);
    }
    const evidence = deepFreeze({ ...base, evidenceHash: hashStarcraftTmgContract(base) });
    const key = fieldKey(field);
    if (fieldEvidenceByKey.has(key)) fail("OFFICIAL_SOURCE_EVIDENCE_DUPLICATE_FIELD", key);
    fieldEvidenceByKey.set(key, evidence);
    return evidence;
  });
  fieldEvidence.sort((left, right) => fieldKey(left.fieldRef).localeCompare(fieldKey(right.fieldRef)));
  const catalogueBody = {
    schema: `${STARCRAFT_TMG_OFFICIAL_SOURCE_EVIDENCE_REGISTRY_V3_VERSION}.field-evidence-catalogue`,
    sourceBindingHash: options.sourceBinding.bindingHash,
    reviewedBindingHash: binding.bindingHash,
    fieldEvidenceHashes: fieldEvidence.map((entry) => entry.evidenceHash),
    fieldCount: fieldEvidence.length,
  };
  const fieldEvidenceCatalogueHash = hashStarcraftTmgContract(catalogueBody);
  const sources = sourceCatalogue(options, binding);
  const rightsSourceIds = new Set(sources.map((source) => source.sourceId));
  rightsSourceIds.add("starcraft-tmg.community.firestore-content");
  rightsSourceIds.add("project-d.starcraft-tmg.legacy-data-pack-v0");
  const countsByAuthorityDisposition = {};
  for (const evidence of fieldEvidence) {
    countsByAuthorityDisposition[evidence.authorityDisposition] =
      (countsByAuthorityDisposition[evidence.authorityDisposition] || 0) + 1;
  }
  const recordCountsByDisposition = Object.fromEntries([
    "official_current_product_candidate",
    "official_rule_prose_review_required",
    "community_display_only",
  ].map((disposition) => [
    disposition,
    options.dataset.recordIndex.filter((entry) => entry.authorityDisposition === disposition).length,
  ]));
  const inspectionBody = {
    schema: `${STARCRAFT_TMG_OFFICIAL_SOURCE_EVIDENCE_REGISTRY_V3_VERSION}.inspection`,
    bindingHash: binding.bindingHash,
    fieldEvidenceCatalogueHash,
    sourceLockHash: binding.sourceLockHash,
    sourceSnapshotHash: binding.sourceSnapshotHash,
    officialDatasetHash: binding.officialDatasetHash,
    sources: {
      current: sources.filter((source) => source.currentCaptureBound === true).length,
      historicalEvidenceVersions: sources.filter((source) => source.currentCaptureBound === false).length,
      catalogue: sources,
    },
    coverage: {
      records: options.dataset.recordIndex.length,
      fields: fieldEvidence.length,
      recordCountsByDisposition,
      fieldCountsByAuthorityDisposition: Object.fromEntries(
        Object.entries(countsByAuthorityDisposition).sort(([left], [right]) => left.localeCompare(right)),
      ),
      currentRecordLocators: options.dataset.recordIndex.length,
      productRecordsWithP2pHistory: p2p.rebound.size,
      productFieldsWithP2pHistory: countsByAuthorityDisposition.official_current_product_candidate,
      p2pPageLocators: p2p.locatorCount,
      ruleSectionRecordsWithPageRanges: ruleLocatorByRecordKey.size,
      ruleFieldsWithPageRanges: countsByAuthorityDisposition.official_rule_prose_review_required,
      coreStructuralAnchors: coreAudit.counts.anchors,
      faqCurrentEntries: faq.currentById.size,
      faqHistoricalEntries: faq.historicalById.size,
      faqDriftedEntries: faq.driftedEntryIds.length,
    },
    precedence: clone(binding.precedencePolicy),
    rights: {
      policy: clone(binding.rightsPolicy),
      unresolvedCurrentSources: sources.filter((source) => source.currentCaptureBound === true).length,
      rawContentIncludedInPublicEvidence: false,
      publicReleaseGatePassed: false,
    },
    sourceRefreshPolicy: "explicit_user_command_only",
    repositoryFallbackAllowed: false,
    legacyFallbackAllowed: false,
    productionReady: false,
    canAffectRules: false,
    trainingTruth: false,
  };
  const inspection = deepFreeze({
    ...inspectionBody,
    inspectionHash: hashStarcraftTmgContract(inspectionBody),
  });

  function inspect() {
    return inspection;
  }

  function getFieldEvidence(input = {}) {
    return fieldEvidenceByKey.get(fieldKey(input)) || null;
  }

  function getFaqEntryEvidence(input = {}) {
    const version = String(input.version || "current");
    const entryId = String(input.entryId || "");
    if (!['current', 'historical'].includes(version)) fail("OFFICIAL_SOURCE_FAQ_VERSION_UNSUPPORTED");
    const entry = version === "current" ? faq.currentById.get(entryId) : faq.historicalById.get(entryId);
    if (!entry) return null;
    const historicalReview = faq.exactById.get(entryId);
    return deepFreeze({
      schema: `${STARCRAFT_TMG_OFFICIAL_SOURCE_EVIDENCE_REGISTRY_V3_VERSION}.faq-entry-evidence`,
      version,
      sourceId: version === "current" ? CURRENT_FAQ_SOURCE_ID : HISTORICAL_FAQ_SOURCE_ID,
      sourceLocator: { categoryId: "9", entryId, bodyIncluded: false },
      entryIndex: clone(entry),
      reviewStatus: version === "current"
        ? "quarantined_semantic_drift"
        : "historical_display_and_pinned_replay_dependency_only",
      historicalReview: version === "historical" ? {
        disposition: historicalReview?.disposition || "display_only",
        relation: historicalReview?.relation || "non_normative_product_faq",
        clauseLocatorRefs: (historicalReview?.clauseLinks || []).map((link) => ({
          clauseId: link.clauseId,
          anchorId: link.anchorId,
          sourcePart: link.sourcePart,
        })),
      } : null,
      mayOverrideCoreRules: false,
      rawContentIncluded: false,
      redistributionAllowed: false,
      canAffectRules: false,
      trainingTruth: false,
    });
  }

  function resolvePrecedence(input = {}) {
    return precedenceResolution(input, binding);
  }

  function checkRedistribution(input = {}) {
    const sourceId = String(input.sourceId || "");
    const requestedUse = String(input.requestedUse || "");
    if (!rightsSourceIds.has(sourceId)) fail("OFFICIAL_SOURCE_RIGHTS_SOURCE_UNSUPPORTED", sourceId);
    if (!REDISTRIBUTION_USES.has(requestedUse)) {
      fail("OFFICIAL_SOURCE_RIGHTS_USE_UNSUPPORTED", requestedUse);
    }
    const metadataOnly = requestedUse === "provenance_metadata_only";
    return deepFreeze({
      schema: `${STARCRAFT_TMG_OFFICIAL_SOURCE_EVIDENCE_REGISTRY_V3_VERSION}.rights-decision`,
      sourceId,
      requestedUse,
      allowed: metadataOnly,
      decisionBasis: metadataOnly
        ? "content_free_hash_locator_status_envelope"
        : "independent_rights_and_redistribution_review_not_passed",
      sourceBodyIncluded: false,
      legalOwnershipClaimed: false,
      productionReleaseGatePassed: false,
      trainingTruth: false,
    });
  }

  return Object.freeze({
    inspect,
    getFieldEvidence,
    getFaqEntryEvidence,
    resolvePrecedence,
    checkRedistribution,
  });
}
