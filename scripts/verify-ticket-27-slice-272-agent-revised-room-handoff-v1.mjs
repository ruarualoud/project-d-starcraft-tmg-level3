// Concrete regression: an Agent-built plan corrected by a cited final review
// becomes `revised`. Product handoff must admit it, then bind the exact
// selected Rules-audited list, map design, seat and revision lineage in a
// fresh authoritative Room. No Provider call or action Apply occurs here.
import assert from "node:assert/strict";
import path from "node:path";

import { createStarcraftTmgAuthoritativeEngine } from
  "../packages/authoritative-engine/transition-v1.mjs";
import { createStarcraftTmgRoomRuntime } from
  "../packages/room-runtime/in-memory-room-v1.mjs";
import { createStarcraftTmgHostedBotSeatRuntimeV1 } from
  "../packages/online-agent-session/hosted-bot-seat-runtime-v1.mjs";
import { createStarcraftTmgMatchDecisionContinuityV1 } from
  "../packages/online-agent-session/match-decision-continuity-v1.mjs";
import { createStarcraftTmgTurnPlanRuntimeV1 } from
  "../packages/online-agent-session/turn-plan-runtime-v1.mjs";
import { createRosterPlanningProductModuleV1 } from
  "../packages/product-composition/roster-planning-product-module-v1.mjs";
import {
  createOfficialStandardRoomInitialStateAuthorityV1,
  OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1,
  OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY,
} from "../packages/product-composition/official-standard-room-factory-v1.mjs";
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from
  "./support/official-development-tranche-source-lock-fixture-v1.mjs";

const root = path.resolve(import.meta.dirname, "..");
const fixtureRoot = path.resolve(root, "../..");
const sessionId = "rws-58722117-8734-4e1e-bd2d-5d7cb98e5061";
const roomId = "ticket27-s272-agent-revised-handoff-focused";
const seatPlan = [
  { label: "player1", seatKey: "player1", roleMode: "supervisor",
    principalType: "human" },
  { label: "player2", seatKey: "player2", roleMode: "supervisor",
    principalType: "human" },
];
const mapConfiguration = { seedId: "sc1_lost_temple_v1",
  elementSelections: [], passageSelections: [] };

const product = await createRosterPlanningProductModuleV1({
  root, fixtureRoot, mapConfiguration,
  dataDirectory: path.join(root,
    "build/ticket-27-slice-272-output-capacity-v2"),
});
const session = product.service.readSession(sessionId);
assert.equal(session.status, "planned");
assert.equal(session.plan.planStatus, "revised");
assert.equal(session.planReviewBlockingHighFindings, false);
assert.equal(session.planReviewRequiredForHandoff, false);
assert.equal(session.planEvidenceStale, false);
assert.equal(session.plan.budgetAcceptance.mineralSpent, 2000);

const input = session.working.candidateInput;
const recipe = {
  factionRecordKey: input.factionRecordKey,
  tacticalCardRecordKeys: input.tacticalCardRecordKeys,
  units: input.units.map((unit) => ({
    unitInstanceId: unit.unitInstanceId,
    recordKey: unit.recordKey,
    compositionKind: unit.compositionKind,
    upgradeNames: unit.upgrades.map((upgrade) => upgrade.upgradeName),
  })),
};
const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({
  root: fixtureRoot,
});
const authority = createOfficialStandardRoomInitialStateAuthorityV1({
  dataset: source.dataset, snapshot: source.snapshot,
  serverSeatPlan: seatPlan, roomId, mapConfiguration,
  armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY,
  recipes: { player1: recipe,
    player2: OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1.player2 },
});
const roomRuntime = createStarcraftTmgRoomRuntime({
  authorityEngine: createStarcraftTmgAuthoritativeEngine(),
});
const created = await roomRuntime.createRoom({ roomId,
  gameId: "starcraft-tmg", initialStateAuthority: authority,
  serverSeatPlan: seatPlan });
assert.equal(created.ok, true, created.reason || created.message);
const seatToken = created.credentials.player1.seatToken;
const roomRead = await roomRuntime.readRoom({ roomId, seatToken });
assert.equal(roomRead.ok, true, roomRead.reason);
const roomMap = roomRead.projection.state.board
  .competitiveMapRoomFreezeSummary;
assert.notEqual(roomMap.roomFreezeHash,
  product.mapEvidencePort.mapBinding.roomFreezeHash);
assert.equal(roomMap.compilationHash,
  product.mapEvidencePort.mapBinding.compilationHash);
const scope = { gameId: "starcraft-tmg", roomId,
  matchBindingHash: roomRead.projection.matchBinding.bindingHash,
  seatKey: "player1" };
const prepared = await product.preparePregamePlanForRoom({
  sessionId, roomRuntime, roomId, seatToken, scope,
});
assert.equal(prepared.plan.planHash, session.plan.planHash);
assert.equal(prepared.roomStateRevision, 0);
assert.equal(prepared.trainingTruth, false);
assert.match(prepared.originHash, /^[a-f0-9]{64}$/u);
const differentMapProjection = structuredClone(roomRead.projection);
differentMapProjection.state.board.competitiveMapRoomFreezeSummary
  .compilationHash = "0".repeat(64);
await assert.rejects(product.preparePregamePlanForRoom({
  sessionId, roomRuntime: { readRoom: async () => ({ ok: true,
    projection: differentMapProjection }) }, roomId, seatToken, scope,
}), /ROSTER_PLAN_ROOM_HANDOFF_MAP_BINDING_MISMATCH/u);
let decisionCalls = 0;
const continuity = createStarcraftTmgMatchDecisionContinuityV1();
const turnPlanRuntime = createStarcraftTmgTurnPlanRuntimeV1({
  decisionContinuity: continuity,
});
const bot = createStarcraftTmgHostedBotSeatRuntimeV1({
  roomPort: roomRuntime, turnPlanRuntime, matchMode: "user_vs_agent",
  decisionPort: { decide: async () => {
    decisionCalls += 1;
    throw new Error("focused attach must not call the model");
  } },
});
const attached = await bot.attach({ scope, seatToken, autoDrive: false,
  automationConsent: { approved: true, approvedBy: "human",
    scope: "current_match_bot_seat",
    approvedAt: "2026-09-25T00:00:00.000Z" },
  pregameRosterPlan: prepared,
});
assert.equal(attached.ok, true);
const botRead = await bot.read({ scope });
assert.equal(botRead.ok, true);
assert.equal(botRead.projection.promptPack, "opponent_prompt");
const turnPlan = turnPlanRuntime.read({ scope });
assert.equal(turnPlan.plan.pregamePlanOrigin.rosterPlanHash,
  prepared.plan.planHash);
assert.equal(turnPlan.plan.pregameRosterArrivalSchedule.entries.length, 8);
assert.equal(decisionCalls, 0);
const after = await roomRuntime.readRoom({ roomId, seatToken });
assert.equal(after.projection.room.stateRevision, 0);
assert.equal(after.projection.room.acceptedReceiptCount, 0);
await bot.close();
const restoredTurnPlanRuntime = createStarcraftTmgTurnPlanRuntimeV1({
  decisionContinuity: continuity,
});
const hydration = await restoredTurnPlanRuntime.hydrate({ scope });
assert.equal(hydration.restored, true);
const restoredTurnPlan = restoredTurnPlanRuntime.read({ scope });
assert.equal(restoredTurnPlan.plan.pregamePlanOrigin.rosterPlanHash,
  prepared.plan.planHash);
assert.equal(restoredTurnPlan.plan.pregameRosterArrivalSchedule.entries.length,
  8);
process.stdout.write(JSON.stringify({ result: "pass", sessionId,
  planHash: prepared.plan.planHash,
  scheduleHash: prepared.plan.openingDeploymentSchedule.scheduleHash,
  roomId, roomStateRevision: prepared.roomStateRevision,
  originHash: prepared.originHash,
  turnPlanHash: turnPlan.plan.planHash,
  arrivalUnitsReadByBot: turnPlan.plan.pregameRosterArrivalSchedule.entries.length,
  arrivalUnitsRestoredFromJournal:
    restoredTurnPlan.plan.pregameRosterArrivalSchedule.entries.length,
  providerCalls: decisionCalls,
  roomMutations: 0, trainingTruth: false }) + "\n");
