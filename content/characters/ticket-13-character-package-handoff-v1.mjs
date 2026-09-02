import { hashStarcraftTmgContract } from
  "../../packages/authoritative-engine/transition-v1.mjs";

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

const unsigned = {
  schemaVersion: "starcraft_tmg_ticket_13_character_package_handoff_v1",
  ticket: 13,
  createdAt: "2026-09-03T02:30:00.000Z",
  frozenIdentities: {
    characterPackageHash: "ab238d95ff95c4e69bcabb2abf88cc3daea3edf5a79a732aea30893739cdb246",
    historicalJsonAdapterSourceHash: "14e30a6af293b14a7a0875f1c7f6f33056c23caef71f2c34cae33d25d436f510",
    pngStandardBindingHash: "8143ffca7853f5c0f787c305f347c20e86c3e3e4b81fbe599d19db65b3ebc254",
    personaCatalogueHash: "f4dad5c90405580ec40428d993e0e144f50cac844e65e40f8491d48ad7ff3f81",
    personaVisualBindingHash: "7188cf46173f6c5e8244cddbdbe40e549dbeb05efaf4dd27c45827b3b2c667ea",
    dynamicPortraitManifestHash: "5d117dbe1e21ab89129027e31f3c21ca46923bd6f7a0d5dfa55009b458b82f36",
    sharedPresentationContentHash: "5567f51acb3a8fb90d24399bf5c289fcbbbd243af88ad3f00565501fbd4163cc",
    adversarialSuiteHash: "e25fb18f8fce1a0d734c297293d68a167dcea2d5b51b1ca7894eef3b152a430c",
  },
  ticket14MountInterface: {
    owner: "ticket-14-web-app-client",
    consumes: [
      {
        module: "packages/character-agent/character-persona-selector-v1.mjs",
        exports: ["createStarcraftTmgCharacterPersonaSelectorV1"],
        purpose: "server-hash-bound persona selection and revision-CAS intent",
      },
      {
        module: "packages/character-agent/character-presentation-v1.mjs",
        exports: [
          "createStarcraftTmgCharacterPresentationViewModelV1",
          "renderStarcraftTmgCharacterPresentationHtmlV1",
          "renderStarcraftTmgCharacterPresentationNativeTreeV1",
          "STARCRAFT_TMG_CHARACTER_PRESENTATION_CSS_V1",
          "STARCRAFT_TMG_CHARACTER_PRESENTATION_WEB_RUNTIME_V1",
        ],
        purpose: "shared semantic Web/App presentation and bounded portrait playback",
      },
      {
        module: "packages/character-agent/character-card-v2-png-adapter-v2.mjs",
        exports: [
          "exportStarcraftTmgCharacterCardV2Png",
          "importStarcraftTmgCharacterCardV2Png",
        ],
        purpose: "bounded Character Card V2 PNG import and export",
      },
    ],
    mustProduce: [
      "actual_web_shell_mount_and_browser_evidence",
      "actual_app_shell_mount_and_native_device_evidence",
      "shared_selection_intent_transport_with_expected_revision",
      "offline_read_only_and_public_rights_fallback_evidence",
      "responsive_and_accessibility_evidence_without_board_geometry_backflow",
    ],
    cannotOwn: [
      "rules_legality",
      "room_apply",
      "provider_credentials",
      "skill_generation",
      "training_truth",
    ],
  },
  ticket15OnlineAgentInterface: {
    owner: "ticket-15-online-agent-session",
    consumes: [
      {
        module: "packages/product-composition/character-session-factory-v1.mjs",
        exports: ["createStarcraftTmgConfiguredCharacterSessionFactory"],
        purpose: "rights-gated CharacterPackage and worldbook session input",
      },
      {
        module: "packages/character-agent/openai-compatible-provider-v1.mjs",
        exports: ["createStarcraftTmgOpenAiCompatibleProviderTransport"],
        purpose: "one-attempt bounded OpenAI-compatible BYOK transport",
      },
    ],
    mustProduce: [
      "explicit_per_session_byok_consent_and_detach",
      "credential_isolation_and_no_persistence_evidence",
      "live_provider_model_and_version_receipt_when_user_authorizes_a_call",
      "tutor_opponent_commentator_companion_mode_evidence",
      "viewer_scoped_room_projection_and_human_confirmed_opponent_apply",
    ],
    cannotOwn: [
      "rules_legality",
      "unconfirmed_room_apply",
      "hidden_opponent_state",
      "skill_generation_or_dsh",
      "training_truth",
    ],
  },
  laterTicketBoundaries: {
    skillGenerationStartsAtTicket: 17,
    dshMayRunOnlyForSkillGeneration: true,
    largeScaleSkillProductionRequiresFreshUserConfirmation: true,
    muzeroAndSelfPlayRemainLaterTickets: true,
  },
  releaseState: {
    frameworkMounted: false,
    liveProviderEvaluated: false,
    kerriganDerivedVisualsPublicReleaseAllowed: false,
    productionReady: false,
  },
};

export const STARCRAFT_TMG_TICKET_13_CHARACTER_PACKAGE_HANDOFF_V1 = deepFreeze({
  ...unsigned,
  handoffHash: hashStarcraftTmgContract(unsigned),
});
