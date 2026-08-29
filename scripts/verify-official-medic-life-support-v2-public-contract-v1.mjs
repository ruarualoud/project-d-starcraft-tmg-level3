#!/usr/bin/env node

import assert from "node:assert/strict";

import * as fixture from "./verify-official-academy-medic-v2-public-contract-v1.mjs";
import { matchBinding } from
  "./verify-official-medic-medpack-v2-public-contract-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import {
  applyOfficialMedicLifeSupportV2,
  enumerateOfficialMedicLifeSupportV2,
  openOfficialMedicLifeSupportWindowV2,
  OFFICIAL_MEDIC_LIFE_SUPPORT_V2_EXECUTOR_ID,
  OFFICIAL_USE_LIFE_SUPPORT_REACTION_ACTION_TYPE,
} from "../packages/rule-atoms/official-medic-life-support-reaction-executor-v2.mjs";
import { createOfficialTotalDamageReactionKernelV1 } from
  "../packages/rule-atoms/official-total-damage-reaction-kernel-v1.mjs";

function action(candidate) {
  return Object.fromEntries(Object.entries(candidate).filter(([key]) => (
    !["isEnabled", "disabledReason", "score", "details"].includes(key)
  )));
}

function currentReactionState() {
  const state = fixture.currentInitialState();
  state.phase = "assault";
  state.activeSideKey = "player2";
  const source = state.pieces.find((piece) => piece.id === "p1-medic");
  const target = state.pieces.find((piece) => piece.id === "p1-marine");
  const attacker = state.pieces.find((piece) => piece.id === "p2-marine");
  source.selectedUpgradeNames = ["Medpack"];
  source.models.forEach((model, index) => {
    model.xInches = 18 + (index * 4);
    model.yInches = 5;
  });
  target.models[0].xInches = 20;
  target.models[0].yInches = 5;
  target.damageMarker = 1;
  attacker.models[0].xInches = 10;
  attacker.models[0].yInches = 5;
  state.cardResources.player1.find((card) => (
    card.officialCardRecordKey === "tactical_cards:academy"
  )).readiness = "exhausted";
  state.cardResources.player1.find((card) => (
    card.officialCardRecordKey === "tactical_cards:academy"
  )).face = "down";
  return state;
}

const state = currentReactionState();
const target = state.pieces.find((piece) => piece.id === "p1-marine");
const plan = createOfficialTotalDamageReactionKernelV1().plan({
  targetPieceId: target.id,
  targetModelId: target.models[0].id,
  attackResolutionHash: hashStarcraftTmgContract({
    kind: "slice-69-current-life-support-public-attack",
  }),
  priorDamageMarker: 1,
  incomingDamage: 2,
  targetHitPoints: 2,
});
const attackAction = {
  actionType: "ranged_attack",
  sideKey: "player2",
  pieceId: "p2-marine",
  targetId: "p1-marine",
};
const opened = openOfficialMedicLifeSupportWindowV2(state, {
  attackAction,
  totalDamageReactionPlan: plan,
  matchBinding,
});
assert.equal(opened.opened, true);
assert.equal(opened.state.officialGameplayDataBundle.gameplayDataBundleHash,
  "f530568fbb6118bc2921fe13d807dbe8bb095e42efb5faf33d8f3d9806177459");
const candidates = enumerateOfficialMedicLifeSupportV2(opened.state, {
  sideKey: "player1",
  matchBinding,
  throwOnError: true,
});
const use = candidates.find((candidate) => (
  candidate.actionType === OFFICIAL_USE_LIFE_SUPPORT_REACTION_ACTION_TYPE
));
assert.ok(use, JSON.stringify(candidates));
assert.equal(use.executorId, OFFICIAL_MEDIC_LIFE_SUPPORT_V2_EXECUTOR_ID);
assert.equal(use.lifeSupportBaseReduction, 2);
assert.equal(use.passiveBonus, 0);
assert.equal(use.resourceCost, 1);
assert.deepEqual(use.cardResourceIds, ["p1-taf"]);
assert.equal(use.dataAdapterReceiptHash.length, 64);
const applied = applyOfficialMedicLifeSupportV2(
  opened.state,
  action(use),
  { matchBinding },
);
assert.equal(applied.state.pieces.find((piece) => piece.id === "p1-marine").isDestroyed,
  false);
assert.deepEqual(applied.state.pieces.find((piece) => piece.id === "p1-medic")
  .selectedUpgradeNames, ["Medpack"]);
assert.equal(applied.state.officialGameplayDataBundle.gameplayDataBundleHash,
  "f530568fbb6118bc2921fe13d807dbe8bb095e42efb5faf33d8f3d9806177459");

console.log(JSON.stringify({
  schema: "starcraft_tmg_current_medic_life_support_v2_public_contract_v1",
  acceptancePassed: 8,
  acceptanceTotal: 8,
  executorId: OFFICIAL_MEDIC_LIFE_SUPPORT_V2_EXECUTOR_ID,
  latestOfficialBundleHash:
    applied.state.officialGameplayDataBundle.gameplayDataBundleHash,
  repositoryFallbackUsed: false,
  trainingTruth: false,
}, null, 2));

export { action, currentReactionState, plan };
