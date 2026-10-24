import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { inspectStarcraftTmgFormationThreatClaimsV1 } from
  "../packages/online-agent-session/live-flash-decision-port-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/transition-v1.mjs";

const [capturePath, reportPath] = process.argv.slice(2);
const capture = JSON.parse(await readFile(capturePath, "utf8"));
const beforeHash = hashStarcraftTmgContract(capture);
const inspect = plannerSelectedAction =>
  inspectStarcraftTmgFormationThreatClaimsV1({
    raw: capture.latestPaid.planning,
    queryReceipts: capture.queryReceipts,
    spatialObservation: capture.spatialObservation,
    plannerSelectedAction,
  });
const current = inspect(capture.selectedAction);
await writeFile(reportPath, JSON.stringify({
  schemaVersion: "captured_plan_advisory_scope_regression_v1",
  stateRevision: capture.stateRevision,
  originalPaidOutputHash: capture.latestPaid.outputHash,
  selectedUnitId: capture.selectedAction.pieceId,
  blocked: current.contradicted,
  contradictions: current.contradictions,
  advisories: current.advisoryFindings || [],
  providerCalls: 0, roomMutations: 0,
}, null, 2) + "\n");
assert.equal(current.contradicted, false,
  "Hydralisk's bad future-plan description must not block the current Raptor Move");
assert(current.advisoryFindings.length > 0);
assert(current.advisoryFindings.every(finding =>
  finding.severity === "Medium" && finding.blocksApply === false
  && finding.threatFacts.every(fact => fact.targetId === "player2-hydralisk")));
// The same false claim is still actionable if Hydralisk is the actual actor.
const hydraliskMove = { ...capture.selectedAction,
  pieceId: "player2-hydralisk" };
assert.equal(inspect(hydraliskMove).contradicted, true);
// Other operations and all callers without a selected Move remain strict.
assert.equal(inspect({ ...capture.selectedAction,
  actionType: "ranged_attack" }).contradicted, true);
assert.equal(inspect(undefined).contradicted, true);
assert.equal(hashStarcraftTmgContract(capture), beforeHash);
await writeFile(reportPath, JSON.stringify({
  schemaVersion: "captured_plan_advisory_scope_regression_v1",
  status: "passed", stateRevision: capture.stateRevision,
  originalPaidOutputHash: capture.latestPaid.outputHash,
  nonselectedMistakeRetainedAsMedium: true,
  selectedActorAndOtherOperationsStillStrict: true,
  originalPaidCaptureUnchanged: true,
  providerCalls: 0, roomMutations: 0,
}, null, 2) + "\n");
console.log(JSON.stringify({ passed: true, stateRevision: capture.stateRevision }));
