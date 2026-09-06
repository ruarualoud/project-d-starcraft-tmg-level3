#!/usr/bin/env node

import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as profile } from
  "../content/skill-generation/offline-provider-profile-v1.mjs";
import {
  STARCRAFT_TMG_FACTION_ADVICE_EDITOR_OUTPUT_CONTRACT_V1 as contract,
  STARCRAFT_TMG_FACTION_ADVICE_EDITOR_OUTPUT_CONTRACT_REF_V1 as contractRef,
} from "../content/skill-generation/ticket-18-faction-advice-editor-output-contract-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { readStarcraftTmgDeepSeekCredentialFromKeychainV1 } from
  "../packages/secure-provider-runtime/keychain-credential-ingress-v1.mjs";
import { priceStarcraftTmgDeepSeekV4FlashUsageV1 } from
  "../packages/secure-provider-runtime/provider-pricing-v1.mjs";
import { createStarcraftTmgProviderProfileRegistryV2 } from
  "../packages/secure-provider-runtime/provider-profile-registry-v2.mjs";
import { createStarcraftTmgStructuredProviderWorkerPortV1 } from
  "../packages/secure-provider-runtime/structured-provider-worker-port-v1.mjs";
import { prepareDshLoop } from "../packages/skill-production/loops.mjs";
import { hash, seal, sha256, verifySeal, fail } from
  "../packages/skill-production/common.mjs";
import { openProductionStore } from "../packages/skill-production/store.mjs";
import {
  applyFactionStrategyPatchV1,
  createFactionWritingPlanV1,
  normalizeFactionStrategyPatchEnvelopeV1,
} from "../packages/skill-production-v3/faction-strategy-workflow-v1.mjs";
import {
  createFactionLocalEditorContextCapsuleV1,
  isolateFactionLocalEditorIssueV1,
} from "../packages/skill-production-v3/faction-local-editor-context-capsule-v1.mjs";
import {
  createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1,
  STARCRAFT_TMG_STRUCTURED_PROVIDER_REQUEST_VERSION,
} from "../packages/structured-generation/adapters/deepseek-responses-json-schema-v1.mjs";
import {
  contextManifestRefStarcraftTmgV1,
  createStarcraftTmgContextCapsuleRegistryV1,
} from "../packages/structured-generation/context-capsule-v1.mjs";
import {
  createStarcraftTmgStructuredDshModelBridgeV1,
  mapStarcraftTmgStructuredFinishToDshCommandV1,
} from "../packages/structured-generation/dsh-command-mapper-v1.mjs";
import { classifyStarcraftTmgStructuredFailureV1 } from
  "../packages/structured-generation/failure-classifier-v1.mjs";
import { createStarcraftTmgOutputContractRegistryV1 } from
  "../packages/structured-generation/output-contract-registry-v1.mjs";
import { verifyStarcraftTmgProviderCapabilityCurrentV1 } from
  "../packages/structured-generation/provider-capability-receipt-v1.mjs";
import { createStarcraftTmgStructuredGenerationRuntimeV1 } from
  "../packages/structured-generation/structured-generation-runtime-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DB_PATH = path.join(ROOT,
  "build/ticket-17-production-redesign-v1/production.sqlite");
const BUILD_ROOT = path.join(ROOT, "build/ticket-18-structured-generation-v1");
const HISTORICAL_TOKENS_OUTSIDE_DATABASE = 2_864_424;
const HISTORICAL_MICROS_OUTSIDE_DATABASE = 5_052_393 + 28_961_350;
const OLD_EDITOR_INPUT_TOKENS = 271_803;
const PROBE_TOKEN_CAP = 50_000;
const PROBE_COST_MICROS_CAP = 100_000;
const CODE_FILES = [
  "packages/structured-generation/output-contract-registry-v1.mjs",
  "packages/structured-generation/provider-capability-receipt-v1.mjs",
  "packages/structured-generation/adapters/deepseek-responses-json-schema-v1.mjs",
  "packages/structured-generation/structured-generation-runtime-v1.mjs",
  "packages/structured-generation/dsh-command-mapper-v1.mjs",
  "packages/structured-generation/context-capsule-v1.mjs",
  "packages/structured-generation/failure-classifier-v1.mjs",
  "packages/secure-provider-runtime/provider-egress-contract-v2.mjs",
  "packages/secure-provider-runtime/provider-profile-registry-v2.mjs",
  "packages/secure-provider-runtime/structured-provider-egress-transport-v1.mjs",
  "packages/secure-provider-runtime/structured-provider-worker-child-v1.mjs",
  "packages/secure-provider-runtime/structured-provider-worker-port-v1.mjs",
  "packages/skill-production-v3/faction-local-editor-context-capsule-v1.mjs",
  "content/skill-generation/ticket-18-faction-advice-editor-output-contract-v1.mjs",
  "scripts/run-ticket-18-structured-generation-canary-v1.mjs",
];

function safeCode(error) {
  const code = String(error?.code || error?.message || "STRUCTURED_CANARY_FAILED");
  return /^[A-Z0-9_.:-]{3,160}$/u.test(code)
    ? code : "STRUCTURED_CANARY_FAILED";
}

function usageCostMicros(usage, receipt = {}) {
  try {
    const priced = priceStarcraftTmgDeepSeekV4FlashUsageV1({
      providerId: "deepseek-openai-compatible-direct",
      requestedModel: receipt.requestedModel || profile.model,
      reportedModel: receipt.reportedModel || profile.model,
      startedAt: receipt.startedAt,
      usage,
    });
    return Math.ceil(priced.calculatedCostNanoUsd * 8 / 1_000);
  } catch {
    return Math.ceil((usage.inputUnits * 440 + usage.outputUnits * 1_320)
      * 8 / 1_000);
  }
}

function readHistoricalArtifact(db, runId, stepId) {
  const row = db.prepare(
    "SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'",
  ).get(runId, stepId);
  if (!row) fail("STRUCTURED_CANARY_HISTORICAL_ARTIFACT_MISSING");
  return verifySeal(JSON.parse(row.artifact)).value;
}

async function attachWorker(registry, prefix) {
  const port = createStarcraftTmgStructuredProviderWorkerPortV1({
    providerProfileRegistry: registry,
  });
  let ingress;
  try {
    ingress = await readStarcraftTmgDeepSeekCredentialFromKeychainV1();
    const attached = await port.attachCredential({
      attachmentId: `${prefix}-${randomUUID()}`,
      providerProfile: profile,
      credentialBytes: ingress.credentialBytes,
    });
    if (!attached.ok) fail("PROVIDER_ATTACHMENT_FAILED");
    return { port, attached, ingressReceipt: ingress.receipt };
  } catch (error) {
    await port.close().catch(() => {});
    throw error;
  } finally {
    ingress?.credentialBytes?.fill(0);
  }
}

async function detachWorker(worker, reason) {
  if (!worker) return;
  await worker.port.detachCredential({ workerRef: worker.attached.workerRef,
    reason }).catch(() => {});
  await worker.port.close().catch(() => {});
}

function adapterForWorker(worker, onSend = () => {}) {
  return createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1({
    send: (request) => {
      onSend();
      return worker.port.send({
        workerRef: worker.attached.workerRef,
        ...request,
      });
    },
  });
}

const db = new DatabaseSync(DB_PATH, { readOnly: true });
let factionInput;
let sourceJournal;
let corrected;
let preflightDatabase;
try {
  preflightDatabase = {
    runningIntentCount: db.prepare(
      "SELECT count(*) count FROM attempts WHERE state='intent'",
    ).get().count,
    paymentRequiredCount: db.prepare(
      "SELECT count(*) count FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'",
    ).get().count,
  };
  if (preflightDatabase.runningIntentCount !== 0) {
    fail("AMBIGUOUS_EGRESS_NO_RETRY");
  }
  if (preflightDatabase.paymentRequiredCount !== 0) {
    fail("API_BALANCE_EXHAUSTED_STOP_ALL_WORK");
  }
  sourceJournal = readHistoricalArtifact(db,
    "faction-v1-9a88d1a1008f0bb079ba",
    "faction.terran_armed_forces.objectives.1.issue-journal.0");
  corrected = readHistoricalArtifact(db,
    "faction-v1-9a88d1a1008f0bb079ba",
    "faction.terran_armed_forces.objectives.1.known-rule-correction");
} finally {
  db.close();
}
factionInput = verifySeal(JSON.parse(await readFile(path.join(ROOT,
  "build/ticket-18-faction-production-v1/terran_armed_forces-input.json"),
"utf8")));
const localIssues = isolateFactionLocalEditorIssueV1({
  issues: sourceJournal.issues,
  issueOrdinal: 1,
});
const section = createFactionWritingPlanV1(factionInput).sections.find((row) =>
  row.id === "faction.terran_armed_forces.objectives.1");
if (!section || hash(corrected.draft) !== localIssues.parentHash) {
  fail("STRUCTURED_CANARY_LOCAL_ISSUE_DRIFT");
}
const roleRef = {
  id: "faction.terran_armed_forces.objectives.1.editor.0.1",
  version: "structured-v1",
  hash: hash("faction.terran_armed_forces.objectives.1.editor.0.1.structured-v1"),
};
const capsule = createFactionLocalEditorContextCapsuleV1({
  factionInput,
  section,
  draft: corrected.draft,
  issues: localIssues,
  issueOrdinal: 0,
  roleRef,
  outputContractRef: contractRef,
});
const contextManifestRef = contextManifestRefStarcraftTmgV1(capsule);
const executionPolicy = Object.freeze({
  maxOutputUnits: 2_048,
  attemptEstimateMicros: 500_000,
  attemptTokenReserve: 90_000,
  allowDefinitelyNotSentRetry: false,
  allowOneCapacityRetry: false,
  idempotentRetrySupported: false,
  encryptedRawQuarantineAvailable: false,
});
const executionPolicyRef = {
  id: "policy.faction-local-editor.structured-canary",
  version: "2026.09.06.1",
  hash: hash(executionPolicy),
};
const codeHashes = await Promise.all(CODE_FILES.map(async (file) => ({
  file,
  sha256: sha256(await readFile(path.join(ROOT, file))),
})));
const recipe = seal({
  version: "ticket_18_slice_174_structured_generation_canary_v1",
  ticket: 18,
  slice: 174,
  workpoint: "174-R5",
  roleRef,
  contextManifestRef,
  outputContractRef: contractRef,
  executionPolicyRef,
  providerProfileRef: { id: profile.providerProfileId,
    version: profile.version, hash: profile.integrity.hash },
  preflightDatabase,
  codeHashes,
  sourceRefreshPerformed: false,
  semanticAcceptanceInherited: false,
  trainingTruth: false,
});
const runId = `structured-canary-${recipe.hash.slice(0, 32)}`;
const out = path.join(BUILD_ROOT, runId);
await mkdir(out, { recursive: true });
await writeFile(path.join(out, "recipe.json"),
  `${JSON.stringify(recipe, null, 2)}\n`, "utf8");
await writeFile(path.join(out, "context-capsule.json"),
  `${JSON.stringify(capsule, null, 2)}\n`, "utf8");

const store = openProductionStore(DB_PATH, {
  runId,
  recipeHash: recipe.hash,
  maxCalls: 2,
  maxCostMicros: 1_000_000,
  maxTokens: 150_000,
});
let worker = null;
let capabilityResult = null;
let runtimeOutcome = null;
let dshResult = null;
let hostMaterialization = null;
let failure = null;
let paidProbeCalls = 0;
let paidEditorCalls = 0;
try {
  const before = store.globalSummary();
  const projectedCumulativeMicros = HISTORICAL_MICROS_OUTSIDE_DATABASE
    + before.reservedOrSettledMicros + 1_000_000;
  if (projectedCumulativeMicros >= 100_000_000) {
    fail("CNY_100_NOTIFICATION_REQUIRED");
  }
  const providerRegistry = createStarcraftTmgProviderProfileRegistryV2({
    entries: [{ providerProfile: profile, responsePath: "/responses" }],
    allowedProviders: ["deepseek-openai-compatible-direct"],
  });
  const binding = providerRegistry.resolveEgressBinding({
    profileRef: recipe.providerProfileRef,
  }).egressBinding;
  const probeRoleRef = { id: "structured.capability.probe.faction-editor",
    version: "v1", hash: hash("structured-capability-probe-faction-editor-v1") };
  const probeRequest = {
    schemaVersion: STARCRAFT_TMG_STRUCTURED_PROVIDER_REQUEST_VERSION,
    requestId: `probe-${recipe.hash.slice(0, 48)}`,
    roleRef: probeRoleRef,
    instructions: [
      "This is a tiny structured-output capability probe, not game advice.",
      "Return exactly the schema object. Preserve Chinese text, ASCII quotes, backslashes and a newline inside JSON strings.",
      "Do not add markdown or control fields.",
    ].join("\n"),
    input: "请生成一个最小测试对象；文本中包含 ASCII \"quotes\"、反斜线 \\\\ 和换行\\n。sourceRefs 使用 probe.synthetic/source。",
    outputContractRef: contractRef,
    maxOutputUnits: 256,
  };
  const probeAttemptId = `structured-probe-${recipe.hash.slice(0, 40)}`;
  const probeReservation = store.reserve(probeAttemptId, probeRequest,
    PROBE_COST_MICROS_CAP, PROBE_TOKEN_CAP);
  if (probeReservation.failed) fail(probeReservation.code);
  if (probeReservation.cached) {
    capabilityResult = probeReservation.response;
  } else {
    worker = await attachWorker(providerRegistry, "structured-probe");
    const probeAdapter = adapterForWorker(worker, () => {
      paidProbeCalls += 1;
    });
    try {
      capabilityResult = await probeAdapter.probeCapability({
        egressBinding: binding,
        outputContract: contract,
        providerRequest: probeRequest,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1_000).toISOString(),
      });
      if (!capabilityResult.ok) {
        const error = new Error(capabilityResult.errorCode);
        error.code = capabilityResult.errorCode;
        error.safeReceipt = capabilityResult.safeReceipt;
        throw error;
      }
      const probeUsage = capabilityResult.usage;
      const probeCostMicros = usageCostMicros(probeUsage, {
        requestedModel: binding.model,
        reportedModel: binding.model,
        startedAt: capabilityResult.capabilityReceipt.probedAt,
      });
      if (probeUsage.totalUnits > PROBE_TOKEN_CAP
        || probeCostMicros > PROBE_COST_MICROS_CAP) {
        fail("STRUCTURED_CAPABILITY_PROBE_BUDGET_EXCEEDED");
      }
      store.settle(probeAttemptId, { usage: probeUsage,
        costMicros: probeCostMicros, response: capabilityResult });
    } catch (error) {
      const safeReceipt = error.safeReceipt || null;
      const knownUsage = safeReceipt?.usageKnown ? safeReceipt.usage : null;
      store.settle(probeAttemptId, {
        usage: knownUsage,
        costMicros: knownUsage ? usageCostMicros(knownUsage, {
          requestedModel: binding.model,
          reportedModel: binding.model,
          startedAt: new Date().toISOString(),
        }) : null,
        failureReceipt: safeReceipt,
        code: safeCode(error),
        definitelyNotSent: safeReceipt?.requestDefinitelyNotSent === true,
      });
      throw error;
    } finally {
      await detachWorker(worker, "structured_probe_complete");
      worker = null;
    }
  }
  if (!capabilityResult?.ok) fail("STRUCTURED_CAPABILITY_PROBE_FAILED");
  const capabilityReceipt = capabilityResult.capabilityReceipt;
  const capabilityCurrent = verifyStarcraftTmgProviderCapabilityCurrentV1({
    receipt: capabilityReceipt,
    providerProfileRef: binding.providerProfileRef,
    endpointPath: binding.endpoint.path,
    endpointDialect: binding.endpointDialect,
    model: binding.model,
    capability: "responses_json_schema",
    outputContractRef: contractRef,
    now: new Date().toISOString(),
  });
  if (!capabilityCurrent.ok) fail("STRUCTURED_CAPABILITY_RECEIPT_NOT_CURRENT");
  const capabilityLease = store.acquire("capability-receipt", {
    receiptHash: capabilityReceipt.receiptHash,
  });
  if (!capabilityLease.cached) store.finish(capabilityLease, capabilityReceipt);

  // A fresh attachment is created only after the exact capability receipt is
  // current. The expensive semantic request cannot fall back to another path.
  worker = await attachWorker(providerRegistry, "structured-editor");
  const adapter = adapterForWorker(worker, () => {
    paidEditorCalls += 1;
  });
  const candidates = new Map();
  const storeProxy = {
    ...store,
    finish(lease, value) {
      const saved = store.finish(lease, value);
      if (String(saved?.version || "").endsWith(".candidate")) {
        candidates.set(saved.hash, saved);
      }
      return saved;
    },
  };
  const runtime = createStarcraftTmgStructuredGenerationRuntimeV1({
    outputContractRegistry: createStarcraftTmgOutputContractRegistryV1({
      entries: [contract],
    }),
    contextManifestRegistry: createStarcraftTmgContextCapsuleRegistryV1({
      entries: [capsule],
    }),
    executionPolicyRegistry: {
      resolve(input) {
        return input.executionPolicyRef?.hash === executionPolicyRef.hash
          && input.roleRef?.hash === roleRef.hash
          && input.outputContractRef?.hash === contractRef.hash
          ? { ok: true, executionPolicy }
          : { ok: false, reason: "execution_policy_not_found" };
      },
    },
    capabilityReceiptRegistry: {
      resolve(input) {
        return input.providerProfileRef?.hash === binding.providerProfileRef.hash
          && input.outputContractRef?.hash === contractRef.hash
          && input.capability === "responses_json_schema"
          ? { ok: true, capabilityReceipt }
          : { ok: false, reason: "capability_receipt_not_found" };
      },
    },
    providerAdapter: adapter,
    store: storeProxy,
    egressBinding: binding,
    priceUsage: usageCostMicros,
    classifyFailure: classifyStarcraftTmgStructuredFailureV1,
    readCandidate: (candidateRef) => candidates.get(candidateRef.hash),
  });
  const invocation = { roleRef, contextManifestRef,
    outputContractRef: contractRef, executionPolicyRef, continuationRef: null };
  const bridge = createStarcraftTmgStructuredDshModelBridgeV1({
    generate: async (input) => {
      runtimeOutcome = await runtime.generateStructured(input);
      return runtimeOutcome;
    },
    readCandidate: runtime.readCandidate,
    bindInvocation: () => invocation,
  });
  const dsh = await prepareDshLoop(ROOT);
  const toolPort = Object.freeze({
    execute: async () => fail("STRUCTURED_CANARY_TOOL_FORBIDDEN"),
    trace: () => [],
    readRefs: () => [],
  });
  dshResult = await dsh.run({
    task: "Use the bound structured local proof capsule to repair exactly one sealed objectives recommendation, then finish. No tools are needed.",
    callModel: bridge.callModel,
    toolPort,
    limits: { maxCalls: 1, maxTools: 0, maxOutput: 2_048,
      maxWallMs: 180_000 },
  });
  if (paidEditorCalls !== 1 || runtimeOutcome?.status !== "accepted"
    || dshResult.calls !== 1 || dshResult.toolTrace.length !== 0) {
    fail("STRUCTURED_CANARY_CALL_DENOMINATOR_INVALID");
  }
  const mapped = mapStarcraftTmgStructuredFinishToDshCommandV1({
    outputContractRef: contractRef,
    value: dshResult.final,
  });
  const normalized = normalizeFactionStrategyPatchEnvelopeV1(dshResult.final, {
    input: factionInput,
    draft: corrected.draft,
    issues: localIssues,
  });
  const materializedDraft = applyFactionStrategyPatchV1(normalized.output, {
    input: factionInput,
    draft: corrected.draft,
    issues: localIssues,
  });
  const changedIndices = corrected.draft.recommendations.flatMap((row, index) =>
    hash(row) === hash(materializedDraft.recommendations[index]) ? [] : [index]);
  if (changedIndices.length !== 1
    || changedIndices[0] !== localIssues.issues[0].index
    || runtimeOutcome.usage.input > Math.floor(OLD_EDITOR_INPUT_TOKENS * 0.3)) {
    fail("STRUCTURED_CANARY_ACCEPTANCE_FAILED");
  }
  hostMaterialization = seal({
    version: "ticket_18_slice_174_structured_host_materialization_v1",
    runId,
    rawAdviceHash: hash(dshResult.final),
    mapperReceipt: mapped.receipt,
    patchEnvelopeHash: hash(normalized.output),
    hostMaterializationReceipt: normalized.receipt,
    parentDraftHash: hash(corrected.draft),
    materializedDraftHash: hash(materializedDraft),
    changedIndices,
    sourceAndRulesGuardStatus: "pending_r6_full_section_recheck",
    freshWholeSectionReviewStatus: "pending_r6",
    semanticAcceptance: false,
    runtimeAccepted: false,
    publicationStatus: "not_published",
    trainingTruth: false,
  });
  await writeFile(path.join(out, "capability-receipt.json"),
    `${JSON.stringify(capabilityReceipt, null, 2)}\n`, "utf8");
  await writeFile(path.join(out, "raw-structured-advice.json"),
    `${JSON.stringify(dshResult.final, null, 2)}\n`, "utf8");
  await writeFile(path.join(out, "host-materialization.json"),
    `${JSON.stringify(hostMaterialization, null, 2)}\n`, "utf8");
} catch (error) {
  failure = { code: safeCode(error),
    diagnosticHash: hashStarcraftTmgContract(String(error?.message || "")) };
} finally {
  await detachWorker(worker, "structured_canary_finished");
}

const ledger = store.summary();
const global = store.globalSummary();
const actualEditorInputTokens = runtimeOutcome?.usage?.input ?? null;
const report = seal({
  version: "ticket_18_slice_174_structured_generation_canary_report_v1",
  ticket: 18,
  slice: 174,
  workpoint: "174-R5",
  runId,
  recipeHash: recipe.hash,
  passed: failure === null && Boolean(hostMaterialization),
  failure,
  capability: capabilityResult?.ok ? {
    receiptHash: capabilityResult.capabilityReceipt.receiptHash,
    outputContractHash: capabilityResult.capabilityReceipt.outputContractRef.hash,
    endpointDialect: capabilityResult.capabilityReceipt.endpointDialect,
    model: capabilityResult.capabilityReceipt.model,
    usage: capabilityResult.usage,
    paidCallsThisExecution: paidProbeCalls,
    withinTokenCap: capabilityResult.usage.totalUnits <= PROBE_TOKEN_CAP,
  } : null,
  localEditor: runtimeOutcome ? {
    runtimeOutcome,
    paidCallsThisExecution: paidEditorCalls,
    dshCalls: dshResult?.calls ?? null,
    toolCalls: dshResult?.toolTrace?.length ?? null,
    oldInputTokens: OLD_EDITOR_INPUT_TOKENS,
    actualInputTokens: actualEditorInputTokens,
    inputReductionFraction: actualEditorInputTokens === null ? null
      : 1 - actualEditorInputTokens / OLD_EDITOR_INPUT_TOKENS,
    inputReductionAtLeast70Percent: actualEditorInputTokens !== null
      && actualEditorInputTokens <= Math.floor(OLD_EDITOR_INPUT_TOKENS * 0.3),
    hostMaterializationHash: hostMaterialization?.hash || null,
    sourceAndRulesGuardStatus: "pending_r6_full_section_recheck",
    freshWholeSectionReviewStatus: "pending_r6",
    semanticAcceptance: false,
  } : null,
  ledger,
  cumulative: {
    knownTokens: HISTORICAL_TOKENS_OUTSIDE_DATABASE + global.knownTokens,
    estimatedOrReservedCny: (HISTORICAL_MICROS_OUTSIDE_DATABASE
      + global.reservedOrSettledMicros) / 1_000_000,
    nextCostNoticeCny: 100,
    costNoticeTriggered: HISTORICAL_MICROS_OUTSIDE_DATABASE
      + global.reservedOrSettledMicros >= 100_000_000,
  },
  sourceRefreshPerformed: false,
  noPromptOnlyFormatRetry: true,
  providerFallbackAllowed: false,
  rawProviderPayloadPersisted: false,
  formalSkillProduced: false,
  trainingTruth: false,
});
await writeFile(path.join(out, "report.json"),
  `${JSON.stringify(report, null, 2)}\n`, "utf8");
await writeFile(path.join(BUILD_ROOT, "r5-live-canary-report.json"),
  `${JSON.stringify(report, null, 2)}\n`, "utf8");
store.close();
console.log(JSON.stringify({ runId, passed: report.passed,
  failure: report.failure, capability: report.capability,
  localEditor: report.localEditor ? {
    status: report.localEditor.runtimeOutcome.status,
    actualInputTokens: report.localEditor.actualInputTokens,
    inputReductionFraction: report.localEditor.inputReductionFraction,
    paidCallsThisExecution: report.localEditor.paidCallsThisExecution,
  } : null,
  ledger: { calls: report.ledger.calls, knownTokens: report.ledger.knownTokens,
    estimatedOrReservedCny: report.ledger.reservedOrSettledMicros / 1_000_000 },
  cumulative: report.cumulative }));
if (!report.passed) process.exitCode = 1;
