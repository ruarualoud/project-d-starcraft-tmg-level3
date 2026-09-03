#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { STARCRAFT_TMG_TICKET_15_ONLINE_ROLE_AGENT_BOUNDARY_V1 as boundary } from
  "../content/agent/ticket-15-online-role-agent-boundary-v1.mjs";
import { STARCRAFT_TMG_TICKET_14_CLIENT_HANDOFF_V1 as handoff } from
  "../content/client/ticket-14-client-handoff-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/transition-v1.mjs";
import { listStarcraftTmgModeCapabilities } from
  "../packages/character-agent/mode-capability-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_ROOT = path.join(ROOT, "build/ticket-15-slice-144-online-agent-boundary-v1");
const REPORT_PATH = path.join(REPORT_ROOT, "report.json");

const checks = [];
const failures = [];

async function check(id, operation) {
  try {
    await operation();
    checks.push({ id, passed: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    checks.push({ id, passed: false, error: message });
    failures.push(`${id}: ${message}`);
  }
}

await check("boundary_is_hash_sealed_and_pins_ticket_14_handoff", () => {
  const { boundaryHash, ...body } = boundary;
  assert.equal(boundaryHash, hashStarcraftTmgContract(body));
  assert.equal(boundary.predecessorHandoffHash, handoff.handoffHash);
  assert.equal(handoff.ticket15OnlineAgent.owner, "ticket-15-online-role-agent-session");
});

await check("nine_ordered_slices_cover_backend_web_browser_and_handoff", () => {
  assert.deepEqual(boundary.slices.map((entry) => entry.slice),
    [144, 145, 146, 147, 148, 149, 150, 151, 152]);
  assert.equal(boundary.slices[0].scope, "baseline_boundary_and_migration_audit");
  assert.equal(boundary.slices.at(-1).scope, "real_browser_aggregate_and_ticket_16_handoff");
});

await check("existing_ticket_13_modules_are_present_but_not_relabelled_as_product_runtime", async () => {
  for (const relativePath of boundary.existingImplementationAudit.reusable) {
    assert.equal((await stat(path.join(ROOT, relativePath))).isFile(), true, relativePath);
  }
  assert.equal(boundary.existingImplementationAudit.reusableStatus,
    "ticket_13_contract_and_injected_transport_evidence_only");
  assert.equal(boundary.existingImplementationAudit.migrationPolicy.rewriteExistingCharacterContracts,
    false);
  assert.equal(boundary.existingImplementationAudit.migrationPolicy.silentCompatibilityAllowed,
    false);
});

await check("audit_records_the_actual_v1_byok_memory_and_supervisor_gaps", async () => {
  const [sessionSource, httpSource, battleLabSource] = await Promise.all([
    readFile(path.join(ROOT, "packages/character-agent/session-runtime-v1.mjs"), "utf8"),
    readFile(path.join(ROOT, "packages/character-agent/http-handler-v1.mjs"), "utf8"),
    readFile(path.join(ROOT, "packages/client-domain/battle-lab-observability-v1.mjs"), "utf8"),
  ]);
  assert(sessionSource.includes("const byokCredentials = new Map()"));
  assert(sessionSource.includes("const seatCredentials = new Map()"));
  assert(sessionSource.includes('return rejection("credential_required"'));
  assert(sessionSource.includes('durability: "process_memory_v0"'));
  assert(httpSource.includes("sessions/:sessionId/byok"));
  assert(battleLabSource.includes('status: "not_mounted_ticket_15"'));
  for (const gap of [
    "v1_session_runtime_requires_a_raw_api_key_before_every_invoke",
    "no_server_owned_turn_budget_timeout_cancel_or_single_flight_state",
    "no_client_domain_role_agent_extension",
    "no_real_browser_role_agent_trace",
  ]) assert(boundary.existingImplementationAudit.gaps.includes(gap), gap);
});

await check("four_modes_have_exact_isolated_capability_profiles", () => {
  const capabilities = listStarcraftTmgModeCapabilities();
  assert.deepEqual(capabilities.map((entry) => entry.mode),
    ["tutor", "opponent", "commentator", "companion"]);
  assert.deepEqual(boundary.roles.modes, capabilities.map((entry) => entry.mode));
  assert.deepEqual(boundary.roles.readOnlyModes, ["tutor", "commentator", "companion"]);
  for (const capability of capabilities) {
    assert.equal(capability.mayApply, false);
    assert.equal(capability.maySelectDecision, capability.mode === "opponent");
    assert.equal(capability.mayPreview, capability.mode === "opponent");
    assert.equal(capability.trainingTruth, false);
  }
});

await check("online_supervisor_is_one_deep_module_with_bounded_turn_states", () => {
  assert.equal(boundary.onlineSupervisor.moduleOwner, "packages/online-agent-session");
  assert.deepEqual(boundary.onlineSupervisor.operations, [
    "create_session", "read_session", "send_turn", "cancel_turn",
    "reconnect_session", "end_session", "subscribe_session",
  ]);
  assert.equal(boundary.onlineSupervisor.concurrentTurnsPerSession, 1);
  assert.equal(boundary.onlineSupervisor.interruptedTurnAutomaticallyRetried, false);
  assert.equal(boundary.onlineSupervisor.reconnectMayResumeProviderRequest, false);
  assert.equal(boundary.onlineSupervisor.productionReady, false);
});

await check("provider_gateway_port_is_credential_free_and_ticket_16_owned", () => {
  assert.equal(boundary.providerGateway.owner, "ticket_16_direct_provider_secure_byok");
  assert.deepEqual(boundary.providerGateway.ticket15CredentialInputs, []);
  assert.equal(boundary.providerGateway.noProviderConfiguredStateRequired, true);
  assert.equal(boundary.providerGateway.injectedDeterministicGatewayAllowedForVerification, true);
  assert.equal(boundary.providerGateway.liveProviderClaimAllowed, false);
  assert(!JSON.stringify(boundary.providerGateway.ticket15PortInputs)
    .match(/api[_-]?key|credential|authorization|bearer/iu));
});

await check("client_extension_preserves_the_existing_four_operation_interface", () => {
  assert.deepEqual(boundary.clientMount.existingClientDomainOperationsRemain,
    ["bootstrap", "read", "dispatch", "subscribe"]);
  assert.equal(boundary.clientMount.extensionName, handoff.ticket15OnlineAgent.extensionName);
  assert.deepEqual(boundary.clientMount.targetSurfaces,
    ["expo_web_adjutant", "battle_lab_agent_and_harness"]);
  assert.equal(boundary.clientMount.nativeDeviceEvidenceDeferred, true);
});

await check("opponent_may_select_and_preview_but_never_confirm_or_apply", () => {
  assert.equal(boundary.authority.opponentDecisionSource,
    "current_enabled_legal_space_candidate_only");
  assert.equal(boundary.authority.opponentPreviewAllowed, true);
  assert.equal(boundary.authority.opponentApplyAllowed, false);
  assert.equal(boundary.roles.modelMayConfirmOrApply, false);
  assert.equal(boundary.authority.humanConfirmationOwner, "non_model_controller");
});

await check("ticket_15_cannot_generate_skills_run_dsh_or_claim_training_truth", () => {
  assert.equal(boundary.authority.skillGenerationAllowed, false);
  assert.equal(boundary.authority.dshAllowed, false);
  assert.equal(boundary.authority.trainingTruth, false);
  assert.equal(boundary.laterBoundaries.ticket17,
    "dsh_offline_skill_candidate_generation_only");
  assert.equal(boundary.laterBoundaries.largeScaleSkillProductionRequiresFreshUserConfirmation,
    true);
});

await check("slice_144_performs_no_source_provider_byok_or_training_operation", () => {
  assert.deepEqual(boundary.runTruth, {
    sourceRefreshPerformed: false,
    providerCalled: false,
    byokCredentialAccepted: false,
    skillGenerated: false,
    dshRun: false,
    muzeroDataGenerated: false,
    selfPlayRun: false,
    trainingTruth: false,
  });
});

const reportBody = {
  schemaVersion: "starcraft_tmg_ticket_15_slice_144_online_agent_boundary_verification_v1",
  generatedAt: "2026-09-03T22:00:00.000Z",
  ticket: 15,
  slice: 144,
  status: failures.length ? "failed" : "passed",
  assertionsPassed: checks.filter((entry) => entry.passed).length,
  assertionsTotal: checks.length,
  checks,
  failures,
  boundaryHash: boundary.boundaryHash,
  predecessorHandoffHash: boundary.predecessorHandoffHash,
  sliceDenominator: boundary.slices.length,
  ticketProgress: failures.length ? "0/9" : "1/9",
  projectProgress: "13/22",
  nextSlice: failures.length ? 144 : 145,
  authority: boundary.runTruth,
};
const report = {
  ...reportBody,
  reportHash: hashStarcraftTmgContract(reportBody),
};

await mkdir(REPORT_ROOT, { recursive: true });
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(
  `Ticket 15 Slice 144 ${report.status} ${report.assertionsPassed}/${report.assertionsTotal}; `
  + `${report.ticketProgress}; ${report.reportHash}\n`,
);
if (failures.length) throw new Error(failures.join("\n"));
