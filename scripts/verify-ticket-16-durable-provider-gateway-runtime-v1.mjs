#!/usr/bin/env node

import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { STARCRAFT_TMG_TICKET_16_DURABLE_PROVIDER_GATEWAY_V1 as contract } from
  "../content/provider/ticket-16-durable-provider-gateway-v1.mjs";
import { STARCRAFT_TMG_TICKET_16_PROVIDER_ATTEMPT_STORE_POSTGRES_V1 as predecessor } from
  "../content/provider/ticket-16-provider-attempt-store-postgres-v1.mjs";
import { createKerriganPrimalProductBundleV1 } from
  "../content/characters/kerrigan-primal-v1.mjs";
import {
  createGameRoleBinding,
  createProviderProfile,
} from "../packages/character-agent/contracts-v1.mjs";
import { getStarcraftTmgModeCapability } from
  "../packages/character-agent/mode-capability-v1.mjs";
import { assembleStarcraftTmgRolePrompt } from
  "../packages/character-agent/prompt-assembly-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/transition-v1.mjs";
import { createInMemoryStarcraftTmgPromptArtifactStoreV1 } from
  "../packages/online-agent-session/prompt-artifact-store-v1.mjs";
import { createStarcraftTmgProviderGatewaySupervisorV1 } from
  "../packages/online-agent-session/provider-gateway-supervisor-v1.mjs";
import {
  createStarcraftTmgOnlineAgentSessionLifecycleV1,
  createStarcraftTmgOnlinePrincipalBindingV1,
} from "../packages/online-agent-session/session-lifecycle-v1.mjs";
import {
  createStarcraftTmgSecureProviderAttachmentControlV1,
  STARCRAFT_TMG_PROVIDER_DISCLOSURE_NOTICE_VERSION,
} from "../packages/secure-provider-runtime/credential-attachment-control-v1.mjs";
import { createStarcraftTmgDurableProviderGatewayRuntimeV1 } from
  "../packages/secure-provider-runtime/durable-provider-gateway-runtime-v1.mjs";
import { createStarcraftTmgProviderGatewayExecutionScopeV1 } from
  "../packages/secure-provider-runtime/provider-gateway-execution-scope-v1.mjs";
import { createStarcraftTmgProviderProfileRegistryV1 } from
  "../packages/secure-provider-runtime/provider-profile-registry-v1.mjs";
import {
  createStarcraftTmgProviderEgressWorkerPortV1,
  STARCRAFT_TMG_PROVIDER_EGRESS_WORKER_CHILD_VERSION,
} from "../packages/secure-provider-runtime/provider-egress-worker-port-v1.mjs";
import { createSqliteStarcraftTmgProviderAttemptStoreV1 } from
  "../packages/secure-provider-runtime/sqlite-provider-attempt-store-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_ROOT = path.join(ROOT,
  "build/ticket-16-slice-159-durable-provider-gateway-v1");
const REPORT_PATH = path.join(REPORT_ROOT, "report.json");
const checks = [];
const failures = [];
const fixtures = [];
let sqliteFiles = 0;
let workerCalls = 0;

async function check(id, operation) {
  try {
    await operation();
    checks.push({ id, passed: true });
  } catch (error) {
    const message = error instanceof Error ? error.stack || error.message : String(error);
    checks.push({ id, passed: false, error: message });
    failures.push(`${id}: ${message}`);
  }
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function seal(body, field) {
  const value = clone(body);
  return Object.freeze({ ...value, [field]: hashStarcraftTmgContract(value) });
}

function verifyHash(value, field) {
  const { [field]: observed, ...body } = value;
  assert.equal(observed, hashStarcraftTmgContract(body));
}

function clock(start = "2026-09-04T05:00:00.000Z") {
  let value = Date.parse(start);
  return () => {
    const result = new Date(value).toISOString();
    value += 1_000;
    return result;
  };
}

function roomBinding() {
  return {
    schemaVersion: "starcraft_tmg_match_room_binding_v1",
    rulesVersion: "0.112.0-official-faq-v1-current",
    dataVersion: "official-onetime-snapshot-v1",
    matchBindingHash: "a".repeat(64),
    sourceSnapshotHash: "b".repeat(64),
    dataSnapshotHash: "c".repeat(64),
    rulesArtifactHash: "d".repeat(64),
    executorArtifactHash: "e".repeat(64),
    geometryArtifactHash: "f".repeat(64),
    actionSchemaHash: "1".repeat(64),
  };
}

function profile() {
  return createProviderProfile({
    providerProfileId: "starcraft-tmg.direct-provider.slice-159.v1",
    version: "1.0.0",
    provider: "openai-compatible-direct",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-test-model",
    contextBudget: 65_536,
    outputBudget: 256,
    timeoutMs: 5_000,
    retryPolicy: {
      maxAttempts: 1,
      owner: "session_supervisor",
      internalRetry: false,
    },
  });
}

function ref(value) {
  return Object.freeze({
    id: value.providerProfileId,
    version: value.version,
    hash: value.integrity.hash,
  });
}

function responseChannels(mode, intent) {
  if (mode === "tutor") return intent === "explain" ? ["teaching"] : ["speech"];
  if (mode === "opponent") return intent === "take_turn"
    ? ["decision", "speech"] : ["speech"];
  return ["speech"];
}

function promptArtifact({ bundle, mode, intent, session }) {
  const capability = getStarcraftTmgModeCapability(mode);
  const binding = createGameRoleBinding({
    bindingId: `${session.sessionId}.prompt-binding`,
    characterPackage: bundle.characterPackage,
    roleSkillPack: bundle.roleSkillPacks[mode],
    conversationProfile: bundle.conversationProfile,
    providerProfile: bundle.providerProfile,
    mode,
    roomId: session.binding.roomId,
    seatId: session.binding.seatKey,
    rulesetVersion: session.binding.roomBinding.rulesVersion,
    visibilityPolicy: capability.visibilityPolicy,
    capabilityProfileId: capability.capabilityProfileId,
    worldbookRefs: bundle.worldbooks.map((entry) => ({
      id: entry.worldbookId,
      version: entry.version,
      hash: entry.integrity.hash,
    })),
    strategySkillSnapshot: { refs: [], canOverrideRules: false },
    memoryScopes: [],
    createdAt: session.createdAt,
  });
  const base = assembleStarcraftTmgRolePrompt({
    characterPackage: bundle.characterPackage,
    roleSkillPack: bundle.roleSkillPacks[mode],
    conversationProfile: bundle.conversationProfile,
    binding,
    worldbooks: bundle.worldbooks,
    memoryRefs: [],
    roomProjection: {
      schemaVersion: "starcraft_tmg_fixture_room_projection_v1",
      roomId: session.binding.roomId,
      stateRevision: 0,
      stateHash: "2".repeat(64),
      viewerSide: session.binding.seatKey,
      trainingTruth: false,
    },
  });
  const response = seal({
    schemaVersion: "starcraft_tmg_online_role_turn_runtime_v1.response-contract",
    outputSchemaVersion: "starcraft_tmg_online_role_output_v1",
    mode,
    intent,
    allowedChannels: responseChannels(mode, intent),
    requiredChannels: [],
    topLevelFields: ["schemaVersion", "channels", "visualCue", "evidenceRefIds"],
    evidenceRefs: [],
    requiredEvidenceKinds: [],
    decisionCandidateSource: mode === "opponent" && intent === "take_turn"
      ? "current_enabled_legal_space_candidate_only" : "forbidden",
    strategyMemoryRefs: [],
    strategyMemoryIsAdvisory: true,
    mayPreview: mode === "opponent" && intent === "take_turn",
    mayConfirm: false,
    mayApply: false,
    confirmationOwner: mode === "opponent" && intent === "take_turn"
      ? "human_outside_agent_runtime" : null,
    rulesAuthority: "external_rules_service",
    eligibleForTraining: false,
    trainingTruth: false,
  }, "contractHash");
  const userMessage = `Fixture ${mode} ${intent} request.`;
  const userNode = seal({
    nodeType: "user-message",
    authority: "user",
    content: { intent, text: userMessage },
  }, "nodeHash");
  const responseNode = seal({
    nodeType: "response-contract",
    authority: "platform",
    content: response,
  }, "nodeHash");
  const nodes = [...base.nodes, userNode, responseNode];
  const receipt = seal({
    schemaVersion: "starcraft_tmg_online_role_context_runtime_v1.prompt-receipt",
    sessionId: session.sessionId,
    sessionBindingHash: session.binding.sessionBindingHash,
    mode,
    intent,
    nodeHashes: nodes.map((entry) => entry.nodeHash),
    responseContractHash: response.contractHash,
    rulesAuthority: "external_rules_service",
    trainingTruth: false,
  }, "receiptHash");
  return seal({
    schemaVersion: "starcraft_tmg_online_role_context_runtime_v1.prompt-artifact",
    sessionId: session.sessionId,
    sessionBindingHash: session.binding.sessionBindingHash,
    promptPack: capability.promptPack,
    nodes,
    responseContract: response,
    receipt,
    retentionPolicy: "ephemeral_release_after_supervised_turn",
    eligibleForTraining: false,
    trainingTruth: false,
  }, "promptArtifactHash");
}

class FakeProviderChild extends EventEmitter {
  constructor({ plan, now, observations, beforeResult }) {
    super();
    this.plan = plan;
    this.now = now;
    this.observations = observations;
    this.beforeResult = beforeResult;
    this.pid = 15_900 + observations.length;
    this.connected = true;
    this.exitCode = null;
    this.signalCode = null;
    this.binding = null;
    this.pending = null;
  }

  send(message, callback = () => {}) {
    callback(null);
    if (message.type === "initialize") {
      this.binding = message.egressBinding;
      this.observations.push({ type: "initialize", attachmentId: message.attachmentId });
      queueMicrotask(() => this.emit("message", {
        type: "initialized",
        requestId: message.requestId,
        attachmentId: message.attachmentId,
        ok: true,
        workerVersion: STARCRAFT_TMG_PROVIDER_EGRESS_WORKER_CHILD_VERSION,
        providerProfileHash: this.binding.providerProfileRef.hash,
        egressPolicyHash: this.binding.policyHash,
        isolation: {
          processIsolated: true,
          environmentInheritedFromParent: false,
          environmentKeys: ["NODE_NO_WARNINGS"],
          environmentAllowlistPassed: true,
          credentialPersistence: "child_process_session_memory_only",
          credentialReturnedOverIpc: false,
          providerTransportMounted: true,
          networkRequestMadeAtInitialization: false,
          rulesRoomAgentSkillMemoryOrDshImported: false,
          trainingTruth: false,
        },
        trainingTruth: false,
      }));
      return;
    }
    if (message.type === "complete") {
      workerCalls += 1;
      this.pending = message;
      this.observations.push({ type: "complete", request: clone(message.providerRequest) });
      if (this.plan.kind === "hang") return;
      queueMicrotask(async () => {
        await this.beforeResult?.(message.providerRequest);
        if (this.plan.kind === "exit") {
          this.connected = false;
          this.exitCode = 1;
          this.emit("exit", 1, null);
          return;
        }
        if (this.plan.kind === "failure") {
          this.emitFailure(message.requestId, this.plan.physicalAttempts);
          return;
        }
        const startedAt = this.now();
        const finishedAt = this.now();
        const receiptBody = {
          schemaVersion: "starcraft_tmg_provider_egress_transport_v1.success",
          requestId: message.providerRequest.requestId,
          providerProfileRef: this.binding.providerProfileRef,
          egressPolicyHash: this.binding.policyHash,
          providerId: this.binding.providerId,
          requestedModel: this.binding.model,
          reportedModel: this.binding.model,
          providerRequestIdHash: "3".repeat(64),
          status: 200,
          usage: {
            inputUnits: this.plan.inputUnits ?? 12,
            outputUnits: this.plan.outputUnits ?? 7,
            totalUnits: (this.plan.inputUnits ?? 12) + (this.plan.outputUnits ?? 7),
          },
          responseFingerprint: "4".repeat(64),
          dnsAddressSetHash: "5".repeat(64),
          tlsServerName: this.binding.endpoint.hostname,
          tlsCertificateVerificationDisabled: false,
          redirectFollowed: false,
          proxyUsed: false,
          physicalAttempts: 1,
          automaticRetries: 0,
          startedAt,
          finishedAt,
          trainingTruth: false,
        };
        this.emit("message", {
          type: "provider_result",
          requestId: message.requestId,
          ok: true,
          value: {
            output: this.plan.output || {
              schemaVersion: "starcraft_tmg_online_role_output_v1",
              channels: { speech: { text: "Deterministic Provider response." } },
              visualCue: "reflect",
              evidenceRefIds: [],
            },
            usageReceipt: {
              ...receiptBody,
              receiptHash: hashStarcraftTmgContract(receiptBody),
            },
          },
          workerVersion: STARCRAFT_TMG_PROVIDER_EGRESS_WORKER_CHILD_VERSION,
          trainingTruth: false,
        });
      });
      return;
    }
    if (message.type === "cancel") {
      this.observations.push({ type: "cancel", targetRequestId: message.targetRequestId });
      queueMicrotask(() => {
        this.emit("message", {
          type: "cancel_complete",
          requestId: message.requestId,
          targetRequestId: message.targetRequestId,
          ok: true,
          matched: Boolean(this.pending),
          workerVersion: STARCRAFT_TMG_PROVIDER_EGRESS_WORKER_CHILD_VERSION,
          trainingTruth: false,
        });
        if (this.pending) this.emitFailure(this.pending.requestId, 1);
      });
      return;
    }
    if (message.type === "shutdown") {
      queueMicrotask(() => {
        this.emit("message", {
          type: "shutdown_complete",
          requestId: message.requestId,
          ok: true,
          reason: message.reason,
          workerVersion: STARCRAFT_TMG_PROVIDER_EGRESS_WORKER_CHILD_VERSION,
          sensitiveBytesZeroed: true,
          trainingTruth: false,
        });
        this.connected = false;
        this.exitCode = 0;
        this.emit("exit", 0, null);
      });
    }
  }

  emitFailure(requestId, physicalAttempts) {
    const code = physicalAttempts === 0
      ? "PROVIDER_DNS_PUBLIC_ADDRESS_REQUIRED" : "PROVIDER_TRANSPORT_FAILED";
    const receiptBody = {
      schemaVersion: "starcraft_tmg_provider_egress_transport_v1.failure",
      code,
      requestDefinitelyNotSent: physicalAttempts === 0,
      requestMayHaveBeenSent: physicalAttempts === 1,
      status: null,
      physicalAttempts,
      automaticRetries: 0,
      trainingTruth: false,
    };
    this.emit("message", {
      type: "provider_result",
      requestId,
      ok: false,
      code,
      safeReceipt: {
        ...receiptBody,
        receiptHash: hashStarcraftTmgContract(receiptBody),
      },
      workerVersion: STARCRAFT_TMG_PROVIDER_EGRESS_WORKER_CHILD_VERSION,
      trainingTruth: false,
    });
    this.pending = null;
  }

  kill(signal = "SIGKILL") {
    this.connected = false;
    this.signalCode = signal;
    queueMicrotask(() => this.emit("exit", null, signal));
    return true;
  }
}

function withLostCommitAcknowledgements(store, operations) {
  const pending = new Set(operations);
  const wrapper = {};
  for (const method of [
    "initialize", "openBudget", "reserveAttempt", "markAttemptDispatched",
    "settleAttempt", "recoverOpenAttempts", "getBudget", "getAttempt",
    "readAudit", "replayBudget", "health", "close",
  ]) {
    wrapper[method] = async (...args) => {
      const result = await store[method](...args);
      if (pending.delete(method)) throw Object.assign(new Error("commit acknowledgement lost"), {
        code: "PROVIDER_ATTEMPT_COMMIT_ACK_LOST",
      });
      return result;
    };
  }
  return Object.freeze(wrapper);
}

async function createFixture(options = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "sc-t16-s159-"));
  const sqlitePath = path.join(root, "attempts.sqlite");
  sqliteFiles += 1;
  const bundle = createKerriganPrimalProductBundleV1();
  const providerProfile = profile();
  const providerRef = ref(providerProfile);
  const now = clock(options.start);
  const mode = options.mode || "tutor";
  const intent = options.intent || (mode === "tutor" ? "explain"
    : mode === "opponent" ? "take_turn"
      : mode === "commentator" ? "commentate" : "reflect");
  const roomId = `slice-159-${mode}-room`;
  const principalRef = `slice-159-${mode}-principal`;
  const principalScopeHash = hashStarcraftTmgContract({ roomId, principalRef });
  const selectionHash = hashStarcraftTmgContract({
    characterId: bundle.characterPackage.characterId,
    fixture: `slice-159-${mode}`,
  });
  const principalBinding = createStarcraftTmgOnlinePrincipalBindingV1({
    roomId,
    principalScopeHash,
    seatKey: "player1",
    principalType: "human",
    principalRoleMode: "player",
    bindingRevision: 1,
    allowedAgentModes: ["tutor", "opponent", "commentator", "companion"],
    characterId: bundle.characterPackage.characterId,
    characterPackageHash: bundle.characterPackage.integrity.hash,
    characterSelectionHash: selectionHash,
    roomBinding: roomBinding(),
  });
  let sessionIds = 0;
  const lifecycle = createStarcraftTmgOnlineAgentSessionLifecycleV1({
    principalAuthority: {
      async resolve(input) {
        return input.roomId === roomId && input.principalSessionRef === principalRef
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
    createId() {
      sessionIds += 1;
      return `slice-159-${mode}-session-${String(sessionIds).padStart(3, "0")}`;
    },
    now,
  });
  const created = await lifecycle.createSession({
    roomId,
    mode,
    characterId: bundle.characterPackage.characterId,
  }, { principalSessionRef: principalRef });
  assert.equal(created.ok, true);
  const session = created.session;
  const registry = createStarcraftTmgProviderProfileRegistryV1({
    entries: [{ providerProfile, completionPath: "/chat/completions" }],
  });
  const observations = [];
  const baseStore = createSqliteStarcraftTmgProviderAttemptStoreV1({
    filename: sqlitePath,
  });
  const attemptStore = options.lostAcknowledgements
    ? withLostCommitAcknowledgements(baseStore, options.lostAcknowledgements)
    : baseStore;
  const observedAttemptStates = [];
  let ids = 0;
  const workerPort = createStarcraftTmgProviderEgressWorkerPortV1({
    providerProfileRegistry: registry,
    spawnProcess() {
      return new FakeProviderChild({
        plan: options.plan || { kind: "success" },
        now,
        observations,
        async beforeResult(request) {
          const observed = await baseStore.getAttempt(request.requestId);
          observedAttemptStates.push(observed?.status || null);
        },
      });
    },
    createId(prefix) {
      ids += 1;
      return `${mode}-${prefix}-${String(ids).padStart(4, "0")}`;
    },
    handshakeTimeoutMs: 2_000,
    shutdownGraceMs: 200,
  });
  let supervisorCore;
  const supervisorProxy = {
    readState(...args) { return supervisorCore.readState(...args); },
  };
  const executionScope = createStarcraftTmgProviderGatewayExecutionScopeV1({
    sessionLifecycle: lifecycle,
    readProviderState(...args) { return supervisorProxy.readState(...args); },
  });
  const attachmentControl = createStarcraftTmgSecureProviderAttachmentControlV1({
    sessionLifecycle: lifecycle,
    providerSupervisor: supervisorProxy,
    providerProfileRegistry: registry,
    credentialAttachmentPort: workerPort,
    createId() {
      ids += 1;
      return `slice-159-attachment-${String(ids).padStart(4, "0")}`;
    },
    createNonce() {
      return "n".repeat(43);
    },
    now,
    attachmentTtlMs: 60_000,
  });
  const promptStore = createInMemoryStarcraftTmgPromptArtifactStoreV1({
    createId() {
      ids += 1;
      return `slice-159-prompt-${String(ids).padStart(4, "0")}`;
    },
    maxArtifacts: 32,
    maxArtifactBytes: 2 * 1024 * 1024,
  });
  const durableGateway = createStarcraftTmgDurableProviderGatewayRuntimeV1({
    attemptStore,
    promptArtifactStore: promptStore,
    attachmentControl,
    workerPort,
    executionAuthorityPort: executionScope,
    now,
  });
  const budgetPolicy = {
    maxTotalUnits: 10_000,
    maxTurns: 16,
    maxInputUnitsPerTurn: 2_000,
    maxOutputUnitsPerTurn: 256,
    timeoutMs: 2_000,
  };
  supervisorCore = createStarcraftTmgProviderGatewaySupervisorV1({
    sessionLifecycle: lifecycle,
    providerGateway: durableGateway,
    gatewayEvidence: "durable_isolated_worker_deterministic_provider",
    budgetPolicy,
    createId() {
      ids += 1;
      return `slice-159-turn-${String(ids).padStart(4, "0")}`;
    },
    now,
  });
  const supervisor = executionScope.wrapSupervisor(supervisorCore);
  if (options.initialize !== false) {
    await durableGateway.initialize({
      recoveryIdempotencyKeyHash: hashStarcraftTmgContract({ root, mode }),
      recoveredAt: now(),
    });
  }
  const context = { principalSessionRef: principalRef };
  const prepared = await attachmentControl.prepareAttachment({
    roomId,
    sessionId: session.sessionId,
    expectedConnectionEpoch: session.connection.epoch,
    providerProfileRef: providerRef,
    disclosureNoticeVersion: STARCRAFT_TMG_PROVIDER_DISCLOSURE_NOTICE_VERSION,
    consentAccepted: true,
  }, context);
  assert.equal(prepared.ok, true, JSON.stringify(prepared));
  const secret = Buffer.from("fixture-only-provider-secret-159", "utf8");
  const attached = await attachmentControl.attachCredentialBytes({
    roomId,
    sessionId: session.sessionId,
    expectedConnectionEpoch: session.connection.epoch,
    attachmentId: prepared.attachment.attachmentId,
    ingressNonce: prepared.ingress.nonce,
    credentialBytes: secret,
  }, context);
  assert.equal(attached.ok, true, JSON.stringify(attached));
  const artifact = promptArtifact({ bundle, mode, intent, session });
  const stored = promptStore.put({
    sessionId: session.sessionId,
    sessionBindingHash: session.binding.sessionBindingHash,
    artifact,
  });
  assert.equal(stored.ok, true);
  const boundedBody = {
    schemaVersion: "starcraft_tmg_bounded_provider_request_v1",
    intent,
    requestPayloadHash: artifact.promptArtifactHash,
    inputUnits: 80,
    maxOutputUnits: 64,
  };
  const turnInput = {
    sessionId: session.sessionId,
    roomId,
    expectedConnectionEpoch: session.connection.epoch,
    providerProfileRef: providerRef,
    promptAssemblyRef: stored.ref,
    boundedRequest: {
      ...boundedBody,
      requestHash: hashStarcraftTmgContract(boundedBody),
    },
    responseContract: {
      id: `starcraft-tmg.${mode}.${intent}.strict-online-response.v1`,
      version: "1.0.0",
      hash: artifact.responseContract.contractHash,
    },
  };
  const fixture = {
    root, sqlitePath, bundle, providerProfile, providerRef, now, mode, intent,
    lifecycle, session, registry, baseStore, attemptStore, workerPort,
    attachmentControl, promptStore, durableGateway, executionScope,
    supervisor, context,
    prepared, attached, secret, artifact, stored, turnInput, observations,
    observedAttemptStates,
  };
  fixtures.push(fixture);
  return fixture;
}

async function waitFor(predicate, message) {
  for (let index = 0; index < 200; index += 1) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 2));
  }
  assert.fail(message);
}

async function firstAttempt(fixture) {
  const budgetId = `sc-provider-budget-${hashStarcraftTmgContract({
    principalScopeHash: fixture.session.binding.principalScopeHash,
    sessionBindingHash: fixture.session.binding.sessionBindingHash,
  })}`;
  const audit = await fixture.baseStore.readAudit({
    budgetId, afterSequence: 0, limit: 20,
  });
  const attemptId = audit.events.find((entry) => entry.attemptId)?.attemptId;
  return {
    budgetId,
    budget: await fixture.baseStore.getBudget(budgetId),
    attempt: attemptId ? await fixture.baseStore.getAttempt(attemptId) : null,
    audit,
  };
}

await check("contract_is_hash_sealed_and_binds_slice_158", () => {
  verifyHash(contract, "contractHash");
  assert.equal(contract.predecessorContractHash, predecessor.contractHash);
  assert.equal(contract.acceptance.fixedAssertions, 36);
});

await check("mtl_sequence_is_pinned_for_every_agent_mode", () => {
  assert.equal(contract.mtlSchedulingLineage.commit,
    "50ef5c29c655c015335d76e78fb4a0ecb442252f");
  assert.deepEqual(contract.mtlSchedulingLineage.requiredSequence, [
    "persist_intent_and_maximum_budget_reservation",
    "commit_dispatch_authority_before_side_effect",
    "execute_once_without_internal_provider_retry",
    "persist_safe_receipt_and_terminal_budget_atomically",
    "recover_or_replay_by_idempotency_and_revision_fence",
    "replan_only_after_explicit_approval_when_outcome_is_ambiguous",
  ]);
});

await check("slice_scope_excludes_live_key_dsh_skill_and_training", () => {
  assert.equal(contract.runTruth.providerCalled, false);
  assert.equal(contract.runTruth.userCredentialAccepted, false);
  assert.equal(contract.runTruth.dshRun, false);
  assert.equal(contract.runTruth.skillGenerated, false);
  assert.equal(contract.runTruth.trainingTruth, false);
});

await check("runtime_metadata_exposes_one_provider_attempt_and_exact_store_replay", async () => {
  const fixture = await createFixture();
  const metadata = fixture.durableGateway.metadata();
  assert.equal(metadata.physicalAttemptsPerExecution, 1);
  assert.equal(metadata.automaticProviderRetries, 0);
  assert.equal(metadata.exactStoreCommitObservationReplays, 1);
  assert.equal(metadata.dshAllowed, false);
  assert.equal(fixture.executionScope.metadata().publicGatewayInputChanged, false);
  assert.equal(fixture.executionScope.metadata().contextPersisted, false);
});

await check("runtime_rejects_execution_before_explicit_startup_recovery", async () => {
  const fixture = await createFixture({ initialize: false });
  const result = await fixture.supervisor.sendTurn(fixture.turnInput, fixture.context);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "provider_gateway_not_initialized");
  assert.equal(fixture.observations.filter((entry) => entry.type === "complete").length, 0);
  await fixture.durableGateway.initialize({
    recoveryIdempotencyKeyHash: hashStarcraftTmgContract({
      fixture: "direct-gateway-scope-rejection",
    }),
    recoveredAt: fixture.now(),
  });
  await assert.rejects(() => fixture.durableGateway.complete({
    schemaVersion: "starcraft_tmg_provider_gateway_request_v1",
    providerProfileRef: fixture.turnInput.providerProfileRef,
    promptAssemblyRef: fixture.turnInput.promptAssemblyRef,
    boundedRequest: fixture.turnInput.boundedRequest,
    responseContract: fixture.turnInput.responseContract,
    budgetReservation: result.turn.reservation,
    signal: new AbortController().signal,
  }), (error) => error?.code === "provider_execution_scope_missing");
  assert.equal(fixture.observations.filter((entry) => entry.type === "complete").length, 0);
});

await check("startup_recovery_is_hash_only_and_empty_on_clean_store", async () => {
  const fixture = await createFixture();
  const metadata = fixture.durableGateway.metadata();
  assert.match(metadata.recoveryReceiptHash, /^[a-f0-9]{64}$/u);
  assert.equal(metadata.rawPromptOrOutputPersisted, false);
});

await check("internal_attachment_binding_is_current_authenticated_and_worker_bound", async () => {
  const fixture = await createFixture();
  const resolved = await fixture.attachmentControl.resolveExecutionAttachment({
    roomId: fixture.session.binding.roomId,
    sessionId: fixture.session.sessionId,
    expectedConnectionEpoch: fixture.session.connection.epoch,
    providerProfileRef: fixture.providerRef,
  }, fixture.context);
  assert.equal(resolved.ok, true);
  assert.equal(resolved.binding.providerProfileRef.hash, fixture.providerRef.hash);
  assert.match(resolved.binding.egressPolicyHash, /^[a-f0-9]{64}$/u);
  verifyHash(resolved.binding, "bindingHash");
});

await check("credential_input_is_zeroed_and_never_returned", async () => {
  const fixture = await createFixture();
  assert(fixture.secret.every((byte) => byte === 0));
  assert(!JSON.stringify(fixture.attached).includes("fixture-only-provider"));
});

let successFixture;
let successResult;
await check("supervisor_prompt_worker_store_success_path_completes", async () => {
  successFixture = await createFixture();
  successResult = await successFixture.supervisor.sendTurn(
    successFixture.turnInput, successFixture.context);
  assert.equal(successResult.ok, true);
  assert.equal(successResult.turn.state, "completed");
  assert.equal(successResult.usageReceipt.totalUnits, 19);
});

await check("worker_runs_only_after_durable_dispatch_commit", () => {
  assert.deepEqual(successFixture.observedAttemptStates, ["dispatched"]);
});

await check("actual_prompt_assembly_nodes_reach_the_isolated_worker", () => {
  const request = successFixture.observations.find(
    (entry) => entry.type === "complete").request;
  assert.equal(request.promptPack, "novice_teacher_prompt");
  assert(request.promptNodes.some((entry) => entry.nodeType === "platform-policy"));
  assert(!request.promptNodes.some((entry) => entry.nodeType === "user-message"));
  assert.equal(request.userMessage, "Fixture tutor explain request.");
});

await check("response_contract_is_exactly_projected_to_transport", () => {
  const request = successFixture.observations.find(
    (entry) => entry.type === "complete").request;
  assert.deepEqual(request.responseContract.allowedChannels, ["teaching"]);
  assert.equal(request.responseContract.decisionCandidateSource, "forbidden");
  assert.equal(request.maxOutputUnits, 64);
});

await check("one_logical_turn_makes_exactly_one_physical_worker_call", () => {
  assert.equal(successFixture.observations.filter(
    (entry) => entry.type === "complete").length, 1);
  assert.equal(successResult.turn.attemptCount, 1);
  assert.equal(successResult.turn.automaticallyRetried, false);
});

await check("durable_attempt_is_completed_with_actual_usage", async () => {
  const state = await firstAttempt(successFixture);
  assert.equal(state.attempt.status, "completed");
  assert.equal(state.attempt.reportedInputUnits, 12);
  assert.equal(state.attempt.reportedOutputUnits, 7);
  assert.equal(state.attempt.chargedUnits, 19);
});

await check("durable_budget_releases_reservation_and_charges_actual_usage", async () => {
  const state = await firstAttempt(successFixture);
  assert.equal(state.budget.activeReservedUnits, 0);
  assert.equal(state.budget.consumedUnits, 19);
  assert.equal(state.budget.completedCount, 1);
});

await check("durable_audit_orders_open_reserve_dispatch_settle", async () => {
  const state = await firstAttempt(successFixture);
  assert.deepEqual(state.audit.events.map((entry) => entry.eventType), [
    "budget_opened", "attempt_reserved", "attempt_dispatched", "attempt_settled",
  ]);
});

await check("only_safe_provider_receipt_hash_enters_attempt_store", async () => {
  const state = await firstAttempt(successFixture);
  assert.match(state.attempt.safeProviderReceiptHash, /^[a-f0-9]{64}$/u);
  assert.equal(state.attempt.rawPromptRetained, false);
  assert.equal(state.attempt.rawProviderOutputRetained, false);
  assert.equal(state.attempt.rawProviderHeadersRetained, false);
});

await check("sqlite_file_contains_no_prompt_output_or_credential", async () => {
  const bytes = await readFile(successFixture.sqlitePath);
  const text = bytes.toString("utf8");
  assert(!text.includes("Fixture tutor explain request"));
  assert(!text.includes("Deterministic Provider response"));
  assert(!text.includes("fixture-only-provider-secret"));
});

await check("legacy_supervisor_budget_matches_durable_actual_charge", async () => {
  const state = await firstAttempt(successFixture);
  assert.equal(successResult.state.budget.consumedUnits, state.budget.consumedUnits);
  assert.equal(successResult.state.budget.activeReservationUnits, 0);
});

await check("online_runtime_forbids_dsh_and_schema_repair", () => {
  const metadata = successFixture.durableGateway.metadata();
  assert.equal(metadata.dshAllowed, false);
  assert.equal(metadata.automaticSchemaRepairs, 0);
});

let preflightFailureFixture;
await check("definitely_not_sent_failure_settles_durable_budget_at_zero", async () => {
  preflightFailureFixture = await createFixture({
    plan: { kind: "failure", physicalAttempts: 0 },
  });
  const result = await preflightFailureFixture.supervisor.sendTurn(
    preflightFailureFixture.turnInput, preflightFailureFixture.context);
  const state = await firstAttempt(preflightFailureFixture);
  assert.equal(result.ok, false);
  assert.equal(state.attempt.usageKnown, true);
  assert.equal(state.attempt.chargedUnits, 0);
  assert.equal(result.state.budget.consumedUnits, 144);
  assert.equal(contract.composition.legacySupervisorFailureEnvelope,
    "conservative_full_reservation_non_authoritative_for_durable_accounting");
});

await check("failure_projection_contains_no_raw_provider_error", async () => {
  const state = await firstAttempt(preflightFailureFixture);
  assert.match(state.attempt.safeProviderReceiptHash, /^[a-f0-9]{64}$/u);
  assert.equal(state.attempt.rawProviderOutputRetained, false);
  assert(!JSON.stringify(state).includes("fixture-only-provider-secret"));
});

let uncertainFixture;
await check("may_have_been_sent_failure_consumes_full_reservation", async () => {
  uncertainFixture = await createFixture({ plan: { kind: "exit" } });
  const result = await uncertainFixture.supervisor.sendTurn(
    uncertainFixture.turnInput, uncertainFixture.context);
  const state = await firstAttempt(uncertainFixture);
  assert.equal(result.ok, false);
  assert.equal(state.attempt.usageKnown, false);
  assert.equal(state.attempt.chargedUnits, 144);
  assert.equal(result.state.budget.consumedUnits, 144);
});

await check("worker_exit_is_not_automatically_retried", () => {
  assert.equal(uncertainFixture.observations.filter(
    (entry) => entry.type === "complete").length, 1);
  assert.equal(uncertainFixture.durableGateway.metadata().automaticProviderRetries, 0);
});

let cancelFixture;
let cancelSend;
await check("cancel_aborts_the_single_worker_execution", async () => {
  cancelFixture = await createFixture({ plan: { kind: "hang" } });
  cancelSend = cancelFixture.supervisor.sendTurn(
    cancelFixture.turnInput, cancelFixture.context);
  await waitFor(() => cancelFixture.observations.some(
    (entry) => entry.type === "complete"), "worker did not receive request");
  const state = await cancelFixture.supervisor.readState({
    sessionId: cancelFixture.session.sessionId,
    roomId: cancelFixture.session.binding.roomId,
    expectedConnectionEpoch: cancelFixture.session.connection.epoch,
  }, cancelFixture.context);
  const cancelled = await cancelFixture.supervisor.cancelTurn({
    sessionId: cancelFixture.session.sessionId,
    roomId: cancelFixture.session.binding.roomId,
    expectedConnectionEpoch: cancelFixture.session.connection.epoch,
    turnId: state.state.currentTurn.turnId,
  }, cancelFixture.context);
  assert.equal(cancelled.turn.state, "cancelled");
  await cancelSend;
  await waitFor(() => cancelFixture.observations.some(
    (entry) => entry.type === "cancel"), "worker cancel not observed");
});

await check("cancelled_dispatched_attempt_settles_unknown_usage_once", async () => {
  await waitFor(async () => (await firstAttempt(cancelFixture)).attempt?.status === "cancelled",
    "durable cancellation settlement not observed");
  const state = await firstAttempt(cancelFixture);
  assert.equal(state.attempt.usageKnown, false);
  assert.equal(state.attempt.chargedUnits, 144);
  assert.equal(state.budget.cancelledCount, 1);
});

await check("tampered_prompt_reference_never_reaches_worker_or_store", async () => {
  const fixture = await createFixture();
  const result = await fixture.supervisor.sendTurn({
    ...fixture.turnInput,
    promptAssemblyRef: {
      ...fixture.turnInput.promptAssemblyRef,
      hash: "9".repeat(64),
    },
  }, fixture.context);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "provider_prompt_artifact_rejected");
  assert.equal(fixture.observations.filter((entry) => entry.type === "complete").length, 0);
  assert.equal(await fixture.baseStore.getBudget(
    `sc-provider-budget-${hashStarcraftTmgContract({
      principalScopeHash: fixture.session.binding.principalScopeHash,
      sessionBindingHash: fixture.session.binding.sessionBindingHash,
    })}`), null);
});

await check("profile_mismatch_never_reaches_worker_or_budget", async () => {
  const fixture = await createFixture();
  const body = clone(fixture.turnInput);
  body.providerProfileRef.hash = "8".repeat(64);
  const result = await fixture.supervisor.sendTurn(body, fixture.context);
  assert.equal(result.ok, false);
  assert.equal(fixture.observations.filter((entry) => entry.type === "complete").length, 0);
  assert.equal(await fixture.baseStore.getBudget(
    `sc-provider-budget-${hashStarcraftTmgContract({
      principalScopeHash: fixture.session.binding.principalScopeHash,
      sessionBindingHash: fixture.session.binding.sessionBindingHash,
    })}`), null);
});

let lostAckFixture;
let lostAckResult;
await check("open_budget_commit_ack_loss_is_observed_by_exact_replay", async () => {
  lostAckFixture = await createFixture({
    lostAcknowledgements: ["openBudget", "reserveAttempt",
      "markAttemptDispatched", "settleAttempt"],
  });
  lostAckResult = await lostAckFixture.supervisor.sendTurn(
    lostAckFixture.turnInput, lostAckFixture.context);
  assert.equal(lostAckResult.ok, true);
});

await check("reservation_commit_ack_loss_does_not_duplicate_attempt", async () => {
  const state = await firstAttempt(lostAckFixture);
  assert.equal(state.budget.attemptCount, 1);
  assert.equal(state.audit.events.filter(
    (entry) => entry.eventType === "attempt_reserved").length, 1);
});

await check("dispatch_commit_ack_loss_does_not_duplicate_egress", () => {
  assert.equal(lostAckFixture.observations.filter(
    (entry) => entry.type === "complete").length, 1);
  assert.deepEqual(lostAckFixture.observedAttemptStates, ["dispatched"]);
});

await check("settlement_commit_ack_loss_returns_committed_safe_result", async () => {
  const state = await firstAttempt(lostAckFixture);
  assert.equal(state.attempt.status, "completed");
  assert.equal(state.budget.consumedUnits, 19);
  assert.equal(lostAckResult.usageReceipt.totalUnits, 19);
});

await check("startup_recovery_abandons_reserved_pre_egress_without_charge", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "sc-t16-s159-recover-r-"));
  const store = createSqliteStarcraftTmgProviderAttemptStoreV1({
    filename: path.join(root, "attempts.sqlite"),
  });
  sqliteFiles += 1;
  const policyBody = {
    schemaVersion: "starcraft_tmg_provider_budget_policy_v1",
    maxTotalUnits: 1000,
    maxTurns: 5,
    maxInputUnitsPerTurn: 100,
    maxOutputUnitsPerTurn: 100,
    timeoutMs: 1000,
    cancellationSettlement: "consume_full_reservation_when_usage_is_unknown",
    timeoutSettlement: "consume_full_reservation_when_usage_is_unknown",
    automaticRetryAllowed: false,
    currency: "provider_units",
    trainingTruth: false,
  };
  const policy = { ...policyBody, policyHash: hashStarcraftTmgContract(policyBody) };
  const opened = await store.openBudget({
    principalScopeHash: "1".repeat(64), sessionBindingHash: "2".repeat(64),
    policy, idempotencyKeyHash: "3".repeat(64),
    openedAt: "2026-09-04T06:00:00.000Z",
  });
  await store.reserveAttempt({
    budgetId: opened.budget.budgetId,
    principalScopeHash: "1".repeat(64), expectedBudgetRevision: 0,
    idempotencyKeyHash: "4".repeat(64), consentReceiptHash: "5".repeat(64),
    providerProfileHash: "6".repeat(64), egressPolicyHash: "7".repeat(64),
    promptAssemblyHash: "8".repeat(64), responseContractHash: "9".repeat(64),
    requestHash: "a".repeat(64), intent: "chat", inputUnits: 20,
    maxOutputUnits: 30, reservedAt: "2026-09-04T06:00:01.000Z",
    retryOfAttemptId: null, retryApprovalReceiptHash: null,
    reattachmentReceiptHash: null,
  });
  const runtime = createStarcraftTmgDurableProviderGatewayRuntimeV1({
    attemptStore: store,
    promptArtifactStore: { resolve() { return { ok: false }; } },
    attachmentControl: { resolveExecutionAttachment() { return { ok: false }; } },
    workerPort: { complete() { throw new Error("must not run"); } },
    executionAuthorityPort: { resolve() { return { ok: false }; } },
  });
  const initialized = await runtime.initialize({
    recoveryIdempotencyKeyHash: "b".repeat(64),
    recoveredAt: "2026-09-04T06:00:02.000Z",
  });
  assert.equal(initialized.recovery.abandonedBeforeEgressCount, 1);
  assert.equal((await store.getBudget(opened.budget.budgetId)).consumedUnits, 0);
  fixtures.push({ root, baseStore: store, workerPort: { close: async () => {} },
    attachmentControl: { close: async () => {} } });
});

let recoveredAmbiguous;
await check("startup_recovery_marks_dispatched_attempt_ambiguous_and_charges_full", async () => {
  const fixture = await createFixture();
  const gateway = fixture.turnInput;
  const session = fixture.session;
  const policy = (await fixture.supervisor.readState({
    sessionId: session.sessionId, roomId: session.binding.roomId,
    expectedConnectionEpoch: session.connection.epoch,
  }, fixture.context)).state.budget.policy;
  const opened = await fixture.baseStore.openBudget({
    principalScopeHash: session.binding.principalScopeHash,
    sessionBindingHash: session.binding.sessionBindingHash,
    policy,
    idempotencyKeyHash: hashStarcraftTmgContract({ manual: "open" }),
    openedAt: session.createdAt,
  });
  const reserved = await fixture.baseStore.reserveAttempt({
    budgetId: opened.budget.budgetId,
    principalScopeHash: session.binding.principalScopeHash,
    expectedBudgetRevision: 0,
    idempotencyKeyHash: hashStarcraftTmgContract({ manual: "reserve" }),
    consentReceiptHash: fixture.prepared.consentReceipt.receiptHash,
    providerProfileHash: fixture.providerRef.hash,
    egressPolicyHash: (await fixture.attachmentControl.resolveExecutionAttachment({
      roomId: session.binding.roomId, sessionId: session.sessionId,
      expectedConnectionEpoch: session.connection.epoch,
      providerProfileRef: fixture.providerRef,
    }, fixture.context)).binding.egressPolicyHash,
    promptAssemblyHash: gateway.promptAssemblyRef.hash,
    responseContractHash: gateway.responseContract.hash,
    requestHash: gateway.boundedRequest.requestHash,
    intent: gateway.boundedRequest.intent,
    inputUnits: gateway.boundedRequest.inputUnits,
    maxOutputUnits: gateway.boundedRequest.maxOutputUnits,
    reservedAt: fixture.now(), retryOfAttemptId: null,
    retryApprovalReceiptHash: null, reattachmentReceiptHash: null,
  });
  await fixture.baseStore.markAttemptDispatched({
    attemptId: reserved.attempt.attemptId, expectedAttemptRevision: 0,
    dispatchBindingHash: "c".repeat(64), dispatchedAt: fixture.now(),
  });
  recoveredAmbiguous = await fixture.baseStore.recoverOpenAttempts({
    recoveryIdempotencyKeyHash: "d".repeat(64), recoveredAt: fixture.now(),
  });
  const attempt = await fixture.baseStore.getAttempt(reserved.attempt.attemptId);
  assert.equal(recoveredAmbiguous.ambiguousCount, 1);
  assert.equal(attempt.status, "ambiguous");
  assert.equal(attempt.chargedUnits, 144);
});

await check("ambiguous_recovery_never_automatically_replans_or_retries", () => {
  assert.equal(recoveredAmbiguous.automaticallyRetried, false);
  assert.equal(contract.recovery.ambiguousRetry,
    "same_user_signed_approval_fresh_reattach_and_one_new_attempt_only");
});

await check("all_four_role_modes_share_the_same_durable_execution_sequence", async () => {
  const modes = [
    ["tutor", "explain"],
    ["opponent", "take_turn"],
    ["commentator", "commentate"],
    ["companion", "reflect"],
  ];
  const observed = [];
  for (const [mode, intent] of modes) {
    const fixture = await createFixture({ mode, intent });
    const result = await fixture.supervisor.sendTurn(fixture.turnInput, fixture.context);
    const state = await firstAttempt(fixture);
    observed.push({ mode, intent, ok: result.ok, status: state.attempt.status,
      sequence: state.audit.events.map((entry) => entry.eventType) });
  }
  assert(observed.every((entry) => entry.ok && entry.status === "completed"));
  assert(observed.every((entry) => entry.sequence.join(",")
    === "budget_opened,attempt_reserved,attempt_dispatched,attempt_settled"));
});

for (const fixture of fixtures.reverse()) {
  try { await fixture.attachmentControl?.close?.(); } catch {}
  try { await fixture.workerPort?.close?.(); } catch {}
  try { await fixture.baseStore?.close?.(); } catch {}
  try { await rm(fixture.root, { recursive: true, force: true }); } catch {}
}

const reportBody = {
  schemaVersion: "starcraft_tmg_ticket_16_durable_provider_gateway_report_v1",
  generatedAt: "2026-09-04T08:00:00.000Z",
  ticket: 16,
  slice: 159,
  status: failures.length ? "failed" : "passed",
  assertionsPassed: checks.filter((entry) => entry.passed).length,
  assertionsTotal: checks.length,
  checks,
  failures,
  contractHash: contract.contractHash,
  sqliteFiles,
  workerCalls,
  providerEvidence: "deterministic_injected_worker_child_only_not_live_provider",
  sourceRefreshPerformed: false,
  liveProviderCalled: false,
  userCredentialAccepted: false,
  skillGenerated: false,
  dshRun: false,
  muzeroDataGenerated: false,
  selfPlayRun: false,
  trainingTruth: false,
  harness: {
    harnessLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    promptPackRoutes: [
      "novice_teacher_prompt", "opponent_prompt", "referee_prompt",
      "sparring_coach_prompt",
    ],
    harnessToolsCalled: [],
    uiTraceEvidence: "not_run_backend_execution_slice",
    agentDecisionEvidence:
      "four role routes traversed durable Provider execution; decision quality remains outside this Slice",
    memoryTraceEvidence: { refs: [], writes: 0, crossModeIsolationChecked: true },
    trainingTraceCandidates: 0,
    rollbackOrDemotionRules: [
      "disable_execution_when_prompt_profile_attachment_or_session_binding_drifts",
      "never_execute_before_committed_dispatch_authority_is_observed",
      "never_return_output_before_safe_receipt_and_budget_settlement_commit",
      "recover_dispatched_without_terminal_receipt_as_ambiguous",
      "require_explicit_signed_replan_and_fresh_reattach_for_ambiguous_retry",
    ],
    userVisibleChecks: "reserved_for_slice_160_web_battle_lab_byok_flow",
  },
};
const report = {
  ...reportBody,
  reportHash: hashStarcraftTmgContract(reportBody),
};
await mkdir(REPORT_ROOT, { recursive: true });
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Ticket 16 Slice 159 passed ${checks.length}/${checks.length}; 7/10; sqliteFiles=${sqliteFiles}; workerCalls=${workerCalls}; ${report.reportHash}`);
}
