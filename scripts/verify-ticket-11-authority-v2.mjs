#!/usr/bin/env node

import { generateKeyPairSync, randomBytes, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createStarcraftTmgAuthoritativeEngine,
  hashStarcraftTmgContract,
} from "../packages/authoritative-engine/transition-v1.mjs";
import { createStarcraftTmgRefereeCrypto } from "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createStarcraftTmgReplayProjectionVerifier } from "../packages/authoritative-engine/replay-projection-verifier-v1.mjs";
import { createStarcraftTmgRoomRuntime } from "../packages/room-runtime/in-memory-room-v1.mjs";
import { createStarcraftTmgPrivatePayloadCodec } from "../packages/room-store/room-store-v1.mjs";
import { createSqliteStarcraftTmgRoomStore } from "../packages/room-store/sqlite-room-store-v1.mjs";
import { STARCRAFT_TMG_POSTGRES_ROOM_STORE_CONTRACT } from "../packages/room-store/postgres-room-store-v1.mjs";
import { createStarcraftTmgLevel3HttpAdapter } from "../packages/http-adapter/handler-v1.mjs";
import { createStarcraftTmgSampleState, loadStarcraftTmgData } from "../../scripts/starcraft-tmg-rules-v0.mjs";

const LEVEL3_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROJECT_ROOT = path.resolve(LEVEL3_ROOT, "..");
const BUILD_DIR = path.join(LEVEL3_ROOT, "build", "ticket-11-authority-v2");
const REPORT_PATH = path.join(BUILD_DIR, "report.json");
const OCCURRED_AT = "2026-08-24T00:00:00.000Z";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function bearer(seatToken, extra = {}) {
  return { authorization: `Bearer ${seatToken}`, ...extra };
}

function pathProposal(domain, deltaY = 500) {
  return {
    kind: "parameterized",
    domainId: domain.domainId,
    parameters: {
      path: [
        { ...domain.constraints.start },
        { xMilliInches: domain.constraints.start.xMilliInches, yMilliInches: domain.constraints.start.yMilliInches + 250 },
        { xMilliInches: domain.constraints.start.xMilliInches, yMilliInches: domain.constraints.start.yMilliInches + deltaY },
      ],
    },
  };
}

async function main() {
  await mkdir(BUILD_DIR, { recursive: true });
  const databasePath = path.join(BUILD_DIR, `room-store-${randomUUID()}.sqlite`);
  const data = await loadStarcraftTmgData(PROJECT_ROOT);
  const state = createStarcraftTmgSampleState(data);
  state.board.terrain = [];
  const keyPair = generateKeyPairSync("ed25519");
  const hmacSecret = randomBytes(32);
  const encryptionKey = randomBytes(32);
  const refereeCrypto = createStarcraftTmgRefereeCrypto({
    privateKey: keyPair.privateKey,
    publicKey: keyPair.publicKey,
    hmacSecret,
    keyId: "ticket-11-referee-v1",
    trustLevel: "verifier_fixture",
  });
  const codec = createStarcraftTmgPrivatePayloadCodec({ key: encryptionKey, keyId: "ticket-11-room-data-v1", trustLevel: "verifier_fixture" });
  const authorityEngine = createStarcraftTmgAuthoritativeEngine({ refereeCrypto, now: () => OCCURRED_AT });
  let store = createSqliteStarcraftTmgRoomStore({ filename: databasePath, privatePayloadCodec: codec, now: () => OCCURRED_AT });
  let runtime = createStarcraftTmgRoomRuntime({ authorityEngine, roomStore: store, checkpointInterval: 1, now: () => OCCURRED_AT });
  const stateAuthority = {
    source: "server_factory",
    state,
    dataVersion: data.version,
    receiptHash: hashStarcraftTmgContract({ source: "ticket-11-verifier-factory", state }),
    dependencies: {
      sourceSnapshot: { artifactId: "sc-source-fixture-v1", content: { source: "local-read-only-adapter", version: data.version } },
      dataSnapshot: { artifactId: "sc-data-fixture-v1", content: { dataVersion: data.version, stateSeedHash: hashStarcraftTmgContract(state) } },
      rulesArtifact: { artifactId: "sc-rules-v0-frozen", content: { rulesVersion: "starcraft_tmg_rules_v0" } },
      executorArtifact: { artifactId: "sc-executor-v2-frozen", content: { authorityVersion: "starcraft_tmg_authority_v2" } },
      geometryArtifact: { artifactId: "sc-geometry-v1-frozen", content: { geometry: "fixed_point_round_base_sweep_v1" } },
      actionSchema: { artifactId: "sc-action-v1-frozen", content: { legalSpace: "finite_union_parameter_domains_v1" } },
    },
    rulesDisplay: {
      artifactId: "sc-historical-rules-v0-en",
      mediaType: "text/markdown",
      locale: "en",
      content: "# StarCraft TMG historical rules v0\n\nImmutable verifier display artifact.",
    },
    serverSeatPlan: [
      { label: "host", seatKey: "player1", roleMode: "player", principalType: "human" },
      { label: "opponent", seatKey: "player2", roleMode: "opponent", principalType: "model" },
      { label: "opponentSupervisor", seatKey: "player2", roleMode: "supervisor", principalType: "human" },
    ],
  };
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

  const roomId = "ticket-11-authority-room";
  const created = await runtime.createRoom({ roomId, initialStateAuthority: stateAuthority, serverSeatPlan: stateAuthority.serverSeatPlan });
  assert(created.ok, `room creation failed: ${created.reason}`);
  const host = created.credentials.host;
  const opponent = created.credentials.opponent;
  const supervisor = created.credentials.opponentSupervisor;
  let hostLegal;
  let hostPreview;
  let hostLease1;
  let hostLease2;
  let hostApply;
  let opponentApply;

  await check("01_server_owned_room_and_frozen_match_binding", async () => {
    assert(created.matchBinding.bindingHash && created.matchBinding.refereeSignature.signatureAlgorithm === "ed25519", "MatchBinding is not Ed25519 signed");
    assert(created.matchBinding.rulesDisplayBinding.artifactHash, "historical RulesDisplayBinding is absent");
    const rejected = await runtime.createRoom({ roomId: "client-state-room", state });
    assert(!rejected.ok && rejected.reason === "INITIAL_STATE_AUTHORITY_REQUIRED", "client initial state was accepted");
  });

  await check("02_hybrid_legal_space_excludes_search_scores", async () => {
    const result = await runtime.legalSpace({ roomId, seatToken: host.seatToken });
    assert(result.ok, `LegalSpace failed: ${result.reason}`);
    hostLegal = result.legalSpace;
    assert(hostLegal.finiteActions.length > 0, "finite action set is empty");
    assert(hostLegal.parameterDomains.some((domain) => domain.actionType === "move"), "movement parameter domain is absent");
    assert(hostLegal.searchAndStrategyExcludedFromAuthority === true, "search separation flag is absent");
    const before = hostLegal.legalSpaceHash;
    const {
      legalSpaceHash: _legalSpaceHash,
      searchSuggestions: _searchSuggestions,
      disabledDiagnostics: _disabledDiagnostics,
      candidates: _candidates,
      disabledCount: _disabledCount,
      searchAndStrategyExcludedFromAuthority: _searchFlag,
      ...authoritativeCore
    } = hostLegal;
    assert(hashStarcraftTmgContract(authoritativeCore) === before, "LegalSpace hash contains response companion fields");
    const reread = await runtime.legalSpace({ roomId, seatToken: host.seatToken });
    assert(reread.legalSpace.legalSpaceHash === before, "search score changed LegalSpace identity");
  });

  await check("03_arbitrary_path_canonicalization_and_complexity_failure", async () => {
    const domain = hostLegal.parameterDomains.find((entry) => entry.actionType === "move");
    const preview = await runtime.previewAction({ roomId, seatToken: host.seatToken, proposal: pathProposal(domain) });
    assert(preview.ok, `valid path rejected: ${preview.reason}`);
    hostPreview = preview;
    assert(preview.preview.core.action.canonicalPath.points.length === 2, "duplicate/collinear path points were not canonicalized");
    const publicBefore = (await runtime.readRoom({ roomId })).projection.room.publicJournalSequence;
    const rejected = await runtime.previewAction({
      roomId,
      seatToken: host.seatToken,
      proposal: { kind: "parameterized", domainId: domain.domainId, parameters: { path: Array.from({ length: 4097 }, (_, index) => ({ xMilliInches: domain.constraints.start.xMilliInches + (index % 2), yMilliInches: domain.constraints.start.yMilliInches })) } },
    });
    assert(!rejected.ok && rejected.reason === "PATH_TOO_COMPLEX", `expected PATH_TOO_COMPLEX, got ${rejected.reason}`);
    const publicAfter = (await runtime.readRoom({ roomId })).projection.room.publicJournalSequence;
    assert(publicAfter === publicBefore, "private rejected path leaked into public journal sequence");
  });

  await check("04_hmac_preview_is_non_mutating_and_multiple", async () => {
    const before = await runtime.readRoom({ roomId, seatToken: host.seatToken });
    const second = await runtime.previewAction({ roomId, seatToken: host.seatToken, proposal: hostPreview.preview.core.proposal, occurredAt: "2026-08-24T01:00:00.000Z" });
    assert(second.ok, `second preview rejected: ${second.reason}`);
    const after = await runtime.readRoom({ roomId, seatToken: host.seatToken });
    assert(after.projection.room.stateRevision === before.projection.room.stateRevision, "preview mutated state revision");
    assert(second.preview.previewId !== hostPreview.preview.previewId, "multiple previews did not receive distinct operational identities");
    assert(hashStarcraftTmgContract(second.preview.core) === hashStarcraftTmgContract(hostPreview.preview.core), "wall time changed deterministic preview core");
    assert(second.preview.previewSeal.sealAlgorithm === "hmac-sha256", "preview is not HMAC sealed");
  });

  await check("05_risk_based_direct_gesture_confirmation", async () => {
    assert(hostPreview.preview.core.confirmationPolicy.baseClass === "direct_gesture", "safe movement is not classified as direct gesture");
    assert(hostPreview.confirmationRequired === false, "safe human movement incorrectly requires a separate confirmation receipt");
  });

  await check("06_opponent_always_requires_human_confirmation", async () => {
    hostLease1 = (await runtime.claimControl({ roomId, seatToken: host.seatToken, sessionId: "host-web" })).controlLease;
    hostLease2 = (await runtime.claimControl({ roomId, seatToken: host.seatToken, sessionId: "host-app" })).controlLease;
    const fenced = await runtime.applyAction({
      roomId,
      seatToken: host.seatToken,
      previewId: hostPreview.preview.previewId,
      leaseId: hostLease1.leaseId,
      leaseFence: hostLease1.leaseFence,
      expectedStateRevision: 0,
      idempotencyKey: "host-fenced-attempt",
    });
    assert(!fenced.ok && fenced.reason === "CONTROL_LEASE_FENCED", "superseded ControlLease was accepted");
    hostApply = await runtime.applyAction({
      roomId,
      seatToken: host.seatToken,
      previewId: hostPreview.preview.previewId,
      leaseId: hostLease2.leaseId,
      leaseFence: hostLease2.leaseFence,
      expectedStateRevision: 0,
      idempotencyKey: "host-move-1",
    });
    assert(hostApply.ok, `host apply failed: ${hostApply.reason}`);
    const opponentLegal = await runtime.legalSpace({ roomId, seatToken: opponent.seatToken });
    const domain = opponentLegal.legalSpace.parameterDomains.find((entry) => entry.actionType === "move");
    const opponentPreview = await runtime.previewAction({ roomId, seatToken: opponent.seatToken, proposal: pathProposal(domain) });
    assert(opponentPreview.ok && opponentPreview.confirmationRequired, "Opponent proposal did not require explicit human confirmation");
    const modelConfirmation = await runtime.confirmPreview({
      roomId,
      seatToken: opponent.seatToken,
      previewId: opponentPreview.preview.previewId,
      previewToken: opponentPreview.preview.previewToken,
      previewContentHash: opponentPreview.preview.previewSeal.contentHash,
    });
    assert(!modelConfirmation.ok && modelConfirmation.reason === "CAPABILITY_DENIED", "model grant confirmed its own action");
    const humanConfirmation = await runtime.confirmPreview({
      roomId,
      seatToken: supervisor.seatToken,
      previewId: opponentPreview.preview.previewId,
      previewToken: opponentPreview.preview.previewToken,
      previewContentHash: opponentPreview.preview.previewSeal.contentHash,
    });
    assert(humanConfirmation.ok, `human supervisor confirmation failed: ${humanConfirmation.reason}`);
    const supervisorLease = (await runtime.claimControl({ roomId, seatToken: supervisor.seatToken, sessionId: "supervisor-web" })).controlLease;
    opponentApply = await runtime.applyAction({
      roomId,
      seatToken: supervisor.seatToken,
      previewId: opponentPreview.preview.previewId,
      confirmationId: humanConfirmation.confirmation.confirmationId,
      leaseId: supervisorLease.leaseId,
      leaseFence: supervisorLease.leaseFence,
      expectedStateRevision: 1,
      idempotencyKey: "opponent-move-1",
    });
    assert(opponentApply.ok, `confirmed Opponent apply failed: ${opponentApply.reason}`);
  });

  await check("07_seat_grant_visibility_and_no_caller_side", async () => {
    const publicView = await runtime.readRoom({ roomId });
    const hostView = await runtime.readRoom({ roomId, seatToken: host.seatToken });
    assert(Object.keys(publicView.projection.state.cardResources).length === 0, "public projection leaked card resources");
    assert(Object.keys(hostView.projection.state.cardResources).every((key) => key === "player1"), "host projection leaked another seat's card resources");
    assert(hostView.projection.viewer.seatKey === "player1", "viewer seat did not derive from SeatGrant");
  });

  await check("08_control_lease_fencing_and_multi_device_observation", async () => {
    assert(hostLease2.leaseFence === hostLease1.leaseFence + 1, "ControlLease fence did not increase");
    const observed = await runtime.readRoom({ roomId, seatToken: host.seatToken });
    assert(observed.ok && observed.projection.viewer.capabilities.includes("read_room"), "same-seat observer lost read access after lease handoff");
  });

  await check("09_atomic_three_ledgers_and_private_rejection", async () => {
    const aggregate = await store.loadRoom(roomId);
    const privateRows = await store.readJournal(roomId, "private", 0);
    const publicRows = await store.readJournal(roomId, "public", 0);
    const recoveryRows = await store.readJournal(roomId, "seat_recovery", 0);
    assert(privateRows.length === aggregate.privateJournalSequence, "private ledger sequence diverged");
    assert(publicRows.length === aggregate.publicJournalSequence, "public ledger sequence diverged");
    assert(recoveryRows.length === aggregate.seatRecoveryRevision, "seat recovery ledger sequence diverged");
    assert(privateRows.some((entry) => entry.payload.type === "rejected_attempt"), "private rejection fact is absent");
    assert(!publicRows.some((entry) => entry.payload.type === "rejected_attempt"), "rejection leaked into public ledger");
  });

  await check("10_apply_idempotency_returns_identical_result", async () => {
    const replayed = await runtime.applyAction({
      roomId,
      seatToken: supervisor.seatToken,
      previewId: Object.values((await store.loadRoom(roomId)).previews).find((entry) => entry.receiptHash === opponentApply.receipt.journalHash).preview.previewId,
      confirmationId: Object.keys((await store.loadRoom(roomId)).confirmations)[0],
      leaseId: opponentApply.receipt.controlLeaseId,
      leaseFence: opponentApply.receipt.leaseFence,
      expectedStateRevision: 1,
      idempotencyKey: "opponent-move-1",
    });
    assert(replayed.ok && replayed.idempotentReplay === true, "idempotent replay did not return prior result");
    assert(replayed.receipt.journalHash === opponentApply.receipt.journalHash, "idempotent result changed receipt identity");
  });

  await check("11_chance_ticket_commit_reveal_is_deterministic", async () => {
    const aggregate = await store.loadRoom(roomId);
    const input = { envelope: aggregate.envelope, proposalHash: hashStarcraftTmgContract({ action: "fixture-roll" }), counter: 7, faces: 6 };
    const first = authorityEngine.createChanceTicket(input);
    const second = authorityEngine.createChanceTicket(input);
    assert(first.commitment === second.commitment && first.outcomeHidden === true && first.outcome === undefined, "ChanceTicket preview leaked or rerolled outcome");
    const revealA = authorityEngine.revealChanceTicket(first);
    const revealB = authorityEngine.revealChanceTicket(second);
    assert(revealA.ok && revealA.outcome === revealB.outcome, "ChanceTicket reveal is not deterministic");
  });

  await check("12_game_clock_is_explicit_and_wall_clock_excluded", async () => {
    assert(hostApply.receipt.postGameClock.transition === 1, "first accepted transition did not advance GameClock");
    assert(opponentApply.receipt.postGameClock.transition === 2, "second accepted transition did not advance GameClock");
    assert(JSON.stringify(opponentApply.envelope.state).includes("occurredAt") === false, "wall-clock audit entered authoritative state");
  });

  await check("13_signed_receipt_checkpoint_replay_and_projection", async () => {
    assert(opponentApply.receipt.refereeSignature.signatureAlgorithm === "ed25519", "accepted receipt is not Ed25519 signed");
    const verifier = createStarcraftTmgReplayProjectionVerifier({ authorityEngine, roomStore: store });
    const verified = await verifier.verifyRoom(roomId);
    assert(verified.ok, `replay/projection verification failed: ${JSON.stringify(verified.report?.report?.failures || [])}`);
    assert(verified.report.refereeSignature.signatureAlgorithm === "ed25519", "verification report is not signed");
    const replay = await runtime.replayRoom({ roomId });
    assert(replay.ok && replay.matchesCurrent && replay.checkpointUsedForVerification, "checkpoint/replay did not recover current state");
  });

  await check("14_sqlite_recovery_and_postgres_contract_parity", async () => {
    const health = await store.health();
    assert(health.adapter === "sqlite" && health.journalMode === "wal", `SQLite is not in WAL mode: ${health.journalMode}`);
    assert(STARCRAFT_TMG_POSTGRES_ROOM_STORE_CONTRACT.roomStoreContract === health.atomicCasContract, "PostgreSQL and SQLite do not declare the same RoomStore contract");
    assert(STARCRAFT_TMG_POSTGRES_ROOM_STORE_CONTRACT.atomicWrites.includes("checkpoint"), "PostgreSQL atomic bundle is incomplete");
    store.close();
    store = createSqliteStarcraftTmgRoomStore({ filename: databasePath, privatePayloadCodec: codec, now: () => OCCURRED_AT });
    runtime = createStarcraftTmgRoomRuntime({ authorityEngine, roomStore: store, checkpointInterval: 1, now: () => OCCURRED_AT });
    const recovered = await runtime.replayRoom({ roomId });
    assert(recovered.ok && recovered.matchesCurrent, "SQLite restart recovery diverged");
  });

  await check("15_strict_quarantine_historical_display_and_manual_gate", async () => {
    const historical = await runtime.readHistoricalRules({ roomId });
    assert(historical.ok && String(historical.content).includes("historical rules v0"), "frozen historical rule display is unavailable");
    const bundle = await store.loadReplayBundle(roomId);
    const isolatedEngine = createStarcraftTmgAuthoritativeEngine({ refereeCrypto, now: () => OCCURRED_AT });
    const receipts = bundle.privateJournal.filter((entry) => entry.payload.type === "accepted_transition").map((entry) => entry.payload.payload.receipt);
    const quarantined = isolatedEngine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts });
    assert(!quarantined.ok && quarantined.reason === "DEPENDENCY_QUARANTINED" && quarantined.quarantine.silentCompatibilityUsed === false, "missing frozen dependencies did not quarantine replay");
    const aggregate = await store.loadRoom(roomId);
    const hostGrant = aggregate.grants[host.grantId];
    const manual = authorityEngine.preview({ envelope: aggregate.envelope, seatAuthority: hostGrant.authority, proposal: { kind: "manual_adjudication", operation: "set_counter" } });
    assert(!manual.ok && manual.reason === "CAPABILITY_DENIED" && manual.trainingEligible === false, "M1 manual adjudication is not disabled/training-ineligible");
  });

  const httpAdapter = createStarcraftTmgLevel3HttpAdapter({
    roomRuntime: runtime,
    initialStateFactory: async () => stateAuthority,
    createRoomId: () => "ticket-11-http-room",
  });
  await check("http_server_authority_and_payload_boundary", async () => {
    const rejected = await httpAdapter.handle({ method: "POST", pathname: "/starcraft-tmg-level3/api/v1/rooms", body: { state } });
    assert(rejected.status === 400 && rejected.response.error === "CLIENT_AUTHORITY_FIELD_REJECTED", "HTTP accepted client state authority");
    const oversized = await httpAdapter.handle({ method: "POST", pathname: `/starcraft-tmg-level3/api/v1/rooms/${roomId}/preview`, body: {}, bodyBytes: 256 * 1024 + 1, headers: bearer(host.seatToken) });
    assert(oversized.status === 413 && oversized.response.error === "PAYLOAD_TOO_LARGE", "HTTP payload limit did not fail closed");
  });

  const report = {
    schemaVersion: "starcraft_tmg_ticket_11_authority_verifier_v2",
    generatedAt: new Date().toISOString(),
    ticket: 11,
    acceptanceDenominator: 15,
    acceptancePassed: checks.filter((entry) => /^\d\d_/.test(entry.id) && entry.ok).length,
    checks,
    failures,
    ok: failures.length === 0,
    evidence: {
      roomId,
      matchBindingHash: created.matchBinding.bindingHash,
      hostReceiptHash: hostApply?.receipt?.journalHash || null,
      opponentReceiptHash: opponentApply?.receipt?.journalHash || null,
      sqliteDatabasePath: databasePath,
      signatureAlgorithm: "ed25519",
      sealAlgorithm: "hmac-sha256",
      privatePayloadEncryption: "aes-256-gcm",
      silentCompatibilityUsed: false,
      historicalRulesDisplayPreserved: true,
      trainingTruth: false,
    },
  };
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  store.close();
  if (!report.ok) throw new Error(failures.join("\n"));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
