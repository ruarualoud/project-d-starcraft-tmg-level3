import { hashStarcraftTmgContract } from
  "../../packages/authoritative-engine/transition-v1.mjs";
import { KERRIGAN_ALL_ERA_DYNAMIC_PORTRAIT_CATALOG_V1 } from
  "./kerrigan-all-era-dynamic-portraits-v1.mjs";

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
  schemaVersion: "starcraft_tmg_kerrigan_persona_visual_bindings_v2",
  bindingId: "kerrigan-persona-visual-bindings-v2",
  characterId: "starcraft.sarah_kerrigan",
  version: "2.0.0-development.1",
  bindings: KERRIGAN_ALL_ERA_DYNAMIC_PORTRAIT_CATALOG_V1.map((entry) => ({
    personaWorldbookId: entry.personaWorldbookId,
    personaState: entry.personaState,
    visualStatus: "available_development",
    staticPortraitRef: staticPortraitRef(entry.neutralReceipt),
    dialoguePortraitManifestRef: {
      id: entry.manifest.manifestId,
      version: entry.manifest.version,
      hash: entry.manifest.manifestHash,
    },
    publicReleaseAllowed: false,
  })),
  unboundPersonaBehavior: "show_persona_specific_art_pending_never_reuse_another_persona_portrait",
  publicBehavior: "use_project_d_original_adjutant_or_labeled_art_pending",
  generationPolicy: {
    currentProducedPersonaCount: 8,
    staticEraAnchorCount: 8,
    dynamicPersonaCount: 8,
    dynamicManifestCount: 8,
    semanticFrameRoleCountPerPersona: 5,
    totalDynamicFrameCount: 40,
    sharedStateMachineCount: 1,
    runtimeGeneration: false,
    decisionSource: "user.2026-09-03.animate-all-eight-kerrigan-eras",
  },
  authority: {
    canChangePersonaSelection: false,
    canChangeWorldbookFacts: false,
    canOverrideRules: false,
    canMutateRoom: false,
    canCreateTrainingTruth: false,
  },
};

export const KERRIGAN_PERSONA_VISUAL_BINDINGS_V2 = Object.freeze({
  ...unsigned,
  bindingHash: hashStarcraftTmgContract(unsigned),
});
