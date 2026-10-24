#!/usr/bin/env node

// Concrete paid-review regression: round-2 Medic pool Supply, marker
// coordinates and projected VP rows existed in verified receipts but were
// absent or ambiguously labelled in the V3 reviewer fact projection.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { reviewRosterFinalPlanV3, buildRosterFinalPlanVerifiedFactsV1 } from
  "../packages/roster-strategist/roster-final-plan-review-v1.mjs";

const capturedArgument = process.argv.find((value) =>
  value.startsWith("--captured-locked-plan="));
const revisionWorkspaceArgument = process.argv.find(value =>
  value.startsWith("--captured-revision-workspace="));
if (revisionWorkspaceArgument) {
  const { mkdir, mkdtemp, writeFile } = await import("node:fs/promises");
  const { createRosterPlanningProductModuleV1 } = await import(
    "../packages/product-composition/roster-planning-product-module-v1.mjs");
  const capture = JSON.parse(await readFile(revisionWorkspaceArgument.slice(
    "--captured-revision-workspace=".length), "utf8"));
  const root = path.resolve(import.meta.dirname, "..");
  const reportArgument = process.argv.find(value => value.startsWith("--report="));
  const reportPath = reportArgument.slice("--report=".length);
  const temp = await mkdtemp(path.join(root, "build/s272-revision-fact-bug-"));
  await mkdir(path.join(temp, "drafts"));
  for (const session of capture.sessions) {
    await writeFile(path.join(temp, "drafts", `${session.sessionId}.json`),
      JSON.stringify(session), { mode: 0o600 });
  }
  const requests = [];
  const module = await createRosterPlanningProductModuleV1({ root,
    fixtureRoot: capture.fixtureRoot || root, dataDirectory: temp,
    mapConfiguration: capture.mapConfiguration,
    deliberationFactory: {
      descriptor: () => ({ available: true, paidProvider: false,
        modelVersion: "captured-request-only" }),
      async createForRun() {
        return { descriptor: () => ({ available: true }),
          async deliberate(request) {
            requests.push(request);
            throw new Error("CAPTURED_BEFORE_PROVIDER_SEND");
          } };
      },
    },
  });
  for (const session of capture.sessions) {
    await module.service.revisePlan(session.sessionId, {
      reasonText: "Source contract repair; retain roster and schedule.",
      revisedSectionKeys: ["scoreRoute", "deploymentConcept", "componentPurposes",
        "publicSummaryText"], fresh: true,
    });
    for (let i = 0; i < 1000; i += 1) {
      if (module.service.readSession(session.sessionId).status !== "running") break;
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    assert.equal(module.service.readSession(session.sessionId).failure?.detail,
      "CAPTURED_BEFORE_PROVIDER_SEND", "reach the real revision deliberation boundary");
  }
  const projected = requests.map((request, index) => ({
    sessionId: capture.sessions[index].sessionId,
    nodeTypes: request.promptNodes.map(node => node.nodeType),
    facts: request.promptNodes.find(node => node.nodeType === "verified-plan-facts")
      ?.content?.sourceFacts ?? null,
  }));
  await writeFile(reportPath, JSON.stringify({
    schemaVersion: "captured_revision_fact_wiring_v1", projected,
    providerCalls: 0, originalWorkspaceWrites: 0, roomMutations: 0,
  }, null, 2) + "\n");
  assert.equal(requests.length, 2);
  for (const row of projected) {
    assert(row.facts, "ordinary fixed/fresh revision must receive the shared verified facts");
    assert.equal(row.facts.selectedMapRouteEvidence.status, "certified_base_clearance_audit");
    assert.equal(row.facts.missionMarkerScoringArithmetic.specialLeadWinCondition
      .scoreBasis, "own_cumulative_vp_minus_opponent_cumulative_vp");
    assert.equal(row.facts.missionMarkerScoringArithmetic.specialLeadWinCondition
      .terminalFromOwnScoreAlone, "unknown");
    assert(row.facts.selectedMapRouteEvidence.units.some(unit =>
      unit.objectiveAccess.some(target => target.reachable === null
        && target.unreachabilityProven === false)));
  }
  await writeFile(reportPath, JSON.stringify({
    schemaVersion: "captured_revision_fact_wiring_v1", status: "passed",
    bothActualRevisionPromptsBound: true, mapMissingWitnessRemainsUnknown: true,
    relativeVictoryFormulaPresent: true, providerCalls: 0,
    originalWorkspaceWrites: 0, roomMutations: 0,
  }, null, 2) + "\n");
  console.log(JSON.stringify({ passed: true, revisionRequests: requests.length,
    providerCalls: 0, originalWorkspaceWrites: 0, roomMutations: 0 }));
  process.exit(0);
}
if (capturedArgument) {
  const capture = JSON.parse(await readFile(capturedArgument.slice(
    "--captured-locked-plan=".length), "utf8"));
  const input = { plan: JSON.parse(capture.planSerialized),
    toolReceipts: capture.toolReceipts,
    selectedCandidateInputHash: hashStarcraftTmgContract(
      capture.selectedCandidateInput) };
  assert.equal(input.plan.openingDeploymentSchedule, undefined);
  const facts = buildRosterFinalPlanVerifiedFactsV1(input).sourceFacts;
  assert.equal(facts.missionMarkerScoringArithmetic.status,
    "source_bound_arithmetic_only",
    "a locked-roster plan must not lose its existing mission receipt");
  assert.equal(facts.missionMarkerScoringArithmetic.receiptHash,
    capture.expectedMissionReceiptHash);
  assert.deepEqual(facts.missionMarkerScoringArithmetic.markers.map(
    (marker) => marker.vpIfControlledBySide), [1, 2, 1, 2, 1]);
  assert.equal(facts.missionMarkerScoringArithmetic.markerScoringStartsRound, 2);
  assert.equal(facts.missionMarkerScoringArithmetic.specialLeadWinThreshold, 10);
  assert.equal(facts.missionMarkerScoringArithmetic.provesFeasibleControlOrActualScore,
    false);
  assert.equal(facts.roundSupplySchedule, null);
  assert.ok(facts.rosterUnits.every((unit) => unit.firstArrivalRound === null));
  const bad = structuredClone(input);
  const mission = bad.toolReceipts.find((receipt) =>
    receipt.queryId === "mission-scoring-authority");
  mission.missionScoringProfile.recordKey = "other-mission";
  assert.equal(buildRosterFinalPlanVerifiedFactsV1(bad).sourceFacts
    .missionMarkerScoringArithmetic.status, "unknown");
  const ambiguous = structuredClone(input);
  ambiguous.toolReceipts.push(structuredClone(ambiguous.toolReceipts.find(
    (receipt) => receipt.queryId === "mission-scoring-authority")));
  assert.equal(buildRosterFinalPlanVerifiedFactsV1(ambiguous).sourceFacts
    .missionMarkerScoringArithmetic.status, "unknown");
  console.log(JSON.stringify({ status: "passed", providerCalls: 0,
    roomWrites: 0, preservedMissionReceipt: true,
    missingArrivalScheduleNotInvented: true, wrongOrAmbiguousMissionRejected: true }));
  process.exit(0);
}

const root = path.resolve(import.meta.dirname, "..");
const dir = path.join(root, "build/ticket-27-slice-272-iterative-live-v1");
const [repaired, session] = await Promise.all([
  readFile(path.join(dir,
    "agent-selected-teach-5c6f47fe6a92c230-claim-repair-v2.json"),
  "utf8").then(JSON.parse),
  readFile(path.join(dir,
    "drafts/agent-selected-teach-standard-2000-fresh-c-v1.json"),
  "utf8").then(JSON.parse),
]);
let captured = false;
await assert.rejects(reviewRosterFinalPlanV3({
  plan: repaired.plan,
  sessionId: "ticket27-review-fact-projection-probe",
  toolReceipts: session.toolReceipts,
  selectedCandidateInputHash: hashStarcraftTmgContract(
    session.selectedCandidateInput),
  deliberation: { async deliberate(request) {
    captured = true;
    const facts = request.promptNodes.find((node) =>
      node.kind === "verified-structured-facts").sourceFacts;
    const math = facts.citedMathReceipts.find((entry) =>
      entry.receiptHash.startsWith("2ad9bc07"));
    assert.equal(math?.inputScheduleMatchesCurrentTarget, true);
    assert.deepEqual(math.projectedRows.map((entry) =>
      entry.projectedCumulativeVp), [2, 5, 7, 9]);
    assert.deepEqual(math.missingZeroTargetWindows, ["round:1"]);
    assert.equal(facts.rosterUnitCounts["army_units:marine"], 3);
    assert.deepEqual(facts.roundSupplySchedule.entries.filter((entry) =>
      entry.round === 2).map((entry) => [entry.startingSupply,
      entry.poolSupply]), [[1, 0], [1, 0]]);
    assert.deepEqual(facts.selectedMapRouteEvidence.missionMarkers.find(
      (marker) => marker.targetId === "mission-marker-1").coordinate,
    { xInches: 12, yInches: 24 });
    assert.equal(facts.missionMarkerScoringArithmetic.status,
      "source_bound_arithmetic_only");
    assert.equal(facts.missionMarkerScoringArithmetic.receiptHash,
      "3ae691471e5781e771639c4a3f02ebb7b961cf3b64896293a7c40043e683aa37");
    assert.deepEqual(facts.missionMarkerScoringArithmetic.markers.map(
      (marker) => [marker.number, marker.vpIfControlledBySide]),
    [[1, 1], [2, 2], [3, 1], [4, 2], [5, 1]]);
    assert.equal(facts.missionMarkerScoringArithmetic
      .allControlledVpPerScoringRound, 7);
    assert.deepEqual(facts.missionMarkerScoringArithmetic
      .unconstrainedCumulativeMarkerVpByRound,
    [{ round: 1, vp: 0 }, { round: 2, vp: 7 },
      { round: 3, vp: 14 }, { round: 4, vp: 21 },
      { round: 5, vp: 28 }]);
    assert.equal(facts.missionMarkerScoringArithmetic
      .provesFeasibleControlOrActualScore, false);
    throw new Error("CAPTURE_COMPLETE");
  } },
}), /CAPTURE_COMPLETE/u);
assert.equal(captured, true);
process.stdout.write("Review canonical fact projection: passed\n");
