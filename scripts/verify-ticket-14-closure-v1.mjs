#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { STARCRAFT_TMG_TICKET_14_CLIENT_HANDOFF_V1 } from
  "../content/client/ticket-14-client-handoff-v1.mjs";
import { STARCRAFT_TMG_OFFICIAL_FAQ_CURRENT_CLIENT_CONTRACT_V1 } from
  "../packages/client-domain/official-faq-current-client-contract-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";

const run = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = path.join(ROOT, "build/ticket-14-closure-v1/report.json");
const ALLOW_DEFERRED_DEVICE = process.argv.includes("--allow-deferred-device");
const REQUIRE_DEVICE = process.argv.includes("--require-device");
assert(ALLOW_DEFERRED_DEVICE !== REQUIRE_DEVICE,
  "choose exactly one of --allow-deferred-device or --require-device");

const SLICES = Object.freeze({
  128: ["build/ticket-14-slice-128-expo-baseline-boundary-v1/report.json", 13],
  129: ["build/ticket-14-slice-129-client-domain-v1/report.json", 17],
  130: ["build/ticket-14-slice-130-expo-product-mount-v1/report.json", 10],
  131: ["build/ticket-14-slice-131-room-access-recovery-v1/report.json", 18],
  132: ["build/ticket-14-slice-132-authoritative-battlefield-v1/report.json", 22],
  133: ["build/ticket-14-slice-133-character-mount-v2/report.json", 20],
  134: ["build/ticket-14-slice-134-source-localization-device-migration-v1/report.json", 23],
  135: ["build/ticket-14-slice-135-battle-lab-migration-v1/report.json", 23],
  136: ["build/ticket-14-slice-136-web-static-contract-v1/report.json", 18],
  137: ["build/ticket-14-slice-137-battle-workbench-v1/report.json", 10],
  138: ["build/ticket-14-slice-138-threat-v1/report.json", 9],
  139: ["build/ticket-14-slice-139-probability-v1/report.json", 8],
  140: ["build/ticket-14-slice-140-write-palette-v1/report.json", 16],
  141: ["build/ticket-14-slice-141-score-rules-v1/report.json", 18],
  142: ["build/ticket-14-slice-142-native-v1/android-build-receipt.json", 16],
});
const ADJACENT = Object.freeze({
  ticket11: "build/ticket-11-closure-v1/report.json",
  ticket12: "build/ticket-12-closure-v1/report.json",
  ticket13: "build/ticket-13-closure-v1/report.json",
  faq: "build/faq-v1-rules-refresh/faq-f5-aggregate-release-report.json",
  browser: "build/ticket-14-slice-136-web-static-v1/browser-acceptance-report.json",
});

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function without(value, key) {
  return Object.fromEntries(Object.entries(value).filter(([name]) => name !== key));
}

async function load(relativePath) {
  return JSON.parse(await readFile(path.join(ROOT, relativePath), "utf8"));
}

function passedCount(report, slice) {
  if (slice === 142) return report.acceptance?.length ?? 0;
  return report.assertionsPassed ?? report.checkCount
    ?? report.acceptancePassed ?? 0;
}

function reportIntegrity(report, slice) {
  const key = slice === 142 ? "receiptHash" : "reportHash";
  if (typeof report[key] !== "string") return false;
  const core = without(report, key);
  return report[key] === (slice === 133
    ? sha256(JSON.stringify(core))
    : hashStarcraftTmgContract(core));
}

function gate(report, name) {
  for (const owner of [report, report.gates, report.authority]) {
    if (owner && Object.prototype.hasOwnProperty.call(owner, name)) return owner[name];
  }
  return undefined;
}

const sliceReports = Object.fromEntries(await Promise.all(Object.entries(SLICES)
  .map(async ([slice, [relativePath]]) => [slice, await load(relativePath)])));
const adjacent = Object.fromEntries(await Promise.all(Object.entries(ADJACENT)
  .map(async ([name, relativePath]) => [name, await load(relativePath)])));

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

await check("slices_128_through_142_pass_the_fixed_241_assertion_denominator", () => {
  let total = 0;
  for (const [slice, [, denominator]] of Object.entries(SLICES)) {
    const report = sliceReports[slice];
    assert.equal(report.ticket, 14, `Slice ${slice} ticket drift`);
    assert.equal(report.slice, Number(slice), `Slice ${slice} identity drift`);
    assert.equal(passedCount(report, Number(slice)), denominator,
      `Slice ${slice} denominator drift`);
    assert.equal(report.failures?.length ?? 0, 0, `Slice ${slice} has failures`);
    assert(reportIntegrity(report, Number(slice)), `Slice ${slice} report integrity failed`);
    total += denominator;
  }
  assert.equal(total, 241);
});

await check("ticket_10_baseline_and_tickets_11_12_13_replay_as_closed_inputs", () => {
  assert.equal(sliceReports[128].baseline.commit,
    "f07b3cb78ce6bf119bdc529cde41dbe91e00a61d");
  for (const key of ["ticket11", "ticket12", "ticket13"]) {
    assert.equal(adjacent[key].status, "complete", `${key} closure drift`);
    assert.equal(adjacent[key].failures.length, 0, `${key} closure has failures`);
  }
  assert.equal(adjacent.ticket11.acceptancePassed, 12);
  assert.equal(adjacent.ticket12.acceptancePassed, 12);
  assert.equal(adjacent.ticket13.acceptancePassed, 12);
});

await check("current_faq_rules_replace_no_historical_identity_and_bind_both_clients", () => {
  const current = STARCRAFT_TMG_OFFICIAL_FAQ_CURRENT_CLIENT_CONTRACT_V1;
  assert.equal(adjacent.faq.acceptancePassed, 17);
  assert.equal(adjacent.faq.acceptanceTotal, 17);
  assert.equal(adjacent.faq.rulesTruth, true);
  assert.equal(current.counts.faqEntryCount, 68);
  assert.equal(current.counts.faqAtomCount, 137);
  assert.equal(current.counts.atomCount, 1163);
  assert.equal(current.counts.executableAtomCount, 1049);
  assert.equal(current.counts.displayOnlyAtomCount, 114);
  assert.equal(sliceReports[140].evidence.clientContractHash, current.clientContractHash);
  assert.equal(sliceReports[141].evidence.currentFaqClientContractHash,
    current.clientContractHash);
  assert.equal(current.roomBindings.historicalPreFaq.displayRetained, true);
  assert.equal(current.roomBindings.historicalPreFaq.replayRetained, true);
});

await check("expo_and_battle_lab_share_one_client_domain_and_workbench_projection", () => {
  assert.deepEqual(sliceReports[130].semanticEvidence.web.clientDomainInterface,
    ["bootstrap", "read", "dispatch", "subscribe"]);
  assert.deepEqual(sliceReports[130].semanticEvidence.native.clientDomainInterface,
    ["bootstrap", "read", "dispatch", "subscribe"]);
  assert.equal(sliceReports[135].evidence.sharedViewHashEqualityVerified, true);
  assert.equal(sliceReports[135].evidence.legacySandboxImported, false);
  assert.equal(sliceReports[137].evidence.snapshotHashShapeVerified, true);
  assert.equal(sliceReports[138].evidence.threatHashShapeVerified, true);
  assert.equal(sliceReports[139].evidence.probabilityHashShapeVerified, true);
});

await check("all_table_writes_remain_legal_space_preview_confirm_apply_receipt_replay", () => {
  assert.equal(sliceReports[140].evidence.currentEnabledTokenMarkerActions, 3);
  assert.equal(sliceReports[140].evidence.faqTokenMarkerEntries, 12);
  assert.equal(sliceReports[140].evidence.faqTokenMarkerAtoms, 27);
  assert.equal(sliceReports[141].evidence.directScoreEditAllowed, false);
  for (const id of [
    "contract_requires_the_full_authoritative_human_confirmation_flow",
    "preview_requires_a_separate_visible_human_confirm_action",
    "preview_confirm_and_apply_are_end_to_end_bound",
    "apply_and_replay_network_payloads_are_viewer_scoped_summaries",
  ]) assert.equal(sliceReports[132].checks.find((entry) => entry.id === id)?.passed,
    true, `Slice 132 missing ${id}`);
});

await check("legacy_device_records_are_quarantined_without_room_restore_or_network", () => {
  const migration = sliceReports[134].migration;
  assert.equal(migration.fixedLegacyKeyCount, 9);
  assert.equal(migration.originalsPreserved, true);
  assert.equal(migration.networkUsed, false);
  assert.equal(migration.roomRestoreAttempted, false);
});

await check("real_browser_evidence_uses_http_authority_without_capability_persistence", () => {
  assert.equal(adjacent.browser.passed, true);
  assert.equal(adjacent.browser.checks.length, 7);
  assert(adjacent.browser.checks.every((entry) => entry.passed === true));
  assert.equal(adjacent.browser.boundaries.authoritativeRoomRuntimeUsed, true);
  assert.equal(adjacent.browser.boundaries.httpAdapterUsed, true);
  assert.equal(adjacent.browser.boundaries.mockTransportUsed, false);
  assert.equal(adjacent.browser.security.artifactCapabilityScanPassed, true);
  assert.equal(adjacent.browser.security.authenticatedTraceCaptured, false);
  assert.equal(adjacent.browser.security.roomCapabilitiesPersistedInReport, false);
});

await check("android_artifacts_are_content_bound_and_standalone_preview_needs_no_metro", async () => {
  const native = sliceReports[142];
  for (const artifact of [native.apk, native.standalonePreviewApk]) {
    const bytes = await readFile(path.join(ROOT, artifact.relativePath));
    assert.equal(bytes.byteLength, artifact.byteLength);
    assert.equal(sha256(bytes), artifact.sha256);
  }
  assert.equal(native.apk.embeddedReleaseBundle, false);
  assert.equal(native.standalonePreviewApk.embeddedReleaseBundle, true);
  assert.equal(native.standalonePreviewApk.requiresMetro, false);
  assert.equal(native.standalonePreviewApk.distributionReady, false);
});

await check("standalone_android_bundle_contains_no_absolute_user_path_or_credential_shape", async () => {
  const preview = path.join(ROOT, sliceReports[142].standalonePreviewApk.relativePath);
  const result = await run("unzip", ["-p", preview, "assets/index.android.bundle"], {
    encoding: "buffer",
    maxBuffer: 32 * 1024 * 1024,
  });
  const bundle = Buffer.from(result.stdout).toString("latin1");
  for (const pattern of [
    /\/Users\/[^/\0]+\//u,
    /\bsk-(?:proj|live|test)-[A-Za-z0-9_-]{16,}\b/u,
    /\bAKIA[0-9A-Z]{16}\b/u,
    /\bAIza[0-9A-Za-z_-]{30,}\b/u,
    /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/u,
    /\bBearer\s+[A-Za-z0-9._~-]{24,}\b/u,
  ]) assert(!pattern.test(bundle), `standalone bundle leaked ${pattern}`);
});

await check("no_ticket_14_path_runs_provider_skill_dsh_muzero_self_play_or_training", () => {
  for (const slice of [128, 129, 130, 131, 133, 136, 140, 141]) {
    const report = sliceReports[slice];
    for (const field of [
      "providerCalled", "skillGenerated", "dshRun", "muzeroDataGenerated",
      "selfPlayRun", "trainingTruth",
    ]) assert.notEqual(gate(report, field), true, `Slice ${slice} widened ${field}`);
  }
  for (const field of [
    "providerCalled", "skillGenerated", "dshRun", "muzeroDataGenerated",
    "selfPlayRun", "trainingTruth",
  ]) assert.equal(sliceReports[142].authority[field], false, `Native widened ${field}`);
  assert.equal(sliceReports[142].authority.byokCredentialEmbedded, false);
});

await check("ticket_14_handoff_is_hash_sealed_and_preserves_ticket_15_16_17_18_seams", () => {
  const handoff = STARCRAFT_TMG_TICKET_14_CLIENT_HANDOFF_V1;
  assert.equal(hashStarcraftTmgContract(without(handoff, "handoffHash")), handoff.handoffHash);
  assert.deepEqual(handoff.ticket15OnlineAgent.modes,
    ["tutor", "opponent", "commentator", "companion"]);
  assert.equal(handoff.ticket15OnlineAgent.mountsThroughExistingClientDomainInterface, true);
  assert(handoff.ticket15OnlineAgent.cannotOwn.includes("human_confirmation"));
  assert(handoff.ticket15OnlineAgent.cannotOwn.includes("provider_credentials"));
  assert.equal(handoff.ticket16Byok.credentialMayEnterClientProjectionCacheLogReceiptOrApk, false);
  assert.equal(handoff.laterBoundaries.dshMayRunOnlyForOfflineSkillGeneration, true);
  assert.equal(handoff.laterBoundaries.largeScaleSkillProductionRequiresFreshUserConfirmation, true);
});

await check("device_deferral_is_visible_non_waiving_and_does_not_block_ticket_15_start", () => {
  const native = sliceReports[142];
  const handoff = STARCRAFT_TMG_TICKET_14_CLIENT_HANDOFF_V1;
  assert.equal(handoff.deferredDeviceGate.userDirectedDeferral, true);
  assert.equal(handoff.deferredDeviceGate.waived, false);
  assert.equal(handoff.deferredDeviceGate.formalTicket14CompletionAllowed, false);
  assert.equal(handoff.ticket15OnlineAgent.mayBeginBeforeDeferredDeviceGate, true);
  if (REQUIRE_DEVICE) {
    assert.equal(native.deviceEvidence.satisfied, true, "physical Android gate remains open");
  } else {
    assert.equal(native.deviceEvidence.satisfied, false,
      "deferred aggregate expected an explicitly open physical-device gate");
  }
});

await check("production_and_training_claims_remain_closed", () => {
  assert.equal(STARCRAFT_TMG_TICKET_14_CLIENT_HANDOFF_V1.authority.productionReady, false);
  assert.equal(STARCRAFT_TMG_TICKET_14_CLIENT_HANDOFF_V1.authority.trainingTruth, false);
  assert.equal(adjacent.faq.productionRoomTruth, false);
  assert.equal(adjacent.faq.trainingTruth, false);
  assert.equal(sliceReports[142].authority.distributionReady, false);
});

const baseAssertions = Object.values(SLICES)
  .reduce((sum, [, denominator]) => sum + denominator, 0);
const formalComplete = failures.length === 0 && REQUIRE_DEVICE
  && sliceReports[142].deviceEvidence.satisfied;
const reportCore = {
  schemaVersion: "starcraft_tmg_ticket_14_closure_verification_v1",
  generatedAt: "2026-09-03T21:00:00.000Z",
  ticket: 14,
  slice: 143,
  status: failures.length > 0 ? "failed"
    : formalComplete ? "complete"
      : "web_and_build_development_complete_device_acceptance_deferred",
  ticketProgress: formalComplete ? "16/16" : "15/16",
  projectProgress: formalComplete ? "14/22" : "13/22",
  assertionsPassed: checks.filter((entry) => entry.passed).length,
  assertionsTotal: checks.length,
  checks,
  failures,
  evidenceDenominator: {
    priorSliceReports: Object.keys(SLICES).length,
    priorSliceAssertions: baseAssertions,
    aggregateAssertions: baseAssertions + checks.length,
  },
  sliceReportHashes: Object.fromEntries(Object.entries(sliceReports).map(
    ([slice, report]) => [slice, report.reportHash ?? report.receiptHash],
  )),
  adjacentEvidence: {
    ticket11Status: adjacent.ticket11.status,
    ticket12ReportHash: adjacent.ticket12.reportHash,
    ticket13ReportHash: adjacent.ticket13.reportHash,
    faqAggregateHash:
      STARCRAFT_TMG_OFFICIAL_FAQ_CURRENT_CLIENT_CONTRACT_V1.aggregateHash,
    browserReportHash: adjacent.browser.reportHash,
  },
  handoffHash: STARCRAFT_TMG_TICKET_14_CLIENT_HANDOFF_V1.handoffHash,
  deferredDeviceGate: {
    allowedForThisRun: ALLOW_DEFERRED_DEVICE,
    waived: false,
    androidPhysicalSatisfied: sliceReports[142].deviceEvidence.satisfied,
    iosFullXcodeAvailable: sliceReports[142].iosEnvironment.fullXcodeAvailable,
    ticket15MayBegin: failures.length === 0,
  },
  authority: {
    sourceRefreshPerformed: false,
    providerCalled: false,
    byokCredentialEmbedded: false,
    skillGenerated: false,
    dshRun: false,
    muzeroDataGenerated: false,
    selfPlayRun: false,
    trainingTruth: false,
    productionReady: false,
  },
};
const report = { ...reportCore, reportHash: hashStarcraftTmgContract(reportCore) };
await mkdir(path.dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(
  `Ticket 14 Slice 143 aggregate ${report.assertionsPassed}/${report.assertionsTotal}; ${report.status}; ${report.reportHash}\n`,
);
if (failures.length) throw new Error(`TICKET_14_CLOSURE_FAILED\n${failures.join("\n")}`);
