import { hashStarcraftTmgClientContract } from
  "../../packages/client-domain/portable-contract-hash-v1.mjs";
import { RAYNOR_COMPANION_PACK_V1 } from "./raynor-companion-pack-v1.mjs";
import { ARTANIS_COMPANION_PACK_V1 } from "./artanis-companion-pack-v1.mjs";
import { NOVA_COMPANION_PACK_V1 } from "./nova-companion-pack-v1.mjs";
import { ZAGARA_COMPANION_PACK_V1 } from "./zagara-companion-pack-v1.mjs";
import { ZERATUL_COMPANION_PACK_V1 } from "./zeratul-companion-pack-v1.mjs";

/**
 * Companion catalogue (presentation-only) — Ticket 26 / Slice 265 SS-2,
 * extended to the six-companion roster in Slice 266b SS-1.
 *
 * The single index the Web/App companion catalogue UI renders. Kerrigan is
 * retained as the existing backend-bound reference pack AND the default
 * companion: her sealed content lives in `kerrigan-primal-v1.mjs` /
 * `kerrigan-worldbook-catalog-v1.mjs` (which import `node:crypto`
 * transitively and therefore cannot be bundled for the browser), so her
 * entry here is a static descriptor pointer, NOT a copy of backend truth.
 * The other five are presentation-only packs whose backend promotion
 * (package sealing + hash pins) is a Codex-owned gap
 * (`COMPANION_PACK_BACKEND_PROMOTION`).
 *
 * The catalogue is registration/data-driven: a seventh companion is added by
 * appending one entry here plus one portrait registry record — the UI control
 * flow never changes.
 *
 * Pixels and catalogue labels never become gameplay truth.
 */

function presentationEntry(pack, extra = {}) {
  return {
    characterId: pack.characterId,
    displayName: pack.identity.displayName,
    displayNameZh: pack.identity.displayNameZh,
    factionAlignment: pack.identity.factionAlignment,
    factionColor: pack.identity.factionColor,
    roleLabel: "tactical_companion",
    roleLabelZh: "战术同伴",
    packStatus: "presentation_only",
    pack,
    eraCount: pack.eras.length,
    defaultPersonaState: pack.eras.find((era) => era.defaultSelected)?.personaState
      || pack.eras[0].personaState,
    portraitStatesRef: pack.visualAssets.stateContractRef,
    portraitStatus: "admitted_static_keyframes_committed",
    portraitAdmissionClass: "single_keyframe_per_state_continuous_animation_not_proven",
    portraitAuditRef: pack.visualAssets.auditRef,
    ...extra,
  };
}

const unsigned = {
  schemaVersion: "starcraft_tmg_companion_catalogue_v1",
  catalogueId: "starcraft-tmg.companion-catalogue.v1",
  version: "1.1.0-presentation.1",
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
      defaultCompanion: true,
      referencePointer: {
        packageFile: "content/characters/kerrigan-primal-v1.mjs",
        worldbookCatalogFile: "content/characters/kerrigan-worldbook-catalog-v1.mjs",
        note: "Backend-sealed reference pack; era/persona truth comes from the server projection, not from this descriptor.",
        noteZh: "后端封存的参考包；时代/人格真相来自服务端投影，而非此描述符。",
      },
      eraCount: 8,
      defaultPersonaState: "hots.primal.post_zerus.pre_lotv",
      portraitStatesRef: "content/characters/kerrigan-dynamic-dialogue-portrait-v1.mjs",
      portraitStatus: "approved_dynamic_portrait_contract_frames",
      portraitAdmissionClass: "receipted_frames_shared_state_mapping",
      portraitSharedStates: "alert_combat and damaged_concerned both bind the approved warning frame; labelled honestly in UI",
      portraitAuditRef: "content/characters/kerrigan-dynamic-dialogue-portrait-v1.mjs",
    },
    presentationEntry(ZAGARA_COMPANION_PACK_V1),
    presentationEntry(RAYNOR_COMPANION_PACK_V1),
    presentationEntry(NOVA_COMPANION_PACK_V1),
    presentationEntry(ARTANIS_COMPANION_PACK_V1),
    presentationEntry(ZERATUL_COMPANION_PACK_V1),
  ],
  honestyNotes: [
    "Catalogue order is fixed: Kerrigan (default, backend reference), Zagara, Raynor, Nova, Artanis, Zeratul — grouped Zerg / Terran / Protoss.",
    "packStatus distinguishes the backend-live reference pack from presentation-only packs; the UI must render this distinction.",
    "portraitStatus records the honest asset class: Kerrigan's receipted dynamic-contract frames (with one shared state mapping) versus audit-admitted static keyframes for the five presentation packs; continuous animation is not proven for any entry.",
    "Adding a seventh companion is data-only: one catalogue entry plus one portrait registry record; UI control flow does not change.",
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
