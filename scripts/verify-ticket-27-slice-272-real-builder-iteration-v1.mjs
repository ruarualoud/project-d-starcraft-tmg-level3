#!/usr/bin/env node

import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createIterativeRosterPlanSessionV1 } from
  "../packages/roster-strategist/iterative-roster-plan-session-v1.mjs";
import { createOfficialArmyBuilderQueryPortV1 } from
  "../packages/roster-strategist/army-builder-query-port-v1.mjs";
import { createIterativeRosterBuilderAdapterV1 } from
  "../packages/roster-strategist/iterative-roster-builder-adapter-v1.mjs";
import { OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1 } from
  "../packages/product-composition/official-standard-room-factory-v1.mjs";
import { createOfficialUnitCompositionUpgradeDataBundleV1 } from
  "../packages/source-data/official-unit-composition-upgrade-data-bundle-v1.mjs";
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from
  "./support/official-development-tranche-source-lock-fixture-v1.mjs";

const root = process.env.TICKET27_S271_FIXTURE_ROOT
  || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root });
const bundle = createOfficialUnitCompositionUpgradeDataBundleV1({
  dataset: source.dataset });
const port = createOfficialArmyBuilderQueryPortV1({
  unitCompositionUpgradeDataBundle: bundle });
const recipe = OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1.player1;
const candidate = { candidateId: "real-builder-player1-2000", sideKey: "player1",
  scaleId: "Standard", mineralBudget: 2000,
  factionRecordKey: recipe.factionRecordKey,
  tacticalCardRecordKeys: [...recipe.tacticalCardRecordKeys],
  units: recipe.units.map((unit) => ({
    unitInstanceId: unit.unitInstanceId, recordKey: unit.recordKey,
    compositionKind: unit.compositionKind,
    upgrades: unit.upgradeNames.map((upgradeName) => ({ upgradeName })),
  })) };
const rejected = { ...candidate, factionRecordKey: "not-a-faction" };
const saved = new Map();
const proposals = [rejected, candidate];
const session = createIterativeRosterPlanSessionV1({
  store: {
    load: async (id) => structuredClone(saved.get(id) || null),
    save: async (id, value) => saved.set(id, structuredClone(value)),
  },
  model: { decide: async () => ({ outcome: "completed",
    receiptHash: "retained-model-receipt-v1",
    decision: { kind: "propose", candidateInput: proposals.shift(),
      plan: { victoryRoute: "Hold and contest the central markers",
        arrivalScheduleStatus: "unknown", mapEvidenceHash: null },
      assumptionDisposition: "retain" } }) },
  builder: createIterativeRosterBuilderAdapterV1(port),
  tools: { query: async () => assert.fail("full-budget candidate needs no branch query") },
  review: { final: async () => assert.fail("not finishing this focused test") },
});
await session.start({ sessionId: "real-builder-iteration-2000",
  mineralBudget: 2000, frozenContext: { mapHash: "frozen-map-v1",
    taskHash: "frozen-task-v1", sourceHash: bundle.sourceLockHash } });
const first = await session.resume("real-builder-iteration-2000");
assert.equal(first.currentCandidate, null);
assert.equal(first.iterations[0].rulesVerdictStatus, "invalid_candidate");
const second = await session.resume("real-builder-iteration-2000");
assert.equal(second.currentCandidate.mineralSpent, 2000);
assert.equal(second.iterations[1].rulesVerdictStatus, "legal");
assert.equal(second.modelDecisionReceiptCount, 2);
process.stdout.write("real_builder_iteration_ready; providerCalls=0; roomMutations=0\n");
