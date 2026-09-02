import { hashStarcraftTmgContract } from "../authoritative-engine/transition-v1.mjs";
import { assertStarcraftTmgCharacterContract } from "./contracts-v1.mjs";
import { createStarcraftTmgWorldbookRegistry } from "./worldbook-registry-v1.mjs";

export const STARCRAFT_TMG_CHARACTER_PERSONA_SELECTOR_VERSION =
  "starcraft_tmg_character_persona_selector_v1";

const CONNECTIVITY_MODES = new Set(["online", "offline"]);

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function requiredString(value, field) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new Error(`${field} is required`);
  return normalized;
}

function nonNegativeInteger(value, field) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < 0) {
    throw new Error(`${field} must be a non-negative safe integer`);
  }
  return normalized;
}

function stringList(value, field) {
  if (!Array.isArray(value)) throw new Error(`${field} must be an array`);
  const normalized = value.map((entry, index) => requiredString(entry, `${field}[${index}]`));
  if (new Set(normalized).size !== normalized.length) throw new Error(`${field} must not contain duplicates`);
  return normalized;
}

function rejection(reason, details = {}) {
  return deepFreeze({
    ok: false,
    schemaVersion: `${STARCRAFT_TMG_CHARACTER_PERSONA_SELECTOR_VERSION}.rejection`,
    reason,
    ...clone(details),
  });
}

function unsignedState(value) {
  const { stateHash: _stateHash, ...unsigned } = clone(value);
  return unsigned;
}

function unsignedSnapshot(value) {
  const { snapshotHash: _snapshotHash, ...unsigned } = clone(value);
  return unsigned;
}

function sortWorldbooks(left, right) {
  return left.spoilerRank - right.spoilerRank
    || left.knowledgeRank - right.knowledgeRank
    || left.worldbookId.localeCompare(right.worldbookId);
}

function selectorItem(worldbook) {
  return {
    worldbookId: worldbook.worldbookId,
    version: worldbook.version,
    integrityHash: worldbook.integrity.hash,
    title: worldbook.title,
    worldbookKind: worldbook.worldbookKind,
    personaState: worldbook.personaState,
    timeline: clone(worldbook.timeline),
    knowledgeCutoff: worldbook.knowledgeCutoff,
    knowledgeRank: worldbook.knowledgeRank,
    spoilerLevel: worldbook.spoilerLevel,
    spoilerRank: worldbook.spoilerRank,
    canonStatus: worldbook.canonStatus,
    visualIdentity: clone(worldbook.visualIdentity),
  };
}

export function createStarcraftTmgCharacterPersonaSelectorV1(input = {}) {
  const characterPackage = assertStarcraftTmgCharacterContract(input.characterPackage, "character-package");
  const worldbooks = (input.worldbooks || []).map((entry) =>
    assertStarcraftTmgCharacterContract(entry, "worldbook"));
  const byId = new Map();
  for (const worldbook of worldbooks) {
    if (worldbook.characterId !== characterPackage.characterId) {
      throw new Error(`worldbook ${worldbook.worldbookId} character mismatch`);
    }
    if (!characterPackage.worldbookIds.includes(worldbook.worldbookId)) {
      throw new Error(`worldbook ${worldbook.worldbookId} is not allowed by CharacterPackage`);
    }
    if (byId.has(worldbook.worldbookId)) throw new Error(`duplicate worldbook: ${worldbook.worldbookId}`);
    byId.set(worldbook.worldbookId, worldbook);
  }
  const missingIds = characterPackage.worldbookIds.filter((worldbookId) => !byId.has(worldbookId));
  if (missingIds.length) throw new Error(`selector catalogue is incomplete: ${missingIds.join(",")}`);
  const personaWorldbooks = worldbooks.filter((worldbook) => worldbook.worldbookKind === "persona_edition").sort(sortWorldbooks);
  const contextWorldbooks = worldbooks.filter((worldbook) => worldbook.worldbookKind !== "persona_edition").sort(sortWorldbooks);
  if (personaWorldbooks.length < 1) throw new Error("selector requires at least one persona edition");
  if (new Set(personaWorldbooks.map((worldbook) => worldbook.personaState)).size !== personaWorldbooks.length) {
    throw new Error("personaState must be unique across persona editions");
  }
  const registry = createStarcraftTmgWorldbookRegistry({
    characterId: characterPackage.characterId,
    worldbooks,
  });
  const defaultPersonaIds = characterPackage.defaultWorldbookIds.filter((worldbookId) =>
    byId.get(worldbookId)?.worldbookKind === "persona_edition");
  if (defaultPersonaIds.length !== 1) throw new Error("CharacterPackage must configure exactly one default persona edition");
  const defaultContextIds = characterPackage.defaultWorldbookIds.filter((worldbookId) =>
    byId.get(worldbookId)?.worldbookKind !== "persona_edition");
  const suppliedVisualBindingSet = input.personaVisualBindingSet || null;
  if (suppliedVisualBindingSet) {
    const { bindingHash, ...unsignedBindingSet } = clone(suppliedVisualBindingSet);
    if (bindingHash !== hashStarcraftTmgContract(unsignedBindingSet)) {
      throw new Error("persona visual binding set integrity mismatch");
    }
    if (suppliedVisualBindingSet.characterId !== characterPackage.characterId) {
      throw new Error("persona visual binding set character mismatch");
    }
  }
  const visualBindings = suppliedVisualBindingSet?.bindings || [];
  if (!Array.isArray(visualBindings)) throw new Error("persona visual bindings must be an array");
  const visualBindingByPersonaId = new Map();
  for (const binding of visualBindings) {
    const personaWorldbookId = requiredString(binding.personaWorldbookId, "personaVisualBinding.personaWorldbookId");
    const persona = byId.get(personaWorldbookId);
    if (!persona || persona.worldbookKind !== "persona_edition") {
      throw new Error(`persona visual binding references an unknown persona: ${personaWorldbookId}`);
    }
    if (persona.personaState !== binding.personaState) {
      throw new Error(`persona visual binding state mismatch: ${personaWorldbookId}`);
    }
    if (visualBindingByPersonaId.has(personaWorldbookId)) {
      throw new Error(`duplicate persona visual binding: ${personaWorldbookId}`);
    }
    const staticHash = binding.staticPortraitRef?.hash
      ? requiredString(binding.staticPortraitRef.hash, "personaVisualBinding.staticPortraitHash")
      : null;
    const receiptHash = binding.staticPortraitRef?.receiptHash
      ? requiredString(binding.staticPortraitRef.receiptHash, "personaVisualBinding.staticPortraitReceiptHash")
      : null;
    const manifestHash = binding.dialoguePortraitManifestRef?.hash
      ? requiredString(binding.dialoguePortraitManifestRef.hash, "personaVisualBinding.manifestHash")
      : null;
    if (!staticHash && !manifestHash) {
      throw new Error("persona visual binding requires a static portrait or dynamic portrait manifest");
    }
    if (staticHash && !/^[a-f0-9]{64}$/.test(staticHash)) {
      throw new Error("persona visual binding staticPortraitHash must be SHA-256");
    }
    if (staticHash && (!receiptHash || !/^[a-f0-9]{64}$/.test(receiptHash))) {
      throw new Error("persona visual binding staticPortraitReceiptHash must be SHA-256");
    }
    if (manifestHash && !/^[a-f0-9]{64}$/.test(manifestHash)) {
      throw new Error("persona visual binding manifestHash must be SHA-256");
    }
    visualBindingByPersonaId.set(personaWorldbookId, deepFreeze(clone(binding)));
  }
  const unboundPersonaBehavior = suppliedVisualBindingSet?.unboundPersonaBehavior
    || "show_persona_specific_art_pending_never_reuse_another_persona_portrait";
  const catalogue = {
    schemaVersion: `${STARCRAFT_TMG_CHARACTER_PERSONA_SELECTOR_VERSION}.catalogue`,
    characterRef: {
      id: characterPackage.characterId,
      version: characterPackage.version,
      hash: characterPackage.integrity.hash,
    },
    capacityPolicy: "unbounded_versioned_catalogue_no_fixed_persona_denominator",
    personaItems: personaWorldbooks.map(selectorItem),
    contextItems: contextWorldbooks.map(selectorItem),
    personaVisualBindings: visualBindings.map((binding) => clone(binding)),
    availablePersonaVisualCount: visualBindings.length,
    staticPersonaVisualCount: visualBindings.filter((binding) => binding.staticPortraitRef).length,
    dynamicPersonaVisualCount: visualBindings.filter((binding) => binding.dialoguePortraitManifestRef).length,
    unboundPersonaBehavior,
    defaultPersonaWorldbookId: defaultPersonaIds[0],
    defaultContextWorldbookIds: defaultContextIds,
    ceilingSteps: [...new Set(worldbooks.flatMap((worldbook) => [worldbook.spoilerRank, worldbook.knowledgeRank]))].sort((a, b) => a - b),
    rulesAuthority: "external_rules_service",
    roomMutationAuthority: false,
    trainingTruth: false,
  };
  const sealedCatalogue = deepFreeze({ ...catalogue, catalogueHash: hashStarcraftTmgContract(catalogue) });

  function accessible(worldbook, spoilerCeilingRank, knowledgeCeilingRank, allowFanon) {
    return worldbook.spoilerRank <= spoilerCeilingRank
      && worldbook.knowledgeRank <= knowledgeCeilingRank
      && (worldbook.canonStatus !== "fanon" || allowFanon);
  }

  function chooseFallbackPersona(spoilerCeilingRank, knowledgeCeilingRank, allowFanon) {
    const allowed = personaWorldbooks.filter((worldbook) =>
      accessible(worldbook, spoilerCeilingRank, knowledgeCeilingRank, allowFanon));
    if (!allowed.length) return null;
    const defaultPersona = byId.get(defaultPersonaIds[0]);
    if (accessible(defaultPersona, spoilerCeilingRank, knowledgeCeilingRank, allowFanon)) return defaultPersona;
    return allowed[allowed.length - 1];
  }

  function resolveSelection(fields) {
    return registry.resolve({
      characterPackage,
      requestedWorldbookIds: [fields.personaWorldbookId, ...fields.contextWorldbookIds],
      spoilerCeilingRank: fields.spoilerCeilingRank,
      knowledgeCeilingRank: fields.knowledgeCeilingRank,
      allowFanon: fields.allowFanon,
    });
  }

  function sealState(fields) {
    const selection = resolveSelection(fields);
    if (!selection.ok) throw new Error(`selector state selection rejected: ${selection.reason}`);
    const state = {
      schemaVersion: `${STARCRAFT_TMG_CHARACTER_PERSONA_SELECTOR_VERSION}.state`,
      characterRef: sealedCatalogue.characterRef,
      catalogueHash: sealedCatalogue.catalogueHash,
      revision: nonNegativeInteger(fields.revision, "revision"),
      personaWorldbookId: requiredString(fields.personaWorldbookId, "personaWorldbookId"),
      personaState: selection.receipt.personaState,
      contextWorldbookIds: stringList(fields.contextWorldbookIds, "contextWorldbookIds"),
      spoilerCeilingRank: nonNegativeInteger(fields.spoilerCeilingRank, "spoilerCeilingRank"),
      knowledgeCeilingRank: nonNegativeInteger(fields.knowledgeCeilingRank, "knowledgeCeilingRank"),
      allowFanon: fields.allowFanon === true,
      connectivity: CONNECTIVITY_MODES.has(fields.connectivity) ? fields.connectivity : "online",
      fallbackReason: fields.fallbackReason || null,
      lastEvent: requiredString(fields.lastEvent, "lastEvent"),
      selectionHash: selection.receipt.selectionHash,
      updatedAt: new Date(fields.updatedAt).toISOString(),
      authority: {
        selectionOwner: "user_via_server_validated_catalogue",
        ceilingOwner: "user_via_server_validated_policy",
        rulesAuthority: false,
        roomMutationAuthority: false,
        trainingTruth: false,
      },
    };
    return deepFreeze({ ...state, stateHash: hashStarcraftTmgContract(state) });
  }

  function assertState(state) {
    if (!state || typeof state !== "object" || Array.isArray(state)) throw new Error("selector state must be an object");
    if (state.schemaVersion !== `${STARCRAFT_TMG_CHARACTER_PERSONA_SELECTOR_VERSION}.state`) {
      throw new Error("selector state schemaVersion mismatch");
    }
    if (state.catalogueHash !== sealedCatalogue.catalogueHash
      || state.characterRef.hash !== characterPackage.integrity.hash) {
      throw new Error("selector state catalogue binding mismatch");
    }
    const recreated = sealState(unsignedState(state));
    if (recreated.stateHash !== state.stateHash) throw new Error("selector state integrity mismatch");
    return state;
  }

  function createState(options = {}) {
    try {
      const spoilerCeilingRank = nonNegativeInteger(
        options.spoilerCeilingRank ?? characterPackage.spoilerProfile?.defaultRank ?? 0,
        "spoilerCeilingRank",
      );
      const knowledgeCeilingRank = nonNegativeInteger(
        options.knowledgeCeilingRank ?? spoilerCeilingRank,
        "knowledgeCeilingRank",
      );
      const allowFanon = options.allowFanon === true;
      const connectivity = options.connectivity || "online";
      if (!CONNECTIVITY_MODES.has(connectivity)) throw new Error("connectivity must be online or offline");
      const requestedPersonaId = options.personaWorldbookId
        ? requiredString(options.personaWorldbookId, "personaWorldbookId")
        : defaultPersonaIds[0];
      const requestedPersona = byId.get(requestedPersonaId);
      let persona = requestedPersona?.worldbookKind === "persona_edition" ? requestedPersona : null;
      let fallbackReason = null;
      if (!persona) fallbackReason = "requested_persona_not_found";
      else if (!accessible(persona, spoilerCeilingRank, knowledgeCeilingRank, allowFanon)) {
        fallbackReason = "requested_persona_exceeds_ceiling_or_policy";
        persona = null;
      }
      if (!persona) persona = chooseFallbackPersona(spoilerCeilingRank, knowledgeCeilingRank, allowFanon);
      if (!persona) return rejection("no_persona_within_ceiling");
      const contextIds = options.contextWorldbookIds === undefined
        ? defaultContextIds
        : stringList(options.contextWorldbookIds, "contextWorldbookIds");
      for (const contextId of contextIds) {
        const context = byId.get(contextId);
        if (!context || context.worldbookKind === "persona_edition") {
          return rejection("invalid_context_selection", { worldbookId: contextId });
        }
        if (!accessible(context, spoilerCeilingRank, knowledgeCeilingRank, allowFanon)) {
          return rejection("context_exceeds_ceiling_or_policy", { worldbookId: contextId });
        }
      }
      const state = sealState({
        revision: 0,
        personaWorldbookId: persona.worldbookId,
        contextWorldbookIds: contextIds,
        spoilerCeilingRank,
        knowledgeCeilingRank,
        allowFanon,
        connectivity,
        fallbackReason,
        lastEvent: "selector_created",
        updatedAt: options.updatedAt,
      });
      return deepFreeze({ ok: true, state });
    } catch (error) {
      return rejection("invalid_initial_selector_state", {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  function dispatch(stateInput, event = {}) {
    let state;
    try {
      state = assertState(stateInput);
      const expectedRevision = nonNegativeInteger(event.expectedRevision, "event.expectedRevision");
      if (expectedRevision !== state.revision) {
        return rejection("stale_selector_revision", { expectedRevision, actualRevision: state.revision });
      }
      const type = requiredString(event.type, "event.type");
      if (state.connectivity === "offline" && type !== "set_connectivity") {
        return rejection("offline_selector_read_only");
      }
      const next = {
        ...unsignedState(state),
        revision: state.revision + 1,
        fallbackReason: null,
        lastEvent: type,
        updatedAt: event.occurredAt,
      };
      if (type === "select_persona") {
        const worldbookId = requiredString(event.personaWorldbookId, "event.personaWorldbookId");
        const persona = byId.get(worldbookId);
        if (!persona || persona.worldbookKind !== "persona_edition") {
          return rejection("persona_not_found", { worldbookId });
        }
        if (!accessible(persona, state.spoilerCeilingRank, state.knowledgeCeilingRank, state.allowFanon)) {
          return rejection("persona_exceeds_ceiling_or_policy", { worldbookId });
        }
        next.personaWorldbookId = worldbookId;
      } else if (type === "set_ceilings") {
        next.spoilerCeilingRank = nonNegativeInteger(event.spoilerCeilingRank, "event.spoilerCeilingRank");
        next.knowledgeCeilingRank = nonNegativeInteger(event.knowledgeCeilingRank, "event.knowledgeCeilingRank");
        const currentPersona = byId.get(state.personaWorldbookId);
        if (!accessible(currentPersona, next.spoilerCeilingRank, next.knowledgeCeilingRank, state.allowFanon)) {
          const fallback = chooseFallbackPersona(next.spoilerCeilingRank, next.knowledgeCeilingRank, state.allowFanon);
          if (!fallback) return rejection("no_persona_within_ceiling");
          next.personaWorldbookId = fallback.worldbookId;
          next.fallbackReason = "active_persona_exceeded_new_ceiling";
        }
        const allowedContexts = state.contextWorldbookIds.filter((worldbookId) =>
          accessible(byId.get(worldbookId), next.spoilerCeilingRank, next.knowledgeCeilingRank, state.allowFanon));
        if (allowedContexts.length !== state.contextWorldbookIds.length) {
          next.contextWorldbookIds = allowedContexts;
          next.fallbackReason = next.fallbackReason || "active_context_exceeded_new_ceiling";
        }
      } else if (type === "select_contexts") {
        const contextIds = stringList(event.contextWorldbookIds, "event.contextWorldbookIds");
        for (const worldbookId of contextIds) {
          const context = byId.get(worldbookId);
          if (!context || context.worldbookKind === "persona_edition") {
            return rejection("invalid_context_selection", { worldbookId });
          }
          if (!accessible(context, state.spoilerCeilingRank, state.knowledgeCeilingRank, state.allowFanon)) {
            return rejection("context_exceeds_ceiling_or_policy", { worldbookId });
          }
        }
        next.contextWorldbookIds = contextIds;
      } else if (type === "set_connectivity") {
        const connectivity = requiredString(event.connectivity, "event.connectivity");
        if (!CONNECTIVITY_MODES.has(connectivity)) return rejection("invalid_connectivity");
        next.connectivity = connectivity;
      } else if (type === "reset_default") {
        const fallback = chooseFallbackPersona(state.spoilerCeilingRank, state.knowledgeCeilingRank, state.allowFanon);
        if (!fallback) return rejection("no_persona_within_ceiling");
        next.personaWorldbookId = fallback.worldbookId;
        next.contextWorldbookIds = defaultContextIds.filter((worldbookId) =>
          accessible(byId.get(worldbookId), state.spoilerCeilingRank, state.knowledgeCeilingRank, state.allowFanon));
      } else {
        return rejection("unsupported_selector_event", { type });
      }
      const nextState = sealState(next);
      const eventReceipt = {
        schemaVersion: `${STARCRAFT_TMG_CHARACTER_PERSONA_SELECTOR_VERSION}.event-receipt`,
        previousStateHash: state.stateHash,
        nextStateHash: nextState.stateHash,
        eventHash: hashStarcraftTmgContract(clone(event)),
        rulesAuthority: "external_rules_service",
        roomMutationAuthority: false,
        trainingTruth: false,
      };
      return deepFreeze({
        ok: true,
        state: nextState,
        eventReceipt: { ...eventReceipt, receiptHash: hashStarcraftTmgContract(eventReceipt) },
      });
    } catch (error) {
      return rejection("invalid_selector_event", {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  function readView(stateInput) {
    const state = assertState(stateInput);
    const decorate = (worldbook) => {
      const binding = visualBindingByPersonaId.get(worldbook.worldbookId) || null;
      return {
        ...selectorItem(worldbook),
        selected: worldbook.worldbookKind === "persona_edition"
          ? worldbook.worldbookId === state.personaWorldbookId
          : state.contextWorldbookIds.includes(worldbook.worldbookId),
        available: accessible(worldbook, state.spoilerCeilingRank, state.knowledgeCeilingRank, state.allowFanon),
        disabledReason: accessible(worldbook, state.spoilerCeilingRank, state.knowledgeCeilingRank, state.allowFanon)
          ? null
          : worldbook.canonStatus === "fanon" && !state.allowFanon
            ? "fanon_requires_opt_in"
            : worldbook.spoilerRank > state.spoilerCeilingRank
              ? "spoiler_ceiling"
              : "knowledge_ceiling",
        visual: worldbook.worldbookKind !== "persona_edition"
          ? null
          : binding
            ? clone(binding)
            : {
              personaWorldbookId: worldbook.worldbookId,
              personaState: worldbook.personaState,
              visualStatus: "not_produced",
              staticPortraitRef: null,
              dialoguePortraitManifestRef: null,
              fallbackBehavior: unboundPersonaBehavior,
              publicReleaseAllowed: false,
            },
      };
    };
    const personaOptions = personaWorldbooks.map(decorate);
    const view = {
      schemaVersion: `${STARCRAFT_TMG_CHARACTER_PERSONA_SELECTOR_VERSION}.view`,
      characterRef: state.characterRef,
      catalogueHash: sealedCatalogue.catalogueHash,
      stateHash: state.stateHash,
      revision: state.revision,
      connectivity: state.connectivity,
      personaSelectionMode: "exactly_one",
      personaCount: personaWorldbooks.length,
      contextCount: contextWorldbooks.length,
      personaOptions,
      contextOptions: contextWorldbooks.map(decorate),
      selectedVisual: personaOptions.find((entry) => entry.selected).visual,
      spoilerCeilingRank: state.spoilerCeilingRank,
      knowledgeCeilingRank: state.knowledgeCeilingRank,
      ceilingSteps: sealedCatalogue.ceilingSteps,
      fallbackReason: state.fallbackReason,
      offlineBehavior: "render_sealed_snapshot_read_only_until_reconnected",
      sessionSelectionInput: {
        worldbookIds: [state.personaWorldbookId, ...state.contextWorldbookIds],
        spoilerCeilingRank: state.spoilerCeilingRank,
        knowledgeCeilingRank: state.knowledgeCeilingRank,
        allowFanon: state.allowFanon,
      },
      rulesAuthority: "external_rules_service",
      roomMutationAuthority: false,
      trainingTruth: false,
    };
    return deepFreeze({ ...view, viewHash: hashStarcraftTmgContract(view) });
  }

  function exportOfflineSnapshot(stateInput) {
    const state = assertState(stateInput);
    const view = readView(state);
    const snapshot = {
      schemaVersion: `${STARCRAFT_TMG_CHARACTER_PERSONA_SELECTOR_VERSION}.offline-snapshot`,
      characterRef: state.characterRef,
      catalogueHash: sealedCatalogue.catalogueHash,
      state,
      view,
      createdAt: state.updatedAt,
      storagePolicy: "content_free_selector_metadata_no_worldbook_facts_or_prompts",
      readOnlyUntilReconnected: true,
      rulesAuthority: "external_rules_service",
      roomMutationAuthority: false,
      trainingTruth: false,
    };
    return deepFreeze({ ...snapshot, snapshotHash: hashStarcraftTmgContract(snapshot) });
  }

  function assertOfflineSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
      throw new Error("selector snapshot must be an object");
    }
    if (snapshot.schemaVersion !== `${STARCRAFT_TMG_CHARACTER_PERSONA_SELECTOR_VERSION}.offline-snapshot`) {
      throw new Error("selector snapshot schemaVersion mismatch");
    }
    if (hashStarcraftTmgContract(unsignedSnapshot(snapshot)) !== snapshot.snapshotHash) {
      throw new Error("selector snapshot integrity mismatch");
    }
    if (snapshot.catalogueHash !== sealedCatalogue.catalogueHash
      || snapshot.characterRef.hash !== characterPackage.integrity.hash) {
      throw new Error("selector snapshot catalogue binding mismatch");
    }
    assertState(snapshot.state);
    const expectedView = readView(snapshot.state);
    if (expectedView.viewHash !== snapshot.view.viewHash) throw new Error("selector snapshot view mismatch");
    return snapshot;
  }

  function restoreOfflineSnapshot(snapshotInput) {
    try {
      const snapshot = assertOfflineSnapshot(snapshotInput);
      return deepFreeze({
        ok: true,
        state: snapshot.state,
        view: snapshot.view,
        snapshotHash: snapshot.snapshotHash,
        readOnly: true,
        trainingTruth: false,
      });
    } catch (error) {
      return rejection("invalid_offline_snapshot", {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  function resolveForSession(stateInput) {
    const state = assertState(stateInput);
    const selection = resolveSelection(state);
    if (!selection.ok) return selection;
    return deepFreeze({
      ok: true,
      worldbooks: selection.worldbooks,
      receipt: selection.receipt,
      sessionInput: readView(state).sessionSelectionInput,
      selectorStateHash: state.stateHash,
      catalogueHash: sealedCatalogue.catalogueHash,
      trainingTruth: false,
    });
  }

  return Object.freeze({
    catalogue: sealedCatalogue,
    createState,
    dispatch,
    readView,
    exportOfflineSnapshot,
    restoreOfflineSnapshot,
    resolveForSession,
  });
}
