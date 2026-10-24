// Concrete defect: the pregame probability tool ignores a requested action
// identity and picks the first actor/target match. Verify the repaired seam
// against the same retained physical snapshot, without Provider or Room writes.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createPregameSceneLaboratoryV1 } from "../packages/roster-strategist/pregame-scene-laboratory-v1.mjs";
import { createOfficialArmyBuilderQueryPortV1 } from "../packages/roster-strategist/army-builder-query-port-v1.mjs";
import { createOfficialUnitCompositionUpgradeDataBundleV1 } from "../packages/source-data/official-unit-composition-upgrade-data-bundle-v1.mjs";
import { createOfficialCurrentProductMatchRuntimeV1 } from "../packages/product-composition/official-current-product-match-runtime-v1.mjs";
import { createOfficialCurrentProductMatchRuntimeV6 } from "../packages/product-composition/official-current-product-match-runtime-v6.mjs";
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1, resolveOfficialDevelopmentTrancheFixtureRootV1 } from "./support/official-development-tranche-source-lock-fixture-v1.mjs";
import { hashStarcraftTmgContract } from "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { enumerateOfficialSelectedRosterSpatialActionsV1,
  instantiateOfficialSelectedRosterSpatialActionV1 } from "../packages/product-composition/official-selected-roster-spatial-action-runtime-v1.mjs";

if (process.argv.includes("--changed-consumer-imports-only")) {
  for (const module of ["../packages/roster-strategist/roster-strategist-runtime-v1.mjs",
    "../packages/roster-strategist/iterative-roster-flash-model-port-v1.mjs",
    "../packages/product-composition/roster-planning-product-module-v1.mjs",
    "./support/ticket20-human-agent-demo-fixture-v1.mjs"]) await import(module);
  console.log(JSON.stringify({ check: "changed-product-consumers-and-generation-contracts-load", ok: true,
    previouslyPassedSceneChecksRepeated: 0, providerCalls: 0, roomWrites: 0 }));
  process.exit(0);
}

const fixture = JSON.parse(await readFile(process.argv[2], "utf8"));
const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({
  root: await resolveOfficialDevelopmentTrancheFixtureRootV1({ root: import.meta.dirname + "/.." }),
});
const row = fixture.cases.find(x => x.id === "B136");
const before = JSON.stringify(row.state);
// Construct the catalogue from the retained initial army, not a late state
// with summoned pieces (the runtime constructor requires the initial roster).
const initial = JSON.parse(await readFile(process.argv[3], "utf8")).roomState;
const rulesRuntime = createOfficialCurrentProductMatchRuntimeV6({ legacyRuntime:
  createOfficialCurrentProductMatchRuntimeV1({ dataset: source.dataset, state: initial }) });
const laboratory = createPregameSceneLaboratoryV1({ laboratoryId: "v31-domain-binding-regression",
  sourceState: row.state, sourceRoomRef: { roomId: row.roomId, stateRevision: row.stateRevision },
  matchBinding: row.matchBinding, rulesRuntime,
  armyBuilderPort: createOfficialArmyBuilderQueryPortV1({
    unitCompositionUpgradeDataBundle: createOfficialUnitCompositionUpgradeDataBundleV1({ dataset: source.dataset }) }),
});
const attackerUnitId = row.state.pieces.find(x => x.sideKey === "player1" && x.isOnField).id;
const targetUnitId = row.state.pieces.find(x => x.sideKey === "player2" && x.isOnField).id;
const invalid = await laboratory.queryProbability({ queryId: "explicit-domain-must-not-be-ignored",
  attackerUnitId, targetUnitId, domainId: "not-a-current-domain" });
assert.equal(invalid.resultStatus, "unknown");
assert.equal(invalid.unknownReason, "CURRENT_ACTION_QUERY_DOMAIN_UNKNOWN");
console.log(JSON.stringify({ check: "explicit-pregame-domain-not-ignored", ok: true }));

const { createStarcraftTmgSceneQueryServiceV1 } = await import("../packages/online-agent-session/scene-query-service-v1.mjs");
const context = laboratory.describeQueryContext({ seatKey: "player1" });
assert(context.queryContracts.mission_marker_control);
const planned = await laboratory.queryScene({ queryId: "full-control", seatKey: "player1",
  queryKind: "mission_marker_control", arguments: {} });
assert.equal(planned.resultStatus, "ok", planned.unknownReason);
assert.equal(planned.queryReceipt.authority.sceneScope.kind, "pregame_reference");
assert.equal(planned.queryReceipt.mayApply, false);
const aggregate = { stateRevision: row.stateRevision, envelope: { state: row.state,
  stateHash: hashStarcraftTmgContract(row.state), matchBinding: row.matchBinding,
  matchBindingHash: row.matchBindingHash } };
const live = createStarcraftTmgSceneQueryServiceV1({ seatKey: "player1", rulesRuntime,
  roomStore: { loadRoom: async () => aggregate } });
const legal = rulesRuntime.enumerate(row.state, { sideKey: "player1", includeDisabled: false });
const liveInput = { roomProjection: { room: { roomId: row.roomId, stateRevision: row.stateRevision,
  stateHash: aggregate.envelope.stateHash }, matchBinding: { bindingHash: row.matchBindingHash },
  viewer: { seatKey: "player1", visibilityScope: "seat" }, state: row.state },
  legalSpace: { ...legal, roomId: row.roomId, stateRevision: row.stateRevision,
    stateHash: aggregate.envelope.stateHash, matchBindingHash: row.matchBindingHash,
    legalSpaceHash: hashStarcraftTmgContract(legal) } };
const actual = await live.query({ ...liveInput, request: { queryKind: "mission_marker_control", arguments: {} } });
assert.equal(actual.authority.sceneScope.kind, "live_room");
assert.deepEqual(planned.queryReceipt.result.markerResults, actual.result.markerResults);
const mapPlan = await laboratory.queryScene({ queryId: "frozen-map", seatKey: "player1",
  queryKind: "map.inspect", arguments: {} });
const mapLive = await live.query({ ...liveInput, request: { queryKind: "map.inspect", arguments: {} } });
assert.equal(mapPlan.queryReceipt.status, mapLive.status);
assert.deepEqual(mapPlan.queryReceipt.result, mapLive.result);
assert.equal(JSON.stringify(row.state), before);
console.log(JSON.stringify({ check: "same-native-control-and-map-facts-live-and-pregame", ok: true,
  providerCalls: 0, roomWrites: 0, trainingTruth: false }));

const movement = JSON.parse(await readFile(process.argv[4], "utf8"));
const nativeRules = { enumerate: enumerateOfficialSelectedRosterSpatialActionsV1,
  instantiate: instantiateOfficialSelectedRosterSpatialActionV1, apply() { throw new Error("query must not execute a room"); },
  descriptor: { runtimeHash: "a".repeat(64) } };
const movingLab = createPregameSceneLaboratoryV1({ sourceState: movement.state,
  rulesRuntime: nativeRules, armyBuilderPort: createOfficialArmyBuilderQueryPortV1({
    unitCompositionUpgradeDataBundle: createOfficialUnitCompositionUpgradeDataBundleV1({ dataset: source.dataset }) }) });
const domains = movingLab.describeQueryContext({ seatKey: "player2" }).actionSpace.parameterDomains;
const domain = domains.find(x => x.pieceId === "player2-hydralisk" && x.actionType === "move");
assert(domain);
const leading = domain.constraints.modelProfiles[0];
const parameters = { leadingModelId: leading.modelId,
  path: [{ xMilliInches: leading.startPoint.xMilliInches + 50,
    yMilliInches: leading.startPoint.yMilliInches }], placements: [] };
const pathReceipt = await movingLab.queryScene({ queryId: "same-executed-path-validator",
  seatKey: "player2", queryKind: "legal_full_path_movement", arguments: { domainId: domain.domainId, parameters } });
assert.equal(pathReceipt.queryReceipt.status, "exact", pathReceipt.unknownReason);
const nativeDomain = nativeRules.enumerate(movement.state, { sideKey: "player2" }).parameterDomains
  .find(x => x.domainId === domain.domainId);
const nativeAction = nativeRules.instantiate(movement.state, nativeDomain, parameters).action;
assert.equal(pathReceipt.queryReceipt.result.actionHash, hashStarcraftTmgContract(nativeAction));
assert.equal(pathReceipt.queryReceipt.result.pathQualification.completeNativePathChecked, true);
console.log(JSON.stringify({ check: "pregame-path-preparation-is-the-native-execution-preparation", ok: true }));

// These consumers changed from sync to async. Import their real wiring here
// once, as part of this same regression; never rerun old schema/build suites.
await import("../packages/roster-strategist/roster-strategist-runtime-v1.mjs");
await import("../packages/roster-strategist/iterative-roster-flash-model-port-v1.mjs");
await import("../packages/product-composition/roster-planning-product-module-v1.mjs");
await import("./support/ticket20-human-agent-demo-fixture-v1.mjs");
console.log(JSON.stringify({ check: "changed-product-consumers-and-generation-contracts-load", ok: true }));
