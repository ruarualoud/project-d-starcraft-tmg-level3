#!/usr/bin/env node

import http from "node:http";
import { generateKeyPairSync, randomBytes, timingSafeEqual } from "node:crypto";
import { existsSync } from "node:fs";
import { appendFile, mkdir, readFile, readdir, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

import {
  createStarcraftTmgLevel3HttpAdapter,
  STARCRAFT_TMG_LEVEL3_API_PREFIX,
} from "../packages/http-adapter/handler-v1.mjs";
import {
  STARCRAFT_TMG_HOSTED_BOT_SEAT_API_PREFIX,
  STARCRAFT_TMG_HOSTED_BOT_SEAT_HTTP_VERSION,
} from "../packages/client-domain/hosted-bot-seat-transport-v1.mjs";
import { createStarcraftTmgRefereeCrypto } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createStarcraftTmgLiveOpponentProviderStackV1 } from
  "../packages/online-agent-session/live-opponent-provider-stack-v1.mjs";
import { createSqliteStarcraftTmgHostedBotSeatStoreV1 } from
  "../packages/online-agent-session/sqlite-hosted-bot-seat-store-v1.mjs";
import { createSqliteStarcraftTmgMatchDecisionJournalV1 } from
  "../packages/online-agent-session/sqlite-match-decision-journal-v1.mjs";
import { prepareVersionedRoomMemoryHandoffV1 } from
  "../packages/online-agent-session/versioned-room-memory-handoff-v1.mjs";
import { createOfficialCompetitiveMapConfiguratorV1 } from
  "../packages/product-composition/official-competitive-map-configurator-v1.mjs";
import { createRosterPlanningProductModuleV1 } from
  "../packages/product-composition/roster-planning-product-module-v1.mjs";
import { loadPregameResumeDraftV1, loadReviewedPregameRevisionV1 } from
  "../packages/roster-planning-workspace/pregame-resume-draft-v1.mjs";
import { adoptReviewedPregameResumeRevisionV1 } from
  "../packages/product-composition/roster-plan-resume-revision-v1.mjs";
import { verifyAgentScheduledRosterPlanV1 } from
  "../packages/roster-strategist/agent-scheduled-roster-plan-v1.mjs";
import {
  OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1,
  OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY,
} from "../packages/product-composition/official-standard-room-factory-v1.mjs";
import { createStarcraftTmgPrivatePayloadCodec } from
  "../packages/room-store/room-store-v1.mjs";
import { createSqliteStarcraftTmgRoomStore } from
  "../packages/room-store/sqlite-room-store-v1.mjs";
import { createStarcraftTmgLiveMatchEvolutionExportV1 } from
  "../packages/training-data/live-match-evolution-export-v1.mjs";
import { createTicket20AgentAgentDemoFixtureV1 } from
  "./support/ticket20-human-agent-demo-fixture-v1.mjs";
import { resolveOfficialDevelopmentTrancheFixtureRootV1 } from
  "./support/official-development-tranche-source-lock-fixture-v1.mjs";
import { resolveTicket23AgentAgentInteractionModeV1 } from
  "./support/ticket23-agent-agent-resume-interaction-mode-v1.mjs";
import { STARCRAFT_TMG_TICKET_23_LIVE_FLASH_PROVIDER_PROFILE_V1 } from
  "../content/provider/ticket-23-live-provider-profiles-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LIVE_ROOT = path.join(ROOT,
  "build/ticket-23-slice-248-standard-2000-aa-live-v1");
const VERSIONED_FORK_ROOT = path.join(ROOT,
  "build/ticket-23-slice-248-versioned-charge-room-forks-v1");
const CURRENT_WEB_ROOT = process.env.STARCRAFT_TMG_PRODUCT_WEB_ROOT
  ? path.resolve(process.env.STARCRAFT_TMG_PRODUCT_WEB_ROOT)
  : path.join(ROOT, "apps/starcraft-tmg-expo/dist");
const PRODUCT_WEB_ROOT = CURRENT_WEB_ROOT;
const WEB_SOURCE_ROOT = path.join(ROOT, "apps/starcraft-tmg-expo");
const WEB_SOURCE_DIRECTORIES = Object.freeze([
  "app", "assets", "components", "constants", "hooks", "lib",
]);
const WEB_SOURCE_FILES = Object.freeze([
  "app.config.ts", "babel.config.js", "global.css", "metro.config.js",
  "package.json", "tailwind.config.js", "tsconfig.json",
]);
// Expo resolves these workspace modules into the static browser bundle. A
// source-only timestamp check used to miss them, allowing a newer viewer
// projection contract to be served to an older browser validator.
const WEB_TRANSITIVE_SOURCE_PATHS = Object.freeze([
  path.join(ROOT, "packages/client-domain"),
  path.join(ROOT,
    "packages/online-agent-session/portable-credential-material-v1.mjs"),
  path.join(ROOT,
    "packages/online-agent-session/portable-http-wire-v1.mjs"),
  path.join(ROOT,
    "content/official-faq-f3-movement-battlefield-deployment-binding-v1.mjs"),
  path.join(ROOT,
    "content/official-faq-f4-ability-tactical-keyword-binding-v1.mjs"),
]);
const PRODUCT_WEB_DOCUMENTS = new Map([
  ["/", "index.html"], ["/index.html", "index.html"],
  ["/army", "army.html"], ["/match", "match.html"],
  ["/tools", "tools.html"], ["/settings", "settings.html"],
  ["/(tabs)", "(tabs)/index.html"],
  ["/(tabs)/army", "(tabs)/army.html"],
  ["/(tabs)/match", "(tabs)/match.html"],
  ["/(tabs)/tools", "(tabs)/tools.html"],
  ["/(tabs)/settings", "(tabs)/settings.html"],
]);
const MIME_TYPES = Object.freeze({
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png", ".svg": "image/svg+xml", ".webp": "image/webp",
  ".woff": "font/woff", ".woff2": "font/woff2",
});
const PUBLIC_BROWSER_CONTENT_MODULES = new Set([
  "official-faq-f3-movement-battlefield-deployment-binding-v1.mjs",
  "official-faq-f4-ability-tactical-keyword-binding-v1.mjs",
]);
const MAX_BODY_BYTES = 256 * 1024;
const SEATS = Object.freeze(["player1", "player2"]);

function reviewedPlanArtifactPath(filename) {
  if (typeof filename !== "string" || !filename.trim()
    || path.isAbsolute(filename)) {
    throw new Error("SLICE272_REVIEWED_PLAN_ARTIFACT_PATH_INVALID");
  }
  const absolute = path.resolve(ROOT, filename);
  const relative = path.relative(ROOT, absolute);
  if (!relative || relative === ".."
    || relative.startsWith(`..${path.sep}`)) {
    throw new Error("SLICE272_REVIEWED_PLAN_ARTIFACT_PATH_INVALID");
  }
  return absolute;
}

async function readReviewedPlanArtifact(filename) {
  return JSON.parse(await readFile(reviewedPlanArtifactPath(filename),
    "utf8"));
}

function sourceDomain(value) {
  return value?.sourceDomain || value;
}

function sourceAction(value) {
  let current = value;
  while (current?.sourceAction) current = current.sourceAction;
  return current || {};
}

function actionIdentity(value) {
  const action = sourceAction(value);
  return {
    actionType: action.actionType || null,
    sideKey: action.sideKey || null,
    phase: action.phase || null,
    pieceId: action.pieceId || null,
    abilityName: action.abilityName || null,
    effectKind: action.effectKind
      || action.abilityPlan?.effectKind
      || action.characteristicStatusPlan?.effectKind || null,
    definitionId: action.definitionId || null,
    chosenFirstActorSideKey: action.chosenFirstActorSideKey || null,
  };
}

function sameActionIdentity(left, right) {
  const a = actionIdentity(left);
  const b = actionIdentity(right);
  const core = ["actionType", "sideKey", "phase", "pieceId"];
  if (!core.every((key) => a[key] === b[key])) return false;
  // Accepted executable actions may intentionally omit presentation-only
  // identity fields retained by their source parameter domain. Match every
  // discriminator preserved by the historical action, then require the caller
  // to prove the result is unique instead of treating an omitted label as a
  // different Rules action.
  return ["abilityName", "effectKind", "definitionId",
    "chosenFirstActorSideKey"].every((key) => (
    b[key] === null || a[key] === b[key]
  ));
}

async function loadForkSource(sourceDirectory, throughRevision) {
  const sourcePrivate = JSON.parse(await readFile(path.join(sourceDirectory,
    "runner-private.json"), "utf8"));
  const sourceRunId = path.basename(sourceDirectory);
  const sourceStore = createSqliteStarcraftTmgRoomStore({
    filename: path.join(sourceDirectory, "room.sqlite"),
    privatePayloadCodec: createStarcraftTmgPrivatePayloadCodec({
      key: sourcePrivate.storeEncryptionKeyBase64,
      keyId: `ticket23-slice248-room-store-${sourceRunId}`,
      trustLevel: "development_persistent",
    }),
  });
  try {
    const bundle = await sourceStore.loadReplayBundle(sourcePrivate.roomId);
    const receipts = (bundle.privateJournal || [])
      .filter((entry) => entry.payload?.type === "accepted_transition")
      .map((entry) => entry.payload.payload.receipt)
      .filter((receipt) => Number(receipt.postStateRevision) <= throughRevision)
      .sort((left, right) => Number(left.postStateRevision)
        - Number(right.postStateRevision));
    if (receipts.length !== throughRevision
      || Number(receipts.at(-1)?.postStateRevision || 0) !== throughRevision) {
      throw new Error("SLICE265_FORK_PREFIX_INCOMPLETE");
    }
    const sourceActions = (await readFile(path.join(sourceDirectory,
      "actions.ndjson"), "utf8")).split(/\r?\n/gu).filter(Boolean)
      .map((line) => JSON.parse(line))
      .filter((entry) => Number(entry.postStateRevision) <= throughRevision)
      .sort((left, right) => Number(left.postStateRevision)
        - Number(right.postStateRevision));
    return { sourceRunId, sourceRoomId: sourcePrivate.roomId,
      sourceDirectory, receipts, sourceActions };
  } finally {
    sourceStore.close();
  }
}

async function seedForkContinuity({ fixture, roomId, forkSource, fork }) {
  const seatBindings = {
    player1: {
      seatToken: fixture.createdRoom.credentials.human.seatToken,
      scope: fixture.player1Scope,
      continuity: fixture.player1Continuity,
    },
    player2: {
      seatToken: fixture.createdRoom.credentials.bot.seatToken,
      scope: fixture.botScope,
      continuity: fixture.continuity,
    },
  };
  const seeds = [];
  for (const [sideKey, binding] of Object.entries(seatBindings)) {
    const source = forkSource.sourceActions.filter((entry) =>
      entry.sideKey === sideKey && entry.modelDecision === true).at(-1);
    if (!source) continue;
    const room = await fixture.roomRuntime.readRoom({ roomId,
      seatToken: binding.seatToken });
    const legal = await fixture.roomRuntime.legalSpace({ roomId,
      seatToken: binding.seatToken });
    if (!room?.ok || !legal?.ok) {
      throw new Error(`SLICE265_FORK_MEMORY_AUTHORITY_FAILED:${sideKey}`);
    }
    const sourcePlan = source.planRevision || {};
    const sourceIntent = source.intent || {};
    const planId = `fork-prefix-${sideKey}-${fork.sourceRunId}-r${
      fork.throughStateRevision}`;
    const persisted = await binding.continuity.record({
      scope: binding.scope,
      roomProjection: room.projection,
      legalSpace: legal.legalSpace,
      turnPlan: {
        planId,
        sourcePlanId: sourcePlan.planId || null,
        objective: sourcePlan.objective || sourceIntent.purpose || null,
        currentGoal: sourcePlan.currentGoal || sourceIntent.currentGoal || null,
        strategicApproach: structuredClone(sourcePlan.strategicApproach || []),
        activationPriorities: structuredClone(
          sourcePlan.activationPriorities || []),
        resourcePolicy: structuredClone(sourcePlan.resourcePolicy || []),
        initiativePolicy: structuredClone(sourcePlan.initiativePolicy || []),
        reservePolicy: structuredClone(sourcePlan.reservePolicy || []),
        reviseIf: structuredClone(sourcePlan.reviseIf
          || sourceIntent.stopOrReplanTriggers || []),
        opponentModel: structuredClone(sourcePlan.opponentModel || []),
        status: "active",
        revisionReason:
          "last legal high-strategy prefix replayed into a fresh branch",
        forkSourceRunId: fork.sourceRunId,
        forkThroughStateRevision: fork.throughStateRevision,
        eligibleForTraining: false,
        trainingTruth: false,
      },
      decision: {
        candidateId: null,
        planId,
        intentId: null,
        currentGoal: sourceIntent.currentGoal || sourcePlan.currentGoal || null,
        selectedReason: sourceIntent.selectedReason || null,
        decisionSummary: sourceIntent.decisionSummary || null,
        planContinuity:
          "Recovered from the last legal high-strategy prefix; reassess from current Rules authority before selecting a new candidate.",
        scoreOrPositionValue: sourceIntent.scoreOrPositionValue || null,
        expectedOwnOutcome: sourceIntent.expectedOwnOutcome || null,
        predictedOpponentResponses: structuredClone(
          sourceIntent.predictedOpponentResponses || []),
        tradeoffs: structuredClone(sourceIntent.tradeoffs || []),
        risks: structuredClone(sourceIntent.risks || []),
        fallbacks: structuredClone(sourceIntent.fallbacks || []),
        unitIds: structuredClone(sourceIntent.unitIds || []),
        abilitiesIntended: structuredClone(
          sourceIntent.abilitiesIntended || []),
        resourcesIntended: structuredClone(
          sourceIntent.resourcesIntended || []),
        nextDecisionFocus: sourceIntent.nextDecisionFocus || null,
        rejectedAlternatives: structuredClone(
          sourceIntent.rejectedAlternatives || []),
      },
      decisionStatus: "fork_prefix_replayed_reassessment_required",
      outcome: {
        status: "fork_prefix_replayed_and_replay_verified",
        receiptHash: fork.replayedTransitions.at(-1)?.branchJournalHash || null,
        resultSummary: `Replayed accepted source prefix through revision ${
          fork.throughStateRevision}; invalid suffix was not copied.`,
        observedSignals: ["authoritative_prefix_replayed",
          "invalid_suffix_excluded"],
        planImpact: "reassess_against_fresh_legal_space",
        sourceRunId: fork.sourceRunId,
        sourceStateRevision: Number(source.postStateRevision),
        eligibleForTraining: false,
        trainingTruth: false,
      },
    });
    seeds.push({ sideKey, sourceStateRevision: Number(source.postStateRevision),
      recordCount: persisted.recorded, status: "seeded_for_reassessment" });
  }
  return seeds;
}

async function replayForkPrefix({ fixture, roomId, forkSource }) {
  const seatTokens = {
    player1: fixture.createdRoom.credentials.human.seatToken,
    player2: fixture.createdRoom.credentials.bot.seatToken,
  };
  const replayedTransitions = [];
  for (const sourceReceipt of forkSource.receipts) {
    const seatKey = sourceReceipt.applyingSeatKey;
    const seatToken = seatTokens[seatKey];
    const aggregate = await fixture.roomRuntime.roomStore.loadRoom(roomId);
    const legal = await fixture.roomRuntime.legalSpace({ roomId, seatToken });
    if (!legal?.ok) throw new Error(`SLICE265_FORK_LEGALSPACE_FAILED:${
      legal?.reason || seatKey}`);
    const sourceProposal = sourceReceipt.proposal;
    let previewInput;
    if (sourceProposal.kind === "finite") {
      const candidate = (legal.legalSpace.finiteActions || []).find((entry) =>
        sameActionIdentity(entry.action, sourceReceipt.action));
      if (!candidate) throw new Error(
        `SLICE265_FORK_FINITE_ACTION_MISSING:${sourceReceipt.postStateRevision}`);
      previewInput = { candidateId: candidate.actionKey };
    } else {
      const domains = (legal.legalSpace.parameterDomains || []).filter((entry) =>
        sameActionIdentity(sourceDomain(entry), sourceReceipt.action));
      const domainMatchStatus = domains.length === 0 ? "MISSING" : "AMBIGUOUS";
      if (domains.length !== 1) throw new Error(
        "SLICE265_FORK_DOMAIN_" + domainMatchStatus + ":"
          + sourceReceipt.postStateRevision + ":" + domains.length);
      const [domain] = domains;
      previewInput = { proposal: { kind: "parameterized",
        domainId: domain.domainId,
        parameters: structuredClone(sourceProposal.parameters) } };
    }
    const preview = await fixture.roomRuntime.previewAction({
      roomId, seatToken, ...previewInput,
      expectedMatchBindingHash: fixture.createdRoom.matchBinding.bindingHash,
      expectedLegalSpaceHash: legal.legalSpace.legalSpaceHash,
      expectedStateRevision: aggregate.stateRevision,
      expectedStateHash: aggregate.envelope.stateHash,
    });
    if (!preview?.ok) throw new Error(`SLICE265_FORK_PREVIEW_FAILED:${
      sourceReceipt.postStateRevision}:${JSON.stringify({
        reason: preview?.reason || "unknown",
        message: preview?.message || null,
        rulesReason: preview?.rulesReason || null,
        field: preview?.field || null,
        actionIdentity: actionIdentity(sourceReceipt.action),
      })}`);
    let confirmationId = null;
    if (preview.confirmationRequired) {
      const confirmed = await fixture.roomRuntime.confirmPreview({
        roomId, seatToken,
        previewId: preview.preview.previewId,
        previewToken: preview.preview.previewToken,
        previewContentHash: preview.preview.previewSeal.contentHash,
      });
      if (!confirmed?.ok) throw new Error(`SLICE265_FORK_CONFIRM_FAILED:${
        sourceReceipt.postStateRevision}:${confirmed?.reason || "unknown"}`);
      confirmationId = confirmed.confirmation.confirmationId;
    }
    const control = await fixture.roomRuntime.claimControl({
      roomId, seatToken,
      sessionId: `slice265-fork-prefix:${roomId}:${seatKey}`,
    });
    if (!control?.ok) throw new Error(`SLICE265_FORK_CONTROL_FAILED:${
      sourceReceipt.postStateRevision}:${control?.reason || "unknown"}`);
    const applied = await fixture.roomRuntime.applyAction({
      roomId, seatToken,
      previewId: preview.preview.previewId,
      confirmationId,
      leaseId: control.controlLease.leaseId,
      leaseFence: control.controlLease.leaseFence,
      expectedStateRevision: aggregate.stateRevision,
      idempotencyKey: `slice265-fork-prefix:${sourceReceipt.postStateRevision}`,
    });
    if (!applied?.ok) throw new Error(`SLICE265_FORK_APPLY_FAILED:${
      sourceReceipt.postStateRevision}:${applied?.reason || "unknown"}`);
    replayedTransitions.push({
      sourceStateRevision: sourceReceipt.postStateRevision,
      sourceJournalHash: sourceReceipt.journalHash,
      branchStateRevision: applied.receipt.postStateRevision,
      branchJournalHash: applied.receipt.journalHash,
      branchStateHash: applied.receipt.postStateHash,
      actionType: applied.receipt.action.actionType,
      sideKey: seatKey,
    });
    if (replayedTransitions.length % 5 === 0
      || replayedTransitions.length === forkSource.receipts.length) {
      process.stdout.write(`${JSON.stringify({
        schemaVersion: "ticket23_slice248_fork_start_progress_v1",
        replayed: replayedTransitions.length,
        total: forkSource.receipts.length,
        providerCalls: 0,
      })}\n`);
    }
  }
  return {
    schema: "ticket25_slice265_high_strategy_fork_v1",
    sourceRunId: forkSource.sourceRunId,
    sourceRoomId: forkSource.sourceRoomId,
    throughStateRevision: forkSource.receipts.length,
    replayedTransitions,
    providerCalls: 0,
    paidCostCny: 0,
    invalidSuffixCopied: false,
    trainingTruth: false,
  };
}

function safeFile(root, relativePath) {
  const target = path.resolve(root, relativePath);
  return target === root || target.startsWith(`${root}${path.sep}`)
    ? target : null;
}

function staticCandidate(pathname) {
  if (pathname.startsWith("/packages/")) return {
    root: path.join(ROOT, "packages"),
    relativePath: pathname.slice("/packages/".length),
  };
  if (pathname.startsWith("/content/")) {
    const relativePath = pathname.slice("/content/".length);
    return PUBLIC_BROWSER_CONTENT_MODULES.has(relativePath)
      ? { root: path.join(ROOT, "content"), relativePath } : null;
  }
  if (pathname.startsWith("/assets/client/")) return {
    root: path.join(ROOT, "assets/client"),
    relativePath: pathname.slice("/assets/client/".length),
  };
  if (PRODUCT_WEB_DOCUMENTS.has(pathname)) return {
    root: PRODUCT_WEB_ROOT,
    relativePath: PRODUCT_WEB_DOCUMENTS.get(pathname),
  };
  if (pathname === "/room" || pathname.startsWith("/room/")) return {
    root: PRODUCT_WEB_ROOT, relativePath: "room/[roomId].html",
  };
  return { root: PRODUCT_WEB_ROOT,
    relativePath: pathname.replace(/^\/+/, "") };
}

async function serveFile(response, descriptor, extraHeaders = {}) {
  if (!descriptor) return false;
  const filename = safeFile(descriptor.root, descriptor.relativePath);
  if (!filename) return false;
  try {
    const info = await stat(filename);
    if (!info.isFile()) return false;
    const body = await readFile(filename);
    response.writeHead(200, {
      "cache-control": "no-store",
      "content-length": String(body.byteLength),
      "content-type": MIME_TYPES[path.extname(filename)]
        || "application/octet-stream",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
      ...extraHeaders,
    });
    response.end(body);
    return true;
  } catch {
    return false;
  }
}

function sendJson(response, status, body) {
  const bytes = Buffer.from(JSON.stringify(body), "utf8");
  response.writeHead(status, {
    "cache-control": "private, no-store, max-age=0",
    "content-length": String(bytes.byteLength),
    "content-type": "application/json; charset=utf-8",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
  });
  response.end(bytes);
}

async function readRequestBody(request) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.byteLength;
    if (bytes > MAX_BODY_BYTES) throw new Error("PAYLOAD_TOO_LARGE");
    chunks.push(chunk);
  }
  const rawBody = Buffer.concat(chunks);
  return { rawBody, body: rawBody.byteLength
    ? JSON.parse(rawBody.toString("utf8")) : {}, bodyBytes: rawBody.byteLength };
}

function authorizeRunner(request, runnerToken) {
  const supplied = Buffer.from(String(
    request.headers["x-ticket23-runner-token"] || ""), "utf8");
  const expected = Buffer.from(runnerToken, "utf8");
  return supplied.byteLength === expected.byteLength
    && timingSafeEqual(supplied, expected);
}

function authorizeUiControl(request, uiControlToken) {
  const cookie = String(request.headers.cookie || "").split(";")
    .map((entry) => entry.trim()).find((entry) => (
      entry.startsWith("ticket23_a2a_ui=")
    ));
  const supplied = Buffer.from(cookie
    ? decodeURIComponent(cookie.slice("ticket23_a2a_ui=".length)) : "", "utf8");
  const expected = Buffer.from(uiControlToken, "utf8");
  return supplied.byteLength === expected.byteLength
    && timingSafeEqual(supplied, expected);
}

async function newestFileMtime(target) {
  if (!existsSync(target)) return 0;
  const info = await stat(target);
  if (info.isFile()) return info.mtimeMs;
  let newest = 0;
  for (const entry of await readdir(target, { withFileTypes: true })) {
    if (entry.name === "dist" || entry.name === "node_modules") continue;
    newest = Math.max(newest, await newestFileMtime(path.join(
      target, entry.name)));
  }
  return newest;
}

async function verifyCurrentWebBundle() {
  const indexPath = path.join(CURRENT_WEB_ROOT, "index.html");
  if (!existsSync(indexPath)) {
    throw new Error("SLICE248_CURRENT_WEB_EXPORT_MISSING");
  }
  const sourceMtimes = await Promise.all([
    ...WEB_SOURCE_DIRECTORIES.map((entry) => newestFileMtime(path.join(
      WEB_SOURCE_ROOT, entry))),
    ...WEB_SOURCE_FILES.map((entry) => newestFileMtime(path.join(
      WEB_SOURCE_ROOT, entry))),
    ...WEB_TRANSITIVE_SOURCE_PATHS.map(newestFileMtime),
  ]);
  const newestSourceMtimeMs = Math.max(...sourceMtimes);
  const indexMtimeMs = (await stat(indexPath)).mtimeMs;
  if (indexMtimeMs < newestSourceMtimeMs) {
    throw Object.assign(new Error("SLICE248_CURRENT_WEB_EXPORT_STALE"), {
      indexMtimeMs,
      newestSourceMtimeMs,
    });
  }
  return {
    root: path.relative(ROOT, CURRENT_WEB_ROOT),
    entry: path.relative(ROOT, indexPath),
    indexMtimeMs,
    newestSourceMtimeMs,
    currentSourceNotNewer: true,
  };
}

function sumUsage(projections) {
  const rows = Object.values(projections).map((entry) => entry?.usage || {});
  return {
    providerCalls: rows.reduce((sum, entry) =>
      sum + Number(entry.providerCalls || 0), 0),
    inputUnits: rows.reduce((sum, entry) =>
      sum + Number(entry.inputUnits || 0), 0),
    outputUnits: rows.reduce((sum, entry) =>
      sum + Number(entry.outputUnits || 0), 0),
    totalUnits: rows.reduce((sum, entry) =>
      sum + Number(entry.totalUnits || 0), 0),
    estimatedCostCnyMicros: rows.reduce((sum, entry) =>
      sum + Number(entry.estimatedCostCnyMicros || 0), 0),
  };
}

function compactTrace(trace = {}) {
  return Object.fromEntries([
    "applyReceiptHash", "actionType", "authorityActionType", "candidateId",
    "pieceId", "postStateRevision", "postStateHash",
    "publicDecisionSummary", "decisionMaterialEvidence", "plan", "assessment",
    "planRevision", "intent",
    "plannerResult", "lifecycleAssessment",
    "formationSelection", "assetPlacementSelection", "placementRationales",
    "selectedReason", "risk", "providerCalls", "providerInputUnits",
    "providerOutputUnits", "providerTotalUnits", "matchEstimatedCostCnyMicros",
    "replayMatchesCurrent",
  ].filter((key) => trace[key] !== undefined).map((key) => [key, trace[key]]));
}

function compactSeatProjection(projection = {}) {
  const bot = projection.bot || projection;
  return {
    bot: {
      lifecycle: bot.lifecycle || null,
      driveStatus: bot.driveStatus || null,
      actionCount: Number(bot.actionCount || 0),
      issues: Array.isArray(bot.issues) ? bot.issues : [],
      recentTraces: (bot.recentTraces || []).slice(-4).map(compactTrace),
    },
    notificationIssues: Array.isArray(projection.notificationIssues)
      ? projection.notificationIssues : [],
  };
}

function compactProviderProjection(projection = {}) {
  return {
    scope: projection.scope || null,
    budget: projection.budget || null,
    lifecycle: projection.lifecycle || null,
    issues: Array.isArray(projection.issues) ? projection.issues : [],
    usage: projection.usage || {},
  };
}

async function main() {
  const budgetArgument = process.argv.find((entry) =>
    entry.startsWith("--per-room-budget-cny="));
  const perRoomBudgetCny = process.argv.includes("--no-cost-limit") || !budgetArgument
    ? null : Number(budgetArgument.slice("--per-room-budget-cny=".length));
  const perSeatBudgetCnyMicros = perRoomBudgetCny === null
    ? null : perRoomBudgetCny * 1_000_000 / 2;
  if (perSeatBudgetCnyMicros !== null && (!Number.isSafeInteger(perSeatBudgetCnyMicros)
    || perSeatBudgetCnyMicros <= 0)) {
    throw new Error("SLICE248_PER_ROOM_BUDGET_INVALID");
  }
  const forkPreflightOnly = process.argv.includes("--fork-preflight-only");
  const versionedForkPreflightOnly = process.argv.includes(
    "--versioned-fork-preflight-only");
  const versionedForkMemoryHandoffOnly = process.argv.includes(
    "--versioned-fork-memory-handoff-only");
  const pregamePreflightOnly = process.argv.includes(
    "--pregame-preflight-only");
  const webBundle = forkPreflightOnly || pregamePreflightOnly
    || versionedForkPreflightOnly || versionedForkMemoryHandoffOnly ? {
    status: pregamePreflightOnly
      ? "skipped_for_pregame_room_preflight"
      : versionedForkPreflightOnly || versionedForkMemoryHandoffOnly
        ? "skipped_for_versioned_fork_preflight"
        : "skipped_for_rules_only_fork_preflight",
    sourceRefreshPerformed: false,
    trainingTruth: false,
  } : await verifyCurrentWebBundle();
  const resumeArgument = process.argv.find((entry) =>
    entry.startsWith("--resume-directory="));
  const requestedResumeDirectory = resumeArgument
    ? path.resolve(resumeArgument.slice("--resume-directory=".length)) : null;
  const adoptPlanArgument = process.argv.find(entry => entry.startsWith("--adopt-reviewed-plan-hash="));
  const requestedPlanRevisionHash = adoptPlanArgument?.slice("--adopt-reviewed-plan-hash=".length) || null;
  const planRevisionOnly = process.argv.includes("--plan-revision-only");
  if ((requestedPlanRevisionHash && (!requestedResumeDirectory
    || !/^[a-f0-9]{64}$/.test(requestedPlanRevisionHash)))
    || (planRevisionOnly && !requestedPlanRevisionHash)) {
    throw new Error("SLICE272_PLAN_REVISION_REQUIRES_EXPLICIT_RESUME_TARGET");
  }
  const runtimeVariantArgument = process.argv.find((entry) =>
    entry.startsWith("--current-product-runtime-variant="));
  const requestedRuntimeVariant = runtimeVariantArgument
    ?.slice("--current-product-runtime-variant=".length) || null;
  if (runtimeVariantArgument && (requestedResumeDirectory
    || !["charge_endpoint_v2", "charge_access_v3",
      "charge_cross_section_v4", "charge_round_path_v5", "singleton_identity_v6"].includes(
      requestedRuntimeVariant))) {
    throw new Error("SLICE248_RUNTIME_VARIANT_OVERRIDE_INVALID");
  }
  const admissionManifestArgument = process.argv.find((entry) =>
    entry.startsWith("--pregame-agent-selected-admission-manifest="));
  const admissionManifest = admissionManifestArgument
    ? await readReviewedPlanArtifact(admissionManifestArgument.slice(
      "--pregame-agent-selected-admission-manifest=".length)) : null;
  if (admissionManifest && (requestedResumeDirectory
    || admissionManifest.schemaVersion
      !== "ticket27_slice272_reviewed_plan_room_admission_v1"
    || admissionManifest.trainingTruth !== false
    || !admissionManifest.iterativeSessionId
    || !admissionManifest.teachSessionId
    || !Array.isArray(admissionManifest.intermediatePlanArtifactPaths))) {
    throw new Error("SLICE272_REVIEWED_PLAN_ADMISSION_MANIFEST_INVALID");
  }
  const plannedSessionArgument = process.argv.find((entry) =>
    entry.startsWith("--pregame-roster-session-id="));
  const requestedPlannedSessionId = plannedSessionArgument
    ? plannedSessionArgument.slice("--pregame-roster-session-id=".length)
    : null;
  const opponentPlanArgument = process.argv.find((entry) =>
    entry.startsWith("--opponent-pregame-roster-session-id="));
  const opponentPlanDirectoryArgument = process.argv.find((entry) =>
    entry.startsWith("--opponent-roster-plan-data-directory="));
  const agentSelectedIterativeArgument = process.argv.find((entry) =>
    entry.startsWith("--pregame-agent-selected-iterative-session-id="));
  const agentSelectedTeachArgument = process.argv.find((entry) =>
    entry.startsWith("--pregame-agent-selected-teach-session-id="));
  const agentSelectedIterativeSessionId = agentSelectedIterativeArgument
    ?.slice("--pregame-agent-selected-iterative-session-id=".length)
    || admissionManifest?.iterativeSessionId || null;
  const agentSelectedTeachSessionId = agentSelectedTeachArgument
    ?.slice("--pregame-agent-selected-teach-session-id=".length)
    || admissionManifest?.teachSessionId || null;
  const requestedAgentSelected = Boolean(agentSelectedIterativeSessionId
    && agentSelectedTeachSessionId);
  const autoDriveOnLaunch = process.argv.includes("--auto-drive-on-launch");
  const pregameStartupAt = Date.now();
  const reportPregameStartup = (stage) => {
    if (!requestedAgentSelected) return;
    process.stdout.write(`${JSON.stringify({
      schemaVersion: "ticket27_slice272_pregame_startup_progress_v1",
      stage,
      elapsedMs: Date.now() - pregameStartupAt,
      providerCalls: 0,
      trainingTruth: false,
    })}\n`);
  };
  if (Boolean(agentSelectedIterativeSessionId)
    !== Boolean(agentSelectedTeachSessionId)
    || (admissionManifest && (agentSelectedIterativeArgument
      || agentSelectedTeachArgument))
    || (requestedAgentSelected && (requestedPlannedSessionId
      || requestedResumeDirectory))
    || (autoDriveOnLaunch && (!requestedAgentSelected
      || requestedResumeDirectory))) {
    throw new Error("SLICE272_AGENT_SELECTED_PREGAME_MODE_INVALID");
  }
  if (pregamePreflightOnly && !requestedPlannedSessionId
    && !requestedAgentSelected) {
    throw new Error("SLICE272_PREGAME_PREFLIGHT_SESSION_REQUIRED");
  }
  const versionedForkDirectory = requestedResumeDirectory
    && requestedResumeDirectory.startsWith(`${VERSIONED_FORK_ROOT}${path.sep}`)
    ? requestedResumeDirectory : null;
  if (versionedForkPreflightOnly && !versionedForkDirectory) {
    throw new Error("SLICE248_VERSIONED_FORK_PREFLIGHT_DIRECTORY_REQUIRED");
  }
  if (versionedForkMemoryHandoffOnly && !versionedForkDirectory) {
    throw new Error("SLICE248_VERSIONED_FORK_HANDOFF_DIRECTORY_REQUIRED");
  }
  if (requestedResumeDirectory
    && !versionedForkDirectory
    && requestedResumeDirectory !== LIVE_ROOT
    && !requestedResumeDirectory.startsWith(`${LIVE_ROOT}${path.sep}`)) {
    throw new Error("SLICE248_RESUME_DIRECTORY_OUTSIDE_LIVE_ROOT");
  }
  const forkSourceArgument = process.argv.find((entry) =>
    entry.startsWith("--fork-source-directory="));
  const requestedForkSourceDirectory = forkSourceArgument
    ? path.resolve(forkSourceArgument.slice("--fork-source-directory=".length))
    : null;
  const forkRevisionArgument = process.argv.find((entry) =>
    entry.startsWith("--fork-through-revision="));
  const forkThroughRevision = forkRevisionArgument
    ? Number(forkRevisionArgument.slice("--fork-through-revision=".length))
    : null;
  if (requestedResumeDirectory && requestedForkSourceDirectory) {
    throw new Error("SLICE265_FORK_AND_RESUME_MUTUALLY_EXCLUSIVE");
  }
  if (requestedForkSourceDirectory
    && (requestedForkSourceDirectory === LIVE_ROOT
      || !requestedForkSourceDirectory.startsWith(`${LIVE_ROOT}${path.sep}`)
      || !Number.isSafeInteger(forkThroughRevision)
      || forkThroughRevision < 1)) {
    throw new Error("SLICE265_FORK_SOURCE_INVALID");
  }
  const forkSource = requestedForkSourceDirectory
    ? await loadForkSource(requestedForkSourceDirectory, forkThroughRevision)
    : null;
  if (forkPreflightOnly && !forkSource) {
    throw new Error("SLICE265_FORK_PREFLIGHT_SOURCE_REQUIRED");
  }
  const retryProviderOnResume = process.argv.includes(
    "--retry-provider-on-resume");
  const interactionModeArgument = process.argv.find((entry) =>
    entry.startsWith("--provider-interaction-mode="));
  const providerInteractionMode = resolveTicket23AgentAgentInteractionModeV1({
    resumeDirectory: requestedResumeDirectory,
    requestedMode: interactionModeArgument
      ? interactionModeArgument.slice("--provider-interaction-mode=".length)
      : null,
    allowFailedInteractionModeMigration: process.argv.includes(
      "--allow-failed-interaction-mode-migration"),
  });
  if (!["native_tools", "json_channels_v1"].includes(
    providerInteractionMode)) {
    throw new Error("SLICE248_PROVIDER_INTERACTION_MODE_INVALID");
  }
  const allowFailedInteractionModeMigration = process.argv.includes(
    "--allow-failed-interaction-mode-migration");
  if (allowFailedInteractionModeMigration
    && providerInteractionMode !== "json_channels_v1") {
    throw new Error("SLICE248_INTERACTION_MIGRATION_MODE_INVALID");
  }
  const runIdArgument = process.argv.find((entry) =>
    entry.startsWith("--run-id="));
  if (requestedResumeDirectory && runIdArgument) {
    throw new Error("SLICE248_RESUME_RUN_ID_OVERRIDE_INVALID");
  }
  const runId = requestedResumeDirectory
    ? path.basename(requestedResumeDirectory)
    : runIdArgument?.slice("--run-id=".length)
      || new Date().toISOString().replace(/[^0-9]/gu, "");
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/u.test(runId)) {
    throw new Error("SLICE248_RUN_ID_INVALID");
  }
  const dataDirectory = requestedResumeDirectory || path.join(LIVE_ROOT, runId);
  if (!requestedResumeDirectory) {
    await mkdir(dataDirectory, { recursive: true, mode: 0o700 });
  }
  const observeBotStages = process.argv.includes("--observe-bot-stages");
  let stageObservationTail = Promise.resolve();
  const observeBotStage = observeBotStages ? (event) => {
    const row = { diagnostic: "slice248_bot_stage_timing", ...event };
    stageObservationTail = stageObservationTail.then(() => appendFile(
      path.join(dataDirectory, "bot-stage-timings.ndjson"),
      `${JSON.stringify(row)}\n`, { mode: 0o600 },
    )).catch(() => undefined);
  } : undefined;
  let privateState = null;
  let versionedFork = null;
  if (requestedResumeDirectory) {
    if (versionedForkDirectory) {
      const forkPrivate = JSON.parse(await readFile(path.join(dataDirectory,
        "fork-private.json"), "utf8"));
      const forkReceipt = JSON.parse(await readFile(path.join(dataDirectory,
        "fork-receipt.json"), "utf8"));
      const sourceDirectory = path.resolve(forkPrivate.sourceDirectory || "");
      const trustedSourceDirectory = (directory) =>
        directory.startsWith(`${LIVE_ROOT}${path.sep}`)
          || directory.startsWith(`${VERSIONED_FORK_ROOT}${path.sep}`);
      const legalPrefixRecovery = forkReceipt.schemaVersion
        === "ticket23_slice248_legal_prefix_recovery_v1"
        && forkReceipt.recoveryKind === "named_active_once_per_round_v8";
      const singletonIdentityRecovery = forkReceipt.schemaVersion
        === "ticket23_slice248_singleton_identity_recovery_v1"
        && forkReceipt.recoveryKind === "singleton_summon_identity_v6";
      if (!trustedSourceDirectory(sourceDirectory)
        || forkPrivate.targetRoomId !== forkReceipt.targetRoomId
        || forkPrivate.sourceRoomId !== forkReceipt.sourceRoomId
        || forkReceipt.targetStateRevision !== (legalPrefixRecovery
          || singletonIdentityRecovery ? 0 : 1)
        || (legalPrefixRecovery && (forkPrivate.recoveryKind
          !== forkReceipt.recoveryKind || forkReceipt.sameLogicalRoomId !== true
          || forkReceipt.sourceRoomId !== forkReceipt.targetRoomId
          || forkReceipt.sourceStateRevision >= forkReceipt.sourceCurrentStateRevision
          || forkReceipt.excludedFirstStateRevision !== forkReceipt.sourceStateRevision + 1
          || !forkReceipt.excludedReceiptHashes?.length))
        || (singletonIdentityRecovery && (forkPrivate.recoveryKind
          !== forkReceipt.recoveryKind || forkReceipt.sameLogicalRoomId !== true
          || forkReceipt.sourceRoomId !== forkReceipt.targetRoomId
          || forkReceipt.sourceStateRevision !== forkReceipt.sourceCurrentStateRevision
          || forkReceipt.physicalLiveBoardUnchanged !== true
          || forkReceipt.originalAcceptedHistoryPreserved !== true
          || !forkReceipt.sourceJournalHeadHash))
        || forkReceipt.targetReplayMatchesCurrent !== true) {
        throw new Error("SLICE248_VERSIONED_FORK_PROVENANCE_INVALID");
      }
      let credentialDirectory = sourceDirectory;
      let expectedSourceRoomId = forkPrivate.sourceRoomId;
      const sourceForkChain = [];
      for (let depth = 0; depth < 8; depth += 1) {
        const ancestorFork = await readFile(path.join(credentialDirectory,
          "fork-private.json"), "utf8").then(JSON.parse, (error) => {
            if (error?.code === "ENOENT") return null;
            throw error;
          });
        if (!ancestorFork) break;
        if (ancestorFork.targetRoomId !== expectedSourceRoomId) {
          throw new Error("SLICE248_VERSIONED_FORK_ANCESTRY_MISMATCH");
        }
        sourceForkChain.push(ancestorFork);
        expectedSourceRoomId = ancestorFork.sourceRoomId;
        credentialDirectory = path.resolve(ancestorFork.sourceDirectory || "");
        if (!trustedSourceDirectory(credentialDirectory)) {
          throw new Error("SLICE248_VERSIONED_FORK_ANCESTRY_OUTSIDE_ROOT");
        }
      }
      const sourcePrivate = JSON.parse(await readFile(path.join(
        credentialDirectory, "runner-private.json"), "utf8"));
      if (sourcePrivate.roomId !== expectedSourceRoomId
        || [forkPrivate, ...sourceForkChain].some((entry) =>
          entry.storeEncryptionKeyBase64
            !== sourcePrivate.storeEncryptionKeyBase64
          || entry.refereePrivateKeyPem
            !== sourcePrivate.refereePrivateKeyPem
          || entry.refereeHmacSecret
            !== sourcePrivate.refereeHmacSecret)) {
        throw new Error("SLICE248_VERSIONED_FORK_CREDENTIALS_MISMATCH");
      }
      const targetRuntimeVariant = forkReceipt.targetRulesRuntimeVariant
        || "charge_endpoint_v2";
      if (!["charge_endpoint_v2", "charge_access_v3",
        "charge_cross_section_v4", "charge_round_path_v5"]
        .includes(targetRuntimeVariant)
        && !(legalPrefixRecovery && targetRuntimeVariant === "base_current_v1")
        && !(singletonIdentityRecovery && targetRuntimeVariant === "singleton_identity_v6")) {
        throw new Error("SLICE248_VERSIONED_FORK_RUNTIME_VARIANT_INVALID");
      }
      versionedFork = { ...forkReceipt, sourceDirectory,
        sourceRootDirectory: credentialDirectory,
        sourceRunId: path.basename(credentialDirectory),
        setupRoomId: sourcePrivate.roomId,
        targetRuntimeVariant,
        sourceRoomId: forkPrivate.sourceRoomId,
        targetRoomId: forkPrivate.targetRoomId };
      privateState = { ...sourcePrivate,
        roomId: forkPrivate.targetRoomId,
        resumeCredentials: forkPrivate.resumeCredentials };
    } else {
      privateState = JSON.parse(await readFile(path.join(dataDirectory,
        "runner-private.json"), "utf8"));
    }
    if (!privateState?.roomId
      || !privateState?.resumeCredentials?.human?.seatToken
      || !privateState?.resumeCredentials?.bot?.seatToken) {
      throw new Error("SLICE248_RESUME_CREDENTIALS_UNAVAILABLE");
    }
  }
  if (requestedResumeDirectory && requestedPlannedSessionId
    && requestedPlannedSessionId !== privateState.plannedSessionId) {
    throw new Error("SLICE272_RESUME_PREGAME_SESSION_MISMATCH");
  }
  const plannedSessionId = requestedResumeDirectory
    ? privateState.plannedSessionId || null
    : requestedAgentSelected
      ? agentSelectedTeachSessionId : requestedPlannedSessionId;
  const plannedMode = requestedResumeDirectory
    ? privateState.plannedMode || "workspace_session"
    : requestedAgentSelected ? "agent_selected_teach" : "workspace_session";
  if (requestedPlanRevisionHash && !plannedSessionId) {
    throw new Error("SLICE272_PLAN_REVISION_REQUIRES_ORIGINAL_PLAN");
  }
  const roomId = privateState?.roomId || `ticket23-slice248-aa-${runId}`;
  if (!privateState) {
    const keyPair = generateKeyPairSync("ed25519");
    privateState = {
      schema: "ticket23_slice248_live_server_private_state_v1",
      roomId,
      refereePrivateKeyPem: keyPair.privateKey.export({
        type: "pkcs8", format: "pem",
      }).toString(),
      refereePublicKeyPem: keyPair.publicKey.export({
        type: "spki", format: "pem",
      }).toString(),
      refereeHmacSecret: randomBytes(32).toString("base64url"),
      storeEncryptionKeyBase64: randomBytes(32).toString("base64"),
      resumeCredentials: null,
      plannedSessionId,
      plannedMode,
      plannedPlanHash: null,
      currentProductRuntimeVariant: requestedRuntimeVariant || "singleton_identity_v6",
      apiCredentialStored: false,
      trainingTruth: false,
    };
    await writeFile(path.join(dataDirectory, "runner-private.json"),
      `${JSON.stringify(privateState, null, 2)}\n`, {
        encoding: "utf8", mode: 0o600,
      });
  }
  const runnerToken = randomBytes(32).toString("base64url");
  const uiControlToken = randomBytes(32).toString("base64url");
  const refereeCrypto = createStarcraftTmgRefereeCrypto({
    privateKey: privateState.refereePrivateKeyPem,
    publicKey: privateState.refereePublicKeyPem,
    hmacSecret: privateState.refereeHmacSecret,
    keyId: `ticket23-slice248-referee-${versionedFork?.sourceRunId || runId}`,
    trustLevel: "development_persistent",
  });
  const privatePayloadCodec = createStarcraftTmgPrivatePayloadCodec({
    key: privateState.storeEncryptionKeyBase64,
    keyId: `ticket23-slice248-room-store-${versionedFork?.sourceRunId || runId}`,
    trustLevel: "development_persistent",
  });
  const roomStore = createSqliteStarcraftTmgRoomStore({
    filename: path.join(dataDirectory, "room.sqlite"),
    privatePayloadCodec,
  });
  const seatRoots = Object.fromEntries(SEATS.map((seatKey) => [seatKey,
    path.join(dataDirectory, "seats", seatKey)]));
  await Promise.all(Object.values(seatRoots).map((directory) =>
    mkdir(directory, { recursive: true, mode: 0o700 })));
  const botStores = Object.fromEntries(SEATS.map((seatKey) => [seatKey,
    createSqliteStarcraftTmgHostedBotSeatStoreV1({
      filename: path.join(seatRoots[seatKey], "bot-seat.sqlite"),
    })]));
  const memoryJournals = Object.fromEntries(SEATS.map((seatKey) => [seatKey,
    createSqliteStarcraftTmgMatchDecisionJournalV1({
      filename: path.join(seatRoots[seatKey], "match-memory.sqlite"),
    })]));
  const providerPorts = { player1: null, player2: null };
  const deferred = Object.fromEntries(SEATS.map((seatKey) => [seatKey,
    Object.freeze({
      async decide(input) {
        if (!providerPorts[seatKey]) return { ok: false,
          reason: "LIVE_SELFPLAY_PROVIDER_NOT_READY",
          findingSeverity: "High", trainingTruth: false };
        return providerPorts[seatKey].decide(input);
      },
    })]));
  const physicalAgentPort = Object.freeze({
    async execute(task) {
      return { completed: true,
        evidenceRefs: [`web-virtual-table:${task.taskId}:authoritative-projection`] };
    },
  });
  const mapConfigurationArgument = process.argv.find((entry) =>
    entry.startsWith("--pregame-map-configuration-json="));
  const mapConfigurationFileArgument = process.argv.find((entry) =>
    entry.startsWith("--pregame-map-configuration-file="));
  if (mapConfigurationArgument && mapConfigurationFileArgument) {
    throw new Error("SLICE272_PREGAME_MAP_CONFIGURATION_SOURCES_CONFLICT");
  }
  if (requestedResumeDirectory
    && (mapConfigurationArgument || mapConfigurationFileArgument)) {
    throw new Error("SLICE272_RESUME_MAP_OVERRIDE_INVALID");
  }
  const mapConfiguration = requestedResumeDirectory
    ? privateState.mapConfiguration || {
      seedId: "sc1_lost_temple_v1",
      elementSelections: [], passageSelections: [],
    }
    : mapConfigurationFileArgument
      ? JSON.parse(await readFile(path.resolve(ROOT,
        mapConfigurationFileArgument.slice(
          "--pregame-map-configuration-file=".length)), "utf8"))
      : mapConfigurationArgument
      ? JSON.parse(mapConfigurationArgument.slice(
        "--pregame-map-configuration-json=".length))
      : { seedId: "sc1_lost_temple_v1",
        elementSelections: [], passageSelections: [] };
  if (typeof mapConfiguration?.seedId !== "string"
    || !mapConfiguration.seedId
    || !Array.isArray(mapConfiguration.elementSelections)
    || !Array.isArray(mapConfiguration.passageSelections)) {
    throw new Error("SLICE272_PREGAME_MAP_CONFIGURATION_INVALID");
  }
  if (!requestedResumeDirectory) {
    privateState.mapConfiguration = mapConfiguration;
    await writeFile(path.join(dataDirectory, "runner-private.json"),
      `${JSON.stringify(privateState, null, 2)}\n`, {
        encoding: "utf8", mode: 0o600,
      });
  }
  if (admissionManifest
    && admissionManifest.mapSeedId !== mapConfiguration.seedId) {
    throw new Error("SLICE272_REVIEWED_PLAN_MAP_MISMATCH");
  }
  const rosterPlanDataDirectory =
    (admissionManifest
      ? path.dirname(reviewedPlanArtifactPath(
        admissionManifest.planArtifactPath)) : null)
    || process.env.STARCRAFT_TMG_ROSTER_PLAN_DATA_DIRECTORY
      || path.join(ROOT, "build/ticket-27-slice-272-output-capacity-v2");
  const plannedProduct = plannedSessionId && !requestedResumeDirectory
    ? await createRosterPlanningProductModuleV1({
      root: ROOT,
      fixtureRoot: await resolveOfficialDevelopmentTrancheFixtureRootV1({
        root: ROOT,
        overrideRoot: process.env.TICKET27_S271_FIXTURE_ROOT || null,
      }),
      dataDirectory: rosterPlanDataDirectory,
      mapConfiguration,
      enableIterativeDraft: requestedAgentSelected,
      ...(requestedAgentSelected ? {
        deliberationFactory: { createForRun: async () => {
          throw new Error("SLICE272_ROOM_PREFLIGHT_MUST_NOT_CALL_PROVIDER");
        } },
      } : {}),
    }) : null;
  const opponentPlannedSessionId = requestedResumeDirectory
    ? privateState.opponentPlannedSessionId || null
    : opponentPlanArgument?.slice("--opponent-pregame-roster-session-id=".length) || null;
  const opponentPlanDataDirectory = requestedResumeDirectory
    ? privateState.opponentPlanDataDirectory || rosterPlanDataDirectory
    : opponentPlanDirectoryArgument
      ? path.resolve(opponentPlanDirectoryArgument.slice(
        "--opponent-roster-plan-data-directory=".length)) : rosterPlanDataDirectory;
  const opponentPlannedProduct = opponentPlannedSessionId && !requestedResumeDirectory
    ? path.resolve(opponentPlanDataDirectory) === path.resolve(rosterPlanDataDirectory) && plannedProduct
      ? plannedProduct
      : await createRosterPlanningProductModuleV1({ root: ROOT,
        fixtureRoot: await resolveOfficialDevelopmentTrancheFixtureRootV1({
          root: ROOT, overrideRoot: process.env.TICKET27_S271_FIXTURE_ROOT || null }),
        dataDirectory: opponentPlanDataDirectory, mapConfiguration })
    : null;
  if (opponentPlannedProduct?.service.readSession(opponentPlannedSessionId)
    ?.setup.sideKey !== "player2" && opponentPlannedProduct) {
    throw new Error("SLICE248_OPPONENT_PREGAME_PLAN_SIDE_MISMATCH");
  }
  if (!requestedResumeDirectory) {
    privateState.opponentPlannedSessionId = opponentPlannedSessionId;
    privateState.opponentPlanDataDirectory = opponentPlannedSessionId ? opponentPlanDataDirectory : null;
    await writeFile(path.join(dataDirectory, "runner-private.json"),
      `${JSON.stringify(privateState, null, 2)}\n`, {
        encoding: "utf8", mode: 0o600,
      });
  }
  reportPregameStartup("planning_product_loaded");
  const agentSelectedSnapshotPath = path.join(
    versionedFork?.sourceRootDirectory || dataDirectory,
    "agent-selected-pregame-snapshot.json");
  let agentSelectedReview = null;
  let agentSelectedHandoff = null;
  let agentSelectedPriorPlans = [];
  let plannedSession = null;
  if (plannedSessionId && plannedMode === "agent_selected_teach") {
    let plan;
    let candidateInput;
    if (requestedResumeDirectory) {
      const snapshot = JSON.parse(await readFile(
        agentSelectedSnapshotPath, "utf8"));
      plan = snapshot.plan;
      candidateInput = snapshot.selectedCandidateInput;
    } else if (admissionManifest) {
      const planArtifact = await readReviewedPlanArtifact(
        admissionManifest.planArtifactPath);
      plan = planArtifact.plan;
      agentSelectedReview = await readReviewedPlanArtifact(
        admissionManifest.finalReviewArtifactPath);
      agentSelectedPriorPlans = await Promise.all(
        admissionManifest.intermediatePlanArtifactPaths.map(
          async (filename) => (await readReviewedPlanArtifact(filename)).plan));
      if (plan?.planHash !== admissionManifest.planHash
        || agentSelectedReview.reviewHash
          !== admissionManifest.finalReviewHash
        || agentSelectedReview.reviewAdjudication?.parentReviewHash
          !== admissionManifest.sourceReviewHash
        || plan.revisions.length !== admissionManifest.revisionCount
        || plan.revisions[0]?.previousPlanHash
          !== admissionManifest.initialPlanHash) {
        throw new Error("SLICE272_REVIEWED_PLAN_MANIFEST_DRIFT");
      }
      agentSelectedHandoff = await plannedProduct.iterativeDraft
        .prepareTeachHandoff(agentSelectedIterativeSessionId);
      reportPregameStartup("agent_selection_handoff_verified");
      candidateInput = agentSelectedHandoff.lockedRoster.lock.candidateInput;
    } else {
      // A Web-created roster is admitted from its own persisted journey and
      // reviewed Teach session. Historical claim-repair artifacts are not a
      // source of authority for a newly generated plan or Room.
      const admitted = await plannedProduct.prepareAgentSelectedTeachRoomLaunch({
        iterativeSessionId: agentSelectedIterativeSessionId,
        teachSessionId: agentSelectedTeachSessionId,
      });
      plan = admitted.plan;
      agentSelectedReview = admitted.finalReview;
      agentSelectedPriorPlans = admitted.priorPlans;
      agentSelectedHandoff = admitted.handoff;
      reportPregameStartup("agent_selection_handoff_verified");
      candidateInput = agentSelectedHandoff.lockedRoster.lock.candidateInput;
    }
    verifyAgentScheduledRosterPlanV1(plan);
    if (!candidateInput || plan.sideKey !== candidateInput.sideKey
      || (requestedResumeDirectory
        && plan.planHash !== privateState.plannedPlanHash)) {
      throw new Error("SLICE272_AGENT_SELECTED_PREGAME_SNAPSHOT_INVALID");
    }
    plannedSession = { status: "planned", plan,
      candidates: [{ candidate: plan.rosterCandidate,
        candidateInput }] };
    if (!requestedResumeDirectory) {
      await writeFile(agentSelectedSnapshotPath,
        `${JSON.stringify({ plan, selectedCandidateInput: candidateInput,
          iterativeSessionId: agentSelectedIterativeSessionId,
          teachSessionId: agentSelectedTeachSessionId,
          ...(admissionManifest ? { admissionManifestHash:
            hashStarcraftTmgContract(admissionManifest),
            finalReviewHash: agentSelectedReview.reviewHash,
            priorPlanHashes: agentSelectedPriorPlans.map((prior) =>
              prior.planHash) } : {}) })}\n`,
        { encoding: "utf8", mode: 0o600 });
    }
  } else if (plannedSessionId) {
    plannedSession = requestedResumeDirectory
      ? await loadPregameResumeDraftV1({
        dataDirectory: rosterPlanDataDirectory,
        sessionId: plannedSessionId,
        expectedPlanHash: privateState.plannedPlanHash,
      })
      : plannedProduct.service.readSession(plannedSessionId);
  }
  if (plannedSession && (plannedSession.status !== "planned"
    || !plannedSession.plan
    || !["active", "revised"].includes(plannedSession.plan.planStatus)
    || (requestedResumeDirectory && privateState.plannedPlanHash
      !== plannedSession.plan.planHash))) {
    throw new Error("SLICE272_PREGAME_PLAN_UNAVAILABLE_OR_DRIFTED");
  }
  const selectedInput = plannedSession?.candidates.find((entry) =>
    entry.candidate.candidateId
      === plannedSession.plan.rosterCandidate.candidateId)?.candidateInput
    || null;
  if (plannedSession && !selectedInput) {
    throw new Error("SLICE272_PREGAME_SELECTED_ROSTER_UNAVAILABLE");
  }
  const preparedResumeRevision = requestedPlanRevisionHash
    ? await loadReviewedPregameRevisionV1({ dataDirectory: rosterPlanDataDirectory,
      sessionId: plannedSessionId,
      expectedPlanHash: privateState.activeRosterPlanHash || privateState.plannedPlanHash,
      requestedPlanHash: requestedPlanRevisionHash }) : null;
  const plannedRecipe = selectedInput ? {
    factionRecordKey: selectedInput.factionRecordKey,
    tacticalCardRecordKeys: selectedInput.tacticalCardRecordKeys,
    units: selectedInput.units.map((unit) => ({
      unitInstanceId: unit.unitInstanceId,
      recordKey: unit.recordKey,
      compositionKind: unit.compositionKind,
      upgradeNames: unit.upgrades.map((upgrade) => upgrade.upgradeName),
    })),
  } : null;
  let preparedPregamePlan = null;
  let preparedOpponentPregamePlan = null;
  const prepareOpponentPlanForRoom = async ({ roomRuntime, roomId: currentRoomId, seats }) => {
    preparedOpponentPregamePlan = await opponentPlannedProduct.preparePregamePlanForRoom({
      sessionId: opponentPlannedSessionId, roomRuntime, roomId: currentRoomId,
      seatToken: seats.player2.seatToken, scope: seats.player2.scope,
    });
    return { player2: preparedOpponentPregamePlan };
  };
  const fixture = await createTicket20AgentAgentDemoFixtureV1({
    observeBotStage,
    root: await resolveOfficialDevelopmentTrancheFixtureRootV1({
      root: ROOT,
      overrideRoot: process.env.TICKET27_S271_FIXTURE_ROOT || null,
    }),
    roomId,
    ...(versionedFork ? {
      setupRoomId: versionedFork.setupRoomId,
      currentProductRuntimeVariant: versionedFork.targetRuntimeVariant,
    } : privateState.currentProductRuntimeVariant ? {
      currentProductRuntimeVariant: privateState.currentProductRuntimeVariant,
    } : {}),
    roomProfile: "standard_2000_live",
    mapConfiguration,
    onAuthoritativeRoomCreated: async ({ credentials }) => {
      privateState.resumeCredentials = credentials;
      await writeFile(path.join(dataDirectory, "runner-private.json"),
        `${JSON.stringify(privateState, null, 2)}\n`, {
          encoding: "utf8", mode: 0o600,
        });
    },
    ...(plannedRecipe ? {
      standard2000Recipes: { player1: plannedRecipe,
        player2: OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1.player2 },
      armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY,
      ...(!requestedResumeDirectory ? {
        preparePregameRosterPlans: async ({ roomRuntime,
          roomId: currentRoomId, seats }) => {
          preparedPregamePlan = requestedAgentSelected
            ? await plannedProduct.prepareAgentSelectedTeachPlanForRoom({
              iterativeSessionId: agentSelectedIterativeSessionId,
              teachSessionId: agentSelectedTeachSessionId,
              plan: plannedSession.plan,
              finalReview: agentSelectedReview,
              priorPlans: agentSelectedPriorPlans,
              handoff: agentSelectedHandoff,
              roomRuntime,
              roomId: currentRoomId,
              seatToken: seats.player1.seatToken,
              scope: seats.player1.scope,
            })
            : await plannedProduct.preparePregamePlanForRoom({
              sessionId: plannedSessionId,
              roomRuntime,
              roomId: currentRoomId,
              seatToken: seats.player1.seatToken,
              scope: seats.player1.scope,
            });
          return { player1: preparedPregamePlan,
            ...(opponentPlannedProduct ? await prepareOpponentPlanForRoom({
              roomRuntime, roomId: currentRoomId, seats }) : {}) };
        },
      } : {}),
    } : {}),
    ...(!requestedResumeDirectory && !plannedRecipe && opponentPlannedProduct ? {
      // The no-opening-plan arm omits PLAYER1's plan only. Its opponent uses
      // the same reviewed plan and existing machine-seat bridge as A and B.
      preparePregameRosterPlans: prepareOpponentPlanForRoom,
    } : {}),
    maxAppliedActions: 180,
    enableSpatialPreexecution: true,
    autoDriveIntervalMs: 2_500,
    attachBot: false,
    autoDrive: false,
    roomStore,
    refereeCrypto,
    resumeRoom: Boolean(requestedResumeDirectory),
    resumeCredentials: privateState.resumeCredentials,
    botDecisionPort: deferred.player2,
    botStore: botStores.player2,
    matchDecisionJournal: memoryJournals.player2,
    physicalAgentPort,
    player1DecisionPort: deferred.player1,
    player1BotStore: botStores.player1,
    player1MatchDecisionJournal: memoryJournals.player1,
    player1PhysicalAgentPort: physicalAgentPort,
    title: "Ticket 23 · Standard 2000 · Agent vs Agent",
    surfaceMode: "agent_agent_live_evidence",
  });
  reportPregameStartup("authoritative_room_created_and_plan_bound");
  if (versionedFork) {
    const replay = await fixture.roomRuntime.replayRoom({ roomId });
    const aggregate = await roomStore.loadRoom(roomId);
    if (!replay.ok || !replay.matchesCurrent
      || aggregate?.envelope?.state?.officialRulesVersionFork
        ?.sourceStateHash !== versionedFork.sourceStateHash
      || fixture.rulesRuntime.descriptor.runtimeHash
        !== versionedFork.targetRulesRuntimeHash) {
      throw new Error("SLICE248_VERSIONED_FORK_RESUME_REPLAY_MISMATCH");
    }
  }
  const fork = forkSource ? await replayForkPrefix({
    fixture, roomId, forkSource,
  }) : null;
  const memoryHandoff = versionedFork && !versionedForkPreflightOnly
    ? await prepareVersionedRoomMemoryHandoffV1({
      sourceDirectory: versionedFork.sourceDirectory,
      targetDirectory: dataDirectory,
      sourceRoomId: versionedFork.sourceRoomId,
      sourceMatchBindingHash: versionedFork.sourceMatchBindingHash,
      sourceStateHash: versionedFork.sourceStateHash,
      sourceStateRevision: versionedFork.sourceStateRevision,
      targetRoomId: roomId,
      targetMatchBindingHash: fixture.createdRoom.matchBinding.bindingHash,
      targetInitialStateHash: versionedFork.targetStateHash,
      ...(versionedFork.schemaVersion === "ticket23_slice248_legal_prefix_recovery_v1"
        ? { legalPrefixRecovery: versionedFork } : {}),
      ...(versionedFork.schemaVersion === "ticket23_slice248_singleton_identity_recovery_v1"
        ? { singletonIdentityRecovery: versionedFork } : {}),
      roomRuntime: fixture.roomRuntime,
      targetContinuities: {
        player1: fixture.player1Continuity,
        player2: fixture.continuity,
      },
      seatTokens: {
        player1: fixture.createdRoom.credentials.human.seatToken,
        player2: fixture.createdRoom.credentials.bot.seatToken,
      },
    }) : null;
  if (requestedResumeDirectory && plannedSession
    && !versionedForkPreflightOnly) {
    // Once play has started, casualties and deployment may change the live
    // Room roster projection. Resume the original, room-bound plan from its
    // same-seat journal instead of pretending this is another pregame open.
    await fixture.player1TurnPlanRuntime.hydrate({
      scope: fixture.player1Scope,
    });
    const restored = fixture.player1TurnPlanRuntime.read({
      scope: fixture.player1Scope,
    }).plan;
    const expectedActivePlanHash = privateState.activeRosterPlanHash || privateState.plannedPlanHash;
    if (restored?.pregamePlanOrigin?.rosterPlanHash !== expectedActivePlanHash
      && !(preparedResumeRevision
        && restored?.pregamePlanOrigin?.rosterPlanHash === preparedResumeRevision.plan.planHash
        && restored.pregamePlanOrigin.previousRosterPlanHash === expectedActivePlanHash)) {
      throw new Error("SLICE272_RESUMED_PREGAME_PLAN_JOURNAL_MISMATCH");
    }
    if (preparedResumeRevision) {
      const adoption = await adoptReviewedPregameResumeRevisionV1({
        prepared: preparedResumeRevision, roomRuntime: fixture.roomRuntime,
        roomId, seatToken: fixture.createdRoom.credentials.human.seatToken,
        scope: fixture.player1Scope, turnPlanRuntime: fixture.player1TurnPlanRuntime,
        spatialRuntime: fixture.player1SpatialRuntime, journal: memoryJournals.player1,
      });
      // Keep the original pregame hash/snapshot immutable. The journal is the
      // authority for current strategy; metadata follows a proven durable append.
      privateState.activeRosterPlanHash = adoption.toPlanHash;
      privateState.pregamePlanRevisions ||= [];
      if (!privateState.pregamePlanRevisions.some(row => row.toPlanHash === adoption.toPlanHash)) {
        privateState.pregamePlanRevisions.push(adoption);
      }
      const target = path.join(dataDirectory, "runner-private.json");
      await writeFile(target + ".plan-revision.tmp", `${JSON.stringify(privateState, null, 2)}\n`,
        { encoding: "utf8", mode: 0o600 });
      await rename(target + ".plan-revision.tmp", target);
      process.stdout.write(`${JSON.stringify(adoption)}\n`);
    }
  }
  if (planRevisionOnly) {
    try { await fixture.player1Runtime.close(); } catch {}
    try { await fixture.botRuntime.close(); } catch {}
    for (const seatKey of SEATS) {
      try { memoryJournals[seatKey].close(); } catch {}
      try { botStores[seatKey].close(); } catch {}
    }
    try { roomStore.close(); } catch {}
    return;
  }
  if (fork) {
    fork.continuitySeeds = await seedForkContinuity({
      fixture, roomId, forkSource, fork,
    });
    privateState.fork = fork;
    await writeFile(path.join(dataDirectory, "fork-provenance.json"),
      `${JSON.stringify(fork, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  }
  if (!requestedResumeDirectory) {
    if (plannedSession && preparedPregamePlan?.plan?.planHash
      !== plannedSession.plan.planHash) {
      throw new Error("SLICE272_PREGAME_PLAN_HANDOFF_MISMATCH");
    }
    privateState.resumeCredentials = {
      human: { seatToken: fixture.createdRoom.credentials.human.seatToken },
      bot: { seatToken: fixture.createdRoom.credentials.bot.seatToken },
    };
    privateState.plannedPlanHash = preparedPregamePlan?.plan?.planHash || null;
    privateState.opponentPlannedPlanHash = preparedOpponentPregamePlan?.plan?.planHash || null;
    await writeFile(path.join(dataDirectory, "runner-private.json"),
      `${JSON.stringify(privateState, null, 2)}\n`, {
        encoding: "utf8", mode: 0o600,
      });
  }
  if (pregamePreflightOnly) {
    await fixture.orchestrator.start();
    const plan = fixture.player1TurnPlanRuntime.read({
      scope: fixture.player1Scope,
    }).plan;
    const roomRead = await fixture.roomRuntime.readRoom({ roomId,
      seatToken: fixture.createdRoom.credentials.human.seatToken });
    if (!plan || plan.pregamePlanOrigin?.rosterPlanHash
      !== privateState.plannedPlanHash
      || plan.pregameRosterArrivalSchedule?.entries?.length
        !== plannedRecipe.units.length
      || roomRead?.projection?.room?.stateRevision !== 0) {
      throw new Error("SLICE272_PREGAME_PREFLIGHT_BINDING_FAILED");
    }
    process.stdout.write(`${JSON.stringify({
      schemaVersion: "ticket27_slice272_pregame_selfplay_preflight_v1",
      roomId, dataDirectory, plannedSessionId,
      plannedPlanHash: privateState.plannedPlanHash,
      rosterUnitCount: plannedRecipe.units.length,
      botArrivalCount: plan.pregameRosterArrivalSchedule.entries.length,
      roomStateRevision: roomRead.projection.room.stateRevision,
      providerCalls: 0, providerStacksCreated: false,
      webServerCreated: false, trainingTruth: false,
    })}\n`);
    try { await fixture.player1Runtime.close(); } catch {}
    try { await fixture.botRuntime.close(); } catch {}
    for (const seatKey of SEATS) {
      try { memoryJournals[seatKey].close(); } catch {}
      try { botStores[seatKey].close(); } catch {}
    }
    try { roomStore.close(); } catch {}
    return;
  }
  if (versionedForkMemoryHandoffOnly) {
    const restored = await Promise.all([
      fixture.player1TurnPlanRuntime.hydrate({ scope: fixture.player1Scope }),
      fixture.turnPlanRuntime.hydrate({ scope: fixture.botScope }),
    ]);
    if (restored.some((entry) => !entry.restored)) {
      throw new Error("SLICE248_VERSIONED_FORK_PLAN_RESTORE_FAILED");
    }
    const memoryScopes = { player1: fixture.player1Scope,
      player2: fixture.botScope };
    const sourceQueryEvidence = {};
    for (const seatKey of SEATS) {
      const query = await memoryHandoff.queryPorts[seatKey].query({
        scope: memoryScopes[seatKey],
        query: { kinds: ["decision_purpose"],
          historyLane: "frozen_source_room", limit: 2 },
      });
      if (query.returnedCount < 1
        || query.records.some((entry) => entry.recordOrigin
          !== "frozen_source_room")) {
        throw new Error("SLICE248_VERSIONED_FORK_HISTORY_QUERY_FAILED");
      }
      let crossSeatRejected = false;
      try {
        await memoryHandoff.queryPorts[seatKey].query({
          scope: memoryScopes[seatKey === "player1" ? "player2" : "player1"],
          query: { limit: 1 },
        });
      } catch (error) {
        crossSeatRejected = error?.code
          === "FORK_MEMORY_QUERY_SCOPE_MISMATCH";
      }
      if (!crossSeatRejected) {
        throw new Error("SLICE248_VERSIONED_FORK_CROSS_SEAT_QUERY_ACCEPTED");
      }
      sourceQueryEvidence[seatKey] = {
        sourceHistoryQueryable: true, crossSeatRejected: true,
        sourceDecisionCount: query.matchedCount,
      };
    }
    const handoffReceipt = {
      schemaVersion: "ticket23_slice248_versioned_fork_memory_handoff_v1",
      roomId,
      sourceRoomId: versionedFork.sourceRoomId,
      sourceStateHash: versionedFork.sourceStateHash,
      targetRulesRuntimeHash: fixture.rulesRuntime.descriptor.runtimeHash,
      lockHash: memoryHandoff.lockHash,
      ancestorRoomIds: memoryHandoff.ancestorRoomIds || [],
      ancestorLockHashes: memoryHandoff.ancestorLockHashes || [],
      seats: memoryHandoff.seatReports,
      sourceQueryEvidence,
      restoredPlans: restored.map((entry) => ({
        planId: entry.plan?.planId || null,
        pregameRosterPlanHash:
          entry.plan?.pregamePlanOrigin?.rosterPlanHash || null,
        reflectionRequired: true,
      })),
      providerCalls: 0, providerStacksCreated: false,
      webServerCreated: false, trainingTruth: false,
    };
    await writeFile(path.join(dataDirectory, "memory-handoff-receipt.json"),
      `${JSON.stringify(handoffReceipt, null, 2)}\n`, {
        encoding: "utf8", mode: 0o600,
      });
    process.stdout.write(`${JSON.stringify({ ...handoffReceipt,
      dataDirectory })}\n`);
    try { await fixture.player1Runtime.close(); } catch {}
    try { await fixture.botRuntime.close(); } catch {}
    for (const seatKey of SEATS) {
      try { memoryJournals[seatKey].close(); } catch {}
      try { botStores[seatKey].close(); } catch {}
    }
    try { roomStore.close(); } catch {}
    return;
  }
  if (versionedForkPreflightOnly) {
    const aggregate = await roomStore.loadRoom(roomId);
    const activeSeatToken = aggregate.envelope.state.activeSideKey === "player1"
      ? fixture.createdRoom.credentials.human.seatToken
      : fixture.createdRoom.credentials.bot.seatToken;
    const legal = await fixture.roomRuntime.legalSpace({ roomId,
      seatToken: activeSeatToken });
    if (!legal.ok || aggregate.stateRevision !== versionedFork.targetStateRevision) {
      throw new Error("SLICE248_VERSIONED_FORK_NEXT_ACTION_UNAVAILABLE");
    }
    process.stdout.write(`${JSON.stringify({
      schemaVersion: "ticket23_slice248_versioned_fork_server_preflight_v1",
      roomId, dataDirectory, sourceRoomId: versionedFork.sourceRoomId,
      stateRevision: aggregate.stateRevision,
      stateHash: aggregate.envelope.stateHash,
      targetRulesRuntimeHash: fixture.rulesRuntime.descriptor.runtimeHash,
      replayMatchesCurrent: true,
      nextLegalCandidateCount: legal.legalSpace.finiteActions.length
        + legal.legalSpace.parameterDomains.length,
      pregamePlanRequired: Boolean(plannedSession),
      roomMemoryContinuityReady: (await Promise.all([
        fixture.player1Continuity.query({ scope: fixture.player1Scope,
          query: { kinds: ["turn_plan"], limit: 1 } }),
        fixture.continuity.query({ scope: fixture.botScope,
          query: { kinds: ["turn_plan"], limit: 1 } }),
      ])).every((entry) => entry.returnedCount > 0),
      providerCalls: 0, providerStacksCreated: false,
      webServerCreated: false, trainingTruth: false,
    })}\n`);
    try { await fixture.player1Runtime.close(); } catch {}
    try { await fixture.botRuntime.close(); } catch {}
    for (const seatKey of SEATS) {
      try { memoryJournals[seatKey].close(); } catch {}
      try { botStores[seatKey].close(); } catch {}
    }
    try { roomStore.close(); } catch {}
    return;
  }
  if (forkPreflightOnly) {
    const roomRead = await fixture.roomRuntime.readRoom({ roomId,
      seatToken: fixture.createdRoom.credentials.human.seatToken });
    process.stdout.write(`${JSON.stringify({
      schemaVersion: "ticket25_slice265_fork_preflight_v1",
      roomId,
      dataDirectory,
      stateRevision: roomRead?.projection?.room?.stateRevision ?? null,
      stateHash: roomRead?.projection?.room?.stateHash ?? null,
      fork,
      providerCalls: 0,
      providerStacksCreated: false,
      webServerCreated: false,
      sourceRefreshPerformed: false,
      trainingTruth: false,
    })}\n`);
    try { await fixture.player1Runtime.close(); } catch {}
    try { await fixture.botRuntime.close(); } catch {}
    for (const seatKey of SEATS) {
      try { memoryJournals[seatKey].close(); } catch {}
      try { botStores[seatKey].close(); } catch {}
    }
    try { roomStore.close(); } catch {}
    return;
  }
  const providerStacks = {
    player1: await createStarcraftTmgLiveOpponentProviderStackV1({
      roomId, seatKey: "player1",
      providerProfiles: [STARCRAFT_TMG_TICKET_23_LIVE_FLASH_PROVIDER_PROFILE_V1],
      allowUnstartedProfileReselection: true,
      providerInteractionMode,
      allowFailedInteractionModeMigration,
      matchBinding: fixture.createdRoom.matchBinding,
      spatialQueryPort: fixture.player1SpatialRuntime,
      memoryQueryPort: memoryHandoff?.queryPorts.player1
        || fixture.player1Continuity,
      strategyEntries: fixture.strategySkillEntries,
      ownFaction: fixture.factionRecordKeysBySeat.player1,
      opponentFaction: fixture.factionRecordKeysBySeat.player2,
      dataDirectory: path.join(seatRoots.player1, "provider"),
      matchMode: "agent_vs_agent",
      budgetLimitCnyMicros: perSeatBudgetCnyMicros,
      maxProviderCalls: 1_024,
    }),
    player2: await createStarcraftTmgLiveOpponentProviderStackV1({
      roomId, seatKey: "player2",
      providerProfiles: [STARCRAFT_TMG_TICKET_23_LIVE_FLASH_PROVIDER_PROFILE_V1],
      allowUnstartedProfileReselection: true,
      providerInteractionMode,
      allowFailedInteractionModeMigration,
      matchBinding: fixture.createdRoom.matchBinding,
      spatialQueryPort: fixture.spatialRuntime,
      memoryQueryPort: memoryHandoff?.queryPorts.player2
        || fixture.continuity,
      strategyEntries: fixture.strategySkillEntries,
      ownFaction: fixture.factionRecordKeysBySeat.player2,
      opponentFaction: fixture.factionRecordKeysBySeat.player1,
      dataDirectory: path.join(seatRoots.player2, "provider"),
      matchMode: "agent_vs_agent",
      budgetLimitCnyMicros: perSeatBudgetCnyMicros,
      maxProviderCalls: 1_024,
    }),
  };
  providerPorts.player1 = providerStacks.player1.decisionPort;
  providerPorts.player2 = providerStacks.player2.decisionPort;
  const evolutionExportRuntime =
    createStarcraftTmgLiveMatchEvolutionExportV1({
      authorityEngine: fixture.authorityEngine,
      roomStore: fixture.roomRuntime.roomStore,
    });
  const selectedModels = Object.fromEntries(SEATS.map((seatKey) => [seatKey,
    providerStacks[seatKey].selectedProfile.model]));
  await fixture.orchestrator.start();
  reportPregameStartup("bot_seats_ready");
  let providerMatchesFinalized = false;
  const existingEvolutionSummaryPath = path.join(dataDirectory,
    "training/summary.json");
  let evolutionExportSummary = existsSync(existingEvolutionSummaryPath)
    ? JSON.parse(await readFile(existingEvolutionSummaryPath, "utf8")) : null;
  if (evolutionExportSummary?.roomId !== roomId
    || evolutionExportSummary?.terminal !== true) {
    evolutionExportSummary = null;
  }
  let evolutionExportPromise = null;
  let driveJobSequence = 0;
  let driveJob = null;
  let driveJobCompletion = null;
  let autoLoopPromise = null;
  const autoDrive = {
    status: "idle", stopRequested: false, completedActions: 0,
    startedAt: null, stoppedAt: null, stopReason: null,
  };

  async function writeTerminalEvolutionArtifacts(orchestratorResult) {
    if (evolutionExportSummary) return evolutionExportSummary;
    if (evolutionExportPromise) return evolutionExportPromise;
    evolutionExportPromise = (async () => {
      if (orchestratorResult?.status !== "completed"
        || orchestratorResult?.replayMatchesCurrent !== true
        || orchestratorResult?.state?.terminal !== true) {
        throw Object.assign(new Error(
          "terminal replay-verified orchestrator result is required"), {
          code: "SLICE263_TERMINAL_EVOLUTION_SOURCE_INVALID",
          severity: "High",
        });
      }
      const compiled = await evolutionExportRuntime.compile({
        roomId,
        episodeId: `${roomId}:terminal`,
        decisionBindings: orchestratorResult.trajectory,
        experimentCell: orchestratorResult.experimentCell,
        reviewContext: {
          evaluationSplit: "development",
          scalePoints: 2_000,
          modelSnapshotsBySeat: selectedModels,
          promptPackSnapshotsBySeat: {
            player1: "selfplay_agent_prompt",
            player2: "selfplay_agent_prompt",
          },
        },
        requireTerminal: true,
      });
      const directory = path.join(dataDirectory, "training");
      await mkdir(directory, { recursive: true, mode: 0o700 });
      const files = {
        trajectory: "training/trajectory.json",
        ndjson: "training/trajectory.ndjson",
        muzero: "training/trajectory.muzero.json",
        rlds: "training/trajectory.rlds.json",
        audit: "training/leak-audit.json",
        eligibility: "training/eligibility.json",
        roundTrips: "training/round-trips.json",
        postgameReviewEpisode: "training/postgame-review-episode.json",
        summary: "training/summary.json",
      };
      await Promise.all([
        writeFile(path.join(dataDirectory, files.trajectory),
          `${JSON.stringify(compiled.trajectory)}\n`, { mode: 0o600 }),
        writeFile(path.join(dataDirectory, files.ndjson),
          compiled.exports.ndjson, { mode: 0o600 }),
        writeFile(path.join(dataDirectory, files.muzero),
          `${JSON.stringify(compiled.exports.muzero)}\n`, { mode: 0o600 }),
        writeFile(path.join(dataDirectory, files.rlds),
          `${JSON.stringify(compiled.exports.rlds)}\n`, { mode: 0o600 }),
        writeFile(path.join(dataDirectory, files.audit),
          `${JSON.stringify(compiled.audit, null, 2)}\n`, { mode: 0o600 }),
        writeFile(path.join(dataDirectory, files.eligibility),
          `${JSON.stringify(compiled.eligibility, null, 2)}\n`, { mode: 0o600 }),
        writeFile(path.join(dataDirectory, files.roundTrips),
          `${JSON.stringify(compiled.roundTrips, null, 2)}\n`, { mode: 0o600 }),
        writeFile(path.join(dataDirectory, files.postgameReviewEpisode),
          `${JSON.stringify(compiled.reviewEpisode, null, 2)}\n`, { mode: 0o600 }),
      ]);
      evolutionExportSummary = {
        ...compiled.summary,
        files,
      };
      await writeFile(path.join(dataDirectory, files.summary),
        `${JSON.stringify(evolutionExportSummary, null, 2)}\n`, { mode: 0o600 });
      return evolutionExportSummary;
    })();
    try {
      return await evolutionExportPromise;
    } catch (error) {
      evolutionExportPromise = null;
      throw error;
    }
  }

  async function completePendingPhysicalTasks() {
    const runtimes = { player1: fixture.player1Runtime,
      player2: fixture.botRuntime };
    for (const seatKey of SEATS) {
      const read = await runtimes[seatKey].read({
        scope: seatKey === "player1" ? fixture.player1Scope : fixture.botScope,
      });
      for (const task of read?.projection?.physicalOperation?.tasks || []) {
        if (task.status !== "pending_human") continue;
        await runtimes[seatKey].delegatePhysicalTask({
          scope: seatKey === "player1" ? fixture.player1Scope : fixture.botScope,
          taskId: task.taskId,
        });
      }
    }
  }

  async function driveOne({ retry = false } = {}) {
    const before = await fixture.orchestrator.read();
    let result = before;
    if (before.status === "paused"
      || (before.status === "blocked" && retry === true)) {
      result = await fixture.orchestrator.resume({
        maxAdditionalActions: 1, pauseAfterAppliedActions: 1,
        retryProvider: retry === true,
      });
    } else if (before.status === "running") {
      result = await fixture.orchestrator.run({
        maxAdditionalActions: 1, pauseAfterAppliedActions: 1,
      });
    }
    await completePendingPhysicalTasks();
    if (result.status === "completed" && !providerMatchesFinalized) {
      providerMatchesFinalized = true;
      await Promise.all(SEATS.map((seatKey) =>
        providerStacks[seatKey].finalizeMatch()));
    }
    if (result.status === "completed") {
      await writeTerminalEvolutionArtifacts(result);
    }
    return result;
  }

  function publicDriveJob() {
    if (!driveJob) return null;
    return {
      schemaVersion: "ticket23_slice248_async_drive_job_v1",
      jobId: driveJob.jobId,
      status: driveJob.status,
      requestedAt: driveJob.requestedAt,
      startedAt: driveJob.startedAt,
      completedAt: driveJob.completedAt,
      result: driveJob.result,
      failure: driveJob.failure,
      trainingTruth: false,
    };
  }

  function queueDrive({ retry = false } = {}) {
    if (driveJob?.status === "queued" || driveJob?.status === "running") {
      return publicDriveJob();
    }
    driveJobSequence += 1;
    driveJob = {
      jobId: `slice248-drive-${String(driveJobSequence).padStart(4, "0")}`,
      status: "queued",
      requestedAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      result: null,
      failure: null,
    };
    driveJobCompletion = new Promise((resolve) => {
      setImmediate(async () => {
        driveJob.status = "running";
        driveJob.startedAt = new Date().toISOString();
        try {
          const result = await driveOne({ retry });
          driveJob.result = {
            status: result.status,
            appliedActionCount: result.appliedActionCount,
            failureAccounting: result.failureAccounting,
          };
          driveJob.status = "completed";
        } catch (error) {
          driveJob.failure = {
            code: String(error?.code || error?.name || "SLICE248_DRIVE_FAILED"),
            message: String(error?.message || error),
            severity: String(error?.severity || "High"),
          };
          driveJob.status = "failed";
        } finally {
          driveJob.completedAt = new Date().toISOString();
          resolve(publicDriveJob());
        }
      });
    });
    return publicDriveJob();
  }

  function publicAutoDrive() {
    return {
      schemaVersion: "ticket23_slice248_continuous_auto_drive_v1",
      status: autoDrive.status,
      completedActions: autoDrive.completedActions,
      currentJobId: driveJob?.status === "queued"
        || driveJob?.status === "running" ? driveJob.jobId : null,
      startedAt: autoDrive.startedAt,
      stoppedAt: autoDrive.stoppedAt,
      stopReason: autoDrive.stopReason,
      trainingTruth: false,
    };
  }

  async function roomProgress() {
    const result = await fixture.roomRuntime.readRoom({ roomId });
    const revision = Number(result?.projection?.room?.stateRevision);
    if (result?.ok !== true || !Number.isSafeInteger(revision)) {
      throw Object.assign(new Error("A2A_AUTO_ROOM_READ_FAILED"), {
        code: "A2A_AUTO_ROOM_READ_FAILED", severity: "High",
      });
    }
    return { revision, terminal: result.projection.state?.terminal === true
      || result.projection.state?.gameOver === true };
  }

  async function runAutoDrive() {
    try {
      while (!autoDrive.stopRequested) {
        const before = await roomProgress();
        if (before.terminal) {
          autoDrive.status = "completed";
          autoDrive.stopReason = "ROOM_TERMINAL";
          break;
        }
        if (autoDrive.stopRequested) break;
        queueDrive();
        await driveJobCompletion;
        if (driveJob.status === "failed") {
          autoDrive.status = "failed";
          autoDrive.stopReason = driveJob.failure?.code
            || "A2A_AUTO_ACTION_FAILED";
          break;
        }
        const blockingFinding = driveJob.result?.failureAccounting?.findings
          ?.find((entry) => entry.integrationBlocking === true
            || entry.severity === "Critical" || entry.severity === "High");
        if (blockingFinding || driveJob.result?.status === "blocked") {
          autoDrive.status = "failed";
          autoDrive.stopReason = blockingFinding?.code
            || "A2A_AUTO_ACTION_BLOCKED";
          break;
        }
        const after = await roomProgress();
        if (after.revision <= before.revision) {
          autoDrive.status = "failed";
          autoDrive.stopReason = "A2A_AUTO_ACTION_DID_NOT_ADVANCE";
          break;
        }
        autoDrive.completedActions += 1;
        if (after.terminal || driveJob.result?.status === "completed") {
          autoDrive.status = "completed";
          autoDrive.stopReason = "ROOM_TERMINAL";
          break;
        }
        // Yield after each sealed Apply/Replay so pause and status requests
        // can be observed before the next potentially paid decision.
        await new Promise((resolve) => setImmediate(resolve));
      }
    } catch (error) {
      autoDrive.status = "failed";
      autoDrive.stopReason = String(error?.code || error?.message
        || "A2A_AUTO_DRIVE_FAILED");
    } finally {
      if (autoDrive.status === "running" || autoDrive.status === "pausing") {
        autoDrive.status = "paused";
        autoDrive.stopReason = "USER_PAUSED_AFTER_CURRENT_ACTION";
      }
      autoDrive.stoppedAt = new Date().toISOString();
      autoLoopPromise = null;
    }
  }

  function startAutoDrive() {
    if (autoDrive.status === "running" || autoDrive.status === "pausing") {
      return publicAutoDrive();
    }
    if (driveJob?.status === "queued" || driveJob?.status === "running") {
      return { ...publicAutoDrive(), status: "busy",
        stopReason: "A2A_AUTO_SINGLE_ACTION_IN_FLIGHT" };
    }
    if (fixture.rulesRuntime.descriptor
      .dataWiringAuditBlockingFindingCount !== 0) {
      return { ...publicAutoDrive(), status: "blocked",
        stopReason: "A2A_AUTO_DATA_WIRING_BLOCKED" };
    }
    autoDrive.status = "running";
    autoDrive.stopRequested = false;
    autoDrive.startedAt = new Date().toISOString();
    autoDrive.stoppedAt = null;
    autoDrive.stopReason = null;
    autoLoopPromise = new Promise((resolve) => {
      setImmediate(() => { void runAutoDrive().finally(resolve); });
    });
    return publicAutoDrive();
  }

  function pauseAutoDrive() {
    if (autoDrive.status === "running") {
      autoDrive.stopRequested = true;
      autoDrive.status = "pausing";
    }
    return publicAutoDrive();
  }

  async function buildManifest() {
    const observationPhaseTimings = [];
    const observe = async (operation, task) => {
      const started = performance.now();
      const result = await task();
      observationPhaseTimings.push({ operation,
        elapsedMs: Math.round(performance.now() - started) });
      return result;
    };
    const roomRead = await observe("room_read", () =>
      fixture.roomRuntime.readRoom({ roomId }));
    const seatReads = {
      player1: await observe("player1_seat_read", () =>
        fixture.player1Runtime.read({ scope: fixture.player1Scope })),
      player2: await observe("player2_seat_read", () =>
        fixture.botRuntime.read({ scope: fixture.botScope })),
    };
    const providerReads = {
      player1: await observe("player1_provider_read", () =>
        providerStacks.player1.decisionPort.read({
        scope: fixture.player1Scope,
      })),
      player2: await observe("player2_provider_read", () =>
        providerStacks.player2.decisionPort.read({
        scope: fixture.botScope,
      })),
    };
    const providers = Object.fromEntries(SEATS.map((seatKey) => [seatKey,
      compactProviderProjection(providerReads[seatKey]?.projection || {})]));
    const recentAcceptedTransitions = (await observe("public_journal_read", () =>
      fixture.roomRuntime.roomStore.readJournal(roomId, "public", 0)))
      .filter((entry) => entry.payload?.type === "accepted_transition")
      .map((entry) => entry.payload.payload).slice(-64);
    const orchestratorSummary = await observe("orchestrator_summary_read", () =>
      fixture.orchestrator.readStatusSummary());
    const state = roomRead.projection.state || {};
    return {
      schemaVersion: "ticket23_slice248_standard_2000_aa_live_manifest_v1",
      roomId,
      room: roomRead.projection.room,
      state: {
        round: state.round ?? null,
        phase: state.phase ?? null,
        activeSideKey: state.activeSideKey ?? null,
        terminal: state.terminal === true,
        gameOver: state.gameOver === true,
        winner: state.winner || "",
        terminalReason: state.terminalReason || "",
        scores: state.scores || null,
      },
      map: state.board?.battlefieldMapManifest ? {
        ...state.board.battlefieldMapManifest,
        roomFreezeSummary: state.board.competitiveMapRoomFreezeSummary || null,
      } : null,
      coverage: fixture.coverage,
      orchestrator: orchestratorSummary,
      observationPhaseTimings,
      driveJob: publicDriveJob(),
      autoDrive: publicAutoDrive(),
      seats: Object.fromEntries(SEATS.map((seatKey) => [seatKey,
        compactSeatProjection(seatReads[seatKey]?.projection || {})])),
      providers,
      usage: sumUsage(providers),
      selectedModels,
      currentProductRuntimeVariant: versionedFork?.targetRuntimeVariant
        || privateState.currentProductRuntimeVariant || "legacy_v1",
      strategySkillRefsBySeat: fixture.routedSkillRefsBySeat,
      recentAcceptedTransitions,
      isolation: {
        independentScopeKeys:
          fixture.player1Scope.seatKey !== fixture.botScope.seatKey,
        independentBotStores: true,
        independentMatchDecisionJournals: true,
        independentProviderAttemptAndDecisionStores: true,
        independentBudgetLimitCnyMicrosBySeat: {
          player1: perSeatBudgetCnyMicros,
          player2: perSeatBudgetCnyMicros,
        },
        sharedRoomOnly: true,
      },
      promptPackBySeat: {
        player1: "selfplay_agent_prompt", player2: "selfplay_agent_prompt",
      },
      dataWiringAudit: {
        status: fixture.rulesRuntime.descriptor
          .dataWiringAuditBlockingFindingCount === 0 ? "passed" : "blocked",
        schema: fixture.rulesRuntime.descriptor.dataWiringAuditSchema || null,
        hash: fixture.rulesRuntime.descriptor.dataWiringAuditHash || null,
        blockingFindingCount: fixture.rulesRuntime.descriptor
          .dataWiringAuditBlockingFindingCount ?? null,
      },
      webBundle,
      fork,
      versionedRulesFork: versionedFork ? {
        sourceRoomId: versionedFork.sourceRoomId,
        sourceStateRevision: versionedFork.sourceStateRevision,
        sourceStateHash: versionedFork.sourceStateHash,
        sourceAcceptedReceiptCount:
          versionedFork.sourceAcceptedReceiptCount,
        targetRulesRuntimeHash: versionedFork.targetRulesRuntimeHash,
        memorySourceLockHash: memoryHandoff?.lockHash || null,
        oldJournalCopied: false,
        productionRoomEligible: false,
        trainingTruth: false,
      } : null,
      evolutionExport: evolutionExportSummary,
      serviceProcess: {
        pid: process.pid,
        uptimeSeconds: Number(process.uptime().toFixed(3)),
        memoryUsageBytes: process.memoryUsage(),
        resourceUsage: process.resourceUsage(),
      },
      sourceRefreshPerformed: false,
      trainingTruth: false,
    };
  }

  const roomAdapter = createStarcraftTmgLevel3HttpAdapter({
    roomRuntime: fixture.roomRuntime,
    assetRoot: ROOT,
    mapConfigurationPort: createOfficialCompetitiveMapConfiguratorV1(),
  });
  const server = http.createServer(async (request, response) => {
    try {
      const origin = `http://${request.headers.host || "127.0.0.1"}`;
      const url = new URL(request.url || "/", origin);
      const hasBody = ["POST", "PUT", "PATCH"].includes(
        request.method || "GET");
      const requestBody = hasBody ? await readRequestBody(request)
        : { rawBody: Buffer.alloc(0), body: {}, bodyBytes: 0 };
      if (url.pathname === "/__ticket23/a2a/drive") {
        if (request.method !== "POST") {
          sendJson(response, 405, { ok: false, reason: "METHOD_NOT_ALLOWED" });
          return;
        }
        if (!authorizeRunner(request, runnerToken)) {
          sendJson(response, 403, { ok: false,
            reason: "RUNNER_A2A_DRIVE_FORBIDDEN" });
          return;
        }
        if (autoDrive.status === "running"
          || autoDrive.status === "pausing") {
          sendJson(response, 409, { ok: false,
            reason: "A2A_AUTO_DRIVE_ALREADY_RUNNING" });
          return;
        }
        const job = queueDrive({
          retry: retryProviderOnResume || requestBody.body.retry === true,
        });
        sendJson(response, 202, { ok: true, job });
        return;
      }
      if (url.pathname === "/__ticket23/a2a/ui-drive") {
        if (request.method !== "POST") {
          sendJson(response, 405, { ok: false, reason: "METHOD_NOT_ALLOWED" });
          return;
        }
        if (!authorizeUiControl(request, uiControlToken)) {
          sendJson(response, 403, { ok: false,
            reason: "UI_A2A_DRIVE_FORBIDDEN" });
          return;
        }
        if (autoDrive.status === "running"
          || autoDrive.status === "pausing") {
          sendJson(response, 409, { ok: false,
            reason: "A2A_AUTO_DRIVE_ALREADY_RUNNING" });
          return;
        }
        const job = queueDrive({ retry: requestBody.body.retry === true });
        sendJson(response, 202, { ok: true, job });
        return;
      }
      if (url.pathname === "/__ticket23/a2a/ui-auto-start"
        || url.pathname === "/__ticket23/a2a/ui-auto-pause") {
        if (request.method !== "POST") {
          sendJson(response, 405, { ok: false,
            reason: "METHOD_NOT_ALLOWED" });
          return;
        }
        if (!authorizeUiControl(request, uiControlToken)) {
          sendJson(response, 403, { ok: false,
            reason: "UI_A2A_AUTO_FORBIDDEN" });
          return;
        }
        const auto = url.pathname.endsWith("auto-start")
          ? startAutoDrive() : pauseAutoDrive();
        const denied = auto.status === "busy" || auto.status === "blocked";
        sendJson(response, denied ? 409 : 202, { ok: !denied,
          auto, ...(denied ? { reason: auto.stopReason } : {}) });
        return;
      }
      if (url.pathname === "/__ticket23/a2a/ui-status") {
        if (request.method !== "GET") {
          sendJson(response, 405, { ok: false, reason: "METHOD_NOT_ALLOWED" });
          return;
        }
        if (!authorizeUiControl(request, uiControlToken)) {
          sendJson(response, 403, { ok: false,
            reason: "UI_A2A_STATUS_FORBIDDEN" });
          return;
        }
        sendJson(response, 200, {
          ok: true,
          job: publicDriveJob(),
          auto: publicAutoDrive(),
          manifest: await buildManifest(),
        });
        return;
      }
      if (url.pathname === "/__ticket23/a2a/drive-status") {
        if (request.method !== "GET") {
          sendJson(response, 405, { ok: false, reason: "METHOD_NOT_ALLOWED" });
          return;
        }
        if (!authorizeRunner(request, runnerToken)) {
          sendJson(response, 403, { ok: false,
            reason: "RUNNER_A2A_DRIVE_STATUS_FORBIDDEN" });
          return;
        }
        sendJson(response, 200, { ok: true, job: publicDriveJob() });
        return;
      }
      if (url.pathname === "/__ticket23/a2a/manifest") {
        sendJson(response, 200, await buildManifest());
        return;
      }
      if (url.pathname.startsWith(STARCRAFT_TMG_LEVEL3_API_PREFIX)
        || url.pathname.startsWith(
          "/starcraft-tmg-level3/assets/v1/character/")) {
        const result = await roomAdapter.handle({
          method: request.method, pathname: url.pathname,
          query: url.searchParams, headers: request.headers, ...requestBody,
        });
        if (result.binary) {
          response.writeHead(result.status, result.headers);
          response.end(result.body);
        } else sendJson(response, result.status, result.response);
        return;
      }
      const botMatch = url.pathname.match(new RegExp(
        `^${STARCRAFT_TMG_HOSTED_BOT_SEAT_API_PREFIX}/rooms/([^/]+)$`, "u"));
      if (botMatch) {
        const requestedRoomId = decodeURIComponent(botMatch[1]);
        if (request.method !== "GET" || requestedRoomId !== roomId) {
          sendJson(response, request.method === "GET" ? 404 : 405, {
            schemaVersion: STARCRAFT_TMG_HOSTED_BOT_SEAT_HTTP_VERSION,
            result: { ok: false, reason: request.method === "GET"
              ? "BOT_SEAT_NOT_FOUND" : "METHOD_NOT_ALLOWED" },
          });
          return;
        }
        const result = await fixture.botRuntime.read({ scope: fixture.botScope });
        sendJson(response, 200, {
          schemaVersion: STARCRAFT_TMG_HOSTED_BOT_SEAT_HTTP_VERSION,
          result,
        });
        return;
      }
      const roomEntry = request.method === "GET"
        && (url.pathname === "/room" || url.pathname.startsWith("/room/"));
      const staticHeaders = roomEntry ? {
        "set-cookie": `ticket23_a2a_ui=${encodeURIComponent(uiControlToken)}; HttpOnly; SameSite=Strict; Path=/__ticket23/a2a; Max-Age=21600`,
      } : {};
      if (await serveFile(response, staticCandidate(url.pathname),
        staticHeaders)) return;
      const body = Buffer.from("Not found", "utf8");
      response.writeHead(404, { "content-length": String(body.byteLength),
        "content-type": "text/plain; charset=utf-8" });
      response.end(body);
    } catch (error) {
      sendJson(response, error?.message === "PAYLOAD_TOO_LARGE" ? 413 : 500, {
        ok: false, error: error instanceof Error ? error.message : String(error),
      });
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address !== "object") {
    throw new Error("SLICE248_SERVER_LISTEN_FAILED");
  }
  const origin = `http://127.0.0.1:${address.port}`;
  const startupProviderReads = await Promise.all(SEATS.map((seatKey) => (
    providerStacks[seatKey].decisionPort.read({
      scope: seatKey === "player1" ? fixture.player1Scope : fixture.botScope,
    })
  )));
  const startupUsage = sumUsage(Object.fromEntries(SEATS.map(
    (seatKey, index) => [seatKey,
      startupProviderReads[index]?.projection || null],
  )));
  process.stdout.write(`${JSON.stringify({
    schemaVersion: "ticket23_slice248_standard_2000_aa_live_entry_v1",
    origin,
    url: `${origin}/room/${encodeURIComponent(roomId)}`,
    productSurface: "starcraft_tmg_expo_web_public_observer",
    roomId,
    runnerToken,
    dataDirectory,
    plannedPlanHash: privateState.plannedPlanHash,
    activeRosterPlanHash: privateState.activeRosterPlanHash || privateState.plannedPlanHash || null,
    pregamePlanRevisionCount: privateState.pregamePlanRevisions?.length || 0,
    opponentPlannedPlanHash: privateState.opponentPlannedPlanHash || null,
    selectedModels,
    currentProductRuntimeVariant: versionedFork?.targetRuntimeVariant
      || privateState.currentProductRuntimeVariant || "legacy_v1",
    webBundle,
    budgetLimitCny: perRoomBudgetCny,
    providerCalls: startupUsage.providerCalls,
    totalUnits: startupUsage.totalUnits,
    costCny: startupUsage.estimatedCostCnyMicros / 1_000_000,
    resumed: Boolean(requestedResumeDirectory),
    fork,
    versionedRulesFork: versionedFork ? {
      sourceRoomId: versionedFork.sourceRoomId,
      sourceStateRevision: versionedFork.sourceStateRevision,
      sourceStateHash: versionedFork.sourceStateHash,
      sourceAcceptedReceiptCount:
        versionedFork.sourceAcceptedReceiptCount,
      targetRulesRuntimeHash: versionedFork.targetRulesRuntimeHash,
      memorySourceLockHash: memoryHandoff?.lockHash || null,
      oldJournalCopied: false,
      productionRoomEligible: false,
      trainingTruth: false,
    } : null,
  })}\n`);
  if (autoDriveOnLaunch) startAutoDrive();
  let closing = false;
  const close = async () => {
    if (closing) return;
    closing = true;
    pauseAutoDrive();
    // Never tear down the Provider or Room store during a paid in-flight
    // action. The current sealed Apply/Replay finishes before shutdown.
    if (autoLoopPromise) await autoLoopPromise;
    else if (driveJob?.status === "queued"
      || driveJob?.status === "running") await driveJobCompletion;
    try { await fixture.player1Runtime.close(); } catch {}
    try { await fixture.botRuntime.close(); } catch {}
    for (const seatKey of SEATS) {
      try { await providerStacks[seatKey].close(); } catch {}
      try { memoryJournals[seatKey].close(); } catch {}
      try { botStores[seatKey].close(); } catch {}
    }
    try { roomStore.close(); } catch {}
    await stageObservationTail;
    server.close(() => process.exit(0));
  };
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
}

main().catch((error) => {
  // A failed startup has no HTTP shutdown handler yet. IPC workers otherwise
  // keep the process alive and hide the real error until the outer 10m timeout.
  process.stderr.write(`${error.stack || error}\n`, () => process.exit(1));
});
