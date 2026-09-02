#!/usr/bin/env node

import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createStarcraftTmgAuthoritativeEngine,
  hashStarcraftTmgContract,
} from "../packages/authoritative-engine/transition-v1.mjs";
import {
  createInMemoryStarcraftTmgAuthoritativeTransportAdapter,
} from "../packages/client-domain/authoritative-transport-adapters-v1.mjs";
import { createStarcraftTmgClientDomain } from "../packages/client-domain/client-domain-v1.mjs";
import { createInMemoryStarcraftTmgLifecycleAdapter } from "../packages/client-domain/lifecycle-adapters-v1.mjs";
import { createInMemoryStarcraftTmgProjectionStoreAdapter } from "../packages/client-domain/projection-store-adapters-v1.mjs";
import {
  createStarcraftTmgLevel3HttpAdapter,
  STARCRAFT_TMG_LEVEL3_API_PREFIX,
} from "../packages/http-adapter/handler-v1.mjs";
import {
  createStarcraftTmgRoomRuntime,
  STARCRAFT_TMG_REPLAY_FINAL_PROJECTION_VERSION,
  STARCRAFT_TMG_VIEWER_APPLY_RESPONSE_VERSION,
  STARCRAFT_TMG_VIEWER_REPLAY_BUNDLE_VERSION,
  STARCRAFT_TMG_VIEWER_REPLAY_RESPONSE_VERSION,
  STARCRAFT_TMG_VIEWER_RESPONSE_CONTRACT_CATALOG,
} from "../packages/room-runtime/in-memory-room-v1.mjs";
import {
  createStarcraftTmgSampleState,
  loadStarcraftTmgData,
} from "../../scripts/starcraft-tmg-rules-v0.mjs";

const LEVEL3_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROJECT_ROOT = path.resolve(LEVEL3_ROOT, "..");
const OCCURRED_AT = "2026-09-03T08:00:00.000Z";
const ROOM_ID = "ticket-14-viewer-scoped-apply-replay";
const OTHER_ROOM_ID = "ticket-14-viewer-scoped-other-room";
const PRIVATE = Object.freeze({
  player1Card: "slice132-player1-private-card-canary",
  player2Card: "slice132-player2-private-card-canary",
  player1Roster: "slice132-player1-private-roster-canary",
  player2Roster: "slice132-player2-private-roster-canary",
  registry: "slice132-referee-roster-registry-canary",
  session: "slice132-private-session-canary",
});
const ENVELOPE_KEYS = [
  "gameId",
  "journalHeadHash",
  "matchBindingHash",
  "revision",
  "roomId",
  "schemaVersion",
  "state",
  "stateHash",
  "stateRevision",
  "trainingTruth",
].sort();
const STATE_SUMMARY_KEYS = [
  "activeSideKey",
  "gameOver",
  "phase",
  "round",
  "schemaVersion",
  "terminal",
  "trainingTruth",
  "winner",
].sort();

function bearer(seatToken, extra = {}) {
  return { authorization: `Bearer ${seatToken}`, ...extra };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
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

function assertEnvelopeIsSummary(envelope, label) {
  assert.deepEqual(Object.keys(envelope).sort(), ENVELOPE_KEYS, `${label} envelope widened beyond the safe summary`);
  assert.deepEqual(Object.keys(envelope.state).sort(), STATE_SUMMARY_KEYS, `${label} state is not a bounded public summary`);
  assert.equal(envelope.schemaVersion, "starcraft_tmg_viewer_envelope_summary_v1", `${label} summary schema drifted`);
  assert.equal("matchBinding" in envelope, false, `${label} leaked raw MatchBinding`);
  assert.equal("pieces" in envelope.state, false, `${label} leaked authoritative state`);
}

function allKeys(value, target = new Set()) {
  if (!value || typeof value !== "object") return target;
  for (const [key, child] of Object.entries(value)) {
    target.add(key);
    allKeys(child, target);
  }
  return target;
}

function assertNoRoomOperationalSecrets(value, label) {
  const keys = allKeys(value);
  for (const forbidden of [
    "authoritySeal",
    "credential",
    "credentials",
    "grants",
    "idempotency",
    "invites",
    "leaseSeal",
    "leases",
    "leaseFences",
    "previews",
    "recoveryTickets",
    "seatToken",
    "sessionId",
    "tokenHash",
  ]) {
    assert.equal(keys.has(forbidden), false, `${label} leaked operational key ${forbidden}`);
  }
}

function assertContainsOnlyOwnPrivateProjection(result, sideKey) {
  const projection = result.replay.finalProjection;
  const serialized = JSON.stringify(projection);
  if (!sideKey) {
    assert.equal(projection.viewer.roleMode, "public_observer", "anonymous replay was not labeled public");
    assert.deepEqual(projection.state.cardResources, {}, "public replay exposed card resources");
    assert.deepEqual(projection.state.ownTeamArmyRostersBySide, {}, "public replay exposed private rosters");
    for (const secret of Object.values(PRIVATE)) assert.equal(serialized.includes(secret), false, `public replay leaked ${secret}`);
    return;
  }
  const ownCard = PRIVATE[`${sideKey}Card`];
  const otherCard = PRIVATE[sideKey === "player1" ? "player2Card" : "player1Card"];
  const ownRoster = PRIVATE[`${sideKey}Roster`];
  const otherRoster = PRIVATE[sideKey === "player1" ? "player2Roster" : "player1Roster"];
  assert.equal(projection.viewer.seatKey, sideKey, `${sideKey} replay viewer scope drifted`);
  assert.equal(serialized.includes(ownCard), true, `${sideKey} lost its own card projection`);
  assert.equal(serialized.includes(ownRoster), true, `${sideKey} lost its own roster projection`);
  assert.equal(serialized.includes(otherCard), false, `${sideKey} replay leaked another seat's card`);
  assert.equal(serialized.includes(otherRoster), false, `${sideKey} replay leaked another seat's roster`);
  assert.equal(serialized.includes(PRIVATE.registry), false, `${sideKey} replay leaked referee roster registry`);
}

async function main() {
  const data = await loadStarcraftTmgData(PROJECT_ROOT);
  const state = createStarcraftTmgSampleState(data);
  state.board.terrain = [];
  state.activeSideKey = "player1";
  state.cardResources = {
    player1: [{ id: PRIVATE.player1Card }],
    player2: [{ id: PRIVATE.player2Card }],
  };
  state.rosterVisibilityResolution = { rosterVisibility: "private" };
  state.rosterRegistryResolution = {
    teamMembershipByPlayer: { player1: "team-player1", player2: "team-player2" },
  };
  state.authoritativeRosterRegistry = { secret: PRIVATE.registry };
  state.authoritativeArmyRostersBySide = {
    player1: { rosterId: PRIVATE.player1Roster },
    player2: { rosterId: PRIVATE.player2Roster },
  };
  state.armyBuildingConfigurationBySide = {
    player1: { canary: PRIVATE.player1Roster },
    player2: { canary: PRIVATE.player2Roster },
  };
  state.futurePrivateAuthorityCanary = "slice132-future-private-authority-canary";

  const engine = createStarcraftTmgAuthoritativeEngine({ now: () => OCCURRED_AT });
  const runtime = createStarcraftTmgRoomRuntime({ authorityEngine: engine, now: () => OCCURRED_AT });
  const roomInput = (roomId, initialState = state) => ({
    roomId,
    gameId: "starcraft-tmg",
    surfaceMode: "classic",
    initialStateAuthority: {
      source: "server_factory",
      state: initialState,
      dataVersion: data.version,
      receiptHash: hashStarcraftTmgContract({
        source: "slice132-viewer-replay",
        roomId,
        state: initialState,
      }),
    },
    serverSeatPlan: [
      { label: "host", seatKey: "player1", roleMode: "player", principalType: "human" },
      { label: "guest", seatKey: "player2", roleMode: "player", principalType: "human" },
    ],
  });
  const created = await runtime.createRoom(roomInput(ROOM_ID));
  const otherCreated = await runtime.createRoom(roomInput(OTHER_ROOM_ID));
  assert.equal(created.ok, true, `fixture room failed: ${created.reason || "unknown"}`);
  assert.equal(otherCreated.ok, true, `cross-room fixture failed: ${otherCreated.reason || "unknown"}`);

  const nestedCanaryState = clone(state);
  const nestedCanaries = [
    "piece-future-private-canary", "model-future-private-canary",
    "model-geometry-future-private-canary", "board-future-private-canary",
    "terrain-future-private-canary", "terrain-footprint-future-private-canary",
    "marker-future-private-canary", "token-future-private-canary",
    "log-future-private-canary", "log-action-future-private-canary",
    "log-event-future-private-canary", "pending-future-private-canary",
    "pending-choice-future-private-canary", "mission-future-private-canary",
    "mission-params-future-private-canary", "mission-score-future-private-canary",
    "scores-future-private-canary", "clock-future-private-canary",
    "submission-future-private-canary",
  ];
  nestedCanaryState.pieces[0].futurePrivateAuthorityCanary = nestedCanaries[0];
  nestedCanaryState.pieces[0].models = [{
    id: "nested-canary-model-1",
    xInches: 9,
    yInches: 14,
    baseShape: "round",
    baseDiameterMm: 32,
    baseDiameterMilliInches: 1260,
    physicalPresence: true,
    baseGeometry: {
      shape: "round",
      diameterMilliInches: 1260,
      physicalPresence: true,
      futurePrivateAuthorityCanary: nestedCanaries[2],
    },
    futurePrivateAuthorityCanary: nestedCanaries[1],
  }];
  nestedCanaryState.board.futurePrivateAuthorityCanary = nestedCanaries[3];
  nestedCanaryState.board.terrain = [{
    id: "nested-canary-terrain-1",
    shape: "axis_aligned_rectangle",
    widthMilliInches: 4000,
    heightMilliInches: 2000,
    physicalPresence: true,
    rulesFootprintMilliInches: {
      shape: "axis_aligned_rectangle",
      minXMilliInches: 10000,
      maxXMilliInches: 14000,
      minYMilliInches: 8000,
      maxYMilliInches: 10000,
      futurePrivateAuthorityCanary: nestedCanaries[5],
    },
    futurePrivateAuthorityCanary: nestedCanaries[4],
  }];
  nestedCanaryState.board.centerMarkers[0].futurePrivateAuthorityCanary = nestedCanaries[6];
  nestedCanaryState.officialBattlefieldTokens = [{
    tokenId: "nested-canary-token-1",
    tokenKind: "status",
    xInches: 18,
    yInches: 12,
    diameterMillimeters: 32,
    physicalPresence: true,
    futurePrivateAuthorityCanary: nestedCanaries[7],
  }];
  nestedCanaryState.log = [{
    type: "move",
    round: 1,
    phase: "movement",
    action: {
      actionType: "move",
      pieceId: nestedCanaryState.pieces[0].id,
      to: { xInches: 9, yInches: 13.5 },
      futurePrivateAuthorityCanary: nestedCanaries[9],
    },
    events: [{
      type: "move",
      pieceId: nestedCanaryState.pieces[0].id,
      xInches: 9,
      yInches: 13.5,
      futurePrivateAuthorityCanary: nestedCanaries[10],
    }],
    futurePrivateAuthorityCanary: nestedCanaries[8],
  }];
  nestedCanaryState.pendingAction = {
    schema: "starcraft_tmg_test_public_pending_v1",
    sideKey: "player1",
    pieceId: nestedCanaryState.pieces[0].id,
    choices: [{
      choiceId: "safe-choice",
      label: "Safe public choice",
      result: { xInches: 10, yInches: 10 },
      futurePrivateAuthorityCanary: nestedCanaries[12],
    }],
    futurePrivateAuthorityCanary: nestedCanaries[11],
  };
  nestedCanaryState.mission = {
    ...(nestedCanaryState.mission || {}),
    missionId: "nested-public-mission",
    missionParams: {
      points: 3,
      futurePrivateAuthorityCanary: nestedCanaries[14],
    },
    scoringConditions: [{ type: "public-score", points: 2,
      futurePrivateAuthorityCanary: nestedCanaries[15] }],
    futurePrivateAuthorityCanary: nestedCanaries[13],
  };
  nestedCanaryState.scores = {
    player1: { points: 2, futurePrivateAuthorityCanary: nestedCanaries[16] },
    player2: { points: 1 },
  };
  nestedCanaryState.gameClock = {
    ...(nestedCanaryState.gameClock || {}),
    round: 1,
    phase: "movement",
    transition: 0,
    futurePrivateAuthorityCanary: nestedCanaries[17],
  };
  nestedCanaryState.submissionsByPlayer = {
    player1: { selectedId: "public-submission", futurePrivateAuthorityCanary: nestedCanaries[18] },
  };
  const nestedRoomId = "ticket-14-viewer-nested-canary";
  const nestedCreated = await runtime.createRoom(roomInput(nestedRoomId, nestedCanaryState));
  assert.equal(nestedCreated.ok, true, `nested canary room failed: ${nestedCreated.reason || "unknown"}`);
  const nestedReadResults = [
    await runtime.readRoom({ roomId: nestedRoomId }),
    await runtime.readRoom({
      roomId: nestedRoomId,
      seatToken: nestedCreated.credentials.host.seatToken,
    }),
  ];
  const nestedReplayResults = [
    await runtime.replayRoom({ roomId: nestedRoomId }),
    await runtime.replayRoom({
      roomId: nestedRoomId,
      seatToken: nestedCreated.credentials.host.seatToken,
    }),
  ];
  const nestedProjections = [
    ...nestedReadResults.map((result) => result.projection),
    ...nestedReplayResults.map((result) => result.replay.finalProjection),
  ];
  for (const [index, projection] of nestedProjections.entries()) {
    const serialized = JSON.stringify(projection);
    for (const canary of nestedCanaries) {
      assert.equal(serialized.includes(canary), false,
        `nested projection ${index} leaked ${canary}`);
    }
    const projectedPiece = projection.state.pieces[0];
    assert.equal(projectedPiece.name, nestedCanaryState.pieces[0].name,
      `nested projection ${index} lost public piece identity`);
    assert.equal(projectedPiece.models[0].baseDiameterMilliInches, 1260,
      `nested projection ${index} lost model base geometry`);
    assert.equal(projectedPiece.models[0].baseGeometry.diameterMilliInches, 1260,
      `nested projection ${index} lost explicit model geometry object`);
    assert.equal(projection.state.board.terrain[0].rulesFootprintMilliInches.maxXMilliInches,
      14000, `nested projection ${index} lost real terrain rules footprint`);
    assert.equal(projection.state.officialBattlefieldTokens[0].diameterMillimeters, 32,
      `nested projection ${index} lost official token diameter`);
    assert.equal(projection.state.officialBattlefieldTokens[0].physicalPresence, true,
      `nested projection ${index} lost token physical presence`);
    assert.equal(projection.state.log[0].action.to.yInches, 13.5,
      `nested projection ${index} lost public log action geometry`);
    assert.equal(projection.state.pendingAction.choices[0].result.xInches, 10,
      `nested projection ${index} lost public pending choice`);
    assert.equal(projection.state.mission.missionParams.points, 3,
      `nested projection ${index} lost public mission parameters`);
    assert.equal(projection.state.mission.scoringConditions[0].points, 2,
      `nested projection ${index} lost public mission scoring conditions`);
    assert.equal(projection.state.scores.player1.points, 2,
      `nested projection ${index} lost public score`);
    assert.equal(projection.state.gameClock.transition, 0,
      `nested projection ${index} lost public game clock`);
    assert.equal(projection.state.submissionsByPlayer.player1.selectedId,
      "public-submission", `nested projection ${index} lost public submission`);
  }
  const host = created.credentials.host;
  const guest = created.credentials.guest;
  const adapter = createStarcraftTmgLevel3HttpAdapter({ roomRuntime: runtime });
  const endpoint = `${STARCRAFT_TMG_LEVEL3_API_PREFIX}/rooms/${ROOM_ID}`;

  const publicProjection = await adapter.handle({ method: "GET", pathname: endpoint, headers: {} });
  assert.equal(publicProjection.status, 200, "headerless public room projection failed");
  assert.equal(publicProjection.response.result.projection.viewer.roleMode, "public_observer",
    "headerless room projection lost public access");
  for (const [label, authorization] of [
    ["Basic", `Basic ${host.seatToken}`],
    ["malformed Bearer", "Bearer"],
    ["duplicate Bearer", `Bearer ${host.seatToken}, Bearer ${host.seatToken}`],
  ]) {
    const rejectedProjection = await adapter.handle({
      method: "GET",
      pathname: endpoint,
      headers: { authorization },
    });
    assert.equal(rejectedProjection.status, 401,
      `${label} authorization downgraded to public room projection`);
    assert.equal(rejectedProjection.response.error, "AUTHENTICATION_INVALID",
      `${label} room projection authentication rejection drifted`);
  }

  const legalResponse = await adapter.handle({
    method: "POST",
    pathname: `${endpoint}/legal-space`,
    headers: bearer(host.seatToken),
    body: {},
  });
  assert.equal(legalResponse.status, 200, `LegalSpace failed: ${legalResponse.response.error || "unknown"}`);
  const moveDomain = legalResponse.response.result.legalSpace.parameterDomains
    .find((domain) => domain.actionType === "move");
  assert(moveDomain, "fixture has no Rules-owned movement domain");

  const previewResponse = await adapter.handle({
    method: "POST",
    pathname: `${endpoint}/preview`,
    headers: bearer(host.seatToken),
    body: { proposal: movementProposal(moveDomain) },
  });
  assert.equal(previewResponse.status, 200, `Preview failed: ${previewResponse.response.error || "unknown"}`);
  let confirmationId;
  if (previewResponse.response.result.confirmationRequired) {
    const missingBindingResponse = await adapter.handle({
      method: "POST",
      pathname: `${endpoint}/confirm`,
      headers: bearer(host.seatToken),
      body: { previewId: previewResponse.response.result.preview.previewId },
    });
    assert.equal(missingBindingResponse.status, 409,
      "Confirm without exact Preview binding did not fail closed");
    assert.equal(missingBindingResponse.response.error, "PREVIEW_BINDING_MISMATCH",
      "missing Preview binding rejection drifted");
    const unchangedAfterMismatch = await runtime.readRoom({
      roomId: ROOM_ID,
      seatToken: host.seatToken,
    });
    assert.equal(unchangedAfterMismatch.projection.room.stateRevision, 0,
      "Preview binding mismatch changed authoritative state");
    const confirmationResponse = await adapter.handle({
      method: "POST",
      pathname: `${endpoint}/confirm`,
      headers: bearer(host.seatToken),
      body: {
        previewId: previewResponse.response.result.preview.previewId,
        previewToken: previewResponse.response.result.preview.previewToken,
        previewContentHash: previewResponse.response.result.preview.previewSeal.contentHash,
      },
    });
    assert.equal(confirmationResponse.status, 200, `Confirmation failed: ${confirmationResponse.response.error || "unknown"}`);
    confirmationId = confirmationResponse.response.result.confirmation.confirmationId;
  }
  const leaseResponse = await adapter.handle({
    method: "POST",
    pathname: `${endpoint}/control-lease`,
    headers: bearer(host.seatToken),
    body: { sessionId: PRIVATE.session },
  });
  assert.equal(leaseResponse.status, 200, `ControlLease failed: ${leaseResponse.response.error || "unknown"}`);
  const applyBody = {
    previewId: previewResponse.response.result.preview.previewId,
    confirmationId,
    leaseId: leaseResponse.response.result.controlLease.leaseId,
    leaseFence: leaseResponse.response.result.controlLease.leaseFence,
    expectedStateRevision: 0,
  };
  const applyHeaders = bearer(host.seatToken, { "idempotency-key": "slice132-safe-apply" });
  const appliedResponse = await adapter.handle({
    method: "POST",
    pathname: `${endpoint}/apply`,
    headers: applyHeaders,
    body: applyBody,
  });
  assert.equal(appliedResponse.status, 200, `Apply failed: ${appliedResponse.response.error || "unknown"}`);
  const applied = appliedResponse.response.result;
  assert.equal(applied.schemaVersion, STARCRAFT_TMG_VIEWER_APPLY_RESPONSE_VERSION,
    "Apply response did not use the explicit current viewer contract");
  assertEnvelopeIsSummary(applied.envelope, "Apply");
  assertNoRoomOperationalSecrets(applied, "Apply");
  const appliedSerialized = JSON.stringify(applied);
  for (const secret of Object.values(PRIVATE)) assert.equal(appliedSerialized.includes(secret), false, `Apply leaked ${secret}`);
  assert.equal(applied.receipt.refereeSignature.signatureAlgorithm, "ed25519", "Apply lost the signed receipt");
  assert.equal(applied.envelope.stateRevision, 1, "Apply summary revision mismatch");

  const idempotentResponse = await adapter.handle({
    method: "POST",
    pathname: `${endpoint}/apply`,
    headers: applyHeaders,
    body: applyBody,
  });
  assert.equal(idempotentResponse.status, 200, "idempotent Apply failed");
  assert.equal(idempotentResponse.response.result.idempotentReplay, true, "idempotent Apply was not identified");
  assertEnvelopeIsSummary(idempotentResponse.response.result.envelope, "idempotent Apply");
  assert.equal(JSON.stringify(idempotentResponse.response.result).includes(PRIVATE.player1Card), false, "idempotent Apply leaked raw state");

  async function replay(headers = {}) {
    return adapter.handle({ method: "GET", pathname: `${endpoint}/replay`, headers });
  }
  const publicReplayResponse = await replay();
  const hostReplayResponse = await replay(bearer(host.seatToken));
  const guestReplayResponse = await replay(bearer(guest.seatToken));
  for (const [label, response] of [
    ["public", publicReplayResponse],
    ["host", hostReplayResponse],
    ["guest", guestReplayResponse],
  ]) {
    assert.equal(response.status, 200, `${label} Replay failed: ${response.response.error || "unknown"}`);
    const result = response.response.result;
    assert.equal(result.schemaVersion, STARCRAFT_TMG_VIEWER_REPLAY_RESPONSE_VERSION,
      `${label} Replay response contract drifted`);
    assert.equal(result.replay.schemaVersion, STARCRAFT_TMG_VIEWER_REPLAY_BUNDLE_VERSION,
      `${label} Replay bundle contract drifted`);
    assert.equal(result.replay.finalProjection.schemaVersion,
      STARCRAFT_TMG_REPLAY_FINAL_PROJECTION_VERSION,
      `${label} final projection contract drifted`);
    assert.equal(result.matchesCurrent, true, `${label} Replay does not match current authority`);
    assert.equal(result.receiptCount, 1, `${label} Replay receipt denominator drifted`);
    assertEnvelopeIsSummary(result.replay.envelope, `${label} Replay`);
    assert.equal("dependencyVerification" in result.replay, false, `${label} Replay leaked referee dependency proof`);
    assertNoRoomOperationalSecrets(result, `${label} Replay`);
    assert.equal(JSON.stringify(result).includes(state.futurePrivateAuthorityCanary), false,
      `${label} Replay leaked a future authority-only field`);
  }
  assertContainsOnlyOwnPrivateProjection(publicReplayResponse.response.result, null);
  assertContainsOnlyOwnPrivateProjection(hostReplayResponse.response.result, "player1");
  assertContainsOnlyOwnPrivateProjection(guestReplayResponse.response.result, "player2");

  const tamperedToken = `${host.seatToken.slice(0, -1)}${host.seatToken.endsWith("A") ? "B" : "A"}`;
  const tamperedReplay = await replay(bearer(tamperedToken));
  assert.equal(tamperedReplay.status, 403, "tampered SeatGrant fell back to public Replay");
  assert.equal(tamperedReplay.response.error, "SEAT_GRANT_INVALID", "tampered SeatGrant rejection drifted");
  const crossRoomReplay = await replay(bearer(otherCreated.credentials.host.seatToken));
  assert.equal(crossRoomReplay.status, 403, "cross-room SeatGrant reached Replay");
  assert.equal(crossRoomReplay.response.error, "SEAT_GRANT_INVALID", "cross-room rejection drifted");
  const malformedReplay = await replay({ authorization: `Basic ${host.seatToken}` });
  assert.equal(malformedReplay.status, 401, "malformed authorization fell back to public Replay");
  assert.equal(malformedReplay.response.error, "AUTHENTICATION_INVALID", "malformed authorization rejection drifted");

  const client = createStarcraftTmgClientDomain({
    transport: createInMemoryStarcraftTmgAuthoritativeTransportAdapter({ roomRuntime: runtime }),
    projectionStore: createInMemoryStarcraftTmgProjectionStoreAdapter(),
    lifecycle: createInMemoryStarcraftTmgLifecycleAdapter({ online: true, visibility: "active" }),
    now: () => OCCURRED_AT,
  });
  const bootstrapped = await client.bootstrap({
    route: { roomId: ROOM_ID },
    principal: { seatToken: host.seatToken },
    surface: "expo_web",
  });
  assert.equal(bootstrapped.ok, true, "Client Domain bootstrap failed after response narrowing");
  const clientReplay = await client.dispatch({ type: "read_replay" });
  assert.equal(clientReplay.ok, true, `Client Domain could not consume the safe Replay summary: ${clientReplay.rejection?.code || "unknown"}`);
  assert.equal(clientReplay.replay.matchesCurrent, true, "Client Domain lost matchesCurrent");
  assert.equal(clientReplay.replay.receiptCount, 1, "Client Domain lost receiptCount");
  assert.equal(clientReplay.replay.stateRevision, 1, "Client Domain lost replay.envelope.stateRevision");
  assert.equal(clientReplay.replay.stateHash, applied.envelope.stateHash, "Client Domain lost replay.envelope.stateHash");
  assert.equal(clientReplay.replay.journalHeadHash, applied.envelope.journalHeadHash, "Client Domain lost replay.envelope.journalHeadHash");

  const report = {
    schemaVersion: "starcraft_tmg_ticket_14_viewer_scoped_apply_replay_verifier_v1",
    ok: true,
    assertions: {
      applyAndIdempotencyReturnSafeEnvelopeSummary: true,
      replayPublicAndSeatProjectionScoped: true,
      crossSeatAndCrossRoomIsolation: true,
      tamperedOrMalformedAuthenticationFailsClosed: true,
      malformedProjectionAuthorizationNeverDowngradesToPublic: true,
      clientDomainReplayReferenceCompatible: true,
      confirmRequiresExactPreviewBinding: true,
      applyReplayContractsExplicitlyVersioned: true,
      futureAuthorityOnlyFieldsFailClosedByProjectionAllowlist: true,
      rawRefereeEnvelopeExposed: false,
      trainingTruth: false,
    },
    contractCatalogue: STARCRAFT_TMG_VIEWER_RESPONSE_CONTRACT_CATALOG,
    harness: {
      harnessLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      promptPackRoutes: [],
      harnessToolsCalled: [
        "read_board_state",
        "list_legal_actions",
        "preview_action",
        "apply_action_after_user_confirmation",
        "replay_room",
      ],
      uiTraceEvidence: "http_and_client_domain_contract_only",
      agentDecisionEvidence: "fixture movement only; no model inference",
      memoryTraceEvidence: { refs: [], promotionAttempted: false },
      trainingTraceCandidates: 0,
      rollbackOrDemotionRules: [
        "fail if Apply or Replay exposes a raw authoritative envelope",
        "fail if invalid authentication falls back to a public Replay",
        "fail if a viewer sees another seat's private card or roster projection",
      ],
      userVisibleChecks: "not_run_contract_security_only",
    },
  };
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
