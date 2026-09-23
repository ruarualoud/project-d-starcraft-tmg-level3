#!/usr/bin/env node

// Independent Ticket 27 Teach experiment. Historical S269–270 attempts and
// outputs are never rewritten. --preflight performs no credential ingress or
// Provider call; --run requires explicit authorization and makes at most one
// physical request per deliberation round, without automatic retry.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";

import { hashStarcraftTmgContract as hash } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createOfficialStandardRoomInitialStateAuthorityV1 } from
  "../packages/product-composition/official-standard-room-factory-v1.mjs";
import { createOfficialCurrentProductMatchRuntimeV1 } from
  "../packages/product-composition/official-current-product-match-runtime-v1.mjs";
import { createOfficialUnitCompositionUpgradeDataBundleV1 } from
  "../packages/source-data/official-unit-composition-upgrade-data-bundle-v1.mjs";
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from
  "./support/official-development-tranche-source-lock-fixture-v1.mjs";
import { loadPortableFoundationalStrategyPackV2 } from
  "../packages/strategy-skills/portable-foundational-skill-pack-loader-v2.mjs";
import { STARCRAFT_TMG_TICKET_18_PORTABLE_STRATEGY_PACK_V2 as packManifest }
  from "../content/skill-generation/ticket-18-portable-strategy-pack-v2.mjs";
import { STARCRAFT_TMG_TICKET_27_ROSTER_TEACH_FLASH_PROFILE_V1 as profile }
  from "../content/provider/ticket-27-roster-teach-provider-profile-v1.mjs";
import { createOfficialArmyBuilderQueryPortV1 } from
  "../packages/roster-strategist/army-builder-query-port-v1.mjs";
import { createPregameSceneLaboratoryV1 } from
  "../packages/roster-strategist/pregame-scene-laboratory-v1.mjs";
import { createRosterStrategistRuntimeV1,
  verifyRosterStrategistSessionReceiptV1 } from
  "../packages/roster-strategist/roster-strategist-runtime-v1.mjs";
import { rosterStrategistRoundOutputContractV1 } from
  "../packages/roster-strategist/roster-strategist-output-schemas-v1.mjs";
import { createRosterTeachRolePortsV1 } from
  "../packages/roster-strategist/roster-teach-role-ports-v1.mjs";
import { rosterTeachOutputContractV1 } from
  "../packages/roster-strategist/roster-teach-output-contracts-v1.mjs";
import { verifyRosterTeachCycleV1 } from
  "../packages/roster-strategist/roster-teach-cycle-v1.mjs";
import { verifyRosterPlanRoundTripV1 } from
  "../packages/roster-strategist/roster-plan-contracts-v1.mjs";
import { validateStarcraftTmgProviderJsonSchemaValueV1,
  outputContractRefStarcraftTmgV1 } from
  "../packages/structured-generation/output-contract-registry-v1.mjs";
import { readStarcraftTmgDeepSeekCredentialFromKeychainV1 } from
  "../packages/secure-provider-runtime/keychain-credential-ingress-v1.mjs";
import { createStarcraftTmgProviderProfileRegistryV2 } from
  "../packages/secure-provider-runtime/provider-profile-registry-v2.mjs";
import { createStarcraftTmgStructuredProviderWorkerPortV1 } from
  "../packages/secure-provider-runtime/structured-provider-worker-port-v1.mjs";
import { normalizeProviderJsonDocumentV1 } from
  "../packages/secure-provider-runtime/provider-response-outcome-v1.mjs";
import { priceStarcraftTmgDeepSeekCurrentUsageV2 } from
  "../packages/secure-provider-runtime/provider-pricing-v2.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUILD = path.join(ROOT, "build/ticket-27-roster-teach-live-v1");
const RUN_FLAG = "--run-authorized-teach-flash";
const PREFLIGHT_FLAG = "--preflight";
const RESUME_FLAG = "--resume-retained-paid-outputs";
const MAX_CALLS = 6; // foundation + 2 Teach + <=2 proposals + comparison
const BLOCKED_HTTP = new Set([401, 402, 403]);
const FORBIDDEN = new Set(["hidden", "chainofthought", "cot", "scratchpad",
  "reasoning", "reasoningtrace", "internalmonologue", "thinking"]);

function clone(value) { return structuredClone(value); }
function fail(code) { throw Object.assign(new Error(code), { code }); }
function safeCode(error) {
  const candidate = String(error?.code || error?.message || "").split(":")[0];
  return /^[A-Z][A-Z0-9_]{2,119}$/u.test(candidate)
    ? candidate : "ROSTER_TEACH_LIVE_FAILED";
}
function sanitize(value) {
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value)
      .filter(([key]) => !FORBIDDEN.has(key.toLowerCase()
        .replace(/[-_]/gu, "")))
      .map(([key, child]) => [key, sanitize(child)]));
  }
  return value;
}
function usageFrom(payload) {
  const inputUnits = payload?.usage?.input_tokens;
  const outputUnits = payload?.usage?.output_tokens;
  const totalUnits = payload?.usage?.total_tokens;
  if (![inputUnits, outputUnits, totalUnits].every((value) =>
    Number.isSafeInteger(value) && value >= 0)
    || totalUnits !== inputUnits + outputUnits) fail("ROSTER_TEACH_USAGE_UNKNOWN");
  const hit = payload.usage.input_tokens_details?.cached_tokens;
  const inputCacheHitUnits = Number.isSafeInteger(hit)
    && hit >= 0 && hit <= inputUnits ? hit : 0;
  const reasoning = payload.usage.output_tokens_details?.reasoning_tokens;
  return { inputUnits, outputUnits, totalUnits, inputCacheHitUnits,
    inputCacheMissUnits: inputUnits - inputCacheHitUnits,
    reasoningOutputUnits: Number.isSafeInteger(reasoning)
      && reasoning >= 0 && reasoning <= outputUnits ? reasoning : 0 };
}
function outputText(payload) {
  const messages = payload?.output?.filter((entry) =>
    entry?.type === "message") || [];
  const message = messages.length === 1 ? messages[0] : null;
  if (message?.role !== "assistant" || message.status !== "completed"
    || !Array.isArray(message.content)
    || message.content.length !== 1
    || message.content[0]?.type !== "output_text"
    || typeof message.content[0].text !== "string") {
    fail("ROSTER_TEACH_OUTPUT_TEXT_MISSING");
  }
  return message.content[0].text;
}
function contractFor(kind) {
  return kind === "teach_challenge" || kind === "teach_revision"
    ? rosterTeachOutputContractV1(kind)
    : rosterStrategistRoundOutputContractV1(kind);
}
function priceCallsCny(calls) {
  return calls.reduce((total, entry) => {
    const priced = priceStarcraftTmgDeepSeekCurrentUsageV2({
      providerId: profile.provider,
      requestedModel: profile.model,
      // Tariff follows the requested public SKU; keep the raw alias in the
      // redacted Provider receipt rather than treating it as a price gate.
      reportedModel: profile.model,
      startedAt: entry.startedAt,
      usage: entry.usage,
    });
    return total + priced.calculatedCostUsd * 8;
  }, 0);
}
const INSTRUCTIONS = [
  "You are the StarCraft TMG Roster Strategist answering one bounded "
    + "pregame roster-planning deliberation round.",
  "Answer with a single JSON object that conforms EXACTLY to the JSON "
    + "schema attached to this request. Emit every required field, including "
    + "schemaVersion and roundKind with the declared values.",
  "All output is public strategy. Never emit hidden chain-of-thought, "
    + "scratchpads or private reasoning fields.",
  "Strategy must come from the supplied Skills and your own deliberation. "
    + "The Rules-owned Army Builder menu is the sole legality authority; "
    + "use only legal recordKeys, compositionKinds and upgradeNames.",
  "Unknown stays unknown. Do not invent evidence or Rules facts.",
  "Unspent minerals are lost, not carried forward. Treat budget residue "
    + "as an explicit opportunity cost and follow the sealed near-cap "
    + "comparison contract.",
  "Ground any declared victory-point schedule in the sealed mission scoring "
    + "authority. If that authority is missing, preserve an unknown schedule.",
  "Keep public prose concise, but a display target is a soft warning, "
    + "not a reason to omit strategy content.",
].join("\n");
function contextFor(authority, bundle, mapTopologyHash) {
  return {
    sideKey: "player1",
    factionRecordKey: "tactical_cards:terran_armed_forces",
    opponentFactionRecordKey: "tactical_cards:kerrigan_s_swarm",
    engagementScale: "Standard", mineralBudget: 2_000,
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
  };
}

export async function prepareRosterTeachLiveV1(runId) {
  const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({
    root: ROOT });
  const bundle = createOfficialUnitCompositionUpgradeDataBundleV1({
    dataset: source.dataset });
  const builder = createOfficialArmyBuilderQueryPortV1({
    unitCompositionUpgradeDataBundle: bundle });
  const authority = createOfficialStandardRoomInitialStateAuthorityV1({
    dataset: source.dataset, snapshot: source.snapshot,
    serverSeatPlan: ["player1", "player2"].map((seatKey) => ({
      label: seatKey, seatKey, roleMode: "supervisor",
      principalType: "human",
    })), roomId: `ticket27-teach-${runId}`,
  });
  const rules = createOfficialCurrentProductMatchRuntimeV1({
    dataset: source.dataset, state: clone(authority.state) });
  const lab = createPregameSceneLaboratoryV1({
    laboratoryId: `ticket27-teach-lab-${runId}`,
    sourceState: authority.state,
    sourceRoomRef: { roomId: `ticket27-teach-${runId}`, stateRevision: 0 },
    rulesRuntime: rules, armyBuilderPort: builder,
    matchBinding: authority.matchBinding,
  });
  const pack = await loadPortableFoundationalStrategyPackV2({
    root: ROOT, manifest: packManifest });
  const mapTopologyHash = hash({
    widthInches: authority.state.board.widthInches,
    heightInches: authority.state.board.heightInches,
    terrain: authority.state.board.terrain,
    accessPoints: authority.state.board.accessPoints,
    battlefieldMapManifestHash:
      authority.compositionEvidence.battlefieldMapManifestHash,
  });
  return { bundle, builder, authority, lab, pack,
    sessionInput: contextFor(authority, bundle, mapTopologyHash) };
}

async function main() {
  const resumeMode = process.argv[2] === RESUME_FLAG
    && [4, 5].includes(process.argv.length)
    && /^\d{17}-[a-f0-9]{8}$/u.test(process.argv[3] || "")
    && (process.argv.length === 4
      || /^resume-\d{17}-[a-f0-9]{8}$/u.test(process.argv[4] || ""));
  if (!resumeMode && (process.argv.length !== 3
    || ![PREFLIGHT_FLAG, RUN_FLAG].includes(process.argv[2]))) {
    console.error(`Use ${PREFLIGHT_FLAG}, ${RUN_FLAG}, or `
      + `${RESUME_FLAG} <prior-run-id> [student-resume-id]`);
    process.exitCode = 2;
    return;
  }
  const paid = process.argv[2] !== PREFLIGHT_FLAG;
  const attemptId = `${new Date().toISOString().replace(/[-:.TZ]/gu, "")}`
    + `-${randomUUID().slice(0, 8)}`;
  const runId = resumeMode ? process.argv[3] : attemptId;
  let retained = null;
  if (resumeMode) {
    const sourceRoot = path.join(BUILD, runId);
    const [priorReport, priorWal, priorOutputs, priorCalls] =
      await Promise.all(["report.json", "send-wal.json",
        "public-outputs.json", "provider-calls-redacted.json"]
        .map(async (name) => JSON.parse(await readFile(
          path.join(sourceRoot, name), "utf8"))));
    if (priorReport.status !== "failed"
      || priorReport.runId !== runId
      || priorWal.length !== 2 || priorOutputs.length !== 2
      || priorCalls.length !== 2
      || priorWal.some((entry) => entry.status !== "response_received")
      || priorOutputs.some((entry, index) =>
        !entry.publicOutput
          || hash(entry.publicOutput) !== entry.outputHash
          || entry.roundKind !== ["strategy_foundation",
            "teach_challenge"][index]
          || entry.outputHash !== priorCalls[index].outputHash)) {
      fail("ROSTER_TEACH_RETAINED_SOURCE_INVALID");
    }
    if (process.argv.length === 5) {
      const studentRoot = path.join(BUILD, process.argv[4]);
      const [studentReport, studentWal, studentOutputs, studentCalls] =
        await Promise.all(["report.json", "send-wal.json",
          "public-outputs.json", "provider-calls-redacted.json"]
          .map(async (name) => JSON.parse(await readFile(
            path.join(studentRoot, name), "utf8"))));
      if (studentReport.runId !== runId
        || studentReport.status !== "failed"
        || studentReport.replayedRounds?.length !== 2
        || studentWal.length !== 1
        || studentWal[0].roundKind !== "teach_revision"
        || studentWal[0].status !== "response_received"
        || studentOutputs.length !== 3
        || studentCalls.length !== 1
        || studentCalls[0].roundKind !== "teach_revision"
        || studentCalls[0].schemaValid !== true
        || studentCalls[0].providerReceiptHash
          !== studentWal[0].transportReceiptHash
        || studentOutputs[2].roundKind !== "teach_revision"
        || !studentOutputs[2].publicOutput
        || hash(studentOutputs[2].publicOutput)
          !== studentOutputs[2].outputHash
        || studentOutputs[2].outputHash !== studentCalls[0].outputHash
        || studentOutputs.slice(0, 2).some((entry, index) =>
          entry.outputHash !== priorOutputs[index].outputHash)) {
        fail("ROSTER_TEACH_RETAINED_STUDENT_INVALID");
      }
      priorWal.push(studentWal[0]);
      priorOutputs.push(studentOutputs[2]);
      priorCalls.push(studentCalls[0]);
    }
    retained = { priorReport, priorWal, priorOutputs, priorCalls,
      sourceManifestHash: hash({ priorReport, priorWal,
        outputHashes: priorOutputs.map((entry) => entry.outputHash),
        providerReceiptHashes: priorCalls.map((entry) =>
          entry.providerReceiptHash) }) };
  }
  const prepared = await prepareRosterTeachLiveV1(runId);
  const route = createRosterStrategistRuntimeV1({
    armyBuilderPort: prepared.builder, laboratory: prepared.lab,
    strategyPack: prepared.pack,
  }).selectSkillRoute({
    ownFactionRecordKey: prepared.sessionInput.factionRecordKey,
    opponentFactionRecordKey:
      prepared.sessionInput.opponentFactionRecordKey,
  });
  if (!paid) {
    console.log(JSON.stringify({ status: "preflight_passed", runId,
      model: profile.model, providerCalls: 0,
      sourceLockHash: prepared.bundle.sourceLockHash,
      skillRouteReceiptHash: route.receipt.receiptHash,
      laboratoryDescriptorHash: prepared.lab.labDescriptor().descriptorHash,
      roomMutation: false, trainingTruth: false }));
    return;
  }

  const outputRoot = path.join(BUILD, resumeMode
    ? `resume-${attemptId}` : runId);
  await mkdir(outputRoot, { recursive: true });
  const reportPath = path.join(outputRoot, "report.json");
  const startedAt = new Date().toISOString();
  const providerCalls = [];
  const publicOutputs = [];
  const replayedRounds = [];
  const sendWal = [];
  const writeEvidence = async (name, value) => writeFile(
    path.join(outputRoot, name), `${JSON.stringify(value, null, 2)}\n`,
    { flag: "wx" });
  const saveWal = async () => writeFile(path.join(outputRoot, "send-wal.json"),
    `${JSON.stringify(sendWal, null, 2)}\n`);
  await writeFile(reportPath, `${JSON.stringify({ status: "started", runId,
    attemptId, retainedSourceManifestHash:
      retained?.sourceManifestHash ?? null,
    startedAt, providerCallsObserved: 0, trainingTruth: false }, null, 2)}\n`,
  { flag: "wx" });
  let worker = null;
  let workerRef = null;
  let credential = null;
  try {
    const ingress = await readStarcraftTmgDeepSeekCredentialFromKeychainV1();
    credential = ingress.credentialBytes;
    const registry = createStarcraftTmgProviderProfileRegistryV2({
      entries: [{ providerProfile: profile, responsePath: "/responses" }],
      allowedProviders: ["deepseek-openai-compatible-direct"],
    });
    const resolved = await registry.resolveEgressBinding({
      profileRef: { id: profile.providerProfileId,
        version: profile.version, hash: profile.integrity.hash },
    });
    if (resolved.ok !== true) fail("ROSTER_TEACH_PROFILE_UNAVAILABLE");
    const binding = resolved.egressBinding;
    worker = createStarcraftTmgStructuredProviderWorkerPortV1({
      providerProfileRegistry: registry, handshakeTimeoutMs: 5_000 });
    const attached = await worker.attachCredential({
      attachmentId: `ticket27-teach-${runId}`,
      providerProfile: profile, credentialBytes: credential });
    credential.fill(0);
    credential = null;
    if (!attached?.ok || !attached.workerRef) {
      fail("ROSTER_TEACH_CREDENTIAL_ATTACHMENT_FAILED");
    }
    workerRef = attached.workerRef;

    const deliberation = Object.freeze({
      descriptor: () => ({ kind: "live_secure_flash_structured_v1",
        modelVersion: profile.model,
        promptVersion: "ticket27.roster_teach.live.v1",
        trainingTruth: false }),
      async deliberate(request) {
        if (sendWal.length >= MAX_CALLS) {
          fail("ROSTER_TEACH_MAX_CALLS_REACHED");
        }
        const contract = contractFor(request.roundKind);
        if (request.responseFormat?.schemaName !== contract.schemaName
          || hash(request.responseFormat.outputContractRef)
            !== hash(outputContractRefStarcraftTmgV1(contract))) {
          fail("ROSTER_TEACH_CONTRACT_ROUTE_DRIFT");
        }
        const sendId = `${runId}-${request.roundIndex}-${request.roundKind}`;
        const body = {
          model: binding.model,
          instructions: INSTRUCTIONS,
          input: JSON.stringify({ promptPack: request.promptPack,
            promptNodes: request.promptNodes,
            userMessage: request.userMessage,
            responseContract: request.responseContract }),
          reasoning: { effort: "none" },
          temperature: binding.temperature, top_p: binding.topP,
          max_output_tokens: Math.min(request.maxOutputUnits,
            binding.maxOutputUnits), stream: false,
          text: { format: { type: "json_schema",
            name: contract.schemaName,
            schema: clone(contract.providerSchema) } },
        };
        const retainedIndex = retained?.priorOutputs.findIndex((entry) =>
          entry.roundKind === request.roundKind) ?? -1;
        if (retainedIndex >= 0) {
          const oldWal = retained.priorWal[retainedIndex];
          const oldCall = retained.priorCalls[retainedIndex];
          const oldOutput = retained.priorOutputs[retainedIndex];
          if (hash(body) !== oldWal.requestBodyHash
            || oldCall.outputContractHash !== contract.contractHash
            || oldCall.providerReceiptHash
              !== oldWal.transportReceiptHash) {
            fail("ROSTER_TEACH_RETAINED_REQUEST_DRIFT");
          }
          const validation = validateStarcraftTmgProviderJsonSchemaValueV1(
            contract.providerSchema, oldOutput.publicOutput);
          if (!validation.ok) fail("ROSTER_TEACH_RETAINED_OUTPUT_DRIFT");
          publicOutputs.push({ ...clone(oldOutput), replayed: true });
          replayedRounds.push({ roundKind: request.roundKind,
            originalProviderReceiptHash: oldCall.providerReceiptHash,
            outputHash: oldOutput.outputHash,
            requestBodyHash: oldWal.requestBodyHash });
          const replayReceipt = { roundKind: request.roundKind,
            contextHash: request.contextHash,
            outputHash: oldOutput.outputHash,
            sourceProviderReceiptHash: oldCall.providerReceiptHash,
            modelVersion: profile.model,
            paidProviderCall: false, trainingTruth: false };
          return { output: clone(oldOutput.publicOutput),
            receipt: { ...replayReceipt,
              receiptHash: hash(replayReceipt) } };
        }
        sendWal.push({ sendId, roundKind: request.roundKind,
          requestBodyHash: hash(body), status: "may_have_started",
          startedAt: new Date().toISOString() });
        await saveWal();
        const start = Date.now();
        let result;
        try {
          result = await worker.send({ workerRef,
            requestId: `ticket27-teach-${sendId}`,
            endpoint: clone(binding.endpoint), body,
            outputContractRef: outputContractRefStarcraftTmgV1(contract) });
        } catch (error) {
          sendWal.at(-1).status = "delivery_unknown_no_auto_retry";
          sendWal.at(-1).safeReceiptHash =
            error?.safeReceipt?.receiptHash ?? null;
          await saveWal();
          throw error;
        }
        sendWal.at(-1).status = "response_received";
        sendWal.at(-1).transportReceiptHash =
          result.transportReceipt?.receiptHash ?? null;
        await saveWal();
        if (BLOCKED_HTTP.has(result.status)) {
          fail("ROSTER_TEACH_PROVIDER_AUTH_OR_BUDGET_STOP");
        }
        let usage = null;
        try { usage = usageFrom(result.payload); } catch { /* unknown */ }
        const call = usage ? { roundKind: request.roundKind,
          providerReceiptHash: result.transportReceipt.receiptHash,
          requestedModel: profile.model,
          reportedModel: result.payload.model ?? null,
          status: result.status, usage,
          startedAt: sendWal.at(-1).startedAt,
          latencyMs: Date.now() - start,
          outputHash: null,
          outputContractHash: contract.contractHash,
          schemaValid: null,
          schemaIssues: [], trainingTruth: false } : null;
        if (call) providerCalls.push(call);
        if (result.status < 200 || result.status >= 300
          || result.payload?.status !== "completed"
          || result.physicalAttempts !== 1) {
          fail("ROSTER_TEACH_PROVIDER_RESPONSE_FAILED");
        }
        if (!usage) fail("ROSTER_TEACH_USAGE_UNKNOWN");
        const text = outputText(result.payload);
        const normalized = normalizeProviderJsonDocumentV1(text);
        let output;
        try { output = JSON.parse(normalized.text); }
        catch { fail("ROSTER_TEACH_PROVIDER_JSON_INVALID"); }
        const safeOutput = sanitize(output);
        if (Buffer.byteLength(JSON.stringify(safeOutput), "utf8")
          <= 512 * 1024) {
          publicOutputs.push({ roundKind: request.roundKind,
            outputHash: hash(output), publicOutput: safeOutput });
        }
        const validation = validateStarcraftTmgProviderJsonSchemaValueV1(
          contract.providerSchema, output);
        call.outputHash = hash(output);
        call.schemaValid = validation.ok;
        call.schemaIssues = validation.ok ? [] : validation.issues.slice(0, 8);
        if (!validation.ok) fail("ROSTER_TEACH_OUTPUT_SCHEMA_INVALID");
        const receiptBody = {
          roundKind: request.roundKind,
          contextHash: request.contextHash,
          outputHash: hash(output),
          providerReceiptHash: result.transportReceipt.receiptHash,
          usage, modelVersion: profile.model,
          paidProviderCall: true, trainingTruth: false,
        };
        return { output,
          receipt: { ...receiptBody, receiptHash: hash(receiptBody) } };
      },
    });

    const strategist = createRosterStrategistRuntimeV1({
      armyBuilderPort: prepared.builder, laboratory: prepared.lab,
      strategyPack: prepared.pack });
    const sessionId = `ticket27-teach-${runId}`;
    const rolePorts = createRosterTeachRolePortsV1({
      deliberation, sessionId });
    const session = await strategist.planRoster({
      sessionId, planId: `ticket27-teach-plan-${runId}`,
      ...prepared.sessionInput,
    }, { deliberation, teachPorts: rolePorts, maxProposalRounds: 2 });
    verifyRosterStrategistSessionReceiptV1(session.sessionReceipt);
    verifyRosterPlanRoundTripV1(session.plan);
    verifyRosterTeachCycleV1(session.teachCycle);
    const proof = prepared.lab.proveMutationZero();
    if (proof.sourceStateMutationCount !== 0) {
      fail("ROSTER_TEACH_LAB_MUTATION_DETECTED");
    }
    const usage = providerCalls.reduce((acc, entry) => ({
      inputUnits: acc.inputUnits + entry.usage.inputUnits,
      outputUnits: acc.outputUnits + entry.usage.outputUnits,
      totalUnits: acc.totalUnits + entry.usage.totalUnits,
    }), { inputUnits: 0, outputUnits: 0, totalUnits: 0 });
    const estimatedCostCny = priceCallsCny(providerCalls);
    await writeEvidence("roster-plan.json", session.plan);
    await writeEvidence("teach-cycle.json", session.teachCycle);
    await writeEvidence("planning-trace.json", session.planningTrace);
    await writeEvidence("provider-calls-redacted.json", providerCalls);
    await writeEvidence("public-outputs.json", publicOutputs);
    const report = { status: "passed", runId, attemptId, startedAt,
      finishedAt: new Date().toISOString(),
      retainedSourceManifestHash:
        retained?.sourceManifestHash ?? null,
      replayedRounds,
      priorPaidProviderCalls: retained?.priorCalls.length ?? 0,
      model: profile.model, providerCallsObserved: providerCalls.length,
      usage, estimatedCostCny, pricingConversion: "USDx8_estimate",
      planHash: session.plan.planHash,
      teachCycleHash: session.teachCycle.cycleHash,
      sessionReceiptHash: session.sessionReceipt.receiptHash,
      selectedRosterAuditHash:
        session.plan.rosterCandidate.legalityReceipt.auditResultHash,
      scoreRoute: session.plan.scoreRoute,
      roomMutation: false, sourceStateMutationCount: 0,
      canAffectRules: false, trainingTruth: false,
      userVisibleChecks: "not_yet_product_ui",
    };
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify({ status: report.status, runId, attemptId,
      replayedRounds: replayedRounds.length,
      providerCalls: report.providerCallsObserved,
      totalUnits: usage.totalUnits,
      estimatedCostCny, planHash: report.planHash,
      teachCycleHash: report.teachCycleHash }));
  } catch (error) {
    await writeFile(path.join(outputRoot, "provider-calls-redacted.json"),
      `${JSON.stringify(providerCalls, null, 2)}\n`).catch(() => {});
    await writeFile(path.join(outputRoot, "public-outputs.json"),
      `${JSON.stringify(publicOutputs, null, 2)}\n`).catch(() => {});
    await writeFile(reportPath, `${JSON.stringify({ status: "failed",
      runId, attemptId, startedAt, finishedAt: new Date().toISOString(),
      retainedSourceManifestHash:
        retained?.sourceManifestHash ?? null,
      replayedRounds,
      failureCode: safeCode(error),
      safeReceiptHash: error?.safeReceipt?.receiptHash ?? null,
      providerCallsObserved: providerCalls.length,
      sendAttemptCount: sendWal.length,
      usage: providerCalls.reduce((acc, entry) => ({
        inputUnits: acc.inputUnits + entry.usage.inputUnits,
        outputUnits: acc.outputUnits + entry.usage.outputUnits,
        totalUnits: acc.totalUnits + entry.usage.totalUnits,
      }), { inputUnits: 0, outputUnits: 0, totalUnits: 0 }),
      estimatedCostCny: priceCallsCny(providerCalls),
      pricingConversion: "USDx8_estimate",
      automaticRetry: false, trainingTruth: false }, null, 2)}\n`)
      .catch(() => {});
    console.error(safeCode(error));
    process.exitCode = 1;
  } finally {
    credential?.fill(0);
    if (worker && workerRef) await worker.detachCredential({ workerRef,
      reason: "ticket27-teach-live-finished" }).catch(() => {});
    await worker?.close().catch(() => {});
  }
}

if (process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
