import { hashStarcraftTmgClientContract } from
  "../../packages/client-domain/portable-contract-hash-v1.mjs";
import { ZAGARA_PORTRAIT_STATE_CONTRACT_V1 } from "./zagara-portrait-states-v1.mjs";
import { RAYNOR_PORTRAIT_STATE_CONTRACT_V1 } from "./raynor-portrait-states-v1.mjs";
import { NOVA_PORTRAIT_STATE_CONTRACT_V1 } from "./nova-portrait-states-v1.mjs";
import { ARTANIS_PORTRAIT_STATE_CONTRACT_V1 } from "./artanis-portrait-states-v1.mjs";
import { ZERATUL_PORTRAIT_STATE_CONTRACT_V1 } from "./zeratul-portrait-states-v1.mjs";

/**
 * Companion portrait asset registry (server-safe) — Ticket 26 / Slice 266d.
 *
 * The single server-consumable index binding every registered companion's six
 * semantic presentation states to the COMMITTED, audit-admitted portrait
 * keyframes under `assets/characters/`. The five presentation packs' bindings
 * are derived from their portrait-state contracts (`frameBindings`); Kerrigan
 * binds the receipted SC1 dialogue frames whose content hashes are pinned by
 * `content/characters/kerrigan-dynamic-dialogue-portrait-v1.mjs` (with
 * `damaged_concerned` honestly sharing the approved `warning` frame — the
 * same labelled mapping the Web/App registry
 * `apps/starcraft-tmg-expo/lib/level3/companion-portrait-assets-v1.ts`
 * renders). No entry invents an asset, a hash or a receipt: the browser gate
 * re-hashes every labelled file and rejects any drift, and the companion
 * backend presentation resolver fails closed on any catalog/binding/receipt
 * mismatch.
 *
 * Registration stays data-driven and extensible: a seventh companion appends
 * one portrait-state contract import plus one entry here (and its catalogue
 * entry); product construction and UI control flow never change.
 */

const KERRIGAN_RECEIPTS_REF = "content/characters/kerrigan-dynamic-dialogue-portrait-v1.mjs";
const KERRIGAN_DIR = "assets/characters/kerrigan-primal-adjutant";
const MEDIA_TYPE = "image/png";

function kerriganFrame(stateId, file, contentHash, extra = {}) {
  return {
    stateId,
    assetId: `${KERRIGAN_DIR}/${file}`,
    contentHash,
    mediaType: MEDIA_TYPE,
    admissionClass: "receipted_dynamic_contract_frame",
    admissionRef: KERRIGAN_RECEIPTS_REF,
    ...extra,
  };
}

// Receipt-pinned content hashes, identical to the Web/App registry and the
// committed receipts file; drift is rejected by the gate's file re-hash.
const KERRIGAN_STATES = Object.freeze([
  kerriganFrame("idle", "kerrigan-sc1-dialogue-neutral-v1.png",
    "40ecb9bf87cdbcf15b42a8cb910d5142a128490a43043433cc469c5efec53edd"),
  kerriganFrame("speaking", "kerrigan-sc1-dialogue-speaking-v1.png",
    "d64aa639b0ced17fbef9ba811a6093298a404517ae09eb4c1392de4167444c7e"),
  kerriganFrame("listening", "kerrigan-sc1-dialogue-blink-v1.png",
    "4b1b1b9fb76f7448c2bfed97dadbb41d7da2d37cd56bdb1863ac37a7062324f0"),
  kerriganFrame("alert_combat", "kerrigan-sc1-dialogue-warning-v1.png",
    "77baaba304278c8d1de88f4d4c2c6b634ef00340230da5e2de2412f6c8823b0d"),
  kerriganFrame("damaged_concerned", "kerrigan-sc1-dialogue-warning-v1.png",
    "77baaba304278c8d1de88f4d4c2c6b634ef00340230da5e2de2412f6c8823b0d", {
      availability: "shared_approved_frame",
      sharedWithStateId: "alert_combat",
    }),
  kerriganFrame("reflective", "kerrigan-sc1-dialogue-reflect-v1.png",
    "7938ecc1aab4aa4eee7f86d12e473a3903fade7dcbde1c0d7e92ba8154b9989b"),
]);

function contractStates(contract) {
  return (contract.frameBindings || []).map((binding) => ({
    stateId: binding.stateId,
    assetId: binding.assetRef,
    contentHash: binding.contentHash,
    mediaType: MEDIA_TYPE,
    admissionClass: binding.admissionClass || "audit_admitted_static_keyframe",
    admissionRef: binding.admissionRef || contract.contractId,
    availability: "admitted_keyframe",
  }));
}

function entry(characterId, admissionClass, states) {
  return {
    characterId,
    packageId: `starcraft-tmg.companion.${characterId.split(".")[1] || characterId}`,
    admissionClass,
    animationStatus: "keyframe_only_continuous_animation_not_proven",
    states,
  };
}

const unsigned = {
  schemaVersion: "starcraft_tmg_companion_portrait_asset_registry_v1",
  registryId: "starcraft-tmg.companion-portrait-asset-registry.v1",
  version: "1.0.0",
  presentationOnly: true,
  // Registration order matches the companion catalogue roster. Appending one
  // entry (plus its portrait-state contract) is the entire registration cost
  // of a seventh companion.
  entries: [
    entry("starcraft.sarah_kerrigan", "receipted_dynamic_contract_frames", KERRIGAN_STATES),
    entry("starcraft.zagara", "audit_admitted_static_keyframes", contractStates(ZAGARA_PORTRAIT_STATE_CONTRACT_V1)),
    entry("starcraft.jim_raynor", "audit_admitted_static_keyframes", contractStates(RAYNOR_PORTRAIT_STATE_CONTRACT_V1)),
    entry("starcraft.nova_terra", "audit_admitted_static_keyframes", contractStates(NOVA_PORTRAIT_STATE_CONTRACT_V1)),
    entry("starcraft.artanis", "audit_admitted_static_keyframes", contractStates(ARTANIS_PORTRAIT_STATE_CONTRACT_V1)),
    entry("starcraft.zeratul", "audit_admitted_static_keyframes", contractStates(ZERATUL_PORTRAIT_STATE_CONTRACT_V1)),
  ],
  honestyNotes: [
    "Every binding points at a committed repository asset; the gate re-hashes every file and rejects drift between this registry, the on-disk bytes and the served bundle.",
    "Kerrigan damaged_concerned intentionally shares the approved warning frame (shared_approved_frame); no dedicated frame is pretended.",
    "Admission covers static keyframes only; continuous animation is not proven for any entry.",
    "No binding grants Rules, room, Provider, or memory authority; pixels never become gameplay truth.",
  ],
  authority: {
    canOverrideRules: false,
    canMutateRoom: false,
    canCreateTrainingTruth: false,
  },
};

export const COMPANION_PORTRAIT_ASSET_REGISTRY_V1 = Object.freeze({
  ...unsigned,
  registryHash: hashStarcraftTmgClientContract(unsigned),
});

export function companionPortraitAssetRegistryEntryV1(characterId) {
  return COMPANION_PORTRAIT_ASSET_REGISTRY_V1.entries
    .find((candidate) => candidate.characterId === characterId) || null;
}

/**
 * presentationAssets map for the generic companion-package contract:
 * { stateId: { assetId, contentHash, mediaType } }. Returns null when the
 * character has no registry entry (fail closed; nothing is invented).
 */
export function companionPortraitPresentationAssetsV1(characterId) {
  const found = companionPortraitAssetRegistryEntryV1(characterId);
  if (!found) return null;
  const presentationAssets = {};
  for (const state of found.states) {
    presentationAssets[state.stateId] = {
      assetId: state.assetId,
      contentHash: state.contentHash,
      mediaType: state.mediaType,
    };
  }
  return presentationAssets;
}

/**
 * Receipt-bound asset catalog for the companion backend presentation
 * resolver, keyed by assetId and deduplicated (Kerrigan's shared warning
 * frame appears once). Receipts bind the admission document and the content
 * hash; the resolver fails closed on any mismatch.
 */
export function companionPortraitAssetCatalogV1() {
  const catalog = {};
  for (const found of COMPANION_PORTRAIT_ASSET_REGISTRY_V1.entries) {
    for (const state of found.states) {
      if (catalog[state.assetId]) continue;
      catalog[state.assetId] = {
        assetId: state.assetId,
        contentHash: state.contentHash,
        mediaType: state.mediaType,
        receipt: {
          receiptId: `portrait-admission:${found.characterId}:${state.stateId}`,
          sourceRef: state.admissionRef,
          contentHash: state.contentHash,
        },
      };
    }
  }
  return catalog;
}
