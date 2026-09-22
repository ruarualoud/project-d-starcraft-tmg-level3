#!/usr/bin/env node

// Ticket 27 / Slices 269-270 — one bounded live 2000-point Agent
// roster-planning session through the existing macOS Keychain -> isolated
// Provider egress Worker BYOK path. Raw credentials never enter the prompt,
// repository, command line, stdout/stderr, report or logs. Stops immediately
// on 401/402/403, ambiguous dispatch or missing secure attachment; never
// silently retries.

import { mkdir, open, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";

import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import {
  buildOfficialRoomArmyAuditV1,
  createOfficialStandardRoomInitialStateAuthorityV1,
  OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1,
} from "../packages/product-composition/official-standard-room-factory-v1.mjs";
import { createOfficialCurrentProductMatchRuntimeV1 } from
  "../packages/product-composition/official-current-product-match-runtime-v1.mjs";
import { createOfficialUnitCompositionUpgradeDataBundleV1 } from
  "../packages/source-data/official-unit-composition-upgrade-data-bundle-v1.mjs";
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from
  "./support/official-development-tranche-source-lock-fixture-v1.mjs";
import { loadPortableFoundationalStrategyPackV2 } from
  "../packages/strategy-skills/portable-foundational-skill-pack-loader-v2.mjs";
import { STARCRAFT_TMG_TICKET_18_PORTABLE_STRATEGY_PACK_V2 as packManifest } from
  "../content/skill-generation/ticket-18-portable-strategy-pack-v2.mjs";
import { STARCRAFT_TMG_TICKET_23_LIVE_FLASH_PROVIDER_PROFILE_V1 as
  providerProfile } from "../content/provider/ticket-23-live-provider-profiles-v1.mjs";
import {
  createOfficialArmyBuilderQueryPortV1,
} from "../packages/roster-strategist/army-builder-query-port-v1.mjs";
import {
  createPregameSceneLaboratoryV1,
} from "../packages/roster-strategist/pregame-scene-laboratory-v1.mjs";
import {
  createRosterStrategistRuntimeV1,
  ROSTER_STRATEGIST_PROMPT_PACK_V1,
  verifyRosterStrategistSessionReceiptV1,
} from "../packages/roster-strategist/roster-strategist-runtime-v1.mjs";
import {
  createPresetRosterNoPregamePlanV1,
  serializeRosterPlanV1,
  verifyRosterPlanRoundTripV1,
} from "../packages/roster-strategist/roster-plan-contracts-v1.mjs";
import { readStarcraftTmgDeepSeekCredentialFromKeychainV1 } from
  "../packages/secure-provider-runtime/keychain-credential-ingress-v1.mjs";
import { createStarcraftTmgProviderEgressWorkerPortV2 } from
  "../packages/secure-provider-runtime/provider-egress-worker-port-v2.mjs";
import { createStarcraftTmgProviderProfileRegistryV1 } from
  "../packages/secure-provider-runtime/provider-profile-registry-v1.mjs";
import { priceStarcraftTmgDeepSeekCurrentUsageV2 } from
  "../packages/secure-provider-runtime/provider-pricing-v2.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_ROOT = path.join(ROOT,
  "build/ticket-27-slices-269-270-live-roster-plan-v1");
const REPORT_PATH = path.join(REPORT_ROOT, "live-report.json");
const LOCK_PATH = path.join(REPORT_ROOT, "one-attempt.lock.json");
const PLAN_PATH = path.join(REPORT_ROOT, "roster-plan.json");
const TRACE_PATH = path.join(REPORT_ROOT, "planning-trace.json");
const TOOL_RECEIPTS_PATH = path.join(REPORT_ROOT, "tool-receipts.json");
const PROVIDER_RECEIPTS_PATH = path.join(REPORT_ROOT,
  "provider-receipts-redacted.json");
const COMPARISON_PATH = path.join(REPORT_ROOT, "preset-comparison.json");
const ROOM_ID = "ticket27-slices-269-270-live-roster-room";
const REQUIRED_FLAGS = new Set([
  "--ticket-27-slices-269-270-live-roster-plan-authorized",
  "--paid-deepseek-calls-accepted",
]);
const AUTH_STOP_CODES = new Set([401, 402, 403]);

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}
function safeCode(error, fallback = "LIVE_ROSTER_PLAN_FAILED") {
  const value = String(error?.code || "").toUpperCase();
  if (/^[A-Z][A-Z0-9_]{2,95}$/u.test(value)) return value;
  const message = String(error?.message || "").split(":")[0];
  return /^[A-Z][A-Z0-9_]{2,95}$/u.test(message) ? message : fallback;
}
function requireCondition(condition, code) {
  if (!condition) throw Object.assign(new Error(code), { code });
}
function flagsAuthorized() {
  const flags = process.argv.slice(2);
  return flags.length === REQUIRED_FLAGS.size
    && flags.every((flag) => REQUIRED_FLAGS.has(flag));
}

async function priorSuccessExists() {
  try {
    const report = JSON.parse(await readFile(REPORT_PATH, "utf8"));
    return report?.status === "passed";
  } catch {
    return false;
  }
}
async function priorAttemptClaimed() {
  try {
    await readFile(LOCK_PATH);
    return true;
  } catch (error) {
    return error?.code !== "ENOENT";
  }
}
async function claimAttempt(runId, startedAt) {
  await mkdir(REPORT_ROOT, { recursive: true, mode: 0o700 });
  let handle;
  try {
    handle = await open(LOCK_PATH, "wx", 0o600);
  } catch (error) {
    throw Object.assign(new Error("LIVE_ROSTER_PLAN_ATTEMPT_ALREADY_CLAIMED"), {
      code: "LIVE_ROSTER_PLAN_ATTEMPT_ALREADY_CLAIMED", cause: error });
  }
  const body = {
    schemaVersion: "starcraft_tmg_ticket_27_live_roster_plan_attempt_lock_v1",
    runId, startedAt,
    automaticRetryAllowed: false,
    ambiguousOutcomeNeedsNewUserAuthorization: true,
    trainingTruth: false,
  };
  await handle.writeFile(`${JSON.stringify({
    ...body, lockHash: hashStarcraftTmgContract(body) }, null, 2)}\n`, "utf8");
  await handle.close();
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8", mode: 0o600 });
  return hashStarcraftTmgContract(value);
}

async function writeSafeFailure(code, runId, startedAt, extra = {}) {
  const body = {
    schemaVersion: "starcraft_tmg_ticket_27_live_roster_plan_report_v1",
    ticket: 27, slices: [269, 270],
    status: "failed",
    runId, startedAt, failedAt: new Date().toISOString(),
    failureCode: code,
    automaticRetries: 0,
    silentRetryPerformed: false,
    rawCredentialPersisted: false,
    rawPromptPersisted: false,
    rawResponsePersisted: false,
    hiddenChainOfThoughtPersisted: false,
    trainingTruth: false,
    ...extra,
  };
  await mkdir(REPORT_ROOT, { recursive: true, mode: 0o700 });
  await writeFile(REPORT_PATH, `${JSON.stringify({
    ...body, reportHash: hashStarcraftTmgContract(body) }, null, 2)}\n`, {
    encoding: "utf8", mode: 0o600 });
}

function redactedProviderReceipt(receipt, latencyMs) {
  return {
    receiptHash: receipt.receiptHash,
    providerId: receipt.providerId,
    requestedModel: receipt.requestedModel,
    reportedModel: receipt.reportedModel,
    providerRequestIdHash: receipt.providerRequestIdHash ?? null,
    providerSystemFingerprintHash:
      receipt.providerSystemFingerprintHash ?? null,
    status: receipt.status,
    usage: clone(receipt.usage),
    dnsAddressSetHash: receipt.dnsAddressSetHash,
    tlsServerName: receipt.tlsServerName,
    tlsCertificateVerificationDisabled: false,
    redirectFollowed: false,
    proxyUsed: false,
    physicalAttempts: receipt.physicalAttempts,
    automaticRetries: receipt.automaticRetries,
    startedAt: receipt.startedAt,
    finishedAt: receipt.finishedAt,
    latencyMs,
    responseFingerprint: receipt.responseFingerprint,
    trainingTruth: false,
  };
}

function estimatePricing(receipt) {
  const usage = receipt.usage || {};
  const inputUnits = Number(usage.inputUnits || 0);
  const outputUnits = Number(usage.outputUnits || 0);
  return priceStarcraftTmgDeepSeekCurrentUsageV2({
    providerId: receipt.providerId,
    requestedModel: receipt.requestedModel,
    reportedModel: receipt.reportedModel,
    startedAt: receipt.startedAt,
    usage: {
      inputUnits,
      outputUnits,
      totalUnits: Number(usage.totalUnits || inputUnits + outputUnits),
      inputCacheHitUnits: Number(usage.inputCacheHitUnits || 0),
      inputCacheMissUnits: Number(
        usage.inputCacheMissUnits ?? inputUnits),
      reasoningOutputUnits: Number(usage.reasoningOutputUnits || 0),
    },
  });
}

async function main() {
  if (!flagsAuthorized()) {
    console.error("LIVE_ROSTER_PLAN_EXPLICIT_AUTHORIZATION_REQUIRED");
    process.exitCode = 2;
    return;
  }
  if (await priorSuccessExists()) {
    console.error("LIVE_ROSTER_PLAN_SUCCESS_ALREADY_RECORDED");
    process.exitCode = 2;
    return;
  }
  if (await priorAttemptClaimed()) {
    console.error("LIVE_ROSTER_PLAN_ATTEMPT_ALREADY_CLAIMED");
    process.exitCode = 2;
    return;
  }
  const startedAt = new Date().toISOString();
  const runId = `ticket27-269-270-live-${randomUUID()}`;
  let credentialBytes = null;
  let coreWorker = null;
  let attached = null;
  const providerReceipts = [];
  try {
    await claimAttempt(runId, startedAt);

    // ---- Rules/source/Skill infrastructure (read-only, zero Provider cost)
    const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({
      root: ROOT });
    const bundle = createOfficialUnitCompositionUpgradeDataBundleV1({
      dataset: source.dataset });
    const builderPort = createOfficialArmyBuilderQueryPortV1({
      unitCompositionUpgradeDataBundle: bundle });
    const seatPlan = [
      { label: "player1", seatKey: "player1", roleMode: "supervisor",
        principalType: "human" },
      { label: "player2", seatKey: "player2", roleMode: "supervisor",
        principalType: "human" },
    ];
    const authority = createOfficialStandardRoomInitialStateAuthorityV1({
      dataset: source.dataset, snapshot: source.snapshot,
      serverSeatPlan: seatPlan, roomId: ROOM_ID });
    const rulesRuntime = createOfficialCurrentProductMatchRuntimeV1({
      dataset: source.dataset, state: structuredClone(authority.state) });
    const mapTopologyHash = hashStarcraftTmgContract({
      widthInches: authority.state.board.widthInches,
      heightInches: authority.state.board.heightInches,
      terrain: authority.state.board.terrain,
      accessPoints: authority.state.board.accessPoints,
      battlefieldMapManifestHash:
        authority.compositionEvidence.battlefieldMapManifestHash,
    });
    const laboratoryCore = createPregameSceneLaboratoryV1({
      laboratoryId: "ticket27-s269-270-live-lab",
      sourceState: authority.state,
      sourceRoomRef: { roomId: ROOM_ID, stateRevision: 0 },
      rulesRuntime,
      armyBuilderPort: builderPort,
      matchBinding: authority.matchBinding,
    });
    const toolReceipts = [];
    const laboratory = Object.freeze({
      ...Object.fromEntries(Object.entries({
        labDescriptor: laboratoryCore.labDescriptor,
        proveMutationZero: laboratoryCore.proveMutationZero,
      })),
      ...Object.fromEntries(["querySpatial", "queryProbability",
        "queryThreatExchange", "queryMath", "runScenarioBranch",
        "compareCandidatesSameState"].map((name) => [name, (...args) => {
        const receipt = laboratoryCore[name](...args);
        toolReceipts.push(clone(receipt));
        return receipt;
      }])),
    });
    const pack = await loadPortableFoundationalStrategyPackV2({
      root: ROOT, manifest: packManifest });
    const strategist = createRosterStrategistRuntimeV1({
      armyBuilderPort: builderPort, laboratory, strategyPack: pack });
    const skillRoute = strategist.selectSkillRoute({
      ownFactionRecordKey: "tactical_cards:terran_armed_forces",
      opponentFactionRecordKey: "tactical_cards:kerrigan_s_swarm" });

    // ---- Keychain -> isolated Worker BYOK attachment
    const keychainIngress = await readStarcraftTmgDeepSeekCredentialFromKeychainV1();
    credentialBytes = keychainIngress.credentialBytes;
    const keychainReceipt = clone(keychainIngress.receipt);
    const registry = createStarcraftTmgProviderProfileRegistryV1({
      entries: [{ providerProfile, completionPath: "/chat/completions" }],
      allowedProviders: ["deepseek-openai-compatible-direct"],
    });
    const resolved = await registry.resolveEgressBinding({
      profileRef: {
        id: providerProfile.providerProfileId,
        version: providerProfile.version,
        hash: providerProfile.integrity.hash,
      },
    });
    requireCondition(resolved.ok === true,
      "LIVE_ROSTER_PLAN_PROFILE_RESOLUTION_FAILED");
    coreWorker = createStarcraftTmgProviderEgressWorkerPortV2({
      providerProfileRegistry: registry,
      maxWorkers: 1,
      maxOutputBytes: 256 * 1024,
      handshakeTimeoutMs: 5_000,
      shutdownGraceMs: 1_000,
    });
    attached = await coreWorker.attachCredential({
      attachmentId: `ticket27-roster-attachment-${runId}`,
      providerProfile,
      credentialBytes,
    });
    requireCondition(attached?.ok === true && attached.workerRef,
      "LIVE_ROSTER_PLAN_SECURE_ATTACHMENT_MISSING");
    requireCondition(credentialBytes.every((byte) => byte === 0),
      "LIVE_ROSTER_PLAN_PARENT_CREDENTIAL_NOT_ZEROED");
    credentialBytes = null;
    const workerRef = attached.workerRef;

    // ---- live deliberation port (single flight, never retried)
    const deliberation = Object.freeze({
      descriptor: () => Object.freeze({
        kind: "live_keychain_isolated_worker_byok",
        modelVersion: providerProfile.model,
        promptVersion: ROSTER_STRATEGIST_PROMPT_PACK_V1,
        providerProfileId: providerProfile.providerProfileId,
        paidProviderCalls: true,
        trainingTruth: false,
      }),
      async deliberate(request) {
        const providerRequest = {
          schemaVersion: "starcraft_tmg_direct_provider_request_v1",
          requestId: `ticket27-roster-${runId}-round-${request.roundIndex}`,
          intent: "take_turn",
          promptPack: request.promptPack,
          promptNodes: clone(request.promptNodes),
          userMessage: request.userMessage,
          responseContract: clone(request.responseContract),
          maxOutputUnits: request.maxOutputUnits,
        };
        const callStarted = Date.now();
        let result;
        try {
          result = await coreWorker.complete({ workerRef, providerRequest });
        } catch (error) {
          const receipt = error?.safeReceipt || null;
          if (receipt && AUTH_STOP_CODES.has(Number(receipt.status))) {
            throw Object.assign(new Error(
              "LIVE_ROSTER_PLAN_PROVIDER_AUTH_STOP"), {
              code: "LIVE_ROSTER_PLAN_PROVIDER_AUTH_STOP",
              safeStatus: receipt.status });
          }
          if (receipt?.requestMayHaveBeenSent === true
            || receipt?.requestDefinitelyNotSent !== true) {
            throw Object.assign(new Error(
              "LIVE_ROSTER_PLAN_AMBIGUOUS_DISPATCH_STOP"), {
              code: "LIVE_ROSTER_PLAN_AMBIGUOUS_DISPATCH_STOP",
              safeReceipt: clone(receipt) });
          }
          throw error;
        }
        const latencyMs = Date.now() - callStarted;
        const usageReceipt = clone(result.usageReceipt);
        providerReceipts.push(redactedProviderReceipt(usageReceipt, latencyMs));
        return Object.freeze({
          output: clone(result.output),
          receipt: Object.freeze({
            providerKind: "live_keychain_isolated_worker_byok",
            modelVersion: usageReceipt.reportedModel
              || providerProfile.model,
            promptVersion: ROSTER_STRATEGIST_PROMPT_PACK_V1,
            roundKind: request.roundKind,
            contextHash: request.contextHash,
            outputHash: hashStarcraftTmgContract(result.output),
            usage: clone(usageReceipt.usage),
            latencyMs,
            providerReceiptHash: usageReceipt.receiptHash,
            paidProviderCall: true,
            trainingTruth: false,
            receiptHash: hashStarcraftTmgContract({
              providerKind: "live_keychain_isolated_worker_byok",
              roundKind: request.roundKind,
              contextHash: request.contextHash,
              outputHash: hashStarcraftTmgContract(result.output),
              providerReceiptHash: usageReceipt.receiptHash,
            }),
          }),
        });
      },
    });

    // ---- one bounded live planning session
    const session = await strategist.planRoster({
      sessionId: `ticket27-269-270-live-${runId}`,
      sideKey: "player1",
      factionRecordKey: "tactical_cards:terran_armed_forces",
      opponentFactionRecordKey: "tactical_cards:kerrigan_s_swarm",
      engagementScale: "Standard",
      mineralBudget: 2000,
      missionBinding: {
        missionRecordKey:
          authority.compositionEvidence.selectedMissionRecordKey,
        deploymentRecordKey:
          authority.compositionEvidence.selectedDeploymentRecordKey,
        mapTopologyHash,
      },
      opponentInformationBoundary: "open_roster",
      versionPins: {
        sourceLockHash: bundle.sourceLockHash,
        sourceSnapshotHash: bundle.sourceSnapshotHash,
        normalizedDatasetHash: bundle.normalizedDatasetHash,
        officialRulesVersion: bundle.officialRulesVersion,
        officialUnitsVersion: bundle.officialUnitsVersion,
        officialCardsVersion: bundle.officialCardsVersion,
      },
    }, { deliberation, maxProposalRounds: 2 });

    requireCondition(providerReceipts.length >= 3
      && providerReceipts.length <= 4,
      "LIVE_ROSTER_PLAN_CALL_DENOMINATOR_DRIFT");
    requireCondition(providerReceipts.every((receipt) => (
      receipt.physicalAttempts === 1 && receipt.automaticRetries === 0
        && receipt.status >= 200 && receipt.status < 300)),
      "LIVE_ROSTER_PLAN_PHYSICAL_ATTEMPT_DRIFT");
    requireCondition(providerReceipts.every((receipt) => (
      receipt.reportedModel === providerProfile.model)),
      "LIVE_ROSTER_PLAN_REPORTED_MODEL_DRIFT");
    requireCondition(verifyRosterStrategistSessionReceiptV1(
      session.sessionReceipt) === true
      && verifyRosterPlanRoundTripV1(session.plan) === true,
      "LIVE_ROSTER_PLAN_SESSION_RECEIPT_INVALID");

    // ---- final roster re-validated through the Rules-owned port
    const selectedInput = session.candidateInputs.find((entry, index) => (
      session.candidates[index].candidateId
        === session.plan.rosterCandidate.candidateId));
    requireCondition(selectedInput, "LIVE_ROSTER_PLAN_SELECTION_INPUT_MISSING");
    const finalValidation = builderPort.evaluateRosterCandidate(
      clone(selectedInput));
    requireCondition(
      finalValidation.schema === "starcraft_tmg_army_builder_roster_verdict_v1"
        && finalValidation.auditResultHash
          === session.plan.rosterCandidate.legalityReceipt.auditResultHash
        && finalValidation.summary.mineralSpent <= 2000,
      "LIVE_ROSTER_PLAN_FINAL_LEGALITY_FAILED");

    // ---- fixed preset roster comparison (explicitly no_pregame_plan)
    const presetAudit = buildOfficialRoomArmyAuditV1(bundle, "player1",
      OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1.player1);
    const presetPlan = createPresetRosterNoPregamePlanV1({
      planId: "preset-standard-2000-player1-live-comparison",
      sideKey: "player1",
      presetBinding: {
        rosterHash: hashStarcraftTmgContract({
          sideKey: "player1",
          recipe: OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1.player1 }),
        armyAuditResultHash: presetAudit.resultHash,
        presetSource: "fixed_standard_2000_recipe",
      },
    });
    const comparison = {
      schemaVersion: "starcraft_tmg_ticket_27_live_preset_comparison_v1",
      matchedConditions: {
        missionRecordKey:
          authority.compositionEvidence.selectedMissionRecordKey,
        deploymentRecordKey:
          authority.compositionEvidence.selectedDeploymentRecordKey,
        mapTopologyHash,
        engagementScale: "Standard",
        mineralBudget: 2000,
        opponentFactionRecordKey: "tactical_cards:kerrigan_s_swarm",
        opponentRoster: "fixed_standard_2000_recipe",
        modelVersion: providerProfile.model,
        skillRouteReceiptHash: skillRoute.receipt.receiptHash,
      },
      presetArm: {
        planStatus: presetPlan.planStatus,
        presetRoster: true,
        planFabricated: false,
        planHash: presetPlan.planHash,
        armyAuditResultHash: presetAudit.resultHash,
        mineralSpent: presetAudit.armyResourceBudgetResult.mineralSpent,
        vespeneSpent: presetAudit.armyResourceBudgetResult.vespeneSpent,
      },
      agentArm: {
        planStatus: session.plan.planStatus,
        planHash: session.plan.planHash,
        sessionReceiptHash: session.sessionReceipt.receiptHash,
        armyAuditResultHash: finalValidation.auditResultHash,
        mineralSpent: finalValidation.summary.mineralSpent,
        vespeneSpent: finalValidation.summary.vespeneSpent,
        selectedCandidateId: session.plan.rosterCandidate.candidateId,
        scoreRouteKind: session.plan.scoreRoute.routeKind,
        toolReceiptReferenceCount:
          session.plan.toolReceiptReferences.length,
      },
      comparisonSeparatedListQualityFromPlayQuality:
        "pregame_list_construction_only_no_match_played",
      trainingTruth: false,
    };

    const mutationProof = laboratoryCore.proveMutationZero();
    requireCondition(mutationProof.sourceStateMutationCount === 0,
      "LIVE_ROSTER_PLAN_SOURCE_MUTATION_DETECTED");

    // ---- artifacts
    const planHashOnDisk = await writeJson(PLAN_PATH,
      JSON.parse(serializeRosterPlanV1(session.plan)));
    const traceHash = await writeJson(TRACE_PATH, {
      planningTrace: session.planningTrace,
      deliberationReceipts: session.deliberationReceipts,
      sessionReceipt: session.sessionReceipt,
      skillRouteReceipt: skillRoute.receipt,
    });
    const toolReceiptsHash = await writeJson(TOOL_RECEIPTS_PATH, {
      toolReceipts,
      mutationZeroProof: mutationProof,
    });
    const providerReceiptsHash = await writeJson(PROVIDER_RECEIPTS_PATH, {
      providerReceipts,
      keychainReceipt,
      egressPolicyHash: resolved.egressBinding.policyHash,
    });
    const comparisonHash = await writeJson(COMPARISON_PATH, comparison);

    const pricingReceipts = providerReceipts.map((receipt) => (
      estimatePricing(receipt)));
    const totals = providerReceipts.reduce((sum, receipt) => ({
      inputUnits: sum.inputUnits + receipt.usage.inputUnits,
      outputUnits: sum.outputUnits + receipt.usage.outputUnits,
      totalUnits: sum.totalUnits + receipt.usage.totalUnits,
      latencyMs: sum.latencyMs + receipt.latencyMs,
    }), { inputUnits: 0, outputUnits: 0, totalUnits: 0, latencyMs: 0 });
    const totalCostNanoUsd = pricingReceipts.reduce((sum, receipt) => (
      sum + receipt.calculatedCostNanoUsd), 0);
    const totalCostCnyMicros = pricingReceipts.reduce((sum, receipt) => (
      sum + (receipt.calculatedCostCnyMicros
        ?? Math.ceil(receipt.calculatedCostNanoUsd * 8 / 1_000))), 0);

    const reportBody = {
      schemaVersion: "starcraft_tmg_ticket_27_live_roster_plan_report_v1",
      ticket: 27, slices: [269, 270],
      status: "passed",
      runId, startedAt, finishedAt: new Date().toISOString(),
      userAuthorization: { explicitFlags: [...REQUIRED_FLAGS] },
      credentialHygiene: {
        ingress: "macos_login_keychain_generic_password_via_security_binary",
        keychainReceiptHash: keychainReceipt.receiptHash,
        secretInArguments: false, secretInEnvironment: false,
        rawCredentialPersisted: false, credentialHashPersisted: false,
        parentCredentialZeroed: true,
        credentialEnteredPrompt: false,
      },
      provider: {
        providerId: providerReceipts[0].providerId,
        requestedModel: providerReceipts[0].requestedModel,
        reportedModel: providerReceipts[0].reportedModel,
        providerProfileId: providerProfile.providerProfileId,
        providerProfileHash: providerProfile.integrity.hash,
        egressPolicyHash: resolved.egressBinding.policyHash,
        workerIsolation: "provider-egress-worker-port-v2",
      },
      usage: {
        calls: providerReceipts.length,
        reportedInputUnits: totals.inputUnits,
        reportedOutputUnits: totals.outputUnits,
        reportedTotalUnits: totals.totalUnits,
        totalLatencyMs: totals.latencyMs,
        perCall: providerReceipts.map((receipt) => ({
          receiptHash: receipt.receiptHash,
          status: receipt.status,
          usage: receipt.usage,
          latencyMs: receipt.latencyMs,
          startedAt: receipt.startedAt,
          finishedAt: receipt.finishedAt,
        })),
      },
      pricing: {
        estimated: true,
        estimationNote:
          "cache-hit/miss fields filled conservatively (all miss) when the "
          + "provider omits the breakdown",
        snapshotHash: pricingReceipts[0].snapshotHash,
        totalCalculatedCostNanoUsd: totalCostNanoUsd,
        totalCalculatedCostCnyMicros: totalCostCnyMicros,
        pricingReceiptHashes: pricingReceipts.map((receipt) => (
          receipt.receiptHash ?? receipt.pricingHash ?? null)),
      },
      promptPack: ROSTER_STRATEGIST_PROMPT_PACK_V1,
      skillRoute: {
        receiptHash: skillRoute.receipt.receiptHash,
        skillRefs: skillRoute.skillRefs.map((entry) => ({
          role: entry.role, skillId: entry.skillId,
          version: entry.version, skillHash: entry.skillHash })),
      },
      rosterPlan: {
        planHash: session.plan.planHash,
        planStatus: session.plan.planStatus,
        selectedCandidateId: session.plan.rosterCandidate.candidateId,
        finalAuditResultHash: finalValidation.auditResultHash,
        finalVerdictHash: finalValidation.verdictHash,
        mineralSpent: finalValidation.summary.mineralSpent,
        vespeneSpent: finalValidation.summary.vespeneSpent,
        scaleId: finalValidation.summary.scaleId,
        rulesAuthority:
          "official-unit-composition-upgrade-rules-kernel-v1 via the "
          + "read-only Army Builder query port",
        toolReceiptReferenceCount: session.plan.toolReceiptReferences.length,
        hiddenChainOfThoughtIncluded: false,
        planFabricated: false,
      },
      laboratory: {
        descriptorHash: laboratoryCore.labDescriptor().descriptorHash,
        sourceStateHash: mutationProof.sourceStateHash,
        sourceStateMutationCount: mutationProof.sourceStateMutationCount,
        operationCount: mutationProof.operationCount,
        unknownNotZero: true,
      },
      presetComparison: comparison,
      artifacts: {
        rosterPlanJson: { path: path.relative(ROOT, PLAN_PATH),
          hash: planHashOnDisk },
        planningTraceJson: { path: path.relative(ROOT, TRACE_PATH),
          hash: traceHash },
        toolReceiptsJson: { path: path.relative(ROOT, TOOL_RECEIPTS_PATH),
          hash: toolReceiptsHash },
        providerReceiptsJson: {
          path: path.relative(ROOT, PROVIDER_RECEIPTS_PATH),
          hash: providerReceiptsHash },
        presetComparisonJson: { path: path.relative(ROOT, COMPARISON_PATH),
          hash: comparisonHash },
      },
      honestGaps: [
        "pregame list construction only: no match was played, so play-quality "
          + "and calibration evidence remain Slice 272 scope",
        "scenario branches are advisory hypothetical geometry; Rules legality "
          + "of placements is not claimed",
        "provider usage cache breakdown is filled conservatively when the "
          + "provider omits it; currency cost is an estimate",
      ],
      automaticRetries: 0,
      silentRetryPerformed: false,
      rawPromptPersisted: false,
      rawResponsePersisted: false,
      hiddenChainOfThoughtPersisted: false,
      sourceRefreshPerformed: false,
      trainingTruth: false,
    };
    const report = { ...reportBody,
      reportHash: hashStarcraftTmgContract(reportBody) };
    await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, {
      encoding: "utf8", mode: 0o600 });
    console.log(`Ticket 27 Slices 269-270 live roster plan passed; `
      + `calls=${providerReceipts.length}; model=${providerReceipts[0].reportedModel}; `
      + `input=${totals.inputUnits}; output=${totals.outputUnits}; `
      + `costCnyMicros=${totalCostCnyMicros}; planHash=${session.plan.planHash}`);
  } catch (error) {
    const code = safeCode(error);
    await writeSafeFailure(code, runId, startedAt, {
      providerCallsObserved: providerReceipts.length,
      providerReceiptHashes: providerReceipts.map((entry) => entry.receiptHash),
      safeStatus: error?.safeStatus ?? null,
    }).catch(() => {});
    console.error(code);
    process.exitCode = 1;
  } finally {
    credentialBytes?.fill(0);
    if (coreWorker && attached?.workerRef) {
      await coreWorker.detachCredential({
        workerRef: attached.workerRef, reason: "ticket-27-live-run-finished",
      }).catch(() => {});
    }
    await coreWorker?.close().catch(() => {});
  }
}

if (process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
