import { randomBytes } from "node:crypto";
import {
  createStarcraftTmgAuthoritativeEngine,
  hashStarcraftTmgContract,
  STARCRAFT_TMG_AUTHORITY_VERSION,
} from "../authoritative-engine/transition-v1.mjs";
import {
  assertStarcraftTmgRoomStore,
  cloneRoomStoreValue,
  createInMemoryStarcraftTmgRoomStore,
} from "../room-store/room-store-v1.mjs";

export const STARCRAFT_TMG_ROOM_RUNTIME_VERSION = "starcraft_tmg_room_runtime_v2";

const ROLE_MODES = new Set(["player", "tutor", "opponent", "commentator", "companion", "supervisor"]);
const APPLY_CAPABILITIES = Object.freeze(["read_room", "read_legal_space", "preview", "confirm", "apply", "read_own_private"]);

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return cloneRoomStoreValue(value);
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function nonEmpty(value, field) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new Error(`${field} is required`);
  return normalized;
}

function roleMode(value) {
  const normalized = String(value || "player").trim().toLowerCase();
  if (!ROLE_MODES.has(normalized)) throw new Error(`unsupported roleMode: ${normalized}`);
  return normalized;
}

function capabilitiesForRole(mode, principalType) {
  if (mode === "player" || mode === "supervisor") return [...APPLY_CAPABILITIES];
  if (mode === "opponent") return ["read_room", "read_legal_space", "preview", "submit_decision"];
  if (mode === "tutor") return ["read_room", "read_legal_space"];
  if (mode === "commentator" || mode === "companion") return ["read_room"];
  return principalType === "model" ? ["read_room"] : [];
}

function rejection(reason, details = {}) {
  return deepFreeze({
    ok: false,
    schemaVersion: `${STARCRAFT_TMG_ROOM_RUNTIME_VERSION}.rejection`,
    reason,
    ...clone(details),
  });
}

function token() {
  return randomBytes(32).toString("base64url");
}

function tokenHash(roomId, rawToken) {
  return hashStarcraftTmgContract({ schemaVersion: "starcraft_tmg_seat_token_digest_v1", roomId, token: rawToken });
}

function publicMatchBinding(binding) {
  return {
    schemaVersion: binding.schemaVersion,
    matchId: binding.matchId,
    gameId: binding.gameId,
    roomId: binding.roomId,
    rulesVersion: binding.rulesVersion,
    dataVersion: binding.dataVersion,
    rngSchemeId: binding.rngSchemeId,
    sourceSnapshotHash: binding.sourceSnapshotHash,
    dataSnapshotHash: binding.dataSnapshotHash,
    rulesArtifactHash: binding.rulesArtifactHash,
    executorArtifactHash: binding.executorArtifactHash,
    geometryArtifactHash: binding.geometryArtifactHash,
    actionSchemaHash: binding.actionSchemaHash,
    refereeKeyId: binding.refereeKeyId,
    refereePublicKeyFingerprint: binding.refereePublicKeyFingerprint,
    rulesRuntimeBinding: clone(binding.rulesRuntimeBinding),
    rulesDisplayBinding: clone(binding.rulesDisplayBinding),
    productionReady: binding.productionReady === true,
    bindingHash: binding.bindingHash,
    refereeSignature: clone(binding.refereeSignature),
  };
}

function filteredBySide(value, allowedSideKeys) {
  if (!object(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([sideKey]) => (
    allowedSideKeys.has(sideKey))).map(([sideKey, row]) => [sideKey, clone(row)]));
}

export function projectStarcraftTmgStateForViewerV2(state, seatKey = null) {
  const projection = clone(state);
  if (!seatKey) projection.cardResources = {};
  else projection.cardResources = { [seatKey]: clone(state.cardResources?.[seatKey] || []) };
  const visibility = state.rosterVisibilityResolution?.rosterVisibility;
  const teamId = state.rosterRegistryResolution?.teamMembershipByPlayer?.[seatKey];
  const alliedSideKeys = new Set(seatKey ? [seatKey] : []);
  if (teamId) {
    for (const [playerId, playerTeamId] of Object.entries(
      state.rosterRegistryResolution?.teamMembershipByPlayer || {})) {
      if (playerTeamId === teamId) alliedSideKeys.add(playerId);
    }
  }
  const revealAllRosters = visibility === "open";
  const visiblePrivateSideKeys = revealAllRosters
    ? new Set(Object.keys(state.players || {})) : alliedSideKeys;
  for (const field of ["armyBuildingConfigurationBySide",
    "armyResourceBudgetsBySide", "unitCompositionSelectionsBySide",
    "unitUpgradeSelectionsBySide", "armyCompositionUpgradeAuditsBySide"]) {
    if (field in projection) {
      projection[field] = filteredBySide(state[field], visiblePrivateSideKeys);
    }
  }
  delete projection.authoritativeRosterRegistry;
  delete projection.authoritativeArmyRostersBySide;
  projection.ownTeamArmyRostersBySide = filteredBySide(
    state.authoritativeArmyRostersBySide, alliedSideKeys);
  if (projection.pendingAction?.schema
    === "starcraft_tmg_official_roster_disclosure_rules_pending_v1") {
    projection.pendingAction.choices = (projection.pendingAction.choices || [])
      .map((entry) => withoutPrivateRosterChoice(entry));
  }
  projection.equipmentReminderPermitsByActionHash = Object.fromEntries(
    Object.entries(state.equipmentReminderPermitsByActionHash || {})
      .filter(([, permit]) => alliedSideKeys.has(String(permit?.playerId || "")))
      .map(([key, permit]) => [key, clone(permit)]));
  projection.privateRosterDisclosureConductIncidents = (
    state.privateRosterDisclosureConductIncidents || [])
    .filter((entry) => alliedSideKeys.has(String(entry?.playerId || "")))
    .map((entry) => clone(entry));
  projection.log = (projection.log || []).map((entry) => {
    if (entry.action?.actionType !== "use_card_resource") return entry;
    if (entry.action.sideKey === seatKey) return entry;
    return { ...entry, action: { actionType: "use_card_resource", sideKey: entry.action.sideKey }, events: [{ type: "card_resource_used", sideKey: entry.action.sideKey }] };
  });
  return projection;
}

function withoutPrivateRosterChoice(entry) {
  const value = clone(entry);
  delete value.result;
  return value;
}

function projectState(state, seatKey = null) {
  return projectStarcraftTmgStateForViewerV2(state, seatKey);
}

function publicReceipt(receipt) {
  return {
    schemaVersion: "starcraft_tmg_public_transition_v1",
    gameId: receipt.gameId,
    roomId: receipt.roomId,
    matchBindingHash: receipt.matchBindingHash,
    preStateRevision: receipt.preStateRevision,
    postStateRevision: receipt.postStateRevision,
    preStateHash: receipt.preStateHash,
    postStateHash: receipt.postStateHash,
    legalSpaceHash: receipt.legalSpaceHash,
    proposalHash: receipt.proposalHash,
    action: clone(receipt.action),
    eventsHash: receipt.eventsHash,
    events: clone(receipt.events),
    journalHash: receipt.journalHash,
    refereeSignature: clone(receipt.refereeSignature),
    trainingTruth: false,
  };
}

function journalEvent(type, payload, visibility = "referee") {
  return {
    schemaVersion: "starcraft_tmg_room_journal_event_v1",
    type,
    visibility,
    payload: clone(payload),
    trainingTruth: false,
  };
}

function roomSummary(aggregate) {
  return {
    schemaVersion: `${STARCRAFT_TMG_ROOM_RUNTIME_VERSION}.summary`,
    roomId: aggregate.roomId,
    gameId: aggregate.gameId,
    title: aggregate.title,
    surfaceMode: aggregate.surfaceMode,
    matchBindingHash: aggregate.envelope.matchBindingHash,
    roomRevision: aggregate.roomRevision,
    stateRevision: aggregate.stateRevision,
    revision: aggregate.stateRevision,
    stateHash: aggregate.envelope.stateHash,
    journalHeadHash: aggregate.envelope.journalHeadHash,
    privateJournalSequence: aggregate.privateJournalSequence,
    publicJournalSequence: aggregate.publicJournalSequence,
    seatRecoveryRevision: aggregate.seatRecoveryRevision,
    previewCount: Object.keys(aggregate.previews || {}).length,
    acceptedReceiptCount: aggregate.acceptedReceiptCount,
    durability: aggregate.durability,
    rulesRuntimeBinding: clone(aggregate.rulesRuntimeBinding),
    productionReady: aggregate.productionReady === true,
    trainingTruth: false,
  };
}

function createGrant(authorityEngine, envelope, spec, recoveryRevision) {
  const seatToken = token();
  const mode = roleMode(spec.roleMode || "player");
  const principalType = String(spec.principalType || (mode === "opponent" ? "model" : "human"));
  const grantId = String(spec.grantId || `sc-grant-${hashStarcraftTmgContract({ roomId: envelope.roomId, seatKey: spec.seatKey, mode, nonce: seatToken })}`);
  const capabilities = Array.isArray(spec.capabilities) ? spec.capabilities : capabilitiesForRole(mode, principalType);
  const authority = authorityEngine.issueSeatAuthority({
    grantId,
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey: spec.seatKey,
    roleMode: mode,
    principalType,
    visibilityScope: spec.visibilityScope || "seat",
    capabilities,
    recoveryRevision,
  });
  return {
    record: {
      grantId,
      seatKey: spec.seatKey,
      roleMode: mode,
      principalType,
      label: String(spec.label || mode),
      tokenHash: tokenHash(envelope.roomId, seatToken),
      authority,
      revoked: false,
    },
    credential: { grantId, seatKey: spec.seatKey, roleMode: mode, seatToken },
  };
}

export function createStarcraftTmgRoomRuntime(options = {}) {
  const authorityEngine = options.authorityEngine || createStarcraftTmgAuthoritativeEngine();
  const roomStore = assertStarcraftTmgRoomStore(options.roomStore || createInMemoryStarcraftTmgRoomStore());
  const now = typeof options.now === "function" ? options.now : () => new Date().toISOString();
  const checkpointInterval = Math.max(1, Number(options.checkpointInterval || 16));

  async function load(roomId) {
    return roomStore.loadRoom(String(roomId || ""));
  }

  function authenticate(aggregate, seatToken, capability = null) {
    if (!seatToken) throw Object.assign(new Error("seat token is required"), { code: "AUTHENTICATION_REQUIRED" });
    const digest = tokenHash(aggregate.roomId, seatToken);
    const grant = Object.values(aggregate.grants || {}).find((entry) => entry.tokenHash === digest && !entry.revoked);
    if (!grant) throw Object.assign(new Error("SeatGrant is invalid"), { code: "SEAT_GRANT_INVALID" });
    if (capability && !grant.authority.capabilities.includes(capability)) {
      throw Object.assign(new Error(`SeatGrant lacks ${capability}`), { code: "CAPABILITY_DENIED" });
    }
    return grant;
  }

  async function commitRejection(aggregate, grant, operation, rejected) {
    const next = clone(aggregate);
    next.roomRevision += 1;
    next.privateJournalSequence += 1;
    next.updatedAtAudit = now();
    try {
      await roomStore.commit(aggregate.roomId, {
        roomRevision: aggregate.roomRevision,
        stateRevision: aggregate.stateRevision,
      }, {
        nextAggregate: next,
        privateEvents: [journalEvent("rejected_attempt", {
          operation,
          actorGrantId: grant?.grantId || null,
          seatKey: grant?.seatKey || null,
          reason: rejected.reason,
          detailsHash: hashStarcraftTmgContract(rejected),
        }, grant ? `actor:${grant.grantId}|referee` : "referee")],
        publicEvents: [],
        recoveryUpdates: [],
      });
    } catch {}
    return rejected;
  }

  async function createRoom(input = {}) {
    try {
      const roomId = nonEmpty(input.roomId, "roomId");
      const trusted = input.initialStateAuthority;
      if (!object(trusted) || trusted.source !== "server_factory" || !object(trusted.state) || !String(trusted.receiptHash || "").trim()) {
        return rejection("INITIAL_STATE_AUTHORITY_REQUIRED", { clientInitialStateAccepted: false });
      }
      const authorityHealth = authorityEngine.health();
      if (input.productionRoom === true
        && authorityHealth.rulesRuntimeBinding?.productionRoomEligible !== true) {
        return rejection("PRODUCTION_RULE_RUNTIME_REQUIRED", {
          rulesRuntimeBinding: clone(authorityHealth.rulesRuntimeBinding || null),
          trainingTruth: false,
        });
      }
      const envelope = authorityEngine.createEnvelope({
        gameId: input.gameId || "starcraft-tmg",
        roomId,
        matchId: input.matchId,
        dataVersion: trusted.dataVersion || input.dataVersion,
        state: trusted.state,
        dependencies: trusted.dependencies,
        rulesDisplay: trusted.rulesDisplay,
        rngSchemeId: trusted.rngSchemeId,
        productionReady: input.productionRoom === true,
      });
      const plan = Array.isArray(input.serverSeatPlan) && input.serverSeatPlan.length
        ? input.serverSeatPlan
        : [{ label: "host", seatKey: "player1", roleMode: "player", principalType: "human" }];
      const grants = {};
      const credentials = {};
      const recoveryUpdates = [];
      plan.forEach((spec, index) => {
        if (!spec.seatKey || grants[spec.grantId]) throw new Error("server seat plan is invalid");
        const issued = createGrant(authorityEngine, envelope, spec, index + 1);
        grants[issued.record.grantId] = issued.record;
        credentials[issued.record.label] = issued.credential;
        recoveryUpdates.push({
          schemaVersion: "starcraft_tmg_seat_recovery_record_v1",
          seatKey: issued.record.seatKey,
          grantId: issued.record.grantId,
          tokenHash: issued.record.tokenHash,
          roleMode: issued.record.roleMode,
          principalType: issued.record.principalType,
          capabilities: clone(issued.record.authority.capabilities),
          revoked: false,
        });
      });
      const privateGenesis = journalEvent("match_created", {
        initialStateAuthorityReceiptHash: trusted.receiptHash,
        matchBinding: clone(envelope.matchBinding),
        initialStateHash: envelope.stateHash,
      });
      const publicGenesis = journalEvent("match_created", {
        matchBinding: publicMatchBinding(envelope.matchBinding),
        initialPublicStateHash: hashStarcraftTmgContract(projectState(envelope.state, null)),
      }, "public");
      const storeHealth = await roomStore.health();
      const createdAtAudit = now();
      const aggregate = {
        schemaVersion: `${STARCRAFT_TMG_ROOM_RUNTIME_VERSION}.aggregate`,
        roomId,
        gameId: envelope.gameId,
        title: String(input.title || "StarCraft TMG authoritative room"),
        surfaceMode: String(input.surfaceMode || "classic"),
        createdAtAudit,
        updatedAtAudit: createdAtAudit,
        roomRevision: 0,
        stateRevision: 0,
        privateJournalSequence: 1,
        publicJournalSequence: 1,
        seatRecoveryRevision: recoveryUpdates.length,
        acceptedReceiptCount: 0,
        envelope,
        grants,
        leases: {},
        leaseFences: {},
        previews: {},
        confirmations: {},
        idempotency: {},
        traces: [],
        durability: storeHealth.durability,
        rulesRuntimeBinding: clone(envelope.matchBinding.rulesRuntimeBinding),
        productionReady: Boolean(
          input.productionRoom === true
            && envelope.matchBinding.productionReady === true
            && storeHealth.productionReady === true
        ),
        trainingTruth: false,
      };
      await roomStore.createRoom({
        roomId,
        aggregate,
        initialEnvelope: envelope,
        privateEvents: [privateGenesis],
        publicEvents: [publicGenesis],
        recoveryUpdates,
      });
      return deepFreeze({
        ok: true,
        room: roomSummary(aggregate),
        credentials,
        matchBinding: publicMatchBinding(envelope.matchBinding),
      });
    } catch (error) {
      return rejection(error.code || "ROOM_CREATION_FAILED", { message: error instanceof Error ? error.message : String(error) });
    }
  }

  async function joinRoom(input = {}) {
    const aggregate = await load(input.roomId);
    if (!aggregate) return rejection("ROOM_NOT_FOUND", { roomId: input.roomId || "" });
    const occupied = new Set(Object.values(aggregate.grants).filter((grant) => !grant.revoked).map((grant) => grant.seatKey));
    const seatKey = ["player1", "player2"].find((candidate) => !occupied.has(candidate));
    if (!seatKey) return rejection("ROOM_FULL");
    const issued = createGrant(authorityEngine, aggregate.envelope, { label: "guest", seatKey, roleMode: "player", principalType: "human" }, aggregate.seatRecoveryRevision + 1);
    const next = clone(aggregate);
    next.grants[issued.record.grantId] = issued.record;
    next.roomRevision += 1;
    next.privateJournalSequence += 1;
    next.seatRecoveryRevision += 1;
    next.updatedAtAudit = now();
    try {
      await roomStore.commit(aggregate.roomId, { roomRevision: aggregate.roomRevision, stateRevision: aggregate.stateRevision }, {
        nextAggregate: next,
        privateEvents: [journalEvent("seat_grant_issued", { grantId: issued.record.grantId, seatKey, roleMode: "player" })],
        publicEvents: [],
        recoveryUpdates: [{ seatKey, grantId: issued.record.grantId, tokenHash: issued.record.tokenHash, roleMode: "player", revoked: false }],
      });
      return deepFreeze({ ok: true, room: roomSummary(next), credential: issued.credential });
    } catch (error) {
      return rejection(error.code || "ROOM_COMMIT_FAILED", { message: error.message });
    }
  }

  async function readRoom(input = {}) {
    const aggregate = await load(input.roomId);
    if (!aggregate) return rejection("ROOM_NOT_FOUND", { roomId: input.roomId || "" });
    let grant = null;
    if (input.seatToken) {
      try { grant = authenticate(aggregate, input.seatToken, "read_room"); } catch (error) { return rejection(error.code, { message: error.message }); }
    }
    const projection = {
      schemaVersion: `${STARCRAFT_TMG_ROOM_RUNTIME_VERSION}.room-projection`,
      room: roomSummary(aggregate),
      viewer: grant ? {
        grantId: grant.grantId,
        seatKey: grant.seatKey,
        roleMode: grant.roleMode,
        visibilityScope: grant.authority.visibilityScope,
        capabilities: clone(grant.authority.capabilities),
      } : { roleMode: "public_observer", visibilityScope: "public", capabilities: ["read_public"] },
      matchBinding: publicMatchBinding(aggregate.envelope.matchBinding),
      authorityVersion: STARCRAFT_TMG_AUTHORITY_VERSION,
      state: projectState(aggregate.envelope.state, grant?.seatKey || null),
      training: { eligibleForTraining: false, trainingTruth: false, reviewStatus: "raw" },
    };
    if (input.includeJournal === true) {
      projection.publicJournal = await roomStore.readJournal(aggregate.roomId, "public", Number(input.cursor || 0));
      if (grant?.authority.capabilities.includes("read_own_private")) {
        const privateRows = await roomStore.readJournal(aggregate.roomId, "private", Number(input.privateCursor || 0));
        projection.ownPrivateJournal = privateRows.filter((entry) => {
          const visibility = String(entry.payload.visibility || "");
          return visibility === "referee" ? false : visibility.includes(`actor:${grant.grantId}`);
        });
      }
    }
    return deepFreeze({ ok: true, projection });
  }

  async function legalSpace(input = {}) {
    const aggregate = await load(input.roomId);
    if (!aggregate) return rejection("ROOM_NOT_FOUND", { roomId: input.roomId || "" });
    try {
      const grant = authenticate(aggregate, input.seatToken, "read_legal_space");
      return deepFreeze({ ok: true, legalSpace: authorityEngine.legalSpace(aggregate.envelope, { seatAuthority: grant.authority }) });
    } catch (error) {
      return rejection(error.code || "LEGAL_SPACE_FAILED", { message: error.message });
    }
  }

  async function previewAction(input = {}) {
    const aggregate = await load(input.roomId);
    if (!aggregate) return rejection("ROOM_NOT_FOUND", { roomId: input.roomId || "" });
    let grant;
    try { grant = authenticate(aggregate, input.seatToken, "preview"); } catch (error) { return rejection(error.code, { message: error.message }); }
    const result = authorityEngine.preview({
      envelope: aggregate.envelope,
      seatAuthority: grant.authority,
      proposal: input.proposal,
      candidateId: input.candidateId,
      occurredAt: input.occurredAt || now(),
    });
    if (!result.ok) return commitRejection(aggregate, grant, "preview", result);
    const next = clone(aggregate);
    next.previews[result.preview.previewId] = {
      preview: result.preview,
      actorGrantId: grant.grantId,
      actorRoleMode: grant.roleMode,
      status: "open",
      createdAtRoomRevision: aggregate.roomRevision,
    };
    next.roomRevision += 1;
    next.privateJournalSequence += 1;
    next.updatedAtAudit = now();
    try {
      await roomStore.commit(aggregate.roomId, { roomRevision: aggregate.roomRevision, stateRevision: aggregate.stateRevision }, {
        nextAggregate: next,
        privateEvents: [journalEvent("preview_sealed", {
          previewId: result.preview.previewId,
          previewContentHash: result.preview.previewSeal.contentHash,
          actorGrantId: grant.grantId,
          seatKey: grant.seatKey,
        }, `actor:${grant.grantId}|referee`)],
        publicEvents: [],
        recoveryUpdates: [],
      });
      return deepFreeze({ ok: true, preview: result.preview, confirmationRequired: result.preview.core.confirmationPolicy.requiresExplicitHuman, room: roomSummary(next) });
    } catch (error) {
      return rejection(error.code || "ROOM_COMMIT_FAILED", { message: error.message });
    }
  }

  async function confirmPreview(input = {}) {
    const aggregate = await load(input.roomId);
    if (!aggregate) return rejection("ROOM_NOT_FOUND", { roomId: input.roomId || "" });
    let grant;
    try { grant = authenticate(aggregate, input.seatToken, "confirm"); } catch (error) { return rejection(error.code, { message: error.message }); }
    const previewRecord = aggregate.previews[input.previewId];
    if (!previewRecord || previewRecord.status !== "open") return rejection("PREVIEW_NOT_FOUND", { previewId: input.previewId || "" });
    const result = authorityEngine.confirmPreview({ envelope: aggregate.envelope, preview: previewRecord.preview, seatAuthority: grant.authority, occurredAt: input.occurredAt || now() });
    if (!result.ok) return commitRejection(aggregate, grant, "confirm", result);
    const next = clone(aggregate);
    next.confirmations[result.confirmation.confirmationId] = result.confirmation;
    next.roomRevision += 1;
    next.privateJournalSequence += 1;
    next.updatedAtAudit = now();
    try {
      await roomStore.commit(aggregate.roomId, { roomRevision: aggregate.roomRevision, stateRevision: aggregate.stateRevision }, {
        nextAggregate: next,
        privateEvents: [journalEvent("preview_confirmed", {
          previewId: input.previewId,
          confirmationId: result.confirmation.confirmationId,
          confirmingGrantId: grant.grantId,
        }, `actor:${grant.grantId}|referee`)],
        publicEvents: [],
        recoveryUpdates: [],
      });
      return deepFreeze({ ok: true, confirmation: result.confirmation, room: roomSummary(next) });
    } catch (error) {
      return rejection(error.code || "ROOM_COMMIT_FAILED", { message: error.message });
    }
  }

  async function claimControl(input = {}) {
    const aggregate = await load(input.roomId);
    if (!aggregate) return rejection("ROOM_NOT_FOUND", { roomId: input.roomId || "" });
    let grant;
    try { grant = authenticate(aggregate, input.seatToken, "apply"); } catch (error) { return rejection(error.code, { message: error.message }); }
    const fence = Number(aggregate.leaseFences[grant.seatKey] || 0) + 1;
    let lease;
    try {
      lease = authorityEngine.issueControlLease({ seatAuthority: grant.authority, sessionId: nonEmpty(input.sessionId, "sessionId"), leaseFence: fence, issuedAtRoomRevision: aggregate.roomRevision });
    } catch (error) {
      return rejection(error.code || "CONTROL_LEASE_REQUIRED", { message: error.message });
    }
    const next = clone(aggregate);
    next.leases[grant.seatKey] = lease;
    next.leaseFences[grant.seatKey] = fence;
    next.roomRevision += 1;
    next.privateJournalSequence += 1;
    next.seatRecoveryRevision += 1;
    next.updatedAtAudit = now();
    try {
      await roomStore.commit(aggregate.roomId, { roomRevision: aggregate.roomRevision, stateRevision: aggregate.stateRevision }, {
        nextAggregate: next,
        privateEvents: [journalEvent("control_lease_claimed", { seatKey: grant.seatKey, grantId: grant.grantId, leaseId: lease.leaseId, leaseFence: fence })],
        publicEvents: [],
        recoveryUpdates: [{ seatKey: grant.seatKey, grantId: grant.grantId, leaseId: lease.leaseId, leaseFence: fence }],
      });
      return deepFreeze({ ok: true, controlLease: lease, room: roomSummary(next) });
    } catch (error) {
      return rejection(error.code || "ROOM_COMMIT_FAILED", { message: error.message });
    }
  }

  async function applyAction(input = {}) {
    const aggregate = await load(input.roomId);
    if (!aggregate) return rejection("ROOM_NOT_FOUND", { roomId: input.roomId || "" });
    let grant;
    try { grant = authenticate(aggregate, input.seatToken, "apply"); } catch (error) { return rejection(error.code, { message: error.message }); }
    const lease = aggregate.leases[grant.seatKey];
    if (!lease || lease.leaseId !== input.leaseId || lease.leaseFence !== input.leaseFence) return commitRejection(aggregate, grant, "apply", rejection("CONTROL_LEASE_FENCED"));
    const idempotencyKey = String(input.idempotencyKey || "").trim();
    if (!idempotencyKey) return rejection("IDEMPOTENCY_KEY_REQUIRED");
    const idempotencyHash = hashStarcraftTmgContract({ roomId: aggregate.roomId, grantId: grant.grantId, idempotencyKey });
    const requestHash = hashStarcraftTmgContract({ previewId: input.previewId, confirmationId: input.confirmationId || null, leaseId: lease.leaseId, leaseFence: lease.leaseFence });
    const existing = aggregate.idempotency[idempotencyHash];
    if (existing) {
      if (existing.requestHash !== requestHash) return rejection("IDEMPOTENCY_CONFLICT");
      return deepFreeze({ ...clone(existing.result), idempotentReplay: true });
    }
    const previewRecord = aggregate.previews[input.previewId];
    if (!previewRecord || previewRecord.status !== "open") return rejection("PREVIEW_NOT_FOUND", { previewId: input.previewId || "" });
    const confirmation = input.confirmationId ? aggregate.confirmations[input.confirmationId] : null;
    const applied = authorityEngine.apply({
      envelope: aggregate.envelope,
      expectedStateRevision: input.expectedStateRevision,
      seatAuthority: grant.authority,
      controlLease: lease,
      preview: previewRecord.preview,
      confirmation,
      idempotencyKey,
      occurredAt: input.occurredAt || now(),
    });
    if (!applied.ok) return commitRejection(aggregate, grant, "apply", applied);
    const responseResult = {
      ok: true,
      receipt: applied.receipt,
      envelope: applied.envelope,
      trainingTruth: false,
    };
    const next = clone(aggregate);
    next.envelope = applied.envelope;
    next.stateRevision = applied.envelope.stateRevision;
    next.roomRevision += 1;
    next.privateJournalSequence += 1;
    next.publicJournalSequence += 1;
    next.acceptedReceiptCount += 1;
    next.previews[input.previewId].status = "applied";
    next.previews[input.previewId].receiptHash = applied.receipt.journalHash;
    next.idempotency[idempotencyHash] = { requestHash, result: responseResult };
    next.updatedAtAudit = now();
    const checkpointResult = next.acceptedReceiptCount % checkpointInterval === 0
      ? authorityEngine.createCheckpoint(applied.envelope)
      : null;
    const checkpoint = checkpointResult?.ok ? checkpointResult.checkpoint : null;
    try {
      await roomStore.commit(aggregate.roomId, { roomRevision: aggregate.roomRevision, stateRevision: aggregate.stateRevision }, {
        nextAggregate: next,
        privateEvents: [journalEvent("accepted_transition", { receipt: applied.receipt, actorGrantId: grant.grantId, previewId: input.previewId })],
        publicEvents: [journalEvent("accepted_transition", publicReceipt(applied.receipt), "public")],
        recoveryUpdates: [],
        idempotencyRecords: [{ keyHash: idempotencyHash, result: { requestHash, result: responseResult } }],
        checkpoint,
      });
      return deepFreeze({ ...responseResult, room: roomSummary(next), checkpoint: checkpoint ? { checkpointHash: checkpoint.checkpointHash, stateRevision: checkpoint.stateRevision } : null, idempotentReplay: false });
    } catch (error) {
      return rejection(error.code || "ROOM_COMMIT_FAILED", { message: error.message });
    }
  }

  async function replayRoom(input = {}) {
    const aggregate = await load(input.roomId);
    if (!aggregate) return rejection("ROOM_NOT_FOUND", { roomId: input.roomId || "" });
    const bundle = await roomStore.loadReplayBundle(aggregate.roomId);
    if (bundle.latestCheckpoint) {
      const checkpointVerification = authorityEngine.verifyCheckpoint(bundle.latestCheckpoint, aggregate.envelope.matchBinding);
      if (!checkpointVerification.ok) return checkpointVerification;
    }
    const receipts = bundle.privateJournal
      .filter((entry) => entry.payload.type === "accepted_transition")
      .map((entry) => entry.payload.payload.receipt);
    const tailReceipts = bundle.latestCheckpoint
      ? receipts.slice(Number(bundle.latestCheckpoint.privateJournalSequence || 0))
      : receipts;
    const replay = authorityEngine.replay({
      initialEnvelope: bundle.initialEnvelope,
      checkpoint: bundle.latestCheckpoint || undefined,
      journal: tailReceipts,
    });
    if (!replay.ok) return replay;
    return deepFreeze({
      ok: true,
      replay,
      matchesCurrent: replay.envelope.stateHash === aggregate.envelope.stateHash
        && replay.envelope.stateRevision === aggregate.envelope.stateRevision
        && replay.envelope.journalHeadHash === aggregate.envelope.journalHeadHash,
      receiptCount: receipts.length,
      checkpointUsedForVerification: Boolean(bundle.latestCheckpoint),
      replayedTailReceiptCount: tailReceipts.length,
      trainingTruth: false,
    });
  }

  async function readHistoricalRules(input = {}) {
    const aggregate = await load(input.roomId);
    if (!aggregate) return rejection("ROOM_NOT_FOUND", { roomId: input.roomId || "" });
    return authorityEngine.readHistoricalRules(aggregate.envelope.matchBinding);
  }

  async function health() {
    const store = await roomStore.health();
    return deepFreeze({
      schemaVersion: `${STARCRAFT_TMG_ROOM_RUNTIME_VERSION}.health`,
      healthy: Boolean(store.healthy),
      authority: authorityEngine.health(),
      store,
      durability: store.durability,
      productionReady: Boolean(store.productionReady && authorityEngine.health().productionReady),
      trainingTruth: false,
    });
  }

  return Object.freeze({
    createRoom,
    joinRoom,
    readRoom,
    legalSpace,
    previewAction,
    confirmPreview,
    claimControl,
    applyAction,
    replayRoom,
    readHistoricalRules,
    health,
    roomStore,
  });
}
