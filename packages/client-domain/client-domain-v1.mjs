import {
  assertStarcraftTmgAuthoritativeTransportPort,
  StarcraftTmgClientTransportError,
} from "./authoritative-transport-adapters-v1.mjs";
import { assertStarcraftTmgLifecyclePort } from "./lifecycle-adapters-v1.mjs";
import { assertStarcraftTmgProjectionStorePort } from "./projection-store-adapters-v1.mjs";
import { hashStarcraftTmgClientContract } from "./portable-contract-hash-v1.mjs";
import {
  isExactStarcraftTmgViewerStateShapeV3,
  STARCRAFT_TMG_VIEWER_PROJECTION_V3_TOP_LEVEL_KEYS,
} from "./viewer-projection-v3.mjs";

export const STARCRAFT_TMG_CLIENT_DOMAIN_VERSION = "starcraft_tmg_client_domain_v1";
export const STARCRAFT_TMG_CLIENT_DOMAIN_INTERFACE = Object.freeze([
  "bootstrap",
  "read",
  "dispatch",
  "subscribe",
]);

const SURFACES = new Set(["expo_web", "expo_native", "battle_lab", "verifier"]);
const ACCESS_KINDS = new Set(["invite", "recovery"]);
const INTENT_KEYS = Object.freeze({
  refresh: ["type"],
  revalidate_authority: ["type"],
  load_legal_space: ["type"],
  preview_finite: ["type", "actionKey"],
  preview_parameterized: ["type", "domainId", "parameters"],
  confirm_and_apply_preview: ["type", "previewId"],
  claim_control: ["type"],
  issue_invite: ["type"],
  issue_recovery: ["type"],
  read_replay: ["type"],
});
const FORBIDDEN_INPUT_KEYS = new Set([
  "state",
  "gamestate",
  "wholestate",
  "side",
  "sidekey",
  "role",
  "rolemode",
  "confirmed",
  "confirmationboolean",
  "clientrng",
  "rngseed",
  "randomseed",
  "rulesoverride",
  "sourceoverride",
  "providercredential",
  "providerapikey",
  "apikey",
  "modelcredential",
  "baseurl",
  "revision",
  "staterevision",
  "roomrevision",
  "expectedrevision",
  "expectedroomrevision",
  "sessionid",
  "seat",
  "seatkey",
  "ttl",
  "ttlms",
]);
const RECOVERABLE_TRANSPORT_CODES = new Set(["NETWORK_UNAVAILABLE", "TRANSPORT_TIMEOUT"]);
const AUTHENTICATION_CODES = new Set(["AUTHENTICATION_REQUIRED", "SEAT_GRANT_INVALID"]);
const ACCESS_SECRET_KEYS = new Set([
  "token",
  "seattoken",
  "invitetoken",
  "recoverytoken",
  "credential",
  "credentials",
  "seatgrant",
]);
const PROJECTION_SECRET_KEYS = new Set([
  "seattoken",
  "invitetoken",
  "recoverytoken",
  "credential",
  "credentials",
  "seatgrant",
  "bearertoken",
  "leaseid",
  "leaseseal",
  "authorityseal",
  "sessionid",
]);
const MAX_INPUT_BYTES = 256 * 1024;
const ACCESS_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/u;
const PUBLIC_VIEWER_KEYS = Object.freeze(["roleMode", "visibilityScope", "capabilities"]);
const SEAT_VIEWER_KEYS = Object.freeze([
  "grantId", "seatKey", "roleMode", "visibilityScope", "capabilities",
  "grantRecoveryRevision",
]);
const VIEWER_PRIVATE_STATE_FIELDS = Object.freeze([
  "cardResources", "armyBuildingConfigurationBySide", "armyResourceBudgetsBySide",
  "unitCompositionSelectionsBySide", "unitUpgradeSelectionsBySide",
  "armyCompositionUpgradeAuditsBySide", "ownTeamArmyRostersBySide",
  "equipmentReminderPermitsByActionHash", "privateRosterDisclosureConductIncidents",
]);
const MAX_REPLAY_INTEGRITY_SCOPES = 16;
const VIEWER_ROOM_SUMMARY_KEYS = Object.freeze([
  "schemaVersion", "roomId", "gameId", "title", "surfaceMode",
  "matchBindingHash", "roomRevision", "stateRevision", "revision", "stateHash",
  "journalHeadHash", "privateJournalSequence", "publicJournalSequence",
  "seatRecoveryRevision", "previewCount", "acceptedReceiptCount", "durability",
  "rulesRuntimeBinding", "productionReady", "trainingTruth",
]);
const PUBLIC_MATCH_BINDING_KEYS = Object.freeze([
  "schemaVersion", "matchId", "gameId", "roomId", "rulesVersion", "dataVersion",
  "rngSchemeId", "sourceSnapshotHash", "dataSnapshotHash", "rulesArtifactHash",
  "executorArtifactHash", "geometryArtifactHash", "actionSchemaHash", "refereeKeyId",
  "refereePublicKeyFingerprint", "rulesRuntimeBinding", "rulesDisplayBinding",
  "productionReady", "bindingHash", "refereeSignature",
]);
const RULES_RUNTIME_BINDING_KEYS = Object.freeze([
  "schemaVersion", "mode", "runtimeId", "runtimeVersion", "runtimeHash",
  "catalogueHash", "executableRuleAtomCount", "nonExecutableRuleAtomCount",
  "legalSpaceComplete", "developmentSubset", "legacyCompatibilityUsed",
  "productionRoomEligible", "ctx2skillPromotionEligible", "trainingTruth",
]);
const RULES_DISPLAY_BINDING_KEYS = Object.freeze([
  "schemaVersion", "artifactId", "artifactHash", "mediaType", "locale",
  "rulesVersion", "availability",
]);
const PUBLIC_CONTROL_KEYS = Object.freeze([
  "visible", "currentLeaseFence", "ownedByViewer", "hasActiveLease",
]);
const SEAT_CONTROL_KEYS = Object.freeze([
  "visible", "seatKey", "currentLeaseFence", "ownedByViewer", "hasActiveLease",
]);
const VIEWER_TRAINING_KEYS = Object.freeze([
  "eligibleForTraining", "trainingTruth", "reviewStatus",
]);
const CONTRACT_HASH_PATTERN = /^[a-f0-9]{64}$/u;
const SEAL_MAC_PATTERN = /^[A-Za-z0-9_-]{43}$/u;
const ED25519_SIGNATURE_PATTERN = /^[A-Za-z0-9_-]{86}$/u;
const VIEWER_ROOM_PROJECTION_VERSION = "starcraft_tmg_viewer_room_projection_v3";
const VIEWER_APPLY_RESPONSE_VERSION = "starcraft_tmg_viewer_apply_response_v2";
const VIEWER_REPLAY_RESPONSE_VERSION = "starcraft_tmg_viewer_replay_response_v3";
const VIEWER_REPLAY_BUNDLE_VERSION = "starcraft_tmg_viewer_replay_bundle_v2";
const REPLAY_FINAL_PROJECTION_VERSION = "starcraft_tmg_replay_final_projection_v2";
const LEGAL_SPACE_KEYS = Object.freeze([
  "schemaVersion",
  "gameId",
  "roomId",
  "matchBindingHash",
  "stateRevision",
  "revision",
  "stateHash",
  "sideKey",
  "phase",
  "terminal",
  "rulesRuntimeBinding",
  "finiteActions",
  "parameterDomains",
  "legalSpaceHash",
  "searchSuggestions",
  "disabledDiagnostics",
  "candidates",
  "disabledCount",
  "searchAndStrategyExcludedFromAuthority",
]);
const PREVIEW_KEYS = Object.freeze([
  "schemaVersion",
  "previewId",
  "previewToken",
  "core",
  "previewSeal",
  "audit",
]);
const PREVIEW_CORE_KEYS = Object.freeze([
  "schemaVersion",
  "gameId",
  "roomId",
  "matchBindingHash",
  "expectedStateRevision",
  "expectedRevision",
  "preStateHash",
  "legalSpaceHash",
  "seatKey",
  "proposal",
  "proposalHash",
  "action",
  "confirmationPolicy",
  "chanceTicket",
  "result",
  "trainingTruth",
]);
const REFEREE_SEAL_KEYS = Object.freeze([
  "schemaVersion",
  "purpose",
  "keyId",
  "hashAlgorithm",
  "sealAlgorithm",
  "contentHash",
  "mac",
]);
let fallbackOperationalIdCounter = 0;

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function normalizedKey(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function assertNoAuthorityFields(value, path = "$") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoAuthorityFields(entry, `${path}[${index}]`));
    return;
  }
  if (!object(value)) return;
  for (const [key, entry] of Object.entries(value)) {
    if (FORBIDDEN_INPUT_KEYS.has(normalizedKey(key))) {
      const error = new Error(`client authority field is forbidden at ${path}.${key}`);
      error.code = "CLIENT_AUTHORITY_FIELD_REJECTED";
      error.details = { path: `${path}.${key}` };
      throw error;
    }
    assertNoAuthorityFields(entry, `${path}.${key}`);
  }
}

function assertExactKeys(value, allowed, path) {
  if (!object(value)) throw Object.assign(new Error(`${path} must be an object`), { code: "CLIENT_INPUT_INVALID" });
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unknown.length) {
    throw Object.assign(new Error(`${path} contains unsupported fields`), {
      code: "CLIENT_INPUT_INVALID",
      details: { path, unsupportedFields: unknown.sort() },
    });
  }
}

function hasExactKeys(value, expected) {
  return object(value)
    && Object.keys(value).sort().join("\u0000") === [...expected].sort().join("\u0000");
}

function validAccessRevisions(value) {
  const keys = [
    "roomRevision",
    "stateRevision",
    "privateJournalSequence",
    "seatRecoveryRevision",
  ];
  return hasExactKeys(value, keys)
    && keys.every((key) => Number.isSafeInteger(value[key]) && value[key] >= 0);
}

function contractHash(value) {
  try {
    return hashStarcraftTmgClientContract(value);
  } catch {
    return "";
  }
}

function sameContract(left, right) {
  const leftHash = contractHash(left);
  return Boolean(leftHash) && leftHash === contractHash(right);
}

function replayIntegrityRegistryKey(roomId, principalScopeHash) {
  return `${String(roomId || "")}\u0000${String(principalScopeHash || "")}`;
}

function objectKeysWithin(value, allowed) {
  return object(value) && Object.keys(value).every((key) => allowed.has(String(key)));
}

function viewerPrivateStateMatches(state, viewer, publicAccess) {
  if (publicAccess) {
    return VIEWER_PRIVATE_STATE_FIELDS.every((field) => {
      const value = state[field];
      return value === undefined
        || (Array.isArray(value)
          ? value.length === 0
          : object(value) && Object.keys(value).length === 0);
    });
  }
  const seatKey = String(viewer.seatKey || "");
  const ownSeat = new Set([seatKey]);
  const teams = state.rosterRegistryResolution?.teamMembershipByPlayer;
  const ownTeam = object(teams) ? teams[seatKey] : undefined;
  const allied = new Set([seatKey]);
  if (ownTeam !== undefined) {
    for (const [playerId, teamId] of Object.entries(teams)) {
      if (teamId === ownTeam) allied.add(String(playerId));
    }
  }
  const rosterVisibility = state.rosterVisibilityResolution?.rosterVisibility;
  const rosterPrivateSides = rosterVisibility === "open"
    ? new Set(Object.keys(state.players || {}).map(String))
    : allied;
  const rosterMaps = [
    "armyBuildingConfigurationBySide", "armyResourceBudgetsBySide",
    "unitCompositionSelectionsBySide", "unitUpgradeSelectionsBySide",
    "armyCompositionUpgradeAuditsBySide",
  ];
  return objectKeysWithin(state.cardResources || {}, ownSeat)
    && objectKeysWithin(state.ownTeamArmyRostersBySide || {}, allied)
    && rosterMaps.every((field) => objectKeysWithin(state[field] || {}, rosterPrivateSides))
    && Object.values(state.equipmentReminderPermitsByActionHash || {})
      .every((permit) => object(permit) && allied.has(String(permit.playerId || "")))
    && (state.privateRosterDisclosureConductIncidents || [])
      .every((incident) => object(incident) && allied.has(String(incident.playerId || "")));
}

function viewerProjectionSubcontractsMatch(projection, publicAccess) {
  const room = projection.room;
  const viewer = projection.viewer;
  const control = projection.control;
  const matchBinding = projection.matchBinding;
  const runtime = matchBinding?.rulesRuntimeBinding;
  const display = matchBinding?.rulesDisplayBinding;
  const signature = matchBinding?.refereeSignature;
  const training = projection.training;
  const integerFields = [
    "roomRevision", "stateRevision", "revision", "privateJournalSequence",
    "publicJournalSequence", "seatRecoveryRevision", "previewCount",
    "acceptedReceiptCount",
  ];
  const publicControl = hasExactKeys(control, PUBLIC_CONTROL_KEYS)
    && control.visible === false
    && control.currentLeaseFence === null
    && control.ownedByViewer === false
    && control.hasActiveLease === false;
  const seatControl = hasExactKeys(control, SEAT_CONTROL_KEYS)
    && control.visible === true
    && control.seatKey === viewer.seatKey
    && Number.isSafeInteger(control.currentLeaseFence)
    && control.currentLeaseFence >= 0
    && typeof control.ownedByViewer === "boolean"
    && typeof control.hasActiveLease === "boolean";
  return hasExactKeys(room, VIEWER_ROOM_SUMMARY_KEYS)
    && room.schemaVersion === "starcraft_tmg_room_runtime_v2.summary"
    && integerFields.every((field) => Number.isSafeInteger(room[field]) && room[field] >= 0)
    && room.revision === room.stateRevision
    && validContractHash(room.stateHash)
    && validContractHash(room.journalHeadHash)
    && room.trainingTruth === false
    && typeof room.productionReady === "boolean"
    && hasExactKeys(matchBinding, PUBLIC_MATCH_BINDING_KEYS)
    && matchBinding.schemaVersion === `${projection.authorityVersion}.match-binding`
    && matchBinding.roomId === room.roomId
    && matchBinding.gameId === room.gameId
    && matchBinding.bindingHash === room.matchBindingHash
    && validContractHash(matchBinding.bindingHash)
    && matchBinding.productionReady === room.productionReady
    && hasExactKeys(runtime, RULES_RUNTIME_BINDING_KEYS)
    && runtime.schemaVersion === "starcraft_tmg_rules_runtime_binding_v1"
    && validContractHash(runtime.runtimeHash)
    && runtime.trainingTruth === false
    && sameContract(runtime, room.rulesRuntimeBinding)
    && hasExactKeys(display, RULES_DISPLAY_BINDING_KEYS)
    && display.schemaVersion === "starcraft_tmg_rules_display_binding_v1"
    && validContractHash(display.artifactHash)
    && display.rulesVersion === matchBinding.rulesVersion
    && hasExactKeys(signature, REFEREE_SIGNATURE_KEYS)
    && signature.contentHash === matchBinding.bindingHash
    && validContractHash(signature.contentHash)
    && (publicAccess ? publicControl : seatControl)
    && hasExactKeys(training, VIEWER_TRAINING_KEYS)
    && training.eligibleForTraining === false
    && training.trainingTruth === false
    && training.reviewStatus === "raw";
}

function validContractHash(value) {
  return CONTRACT_HASH_PATTERN.test(String(value || ""));
}

function nonNegativeSafeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function exactOrOptionalKeys(value, required, optional = []) {
  if (!object(value)) return false;
  const keys = Object.keys(value);
  return required.every((key) => Object.prototype.hasOwnProperty.call(value, key))
    && keys.every((key) => required.includes(key) || optional.includes(key));
}

function projectionAuthorityIdentity(projection, roomId, options = {}) {
  if (!object(projection)
    || projection.schemaVersion !== VIEWER_ROOM_PROJECTION_VERSION
    || !object(projection.room)
    || !object(projection.matchBinding) || !object(projection.viewer)
    || !object(projection.state)) return null;
  const identity = {
    authorityVersion: String(projection.authorityVersion || ""),
    gameId: String(projection.room.gameId || ""),
    roomId: String(projection.room.roomId || ""),
    matchBindingHash: String(projection.room.matchBindingHash || ""),
    stateRevision: Number(projection.room.stateRevision),
    stateHash: String(projection.room.stateHash || ""),
    journalHeadHash: String(projection.room.journalHeadHash || ""),
    sideKey: String(projection.viewer.seatKey || ""),
    phase: String(projection.state.phase || ""),
    refereeKeyId: String(projection.matchBinding.refereeKeyId || ""),
    refereePublicKeyFingerprint: String(
      projection.matchBinding.refereePublicKeyFingerprint || "",
    ),
    rulesRuntimeMode: String(projection.room.rulesRuntimeBinding?.mode || ""),
  };
  if (!identity.authorityVersion
    || !identity.gameId
    || identity.roomId !== roomId
    || !validContractHash(identity.matchBindingHash)
    || projection.matchBinding.bindingHash !== identity.matchBindingHash
    || !nonNegativeSafeInteger(identity.stateRevision)
    || !validContractHash(identity.stateHash)
    || !validContractHash(identity.journalHeadHash)
    || (options.requireSeat !== false && !identity.sideKey)
    || !identity.phase
    || !identity.refereeKeyId
    || !validContractHash(identity.refereePublicKeyFingerprint)
    || !identity.rulesRuntimeMode) return null;
  return identity;
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

function validFiniteActions(actions, identity) {
  if (!Array.isArray(actions)) return false;
  const seen = new Set();
  return actions.every((entry) => {
    if (!hasExactKeys(entry, ["actionKey", "action", "confirmationClass"])
      || !object(entry.action)
      || typeof entry.action.actionType !== "string"
      || entry.action.sideKey !== identity.sideKey
      || !new Set(["direct_gesture", "explicit_human"]).has(entry.confirmationClass)) return false;
    const expectedKey = `sc-finite-${contractHash({
      matchBindingHash: identity.matchBindingHash,
      stateHash: identity.stateHash,
      stateRevision: identity.stateRevision,
      sideKey: identity.sideKey,
      action: entry.action,
    })}`;
    if (entry.actionKey !== expectedKey || seen.has(entry.actionKey)) return false;
    seen.add(entry.actionKey);
    return true;
  });
}

function validParameterDomains(domains, identity) {
  if (!Array.isArray(domains)) return false;
  const seen = new Set();
  return domains.every((domain) => {
    if (!object(domain)
      || !/^sc-domain-[a-f0-9]{64}$/u.test(String(domain.domainId || ""))
      || typeof domain.actionType !== "string"
      || !domain.actionType
      || domain.sideKey !== identity.sideKey
      || !object(domain.constraints)
      || (domain.parameterSchema !== undefined && !object(domain.parameterSchema))) return false;
    const { domainId, ...domainCore } = domain;
    const domainIdentity = identity.rulesRuntimeMode === "legacy_compatibility_fixture"
      ? {
        matchBindingHash: identity.matchBindingHash,
        stateHash: identity.stateHash,
        stateRevision: identity.stateRevision,
        sideKey: identity.sideKey,
        actionType: domain.actionType,
        pieceId: domain.pieceId,
      }
      : domainCore;
    if (domainId !== `sc-domain-${contractHash(domainIdentity)}` || seen.has(domainId)) return false;
    seen.add(domainId);
    return true;
  });
}

function validSearchSuggestions(suggestions, domains) {
  if (!Array.isArray(suggestions)) return false;
  const domainIds = new Set(domains.map((domain) => domain.domainId));
  const seen = new Set();
  return suggestions.every((entry) => {
    if (!hasExactKeys(entry, [
      "suggestionId",
      "candidateId",
      "kind",
      "authoritativeIdentity",
      "proposal",
      "action",
      "isEnabled",
      "score",
      "details",
    ])
      || !/^sc-suggestion-[a-f0-9]{64}$/u.test(String(entry.suggestionId || ""))
      || entry.candidateId !== entry.suggestionId
      || entry.kind !== "parameter_sample"
      || entry.authoritativeIdentity !== false
      || entry.isEnabled !== true
      || !Number.isFinite(entry.score)
      || !object(entry.details)
      || !object(entry.action)
      || !object(entry.proposal)
      || entry.proposal.kind !== "parameterized"
      || !domainIds.has(entry.proposal.domainId)
      || !object(entry.proposal.parameters)
      || seen.has(entry.suggestionId)) return false;
    seen.add(entry.suggestionId);
    return true;
  });
}

function validDisabledDiagnostics(diagnostics) {
  return Array.isArray(diagnostics) && diagnostics.every((entry) => (
    exactOrOptionalKeys(entry, ["action", "disabledReason"], ["details"])
      && object(entry.action)
      && typeof entry.disabledReason === "string"
      && (entry.details === undefined || object(entry.details))
  ));
}

function validLegalSpaceResponse(legalSpace, projection, roomId) {
  const identity = projectionAuthorityIdentity(projection, roomId);
  if (!identity
    || !hasExactKeys(legalSpace, LEGAL_SPACE_KEYS)
    || legalSpace.schemaVersion !== `${identity.authorityVersion}.legal-space`
    || legalSpace.gameId !== identity.gameId
    || legalSpace.roomId !== identity.roomId
    || legalSpace.matchBindingHash !== identity.matchBindingHash
    || legalSpace.stateRevision !== identity.stateRevision
    || legalSpace.revision !== identity.stateRevision
    || legalSpace.stateHash !== identity.stateHash
    || legalSpace.sideKey !== identity.sideKey
    || legalSpace.phase !== identity.phase
    || (legalSpace.terminal !== null && !object(legalSpace.terminal))
    || !sameContract(
      legalSpace.rulesRuntimeBinding,
      projection.room.rulesRuntimeBinding,
    )
    || !validFiniteActions(legalSpace.finiteActions, identity)
    || !validParameterDomains(legalSpace.parameterDomains, identity)
    || !validSearchSuggestions(
      legalSpace.searchSuggestions,
      legalSpace.parameterDomains,
    )
    || !validDisabledDiagnostics(legalSpace.disabledDiagnostics)
    || legalSpace.disabledCount !== legalSpace.disabledDiagnostics.length
    || legalSpace.searchAndStrategyExcludedFromAuthority !== true
    || !Array.isArray(legalSpace.candidates)
    || !validContractHash(legalSpace.legalSpaceHash)
    || legalSpace.legalSpaceHash !== contractHash(legalSpaceCore(legalSpace))) return false;
  const expectedCandidates = [
    ...legalSpace.finiteActions.map((entry) => ({
      candidateId: entry.actionKey,
      action: clone(entry.action),
      isEnabled: true,
      score: 0,
      details: {},
      authoritativeIdentity: true,
    })),
    ...clone(legalSpace.searchSuggestions),
  ];
  return sameContract(legalSpace.candidates, expectedCandidates);
}

function validChanceTicketBundle(bundle, core) {
  if (!object(bundle)
    || !exactOrOptionalKeys(bundle, [
      "schemaVersion",
      "matchBindingHash",
      "stateHash",
      "stateRevision",
      "proposalHash",
      "spec",
      "tickets",
      "outcomesHidden",
      "bundleHash",
    ])
    || bundle.schemaVersion !== "starcraft_tmg_chance_bundle_v1"
    || bundle.matchBindingHash !== core.matchBindingHash
    || bundle.stateHash !== core.preStateHash
    || bundle.stateRevision !== core.expectedStateRevision
    || bundle.proposalHash !== core.proposalHash
    || bundle.outcomesHidden !== true
    || !object(bundle.spec)
    || !Array.isArray(bundle.tickets)
    || !nonNegativeSafeInteger(bundle.spec.count)
    || bundle.tickets.length !== bundle.spec.count) return false;
  const { bundleHash, ...body } = bundle;
  if (!validContractHash(bundleHash) || bundleHash !== contractHash(body)) return false;
  return bundle.tickets.every((ticket, index) => (
    object(ticket)
      && ticket.schemaVersion === "starcraft_tmg_chance_ticket_v1"
      && object(ticket.basis)
      && ticket.basis.matchBindingHash === core.matchBindingHash
      && ticket.basis.stateHash === core.preStateHash
      && ticket.basis.stateRevision === core.expectedStateRevision
      && ticket.basis.proposalHash === core.proposalHash
      && ticket.basis.counter === index
      && validContractHash(ticket.commitment)
      && ticket.outcomeHidden === true
  ));
}

function validPreviewResult(core) {
  if (!object(core.result)) return false;
  if (core.chanceTicket === null) {
    return hasExactKeys(core.result, [
      "postStateHash",
      "eventsHash",
      "events",
      "postGameClock",
    ])
      && validContractHash(core.result.postStateHash)
      && validContractHash(core.result.eventsHash)
      && Array.isArray(core.result.events)
      && core.result.eventsHash === contractHash(core.result.events)
      && object(core.result.postGameClock)
      && core.result.postGameClock.transition === core.expectedStateRevision + 1;
  }
  return validChanceTicketBundle(core.chanceTicket, core)
    && hasExactKeys(core.result, [
      "chancePending",
      "postStateHash",
      "eventsHash",
      "events",
      "postGameClock",
    ])
    && core.result.chancePending === true
    && core.result.postStateHash === null
    && core.result.eventsHash === null
    && Array.isArray(core.result.events)
    && core.result.events.length === 0
    && core.result.postGameClock === null;
}

function expectedPreviewEntry(legalSpace, proposal) {
  if (proposal.kind === "finite") {
    return legalSpace.finiteActions.find((entry) => (
      entry.actionKey === proposal.actionKey
    )) || null;
  }
  return legalSpace.parameterDomains.find((entry) => (
    entry.domainId === proposal.domainId
  )) || null;
}

function validPreviewResponse(preview, proposal, legalSpace, projection, roomId) {
  const identity = projectionAuthorityIdentity(projection, roomId);
  const expectedEntry = expectedPreviewEntry(legalSpace, proposal);
  const core = preview?.core;
  const seal = preview?.previewSeal;
  if (!identity
    || !expectedEntry
    || !hasExactKeys(preview, PREVIEW_KEYS)
    || preview.schemaVersion !== `${identity.authorityVersion}.preview`
    || !/^sc-preview-[A-Za-z0-9-]{8,128}$/u.test(String(preview.previewId || ""))
    || !hasExactKeys(core, PREVIEW_CORE_KEYS)
    || core.schemaVersion !== `${identity.authorityVersion}.preview-core`
    || core.gameId !== identity.gameId
    || core.roomId !== identity.roomId
    || core.matchBindingHash !== identity.matchBindingHash
    || core.expectedStateRevision !== identity.stateRevision
    || core.expectedRevision !== identity.stateRevision
    || core.preStateHash !== identity.stateHash
    || core.legalSpaceHash !== legalSpace.legalSpaceHash
    || core.seatKey !== identity.sideKey
    || !object(core.proposal)
    || !object(core.action)
    || core.trainingTruth !== false
    || !validContractHash(core.proposalHash)
    || core.proposalHash !== contractHash(core.proposal)
    || !object(core.confirmationPolicy)
    || !new Set(["direct_gesture", "explicit_human"]).has(
      core.confirmationPolicy.baseClass,
    )
    || typeof core.confirmationPolicy.requiresExplicitHuman !== "boolean"
    || !validPreviewResult(core)
    || !hasExactKeys(seal, REFEREE_SEAL_KEYS)
    || seal.schemaVersion !== "starcraft_tmg_referee_seal_v1"
    || seal.purpose !== "preview"
    || seal.keyId !== identity.refereeKeyId
    || seal.hashAlgorithm !== "sha256"
    || seal.sealAlgorithm !== "hmac-sha256"
    || seal.contentHash !== contractHash({ previewId: preview.previewId, core })
    || !SEAL_MAC_PATTERN.test(String(seal.mac || ""))
    || preview.previewToken !== `${preview.previewId}.${seal.mac}`
    || !hasExactKeys(preview.audit, ["occurredAt"])
    || !Number.isFinite(Date.parse(String(preview.audit.occurredAt || "")))) return false;
  if (proposal.kind === "finite") {
    return core.proposal.kind === "finite"
      && core.proposal.actionKey === proposal.actionKey
      && sameContract(core.action, expectedEntry.action)
      && core.confirmationPolicy.baseClass === expectedEntry.confirmationClass;
  }
  return core.proposal.kind === "parameterized"
    && core.proposal.domainId === proposal.domainId
    && object(core.proposal.parameters)
    && core.action.actionType === expectedEntry.actionType
    && core.action.sideKey === identity.sideKey
    && (expectedEntry.pieceId === undefined
      || core.action.pieceId === expectedEntry.pieceId)
    && (expectedEntry.confirmationClass === undefined
      || core.confirmationPolicy.baseClass === expectedEntry.confirmationClass);
}

function validReplayResponse(result, projection, roomId) {
  const identity = projectionAuthorityIdentity(projection, roomId, {
    requireSeat: false,
  });
  const replay = result?.replay;
  const envelope = replay?.envelope;
  const finalProjection = replay?.finalProjection;
  const publicFinalViewer = hasExactKeys(finalProjection?.viewer, [
    "roleMode",
    "visibilityScope",
  ])
    && !identity?.sideKey
    && projection?.viewer?.roleMode === "public_observer"
    && projection?.viewer?.visibilityScope === "public"
    && finalProjection.viewer.roleMode === "public_observer"
    && finalProjection.viewer.visibilityScope === "public";
  const seatFinalViewer = hasExactKeys(finalProjection?.viewer, [
    "seatKey",
    "roleMode",
    "visibilityScope",
  ])
    && finalProjection.viewer.seatKey === identity?.sideKey
    && finalProjection.viewer.roleMode === projection?.viewer?.roleMode
    && finalProjection.viewer.visibilityScope
      === projection?.viewer?.visibilityScope;
  const expectedPublicState = {
    schemaVersion: "starcraft_tmg_public_state_summary_v1",
    round: Number.isSafeInteger(projection?.state?.round)
      ? projection.state.round
      : null,
    phase: String(projection?.state?.phase || ""),
    activeSideKey: projection?.state?.activeSideKey === undefined
      ? null
      : projection.state.activeSideKey,
    terminal: projection?.state?.terminal === true,
    gameOver: projection?.state?.gameOver === true,
    winner: projection?.state?.winner === undefined
      ? null
      : projection.state.winner,
    trainingTruth: false,
  };
  if (!identity
    || !exactOrOptionalKeys(result, [
      "schemaVersion",
      "ok",
      "replay",
      "matchesCurrent",
      "receiptCount",
      "checkpointUsedForVerification",
      "replayedTailReceiptCount",
      "trainingTruth",
    ])
    || result.schemaVersion !== VIEWER_REPLAY_RESPONSE_VERSION
    || result.ok !== true
    || result.matchesCurrent !== true
    || result.trainingTruth !== false
    || !nonNegativeSafeInteger(result.receiptCount)
    || !nonNegativeSafeInteger(result.replayedTailReceiptCount)
    || result.replayedTailReceiptCount > result.receiptCount
    || typeof result.checkpointUsedForVerification !== "boolean"
    || !object(replay)
    || !hasExactKeys(replay, [
      "schemaVersion",
      "appliedCount",
      "checkpointStateRevision",
      "envelope",
      "finalProjection",
      "silentCompatibilityUsed",
      "trainingTruth",
    ])
    || replay.schemaVersion !== VIEWER_REPLAY_BUNDLE_VERSION
    || !nonNegativeSafeInteger(replay.appliedCount)
    || !nonNegativeSafeInteger(replay.checkpointStateRevision)
    || replay.appliedCount !== result.replayedTailReceiptCount
    || replay.checkpointStateRevision + replay.appliedCount
      !== identity.stateRevision
    || result.receiptCount !== identity.stateRevision
    || result.checkpointUsedForVerification
      !== (replay.checkpointStateRevision > 0)
    || replay.silentCompatibilityUsed !== false
    || replay.trainingTruth !== false
    || !object(envelope)
    || !hasExactKeys(envelope, [
      "schemaVersion",
      "gameId",
      "roomId",
      "matchBindingHash",
      "stateRevision",
      "revision",
      "stateHash",
      "journalHeadHash",
      "state",
      "trainingTruth",
    ])
    || envelope.schemaVersion !== "starcraft_tmg_viewer_envelope_summary_v1"
    || envelope.gameId !== identity.gameId
    || envelope.roomId !== identity.roomId
    || envelope.matchBindingHash !== identity.matchBindingHash
    || envelope.stateRevision !== identity.stateRevision
    || envelope.revision !== identity.stateRevision
    || envelope.stateHash !== identity.stateHash
    || envelope.journalHeadHash !== identity.journalHeadHash
    || envelope.trainingTruth !== false
    || !sameContract(envelope.state, expectedPublicState)
    || !hasExactKeys(finalProjection, [
      "schemaVersion",
      "viewer",
      "room",
      "matchBinding",
      "authorityVersion",
      "state",
      "training",
    ])
    || finalProjection.schemaVersion
      !== REPLAY_FINAL_PROJECTION_VERSION
    || finalProjection.authorityVersion !== identity.authorityVersion
    || (!seatFinalViewer && !publicFinalViewer)
    || !sameContract(finalProjection.room, envelope)
    || !sameContract(finalProjection.matchBinding, projection.matchBinding)
    || !sameContract(finalProjection.state, projection.state)
    || containsProjectionSecretKey(finalProjection.state)
    || !sameContract(finalProjection.training, projection.training)) return false;
  return true;
}

function utf8Length(value) {
  let bytes = 0;
  for (const character of String(value)) {
    const point = character.codePointAt(0);
    bytes += point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
  }
  return bytes;
}

function nonEmpty(value, field, maxLength = 4096) {
  const normalized = String(value || "").trim();
  if (!normalized || normalized.length > maxLength) {
    throw Object.assign(new Error(`${field} is required and bounded`), { code: "CLIENT_INPUT_INVALID", details: { field } });
  }
  return normalized;
}

function accessToken(value, field) {
  const normalized = nonEmpty(value, field, 43);
  if (!ACCESS_TOKEN_PATTERN.test(normalized)) {
    throw Object.assign(new Error(`${field} must be a 256-bit base64url capability`), {
      code: "CLIENT_INPUT_INVALID",
      details: { field },
    });
  }
  return normalized;
}

function roomIdentifier(value, field) {
  const normalized = nonEmpty(value, field, 128);
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/u.test(normalized)) {
    throw Object.assign(new Error(`${field} must be a bounded URL-safe identifier`), {
      code: "CLIENT_INPUT_INVALID",
      details: { field },
    });
  }
  return normalized;
}

function assertBoundedJson(value) {
  let serialized;
  try {
    serialized = JSON.stringify(value);
  } catch {
    throw Object.assign(new Error("client input is not JSON representable"), { code: "CLIENT_INPUT_INVALID" });
  }
  if (utf8Length(serialized) > MAX_INPUT_BYTES) {
    throw Object.assign(new Error("client input exceeded the configured limit"), { code: "CLIENT_INPUT_TOO_LARGE" });
  }
}

function validateBootstrap(input) {
  assertNoAuthorityFields(input);
  assertExactKeys(input, ["route", "principal", "surface", "locale"], "bootstrap");
  assertExactKeys(input.route, ["roomId"], "bootstrap.route");
  const principal = input.principal || {};
  assertExactKeys(principal, ["seatToken", "access"], "bootstrap.principal");
  const hasSeatToken = Object.prototype.hasOwnProperty.call(principal, "seatToken");
  const hasAccess = Object.prototype.hasOwnProperty.call(principal, "access");
  if (hasSeatToken && hasAccess) {
    throw Object.assign(new Error("bootstrap principal must use one credential variant"), {
      code: "CLIENT_PRINCIPAL_AMBIGUOUS",
    });
  }
  let access = null;
  if (hasAccess) {
    assertExactKeys(principal.access, ["kind", "token"], "bootstrap.principal.access");
    const kind = String(principal.access.kind || "").trim();
    if (!ACCESS_KINDS.has(kind)) {
      throw Object.assign(new Error("bootstrap access kind is unsupported"), { code: "CLIENT_INPUT_INVALID" });
    }
    access = { kind, token: accessToken(principal.access.token, "bootstrap.principal.access.token") };
  }
  const surface = String(input.surface || "expo_web");
  if (!SURFACES.has(surface)) throw Object.assign(new Error("unsupported client surface"), { code: "CLIENT_INPUT_INVALID" });
  const normalized = {
    roomId: roomIdentifier(input.route.roomId, "bootstrap.route.roomId"),
    seatToken: hasSeatToken ? nonEmpty(principal.seatToken, "bootstrap.principal.seatToken") : "",
    access,
    surface,
    locale: String(input.locale || "en").slice(0, 32),
  };
  assertBoundedJson(input);
  return normalized;
}

function validateIntent(input) {
  assertNoAuthorityFields(input);
  if (!object(input) || !INTENT_KEYS[input.type]) {
    throw Object.assign(new Error(`unsupported client intent: ${input?.type || ""}`), { code: "CLIENT_INTENT_UNSUPPORTED" });
  }
  assertExactKeys(input, INTENT_KEYS[input.type], "intent");
  const intent = { type: input.type };
  if (input.type === "preview_finite") intent.actionKey = nonEmpty(input.actionKey, "intent.actionKey");
  if (input.type === "preview_parameterized") {
    intent.domainId = nonEmpty(input.domainId, "intent.domainId");
    if (!object(input.parameters)) throw Object.assign(new Error("intent.parameters must be an object"), { code: "CLIENT_INPUT_INVALID" });
    intent.parameters = clone(input.parameters);
  }
  if (input.type === "confirm_and_apply_preview") intent.previewId = nonEmpty(input.previewId, "intent.previewId");
  assertBoundedJson(intent);
  return intent;
}

function operationalLifecycle(snapshot) {
  return snapshot.online === true && snapshot.visibility === "active";
}

function scrubCredentialMaterial(value, sensitiveValues = new Set()) {
  if (Array.isArray(value)) return value.map((entry) => scrubCredentialMaterial(entry, sensitiveValues));
  if (!object(value)) {
    if (typeof value !== "string") return clone(value);
    for (const secret of sensitiveValues) {
      if (secret && value.includes(secret)) return "[credential-redacted]";
    }
    return value;
  }
  const safe = {};
  for (const [key, entry] of Object.entries(value)) {
    if (ACCESS_SECRET_KEYS.has(normalizedKey(key))) continue;
    safe[key] = scrubCredentialMaterial(entry, sensitiveValues);
  }
  return safe;
}

function containsProjectionSecretKey(value) {
  if (Array.isArray(value)) return value.some(containsProjectionSecretKey);
  if (!object(value)) return false;
  return Object.entries(value).some(([key, entry]) => (
    PROJECTION_SECRET_KEYS.has(normalizedKey(key)) || containsProjectionSecretKey(entry)
  ));
}

function safeErrorDetails(error, sensitiveValues = new Set()) {
  return error?.details && object(error.details)
    ? scrubCredentialMaterial(error.details, sensitiveValues)
    : {};
}

function receiptReference(receipt) {
  if (!object(receipt)) return null;
  return {
    schemaVersion: "starcraft_tmg_client_receipt_reference_v1",
    journalHash: String(receipt.journalHash || ""),
    preStateRevision: Number(receipt.preStateRevision),
    postStateRevision: Number(receipt.postStateRevision),
    postStateHash: String(receipt.postStateHash || ""),
    matchBindingHash: String(receipt.matchBindingHash || ""),
    refereeSignature: clone(receipt.refereeSignature || null),
    trainingTruth: false,
  };
}

const TRANSITION_RECEIPT_KEYS = Object.freeze([
  "schemaVersion", "gameId", "roomId", "matchBindingHash",
  "previousJournalHash", "privateJournalSequence", "preStateRevision",
  "postStateRevision", "preRevision", "postRevision", "preStateHash",
  "postStateHash", "legalSpaceHash", "proposal", "proposalHash", "action",
  "previewContentHash", "confirmationPolicy", "confirmationProofHash",
  "applyingSeatKey", "applyingGrantId", "controlLeaseId", "leaseFence",
  "idempotencyKeyHash", "preGameClock", "postGameClock", "chanceReveal",
  "eventsHash", "events", "manualAdjudication", "eligibleForTraining",
  "trainingTruth", "refereeSignature", "journalHash", "audit",
]);
const REFEREE_SIGNATURE_KEYS = Object.freeze([
  "schemaVersion", "purpose", "keyId", "canonicalization", "hashAlgorithm",
  "signatureAlgorithm", "contentHash", "signature",
]);
const VIEWER_ENVELOPE_KEYS = Object.freeze([
  "schemaVersion", "gameId", "roomId", "matchBindingHash", "stateRevision",
  "revision", "stateHash", "journalHeadHash", "state", "trainingTruth",
]);

function publicStateSummaryFromProjection(state = {}) {
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

function structurallyValidTransitionReceipt(receipt, {
  projection,
  pendingPreview,
  controlLease,
  idempotencyKey,
}) {
  const identity = projectionAuthorityIdentity(projection, projection?.room?.roomId);
  if (!identity || !hasExactKeys(receipt, TRANSITION_RECEIPT_KEYS)) return false;
  const { journalHash, refereeSignature, audit, ...core } = receipt;
  return receipt.schemaVersion === `${identity.authorityVersion}.receipt`
    && receipt.gameId === identity.gameId
    && receipt.roomId === identity.roomId
    && receipt.matchBindingHash === identity.matchBindingHash
    && receipt.previousJournalHash === identity.journalHeadHash
    && receipt.privateJournalSequence === receipt.postStateRevision
    && receipt.preStateRevision === identity.stateRevision
    && receipt.postStateRevision === identity.stateRevision + 1
    && receipt.preRevision === identity.stateRevision
    && receipt.postRevision === identity.stateRevision + 1
    && receipt.preStateHash === identity.stateHash
    && validContractHash(receipt.postStateHash)
    && receipt.legalSpaceHash === pendingPreview?.core?.legalSpaceHash
    && sameContract(receipt.proposal, pendingPreview?.core?.proposal)
    && receipt.proposalHash === pendingPreview?.core?.proposalHash
    && receipt.proposalHash === contractHash(receipt.proposal)
    && sameContract(receipt.action, pendingPreview?.core?.action)
    && receipt.previewContentHash === pendingPreview?.previewSeal?.contentHash
    && sameContract(receipt.confirmationPolicy, pendingPreview?.core?.confirmationPolicy)
    && (receipt.confirmationProofHash === null || validContractHash(receipt.confirmationProofHash))
    && receipt.applyingSeatKey === identity.sideKey
    && receipt.applyingGrantId === projection.viewer.grantId
    && receipt.controlLeaseId === controlLease?.leaseId
    && receipt.leaseFence === controlLease?.leaseFence
    && receipt.idempotencyKeyHash === contractHash({
      roomId: identity.roomId,
      idempotencyKey,
    })
    && sameContract(receipt.preGameClock, projection.state.gameClock)
    && validContractHash(receipt.eventsHash)
    && receipt.eventsHash === contractHash(receipt.events)
    && typeof receipt.manualAdjudication === "boolean"
    && receipt.eligibleForTraining === false
    && receipt.trainingTruth === false
    && hasExactKeys(refereeSignature, REFEREE_SIGNATURE_KEYS)
    && refereeSignature.schemaVersion === "starcraft_tmg_referee_signature_v1"
    && refereeSignature.purpose === "accepted_receipt"
    && refereeSignature.keyId === identity.refereeKeyId
    && refereeSignature.canonicalization === "RFC8785"
    && refereeSignature.hashAlgorithm === "sha256"
    && refereeSignature.signatureAlgorithm === "ed25519"
    && refereeSignature.contentHash === contractHash(core)
    && ED25519_SIGNATURE_PATTERN.test(String(refereeSignature.signature || ""))
    && journalHash === contractHash({ receipt: core, refereeSignature })
    && hasExactKeys(audit, ["occurredAt"])
    && Number.isFinite(Date.parse(String(audit.occurredAt || "")));
}

function validViewerEnvelopeSummary(envelope, expected) {
  return hasExactKeys(envelope, VIEWER_ENVELOPE_KEYS)
    && envelope.schemaVersion === "starcraft_tmg_viewer_envelope_summary_v1"
    && envelope.gameId === expected.gameId
    && envelope.roomId === expected.roomId
    && envelope.matchBindingHash === expected.matchBindingHash
    && envelope.stateRevision === expected.stateRevision
    && envelope.revision === expected.stateRevision
    && envelope.stateHash === expected.stateHash
    && envelope.journalHeadHash === expected.journalHeadHash
    && envelope.trainingTruth === false
    && object(envelope.state);
}

function validApplyResponseBeforeRefresh(result, context) {
  const receipt = result?.receipt;
  return exactOrOptionalKeys(result, [
    "schemaVersion", "ok", "receipt", "envelope", "trainingTruth",
  ], ["room", "checkpoint", "idempotentReplay"])
    && result.schemaVersion === VIEWER_APPLY_RESPONSE_VERSION
    && result.ok === true
    && result.trainingTruth === false
    && (result.idempotentReplay === undefined
      || typeof result.idempotentReplay === "boolean")
    && (result.room === undefined || (object(result.room)
      && result.room.roomId === receipt?.roomId
      && result.room.matchBindingHash === receipt?.matchBindingHash
      && result.room.stateRevision === receipt?.postStateRevision
      && result.room.stateHash === receipt?.postStateHash
      && result.room.journalHeadHash === receipt?.journalHash
      && result.room.trainingTruth === false))
    && (result.checkpoint === null || result.checkpoint === undefined
      || (hasExactKeys(result.checkpoint, ["checkpointHash", "stateRevision"])
        && validContractHash(result.checkpoint.checkpointHash)
        && result.checkpoint.stateRevision === receipt?.postStateRevision))
    && structurallyValidTransitionReceipt(receipt, context)
    && validViewerEnvelopeSummary(result.envelope, {
      gameId: receipt.gameId,
      roomId: receipt.roomId,
      matchBindingHash: receipt.matchBindingHash,
      stateRevision: receipt.postStateRevision,
      stateHash: receipt.postStateHash,
      journalHeadHash: receipt.journalHash,
    });
}

function applyResponseMatchesRefreshedProjection(result, projection) {
  const receipt = result.receipt;
  const identity = projectionAuthorityIdentity(projection, receipt.roomId);
  return Boolean(identity)
    && identity.stateRevision === receipt.postStateRevision
    && identity.stateHash === receipt.postStateHash
    && identity.journalHeadHash === receipt.journalHash
    && sameContract(receipt.postGameClock, projection.state.gameClock)
    && sameContract(
      result.envelope.state,
      publicStateSummaryFromProjection(projection.state),
    );
}

function replayReference(replayResult) {
  return {
    schemaVersion: "starcraft_tmg_client_replay_reference_v1",
    matchesCurrent: replayResult.matchesCurrent === true,
    receiptCount: Number(replayResult.receiptCount || 0),
    checkpointUsedForVerification: replayResult.checkpointUsedForVerification === true,
    replayedTailReceiptCount: Number(replayResult.replayedTailReceiptCount || 0),
    stateRevision: Number(replayResult.replay?.envelope?.stateRevision || 0),
    stateHash: String(replayResult.replay?.envelope?.stateHash || ""),
    journalHeadHash: String(replayResult.replay?.envelope?.journalHeadHash || ""),
    trainingTruth: false,
  };
}

function accessReceiptReference(receipt, kind) {
  if (!object(receipt)) return null;
  const safe = scrubCredentialMaterial(receipt);
  return {
    ...safe,
    schemaVersion: "starcraft_tmg_client_access_receipt_reference_v1",
    authoritySchemaVersion: String(receipt.schemaVersion || ""),
    kind,
    clientVerification: {
      schemaVersion: "starcraft_tmg_client_access_receipt_verification_scope_v1",
      scope: "structure_hash_and_session_binding_only",
      ed25519SignatureStructureBound: true,
      hmacSealStructureBound: true,
      trustedPublicKeyCryptographicallyVerified: false,
      serverHmacCryptographicallyVerified: false,
      authoritativeVerificationRequired: true,
      trainingTruth: false,
    },
    trainingTruth: false,
  };
}

// The portable client has neither a trusted referee public-key resolver nor the
// server HMAC secret. This therefore validates canonical structure, hashes and
// session bindings only; it must never be described as Ed25519/HMAC proof
// verification. The authoritative service remains responsible for crypto.verify.
function structurallyValidAuthorityAccessReceipt(receipt, {
  kind,
  operation,
  roomId,
  matchBinding = null,
}) {
  if (!object(receipt)) return false;
  const { receiptHash, refereeSignature, accessSeal, ...content } = receipt;
  const expectedTokenKind = kind === "invite" ? "invite" : "seat_recovery";
  const sealBasis = { content, receiptHash, refereeSignature };
  const signatureKeys = [
    "schemaVersion",
    "purpose",
    "keyId",
    "canonicalization",
    "hashAlgorithm",
    "signatureAlgorithm",
    "contentHash",
    "signature",
  ];
  const sealKeys = [
    "schemaVersion",
    "purpose",
    "keyId",
    "hashAlgorithm",
    "sealAlgorithm",
    "contentHash",
    "mac",
  ];
  const structureValid = receipt.schemaVersion === "starcraft_tmg_room_access_receipt_v1"
    && receipt.operation === operation
    && receipt.roomId === roomId
    && receipt.tokenKind === expectedTokenKind
    && /^[a-f0-9]{64}$/u.test(String(receipt.matchBindingHash || ""))
    && String(receipt.refereeKeyId || "").length > 0
    && String(receipt.refereeKeyId || "").length <= 256
    && validAccessRevisions(receipt.preRevisions)
    && validAccessRevisions(receipt.postRevisions)
    && receipt.postRevisions.roomRevision === receipt.preRevisions.roomRevision + 1
    && receipt.postRevisions.stateRevision === receipt.preRevisions.stateRevision
    && receipt.postRevisions.privateJournalSequence === receipt.preRevisions.privateJournalSequence + 1
    && receipt.postRevisions.seatRecoveryRevision === receipt.preRevisions.seatRecoveryRevision + 1
    && /^[a-f0-9]{64}$/.test(String(receiptHash || ""))
    && receiptHash === hashStarcraftTmgClientContract({ content, refereeSignature })
    && hasExactKeys(refereeSignature, signatureKeys)
    && refereeSignature?.schemaVersion === "starcraft_tmg_referee_signature_v1"
    && refereeSignature?.purpose === "room_access_receipt"
    && refereeSignature?.canonicalization === "RFC8785"
    && refereeSignature?.hashAlgorithm === "sha256"
    && refereeSignature?.signatureAlgorithm === "ed25519"
    && refereeSignature?.keyId === receipt.refereeKeyId
    && refereeSignature?.contentHash === hashStarcraftTmgClientContract(content)
    && /^[A-Za-z0-9_-]{86}$/u.test(String(refereeSignature?.signature || ""))
    && hasExactKeys(accessSeal, sealKeys)
    && accessSeal?.schemaVersion === "starcraft_tmg_referee_seal_v1"
    && accessSeal?.purpose === "room_access_receipt"
    && accessSeal?.hashAlgorithm === "sha256"
    && accessSeal?.sealAlgorithm === "hmac-sha256"
    && accessSeal?.keyId === receipt.refereeKeyId
    && accessSeal?.contentHash === hashStarcraftTmgClientContract(sealBasis)
    && /^[A-Za-z0-9_-]{43}$/u.test(String(accessSeal?.mac || ""))
    && /^[a-f0-9]{64}$/.test(String(receipt.refereePublicKeyFingerprint || ""))
    && receipt.trainingTruth === false;
  if (!structureValid) return false;
  if (!matchBinding) return true;
  return matchBinding.roomId === roomId
    && matchBinding.bindingHash === receipt.matchBindingHash
    && matchBinding.refereeKeyId === receipt.refereeKeyId
    && matchBinding.refereePublicKeyFingerprint === receipt.refereePublicKeyFingerprint;
}

function roomBoundTokenDigest(roomId, rawToken, tokenKind) {
  if (tokenKind === "seat_grant") {
    return hashStarcraftTmgClientContract({
      schemaVersion: "starcraft_tmg_seat_token_digest_v1",
      roomId,
      token: rawToken,
    });
  }
  return hashStarcraftTmgClientContract({
    schemaVersion: "starcraft_tmg_room_bound_token_digest_v1",
    roomId,
    tokenKind,
    token: rawToken,
  });
}

function unclaimedControl(status = "unclaimed") {
  return {
    schemaVersion: "starcraft_tmg_client_control_summary_v1",
    status,
    claimedAt: null,
    roomRevision: null,
    trainingTruth: false,
  };
}

function claimedControl(result, claimedAt) {
  return {
    schemaVersion: "starcraft_tmg_client_control_summary_v1",
    status: "claimed",
    claimedAt,
    roomRevision: Number.isInteger(Number(result?.room?.roomRevision))
      ? Number(result.room.roomRevision)
      : null,
    trainingTruth: false,
  };
}

function randomOperationalId(prefix) {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`;
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else {
    fallbackOperationalIdCounter += 1;
    const seed = `${Date.now()}-${fallbackOperationalIdCounter}-${prefix}`;
    const hash = hashStarcraftTmgClientContract(seed);
    for (let index = 0; index < bytes.length; index += 1) bytes[index] = Number.parseInt(hash.slice(index * 2, index * 2 + 2), 16);
  }
  return `${prefix}-${[...bytes].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

export function createStarcraftTmgClientDomain(options = {}) {
  const transport = assertStarcraftTmgAuthoritativeTransportPort(options.transport);
  const projectionStore = assertStarcraftTmgProjectionStorePort(options.projectionStore);
  const lifecycle = assertStarcraftTmgLifecyclePort(options.lifecycle);
  const now = typeof options.now === "function" ? options.now : () => new Date().toISOString();
  const createId = typeof options.createId === "function" ? options.createId : randomOperationalId;
  const clientSessionId = createId("sc-client-session");
  const listeners = new Set();
  const sensitiveValues = new Set();
  // This bounded registry contains blocked scopes only. Entries are never
  // evicted: once full, binding a new scope fails closed until one of the
  // recorded scopes completes authoritative refresh -> Replay revalidation.
  const replayIntegrityByScope = new Map();
  let binding = null;
  let bindingCredential = "";
  let controlLeaseReference = null;
  let lifecycleUnsubscribe = null;
  let operationQueue = Promise.resolve();
  let internal = {
    clientRevision: 0,
    phase: "unbound",
    locator: null,
    principalScopeHash: null,
    surface: null,
    locale: null,
    lifecycle: clone(lifecycle.read()),
    roomProjection: null,
    legalSpace: null,
    pendingPreview: null,
    lastReceipt: null,
    replay: null,
    control: unclaimedControl(),
    accessReceipt: null,
    integrity: {
      schemaVersion: "starcraft_tmg_client_replay_integrity_latch_v1",
      replayBlocked: false,
      reason: null,
      blockedAtStateRevision: null,
      recoveryPhase: "clear",
      trainingTruth: false,
    },
    rejection: null,
    recovery: {
      cacheStatus: "not_checked",
      source: "none",
      authoritativeOutcomeUncertain: false,
      lastSynchronizedAt: null,
    },
    trainingTruth: false,
  };
  let currentView = null;

  function buildView() {
    const core = {
      schemaVersion: `${STARCRAFT_TMG_CLIENT_DOMAIN_VERSION}.view`,
      clientRevision: internal.clientRevision,
      phase: internal.phase,
      locator: clone(internal.locator),
      surface: internal.surface,
      locale: internal.locale,
      lifecycle: clone(internal.lifecycle),
      roomProjection: clone(internal.roomProjection),
      legalSpace: clone(internal.legalSpace),
      pendingPreview: clone(internal.pendingPreview),
      lastReceipt: clone(internal.lastReceipt),
      replay: clone(internal.replay),
      control: clone(internal.control),
      accessReceipt: clone(internal.accessReceipt),
      integrity: clone(internal.integrity),
      rejection: clone(internal.rejection),
      recovery: clone(internal.recovery),
      capabilities: {
        authoritativeMutation: false,
        rulesEvaluation: false,
        sourceAuthority: false,
        providerExecution: false,
        skillGeneration: false,
        trainingTruth: false,
      },
      trainingTruth: false,
    };
    return deepFreeze({ ...core, viewHash: hashStarcraftTmgClientContract(core) });
  }

  function publish(patch = {}) {
    internal = { ...internal, ...clone(patch), clientRevision: internal.clientRevision + 1 };
    currentView = buildView();
    for (const listener of [...listeners]) {
      try {
        listener(currentView);
      } catch {
        // A view listener is presentation-only and cannot interrupt domain progress.
      }
    }
    return currentView;
  }

  function read() {
    if (!currentView) currentView = buildView();
    return currentView;
  }

  function rejection(code, details = {}, phase = internal.phase) {
    const record = {
      schemaVersion: `${STARCRAFT_TMG_CLIENT_DOMAIN_VERSION}.rejection`,
      code: String(code || "CLIENT_OPERATION_REJECTED"),
      details: clone(details),
      occurredAt: now(),
      trainingTruth: false,
    };
    const view = publish({ phase, rejection: record });
    return deepFreeze({ ok: false, rejection: record, view });
  }

  function success(outcome, details = {}) {
    return deepFreeze({ ok: true, outcome, ...clone(details), view: read() });
  }

  function cacheCore(projection) {
    return {
      schemaVersion: "starcraft_tmg_client_projection_cache_record_v1",
      cacheKey: binding.cacheKey,
      roomId: binding.roomId,
      principalScopeHash: binding.principalScopeHash,
      projection: clone(projection),
      savedAt: now(),
      authority: false,
      trainingTruth: false,
    };
  }

  async function saveProjection(projection) {
    const core = cacheCore(projection);
    const record = { ...core, integrityHash: hashStarcraftTmgClientContract(core) };
    try {
      await projectionStore.save(binding.cacheKey, record);
      return "verified_write";
    } catch {
      return "write_failed";
    }
  }

  function containsSensitiveValue(value) {
    const serialized = JSON.stringify(value);
    for (const secret of sensitiveValues) {
      if (secret && serialized.includes(secret)) return true;
    }
    return false;
  }

  function validateProjection(projection) {
    if (!object(projection)) {
      throw Object.assign(new Error("viewer projection is invalid or cross-room"), { code: "PROJECTION_INVALID" });
    }
    if (containsProjectionSecretKey(projection) || containsSensitiveValue(projection)) {
      throw Object.assign(new Error("viewer projection contained credential material"), { code: "PROJECTION_CREDENTIAL_LEAK_REJECTED" });
    }
    if (projection.schemaVersion !== VIEWER_ROOM_PROJECTION_VERSION
      || !hasExactKeys(projection, STARCRAFT_TMG_VIEWER_PROJECTION_V3_TOP_LEVEL_KEYS)
      || !object(projection.room)
      || projection.room.roomId !== binding.roomId) {
      throw Object.assign(new Error("viewer projection is invalid or cross-room"), { code: "PROJECTION_INVALID" });
    }
    if (!Number.isInteger(Number(projection.room.stateRevision)) || !projection.room.stateHash) {
      throw Object.assign(new Error("viewer projection revision identity is missing"), { code: "PROJECTION_INVALID" });
    }
    if (!isExactStarcraftTmgViewerStateShapeV3(projection.state)) {
      throw Object.assign(new Error("viewer state does not match the exact V3 visibility schema"), {
        code: "PROJECTION_INVALID",
      });
    }
    const viewer = projection.viewer || {};
    const publicAccess = !bindingCredential;
    const viewerClassMatches = publicAccess
      ? hasExactKeys(viewer, PUBLIC_VIEWER_KEYS)
        && viewer.roleMode === "public_observer"
        && viewer.visibilityScope === "public"
        && sameContract(viewer.capabilities, ["read_public"])
      : hasExactKeys(viewer, SEAT_VIEWER_KEYS)
        && Boolean(String(viewer.grantId || "").trim())
        && Boolean(String(viewer.seatKey || "").trim())
        && viewer.roleMode !== "public_observer"
        && viewer.visibilityScope !== "public"
        && Array.isArray(viewer.capabilities)
        && viewer.capabilities.includes("read_room")
        && Number.isSafeInteger(viewer.grantRecoveryRevision)
        && viewer.grantRecoveryRevision >= 0;
    if (!viewerClassMatches) {
      throw Object.assign(new Error("viewer projection does not match bootstrap credential class"), {
        code: "PROJECTION_VIEWER_CLASS_INVALID",
      });
    }
    if (binding.expectedViewer) {
      const matchBinding = projection.matchBinding || {};
      if (viewer.grantId !== binding.expectedViewer.grantId
        || viewer.seatKey !== binding.expectedViewer.seatKey
        || viewer.roleMode !== binding.expectedViewer.roleMode
        || viewer.grantRecoveryRevision !== binding.expectedViewer.grantRecoveryRevision
        || projection.room.matchBindingHash !== binding.expectedViewer.matchBindingHash
        || matchBinding.roomId !== binding.roomId
        || matchBinding.bindingHash !== binding.expectedViewer.matchBindingHash
        || matchBinding.refereeKeyId !== binding.expectedViewer.refereeKeyId
        || matchBinding.refereePublicKeyFingerprint !== binding.expectedViewer.refereePublicKeyFingerprint) {
        throw Object.assign(new Error("access exchange credential does not match its viewer projection"), {
          code: "ACCESS_EXCHANGE_BINDING_INVALID",
        });
      }
    }
    if (!viewerProjectionSubcontractsMatch(projection, publicAccess)
      || !viewerPrivateStateMatches(projection.state, viewer, publicAccess)) {
      throw Object.assign(new Error("viewer projection violates its exact scoped subcontracts"), {
        code: "PROJECTION_VIEWER_CLASS_INVALID",
      });
    }
    return clone(projection);
  }

  async function loadCachedProjection() {
    let record;
    try {
      record = await projectionStore.load(binding.cacheKey);
    } catch (error) {
      return { ok: false, code: String(error?.message || "PROJECTION_CACHE_READ_FAILED") };
    }
    if (!record) return { ok: false, code: "PROJECTION_CACHE_MISS" };
    const { integrityHash, ...core } = record;
    if (record.schemaVersion !== "starcraft_tmg_client_projection_cache_record_v1"
      || record.cacheKey !== binding.cacheKey
      || record.roomId !== binding.roomId
      || record.principalScopeHash !== binding.principalScopeHash
      || integrityHash !== hashStarcraftTmgClientContract(core)) {
      return { ok: false, code: "PROJECTION_CACHE_INTEGRITY_FAILED" };
    }
    try {
      return { ok: true, projection: validateProjection(record.projection) };
    } catch (error) {
      return { ok: false, code: error.code || "PROJECTION_INVALID" };
    }
  }

  async function recoverFromCache(transportCode) {
    const cached = await loadCachedProjection();
    if (!cached.ok) {
      return rejection(cached.code, { transportCode, cacheAccepted: false }, "unavailable");
    }
    const view = publish({
      phase: "offline_read_only",
      roomProjection: cached.projection,
      legalSpace: null,
      pendingPreview: null,
      rejection: {
        schemaVersion: `${STARCRAFT_TMG_CLIENT_DOMAIN_VERSION}.rejection`,
        code: transportCode,
        details: { cacheAccepted: true, mutationAllowed: false },
        occurredAt: now(),
        trainingTruth: false,
      },
      recovery: {
        ...internal.recovery,
        cacheStatus: "integrity_verified",
        source: "viewer_scoped_projection_cache",
      },
    });
    return deepFreeze({ ok: true, outcome: "cached_projection_recovered", offline: true, view });
  }

  function request(operation, payload = {}) {
    return transport.execute({
      operation,
      roomId: binding.roomId,
      seatToken: bindingCredential,
      payload,
    });
  }

  async function rejectAuthentication(code, details = {}) {
    const staleCacheKey = binding?.cacheKey || "";
    if (staleCacheKey) await projectionStore.remove(staleCacheKey).catch(() => {});
    const rejectedCredential = bindingCredential;
    const scrubbedDetails = scrubCredentialMaterial(details, sensitiveValues);
    bindingCredential = "";
    if (rejectedCredential) sensitiveValues.delete(rejectedCredential);
    controlLeaseReference = null;
    if (binding) {
      const principalScopeHash = hashStarcraftTmgClientContract({
        schemaVersion: "starcraft_tmg_client_principal_scope_v1",
        roomId: binding.roomId,
        seatToken: "public",
      });
      binding = {
        ...binding,
        principalScopeHash,
        expectedViewer: null,
        cacheKey: hashStarcraftTmgClientContract({
          schemaVersion: "starcraft_tmg_client_projection_cache_key_v1",
          roomId: binding.roomId,
          principalScopeHash,
        }),
      };
    }
    const record = {
      schemaVersion: `${STARCRAFT_TMG_CLIENT_DOMAIN_VERSION}.rejection`,
      code: String(code || "AUTHENTICATION_REQUIRED"),
      details: { ...scrubbedDetails, credentialCleared: true },
      occurredAt: now(),
      trainingTruth: false,
    };
    const view = publish({
      phase: "authentication_required",
      principalScopeHash: binding?.principalScopeHash || null,
      roomProjection: null,
      legalSpace: null,
      pendingPreview: null,
      control: unclaimedControl("cleared"),
      accessReceipt: null,
      rejection: record,
      recovery: {
        ...internal.recovery,
        cacheStatus: staleCacheKey ? "credential_cache_erased" : "not_checked",
        source: "credential_rejected",
        authoritativeOutcomeUncertain: false,
      },
    });
    return deepFreeze({ ok: false, rejection: record, view });
  }

  async function refreshProjection(reason = "explicit_refresh") {
    if (!binding) return rejection("CLIENT_NOT_BOOTSTRAPPED", {}, "unbound");
    const snapshot = lifecycle.read();
    if (!operationalLifecycle(snapshot)) {
      publish({ lifecycle: snapshot });
      return recoverFromCache(snapshot.online === false ? "NETWORK_UNAVAILABLE" : "CLIENT_BACKGROUND_READ_ONLY");
    }
    publish({ phase: internal.roomProjection ? "recovering" : "loading", lifecycle: snapshot, rejection: null });
    try {
      const result = await request("read_room", { includeJournal: false });
      if (!result?.ok) {
        if (AUTHENTICATION_CODES.has(result?.reason)) {
          return rejectAuthentication(result.reason, { authorityRejected: true });
        }
        return rejection(result?.reason || "PROJECTION_REQUEST_REJECTED", {}, internal.roomProjection ? "ready" : "blocked");
      }
      const projection = validateProjection(result.projection);
      let control = internal.control;
      if (controlLeaseReference) {
        const projectedFence = Number(projection.control?.currentLeaseFence);
        const leaseStillCurrent = projection.control?.ownedByViewer === true
          && Number.isInteger(projectedFence)
          && projectedFence === controlLeaseReference.leaseFence;
        if (!leaseStillCurrent) {
          controlLeaseReference = null;
          control = unclaimedControl("fenced");
        } else {
          control = {
            ...internal.control,
            status: "claimed",
            roomRevision: Number.isInteger(Number(projection.room.roomRevision))
              ? Number(projection.room.roomRevision)
              : internal.control.roomRevision,
          };
        }
      }
      const cacheStatus = await saveProjection(projection);
      const view = publish({
        phase: "ready",
        roomProjection: projection,
        control,
        legalSpace: null,
        pendingPreview: null,
        rejection: null,
        recovery: {
          cacheStatus,
          source: "authoritative_transport",
          authoritativeOutcomeUncertain: false,
          lastSynchronizedAt: now(),
          reason,
        },
      });
      return deepFreeze({ ok: true, outcome: "projection_refreshed", view });
    } catch (error) {
      const code = error instanceof StarcraftTmgClientTransportError ? error.code : String(error?.code || "TRANSPORT_FAILED");
      if (["ACCESS_EXCHANGE_BINDING_INVALID", "PROJECTION_CREDENTIAL_LEAK_REJECTED"].includes(code)) {
        return rejectAuthentication(code, { projectionRejected: true });
      }
      if (RECOVERABLE_TRANSPORT_CODES.has(code)) return recoverFromCache(code);
      return rejection(code, safeErrorDetails(error), internal.roomProjection ? "ready" : "unavailable");
    }
  }

  function ensureOperational(options = {}) {
    if (!binding) return "CLIENT_NOT_BOOTSTRAPPED";
    const snapshot = lifecycle.read();
    if (!operationalLifecycle(snapshot) || internal.phase === "offline_read_only") return "OFFLINE_READ_ONLY";
    if (!internal.roomProjection || internal.phase !== "ready") return "CLIENT_NOT_READY";
    if (options.mutation === true && internal.integrity.replayBlocked === true) {
      return "REPLAY_INTEGRITY_BLOCKED";
    }
    return null;
  }

  function latchReplayIntegrity(reason) {
    if (!internal.roomProjection) return null;
    const observedRevision = currentStateRevision();
    const integrity = {
      schemaVersion: "starcraft_tmg_client_replay_integrity_latch_v1",
      replayBlocked: true,
      reason: String(reason || "REPLAY_RESPONSE_INVALID"),
      blockedAtStateRevision: Number.isSafeInteger(observedRevision)
        && observedRevision >= 0 ? observedRevision : null,
      recoveryPhase: "refresh_required",
      trainingTruth: false,
    };
    const roomId = String(binding?.roomId || internal.roomProjection?.room?.roomId || "");
    if (roomId) {
      const scopeKey = replayIntegrityRegistryKey(roomId, binding?.principalScopeHash);
      if (replayIntegrityByScope.has(scopeKey)) {
        replayIntegrityByScope.set(scopeKey, clone(integrity));
      } else if (replayIntegrityByScope.size < MAX_REPLAY_INTEGRITY_SCOPES) {
        replayIntegrityByScope.set(scopeKey, clone(integrity));
      }
    }
    publish({
      integrity,
      legalSpace: null,
      pendingPreview: null,
    });
    return integrity;
  }

  function currentStateRevision() {
    return Number(internal.roomProjection?.room?.stateRevision);
  }

  function currentRoomRevision() {
    return Number(internal.roomProjection?.room?.roomRevision);
  }

  async function loadLegalSpace() {
    const blocked = ensureOperational();
    if (blocked) return rejection(blocked, { mutationAllowed: false });
    try {
      const result = await request("read_legal_space");
      if (!result?.ok) {
        if (AUTHENTICATION_CODES.has(result?.reason)) return rejectAuthentication(result.reason, { operation: "read_legal_space" });
        return rejection(result?.reason || "LEGAL_SPACE_REQUEST_REJECTED");
      }
      const legalSpace = result.legalSpace;
      if (!object(legalSpace)
        || Number(legalSpace.stateRevision) !== currentStateRevision()) {
        await refreshProjection("legal_space_revision_mismatch");
        return rejection("LEGAL_SPACE_STALE", { refreshed: true });
      }
      if (!validLegalSpaceResponse(
        legalSpace,
        internal.roomProjection,
        binding.roomId,
      )) return rejection("LEGAL_SPACE_RESPONSE_INVALID");
      const view = publish({ legalSpace: clone(legalSpace), pendingPreview: null, rejection: null });
      return deepFreeze({ ok: true, outcome: "legal_space_loaded", view });
    } catch (error) {
      return handleTransportFailure(error, "read_legal_space");
    }
  }

  function proposalFromIntent(intent) {
    if (!internal.legalSpace) throw Object.assign(new Error("current LegalSpace must be loaded"), { code: "LEGAL_SPACE_REQUIRED" });
    if (Number(internal.legalSpace.stateRevision) !== currentStateRevision()) {
      throw Object.assign(new Error("current LegalSpace revision is stale"), { code: "LEGAL_SPACE_STALE" });
    }
    if (intent.type === "preview_finite") {
      const enabled = internal.legalSpace.finiteActions.some((entry) => entry.actionKey === intent.actionKey);
      if (!enabled) throw Object.assign(new Error("finite action is not in current LegalSpace"), { code: "UNCHECKED_ACTION_REJECTED" });
      return { kind: "finite", actionKey: intent.actionKey };
    }
    const enabled = internal.legalSpace.parameterDomains.some((entry) => entry.domainId === intent.domainId);
    if (!enabled) throw Object.assign(new Error("parameter domain is not in current LegalSpace"), { code: "UNCHECKED_ACTION_REJECTED" });
    return { kind: "parameterized", domainId: intent.domainId, parameters: clone(intent.parameters) };
  }

  async function previewIntent(intent) {
    const blocked = ensureOperational({ mutation: true });
    if (blocked) return rejection(blocked, { mutationAllowed: false });
    let proposal;
    try {
      proposal = proposalFromIntent(intent);
    } catch (error) {
      return rejection(error.code || "CLIENT_INPUT_INVALID");
    }
    try {
      const result = await request("preview_action", { proposal });
      if (!result?.ok) {
        if (AUTHENTICATION_CODES.has(result?.reason)) return rejectAuthentication(result.reason, { operation: "preview_action" });
        if (["LEGAL_SPACE_STALE", "REVISION_CONFLICT"].includes(result?.reason)) await refreshProjection("preview_revision_rejected");
        return rejection(result?.reason || "PREVIEW_REJECTED");
      }
      const preview = result.preview;
      if (!object(preview)
        || Number(preview.core?.expectedStateRevision) !== currentStateRevision()
        || preview.core?.legalSpaceHash !== internal.legalSpace.legalSpaceHash) {
        await refreshProjection("preview_response_revision_mismatch");
        return rejection("LEGAL_SPACE_STALE", { refreshed: true });
      }
      if (!validPreviewResponse(
        preview,
        proposal,
        internal.legalSpace,
        internal.roomProjection,
        binding.roomId,
      )) return rejection("PREVIEW_RESPONSE_INVALID");
      const view = publish({ pendingPreview: clone(preview), rejection: null });
      return deepFreeze({ ok: true, outcome: "preview_ready_for_human_confirmation", confirmationRequired: true, view });
    } catch (error) {
      return handleTransportFailure(error, "preview_action");
    }
  }

  async function obtainControlLease({ force = false, refreshAfterClaim = false } = {}) {
    const blocked = ensureOperational({ mutation: true });
    if (blocked) return rejection(blocked, { mutationAllowed: false });
    if (!force && controlLeaseReference) {
      return success("control_lease_available", { control: clone(internal.control), reusedPrivateReference: true });
    }
    try {
      const result = await request("claim_control", { sessionId: clientSessionId });
      if (!result?.ok) {
        if (AUTHENTICATION_CODES.has(result?.reason)) return rejectAuthentication(result.reason, { operation: "claim_control" });
        if (["REVISION_CONFLICT", "CONTROL_LEASE_FENCED"].includes(result?.reason)) {
          controlLeaseReference = null;
          publish({ control: unclaimedControl("fenced") });
          await refreshProjection("control_claim_rejected");
        }
        return rejection(result?.reason || "CONTROL_LEASE_REJECTED");
      }
      const lease = result.controlLease;
      const leaseId = String(lease?.leaseId || "").trim();
      if (!object(lease) || !leaseId
        || !Number.isInteger(Number(lease.leaseFence)) || Number(lease.leaseFence) < 1) {
        controlLeaseReference = null;
        return rejection("CONTROL_LEASE_RESPONSE_INVALID");
      }
      controlLeaseReference = {
        leaseId,
        leaseFence: Number(lease.leaseFence),
      };
      const control = claimedControl(result, now());
      publish({ control, rejection: null });
      if (refreshAfterClaim) {
        const refreshed = await refreshProjection("control_claimed");
        if (!refreshed.ok) return refreshed;
        if (internal.control.status !== "claimed") {
          return rejection("CONTROL_LEASE_FENCED", { refreshed: true });
        }
      }
      return success("control_claimed", { control: clone(internal.control), reusedPrivateReference: false });
    } catch (error) {
      return handleTransportFailure(error, "claim_control");
    }
  }

  function accessCredentialFromResult(result, kind) {
    const artifact = kind === "invite" ? result?.invite : result?.recovery;
    const tokenField = kind === "invite" ? "inviteToken" : "recoveryToken";
    const idField = kind === "invite" ? "inviteId" : "recoveryTicketId";
    const token = accessToken(artifact?.[tokenField], `${kind}.${tokenField}`);
    const id = nonEmpty(artifact?.[idField], `${kind}.${idField}`);
    return {
      artifact: {
        schemaVersion: "starcraft_tmg_client_access_artifact_summary_v1",
        kind,
        id,
        expiresAtAudit: String(artifact?.expiresAtAudit || ""),
        trainingTruth: false,
      },
      credential: {
        schemaVersion: "starcraft_tmg_client_ephemeral_access_credential_v1",
        kind,
        token,
        ephemeral: true,
        persistenceAllowed: false,
        trainingTruth: false,
      },
    };
  }

  async function issueAccess(kind) {
    const blocked = ensureOperational({ mutation: true });
    if (blocked) return rejection(blocked, { mutationAllowed: false });
    const operation = kind === "invite" ? "issue_invite" : "issue_recovery";
    let ephemeralToken = "";
    try {
      let result = await request(operation, { expectedRoomRevision: currentRoomRevision() });
      if (result?.reason === "REVISION_CONFLICT") {
        const refreshed = await refreshProjection(`${operation}_revision_rejected`);
        if (!refreshed.ok) return refreshed;
        result = await request(operation, { expectedRoomRevision: currentRoomRevision() });
      }
      if (!result?.ok) {
        if (AUTHENTICATION_CODES.has(result?.reason)) return rejectAuthentication(result.reason, { operation });
        return rejection(result?.reason || "ACCESS_ISSUE_REJECTED", { kind });
      }
      let issued;
      try {
        issued = accessCredentialFromResult(result, kind);
      } catch {
        return rejection("ACCESS_ISSUE_RESPONSE_INVALID", { kind });
      }
      ephemeralToken = issued.credential.token;
      sensitiveValues.add(ephemeralToken);
      const authorityOperation = kind === "invite" ? "issue_invite" : "issue_seat_recovery";
      if (!structurallyValidAuthorityAccessReceipt(result.receipt, {
        kind,
        operation: authorityOperation,
        roomId: binding.roomId,
        matchBinding: internal.roomProjection?.matchBinding,
      })) {
        return rejection("ACCESS_RECEIPT_INVALID", { kind });
      }
      const expectedDigest = roomBoundTokenDigest(
        binding.roomId,
        issued.credential.token,
        kind === "invite" ? "invite" : "seat_recovery",
      );
      const projectedRoom = internal.roomProjection?.room || {};
      const projectedViewer = internal.roomProjection?.viewer || {};
      const preRevisions = result.receipt.preRevisions || {};
      const postRevisions = result.receipt.postRevisions || {};
      if (result.receipt.subjectId !== issued.artifact.id
        || result.receipt.tokenDigest !== expectedDigest
        || result.receipt.status !== "active"
        || result.receipt.actorGrantId !== projectedViewer.grantId
        || !String(result.receipt.seatKey || "").trim()
        || (kind === "recovery" && result.receipt.seatKey !== projectedViewer.seatKey)
        || result.receipt.expiresAtAudit !== issued.artifact.expiresAtAudit
        || Number(preRevisions.roomRevision) !== Number(projectedRoom.roomRevision)
        || Number(preRevisions.stateRevision) !== Number(projectedRoom.stateRevision)
        || Number(preRevisions.seatRecoveryRevision) !== Number(projectedRoom.seatRecoveryRevision)
        || Number(postRevisions.roomRevision) !== Number(preRevisions.roomRevision) + 1
        || Number(postRevisions.stateRevision) !== Number(preRevisions.stateRevision)
        || Number(postRevisions.seatRecoveryRevision) !== Number(preRevisions.seatRecoveryRevision) + 1) {
        return rejection("ACCESS_RECEIPT_INVALID", { kind, capabilityBindingMismatch: true });
      }
      const receipt = accessReceiptReference(result.receipt, kind);
      publish({ accessReceipt: receipt, rejection: null });
      await refreshProjection(`${operation}_accepted`);
      return deepFreeze({
        ok: true,
        outcome: `${kind}_issued`,
        access: issued.artifact,
        credential: issued.credential,
        receipt,
        view: read(),
      });
    } catch (error) {
      return handleTransportFailure(error, operation);
    } finally {
      if (ephemeralToken && ephemeralToken !== bindingCredential) {
        sensitiveValues.delete(ephemeralToken);
      }
    }
  }

  async function confirmAndApply(intent) {
    const blocked = ensureOperational({ mutation: true });
    if (blocked) return rejection(blocked, { mutationAllowed: false });
    if (!internal.pendingPreview || internal.pendingPreview.previewId !== intent.previewId) {
      return rejection("PREVIEW_NOT_CURRENT", { previewId: intent.previewId });
    }
    const expectedStateRevision = currentStateRevision();
    const attempt = {
      previewId: intent.previewId,
      previewToken: internal.pendingPreview.previewToken,
      previewContentHash: internal.pendingPreview.previewSeal.contentHash,
      expectedStateRevision,
      idempotencyKey: createId("sc-client-apply"),
    };
    try {
      const confirmed = await request("confirm_preview", {
        previewId: attempt.previewId,
        previewToken: attempt.previewToken,
        previewContentHash: attempt.previewContentHash,
      });
      if (!confirmed?.ok) {
        if (AUTHENTICATION_CODES.has(confirmed?.reason)) return rejectAuthentication(confirmed.reason, { operation: "confirm_preview" });
        if (["REVISION_CONFLICT", "LEGAL_SPACE_STALE", "PREVIEW_NOT_FOUND", "PREVIEW_BINDING_MISMATCH"].includes(confirmed?.reason)) {
          const refreshed = await refreshProjection("confirmation_revision_rejected");
          if (!refreshed.ok) return refreshed;
        }
        return rejection(confirmed?.reason || "CONFIRMATION_REJECTED");
      }
      const control = await obtainControlLease({ force: false, refreshAfterClaim: false });
      if (!control?.ok) {
        return control;
      }
      publish({ phase: "applying", rejection: null });
      const applied = await request("apply_action", {
        previewId: attempt.previewId,
        confirmationId: confirmed.confirmation?.confirmationId,
        leaseId: controlLeaseReference?.leaseId,
        leaseFence: controlLeaseReference?.leaseFence,
        expectedStateRevision,
        idempotencyKey: attempt.idempotencyKey,
      });
      if (!applied?.ok) {
        if (AUTHENTICATION_CODES.has(applied?.reason)) return rejectAuthentication(applied.reason, { operation: "apply_action" });
        if (["REVISION_CONFLICT", "LEGAL_SPACE_STALE", "CONTROL_LEASE_FENCED"].includes(applied?.reason)) {
          if (applied.reason === "CONTROL_LEASE_FENCED") {
            controlLeaseReference = null;
            publish({ control: unclaimedControl("fenced") });
          }
          await refreshProjection("apply_revision_rejected");
        } else publish({ phase: "ready" });
        return rejection(applied?.reason || "APPLY_REJECTED");
      }
      if (!validApplyResponseBeforeRefresh(applied, {
        projection: internal.roomProjection,
        pendingPreview: internal.pendingPreview,
        controlLease: controlLeaseReference,
        idempotencyKey: attempt.idempotencyKey,
      })) {
        await refreshProjection("invalid_apply_response_recovery");
        return rejection("RECEIPT_RESPONSE_INVALID", { authoritativeOutcomeUncertain: true }, "recovering");
      }
      const refreshed = await refreshProjection("accepted_receipt");
      if (!refreshed.ok) return refreshed;
      if (!applyResponseMatchesRefreshedProjection(applied, internal.roomProjection)) {
        return rejection("RECEIPT_RESPONSE_INVALID", {
          authoritativeOutcomeUncertain: true,
          postApplyProjectionMismatch: true,
        }, "recovering");
      }
      const reference = receiptReference(applied.receipt);
      const view = publish({ lastReceipt: reference, pendingPreview: null, rejection: null });
      return deepFreeze({ ok: true, outcome: "authoritative_receipt_applied", receipt: reference, view });
    } catch (error) {
      publish({
        phase: "recovering",
        recovery: { ...internal.recovery, authoritativeOutcomeUncertain: true, source: "operation_interrupted" },
      });
      return handleTransportFailure(error, "confirm_and_apply_preview", true);
    }
  }

  async function readReplay() {
    const blocked = ensureOperational();
    if (blocked) {
      if (internal.roomProjection) latchReplayIntegrity(blocked);
      return rejection(blocked, { mutationAllowed: false, integrityBlocked: Boolean(internal.roomProjection) });
    }
    try {
      const result = await request("read_replay");
      if (!result?.ok || result.matchesCurrent !== true) {
        const code = result?.reason || "REPLAY_MISMATCH";
        latchReplayIntegrity(code);
        return rejection(code, { integrityBlocked: true });
      }
      if (!validReplayResponse(
        result,
        internal.roomProjection,
        binding.roomId,
      )) {
        latchReplayIntegrity("REPLAY_RESPONSE_INVALID");
        return rejection("REPLAY_RESPONSE_INVALID", { integrityBlocked: true });
      }
      const replay = replayReference(result);
      const view = publish({ replay, rejection: null });
      return deepFreeze({ ok: true, outcome: "replay_verified", replay, view });
    } catch (error) {
      const failed = await handleTransportFailure(error, "read_replay");
      if (internal.roomProjection) {
        latchReplayIntegrity(
          failed.rejection?.code || String(error?.code || "REPLAY_TRANSPORT_FAILED"),
        );
      }
      return failed;
    }
  }

  async function revalidateAuthority() {
    const blocked = ensureOperational();
    if (blocked) return rejection(blocked, { mutationAllowed: false });
    const refreshed = await refreshProjection("replay_integrity_revalidation");
    if (!refreshed.ok) {
      latchReplayIntegrity(refreshed.rejection?.code || "AUTHORITY_REFRESH_FAILED");
      return refreshed;
    }
    if (internal.integrity.replayBlocked === true) {
      publish({
        integrity: {
          ...internal.integrity,
          recoveryPhase: "replay_required",
        },
      });
    }
    try {
      const result = await request("read_replay");
      if (!result?.ok || result.matchesCurrent !== true || !validReplayResponse(
        result,
        internal.roomProjection,
        binding.roomId,
      )) {
        const code = result?.reason || (result?.matchesCurrent === false
          ? "REPLAY_MISMATCH" : "REPLAY_RESPONSE_INVALID");
        latchReplayIntegrity(code);
        return rejection(code, { integrityBlocked: true, revalidationFailed: true });
      }
      const replay = replayReference(result);
      const integrity = {
        schemaVersion: "starcraft_tmg_client_replay_integrity_latch_v1",
        replayBlocked: false,
        reason: null,
        blockedAtStateRevision: null,
        recoveryPhase: "clear",
        trainingTruth: false,
      };
      replayIntegrityByScope.delete(replayIntegrityRegistryKey(
        binding.roomId,
        binding.principalScopeHash,
      ));
      const view = publish({ integrity, replay, rejection: null });
      return deepFreeze({
        ok: true,
        outcome: "authority_revalidated",
        replay,
        view,
      });
    } catch (error) {
      const failed = await handleTransportFailure(error, "revalidate_authority");
      latchReplayIntegrity(failed.rejection?.code || "TRANSPORT_FAILED");
      return failed;
    }
  }

  async function handleTransportFailure(error, operation, outcomeUncertain = false) {
    const code = error instanceof StarcraftTmgClientTransportError ? error.code : String(error?.code || "TRANSPORT_FAILED");
    if (AUTHENTICATION_CODES.has(code)) {
      return rejectAuthentication(code, { operation, ...safeErrorDetails(error, sensitiveValues) });
    }
    if (RECOVERABLE_TRANSPORT_CODES.has(code)) {
      const cached = await recoverFromCache(code);
      if (outcomeUncertain) {
        publish({ recovery: { ...internal.recovery, authoritativeOutcomeUncertain: true, interruptedOperation: operation } });
      }
      return cached.ok ? deepFreeze({ ...cached, operation }) : cached;
    }
    return rejection(code, { operation, ...safeErrorDetails(error, sensitiveValues) });
  }

  async function performDispatch(intentInput) {
    let intent;
    try {
      intent = validateIntent(intentInput);
    } catch (error) {
      return rejection(error.code || "CLIENT_INPUT_INVALID", safeErrorDetails(error));
    }
    if (intent.type === "refresh") return refreshProjection("explicit_dispatch");
    if (intent.type === "revalidate_authority") return revalidateAuthority();
    if (intent.type === "load_legal_space") return loadLegalSpace();
    if (intent.type === "preview_finite" || intent.type === "preview_parameterized") return previewIntent(intent);
    if (intent.type === "confirm_and_apply_preview") return confirmAndApply(intent);
    if (intent.type === "claim_control") return obtainControlLease({ force: true, refreshAfterClaim: true });
    if (intent.type === "issue_invite") return issueAccess("invite");
    if (intent.type === "issue_recovery") return issueAccess("recovery");
    return readReplay();
  }

  function enqueue(operation) {
    const run = operationQueue.then(operation, operation);
    operationQueue = run.catch(() => {});
    return run;
  }

  function dispatch(intent) {
    return enqueue(() => performDispatch(intent));
  }

  function subscribe(listener) {
    if (typeof listener !== "function") throw new TypeError("Client Domain listener must be a function");
    listeners.add(listener);
    listener(read());
    return () => listeners.delete(listener);
  }

  function bindLifecycle() {
    if (lifecycleUnsubscribe) lifecycleUnsubscribe();
    lifecycleUnsubscribe = lifecycle.subscribe((snapshot) => {
      const wasOperational = operationalLifecycle(internal.lifecycle);
      const isOperational = operationalLifecycle(snapshot);
      publish({
        lifecycle: snapshot,
        ...(isOperational ? {} : {
          phase: internal.roomProjection ? "offline_read_only" : "unavailable",
          legalSpace: null,
          pendingPreview: null,
        }),
      });
      if (!wasOperational && isOperational && binding) {
        void enqueue(() => refreshProjection("lifecycle_resumed"));
      }
    });
  }

  async function exchangeBootstrapAccess(roomId, access) {
    const operation = access.kind === "invite" ? "exchange_invite" : "exchange_recovery";
    const tokenField = access.kind === "invite" ? "inviteToken" : "recoveryToken";
    const accessAlreadyTracked = sensitiveValues.has(access.token);
    let exchangedSeatToken = "";
    sensitiveValues.add(access.token);
    try {
      const result = await transport.execute({
        operation,
        roomId,
        seatToken: "",
        payload: { [tokenField]: access.token },
      });
      if (!result?.ok) {
        return { ok: false, reason: result?.reason || "ACCESS_EXCHANGE_REJECTED" };
      }
      const seatToken = String(result.credential?.seatToken || "").trim();
      if (!hasExactKeys(result.credential, ["grantId", "seatKey", "roleMode", "seatToken"])
        || !ACCESS_TOKEN_PATTERN.test(seatToken)
        || !String(result.credential?.grantId || "").trim()
        || !String(result.credential?.seatKey || "").trim()
        || !String(result.credential?.roleMode || "").trim()) {
        return { ok: false, reason: "ACCESS_EXCHANGE_RESPONSE_INVALID" };
      }
      exchangedSeatToken = seatToken;
      const authorityOperation = access.kind === "invite" ? "exchange_invite" : "recover_seat";
      if (!structurallyValidAuthorityAccessReceipt(result.receipt, {
        kind: access.kind,
        operation: authorityOperation,
        roomId,
      })) {
        return { ok: false, reason: "ACCESS_EXCHANGE_RECEIPT_INVALID" };
      }
      const expectedAccessDigest = roomBoundTokenDigest(
        roomId,
        access.token,
        access.kind === "invite" ? "invite" : "seat_recovery",
      );
      const expectedSeatTokenDigest = roomBoundTokenDigest(roomId, seatToken, "seat_grant");
      if (result.receipt.tokenDigest !== expectedAccessDigest
        || result.receipt.issuedSeatTokenDigest !== expectedSeatTokenDigest
        || result.receipt.status !== "used"
        || !String(result.receipt.subjectId || "").trim()
        || result.credential?.grantId !== result.receipt.issuedGrantId
        || result.credential?.seatKey !== result.receipt.seatKey
        || result.credential?.roleMode !== result.receipt.issuedRoleMode) {
        return { ok: false, reason: "ACCESS_EXCHANGE_BINDING_INVALID" };
      }
      sensitiveValues.add(seatToken);
      return {
        ok: true,
        seatToken,
        accessReceipt: accessReceiptReference(result.receipt, access.kind),
        expectedViewer: {
          grantId: result.credential.grantId,
          seatKey: result.credential.seatKey,
          roleMode: result.credential.roleMode,
          grantRecoveryRevision: result.receipt.postRevisions.seatRecoveryRevision,
          matchBindingHash: result.receipt.matchBindingHash,
          refereeKeyId: result.receipt.refereeKeyId,
          refereePublicKeyFingerprint: result.receipt.refereePublicKeyFingerprint,
        },
      };
    } finally {
      if (!accessAlreadyTracked
        && access.token !== bindingCredential
        && access.token !== exchangedSeatToken) {
        sensitiveValues.delete(access.token);
      }
    }
  }

  async function performBootstrap(input) {
    let normalized;
    try {
      normalized = validateBootstrap(input);
    } catch (error) {
      return rejection(error.code || "CLIENT_INPUT_INVALID", safeErrorDetails(error, sensitiveValues), internal.phase);
    }
    if (bindingCredential && !normalized.seatToken && !normalized.access) {
      return rejection(
        "CLIENT_PRINCIPAL_DOWNGRADE_REQUIRES_EXPLICIT_CLEAR",
        { requestedRoomId: normalized.roomId },
        internal.phase,
      );
    }
    let seatToken = normalized.seatToken;
    let bootstrapAccessReceipt = null;
    let expectedViewer = null;
    if (normalized.access
      && replayIntegrityByScope.size >= MAX_REPLAY_INTEGRITY_SCOPES) {
      return rejection("REPLAY_INTEGRITY_REGISTRY_SATURATED", {
        blockedScopeCount: replayIntegrityByScope.size,
        requestedRoomId: normalized.roomId,
        accessKind: normalized.access.kind,
        accessExchangeAttempted: false,
        mutationAllowed: false,
      }, internal.phase);
    }
    if (normalized.access) {
      if (!binding) {
        publish({
          phase: "exchanging_access",
          locator: { roomId: normalized.roomId },
          surface: normalized.surface,
          locale: normalized.locale,
          rejection: null,
        });
      }
      try {
        const exchanged = await exchangeBootstrapAccess(normalized.roomId, normalized.access);
        if (!exchanged.ok) {
          return rejection(
            exchanged.reason,
            { kind: normalized.access.kind },
            binding ? internal.phase : "blocked",
          );
        }
        seatToken = exchanged.seatToken;
        bootstrapAccessReceipt = exchanged.accessReceipt;
        expectedViewer = exchanged.expectedViewer;
      } catch (error) {
        const code = error instanceof StarcraftTmgClientTransportError
          ? error.code
          : String(error?.code || "TRANSPORT_FAILED");
        return rejection(
          code,
          { operation: `exchange_${normalized.access.kind}`, ...safeErrorDetails(error, sensitiveValues) },
          binding
            ? internal.phase
            : RECOVERABLE_TRANSPORT_CODES.has(code) ? "unavailable" : "blocked",
        );
      }
    }
    if (seatToken) sensitiveValues.add(seatToken);
    const principalScopeHash = hashStarcraftTmgClientContract({
      schemaVersion: "starcraft_tmg_client_principal_scope_v1",
      roomId: normalized.roomId,
      seatToken: seatToken || "public",
    });
    const cacheKey = hashStarcraftTmgClientContract({
      schemaVersion: "starcraft_tmg_client_projection_cache_key_v1",
      roomId: normalized.roomId,
      principalScopeHash,
    });
    const integrityScopeKey = replayIntegrityRegistryKey(normalized.roomId, principalScopeHash);
    const currentIntegrityScopeKey = binding
      ? replayIntegrityRegistryKey(binding.roomId, binding.principalScopeHash)
      : null;
    if (integrityScopeKey !== currentIntegrityScopeKey
      && !replayIntegrityByScope.has(integrityScopeKey)
      && replayIntegrityByScope.size >= MAX_REPLAY_INTEGRITY_SCOPES) {
      if (seatToken && seatToken !== bindingCredential) sensitiveValues.delete(seatToken);
      return rejection("REPLAY_INTEGRITY_REGISTRY_SATURATED", {
        blockedScopeCount: replayIntegrityByScope.size,
        requestedRoomId: normalized.roomId,
        mutationAllowed: false,
      }, internal.phase);
    }
    binding = {
      roomId: normalized.roomId,
      surface: normalized.surface,
      locale: normalized.locale,
      principalScopeHash,
      cacheKey,
      expectedViewer,
    };
    const previousBindingCredential = bindingCredential;
    bindingCredential = seatToken;
    if (previousBindingCredential && previousBindingCredential !== seatToken) {
      sensitiveValues.delete(previousBindingCredential);
    }
    controlLeaseReference = null;
    const restoredIntegrity = clone(replayIntegrityByScope.get(integrityScopeKey) || {
      schemaVersion: "starcraft_tmg_client_replay_integrity_latch_v1",
      replayBlocked: false,
      reason: null,
      blockedAtStateRevision: null,
      recoveryPhase: "clear",
      trainingTruth: false,
    });
    internal = {
      clientRevision: internal.clientRevision,
      phase: "binding",
      locator: { roomId: normalized.roomId },
      principalScopeHash,
      surface: normalized.surface,
      locale: normalized.locale,
      lifecycle: clone(lifecycle.read()),
      roomProjection: null,
      legalSpace: null,
      pendingPreview: null,
      lastReceipt: null,
      replay: null,
      control: unclaimedControl(),
      accessReceipt: bootstrapAccessReceipt,
      integrity: restoredIntegrity,
      rejection: null,
      recovery: {
        cacheStatus: "not_checked",
        source: "none",
        authoritativeOutcomeUncertain: false,
        lastSynchronizedAt: null,
      },
      trainingTruth: false,
    };
    publish();
    bindLifecycle();
    return refreshProjection("bootstrap");
  }

  function bootstrap(input) {
    return enqueue(() => performBootstrap(input));
  }

  currentView = buildView();
  return Object.freeze({ bootstrap, read, dispatch, subscribe });
}
