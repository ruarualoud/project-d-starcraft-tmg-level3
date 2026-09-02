import { hashStarcraftTmgClientContract } from "./portable-contract-hash-v1.mjs";

export const STARCRAFT_TMG_CLIENT_SOURCE_LOCALIZATION_PROJECTION_VERSION =
  "starcraft_tmg_client_source_localization_projection_v1";

export const STARCRAFT_TMG_FROZEN_SOURCE_IDENTITIES_V1 = Object.freeze({
  sourceLockHash: "1adbdb652fafc09d01887981a3ae86f69e65e1f1480d804156a8da1d4d1757a1",
  sourceSnapshotHash: "8828471846f5befa2e7eb464d64dfebf834e7aba5c1908381a44b29f5529e105",
  officialDatasetHash: "b2579b83bb9a77b6119730009725a34d4e828d92d302248243bab33863551067",
  roomSourceDependencyContentHash:
    "fa89818b34826462ed10381852b4545c77010b8cdb7d549f6186244a607b848a",
  roomOfficialDatasetDependencyContentHash:
    "a804e73079e0491a1edc5ee3803c857c64ee84e30680afb8b7221ef0009ba2f3",
  localizationDatasetHash: "299b075b83ccd7f4147ed9f1119ae2b54eed58446ea7385399af4373d4abd42c",
  sourceBindingHash: "d653698582c68ff08a36e4837a851225913a769c0ab1ae10f0e0b1a76563c09e",
  fieldCatalogueHash: "a77d47770eef9a6af23bcbe30c53b6499015361aacc098f0eb30a8e8d3cb2305",
  fieldProvenanceCatalogueHash: "41cb286586d7922f4a17772a02c4c64d6992f50c6f06fe6de46b20f8d945c896",
  evidenceBindingHash: "ec02bd875b5439b55d4a7e2f16ce7104a20783956fed2f1985857f43b2745af6",
  evidenceCatalogueHash: "d219325b6e3af2e8f86f75be3832fedf40bb66dacccfbc21f0889bfb1862fc99",
});

export const STARCRAFT_TMG_SOURCE_FRESHNESS_AUDIT_V1 = Object.freeze({
  observedAt: "2026-09-02T20:18:31.000Z",
  observationBasis: "official_primary_source_read_only_audit_not_source_lock_refresh",
  researchEvidenceHash: "d1985b16d341cd17caf4872054a979ecceae325777a5fdb97a6dce22ff7171a1",
  commandCenterOfficialGameplayMatchesFrozen: true,
  officialProductRecordDriftDetected: false,
  communityContentDriftDetected: true,
  officialFaqV1Detected: true,
  officialFaqV1IncludedInFrozenLock: false,
  officialFaqV1ContentHash: "eeeffb7a3a11f7616116bcd0e8fd5a437cd50c47c2454a3c865e32f34783e62c",
  officialFaqV1QuestionCount: 68,
  completeLatestOfficialRulesCorpus: false,
  requiresExplicitSourceRefreshAndReview: true,
});

export const STARCRAFT_TMG_CLIENT_SOURCE_LOCALIZATION_PROJECTION_HASH_V1 =
  "f47c8e7969751cb304b5d5c947b1977206b99f9ad9c9d0b4b04f38e8f5500250";

const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const PROJECTION_KEYS = Object.freeze([
  "schemaVersion",
  "gameId",
  "releaseChannel",
  "source",
  "coverage",
  "freshness",
  "precedence",
  "rights",
  "historicalVersionPolicy",
  "cachePolicy",
  "contentPolicy",
  "capabilities",
  "productionReady",
  "trainingTruth",
  "projectionHash",
]);

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function exactKeys(value, keys) {
  return object(value)
    && Object.keys(value).sort().join("\u0000") === [...keys].sort().join("\u0000");
}

function same(left, right) {
  return hashStarcraftTmgClientContract(left) === hashStarcraftTmgClientContract(right);
}

function fail(code, message = code) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function assertBoundedProjection(value) {
  let nodes = 0;
  function visit(current, depth) {
    nodes += 1;
    if (nodes > 256 || depth > 8) fail("SOURCE_LOCALIZATION_PROJECTION_TOO_LARGE");
    if (typeof current === "string" && current.length > 256) {
      fail("SOURCE_LOCALIZATION_PROJECTION_TOO_LARGE");
    }
    if (Array.isArray(current)) {
      if (current.length > 64) fail("SOURCE_LOCALIZATION_PROJECTION_TOO_LARGE");
      current.forEach((entry) => visit(entry, depth + 1));
      return;
    }
    if (!object(current)) return;
    for (const [key, entry] of Object.entries(current)) {
      if (key.length > 80) fail("SOURCE_LOCALIZATION_PROJECTION_TOO_LARGE");
      visit(entry, depth + 1);
    }
  }
  visit(value, 0);
}

function exactProjectionSubcontracts(projection) {
  const expected = STARCRAFT_TMG_FROZEN_SOURCE_IDENTITIES_V1;
  return same(projection.source, {
    sourceId: "starcraft-tmg.official.command-center",
    sourceLockHash: expected.sourceLockHash,
    sourceSnapshotHash: expected.sourceSnapshotHash,
    officialDatasetHash: expected.officialDatasetHash,
    roomSourceDependencyContentHash: expected.roomSourceDependencyContentHash,
    roomOfficialDatasetDependencyContentHash:
      expected.roomOfficialDatasetDependencyContentHash,
    localizationDatasetHash: expected.localizationDatasetHash,
    sourceBindingHash: expected.sourceBindingHash,
    fieldCatalogueHash: expected.fieldCatalogueHash,
    fieldProvenanceCatalogueHash: expected.fieldProvenanceCatalogueHash,
    evidenceBindingHash: expected.evidenceBindingHash,
    evidenceCatalogueHash: expected.evidenceCatalogueHash,
    dataVersions: { cardsVersion: "69", rulesVersion: "48", unitsVersion: "71" },
    capturedAt: "2026-08-30T06:18:09.287Z",
    sourceRefreshPolicy: "explicit_user_command_only",
    repositoryFallbackAllowed: false,
    legacyFallbackAllowed: false,
  }) && same(projection.coverage, {
    records: 271,
    fields: 1440,
    recordCountsByDisposition: {
      official_current_product_candidate: 83,
      official_rule_prose_review_required: 15,
      community_display_only: 173,
    },
    fieldCountsByAuthorityDisposition: {
      community_display_only: 554,
      official_current_product_candidate: 617,
      official_rule_prose_review_required: 269,
    },
    currentRecordLocators: 271,
    historicalEvidenceVersions: 2,
    currentFaqEntries: 7,
    quarantinedFaqEntries: 7,
  }) && same(projection.precedence, {
    currentProductValue: "frozen_command_center_wins_p2p_is_history_only",
    generalRule: "room_pinned_rule_kernel_and_frozen_core_rulebook_win",
    faq: "supplemental_only_no_auto_override_current_drift_quarantined",
    community: "display_only_never_official",
    translation: "display_sidecar_never_canonical",
    missingCurrentValue: "quarantine_without_p2p_repository_or_legacy_fallback",
    historicalRoom: "exact_room_source_and_rule_dependencies_win",
  }) && same(projection.rights, {
    publicReleaseGatePassed: false,
    unresolvedCurrentSources: 6,
    policy: {
      publicEnvelope: "hash_locator_status_metadata_only",
      rawSourceRedistributionAllowed: false,
      extractedSourceTextRedistributionAllowed: false,
      sourceImageRedistributionAllowed: false,
      translatedSourceBodyPublicReleaseAllowed: false,
      independentRightsReviewRequired: true,
    },
  }) && same(projection.historicalVersionPolicy, {
    olderSourcesRemainDisplayable: true,
    olderSourcesMayOverrideCurrent: false,
    pinnedHistoricalReplayUsesExactDependencies: true,
    silentCompatibilityAllowed: false,
  }) && same(projection.cachePolicy, {
    deviceLocalMetadataOnly: true,
    exactFrozenIdentitiesRequired: true,
    staleMayOnlyRenderProvenance: true,
    maySeedRoomOrDraftValidation: false,
  }) && same(projection.contentPolicy, {
    canonicalTextIncluded: false,
    translatedTextIncluded: false,
    rawSourceBodyIncluded: false,
    sourceImageIncluded: false,
    assetUrlIncluded: false,
    providerMaterialIncluded: false,
    credentialMaterialIncluded: false,
  }) && same(projection.capabilities, {
    readProvenanceMetadata: true,
    readUnreleasedBody: false,
    reviewTranslation: false,
    evaluateRules: false,
    validateRoomAuthority: false,
    provideTrainingTruth: false,
  });
}

function assertFrozenInspection(inspection) {
  const binding = inspection?.sourceBinding;
  const evidence = inspection?.sourceEvidence;
  const expected = STARCRAFT_TMG_FROZEN_SOURCE_IDENTITIES_V1;
  if (!object(inspection)
    || inspection.schemaVersion
      !== "starcraft_tmg_official_source_provenance_runtime_v3.inspection"
    || inspection.ok !== true
    || binding?.gameId !== "starcraft-tmg"
    || binding?.sourceId !== "starcraft-tmg.official.command-center"
    || binding?.sourceLockHash !== expected.sourceLockHash
    || binding?.sourceSnapshotHash !== expected.sourceSnapshotHash
    || binding?.officialDatasetHash !== expected.officialDatasetHash
    || binding?.localizationDatasetHash !== expected.localizationDatasetHash
    || binding?.bindingHash !== expected.sourceBindingHash
    || binding?.fieldCatalogueHash !== expected.fieldCatalogueHash
    || binding?.fieldProvenanceCatalogueHash !== expected.fieldProvenanceCatalogueHash
    || !same(binding?.dataVersions, {
      cardsVersion: "69",
      rulesVersion: "48",
      unitsVersion: "71",
    })
    || binding?.sourceRefreshPolicy !== "explicit_user_command_only"
    || binding?.repositoryFallbackAllowed !== false
    || binding?.translationMayAffectRules !== false
    || binding?.productionReady !== false
    || binding?.trainingTruth !== false
    || inspection.dataset?.hash !== expected.localizationDatasetHash
    || inspection.dataset?.version !== "u71-c69-r48"
    || inspection.dataset?.recordCount !== 271
    || inspection.dataset?.fieldCount !== 1440
    || inspection.dataset?.redistributionAllowed !== false
    || inspection.dataset?.rulesEligible !== false
    || inspection.dataset?.trainingEligible !== false
    || inspection.fieldProvenance?.catalogueHash
      !== expected.fieldProvenanceCatalogueHash
    || inspection.fieldProvenance?.fieldCount !== 1440
    || inspection.sourcePolicy?.sourceRefreshPolicy !== "explicit_user_command_only"
    || inspection.sourcePolicy?.repositoryFallbackAllowed !== false
    || inspection.sourcePolicy?.legacyFallbackAllowed !== false
    || inspection.translation?.canonicalOverwriteAllowed !== false
    || inspection.translation?.dshAllowed !== false
    || evidence?.bindingHash !== expected.evidenceBindingHash
    || evidence?.fieldEvidenceCatalogueHash !== expected.evidenceCatalogueHash
    || evidence?.sourceLockHash !== expected.sourceLockHash
    || evidence?.sourceSnapshotHash !== expected.sourceSnapshotHash
    || evidence?.officialDatasetHash !== expected.officialDatasetHash
    || evidence?.coverage?.records !== 271
    || evidence?.coverage?.fields !== 1440
    || evidence?.rights?.rawContentIncludedInPublicEvidence !== false
    || evidence?.rights?.publicReleaseGatePassed !== false
    || evidence?.sourceRefreshPolicy !== "explicit_user_command_only"
    || evidence?.repositoryFallbackAllowed !== false
    || evidence?.legacyFallbackAllowed !== false
    || inspection.productionReady !== false
    || inspection.trainingTruth !== false) {
    fail("SOURCE_LOCALIZATION_INSPECTION_INVALID");
  }
  return inspection;
}

export function projectStarcraftTmgClientSourceLocalizationV1(inspection) {
  const verified = assertFrozenInspection(inspection);
  const binding = verified.sourceBinding;
  const evidence = verified.sourceEvidence;
  const expected = STARCRAFT_TMG_FROZEN_SOURCE_IDENTITIES_V1;
  const body = {
    schemaVersion: STARCRAFT_TMG_CLIENT_SOURCE_LOCALIZATION_PROJECTION_VERSION,
    gameId: "starcraft-tmg",
    releaseChannel: "metadata_only_rights_pending",
    source: {
      sourceId: binding.sourceId,
      sourceLockHash: binding.sourceLockHash,
      sourceSnapshotHash: binding.sourceSnapshotHash,
      officialDatasetHash: binding.officialDatasetHash,
      roomSourceDependencyContentHash: expected.roomSourceDependencyContentHash,
      roomOfficialDatasetDependencyContentHash:
        expected.roomOfficialDatasetDependencyContentHash,
      localizationDatasetHash: binding.localizationDatasetHash,
      sourceBindingHash: binding.bindingHash,
      fieldCatalogueHash: binding.fieldCatalogueHash,
      fieldProvenanceCatalogueHash: binding.fieldProvenanceCatalogueHash,
      evidenceBindingHash: evidence.bindingHash,
      evidenceCatalogueHash: evidence.fieldEvidenceCatalogueHash,
      dataVersions: clone(binding.dataVersions),
      capturedAt: binding.capturedAt,
      sourceRefreshPolicy: "explicit_user_command_only",
      repositoryFallbackAllowed: false,
      legacyFallbackAllowed: false,
    },
    coverage: {
      records: evidence.coverage.records,
      fields: evidence.coverage.fields,
      recordCountsByDisposition: clone(evidence.coverage.recordCountsByDisposition),
      fieldCountsByAuthorityDisposition: clone(
        evidence.coverage.fieldCountsByAuthorityDisposition,
      ),
      currentRecordLocators: evidence.coverage.currentRecordLocators,
      historicalEvidenceVersions: evidence.sources.historicalEvidenceVersions,
      currentFaqEntries: evidence.coverage.faqCurrentEntries,
      quarantinedFaqEntries: evidence.coverage.faqDriftedEntries,
    },
    freshness: clone(STARCRAFT_TMG_SOURCE_FRESHNESS_AUDIT_V1),
    precedence: clone(evidence.precedence),
    rights: {
      publicReleaseGatePassed: false,
      unresolvedCurrentSources: evidence.rights.unresolvedCurrentSources,
      policy: clone(evidence.rights.policy),
    },
    historicalVersionPolicy: clone(verified.historicalVersionPolicy),
    cachePolicy: {
      deviceLocalMetadataOnly: true,
      exactFrozenIdentitiesRequired: true,
      staleMayOnlyRenderProvenance: true,
      maySeedRoomOrDraftValidation: false,
    },
    contentPolicy: {
      canonicalTextIncluded: false,
      translatedTextIncluded: false,
      rawSourceBodyIncluded: false,
      sourceImageIncluded: false,
      assetUrlIncluded: false,
      providerMaterialIncluded: false,
      credentialMaterialIncluded: false,
    },
    capabilities: {
      readProvenanceMetadata: true,
      readUnreleasedBody: false,
      reviewTranslation: false,
      evaluateRules: false,
      validateRoomAuthority: false,
      provideTrainingTruth: false,
    },
    productionReady: false,
    trainingTruth: false,
  };
  const projectionHash = hashStarcraftTmgClientContract(body);
  if (projectionHash !== STARCRAFT_TMG_CLIENT_SOURCE_LOCALIZATION_PROJECTION_HASH_V1) {
    fail(
      "SOURCE_LOCALIZATION_PROJECTION_PIN_DRIFT",
      `SOURCE_LOCALIZATION_PROJECTION_PIN_DRIFT:${projectionHash}`,
    );
  }
  return deepFreeze({ ...body, projectionHash });
}

export function assertStarcraftTmgClientSourceLocalizationProjectionV1(projection) {
  const expected = STARCRAFT_TMG_FROZEN_SOURCE_IDENTITIES_V1;
  assertBoundedProjection(projection);
  if (!exactKeys(projection, PROJECTION_KEYS)) {
    fail("SOURCE_LOCALIZATION_PROJECTION_INVALID");
  }
  const { projectionHash, ...body } = projection;
  const content = projection.contentPolicy;
  if (projection.schemaVersion !== STARCRAFT_TMG_CLIENT_SOURCE_LOCALIZATION_PROJECTION_VERSION
    || projection.gameId !== "starcraft-tmg"
    || projection.releaseChannel !== "metadata_only_rights_pending"
    || projection.source?.sourceLockHash !== expected.sourceLockHash
    || projection.source?.sourceSnapshotHash !== expected.sourceSnapshotHash
    || projection.source?.officialDatasetHash !== expected.officialDatasetHash
    || projection.source?.roomSourceDependencyContentHash
      !== expected.roomSourceDependencyContentHash
    || projection.source?.roomOfficialDatasetDependencyContentHash
      !== expected.roomOfficialDatasetDependencyContentHash
    || projection.source?.localizationDatasetHash !== expected.localizationDatasetHash
    || projection.source?.sourceBindingHash !== expected.sourceBindingHash
    || projection.source?.fieldCatalogueHash !== expected.fieldCatalogueHash
    || projection.source?.fieldProvenanceCatalogueHash
      !== expected.fieldProvenanceCatalogueHash
    || projection.source?.evidenceBindingHash !== expected.evidenceBindingHash
    || projection.source?.evidenceCatalogueHash !== expected.evidenceCatalogueHash
    || projection.source?.sourceRefreshPolicy !== "explicit_user_command_only"
    || projection.source?.repositoryFallbackAllowed !== false
    || projection.source?.legacyFallbackAllowed !== false
    || projection.coverage?.records !== 271
    || projection.coverage?.fields !== 1440
    || !same(projection.freshness, STARCRAFT_TMG_SOURCE_FRESHNESS_AUDIT_V1)
    || projection.freshness?.completeLatestOfficialRulesCorpus !== false
    || projection.freshness?.requiresExplicitSourceRefreshAndReview !== true
    || projection.freshness?.officialFaqV1IncludedInFrozenLock !== false
    || !exactProjectionSubcontracts(projection)
    || projection.rights?.publicReleaseGatePassed !== false
    || !object(content)
    || Object.values(content).some((value) => value !== false)
    || projection.cachePolicy?.maySeedRoomOrDraftValidation !== false
    || projection.capabilities?.readUnreleasedBody !== false
    || projection.capabilities?.reviewTranslation !== false
    || projection.capabilities?.evaluateRules !== false
    || projection.capabilities?.provideTrainingTruth !== false
    || projection.productionReady !== false
    || projection.trainingTruth !== false
    || !HASH_PATTERN.test(String(projectionHash || ""))
    || projectionHash
      !== STARCRAFT_TMG_CLIENT_SOURCE_LOCALIZATION_PROJECTION_HASH_V1
    || projectionHash !== hashStarcraftTmgClientContract(body)) {
    fail("SOURCE_LOCALIZATION_PROJECTION_INVALID");
  }
  const serialized = JSON.stringify(projection).toLowerCase();
  for (const forbidden of [
    "?token=",
    "authorization",
    "bearer ",
    "apikey",
    "api_key",
    "providercredential",
    "sourceimageurl",
    "http://",
    "https://",
  ]) {
    if (serialized.includes(forbidden)) {
      fail("SOURCE_LOCALIZATION_PROJECTION_CONTENT_LEAK", forbidden);
    }
  }
  return deepFreeze(clone(projection));
}

export function starcraftTmgClientSourceLocalizationCacheKeyV1() {
  return hashStarcraftTmgClientContract({
    schemaVersion: `${STARCRAFT_TMG_CLIENT_SOURCE_LOCALIZATION_PROJECTION_VERSION}.cache-key`,
    sourceLockHash: STARCRAFT_TMG_FROZEN_SOURCE_IDENTITIES_V1.sourceLockHash,
    sourceSnapshotHash: STARCRAFT_TMG_FROZEN_SOURCE_IDENTITIES_V1.sourceSnapshotHash,
    officialDatasetHash: STARCRAFT_TMG_FROZEN_SOURCE_IDENTITIES_V1.officialDatasetHash,
  });
}

export function classifyStarcraftTmgSourceRoomBindingV1(
  projection,
  roomProjection,
) {
  const matchBinding = roomProjection?.matchBinding;
  if (!matchBinding) return "not_bound";
  if (!projection) return "room_pin_visible_source_metadata_unavailable";
  const verified = assertStarcraftTmgClientSourceLocalizationProjectionV1(projection);
  if (matchBinding.sourceSnapshotHash
    !== verified.source.roomSourceDependencyContentHash) {
    return "historical_or_distinct_room_source_dependency_preserved";
  }
  return matchBinding.dataSnapshotHash
    === verified.source.roomOfficialDatasetDependencyContentHash
    ? "current_frozen_projection_matches_room"
    : "current_frozen_source_with_distinct_room_data_dependency";
}
