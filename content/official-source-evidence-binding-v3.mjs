import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";

export const STARCRAFT_TMG_OFFICIAL_SOURCE_EVIDENCE_BINDING_V3_SCHEMA =
  "starcraft_tmg_official_source_evidence_binding_v3";

const body = {
  schema: STARCRAFT_TMG_OFFICIAL_SOURCE_EVIDENCE_BINDING_V3_SCHEMA,
  gameId: "starcraft-tmg",
  sourceLockHash: "1adbdb652fafc09d01887981a3ae86f69e65e1f1480d804156a8da1d4d1757a1",
  sourceSnapshotHash: "8828471846f5befa2e7eb464d64dfebf834e7aba5c1908381a44b29f5529e105",
  officialDatasetHash: "b2579b83bb9a77b6119730009725a34d4e828d92d302248243bab33863551067",
  reviewedRuleSourceManifestHash:
    "298df219f7de531231d562c62b6efd0b83c740ea4dc69c5087946aeb9e924ed8",
  reviewedCoreAnchorIndexHash:
    "9c669c64d2dc5994ca486379f3d92bc8018682152edff33071405ae70b733de1",
  reviewedHistoricalP2pAliasIndexHash:
    "cedbb93bba3ef7de1fe5d9d1a663482f805a607935b49db69fa9cbcafdd4b1ac",
  coreRulebookContentHash:
    "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54",
  historicalFaq: {
    receiptHash: "18bdfbd2e298eb7c6a360ca47d30e61ab4ba59b198ce1df0d082d28780f9984d",
    semanticContentHash:
      "e894f5f0a7da88776df7e399d2156acf69cc40284c1f231907f28dd990b0cd92",
    exactReconciliationHash:
      "eb52639675901921422991dd9cb0d192a9436af5990af6c3b3891ca657e3432f",
    supplementalReconciliationHash:
      "6d1e52f52c47f002cc0dfcb0701041ebbbae7044c7c6aeb096a81073ba5d3b40",
    retention: "historical_display_and_pinned_replay_dependency_only",
  },
  currentFaq: {
    lockRawByteHash:
      "349319ecb03e5364a25ea6c828ca2b898ab9d8c399df76a8a30e34d74ecd2650",
    decodedTextHash:
      "caa0483392e93fd8f62124ec4c0568389b606c2a19ee9553cde73d66439a8301",
    receiptHash: "3184b66c88ad7f8bf2c8022e6e0006f3c074689f2a852d0bf7770e99ca12c336",
    semanticContentHash:
      "2204754f8a677685505e7e12ea10fccffe5427fdba19cf4ac56d448cad2dafd2",
    semanticByteLength: 2269,
    reviewStatus: "quarantined_semantic_drift",
    mayReuseHistoricalReconciliation: false,
  },
  ruleSectionLocators: [
    { recordKey: "rules_sections:Kvng3lPQiUcJoqJPUUT5", payloadHash: "21d99d0d9ba448282518ed3483879bbeef81ea2cad96394654e6aa400eeda3ee", titleHash: "a2e9c64ed1f69ef000239e3a88ea98c729b878c77588237d526ba19968c788f5", fromPdfPage: 1, toPdfPage: 1, matchBasis: "reviewed_cover_title" },
    { recordKey: "rules_sections:wVaoY2tVVZ4NjMCOr7ZN", payloadHash: "5ef4dbdd9e7469419fb20468011ad9ebeee60a573de4fd025384daeb36129ed5", titleHash: "7f570c906dd321a534dc0b98e104320247a01eb3bb7b19211a9ef9bf0bfd4c67", fromPdfPage: 6, toPdfPage: 6, matchBasis: "reviewed_exact_heading" },
    { recordKey: "rules_sections:Vf8n82nwpFgPFoTNpYOG", payloadHash: "e8bde9452514c2835701424ebada337d0b343d7a0f3088e83b354cfad88c3c40", titleHash: "7363761bb15b8347dc8beb5e650984f7e807a2d76136657509dcdc1c1aa9fb89", fromPdfPage: 7, toPdfPage: 29, matchBasis: "reviewed_rulebook_part_1_range" },
    { recordKey: "rules_sections:6LXSDb76XGSE7bWxb0ts", payloadHash: "7c3ba719b82f11efb2f7b9c80cf6ce5de9608cc5009f660ab298956a46759568", titleHash: "edc35c48c738d34eeac1c07c9eaa5bf62f1c50577d6c01f193b41906e2afba9b", fromPdfPage: 7, toPdfPage: 29, matchBasis: "reviewed_nested_part_1_heading" },
    { recordKey: "rules_sections:QX7B9DFpviRo84fVCBIj", payloadHash: "615c599d401b8457266c56d1033a4259c0d1f353ba686becab05876a3af66acb", titleHash: "02327c6a969b144d97f43971128e6a71deef613382533e57d8866ac52e4c0678", fromPdfPage: 30, toPdfPage: 32, matchBasis: "reviewed_rulebook_part_2_range" },
    { recordKey: "rules_sections:OszqexisUrSOKMW6TzA5", payloadHash: "b353fcebf8fcf93a7b68f2094d6c9963be8ce7077ebd48fd82eccc746a2e9947", titleHash: "96d18a34fb80c6f8ed3fcfd32266c1af7f64d00c3ef9ca8d97f595bc7b939c6a", fromPdfPage: 33, toPdfPage: 34, matchBasis: "reviewed_rulebook_part_3_range" },
    { recordKey: "rules_sections:I03mzBYujgXw6xN2qXhH", payloadHash: "979cc0d396a9eea15ea533ec137e4097748bf2ec6c89810bb3bf5cae4ae39f4c", titleHash: "5e62dfaa7f114e00b555aba1b01d2774d0b8b3434917977eb83e026c1767c2c7", fromPdfPage: 35, toPdfPage: 39, matchBasis: "reviewed_rulebook_part_4_range" },
    { recordKey: "rules_sections:u3zNStKpd5XegMjmJfMS", payloadHash: "bd1eb44d676bac9a2a2643122f3af1fb90625c29e905aef56b9417f5733f86c5", titleHash: "fda13b77802b55cef668195db257733c449ce65c41a77a5771728b881b484fd6", fromPdfPage: 40, toPdfPage: 45, matchBasis: "reviewed_rulebook_part_5_range" },
    { recordKey: "rules_sections:xLLTUyQm53B1KXj59oLs", payloadHash: "cd86ffb67aa66cbba21d07f0c7a9a578d487a2770bac50f1d1c7d6122dbdff26", titleHash: "94ad5785546e13617ff92da3bfd4a3fd074f4ce09781c7866e297d41d6700a0c", fromPdfPage: 46, toPdfPage: 46, matchBasis: "reviewed_rulebook_part_6_range" },
    { recordKey: "rules_sections:cB7X7UfOMHh3Wxn79ASF", payloadHash: "56c942f90b76d67836accf996e9506a8cb318c631512960ffb83d7635fda96a6", titleHash: "815b17ca314770c191fa990c8b0ae12297caf4dd5e346abd4877c8ff8e403f93", fromPdfPage: 47, toPdfPage: 56, matchBasis: "reviewed_rulebook_part_7_range" },
    { recordKey: "rules_sections:iuUyObNTQ2M8xK4IUqzC", payloadHash: "1544376c9e3da46537ea0bb475fcfc16f1044e2e9bdc27c182df4e66f49d2276", titleHash: "7f34b14ef9022f92a05ed21232f1339c7c8b8aaee87d96069381443fa27faa7d", fromPdfPage: 56, toPdfPage: 74, matchBasis: "reviewed_rulebook_part_8_range" },
    { recordKey: "rules_sections:Rj6sMyNODPQ8OHUc9Clp", payloadHash: "3197f311085315cabe06dcda95a0e2ab3a744d7c97571c9df02d27a27186dc2a", titleHash: "30466c324bb586f352af6d51dabede62313052c09c8b6ecfd713c026929a09b1", fromPdfPage: 75, toPdfPage: 80, matchBasis: "reviewed_rulebook_part_9_range" },
    { recordKey: "rules_sections:H3Fn8YSvEvpJZpT57qw1", payloadHash: "05da4c287b6e7fe8f9f3159269cf668ead93e74f10df49a666a1ee36c521f206", titleHash: "3f04a0a094526bcb5ce28b3af26365566e6f962a018f6971a29974286461eae5", fromPdfPage: 81, toPdfPage: 83, matchBasis: "reviewed_rulebook_part_10_range" },
    { recordKey: "rules_sections:FuahgilWtc8nccVSp2Vv", payloadHash: "4a6aa9e55e3b4197666b0f4fed633269dc42327af16f5b5a5422b7533d7d8973", titleHash: "4d02248b2828355475bc09621845c57f358957f87ae9736e0add4e88266ba3d0", fromPdfPage: 84, toPdfPage: 93, matchBasis: "reviewed_rulebook_part_11_range" },
    { recordKey: "rules_sections:gMXfLyHJfnGYKw2rmoPS", payloadHash: "faf1f3771196090c327ead1144f4015bf2d633b6d90ccc83dc62091c5a3e7b38", titleHash: "8c2b9a8f5bc643d3c40cf4707de9358c4f8c00abe462949a26582f1f927f5a32", fromPdfPage: 94, toPdfPage: 110, matchBasis: "reviewed_rulebook_part_12_range" },
  ],
  precedencePolicy: {
    currentProductValue: "frozen_command_center_wins_p2p_is_history_only",
    generalRule: "room_pinned_rule_kernel_and_frozen_core_rulebook_win",
    faq: "supplemental_only_no_auto_override_current_drift_quarantined",
    community: "display_only_never_official",
    translation: "display_sidecar_never_canonical",
    missingCurrentValue: "quarantine_without_p2p_repository_or_legacy_fallback",
    historicalRoom: "exact_room_source_and_rule_dependencies_win",
  },
  rightsPolicy: {
    publicEnvelope: "hash_locator_status_metadata_only",
    rawSourceRedistributionAllowed: false,
    extractedSourceTextRedistributionAllowed: false,
    sourceImageRedistributionAllowed: false,
    translatedSourceBodyPublicReleaseAllowed: false,
    independentRightsReviewRequired: true,
  },
  sourceRefreshPolicy: "explicit_user_command_only",
  repositoryFallbackAllowed: false,
  legacyFallbackAllowed: false,
  canAffectRules: false,
  trainingTruth: false,
};

export const STARCRAFT_TMG_OFFICIAL_SOURCE_EVIDENCE_BINDING_V3 = Object.freeze({
  ...body,
  bindingHash: hashStarcraftTmgContract(body),
});
