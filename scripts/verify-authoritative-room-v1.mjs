#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createStarcraftTmgAuthoritativeEngine,
  hashStarcraftTmgContract,
} from "../packages/authoritative-engine/transition-v1.mjs";
import { createStarcraftTmgRoomRuntime } from "../packages/room-runtime/in-memory-room-v1.mjs";
import {
  createStarcraftTmgSampleState,
  loadStarcraftTmgData,
} from "../../scripts/starcraft-tmg-rules-v0.mjs";

const LEVEL3_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROJECT_ROOT = path.resolve(LEVEL3_ROOT, "..");
const OCCURRED_AT = "2026-08-24T01:00:00.000Z";
const REPORT_PATH = path.join(LEVEL3_ROOT, "build", "authoritative-room-v1", "report.json");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function movementProposal(domain, deltaY = -500) {
  return {
    kind: "parameterized",
    domainId: domain.domainId,
    parameters: {
      path: [
        { ...domain.constraints.start },
        {
          xMilliInches: domain.constraints.start.xMilliInches,
          yMilliInches: domain.constraints.start.yMilliInches + Math.trunc(deltaY / 2),
        },
        {
          xMilliInches: domain.constraints.start.xMilliInches,
          yMilliInches: domain.constraints.start.yMilliInches + deltaY,
        },
      ],
    },
  };
}

async function main() {
  const data = await loadStarcraftTmgData(PROJECT_ROOT);
  const state = createStarcraftTmgSampleState(data);
  state.board.terrain = [];
  state.activeSideKey = "player2";
  const engine = createStarcraftTmgAuthoritativeEngine({ now: () => OCCURRED_AT });
  const runtime = createStarcraftTmgRoomRuntime({ authorityEngine: engine, now: () => OCCURRED_AT });
  const checks = [];
  const failures = [];
  const roomId = "authoritative-room-verifier";
  const serverSeatPlan = [
    { label: "host", seatKey: "player1", roleMode: "player", principalType: "human" },
    { label: "opponent", seatKey: "player2", roleMode: "opponent", principalType: "model" },
    { label: "opponentSupervisor", seatKey: "player2", roleMode: "supervisor", principalType: "human" },
    { label: "tutor", seatKey: "player1", roleMode: "tutor", principalType: "model" },
  ];
  const initialStateAuthority = {
    source: "server_factory",
    state,
    dataVersion: data.version,
    receiptHash: hashStarcraftTmgContract({
      source: "authoritative-room-compatibility-verifier-v2",
      state,
    }),
    serverSeatPlan,
  };

  async function check(id, fn) {
    try {
      await fn();
      checks.push({ id, ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      checks.push({ id, ok: false, error: message });
      failures.push(`${id}: ${message}`);
    }
  }

  let created = null;
  let opponentProjection = null;
  let firstLegal = null;
  let firstPreview = null;
  let firstApply = null;
  let confirmation = null;

  await check("room_creation_uses_server_state_and_declares_non_production_durability", async () => {
    created = await runtime.createRoom({
      roomId,
      gameId: "starcraft-tmg",
      surfaceMode: "classic",
      initialStateAuthority,
      serverSeatPlan,
    });
    assert(created.ok, `room create rejected: ${created.reason || "unknown"}`);
    assert(created.room.stateRevision === 0 && created.room.acceptedReceiptCount === 0, "new room must begin at state revision zero with no accepted receipts");
    assert(created.room.durability === "process_memory_test_only", "room durability must be explicit");
    assert(created.room.productionReady === false && created.room.trainingTruth === false, "compatibility room overclaimed authority");
    assert(created.matchBinding.refereeSignature.signatureAlgorithm === "ed25519", "room MatchBinding is not permanently signed");
  });

  await check("opponent_grant_is_scoped_and_cannot_auto_mutate", async () => {
    const opponent = created.credentials.opponent;
    opponentProjection = await runtime.readRoom({ roomId, seatToken: opponent.seatToken });
    assert(opponentProjection.ok, `room projection rejected: ${opponentProjection.reason || "unknown"}`);
    const capabilities = opponentProjection.projection.viewer.capabilities;
    assert(capabilities.includes("submit_decision") && capabilities.includes("preview"), "Opponent grant cannot submit a bounded decision preview");
    assert(!capabilities.includes("confirm") && !capabilities.includes("apply"), "Opponent grant can confirm or apply");
    assert(Object.keys(opponentProjection.projection.state.cardResources).every((key) => key === "player2"), "Opponent projection leaked another seat's private resources");
    assert(opponentProjection.projection.training.trainingTruth === false, "room projection overclaimed training truth");
  });

  await check("opponent_preview_is_legal_and_human_confirmation_bound", async () => {
    const opponent = created.credentials.opponent;
    firstLegal = await runtime.legalSpace({ roomId, seatToken: opponent.seatToken });
    assert(firstLegal.ok, `LegalSpace rejected: ${firstLegal.reason || "unknown"}`);
    const moveDomain = firstLegal.legalSpace.parameterDomains.find((domain) => domain.actionType === "move");
    assert(moveDomain, "expected an enabled Rules-owned movement domain for the active Opponent seat");
    firstPreview = await runtime.previewAction({
      roomId,
      seatToken: opponent.seatToken,
      proposal: movementProposal(moveDomain),
      occurredAt: OCCURRED_AT,
    });
    assert(firstPreview.ok && firstPreview.confirmationRequired, `preview rejected or unguarded: ${firstPreview.reason || "unknown"}`);
    const deniedControl = await runtime.claimControl({
      roomId,
      seatToken: opponent.seatToken,
      sessionId: "opponent-model-session",
    });
    assert(!deniedControl.ok && deniedControl.reason === "CAPABILITY_DENIED", `expected model ControlLease denial, got ${deniedControl.reason}`);
    const unchanged = await runtime.readRoom({ roomId });
    assert(unchanged.projection.room.stateRevision === 0 && unchanged.projection.room.acceptedReceiptCount === 0, "Opponent preview/control denial mutated rules state");
  });

  await check("confirmed_opponent_action_appends_signed_receipt", async () => {
    const supervisor = created.credentials.opponentSupervisor;
    confirmation = await runtime.confirmPreview({
      roomId,
      seatToken: supervisor.seatToken,
      previewId: firstPreview.preview.previewId,
      occurredAt: OCCURRED_AT,
    });
    assert(confirmation.ok, `human supervisor confirmation rejected: ${confirmation.reason || "unknown"}`);
    const claimed = await runtime.claimControl({
      roomId,
      seatToken: supervisor.seatToken,
      sessionId: "opponent-supervisor-web",
    });
    assert(claimed.ok, `human supervisor ControlLease rejected: ${claimed.reason || "unknown"}`);
    firstApply = await runtime.applyAction({
      roomId,
      seatToken: supervisor.seatToken,
      previewId: firstPreview.preview.previewId,
      confirmationId: confirmation.confirmation.confirmationId,
      leaseId: claimed.controlLease.leaseId,
      leaseFence: claimed.controlLease.leaseFence,
      expectedStateRevision: 0,
      idempotencyKey: "authoritative-room-opponent-move-1",
      occurredAt: OCCURRED_AT,
    });
    assert(firstApply.ok, `confirmed apply rejected: ${firstApply.reason || "unknown"}`);
    assert(firstApply.room.stateRevision === 1 && firstApply.room.acceptedReceiptCount === 1, "confirmed apply did not advance the accepted receipt chain");
    assert(firstApply.receipt.refereeSignature.signatureAlgorithm === "ed25519", "accepted room receipt is not Ed25519 signed");
    assert(firstApply.receipt.confirmationProofHash, "Opponent receipt lost the human confirmation proof");
    assert(firstApply.trainingTruth === false, "raw accepted room receipt overclaimed training truth");
    const publicView = await runtime.readRoom({ roomId, includeJournal: true });
    assert(publicView.projection.publicJournal.some((entry) => entry.payload.type === "accepted_transition"), "accepted transition is absent from the public projection journal");
  });

  await check("read_only_role_cannot_preview_or_apply", async () => {
    const tutor = created.credentials.tutor;
    const tutorView = await runtime.readRoom({ roomId, seatToken: tutor.seatToken });
    assert(tutorView.ok && !tutorView.projection.viewer.capabilities.includes("preview"), "Tutor unexpectedly owns preview capability");
    const tutorPreview = await runtime.previewAction({
      roomId,
      seatToken: tutor.seatToken,
      proposal: { kind: "finite", actionKey: "must-not-reach-rules" },
      occurredAt: OCCURRED_AT,
    });
    assert(!tutorPreview.ok && tutorPreview.reason === "CAPABILITY_DENIED", `expected CAPABILITY_DENIED, got ${tutorPreview.reason}`);
    const unchanged = await runtime.readRoom({ roomId });
    assert(unchanged.projection.room.stateRevision === 1 && unchanged.projection.room.acceptedReceiptCount === 1, "read-only role mutated room state");
  });

  await check("room_receipts_round_trip_to_current_state", async () => {
    const replayed = await runtime.replayRoom({ roomId });
    assert(replayed.ok, `room replay rejected: ${replayed.reason || "unknown"}`);
    assert(replayed.matchesCurrent === true && replayed.receiptCount === 1, "room replay did not match the current authority envelope");
  });

  await check("health_does_not_claim_persistence_or_training_truth", async () => {
    const health = await runtime.health();
    assert(health.healthy && health.store.roomCount === 1, "room runtime health mismatch");
    assert(health.durability === "process_memory_test_only" && health.productionReady === false, "health overclaimed durability");
    assert(health.trainingTruth === false, "health overclaimed training truth");
  });

  const health = await runtime.health();
  const report = {
    schemaVersion: "starcraft_tmg_authoritative_room_compatibility_verifier_v2",
    generatedAt: new Date().toISOString(),
    checks,
    failures,
    ok: failures.length === 0,
    evidence: {
      roomId,
      initialStateHash: opponentProjection?.projection?.room?.stateHash || null,
      firstLegalSpaceHash: firstLegal?.legalSpace?.legalSpaceHash || null,
      firstPreviewId: firstPreview?.preview?.previewId || null,
      confirmationId: confirmation?.confirmation?.confirmationId || null,
      firstReceiptHash: firstApply?.receipt?.journalHash || null,
      durability: health.durability,
      seatGrantVerified: true,
      controlLeaseVerified: true,
      legacySecurityBypassUsed: false,
      eligibleForTraining: false,
      trainingTruth: false,
    },
    harness: {
      harnessLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      promptPackRoutes: ["opponent_prompt", "novice_teacher_prompt"],
      harnessToolsCalled: [
        "read_board_state",
        "list_legal_actions",
        "preview_action",
        "apply_action_after_user_confirmation",
        "replay_room",
      ],
      uiTraceEvidence: "not_run_room_authority_compatibility_only",
      agentDecisionEvidence: "fixture proposal exercised Opponent capability and human-confirmation boundaries; no model inference was run",
      memoryTraceEvidence: { refs: [], promotionAttempted: false },
      trainingTraceCandidates: 0,
      rollbackOrDemotionRules: [
        "fail if a model-facing grant gains confirm or apply",
        "fail if replay no longer matches the accepted receipt chain",
      ],
      userVisibleChecks: "not_run_room_authority_compatibility_only",
    },
  };
  await mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  if (!report.ok) throw new Error(failures.join("\n"));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
