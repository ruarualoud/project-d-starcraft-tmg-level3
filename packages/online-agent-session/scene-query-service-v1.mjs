import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import { projectStarcraftTmgFiniteActionV1 } from "../authoritative-engine/transition-v1.mjs";
import { createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1 } from "./room-backed-spatial-rules-query-adapter-v1.mjs";
import { createStarcraftTmgSpatialActionQueryRuntimeV1 } from "./spatial-action-query-runtime-v1.mjs";

// One Rules query composition for live rooms and immutable pregame scenes.
// Only snapshot ownership differs; neither adapter grants Apply authority.
export function createStarcraftTmgSceneQueryServiceV1(options = {}) {
  const rulesQueryAdapter = createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1(options);
  const runtime = createStarcraftTmgSpatialActionQueryRuntimeV1({ ...options,
    rulesQuery: rulesQueryAdapter.query, rulesQueryBatch: rulesQueryAdapter.queryBatch });
  return Object.freeze({ ...runtime, rulesQueryAdapter });
}

export function createStarcraftTmgSnapshotSceneQueryServiceV1({ state,
  rulesRuntime, seatKey, matchBinding, sceneScope, geometryRepairOnly = false } = {}) {
  if (!state || !/^player[12]$/u.test(seatKey || "")
    || !["pregame_reference", "hypothetical_branch"].includes(sceneScope?.kind)
    || !sceneScope.sourceStateHash || !sceneScope.baseStateHash
    || hashStarcraftTmgContract(state) !== sceneScope.baseStateHash
    || typeof rulesRuntime?.enumerate !== "function") {
    throw new TypeError("SCENE_QUERY_IMMUTABLE_SOURCE_REQUIRED");
  }
  const snapshot = structuredClone(state);
  const stateHash = sceneScope.baseStateHash;
  const bindingHash = matchBinding?.bindingHash || hashStarcraftTmgContract(matchBinding || {});
  const roomId = `readonly-scene:${sceneScope.sourceStateHash}:${stateHash}`;
  const aggregate = { stateRevision: 0, envelope: { state: snapshot,
    stateHash, matchBindingHash: bindingHash, matchBinding: structuredClone(matchBinding || {}) } };
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
    : rulesRuntime.enumerate(snapshot, { sideKey: seatKey, includeDisabled: true });
  const finiteActions = (legal.candidates || []).map(candidate => projectStarcraftTmgFiniteActionV1(candidate,
    { matchBindingHash: bindingHash, stateHash, stateRevision: 0, sideKey: seatKey })).filter(Boolean);
  const legalSpace = freeze({ ...structuredClone(legal), finiteActions, roomId, stateRevision: 0,
    stateHash, matchBindingHash: bindingHash, legalSpaceHash: hashStarcraftTmgContract(legal) });
  const input = freeze({ roomProjection: { room: { roomId, stateRevision: 0, stateHash },
    matchBinding: { bindingHash }, viewer: { seatKey, visibilityScope: "frozen_reference_scene" },
    state: snapshot }, legalSpace, sceneScope: structuredClone(sceneScope) });
  const service = createStarcraftTmgSceneQueryServiceV1({ seatKey, rulesRuntime,
    roomStore: { loadRoom: async id => id === roomId ? aggregate : null } });
  return Object.freeze({
    actionSpace: () => service.actionSpace(input),
    query: request => service.query({ ...input, request }),
    queryBatch: requests => service.queryBatch({ ...input, requests }),
  });
}
