import { createStarcraftTmgDynamicDialoguePortraitManifestV1 } from
  "../../packages/character-agent/dynamic-dialogue-portrait-v1.mjs";
import { createStarcraftTmgVisualGenerationReceiptV1 } from
  "../../packages/character-agent/visual-generation-receipt-v1.mjs";
import { hashStarcraftTmgContract } from
  "../../packages/authoritative-engine/transition-v1.mjs";

const CHARACTER_ID = "starcraft.sarah_kerrigan";
const USER_DIRECTIVE_ID = "user.2026-09-02.sc2-model-sc1-comms-highres-2d";

export const KERRIGAN_SC1_DIALOGUE_STYLE_PROFILE_V1 = Object.freeze({
  styleProfileId: "starcraft-sc2-model-sc1-comms-highres-2d-v1",
  modelAnchor: "official StarCraft II / Heroes Queen of Blades face and organic upper-body anatomy",
  communicationAnchor: "StarCraft 1998 / Remastered portrait crop, palette, hard light, and analog transmission mood",
  medium: "high-resolution Western science-fiction 2D painted portrait",
  preserve: [
    "mature realistic face, amber eyes, segmented infested hair, and cold self-possession",
    "slender athletic shoulders with visible deltoid continuity and rear scapular wing roots",
    "low-profile continuous living carapace, narrow sternum ridge, and integrated chest contour",
    "olive, charcoal, dark brown, faint muted plum, and amber palette",
    "controlled brush texture plus fine scanline, noise, vignette, and luma-roll presentation",
  ],
  reject: [
    "anime or manga facial design",
    "low-resolution pixel blocking",
    "modern glossy AI concept-art finish",
    "giant pauldrons, upward shoulder horns, Gothic cuirass, metal bustier, or separate breast cups",
    "horror rot, wounds, mucus, corpse skin, or monster snarl",
    "purple-magenta neon, text, logo, watermark, or copied franchise UI chrome",
  ],
});

const SC1_REHOST_HASH = "9b313d7ce6e4c60d78a9568bf9de062f3eaebafc9e6db1726693d46d25dce0a4";
const SC2_OFFICIAL_FACE_HASH = "a0b73391fa305fdf5059f4133a2b4e01fae6ba12dde60e4dacdc34b7780462f5";
const HERO_WEEK_MODEL_GIF_HASH = "71637a9650f6bf543e50b14c7b14af3cf65bd7dbd128ccadca33686402f079a2";
const HERO_WEEK_MODEL_FRAME_HASH = "1ef45cd1e6afa31d95d3b09629f01b8d7d5d2a1edfd9719b3f2bc5a8d51c8932";

const planUnsigned = {
  schemaVersion: "starcraft_tmg_kerrigan_dynamic_dialogue_portrait_plan_v1",
  planId: "starcraft-tmg.kerrigan.dynamic-dialogue-portrait-plan.v1",
  characterId: CHARACTER_ID,
  createdAt: "2026-09-02T22:00:00.000Z",
  userDirectiveId: USER_DIRECTIVE_ID,
  sources: [
    {
      sourceId: "blizzard.sc2.kerrigan.face-model-reference",
      title: "Official Queen of Blades close model reference",
      pageUrl: "https://news.blizzard.com/en-gb/article/10062767/starcraft-ii-creative-development-q-a-part-5",
      byteUrl: "https://bnetcmseu-a.akamaihd.net/cms/gallery/GA1G4KH8JRLA1352107422523.jpg?v=0",
      localEvidencePath: "build/character-visual-assets-v3/sc2-reference/kerrigan-official-sc2-model-reference.jpg",
      contentHash: SC2_OFFICIAL_FACE_HASH,
      byteLength: 98464,
      width: 638,
      height: 972,
      sourceConfidence: "official_blizzard_primary",
      relation: "face_hair_eye_neck_and_chitin_model_anchor",
      rightsStatus: "development_reference_only",
      publicReleaseAllowed: false,
      rawSourceStoredInGit: false,
    },
    {
      sourceId: "community-rehost.starcraft-remastered.infested-kerrigan-portrait",
      title: "Claimed StarCraft: Remastered Infested Kerrigan communication portrait rehost",
      byteUrl: "https://pbs.twimg.com/media/EP4GZXsU0AAxN0v.jpg",
      discoveryUrl: "https://deathlula.weebly.com/blog/starcraft-remastered-kerrigan",
      localEvidencePath: "build/character-visual-assets-v3/sc1-reference/kerrigan-remastered-portrait-reference.jpg",
      contentHash: SC1_REHOST_HASH,
      byteLength: 39172,
      width: 448,
      height: 480,
      sourceConfidence: "community_rehost_of_claimed_remastered_portrait",
      relation: "sc1_crop_palette_hard_light_and_transmission_mood_anchor",
      rightsStatus: "development_reference_only",
      publicReleaseAllowed: false,
      rawSourceStoredInGit: false,
    },
    {
      sourceId: "blizzard.hero-week.kerrigan.upper-body-model",
      title: "Official Kerrigan Hero Week animated upper-body model",
      pageUrl: "https://news.blizzard.com/en-us/article/15396162/kerrigan-hero-week",
      byteUrl: "https://bnetcmsus-a.akamaihd.net/cms/content_folder_media/TGYU6B3XCEUW1408759286911.gif",
      localEvidencePath: "build/character-visual-assets-v3/official-comparison/kerrigan-hero-week-model.gif",
      contentHash: HERO_WEEK_MODEL_GIF_HASH,
      byteLength: 1878015,
      width: 300,
      height: 400,
      sourceConfidence: "official_blizzard_primary",
      relation: "slender_upper_body_shoulder_wing_root_and_living_carapace_anchor",
      rightsStatus: "development_reference_only",
      publicReleaseAllowed: false,
      rawSourceStoredInGit: false,
      derivedFrame: {
        localEvidencePath: "build/character-visual-assets-v3/official-comparison/frames/kerrigan-hero-week-model-frame.png",
        contentHash: HERO_WEEK_MODEL_FRAME_HASH,
        byteLength: 209915,
        width: 300,
        height: 400,
      },
    },
  ],
  styleProfile: KERRIGAN_SC1_DIALOGUE_STYLE_PROFILE_V1,
  frameRoles: ["neutral", "blink", "speaking", "warning", "reflect"],
  logicalResolution: 640,
  generationPolicy: {
    mode: "bounded_reference_keyframe_generation",
    runtimeGeneration: false,
    perUtteranceGeneration: false,
    baseFramePrecedesAdjacentFrames: true,
    rejectedDraftsRemainIgnoredLocalEvidence: true,
    shoulderAndChestOfficialModelReviewRequired: true,
  },
  release: {
    developmentDisplayAllowed: true,
    publicReleaseAllowed: false,
    independentRightsReviewRequired: true,
  },
  authority: {
    canOverrideFacts: false,
    canOverrideRules: false,
    canMutateRoom: false,
    canCreateTrainingTruth: false,
    skillGenerationTriggered: false,
    dshTriggered: false,
  },
};

export const KERRIGAN_SC1_DIALOGUE_PORTRAIT_PLAN_V1 = Object.freeze({
  ...planUnsigned,
  planHash: hashStarcraftTmgContract(planUnsigned),
});

export const KERRIGAN_SC1_NEUTRAL_PROMPT_V1 = `Create a corrected square high-resolution 2D hand-painted communication portrait of adult Infested Sarah Kerrigan. Reference 1 controls the StarCraft II face, segmented hair, amber eyes, organic neck and living chitin anatomy. Reference 2 controls the StarCraft I communication mood: near-frontal close portrait, dark cramped channel, olive/gray-green and amber palette, hard utilitarian side light. Reference 3 controls the OFFICIAL upper-body silhouette and must override fantasy-armor invention. Frame from head to mid upper torso with both natural shoulders visible. BODY FIDELITY: slender athletic upper torso; shoulder width about 2.3 head widths; neck flows continuously through clavicles into softly sloping deltoids; low-profile living Zerg carapace grows over the body like a flexible organic bio-suit; narrow layered sternum ridge; subtle integrated breast contour under continuous carapace. There must be NO separate round breast cups, NO metallic bustier, NO Gothic cuirass, NO giant pauldrons, NO upward shoulder horns, NO floating shoulder plates, and NO armor mass hiding the deltoids. Wing roots originate behind the scapulae and remain behind the shoulder silhouette; do not turn wing roots into shoulder armor. The surface should read as dark fibrous chitin, tendon and matte organic plate—not bronze or steel. Translate this into polished Western science-fiction 2D illustration with visible controlled brushwork, not 3D and not anime. Face: coldly glamorous, subtly sensual, mature, self-possessed, intelligent, realistic proportions, defined cheekbones and restrained confident lips. Beautiful rather than horrifying: no rot, wounds, mucus, corpse skin or monster snarl. Full coverage, no cleavage or pin-up pose. Restrained olive, charcoal, dark brown and amber palette; only faint muted plum undertones from the official model, no purple/magenta neon. No glossy AI concept-art finish, porcelain smoothing, fashion makeup, text, logo, watermark, UI border, extra character or malformed anatomy. Face and complete shoulder line readable from 64px to 320px.`;

export const KERRIGAN_SC1_BLINK_PROMPT_V1 = `Create a single BLINK keyframe from this exact square high-resolution 2D hand-painted Kerrigan communication portrait. Lock composition and identity: preserve the same head, face proportions, lips, hair tendrils, neck, organic chest carapace, natural shoulder width, deltoids, crop, background, olive/amber palette, lighting and painted texture. Change ONLY both eyelids into a natural brief closed blink while keeping brows, cheeks and mouth neutral. No other feature, armor plate, shoulder edge, hair strand, color, crop or lighting may be redesigned. Same painted shot one instant later. No anime, no 3D, no photoreal upgrade, no glamour drift, no horror, no text, logo, watermark or UI.`;

export const KERRIGAN_SC1_SPEAKING_PROMPT_V1 = `Create a single SPEAKING keyframe from this exact square high-resolution 2D hand-painted Kerrigan communication portrait. Lock composition and identity: preserve the same head, face proportions, eyes, hair tendrils, neck, low-profile organic chest carapace, natural shoulder width, deltoids, crop, background, olive/amber palette, lighting and painted texture. Change ONLY lips and jaw into a restrained mid-speech phoneme: lips slightly open, small dark mouth interior, no smile and no visible teeth. No other face feature, armor plate, shoulder edge, hair strand, color, crop or lighting may be redesigned. Same painted shot one instant later. Keep her coldly glamorous, mature and controlled. No anime, no 3D, no photoreal upgrade, no glamour drift, no horror, no text, logo, watermark or UI.`;

export const KERRIGAN_SC1_WARNING_PROMPT_V1 = `Create a single WARNING / CHALLENGE keyframe from this exact square high-resolution 2D hand-painted Kerrigan communication portrait. Lock composition and identity: preserve the same head, facial geometry, hair tendrils, neck, low-profile organic chest carapace, natural shoulder width, deltoids, crop, background, olive/amber palette, lighting and painted texture. Change ONLY the facial expression: eyes narrow subtly, inner brows lower slightly, jaw sets, and one corner of the CLOSED mouth lifts by a very small amount. She remains coldly glamorous, mature, composed and alluring rather than angry, monstrous or horror-like. No armor, shoulder, hair, color, crop or lighting redesign. Same painted shot one instant later. No anime, no 3D, no photoreal upgrade, no glamour drift, no red/purple relight, no text, logo, watermark or UI.`;

export const KERRIGAN_SC1_REFLECT_PROMPT_V1 = `Create a single REFLECT / THINKING keyframe from this exact square high-resolution 2D hand-painted Kerrigan communication portrait. Lock composition and identity: preserve the same head, face proportions, hair tendrils, neck, low-profile organic chest carapace, natural shoulder width, deltoids, crop, background, olive/amber palette, lighting and painted texture. Change ONLY the eyes and minimal brow tension: both eyes glance slightly to her left by a few degrees, brows relax subtly, mouth stays closed and severe. She remains coldly glamorous, mature, controlled and intelligent. No armor, shoulder, hair, color, crop or lighting redesign. Same painted shot one instant later. No anime, no 3D, no photoreal upgrade, no glamour drift, no horror, no text, logo, watermark or UI.`;

function receipt(input) {
  return createStarcraftTmgVisualGenerationReceiptV1({
    characterId: CHARACTER_ID,
    userDirectiveId: USER_DIRECTIVE_ID,
    planManifestHash: KERRIGAN_SC1_DIALOGUE_PORTRAIT_PLAN_V1.planHash,
    styleProfileId: KERRIGAN_SC1_DIALOGUE_STYLE_PROFILE_V1.styleProfileId,
    releaseClass: "development_only_derivative",
    publicReleaseAllowed: false,
    ...input,
  });
}

export const KERRIGAN_SC1_NEUTRAL_RECEIPT_V1 = receipt({
  receiptId: "kerrigan.sc1.dialogue.neutral.generation.v1",
  assetId: "kerrigan.sc1.dialogue.neutral.v1",
  generatedAt: "2026-09-02T22:45:00.000Z",
  inputArtifacts: [
    {
      artifactId: "blizzard.sc2.kerrigan.face-model-reference",
      artifactKind: "official_publisher_image",
      contentHash: SC2_OFFICIAL_FACE_HASH,
      relation: "face_hair_eye_neck_and_chitin_model_anchor",
    },
    {
      artifactId: "community-rehost.starcraft-remastered.infested-kerrigan-portrait",
      artifactKind: "community_rehost_development_reference",
      contentHash: SC1_REHOST_HASH,
      relation: "sc1_crop_palette_hard_light_and_transmission_mood_anchor",
    },
    {
      artifactId: "blizzard.hero-week.kerrigan.upper-body-model.derived-frame",
      artifactKind: "official_publisher_animation_derived_frame",
      contentHash: HERO_WEEK_MODEL_FRAME_HASH,
      relation: "upper_body_shoulder_wing_root_and_living_carapace_anchor",
    },
  ],
  prompt: KERRIGAN_SC1_NEUTRAL_PROMPT_V1,
  output: {
    path: "assets/characters/kerrigan-primal-adjutant/kerrigan-sc1-dialogue-neutral-v1.png",
    contentHash: "40ecb9bf87cdbcf15b42a8cb910d5142a128490a43043433cc469c5efec53edd",
    byteLength: 2185322,
    width: 1254,
    height: 1254,
    mimeType: "image/png",
  },
  manualVisualReview: {
    reviewer: "codex_visual_inspection",
    status: "passed_development",
    checks: [
      "sc2_face_and_organic_neck_model",
      "natural_shoulder_width_and_visible_deltoid_continuity",
      "low_profile_living_carapace_without_metal_bustier_or_gothic_pauldrons",
      "sc1_olive_amber_comms_mood",
      "high_resolution_2d_non_anime_non_horror",
      "no_text_logo_or_watermark",
    ],
  },
});

function adjacentFrameReceipt(input) {
  return receipt({
    ...input,
    inputArtifacts: [{
      artifactId: KERRIGAN_SC1_NEUTRAL_RECEIPT_V1.assetId,
      artifactKind: "generated_highres_2d_identity_anchor",
      contentHash: KERRIGAN_SC1_NEUTRAL_RECEIPT_V1.output.contentHash,
      relation: "same_portrait_animation_identity_anatomy_and_rendering_anchor",
    }],
  });
}

export const KERRIGAN_SC1_BLINK_RECEIPT_V1 = adjacentFrameReceipt({
  receiptId: "kerrigan.sc1.dialogue.blink.generation.v1",
  assetId: "kerrigan.sc1.dialogue.blink.v1",
  generatedAt: "2026-09-02T22:50:00.000Z",
  prompt: KERRIGAN_SC1_BLINK_PROMPT_V1,
  output: {
    path: "assets/characters/kerrigan-primal-adjutant/kerrigan-sc1-dialogue-blink-v1.png",
    contentHash: "4b1b1b9fb76f7448c2bfed97dadbb41d7da2d37cd56bdb1863ac37a7062324f0",
    byteLength: 2004728,
    width: 1254,
    height: 1254,
    mimeType: "image/png",
  },
  manualVisualReview: {
    reviewer: "codex_visual_inspection",
    status: "passed_development",
    checks: ["natural_closed_eyelids", "same_face_shoulders_chest_crop_and_palette", "no_text_logo_or_watermark"],
  },
});

export const KERRIGAN_SC1_SPEAKING_RECEIPT_V1 = adjacentFrameReceipt({
  receiptId: "kerrigan.sc1.dialogue.speaking.generation.v1",
  assetId: "kerrigan.sc1.dialogue.speaking.v1",
  generatedAt: "2026-09-02T22:55:00.000Z",
  prompt: KERRIGAN_SC1_SPEAKING_PROMPT_V1,
  output: {
    path: "assets/characters/kerrigan-primal-adjutant/kerrigan-sc1-dialogue-speaking-v1.png",
    contentHash: "d64aa639b0ced17fbef9ba811a6093298a404517ae09eb4c1392de4167444c7e",
    byteLength: 2042196,
    width: 1254,
    height: 1254,
    mimeType: "image/png",
  },
  manualVisualReview: {
    reviewer: "codex_visual_inspection",
    status: "passed_development",
    checks: ["restrained_mid_speech_phoneme", "same_face_shoulders_chest_crop_and_palette", "no_text_logo_or_watermark"],
  },
});

export const KERRIGAN_SC1_WARNING_RECEIPT_V1 = adjacentFrameReceipt({
  receiptId: "kerrigan.sc1.dialogue.warning.generation.v1",
  assetId: "kerrigan.sc1.dialogue.warning.v1",
  generatedAt: "2026-09-02T23:00:00.000Z",
  prompt: KERRIGAN_SC1_WARNING_PROMPT_V1,
  output: {
    path: "assets/characters/kerrigan-primal-adjutant/kerrigan-sc1-dialogue-warning-v1.png",
    contentHash: "77baaba304278c8d1de88f4d4c2c6b634ef00340230da5e2de2412f6c8823b0d",
    byteLength: 2088581,
    width: 1254,
    height: 1254,
    mimeType: "image/png",
  },
  manualVisualReview: {
    reviewer: "codex_visual_inspection",
    status: "passed_development",
    checks: ["controlled_warning_expression", "same_face_shoulders_chest_crop_and_palette", "no_text_logo_or_watermark"],
  },
});

export const KERRIGAN_SC1_REFLECT_RECEIPT_V1 = adjacentFrameReceipt({
  receiptId: "kerrigan.sc1.dialogue.reflect.generation.v1",
  assetId: "kerrigan.sc1.dialogue.reflect.v1",
  generatedAt: "2026-09-02T23:05:00.000Z",
  prompt: KERRIGAN_SC1_REFLECT_PROMPT_V1,
  output: {
    path: "assets/characters/kerrigan-primal-adjutant/kerrigan-sc1-dialogue-reflect-v1.png",
    contentHash: "7938ecc1aab4aa4eee7f86d12e473a3903fade7dcbde1c0d7e92ba8154b9989b",
    byteLength: 2185881,
    width: 1254,
    height: 1254,
    mimeType: "image/png",
  },
  manualVisualReview: {
    reviewer: "codex_visual_inspection",
    status: "passed_development",
    checks: ["minimal_reflective_eye_shift", "same_face_shoulders_chest_crop_and_palette", "no_text_logo_or_watermark"],
  },
});

export const KERRIGAN_SC1_DIALOGUE_GENERATION_RECEIPTS_V1 = Object.freeze([
  KERRIGAN_SC1_NEUTRAL_RECEIPT_V1,
  KERRIGAN_SC1_BLINK_RECEIPT_V1,
  KERRIGAN_SC1_SPEAKING_RECEIPT_V1,
  KERRIGAN_SC1_WARNING_RECEIPT_V1,
  KERRIGAN_SC1_REFLECT_RECEIPT_V1,
]);

export const KERRIGAN_DYNAMIC_DIALOGUE_PORTRAIT_V1 =
  createStarcraftTmgDynamicDialoguePortraitManifestV1({
    manifestId: "starcraft-tmg.kerrigan.dynamic-dialogue-portrait.v1",
    version: "1.0.0-development.1",
    characterId: CHARACTER_ID,
    createdAt: "2026-09-02T23:10:00.000Z",
    planHash: KERRIGAN_SC1_DIALOGUE_PORTRAIT_PLAN_V1.planHash,
    styleProfileId: KERRIGAN_SC1_DIALOGUE_STYLE_PROFILE_V1.styleProfileId,
    logicalResolution: 640,
    sourceEvidence: {
      sourceHashes: [SC2_OFFICIAL_FACE_HASH, SC1_REHOST_HASH, HERO_WEEK_MODEL_GIF_HASH, HERO_WEEK_MODEL_FRAME_HASH],
      rightsStatus: "development_reference_only",
      publicReleaseAllowed: false,
      rawSourcesStoredInGit: false,
    },
    frames: KERRIGAN_SC1_DIALOGUE_GENERATION_RECEIPTS_V1.map((entry) => ({
      frameId: entry.assetId,
      role: entry.assetId.split(".").at(-2),
      outputPath: entry.output.path,
      contentHash: entry.output.contentHash,
      generationReceiptHash: entry.receiptHash,
      byteLength: entry.output.byteLength,
      width: entry.output.width,
      height: entry.output.height,
      mimeType: entry.output.mimeType,
      developmentDisplayAllowed: true,
      publicReleaseAllowed: false,
    })),
    fallback: {
      missingFrameBehavior: "show_labeled_portrait_unavailable",
      publicBehavior: "use_project_d_original_adjutant",
    },
  });
