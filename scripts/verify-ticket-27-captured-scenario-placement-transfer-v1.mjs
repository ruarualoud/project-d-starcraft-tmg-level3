// Concrete B Foundation bug: its six real scenario placements are silently
// truncated to four before the same production laboratory receives them.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createOfficialStandardRoomInitialStateAuthorityV1,
  OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1,
  OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY } from
  "../packages/product-composition/official-standard-room-factory-v1.mjs";
import { createOfficialCurrentProductMatchRuntimeV1 } from
  "../packages/product-composition/official-current-product-match-runtime-v1.mjs";
import { createOfficialUnitCompositionUpgradeDataBundleV1 } from
  "../packages/source-data/official-unit-composition-upgrade-data-bundle-v1.mjs";
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1,
  resolveOfficialDevelopmentTrancheFixtureRootV1 } from
  "./support/official-development-tranche-source-lock-fixture-v1.mjs";
import { loadPortableFoundationalStrategyPackV2 } from
  "../packages/strategy-skills/portable-foundational-skill-pack-loader-v2.mjs";
import { STARCRAFT_TMG_TICKET_18_PORTABLE_STRATEGY_PACK_V2 as manifest } from
  "../content/skill-generation/ticket-18-portable-strategy-pack-v2.mjs";
import { createOfficialArmyBuilderQueryPortV1 } from
  "../packages/roster-strategist/army-builder-query-port-v1.mjs";
import { createPregameSceneLaboratoryV1 } from
  "../packages/roster-strategist/pregame-scene-laboratory-v1.mjs";
import { createRosterStrategistRuntimeV1,
  createScriptedRosterDeliberationPortV1 } from
  "../packages/roster-strategist/roster-strategist-runtime-v1.mjs";
import { createRosterTeachRolePortsV1 } from
  "../packages/roster-strategist/roster-teach-role-ports-v1.mjs";

const root = path.resolve(import.meta.dirname, "..");
const [sessionPath, mapPath, reportPath] = process.argv.slice(2);
const original = JSON.parse(await fs.readFile(sessionPath, "utf8"));
const originalBytes = JSON.stringify(original);
const candidate = original.lockedRoster.lock.candidateInput;
const foundation = structuredClone(original.publicOutputs.find(x =>
  x.roundKind === "strategy_foundation").sanitizedOutput);
foundation.informationNeeds = foundation.informationNeeds.filter(x =>
  x.needId === "need-round2-scenario");
assert.equal(foundation.informationNeeds.length, 1);
const actualNeed = foundation.informationNeeds[0];
assert.equal(actualNeed.toolRequest.spec.placements.length, 6);
const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({
  root: await resolveOfficialDevelopmentTrancheFixtureRootV1({ root }),
});
const bundle = createOfficialUnitCompositionUpgradeDataBundleV1({
  dataset: source.dataset,
});
const builder = createOfficialArmyBuilderQueryPortV1({
  unitCompositionUpgradeDataBundle: bundle,
});
const selectedRecipe = { factionRecordKey: candidate.factionRecordKey,
  tacticalCardRecordKeys: candidate.tacticalCardRecordKeys,
  units: candidate.units.map(u => ({ unitInstanceId: u.unitInstanceId,
    recordKey: u.recordKey, compositionKind: u.compositionKind,
    upgradeNames: u.upgrades.map(x => x.upgradeName) })) };
const authority = createOfficialStandardRoomInitialStateAuthorityV1({
  dataset: source.dataset, snapshot: source.snapshot,
  serverSeatPlan: ["player1", "player2"].map(seatKey => ({
    label: seatKey, seatKey, roleMode: "supervisor", principalType: "human" })),
  roomId: "ticket27-s271-roster-workspace-lab",
  recipes: { ...structuredClone(OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1),
    [candidate.sideKey]: selectedRecipe },
  armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY,
  missionRecordKey: original.setup.missionBinding.missionRecordKey,
  deploymentRecordKey: original.setup.missionBinding.deploymentRecordKey,
  mapConfiguration: JSON.parse(await fs.readFile(mapPath, "utf8")),
});
const core = createPregameSceneLaboratoryV1({
  laboratoryId: "ticket27-s271-roster-workspace-lab", sourceState: authority.state,
  sourceRoomRef: { roomId: "ticket27-s271-roster-workspace-lab", stateRevision: 0 },
  rulesRuntime: createOfficialCurrentProductMatchRuntimeV1({
    dataset: source.dataset, state: structuredClone(authority.state) }),
  armyBuilderPort: builder, matchBinding: authority.matchBinding,
});
let capturedRequest = null;
let capturedReceipt = null;
const laboratory = { ...core, runScenarioBranch(request) {
  capturedRequest = structuredClone(request);
  capturedReceipt = core.runScenarioBranch(request);
  return capturedReceipt;
} };
const strategist = createRosterStrategistRuntimeV1({ armyBuilderPort: builder,
  laboratory, strategyPack: await loadPortableFoundationalStrategyPackV2({
    root, manifest }) });
let fixtureCalls = 0;
const deliberation = createScriptedRosterDeliberationPortV1({ handler(request) {
  fixtureCalls += 1;
  if (request.roundKind === "strategy_foundation") return foundation;
  assert.equal(request.roundKind, "teach_challenge");
  throw new Error("CAPTURED_PLACEMENTS_STOP_AFTER_FOUNDATION");
} });
const setup = original.setup;
await assert.rejects(strategist.planPresetRoster({
  sessionId: original.sessionId, sideKey: setup.sideKey,
  factionRecordKey: setup.factionRecordKey,
  opponentFactionRecordKey: setup.opponentFactionRecordKey,
  engagementScale: setup.engagementScale, mineralBudget: setup.mineralBudget,
  missionBinding: setup.missionBinding,
  opponentInformationBoundary: setup.opponentInformationBoundary,
  versionPins: {
    sourceLockHash: bundle.sourceLockHash,
    sourceSnapshotHash: bundle.sourceSnapshotHash,
    normalizedDatasetHash: bundle.normalizedDatasetHash,
    officialRulesVersion: bundle.officialRulesVersion,
    officialUnitsVersion: bundle.officialUnitsVersion,
    officialCardsVersion: bundle.officialCardsVersion,
  },
}, { deliberation, presetRosterLock: original.lockedRoster.lock,
  teachPorts: createRosterTeachRolePortsV1({ deliberation,
    sessionId: original.sessionId }) }),
  /CAPTURED_PLACEMENTS_STOP_AFTER_FOUNDATION/);
assert.equal(fixtureCalls, 2, "the actual query must reach Teach");
const expected = actualNeed.toolRequest.spec.placements.map(p => ({
  pieceId: String(p.pieceId).trim(), xInches: Number(p.xInches),
  yInches: Number(p.yInches),
}));
assert.deepEqual(capturedRequest?.spec.placements, expected,
  "production Foundation must forward all six original placements, in order");
assert.equal(capturedReceipt?.hypotheticalPlacements?.length, 6,
  "the real laboratory must apply all six, not merely attach a reference");
assert.equal(JSON.stringify(original), originalBytes);
const proof = core.proveMutationZero();
assert.equal(proof.sourceStateMutationCount, 0);
assert.equal(proof.sourceStateHashUnchanged, true);
const report = { passed: true, originalNeedId: actualNeed.needId,
  inputPlacementCount: expected.length,
  forwardedPlacementCount: capturedRequest.spec.placements.length,
  appliedHypotheticalPlacementCount: capturedReceipt.hypotheticalPlacements.length,
  exactOrderAndCoordinatesPreserved: true, actualProductionRuntimeUsed: true,
  actualLaboratoryUsed: true, originalSavedOutputUnchanged: true,
  providerCalls: 0, liveRoomWrites: 0, sourceStateMutationCount: 0,
  scope: "captured_foundation_to_laboratory_placement_transfer_not_complete_teach_or_plan",
  trainingTruth: false };
await fs.writeFile(reportPath, JSON.stringify(report, null, 2) + "\n",
  { mode: 0o600 });
console.log(JSON.stringify(report));
