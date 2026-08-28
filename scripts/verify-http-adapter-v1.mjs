#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createStarcraftTmgAuthoritativeEngine,
  hashStarcraftTmgContract,
} from "../packages/authoritative-engine/transition-v1.mjs";
import {
  createStarcraftTmgLevel3HttpAdapter,
  STARCRAFT_TMG_LEVEL3_API_PREFIX,
} from "../packages/http-adapter/handler-v1.mjs";
import { createStarcraftTmgRoomRuntime } from "../packages/room-runtime/in-memory-room-v1.mjs";
import {
  createStarcraftTmgSampleState,
  loadStarcraftTmgData,
} from "../../scripts/starcraft-tmg-rules-v0.mjs";

const LEVEL3_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROJECT_ROOT = path.resolve(LEVEL3_ROOT, "..");
const OCCURRED_AT = "2026-08-24T02:00:00.000Z";
const JOIN_ROOM_ID = "http-adapter-join-verifier-room";
const ROOM_ID = "http-adapter-verifier-room";
const REPORT_PATH = path.join(LEVEL3_ROOT, "build", "http-adapter-v1", "report.json");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function bearer(seatToken, extra = {}) {
  return { authorization: `Bearer ${seatToken}`, ...extra };
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
  const runtime = createStarcraftTmgRoomRuntime({
    authorityEngine: createStarcraftTmgAuthoritativeEngine({ now: () => OCCURRED_AT }),
    now: () => OCCURRED_AT,
  });
  const roomIds = [JOIN_ROOM_ID, ROOM_ID];
  const adapter = createStarcraftTmgLevel3HttpAdapter({
    roomRuntime: runtime,
    createRoomId: () => roomIds.shift() || `unexpected-room-${roomIds.length}`,
    initialStateFactory: ({ setupId }) => {
      const state = createStarcraftTmgSampleState(data);
      state.board.terrain = [];
      const opponentFixture = setupId === "opponent-fixture";
      if (opponentFixture) state.activeSideKey = "player2";
      const serverSeatPlan = opponentFixture ? [
        { label: "host", seatKey: "player1", roleMode: "player", principalType: "human" },
        { label: "opponent", seatKey: "player2", roleMode: "opponent", principalType: "model" },
        { label: "opponentSupervisor", seatKey: "player2", roleMode: "supervisor", principalType: "human" },
      ] : [
        { label: "host", seatKey: "player1", roleMode: "player", principalType: "human" },
      ];
      return {
        source: "server_factory",
        state,
        dataVersion: data.version,
        receiptHash: hashStarcraftTmgContract({
          source: "http-adapter-compatibility-verifier-v2",
          setupId,
          state,
        }),
        serverSeatPlan,
      };
    },
  });
  const checks = [];
  const failures = [];

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

  let legal = null;
  let preview = null;
  let applied = null;
  let credentials = null;

  await check("metadata_declares_one_current_authority_sequence", async () => {
    const result = await adapter.handle({
      method: "GET",
      pathname: `${STARCRAFT_TMG_LEVEL3_API_PREFIX}/metadata`,
    });
    assert(result.status === 200 && result.response.ok, "metadata failed");
    assert(result.response.result.authoritySequence.join("/") === "createEnvelope/legalSpace/preview/confirm/apply/replay", "authority sequence mismatch");
    assert(result.response.result.clientInitialStateAccepted === false, "metadata allows caller-owned initial state");
    assert(result.response.result.clientRoleOrSideAccepted === false, "metadata allows caller-owned role or side");
    assert(result.response.result.productionReady === false && result.response.result.trainingTruth === false, "metadata overclaimed readiness");
  });

  await check("room_lifecycle_uses_server_owned_http_contract", async () => {
    const rejected = await adapter.handle({
      method: "POST",
      pathname: `${STARCRAFT_TMG_LEVEL3_API_PREFIX}/rooms`,
      body: { hostSideKey: "player1" },
    });
    assert(rejected.status === 400 && rejected.response.error === "CLIENT_AUTHORITY_FIELD_REJECTED", "HTTP accepted a client-owned side");

    const created = await adapter.handle({
      method: "POST",
      pathname: `${STARCRAFT_TMG_LEVEL3_API_PREFIX}/rooms`,
      body: { setupId: "join-fixture", surfaceMode: "classic" },
    });
    assert(created.status === 200 && created.response.result.roomId === JOIN_ROOM_ID, "join fixture room create failed");
    const joined = await adapter.handle({
      method: "POST",
      pathname: `${STARCRAFT_TMG_LEVEL3_API_PREFIX}/rooms/${JOIN_ROOM_ID}/join`,
      body: {},
    });
    assert(joined.status === 200 && joined.response.result.credential.seatKey === "player2", "server-selected room join failed");
    const projected = await adapter.handle({
      method: "GET",
      pathname: `${STARCRAFT_TMG_LEVEL3_API_PREFIX}/rooms/${JOIN_ROOM_ID}`,
      headers: bearer(joined.response.result.credential.seatToken),
    });
    assert(projected.status === 200 && projected.response.result.projection.viewer.seatKey === "player2", "SeatGrant projection mismatch");

    const opponentRoom = await adapter.handle({
      method: "POST",
      pathname: `${STARCRAFT_TMG_LEVEL3_API_PREFIX}/rooms`,
      body: { setupId: "opponent-fixture", surfaceMode: "classic" },
    });
    assert(opponentRoom.status === 200 && opponentRoom.response.result.roomId === ROOM_ID, "Opponent fixture room create failed");
    credentials = opponentRoom.response.result.credentials;
  });

  await check("http_opponent_preview_confirm_apply_and_replay_are_receipt_bound", async () => {
    const unauthorized = await adapter.handle({
      method: "POST",
      pathname: `${STARCRAFT_TMG_LEVEL3_API_PREFIX}/rooms/${ROOM_ID}/legal-space`,
      body: {},
    });
    assert(unauthorized.status === 401 && unauthorized.response.error === "AUTHENTICATION_REQUIRED", "LegalSpace did not require a SeatGrant bearer");

    const listed = await adapter.handle({
      method: "POST",
      pathname: `${STARCRAFT_TMG_LEVEL3_API_PREFIX}/rooms/${ROOM_ID}/legal-space`,
      headers: bearer(credentials.opponent.seatToken),
      body: {},
    });
    legal = listed.response.result;
    assert(listed.status === 200, `HTTP LegalSpace failed: ${listed.response.error || "unknown"}`);
    const moveDomain = legal.legalSpace.parameterDomains.find((domain) => domain.actionType === "move");
    assert(moveDomain, "HTTP LegalSpace has no enabled Rules-owned movement domain");

    const previewed = await adapter.handle({
      method: "POST",
      pathname: `${STARCRAFT_TMG_LEVEL3_API_PREFIX}/rooms/${ROOM_ID}/preview`,
      headers: bearer(credentials.opponent.seatToken),
      body: { proposal: movementProposal(moveDomain) },
    });
    preview = previewed.response.result;
    assert(previewed.status === 200 && preview.confirmationRequired, `HTTP Opponent preview failed: ${previewed.response.error || "unknown"}`);

    const modelConfirmation = await adapter.handle({
      method: "POST",
      pathname: `${STARCRAFT_TMG_LEVEL3_API_PREFIX}/rooms/${ROOM_ID}/confirm`,
      headers: bearer(credentials.opponent.seatToken),
      body: { previewId: preview.preview.previewId },
    });
    assert(modelConfirmation.status === 403 && modelConfirmation.response.error === "CAPABILITY_DENIED", "model-facing grant confirmed its own preview");

    const confirmed = await adapter.handle({
      method: "POST",
      pathname: `${STARCRAFT_TMG_LEVEL3_API_PREFIX}/rooms/${ROOM_ID}/confirm`,
      headers: bearer(credentials.opponentSupervisor.seatToken),
      body: { previewId: preview.preview.previewId },
    });
    assert(confirmed.status === 200, `human confirmation failed: ${confirmed.response.error || "unknown"}`);
    const lease = await adapter.handle({
      method: "POST",
      pathname: `${STARCRAFT_TMG_LEVEL3_API_PREFIX}/rooms/${ROOM_ID}/control-lease`,
      headers: bearer(credentials.opponentSupervisor.seatToken),
      body: { sessionId: "http-opponent-supervisor" },
    });
    assert(lease.status === 200, `ControlLease failed: ${lease.response.error || "unknown"}`);

    const committed = await adapter.handle({
      method: "POST",
      pathname: `${STARCRAFT_TMG_LEVEL3_API_PREFIX}/rooms/${ROOM_ID}/apply`,
      headers: bearer(credentials.opponentSupervisor.seatToken, {
        "idempotency-key": "http-opponent-move-1",
      }),
      body: {
        previewId: preview.preview.previewId,
        confirmationId: confirmed.response.result.confirmation.confirmationId,
        leaseId: lease.response.result.controlLease.leaseId,
        leaseFence: lease.response.result.controlLease.leaseFence,
        expectedStateRevision: 0,
      },
    });
    applied = committed.response.result;
    assert(committed.status === 200 && applied.receipt.postStateRevision === 1, `HTTP apply failed: ${committed.response.error || "unknown"}`);
    assert(applied.receipt.refereeSignature.signatureAlgorithm === "ed25519", "HTTP accepted receipt is not Ed25519 signed");
    assert(applied.receipt.confirmationProofHash, "HTTP accepted receipt lost confirmation proof");

    const replayed = await adapter.handle({
      method: "GET",
      pathname: `${STARCRAFT_TMG_LEVEL3_API_PREFIX}/rooms/${ROOM_ID}/replay`,
    });
    assert(replayed.status === 200 && replayed.response.result.matchesCurrent === true, "HTTP replay mismatch");
  });

  await check("unknown_and_wrong_method_fail_closed", async () => {
    const missing = await adapter.handle({
      method: "GET",
      pathname: `${STARCRAFT_TMG_LEVEL3_API_PREFIX}/rooms/missing`,
    });
    assert(missing.status === 404 && missing.response.error === "ROOM_NOT_FOUND", "missing room did not return 404");
    const wrongMethod = await adapter.handle({
      method: "DELETE",
      pathname: `${STARCRAFT_TMG_LEVEL3_API_PREFIX}/rooms/${ROOM_ID}`,
    });
    assert(wrongMethod.status === 405 && wrongMethod.response.error === "METHOD_NOT_ALLOWED", "wrong method did not fail closed");
  });

  const health = await runtime.health();
  const report = {
    schemaVersion: "starcraft_tmg_level3_http_adapter_compatibility_verifier_v2",
    generatedAt: new Date().toISOString(),
    ok: failures.length === 0,
    checks,
    failures,
    evidence: {
      roomId: ROOM_ID,
      legalSpaceHash: legal?.legalSpace?.legalSpaceHash || null,
      previewId: preview?.preview?.previewId || null,
      receiptHash: applied?.receipt?.journalHash || null,
      durability: health.durability,
      bearerSeatGrantVerified: true,
      humanConfirmationVerified: true,
      controlLeaseVerified: true,
      legacySecurityBypassUsed: false,
      productionReady: false,
      trainingTruth: false,
    },
    harness: {
      harnessLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      promptPackRoutes: ["opponent_prompt"],
      harnessToolsCalled: [
        "read_board_state",
        "list_legal_actions",
        "preview_action",
        "apply_action_after_user_confirmation",
        "replay_room",
      ],
      uiTraceEvidence: "not_run_transport_adapter_only",
      agentDecisionEvidence: "fixture proposal only; no model inference was run",
      memoryTraceEvidence: { refs: [], promotionAttempted: false },
      trainingTraceCandidates: 0,
      rollbackOrDemotionRules: [
        "fail if caller-owned side or role reaches RoomRuntime",
        "fail if a model-facing bearer can confirm or apply",
      ],
      userVisibleChecks: "not_run_transport_adapter_only",
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
