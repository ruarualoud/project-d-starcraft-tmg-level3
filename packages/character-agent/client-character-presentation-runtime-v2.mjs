import { hashStarcraftTmgContract } from "../authoritative-engine/transition-v1.mjs";
import { createStarcraftTmgCharacterPersonaSelectorV1 } from
  "./character-persona-selector-v1.mjs";
import {
  createStarcraftTmgDynamicDialoguePortraitStateV1,
  resolveStarcraftTmgDynamicDialoguePortraitV1,
} from "./dynamic-dialogue-portrait-v1.mjs";
import {
  KERRIGAN_ALL_ERA_DYNAMIC_GENERATION_AUDIT_V1,
  KERRIGAN_ALL_ERA_DYNAMIC_PORTRAIT_CATALOG_V1,
  KERRIGAN_ALL_ERA_DYNAMIC_PORTRAIT_PLAN_V1,
} from "../../content/characters/kerrigan-all-era-dynamic-portraits-v1.mjs";
import { KERRIGAN_PERSONA_VISUAL_BINDINGS_V2 } from
  "../../content/characters/kerrigan-persona-visual-bindings-v2.mjs";
import { KERRIGAN_COMPLETE_WORLDBOOK_CATALOG_V1 } from
  "../../content/characters/kerrigan-worldbook-catalog-v1.mjs";
import { KERRIGAN_PRIMAL_CHARACTER_PACKAGE_V1 } from
  "../../content/characters/kerrigan-primal-v1.mjs";
import { STARCRAFT_TMG_TICKET_13_CHARACTER_PACKAGE_HANDOFF_V1 } from
  "../../content/characters/ticket-13-character-package-handoff-v1.mjs";

export const STARCRAFT_TMG_CLIENT_CHARACTER_PRESENTATION_RUNTIME_VERSION =
  "starcraft_tmg_client_character_presentation_runtime_v2";

const CLIENT_PROJECTION_VERSION = "starcraft_tmg_client_character_projection_v2";
const FRAME_ROLES = Object.freeze([
  "neutral",
  "blink",
  "speaking",
  "warning",
  "reflect",
]);
const HASH = /^[a-f0-9]{64}$/u;

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function seal(core, key) {
  return deepFreeze({ ...core, [key]: hashStarcraftTmgContract(core) });
}

function nonEmpty(value, field) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new TypeError(`${field} is required`);
  return normalized;
}

function principalScopeHash(value) {
  const normalized = String(value || "").toLowerCase();
  if (!HASH.test(normalized)) throw new TypeError("principalScopeHash must be a SHA-256 digest");
  return normalized;
}

function rejection(reason, details = {}) {
  return deepFreeze({
    ok: false,
    schemaVersion: `${STARCRAFT_TMG_CLIENT_CHARACTER_PRESENTATION_RUNTIME_VERSION}.rejection`,
    reason,
    ...clone(details),
    trainingTruth: false,
  });
}

function rightsDecision(releaseChannel, explicitlyConfigured) {
  const development = releaseChannel === "development_internal";
  return seal({
    schemaVersion: "starcraft_tmg_character_rights_decision_v2",
    releaseChannel,
    decisionSource: explicitlyConfigured
      ? "fixed_server_configuration"
      : "fail_closed_default",
    textIdentityAllowed: development,
    derivedVisualAllowed: development,
    audioAllowed: false,
    imitativeVoiceAllowed: false,
    assetDeliveryAllowed: development,
    fallbackKind: development
      ? "not_required_for_authorized_internal_preview"
      : "asset_free_neutral_adjutant",
  }, "rightsDecisionHash");
}

function publicProjection(scopeHash, rights) {
  const core = {
    schemaVersion: CLIENT_PROJECTION_VERSION,
    releaseChannel: "public",
    principalScopeHash: scopeHash,
    fallback: {
      kind: "asset_free_neutral_adjutant",
      label: "Project D Tactical Adjutant",
      asset: null,
      dynamic: false,
    },
    rights,
    capabilities: {
      selectPersona: false,
      setSpoilerAccess: false,
      runProvider: false,
      applyRoomAction: false,
      generateSkill: false,
      createTrainingTruth: false,
    },
    trainingTruth: false,
  };
  return seal(core, "projectionHash");
}

function frameProjection(frame) {
  return {
    frameId: frame.frameId,
    role: frame.role,
    contentHash: frame.contentHash,
    width: frame.width,
    height: frame.height,
    mimeType: frame.mimeType,
  };
}

export function createStarcraftTmgClientCharacterPresentationRuntimeV2(options = {}) {
  const explicitlyConfigured = options.releaseChannel === "development_internal"
    || options.releaseChannel === "public";
  const releaseChannel = options.releaseChannel === "development_internal"
    ? "development_internal"
    : "public";
  const rights = rightsDecision(releaseChannel, explicitlyConfigured);
  const configuredAssetDeliveryIssuer = typeof options.issueAssetDelivery === "function"
    ? options.issueAssetDelivery
    : null;
  const characterPackage = options.characterPackage
    || KERRIGAN_PRIMAL_CHARACTER_PACKAGE_V1;
  const worldbooks = options.worldbooks
    || KERRIGAN_COMPLETE_WORLDBOOK_CATALOG_V1;
  const visualBindingSet = options.personaVisualBindingSet
    || KERRIGAN_PERSONA_VISUAL_BINDINGS_V2;
  const portraitCatalog = options.portraitCatalog
    || KERRIGAN_ALL_ERA_DYNAMIC_PORTRAIT_CATALOG_V1;
  const selector = createStarcraftTmgCharacterPersonaSelectorV1({
    characterPackage,
    worldbooks,
    personaVisualBindingSet: visualBindingSet,
  });
  const manifestByPersona = new Map(portraitCatalog.map((entry) => [
    entry.personaWorldbookId,
    entry.manifest,
  ]));
  const manifestByHash = new Map(portraitCatalog.map((entry) => [
    entry.manifest.manifestHash,
    entry.manifest,
  ]));
  const assetByHash = new Map();
  for (const entry of portraitCatalog) {
    for (const frame of entry.manifest.frames) {
      if (assetByHash.has(frame.contentHash)) {
        throw new Error(`duplicate character asset content hash: ${frame.contentHash}`);
      }
      assetByHash.set(frame.contentHash, {
        contentHash: frame.contentHash,
        outputPath: frame.outputPath,
        mimeType: frame.mimeType,
        byteLength: frame.byteLength,
      });
    }
  }
  const maxCeilingRank = Math.max(...selector.catalogue.ceilingSteps);
  const defaultCeilingRank = Number(characterPackage.spoilerProfile.defaultRank);

  function createInitialState(input = {}) {
    const result = selector.createState({
      spoilerCeilingRank: defaultCeilingRank,
      knowledgeCeilingRank: defaultCeilingRank,
      connectivity: "online",
      updatedAt: input.updatedAt,
    });
    if (!result.ok) throw new Error(`character selector initialization failed: ${result.reason}`);
    return result.state;
  }

  function scopedSelectorProjection(state) {
    const source = selector.readView(state);
    const options = source.personaOptions.map((option, slotIndex) => {
      if (!option.available) {
        return seal({
          kind: "locked",
          slotIndex,
          selected: false,
          selectable: false,
          disabledReason: "spoiler_or_knowledge_ceiling",
        }, "optionHash");
      }
      const manifest = manifestByPersona.get(option.worldbookId);
      const neutral = manifest?.frames.find((frame) => frame.role === "neutral");
      if (!manifest || !neutral) {
        throw new Error(`selected CharacterPackage persona has no exact visual manifest: ${option.worldbookId}`);
      }
      return seal({
        kind: "persona",
        slotIndex,
        worldbookId: option.worldbookId,
        title: option.title,
        personaState: option.personaState,
        timeline: clone(option.timeline),
        knowledgeRank: option.knowledgeRank,
        spoilerRank: option.spoilerRank,
        selected: option.selected,
        selectable: !option.selected && state.connectivity === "online",
        disabledReason: null,
        thumbnailFrame: frameProjection(neutral),
      }, "optionHash");
    });
    const core = {
      schemaVersion: "starcraft_tmg_ceiling_scoped_persona_selector_v2",
      catalogueHash: source.catalogueHash,
      stateHash: source.stateHash,
      revision: source.revision,
      connectivity: source.connectivity,
      selectionMode: "exactly_one",
      capacityPolicy: selector.catalogue.capacityPolicy,
      spoilerCeilingRank: source.spoilerCeilingRank,
      knowledgeCeilingRank: source.knowledgeCeilingRank,
      fullCatalogueRevealed:
        source.spoilerCeilingRank >= maxCeilingRank
        && source.knowledgeCeilingRank >= maxCeilingRank,
      options,
      selectedPersonaWorldbookId: source.personaOptions.find((entry) => entry.selected).worldbookId,
    };
    return seal(core, "selectorViewHash");
  }

  function projectDevelopment(state, scopeHash, input) {
    const selectorProjection = scopedSelectorProjection(state);
    const selected = selectorProjection.options.find((entry) => entry.kind === "persona" && entry.selected);
    if (!selected) throw new Error("scoped selector projection has no visible selected persona");
    const manifest = manifestByPersona.get(selected.worldbookId);
    const portraitState = createStarcraftTmgDynamicDialoguePortraitStateV1(manifest, {
      mode: "companion",
      updatedAt: state.updatedAt,
    });
    const portraitView = resolveStarcraftTmgDynamicDialoguePortraitV1(
      manifest,
      portraitState,
      { environment: "development" },
    );
    if (!portraitView.ok || portraitView.phase !== "idle") {
      throw new Error("development portrait projection did not resolve to a displayable idle view");
    }
    const framesByRole = new Map(manifest.frames.map((frame) => [frame.role, frame]));
    const frameRegistry = FRAME_ROLES.map((role) => frameProjection(framesByRole.get(role)));
    const frameSchedule = portraitView.frameSchedule.map((entry) => ({
      role: entry.role,
      durationMs: entry.durationMs,
      frameId: entry.frameId,
      contentHash: entry.contentHash,
    }));
    const issueAssetDelivery = typeof input.issueAssetDelivery === "function"
      ? input.issueAssetDelivery
      : configuredAssetDeliveryIssuer;
    if (!issueAssetDelivery) {
      throw new Error("development Character projection requires a server-owned asset grant issuer");
    }
    const assetDelivery = issueAssetDelivery({
      rightsDecisionHash: rights.rightsDecisionHash,
      characterPackageHash: characterPackage.integrity.hash,
      visualBindingHash: visualBindingSet.bindingHash,
      selectorStateHash: selectorProjection.stateHash,
      selectorRevision: selectorProjection.revision,
      selectedPersonaWorldbookId: selected.worldbookId,
      manifestHash: manifest.manifestHash,
      allowedContentHashes: frameRegistry.map((frame) => frame.contentHash),
    });
    const portrait = {
      schemaVersion: "starcraft_tmg_character_portrait_projection_v2",
      kind: "dynamic_development",
      mode: portraitView.mode,
      phase: portraitView.phase,
      visualCue: portraitView.visualCue,
      stateHash: portraitState.stateHash,
      revision: portraitState.revision,
      manifestHash: manifest.manifestHash,
      frameRegistry,
      frameSchedule,
      scheduleHash: hashStarcraftTmgContract(frameSchedule),
      assetDelivery: clone(assetDelivery),
    };
    portrait.portraitViewHash = hashStarcraftTmgContract(portrait);
    const bindingCore = {
      schemaVersion: "starcraft_tmg_character_atomic_binding_v2",
      ticket13HandoffHash: STARCRAFT_TMG_TICKET_13_CHARACTER_PACKAGE_HANDOFF_V1.handoffHash,
      characterPackageHash: characterPackage.integrity.hash,
      catalogueHash: selectorProjection.catalogueHash,
      selectorStateHash: selectorProjection.stateHash,
      selectorRevision: selectorProjection.revision,
      selectedPersonaWorldbookId: selected.worldbookId,
      selectedPersonaState: selected.personaState,
      visualBindingHash: visualBindingSet.bindingHash,
      manifestHash: manifest.manifestHash,
      portraitStateHash: portraitState.stateHash,
      portraitRevision: portraitState.revision,
      rightsDecisionHash: rights.rightsDecisionHash,
      releaseChannel,
    };
    const bindings = seal(bindingCore, "bindingHash");
    const core = {
      schemaVersion: CLIENT_PROJECTION_VERSION,
      releaseChannel,
      principalScopeHash: scopeHash,
      character: {
        characterId: characterPackage.characterId,
        displayName: characterPackage.displayName,
        productRole: characterPackage.productRole,
        productRoleIsCanon: characterPackage.productRoleIsCanon,
      },
      selector: selectorProjection,
      portrait: deepFreeze(portrait),
      rights,
      bindings,
      capabilities: {
        selectPersona: true,
        setSpoilerAccess: true,
        runProvider: false,
        applyRoomAction: false,
        generateSkill: false,
        createTrainingTruth: false,
      },
      trainingTruth: false,
    };
    return seal(core, "projectionHash");
  }

  function project(state, input = {}) {
    const scopeHash = principalScopeHash(input.principalScopeHash);
    if (releaseChannel !== "development_internal" || input.authenticated !== true) {
      return publicProjection(scopeHash, rightsDecision("public", explicitlyConfigured));
    }
    return projectDevelopment(
      state || createInitialState({ updatedAt: input.updatedAt }),
      scopeHash,
      input,
    );
  }

  function selectPersona(state, input = {}) {
    if (releaseChannel !== "development_internal") {
      return rejection("CHARACTER_SELECTION_UNAVAILABLE_IN_RELEASE");
    }
    const result = selector.dispatch(state, {
      type: "select_persona",
      personaWorldbookId: nonEmpty(input.personaWorldbookId, "personaWorldbookId"),
      expectedRevision: input.expectedRevision,
      occurredAt: input.occurredAt,
    });
    return result.ok ? result : rejection(result.reason, result);
  }

  function setFullSpoilerAccess(state, input = {}) {
    if (releaseChannel !== "development_internal") {
      return rejection("CHARACTER_SELECTION_UNAVAILABLE_IN_RELEASE");
    }
    const enabled = input.enabled === true;
    const ceiling = enabled ? maxCeilingRank : defaultCeilingRank;
    const result = selector.dispatch(state, {
      type: "set_ceilings",
      spoilerCeilingRank: ceiling,
      knowledgeCeilingRank: ceiling,
      expectedRevision: input.expectedRevision,
      occurredAt: input.occurredAt,
    });
    return result.ok ? result : rejection(result.reason, result);
  }

  function resolveAsset(input = {}) {
    if (releaseChannel !== "development_internal") {
      return rejection("CHARACTER_ASSET_NOT_RELEASED");
    }
    const contentHash = String(input.contentHash || "").toLowerCase();
    const asset = assetByHash.get(contentHash);
    if (!asset) return rejection("CHARACTER_ASSET_NOT_FOUND");
    const state = input.state;
    const source = selector.readView(state);
    const selected = source.personaOptions.find((entry) => entry.selected);
    const manifest = selected ? manifestByPersona.get(selected.worldbookId) : null;
    if (!manifest
      || manifestByHash.get(String(input.manifestHash || "")) !== manifest
      || input.rightsDecisionHash !== rights.rightsDecisionHash
      || input.characterPackageHash !== characterPackage.integrity.hash
      || input.visualBindingHash !== visualBindingSet.bindingHash
      || input.selectorStateHash !== state.stateHash
      || input.selectorRevision !== state.revision
      || input.selectedPersonaWorldbookId !== selected.worldbookId
      || !manifest.frames.some((frame) => frame.contentHash === contentHash)) {
      return rejection("CHARACTER_ASSET_GRANT_SCOPE_MISMATCH");
    }
    return deepFreeze({
      ok: true,
      schemaVersion: `${STARCRAFT_TMG_CLIENT_CHARACTER_PRESENTATION_RUNTIME_VERSION}.asset`,
      ...clone(asset),
      releaseChannel,
      cachePolicy: "private_no_store",
      publicReleaseAllowed: false,
      trainingTruth: false,
    });
  }

  return deepFreeze({
    schemaVersion: STARCRAFT_TMG_CLIENT_CHARACTER_PRESENTATION_RUNTIME_VERSION,
    releaseChannel,
    rightsDecision: rights,
    pins: {
      ticket13HandoffHash: STARCRAFT_TMG_TICKET_13_CHARACTER_PACKAGE_HANDOFF_V1.handoffHash,
      characterPackageHash: characterPackage.integrity.hash,
      visualBindingHash: visualBindingSet.bindingHash,
      allEraPlanHash: KERRIGAN_ALL_ERA_DYNAMIC_PORTRAIT_PLAN_V1.planHash,
      generationAuditHash: KERRIGAN_ALL_ERA_DYNAMIC_GENERATION_AUDIT_V1.auditHash,
    },
    createInitialState,
    project,
    selectPersona,
    setFullSpoilerAccess,
    resolveAsset,
    trainingTruth: false,
  });
}
