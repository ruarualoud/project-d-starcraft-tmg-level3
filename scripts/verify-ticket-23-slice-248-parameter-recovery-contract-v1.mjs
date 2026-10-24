import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1 } from
  "../packages/online-agent-session/room-backed-spatial-rules-query-adapter-v1.mjs";
import { projectStarcraftTmgSpatialParameterDomainsV1 } from
  "../packages/online-agent-session/spatial-action-query-runtime-v1.mjs";
import { projectStarcraftTmgPlanningActionSpaceForPromptV1,
  projectStarcraftTmgSubmittedActionV1 } from
  "../packages/online-agent-session/live-flash-decision-port-v1.mjs";

// Specific captured r81 bug. No original Room/SQLite writes, Provider, map
// construction or already-passed regression gates are run by this command.
const args = Object.fromEntries(process.argv.slice(2).map(arg => {
  const at = arg.indexOf("=");
  return [arg.slice(2, at), arg.slice(at + 1)];
}));
const capture = JSON.parse(await readFile(args.capture, "utf8"));
const domain = structuredClone(capture.currentAdvertisedDomain.action);
if (args["projection-identity-only"] === "true") {
  try {
    assert.deepEqual(projectStarcraftTmgSpatialParameterDomainsV1({
      parameterDomains: [domain],
    })[0], domain, "new submission metadata must not change the retained current Rules-domain projection identity");
    await writeFile(args.report, JSON.stringify({ ok: true,
      originalDomainProjectionUnchanged: true, providerCalls: 0,
      roomMutations: 0, trainingTruth: false }, null, 2), { mode: 0o600 });
    console.log("R81_DOMAIN_PROJECTION_IDENTITY_OK");
  } catch (error) {
    await writeFile(args.report, JSON.stringify({ ok: false, failure: error.message,
      providerCalls: 0, roomMutations: 0, trainingTruth: false }, null, 2), { mode: 0o600 });
    throw error;
  }
  process.exit(0);
}
const originalBytes = JSON.stringify(capture);
const authority = { roomId: capture.roomId, seatKey: domain.sideKey,
  stateRevision: capture.stateRevision, stateHash: capture.stateHash,
  matchBindingHash: "b".repeat(64), legalSpaceHash: "c".repeat(64) };
let instantiateCalls = 0;
const adapter = createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1({
  seatKey: domain.sideKey,
  roomStore: { async loadRoom() { return {
    stateRevision: authority.stateRevision,
    envelope: { stateHash: authority.stateHash,
      matchBindingHash: authority.matchBindingHash, matchBinding: {}, state: {} },
  }; } },
  rulesRuntime: { instantiate(_state, _domain, parameters) {
    instantiateCalls += 1;
    if (!domain.parameterSchema.targetUnitId.enum.includes(parameters.targetUnitId)) {
      throw new Error("BATTLEFIELD_ASSET_ORDER_CHOICE_INVALID");
    }
    // Positive witness is a transport stub, not a newly certified real action.
    return { canonicalParameters: structuredClone(parameters),
      action: { actionType: domain.actionType, sideKey: domain.sideKey } };
  } },
});
const receipts = [];
const checks = [];
try {
  for (const attempt of capture.failedSameIntentAttempts) {
    const parameters = JSON.parse(attempt.selection.parametersJson);
    const receipt = await adapter.query({ authority,
      queryKind: "instantiate_parameterized_action", arguments: {
        domainId: domain.domainId, currentLegalSpaceDomain: domain, parameters,
      } });
    receipts.push(receipt);
    assert.equal(receipt.precision, "unknown");
    assert.ok(receipt.repairContext?.fieldIssues?.some(issue =>
      issue.fieldPath === "parameters.targetUnitId"
      && issue.allowedValues.includes("player1-marine-1")),
    "captured r81 must return target-specific admissible values, not geometry-only feedback");
    assert.ok(receipt.repairContext.fieldIssues.some(issue =>
      issue.fieldPath === "parameters.choice" && issue.code === "choice_unavailable"));
  }
  assert.equal(instantiateCalls, 0, "advertised contract violations need no expensive Rules call");
  checks.push("three_original_failures_have_actionable_field_feedback");
  const module = await import(
    "../packages/online-agent-session/action-parameter-contract-v1.mjs");
  const compiled = module.compileStarcraftTmgActionParameterContractV1(domain);
  assert.deepEqual(compiled.selectableChoices,
    ["critical_hit_2", "ignore_disengage_penalty"]);
  assert.deepEqual(compiled.unavailableChoices, ["remove_activation_marker"]);
  assert.equal(compiled.finiteOptions.length, 4);
  assert.equal(compiled.fullyEnumerated, true);
  assert.ok(compiled.finiteOptions.every(option =>
    option.parameters.targetUnitId !== "player1-marine-3"
    && option.parameters.choice !== "remove_activation_marker"));
  const projected = projectStarcraftTmgSpatialParameterDomainsV1({ parameterDomains: [domain] });
  assert.deepEqual(projected[0].parameterSchema, domain.parameterSchema);
  assert.equal(Object.hasOwn(projected[0], "parameterContract"), false,
    "submission metadata belongs in the prompt/tool seam, not the sealed Rules projection");
  const planning = projectStarcraftTmgPlanningActionSpaceForPromptV1({ parameterDomains: projected });
  assert.deepEqual(planning.parameterDomains[0].parameterContract.selectableChoices,
    compiled.selectableChoices);
  checks.push("model_and_submission_share_current_domain_without_mutating_rules_identity");
  const option = compiled.finiteOptions[0];
  const submitted = projectStarcraftTmgSubmittedActionV1({ candidateId: domain.domainId,
    selection: { kind: "parameter_option", optionId: option.parameterOptionId,
      parametersJson: "{}" } }, { spatialActionSpace: { parameterDomains: projected } },
  { plannerResult: { recommendedCandidateId: domain.domainId } });
  assert.deepEqual(submitted.proposal.parameters, option.parameters);
  const positive = await adapter.query({ authority,
    queryKind: "instantiate_parameterized_action", arguments: {
      domainId: domain.domainId, currentLegalSpaceDomain: domain,
      parameters: submitted.proposal.parameters,
    } });
  assert.equal(positive.precision, "exact");
  assert.equal(instantiateCalls, 1, "materialized options still require Rules instantiation");
  assert.throws(() => projectStarcraftTmgSubmittedActionV1({ candidateId: domain.domainId,
    selection: { kind: "parameter_option", optionId: "foreign-or-stale-option",
      parametersJson: "{}" } }, { spatialActionSpace: { parameterDomains: projected } },
  { plannerResult: { recommendedCandidateId: domain.domainId } }),
  /ACTION_PARAMETER_OPTION_INVALID/u);
  checks.push("option_selection_is_model_owned_and_still_rules_checked");
  const free = structuredClone(domain);
  free.parameterSchema.paymentCardInstanceIdsByChoice.remove_activation_marker = [[]];
  assert.equal(module.compileStarcraftTmgActionParameterContractV1(free).finiteOptions.length, 6);
  const continuous = structuredClone(domain);
  continuous.parameterSchema.required.push("coordinate");
  continuous.parameterSchema.coordinate = { type: "world_point_milli_inches" };
  const continuousCompiled = module.compileStarcraftTmgActionParameterContractV1(continuous);
  assert.equal(continuousCompiled.fullyEnumerated, false);
  assert.deepEqual(continuousCompiled.finiteOptions, []);
  assert.equal(module.inspectStarcraftTmgActionParametersV1(continuous,
    { ...option.parameters, coordinate: { xMilliInches: 12345, yMilliInches: 10000 } }).valid, true);
  checks.push("no_payment_options_differ_from_free_payment_and_coordinates_remain_continuous");
  const current = { plannerResult: { recommendedCandidateId: domain.domainId,
    plan: { objective: "original goal must not be erased" } }, stage: "action",
  queryReceipts: [], providerContinuationMessages: [], processedAttemptKeys: [],
  warnings: [], attempts: { paid: { safeOutput: { original: true } } },
  semanticCorrectionRounds: 1, proposalValidationRounds: 0 };
  for (const [index, receipt] of receipts.entries()) {
    const recovery = module.planStarcraftTmgParameterFailureRecoveryV1({
      domain, parameters: JSON.parse(capture.failedSameIntentAttempts[index].selection.parametersJson),
      receipt, history: current.parameterRecoveryHistory || [], maximumRounds: 3,
    });
    assert.equal(recovery.action, index < 2 ? "replan" : "needs_attention");
    module.applyStarcraftTmgParameterFailureRecoveryV1(current, recovery,
      { attemptKey: "paid", recordedAt: "2026-10-08T00:00:00.000Z" });
  }
  assert.equal(current.parameterRecoveryHistory.length, 3);
  assert.equal(new Set(current.parameterRecoveryHistory.map(row => row.failureSignature)).size, 1);
  assert.equal(current.proposalValidationRounds, 3);
  assert.equal(current.semanticCorrectionRounds, 1);
  assert.equal(current.status, "provider_output_invalid");
  assert.equal(current.failedPlannerResults[0].plannerResult.plan.objective,
    "original goal must not be erased");
  assert.deepEqual(current.attempts.paid.safeOutput, { original: true });
  assert.ok(current.providerContinuationMessages.some(message =>
    message.role === "user" && message.content.includes("player1-marine-1")));
  checks.push("replan_preserves_history_and_same_root_three_round_limit_without_pass");
  const failedAuthority = { ...receipts[0], findingSeverity: "High",
    reason: "RULES_QUERY_AUTHORITY_STALE", repairContext: null };
  assert.equal(module.planStarcraftTmgParameterFailureRecoveryV1({ domain,
    parameters: option.parameters, receipt: failedAuthority }).action, "needs_attention");
  checks.push("authority_damage_is_not_reclassified_as_parameter_repair");
  assert.equal(JSON.stringify(capture), originalBytes);
  await writeFile(args.report, JSON.stringify({ ok: true, checks,
    originalRevision: capture.stateRevision, providerCalls: 0, roomMutations: 0,
    realRulesExecutionClaimed: false, trainingTruth: false }, null, 2), { mode: 0o600 });
  console.log("R81_PARAMETER_RECOVERY_CONTRACT_OK", JSON.stringify(checks));
} catch (error) {
  await writeFile(args.report, JSON.stringify({ ok: false, checks,
    failure: error.message, providerCalls: 0, roomMutations: 0,
    trainingTruth: false }, null, 2), { mode: 0o600 });
  throw error;
}
