import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1 } from
  "../packages/online-agent-session/room-backed-spatial-rules-query-adapter-v1.mjs";
import { planStarcraftTmgParameterFailureRecoveryV1 } from
  "../packages/online-agent-session/action-parameter-contract-v1.mjs";

// Concrete compatibility regression in the new recovery classifier: a
// captured r69 deployment parameter's existing geometry feedback was changed
// to needs_attention on the first failure. No full search/old gate is rerun.
const args = Object.fromEntries(process.argv.slice(2).map(arg => {
  const at = arg.indexOf("="); return [arg.slice(2, at), arg.slice(at + 1)];
}));
const capture = JSON.parse(await readFile(args.capture, "utf8"));
const diagnostic = JSON.parse(await readFile(args.diagnostic, "utf8"));
const firstFailure = diagnostic.stages.find(row => row.stage === "rules_instantiation_failed");
assert.notEqual(firstFailure.failureCode, "DIAGNOSTIC_CAPTURE_ONLY_NOT_A_RULES_VERDICT");
const authority = capture.authority;
const domain = capture.domain;
const parameters = capture.parameters[0];
const adapter = createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1({
  seatKey: domain.sideKey,
  roomStore: { async loadRoom() { return { stateRevision: authority.stateRevision,
    envelope: { stateHash: authority.stateHash, matchBindingHash: authority.matchBindingHash,
      matchBinding: {}, state: capture.state } }; } },
  // Re-deliver the already observed rule code at the adapter seam, not a new
  // Rules certification or a repeated expensive source-state reconstruction.
  rulesRuntime: { instantiate() { throw new Error(firstFailure.failureCode); } },
});
try {
  const receipt = await adapter.query({ authority, queryKind: "instantiate_parameterized_action",
    arguments: { domainId: domain.domainId, currentLegalSpaceDomain: domain, parameters } });
  assert.equal(receipt.precision, "unknown");
  assert.equal(receipt.reason, firstFailure.failureCode);
  const first = planStarcraftTmgParameterFailureRecoveryV1({ domain, parameters, receipt });
  assert.equal(first.action, "repair_same_choice",
    "current geometry repair evidence must not be treated as unknown implementation failure");
  assert.equal(first.kind, "rules_geometry_rejected");
  assert.equal(first.feedback.geometryRepairContext.leadingModelId, parameters.leadingModelId);
  const second = planStarcraftTmgParameterFailureRecoveryV1({ domain, parameters, receipt,
    history: [first] });
  assert.equal(second.action, "replan");
  const third = planStarcraftTmgParameterFailureRecoveryV1({ domain, parameters, receipt,
    history: [first, second] });
  assert.equal(third.action, "needs_attention");
  const implementation = planStarcraftTmgParameterFailureRecoveryV1({ domain, parameters,
    receipt: { ...receipt, reason: "RULES_QUERY_IMPLEMENTATION_TYPE_ERROR",
      safeFailureClass: "type_error" } });
  assert.equal(implementation.action, "needs_attention");
  await writeFile(args.report, JSON.stringify({ ok: true,
    originalRuleFailureCode: firstFailure.failureCode,
    recoveryActions: [first.action, second.action, third.action],
    providerCalls: 0, roomMutations: 0, originalSearchRerun: false,
    newRulesVerdictClaimed: false, trainingTruth: false }, null, 2), { mode: 0o600 });
  console.log("CAPTURED_GEOMETRY_RECOVERY_COMPATIBILITY_OK");
} catch (error) {
  await writeFile(args.report, JSON.stringify({ ok: false, failure: error.message,
    providerCalls: 0, roomMutations: 0, trainingTruth: false }, null, 2), { mode: 0o600 });
  throw error;
}
