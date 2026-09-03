#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { STARCRAFT_TMG_TICKET_15_ONLINE_ROLE_AGENT_BOUNDARY_V1 as ticket15 } from
  "../content/agent/ticket-15-online-role-agent-boundary-v1.mjs";
import { STARCRAFT_TMG_TICKET_16_SECURE_BYOK_PROVIDER_BOUNDARY_V1 as boundary } from
  "../content/provider/ticket-16-secure-byok-provider-boundary-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/transition-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_ROOT = path.join(ROOT, "build/ticket-16-slice-153-secure-byok-boundary-v1");
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

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

await check("boundary_is_hash_sealed_and_pins_ticket_15", () => {
  const { boundaryHash, ...body } = boundary;
  assert.equal(boundaryHash, hashStarcraftTmgContract(body));
  assert.equal(boundary.predecessorBoundaryHash, ticket15.boundaryHash);
  assert.equal(ticket15.providerGateway.owner, "ticket_16_direct_provider_secure_byok");
});

await check("ten_ordered_slices_cover_live_closure_without_hiding_the_key_gate", () => {
  assert.deepEqual(boundary.slices.map((entry) => entry.slice),
    [153, 154, 155, 156, 157, 158, 159, 160, 161, 162]);
  assert.equal(boundary.liveAcceptance.apiKeyRequiredBeforeSlice, 162);
  assert.equal(boundary.liveAcceptance.userAuthorizationRequired, true);
  assert.equal(boundary.liveAcceptance.absencePolicy, "ticket_remains_open_at_9_of_10");
});

await check("historical_provider_and_byok_files_are_exactly_frozen", async () => {
  for (const entry of boundary.existingImplementationAudit.frozenHistoricalInputs) {
    const pathname = path.join(ROOT, entry.path);
    assert.equal((await stat(pathname)).isFile(), true, entry.path);
    assert.equal(sha256(await readFile(pathname)), entry.sha256, entry.path);
  }
  assert.equal(boundary.existingImplementationAudit.migrationPolicy.modifyHistoricalV1Files,
    false);
  assert.equal(boundary.existingImplementationAudit.migrationPolicy.silentCompatibilityAllowed,
    false);
  assert.equal(boundary.existingImplementationAudit.migrationPolicy
    .historicalDisplayAndVerificationRetained, true);
});

await check("audit_detects_the_real_v1_raw_key_and_process_memory_boundaries", async () => {
  const [provider, runtime, http] = await Promise.all([
    readFile(path.join(ROOT,
      "packages/character-agent/openai-compatible-provider-v1.mjs"), "utf8"),
    readFile(path.join(ROOT,
      "packages/character-agent/session-runtime-v1.mjs"), "utf8"),
    readFile(path.join(ROOT,
      "packages/character-agent/http-handler-v1.mjs"), "utf8"),
  ]);
  assert(provider.includes('requiredString(request.apiKey, "apiKey")'));
  assert(provider.includes('authorization: `Bearer ${apiKey}`'));
  assert(runtime.includes("const byokCredentials = new Map()"));
  assert(runtime.includes("apiKey = byokCredentials.get(session.sessionId)"));
  assert(http.includes("sessions/:sessionId/byok"));
  assert(boundary.existingImplementationAudit.blockers.length >= 8);
});

await check("ticket_15_gateway_remains_credential_free_and_is_composed_not_rewritten", async () => {
  const source = await readFile(path.join(ROOT,
    "packages/online-agent-session/provider-gateway-supervisor-v1.mjs"), "utf8");
  assert(source.includes("providerGateway.complete(gatewayInput)"));
  assert(source.includes("providerProfileRef"));
  assert(source.includes("promptAssemblyRef"));
  assert(!boundary.deepModule.gatewayInputCredentialFields.length);
  assert.equal(boundary.deepModule.providerGatewayOperation, "complete");
  assert.equal(boundary.existingImplementationAudit.migrationPolicy.newPackageOwner,
    "packages/secure-provider-runtime");
});

await check("mtl_comparison_is_commit_pinned_and_adapted_instead_of_copied", () => {
  assert.equal(boundary.mtlComparison.commit,
    "50ef5c29c655c015335d76e78fb4a0ecb442252f");
  assert.equal(boundary.mtlComparison.codeCopied, false);
  assert(boundary.mtlComparison.adoptedPrinciples.includes(
    "credential_broker_is_a_scrubbed_child_process"));
  assert(boundary.mtlComparison.adoptedPrinciples.includes(
    "crash_ambiguity_never_triggers_an_automatic_billable_retry"));
  assert(boundary.mtlComparison.starcraftSpecificChanges.includes(
    "retain_zero_automatic_retry_instead_of_the_mtl_bounded_retry_policy"));
});

await check("explicit_consent_precedes_the_single_use_credential_ingress", () => {
  assert.equal(boundary.credentialLifecycle.attachProtocol[0],
    "authenticated_client_creates_a_non_secret_consent_intent");
  assert(boundary.credentialLifecycle.attachProtocol.includes(
    "server_returns_a_single_use_short_lived_ingress_nonce"));
  assert.equal(boundary.credentialLifecycle.rawCredentialPersistence, "never");
  assert.equal(boundary.credentialLifecycle.parentCredentialRepresentation,
    "bounded_buffer_only_during_ingress_handoff");
  assert(boundary.credentialLifecycle.consentBinds.includes("no_automatic_retry"));
});

await check("credential_worker_is_a_scrubbed_child_without_rules_room_or_dsh", () => {
  assert.equal(boundary.workerIsolation.kind,
    "node_child_process_credential_worker");
  assert.equal(boundary.workerIsolation.inheritedEnvironment, false);
  assert.equal(boundary.workerIsolation.rawCredentialVisibleToAgentRuntime, false);
  assert.equal(boundary.workerIsolation.rawCredentialVisibleToRulesOrRoomRuntime, false);
  assert.deepEqual(boundary.workerIsolation.roomRulesToolOrDshCapabilities, []);
});

await check("egress_is_registry_owned_https_dns_safe_non_redirecting_and_one_attempt", () => {
  assert.equal(boundary.egressPolicy.userSuppliedBaseUrlAllowed, false);
  for (const requirement of [
    "remote_https_only",
    "exact_provider_host_port_path_and_model_allowlist",
    "dns_results_must_all_be_globally_routable",
    "redirects_disabled",
    "tls_certificate_verification_enabled",
    "one_physical_attempt_only",
  ]) assert(boundary.egressPolicy.requirements.includes(requirement), requirement);
  assert.equal(boundary.egressPolicy.onlineDshAllowed, false);
});

await check("sqlite_and_postgresql_share_one_non_secret_attempt_store_contract", () => {
  assert.equal(boundary.durableAttempts.storeContract,
    "starcraft_tmg_provider_attempt_store_v1");
  assert.deepEqual(boundary.durableAttempts.adapters, {
    m1: "sqlite_wal",
    production: "postgresql_transactional",
  });
  assert.equal(boundary.durableAttempts.parityRequired, true);
  assert.deepEqual(boundary.durableAttempts.persistedSecretFields, []);
  assert(boundary.durableAttempts.writeBeforeEgress.includes("attempt_intent"));
  assert(boundary.durableAttempts.ambiguousRecovery.includes("no_automatic_retry"));
});

await check("restart_loses_the_key_and_never_silently_repeats_a_billable_attempt", () => {
  assert(boundary.credentialLifecycle.serverRestartPolicy.includes(
    "explicitly_reattached"));
  assert.equal(boundary.durableAttempts.credentialAfterRecovery,
    "missing_until_explicit_reattach");
  assert(boundary.durableAttempts.ambiguousRecovery.includes(
    "explicit_same_user_approval_required"));
});

await check("live_receipt_has_identity_usage_cost_and_output_lineage", () => {
  for (const field of [
    "provider_profile_hash",
    "requested_model",
    "reported_model",
    "attempt_id",
    "provider_request_id_hash",
    "input_output_total_units",
    "cost_or_explicitly_unavailable_cost",
    "response_fingerprint",
  ]) assert(boundary.liveAcceptance.requiredReceiptFields.includes(field), field);
  assert.equal(boundary.liveAcceptance.callCountDefault, 1);
  assert.equal(boundary.liveAcceptance.minimumBudget, true);
  assert.equal(boundary.liveAcceptance.keyDelivery,
    "local_secure_ingress_or_process_environment_never_chat");
});

await check("provider_can_only_propose_a_current_candidate_and_never_apply", () => {
  assert.equal(boundary.authority.providerMaySelectCurrentOpponentCandidate, true);
  assert.equal(boundary.authority.providerMayConfirmOrApply, false);
  assert.equal(boundary.authority.providerMayGenerateSkills, false);
  assert.equal(boundary.authority.dshAllowed, false);
  assert.equal(boundary.authority.rulesOwner, "rules_service");
  assert.equal(boundary.authority.humanConfirmationOwner, "non_model_controller");
});

await check("harness_round_records_evidence_and_rollback_without_claiming_a_decision", () => {
  assert.equal(boundary.harnessEvidence.harnessLoopUsed, true);
  assert.deepEqual(boundary.harnessEvidence.targetGames, ["starcraft-tmg"]);
  assert.deepEqual(boundary.harnessEvidence.promptPackRoutes, []);
  assert.deepEqual(boundary.harnessEvidence.harnessToolsCalled, []);
  assert.equal(boundary.harnessEvidence.agentDecisionEvidence, null);
  assert.equal(boundary.harnessEvidence.memoryTraceEvidence.writes, 0);
  assert.equal(boundary.harnessEvidence.trainingTraceCandidates, 0);
  assert(boundary.harnessEvidence.rollbackOrDemotionRules.includes(
    "never_retry_an_ambiguous_billable_attempt_without_explicit_same_user_approval"));
});

await check("slice_153_performs_no_source_refresh_key_acceptance_or_model_call", () => {
  assert.deepEqual(boundary.runTruth, {
    sourceRefreshPerformed: false,
    providerCalled: false,
    byokCredentialAccepted: false,
    networkComparisonReadOnly: true,
    skillGenerated: false,
    dshRun: false,
    muzeroDataGenerated: false,
    selfPlayRun: false,
    trainingTruth: false,
    productionReady: false,
  });
});

const reportBody = {
  schemaVersion:
    "starcraft_tmg_ticket_16_slice_153_secure_byok_provider_boundary_verification_v1",
  generatedAt: "2026-09-03T14:00:00.000Z",
  ticket: 16,
  slice: 153,
  status: failures.length ? "failed" : "passed",
  assertionsPassed: checks.filter((entry) => entry.passed).length,
  assertionsTotal: checks.length,
  checks,
  failures,
  boundaryHash: boundary.boundaryHash,
  predecessorBoundaryHash: boundary.predecessorBoundaryHash,
  referenceCommit: boundary.mtlComparison.commit,
  sliceDenominator: boundary.slices.length,
  ticketProgress: failures.length ? "0/10" : "1/10",
  projectProgress: "14/22",
  nextSlice: failures.length ? 153 : 154,
  liveCredentialNeededNow: false,
  authority: boundary.runTruth,
  harness: boundary.harnessEvidence,
};
const report = {
  ...reportBody,
  reportHash: hashStarcraftTmgContract(reportBody),
};

await mkdir(REPORT_ROOT, { recursive: true });
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(
  `Ticket 16 Slice 153 ${report.status} ${report.assertionsPassed}/${report.assertionsTotal}; `
  + `${report.ticketProgress}; ${report.reportHash}\n`,
);
if (failures.length) throw new Error(failures.join("\n"));
