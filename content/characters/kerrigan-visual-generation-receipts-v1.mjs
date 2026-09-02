import { createStarcraftTmgVisualGenerationReceiptV1 } from
  "../../packages/character-agent/visual-generation-receipt-v1.mjs";
import {
  KERRIGAN_VISUAL_ASSET_PLAN_V1,
  KERRIGAN_VISUAL_STYLE_PROFILE_V1,
} from "./kerrigan-visual-asset-plan-v1.mjs";

const CHARACTER_ID = "starcraft.sarah_kerrigan";
const DIRECTIVE_ID = "user.2026-09-02.allow-image-acquisition-and-ai-edit";
const OFFICIAL_SOURCE_HASH = "6ec9eda12b14242fd32aa3a053e7a37fef4a3ed06af3fc55bf34893b2ac52ad9";

export const KERRIGAN_AVATAR_PROMPT_V1 = `Use case: stylized-concept
Asset type: square avatar for a StarCraft TMG tactical Adjutant character card
Input image 1: official publisher reference only for Sarah Kerrigan / Queen of Blades identity cues, facial identity, dark organic crown-tendrils, chitin language, and skeletal wing silhouette; do not preserve its banner layout, pose, logo, typography, or blue UI.
Primary request: Create a new polished square bust portrait of post-Zerus primal Sarah Kerrigan as a commanding tactical Adjutant.
Subject: head-and-shoulders three-quarter portrait, controlled severe expression, direct intelligent gaze, realistic human facial proportions with refined anime-influenced design, dark organic tendrils swept back, elegant layered Zerg chitin armor, subtle crown-like silhouette, restrained visible wing-blades behind the shoulders.
Style/medium: high-end Japanese cinematic science-fiction RPG character art; realistic real-time-rendered finish; premium physically based skin, chitin, translucent psionic material and micro-surface detail; original Project D composition.
Composition/framing: centered square portrait, face readable at 64px, symmetrical visual weight, safe crop around hair and shoulders, no UI frame.
Lighting/mood: dramatic soft key light, violet and magenta psionic rim light, charcoal-black atmospheric background, powerful but composed.
Color palette: obsidian, deep plum, muted bronze, violet-magenta energy accents.
Constraints: mature tactical presence; no sexualized framing; no exposed cleavage; no text; no logos; no watermark; no extra characters; no copied Blizzard key-art composition.
Avoid: any Final Fantasy character, costume, weapon, logo, location, UI, or exact visual motif; cartoon proportions; over-smoothed plastic face; excessive spikes covering the face; asymmetrical eyes; malformed anatomy.`;

export const KERRIGAN_CARD_PROMPT_V1 = `Use case: stylized-concept
Asset type: vertical 2:3 character-card portrait for a StarCraft TMG tactical Adjutant
Input image 1: official publisher reference only for Sarah Kerrigan / Queen of Blades character identity and organic wing-blade language; do not copy its banner, pose, typography, logo, or composition.
Input image 2: identity reference for the newly established Project D portrait; preserve the same face, eye shape, dark tendril hair, obsidian-plum chitin materials, violet eyes, and refined mature appearance.
Primary request: Create a new vertical 2:3 knees-up character-card portrait of post-Zerus primal Sarah Kerrigan standing as a commanding battlefield strategist, calm and lethal rather than attacking.
Subject: same woman as image 2, elegant layered organic armor with full chest coverage, long skeletal wing-blades forming a readable crown-like silhouette, one hand relaxed and one hand projecting a restrained violet psionic tactical hologram, balanced natural anatomy.
Style/medium: high-end Japanese cinematic science-fiction RPG character art; realistic real-time-rendered finish; sophisticated anime-influenced facial design; premium physically based skin, chitin, translucent energy and micro-surface detail; original composition.
Composition/framing: vertical 2:3, knees-up, subject centered slightly above midline, clean silhouette, generous dark negative space near the lower third for code-rendered card metadata outside the image; no embedded frame or UI.
Lighting/mood: cinematic violet-magenta rim light with a soft neutral face key, subtle Zerg-biotech haze, disciplined regal menace.
Color palette: obsidian, deep plum, muted bronze, restrained violet-magenta psionic light.
Constraints: preserve identity from image 2; tactical and mature; full clothing/armor coverage; no text; no logos; no watermark; no extra characters; no copied key-art composition.
Avoid: any Final Fantasy character, costume, weapon, logo, location, UI, or exact visual motif; overt pin-up pose; exaggerated anatomy; excessive gore; malformed hands; duplicated limbs or wings.`;

function receipt(input) {
  return createStarcraftTmgVisualGenerationReceiptV1({
    characterId: CHARACTER_ID,
    userDirectiveId: DIRECTIVE_ID,
    planManifestHash: KERRIGAN_VISUAL_ASSET_PLAN_V1.manifestHash,
    styleProfileId: KERRIGAN_VISUAL_STYLE_PROFILE_V1.styleProfileId,
    releaseClass: "development_only_derivative",
    publicReleaseAllowed: false,
    ...input,
  });
}

export const KERRIGAN_AVATAR_GENERATION_RECEIPT_V1 = receipt({
  receiptId: "kerrigan.primal.avatar-square.generation.v1",
  assetId: "kerrigan.primal.avatar-square.v1",
  generatedAt: "2026-09-02T21:20:00.000Z",
  inputArtifacts: [{
    artifactId: "blizzard.kerrigan-hero-week.hero-image.2014",
    artifactKind: "official_publisher_image",
    contentHash: OFFICIAL_SOURCE_HASH,
    relation: "identity_and_material_reference_only",
  }],
  prompt: KERRIGAN_AVATAR_PROMPT_V1,
  output: {
    path: "assets/characters/kerrigan-primal-adjutant/kerrigan-primal-avatar-square-v1.png",
    contentHash: "1d6abaf4ba1979251454dd2330cac22fc566b7e0f7b4da944eff77ef721afe7d",
    byteLength: 2474606,
    width: 1254,
    height: 1254,
    mimeType: "image/png",
  },
  manualVisualReview: {
    reviewer: "codex_visual_inspection",
    status: "passed_development",
    checks: ["face_readable_at_avatar_scale", "no_text_logo_or_watermark", "non_banner_composition", "full_coverage_tactical_portrait"],
  },
});

export const KERRIGAN_CARD_GENERATION_RECEIPT_V1 = receipt({
  receiptId: "kerrigan.primal.character-card-portrait.generation.v1",
  assetId: "kerrigan.primal.character-card-portrait.v1",
  generatedAt: "2026-09-02T21:25:00.000Z",
  inputArtifacts: [
    {
      artifactId: "blizzard.kerrigan-hero-week.hero-image.2014",
      artifactKind: "official_publisher_image",
      contentHash: OFFICIAL_SOURCE_HASH,
      relation: "character_and_wing_language_reference_only",
    },
    {
      artifactId: "kerrigan.primal.avatar-square.v1",
      artifactKind: "generated_identity_anchor",
      contentHash: KERRIGAN_AVATAR_GENERATION_RECEIPT_V1.output.contentHash,
      relation: "face_material_and_palette_identity_anchor",
    },
  ],
  prompt: KERRIGAN_CARD_PROMPT_V1,
  output: {
    path: "assets/characters/kerrigan-primal-adjutant/kerrigan-primal-card-portrait-v1.png",
    contentHash: "1f4f42084c6a57b62bb779b7c51ef1b9482447f4835588512bb74a50d3018709",
    byteLength: 2451703,
    width: 1024,
    height: 1536,
    mimeType: "image/png",
  },
  manualVisualReview: {
    reviewer: "codex_visual_inspection",
    status: "passed_development",
    checks: ["same_face_material_and_palette", "two_to_three_canvas", "no_text_logo_or_watermark", "hands_and_wing_silhouette_readable"],
  },
});

export const KERRIGAN_VISUAL_GENERATION_RECEIPTS_V1 = Object.freeze([
  KERRIGAN_AVATAR_GENERATION_RECEIPT_V1,
  KERRIGAN_CARD_GENERATION_RECEIPT_V1,
]);
