// Concrete reproduction: a real Teach hypothetical placement kept reserve
// coherency and made the shared mission-control query report an invalid status.
import assert from "node:assert/strict";
import path from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from
  "./support/official-development-tranche-source-lock-fixture-v1.mjs";
import { createOfficialStandardRoomInitialStateAuthorityV1,
  OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1,
  OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY } from
  "../packages/product-composition/official-standard-room-factory-v1.mjs";
import { createOfficialCurrentProductMatchRuntimeV1 } from
  "../packages/product-composition/official-current-product-match-runtime-v1.mjs";
import { createOfficialCurrentProductMatchRuntimeV6 } from
  "../packages/product-composition/official-current-product-match-runtime-v6.mjs";
import { createOfficialUnitCompositionUpgradeDataBundleV1 } from
  "../packages/source-data/official-unit-composition-upgrade-data-bundle-v1.mjs";
import { createOfficialArmyBuilderQueryPortV1 } from
  "../packages/roster-strategist/army-builder-query-port-v1.mjs";
import { createPregameSceneLaboratoryV1 } from
  "../packages/roster-strategist/pregame-scene-laboratory-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";

const root = path.resolve(import.meta.dirname, "..");
const option = key => process.argv.find(arg => arg.startsWith(`--${key}=`))
  ?.slice(key.length + 3);
const captured = JSON.parse(await readFile(option("capture"), "utf8"));
const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({
  root: option("fixture"),
});
const candidate = captured.candidateInput;
const recipe = { factionRecordKey: candidate.factionRecordKey,
  tacticalCardRecordKeys: candidate.tacticalCardRecordKeys,
  units: candidate.units.map(unit => ({ unitInstanceId: unit.unitInstanceId,
    recordKey: unit.recordKey, compositionKind: unit.compositionKind,
    upgradeNames: unit.upgrades.map(upgrade => upgrade.upgradeName) })) };
const authority = createOfficialStandardRoomInitialStateAuthorityV1({
  dataset: source.dataset, snapshot: source.snapshot,
  serverSeatPlan: ["player1", "player2"].map(seatKey => ({ label: seatKey,
    seatKey, roleMode: "supervisor", principalType: "human" })),
  roomId: "ticket27-slice-271-roster-workspace-isolated-lab",
  recipes: { ...structuredClone(OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1),
    [candidate.sideKey]: recipe },
  armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY,
  missionRecordKey: captured.setup.missionBinding.missionRecordKey,
  deploymentRecordKey: captured.setup.missionBinding.deploymentRecordKey,
  mapConfiguration: captured.mapConfiguration,
});
const sourceHash = hashStarcraftTmgContract(authority.state);
assert.equal(sourceHash, captured.sourceStateHash);
const rulesRuntime = createOfficialCurrentProductMatchRuntimeV6({
  legacyRuntime: createOfficialCurrentProductMatchRuntimeV1({
    dataset: source.dataset, state: structuredClone(authority.state) }),
});
const laboratory = createPregameSceneLaboratoryV1({
  sourceState: authority.state, matchBinding: authority.matchBinding,
  rulesRuntime, armyBuilderPort: createOfficialArmyBuilderQueryPortV1({
    unitCompositionUpgradeDataBundle:
      createOfficialUnitCompositionUpgradeDataBundleV1({ dataset: source.dataset }),
  }),
});
async function inspect(branchId, spec) {
  const branch = laboratory.runScenarioBranch({ branchId, spec });
  const result = await laboratory.queryScene({ queryId: branchId + "-control",
    seatKey: "player1", queryKind: "mission_marker_control",
    base: { kind: "branch", branchStateHash: branch.branchStateHash },
    arguments: {},
  });
  return { branch, result };
}
const singleSpec = { ...structuredClone(captured.spec), clearTerrain: true,
  placements: [{ pieceId: "goliath-1", xInches: 10, yInches: 10 }] };
const single = await inspect("single-reserve-to-hypothesis", singleSpec);
assert.equal(single.result.resultStatus, "ok", single.result.unknownReason);
assert.equal(single.branch.advisoryOnly, true);
assert.equal(single.result.sceneScope.placementsLegalityProven, false);
assert.equal(single.branch.hypotheticalPlacementAssessment.units[0]
  .coherencyStatus.status, "in_coherency");
// The existing three-column hypothetical layout puts the third model four
// inches from the first here. It must be assessed, not labelled coherent.
const multi = await inspect("multi-assessed-not-assumed", { ...singleSpec,
  placements: [{ pieceId: "marauder-1", xInches: 10, yInches: 10,
    modelSpreadInches: 2 }] });
assert.equal(multi.result.resultStatus, "ok", multi.result.unknownReason);
assert.equal(multi.branch.hypotheticalPlacementAssessment.units[0]
  .coherencyStatus.status, "out_of_coherency");
const spread = await inspect("multi-out-of-coherency", { ...singleSpec,
  placements: [{ pieceId: "marauder-1", xInches: 10, yInches: 10,
    modelSpreadInches: 4 }] });
assert.equal(spread.result.resultStatus, "ok", spread.result.unknownReason);
assert.equal(spread.branch.hypotheticalPlacementAssessment.units[0]
  .coherencyStatus.status, "out_of_coherency");
const original = await inspect("actual-overlapping-teach-branch", captured.spec);
assert.equal(original.result.resultStatus, "unknown");
assert.match(original.result.unknownReason, /MODEL_BASE_GEOMETRY_PLACEMENT_OVERLAP/u);
assert.equal(original.branch.advisoryOnly, true);
assert.equal(hashStarcraftTmgContract(authority.state), sourceHash);
assert.equal(laboratory.proveMutationZero().sourceStateHashUnchanged, true);
const report = { status: "passed", sourceStateHash: sourceHash,
  originalFailure: captured.originalUnknownReason,
  correctedOriginalReason: original.result.unknownReason,
  single: single.result.resultStatus, multi: multi.result.resultStatus,
  spread: spread.branch.hypotheticalPlacementAssessment.units[0].coherencyStatus.status,
  hypotheticalLegalityStillUnproven: true, sourceStateUnchanged: true,
  providerCalls: 0, roomMutations: 0, trainingTruth: false };
await writeFile(option("output"), JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
process.stdout.write(JSON.stringify(report) + "\n");
