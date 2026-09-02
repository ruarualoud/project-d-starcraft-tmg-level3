import { hashStarcraftTmgContract } from
  "../../packages/authoritative-engine/transition-v1.mjs";
import { createStarcraftTmgVisualGenerationReceiptV1 } from
  "../../packages/character-agent/visual-generation-receipt-v1.mjs";
import { KERRIGAN_SC1_NEUTRAL_RECEIPT_V1 } from
  "./kerrigan-dynamic-dialogue-portrait-v1.mjs";

const CHARACTER_ID = "starcraft.sarah_kerrigan";
const USER_DIRECTIVE_ID = "user.2026-09-03.generate-all-kerrigan-era-comparisons";
const STYLE_PROFILE_ID = "starcraft-era-comparison-sc1-comms-highres-2d-v1";

export const KERRIGAN_TERRAN_GHOST_ERA_PROMPT_V1 = `Create a new 1254×1254 square high-resolution 2D communications portrait for the same Sarah Kerrigan identity shown in the reference, but in her pre-Tarsonis Terran Ghost era before infestation. This is a separate era anchor, not an edit that preserves zerg anatomy.

Identity: recognizably the same woman, realistic adult human face, cold intelligent beauty, natural shoulder width and complete deltoid continuity. Human warm-light skin; vivid but natural swept-back red hair gathered behind the shoulders; green eyes, no glowing zerg eyes. No tendrils, chitin, infestation, wings, or later-era knowledge cues.

Costume/modeling: StarCraft military Ghost operative design language, matte charcoal tactical bodysuit and low-profile armored collar/shoulder plates, restrained dark olive equipment details, no giant pauldrons, no cleavage, no detached metal bustier, no fantasy armor, no modern real-world logos. Shoulder and upper chest anatomy must be structurally plausible under the suit.

Presentation: StarCraft I analogue communications-portrait framing and mood, head-and-upper-torso centered and front-facing, same camera distance and shoulder crop as reference, dim Terran command-bunker background, olive/amber practical light, subtle CRT-era texture but not pixelated. High-resolution Western science-fiction concept painting with hand-painted 2D finish, grounded 1990s military sci-fi atmosphere informed by later realistic modeling.

Expression: disciplined, wary, self-possessed Ghost officer; beautiful and cool rather than glamorous, anime, horror, or pin-up.

Strict negatives: no anime face, no purple neon, no glossy generic AI finish, no plastic skin, no horror, no monster anatomy, no text, no logo, no watermark, no UI frame, no weapon blocking the torso, no malformed shoulders, no extra character. Output only the clean portrait artwork.`;

export const KERRIGAN_OVERMIND_INFESTED_ERA_PROMPT_V1 = `Create a new 1254×1254 square high-resolution 2D communications portrait for the same Sarah Kerrigan identity shown in the reference, but in her StarCraft I Overmind-controlled newly infested era. This is a distinct historical era anchor, not a dialogue-expression edit.

Identity and anatomy: recognizably the same adult woman beneath early infestation; pale muted olive-gray skin, intense amber-gold eyes, and organic swept-back tendril hair. Keep a beautiful but alien, cold face—no anime, no gore, no skull or corpse look. Preserve natural human-derived shoulder width and complete deltoid-to-upper-arm continuity beneath early Zerg carapace.

Era-specific design: early classic StarCraft infestation rather than a fully sovereign later Queen. Brown-black and dark olive organic plates grow across the collarbones, upper chest, and shoulders; asymmetrical raw bio-organic seams are allowed but the torso must remain structurally plausible. Tendrils are simpler, heavier, and less crown-like than later eras. No Terran hair, no Terran Ghost suit, no giant wings, no Xel'naga light, no purple neon.

Presentation: StarCraft I analogue communications-portrait framing and mood, head-and-upper-torso centered and front-facing, same camera distance and shoulder crop as reference, dim Overmind hive chamber, dirty amber and red organic practical light, subtle CRT-era texture but not pixelated. High-resolution Western science-fiction concept painting with hand-painted 2D finish and grounded 1990s bio-mechanical horror atmosphere, yet beautiful rather than grotesque.

Expression: alert but constrained, as if a powerful mind is being directed by the Overmind; controlled hostility, not regal triumph.

Strict negatives: no anime face, no pin-up pose, no cleavage, no glossy generic AI finish, no plastic skin, no gore, no excessive horror, no text, no logo, no watermark, no UI frame, no malformed shoulders, no detached breastplate, no extra character. Output only the clean portrait artwork.`;

export const KERRIGAN_BROOD_WAR_ERA_PROMPT_V1 = `Create a new 1254×1254 square high-resolution 2D communications portrait for the same Sarah Kerrigan identity shown in the reference, but in her Brood War independent Queen of Blades era after the Overmind's death. This is a distinct historical era anchor, not a dialogue-expression edit.

Identity and anatomy: recognizably the same adult woman, cold beautiful facial structure, pale olive-gray infested skin, amber-gold eyes, swept-back organic tendril hair. Keep natural shoulder width and complete deltoid continuity; the upper chest and shoulders must read as a coherent living body under carapace.

Era-specific design: mature classic independent Queen of Blades. Dark olive, burnt brown, and near-black chitin is more finished and sovereign than the newly infested era; a restrained crown-like tendril silhouette, stronger collar and shoulder plates, fine organic ridges across the sternum. She is a calculating brood leader, not yet the later StarCraft II purple-toned model. No human red hair, no Terran suit, no Xel'naga glow, no giant wings inside the frame.

Presentation: StarCraft I / Brood War analogue communications-portrait framing, head-and-upper-torso centered and front-facing, same camera distance and shoulder crop as reference. Dim independent hive command chamber, deep brown-red organic background with restrained amber practical lights. High-resolution Western science-fiction hand-painted 2D portrait, slightly illustrated and textural, preserving late-1990s StarCraft atmosphere without pixelation.

Expression: sovereign, calculating, coldly triumphant, with a slight controlled contempt; beautiful and dangerous, never anime or horror-grotesque.

Strict negatives: no anime face, no pin-up, no exposed cleavage, no glossy generic AI finish, no plastic skin, no gore, no monster mouth, no text, no logo, no watermark, no UI frame, no malformed shoulders, no detached armor cups, no extra character. Output only the clean portrait artwork.`;

export const KERRIGAN_WOL_QUEEN_ERA_PROMPT_V1 = `Create a new 1254×1254 square high-resolution 2D communications portrait for the same Sarah Kerrigan identity shown in the reference, but in her Wings of Liberty Queen of Blades era while hunting the Xel'naga artifacts before deinfestation. This is a distinct historical era anchor, not a dialogue-expression edit.

Identity and anatomy: recognizably the same adult woman, realistic cold beauty, pale muted gray-olive infested skin, luminous amber eyes, swept-back living tendrils. Maintain natural shoulder width, complete deltoid-to-upper-arm continuity, and a structurally plausible upper chest beneath organic armor.

Era-specific design: refined StarCraft II Queen of Blades modeling—layered charcoal-black and deep brown chitin with restrained desaturated violet undertones, sharper modern organic ridges, more disciplined symmetrical collarbone and shoulder armor, and long articulated tendrils. This should feel more evolved and engineered than Brood War, but not yet post-Zerus primal and not Xel'naga. No human hair, no Terran clothing, no neon purple, no cosmic ascension.

Presentation: preserve StarCraft I analogue communications-portrait composition and mood: head-and-upper-torso centered and front-facing, same camera distance and shoulder crop as reference. Background is a dark Char or Zerg command interior with ember-red practical light and faint cold artifact reflections. High-resolution Western science-fiction concept painting with hand-painted 2D texture, combining later realistic modeling with an old communications portrait rather than glossy cinematics.

Expression: intensely vigilant, predatory, hostile, and strategically focused; beautiful but severe, not glamorous or monstrous.

Strict negatives: no anime face, no pin-up, no cleavage, no glossy generic AI finish, no plastic skin, no gore, no horror distortion, no text, no logo, no watermark, no UI frame, no malformed shoulders, no floating armor, no extra character. Output only the clean portrait artwork.`;

export const KERRIGAN_HOTS_DEINFESTED_ERA_PROMPT_V1 = `Create a new 1254×1254 square high-resolution 2D communications portrait for the same Sarah Kerrigan identity shown in the reference, but in her Heart of the Swarm temporarily deinfested human era before traveling to Zerus. This is a distinct historical era anchor, not a dialogue-expression edit.

Identity and anatomy: recognizably the same adult woman, fully human warm-light skin, vivid natural red hair worn loose to the shoulders with a practical swept-back front, green eyes, realistic cold beauty. Preserve natural shoulder width, complete deltoid-to-upper-arm continuity, and a structurally plausible upper chest.

Era-specific design: recently deinfested and battle-worn. Rugged dark Terran field jacket or low-profile tactical armor over a practical undersuit, worn seams, restrained gray-blue and brown materials, no formal Ghost harness, no giant pauldrons, no exposed cleavage. Absolutely no tendrils, chitin, glowing Zerg eyes, wings, or Xel'naga effects. She should look physically human but carry the intensity and exhaustion of the former Queen of Blades.

Presentation: StarCraft I analogue communications-portrait framing and mood, head-and-upper-torso centered and front-facing, same camera distance and shoulder crop as reference. Dim Hyperion lab or ship-bunker background, cool desaturated instrument light balanced by warm amber practical light, subtle CRT-era texture but not pixelated. High-resolution Western science-fiction hand-painted 2D portrait with later realistic modeling.

Expression: exhausted, furious, grief-hardened, and purposeful; controlled human vulnerability under determination, beautiful but never glamorous or anime.

Strict negatives: no anime face, no pin-up, no cleavage, no glossy generic AI finish, no plastic skin, no Zerg anatomy, no horror, no text, no logo, no watermark, no UI frame, no malformed shoulders, no detached armor, no extra character. Output only the clean portrait artwork.`;

export const KERRIGAN_LOTV_COALITION_ERA_PROMPT_V1 = `Create a new 1254×1254 square high-resolution 2D communications portrait for the same Sarah Kerrigan identity shown in the reference, in her Legacy of the Void coalition era after Zerus but before final ascension. This is a distinct historical era anchor, not a dialogue-expression edit.

Identity and anatomy: recognizably the same adult woman and same post-Zerus primal Queen physiology as the reference, with pale muted olive-gray skin, amber-gold eyes, and swept-back living tendrils. Keep realistic cold beauty, natural shoulder width, complete deltoid continuity, and a coherent upper chest under organic armor.

Era-specific design: a disciplined allied commander at the height of the coalition war. Refined charcoal, deep brown, and muted burgundy primal carapace; restrained symmetrical collar and shoulder plates; tendrils organized into a controlled crown-like silhouette. Add very subtle cool blue-green coalition command reflections to the existing amber light, but no Terran clothing, no Xel'naga transformation, no white cosmic glow, no giant wings in frame. Distinguish her from the Heart of the Swarm primal portrait through more controlled regality, strategic restraint, and refined armor rather than a radical redesign.

Presentation: StarCraft I analogue communications-portrait framing and mood, head-and-upper-torso centered and front-facing, same camera distance and shoulder crop as reference. A dark coalition command/hive environment with small cool blue-green and amber practical lights. High-resolution Western science-fiction hand-painted 2D portrait, later realistic modeling rendered with slightly illustrated late-1990s communications texture.

Expression: controlled resolve, grave strategic focus, and reluctant alliance; beautiful, cold, and authoritative, not feral, anime, or pin-up.

Strict negatives: no anime face, no glossy generic AI finish, no plastic skin, no cleavage, no gore, no excessive horror, no neon, no Xel'naga halo, no text, no logo, no watermark, no UI frame, no malformed shoulders, no detached breastplate, no extra character. Output only the clean portrait artwork.`;

export const KERRIGAN_LOTV_XELNAGA_ERA_PROMPT_V1 = `Create a new 1254×1254 square high-resolution 2D communications portrait for the same Sarah Kerrigan identity shown in the reference, but in her Legacy of the Void Xel'naga epilogue ascended era. This is a distinct historical era anchor, not a dialogue-expression edit.

Identity and anatomy: Sarah remains immediately recognizable as the same realistic adult woman—same face, gaze, cheekbones, and strong natural shoulder structure. Her form is transcendent but anatomically coherent, with complete shoulders and upper arms. Beautiful, serene, and powerful; not anime, not an angel cliché, not a horror creature.

Era-specific design: elegant Xel'naga transformation expressed as pale pearl, soft gold, and warm ivory living-cosmic armor integrated into the collarbones, shoulders, and upper chest, with restrained translucent organic filaments replacing the darker Zerg tendrils. Eyes carry a soft warm-white inner light. A subtle halo-like environmental radiance may outline her, but there are no feathered wings, no crown jewelry, no dress, no exposed cleavage, no human military suit, and no neon purple. The result must be clearly beyond primal Zerg while preserving Kerrigan's identity.

Presentation: retain StarCraft I analogue communications-portrait composition even in a cosmic setting: head-and-upper-torso centered and front-facing, same camera distance and shoulder crop as reference. Background is a dim ancient Xel'naga chamber or star-filled void with restrained warm-white, amber, and soft blue practical radiance. High-resolution Western science-fiction hand-painted 2D portrait with subtle illustrated texture, not glossy cinematic CGI.

Expression: calm, distant, compassionate, and immeasurably powerful; the cold beauty of someone who has crossed beyond the war, never cute, glamorous, anime, or frightening.

Strict negatives: no anime face, no angel wings, no fantasy princess, no pin-up, no cleavage, no glossy generic AI finish, no plastic skin, no gore, no horror, no text, no logo, no watermark, no UI frame, no malformed shoulders, no floating armor cups, no extra character. Output only the clean portrait artwork.`;

const planUnsigned = {
  schemaVersion: "starcraft_tmg_kerrigan_era_visual_plan_v1",
  planId: "starcraft-tmg.kerrigan-era-visual-comparison.v1",
  characterId: CHARACTER_ID,
  createdAt: "2026-09-03T00:20:00.000Z",
  userDirectiveId: USER_DIRECTIVE_ID,
  styleProfileId: STYLE_PROFILE_ID,
  identityAnchor: {
    assetId: KERRIGAN_SC1_NEUTRAL_RECEIPT_V1.assetId,
    hash: KERRIGAN_SC1_NEUTRAL_RECEIPT_V1.output.contentHash,
    relation: "face_camera_crop_shoulder_and_high_resolution_2d_identity_anchor",
  },
  targetPersonaWorldbookIds: [
    "sc1.terran_ghost.pre_tarsonis",
    "sc1.infested.overmind_char",
    "brood_war.independent_queen",
    "wol.queen_artifact_search",
    "hots.deinfested_human",
    "lotv.coalition_pre_ascension",
    "lotv.xelnaga_epilogue",
  ],
  outputPolicy: {
    width: 1254,
    height: 1254,
    staticEraAnchorsFirst: true,
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

export const KERRIGAN_ERA_VISUAL_PLAN_V1 = Object.freeze({
  ...planUnsigned,
  planHash: hashStarcraftTmgContract(planUnsigned),
});

function eraReceipt(input) {
  return createStarcraftTmgVisualGenerationReceiptV1({
    characterId: CHARACTER_ID,
    userDirectiveId: USER_DIRECTIVE_ID,
    planManifestHash: KERRIGAN_ERA_VISUAL_PLAN_V1.planHash,
    styleProfileId: STYLE_PROFILE_ID,
    inputArtifacts: [{
      artifactId: KERRIGAN_SC1_NEUTRAL_RECEIPT_V1.assetId,
      artifactKind: "generated_highres_2d_identity_anchor",
      contentHash: KERRIGAN_SC1_NEUTRAL_RECEIPT_V1.output.contentHash,
      relation: "same_character_identity_camera_crop_and_anatomy_anchor",
    }],
    releaseClass: "development_only_derivative",
    publicReleaseAllowed: false,
    manualVisualReview: {
      reviewer: "codex_visual_inspection",
      status: "passed_development",
      checks: [
        "era_is_visually_distinct_and_matches_requested_timeline_state",
        "same_character_identity_and_front_facing_communications_crop",
        "complete_shoulder_and_upper_chest_anatomy",
        "high_resolution_western_2d_non_anime_non_horror",
        "no_text_logo_or_watermark",
      ],
    },
    ...input,
  });
}

export const KERRIGAN_TERRAN_GHOST_ERA_RECEIPT_V1 = eraReceipt({
  receiptId: "kerrigan.era.sc1-terran-ghost.generation.v1",
  assetId: "kerrigan.era.sc1-terran-ghost.v1",
  generatedAt: "2026-09-03T00:21:00.000Z",
  prompt: KERRIGAN_TERRAN_GHOST_ERA_PROMPT_V1,
  output: { path: "assets/characters/kerrigan-persona-eras/kerrigan-era-sc1-terran-ghost-v1.png", contentHash: "d2add9a27d42b6708ef6ff682e04411032ff295aa1824a20b95c8737e49c85dd", byteLength: 1894202, width: 1254, height: 1254, mimeType: "image/png" },
});

export const KERRIGAN_OVERMIND_INFESTED_ERA_RECEIPT_V1 = eraReceipt({
  receiptId: "kerrigan.era.sc1-overmind-infested.generation.v1",
  assetId: "kerrigan.era.sc1-overmind-infested.v1",
  generatedAt: "2026-09-03T00:22:00.000Z",
  prompt: KERRIGAN_OVERMIND_INFESTED_ERA_PROMPT_V1,
  output: { path: "assets/characters/kerrigan-persona-eras/kerrigan-era-sc1-overmind-infested-v1.png", contentHash: "b08c116297b0ac5133b3efc4418f7307923efd487b78099e603a6d487ec42576", byteLength: 2220420, width: 1254, height: 1254, mimeType: "image/png" },
});

export const KERRIGAN_BROOD_WAR_ERA_RECEIPT_V1 = eraReceipt({
  receiptId: "kerrigan.era.brood-war-queen.generation.v1",
  assetId: "kerrigan.era.brood-war-queen.v1",
  generatedAt: "2026-09-03T00:23:00.000Z",
  prompt: KERRIGAN_BROOD_WAR_ERA_PROMPT_V1,
  output: { path: "assets/characters/kerrigan-persona-eras/kerrigan-era-brood-war-queen-v1.png", contentHash: "504c0448344af27fe84a27efa8b8888bd3ea99c047a186317d78cf977086ebc8", byteLength: 2268903, width: 1254, height: 1254, mimeType: "image/png" },
});

export const KERRIGAN_WOL_QUEEN_ERA_RECEIPT_V1 = eraReceipt({
  receiptId: "kerrigan.era.wol-queen.generation.v1",
  assetId: "kerrigan.era.wol-queen.v1",
  generatedAt: "2026-09-03T00:24:00.000Z",
  prompt: KERRIGAN_WOL_QUEEN_ERA_PROMPT_V1,
  output: { path: "assets/characters/kerrigan-persona-eras/kerrigan-era-wol-queen-v1.png", contentHash: "60a104a2c31ae5c6d9f1ad3874b601afe6eb2ca4d79806d28b520c8b553089eb", byteLength: 2200692, width: 1254, height: 1254, mimeType: "image/png" },
});

export const KERRIGAN_HOTS_DEINFESTED_ERA_RECEIPT_V1 = eraReceipt({
  receiptId: "kerrigan.era.hots-deinfested.generation.v1",
  assetId: "kerrigan.era.hots-deinfested.v1",
  generatedAt: "2026-09-03T00:25:00.000Z",
  prompt: KERRIGAN_HOTS_DEINFESTED_ERA_PROMPT_V1,
  output: { path: "assets/characters/kerrigan-persona-eras/kerrigan-era-hots-deinfested-v1.png", contentHash: "c325dc88faaf54b8528a56a56392051f0d9df58bc68e1e066543eabdf27fe1cc", byteLength: 2037440, width: 1254, height: 1254, mimeType: "image/png" },
});

export const KERRIGAN_LOTV_COALITION_ERA_RECEIPT_V1 = eraReceipt({
  receiptId: "kerrigan.era.lotv-coalition.generation.v1",
  assetId: "kerrigan.era.lotv-coalition.v1",
  generatedAt: "2026-09-03T00:26:00.000Z",
  prompt: KERRIGAN_LOTV_COALITION_ERA_PROMPT_V1,
  output: { path: "assets/characters/kerrigan-persona-eras/kerrigan-era-lotv-coalition-v1.png", contentHash: "4e65432cec0bff73c7fde6be59c7fdc90e04d57bc2c097d991b92262fe9882b6", byteLength: 2271491, width: 1254, height: 1254, mimeType: "image/png" },
});

export const KERRIGAN_LOTV_XELNAGA_ERA_RECEIPT_V1 = eraReceipt({
  receiptId: "kerrigan.era.lotv-xelnaga.generation.v1",
  assetId: "kerrigan.era.lotv-xelnaga.v1",
  generatedAt: "2026-09-03T00:27:00.000Z",
  prompt: KERRIGAN_LOTV_XELNAGA_ERA_PROMPT_V1,
  output: { path: "assets/characters/kerrigan-persona-eras/kerrigan-era-lotv-xelnaga-v1.png", contentHash: "347edd2d386d4372e6d337fe5a4c9a243b0c97139a4df63e602fc7ba232739eb", byteLength: 2741301, width: 1254, height: 1254, mimeType: "image/png" },
});

export const KERRIGAN_GENERATED_ERA_RECEIPTS_V1 = Object.freeze([
  KERRIGAN_TERRAN_GHOST_ERA_RECEIPT_V1,
  KERRIGAN_OVERMIND_INFESTED_ERA_RECEIPT_V1,
  KERRIGAN_BROOD_WAR_ERA_RECEIPT_V1,
  KERRIGAN_WOL_QUEEN_ERA_RECEIPT_V1,
  KERRIGAN_HOTS_DEINFESTED_ERA_RECEIPT_V1,
  KERRIGAN_LOTV_COALITION_ERA_RECEIPT_V1,
  KERRIGAN_LOTV_XELNAGA_ERA_RECEIPT_V1,
]);
