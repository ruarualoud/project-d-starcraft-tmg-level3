#!/usr/bin/env node

// Focused zero-Provider regression for the concrete mapless-v5 failure:
// a map hash alone must not promote a plan, while a selected certified map
// must reach the planning server and provide a roster/base route receipt.
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createPregameMapEvidencePortV1, evaluatePregameMapReadinessV1 } from
  "../packages/roster-strategist/pregame-map-evidence-port-v1.mjs";
import { createRosterTeachEvidencePortV1 } from
  "../packages/roster-strategist/roster-teach-evidence-port-v1.mjs";
import {
  PREGAME_LAB_DESCRIPTOR_SCHEMA,
  PREGAME_SCENE_LABORATORY_VERSION,
} from "../packages/roster-strategist/pregame-scene-laboratory-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createRosterWorkspaceServerV1 } from
  "./serve-ticket-27-slice-271-roster-workspace-v1.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const capturedSemanticArgument = process.argv.find((argument) =>
  argument.startsWith("--captured-semantic-map="));
if (capturedSemanticArgument) {
  // Only the actual Daybreak schema-dispatch bug. Do not rerun the already
  // passed legacy map/server/Teach gate or create/delete another Room.
  const captured = JSON.parse(await readFile(path.resolve(
    capturedSemanticArgument.slice("--captured-semantic-map=".length)), "utf8"));
  assert.equal(captured.schema, "ticket27_captured_semantic_map_port_failure_v1");
  const before = hashStarcraftTmgContract(captured.sourceState);
  const port = createPregameMapEvidencePortV1(captured);
  const summary = port.summarizeMap({ queryId: "captured-semantic-summary" });
  const route = port.evaluateRosterRoute({ queryId: "captured-semantic-roster",
    sideId: "player1", candidateInput: captured.candidateInput });
  assert.equal(summary.resultStatus, "certified_map_summary");
  assert.equal(summary.mapBinding.seedId, captured.expected.seedId);
  assert.equal(summary.terrain.length, captured.expected.terrainCount);
  assert.equal(summary.missionMarkers.length, captured.expected.missionMarkerCount);
  assert.equal(route.resultStatus, "certified_base_clearance_audit");
  assert.equal(route.units.length, captured.candidateInput.units.length);
  assert.equal(route.unresolvedUnits.length, 0);
  assert.equal(route.exactMoveOrDeploymentLegality, false);
  assert.equal(summary.entryAndTaskReachabilityCertified, false);
  assert.equal(summary.reachabilityCertification.everySideEnterableByAtLeastOneCurrentBase,
    true);
  assert.equal(summary.reachabilityCertification.everyMarkerAndQuarterReachableByAtLeastOneCurrentBase,
    true);
  assert.equal(summary.reachabilityCertification.strictUniversalConnectivityForEveryCurrentBase,
    false);
  assert.equal(evaluatePregameMapReadinessV1({ mapSummary: summary,
    candidateMapAccess: [{ candidateId: "captured-roster", receipt: route }],
    selectedCandidateId: "captured-roster" }).status, "certified_route_evidence");
  const corrupted = structuredClone(captured.sourceState);
  corrupted.officialCompetitiveMapRoomFreeze.setupPlanHash = "0".repeat(64);
  assert.throws(() => createPregameMapEvidencePortV1({ sourceState: corrupted }),
    /SEMANTIC_ROOM_FREEZE_INVALID/);
  assert.equal(hashStarcraftTmgContract(captured.sourceState), before);
  process.stdout.write(JSON.stringify({ ok: true, capturedSemanticOnly: true,
    selectedMapSeedId: summary.mapBinding.seedId,
    terrainCount: summary.terrain.length, markerCount: summary.missionMarkers.length,
    rosterUnitCount: route.units.length, auditedBaseCount: route.accessByBase.length,
    strictUniversalConnectivityRequired: false, corruptedFreezeRejected: true,
    sourceMutation: false, providerCalls: 0, roomCreated: false }) + "\n");
  process.exit(0);
}
const fixtureRoot = path.resolve(process.argv[2] || root);
const buildRoot = path.join(root, "build");
await mkdir(buildRoot, { recursive: true });
const dataDirectory = await mkdtemp(path.join(buildRoot,
  "ticket-27-slice-272-map-evidence-test-"));
let server;
try {
  assert.equal(evaluatePregameMapReadinessV1({
    mapSummary: null, candidateMapAccess: [],
    selectedCandidateId: "candidate-1",
  }).status, "draft_map_evidence_missing");

  server = await createRosterWorkspaceServerV1({
    root, fixtureRoot, dataDirectory, deliberationFactory: null,
    mapConfiguration: { seedId: "sc1_lost_temple_v1",
      elementSelections: [], passageSelections: [] },
  });
  const descriptor = server.module.descriptor();
  assert.equal(descriptor.mapEvidenceStatus, "certified_map_bound");
  assert.equal(descriptor.mapEvidenceBinding.seedId, "sc1_lost_temple_v1");
  const mapSummary = server.module.mapEvidencePort.summarizeMap({
    queryId: "map-regression-summary" });
  assert.equal(mapSummary.resultStatus, "certified_map_summary");
  const candidateInput = { sideKey: "player1", units: [{
    unitInstanceId: "player1-marine-1", recordKey: "army_units:marine",
    compositionKind: "large",
  }] };
  const route = server.module.mapEvidencePort.evaluateRosterRoute({
    queryId: "map-regression-route", sideId: "player1", candidateInput,
  });
  assert.equal(route.resultStatus, "certified_base_clearance_audit");
  assert.ok(route.accessByBase.length > 0);
  const ready = evaluatePregameMapReadinessV1({
    mapSummary,
    candidateMapAccess: [{ candidateId: "candidate-1", receipt: route }],
    selectedCandidateId: "candidate-1",
  });
  assert.equal(ready.status, "certified_route_evidence");
  assert.equal(ready.roomFreezeHash,
    descriptor.mapEvidenceBinding.roomFreezeHash);
  const sourceStateHash = mapSummary.mapBinding.sourceStateHash;
  const labDescriptorBody = {
    schema: PREGAME_LAB_DESCRIPTOR_SCHEMA,
    laboratoryId: "map-route-teach-integration-probe",
    version: PREGAME_SCENE_LABORATORY_VERSION,
    sourceStateHash,
    builderBundleHash: "0".repeat(64),
    readOnly: true, mutatesRoomState: false,
    mutatesBuilderState: false, mutatesSourceData: false,
    reimplementsRules: false, resultsBoundToSourceState: true,
    unknownStaysUnknown: true, hostPreferenceWeightsApplied: false,
    sameStateABComparisonSupported: true,
    scenarioBranchesOperateOnClonesOnly: true,
    hypotheticalPlacementsAreAdvisoryNotRulesLegality: true,
    providerCalls: 0, trainingTruth: false,
  };
  const unsupportedQuery = () => {
    throw new Error("UNEXPECTED_NON_MAP_TEACH_QUERY");
  };
  const teachEvidencePort = createRosterTeachEvidencePortV1({
    labDescriptor: () => ({ ...labDescriptorBody,
      descriptorHash: hashStarcraftTmgContract(labDescriptorBody) }),
    proveMutationZero: () => ({ sourceStateMutationCount: 0,
      sourceStateHashUnchanged: true,
      builderBundleHashUnchanged: true,
      rulesRuntimeHashUnchanged: true }),
    queryProbability: unsupportedQuery,
    querySpatial: unsupportedQuery,
    queryMath: unsupportedQuery,
    queryThreatExchange: unsupportedQuery,
    runScenarioBranch: unsupportedQuery,
    routeToObjective: (query) =>
      server.module.mapEvidencePort.routeToObjective(query),
  });
  const teachRequest = { challengeId: "map-route-1",
    request: { kind: "map_route", toolRequest: {
      sideId: "player1", baseId: route.accessByBase[0].baseId,
      targetId: mapSummary.missionMarkers[0].targetId } },
    initialFoundationHash: sourceStateHash,
    sourceHashes: [mapSummary.receiptHash], mutationAuthority: false };
  const teachRoute = teachEvidencePort.query(teachRequest);
  assert.equal(teachRoute.status, "advisory");
  assert.equal(teachRoute.sourceReceipt.resultStatus,
    "certified_reachability_audit");
  assert.equal(teachRoute.sourceReceipt.mapBinding.roomFreezeHash,
    ready.roomFreezeHash);
  assert.equal(teachRoute.sourceReceipt.exactMoveOrDeploymentLegality, false);
  assert.equal(teachEvidencePort.query({ ...teachRequest,
    request: { ...teachRequest.request,
      toolRequest: { ...teachRequest.request.toolRequest,
        targetId: "missing-target" } } }).status, "unknown");
  assert.equal(evaluatePregameMapReadinessV1({
    mapSummary,
    candidateMapAccess: [{ candidateId: "candidate-1", receipt: {
      ...route, resultStatus: "unknown", unknownReason: "route_unavailable",
    } }],
    selectedCandidateId: "candidate-1",
  }).status, "draft_map_evidence_missing");
  process.stdout.write(JSON.stringify({ ok: true, providerCalls: 0,
    selectedMapSeedId: descriptor.mapEvidenceBinding.seedId,
    terrainCount: mapSummary.terrain.length,
    markerCount: mapSummary.missionMarkers.length,
    baseCount: mapSummary.baseProfileIds.length,
    selectedRouteStatus: route.resultStatus,
    teachMapRouteStatus: teachRoute.status,
    maplessPlanStatus: "draft_map_evidence_missing" }) + "\n");
} finally {
  await server?.close();
  await rm(dataDirectory, { recursive: true, force: true });
}
