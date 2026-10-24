// B161: an explicit authorized 100 CNY/seat configuration was passed to
// openMatch, but the existing record silently retained its old 80 CNY limit.
// Uses the captured metadata/history-status projection, not a new live match.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createStarcraftTmgLiveFlashDecisionPortV1,
  createInMemoryStarcraftTmgLiveDecisionStoreV1 } from
  "../packages/online-agent-session/live-flash-decision-port-v1.mjs";
import { hashStarcraftTmgContract as hash } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { isStarcraftTmgHistoricalResumeFindingV1 } from
  "../packages/online-agent-session/decision-recovery-policy-v1.mjs";

const [snapshotPath, outputPath] = process.argv.slice(2);
const bytes = await fs.readFile(snapshotPath, "utf8");
const saved = JSON.parse(bytes);
assert.equal(saved.budget.limitCnyMicros, 80_000_000);
const store = createInMemoryStarcraftTmgLiveDecisionStoreV1();
await store.commit(saved.scope.scopeKey, null, saved);
let providerCalls = 0;
const port = createStarcraftTmgLiveFlashDecisionPortV1({ store,
  providerCandidates: [], profileCandidates: [saved.selectedProfile],
  providerInteractionMode: saved.providerInteractionMode,
  providerSupervisor: { readState() {}, sendTurn() { providerCalls++;
    throw new Error("UNEXPECTED_PROVIDER_CALL"); } },
  promptArtifactStore: { put() {}, release() {} },
  profileAvailabilityPort: { check() {} }, strategySkillPort: { resolve() {} },
  spatialQueryPort: { query() {} }, now: () => "2026-10-09T09:01:00Z",
});
const preflightBody = { ok: true, scope: saved.scope,
  matchMode: saved.matchMode, selectedProfile: saved.selectedProfile,
  strategySkillSnapshot: saved.strategySkillSnapshot };
const input = { scope: saved.scope,
  preflightReceipt: { ...preflightBody, preflightHash: hash(preflightBody) },
  providerSession: saved.providerSession,
  budget: { limitCnyMicros: 100_000_000, maxProviderCalls: 1_024 } };
const opened = await port.openMatch(input);
assert.equal(opened.ok, true);
assert.equal(opened.projection.budget.limitCnyMicros, 100_000_000,
  "existing match must consume the caller's explicit authorized budget");
assert.deepEqual(opened.projection.usage, saved.usage);
assert.deepEqual((await store.load(saved.scope.scopeKey)).decisions, saved.decisions);
const change = opened.projection.budget.authorizedLimitChanges.at(-1);
assert.equal(change.previousLimitCnyMicros, 80_000_000);
assert.equal(change.limitCnyMicros, 100_000_000);
const finding = { code: "LIVE_DECISION_CNY_BUDGET_EXHAUSTED", severity: "High",
  occurredAt: "2026-10-09T08:41:38.544Z", seatKey: saved.scope.seatKey };
const recovery = { allowExistingRetryableFinding: true,
  startedAt: "2026-10-09T09:02:00Z", providerProjection: opened.projection };
assert.equal(isStarcraftTmgHistoricalResumeFindingV1(finding, recovery), true);
assert.equal(isStarcraftTmgHistoricalResumeFindingV1(finding, {
  ...recovery, providerProjection: { ...opened.projection, budget: saved.budget },
}), false, "unchanged old cap is not a budget recovery");
assert.equal(isStarcraftTmgHistoricalResumeFindingV1({ ...finding,
  occurredAt: "2026-10-09T09:03:00Z" }, recovery), false);
assert.equal(isStarcraftTmgHistoricalResumeFindingV1({ ...finding,
  seatKey: "player1" }, recovery), false);
const repeated = await port.openMatch(input);
assert.equal(repeated.projection.budget.authorizedLimitChanges.length, 1);
assert.deepEqual(repeated.projection.usage, saved.usage);
const tooLow = await port.openMatch({ ...input,
  budget: { ...input.budget, limitCnyMicros: 1 } });
assert.equal(tooLow.ok, false);
assert.equal(tooLow.reason, "LIVE_DECISION_BUDGET_BELOW_ACCRUED_COST");
assert.equal((await port.read({ scope: saved.scope })).projection.budget.limitCnyMicros,
  100_000_000);
assert.equal(providerCalls, 0);
assert.equal(await fs.readFile(snapshotPath, "utf8"), bytes);
const report = { passed: true, capturedExistingBudgetMetadataUsed: true,
  explicitlyConfiguredLimitReconciled: true, cumulativeUsageNotReset: true,
  historyStatusProjectionUnchanged: true, idempotentReopen: true,
  historicalBudgetFindingNeedsSameSeatActualRaisedLimit: true,
  newBudgetFailureStillBlocks: true, belowAccruedCostRejected: true,
  providerCalls: 0, liveRoomWrites: 0,
  fullPaidHistoryContinuityNotCertifiedByThisMetadataGate: true,
  trainingTruth: false };
await fs.writeFile(outputPath, JSON.stringify(report, null, 2) + "\n",
  { mode: 0o600 });
console.log(JSON.stringify(report));
