#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { STARCRAFT_TMG_TICKET_15_BROWSER_AGGREGATE_CONTRACT_V1 } from
  "../content/agent/ticket-15-browser-aggregate-contract-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/transition-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = path.join(ROOT, "build/ticket-15-closure-v1/report.json");
const SLICES = Object.freeze({
  144: ["build/ticket-15-slice-144-online-agent-boundary-v1/report.json", 11],
  145: ["build/ticket-15-slice-145-online-session-lifecycle-v1/report.json", 21],
  146: ["build/ticket-15-slice-146-provider-gateway-supervisor-v1/report.json", 24],
  147: ["build/ticket-15-slice-147-role-context-isolation-v1/report.json", 24],
  148: ["build/ticket-15-slice-148-role-output-preview-v1/report.json", 28],
  149: ["build/ticket-15-slice-149-online-agent-http-events-v1/report.json", 26],
  150: ["build/ticket-15-slice-150-role-agent-client-v1/report.json", 15],
  151: ["build/ticket-15-slice-151-battle-lab-trace-projection-v2/report.json", 21],
});
const BROWSER_PATH =
  "build/ticket-15-slice-152-browser-aggregate-v1/browser-report.json";

function without(value, key) {
  return Object.fromEntries(Object.entries(value).filter(([name]) => name !== key));
}

async function load(relativePath) {
  return JSON.parse(await readFile(path.join(ROOT, relativePath), "utf8"));
}

function passedCount(report) {
  return report.assertionsPassed
    ?? report.acceptanceCount
    ?? report.totals?.passed
    ?? 0;
}

function reportPassed(report) {
  const checks = report.checks || report.acceptanceChecks || [];
  const failures = checks.filter((entry) => typeof entry === "object"
    && (entry.passed ?? entry.ok) !== true);
  return failures.length === 0
    && (report.failures?.length ?? 0) === 0
    && (report.totals?.failed ?? 0) === 0
    && !["failed", "blocked"].includes(report.status);
}

function verifyReportHash(report) {
  return typeof report.reportHash === "string"
    && hashStarcraftTmgContract(without(report, "reportHash")) === report.reportHash;
}

const sliceReports = Object.fromEntries(await Promise.all(Object.entries(SLICES)
  .map(async ([slice, [relativePath]]) => [slice, await load(relativePath)])));
const browser = await load(BROWSER_PATH);
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

await check("browser_aggregate_contract_is_hash_sealed_and_binds_slice_151", () => {
  const contract = STARCRAFT_TMG_TICKET_15_BROWSER_AGGREGATE_CONTRACT_V1;
  assert.equal(hashStarcraftTmgContract(
    without(contract, "browserAggregateContractHash")),
  contract.browserAggregateContractHash);
  assert.match(contract.predecessorTraceProjectionContractHash, /^[a-f0-9]{64}$/u);
  assert.deepEqual(contract.closure.slices,
    [144, 145, 146, 147, 148, 149, 150, 151, 152]);
});

await check("slices_144_through_151_pass_fixed_170_assertion_denominator", () => {
  let total = 0;
  for (const [slice, [, denominator]] of Object.entries(SLICES)) {
    const report = sliceReports[slice];
    assert.equal(report.ticket, 15, `Slice ${slice} ticket drift`);
    assert.equal(report.slice, Number(slice), `Slice ${slice} identity drift`);
    assert.equal(passedCount(report), denominator, `Slice ${slice} denominator drift`);
    assert.equal(reportPassed(report), true, `Slice ${slice} has a failed assertion`);
    assert.equal(verifyReportHash(report), true, `Slice ${slice} integrity failed`);
    total += denominator;
  }
  assert.equal(total, 170);
});

await check("real_chromium_report_passes_exact_11_check_matrix", () => {
  assert.equal(browser.ticket, 15);
  assert.equal(browser.slice, 152);
  assert.equal(browser.status, "passed");
  assert.equal(browser.assertionsPassed, 11);
  assert.equal(browser.assertionsTotal, 11);
  assert.equal(browser.checks.length, 11);
  assert(browser.checks.every((entry) => entry.passed === true));
  assert.equal(verifyReportHash(browser), true);
  assert.equal(browser.denominator.realChromiumRuns, 1);
  assert.equal(browser.denominator.evidenceArtifacts, 4);
});

await check("all_four_role_modes_reach_real_authenticated_browser_http", () => {
  for (const id of [
    "tutor_mode_completes_with_rule_skill_evidence",
    "commentator_mode_uses_public_event_context",
    "companion_mode_completes_without_room_mutation",
    "opponent_preview_needs_external_human_confirm_then_receipt_replay",
  ]) assert.equal(browser.checks.find((entry) => entry.id === id)?.passed, true,
    `browser role evidence missing ${id}`);
  assert.equal(browser.boundaries.authenticatedAgentHttpUsed, true);
  assert.equal(browser.boundaries.realRoleTurnRuntimeUsed, true);
});

await check("provider_failure_configuration_budget_and_cancel_are_browser_proven", () => {
  for (const id of [
    "configured_gateway_failure_is_code_only_and_recoverable",
    "provider_not_configured_is_honest_and_browser_visible",
    "provider_input_budget_is_enforced_before_gateway_call",
    "in_flight_browser_turn_is_cancelled_through_abort_signal",
  ]) assert.equal(browser.checks.find((entry) => entry.id === id)?.passed, true,
    `browser failure evidence missing ${id}`);
  assert.equal(browser.denominator.providerFailurePaths, 3);
  assert.equal(browser.denominator.cancellationPaths, 1);
});

await check("background_return_requires_an_explicit_connection_epoch_reconnect", () => {
  assert.equal(browser.checks.find((entry) =>
    entry.id === "background_return_requires_and_completes_explicit_reconnect")
    ?.passed, true);
  assert.equal(browser.denominator.backgroundReconnectPaths, 1);
  assert(sliceReports[145].runtimeMetadata.operations.includes("reconnect_session"));
});

await check("opponent_write_remains_legal_space_preview_human_confirm_receipt_replay", () => {
  const opponent = browser.checks.find((entry) =>
    entry.id === "opponent_preview_needs_external_human_confirm_then_receipt_replay");
  assert.equal(opponent.revisionDelta, 1);
  assert.equal(opponent.modelMayConfirm, false);
  assert.equal(opponent.modelMayApply, false);
  assert.equal(sliceReports[148].modelConfirmCalls, 0);
  assert.equal(sliceReports[148].modelApplyCalls, 0);
  assert.equal(browser.denominator.opponentHumanConfirmationPaths, 1);
});

await check("trace_http_and_saved_evidence_preserve_scoped_privacy", () => {
  const privacy = browser.checks.find((entry) =>
    entry.id === "trace_http_and_artifact_privacy_scopes_are_enforced");
  assert.equal(privacy.rawSessionIdsRendered, 0);
  assert.equal(privacy.credentialValuesRendered, 0);
  assert.equal(privacy.providerReceiptKeysObserved, 0);
  assert.equal(browser.network.rawBodiesPersisted, false);
  assert.equal(browser.network.sessionLocatorsPersisted, false);
  assert.equal(browser.network.credentialsPersisted, false);
});

await check("browser_client_boundary_uses_only_portable_wire_and_credential_guards", async () => {
  const [transport, client, wire, credentials] = await Promise.all([
    readFile(path.join(ROOT,
      "packages/client-domain/online-agent-transport-adapters-v1.mjs"), "utf8"),
    readFile(path.join(ROOT,
      "packages/client-domain/role-agent-session-client-v1.mjs"), "utf8"),
    readFile(path.join(ROOT,
      "packages/online-agent-session/portable-http-wire-v1.mjs"), "utf8"),
    readFile(path.join(ROOT,
      "packages/online-agent-session/portable-credential-material-v1.mjs"), "utf8"),
  ]);
  assert(transport.includes("portable-http-wire-v1.mjs"));
  assert(transport.includes("portable-credential-material-v1.mjs"));
  assert(client.includes("portable-credential-material-v1.mjs"));
  for (const source of [transport, client, wire, credentials]) {
    assert.equal(/from\s+["']node:/u.test(source), false);
    assert.equal(source.includes("../../scripts/"), false);
  }
});

await check("ticket_16_handoff_keeps_api_keys_and_live_provider_out_of_ticket_15", () => {
  const contract = STARCRAFT_TMG_TICKET_15_BROWSER_AGGREGATE_CONTRACT_V1;
  assert.equal(contract.closure.ticket16Handoff, "secure_byok_and_live_provider");
  assert.equal(browser.boundaries.deterministicInjectedGatewayUsed, true);
  assert.equal(browser.boundaries.liveProviderCalled, false);
  assert.equal(browser.boundaries.apiKeyAccepted, false);
  assert.equal(browser.boundaries.sourceRefreshPerformed, false);
});

await check("skill_dsh_muzero_self_play_training_and_production_claims_remain_closed", () => {
  for (const field of [
    "skillGenerated", "dshRun", "muzeroDataGenerated", "selfPlayRun",
    "trainingTruth", "productionReady",
  ]) assert.equal(browser.boundaries[field], false, `${field} boundary widened`);
  assert.equal(
    STARCRAFT_TMG_TICKET_15_BROWSER_AGGREGATE_CONTRACT_V1.runTruth.memoryWrites,
    0,
  );
});

const priorAssertions = Object.values(SLICES)
  .reduce((sum, [, denominator]) => sum + denominator, 0);
const reportCore = {
  schemaVersion: "starcraft_tmg_ticket_15_closure_verification_v1",
  generatedAt: "2026-09-04T13:00:00.000Z",
  ticket: 15,
  slice: 152,
  status: failures.length ? "failed" : "complete",
  ticketProgress: failures.length ? "8/9" : "9/9",
  projectProgress: failures.length ? "13/22" : "14/22",
  assertionsPassed: checks.filter((entry) => entry.passed).length,
  assertionsTotal: checks.length,
  checks,
  failures,
  evidenceDenominator: {
    priorSliceReports: 8,
    priorSliceAssertions: priorAssertions,
    browserAssertions: browser.assertionsPassed,
    closureAssertions: checks.length,
    ticketAssertionsIncludingClosure:
      priorAssertions + browser.assertionsPassed + checks.length,
  },
  sliceReportHashes: {
    ...Object.fromEntries(Object.entries(sliceReports)
      .map(([slice, report]) => [slice, report.reportHash])),
    152: browser.reportHash,
  },
  browserAggregateContractHash:
    STARCRAFT_TMG_TICKET_15_BROWSER_AGGREGATE_CONTRACT_V1
      .browserAggregateContractHash,
  ticket16Handoff: {
    scope: "secure_byok_and_live_provider",
    apiKeyNeededForTicket15: false,
    nextLiveCallRequiresLocalSecureConfiguration: true,
    keyMustNotBePastedIntoChat: true,
  },
  deferred: {
    nativeDeviceEvidence: "final_device_batch",
    offlineSkillGenerationAndPromotion: [17, 18],
    largeScaleSkillProductionRequiresUserConfirmation: true,
  },
  authority: {
    sourceRefreshPerformed: false,
    deterministicInjectedGatewayUsed: true,
    liveProviderCalled: false,
    apiKeyAccepted: false,
    skillGenerated: false,
    dshRun: false,
    muzeroDataGenerated: false,
    selfPlayRun: false,
    trainingTruth: false,
    productionReady: false,
  },
};
const report = {
  ...reportCore,
  reportHash: hashStarcraftTmgContract(reportCore),
};
await mkdir(path.dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(
  `Ticket 15 closure ${report.assertionsPassed}/${report.assertionsTotal}; `
  + `${report.status}; ${report.reportHash}\n`,
);
if (failures.length) {
  throw new Error(`TICKET_15_CLOSURE_FAILED\n${failures.join("\n")}`);
}
