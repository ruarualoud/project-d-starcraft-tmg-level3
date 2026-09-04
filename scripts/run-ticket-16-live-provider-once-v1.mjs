#!/usr/bin/env node

import { open, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  STARCRAFT_TMG_TICKET_16_LIVE_PROVIDER_CLOSURE_V1 as contract,
  STARCRAFT_TMG_TICKET_16_LIVE_PROVIDER_PROFILE_V1 as providerProfile,
} from "../content/provider/ticket-16-live-provider-closure-v1.mjs";
import { createKerriganPrimalProductBundleV1 } from
  "../content/characters/kerrigan-primal-v1.mjs";
import { createGameRoleBinding } from
  "../packages/character-agent/contracts-v1.mjs";
import { getStarcraftTmgModeCapability } from
  "../packages/character-agent/mode-capability-v1.mjs";
import { assembleStarcraftTmgRolePrompt } from
  "../packages/character-agent/prompt-assembly-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
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
import {
  priceStarcraftTmgDeepSeekV4FlashUsageV1,
  verifyStarcraftTmgProviderPricingReceiptV1,
} from "../packages/secure-provider-runtime/provider-pricing-v1.mjs";
import { createStarcraftTmgProviderProfileRegistryV1 } from
  "../packages/secure-provider-runtime/provider-profile-registry-v1.mjs";
import { createStarcraftTmgProviderEgressWorkerPortV1 } from
  "../packages/secure-provider-runtime/provider-egress-worker-port-v1.mjs";
import { createSqliteStarcraftTmgProviderAttemptStoreV1 } from
  "../packages/secure-provider-runtime/sqlite-provider-attempt-store-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_ROOT = path.join(ROOT,
  "build/ticket-16-slice-162-live-provider-v1");
const REPORT_PATH = path.join(REPORT_ROOT, "live-report.json");
const LOCK_PATH = path.join(REPORT_ROOT, "one-call-attempt.lock.json");
const SQLITE_PATH = path.join(REPORT_ROOT, "provider-attempts.sqlite");
const BROWSER_REPORT_PATH = path.join(ROOT,
  "build/ticket-16-slice-161-browser-aggregate-v1/browser-report.json");
const MAX_STDIN_BYTES = 8_194;
const REQUIRED_FLAGS = new Set(contract.liveAuthority.explicitFlags);
const BROWSER_SEMANTIC_HASH =
  "be6435cbb723a3a4c6007fe95220f2701b784df623ac54d52c6d9f7d26714452";

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function seal(body, field) {
  const value = clone(body);
  return Object.freeze({ ...value, [field]: hashStarcraftTmgContract(value) });
}

function safeCode(error, fallback = "LIVE_PROVIDER_RUN_FAILED") {
  const value = String(error?.code || error?.reason || "").toUpperCase();
  return /^[A-Z][A-Z0-9_]{2,79}$/u.test(value) ? value : fallback;
}

function requireCondition(condition, code) {
  if (!condition) throw Object.assign(new Error(code), { code });
}

function browserSemanticEvidence(report) {
  return {
    schemaVersion: report.schemaVersion,
    generatedAt: report.generatedAt,
    ticket: report.ticket,
    slice: report.slice,
    status: report.status,
    assertionsPassed: report.assertionsPassed,
    assertionsTotal: report.assertionsTotal,
    checks: report.checks,
    artifactPaths: report.artifacts.map((entry) => entry.path),
    denominator: report.denominator,
    environment: report.environment,
    network: report.network,
    boundaries: report.boundaries,
  };
}

function flagsAuthorized() {
  const flags = process.argv.slice(2);
  return flags.length === REQUIRED_FLAGS.size
    && flags.every((flag) => REQUIRED_FLAGS.has(flag));
}

async function priorSuccessfulReceiptExists() {
  try {
    const report = JSON.parse(await readFile(REPORT_PATH, "utf8"));
    return report?.status === "passed"
      && report?.contractHash === contract.contractHash;
  } catch {
    return false;
  }
}

async function priorAttemptClaimExists() {
  try {
    await readFile(LOCK_PATH);
    return true;
  } catch (error) {
    return error?.code !== "ENOENT";
  }
}

async function readCredentialBytes() {
  requireCondition(!process.stdin.isTTY, "LIVE_CREDENTIAL_BINARY_PIPE_REQUIRED");
  const chunks = [];
  let length = 0;
  try {
    for await (const rawChunk of process.stdin) {
      const chunk = Buffer.from(rawChunk);
      length += chunk.byteLength;
      if (length > MAX_STDIN_BYTES) {
        chunk.fill(0);
        throw Object.assign(new Error("LIVE_CREDENTIAL_TOO_LARGE"), {
          code: "LIVE_CREDENTIAL_TOO_LARGE",
        });
      }
      chunks.push(chunk);
    }
    const joined = Buffer.concat(chunks);
    for (const chunk of chunks) chunk.fill(0);
    let end = joined.byteLength;
    while (end > 0 && (joined[end - 1] === 0x0a || joined[end - 1] === 0x0d)) {
      end -= 1;
    }
    const credential = Buffer.from(joined.subarray(0, end));
    joined.fill(0);
    requireCondition(credential.byteLength >= 8
      && credential.byteLength <= 8_192
      && credential.every((byte) => byte >= 0x21 && byte <= 0x7e),
    "LIVE_CREDENTIAL_BYTES_INVALID");
    return credential;
  } catch (error) {
    for (const chunk of chunks) chunk.fill(0);
    throw error;
  }
}

async function claimOneAttempt(runId, startedAt) {
  await mkdir(REPORT_ROOT, { recursive: true, mode: 0o700 });
  let handle;
  try {
    handle = await open(LOCK_PATH, "wx", 0o600);
  } catch (error) {
    throw Object.assign(new Error("LIVE_PROVIDER_ATTEMPT_ALREADY_CLAIMED"), {
      code: "LIVE_PROVIDER_ATTEMPT_ALREADY_CLAIMED",
      cause: error,
    });
  }
  const body = {
    schemaVersion: "starcraft_tmg_ticket_16_live_attempt_lock_v1",
    runId,
    contractHash: contract.contractHash,
    startedAt,
    automaticRetryAllowed: false,
    ambiguousOutcomeNeedsNewUserAuthorization: true,
    trainingTruth: false,
  };
  await handle.writeFile(`${JSON.stringify({
    ...body,
    lockHash: hashStarcraftTmgContract(body),
  }, null, 2)}\n`, "utf8");
  await handle.close();
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

function profileRef() {
  return Object.freeze({
    id: providerProfile.providerProfileId,
    version: providerProfile.version,
    hash: providerProfile.integrity.hash,
  });
}

function createPromptArtifact(bundle, session) {
  const mode = "tutor";
  const intent = "explain";
  const capability = getStarcraftTmgModeCapability(mode);
  const binding = createGameRoleBinding({
    bindingId: `${session.sessionId}.live-prompt-binding`,
    characterPackage: bundle.characterPackage,
    roleSkillPack: bundle.roleSkillPacks[mode],
    conversationProfile: bundle.conversationProfile,
    providerProfile,
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
      schemaVersion: "starcraft_tmg_live_minimal_room_projection_v1",
      roomId: session.binding.roomId,
      stateRevision: 0,
      stateHash: "2".repeat(64),
      viewerSide: session.binding.seatKey,
      trainingTruth: false,
    },
  });
  const responseContract = seal({
    schemaVersion: "starcraft_tmg_online_role_turn_runtime_v1.response-contract",
    outputSchemaVersion: "starcraft_tmg_online_role_output_v1",
    mode,
    intent,
    allowedChannels: ["teaching"],
    requiredChannels: ["teaching"],
    topLevelFields: [
      "schemaVersion", "channels", "visualCue", "evidenceRefIds",
    ],
    evidenceRefs: [],
    requiredEvidenceKinds: [],
    decisionCandidateSource: "forbidden",
    strategyMemoryRefs: [],
    strategyMemoryIsAdvisory: true,
    mayPreview: false,
    mayConfirm: false,
    mayApply: false,
    confirmationOwner: null,
    rulesAuthority: "external_rules_service",
    eligibleForTraining: false,
    trainingTruth: false,
  }, "contractHash");
  const userMessage =
    "请用一句简短中文说明：副官已完成安全连接测试。只返回符合约定的 JSON 对象，并将文本放在 channels.teaching.text。";
  const userNode = seal({
    nodeType: "user-message",
    authority: "user",
    content: { intent, text: userMessage },
  }, "nodeHash");
  const responseNode = seal({
    nodeType: "response-contract",
    authority: "platform",
    content: responseContract,
  }, "nodeHash");
  const nodes = [...base.nodes, userNode, responseNode];
  const receipt = seal({
    schemaVersion: "starcraft_tmg_online_role_context_runtime_v1.prompt-receipt",
    sessionId: session.sessionId,
    sessionBindingHash: session.binding.sessionBindingHash,
    mode,
    intent,
    nodeHashes: nodes.map((entry) => entry.nodeHash),
    responseContractHash: responseContract.contractHash,
    rulesAuthority: "external_rules_service",
    trainingTruth: false,
  }, "receiptHash");
  const artifact = seal({
    schemaVersion: "starcraft_tmg_online_role_context_runtime_v1.prompt-artifact",
    sessionId: session.sessionId,
    sessionBindingHash: session.binding.sessionBindingHash,
    promptPack: capability.promptPack,
    nodes,
    responseContract,
    receipt,
    retentionPolicy: "ephemeral_release_after_supervised_turn",
    eligibleForTraining: false,
    trainingTruth: false,
  }, "promptArtifactHash");
  return { artifact, responseContract };
}

export async function composeStarcraftTmgTicket16LiveRunV1(runId,
  options = {}) {
  const bundle = createKerriganPrimalProductBundleV1();
  const roomId = `slice-162-live-room-${runId}`;
  const principalRef = `slice-162-live-principal-${runId}`;
  const principalScopeHash = hashStarcraftTmgContract({ roomId, principalRef });
  const principalBinding = createStarcraftTmgOnlinePrincipalBindingV1({
    roomId,
    principalScopeHash,
    seatKey: "player1",
    principalType: "human",
    principalRoleMode: "player",
    bindingRevision: 1,
    allowedAgentModes: ["tutor"],
    characterId: bundle.characterPackage.characterId,
    characterPackageHash: bundle.characterPackage.integrity.hash,
    characterSelectionHash: hashStarcraftTmgContract({
      roomId, characterId: bundle.characterPackage.characterId,
    }),
    roomBinding: roomBinding(),
  });
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
    createId() { return `slice-162-live-session-${runId}`; },
  });
  const created = await lifecycle.createSession({
    roomId,
    mode: "tutor",
    characterId: bundle.characterPackage.characterId,
  }, { principalSessionRef: principalRef });
  requireCondition(created.ok === true, "LIVE_SESSION_CREATE_FAILED");
  const session = created.session;
  const registry = createStarcraftTmgProviderProfileRegistryV1({
    entries: [{ providerProfile, completionPath: "/chat/completions" }],
    allowedProviders: ["deepseek-openai-compatible-direct"],
  });
  const coreWorker = createStarcraftTmgProviderEgressWorkerPortV1({
    providerProfileRegistry: registry,
    maxWorkers: 1,
    maxOutputBytes: 64 * 1024,
    handshakeTimeoutMs: 5_000,
    shutdownGraceMs: 1_000,
  });
  const observation = {
    completeCalls: 0,
    successReceipt: null,
    failureReceipt: null,
  };
  const workerPort = Object.freeze({
    metadata: (...args) => coreWorker.metadata(...args),
    attachCredential: (...args) => coreWorker.attachCredential(...args),
    async complete(...args) {
      observation.completeCalls += 1;
      try {
        const result = await coreWorker.complete(...args);
        observation.successReceipt = clone(result.usageReceipt);
        return result;
      } catch (error) {
        observation.failureReceipt = clone(error?.safeReceipt || null);
        throw error;
      }
    },
    detachCredential: (...args) => coreWorker.detachCredential(...args),
    readWorkerState: (...args) => coreWorker.readWorkerState(...args),
    close: (...args) => coreWorker.close(...args),
  });
  const sqlitePath = options.sqlitePath || SQLITE_PATH;
  await mkdir(path.dirname(sqlitePath), { recursive: true, mode: 0o700 });
  const store = createSqliteStarcraftTmgProviderAttemptStoreV1({
    filename: sqlitePath,
  });
  let supervisorCore;
  const readProviderState = (...args) => supervisorCore.readState(...args);
  const executionScope = createStarcraftTmgProviderGatewayExecutionScopeV1({
    sessionLifecycle: lifecycle,
    readProviderState,
  });
  const attachmentControl = createStarcraftTmgSecureProviderAttachmentControlV1({
    sessionLifecycle: lifecycle,
    providerSupervisor: { readState: readProviderState },
    providerProfileRegistry: registry,
    credentialAttachmentPort: workerPort,
    maxAttachmentRecords: 2,
    attachmentTtlMs: 10 * 60_000,
  });
  const promptStore = createInMemoryStarcraftTmgPromptArtifactStoreV1({
    maxArtifacts: 2,
    maxArtifactBytes: 2 * 1024 * 1024,
  });
  const durableGateway = createStarcraftTmgDurableProviderGatewayRuntimeV1({
    attemptStore: store,
    promptArtifactStore: promptStore,
    attachmentControl,
    workerPort,
    executionAuthorityPort: executionScope,
  });
  const budgetPolicy = {
    maxTotalUnits: 20_000,
    maxTurns: 1,
    maxInputUnitsPerTurn: 19_936,
    maxOutputUnitsPerTurn: 64,
    timeoutMs: 150_000,
  };
  supervisorCore = createStarcraftTmgProviderGatewaySupervisorV1({
    sessionLifecycle: lifecycle,
    providerGateway: durableGateway,
    gatewayEvidence: "live_durable_isolated_provider_worker",
    budgetPolicy,
  });
  const supervisor = executionScope.wrapSupervisor(supervisorCore);
  await durableGateway.initialize({
    recoveryIdempotencyKeyHash: hashStarcraftTmgContract({
      runId, kind: "slice-162-live-startup-recovery",
    }),
    recoveredAt: options.recoveredAt || new Date().toISOString(),
  });
  return {
    bundle, roomId, principalRef, lifecycle, session, registry, workerPort,
    coreWorker, observation, store, attachmentControl, promptStore,
    durableGateway, supervisor,
    context: { principalSessionRef: principalRef },
  };
}

async function findDurableState(runtime) {
  const budgetId = `sc-provider-budget-${hashStarcraftTmgContract({
    principalScopeHash: runtime.session.binding.principalScopeHash,
    sessionBindingHash: runtime.session.binding.sessionBindingHash,
  })}`;
  const audit = await runtime.store.readAudit({
    budgetId, afterSequence: 0, limit: 20,
  });
  const attemptId = audit.events.find((event) => event.attemptId)?.attemptId;
  const [budget, attempt] = await Promise.all([
    runtime.store.getBudget(budgetId),
    attemptId ? runtime.store.getAttempt(attemptId) : null,
  ]);
  return { budgetId, budget, attempt, audit };
}

async function writeSafeFailure(code, runId, startedAt, observation) {
  const reportBody = {
    schemaVersion: "starcraft_tmg_ticket_16_live_provider_report_v1",
    ticket: 16,
    slice: 162,
    status: "failed",
    runId,
    contractHash: contract.contractHash,
    startedAt,
    failedAt: new Date().toISOString(),
    failureCode: code,
    providerPhysicalAttemptsObserved:
      observation?.failureReceipt?.physicalAttempts ?? null,
    automaticRetries: 0,
    rerunAllowedAutomatically: false,
    rawCredentialPersisted: false,
    rawPromptPersisted: false,
    rawResponsePersisted: false,
    reasoningPersisted: false,
    trainingTruth: false,
    ticketComplete: false,
  };
  await mkdir(REPORT_ROOT, { recursive: true, mode: 0o700 });
  await writeFile(REPORT_PATH, `${JSON.stringify({
    ...reportBody,
    reportHash: hashStarcraftTmgContract(reportBody),
  }, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
}

async function main() {
  if (!flagsAuthorized()) {
    console.error("LIVE_PROVIDER_EXPLICIT_AUTHORIZATION_REQUIRED");
    process.exitCode = 2;
    return;
  }
  if (await priorSuccessfulReceiptExists()) {
    console.error("LIVE_PROVIDER_SUCCESS_ALREADY_RECORDED");
    process.exitCode = 2;
    return;
  }
  if (await priorAttemptClaimExists()) {
    console.error("LIVE_PROVIDER_ATTEMPT_ALREADY_CLAIMED");
    process.exitCode = 2;
    return;
  }
  const startedAt = new Date().toISOString();
  const runId = randomUUID();
  let credentialBytes = null;
  let runtime = null;
  let attachment = null;
  try {
    credentialBytes = await readCredentialBytes();
    await claimOneAttempt(runId, startedAt);
    runtime = await composeStarcraftTmgTicket16LiveRunV1(runId);
    const prepared = await runtime.attachmentControl.prepareAttachment({
      roomId: runtime.roomId,
      sessionId: runtime.session.sessionId,
      expectedConnectionEpoch: runtime.session.connection.epoch,
      providerProfileRef: profileRef(),
      disclosureNoticeVersion: STARCRAFT_TMG_PROVIDER_DISCLOSURE_NOTICE_VERSION,
      consentAccepted: true,
    }, runtime.context);
    requireCondition(prepared.ok === true, "LIVE_PROVIDER_PREPARE_FAILED");
    attachment = prepared.attachment;
    const attached = await runtime.attachmentControl.attachCredentialBytes({
      roomId: runtime.roomId,
      sessionId: runtime.session.sessionId,
      expectedConnectionEpoch: runtime.session.connection.epoch,
      attachmentId: attachment.attachmentId,
      ingressNonce: prepared.ingress.nonce,
      credentialBytes,
    }, runtime.context);
    requireCondition(attached.ok === true, "LIVE_PROVIDER_ATTACH_FAILED");
    requireCondition(credentialBytes.every((byte) => byte === 0),
      "LIVE_PARENT_CREDENTIAL_NOT_ZEROED");
    const { artifact, responseContract } = createPromptArtifact(
      runtime.bundle, runtime.session);
    const stored = runtime.promptStore.put({
      sessionId: runtime.session.sessionId,
      sessionBindingHash: runtime.session.binding.sessionBindingHash,
      artifact,
    });
    requireCondition(stored.ok === true, "LIVE_PROMPT_STORE_FAILED");
    const boundedBody = {
      schemaVersion: "starcraft_tmg_bounded_provider_request_v1",
      intent: "explain",
      requestPayloadHash: artifact.promptArtifactHash,
      inputUnits: 19_936,
      maxOutputUnits: 64,
    };
    const result = await runtime.supervisor.sendTurn({
      sessionId: runtime.session.sessionId,
      roomId: runtime.roomId,
      expectedConnectionEpoch: runtime.session.connection.epoch,
      providerProfileRef: profileRef(),
      promptAssemblyRef: stored.ref,
      boundedRequest: {
        ...boundedBody,
        requestHash: hashStarcraftTmgContract(boundedBody),
      },
      responseContract: {
        id: "starcraft-tmg.tutor.explain.live-minimal-response.v1",
        version: "1.0.0",
        hash: responseContract.contractHash,
      },
    }, runtime.context);
    requireCondition(result.ok === true, safeCode(result,
      "LIVE_PROVIDER_TURN_FAILED"));
    requireCondition(typeof result.output?.channels?.teaching?.text === "string"
      && result.output.channels.teaching.text.length > 0,
    "LIVE_PROVIDER_OUTPUT_CONTRACT_REJECTED");
    const providerReceipt = runtime.observation.successReceipt;
    requireCondition(runtime.observation.completeCalls === 1,
      "LIVE_PROVIDER_ATTEMPT_DENOMINATOR_DRIFT");
    requireCondition(providerReceipt?.physicalAttempts === 1
      && providerReceipt.automaticRetries === 0,
    "LIVE_PROVIDER_PHYSICAL_ATTEMPT_DRIFT");
    requireCondition(providerReceipt.requestedModel === providerProfile.model
      && providerReceipt.reportedModel === providerProfile.model,
    "LIVE_PROVIDER_REPORTED_MODEL_DRIFT");
    requireCondition(/^[a-f0-9]{64}$/u.test(
      String(providerReceipt.providerSystemFingerprintHash || "")),
    "LIVE_PROVIDER_SYSTEM_FINGERPRINT_MISSING");
    const pricingReceipt = priceStarcraftTmgDeepSeekV4FlashUsageV1({
      providerId: providerReceipt.providerId,
      requestedModel: providerReceipt.requestedModel,
      reportedModel: providerReceipt.reportedModel,
      startedAt: providerReceipt.startedAt,
      usage: providerReceipt.usage,
    });
    requireCondition(verifyStarcraftTmgProviderPricingReceiptV1(pricingReceipt),
      "LIVE_PROVIDER_PRICING_RECEIPT_INVALID");
    const durable = await findDurableState(runtime);
    requireCondition(durable.attempt?.status === "completed"
      && durable.attempt.usageKnown === true
      && durable.attempt.reportedInputUnits === providerReceipt.usage.inputUnits
      && durable.attempt.reportedOutputUnits === providerReceipt.usage.outputUnits,
    "LIVE_DURABLE_SETTLEMENT_DRIFT");
    const browserReport = JSON.parse(await readFile(BROWSER_REPORT_PATH, "utf8"));
    const browserSemanticHash = hashStarcraftTmgContract(
      browserSemanticEvidence(browserReport));
    requireCondition(browserReport.status === "passed"
      && browserReport.assertionsPassed === 16
      && browserReport.assertionsTotal === 16
      && browserSemanticHash === BROWSER_SEMANTIC_HASH,
    "LIVE_BROWSER_EVIDENCE_DRIFT");
    const responseFingerprint = providerReceipt.responseFingerprint;
    await runtime.attachmentControl.detachAttachment({
      roomId: runtime.roomId,
      sessionId: runtime.session.sessionId,
      expectedConnectionEpoch: runtime.session.connection.epoch,
      attachmentId: attachment.attachmentId,
    }, runtime.context);
    attachment = null;
    const reportBody = {
      schemaVersion: "starcraft_tmg_ticket_16_live_provider_report_v1",
      ticket: 16,
      slice: 162,
      status: "passed",
      runId,
      contractHash: contract.contractHash,
      userAuthorization: {
        explicitOneCallFlag: true,
        rotatedAfterChatExposureAttested: true,
        credentialIngress: "anonymous_stdin_binary_pipe_only",
      },
      provider: {
        providerId: providerReceipt.providerId,
        requestedModel: providerReceipt.requestedModel,
        reportedModel: providerReceipt.reportedModel,
        officialModelRelease:
          contract.officialProviderEvidence.officialModelRelease,
        providerSystemFingerprintHash:
          providerReceipt.providerSystemFingerprintHash,
        providerRequestIdHash: providerReceipt.providerRequestIdHash,
      },
      network: {
        status: providerReceipt.status,
        dnsAddressSetHash: providerReceipt.dnsAddressSetHash,
        tlsServerName: providerReceipt.tlsServerName,
        tlsCertificateVerificationDisabled: false,
        redirectFollowed: false,
        proxyUsed: false,
        physicalAttempts: providerReceipt.physicalAttempts,
        automaticRetries: providerReceipt.automaticRetries,
      },
      usage: clone(providerReceipt.usage),
      pricing: clone(pricingReceipt),
      responseFingerprint,
      safeProviderReceiptHash: providerReceipt.receiptHash,
      durable: {
        attemptRecordHash: hashStarcraftTmgContract(durable.attempt),
        budgetRecordHash: hashStarcraftTmgContract(durable.budget),
        auditChainHash: hashStarcraftTmgContract(durable.audit),
        status: durable.attempt.status,
        usageKnown: durable.attempt.usageKnown,
        chargedUnits: durable.attempt.chargedUnits,
      },
      browserEvidence: {
        sourceSlice: 161,
        reportHash: browserReport.reportHash,
        semanticEvidenceHash: browserSemanticHash,
        safeStates: ["error", "attached", "refresh", "detached"],
      },
      startedAt,
      finishedAt: providerReceipt.finishedAt,
      parentCredentialZeroed: true,
      credentialPersisted: false,
      credentialHashPersisted: false,
      rawPromptPersisted: false,
      rawResponsePersisted: false,
      reasoningPersisted: false,
      skillGenerated: false,
      dshRun: false,
      muzeroDataGenerated: false,
      selfPlayRun: false,
      trainingTruth: false,
      ticketComplete: true,
    };
    const report = {
      ...reportBody,
      reportHash: hashStarcraftTmgContract(reportBody),
    };
    await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    console.log(`Ticket 16 Slice 162 live Provider passed; model=${providerReceipt.reportedModel}; input=${providerReceipt.usage.inputUnits}; output=${providerReceipt.usage.outputUnits}; costUsd=${pricingReceipt.calculatedCostUsd}; ${report.reportHash}`);
  } catch (error) {
    const terminalCode = safeCode(error);
    if (runtime && await priorSuccessfulReceiptExists() === false) {
      await writeSafeFailure(terminalCode, runId, startedAt,
        runtime.observation).catch(() => {});
    }
    console.error(terminalCode);
    process.exitCode = 1;
  } finally {
    credentialBytes?.fill(0);
    if (runtime && attachment) {
      await runtime.attachmentControl.detachAttachment({
        roomId: runtime.roomId,
        sessionId: runtime.session.sessionId,
        expectedConnectionEpoch: runtime.session.connection.epoch,
        attachmentId: attachment.attachmentId,
      }, runtime.context).catch(() => {});
    }
    await runtime?.attachmentControl.close().catch(() => {});
    await runtime?.coreWorker.close().catch(() => {});
    await runtime?.store.close().catch(() => {});
  }
}

if (process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
