#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RULE_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-closure-v1");
async function json(...segments) {
  return JSON.parse(await readFile(path.join(ROOT, ...segments), "utf8"));
}

const authority = await json("build", "ticket-11-authority-v2", "report.json");
const transition = await json("build", "authoritative-transition-v1", "report.json");
const room = await json("build", "authoritative-room-v1", "report.json");
const slice = JSON.parse(await readFile(path.join(RULE_DIR,
  "official-dispute-resolution-rules-rule-slice-v1-report.json"), "utf8"));
const runtime = JSON.parse(await readFile(path.join(RULE_DIR,
  "official-executable-rule-runtime-v1-report.json"), "utf8"));
const aggregate = JSON.parse(await readFile(path.join(RULE_DIR,
  "ticket-11-rule-atom-foundation-aggregate-v1-report.json"), "utf8"));

const acceptance = [];
async function check(id, fn) {
  try {
    await fn();
    acceptance.push({ id, passed: true });
  } catch (error) {
    acceptance.push({ id, passed: false, error: String(error?.stack || error) });
  }
}

await check("ticket_11a_fifteen_item_authority_matrix_passes", () => {
  assert.equal(authority.ok, true);
  assert.equal(authority.acceptanceDenominator, 15);
  assert.equal(authority.acceptancePassed, 15);
  assert.deepEqual(authority.failures, []);
});
await check("transition_and_room_compatibility_gates_pass", () => {
  assert.equal(transition.ok, true);
  assert.equal(transition.checks.length, 7);
  assert.equal(room.ok, true);
  assert.equal(room.checks.length, 7);
  assert.deepEqual(transition.failures, []);
  assert.deepEqual(room.failures, []);
});
await check("ticket_11b_final_slice_focused_gate_passes", () => {
  assert.equal(slice.acceptancePassed, 50);
  assert.equal(slice.acceptanceTotal, 50);
  assert.deepEqual(slice.failures, []);
});
await check("complete_actionable_atom_denominator_is_executable", () => {
  assert.deepEqual(slice.ticket11Closure, {
    actionableAtoms: 912, executableAtoms: 912,
    reviewRequiredAtoms: 0, displayOnlyAtomsRetained: 114,
    declaredStateContractExecutors: 80,
    remainingRuleSlices: 0, ruleVerticalsComplete: 101,
    manualAdjudicationTrainingEligible: false,
    productionRoomEligible: false,
  });
});
await check("runtime_targets_final_catalogue_and_eighty_executors", () => {
  assert.equal(runtime.acceptancePassed, 10);
  assert.equal(runtime.acceptanceTotal, 10);
  assert.equal(runtime.runtimeDescriptor.catalogueHash, slice.catalogueHash);
  assert.equal(runtime.runtimeDescriptor.runtimeHash, slice.runtimeHash);
  assert.equal(runtime.runtimeDescriptor.executableRuleAtomCount, 912);
  assert.equal(runtime.runtimeDescriptor.executorManifest.length, 80);
});
await check("relationship_graph_has_global_executable_coverage", () => {
  assert.equal(slice.graphAudit.valid, true);
  assert.equal(slice.graphAudit.globalRelationshipCoverageComplete, true);
  assert.equal(slice.graphAudit.counts.remainingActionableRuleAtoms, 0);
  assert.equal(slice.graphAudit.counts.blockingGaps, 0);
  assert.deepEqual(slice.graphAudit.coverageDebtCodes, []);
});
await check("display_only_rules_remain_visible_but_non_executable", () => {
  assert.equal(slice.audit.catalogueAudit.counts.byDisposition.display_only, 114);
  assert.equal(slice.audit.catalogueAudit.counts.byDisposition.review_required, 0);
  assert.equal(runtime.runtimeDescriptor.nonExecutableRuleAtomCount, 114);
  assert.equal(slice.slice.historicalCompatibility.historicalRulesDisplayRetained, true);
  assert.equal(slice.slice.historicalCompatibility.silentCompatibilityAllowed, false);
});
await check("foundation_aggregate_is_green_and_machine_counted", () => {
  assert.equal(aggregate.acceptancePassed, 10);
  assert.equal(aggregate.acceptanceTotal, 10);
  assert.deepEqual(aggregate.failures, []);
  assert.deepEqual(aggregate.evidenceDenominator, {
    baseReports: 175, baseAssertions: 2883,
    aggregateReports: 176, aggregateAssertions: 2893,
  });
});
await check("source_lock_stayed_frozen_without_repository_fallback", () => {
  assert.equal(slice.sourceLockHash,
    "1adbdb652fafc09d01887981a3ae86f69e65e1f1480d804156a8da1d4d1757a1");
  assert.equal(slice.sourceSnapshotHash,
    "8828471846f5befa2e7eb464d64dfebf834e7aba5c1908381a44b29f5529e105");
  assert.equal(slice.normalizedDatasetHash,
    "b2579b83bb9a77b6119730009725a34d4e828d92d302248243bab33863551067");
  assert.equal(slice.sourceRefreshPerformed, false);
  assert.equal(slice.repositoryFallbackUsed, false);
});
await check("hash_signature_seal_and_replay_evidence_pass", () => {
  assert.equal(authority.evidence.signatureAlgorithm, "ed25519");
  assert.equal(authority.evidence.sealAlgorithm, "hmac-sha256");
  assert.equal(authority.evidence.silentCompatibilityUsed, false);
  assert(slice.acceptance.some((id) => id.endsWith(
    "authority_replay_survives_hmac_rotation")));
  assert(slice.acceptance.some((id) => id.endsWith(
    "tampered_provisional_ruling_receipt_is_rejected")));
});
await check("manual_adjudication_never_becomes_rules_or_training_truth", () => {
  assert.equal(slice.ticket11Closure.manualAdjudicationTrainingEligible, false);
  assert.equal(slice.trainingTruth, false);
  assert.deepEqual(slice.skillsGenerated, []);
  assert.deepEqual(slice.promotions, []);
  assert.deepEqual(slice.trainingTraceCandidates, []);
});
await check("ticket_closure_does_not_claim_later_product_milestones", () => {
  assert.equal(slice.ticket11Closure.productionRoomEligible, false);
  assert.equal(runtime.runtimeDescriptor.productionRoomEligible, false);
  assert.equal(runtime.runtimeDescriptor.ctx2skillPromotionEligible, false);
  assert.equal(runtime.runtimeDescriptor.trainingTruth, false);
});

const failures = acceptance.filter((entry) => !entry.passed);
const report = {
  schema: "starcraft_tmg_ticket_11_closure_verification_v1",
  generatedAt: new Date().toISOString(),
  ticket: 11,
  status: failures.length === 0 ? "complete" : "in_progress",
  acceptancePassed: acceptance.length - failures.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures,
  authorityMatrix: { passed: authority.acceptancePassed,
    denominator: authority.acceptanceDenominator },
  rulesMatrix: { executableAtoms: 912, actionableAtoms: 912,
    reviewRequiredAtoms: 0, displayOnlyAtomsRetained: 114,
    executorContracts: 80, ruleVerticals: 101 },
  evidenceDenominator: aggregate.evidenceDenominator,
  frozenIdentities: { sliceHash: slice.sliceHash,
    catalogueHash: slice.catalogueHash, runtimeHash: slice.runtimeHash,
    graphHash: slice.graphHash,
    sourceLockHash: slice.sourceLockHash,
    sourceSnapshotHash: slice.sourceSnapshotHash,
    normalizedDatasetHash: slice.normalizedDatasetHash },
  nextTicket: 12,
  productProjectStatusAfterClosure: { completedTickets: 11, totalTickets: 22 },
  productionRoomEligible: false,
  skillGenerated: false, dshRun: false, muzeroDataGenerated: false,
  selfPlayRun: false, trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR, "report.json"),
  `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ok: failures.length === 0,
  ticket: 11, status: report.status,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  rulesMatrix: report.rulesMatrix,
  evidenceDenominator: report.evidenceDenominator,
  nextTicket: report.nextTicket,
  failures }, null, 2));
if (failures.length > 0) process.exitCode = 1;
