import { hashStarcraftTmgContract } from
  "../../packages/authoritative-engine/transition-v1.mjs";

const unsigned = {
  schemaVersion: "starcraft_tmg_source_localization_device_migration_binding_v1",
  decisionId:
    "starcraft-tmg.ticket-14.slice-134.source-localization-device-migration.v1",
  createdAt: "2026-09-03T11:00:00.000Z",
  sourceProjection: {
    schemaVersion: "starcraft_tmg_client_source_localization_projection_v1",
    projectionHash:
      "f47c8e7969751cb304b5d5c947b1977206b99f9ad9c9d0b4b04f38e8f5500250",
    sourceLockHash:
      "1adbdb652fafc09d01887981a3ae86f69e65e1f1480d804156a8da1d4d1757a1",
    sourceSnapshotHash:
      "8828471846f5befa2e7eb464d64dfebf834e7aba5c1908381a44b29f5529e105",
    officialDatasetHash:
      "b2579b83bb9a77b6119730009725a34d4e828d92d302248243bab33863551067",
    roomSourceDependencyContentHash:
      "fa89818b34826462ed10381852b4545c77010b8cdb7d549f6186244a607b848a",
    roomOfficialDatasetDependencyContentHash:
      "a804e73079e0491a1edc5ee3803c857c64ee84e30680afb8b7221ef0009ba2f3",
    localizationDatasetHash:
      "299b075b83ccd7f4147ed9f1119ae2b54eed58446ea7385399af4373d4abd42c",
    dataVersions: {
      unitsVersion: "71",
      cardsVersion: "69",
      rulesVersion: "48",
    },
    records: 271,
    fields: 1440,
    metadataOnly: true,
    sourceBodyIncluded: false,
    translationBodyIncluded: false,
    sourceImageIncluded: false,
    repositoryFallbackAllowed: false,
    legacyFallbackAllowed: false,
    sourceRefreshPolicy: "explicit_user_command_only",
    roomAuthority: false,
    rulesAuthority: false,
    trainingTruth: false,
  },
  latestOfficialAudit: {
    evidencePath: "docs/research/official-latest-data-audit-2026-09-03.md",
    evidenceHash:
      "d1985b16d341cd17caf4872054a979ecceae325777a5fdb97a6dce22ff7171a1",
    observedAt: "2026-09-02T20:18:31.000Z",
    commandCenterOfficialGameplayMatchesFrozen: true,
    officialProductRecordDriftDetected: false,
    communityContentDriftDetected: true,
    officialFaqV1Detected: true,
    officialFaqV1IncludedInFrozenLock: false,
    officialFaqV1ContentHash:
      "eeeffb7a3a11f7616116bcd0e8fd5a437cd50c47c2454a3c865e32f34783e62c",
    officialFaqV1QuestionCount: 68,
    completeLatestOfficialRulesCorpus: false,
    requiresExplicitSourceRefreshAndReview: true,
    sourceLockRefreshed: false,
  },
  clientMount: {
    interfaceExtension: "source_localization_v1",
    optIn: true,
    explicitRefreshIntent: "refresh_source_localization",
    automaticRefreshOnMount: false,
    automaticRefreshOnRoomChange: false,
    automaticRefreshOnLifecycleChange: false,
    fixedHttpPath: "/starcraft-tmg-level3/source/client/v1/projection",
    httpBodyLimitBytes: 65536,
    chunkedResponsesAreIncrementallyBounded: true,
    httpsRequiredExceptLoopback: true,
    webAppSemanticParity: true,
    offlineMetadataCache: true,
    cacheMaySeedRoomOrDraftValidation: false,
    corruptCachePolicy: "remove_and_fail_closed",
    historicalRoomPolicy:
      "display_exact_room_source_binding_without_overriding_current",
    historicalRulesDisplay:
      "explicit_read_exact_match_binding_artifact_or_quarantine_without_fallback",
  },
  deviceMigration: {
    schemaVersion: "starcraft_tmg_device_data_migration_v1",
    fixedLegacyKeyCount: 9,
    scanIsReadOnly: true,
    scanRequiresExplicitUserAction: true,
    importRequiresSecondExplicitUserConfirmation: true,
    originalsPreserved: true,
    originalKeysModified: [],
    targetGeneration:
      "@project-d/starcraft-tmg/compatibility/v1/generations/{scanHash}",
    publicationOrder:
      "immutable_records_then_verified_generation_then_manifest_pointer_last",
    retryPolicy: "same_scan_idempotent_without_rewrite",
    concurrentPolicy: "single_flight_per_storage_adapter",
    changedBytesPolicy: "rescan_required_before_and_after_generation_writes",
    publishedGenerationPolicy: "exactly_one_manifest_pointer_never_replaced",
    oversizedSourcePolicy:
      "preserve_and_require_separate_isolation_without_publishing_migration",
    armyDraftPolicy:
      "quarantine_without_derived_stats_costs_keywords_or_rules_pending_current_validation",
    historicalMatchPolicy:
      "read_only_score_and_round_summary_without_identity_room_state_or_capability",
    legacySourcePolicy: "hash_only_quarantine_never_fallback",
    legacyTranslationPolicy:
      "hash_only_quarantine_pending_canonical_id_mapping_and_review",
    currentPreferencesOverwriteAllowed: false,
    currentDiceOverwriteAllowed: false,
    storageReadFailurePolicy: "surface_explicit_failure_without_unhandled_rejection",
    mayRestoreRoom: false,
    mayCreateReplay: false,
    muzeroEligible: false,
  },
  trackedProduct: {
    deletedLegacyCurrentSourcePaths: [
      "apps/starcraft-tmg-expo/assets/data/bundled-data.json",
      "apps/starcraft-tmg-expo/lib/bundled-data-loader.ts",
      "apps/starcraft-tmg-expo/lib/firebase-fetch.ts",
      "apps/starcraft-tmg-expo/scripts/sanitize-bundled-data.js",
      "apps/starcraft-tmg-expo/tools/export-data-pack.js",
    ],
    settingsShowsProvenanceAndFreshness: true,
    webConfirmationUsesInlineAlertSemantics: true,
    migrationShowsOnlyClassificationMetadata: true,
    officialCatalogueBodyUnavailableFailsClosed: true,
    legacyRuleDisplaysRetained: true,
    legacyRuleExecutionEnabled: false,
  },
  evidence: {
    reportPath:
      "build/ticket-14-slice-134-source-localization-device-migration-v1/report.json",
    reportHash:
      "af883c68c513129ed8ff8c09aef209439db91297a92af0aa96b5eb14e0234d70",
    previewPath:
      "build/ticket-14-slice-134-source-localization-device-migration-v1/preview.html",
    previewHash:
      "8936affd38395a794929947fe6392c56813b6c99728a5fa9f7003e69768eb9b4",
    migrationManifestHash:
      "8f9a920558427dc96a8e31be20e6f05589d158d4be8ce9e8bcfe53df6cacff94",
    focusedSourceAndMigrationAssertions: "23/23",
    productReactAssertions: "9/9",
    clientDomainRegressionAssertions: "17/17",
    typeScriptErrors: 0,
  },
  promotion: {
    providerCalled: false,
    skillGenerated: false,
    dshRun: false,
    muzeroDataGenerated: false,
    selfPlayRun: false,
    trainingPromotion: false,
    productionReady: false,
    trainingTruth: false,
  },
  harness: {
    harnessLoopUsed: true,
    contractChanged:
      "optional_source_metadata_projection_and_explicit_local_migration",
    operations: [
      "read_source_localization_projection",
      "refresh_source_localization_explicitly",
      "scan_fixed_legacy_storage_keys",
      "confirm_sanitized_compatibility_generation",
      "read_published_migration_manifest",
    ],
    observableTraces: [
      "web_app_hash_identical_source_projection",
      "offline_verified_metadata_cache",
      "corrupt_cache_fail_closed",
      "two_step_web_migration_confirmation",
      "storage_read_failure_surfaces_as_explicit_client_state",
      "all_staging_write_boundaries_recover_without_partial_publication",
    ],
    rollbackOrRejectionRules: [
      "projection_hash_or_frozen_identity_drift_rejects_projection",
      "unreviewed_faq_may_not_be_promoted_by_client_refresh",
      "changed_legacy_bytes_require_rescan",
      "partial_generation_without_valid_manifest_is_invisible",
      "legacy_source_body_or_rule_execution_reopens_slice_134",
    ],
  },
};

export const STARCRAFT_TMG_SOURCE_LOCALIZATION_DEVICE_MIGRATION_V1 =
  Object.freeze({
    ...unsigned,
    bindingHash: hashStarcraftTmgContract(unsigned),
  });
