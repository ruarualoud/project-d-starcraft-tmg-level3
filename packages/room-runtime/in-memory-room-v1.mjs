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
import {
  projectStarcraftTmgViewerStateShapeV3,
  STARCRAFT_TMG_VIEWER_STATE_V3_FIELDS,
} from "../client-domain/viewer-projection-v3.mjs";
import { createStarcraftTmgClientCharacterPresentationRuntimeV2 } from
  "../character-agent/client-character-presentation-runtime-v2.mjs";
import { createStarcraftTmgCharacterAssetGrantAuthorityV1 } from
  "../character-agent/character-asset-grant-v1.mjs";
import { projectStarcraftTmgBattleWorkbenchV1 } from
  "../client-domain/battle-workbench-v1.mjs";

export const STARCRAFT_TMG_ROOM_RUNTIME_VERSION = "starcraft_tmg_room_runtime_v2";
export const STARCRAFT_TMG_ROOM_CHARACTER_EXTENSION_VERSION =
  "starcraft_tmg_room_runtime_v2.character_presentation_v2";
export const STARCRAFT_TMG_VIEWER_ROOM_PROJECTION_VERSION = "starcraft_tmg_viewer_room_projection_v3";
export const STARCRAFT_TMG_VIEWER_APPLY_RESPONSE_VERSION = "starcraft_tmg_viewer_apply_response_v2";
export const STARCRAFT_TMG_VIEWER_REPLAY_RESPONSE_VERSION = "starcraft_tmg_viewer_replay_response_v3";
export const STARCRAFT_TMG_VIEWER_REPLAY_BUNDLE_VERSION = "starcraft_tmg_viewer_replay_bundle_v2";
export const STARCRAFT_TMG_REPLAY_FINAL_PROJECTION_VERSION = "starcraft_tmg_replay_final_projection_v2";
export const STARCRAFT_TMG_VIEWER_RESPONSE_CONTRACT_CATALOG = Object.freeze({
  roomProjection: Object.freeze({
    current: STARCRAFT_TMG_VIEWER_ROOM_PROJECTION_VERSION,
    retired: Object.freeze(["starcraft_tmg_room_runtime_v2.room-projection"]),
  }),
  apply: Object.freeze({
    current: STARCRAFT_TMG_VIEWER_APPLY_RESPONSE_VERSION,
    retired: Object.freeze(["implicit_unversioned_viewer_apply_response_v1"]),
  }),
  replay: Object.freeze({
    current: STARCRAFT_TMG_VIEWER_REPLAY_RESPONSE_VERSION,
    retired: Object.freeze(["starcraft_tmg_room_runtime_v2.viewer-replay"]),
  }),
});

const ROLE_MODES = new Set(["player", "tutor", "opponent", "commentator", "companion", "supervisor"]);
const APPLY_CAPABILITIES = Object.freeze(["read_room", "read_legal_space", "preview", "confirm", "apply", "read_own_private"]);
const HUMAN_ACCESS_CAPABILITIES = Object.freeze(["manage_invites", "create_recovery_ticket"]);
const MAX_ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000;
const ACCESS_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/u;

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
  if (mode === "player" || mode === "supervisor") {
    return principalType === "human"
      ? [...APPLY_CAPABILITIES, ...HUMAN_ACCESS_CAPABILITIES]
      : [...APPLY_CAPABILITIES];
  }
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

function tokenHash(roomId, rawToken, tokenKind = "seat_grant") {
  if (tokenKind === "seat_grant") {
    return hashStarcraftTmgContract({
      schemaVersion: "starcraft_tmg_seat_token_digest_v1",
      roomId,
      token: rawToken,
    });
  }
  return hashStarcraftTmgContract({
    schemaVersion: "starcraft_tmg_room_bound_token_digest_v1",
    roomId,
    tokenKind,
    token: rawToken,
  });
}

function clientPrincipalScopeHash(roomId, rawToken = "") {
  return hashStarcraftTmgContract({
    schemaVersion: "starcraft_tmg_client_principal_scope_v1",
    roomId,
    seatToken: rawToken || "public",
  });
}

function boundedTtl(value, fallback, field) {
  const normalized = value === undefined ? fallback : Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < 1_000 || normalized > MAX_ACCESS_TOKEN_TTL_MS) {
    throw new TypeError(`${field} must be between 1000 and ${MAX_ACCESS_TOKEN_TTL_MS} milliseconds`);
  }
  return normalized;
}

function auditInstant(value, field = "audit time") {
  const milliseconds = Date.parse(String(value || ""));
  if (!Number.isFinite(milliseconds)) throw new TypeError(`${field} must be an ISO-8601 instant`);
  return milliseconds;
}

function accessRevisions(aggregate) {
  return {
    roomRevision: aggregate.roomRevision,
    stateRevision: aggregate.stateRevision,
    privateJournalSequence: aggregate.privateJournalSequence,
    seatRecoveryRevision: aggregate.seatRecoveryRevision,
  };
}

function accessReceipt(authorityEngine, operation, aggregate, next, fields = {}) {
  const content = {
    schemaVersion: "starcraft_tmg_room_access_receipt_v1",
    operation,
    roomId: aggregate.roomId,
    matchBindingHash: aggregate.envelope.matchBindingHash,
    refereeKeyId: aggregate.envelope.matchBinding.refereeKeyId,
    refereePublicKeyFingerprint: aggregate.envelope.matchBinding.refereePublicKeyFingerprint,
    preRevisions: accessRevisions(aggregate),
    postRevisions: accessRevisions(next),
    ...clone(fields),
    trainingTruth: false,
  };
  return authorityEngine.attestRoomAccessReceipt(content);
}

function explicitRevisionConflict(input, aggregate) {
  if (input.expectedRoomRevision === undefined) return null;
  const expected = input.expectedRoomRevision;
  if (!Number.isSafeInteger(expected) || expected < 0) {
    return rejection("REVISION_INVALID", { field: "expectedRoomRevision" });
  }
  return expected === aggregate.roomRevision ? null : rejection("REVISION_CONFLICT", {
    expectedRoomRevision: expected,
    observedRoomRevision: aggregate.roomRevision,
  });
}

function rejectedAuthorityFields(input) {
  return ["seatKey", "sideKey", "roleMode", "principalType", "visibilityScope", "capabilities"]
    .filter((field) => input[field] !== undefined);
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

// The shared V3 catalogue owns every viewer-visible field. These two
// authority-only inputs are admitted solely so frozen V2 seat privacy can
// derive ownTeamArmyRostersBySide before the shared final projection.
const VIEWER_STATE_V3_INPUT_FIELDS = Object.freeze([
  ...STARCRAFT_TMG_VIEWER_STATE_V3_FIELDS,
  "authoritativeRosterRegistry",
  "authoritativeArmyRostersBySide",
]);


export function projectStarcraftTmgStateForViewerV3(state, seatKey = null) {
  const bounded = Object.fromEntries(VIEWER_STATE_V3_INPUT_FIELDS
    .filter((field) => Object.prototype.hasOwnProperty.call(state || {}, field))
    .map((field) => [field, clone(state[field])]));
  // V2 owns the frozen seat/private-field semantics. The browser-safe shared
  // V3 shape is the final network boundary and recursively drops any field
  // that has not been explicitly reviewed for viewer visibility.
  return projectStarcraftTmgViewerStateShapeV3(
    projectStarcraftTmgStateForViewerV2(bounded, seatKey),
  );
}

function withoutPrivateRosterChoice(entry) {
  const value = clone(entry);
  delete value.result;
  return value;
}

function projectState(state, seatKey = null) {
  return projectStarcraftTmgStateForViewerV3(state, seatKey);
}

function publicStateSummary(state = {}) {
  return {
    schemaVersion: "starcraft_tmg_public_state_summary_v1",
    round: Number.isSafeInteger(state.round) ? state.round : null,
    phase: String(state.phase || ""),
    activeSideKey: state.activeSideKey === undefined ? null : state.activeSideKey,
    terminal: state.terminal === true,
    gameOver: state.gameOver === true,
    winner: state.winner === undefined ? null : state.winner,
    trainingTruth: false,
  };
}

function safeEnvelopeSummary(envelope = {}) {
  const stateRevision = Number(envelope.stateRevision ?? envelope.revision ?? 0);
  return {
    schemaVersion: "starcraft_tmg_viewer_envelope_summary_v1",
    gameId: String(envelope.gameId || ""),
    roomId: String(envelope.roomId || ""),
    matchBindingHash: String(envelope.matchBindingHash || ""),
    stateRevision,
    revision: stateRevision,
    stateHash: String(envelope.stateHash || ""),
    journalHeadHash: String(envelope.journalHeadHash || ""),
    state: publicStateSummary(envelope.state),
    trainingTruth: false,
  };
}

function safeApplyResult(result = {}) {
  return {
    schemaVersion: STARCRAFT_TMG_VIEWER_APPLY_RESPONSE_VERSION,
    ok: result.ok === true,
    receipt: clone(result.receipt),
    envelope: safeEnvelopeSummary(result.envelope),
    trainingTruth: false,
  };
}

function replayFinalProjection(envelope, grant = null) {
  return {
    schemaVersion: STARCRAFT_TMG_REPLAY_FINAL_PROJECTION_VERSION,
    viewer: grant ? {
      seatKey: grant.seatKey,
      roleMode: grant.roleMode,
      visibilityScope: grant.authority.visibilityScope,
    } : {
      roleMode: "public_observer",
      visibilityScope: "public",
    },
    room: safeEnvelopeSummary(envelope),
    matchBinding: publicMatchBinding(envelope.matchBinding),
    authorityVersion: STARCRAFT_TMG_AUTHORITY_VERSION,
    state: projectState(envelope.state, grant?.seatKey || null),
    training: { eligibleForTraining: false, trainingTruth: false, reviewStatus: "raw" },
  };
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
  const capabilities = Array.isArray(spec.capabilities)
    ? [...new Set([
      ...spec.capabilities,
      ...((principalType === "human" && (mode === "player" || mode === "supervisor"))
        ? HUMAN_ACCESS_CAPABILITIES : []),
    ])]
    : capabilitiesForRole(mode, principalType);
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
      tokenHash: tokenHash(envelope.roomId, seatToken, "seat_grant"),
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
  const characterPresentationRequested = options.characterPresentationRuntime !== undefined
    ? options.characterPresentationRuntime !== false
    : options.enableCharacterPresentation === true
      || options.characterReleaseChannel === "development_internal"
      || options.characterReleaseChannel === "public";
  const characterPresentationRuntime = !characterPresentationRequested
    ? null
    : options.characterPresentationRuntime
      || createStarcraftTmgClientCharacterPresentationRuntimeV2({
        releaseChannel: options.characterReleaseChannel,
      });
  const characterAssetGrantAuthority = characterPresentationRuntime
    ? options.characterAssetGrantAuthority
      || createStarcraftTmgCharacterAssetGrantAuthorityV1({
        secret: options.characterAssetGrantSecret,
        keyId: options.characterAssetGrantKeyId,
        ttlMs: options.characterAssetGrantTtlMs,
        createNonce: options.createCharacterAssetGrantNonce,
        now,
      })
    : null;
  const checkpointInterval = Math.max(1, Number(options.checkpointInterval || 16));
  const inviteTtlMs = boundedTtl(options.inviteTtlMs, 15 * 60 * 1000, "inviteTtlMs");
  const recoveryTtlMs = boundedTtl(options.recoveryTtlMs, 10 * 60 * 1000, "recoveryTtlMs");

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

  function projectCharacter(aggregate, state, grant = null, seatToken = "") {
    const scopeHash = clientPrincipalScopeHash(aggregate.roomId, seatToken);
    return characterPresentationRuntime.project(state, {
      principalScopeHash: scopeHash,
      authenticated: Boolean(grant),
      updatedAt: aggregate.createdAtAudit,
      ...(grant && characterPresentationRuntime.releaseChannel === "development_internal" ? {
        issueAssetDelivery: (fields) => characterAssetGrantAuthority.issue({
          ...fields,
          roomId: aggregate.roomId,
          seatGrantId: grant.grantId,
          seatKey: grant.seatKey,
          principalScopeHash: scopeHash,
        }),
      } : {}),
    });
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
      const characterSelections = {};
      if (characterPresentationRuntime) {
        for (const spec of plan) {
          if (!characterSelections[spec.seatKey]) {
            characterSelections[spec.seatKey] = characterPresentationRuntime.createInitialState({
              updatedAt: createdAtAudit,
            });
          }
        }
      }
      const aggregate = {
        schemaVersion: characterPresentationRuntime
          ? `${STARCRAFT_TMG_ROOM_CHARACTER_EXTENSION_VERSION}.aggregate`
          : `${STARCRAFT_TMG_ROOM_RUNTIME_VERSION}.aggregate`,
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
        invites: {},
        recoveryTickets: {},
        leases: {},
        leaseFences: {},
        previews: {},
        confirmations: {},
        idempotency: {},
        traces: [],
        ...(characterPresentationRuntime ? { characterSelections } : {}),
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

  function playerSeatKeys(aggregate) {
    const fromState = Object.keys(aggregate.envelope.state?.players || {}).sort();
    return fromState.length ? fromState : ["player1", "player2"];
  }

  function unoccupiedPlayerSeat(aggregate, atAudit) {
    const at = auditInstant(atAudit);
    const occupied = new Set(Object.values(aggregate.grants || {})
      .filter((grant) => !grant.revoked)
      .map((grant) => grant.seatKey));
    for (const invite of Object.values(aggregate.invites || {})) {
      if (invite.status === "active" && auditInstant(invite.expiresAtAudit, "invite expiry") > at) {
        occupied.add(invite.seatKey);
      }
    }
    return playerSeatKeys(aggregate).find((candidate) => !occupied.has(candidate)) || null;
  }

  async function commitExpiredAccessToken({
    aggregate,
    collection,
    recordId,
    record,
    tokenKind,
    operation,
    reason,
    atAudit,
  }) {
    const next = clone(aggregate);
    next[collection] ||= {};
    next[collection][recordId].status = "expired";
    next[collection][recordId].expiredAtAudit = atAudit;
    next.roomRevision += 1;
    next.privateJournalSequence += 1;
    next.seatRecoveryRevision += 1;
    next.updatedAtAudit = atAudit;
    const receipt = accessReceipt(authorityEngine, operation, aggregate, next, {
      tokenKind,
      subjectId: recordId,
      seatKey: record.seatKey,
      status: "expired",
      expiresAtAudit: record.expiresAtAudit,
      occurredAtAudit: atAudit,
    });
    next[collection][recordId].expiryReceiptHash = receipt.receiptHash;
    try {
      await roomStore.commit(aggregate.roomId, {
        roomRevision: aggregate.roomRevision,
        stateRevision: aggregate.stateRevision,
      }, {
        nextAggregate: next,
        privateEvents: [journalEvent(`${tokenKind}_expired`, {
          subjectId: recordId,
          seatKey: record.seatKey,
          receiptHash: receipt.receiptHash,
          receipt: clone(receipt),
        })],
        publicEvents: [],
        recoveryUpdates: [{
          schemaVersion: "starcraft_tmg_seat_access_update_v1",
          tokenKind,
          subjectId: recordId,
          seatKey: record.seatKey,
          status: "expired",
          receiptHash: receipt.receiptHash,
          receipt: clone(receipt),
        }],
      });
      return rejection(reason, { receipt, room: roomSummary(next) });
    } catch (error) {
      return rejection(error.code || "ROOM_COMMIT_FAILED", { message: error.message });
    }
  }

  async function issueInvite(input = {}) {
    const authorityFields = rejectedAuthorityFields(input);
    if (authorityFields.length) return rejection("CLIENT_AUTHORITY_FIELD_REJECTED", { rejectedFields: authorityFields });
    const aggregate = await load(input.roomId);
    if (!aggregate) return rejection("ROOM_NOT_FOUND", { roomId: input.roomId || "" });
    let issuer;
    try { issuer = authenticate(aggregate, input.seatToken, "manage_invites"); } catch (error) {
      return rejection(error.code || "INVITE_ISSUE_FAILED", { message: error.message });
    }
    const conflict = explicitRevisionConflict(input, aggregate);
    if (conflict) return conflict;
    const issuedAtAudit = now();
    const seatKey = unoccupiedPlayerSeat(aggregate, issuedAtAudit);
    if (!seatKey) return rejection("ROOM_FULL");
    const inviteToken = token();
    const digest = tokenHash(aggregate.roomId, inviteToken, "invite");
    const inviteId = `sc-invite-${hashStarcraftTmgContract({ roomId: aggregate.roomId, tokenDigest: digest })}`;
    const expiresAtAudit = new Date(auditInstant(issuedAtAudit) + inviteTtlMs).toISOString();
    const next = clone(aggregate);
    next.invites ||= {};
    next.invites[inviteId] = {
      schemaVersion: "starcraft_tmg_room_invite_record_v1",
      inviteId,
      seatKey,
      tokenDigest: digest,
      status: "active",
      issuedByGrantId: issuer.grantId,
      issuedAtAudit,
      expiresAtAudit,
    };
    next.roomRevision += 1;
    next.privateJournalSequence += 1;
    next.seatRecoveryRevision += 1;
    next.updatedAtAudit = issuedAtAudit;
    const receipt = accessReceipt(authorityEngine, "issue_invite", aggregate, next, {
      tokenKind: "invite",
      subjectId: inviteId,
      seatKey,
      tokenDigest: digest,
      status: "active",
      actorGrantId: issuer.grantId,
      issuedAtAudit,
      expiresAtAudit,
    });
    next.invites[inviteId].issueReceiptHash = receipt.receiptHash;
    try {
      await roomStore.commit(aggregate.roomId, {
        roomRevision: aggregate.roomRevision,
        stateRevision: aggregate.stateRevision,
      }, {
        nextAggregate: next,
        privateEvents: [journalEvent("invite_issued", {
          inviteId,
          seatKey,
          actorGrantId: issuer.grantId,
          expiresAtAudit,
          receiptHash: receipt.receiptHash,
          receipt: clone(receipt),
        }, `actor:${issuer.grantId}|referee`)],
        publicEvents: [],
        recoveryUpdates: [{
          schemaVersion: "starcraft_tmg_seat_access_update_v1",
          tokenKind: "invite",
          subjectId: inviteId,
          seatKey,
          tokenDigest: digest,
          status: "active",
          receiptHash: receipt.receiptHash,
          receipt: clone(receipt),
        }],
      });
      return deepFreeze({
        ok: true,
        invite: { inviteId, inviteToken, expiresAtAudit },
        receipt,
        room: roomSummary(next),
      });
    } catch (error) {
      return rejection(error.code || "ROOM_COMMIT_FAILED", { message: error.message });
    }
  }

  async function exchangeInvite(input = {}) {
    const authorityFields = rejectedAuthorityFields(input);
    if (authorityFields.length || input.expectedRoomRevision !== undefined || input.seatToken !== undefined) {
      return rejection("CLIENT_AUTHORITY_FIELD_REJECTED", {
        rejectedFields: [
          ...authorityFields,
          ...(input.expectedRoomRevision !== undefined ? ["expectedRoomRevision"] : []),
          ...(input.seatToken !== undefined ? ["seatToken"] : []),
        ],
      });
    }
    const aggregate = await load(input.roomId);
    if (!aggregate) return rejection("ROOM_NOT_FOUND", { roomId: input.roomId || "" });
    const inviteToken = String(input.inviteToken || "").trim();
    if (!inviteToken) return rejection("INVITE_REQUIRED");
    if (!ACCESS_TOKEN_PATTERN.test(inviteToken)) return rejection("INVITE_INVALID");
    const digest = tokenHash(aggregate.roomId, inviteToken, "invite");
    const record = Object.values(aggregate.invites || {}).find((entry) => entry.tokenDigest === digest);
    if (!record) return rejection("INVITE_INVALID");
    if (record.status !== "active") {
      return rejection(record.status === "used" ? "INVITE_ALREADY_USED" : "INVITE_EXPIRED", {
        inviteId: record.inviteId,
      });
    }
    const exchangedAtAudit = now();
    if (auditInstant(record.expiresAtAudit, "invite expiry") <= auditInstant(exchangedAtAudit)) {
      return commitExpiredAccessToken({
        aggregate,
        collection: "invites",
        recordId: record.inviteId,
        record,
        tokenKind: "invite",
        operation: "exchange_invite",
        reason: "INVITE_EXPIRED",
        atAudit: exchangedAtAudit,
      });
    }
    const occupied = Object.values(aggregate.grants || {})
      .some((grant) => !grant.revoked && grant.seatKey === record.seatKey);
    if (occupied) return rejection("INVITED_SEAT_UNAVAILABLE", { inviteId: record.inviteId });
    const issued = createGrant(authorityEngine, aggregate.envelope, {
      label: "guest",
      seatKey: record.seatKey,
      roleMode: "player",
      principalType: "human",
    }, aggregate.seatRecoveryRevision + 1);
    const next = clone(aggregate);
    next.grants[issued.record.grantId] = issued.record;
    next.invites[record.inviteId].status = "used";
    next.invites[record.inviteId].usedAtAudit = exchangedAtAudit;
    next.invites[record.inviteId].usedByGrantId = issued.record.grantId;
    next.roomRevision += 1;
    next.privateJournalSequence += 1;
    next.seatRecoveryRevision += 1;
    next.updatedAtAudit = exchangedAtAudit;
    const receipt = accessReceipt(authorityEngine, "exchange_invite", aggregate, next, {
      tokenKind: "invite",
      subjectId: record.inviteId,
      seatKey: record.seatKey,
      tokenDigest: digest,
      status: "used",
      issuedGrantId: issued.record.grantId,
      issuedRoleMode: issued.record.roleMode,
      issuedSeatTokenDigest: issued.record.tokenHash,
      occurredAtAudit: exchangedAtAudit,
    });
    next.invites[record.inviteId].exchangeReceiptHash = receipt.receiptHash;
    try {
      await roomStore.commit(aggregate.roomId, {
        roomRevision: aggregate.roomRevision,
        stateRevision: aggregate.stateRevision,
      }, {
        nextAggregate: next,
        privateEvents: [journalEvent("invite_exchanged", {
          inviteId: record.inviteId,
          seatKey: record.seatKey,
          grantId: issued.record.grantId,
          receiptHash: receipt.receiptHash,
          receipt: clone(receipt),
        })],
        publicEvents: [],
        recoveryUpdates: [{
          schemaVersion: "starcraft_tmg_seat_access_update_v1",
          tokenKind: "invite",
          subjectId: record.inviteId,
          seatKey: record.seatKey,
          grantId: issued.record.grantId,
          tokenHash: issued.record.tokenHash,
          status: "used",
          receiptHash: receipt.receiptHash,
          receipt: clone(receipt),
        }],
      });
      return deepFreeze({ ok: true, credential: issued.credential, receipt, room: roomSummary(next) });
    } catch (error) {
      return rejection(error.code || "ROOM_COMMIT_FAILED", { message: error.message });
    }
  }

  async function issueSeatRecovery(input = {}) {
    const authorityFields = rejectedAuthorityFields(input);
    if (authorityFields.length) return rejection("CLIENT_AUTHORITY_FIELD_REJECTED", { rejectedFields: authorityFields });
    const aggregate = await load(input.roomId);
    if (!aggregate) return rejection("ROOM_NOT_FOUND", { roomId: input.roomId || "" });
    let issuer;
    try { issuer = authenticate(aggregate, input.seatToken, "create_recovery_ticket"); } catch (error) {
      return rejection(error.code || "RECOVERY_ISSUE_FAILED", { message: error.message });
    }
    const conflict = explicitRevisionConflict(input, aggregate);
    if (conflict) return conflict;
    const issuedAtAudit = now();
    const recoveryToken = token();
    const digest = tokenHash(aggregate.roomId, recoveryToken, "seat_recovery");
    const recoveryTicketId = `sc-recovery-${hashStarcraftTmgContract({ roomId: aggregate.roomId, tokenDigest: digest })}`;
    const expiresAtAudit = new Date(auditInstant(issuedAtAudit) + recoveryTtlMs).toISOString();
    const next = clone(aggregate);
    next.recoveryTickets ||= {};
    next.recoveryTickets[recoveryTicketId] = {
      schemaVersion: "starcraft_tmg_seat_recovery_ticket_record_v1",
      recoveryTicketId,
      seatKey: issuer.seatKey,
      tokenDigest: digest,
      status: "active",
      issuedByGrantId: issuer.grantId,
      boundAuthority: {
        seatKey: issuer.authority.seatKey,
        roleMode: issuer.authority.roleMode,
        principalType: issuer.authority.principalType,
        visibilityScope: issuer.authority.visibilityScope,
        capabilities: clone(issuer.authority.capabilities),
      },
      label: issuer.label,
      issuedAtAudit,
      expiresAtAudit,
    };
    next.roomRevision += 1;
    next.privateJournalSequence += 1;
    next.seatRecoveryRevision += 1;
    next.updatedAtAudit = issuedAtAudit;
    const receipt = accessReceipt(authorityEngine, "issue_seat_recovery", aggregate, next, {
      tokenKind: "seat_recovery",
      subjectId: recoveryTicketId,
      seatKey: issuer.seatKey,
      tokenDigest: digest,
      status: "active",
      actorGrantId: issuer.grantId,
      issuedAtAudit,
      expiresAtAudit,
    });
    next.recoveryTickets[recoveryTicketId].issueReceiptHash = receipt.receiptHash;
    try {
      await roomStore.commit(aggregate.roomId, {
        roomRevision: aggregate.roomRevision,
        stateRevision: aggregate.stateRevision,
      }, {
        nextAggregate: next,
        privateEvents: [journalEvent("seat_recovery_issued", {
          recoveryTicketId,
          seatKey: issuer.seatKey,
          actorGrantId: issuer.grantId,
          expiresAtAudit,
          receiptHash: receipt.receiptHash,
          receipt: clone(receipt),
        }, `actor:${issuer.grantId}|referee`)],
        publicEvents: [],
        recoveryUpdates: [{
          schemaVersion: "starcraft_tmg_seat_access_update_v1",
          tokenKind: "seat_recovery",
          subjectId: recoveryTicketId,
          seatKey: issuer.seatKey,
          tokenDigest: digest,
          status: "active",
          receiptHash: receipt.receiptHash,
          receipt: clone(receipt),
        }],
      });
      return deepFreeze({
        ok: true,
        recovery: { recoveryTicketId, recoveryToken, expiresAtAudit },
        receipt,
        room: roomSummary(next),
      });
    } catch (error) {
      return rejection(error.code || "ROOM_COMMIT_FAILED", { message: error.message });
    }
  }

  async function recoverSeat(input = {}) {
    const authorityFields = rejectedAuthorityFields(input);
    if (authorityFields.length || input.expectedRoomRevision !== undefined || input.seatToken !== undefined) {
      return rejection("CLIENT_AUTHORITY_FIELD_REJECTED", {
        rejectedFields: [
          ...authorityFields,
          ...(input.expectedRoomRevision !== undefined ? ["expectedRoomRevision"] : []),
          ...(input.seatToken !== undefined ? ["seatToken"] : []),
        ],
      });
    }
    const aggregate = await load(input.roomId);
    if (!aggregate) return rejection("ROOM_NOT_FOUND", { roomId: input.roomId || "" });
    const recoveryToken = String(input.recoveryToken || "").trim();
    if (!recoveryToken) return rejection("RECOVERY_TOKEN_REQUIRED");
    if (!ACCESS_TOKEN_PATTERN.test(recoveryToken)) return rejection("RECOVERY_TOKEN_INVALID");
    const digest = tokenHash(aggregate.roomId, recoveryToken, "seat_recovery");
    const record = Object.values(aggregate.recoveryTickets || {})
      .find((entry) => entry.tokenDigest === digest);
    if (!record) return rejection("RECOVERY_TOKEN_INVALID");
    if (record.status !== "active") {
      return rejection(record.status === "used" ? "RECOVERY_TOKEN_ALREADY_USED" : "RECOVERY_TOKEN_EXPIRED", {
        recoveryTicketId: record.recoveryTicketId,
      });
    }
    const recoveredAtAudit = now();
    if (auditInstant(record.expiresAtAudit, "recovery expiry") <= auditInstant(recoveredAtAudit)) {
      return commitExpiredAccessToken({
        aggregate,
        collection: "recoveryTickets",
        recordId: record.recoveryTicketId,
        record,
        tokenKind: "seat_recovery",
        operation: "recover_seat",
        reason: "RECOVERY_TOKEN_EXPIRED",
        atAudit: recoveredAtAudit,
      });
    }
    const issued = createGrant(authorityEngine, aggregate.envelope, {
      label: record.label,
      seatKey: record.boundAuthority.seatKey,
      roleMode: record.boundAuthority.roleMode,
      principalType: record.boundAuthority.principalType,
      visibilityScope: record.boundAuthority.visibilityScope,
      capabilities: record.boundAuthority.capabilities,
    }, aggregate.seatRecoveryRevision + 1);
    const next = clone(aggregate);
    next.grants[issued.record.grantId] = issued.record;
    next.recoveryTickets[record.recoveryTicketId].status = "used";
    next.recoveryTickets[record.recoveryTicketId].usedAtAudit = recoveredAtAudit;
    next.recoveryTickets[record.recoveryTicketId].usedByGrantId = issued.record.grantId;
    next.roomRevision += 1;
    next.privateJournalSequence += 1;
    next.seatRecoveryRevision += 1;
    next.updatedAtAudit = recoveredAtAudit;
    const receipt = accessReceipt(authorityEngine, "recover_seat", aggregate, next, {
      tokenKind: "seat_recovery",
      subjectId: record.recoveryTicketId,
      seatKey: record.seatKey,
      tokenDigest: digest,
      status: "used",
      issuedGrantId: issued.record.grantId,
      issuedRoleMode: issued.record.roleMode,
      issuedSeatTokenDigest: issued.record.tokenHash,
      occurredAtAudit: recoveredAtAudit,
    });
    next.recoveryTickets[record.recoveryTicketId].exchangeReceiptHash = receipt.receiptHash;
    try {
      await roomStore.commit(aggregate.roomId, {
        roomRevision: aggregate.roomRevision,
        stateRevision: aggregate.stateRevision,
      }, {
        nextAggregate: next,
        privateEvents: [journalEvent("seat_recovered", {
          recoveryTicketId: record.recoveryTicketId,
          seatKey: record.seatKey,
          grantId: issued.record.grantId,
          receiptHash: receipt.receiptHash,
          receipt: clone(receipt),
        })],
        publicEvents: [],
        recoveryUpdates: [{
          schemaVersion: "starcraft_tmg_seat_access_update_v1",
          tokenKind: "seat_recovery",
          subjectId: record.recoveryTicketId,
          seatKey: record.seatKey,
          grantId: issued.record.grantId,
          tokenHash: issued.record.tokenHash,
          status: "used",
          receiptHash: receipt.receiptHash,
          receipt: clone(receipt),
        }],
      });
      return deepFreeze({ ok: true, credential: issued.credential, receipt, room: roomSummary(next) });
    } catch (error) {
      return rejection(error.code || "ROOM_COMMIT_FAILED", { message: error.message });
    }
  }

  async function joinRoom(input = {}) {
    if (!String(input.inviteToken || "").trim()) return rejection("INVITE_REQUIRED");
    return exchangeInvite(input);
  }

  async function readRoom(input = {}) {
    const aggregate = await load(input.roomId);
    if (!aggregate) return rejection("ROOM_NOT_FOUND", { roomId: input.roomId || "" });
    let grant = null;
    if (input.seatToken) {
      try { grant = authenticate(aggregate, input.seatToken, "read_room"); } catch (error) { return rejection(error.code, { message: error.message }); }
    }
    const currentLease = grant ? aggregate.leases?.[grant.seatKey] || null : null;
    const projection = {
      schemaVersion: STARCRAFT_TMG_VIEWER_ROOM_PROJECTION_VERSION,
      room: roomSummary(aggregate),
      viewer: grant ? {
        grantId: grant.grantId,
        seatKey: grant.seatKey,
        roleMode: grant.roleMode,
        visibilityScope: grant.authority.visibilityScope,
        capabilities: clone(grant.authority.capabilities),
        grantRecoveryRevision: grant.authority.recoveryRevision,
      } : { roleMode: "public_observer", visibilityScope: "public", capabilities: ["read_public"] },
      control: grant ? {
        visible: true,
        seatKey: grant.seatKey,
        currentLeaseFence: Number(aggregate.leaseFences?.[grant.seatKey] || 0),
        ownedByViewer: Boolean(currentLease && currentLease.grantId === grant.grantId),
        hasActiveLease: Boolean(currentLease),
      } : {
        visible: false,
        currentLeaseFence: null,
        ownedByViewer: false,
        hasActiveLease: false,
      },
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

  async function readBattleWorkbench(input = {}) {
    const aggregate = await load(input.roomId);
    if (!aggregate) return rejection("ROOM_NOT_FOUND", { roomId: input.roomId || "" });
    let grant = null;
    if (input.seatToken) {
      try {
        grant = authenticate(aggregate, input.seatToken, "read_room");
      } catch (error) {
        return rejection(error.code || "AUTHENTICATION_REQUIRED", { message: error.message });
      }
    }
    let currentLegalSpace = null;
    if (grant?.authority.capabilities.includes("read_legal_space")) {
      try {
        currentLegalSpace = authorityEngine.legalSpace(aggregate.envelope, {
          seatAuthority: grant.authority,
        });
      } catch (error) {
        return rejection(error.code || "BATTLE_WORKBENCH_LEGAL_SPACE_FAILED", {
          message: error.message,
        });
      }
    }
    const projection = {
      schemaVersion: STARCRAFT_TMG_VIEWER_ROOM_PROJECTION_VERSION,
      room: roomSummary(aggregate),
      viewer: grant ? {
        grantId: grant.grantId,
        seatKey: grant.seatKey,
        roleMode: grant.roleMode,
        visibilityScope: grant.authority.visibilityScope,
        capabilities: clone(grant.authority.capabilities),
        grantRecoveryRevision: grant.authority.recoveryRevision,
      } : { roleMode: "public_observer", visibilityScope: "public", capabilities: ["read_public"] },
      control: { visible: Boolean(grant) },
      matchBinding: publicMatchBinding(aggregate.envelope.matchBinding),
      authorityVersion: STARCRAFT_TMG_AUTHORITY_VERSION,
      state: projectState(aggregate.envelope.state, grant?.seatKey || null),
      training: { eligibleForTraining: false, trainingTruth: false, reviewStatus: "raw" },
    };
    const snapshot = projectStarcraftTmgBattleWorkbenchV1({
      roomProjection: projection,
      legalSpace: currentLegalSpace,
      includeThreat: true,
    });
    return deepFreeze({ ok: true, snapshot });
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
    if (input.previewToken !== previewRecord.preview.previewToken
      || input.previewContentHash !== previewRecord.preview.previewSeal?.contentHash) {
      return rejection("PREVIEW_BINDING_MISMATCH", {
        previewId: input.previewId || "",
        stateRevisionUnchanged: aggregate.stateRevision,
      });
    }
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
      return deepFreeze({ ...safeApplyResult(existing.result), idempotentReplay: true });
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
    const responseResult = safeApplyResult({
      ok: true,
      receipt: applied.receipt,
      envelope: applied.envelope,
      trainingTruth: false,
    });
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
    let grant = null;
    if (input.seatToken) {
      try { grant = authenticate(aggregate, input.seatToken, "read_room"); } catch (error) { return rejection(error.code, { message: error.message }); }
    }
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
    const safeReplay = {
      schemaVersion: STARCRAFT_TMG_VIEWER_REPLAY_BUNDLE_VERSION,
      appliedCount: replay.appliedCount,
      checkpointStateRevision: replay.checkpointStateRevision,
      envelope: safeEnvelopeSummary(replay.envelope),
      finalProjection: replayFinalProjection(replay.envelope, grant),
      silentCompatibilityUsed: replay.silentCompatibilityUsed === true,
      trainingTruth: false,
    };
    return deepFreeze({
      schemaVersion: STARCRAFT_TMG_VIEWER_REPLAY_RESPONSE_VERSION,
      ok: true,
      replay: safeReplay,
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

  async function readCharacterPresentation(input = {}) {
    const aggregate = await load(input.roomId);
    if (!aggregate) return rejection("ROOM_NOT_FOUND", { roomId: input.roomId || "" });
    if (!characterPresentationRuntime) return rejection("CHARACTER_PRESENTATION_UNAVAILABLE");
    if (aggregate.schemaVersion !== `${STARCRAFT_TMG_ROOM_CHARACTER_EXTENSION_VERSION}.aggregate`
      || !object(aggregate.characterSelections)) {
      return rejection("CHARACTER_PRESENTATION_AGGREGATE_VERSION_MISMATCH");
    }
    let grant = null;
    if (input.seatToken) {
      try {
        grant = authenticate(aggregate, input.seatToken, "read_room");
      } catch (error) {
        return rejection(error.code, { message: error.message });
      }
    }
    const state = grant ? aggregate.characterSelections[grant.seatKey] : null;
    if (grant && !state) return rejection("CHARACTER_PRESENTATION_STATE_MISSING");
    try {
      return deepFreeze({
        ok: true,
        schemaVersion: "starcraft_tmg_character_presentation_response_v2",
        projection: projectCharacter(aggregate, state, grant, input.seatToken),
        trainingTruth: false,
      });
    } catch (error) {
      return rejection(error.code || "CHARACTER_PRESENTATION_FAILED", {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function updateCharacterSelection(input, operation) {
    const aggregate = await load(input.roomId);
    if (!aggregate) return rejection("ROOM_NOT_FOUND", { roomId: input.roomId || "" });
    if (!characterPresentationRuntime) return rejection("CHARACTER_PRESENTATION_UNAVAILABLE");
    if (aggregate.schemaVersion !== `${STARCRAFT_TMG_ROOM_CHARACTER_EXTENSION_VERSION}.aggregate`
      || !object(aggregate.characterSelections)) {
      return rejection("CHARACTER_PRESENTATION_AGGREGATE_VERSION_MISMATCH");
    }
    let grant;
    try {
      grant = authenticate(aggregate, input.seatToken, "read_room");
    } catch (error) {
      return rejection(error.code, { message: error.message });
    }
    if (grant.principalType !== "human") {
      return rejection("CHARACTER_SELECTION_HUMAN_PRINCIPAL_REQUIRED");
    }
    const state = aggregate.characterSelections[grant.seatKey];
    if (!state) return rejection("CHARACTER_PRESENTATION_STATE_MISSING");
    if (!Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0) {
      return rejection("REVISION_INVALID", { field: "expectedRevision" });
    }
    const principalScopeHash = clientPrincipalScopeHash(aggregate.roomId, input.seatToken);
    const requestCore = {
      schemaVersion: "starcraft_tmg_character_selection_request_binding_v1",
      roomId: aggregate.roomId,
      principalScopeHash,
      operation,
      expectedRevision: input.expectedRevision,
      previousStateHash: state.stateHash,
      requestedPersonaWorldbookId: operation === "select_persona"
        ? String(input.personaWorldbookId || "")
        : null,
      enabled: operation === "set_spoiler_access" ? input.enabled === true : null,
    };
    const requestBinding = {
      ...requestCore,
      requestHash: hashStarcraftTmgContract(requestCore),
    };
    const occurredAt = now();
    const updated = operation === "select_persona"
      ? characterPresentationRuntime.selectPersona(state, {
        personaWorldbookId: input.personaWorldbookId,
        expectedRevision: input.expectedRevision,
        occurredAt,
      })
      : characterPresentationRuntime.setFullSpoilerAccess(state, {
        enabled: input.enabled,
        expectedRevision: input.expectedRevision,
        occurredAt,
      });
    if (!updated.ok) return rejection(updated.reason, clone(updated));
    const next = clone(aggregate);
    next.characterSelections ||= {};
    next.characterSelections[grant.seatKey] = clone(updated.state);
    next.roomRevision += 1;
    next.privateJournalSequence += 1;
    next.updatedAtAudit = occurredAt;
    try {
      await roomStore.commit(aggregate.roomId, {
        roomRevision: aggregate.roomRevision,
        stateRevision: aggregate.stateRevision,
      }, {
        nextAggregate: next,
        privateEvents: [journalEvent("character_selection_updated", {
          operation,
          actorGrantId: grant.grantId,
          seatKey: grant.seatKey,
          previousStateHash: state.stateHash,
          nextStateHash: updated.state.stateHash,
          selectorEventReceiptHash: updated.eventReceipt.receiptHash,
        }, `actor:${grant.grantId}|referee`)],
        publicEvents: [],
        recoveryUpdates: [],
      });
      const transitionCore = {
        schemaVersion: "starcraft_tmg_character_selection_transition_v1",
        previousRevision: state.revision,
        previousStateHash: state.stateHash,
        nextRevision: updated.state.revision,
        nextStateHash: updated.state.stateHash,
        selectorEventReceiptHash: updated.eventReceipt.receiptHash,
        selectorEvent: operation === "select_persona"
          ? {
            type: "select_persona",
            personaWorldbookId: String(input.personaWorldbookId || ""),
            expectedRevision: input.expectedRevision,
            occurredAt,
          }
          : {
            type: "set_ceilings",
            spoilerCeilingRank: input.enabled === true ? 80 : 60,
            knowledgeCeilingRank: input.enabled === true ? 80 : 60,
            expectedRevision: input.expectedRevision,
            occurredAt,
          },
        ceilingPolicy: operation === "set_spoiler_access"
          ? (input.enabled === true ? "full" : "default")
          : null,
      };
      const transition = {
        ...transitionCore,
        transitionHash: hashStarcraftTmgContract(transitionCore),
      };
      const responseCore = {
        ok: true,
        schemaVersion: "starcraft_tmg_character_selection_response_v3",
        operation,
        requestBinding,
        transition,
        projection: projectCharacter(next, updated.state, grant, input.seatToken),
        eventReceipt: updated.eventReceipt,
        room: roomSummary(next),
        trainingTruth: false,
      };
      return deepFreeze({
        ...responseCore,
        responseHash: hashStarcraftTmgContract(responseCore),
      });
    } catch (error) {
      return rejection(error.code || "ROOM_COMMIT_FAILED", {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function selectCharacterPersona(input = {}) {
    return updateCharacterSelection(input, "select_persona");
  }

  async function setCharacterSpoilerAccess(input = {}) {
    if (typeof input.enabled !== "boolean") return rejection("CHARACTER_SPOILER_ACCESS_INVALID");
    return updateCharacterSelection(input, "set_spoiler_access");
  }

  async function readCharacterAsset(input = {}) {
    if (!characterPresentationRuntime) return rejection("CHARACTER_PRESENTATION_UNAVAILABLE");
    if (!characterAssetGrantAuthority) return rejection("CHARACTER_ASSET_NOT_RELEASED");
    const verified = characterAssetGrantAuthority.verify({
      grantToken: input.grantToken,
      contentHash: input.contentHash,
    });
    if (!verified.ok) return rejection(verified.reason);
    const payload = verified.payload;
    const aggregate = await load(payload.roomId);
    if (!aggregate) return rejection("CHARACTER_ASSET_GRANT_INVALID");
    if (aggregate.schemaVersion !== `${STARCRAFT_TMG_ROOM_CHARACTER_EXTENSION_VERSION}.aggregate`
      || !object(aggregate.characterSelections)) {
      return rejection("CHARACTER_ASSET_GRANT_SCOPE_MISMATCH");
    }
    const grant = aggregate.grants?.[payload.seatGrantId];
    const state = aggregate.characterSelections?.[payload.seatKey];
    if (!grant
      || grant.revoked === true
      || grant.seatKey !== payload.seatKey
      || !grant.authority?.capabilities?.includes("read_room")
      || !state
      || state.stateHash !== payload.selectorStateHash
      || state.revision !== payload.selectorRevision) {
      return rejection("CHARACTER_ASSET_GRANT_SCOPE_MISMATCH");
    }
    return characterPresentationRuntime.resolveAsset({
      contentHash: input.contentHash,
      state,
      manifestHash: payload.manifestHash,
      rightsDecisionHash: payload.rightsDecisionHash,
      characterPackageHash: payload.characterPackageHash,
      visualBindingHash: payload.visualBindingHash,
      selectorStateHash: payload.selectorStateHash,
      selectorRevision: payload.selectorRevision,
      selectedPersonaWorldbookId: payload.selectedPersonaWorldbookId,
    });
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
    issueInvite,
    exchangeInvite,
    issueSeatRecovery,
    recoverSeat,
    joinRoom,
    readRoom,
    legalSpace,
    readBattleWorkbench,
    previewAction,
    confirmPreview,
    claimControl,
    applyAction,
    replayRoom,
    readHistoricalRules,
    ...(characterPresentationRuntime ? {
      readCharacterPresentation,
      selectCharacterPersona,
      setCharacterSpoilerAccess,
      readCharacterAsset,
    } : {}),
    health,
    roomStore,
  });
}
