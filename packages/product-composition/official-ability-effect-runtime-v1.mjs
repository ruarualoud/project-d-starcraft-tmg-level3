import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  verifyOfficialAbilityEffectIrCatalogueV1,
} from "../source-data/official-ability-effect-ir-v1.mjs";
import {
  OFFICIAL_SELECTED_ROSTER_ABILITY_RUNTIME_ID,
  OFFICIAL_SELECTED_ROSTER_ABILITY_RUNTIME_VERSION,
  applyOfficialSelectedRosterAbilityActionV1,
  cleanupOfficialSelectedRosterAbilityEffectsV1,
  enumerateOfficialSelectedRosterAbilityActionsV1,
  previewOfficialSelectedRosterAbilityActionV1,
  queryOfficialSelectedRosterAbilityV1,
  verifyOfficialSelectedRosterAbilitySourceBundleV1,
} from "./official-selected-roster-ability-runtime-v1.mjs";

export const OFFICIAL_ABILITY_EFFECT_RUNTIME_ID =
  "starcraft-tmg-official-ability-effect-runtime-v1";
export const OFFICIAL_ABILITY_EFFECT_RUNTIME_VERSION = "1.7.0";
export const OFFICIAL_ABILITY_PENDING_ADAPTER_ID =
  "official-ability-pending-family-adapter-v1";

const OPERATIONS = new Set([
  "legal_space", "preview", "apply", "query", "lifecycle", "replay",
  "open_reaction_window", "consume_reaction_window",
]);
const LIFECYCLE_EVENTS = new Set([
  "activation_start", "action_performed", "activation_end", "phase_end", "round_end",
  "cleanup_and_refresh",
]);

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function clone(value) { return structuredClone(value); }
function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}
function seal(body, field) {
  return freezeDeep({ ...body, [field]: hashStarcraftTmgContract(body) });
}

export function createOfficialSelectedRosterAbilityDefinitionBindingsV1(bundle) {
  verifyOfficialSelectedRosterAbilitySourceBundleV1(bundle);
  const byHash = new Map();
  for (const route of bundle.routes) byHash.set(route.sourceFeatureHash, {
    sourceFeatureHash: route.sourceFeatureHash,
    adapterId: OFFICIAL_SELECTED_ROSTER_ABILITY_RUNTIME_ID,
    adapterVersion: OFFICIAL_SELECTED_ROSTER_ABILITY_RUNTIME_VERSION,
    capability: "authoritative_action",
  });
  for (const binding of bundle.passiveBindings) byHash.set(binding.sourceFeatureHash, {
    sourceFeatureHash: binding.sourceFeatureHash,
    adapterId: OFFICIAL_SELECTED_ROSTER_ABILITY_RUNTIME_ID,
    adapterVersion: OFFICIAL_SELECTED_ROSTER_ABILITY_RUNTIME_VERSION,
    capability: "automatic_consumer",
  });
  return freezeDeep([...byHash.values()].sort((left, right) => (
    left.sourceFeatureHash.localeCompare(right.sourceFeatureHash))));
}

export function createOfficialSelectedRosterAbilityAdapterV1(sourceBundle) {
  const bindings = createOfficialSelectedRosterAbilityDefinitionBindingsV1(sourceBundle);
  const hashes = new Set(bindings.map((entry) => entry.sourceFeatureHash));
  return freezeDeep({
    descriptor: freezeDeep({
      adapterId: OFFICIAL_SELECTED_ROSTER_ABILITY_RUNTIME_ID,
      adapterVersion: OFFICIAL_SELECTED_ROSTER_ABILITY_RUNTIME_VERSION,
      adapterKind: "exact_runtime",
      coveredDefinitionCount: hashes.size,
      coveredSourceFeatureHashes: [...hashes].sort(),
      supportedOperations: ["legal_space", "preview", "apply", "query", "lifecycle"],
      rulesAuthority: true,
      trainingTruth: false,
    }),
    legalSpace(state, options = {}) {
      return enumerateOfficialSelectedRosterAbilityActionsV1(state, options);
    },
    preview(state, request = {}) {
      return previewOfficialSelectedRosterAbilityActionV1(
        state, request.domain, request.parameters || {});
    },
    apply(state, request = {}) {
      return applyOfficialSelectedRosterAbilityActionV1(
        state, request.action, request.options || {});
    },
    query(state, request = {}) {
      return queryOfficialSelectedRosterAbilityV1({ state, request });
    },
    lifecycle(state, request = {}) {
      if (request.eventKind !== "cleanup_and_refresh") return null;
      return cleanupOfficialSelectedRosterAbilityEffectsV1(state);
    },
  });
}

function relevantRecordSides(state) {
  const result = new Map();
  for (const piece of state?.pieces || []) {
    const key = String(piece.officialUnitRecordKey || "");
    if (!key) continue;
    if (!result.has(key)) result.set(key, new Set());
    result.get(key).add(String(piece.sideKey || ""));
  }
  for (const [sideKey, cards] of Object.entries(state?.cardResources || {})) {
    for (const card of cards || []) {
      const key = String(card.officialCardRecordKey || "");
      if (!key) continue;
      if (!result.has(key)) result.set(key, new Set());
      result.get(key).add(sideKey);
    }
  }
  return result;
}

function createPendingAdapter(catalogue) {
  const pending = catalogue.definitions.filter((entry) => (
    entry.execution.status === "pending_family_adapter"));
  return freezeDeep({
    descriptor: freezeDeep({
      adapterId: OFFICIAL_ABILITY_PENDING_ADAPTER_ID,
      adapterVersion: "1.0.0",
      adapterKind: "typed_non_executable_diagnostic",
      coveredDefinitionCount: pending.length,
      coveredSourceFeatureHashes: pending.map((entry) => entry.sourceFeatureHash),
      supportedOperations: ["legal_space"],
      rulesAuthority: false,
      trainingTruth: false,
    }),
    legalSpace(state, options = {}) {
      const byRecord = relevantRecordSides(state);
      const catalogueScope = options.scope === "catalogue";
      const phase = String(options.phase || state?.phase || "any");
      const sideKey = String(options.sideKey || state?.activeSideKey || "");
      const diagnostics = pending.flatMap((definition) => {
        const sides = byRecord.get(definition.recordKey);
        if (!catalogueScope && (!sides || (sideKey && !sides.has(sideKey))
          || (definition.phase !== "any" && definition.phase !== phase))) return [];
        return [{
          schema: "starcraft_tmg_official_pending_ability_diagnostic_v1",
          definitionId: definition.definitionId,
          recordKey: definition.recordKey,
          definitionName: definition.definitionName,
          activationKind: definition.activationKind,
          runtimeRole: definition.runtimeRole,
          phase: definition.phase,
          effectFamilies: clone(definition.effectFamilies),
          sideKeys: [...(sides || [])].sort(),
          diagnosticScope: catalogueScope ? "catalogue" : "fielded_state",
          isEnabled: false,
          disabledReason: "OFFICIAL_ABILITY_FAMILY_ADAPTER_PENDING",
          remediationSlices: [232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242],
          trainingTruth: false,
        }];
      }).sort((left, right) => left.definitionId.localeCompare(right.definitionId));
      return freezeDeep({
        schemaVersion: "starcraft_tmg_official_pending_ability_legal_space_v1",
        candidates: [], parameterDomains: [], diagnostics,
        unsupportedDefinitionsAreNeverExecutableCandidates: true,
        trainingTruth: false,
      });
    },
  });
}

function verifyAdapter(adapter) {
  const descriptor = adapter?.descriptor;
  if (!object(adapter) || !object(descriptor) || !descriptor.adapterId
    || !descriptor.adapterVersion || !Array.isArray(descriptor.coveredSourceFeatureHashes)
    || new Set(descriptor.coveredSourceFeatureHashes).size
      !== descriptor.coveredSourceFeatureHashes.length
    || descriptor.coveredDefinitionCount
      !== descriptor.coveredSourceFeatureHashes.length
    || !Array.isArray(descriptor.supportedOperations)
    || descriptor.trainingTruth !== false || typeof adapter.legalSpace !== "function") {
    fail("ABILITY_EFFECT_RUNTIME_ADAPTER_INVALID", descriptor?.adapterId || "unknown");
  }
}
function adapterFor(runtime, id, operation) {
  const adapter = runtime.adapters.find((entry) => entry.descriptor.adapterId === id);
  if (!adapter || !adapter.descriptor.supportedOperations.includes(operation)) {
    fail("ABILITY_EFFECT_RUNTIME_ADAPTER_OPERATION_UNAVAILABLE", `${id}:${operation}`);
  }
  return adapter;
}
function selectedAdapterId(request) {
  const payload = request.request || request;
  return String(request.adapterId || payload.adapterId || payload.domain?.executorId
    || payload.action?.executorId || OFFICIAL_SELECTED_ROSTER_ABILITY_RUNTIME_ID);
}
function lifecycleTransition(runtime, stateInput, request) {
  const eventKind = String(request.eventKind || "");
  if (!LIFECYCLE_EVENTS.has(eventKind)) {
    fail("ABILITY_EFFECT_RUNTIME_LIFECYCLE_EVENT_INVALID", eventKind);
  }
  let state = clone(stateInput);
  for (const adapter of runtime.adapters) {
    if (typeof adapter.lifecycle !== "function") continue;
    const next = adapter.lifecycle(state, request);
    if (next) state = clone(next);
  }
  if (eventKind !== "cleanup_and_refresh") {
    const pieceId = String(request.pieceId || "");
    for (const piece of state.pieces || []) {
      piece.officialAbilityEffects = (piece.officialAbilityEffects || []).filter((effect) => (
        effect.expiresAt !== eventKind
          || (eventKind === "activation_end" && pieceId
            && effect.sourcePieceId !== pieceId && piece.id !== pieceId)
      ));
    }
    if (eventKind === "phase_end" || eventKind === "round_end") {
      state.board = state.board || {};
      state.board.effectMarkers = (state.board.effectMarkers || []).filter((effect) => (
        effect.expiresAt !== eventKind));
    }
  }
  const event = freezeDeep({ type: "official_ability_lifecycle_applied", eventKind,
    pieceId: String(request.pieceId || "") || null, trainingTruth: false });
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({ id: `log-${state.log.length + 1}`, round: Number(state.round || 0),
    phase: state.phase || null, action: { actionType: "ability_lifecycle", eventKind },
    events: [event] });
  return freezeDeep({ ok: true,
    schema: "starcraft_tmg_official_ability_lifecycle_transition_v1",
    runtimeId: OFFICIAL_ABILITY_EFFECT_RUNTIME_ID,
    runtimeVersion: OFFICIAL_ABILITY_EFFECT_RUNTIME_VERSION,
    state: freezeDeep(state), events: [event], rulesTruth: "official_ability_lifecycle",
    trainingTruth: false });
}

function dispatchRuntime(runtime, input = {}) {
  const operation = String(input.operation || "");
  if (!OPERATIONS.has(operation)) {
    fail("ABILITY_EFFECT_RUNTIME_OPERATION_INVALID", operation);
  }
  if (!object(input.state) && operation !== "replay") {
    fail("ABILITY_EFFECT_RUNTIME_STATE_REQUIRED", operation);
  }
  if (operation === "legal_space") {
    const outputs = runtime.adapters.map((adapter) => ({
      adapterId: adapter.descriptor.adapterId,
      result: adapter.legalSpace(input.state, input.options || {}),
    }));
    const exact = outputs.filter((entry) => (
      entry.adapterId !== OFFICIAL_ABILITY_PENDING_ADAPTER_ID));
    const pending = outputs.find((entry) => (
      entry.adapterId === OFFICIAL_ABILITY_PENDING_ADAPTER_ID));
    const body = {
      schema: "starcraft_tmg_official_ability_effect_legal_space_v1",
      semanticVersion: "1.0.0",
      runtimeId: OFFICIAL_ABILITY_EFFECT_RUNTIME_ID,
      executableEnumerations: exact,
      pendingDiagnostics: pending?.result?.diagnostics || [],
      pendingDefinitionsAreNotCandidates: true,
      rulesAuthority: true,
      sourceRefreshPerformed: false,
      trainingTruth: false,
    };
    return seal(body, "legalSpaceHash");
  }
  if (operation === "lifecycle") {
    return lifecycleTransition(runtime, input.state, input.request || {});
  }
  if (operation === "replay") {
    const preState = input.preState || input.state;
    if (!object(preState) || !object(input.action)) {
      fail("ABILITY_EFFECT_RUNTIME_REPLAY_INPUT_INVALID");
    }
    const adapter = adapterFor(runtime, selectedAdapterId(input), "apply");
    const transition = adapter.apply(preState, {
      action: input.action, options: input.options || {},
    });
    const replayStateHash = hashStarcraftTmgContract(transition.state);
    const expectedStateHash = String(input.expectedStateHash || replayStateHash);
    if (expectedStateHash !== replayStateHash) {
      fail("ABILITY_EFFECT_RUNTIME_REPLAY_MISMATCH");
    }
    return seal({
      schema: "starcraft_tmg_official_ability_effect_replay_receipt_v1",
      semanticVersion: "1.0.0",
      runtimeId: OFFICIAL_ABILITY_EFFECT_RUNTIME_ID,
      actionHash: hashStarcraftTmgContract(input.action),
      expectedStateHash, replayStateHash, replayMatches: true,
      transition, rulesAuthority: true, trainingTruth: false,
    }, "replayReceiptHash");
  }
  const adapter = adapterFor(runtime, selectedAdapterId(input), operation);
  if (operation === "open_reaction_window") {
    return adapter.openReactionWindow(input.state, input.request || {});
  }
  if (operation === "consume_reaction_window") {
    return adapter.consumeReactionWindow(input.state, input.request || {});
  }
  if (operation === "preview") return adapter.preview(input.state, input.request || {});
  if (operation === "apply") return adapter.apply(input.state, input.request || {});
  return adapter.query(input.state, input.request || {});
}

export function createOfficialAbilityEffectRuntimeV1(input = {}) {
  const { catalogue } = input;
  verifyOfficialAbilityEffectIrCatalogueV1(catalogue);
  const exactAdapters = [...(input.adapters || [])];
  for (const adapter of exactAdapters) verifyAdapter(adapter);
  const pendingAdapter = createPendingAdapter(catalogue);
  verifyAdapter(pendingAdapter);
  const adapters = [...exactAdapters, pendingAdapter];
  const ids = adapters.map((entry) => entry.descriptor.adapterId);
  if (new Set(ids).size !== ids.length) fail("ABILITY_EFFECT_RUNTIME_ADAPTER_DUPLICATE");
  const exactDefinitions = catalogue.definitions.filter((entry) => (
    entry.execution.status === "executable_exact"));
  const covered = new Set(exactAdapters.flatMap((adapter) => (
    adapter.descriptor.coveredSourceFeatureHashes)));
  if (exactDefinitions.some((entry) => !covered.has(entry.sourceFeatureHash))) {
    fail("ABILITY_EFFECT_RUNTIME_EXACT_BINDING_MISSING");
  }
  const descriptor = seal({
    schema: "starcraft_tmg_official_ability_effect_runtime_descriptor_v1",
    runtimeId: OFFICIAL_ABILITY_EFFECT_RUNTIME_ID,
    runtimeVersion: OFFICIAL_ABILITY_EFFECT_RUNTIME_VERSION,
    catalogueHash: catalogue.catalogueHash,
    totalDefinitionCount: catalogue.denominator.totalDefinitions,
    executableExactDefinitionCount: catalogue.denominator.executableExact,
    pendingFamilyDefinitionCount: catalogue.denominator.pendingFamilyAdapter,
    adapterIds: ids,
    publicInterface: "dispatch(operation, state, request)",
    operations: [...OPERATIONS].sort(),
    legalSpacePreviewApplyReplaySequencePreserved: true,
    pendingDefinitionsAreObservableAndNonExecutable: true,
    contentHashesAreLineageNotRuntimeCompatibilityGates: true,
    arbitraryRosterClosureClaimed: false,
    productionRoomEligible: catalogue.denominator.pendingFamilyAdapter === 0,
    sourceRefreshPerformed: false,
    harnessLoopUsed: true,
    rulesTruth: "official_ability_effect_runtime_router",
    trainingTruth: false,
  }, "runtimeHash");
  const runtime = { descriptor, catalogue, adapters };
  return Object.freeze({
    descriptor,
    dispatch: (request) => dispatchRuntime(runtime, request),
  });
}

export function verifyOfficialAbilityEffectRuntimeDescriptorV1(descriptor) {
  if (!object(descriptor)
    || descriptor.schema !== "starcraft_tmg_official_ability_effect_runtime_descriptor_v1"
    || descriptor.runtimeId !== OFFICIAL_ABILITY_EFFECT_RUNTIME_ID
    || descriptor.runtimeVersion !== OFFICIAL_ABILITY_EFFECT_RUNTIME_VERSION
    || !Number.isSafeInteger(descriptor.totalDefinitionCount)
    || descriptor.totalDefinitionCount <= 0
    || descriptor.executableExactDefinitionCount + descriptor.pendingFamilyDefinitionCount
      !== descriptor.totalDefinitionCount
    || !Array.isArray(descriptor.adapterIds)
      || !descriptor.adapterIds.includes(OFFICIAL_ABILITY_PENDING_ADAPTER_ID)
    || descriptor.legalSpacePreviewApplyReplaySequencePreserved !== true
    || descriptor.pendingDefinitionsAreObservableAndNonExecutable !== true
    || descriptor.contentHashesAreLineageNotRuntimeCompatibilityGates !== true
    || descriptor.sourceRefreshPerformed !== false || descriptor.harnessLoopUsed !== true
    || descriptor.trainingTruth !== false
    || descriptor.runtimeHash !== hashStarcraftTmgContract(without(descriptor,
      ["runtimeHash"]))) {
    fail("ABILITY_EFFECT_RUNTIME_DESCRIPTOR_INVALID");
  }
  return true;
}
