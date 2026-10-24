#!/usr/bin/env node

import assert from "node:assert/strict";
import { projectStarcraftTmgLiveDecisionRoomProjectionV1 } from
  "../packages/online-agent-session/live-flash-decision-port-v1.mjs";

const upgrades = Array.from({ length: 25 }, (_, index) => ({
  upgradeInstanceId: `upgrade-${index}`,
  unitInstanceId: "goliath-1",
  recordKey: `upgrade:record-${index}`,
  upgradeName: `Upgrade ${index}`,
  mineralCost: index + 1,
  sourceRecordHash: "a".repeat(64),
  payloadHash: "b".repeat(64),
  definitionHash: "c".repeat(64),
}));
const publicRoster = { player1: {
  units: [{ unitInstanceId: "goliath-1", unitName: "Goliath",
    unitMineralCost: 140, selectedUpgrades: upgrades,
    upgradeMineralCost: 325 }],
  unitEntriesComplete: true,
} };
const budget = { player1: {
  scale: { name: "Standard", mineralLimit: 2000 },
  mineralBudget: 2000, mineralSpent: 1980, mineralUnspent: 20,
  vespeneLimit: 500, vespeneSpent: 450, vespeneUnspent: 50,
  unitRows: [{ unitInstanceId: "goliath-1", mineralCost: 140 }],
  upgradeRows: upgrades, tacticalCardRows: [],
  fullResourceArithmeticValidated: true,
  fullCompositionUpgradeAndFieldingLegalityValidated: true,
  resultHash: "d".repeat(64),
} };
const state = { round: 1, phase: "movement",
  publicRosterDisclosureBySide: publicRoster,
  armyResourceBudgetsBySide: budget };
const projected = projectStarcraftTmgLiveDecisionRoomProjectionV1({
  room: { roomId: "prompt-budget-reproduction", stateRevision: 3 }, state,
});
assert.deepEqual(projected.state.publicRosterDisclosureBySide, publicRoster,
  "public unit, upgrade and price facts must remain unchanged");
assert.equal(projected.state.armyResourceBudgetsBySide.player1.mineralSpent,
  1980);
assert.equal(projected.state.armyResourceBudgetsBySide.player1.vespeneUnspent,
  50);
assert.equal(projected.state.armyResourceBudgetsBySide.player1.resultHash,
  "d".repeat(64));
assert.equal(projected.state.armyResourceBudgetsBySide.player1.unitRows,
  undefined, "duplicated cost-audit unit rows must not enter each prompt");
assert.equal(projected.state.armyResourceBudgetsBySide.player1.upgradeRows,
  undefined, "duplicated upgrade-audit rows must not enter each prompt");
assert(JSON.stringify(projected.state).length
  < JSON.stringify(state).length - 5_000,
"removing redundant audit rows must materially reduce the prompt");
console.log(JSON.stringify({ passed: true, providerCalls: 0,
  roomMutations: 0, publicRosterPreserved: true,
  bytesBefore: JSON.stringify(state).length,
  bytesAfter: JSON.stringify(projected.state).length }));
