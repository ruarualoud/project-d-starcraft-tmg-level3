// Concrete product gap: a reviewed Agent roster can be handed to an
// authoritative Room directly, but the live A-A fixture still instantiates
// its fixed 15-Unit recipe instead of the selected 8-Unit Terran roster.
import assert from "node:assert/strict";
import path from "node:path";

import { createTicket20AgentAgentDemoFixtureV1 } from
  "./support/ticket20-human-agent-demo-fixture-v1.mjs";
import { createRosterPlanningProductModuleV1 } from
  "../packages/product-composition/roster-planning-product-module-v1.mjs";
import {
  OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1,
  OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY,
} from "../packages/product-composition/official-standard-room-factory-v1.mjs";

const root = path.resolve(import.meta.dirname, "..");
const fixtureRoot = path.resolve(root, "../..");
const sessionId = "rws-58722117-8734-4e1e-bd2d-5d7cb98e5061";
const roomId = "ticket27-s272-agent-roster-selfplay-focused";
const mapConfiguration = { seedId: "sc1_lost_temple_v1",
  elementSelections: [], passageSelections: [] };
const product = await createRosterPlanningProductModuleV1({
  root, fixtureRoot, mapConfiguration,
  dataDirectory: path.join(root,
    "build/ticket-27-slice-272-output-capacity-v2"),
});
const session = product.service.readSession(sessionId);
assert.equal(session.plan.planStatus, "revised");
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
assert.equal(recipe.units.length, 8);
let prepared = null;
const fixture = await createTicket20AgentAgentDemoFixtureV1({
  root: fixtureRoot, roomId, roomProfile: "standard_2000_live",
  mapConfiguration, autoDrive: false, attachBot: false,
  standard2000Recipes: {
    player1: recipe,
    player2: OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1.player2,
  },
  armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY,
  preparePregameRosterPlans: async ({ roomRuntime, roomId: currentRoomId,
    seats }) => {
    prepared = await product.preparePregamePlanForRoom({
      sessionId, roomRuntime, roomId: currentRoomId,
      seatToken: seats.player1.seatToken,
      scope: seats.player1.scope,
    });
    return { player1: prepared };
  },
});
const read = await fixture.roomRuntime.readRoom({ roomId,
  seatToken: fixture.createdRoom.credentials.human.seatToken });
assert.equal(read.ok, true);
const aggregate = await fixture.roomRuntime.roomStore.loadRoom(roomId);
assert.equal(aggregate.envelope.state.authoritativeArmyRostersBySide
  .player1.units.length, 8,
"the match must field the exact Agent-selected Unit list");
assert.equal(fixture.coverage.selectedUnitCount, 16);
assert.equal(fixture.coverage.mineralSpentBySide.player1, 2000);
assert.equal(prepared.plan.planHash, session.plan.planHash);
const orchestrator = fixture.orchestrator;
await orchestrator.start();
const player1TurnPlan = fixture.player1TurnPlanRuntime.read({
  scope: fixture.player1Scope,
});
assert.equal(player1TurnPlan.plan?.pregamePlanOrigin?.rosterPlanHash,
  prepared.plan.planHash,
  "the A-A orchestrator must pass the reviewed plan to the Bot seat");
assert.equal(player1TurnPlan.plan.pregameRosterArrivalSchedule.entries.length,
  8);
await orchestrator.pause({ reason: "focused_recovery_boundary" });
const recovered = await orchestrator.recoverSeat({ seatKey: "player1" });
assert.equal(recovered.sameRoom, true);
assert.equal(recovered.sameMatchBinding, true);
const recoveredPlan = fixture.player1TurnPlanRuntime.read({
  scope: fixture.player1Scope,
});
assert.equal(recoveredPlan.plan.pregamePlanOrigin.rosterPlanHash,
  prepared.plan.planHash);
assert.equal(recoveredPlan.plan.pregameRosterArrivalSchedule.entries.length,
  8);
await fixture.player1Runtime.close();
await fixture.botRuntime.close();
process.stdout.write(JSON.stringify({ result: "pass", sessionId, roomId,
  agentUnitCount: recipe.units.length,
  matchUnitCount: fixture.coverage.selectedUnitCount,
  player1Minerals: fixture.coverage.mineralSpentBySide.player1,
  arrivalUnitsInSelfplayBot:
    player1TurnPlan.plan.pregameRosterArrivalSchedule.entries.length,
  arrivalUnitsAfterSeatRecovery:
    recoveredPlan.plan.pregameRosterArrivalSchedule.entries.length,
  providerCalls: 0, roomMutations: 0, trainingTruth: false }) + "\n");
