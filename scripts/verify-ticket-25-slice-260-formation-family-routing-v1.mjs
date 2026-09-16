#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  searchStarcraftTmgLegalFormationOptionsV1,
  STARCRAFT_TMG_FORMATION_ACTION_FAMILY_COVERAGE_V1,
} from "../packages/online-agent-session/legal-formation-search-v1.mjs";
import { createOfficialRelocationFamilyAdapterV1 } from
  "../packages/product-composition/official-relocation-family-adapter-v1.mjs";
import { createOfficialUnitLifecycleFamilyAdapterV1 } from
  "../packages/product-composition/official-unit-lifecycle-family-adapter-v1.mjs";
import { createStarcraftTmgPrivatePayloadCodec } from
  "../packages/room-store/room-store-v1.mjs";
import { createSqliteStarcraftTmgRoomStore } from
  "../packages/room-store/sqlite-room-store-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runArgument = process.argv.find((value) =>
  value.startsWith("--run-directory="));
assert(runArgument, "--run-directory is required");
const runDirectory = path.resolve(ROOT,
  runArgument.slice("--run-directory=".length));
const privateState = JSON.parse(await readFile(
  path.join(runDirectory, "runner-private.json"), "utf8"));
const liveRunId = path.basename(runDirectory);
const privatePayloadCodec = createStarcraftTmgPrivatePayloadCodec({
  key: privateState.storeEncryptionKeyBase64,
  keyId: `ticket23-slice247-room-store-${liveRunId}`,
  trustLevel: "development_persistent",
});
const roomStore = createSqliteStarcraftTmgRoomStore({
  filename: path.join(runDirectory, "room.sqlite"),
  privatePayloadCodec,
});

function domain(effectKind, pieceId, extra = {}) {
  return {
    schemaVersion: "ticket25_slice260_routing_fixture_v1",
    domainId: `routing:${effectKind}`,
    actionType: extra.actionType || "resolve_relocation_ability",
    sideKey: "player2",
    phase: "movement",
    pieceId,
    effectKind,
    sourceInstanceId: extra.sourceInstanceId || null,
    parameterSchema: {
      type: "object",
      required: ["leadingModelId", "placements"],
      ...structuredClone(extra.parameterSchema || {}),
    },
    constraints: {
      maxDistanceMilliInches: 6_000,
      fullBaseGeometryRequired: true,
      ...structuredClone(extra.constraints || {}),
    },
  };
}

function instantiate(_state, candidateDomain, parameters) {
  return {
    canonicalParameters: structuredClone(parameters),
    action: {
      actionType: candidateDomain.actionType,
      effectKind: candidateDomain.effectKind,
      pieceId: candidateDomain.pieceId,
      canonicalParameters: structuredClone(parameters),
    },
  };
}

function solve(state, candidateDomain) {
  return searchStarcraftTmgLegalFormationOptionsV1({
    state,
    domain: candidateDomain,
    request: {
      maximumOptions: 1,
      maximumCandidateAttempts: 128,
      formationObjectives: [{ kind: "compact", weight: 3, targetIds: [] }],
    },
    instantiate,
  });
}

function resetMovementWindow(state, sideKey) {
  state.phase = "movement";
  state.activeSideKey = sideKey;
  state.pendingAction = null;
  state.pendingReactionWindow = null;
  state.selectedRosterActivationWindow = null;
  state.activeAbilityUseHistory = [];
  state.unitLifecycleUseHistory = [];
  state.players[sideKey].passedPhases.movement = false;
  for (const card of state.cardResources?.[sideKey] || []) card.readiness = "ready";
  for (const piece of state.pieces || []) {
    piece.activatedPhases = { ...(piece.activatedPhases || {}), movement: false };
  }
  return state;
}

try {
  const bundle = await roomStore.loadReplayBundle(privateState.roomId);
  const state = structuredClone(bundle.currentAggregate.envelope.state);
  const single = state.pieces.find((entry) => entry.id === "player2-kerrigan");
  const friendly = state.pieces.find((entry) => entry.id === "player2-corpser");
  const swarm = state.pieces.find((entry) => entry.id === "player2-swarmling");
  assert(single && friendly && swarm, "live routing witnesses are required");

  const direct = solve(state, domain("direct_place", single.id));
  const extra = solve(state, domain("extra_move", single.id));
  const anchor = solve(state, domain("friendly_anchor_place", single.id));
  const nonEntry = solve(state, domain("non_entry_edge_deploy", single.id, {
    parameterSchema: { edgeSide: { enum: ["left", "right"] } },
  }));

  const lifecycleSchema = {
    required: ["activeUnitId", "paymentCardInstanceIds", "placementPlan"],
    paymentCardInstanceIds: { enum: [[]] },
    placementPlan: { type: "complete_model_placement_plan" },
  };
  const phase = solve(state, domain("phase_prism_swap", single.id, {
    actionType: "resolve_unit_lifecycle_ability",
    parameterSchema: {
      ...lifecycleSchema,
      targetUnitId: { enum: [friendly.id] },
    },
  }));

  const respawnState = structuredClone(state);
  const respawnActor = respawnState.pieces.find((entry) => entry.id === swarm.id);
  const destroyed = respawnActor.models.slice(-2);
  respawnActor.currentModels -= destroyed.length;
  respawnActor.destroyedModelIds = destroyed.map((entry) => entry.id);
  for (const model of destroyed) {
    model.isDestroyed = true;
    model.isOnField = false;
  }
  const respawn = solve(respawnState, domain("respawn_models", swarm.id, {
    actionType: "resolve_unit_lifecycle_ability",
    parameterSchema: lifecycleSchema,
  }));

  const shadeState = structuredClone(state);
  shadeState.board.tokens = [...(shadeState.board.tokens || []), {
    tokenId: "routing:shade",
    coordinate: { x: 40, y: 20 },
    baseDiameterInches: 1.26,
  }];
  const shade = solve(shadeState, domain("shade_round_end_place", single.id, {
    actionType: "resolve_unit_lifecycle_consumer",
    sourceInstanceId: "routing:shade",
    parameterSchema: {
      required: ["activeUnitId", "placementPlan"],
      placementPlan: { type: "complete_model_placement_plan" },
    },
  }));
  shadeState.board.tokens.pop();

  const byEffect = { direct_place: direct, extra_move: extra,
    friendly_anchor_place: anchor, non_entry_edge_deploy: nonEntry,
    phase_prism_swap: phase, respawn_models: respawn,
    shade_round_end_place: shade };
  for (const [effectKind, result] of Object.entries(byEffect)) {
    assert(result.optionCount > 0, `${effectKind} must expose a complete option`);
    const slots = result.formationOptions[0].slots;
    assert.equal(new Set(slots.map((entry) => entry.defaultModelId)).size,
      slots.length, `${effectKind} must expose each model exactly once`);
  }
  assert.equal(extra.formationOptions[0].slots.length, 1,
    "single-model extra move must expose one slot, not path plus placement duplicates");
  const parameters = Object.fromEntries(Object.entries(byEffect).map(
    ([effectKind, result]) => [effectKind,
      result.formationOptions[0].canonicalParameters]));
  assert(Array.isArray(parameters.extra_move.path));
  assert(!("path" in parameters.direct_place));
  assert(parameters.friendly_anchor_place.anchorPieceId);
  assert(parameters.friendly_anchor_place.anchorModelId);
  assert(parameters.non_entry_edge_deploy.edgeSide);
  assert(parameters.phase_prism_swap.targetUnitId === friendly.id);
  assert(parameters.phase_prism_swap.targetContactModelId);
  assert(parameters.respawn_models.placementPlan.placements.every((entry) =>
    entry.contactModelId));
  assert(parameters.shade_round_end_place.placementPlan);

  const exactRelocationState = resetMovementWindow(structuredClone(state),
    "player1");
  const relocationAdapter = createOfficialRelocationFamilyAdapterV1(
    exactRelocationState.officialRelocationFamilySourceBundle);
  const exactRelocationDomain = relocationAdapter.legalSpace(
    exactRelocationState, { sideKey: "player1", scope: "catalogue" },
  ).parameterDomains.find((entry) => entry.effectKind === "extra_move");
  assert(exactRelocationDomain, "real extra_move domain is required");
  const exactRelocation = searchStarcraftTmgLegalFormationOptionsV1({
    state: exactRelocationState,
    domain: exactRelocationDomain,
    request: { maximumOptions: 1, maximumCandidateAttempts: 128,
      formationObjectives: [{ kind: "advance", weight: 3, targetIds: [] }] },
    instantiate: (authorityState, authorityDomain, authorityParameters) => {
      const preview = relocationAdapter.preview(authorityState, {
        domain: authorityDomain, parameters: authorityParameters,
      });
      return { canonicalParameters:
        preview.action.relocationPlan.canonicalParameters,
      action: preview.action };
    },
  });
  assert(exactRelocation.optionCount > 0,
    "real relocation Rules adapter must instantiate one extra_move option");

  const exactRespawnState = resetMovementWindow(structuredClone(state), "player2");
  const exactRespawnActor = exactRespawnState.pieces.find((entry) =>
    entry.id === swarm.id);
  const exactDestroyed = exactRespawnActor.models.slice(-2);
  exactRespawnActor.currentModels -= exactDestroyed.length;
  exactRespawnActor.destroyedModelIds = exactDestroyed.map((entry) => entry.id);
  for (const model of exactDestroyed) {
    model.isDestroyed = true;
    model.isOnField = false;
  }
  const lifecycleAdapter = createOfficialUnitLifecycleFamilyAdapterV1(
    exactRespawnState.officialUnitLifecycleFamilySourceBundle);
  const exactRespawnDomain = lifecycleAdapter.legalSpace(exactRespawnState, {
    sideKey: "player2", scope: "catalogue",
  }).parameterDomains.find((entry) => entry.effectKind === "respawn_models");
  assert(exactRespawnDomain, "real respawn_models domain is required");
  const exactRespawn = searchStarcraftTmgLegalFormationOptionsV1({
    state: exactRespawnState,
    domain: exactRespawnDomain,
    request: { maximumOptions: 1, maximumCandidateAttempts: 128,
      formationObjectives: [{ kind: "disperse", weight: 3, targetIds: [] }] },
    instantiate: (authorityState, authorityDomain, authorityParameters) => {
      const preview = lifecycleAdapter.preview(authorityState, {
        domain: authorityDomain, parameters: authorityParameters,
      });
      return { canonicalParameters:
        preview.action.unitLifecyclePlan.canonicalParameters,
      action: preview.action };
    },
  });
  assert(exactRespawn.optionCount > 0,
    "real lifecycle Rules adapter must instantiate one respawn option");

  process.stdout.write(`${JSON.stringify({
    schema: "ticket25_slice260_formation_family_routing_v1",
    ok: true,
    stateRevision: bundle.currentAggregate.envelope.stateRevision,
    coverage: STARCRAFT_TMG_FORMATION_ACTION_FAMILY_COVERAGE_V1,
    results: Object.fromEntries(Object.entries(byEffect).map(
      ([effectKind, result]) => [effectKind, {
        optionCount: result.optionCount,
        actionType: result.actionType,
        parameterKeys: Object.keys(
          result.formationOptions[0].canonicalParameters).sort(),
        slotCount: result.formationOptions[0].slots.length,
      }])),
    exactRulesReceipts: {
      relocationExtraMove: {
        domainId: exactRelocationDomain.domainId,
        optionCount: exactRelocation.optionCount,
        actionHash: exactRelocation.formationOptions[0].actionHash,
      },
      lifecycleRespawn: {
        domainId: exactRespawnDomain.domainId,
        optionCount: exactRespawn.optionCount,
        actionHash: exactRespawn.formationOptions[0].actionHash,
      },
    },
    providerCalls: 0,
    trainingTruth: false,
  }, null, 2)}\n`);
} finally {
  roomStore.close();
}
