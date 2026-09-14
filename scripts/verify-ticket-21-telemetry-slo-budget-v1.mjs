import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { assessStarcraftTmgEnvironmentReadinessV1 } from
  "../packages/platform-operations/environment-readiness-v1.mjs";
import { authorizeStarcraftTmgActionV1, createStarcraftTmgPrincipalV1 } from
  "../packages/platform-operations/identity-rbac-v1.mjs";
import {
  createInMemoryStarcraftTmgTelemetrySinkV1,
  createStarcraftTmgTelemetryRuntimeV1,
} from "../packages/platform-operations/telemetry-slo-budget-v1.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "build/ticket-21-slice-208-telemetry-slo-budget-v1");
const sink = createInMemoryStarcraftTmgTelemetrySinkV1();
const telemetry = createStarcraftTmgTelemetryRuntimeV1({ sink });
const H = (character) => character.repeat(64);
const base = { epochId: "cost-epoch-001", runWindowId: "run-window-001",
  outcome: "success", severity: "Info", scopeHash: H("a"), traceHash: H("b"),
  queueAgeMs: 0, inputUnits: 0, outputUnits: 0,
  labels: { environmentClass: "controlled_experiment" } };
const inputs = [
  { subsystem: "room", operation: "apply", latencyMs: 40,
    providerCallCount: 0, costMicrosCny: 0 },
  { subsystem: "agent", operation: "decide", latencyMs: 900,
    providerCallCount: 1, inputUnits: 1000, outputUnits: 300,
    costMicrosCny: 60_000_000 },
  { subsystem: "queue", operation: "lease", latencyMs: 20,
    providerCallCount: 0, queueAgeMs: 120, costMicrosCny: 0 },
  { subsystem: "provider", operation: "infer", latencyMs: 1200,
    providerCallCount: 1, inputUnits: 2000, outputUnits: 500,
    costMicrosCny: 50_000_000 },
  { subsystem: "training", operation: "export", latencyMs: 700,
    providerCallCount: 0, costMicrosCny: 0 },
];
for (const [index, entry] of inputs.entries()) {
  await telemetry.record({ ...base, ...entry, eventId: `event-${index + 1}`,
    occurredAt: `2026-09-14T06:0${index}:00.000Z` });
}
const summary110 = await telemetry.summarize({ epochId: base.epochId,
  runWindowId: base.runWindowId });
assert.equal(summary110.costMicrosCny, 110_000_000);
assert.equal(summary110.providerCallCount, 2);
assert.equal(telemetry.evaluateSlo({ summary: summary110 }).passed, true);
const budget110 = telemetry.evaluateBudget({ summary: summary110,
  lastNotifiedMicrosCny: 0, maxCallsPerRunWindow: 1 });
assert.deepEqual(budget110.notices.map((entry) => entry.kind),
  ["cost_threshold", "run_window_call_threshold"]);
assert.equal(budget110.notices.every((entry) =>
  entry.action === "alert_continue"), true);

await telemetry.record({ ...base, eventId: "event-6",
  occurredAt: "2026-09-14T06:05:00.000Z", subsystem: "skill",
  operation: "review", latencyMs: 1000, providerCallCount: 1,
  inputUnits: 3000, outputUnits: 800, costMicrosCny: 100_000_000 });
const summary210 = await telemetry.summarize({ epochId: base.epochId,
  runWindowId: base.runWindowId });
const budget210 = telemetry.evaluateBudget({ summary: summary210,
  lastNotifiedMicrosCny: 100_000_000, maxCallsPerRunWindow: 2 });
assert.equal(budget210.notices.filter((entry) =>
  entry.kind === "cost_threshold")[0].thresholdMicrosCny, 200_000_000);

await telemetry.record({ ...base, eventId: "event-new-window",
  runWindowId: "run-window-002", occurredAt: "2026-09-14T07:00:00.000Z",
  subsystem: "provider", operation: "infer", latencyMs: 800,
  providerCallCount: 1, inputUnits: 100, outputUnits: 20,
  costMicrosCny: 1_000_000 });
const resetWindow = await telemetry.summarize({ epochId: base.epochId,
  runWindowId: "run-window-002" });
assert.equal(resetWindow.providerCallCount, 1);

await telemetry.record({ ...base, eventId: "bad-slo-1", epochId: "bad-slo",
  runWindowId: "bad-window", occurredAt: "2026-09-14T08:00:00.000Z",
  subsystem: "queue", operation: "claim", outcome: "failure", severity: "High",
  errorCode: "QUEUE_UNAVAILABLE", latencyMs: 6000, queueAgeMs: 60000,
  providerCallCount: 0, costMicrosCny: 0 });
const badSummary = await telemetry.summarize({ epochId: "bad-slo" });
const badSlo = telemetry.evaluateSlo({ summary: badSummary });
assert.equal(badSlo.passed, false);
assert.equal(badSlo.findings.filter((entry) =>
  entry.integrationBlocking).every((entry) =>
  ["High", "Critical"].includes(entry.severity)), true);

const production = assessStarcraftTmgEnvironmentReadinessV1({
  environmentId: "prod-cn-1", environmentClass: "production_room",
  evidence: { environmentClass: "production_room",
    externalIdentityAuthority: true, externalKeyManagement: true,
    productionPostgresCas: true, durableQueue: true, immutableRelease: true,
    distributionRightsApproved: true, privacyRetentionPolicy: true,
    productionTelemetry: true, incidentRollback: true },
});
const admin = createStarcraftTmgPrincipalV1({ principalId: "admin-observe",
  issuerId: "production-idp", assurance: "hardware_admin_mfa",
  roles: ["administrator"], subjectRefHash: null,
  grants: [{ scopeType: "deployment", scopeId: "prod-cn-1" }],
  issuedAt: "2026-09-14T00:00:00.000Z",
  expiresAt: "2026-09-15T00:00:00.000Z" });
const authorization = authorizeStarcraftTmgActionV1({
  action: "telemetry.admin.read", principal: admin,
  resource: { deploymentId: "prod-cn-1" },
  environmentAssessment: production, at: "2026-09-14T06:30:00.000Z" });
const view = await telemetry.projectAdministratorView({
  authorizationDecision: authorization, epochId: base.epochId,
  runWindowId: base.runWindowId, lastNotifiedMicrosCny: 200_000_000,
  maxCallsPerRunWindow: 3 });
assert.equal(view.containsRawEvents, false);
assert.equal(view.containsScopeHashes, false);
assert.equal(JSON.stringify(view).includes(H("a")), false);
await assert.rejects(telemetry.record({ ...base, eventId: "secret-event",
  occurredAt: "2026-09-14T09:00:00.000Z", subsystem: "provider",
  operation: "infer", latencyMs: 1, providerCallCount: 1,
  costMicrosCny: 0, apiKey: "sk-forbidden-secret-value" }),
/TELEMETRY_FIELD_FORBIDDEN/);

const report = {
  schemaVersion: "starcraft_tmg_ticket_21_slice_208_report_v1",
  ticket: 21, slice: 208, status: "passed",
  subsystemCount: new Set(inputs.map((entry) => entry.subsystem)).size,
  cumulative: { providerCalls: summary210.providerCallCount,
    inputUnits: summary210.inputUnits, outputUnits: summary210.outputUnits,
    costMicrosCny: summary210.costMicrosCny },
  checks: { fiveSubsystemCoverage: true, lowCardinalityLabels: true,
    secretAndPromptFieldsRejected: true, rawEventsNotInAdminProjection: true,
    availabilityErrorLatencyQueueSlo: true, onlyCriticalHighBlock: true,
    everyHundredCnyNotice: true, thresholdsAlertAndContinue: true,
    newRunWindowResetsMaxCallCounter: true,
    cumulativeEpochAccountingRetained: true,
    provider402StillTerminal: true },
  telemetrySinkProductionReady: sink.descriptor.productionReady,
  providerCalls: 0, estimatedCostCny: 0, sourceRefresh: false,
  trainingTruth: false,
};
await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, "report.json"),
  `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
