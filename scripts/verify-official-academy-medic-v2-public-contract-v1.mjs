#!/usr/bin/env node

import assert from "node:assert/strict";

import * as fixture from "./verify-official-medic-medpack-v2-public-contract-v1.mjs";
import {
  applyOfficialAcademyMedicAbilityV2,
  enumerateOfficialAcademyMedicAbilityV2,
  OFFICIAL_ACADEMY_MEDIC_ABILITY_V2_EXECUTOR_ID,
  OFFICIAL_DECLARE_ABILITY_ACTION_TYPE,
  OFFICIAL_RESOLVE_ABILITY_ACTION_TYPE,
  OFFICIAL_USE_ABILITY_REACTION_ACTION_TYPE,
} from "../packages/rule-atoms/official-academy-medic-ability-executor-v2.mjs";
import {
  applyOfficialMedicRestorationV2,
  enumerateOfficialMedicRestorationV2,
  openOfficialMedicRestorationWindowV2,
  OFFICIAL_MEDIC_RESTORATION_V2_EXECUTOR_ID,
  OFFICIAL_USE_RESTORATION_REACTION_ACTION_TYPE,
} from "../packages/rule-atoms/official-medic-restoration-reaction-executor-v2.mjs";
import {
  applyOfficialOpticalFlareRangedConsumerV2,
  enumerateOfficialOpticalFlareRangedConsumerV2,
  OFFICIAL_OPTICAL_FLARE_RANGED_V2_EXECUTOR_ID,
} from "../packages/rule-atoms/official-optical-flare-ranged-consumer-executor-v2.mjs";
import {
  applyOfficialStartOfRoundV5,
  enumerateOfficialStartOfRoundActionsV5,
} from "../packages/rule-atoms/official-start-of-round-executor-v5.mjs";
import {
  applyOfficialPhaseInitiativeV1,
  enumerateOfficialPhaseInitiativeActionsV1,
} from "../packages/rule-atoms/official-phase-initiative-executor-v1.mjs";

function action(candidate) {
  return Object.fromEntries(Object.entries(candidate).filter(([key]) => (
    !["isEnabled", "disabledReason", "score", "details"].includes(key)
  )));
}

function side(piece, sideKey) {
  piece.sideKey = sideKey;
  return piece;
}

function card(id, sideKey, recordKey) {
  const profile = fixture.gameplayDataBundle.cleanupCardBundle.profiles
    .find((entry) => entry.recordKey === recordKey);
  assert.ok(profile, recordKey);
  return {
    id,
    sideKey,
    officialCardRecordKey: recordKey,
    cardKind: profile.cardKind,
    sourceRecordHash: profile.sourceRecordHash,
    resource: profile.resource,
    resourceType: "CP",
    readiness: "ready",
    face: "up",
    activeEffects: [],
  };
}

function currentInitialState() {
  const state = structuredClone(fixture.state);
  state.pieces = [
    fixture.unit({
      id: "p1-medic",
      recordKey: "army_units:medic",
      modelCount: 3,
      selectedUpgradeNames: ["Medpack"],
      xInches: 2,
    }),
    fixture.unit({
      id: "p1-marine",
      recordKey: "army_units:marine",
      modelCount: 1,
      selectedUpgradeNames: [],
      xInches: 18,
    }),
    side(fixture.unit({
      id: "p2-medic",
      recordKey: "army_units:medic",
      modelCount: 3,
      selectedUpgradeNames: ["Medpack"],
      xInches: 10,
    }), "player2"),
    side(fixture.unit({
      id: "p2-marine",
      recordKey: "army_units:marine",
      modelCount: 1,
      selectedUpgradeNames: [],
      xInches: 12,
    }), "player2"),
  ];
  state.cardResources = {
    player1: [
      card("p1-academy", "player1", "tactical_cards:academy"),
      card("p1-taf", "player1", "tactical_cards:terran_armed_forces"),
    ],
    player2: [card("p2-taf", "player2", "tactical_cards:terran_armed_forces")],
  };
  state.board.engagementGeometry = {
    schemaVersion: "starcraft_tmg_engagement_geometry_input_v2",
    modelCoordinatesComplete: true,
    baseFootprintsComplete: true,
    terrainFootprintsComplete: true,
    elevationSupportsComplete: true,
    accessPointAdjacencyComplete: true,
  };
  return state;
}

function currentMovementState() {
  const state = currentInitialState();
  const start = enumerateOfficialStartOfRoundActionsV5(state, {
    sideKey: "player1",
    includeDisabled: true,
    matchBinding: fixture.matchBinding,
  })[0];
  assert.equal(start?.isEnabled, true, JSON.stringify(start));
  const started = applyOfficialStartOfRoundV5(
    state,
    action(start),
    { matchBinding: fixture.matchBinding },
  ).state;
  const initiative = enumerateOfficialPhaseInitiativeActionsV1(started, {
    sideKey: "player1",
  }).find((candidate) => candidate.chosenFirstActorSideKey === "player1");
  assert.ok(initiative);
  return applyOfficialPhaseInitiativeV1(started, action(initiative)).state;
}

function academyStep(state, predicate, sideKey = "player1") {
  const candidate = enumerateOfficialAcademyMedicAbilityV2(state, {
    sideKey,
    matchBinding: fixture.matchBinding,
    throwOnError: true,
  }).find(predicate);
  assert.ok(candidate);
  return applyOfficialAcademyMedicAbilityV2(
    state,
    action(candidate),
    { matchBinding: fixture.matchBinding },
  );
}

let flare = academyStep(currentMovementState(), (candidate) => (
  candidate.actionType === OFFICIAL_DECLARE_ABILITY_ACTION_TYPE
    && candidate.executorId === OFFICIAL_ACADEMY_MEDIC_ABILITY_V2_EXECUTOR_ID
    && candidate.abilityId === "optical_flare"
    && candidate.targetId === "p2-marine"
    && candidate.abilityWindow === "before_action"
));
assert.equal(flare.action.dataAdapterReceiptHash.length, 64);
assert.equal(flare.state.pieces.find((piece) => piece.id === "p1-medic")
  .selectedUpgradeNames.join(","), "Medpack");
flare = academyStep(flare.state, (candidate) => (
  candidate.actionType === OFFICIAL_USE_ABILITY_REACTION_ACTION_TYPE
));
assert.equal(flare.state.cardResources.player1.find((entry) => entry.id === "p1-academy")
  .readiness, "ready");
const resolveCandidate = enumerateOfficialAcademyMedicAbilityV2(flare.state, {
  sideKey: "player1",
  matchBinding: fixture.matchBinding,
  throwOnError: true,
}).find((candidate) => (
  candidate.actionType === OFFICIAL_RESOLVE_ABILITY_ACTION_TYPE
    && candidate.cardResourceIds.join(",") === "p1-academy"
));
assert.ok(resolveCandidate);
const resolved = applyOfficialAcademyMedicAbilityV2(
  flare.state,
  action(resolveCandidate),
  { matchBinding: fixture.matchBinding },
);
assert.equal(resolved.state.officialGameplayDataBundle.gameplayDataBundleHash,
  "f530568fbb6118bc2921fe13d807dbe8bb095e42efb5faf33d8f3d9806177459");
assert.equal(resolved.state.pieces.find((piece) => piece.id === "p2-marine").statuses
  .filter((status) => typeof status === "object").length, 1);

const opened = openOfficialMedicRestorationWindowV2(resolved.state, {
  action: action(resolveCandidate),
  effect: resolved.effect,
  abilityResolutionHash: resolved.abilityResolutionHash,
  matchBinding: fixture.matchBinding,
});
assert.equal(opened.opened, true);
const restorationCandidate = enumerateOfficialMedicRestorationV2(opened.state, {
  sideKey: "player2",
  matchBinding: fixture.matchBinding,
  throwOnError: true,
}).find((candidate) => (
  candidate.actionType === OFFICIAL_USE_RESTORATION_REACTION_ACTION_TYPE
    && candidate.executorId === OFFICIAL_MEDIC_RESTORATION_V2_EXECUTOR_ID
));
assert.ok(restorationCandidate);
const restored = applyOfficialMedicRestorationV2(
  opened.state,
  action(restorationCandidate),
  { matchBinding: fixture.matchBinding },
);
assert.deepEqual(
  restored.state.pieces.find((piece) => piece.id === "p2-marine").statuses,
  ["stationary"],
);
assert.equal(restored.state.board.effectMarkers.length, 0);

const assaultState = structuredClone(resolved.state);
assaultState.phase = "assault";
assaultState.activeSideKey = "player2";
const rangedCandidate = enumerateOfficialOpticalFlareRangedConsumerV2(assaultState, {
  sideKey: "player2",
  matchBinding: fixture.matchBinding,
  throwOnError: true,
}).find((candidate) => (
  candidate.executorId === OFFICIAL_OPTICAL_FLARE_RANGED_V2_EXECUTOR_ID
    && candidate.targetId === "p1-marine"
));
assert.ok(rangedCandidate);
assert.equal(rangedCandidate.effectiveRangeInches, 8);
assert.equal(rangedCandidate.longRangeAllowed, false);
const ranged = applyOfficialOpticalFlareRangedConsumerV2(
  assaultState,
  action(rangedCandidate),
  {
    matchBinding: fixture.matchBinding,
    chanceReveals: Array.from(
      { length: rangedCandidate.chance.count },
      () => ({ faces: 6, outcome: 1 }),
    ),
  },
);
assert.equal(ranged.executorId, OFFICIAL_OPTICAL_FLARE_RANGED_V2_EXECUTOR_ID);
assert.equal(ranged.state.pieces.find((piece) => piece.id === "p2-marine")
  .selectedUpgradeNames.length, 0);

const drifted = structuredClone(currentMovementState());
drifted.officialGameplayDataBundle.gameplayDataBundleHash = "0".repeat(64);
assert.deepEqual(enumerateOfficialAcademyMedicAbilityV2(drifted, {
  sideKey: "player1",
  matchBinding: fixture.matchBinding,
}), []);

console.log(JSON.stringify({
  schema: "starcraft_tmg_current_academy_medic_v2_public_contract_verification_v1",
  acceptancePassed: 12,
  acceptanceTotal: 12,
  executorIds: [
    OFFICIAL_ACADEMY_MEDIC_ABILITY_V2_EXECUTOR_ID,
    OFFICIAL_MEDIC_RESTORATION_V2_EXECUTOR_ID,
    OFFICIAL_OPTICAL_FLARE_RANGED_V2_EXECUTOR_ID,
  ],
  latestOfficialBundleHash:
    resolved.state.officialGameplayDataBundle.gameplayDataBundleHash,
  repositoryFallbackUsed: false,
  trainingTruth: false,
}, null, 2));

export { action, currentInitialState, currentMovementState };
