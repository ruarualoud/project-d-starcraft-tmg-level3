import { hashStarcraftTmgClientContract } from
  "../../packages/client-domain/portable-contract-hash-v1.mjs";
import { RAYNOR_COMPANION_PACK_V1 } from "./raynor-companion-pack-v1.mjs";
import { ARTANIS_COMPANION_PACK_V1 } from "./artanis-companion-pack-v1.mjs";

/**
 * Companion catalogue (presentation-only) — Ticket 26 / Slice 265 SS-2.
 *
 * The single index the Web/App companion catalogue UI renders. Kerrigan is
 * retained as the existing backend-bound reference pack: her sealed content
 * lives in `kerrigan-primal-v1.mjs` / `kerrigan-worldbook-catalog-v1.mjs`
 * (which import `node:crypto` transitively and therefore cannot be bundled
 * for the browser), so her entry here is a static descriptor pointer, NOT a
 * copy of backend truth. Raynor and Artanis are new presentation-only packs
 * whose backend promotion (package sealing + hash pins) is a Codex-owned
 * gap (`COMPANION_PACK_BACKEND_PROMOTION`).
 *
 * Pixels and catalogue labels never become gameplay truth.
 */

const unsigned = {
  schemaVersion: "starcraft_tmg_companion_catalogue_v1",
  catalogueId: "starcraft-tmg.companion-catalogue.v1",
  version: "1.0.0-presentation.1",
  presentationOnly: true,
  entries: [
    {
      characterId: "starcraft.sarah_kerrigan",
      displayName: "Sarah Kerrigan",
      displayNameZh: "莎拉·凯瑞甘",
      factionAlignment: "zerg",
      factionColor: "#8a5fa3",
      roleLabel: "tactical_adjutant",
      roleLabelZh: "战术副官",
      packStatus: "live_backend_reference",
      referencePointer: {
        packageFile: "content/characters/kerrigan-primal-v1.mjs",
        worldbookCatalogFile: "content/characters/kerrigan-worldbook-catalog-v1.mjs",
        note: "Backend-sealed reference pack; era/persona truth comes from the server projection, not from this descriptor.",
        noteZh: "后端封存的参考包；时代/人格真相来自服务端投影，而非此描述符。",
      },
      eraCount: 8,
      defaultPersonaState: "hots.primal.post_zerus.pre_lotv",
      portraitStatesRef: "content/characters/kerrigan-dynamic-dialogue-portrait-v1.mjs",
      portraitStatus: "generated_development_assets_exist",
    },
    {
      characterId: RAYNOR_COMPANION_PACK_V1.characterId,
      displayName: RAYNOR_COMPANION_PACK_V1.identity.displayName,
      displayNameZh: RAYNOR_COMPANION_PACK_V1.identity.displayNameZh,
      factionAlignment: RAYNOR_COMPANION_PACK_V1.identity.factionAlignment,
      factionColor: RAYNOR_COMPANION_PACK_V1.identity.factionColor,
      roleLabel: "tactical_companion",
      roleLabelZh: "战术同伴",
      packStatus: "presentation_only_assets_pending",
      pack: RAYNOR_COMPANION_PACK_V1,
      eraCount: RAYNOR_COMPANION_PACK_V1.eras.length,
      defaultPersonaState: RAYNOR_COMPANION_PACK_V1.eras.find((era) => era.defaultSelected)?.personaState
        || RAYNOR_COMPANION_PACK_V1.eras[0].personaState,
      portraitStatesRef: "content/characters/raynor-portrait-states-v1.mjs",
      portraitStatus: "pending_codex_generation",
    },
    {
      characterId: ARTANIS_COMPANION_PACK_V1.characterId,
      displayName: ARTANIS_COMPANION_PACK_V1.identity.displayName,
      displayNameZh: ARTANIS_COMPANION_PACK_V1.identity.displayNameZh,
      factionAlignment: ARTANIS_COMPANION_PACK_V1.identity.factionAlignment,
      factionColor: ARTANIS_COMPANION_PACK_V1.identity.factionColor,
      roleLabel: "tactical_companion",
      roleLabelZh: "战术同伴",
      packStatus: "presentation_only_assets_pending",
      pack: ARTANIS_COMPANION_PACK_V1,
      eraCount: ARTANIS_COMPANION_PACK_V1.eras.length,
      defaultPersonaState: ARTANIS_COMPANION_PACK_V1.eras.find((era) => era.defaultSelected)?.personaState
        || ARTANIS_COMPANION_PACK_V1.eras[0].personaState,
      portraitStatesRef: "content/characters/artanis-portrait-states-v1.mjs",
      portraitStatus: "pending_codex_generation",
    },
  ],
  honestyNotes: [
    "Catalogue order is fixed: Kerrigan (reference), Raynor, Artanis.",
    "packStatus distinguishes backend-live reference from presentation-only packs; the UI must render this distinction.",
    "No entry grants Rules, room, Provider, or memory authority.",
  ],
  authority: {
    canOverrideRules: false,
    canMutateRoom: false,
    canCreateTrainingTruth: false,
    gameplayTruthSource: "room_service_and_rules_tools_only",
  },
};

export const COMPANION_CATALOGUE_V1 = Object.freeze({
  ...unsigned,
  catalogueHash: hashStarcraftTmgClientContract(unsigned),
});
