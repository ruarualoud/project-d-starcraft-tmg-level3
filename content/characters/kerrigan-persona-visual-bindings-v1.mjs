import { hashStarcraftTmgContract } from
  "../../packages/authoritative-engine/transition-v1.mjs";
import {
  KERRIGAN_DYNAMIC_DIALOGUE_PORTRAIT_V1,
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

function staticPortraitRef(receipt) {
  return {
    id: receipt.assetId,
    path: receipt.output.path,
    hash: receipt.output.contentHash,
    receiptHash: receipt.receiptHash,
    width: receipt.output.width,
    height: receipt.output.height,
    mimeType: receipt.output.mimeType,
  };
}

const unsigned = {
  schemaVersion: "starcraft_tmg_kerrigan_persona_visual_bindings_v1",
  bindingId: "kerrigan-persona-visual-bindings-v1",
  characterId: "starcraft.sarah_kerrigan",
  version: "1.0.0-demo.2",
  bindings: [
    {
      personaWorldbookId: "sc1.terran_ghost.pre_tarsonis",
      personaState: "sc1.terran_ghost.pre_tarsonis",
      visualStatus: "available_development",
      staticPortraitRef: staticPortraitRef(KERRIGAN_TERRAN_GHOST_ERA_RECEIPT_V1),
      dialoguePortraitManifestRef: null,
      publicReleaseAllowed: false,
    },
    {
      personaWorldbookId: "sc1.infested.overmind_char",
      personaState: "sc1.infested.overmind_char",
      visualStatus: "available_development",
      staticPortraitRef: staticPortraitRef(KERRIGAN_OVERMIND_INFESTED_ERA_RECEIPT_V1),
      dialoguePortraitManifestRef: null,
      publicReleaseAllowed: false,
    },
    {
      personaWorldbookId: "brood_war.independent_queen",
      personaState: "brood_war.independent_queen",
      visualStatus: "available_development",
      staticPortraitRef: staticPortraitRef(KERRIGAN_BROOD_WAR_ERA_RECEIPT_V1),
      dialoguePortraitManifestRef: null,
      publicReleaseAllowed: false,
    },
    {
      personaWorldbookId: "wol.queen_artifact_search",
      personaState: "wol.queen.artifact_search",
      visualStatus: "available_development",
      staticPortraitRef: staticPortraitRef(KERRIGAN_WOL_QUEEN_ERA_RECEIPT_V1),
      dialoguePortraitManifestRef: null,
      publicReleaseAllowed: false,
    },
    {
      personaWorldbookId: "hots.deinfested_human",
      personaState: "hots.deinfested_human.pre_zerus",
      visualStatus: "available_development",
      staticPortraitRef: staticPortraitRef(KERRIGAN_HOTS_DEINFESTED_ERA_RECEIPT_V1),
      dialoguePortraitManifestRef: null,
      publicReleaseAllowed: false,
    },
    {
      personaWorldbookId: "hots.primal_queen.post_zerus",
      personaState: "hots.primal.post_zerus.pre_lotv",
      visualStatus: "available_development",
      staticPortraitRef: staticPortraitRef(KERRIGAN_SC1_NEUTRAL_RECEIPT_V1),
      dialoguePortraitManifestRef: {
        id: KERRIGAN_DYNAMIC_DIALOGUE_PORTRAIT_V1.manifestId,
        version: KERRIGAN_DYNAMIC_DIALOGUE_PORTRAIT_V1.version,
        hash: KERRIGAN_DYNAMIC_DIALOGUE_PORTRAIT_V1.manifestHash,
      },
      publicReleaseAllowed: false,
    },
    {
      personaWorldbookId: "lotv.coalition_pre_ascension",
      personaState: "lotv.coalition.pre_ascension",
      visualStatus: "available_development",
      staticPortraitRef: staticPortraitRef(KERRIGAN_LOTV_COALITION_ERA_RECEIPT_V1),
      dialoguePortraitManifestRef: null,
      publicReleaseAllowed: false,
    },
    {
      personaWorldbookId: "lotv.xelnaga_epilogue",
      personaState: "lotv.xelnaga.epilogue",
      visualStatus: "available_development",
      staticPortraitRef: staticPortraitRef(KERRIGAN_LOTV_XELNAGA_ERA_RECEIPT_V1),
      dialoguePortraitManifestRef: null,
      publicReleaseAllowed: false,
    },
  ],
  unboundPersonaBehavior: "show_persona_specific_art_pending_never_reuse_primal_portrait",
  publicBehavior: "use_project_d_original_adjutant_or_labeled_art_pending",
  generationPolicy: {
    currentProducedPersonaCount: 8,
    staticEraAnchorCount: 8,
    dynamicPersonaCount: 1,
    generateOtherErasInTicket13: true,
    decisionSource: "user.2026-09-03.generate-all-other-eras",
  },
  authority: {
    canChangePersonaSelection: false,
    canChangeWorldbookFacts: false,
    canOverrideRules: false,
    canMutateRoom: false,
    canCreateTrainingTruth: false,
  },
};

export const KERRIGAN_PERSONA_VISUAL_BINDINGS_V1 = Object.freeze({
  ...unsigned,
  bindingHash: hashStarcraftTmgContract(unsigned),
});
