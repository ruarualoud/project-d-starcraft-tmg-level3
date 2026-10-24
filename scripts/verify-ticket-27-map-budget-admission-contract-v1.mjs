import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as product from "../packages/product-composition/roster-planning-product-module-v1.mjs";
import { projectStarcraftTmgViewerStateShapeV3 } from
  "../packages/client-domain/viewer-projection-v3.mjs";
import { projectCompetitiveMapRoomFreezeSummaryV1 } from
  "../packages/client-domain/competitive-map-admission-contract-v1.mjs";
import "../packages/product-composition/official-skirmish-500-room-factory-v1.mjs";
import "../packages/roster-planning-workspace/agent-selected-roster-journey-v1.mjs";

// Exercise the exact legacy private predicate for RED, and the same exported
// production predicate for GREEN. No terrain regeneration or Army fabrication
// is claimed: these two bugs are in preflight policy, not geometry/legality.
const source = await readFile(new URL(
  "../packages/product-composition/roster-planning-product-module-v1.mjs", import.meta.url), "utf8");
const start = source.indexOf("function roomMapMatchesPlanBinding(roomMap, mapBinding)");
const end = source.indexOf("\n}", start) + 2;
const matches = product.roomMapMatchesPlanBinding || new Function(
  `${source.slice(start, end)}; return roomMapMatchesPlanBinding;`)();
const hash = "a".repeat(64);
const binding = { seedId: "semantic-policy-repro", compilationHash: hash,
  rulesReachabilityAuditHash: hash };
const roomMap = { seedId: binding.seedId, compilationHash: hash,
  missionSpatialReachabilityAuditHash: hash, roomFreezeHash: hash,
  everyEntrySegmentUsable: false, mutationAfterRoomCreationAllowed: false,
  backgroundRulesAuthority: false,
  mapAdmission: { schema: "starcraft_tmg_competitive_map_admission_v1",
    policy: "semantic_selected_recipe_not_universal_chassis_connectivity",
    everySideEnterableByAtLeastOneCurrentBase: true,
    everyMarkerAndQuarterReachableByAtLeastOneCurrentBase: true,
    opposingSidesConnectedByAtLeastOneCurrentBase: true } };
const exactBudget = product.rosterPlanMatchesSelectedBudgetV1
  || ((plan) => plan.budgetAcceptance?.mineralSpent === 2000);
const plan = (budget, spent = budget) => ({
  rosterCandidate: { mineralBudget: budget }, budgetAcceptance: { mineralSpent: spent } });
const results = {
  semanticMapAdmitted: matches(roomMap, binding),
  exact500BudgetAdmitted: exactBudget(plan(500), 500),
};
console.log(JSON.stringify(results));
assert.equal(results.semanticMapAdmitted, true);
assert.equal(results.exact500BudgetAdmitted, true);
assert.equal(exactBudget(plan(2000), 2000), true);
assert.equal(exactBudget(plan(2000, 1870), 2000), false);
assert.equal(exactBudget(plan(500), 2000), false);
assert.equal(matches(roomMap, { ...binding, compilationHash: "b".repeat(64) }), false);
assert.equal(matches({ ...roomMap, mapAdmission: { ...roomMap.mapAdmission,
  everySideEnterableByAtLeastOneCurrentBase: false } }, binding), false);
assert.equal(matches({ ...roomMap, mapAdmission: undefined,
  everyEntrySegmentUsable: true }, binding), true);
assert.equal(matches({ ...roomMap, mapAdmission: undefined }, binding), false);
// Existing semantic Room summaries can be projected from their bound retained
// freeze without mutating Room state, geometry, or disclosing the private tree.
const freeze = { schema: "starcraft_tmg_competitive_map_semantic_room_freeze_v1",
  ...roomMap, mapAdmission: undefined,
  everySideEnterableByAtLeastOneCurrentBase: true,
  everyMarkerAndQuarterReachableByAtLeastOneCurrentBase: true,
  opposingSidesConnectedByAtLeastOneCurrentBase: true,
  privateDiagnostic: "must not be projected" };
const state = { board: { terrain: [], competitiveMapRoomFreezeSummary:
  { ...roomMap, mapAdmission: undefined } }, officialCompetitiveMapRoomFreeze: freeze };
const original = JSON.stringify(state);
const projected = projectStarcraftTmgViewerStateShapeV3(state);
assert.equal(matches(projected.board.competitiveMapRoomFreezeSummary, binding), true);
assert.deepEqual(projected, projectStarcraftTmgViewerStateShapeV3(projected));
assert.equal(JSON.stringify(state), original);
assert.equal(projected.officialCompetitiveMapRoomFreeze, undefined);
assert.equal(projected.board.competitiveMapRoomFreezeSummary.privateDiagnostic, undefined);
assert.equal(projected.board.competitiveMapRoomFreezeSummary.roomFreezeHash, hash);
assert.deepEqual(projected.board.terrain, state.board.terrain);
assert.equal(matches(projectCompetitiveMapRoomFreezeSummaryV1({ ...freeze,
  everyMarkerAndQuarterReachableByAtLeastOneCurrentBase: false }), binding), false);
assert.equal(matches(projectCompetitiveMapRoomFreezeSummaryV1({ ...freeze,
  opposingSidesConnectedByAtLeastOneCurrentBase: false }), binding), false);
assert.equal(matches(projectCompetitiveMapRoomFreezeSummaryV1({ ...freeze,
  schema: "starcraft_tmg_competitive_map_room_freeze_v1", everyEntrySegmentUsable: true,
  everyMissionMarkerAndQuarterReachableByAtLeastOneCurrentBase: true,
  opposingSidesConnectedForEveryCurrentBase: true }), binding), true);
console.log("MAP_BUDGET_ADMISSION_CONTRACT_OK; providerCalls=0; roomWrites=0");
