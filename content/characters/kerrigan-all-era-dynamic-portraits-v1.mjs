import { hashStarcraftTmgContract } from
  "../../packages/authoritative-engine/transition-v1.mjs";
import { createStarcraftTmgDynamicDialoguePortraitManifestV1 } from
  "../../packages/character-agent/dynamic-dialogue-portrait-v1.mjs";
import { createStarcraftTmgVisualGenerationReceiptV1 } from
  "../../packages/character-agent/visual-generation-receipt-v1.mjs";
import {
  KERRIGAN_DYNAMIC_DIALOGUE_PORTRAIT_V1,
  KERRIGAN_SC1_DIALOGUE_GENERATION_RECEIPTS_V1,
  KERRIGAN_SC1_NEUTRAL_RECEIPT_V1,
} from "./kerrigan-dynamic-dialogue-portrait-v1.mjs";
import {
  KERRIGAN_BROOD_WAR_ERA_RECEIPT_V1,
  KERRIGAN_HOTS_DEINFESTED_ERA_RECEIPT_V1,
  KERRIGAN_LOTV_COALITION_ERA_RECEIPT_V1,
  KERRIGAN_LOTV_XELNAGA_ERA_RECEIPT_V1,
  KERRIGAN_OVERMIND_INFESTED_ERA_RECEIPT_V1,
  KERRIGAN_TERRAN_GHOST_ERA_RECEIPT_V1,
  KERRIGAN_WOL_QUEEN_ERA_RECEIPT_V1,
} from "./kerrigan-era-visuals-v1.mjs";

const CHARACTER_ID = "starcraft.sarah_kerrigan";
const USER_DIRECTIVE_ID = "user.2026-09-03.animate-all-eight-kerrigan-eras";
const STYLE_PROFILE_ID = "starcraft-kerrigan-era-dynamic-highres-2d-v1";
const FRAME_ROLES = Object.freeze(["neutral", "blink", "speaking", "warning", "reflect"]);
const GENERATED_ROLES = Object.freeze(FRAME_ROLES.filter((role) => role !== "neutral"));

export const KERRIGAN_ALL_ERA_DYNAMIC_TRIGGER_POLICY_V1 = Object.freeze({
  schemaVersion: "starcraft_tmg_kerrigan_all_era_dynamic_trigger_policy_v1",
  engineCount: 1,
  personaManifestCount: 8,
  semanticFrameRoleCountPerPersona: 5,
  totalFrameCount: 40,
  usage: Object.freeze({
    idle: "neutral_with_sparse_double_blink_only_while_visible",
    listening: "neutral_with_single_natural_blink",
    thinking: "reflect_with_brief_blink_and_neutral_return",
    speaking: "neutral_or_cue_frame_alternating_with_speaking_after_provider_output_is_accepted",
    waiting_confirmation: "warning_hold_until_human_confirms_or_cancels",
    error: "warning_and_neutral_signal_loss_sequence",
  }),
  activation: Object.freeze({
    serverOwnsModePhaseAssetAndTiming: true,
    providerMaySuggestOnlyModeAllowlistedCue: true,
    animateOnlyVisibleSelectedPersona: true,
    suspendWhenOffscreenOrBackgrounded: true,
    preloadSelectedPersonaOnly: true,
    lazyLoadOtherPersonas: true,
    runtimeImageGeneration: false,
    perUtteranceImageGeneration: false,
  }),
  fallbacks: Object.freeze({
    reducedMotion: "one_server_selected_static_frame_with_zero_duration",
    offline: "sealed_selected_persona_frames_if_cached_otherwise_static_neutral_read_only",
    missingFrame: "labeled_portrait_unavailable_never_reuse_another_era",
    publicRightsBlocked: "project_d_original_tactical_adjutant",
  }),
  expansionRule: "five_roles_are_the_current_demo_minimum_add_phoneme_or_emotion_sets_only_with_a_separate_versioned_contract",
  authority: Object.freeze({
    canOverrideRules: false,
    canMutateRoom: false,
    canCreateTrainingTruth: false,
    skillGenerationTriggered: false,
    dshTriggered: false,
  }),
});

const OUTPUTS = Object.freeze({
  "sc1-terran-ghost": Object.freeze({
    blink: ["abd18d5a78f1d710977bd9f2802c5c768390d3198d60e6fbaa218337dad5b1da", 1731714, "exec-07c93f22-75bb-4f4a-a51e-40881b7a917d.png"],
    speaking: ["24605aba8ab51e4769cd1c5e78dceb1d6dcd41becad741a74189c753bca9f4ea", 1815544, "exec-8f783c41-365c-47a8-93f4-bc052cd16e86.png"],
    warning: ["1484906bfb844772a97dac3a5b880fff0287ae3b3e310a109a08a4e7a2df5b9d", 1933067, "exec-e609ed56-5617-4159-bc7a-165ef19102b6.png"],
    reflect: ["f8a1b189235574be920035ed38a9e3a4250fc36e85b90dc8d380bd67de2a21f7", 1813812, "exec-a5ffc2e5-70a7-4974-be9d-c887a3ccb4ee.png"],
  }),
  "sc1-overmind-infested": Object.freeze({
    blink: ["b71f0db1e8444b4899368f9cd94ecbadf2c53f4135bd6d322125711a370d763e", 2056645, "exec-d0713828-c750-4b2a-8348-80dead28a24f.png"],
    speaking: ["19cf964f89d90ffd276a03375b27b282ffe6c0293bfb8be9443fae0dacf63782", 2099600, "exec-599f2bbf-22b7-4370-84ac-bfc95238b404.png"],
    warning: ["bb917efaf2cc25e0341a825240a20558172cfcde3165cf37da7050bf86277153", 2140337, "exec-2c7b8467-14ed-4016-b89b-29fc286bc50f.png"],
    reflect: ["0356e16b44513605a56a72d5fa39942a9492f4ab6cd494835e64a1cd7e7cdb26", 2033049, "exec-6acca16a-4354-40fb-b2ea-c5d5ca468c68.png"],
  }),
  "brood-war-queen": Object.freeze({
    blink: ["555040096ab1142e146e28b751c1d3ae1aa9eaa7f41cdb20a0b3d8a79b602d2c", 2189180, "exec-e1b14168-d7c3-491e-8042-e043d4510a0d.png"],
    speaking: ["fac1fa0ed43374ce734c426be4a08fa0f9ab001cddf78d726f8ac83faf83bc0b", 2206218, "exec-5395baa2-768d-4896-b348-c980e2e97581.png"],
    warning: ["5bba47c529dbba67e0c5465ae1835b7165e8b2f440891b87faf4c6fa7de456fa", 2146055, "exec-3c85332e-6e23-44b8-9705-2a58e79b17f4.png"],
    reflect: ["34b46c1d9170a860248658fdaf8343ce5af96bd564da05dcee5f2cc290bcd900", 2111766, "exec-d18634f7-43d7-4343-91f7-3cbaed06bfef.png"],
  }),
  "wol-queen": Object.freeze({
    blink: ["2be3b6beda5b6acd0b3949c05558fbe26c26a3538cae9fd0b1612b18fe2e8b79", 2102584, "exec-96620dcf-3c1b-4dff-8d53-fecae1d4addb.png"],
    speaking: ["85782a4ef39ac9a7af15f05fadb54ae7531f2f5a650109c26acb2b40cd8e50b3", 2041592, "exec-af5f5170-ae65-46c1-bd7d-1a0913e88dd9.png"],
    warning: ["278aa378f6d5ba8f0e8cc3927f5a2b44045edb1b6d7d77d8f45740e7f88ced54", 2065274, "exec-a39f4eb7-054d-4c46-9c1d-f249e0c96231.png"],
    reflect: ["32e467067da1bba99c7d731b235c92365ab50cbcc020e09a949cb42915cbcbfd", 2020256, "exec-3e41f720-d262-42a4-9d37-daf4989fea55.png"],
  }),
  "hots-deinfested": Object.freeze({
    blink: ["041bf79a5dd4b4ad5e92cbdce80d062683836cba4f9e64eb8217685abe1b4f75", 1971748, "exec-1d6a1b01-cef8-4011-8252-31a4848b5287.png"],
    speaking: ["d3eafa6de35e2072f6c1336e1cbf615d7b47f753b4e2107dd9e3a6d776116acb", 1897773, "exec-02864b8e-7d0f-45af-818c-8f037f13649d.png"],
    warning: ["f0da5d2e87cb1efadcc1289f8ae099cd06b4c31530ec4284868842be7f2016ed", 1879068, "exec-4715e59f-474a-4e8c-a92a-6d04a84f92e9.png"],
    reflect: ["f5c533ed47982d28e8523e9903b63770ec3e274e0ae8396c5a2bd704adb44259", 2059744, "exec-05cee6b6-26a2-452c-8714-c31299fcbd91.png"],
  }),
  "lotv-coalition": Object.freeze({
    blink: ["acc419ce6376a00fe04b5b9bfc84539c8b9f2d39fdb13dc30203adbc90b567b4", 2177793, "exec-9a1ac19f-b478-4348-ad80-feadc1f585bd.png"],
    speaking: ["0adb58051c28ff4025b63f735c8a964891c42424ee1901d0dd05b60e824d1aba", 2093045, "exec-e05fdd75-e1f4-4212-91a6-7ec6f593076d.png"],
    warning: ["5a473041f49e9028693747a6b57e96b1875bb8e71dcb8894302c7626d661c9c4", 2075409, "exec-82c2d59d-018b-44be-bc57-fdf3cc2ac4dd.png"],
    reflect: ["0c3122e5a3542b0ee1963c827f96e193be811188b2ce11cc080f5809c2ae2d0d", 2352394, "exec-9ee33299-c598-4dff-9b64-9b15d080fb43.png"],
  }),
  "lotv-xelnaga": Object.freeze({
    blink: ["721bb3110612733d898244199dceb9778405b25efaba85b0506b051aa3b3ba36", 2655370, "exec-5afdff8d-0c28-43a2-b6d0-cc54f119890e.png"],
    speaking: ["6e59adc0a3ddfdfe0c179dbff9ab0591854fbfbde8bb4c8d11ed9443b19c5a54", 2660477, "exec-fb95e600-7ac6-46a2-830f-431288552f54.png"],
    warning: ["d09dea3514c826013ffa2a6b6dc42e6e5a6f357dc1c8a96dfcecd73496227b84", 2492041, "exec-87fa4f0c-7696-482c-a16e-65b1072b5fa0.png"],
    reflect: ["ce8050aa004a5d42adbf77f234840b6df7459047ca7798a75d5061dd4dfbf0ac", 2727087, "exec-62e79b25-0bbd-4a89-951d-6d2c9872f3d3.png"],
  }),
});

const ERA_CONFIGS = Object.freeze([
  {
    personaWorldbookId: "sc1.terran_ghost.pre_tarsonis",
    personaState: "sc1.terran_ghost.pre_tarsonis",
    slug: "sc1-terran-ghost",
    era: "pre-Tarsonis human Terran Ghost Sarah Kerrigan",
    preserve: "red swept-back human hair, green eyes, Ghost suit, straps, natural shoulders and Terran bunker background",
    neutralReceipt: KERRIGAN_TERRAN_GHOST_ERA_RECEIPT_V1,
  },
  {
    personaWorldbookId: "sc1.infested.overmind_char",
    personaState: "sc1.infested.overmind_char",
    slug: "sc1-overmind-infested",
    era: "StarCraft I Overmind-controlled newly infested Sarah Kerrigan",
    preserve: "early heavy tendrils, amber eyes, asymmetric brown-black living plates, natural shoulders and Overmind hive background",
    neutralReceipt: KERRIGAN_OVERMIND_INFESTED_ERA_RECEIPT_V1,
  },
  {
    personaWorldbookId: "brood_war.independent_queen",
    personaState: "brood_war.independent_queen",
    slug: "brood-war-queen",
    era: "Brood War independent Queen of Blades Sarah Kerrigan",
    preserve: "sovereign segmented tendrils, amber eyes, mature living carapace, continuous shoulders and Brood War hive-command background",
    neutralReceipt: KERRIGAN_BROOD_WAR_ERA_RECEIPT_V1,
  },
  {
    personaWorldbookId: "wol.queen_artifact_search",
    personaState: "wol.queen.artifact_search",
    slug: "wol-queen",
    era: "Wings of Liberty Queen of Blades Sarah Kerrigan",
    preserve: "SC2-era tendril crown, amber eyes, sleek dark living carapace, complete deltoids and artifact-war chamber background",
    neutralReceipt: KERRIGAN_WOL_QUEEN_ERA_RECEIPT_V1,
  },
  {
    personaWorldbookId: "hots.deinfested_human",
    personaState: "hots.deinfested_human.pre_zerus",
    slug: "hots-deinfested",
    era: "Heart of the Swarm deinfested human Sarah Kerrigan",
    preserve: "human red hair, green eyes, grounded Terran field clothing, natural shoulders and dim laboratory-command background",
    neutralReceipt: KERRIGAN_HOTS_DEINFESTED_ERA_RECEIPT_V1,
  },
  {
    personaWorldbookId: "lotv.coalition_pre_ascension",
    personaState: "lotv.coalition.pre_ascension",
    slug: "lotv-coalition",
    era: "Legacy of the Void coalition-era primal Queen Sarah Kerrigan",
    preserve: "controlled primal tendrils, amber eyes, low-profile living carapace, full shoulders and coalition war-room background",
    neutralReceipt: KERRIGAN_LOTV_COALITION_ERA_RECEIPT_V1,
  },
  {
    personaWorldbookId: "lotv.xelnaga_epilogue",
    personaState: "lotv.xelnaga.epilogue",
    slug: "lotv-xelnaga",
    era: "Legacy of the Void Xel'naga-ascended Sarah Kerrigan",
    preserve: "warm-white luminous eyes, pearl-gold tendril filaments, luminous skin, warm-ivory living-cosmic armor, full shoulders and ancient star chamber",
    neutralReceipt: KERRIGAN_LOTV_XELNAGA_ERA_RECEIPT_V1,
  },
]);

const planUnsigned = {
  schemaVersion: "starcraft_tmg_kerrigan_all_era_dynamic_portrait_plan_v1",
  planId: "starcraft-tmg.kerrigan.all-era-dynamic-portrait-plan.v1",
  characterId: CHARACTER_ID,
  createdAt: "2026-09-03T03:00:00.000Z",
  userDirectiveId: USER_DIRECTIVE_ID,
  styleProfileId: STYLE_PROFILE_ID,
  engineContract: "starcraft_tmg_dynamic_dialogue_portrait_v1",
  frameRoles: FRAME_ROLES,
  personaWorldbookIds: [
    ...ERA_CONFIGS.map((entry) => entry.personaWorldbookId),
    "hots.primal_queen.post_zerus",
  ],
  denominator: {
    personaManifests: 8,
    framesPerPersona: 5,
    totalFrames: 40,
    reusedAcceptedPrimalFrames: 5,
    reusedStaticEraAnchorsAsNeutralFrames: 7,
    newlyGeneratedAdjacentFrames: 28,
  },
  triggerPolicy: KERRIGAN_ALL_ERA_DYNAMIC_TRIGGER_POLICY_V1,
  generationPolicy: {
    mode: "identity_preserving_adjacent_keyframes",
    oneToolCallPerRequestedAsset: true,
    referenceImageInspectedBeforeEdit: true,
    manualVisualReviewRequired: true,
    rejectedDraftsRemainIgnoredLocalEvidence: true,
    runtimeGeneration: false,
  },
  release: {
    developmentDisplayAllowed: true,
    publicReleaseAllowed: false,
    independentRightsReviewRequired: true,
  },
  authority: KERRIGAN_ALL_ERA_DYNAMIC_TRIGGER_POLICY_V1.authority,
};

export const KERRIGAN_ALL_ERA_DYNAMIC_PORTRAIT_PLAN_V1 = Object.freeze({
  ...planUnsigned,
  planHash: hashStarcraftTmgContract(planUnsigned),
});

function adjacentPrompt(config, role) {
  const roleChange = {
    blink: "close both eyelids naturally for a brief blink; keep the mouth and all other geometry unchanged",
    speaking: "part the lips slightly for a calm spoken syllable with the smallest plausible local jaw motion",
    warning: "use a controlled tactical warning expression with subtly firmer brows and mouth; never snarl or scream",
    reflect: "shift the gaze a few degrees and soften brow tension into restrained strategic reflection",
  }[role];
  return `Use case: identity-preserve, minimal local edit. Asset type: square game communications-portrait ${role.toUpperCase()} keyframe. Image 1 is the exact final neutral production frame for ${config.era}; treat it as locked artwork rather than inspiration. Change only the local expression: ${roleChange}. Preserve exactly: adult identity, face and head proportions, ${config.preserve}, camera angle, square bust crop, lighting, palette, background geometry and high-resolution Western 2D hand-painted military-science-fiction finish. Do not repaint, beautify, simplify, recrop, re-pose, or redesign hair/tendrils, neck, clavicles, chest, armor, clothing or shoulders. No anime face, 3D render, glossy generic concept-art drift, horror deformation, extra object, text, logo, watermark or UI frame. Output only the clean square portrait artwork.`;
}

function generatedReceipt(config, role, roleIndex, eraIndex) {
  const [contentHash, byteLength] = OUTPUTS[config.slug][role];
  return createStarcraftTmgVisualGenerationReceiptV1({
    receiptId: `kerrigan.${config.slug}.dialogue.${role}.generation.v1`,
    assetId: `kerrigan.${config.slug}.dialogue.${role}.v1`,
    characterId: CHARACTER_ID,
    generatedAt: new Date(Date.parse("2026-09-03T03:10:00.000Z")
      + (eraIndex * 4 + roleIndex) * 60_000).toISOString(),
    userDirectiveId: USER_DIRECTIVE_ID,
    planManifestHash: KERRIGAN_ALL_ERA_DYNAMIC_PORTRAIT_PLAN_V1.planHash,
    styleProfileId: STYLE_PROFILE_ID,
    inputArtifacts: [{
      artifactId: config.neutralReceipt.assetId,
      artifactKind: "generated_era_neutral_identity_anchor",
      contentHash: config.neutralReceipt.output.contentHash,
      relation: "same_era_identity_anatomy_costume_crop_palette_and_rendering_anchor",
    }],
    prompt: adjacentPrompt(config, role),
    output: {
      path: `assets/characters/kerrigan-persona-dynamic/${config.slug}/${role}-v1.png`,
      contentHash,
      byteLength,
      width: 1254,
      height: 1254,
      mimeType: "image/png",
    },
    releaseClass: "development_only_derivative",
    publicReleaseAllowed: false,
    manualVisualReview: {
      reviewer: "codex_visual_inspection",
      status: "passed_development",
      checks: [
        `semantic_${role}_readable`,
        "same_era_identity_costume_shoulders_chest_crop_palette_and_background",
        "high_resolution_western_2d_non_anime_non_horror",
        "no_text_logo_or_watermark",
      ],
    },
  });
}

function manifestFrame(receipt, role) {
  return {
    frameId: receipt.assetId,
    role,
    outputPath: receipt.output.path,
    contentHash: receipt.output.contentHash,
    generationReceiptHash: receipt.receiptHash,
    byteLength: receipt.output.byteLength,
    width: receipt.output.width,
    height: receipt.output.height,
    mimeType: receipt.output.mimeType,
    developmentDisplayAllowed: true,
    publicReleaseAllowed: false,
  };
}

const generatedEntries = ERA_CONFIGS.map((config, eraIndex) => {
  const generationReceipts = GENERATED_ROLES.map((role, roleIndex) =>
    generatedReceipt(config, role, roleIndex, eraIndex));
  const frames = [
    manifestFrame(config.neutralReceipt, "neutral"),
    ...generationReceipts.map((receipt, index) => manifestFrame(receipt, GENERATED_ROLES[index])),
  ];
  const manifest = createStarcraftTmgDynamicDialoguePortraitManifestV1({
    manifestId: `starcraft-tmg.kerrigan.${config.slug}.dynamic-dialogue-portrait.v1`,
    version: "1.0.0-development.1",
    characterId: CHARACTER_ID,
    createdAt: "2026-09-03T03:45:00.000Z",
    planHash: KERRIGAN_ALL_ERA_DYNAMIC_PORTRAIT_PLAN_V1.planHash,
    styleProfileId: STYLE_PROFILE_ID,
    logicalResolution: 640,
    sourceEvidence: {
      neutralReceiptHash: config.neutralReceipt.receiptHash,
      rightsStatus: "development_reference_only",
      publicReleaseAllowed: false,
      rawSourcesStoredInGit: false,
    },
    frames,
    fallback: {
      missingFrameBehavior: "show_labeled_portrait_unavailable_never_reuse_another_era",
      publicBehavior: "use_project_d_original_adjutant",
    },
  });
  return Object.freeze({ ...config, generationReceipts: Object.freeze(generationReceipts), manifest });
});

const primalEntry = Object.freeze({
  personaWorldbookId: "hots.primal_queen.post_zerus",
  personaState: "hots.primal.post_zerus.pre_lotv",
  slug: "hots-primal-queen",
  era: "Heart of the Swarm post-Zerus primal Queen Sarah Kerrigan",
  neutralReceipt: KERRIGAN_SC1_NEUTRAL_RECEIPT_V1,
  generationReceipts: KERRIGAN_SC1_DIALOGUE_GENERATION_RECEIPTS_V1.slice(1),
  manifest: KERRIGAN_DYNAMIC_DIALOGUE_PORTRAIT_V1,
});

export const KERRIGAN_ALL_ERA_DYNAMIC_PORTRAIT_CATALOG_V1 = Object.freeze([
  ...generatedEntries.slice(0, 5),
  primalEntry,
  ...generatedEntries.slice(5),
]);

export const KERRIGAN_ALL_ERA_NEW_DYNAMIC_GENERATION_RECEIPTS_V1 = Object.freeze(
  generatedEntries.flatMap((entry) => entry.generationReceipts),
);

const auditUnsigned = {
  schemaVersion: "starcraft_tmg_kerrigan_all_era_dynamic_generation_audit_v1",
  generator: {
    provider: "openai_builtin_imagegen",
    mode: "reference_generation",
    externalCredentialUsed: false,
  },
  acceptedOutputs: generatedEntries.flatMap((entry) => entry.generationReceipts.map((receipt) => ({
    assetId: receipt.assetId,
    repositoryPath: receipt.output.path,
    contentHash: receipt.output.contentHash,
    generatorOutputFile: OUTPUTS[entry.slug][receipt.assetId.split(".").at(-2)][2],
  }))),
  rejectedIgnoredLocalDrafts: [
    "exec-960fe1fe-2c8b-4471-92aa-5f2a6d085d17.png",
    "exec-6afab61f-8426-4e20-a347-7b2f958ddb68.png",
    "exec-a63685fd-6e1f-4af2-be30-dca13ee8c819.png",
    "exec-129ee530-c3a2-455c-b2ff-923818136602.png",
  ],
  originalGeneratorOutputsRemainOutsideRepository: true,
  runtimeGeneration: false,
  publicReleaseAllowed: false,
};

export const KERRIGAN_ALL_ERA_DYNAMIC_GENERATION_AUDIT_V1 = Object.freeze({
  ...auditUnsigned,
  auditHash: hashStarcraftTmgContract(auditUnsigned),
});
