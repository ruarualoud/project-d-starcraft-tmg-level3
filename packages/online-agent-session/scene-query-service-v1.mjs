import { assertSameOfficialQueryReleaseV2 } from "../source-data/official-release-context-v2.mjs";
import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import { projectStarcraftTmgFiniteActionV1 } from "../authoritative-engine/transition-v1.mjs";
import { createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1 } from "./room-backed-spatial-rules-query-adapter-v1.mjs";
import { createStarcraftTmgSpatialActionQueryRuntimeV1 } from "./spatial-action-query-runtime-v1.mjs";

// Only a fully frozen plain-data graph may be borrowed by a read-only scene.
// Root-only Object.freeze is insufficient: a caller could still change models.
// Weak caches retain no historical scenes and are valid only for immutable data.
const frozenSceneNodes = new WeakSet();
const frozenSceneHashes = new WeakMap();
function deeplyFrozenSceneJson(value, visiting = new WeakSet()) {
  if (value === null || ['undefined','string','number','boolean'].includes(typeof value)) return true;
  if (typeof value !== 'object' || !Object.isFrozen(value)) return false;
  if (frozenSceneNodes.has(value)) return true;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== null && prototype !== Object.prototype && prototype !== Array.prototype) return false;
  if (visiting.has(value)) return false;
  visiting.add(value);
  for (const key of Reflect.ownKeys(value)) {
    const property = Object.getOwnPropertyDescriptor(value, key);
    if (typeof key !== 'string' || !Object.hasOwn(property, 'value')
      || !deeplyFrozenSceneJson(property.value, visiting)) { visiting.delete(value); return false; }
  }
  visiting.delete(value); frozenSceneNodes.add(value); return true;
}
function sceneSourceHash(state, immutable) {
  if (immutable && frozenSceneHashes.has(state)) return frozenSceneHashes.get(state);
  const hash = hashStarcraftTmgContract(state);
  if (immutable) frozenSceneHashes.set(state, hash);
  return hash;
}

// One Rules query composition for live rooms and immutable pregame scenes.
// Only snapshot ownership differs; neither adapter grants Apply authority.
export function createStarcraftTmgSceneQueryServiceV1(options = {}) {
  const rulesQueryAdapter = createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1(options);
  const runtime = createStarcraftTmgSpatialActionQueryRuntimeV1({ ...options,
    assertCurrentAuthority: rulesQueryAdapter.assertCurrentAuthority,
    rulesQuery: rulesQueryAdapter.query, rulesQueryBatch: rulesQueryAdapter.queryBatch });
  return Object.freeze({ ...runtime, rulesQueryAdapter });
}

export function createStarcraftTmgSnapshotSceneQueryServiceV1({ state,
  rulesRuntime, seatKey, matchBinding, sceneScope, geometryRepairOnly = false,
  observeQueryDiagnostic, observeQueryBatchDiagnostic } = {}) {
  const immutable = !!state && typeof state === "object" && deeplyFrozenSceneJson(state);
  if (!state || !/^player[12]$/u.test(seatKey || "")
    || !["pregame_reference", "hypothetical_branch"].includes(sceneScope?.kind)
    || !sceneScope.sourceStateHash || !sceneScope.baseStateHash
    || sceneSourceHash(state, immutable) !== sceneScope.baseStateHash
    || typeof rulesRuntime?.enumerate !== "function") {
    throw new TypeError("SCENE_QUERY_IMMUTABLE_SOURCE_REQUIRED");
  }
  const snapshot = immutable ? state : structuredClone(state);
  const stateHash = sceneScope.baseStateHash;
  if (matchBinding?.bindingHash || matchBinding?.releaseBinding) {
    assertSameOfficialQueryReleaseV2(rulesRuntime.releaseBinding, matchBinding.releaseBinding);
  }
  const sceneMatchBinding = { ...matchBinding,
    ...(rulesRuntime.releaseBinding ? { releaseBinding: structuredClone(rulesRuntime.releaseBinding) } : {}) };
  const bindingHash = matchBinding?.bindingHash || hashStarcraftTmgContract(sceneMatchBinding);
  const roomId = `readonly-scene:${sceneScope.sourceStateHash}:${stateHash}`;
  const aggregate = { stateRevision: 0, envelope: { state: snapshot,
    stateHash, matchBindingHash: bindingHash, matchBinding: structuredClone(sceneMatchBinding) } };
  const freeze = value => {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    for (const child of Object.values(value)) freeze(child);
    return Object.freeze(value);
  };
  freeze(aggregate);
  // A retained failed hypothetical layout can contain only anchor placeholders.
  // Geometry repair needs the shared static query, not a Native action list for
  // an invalid model denominator. Valid snapshots keep the original enumeration.
  const legal = geometryRepairOnly
    ? { candidates: [], parameterDomains: [], searchSuggestions: [] }
    : rulesRuntime.enumerate(snapshot, { sideKey: seatKey, includeDisabled: true, matchBinding: rulesRuntime.releaseBinding ? sceneMatchBinding : matchBinding });
  const finiteActions = (legal.candidates || []).map(candidate => projectStarcraftTmgFiniteActionV1(candidate,
    { matchBindingHash: bindingHash, stateHash, stateRevision: 0, sideKey: seatKey })).filter(Boolean);
  const legalSpace = freeze({ ...structuredClone(legal), finiteActions, roomId, stateRevision: 0,
    stateHash, matchBindingHash: bindingHash, legalSpaceHash: hashStarcraftTmgContract(legal) });
  const input = freeze({ roomProjection: { room: { roomId, stateRevision: 0, stateHash },
    matchBinding: { bindingHash, ...(rulesRuntime.releaseBinding ? { releaseBinding: sceneMatchBinding.releaseBinding } : {}) }, viewer: { seatKey, visibilityScope: "frozen_reference_scene" },
    state: snapshot }, legalSpace, sceneScope: structuredClone(sceneScope) });
  const service = createStarcraftTmgSceneQueryServiceV1({ seatKey, rulesRuntime,
    observeQueryDiagnostic, observeQueryBatchDiagnostic,
    roomStore: { loadRoom: async id => id === roomId ? aggregate : null } });
  return Object.freeze({
    actionSpace: () => service.actionSpace(input),
    query: request => service.query({ ...input, request }),
    queryBatch: requests => service.queryBatch({ ...input, requests }),
  });
}
