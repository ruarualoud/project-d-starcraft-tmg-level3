// Actual fresh B C4 supplied nine placements and follow-ups but declared
// kind=spatial. The port ignored the scenario and queried the empty source.
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
import { createOfficialArmyBuilderQueryPortV1 } from
  "../packages/roster-strategist/army-builder-query-port-v1.mjs";
import { createPregameSceneLaboratoryV1 } from
  "../packages/roster-strategist/pregame-scene-laboratory-v1.mjs";
import { createRosterTeachEvidencePortV1 } from
  "../packages/roster-strategist/roster-teach-evidence-port-v1.mjs";

const root = path.resolve(import.meta.dirname, "..");
const [draftPath, mapPath, outputPath] = process.argv.slice(2);
const bytes = await fs.readFile(draftPath, "utf8");
const draft = JSON.parse(bytes);
const candidate = draft.lockedRoster.lock.candidateInput;
const captured = draft.publicOutputs.filter(x => x.roundKind === "teach_challenge")
  .flatMap(x => x.sanitizedOutput.challenges)
  .filter(x => x.challengeId === "C4-t3-battlefield-event-firing-lanes").at(-1);
assert.equal(captured.evidenceRequest.kind, "spatial");
assert.equal(captured.evidenceRequest.toolRequest.spec.placements.length, 9);
const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({
  root: await resolveOfficialDevelopmentTrancheFixtureRootV1({ root }) });
const builder = createOfficialArmyBuilderQueryPortV1({
  unitCompositionUpgradeDataBundle: createOfficialUnitCompositionUpgradeDataBundleV1({
    dataset: source.dataset }) });
const authority = createOfficialStandardRoomInitialStateAuthorityV1({
  dataset: source.dataset, snapshot: source.snapshot,
  serverSeatPlan: ["player1", "player2"].map(seatKey => ({ label: seatKey,
    seatKey, roleMode: "supervisor", principalType: "human" })),
  roomId: "captured-teach-query-family",
  recipes: { ...structuredClone(OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1),
    [candidate.sideKey]: { factionRecordKey: candidate.factionRecordKey,
      tacticalCardRecordKeys: candidate.tacticalCardRecordKeys,
      units: candidate.units.map(u => ({ unitInstanceId: u.unitInstanceId,
        recordKey: u.recordKey, compositionKind: u.compositionKind,
        upgradeNames: u.upgrades.map(x => x.upgradeName) })) } },
  armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY,
  missionRecordKey: draft.setup.missionBinding.missionRecordKey,
  deploymentRecordKey: draft.setup.missionBinding.deploymentRecordKey,
  mapConfiguration: JSON.parse(await fs.readFile(mapPath, "utf8")),
});
const core = createPregameSceneLaboratoryV1({ sourceState: authority.state,
  armyBuilderPort: builder, matchBinding: authority.matchBinding,
  rulesRuntime: createOfficialCurrentProductMatchRuntimeV1({
    dataset: source.dataset, state: structuredClone(authority.state) }) });
let sourceQueries = 0;
const port = createRosterTeachEvidencePortV1({ ...core,
  querySpatial(query) { sourceQueries++; return core.querySpatial(query); } });
const query = request => port.query({ challengeId: captured.challengeId,
  request, initialFoundationHash: "a".repeat(64), sourceHashes: ["b".repeat(64)],
  mutationAuthority: false });
const result = query(captured.evidenceRequest);
assert.equal(result.unknownReasonCode, "ROSTER_TEACH_QUERY_KIND_SCENARIO_REQUIRED",
  "nonempty scenario data must not be silently ignored by a spatial query");
assert.equal(result.queryRepair.correctable, true);
assert.equal(result.queryRepair.requiredRequestKind, "scenario");
assert.equal(sourceQueries, 0);
const ordinary = structuredClone(captured.evidenceRequest);
ordinary.toolRequest.spec = { kind: "", lifecycleSteps: 0, phase: "",
  activeSideKey: "", placements: [], isolateToPlacedPieces: false,
  clearTerrain: false };
ordinary.toolRequest.followUps = [];
const genuine = query(ordinary);
assert.equal(genuine.unknownReasonCode, "no_active_relationships_in_base_state");
assert.equal(genuine.queryRepair, undefined);
assert.equal(sourceQueries, 1);
assert.equal(core.proveMutationZero().sourceStateMutationCount, 0);
assert.equal(await fs.readFile(draftPath, "utf8"), bytes);
const report = { passed: true, actualCapturedRequestAndLaboratoryUsed: true,
  mismatchedScenarioNotIgnored: true, typedRepairReturnedBeforeWrongQuery: true,
  ordinarySpatialUnknownNotRetried: true, providerCalls: 0,
  originalRoomWrites: 0, scenarioOutcomeNotCertified: true, trainingTruth: false };
await fs.writeFile(outputPath, JSON.stringify(report, null, 2) + "\n",
  { mode: 0o600 });
console.log(JSON.stringify(report));
