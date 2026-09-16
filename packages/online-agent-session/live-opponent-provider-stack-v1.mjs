import { mkdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import {
  STARCRAFT_TMG_TICKET_23_LIVE_PROVIDER_PROFILES_V1,
} from "../../content/provider/ticket-23-live-provider-profiles-v1.mjs";
import { createKerriganPrimalProductBundleV1 } from
  "../../content/characters/kerrigan-primal-v1.mjs";
import { hashStarcraftTmgContract } from
  "../authoritative-engine/transition-v1.mjs";
import { createStarcraftTmgSecureProviderAttachmentControlV1,
  STARCRAFT_TMG_PROVIDER_DISCLOSURE_NOTICE_VERSION } from
  "../secure-provider-runtime/credential-attachment-control-v1.mjs";
import { createStarcraftTmgDeepSeekModelAvailabilityPortV1 } from
  "../secure-provider-runtime/deepseek-model-availability-port-v1.mjs";
import { createStarcraftTmgDurableProviderGatewayRuntimeV1 } from
  "../secure-provider-runtime/durable-provider-gateway-runtime-v1.mjs";
import { createStarcraftTmgProviderGatewayExecutionScopeV1 } from
  "../secure-provider-runtime/provider-gateway-execution-scope-v1.mjs";
import {
  readStarcraftTmgDeepSeekCredentialFromKeychainV1,
} from "../secure-provider-runtime/keychain-credential-ingress-v1.mjs";
import { createSqliteStarcraftTmgProviderAttemptStoreV1 } from
  "../secure-provider-runtime/sqlite-provider-attempt-store-v1.mjs";
import { createStarcraftTmgProviderEgressWorkerPortV1 } from
  "../secure-provider-runtime/provider-egress-worker-port-v1.mjs";
import { createStarcraftTmgProviderProfileRegistryV1 } from
  "../secure-provider-runtime/provider-profile-registry-v1.mjs";
import { createInMemoryStarcraftTmgPromptArtifactStoreV1 } from
  "./prompt-artifact-store-v1.mjs";
import { createStarcraftTmgProviderGatewaySupervisorV1 } from
  "./provider-gateway-supervisor-v1.mjs";
import {
  createStarcraftTmgOnlineAgentSessionLifecycleV1,
  createStarcraftTmgOnlinePrincipalBindingV1,
} from "./session-lifecycle-v1.mjs";
import { createSqliteStarcraftTmgLiveDecisionStoreV1 } from
  "./sqlite-live-decision-store-v1.mjs";
import { createStarcraftTmgLiveFlashDecisionPortV1 } from
  "./live-flash-decision-port-v1.mjs";

export const STARCRAFT_TMG_LIVE_OPPONENT_PROVIDER_STACK_VERSION =
  "starcraft_tmg_live_opponent_provider_stack_v1";

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function required(value, field) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new TypeError(`${field} is required`);
  return normalized;
}

function profileRef(profile) {
  return freeze({
    id: profile.providerProfileId,
    version: profile.version,
    hash: profile.integrity.hash,
  });
}

function onlineRoomBinding(binding) {
  return {
    schemaVersion: binding.schemaVersion,
    rulesVersion: binding.rulesVersion,
    dataVersion: binding.dataVersion,
    matchBindingHash: binding.bindingHash,
    sourceSnapshotHash: binding.sourceSnapshotHash,
    dataSnapshotHash: binding.dataSnapshotHash,
    rulesArtifactHash: binding.rulesArtifactHash,
    executorArtifactHash: binding.executorArtifactHash,
    geometryArtifactHash: binding.geometryArtifactHash,
    actionSchemaHash: binding.actionSchemaHash,
  };
}

function routedStrategySnapshot(entries, ownFaction, opponentFaction) {
  const routed = entries.filter((entry) => entry.role === "general"
    || (entry.role === "faction"
      && entry.factionRecordKey === ownFaction)
    || (entry.role === "matchup"
      && entry.ownFaction === ownFaction
      && entry.opponentFaction === opponentFaction));
  if (routed.length !== 3
    || routed.filter((entry) => entry.role === "general").length !== 1
    || routed.filter((entry) => entry.role === "faction").length !== 1
    || routed.filter((entry) => entry.role === "matchup").length !== 1) {
    throw new TypeError("live opponent requires general, faction and directed matchup Skills");
  }
  const body = {
    schemaVersion:
      `${STARCRAFT_TMG_LIVE_OPPONENT_PROVIDER_STACK_VERSION}.strategy-snapshot`,
    gameId: "starcraft-tmg",
    ownFaction,
    opponentFaction,
    skillRefs: routed.map((entry) => ({
      skillId: entry.skill.skillId,
      version: entry.skill.version,
      hash: entry.skill.hash,
      role: entry.role,
    })),
    skills: routed.map((entry) => clone(entry.skill)),
    frozenForMatch: true,
    skillsMayOverrideRules: false,
    trainingTruth: false,
  };
  return freeze({ ...body,
    skillSetHash: hashStarcraftTmgContract(body) });
}

export async function createStarcraftTmgLiveOpponentProviderStackV1(
  options = {},
) {
  const roomId = required(options.roomId, "roomId");
  const seatKey = required(options.seatKey, "seatKey");
  const matchBinding = options.matchBinding;
  const spatialQueryPort = options.spatialQueryPort;
  const memoryQueryPort = options.memoryQueryPort || null;
  const strategyEntries = Array.isArray(options.strategyEntries)
    ? options.strategyEntries : [];
  const ownFaction = required(options.ownFaction, "ownFaction");
  const opponentFaction = required(options.opponentFaction, "opponentFaction");
  const dataDirectory = path.resolve(required(options.dataDirectory,
    "dataDirectory"));
  const now = typeof options.now === "function"
    ? options.now : () => new Date().toISOString();
  if (!matchBinding?.bindingHash
    || typeof spatialQueryPort?.query !== "function") {
    throw new TypeError("matchBinding and spatialQueryPort.query are required");
  }
  await mkdir(dataDirectory, { recursive: true, mode: 0o700 });

  const profiles = options.providerProfiles
    || STARCRAFT_TMG_TICKET_23_LIVE_PROVIDER_PROFILES_V1;
  const bundle = options.characterBundle || createKerriganPrimalProductBundleV1();
  const strategySkillSnapshot = routedStrategySnapshot(strategyEntries,
    ownFaction, opponentFaction);
  const principalSessionRef = `live-opponent-principal-${randomUUID()}`;
  const principalScopeHash = hashStarcraftTmgContract({
    roomId, seatKey, principalSessionRef,
  });
  const principalBinding = createStarcraftTmgOnlinePrincipalBindingV1({
    roomId,
    principalScopeHash,
    seatKey,
    principalType: "model",
    principalRoleMode: "player",
    bindingRevision: 1,
    allowedAgentModes: ["opponent"],
    characterId: bundle.characterPackage.characterId,
    characterPackageHash: bundle.characterPackage.integrity.hash,
    characterSelectionHash: hashStarcraftTmgContract({
      roomId, seatKey, characterId: bundle.characterPackage.characterId,
    }),
    roomBinding: onlineRoomBinding(matchBinding),
  });
  const lifecycle = createStarcraftTmgOnlineAgentSessionLifecycleV1({
    principalAuthority: {
      async resolve(input) {
        return input.roomId === roomId
          && input.principalSessionRef === principalSessionRef
          ? { ok: true, binding: principalBinding }
          : { ok: false, reason: "principal_not_authenticated" };
      },
    },
    characterCatalog: {
      async resolve(input) {
        return input.characterId === bundle.characterPackage.characterId
          ? { ok: true, characterPackage: bundle.characterPackage }
          : { ok: false, reason: "character_not_found" };
      },
    },
    now,
  });
  const context = freeze({ principalSessionRef });
  const created = await lifecycle.createSession({
    roomId,
    mode: "opponent",
    characterId: bundle.characterPackage.characterId,
  }, context);
  if (created?.ok !== true) {
    throw new Error(created?.reason || "LIVE_OPPONENT_SESSION_CREATE_FAILED");
  }
  const session = created.session;
  const registry = createStarcraftTmgProviderProfileRegistryV1({
    entries: profiles.map((providerProfile) => ({
      providerProfile,
      // DeepSeek strict Function Calling is exposed on the official beta
      // compatibility route. The frozen model/profile identity remains the
      // same; every physical attempt records the exact compiled egress path.
      completionPath: "/beta/chat/completions",
    })),
    allowedProviders: ["deepseek-openai-compatible-direct"],
  });
  const workerPort = createStarcraftTmgProviderEgressWorkerPortV1({
    providerProfileRegistry: registry,
    maxWorkers: 1,
    maxOutputBytes: 1024 * 1024,
    handshakeTimeoutMs: 5_000,
    shutdownGraceMs: 1_000,
    now,
  });
  const attemptStore = createSqliteStarcraftTmgProviderAttemptStoreV1({
    filename: path.join(dataDirectory, "provider-attempts.sqlite"),
  });
  const promptArtifactStore = createInMemoryStarcraftTmgPromptArtifactStoreV1({
    maxArtifacts: 8,
    maxArtifactBytes: 8 * 1024 * 1024,
  });
  let supervisorCore;
  const executionScope = createStarcraftTmgProviderGatewayExecutionScopeV1({
    sessionLifecycle: lifecycle,
    readProviderState: (...args) => supervisorCore.readState(...args),
  });
  const attachmentControl = createStarcraftTmgSecureProviderAttachmentControlV1({
    sessionLifecycle: lifecycle,
    providerSupervisor: {
      readState: (...args) => supervisorCore.readState(...args),
    },
    providerProfileRegistry: registry,
    credentialAttachmentPort: workerPort,
    maxAttachmentRecords: 4,
    attachmentTtlMs: Number(options.attachmentTtlMs || 12 * 60 * 60_000),
    now,
  });
  const durableGateway = createStarcraftTmgDurableProviderGatewayRuntimeV1({
    attemptStore,
    promptArtifactStore,
    attachmentControl,
    workerPort,
    executionAuthorityPort: executionScope,
    now,
  });
  supervisorCore = createStarcraftTmgProviderGatewaySupervisorV1({
    sessionLifecycle: lifecycle,
    providerGateway: durableGateway,
    gatewayEvidence: "live_durable_isolated_provider_worker",
    budgetPolicy: {
      maxTotalUnits: Number(options.maxTotalUnits || 50_000_000),
      maxTurns: Number(options.maxProviderCalls || 1_024),
      maxInputUnitsPerTurn: Number(options.maxInputUnitsPerTurn || 1_000_000),
      maxOutputUnitsPerTurn: Number(options.maxOutputUnitsPerTurn || 8_192),
      timeoutMs: Number(options.providerTimeoutMs || 150_000),
    },
    now,
  });
  const scopedSupervisor = executionScope.wrapSupervisor(supervisorCore);
  const supervisor = freeze({
    sendTurn(input) { return scopedSupervisor.sendTurn(input, context); },
    readState(input) { return scopedSupervisor.readState(input, context); },
  });
  await durableGateway.initialize({
    recoveryIdempotencyKeyHash: hashStarcraftTmgContract({
      roomId,
      seatKey,
      principalSessionRef,
      providerSessionId: session.sessionId,
      kind: "live-opponent-provider-startup-recovery",
    }),
    recoveredAt: new Date(now()).toISOString(),
  });
  const availabilityPort = createStarcraftTmgDeepSeekModelAvailabilityPortV1({
    credentialIngress: options.credentialIngress,
  });
  const decisionStore = createSqliteStarcraftTmgLiveDecisionStoreV1({
    filename: path.join(dataDirectory, "live-decisions.sqlite"),
  });
  const decisionPort = createStarcraftTmgLiveFlashDecisionPortV1({
    providerSupervisor: supervisor,
    promptArtifactStore,
    profileAvailabilityPort: availabilityPort,
    strategySkillPort: {
      async resolve() {
        return { ok: true, snapshot: strategySkillSnapshot };
      },
    },
    spatialQueryPort,
    memoryQueryPort,
    store: decisionStore,
    profileCandidates: profiles.map((providerProfile) => ({
      providerId: providerProfile.provider,
      model: providerProfile.model,
      profileRef: profileRef(providerProfile),
      maxOutputUnits: providerProfile.outputBudget,
    })),
    maxToolRounds: options.maxToolRounds,
    maxPlanningQueryRounds: options.maxPlanningQueryRounds,
    maxActionQueryRounds: options.maxActionQueryRounds,
    now,
  });
  const scope = freeze({
    gameId: "starcraft-tmg",
    roomId,
    matchBindingHash: matchBinding.bindingHash,
    seatKey,
  });
  const preflight = await decisionPort.preflight({
    scope,
    matchMode: options.matchMode || "user_vs_agent",
  });
  if (preflight?.ok !== true) {
    await attachmentControl.close().catch(() => {});
    await workerPort.close().catch(() => {});
    await attemptStore.close().catch(() => {});
    decisionStore.close();
    throw new Error(preflight?.reason || "LIVE_OPPONENT_PREFLIGHT_FAILED");
  }
  const selectedProfile = profiles.find((entry) => (
    entry.integrity.hash === preflight.selectedProfile.profileRef.hash
  ));
  if (!selectedProfile) throw new Error("LIVE_OPPONENT_PROFILE_SELECTION_DRIFT");
  const prepared = await attachmentControl.prepareAttachment({
    roomId,
    sessionId: session.sessionId,
    expectedConnectionEpoch: session.connection.epoch,
    providerProfileRef: profileRef(selectedProfile),
    disclosureNoticeVersion: STARCRAFT_TMG_PROVIDER_DISCLOSURE_NOTICE_VERSION,
    consentAccepted: true,
  }, context);
  if (prepared?.ok !== true) {
    throw new Error(prepared?.reason || "LIVE_OPPONENT_PROVIDER_PREPARE_FAILED");
  }
  const ingress = options.credentialIngress
    ? await options.credentialIngress()
    : await readStarcraftTmgDeepSeekCredentialFromKeychainV1();
  const attached = await attachmentControl.attachCredentialBytes({
    roomId,
    sessionId: session.sessionId,
    expectedConnectionEpoch: session.connection.epoch,
    attachmentId: prepared.attachment.attachmentId,
    ingressNonce: prepared.ingress.nonce,
    credentialBytes: ingress.credentialBytes,
  }, context);
  if (attached?.ok !== true) {
    throw new Error(attached?.reason || "LIVE_OPPONENT_PROVIDER_ATTACH_FAILED");
  }
  const opened = await decisionPort.openMatch({
    scope,
    preflightReceipt: preflight,
    providerSession: {
      sessionId: session.sessionId,
      connectionEpoch: session.connection.epoch,
      sessionBindingHash: session.binding.sessionBindingHash,
    },
    promptPack: options.matchMode === "agent_vs_agent"
      ? "selfplay_agent_prompt" : "opponent_prompt",
    budget: {
      limitCnyMicros: Number(options.budgetLimitCnyMicros || 80_000_000),
      maxProviderCalls: Number(options.maxProviderCalls || 1_024),
    },
    // Before Slice 247, process shutdown incorrectly closed the durable agent
    // match. Reopen that legacy state only when the same frozen room/Skill/model
    // bindings pass above; unknown in-flight Provider attempts remain blocked.
    resumeClosedMatch: true,
  });
  if (opened?.ok !== true) {
    throw new Error(opened?.reason || "LIVE_OPPONENT_MATCH_OPEN_FAILED");
  }

  let closed = false;
  async function close(input = {}) {
    if (closed) return;
    closed = true;
    if (input.finalizeMatch === true) {
      await decisionPort.closeMatch({ scope }).catch(() => {});
    }
    await attachmentControl.detachAttachment({
      roomId,
      sessionId: session.sessionId,
      expectedConnectionEpoch: session.connection.epoch,
      attachmentId: prepared.attachment.attachmentId,
    }, context).catch(() => {});
    await attachmentControl.close().catch(() => {});
    await workerPort.close().catch(() => {});
    await attemptStore.close().catch(() => {});
    decisionStore.close();
  }

  return freeze({
    schemaVersion: STARCRAFT_TMG_LIVE_OPPONENT_PROVIDER_STACK_VERSION,
    scope,
    session,
    preflight,
    opened,
    decisionPort,
    strategySkillSnapshot,
    selectedProfile: clone(preflight.selectedProfile),
    stores: {
      providerAttempts: "sqlite_wal",
      liveDecisions: decisionStore.durability,
      promptArtifacts: "process_memory_release_after_attempt",
    },
    credentialExposedToModel: false,
    dshUsedOnline: false,
    trainingTruth: false,
    finalizeMatch() { return decisionPort.closeMatch({ scope }); },
    close,
  });
}
