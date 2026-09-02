#!/usr/bin/env node

import {
  createStarcraftTmgAuthoritativeEngine,
  hashStarcraftTmgContract,
} from "../packages/authoritative-engine/transition-v1.mjs";
import { createStarcraftTmgRoomRuntime } from "../packages/room-runtime/in-memory-room-v1.mjs";
import {
  createInMemoryStarcraftTmgAuthoritativeTransportAdapter,
} from "../packages/client-domain/authoritative-transport-adapters-v1.mjs";
import { createStarcraftTmgClientDomain } from "../packages/client-domain/client-domain-v1.mjs";
import {
  createInMemoryStarcraftTmgLifecycleAdapter,
} from "../packages/client-domain/lifecycle-adapters-v1.mjs";
import {
  createInMemoryStarcraftTmgProjectionStoreAdapter,
} from "../packages/client-domain/projection-store-adapters-v1.mjs";
import {
  hashStarcraftTmgClientContract,
} from "../packages/client-domain/portable-contract-hash-v1.mjs";
import {
  createStarcraftTmgSampleState,
  loadStarcraftTmgData,
} from "../../scripts/starcraft-tmg-rules-v0.mjs";

const PROJECT_ROOT = new URL("../../", import.meta.url).pathname;
const OCCURRED_AT = "2026-09-03T08:00:00.000Z";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function legalSpaceCore(legalSpace) {
  return {
    schemaVersion: legalSpace.schemaVersion,
    gameId: legalSpace.gameId,
    roomId: legalSpace.roomId,
    matchBindingHash: legalSpace.matchBindingHash,
    stateRevision: legalSpace.stateRevision,
    revision: legalSpace.revision,
    stateHash: legalSpace.stateHash,
    sideKey: legalSpace.sideKey,
    phase: legalSpace.phase,
    terminal: clone(legalSpace.terminal),
    rulesRuntimeBinding: clone(legalSpace.rulesRuntimeBinding),
    finiteActions: clone(legalSpace.finiteActions),
    parameterDomains: clone(legalSpace.parameterDomains),
  };
}

function movementParameters(domain) {
  return {
    path: [
      clone(domain.constraints.start),
      {
        xMilliInches: domain.constraints.start.xMilliInches,
        yMilliInches: domain.constraints.start.yMilliInches - 500,
      },
    ],
  };
}

function assertRejected(result, code, label) {
  assert(result?.ok === false, `${label} unexpectedly succeeded`);
  assert(result.rejection?.code === code, `${label} returned ${result.rejection?.code || "no rejection"}`);
}

async function main() {
  const data = await loadStarcraftTmgData(PROJECT_ROOT);
  const authorityEngine = createStarcraftTmgAuthoritativeEngine({ now: () => OCCURRED_AT });
  const runtime = createStarcraftTmgRoomRuntime({ authorityEngine, now: () => OCCURRED_AT });
  const baseTransport = createInMemoryStarcraftTmgAuthoritativeTransportAdapter({ roomRuntime: runtime });
  let roomSequence = 0;

  async function fixture(label) {
    roomSequence += 1;
    const roomId = `ticket-14-response-binding-${label}-${roomSequence}`;
    const state = createStarcraftTmgSampleState(data);
    state.board.terrain = [];
    state.activeSideKey = "player1";
    state.futurePrivateAuthorityCanary = `${label}-future-private-authority-canary`;
    const created = await runtime.createRoom({
      roomId,
      gameId: "starcraft-tmg",
      surfaceMode: "classic",
      initialStateAuthority: {
        source: "server_factory",
        state,
        dataVersion: data.version,
        receiptHash: hashStarcraftTmgContract({ label, roomId, state }),
      },
      serverSeatPlan: [
        { label: "host", seatKey: "player1", roleMode: "player", principalType: "human" },
        { label: "guest", seatKey: "player2", roleMode: "player", principalType: "human" },
      ],
    });
    assert(created.ok, `${label} room creation failed`);
    let mutateResponse = null;
    const calls = [];
    const transport = {
      async execute(request) {
        calls.push(request.operation);
        const result = await baseTransport.execute(request);
        return mutateResponse ? mutateResponse(request.operation, clone(result)) : result;
      },
    };
    const lifecycle = createInMemoryStarcraftTmgLifecycleAdapter();
    const client = createStarcraftTmgClientDomain({
      transport,
      projectionStore: createInMemoryStarcraftTmgProjectionStoreAdapter(),
      lifecycle,
      now: () => OCCURRED_AT,
    });
    const bootstrapped = await client.bootstrap({
      route: { roomId },
      principal: { seatToken: created.credentials.host.seatToken },
      surface: "verifier",
    });
    assert(bootstrapped.ok, `${label} bootstrap failed`);
    assert(!JSON.stringify(client.read().roomProjection).includes(state.futurePrivateAuthorityCanary),
      `${label} future authority-only field leaked through viewer projection`);
    return {
      client,
      calls,
      credentials: created.credentials,
      lifecycle,
      roomId,
      setMutator(value) { mutateResponse = value; },
    };
  }

  async function adversarialBootstrap(label, options) {
    const backingMap = new Map();
    const client = createStarcraftTmgClientDomain({
      transport: {
        async execute(request) {
          const response = clone(await baseTransport.execute(request));
          return request.operation === "read_room"
            ? options.mutate(response)
            : response;
        },
      },
      projectionStore: createInMemoryStarcraftTmgProjectionStoreAdapter({ backingMap }),
      lifecycle: createInMemoryStarcraftTmgLifecycleAdapter(),
      now: () => OCCURRED_AT,
    });
    const bootstrap = await client.bootstrap({
      route: { roomId: real.roomId },
      ...(options.seatToken ? { principal: { seatToken: options.seatToken } } : {}),
      surface: "verifier",
    });
    assertRejected(bootstrap, options.code || "PROJECTION_INVALID", label);
    assert(client.read().roomProjection === null, `${label} retained an untrusted projection`);
    assert(backingMap.size === 0, `${label} persisted an untrusted projection`);
  }

  const real = await fixture("real");
  const unbound = createStarcraftTmgClientDomain({
    transport: baseTransport,
    projectionStore: createInMemoryStarcraftTmgProjectionStoreAdapter(),
    lifecycle: createInMemoryStarcraftTmgLifecycleAdapter(),
    now: () => OCCURRED_AT,
  });
  let result = await unbound.dispatch({ type: "read_replay" });
  assertRejected(result, "CLIENT_NOT_BOOTSTRAPPED", "unbound Replay read");
  assert(unbound.read().integrity.replayBlocked === false
    && unbound.read().integrity.blockedAtStateRevision === null,
  "unbound Replay read created a NaN or false integrity latch");
  result = await real.client.dispatch({ type: "load_legal_space" });
  assert(result.ok, "real LegalSpace failed strict binding");
  const realDomain = real.client.read().legalSpace.parameterDomains.find((entry) => entry.actionType === "move");
  assert(realDomain, "real fixture has no parameterized movement domain");
  result = await real.client.dispatch({
    type: "preview_parameterized",
    domainId: realDomain.domainId,
    parameters: movementParameters(realDomain),
  });
  assert(result.ok && result.confirmationRequired === true, "real preview failed strict binding");
  assert(real.client.read().roomProjection.room.stateRevision === 0, "preview mutated authoritative state");
  assert(!real.calls.includes("apply_action"), "gesture/preview wrote directly without human confirmation");
  const realPreviewId = real.client.read().pendingPreview.previewId;
  result = await real.client.dispatch({ type: "confirm_and_apply_preview", previewId: realPreviewId });
  assert(result.ok && result.receipt?.postStateRevision === 1,
    `real apply/receipt failed strict binding: ${result.rejection?.code || "unknown"}`);
  result = await real.client.dispatch({ type: "read_replay" });
  assert(result.ok && result.replay?.matchesCurrent === true, "real viewer replay failed strict binding");
  assert(result.replay.stateHash === real.client.read().roomProjection.room.stateHash, "replay reference is not current-state bound");
  const observer = createStarcraftTmgClientDomain({
    transport: baseTransport,
    projectionStore: createInMemoryStarcraftTmgProjectionStoreAdapter(),
    lifecycle: createInMemoryStarcraftTmgLifecycleAdapter(),
    now: () => OCCURRED_AT,
  });
  result = await observer.bootstrap({ route: { roomId: real.roomId }, surface: "verifier" });
  assert(result.ok && observer.read().roomProjection.viewer.roleMode === "public_observer", "public observer bootstrap failed");
  result = await observer.dispatch({ type: "read_replay" });
  assert(result.ok && result.replay?.matchesCurrent === true, "public observer replay failed viewer-safe binding");

  const teamRoomId = "ticket-14-response-binding-team-visibility";
  const teamState = createStarcraftTmgSampleState(data);
  teamState.board.terrain = [];
  teamState.players.player3 = {
    ...clone(teamState.players.player2),
    id: "player3",
    playerId: "player3",
    name: "Enemy player",
  };
  teamState.participantIds = ["player1", "player2", "player3"];
  teamState.rosterVisibilityResolution = { rosterVisibility: "private" };
  teamState.rosterRegistryResolution = {
    schemaVersion: "starcraft_tmg_test_roster_registry_resolution_v1",
    teamMembershipByPlayer: {
      player1: "team-a",
      player2: "team-a",
      player3: "team-b",
      futurePrivateAuthorityCanary: "registry-membership-canary",
    },
    futurePrivateAuthorityCanary: "registry-canary",
  };
  teamState.authoritativeArmyRostersBySide = {
    player1: { rosterId: "team-host-roster" },
    player2: { rosterId: "team-ally-roster" },
    player3: { rosterId: "enemy-roster" },
  };
  const teamCreated = await runtime.createRoom({
    roomId: teamRoomId,
    gameId: "starcraft-tmg",
    initialStateAuthority: {
      source: "server_factory",
      state: teamState,
      dataVersion: data.version,
      receiptHash: hashStarcraftTmgContract({ teamRoomId, teamState }),
    },
    serverSeatPlan: [
      { label: "host", seatKey: "player1", roleMode: "player", principalType: "human" },
    ],
  });
  assert(teamCreated.ok, "team visibility room creation failed");
  const teamClient = createStarcraftTmgClientDomain({
    transport: baseTransport,
    projectionStore: createInMemoryStarcraftTmgProjectionStoreAdapter(),
    lifecycle: createInMemoryStarcraftTmgLifecycleAdapter(),
    now: () => OCCURRED_AT,
  });
  result = await teamClient.bootstrap({
    route: { roomId: teamRoomId },
    principal: { seatToken: teamCreated.credentials.host.seatToken },
    surface: "verifier",
  });
  assert(result.ok, `same-team projection bootstrap failed: ${result.rejection?.code || "unknown"}`);
  assert(teamClient.read().roomProjection.state.ownTeamArmyRostersBySide.player2.rosterId
    === "team-ally-roster", "same-team ally roster was dropped");
  assert(teamClient.read().roomProjection.state.ownTeamArmyRostersBySide.player3 === undefined,
    "enemy roster leaked through same-team projection");
  assert(!JSON.stringify(teamClient.read().roomProjection).includes("registry-canary"),
    "roster registry nested canary leaked");
  const enemyRosterClient = createStarcraftTmgClientDomain({
    transport: {
      async execute(request) {
        const response = clone(await baseTransport.execute(request));
        if (request.operation === "read_room") {
          response.projection.state.ownTeamArmyRostersBySide.player3 = {
            rosterId: "enemy-roster",
          };
        }
        return response;
      },
    },
    projectionStore: createInMemoryStarcraftTmgProjectionStoreAdapter(),
    lifecycle: createInMemoryStarcraftTmgLifecycleAdapter(),
    now: () => OCCURRED_AT,
  });
  result = await enemyRosterClient.bootstrap({
    route: { roomId: teamRoomId },
    principal: { seatToken: teamCreated.credentials.host.seatToken },
    surface: "verifier",
  });
  assertRejected(result, "PROJECTION_VIEWER_CLASS_INVALID", "schema-valid enemy team roster");

  await adversarialBootstrap("projection/state/raw-envelope unknown fields", {
    seatToken: real.credentials.host.seatToken,
    mutate(response) {
      response.projection.futurePrivateAuthorityCanary = "top-level-canary";
      response.projection.state.futurePrivateAuthorityCanary = "state-canary";
      response.projection.rawEnvelope = { state: { futurePrivateAuthorityCanary: "raw-canary" } };
      return response;
    },
  });
  await adversarialBootstrap("nested viewer-state unknown fields", {
    seatToken: real.credentials.host.seatToken,
    mutate(response) {
      response.projection.state.pieces[0].futurePrivateAuthorityCanary = "piece-canary";
      if (!Array.isArray(response.projection.state.pieces[0].models)
        || !response.projection.state.pieces[0].models.length) {
        response.projection.state.pieces[0].models = [{ id: "hostile-model" }];
      }
      response.projection.state.pieces[0].models[0].futurePrivateAuthorityCanary = "model-canary";
      response.projection.state.board.futurePrivateAuthorityCanary = "board-canary";
      return response;
    },
  });
  await adversarialBootstrap("nested projection subcontracts unknown fields", {
    seatToken: real.credentials.host.seatToken,
    code: "PROJECTION_VIEWER_CLASS_INVALID",
    mutate(response) {
      response.projection.room.rawEnvelope = { state: "room-private-canary" };
      response.projection.matchBinding.futurePrivateAuthorityCanary = "binding-canary";
      response.projection.control.futurePrivateAuthorityCanary = "control-canary";
      response.projection.training.futurePrivateAuthorityCanary = "training-canary";
      return response;
    },
  });
  await adversarialBootstrap("unrequested private journal on public projection", {
    mutate(response) {
      response.projection.ownPrivateJournal = [{ secret: "journal-private-canary" }];
      return response;
    },
  });
  await adversarialBootstrap("schema-valid cross-seat private state", {
    seatToken: real.credentials.host.seatToken,
    code: "PROJECTION_VIEWER_CLASS_INVALID",
    mutate(response) {
      response.projection.state.cardResources.player2 = [{ id: "player2-private-card" }];
      response.projection.state.ownTeamArmyRostersBySide.player2 = {
        rosterId: "player2-private-roster",
      };
      return response;
    },
  });
  await adversarialBootstrap("public credential class upgraded to seat viewer", {
    code: "PROJECTION_VIEWER_CLASS_INVALID",
    mutate(response) {
      const hostViewer = clone(real.client.read().roomProjection.viewer);
      response.projection.viewer = hostViewer;
      response.projection.state.cardResources = { player1: [{ id: "private-card-canary" }] };
      return response;
    },
  });
  await adversarialBootstrap("SeatToken credential class downgraded to public viewer", {
    seatToken: real.credentials.host.seatToken,
    code: "PROJECTION_VIEWER_CLASS_INVALID",
    mutate(response) {
      response.projection.viewer = {
        roleMode: "public_observer",
        visibilityScope: "public",
        capabilities: ["read_public"],
      };
      response.projection.state.cardResources = {};
      response.projection.state.ownTeamArmyRostersBySide = {};
      return response;
    },
  });

  const saturationRoomId = "ticket-14-response-binding-integrity-saturation";
  const saturationState = createStarcraftTmgSampleState(data);
  saturationState.board.terrain = [];
  const saturationCreated = await runtime.createRoom({
    roomId: saturationRoomId,
    gameId: "starcraft-tmg",
    initialStateAuthority: {
      source: "server_factory",
      state: saturationState,
      dataVersion: data.version,
      receiptHash: hashStarcraftTmgContract({ saturationRoomId, saturationState }),
    },
    serverSeatPlan: Array.from({ length: 17 }, (_, index) => ({
      label: `scope-${index + 1}`,
      seatKey: `scope-seat-${index + 1}`,
      roleMode: "player",
      principalType: "human",
    })),
  });
  assert(saturationCreated.ok, "integrity registry saturation room creation failed");
  let corruptSaturationReplay = true;
  let saturationAccessExchangeCalls = 0;
  const saturationClient = createStarcraftTmgClientDomain({
    transport: {
      async execute(request) {
        if (["exchange_invite", "exchange_recovery"].includes(request.operation)) {
          saturationAccessExchangeCalls += 1;
        }
        const response = clone(await baseTransport.execute(request));
        if (corruptSaturationReplay && request.operation === "read_replay") {
          response.replay.finalProjection.viewer.seatKey = "cross-scope-canary";
        }
        return response;
      },
    },
    projectionStore: createInMemoryStarcraftTmgProjectionStoreAdapter(),
    lifecycle: createInMemoryStarcraftTmgLifecycleAdapter(),
    now: () => OCCURRED_AT,
  });
  for (let index = 1; index <= 16; index += 1) {
    result = await saturationClient.bootstrap({
      route: { roomId: saturationRoomId },
      principal: { seatToken: saturationCreated.credentials[`scope-${index}`].seatToken },
      surface: "verifier",
    });
    assert(result.ok, `integrity blocked scope ${index} bootstrap failed`);
    result = await saturationClient.dispatch({ type: "read_replay" });
    assertRejected(result, "REPLAY_RESPONSE_INVALID", `integrity blocked scope ${index}`);
  }
  const accessState = createStarcraftTmgSampleState(data);
  accessState.board.terrain = [];
  const inviteRoomId = "ticket-14-response-binding-saturation-invite";
  const inviteCreated = await runtime.createRoom({
    roomId: inviteRoomId,
    gameId: "starcraft-tmg",
    initialStateAuthority: {
      source: "server_factory",
      state: accessState,
      dataVersion: data.version,
      receiptHash: hashStarcraftTmgContract({ inviteRoomId, accessState }),
    },
    serverSeatPlan: [
      { label: "host", seatKey: "player1", roleMode: "player", principalType: "human" },
    ],
  });
  const invitation = await runtime.issueInvite({
    roomId: inviteRoomId,
    seatToken: inviteCreated.credentials.host.seatToken,
  });
  assert(invitation.ok, "saturation invite fixture issue failed");
  const exchangesBeforeInvite = saturationAccessExchangeCalls;
  result = await saturationClient.bootstrap({
    route: { roomId: inviteRoomId },
    principal: { access: { kind: "invite", token: invitation.invite.inviteToken } },
    surface: "verifier",
  });
  assertRejected(result, "REPLAY_INTEGRITY_REGISTRY_SATURATED",
    "saturated registry invite preflight");
  assert(saturationAccessExchangeCalls === exchangesBeforeInvite,
    "saturated registry consumed an invite before rejecting bootstrap");
  const freshInviteClient = createStarcraftTmgClientDomain({
    transport: baseTransport,
    projectionStore: createInMemoryStarcraftTmgProjectionStoreAdapter(),
    lifecycle: createInMemoryStarcraftTmgLifecycleAdapter(),
    now: () => OCCURRED_AT,
  });
  result = await freshInviteClient.bootstrap({
    route: { roomId: inviteRoomId },
    principal: { access: { kind: "invite", token: invitation.invite.inviteToken } },
    surface: "verifier",
  });
  assert(result.ok, "saturation preflight burned the one-time invite capability");

  const recoveryRoomId = "ticket-14-response-binding-saturation-recovery";
  const recoveryCreated = await runtime.createRoom({
    roomId: recoveryRoomId,
    gameId: "starcraft-tmg",
    initialStateAuthority: {
      source: "server_factory",
      state: accessState,
      dataVersion: data.version,
      receiptHash: hashStarcraftTmgContract({ recoveryRoomId, accessState }),
    },
    serverSeatPlan: [
      { label: "host", seatKey: "player1", roleMode: "player", principalType: "human" },
    ],
  });
  const recoveryTicket = await runtime.issueSeatRecovery({
    roomId: recoveryRoomId,
    seatToken: recoveryCreated.credentials.host.seatToken,
  });
  assert(recoveryTicket.ok, "saturation recovery fixture issue failed");
  const exchangesBeforeRecovery = saturationAccessExchangeCalls;
  result = await saturationClient.bootstrap({
    route: { roomId: recoveryRoomId },
    principal: { access: { kind: "recovery", token: recoveryTicket.recovery.recoveryToken } },
    surface: "verifier",
  });
  assertRejected(result, "REPLAY_INTEGRITY_REGISTRY_SATURATED",
    "saturated registry recovery preflight");
  assert(saturationAccessExchangeCalls === exchangesBeforeRecovery,
    "saturated registry consumed a recovery capability before rejecting bootstrap");
  const freshRecoveryClient = createStarcraftTmgClientDomain({
    transport: baseTransport,
    projectionStore: createInMemoryStarcraftTmgProjectionStoreAdapter(),
    lifecycle: createInMemoryStarcraftTmgLifecycleAdapter(),
    now: () => OCCURRED_AT,
  });
  result = await freshRecoveryClient.bootstrap({
    route: { roomId: recoveryRoomId },
    principal: { access: { kind: "recovery", token: recoveryTicket.recovery.recoveryToken } },
    surface: "verifier",
  });
  assert(result.ok, "saturation preflight burned the one-time recovery capability");
  result = await saturationClient.bootstrap({
    route: { roomId: saturationRoomId },
    principal: { seatToken: saturationCreated.credentials["scope-17"].seatToken },
    surface: "verifier",
  });
  assertRejected(result, "REPLAY_INTEGRITY_REGISTRY_SATURATED",
    "seventeenth principal scope overflow");
  corruptSaturationReplay = false;
  result = await saturationClient.bootstrap({
    route: { roomId: saturationRoomId },
    principal: { seatToken: saturationCreated.credentials["scope-1"].seatToken },
    surface: "verifier",
  });
  assert(result.ok && saturationClient.read().integrity.replayBlocked === true,
    "registry saturation evicted the oldest blocked scope");
  result = await saturationClient.dispatch({ type: "revalidate_authority" });
  assert(result.ok && saturationClient.read().integrity.replayBlocked === false,
    "authoritative revalidation did not release one saturated registry scope");
  result = await saturationClient.bootstrap({
    route: { roomId: saturationRoomId },
    principal: { seatToken: saturationCreated.credentials["scope-17"].seatToken },
    surface: "verifier",
  });
  assert(result.ok && saturationClient.read().integrity.replayBlocked === false,
    "registry stayed saturated after an explicit scope revalidation");

  const forgedPreview = await fixture("forged-preview");
  result = await forgedPreview.client.dispatch({ type: "load_legal_space" });
  assert(result.ok, "forged preview fixture LegalSpace failed");
  const forgedPreviewDomain = forgedPreview.client.read().legalSpace.parameterDomains
    .find((entry) => entry.actionType === "move");
  forgedPreview.setMutator((operation, response) => {
    if (operation !== "preview_action") return response;
    response.preview.core.action.to = { xInches: 12.345, yInches: 12.345 };
    response.preview.previewSeal.contentHash = hashStarcraftTmgClientContract({
      previewId: response.preview.previewId,
      core: response.preview.core,
    });
    response.preview.previewSeal.mac = "A".repeat(43);
    response.preview.previewToken = `${response.preview.previewId}.${response.preview.previewSeal.mac}`;
    return response;
  });
  result = await forgedPreview.client.dispatch({
    type: "preview_parameterized",
    domainId: forgedPreviewDomain.domainId,
    parameters: movementParameters(forgedPreviewDomain),
  });
  assert(result.ok, "structurally self-consistent forged Preview did not reach confirmation gate");
  const forgedPreviewId = forgedPreview.client.read().pendingPreview.previewId;
  result = await forgedPreview.client.dispatch({
    type: "confirm_and_apply_preview",
    previewId: forgedPreviewId,
  });
  assertRejected(result, "PREVIEW_BINDING_MISMATCH", "forged Preview confirmation binding");
  assert(forgedPreview.client.read().roomProjection.room.stateRevision === 0,
    "forged Preview confirmation changed authoritative state");
  assert(!forgedPreview.calls.includes("apply_action"),
    "forged Preview reached Apply after binding rejection");

  let capturedValidReceipt = null;
  const forgedReceipt = await fixture("forged-receipt");
  result = await forgedReceipt.client.dispatch({ type: "load_legal_space" });
  const forgedReceiptDomain = forgedReceipt.client.read().legalSpace.parameterDomains
    .find((entry) => entry.actionType === "move");
  result = await forgedReceipt.client.dispatch({
    type: "preview_parameterized",
    domainId: forgedReceiptDomain.domainId,
    parameters: movementParameters(forgedReceiptDomain),
  });
  const forgedReceiptPreviewId = forgedReceipt.client.read().pendingPreview.previewId;
  forgedReceipt.setMutator((operation, response) => {
    if (operation !== "apply_action") return response;
    capturedValidReceipt = clone(response.receipt);
    response.receipt.refereeSignature.signature = "B".repeat(86);
    const { journalHash: _journalHash, refereeSignature, audit: _audit, ...core } = response.receipt;
    response.receipt.journalHash = hashStarcraftTmgClientContract({ receipt: core, refereeSignature });
    response.envelope.journalHeadHash = response.receipt.journalHash;
    return response;
  });
  result = await forgedReceipt.client.dispatch({
    type: "confirm_and_apply_preview",
    previewId: forgedReceiptPreviewId,
  });
  assertRejected(result, "RECEIPT_RESPONSE_INVALID", "forged structurally valid receipt");
  assert(forgedReceipt.client.read().lastReceipt === null,
    "forged receipt was published as authoritative success");
  assert(forgedReceipt.client.read().roomProjection.room.stateRevision === 1,
    "forged receipt recovery did not refresh the actual authority state");

  const mixedReceipt = await fixture("mixed-receipt");
  result = await mixedReceipt.client.dispatch({ type: "load_legal_space" });
  const mixedReceiptDomain = mixedReceipt.client.read().legalSpace.parameterDomains
    .find((entry) => entry.actionType === "move");
  result = await mixedReceipt.client.dispatch({
    type: "preview_parameterized",
    domainId: mixedReceiptDomain.domainId,
    parameters: movementParameters(mixedReceiptDomain),
  });
  const mixedReceiptPreviewId = mixedReceipt.client.read().pendingPreview.previewId;
  mixedReceipt.setMutator((operation, response) => {
    if (operation !== "apply_action") return response;
    response.receipt = clone(capturedValidReceipt);
    return response;
  });
  result = await mixedReceipt.client.dispatch({
    type: "confirm_and_apply_preview",
    previewId: mixedReceiptPreviewId,
  });
  assertRejected(result, "RECEIPT_RESPONSE_INVALID", "cross-room mixed receipt");
  assert(mixedReceipt.client.read().lastReceipt === null,
    "mixed receipt was published as authoritative success");

  const publicReplayTamper = createStarcraftTmgClientDomain({
    transport: {
      async execute(request) {
        const response = clone(await baseTransport.execute(request));
        if (request.operation === "read_replay") {
          response.replay.finalProjection.state.pieces[0].name = "tampered-public-piece";
        }
        return response;
      },
    },
    projectionStore: createInMemoryStarcraftTmgProjectionStoreAdapter(),
    lifecycle: createInMemoryStarcraftTmgLifecycleAdapter(),
    now: () => OCCURRED_AT,
  });
  result = await publicReplayTamper.bootstrap({
    route: { roomId: real.roomId },
    surface: "verifier",
  });
  assert(result.ok, "public replay tamper fixture bootstrap failed");
  result = await publicReplayTamper.dispatch({ type: "read_replay" });
  assertRejected(result, "REPLAY_RESPONSE_INVALID", "public replay state tamper");

  const replayAvailability = await fixture("replay-availability");
  result = await replayAvailability.client.dispatch({ type: "load_legal_space" });
  const availabilityDomain = replayAvailability.client.read().legalSpace.parameterDomains
    .find((entry) => entry.actionType === "move");
  result = await replayAvailability.client.dispatch({
    type: "preview_parameterized",
    domainId: availabilityDomain.domainId,
    parameters: movementParameters(availabilityDomain),
  });
  const availabilityPreviewId = replayAvailability.client.read().pendingPreview.previewId;
  result = await replayAvailability.client.dispatch({
    type: "confirm_and_apply_preview",
    previewId: availabilityPreviewId,
  });
  assert(result.ok, "Replay availability fixture Apply failed");
  replayAvailability.lifecycle.emit({ visibility: "background" });
  result = await replayAvailability.client.dispatch({ type: "read_replay" });
  assertRejected(result, "OFFLINE_READ_ONLY", "background Replay preflight");
  assert(replayAvailability.client.read().integrity.replayBlocked === true
    && replayAvailability.client.read().integrity.blockedAtStateRevision === 1,
  "background Replay preflight did not latch the current valid revision");
  replayAvailability.lifecycle.emit({ visibility: "active" });
  result = await replayAvailability.client.dispatch({ type: "refresh" });
  assert(result.ok && replayAvailability.client.read().integrity.replayBlocked === true,
    "foreground lifecycle/ordinary refresh cleared Replay integrity");
  result = await replayAvailability.client.dispatch({ type: "claim_control" });
  assertRejected(result, "REPLAY_INTEGRITY_BLOCKED", "write after background Replay failure");
  result = await replayAvailability.client.dispatch({ type: "revalidate_authority" });
  assert(result.ok && replayAvailability.client.read().integrity.replayBlocked === false,
    "background Replay failure was not cleared by atomic revalidation");

  replayAvailability.setMutator((operation, response) => {
    if (operation === "read_replay") {
      throw Object.assign(new Error("simulated Replay timeout"), { code: "NETWORK_UNAVAILABLE" });
    }
    return response;
  });
  result = await replayAvailability.client.dispatch({ type: "read_replay" });
  assert(replayAvailability.client.read().integrity.replayBlocked === true,
    "Replay transport throw after Apply did not latch integrity");
  replayAvailability.setMutator(null);
  result = await replayAvailability.client.dispatch({ type: "refresh" });
  assert(result.ok && replayAvailability.client.read().integrity.replayBlocked === true,
    "ordinary refresh cleared Replay transport-failure latch");
  result = await replayAvailability.client.dispatch({ type: "issue_recovery" });
  assertRejected(result, "REPLAY_INTEGRITY_BLOCKED", "write after Replay transport failure");
  result = await replayAvailability.client.dispatch({ type: "revalidate_authority" });
  assert(result.ok && replayAvailability.client.read().integrity.replayBlocked === false,
    "Replay transport-failure latch was not cleared by atomic revalidation");

  const hostile = await fixture("hostile");
  hostile.setMutator((operation, response) => {
    if (operation !== "read_legal_space") return response;
    response.legalSpace.roomId = "other-room";
    response.legalSpace.legalSpaceHash = hashStarcraftTmgClientContract(
      legalSpaceCore(response.legalSpace),
    );
    return response;
  });
  result = await hostile.client.dispatch({ type: "load_legal_space" });
  assertRejected(result, "LEGAL_SPACE_RESPONSE_INVALID", "self-consistent cross-room LegalSpace");

  hostile.setMutator(null);
  result = await hostile.client.dispatch({ type: "load_legal_space" });
  assert(result.ok, "hostile fixture could not restore a valid LegalSpace");
  const hostileDomain = hostile.client.read().legalSpace.parameterDomains.find((entry) => entry.actionType === "move");
  const hostileProposal = {
    type: "preview_parameterized",
    domainId: hostileDomain.domainId,
    parameters: movementParameters(hostileDomain),
  };

  hostile.setMutator((operation, response) => {
    if (operation !== "preview_action") return response;
    response.preview.core.roomId = "other-room";
    response.preview.previewSeal.contentHash = hashStarcraftTmgClientContract({
      previewId: response.preview.previewId,
      core: response.preview.core,
    });
    response.preview.previewToken = `${response.preview.previewId}.${response.preview.previewSeal.mac}`;
    return response;
  });
  result = await hostile.client.dispatch(hostileProposal);
  assertRejected(result, "PREVIEW_RESPONSE_INVALID", "self-consistent cross-room preview");

  hostile.setMutator((operation, response) => {
    if (operation !== "preview_action") return response;
    response.preview.previewSeal.contentHash = "0".repeat(64);
    return response;
  });
  result = await hostile.client.dispatch(hostileProposal);
  assertRejected(result, "PREVIEW_RESPONSE_INVALID", "preview with detached seal hash");

  hostile.setMutator(null);
  result = await hostile.client.dispatch(hostileProposal);
  assert(result.ok, "hostile fixture could not restore a valid preview");
  const hostilePreviewId = hostile.client.read().pendingPreview.previewId;
  result = await hostile.client.dispatch({
    type: "confirm_and_apply_preview",
    previewId: hostilePreviewId,
  });
  assert(result.ok, "hostile fixture apply failed");

  hostile.setMutator((operation, response) => {
    if (operation !== "read_replay") return response;
    response.replay.envelope.roomId = "other-room";
    response.replay.finalProjection.room.roomId = "other-room";
    return response;
  });
  result = await hostile.client.dispatch({ type: "read_replay" });
  assertRejected(result, "REPLAY_RESPONSE_INVALID", "matchesCurrent cross-room replay");

  hostile.setMutator((operation, response) => {
    if (operation !== "read_replay") return response;
    response.receiptCount = -1;
    response.replayedTailReceiptCount = -1;
    return response;
  });
  result = await hostile.client.dispatch({ type: "read_replay" });
  assertRejected(result, "REPLAY_RESPONSE_INVALID", "negative replay counters");

  hostile.setMutator((operation, response) => {
    if (operation !== "read_replay") return response;
    response.replay.envelope.matchBinding = clone(response.replay.finalProjection.matchBinding);
    return response;
  });
  result = await hostile.client.dispatch({ type: "read_replay" });
  assertRejected(result, "REPLAY_RESPONSE_INVALID", "raw match binding in replay envelope");

  hostile.setMutator((operation, response) => {
    if (operation !== "read_replay") return response;
    response.replay.finalProjection.viewer.seatKey = "player2";
    return response;
  });
  result = await hostile.client.dispatch({ type: "read_replay" });
  assertRejected(result, "REPLAY_RESPONSE_INVALID", "cross-seat replay projection");
  assert(hostile.client.read().integrity.replayBlocked === true,
    "invalid Replay did not latch Client Domain integrity blocking");
  let remountedView = null;
  const unsubscribe = hostile.client.subscribe((view) => { remountedView = view; });
  unsubscribe();
  assert(remountedView.integrity.replayBlocked === true,
    "view remount/subscription cleared the Replay integrity latch");
  hostile.setMutator(null);
  result = await hostile.client.bootstrap({
    route: { roomId: hostile.roomId },
    principal: { seatToken: hostile.credentials.host.seatToken },
    surface: "verifier",
  });
  assert(result.ok && hostile.client.read().integrity.replayBlocked === true,
    "same-room/same-principal bootstrap cleared the Replay integrity latch");
  result = await hostile.client.dispatch({ type: "refresh" });
  assert(result.ok && hostile.client.read().integrity.replayBlocked === true,
    "ordinary refresh after same-room bootstrap cleared Replay integrity");
  result = await hostile.client.dispatch({ type: "claim_control" });
  assertRejected(result, "REPLAY_INTEGRITY_BLOCKED", "same-room bootstrap write bypass");

  result = await hostile.client.bootstrap({
    route: { roomId: hostile.roomId },
    principal: { seatToken: hostile.credentials.guest.seatToken },
    surface: "verifier",
  });
  assert(result.ok && hostile.client.read().integrity.replayBlocked === false,
    "guest inherited the host Replay integrity latch");
  result = await hostile.client.dispatch({ type: "revalidate_authority" });
  assert(result.ok, "guest authority revalidation failed");
  result = await hostile.client.bootstrap({
    route: { roomId: hostile.roomId },
    principal: { seatToken: hostile.credentials.host.seatToken },
    surface: "verifier",
  });
  assert(result.ok && hostile.client.read().integrity.replayBlocked === true,
    "guest revalidation laundered the host Replay integrity latch");

  result = await hostile.client.bootstrap({
    route: { roomId: real.roomId },
    principal: { seatToken: real.credentials.host.seatToken },
    surface: "verifier",
  });
  assert(result.ok && hostile.client.read().integrity.replayBlocked === false,
    "unblocked second room inherited first-room Replay integrity");
  result = await hostile.client.bootstrap({
    route: { roomId: hostile.roomId },
    principal: { seatToken: hostile.credentials.host.seatToken },
    surface: "verifier",
  });
  assert(result.ok && hostile.client.read().integrity.replayBlocked === true,
    "A-to-B-to-A bootstrap laundered the original Replay integrity latch");
  result = await hostile.client.dispatch({ type: "claim_control" });
  assertRejected(result, "REPLAY_INTEGRITY_BLOCKED", "write while Replay integrity blocked");
  result = await hostile.client.dispatch({ type: "read_replay" });
  assert(result.ok, "ordinary Replay could not be read while integrity remained blocked");
  assert(hostile.client.read().integrity.replayBlocked === true,
    "ordinary successful Replay silently cleared the integrity latch");
  result = await hostile.client.dispatch({ type: "revalidate_authority" });
  assert(result.ok && result.outcome === "authority_revalidated",
    "refresh-then-Replay integrity recovery failed");
  assert(hostile.client.read().integrity.replayBlocked === false,
    "successful atomic authority revalidation did not clear the integrity latch");
  result = await hostile.client.dispatch({ type: "claim_control" });
  assert(result.ok, "write remained blocked after successful authority revalidation");

  console.log(JSON.stringify({
    schema: "starcraft_tmg_ticket_14_client_response_binding_verification_v1",
    status: "passed",
    checks: [
      "real_legal_preview_confirm_apply_receipt_replay_contract",
      "preview_never_directly_applies_a_drag_or_gesture",
      "self_consistent_cross_room_legal_space_rejected",
      "self_consistent_cross_room_preview_rejected",
      "preview_seal_content_hash_binding_rejected",
      "exact_preview_token_and_content_hash_round_trip_rejects_forged_preview",
      "forged_receipt_never_published_and_recovers_current_authority",
      "cross_room_mixed_receipt_never_published",
      "cross_room_replay_rejected_even_when_matches_current_claimed",
      "negative_replay_counters_rejected",
      "raw_match_binding_replay_envelope_rejected",
      "cross_seat_replay_projection_rejected",
      "in_memory_replay_preserves_viewer_seat_scope",
      "public_observer_replay_accepts_only_public_viewer_projection",
      "public_observer_replay_rejects_exact_state_tamper",
      "viewer_projection_v3_omits_future_authority_only_canary",
      "same_team_private_projection_is_preserved_while_enemy_roster_is_rejected",
      "client_rejects_unknown_projection_state_and_nested_viewer_fields",
      "client_rejects_unknown_room_binding_control_and_training_subcontract_fields",
      "client_rejects_unrequested_public_or_private_journals",
      "client_rejects_schema_valid_cross_seat_private_state",
      "bootstrap_credential_class_is_exactly_bound_to_public_or_seat_viewer",
      "replay_integrity_latch_survives_view_remount_and_blocks_writes",
      "same_room_bootstrap_and_a_b_a_room_switch_cannot_clear_integrity_latch",
      "replay_integrity_latches_are_principal_scoped_and_cross_seat_revalidation_cannot_clear_host",
      "bounded_integrity_registry_rejects_overflow_without_evicting_blocked_scopes",
      "saturated_registry_preflight_never_consumes_invite_or_recovery_capabilities",
      "ordinary_replay_cannot_clear_integrity_latch",
      "refresh_then_replay_revalidation_is_the_only_integrity_unlock",
      "background_replay_preflight_latches_valid_revision_across_foreground_refresh",
      "post_apply_replay_transport_throw_latches_and_blocks_all_writes",
      "replay_transport_latch_clears_only_after_atomic_revalidation",
      "unbound_replay_read_never_creates_a_nan_integrity_latch",
    ],
    clientCryptographicClaim: "structure_hash_and_session_binding_only",
    trustedEd25519VerificationClaimed: false,
    trustedHmacVerificationClaimed: false,
    trainingTruth: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
