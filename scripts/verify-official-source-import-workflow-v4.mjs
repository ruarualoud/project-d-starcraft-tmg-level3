#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import {
  classifyStarcraftTmgSourceRevisionDiffV4,
  createStarcraftTmgExplicitSourceImportWorkflowV4,
  createStarcraftTmgSourceImportCommandV4,
  createStarcraftTmgSourceRevisionManifestV4,
  createStarcraftTmgVerifiedSourceRevisionManifestV4,
  replayStarcraftTmgSourceImportLedgerV4,
  verifyStarcraftTmgSourceRevisionManifestV4,
} from "../packages/source-data/official-source-import-workflow-v4.mjs";
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from
  "./support/official-development-tranche-source-lock-fixture-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_PATH = path.join(ROOT, "build/ticket-12-source-import-v4/report.json");
const T0 = "2026-09-02T16:00:00.000Z";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function rawCaptures(lock) {
  return Object.entries({
    ...lock.firestore,
    ...lock.binaries,
    ...lock.texts,
  }).map(([sourceId, record]) => ({
    sourceId,
    sourceClass: Object.hasOwn(lock.firestore, sourceId)
      ? "firestore"
      : Object.hasOwn(lock.binaries, sourceId) ? "binary" : "text",
    byteHash: record.byteHash,
    byteLength: record.byteLength,
  }));
}

function changedHash(label) {
  return hashStarcraftTmgContract({ syntheticOfflineVerifierValue: label });
}

function candidateFrom(base, {
  captureId,
  capturedAt,
  mutateRecords = () => {},
  mutateVersions = () => {},
  changedSourceId = "faction_cards",
}) {
  const records = clone(base.recordIndex);
  const versions = clone(base.dataVersions);
  const captures = clone(base.rawCaptures);
  mutateRecords(records);
  mutateVersions(versions);
  const raw = captures.find((entry) => entry.sourceId === changedSourceId);
  raw.byteHash = changedHash(`${captureId}:raw`);
  raw.byteLength += 1;
  return createStarcraftTmgSourceRevisionManifestV4({
    captureId,
    capturedAt,
    sourceSnapshotHash: changedHash(`${captureId}:snapshot`),
    normalizedDatasetHash: changedHash(`${captureId}:dataset`),
    dataVersions: versions,
    rawCaptures: captures,
    recordIndex: records,
    upstreamVerificationHash: changedHash(`${captureId}:upstream-verification`),
  });
}

function command(workflow, kind, targetRevisionHash, index) {
  return createStarcraftTmgSourceImportCommandV4({
    commandId: `ticket12-s114-${index}`,
    kind,
    principalId: "source-admin-1",
    issuedAt: new Date(Date.parse(T0) + index * 1000).toISOString(),
    reason: "explicit Ticket 12 offline workflow verification",
    expectedPointerHash: workflow.inspect().currentPointer.pointerHash,
    targetRevisionHash,
    explicitUserCommand: true,
    trigger: "human_cli",
  });
}

const frozen = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root: ROOT });
const base = createStarcraftTmgVerifiedSourceRevisionManifestV4({
  captureId: frozen.lock.captureId,
  snapshot: frozen.snapshot,
  dataset: frozen.dataset,
  rawCaptures: rawCaptures(frozen.lock),
  upstreamVerificationHash: frozen.audit.auditHash,
});
const displayCandidate = candidateFrom(base, {
  captureId: "offline-synthetic-display-candidate",
  capturedAt: "2026-09-02T16:01:00.000Z",
  mutateRecords(records) {
    const record = records.find((entry) => entry.authorityDisposition === "community_display_only");
    record.payloadHash = changedHash("community-display-value");
    record.sourceRecordHash = changedHash("community-display-record");
  },
});
const officialCandidate = candidateFrom(displayCandidate, {
  captureId: "offline-synthetic-official-candidate",
  capturedAt: "2026-09-02T16:02:00.000Z",
  changedSourceId: "army_units",
  mutateRecords(records) {
    const adept = records.find((entry) => entry.recordKey === "army_units:adept");
    adept.payloadHash = changedHash("official-adept-value");
    adept.sourceRecordHash = changedHash("official-adept-record");
  },
  mutateVersions(versions) {
    versions.unitsVersion = String(Number(versions.unitsVersion) + 1);
  },
});
const schemaCandidate = candidateFrom(displayCandidate, {
  captureId: "offline-synthetic-schema-candidate",
  capturedAt: "2026-09-02T16:03:00.000Z",
  changedSourceId: "army_units",
  mutateRecords(records) {
    const adept = records.find((entry) => entry.recordKey === "army_units:adept");
    adept.schemaHash = changedHash("unreviewed-adept-schema");
    adept.payloadHash = changedHash("unreviewed-adept-payload");
    adept.sourceRecordHash = changedHash("unreviewed-adept-record");
  },
});

const checks = [];
const failures = [];
async function check(id, fn) {
  try {
    await fn();
    checks.push({ id, passed: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    checks.push({ id, passed: false, error: message });
    failures.push(`${id}: ${message}`);
  }
}

let workflow;
let oldPin;
let newPin;
let ledger;

await check("frozen_source_builds_an_immutable_verified_revision_manifest", () => {
  verifyStarcraftTmgSourceRevisionManifestV4(base);
  assert(base.revisionHash && base.recordIndex.length === 271, "base revision denominator mismatch");
  assert(base.rawCaptures.length === 20, "raw capture denominator mismatch");
  assert(base.sourceSnapshotHash === frozen.snapshot.snapshotHash, "snapshot binding lost");
  assert(base.normalizedDatasetHash === frozen.dataset.datasetHash, "dataset binding lost");
  assert(base.sourceRefreshPolicy === "explicit_user_command_only", "refresh policy widened");
  assert(base.repositoryFallbackAllowed === false && base.silentReplacementAllowed === false, "fallback/replacement widened");
});

await check("tampered_raw_capture_or_manifest_is_rejected", () => {
  const tampered = clone(base);
  tampered.rawCaptures[0].byteLength += 1;
  let rejected = false;
  try {
    verifyStarcraftTmgSourceRevisionManifestV4(tampered);
  } catch (error) {
    rejected = String(error?.message || error).includes("SOURCE_REVISION_MANIFEST_INVALID");
  }
  assert(rejected, "tampered raw capture was accepted");
});

await check("automatic_or_unbound_import_commands_fail_before_staging", () => {
  workflow = createStarcraftTmgExplicitSourceImportWorkflowV4({ initialRevision: base });
  let automaticRejected = false;
  try {
    createStarcraftTmgSourceImportCommandV4({
      commandId: "automatic-refresh",
      kind: "stage_source_revision",
      principalId: "scheduler",
      issuedAt: T0,
      reason: "scheduled refresh",
      expectedPointerHash: workflow.inspect().currentPointer.pointerHash,
      targetRevisionHash: displayCandidate.revisionHash,
      explicitUserCommand: false,
      trigger: "scheduler",
    });
  } catch (error) {
    automaticRejected = String(error?.message || error).includes("EXPLICIT_USER_COMMAND_REQUIRED");
  }
  assert(automaticRejected, "automatic refresh command was accepted");
  assert(workflow.inspect().revisionCount === 1, "failed command changed revision state");
});

await check("same_version_community_drift_is_display_review_only", () => {
  const diff = classifyStarcraftTmgSourceRevisionDiffV4(base, displayCandidate);
  assert(diff.classification === "same_version_display_only_drift", "display drift misclassified");
  assert(diff.disposition === "display_review_required", "display review was bypassed");
  assert(diff.counts.communityDisplayOnly === 1 && diff.counts.officialProduct === 0, "display drift scope mismatch");
  assert(diff.canAffectRules === false && diff.trainingTruth === false, "display drift gained authority");
});

await check("review_and_cas_promotion_never_silently_replace_current", () => {
  oldPin = workflow.pinRoom({ roomId: "room-before-import", pinnedAt: T0 });
  const before = workflow.inspect().currentPointer;
  const item = workflow.stage({
    command: command(workflow, "stage_source_revision", displayCandidate.revisionHash, 1),
    candidateRevision: displayCandidate,
  });
  assert(workflow.inspect().currentPointer.pointerHash === before.pointerHash, "stage silently replaced pointer");
  const receipt = workflow.review({
    reviewItemHash: item.reviewItemHash,
    decision: "approve",
    reviewerPrincipalId: "independent-display-reviewer",
    reviewedAt: "2026-09-02T16:00:02.000Z",
    evidence: { displayReviewHash: changedHash("display-review") },
  });
  assert(workflow.inspect().currentPointer.pointerHash === before.pointerHash, "review silently replaced pointer");
  workflow.promote({
    command: command(workflow, "promote_source_revision", displayCandidate.revisionHash, 3),
    reviewReceiptHash: receipt.reviewReceiptHash,
  });
  assert(workflow.inspect().currentPointer.revisionHash === displayCandidate.revisionHash, "approved revision not promoted");
});

await check("official_value_drift_requires_independent_scope_semantic_and_rights_review", () => {
  const item = workflow.stage({
    command: command(workflow, "stage_source_revision", officialCandidate.revisionHash, 4),
    candidateRevision: officialCandidate,
  });
  assert(item.diff.classification === "official_product_value_drift", "official drift misclassified");
  let unreviewedRejected = false;
  try {
    workflow.review({
      reviewItemHash: item.reviewItemHash,
      decision: "approve",
      reviewerPrincipalId: "incomplete-reviewer",
      reviewedAt: "2026-09-02T16:00:05.000Z",
      evidence: {},
    });
  } catch (error) {
    unreviewedRejected = String(error?.message || error).includes("SCOPE_REVIEW_REQUIRED");
  }
  assert(unreviewedRejected, "official value drift bypassed independent review evidence");
  const receipt = workflow.review({
    reviewItemHash: item.reviewItemHash,
    decision: "approve",
    reviewerPrincipalId: "independent-source-reviewer",
    reviewedAt: "2026-09-02T16:00:06.000Z",
    evidence: {
      scopeReviewHash: changedHash("official-scope-review"),
      semanticReviewHash: changedHash("official-semantic-review"),
      rightsReviewStatus: "independently_reviewed",
    },
  });
  assert(receipt.decision === "approve", "complete independent review failed");
  assert(workflow.inspect().currentPointer.revisionHash === displayCandidate.revisionHash, "review auto-promoted official drift");
});

await check("schema_drift_is_quarantined_and_cannot_be_approved", () => {
  const item = workflow.stage({
    command: command(workflow, "stage_source_revision", schemaCandidate.revisionHash, 7),
    candidateRevision: schemaCandidate,
  });
  assert(item.diff.classification === "schema_drift" && item.diff.disposition === "quarantined", "schema drift not quarantined");
  let rejected = false;
  try {
    workflow.review({
      reviewItemHash: item.reviewItemHash,
      decision: "approve",
      reviewerPrincipalId: "schema-reviewer",
      reviewedAt: "2026-09-02T16:00:08.000Z",
      evidence: {
        scopeReviewHash: changedHash("schema-scope"),
        semanticReviewHash: changedHash("schema-semantic"),
        rightsReviewStatus: "independently_reviewed",
      },
    });
  } catch (error) {
    rejected = String(error?.message || error).includes("QUARANTINE_NOT_PROMOTABLE");
  }
  assert(rejected, "schema quarantine was promotable");
});

await check("room_pins_survive_promotion_and_exact_rollback", () => {
  newPin = workflow.pinRoom({ roomId: "room-after-import", pinnedAt: "2026-09-02T16:00:09.000Z" });
  const rollback = workflow.rollback({
    command: command(workflow, "rollback_source_revision", base.revisionHash, 10),
  });
  assert(rollback.kind === "rollback", "rollback receipt missing");
  assert(workflow.inspect().currentPointer.revisionHash === base.revisionHash, "rollback did not restore exact revision");
  assert(workflow.resolveRoom("room-before-import").revision.revisionHash === base.revisionHash, "old room pin changed");
  assert(workflow.resolveRoom("room-after-import").revision.revisionHash === displayCandidate.revisionHash, "new room pin changed after rollback");
  assert(oldPin.roomPinHash !== newPin.roomPinHash, "room pins collided");
});

await check("stored_capture_ledger_replays_offline_with_exact_pointer_and_room_bindings", () => {
  ledger = workflow.exportLedger();
  const replay = replayStarcraftTmgSourceImportLedgerV4(ledger);
  assert(replay.ok && replay.offlineReplay, "offline ledger replay failed");
  assert(replay.currentRevisionHash === base.revisionHash, "offline replay pointer mismatch");
  assert(replay.revisionCount === 4 && replay.roomPinCount === 2, "offline replay denominator mismatch");
});

await check("ledger_tamper_fails_closed", () => {
  const tampered = clone(ledger);
  tampered.currentPointer.generation += 1;
  let rejected = false;
  try {
    replayStarcraftTmgSourceImportLedgerV4(tampered);
  } catch (error) {
    rejected = String(error?.message || error).includes("SOURCE_IMPORT_LEDGER_INVALID");
  }
  assert(rejected, "tampered ledger replayed");
});

await check("workflow_remains_display_only_and_training_ineligible", () => {
  const inspection = workflow.inspect();
  assert(inspection.rulesEligible === false && inspection.trainingTruth === false, "source workflow gained Rules/training authority");
  assert(inspection.sourceRefreshPolicy === "explicit_user_command_only", "refresh policy changed");
  assert(inspection.silentReplacementAllowed === false, "silent replacement became allowed");
});

const report = {
  schema: "starcraft_tmg_ticket_12_slice_114_source_import_verification_v1",
  generatedAt: "2026-09-02T16:10:00.000Z",
  ticket: 12,
  slice: 114,
  status: failures.length === 0 ? "passed" : "failed",
  frozenSourceRefreshPerformed: false,
  sourceRevisionHash: base.revisionHash,
  displayCandidateRevisionHash: displayCandidate.revisionHash,
  ledgerHash: ledger?.ledgerHash || null,
  checks,
  counts: {
    assertions: checks.length,
    passed: checks.filter((entry) => entry.passed).length,
    failed: failures.length,
    frozenRecords: base.recordIndex.length,
    rawCaptures: base.rawCaptures.length,
    workflowRevisions: workflow?.inspect().revisionCount || 0,
    roomPins: workflow?.inspect().roomPinCount || 0,
  },
  ctx2skill: {
    ctx2skillLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    roleRoutes: ["fact_probe"],
    skillsRead: 0,
    skillsGenerated: 0,
    judgeTests: checks.length,
    crossTimeReplayResult: failures.length === 0 ? "passed" : "failed",
    promotions: [],
    blocks: ["ticket_12_source_workflow_cannot_promote_rules_or_training_truth"],
    remainingRuleGaps: 0,
  },
  dshUsed: false,
  muzeroUsed: false,
  selfPlayUsed: false,
  trainingPromotion: false,
  failures,
};
report.reportHash = hashStarcraftTmgContract(report);
await mkdir(path.dirname(REPORT_PATH), { recursive: true });
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) process.exitCode = 1;
