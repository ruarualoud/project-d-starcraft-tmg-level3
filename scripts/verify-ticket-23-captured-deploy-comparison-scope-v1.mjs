import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { inspectStarcraftTmgFormationThreatClaimsV1 } from
  "../packages/online-agent-session/live-flash-decision-port-v1.mjs";
const [capturePath, outputPath] = process.argv.slice(2);
const actual = JSON.parse(await readFile(capturePath, "utf8"));
const original = JSON.stringify(actual);
const raw = actual.attempts.flatMap(a => a.output?.providerTurn?.toolCalls || [])
  .filter(t => t.name === "submit_planning").at(-1).arguments;
const input = { raw, queryReceipts: actual.queryReceipts,
  spatialObservation: { units: actual.queryReceipts[0].result.nodes.units
    .map(u => ({ ...u, unitId: u.nodeId })) },
  plannerSelectedAction: { actionType: "deploy", pieceId: "player2-kerrigan-raptor" } };
const result = inspectStarcraftTmgFormationThreatClaimsV1(input);
assert.equal(result.contradicted, false,
  "the full paid future deployment comparison must not be contradicted by current other-unit positions");
assert(result.advisoryFindings.some(x =>
  x.field === "candidateComparisons[0].evaluation"
    && x.reasonCode === "unverified_prospective_position_claim"));
const bad = structuredClone(raw);
bad.candidateComparisons[0].evaluation +=
  " player2-kerrigan is outside every enemy stationary fire band.";
assert.equal(inspectStarcraftTmgFormationThreatClaimsV1({ ...input, raw: bad })
  .contradicted, true, "separate actual-position assertions still block");
assert.equal(JSON.stringify(actual), original);
const report = { passed: true, actualFullPaidReplyUsed: true,
  futureSelectedCandidateComparisonBound: true,
  unsupportedSafetyRetainedAsAdvisory: true, separateCurrentContradictionStillBlocks: true,
  providerCalls: 0, roomWrites: 0, trainingTruth: false,
  scope: "captured_A20_planning_threat_scope_not_final_placement_legality" };
await writeFile(outputPath, JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
console.log(JSON.stringify(report));
