#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { appendFile, copyFile, mkdir, readFile, readdir, rename, writeFile } from
  "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";
import { captureOwnedLiveElementV1, captureOwnedLivePageV1 } from
  "../packages/online-agent-session/owned-live-capture-v1.mjs";

import { isStarcraftTmgTransientControlPlaneReadFailureV1,
  readStarcraftTmgDurableAgentActionBoundaryV1 } from
  "../packages/online-agent-session/durable-agent-action-boundary-v1.mjs";
import { isStarcraftTmgHistoricalResumeFindingV1 } from
  "../packages/online-agent-session/decision-recovery-policy-v1.mjs";
import { advanceCompletedDriveProgressV1 } from
  "../packages/online-agent-session/completed-drive-progress-v1.mjs";
import { resolveTicket23AgentAgentInteractionModeV1 } from
  "./support/ticket23-agent-agent-resume-interaction-mode-v1.mjs";
import { resolveTicket23VersionedCostAncestryV1 } from
  "./support/ticket23-agent-agent-cost-ancestry-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SERVER = path.join(ROOT,
  "scripts/serve-ticket-23-slice-248-agent-agent-web-v1.mjs");
const MAX_ACTIONS = 512;
const MATCH_TIMEOUT_MS = 36 * 60 * 60_000;
const SEATS = Object.freeze(["player1", "player2"]);
const BLOCKING_SEVERITIES = new Set(["Critical", "High"]);
const COST_WINDOW_LEDGER = path.join(ROOT, "docs",
  "ticket-23-slice-248-per-room-cost-window-v1-2026-09-28.json");

function ensure(condition, code, details = {}) {
  if (!condition) throw Object.assign(new Error(code), { code, ...details });
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function safeName(value) {
  return String(value || "action").replace(/[^a-z0-9_-]+/giu, "-")
    .replace(/^-+|-+$/gu, "").slice(0, 80) || "action";
}

function isRuntimeCostArgument(entry) {
  return entry === "--no-cost-limit" || entry.startsWith("--per-room-budget-cny=");
}

function findingKey(finding = {}) {
  return [finding.seatKey || "", finding.code || "",
    finding.occurredAt || ""].join(":");
}

function summarizeStrategyEvidence(actions = []) {
  const modelActions = actions.filter((entry) => entry.modelDecision === true);
  const formationActions = modelActions.filter((entry) =>
    entry.formationSelection?.selectedOptionId
      || entry.formationSelection?.optionId
      || entry.formationSelection?.formationOptionId);
  const evidenceRows = modelActions.map((entry) =>
    entry.decisionMaterialEvidence || {});
  const queryRows = evidenceRows.flatMap((entry) =>
    Array.isArray(entry.queryReceipts) ? entry.queryReceipts : []);
  const queryCoverage = Object.fromEntries([
    "attack_probability", "fire_zone_exchange",
  ].map((queryKind) => {
    const rows = queryRows.filter((entry) => entry.queryKind === queryKind);
    return [queryKind, {
      capabilityAvailable: true,
      executedReceiptCount: rows.length,
      exactCount: rows.filter((entry) => entry.status === "exact").length,
      advisoryCount: rows.filter((entry) =>
        entry.status === "advisory_estimate").length,
      unknownCount: rows.filter((entry) => entry.status === "unknown").length,
      receiptHashes: [...new Set(rows.map((entry) =>
        entry.queryReceiptHash).filter(Boolean))],
    }];
  }));
  const calibrationAvailable = evidenceRows.flatMap((entry) =>
    Array.isArray(entry.predictionCalibrationsAvailable)
      ? entry.predictionCalibrationsAvailable : []);
  const calibrationCited = evidenceRows.flatMap((entry) =>
    Array.isArray(entry.predictionCalibrationsCited)
      ? entry.predictionCalibrationsCited : []);
  const planDispositionCounts = evidenceRows.reduce((counts, entry) => {
    const disposition = String(entry.planDisposition || "unknown");
    counts[disposition] = Number(counts[disposition] || 0) + 1;
    return counts;
  }, {});
  return {
    formationEvidence: {
      capabilityAvailable: true,
      agentSelectedCount: formationActions.length,
      publicReasonCount: formationActions.filter((entry) => Boolean(String(
        entry.formationSelection?.publicReason || "").trim())).length,
      rulesAppliedAndReplayVerifiedCount: formationActions.filter((entry) =>
        entry.replayMatchesCurrent === true && Boolean(entry.receiptHash)).length,
    },
    decisionMaterialCoverage: {
      actionCount: actions.length,
      modelDecisionActionCount: modelActions.length,
      deterministicHostActionCount: actions.length - modelActions.length,
      actionsWithPublicIntent: modelActions.filter((entry) =>
        Boolean(entry.intent)).length,
      actionsWithOpponentPrediction: evidenceRows.filter((entry) =>
        Number(entry.predictedOpponentResponseCount || 0) > 0).length,
      queryCoverage,
      predictionCalibration: {
        availableToPlannerCount: calibrationAvailable.length,
        citedByPlannerCount: calibrationCited.length,
        availableHashes: [...new Set(calibrationAvailable.map((entry) =>
          entry.calibrationHash).filter(Boolean))],
        citedHashes: [...new Set(calibrationCited.map((entry) =>
          entry.calibrationHash).filter(Boolean))],
      },
      planDispositionCounts,
      planRevisionCount: evidenceRows.filter((entry) =>
        entry.planRevised === true).length,
      hiddenChainOfThoughtStored: false,
    },
  };
}

function sanitize(value) {
  return String(value || "")
    .replace(/\b(?:sk|jsk)-[A-Za-z0-9_-]{12,}/gu, "[REDACTED_API_KEY]")
    .replace(/Bearer\s+[^\s]+/giu, "Bearer [REDACTED]")
    .slice(-20_000);
}

function safeErrorDetails(error) {
  const cause = error?.cause;
  return {
    code: String(error?.code || error?.name || "UNKNOWN_ERROR"),
    message: sanitize(error?.message || error),
    cause: cause ? {
      code: String(cause.code || cause.name || "UNKNOWN_CAUSE"),
      message: sanitize(cause.message || cause),
      errno: cause.errno ?? null,
      syscall: cause.syscall || null,
    } : null,
  };
}

async function writeJsonAtomic(filename, value, mode = 0o600) {
  const temporary = `${filename}.next`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8", mode,
  });
  await rename(temporary, filename);
}

async function startServer(resumeDirectory = null, fork = null,
  providerInteractionMode = "native_tools",
  allowFailedInteractionModeMigration = false, pregameArgs = []) {
  const child = spawn(process.execPath, [SERVER,
    `--provider-interaction-mode=${providerInteractionMode}`,
    ...pregameArgs,
    ...(allowFailedInteractionModeMigration
      ? ["--allow-failed-interaction-mode-migration"] : []),
    ...(resumeDirectory ? [
      `--resume-directory=${resumeDirectory}`,
      "--retry-provider-on-resume",
    ] : []),
    ...(fork ? [
      `--fork-source-directory=${fork.sourceDirectory}`,
      `--fork-through-revision=${fork.throughRevision}`,
    ] : [])], {
    cwd: ROOT, env: process.env, stdio: ["ignore", "pipe", "pipe"],
  });
  let stderr = "";
  const processState = {
    pid: child.pid || null,
    exitObserved: false,
    exitCode: null,
    signal: null,
    error: null,
  };
  child.stderr.on("data", (chunk) => { stderr += sanitize(chunk); });
  child.once("error", (error) => {
    processState.error = sanitize(error?.message || error);
  });
  child.once("exit", (code, signal) => {
    processState.exitObserved = true;
    processState.exitCode = code;
    processState.signal = signal;
  });
  const lines = readline.createInterface({ input: child.stdout });
  const entry = await new Promise((resolve, reject) => {
    let timeout;
    const onTimeout = () => {
      lines.close();
      if (!processState.exitObserved) child.kill("SIGTERM");
      reject(Object.assign(
        new Error(`SLICE248_SERVER_START_STALLED:${stderr}`),
        { code: "SLICE248_SERVER_START_TIMEOUT",
          childTerminationRequested: true },
      ));
    };
    const refreshTimeout = () => {
      clearTimeout(timeout);
      timeout = setTimeout(onTimeout, 600_000);
    };
    refreshTimeout();
    const finish = (callback) => (...values) => {
      clearTimeout(timeout);
      callback(...values);
    };
    lines.on("line", (line) => {
      try {
        const parsed = JSON.parse(line);
        if (parsed.schemaVersion
          === "ticket23_slice248_standard_2000_aa_live_entry_v1") {
          finish(resolve)(parsed);
        } else if (parsed.schemaVersion
          === "ticket23_slice248_fork_start_progress_v1"
          || parsed.schemaVersion
            === "ticket27_slice272_pregame_startup_progress_v1") {
          refreshTimeout();
          process.stdout.write(`${line}\n`);
        } else process.stdout.write(`${line}\n`);
      } catch {
        process.stdout.write(`${line}\n`);
      }
    });
    child.once("exit", finish((code, signal) => reject(Object.assign(
      new Error(`SLICE248_SERVER_EXITED:${code}:${signal || "none"}:${stderr}`),
      { code: "SLICE248_SERVER_EXITED", exitCode: code, signal },
    ))));
    child.once("error", finish(reject));
  });
  lines.close();
  return { child, entry, stderr: () => stderr, processState };
}

async function stopServer(child) {
  if (!child || child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)), sleep(5_000),
  ]);
  if (child.exitCode === null) child.kill("SIGKILL");
}

function botProjection(manifest, seatKey) {
  return manifest?.seats?.[seatKey]?.bot
    || manifest?.seats?.[seatKey] || {};
}

function actionCount(manifest) {
  return SEATS.reduce((sum, seatKey) =>
    sum + Number(botProjection(manifest, seatKey).actionCount || 0), 0);
}

function findings(manifest) {
  return SEATS.flatMap((seatKey) => [
    ...(botProjection(manifest, seatKey).issues || []).map((entry) => ({
      ...entry, seatKey: entry.seatKey || seatKey,
    })),
    ...(manifest?.seats?.[seatKey]?.notificationIssues || []).map((entry) => ({
      ...entry, seatKey: entry.seatKey || seatKey,
    })),
    ...(manifest?.providers?.[seatKey]?.issues || []).map((entry) => ({
      ...entry, seatKey: entry.seatKey || seatKey,
    })),
  ]);
}

function unseenTraces(manifest, recordedReceiptHashes) {
  return SEATS.flatMap((seatKey) => (
    botProjection(manifest, seatKey).recentTraces || []
  ).filter((trace) => trace?.applyReceiptHash
    && !recordedReceiptHashes.has(trace.applyReceiptHash))
    .map((trace) => ({ seatKey, trace })))
    .sort((left, right) => Number(left.trace.postStateRevision || 0)
      - Number(right.trace.postStateRevision || 0));
}

const durableReplayPrefixes = new Map();
function readDurableReplayPrefix(runDirectory) {
  if (!durableReplayPrefixes.has(runDirectory)) {
    const filename = path.join(runDirectory, "fork-provenance.json");
    durableReplayPrefixes.set(runDirectory, existsSync(filename)
      ? JSON.parse(readFileSync(filename, "utf8")) : null);
  }
  return durableReplayPrefixes.get(runDirectory);
}

function durableActionBoundary(runDirectory, previous) {
  return readStarcraftTmgDurableAgentActionBoundaryV1({
    replayedPrefix: readDurableReplayPrefix(runDirectory),
    previousStateRevision: Number(previous?.room?.stateRevision || 0),
    previousActionCount: actionCount(previous),
    roomDatabaseFilename: path.join(runDirectory, "room.sqlite"),
    seatDatabaseFilenames: {
      player1: path.join(runDirectory, "seats/player1/bot-seat.sqlite"),
      player2: path.join(runDirectory, "seats/player2/bot-seat.sqlite"),
    },
  });
}

async function main() {
  const budgetArgument = process.argv.find((entry) =>
    entry.startsWith("--per-room-budget-cny="));
  const noticeArgument = process.argv.find((entry) =>
    entry.startsWith("--cost-notice-step-cny="));
  const perRoomBudgetCnyMicros = process.argv.includes("--no-cost-limit") || !budgetArgument
    ? null : Number(budgetArgument.slice("--per-room-budget-cny=".length)) * 1_000_000;
  const noticeStepCnyMicros = Number(noticeArgument
    ? noticeArgument.slice("--cost-notice-step-cny=".length) : 100) * 1_000_000;
  ensure((perRoomBudgetCnyMicros === null || (Number.isSafeInteger(perRoomBudgetCnyMicros)
    && perRoomBudgetCnyMicros > 0)) && Number.isSafeInteger(noticeStepCnyMicros)
    && noticeStepCnyMicros > 0, "SLICE248_COST_POLICY_INVALID");
  const interactionModeArgument = process.argv.find((entry) =>
    entry.startsWith("--provider-interaction-mode="));
  const allowFailedInteractionModeMigration = process.argv.includes(
    "--allow-failed-interaction-mode-migration");
  const resumeArgument = process.argv.find((entry) =>
    entry.startsWith("--resume-directory="));
  const resumeDirectory = resumeArgument
    ? path.resolve(resumeArgument.slice("--resume-directory=".length)) : null;
  const attachedEntryArgument = process.argv.find((entry) =>
    entry.startsWith("--attach-entry-file="));
  const attachedEntryFile = attachedEntryArgument
    ? path.resolve(attachedEntryArgument.slice("--attach-entry-file=".length))
    : null;
  ensure(!attachedEntryFile || resumeDirectory,
    "SLICE248_ATTACHED_HOST_REQUIRES_RESUME");
  const reconcileOnly = process.argv.includes("--reconcile-only");
  ensure(!reconcileOnly || (resumeDirectory && attachedEntryFile),
    "SLICE248_RECONCILE_ONLY_REQUIRES_ATTACHED_ORIGINAL_ROOM");
  const pregameArgs = process.argv.filter((entry) =>
    isRuntimeCostArgument(entry)
    || entry.startsWith("--pregame-agent-selected-iterative-session-id=")
    || entry.startsWith("--pregame-agent-selected-teach-session-id=")
    || entry.startsWith("--pregame-agent-selected-admission-manifest=")
    || entry.startsWith("--pregame-roster-session-id=")
    || entry.startsWith("--current-product-runtime-variant=")
    || entry.startsWith("--pregame-map-configuration-file=")
    || entry.startsWith("--pregame-map-configuration-json="));
  const providerInteractionMode = resolveTicket23AgentAgentInteractionModeV1({
    resumeDirectory,
    requestedMode: interactionModeArgument
      ? interactionModeArgument.slice("--provider-interaction-mode=".length)
      : null,
    allowFailedInteractionModeMigration,
  });
  ensure(!allowFailedInteractionModeMigration
    || providerInteractionMode === "json_channels_v1",
  "SLICE248_INTERACTION_MIGRATION_MODE_INVALID");
  const forkSourceArgument = process.argv.find((entry) =>
    entry.startsWith("--fork-source-directory="));
  const forkSourceDirectory = forkSourceArgument
    ? path.resolve(forkSourceArgument.slice("--fork-source-directory=".length))
    : null;
  const forkRevisionArgument = process.argv.find((entry) =>
    entry.startsWith("--fork-through-revision="));
  const forkThroughRevision = forkRevisionArgument
    ? Number(forkRevisionArgument.split("=")[1]) : null;
  ensure(!(resumeDirectory && forkSourceDirectory),
    "SLICE265_FORK_AND_RESUME_MUTUALLY_EXCLUSIVE");
  // A room budget applies to both new games and ordinary same-room recovery.
  // Forwarding it to the Host must not classify a resume as pregame planning.
  const hasPregameConfiguration = pregameArgs.some((entry) =>
    !isRuntimeCostArgument(entry));
  ensure(!hasPregameConfiguration || (!resumeDirectory && !forkSourceDirectory),
    "SLICE272_PREGAME_MODE_CANNOT_RESUME_OR_FORK");
  ensure(!forkSourceDirectory || Number.isSafeInteger(forkThroughRevision)
    && forkThroughRevision > 0, "SLICE265_FORK_REVISION_INVALID");
  const checkpointArgument = process.argv.find((entry) =>
    entry.startsWith("--checkpoint-after-additional-actions="));
  const checkpointAfterAdditionalActions = checkpointArgument
    ? Number(checkpointArgument.split("=")[1]) : null;
  ensure(checkpointAfterAdditionalActions === null
    || (Number.isSafeInteger(checkpointAfterAdditionalActions)
      && checkpointAfterAdditionalActions > 0),
  "SLICE248_CHECKPOINT_ACTION_COUNT_INVALID");
  const checkpointRoundArgument = process.argv.find((entry) =>
    entry.startsWith("--checkpoint-after-round-initialized="));
  const checkpointAfterRoundInitialized = checkpointRoundArgument
    ? Number(checkpointRoundArgument.split("=")[1]) : null;
  ensure(checkpointAfterRoundInitialized === null
    || (Number.isSafeInteger(checkpointAfterRoundInitialized)
      && checkpointAfterRoundInitialized > 0),
  "SLICE248_CHECKPOINT_ROUND_INVALID");
  const abstractTerrainMode = process.argv.includes("--abstract-terrain");
  const startedAt = new Date().toISOString();
  const actions = [];
  const mediumFindings = [];
  const consoleErrors = [];
  const pageErrors = [];
  const observationTimings = [];
  const browserReads = [];
  const pendingBrowserReads = new Map();
  let screenshotCount = 0;
  let nextCostNotificationCnyMicros = noticeStepCnyMicros;
  let costWindowBaselineCnyMicros = 0;
  let sourceCostAtVersionedForkCnyMicros = 0;
  let costStreamRootRoomId = null;
  let server = null;
  let browser = null;
  let page = null;
  let outputDirectory = null;
  let entry = null;
  let lastManifest = null;

  function observeTiming(operation, started, details = {}) {
    observationTimings.push({ operation,
      elapsedMs: Math.round(performance.now() - started),
      recordedAt: new Date().toISOString(), ...details });
    if (observationTimings.length > 96) observationTimings.shift();
  }

  async function manifest(timeoutMs = 60_000, options = {}) {
    const started = performance.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
      response = await fetch(`${entry.origin}/__ticket23/a2a/manifest`, {
        headers: { accept: "application/json" }, cache: "no-store",
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
    ensure(response.ok, "SLICE248_MANIFEST_HTTP_FAILED", {
      status: response.status,
    });
    const result = await response.json();
    observeTiming("manifest", started, {
      stateRevision: result.room?.stateRevision ?? null,
    });
    lastManifest = result;
    const allFindings = findings(result);
    const ignoredForExplicitResume = allFindings.filter((finding) =>
      isStarcraftTmgHistoricalResumeFindingV1(finding, {
        allowExistingRetryableFinding:
          options.allowExistingRetryableFinding ?? entry?.resumed === true,
        startedAt,
        providerProjection: result.providers?.[finding.seatKey],
      }));
    const ignoredKeys = new Set(ignoredForExplicitResume.map(findingKey));
    const blocking = allFindings.filter((finding) =>
      BLOCKING_SEVERITIES.has(String(finding.severity))
        && !finding.resolvedAt && !ignoredKeys.has(findingKey(finding)));
    ensure(!blocking.length, "SLICE248_CRITICAL_OR_HIGH_FINDING", { blocking });
    for (const finding of allFindings.filter((entryValue) =>
      String(entryValue.severity) === "Medium")) {
      if (!mediumFindings.some((entryValue) => JSON.stringify(entryValue)
        === JSON.stringify(finding))) mediumFindings.push(finding);
    }
    const branchCost = Number(result.usage?.estimatedCostCnyMicros || 0);
    const cost = branchCost + sourceCostAtVersionedForkCnyMicros;
    while (cost >= nextCostNotificationCnyMicros) {
      process.stdout.write(`${JSON.stringify({
        event: "cost_notification",
        ticket: 23,
        slice: 248,
        roomId: entry.roomId,
        costStreamSourceRoomId: costStreamRootRoomId
          || entry.versionedRulesFork?.sourceRoomId || entry.roomId,
        thresholdCny: (nextCostNotificationCnyMicros
          - costWindowBaselineCnyMicros) / 1_000_000,
        currentEstimatedCostCny: cost / 1_000_000,
        incrementalEstimatedCostCny: Math.max(0,
          cost - costWindowBaselineCnyMicros) / 1_000_000,
      })}\n`);
      nextCostNotificationCnyMicros += noticeStepCnyMicros;
    }
    ensure(perRoomBudgetCnyMicros === null || cost <= perRoomBudgetCnyMicros, "SLICE248_AA_BUDGET_EXCEEDED", {
      costCny: cost / 1_000_000,
    });
    return result;
  }

  async function driveStatus(timeoutMs = 20_000) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${entry.origin}/__ticket23/a2a/drive-status`, {
        headers: {
          accept: "application/json",
          "x-ticket23-runner-token": entry.runnerToken,
        },
        cache: "no-store",
        signal: controller.signal,
      });
      ensure(response.ok, "SLICE248_DRIVE_STATUS_HTTP_FAILED", {
        status: response.status,
      });
      return response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  async function progress(status, extra = {}) {
    if (!outputDirectory) return;
    const manifestValue = extra.manifest || lastManifest;
    const other = Object.fromEntries(Object.entries(extra)
      .filter(([key]) => key !== "manifest"));
    await writeJsonAtomic(path.join(outputDirectory, "progress.json"), {
      schema: "ticket23_slice248_agent_agent_web_progress_v1",
      ticket: 23, slice: 248, status,
      actionCount: actions.length,
      screenshotCount,
      providerCalls: manifestValue?.usage?.providerCalls || 0,
      totalUnits: manifestValue?.usage?.totalUnits || 0,
      estimatedCostCny: Number(
        manifestValue?.usage?.estimatedCostCnyMicros || 0) / 1_000_000,
      costStreamSourceRoomId: costStreamRootRoomId
        || entry?.versionedRulesFork?.sourceRoomId || entry?.roomId || null,
      sourceCostAtVersionedForkCny:
        sourceCostAtVersionedForkCnyMicros / 1_000_000,
      costStreamCurrentEstimatedCostCny: (
        Number(manifestValue?.usage?.estimatedCostCnyMicros || 0)
        + sourceCostAtVersionedForkCnyMicros) / 1_000_000,
      costWindowBaselineCny: costWindowBaselineCnyMicros / 1_000_000,
      incrementalEstimatedCostCny: Math.max(0,
        Number(manifestValue?.usage?.estimatedCostCnyMicros || 0)
          + sourceCostAtVersionedForkCnyMicros
          - costWindowBaselineCnyMicros) / 1_000_000,
      nextIncrementalNoticeCny: (nextCostNotificationCnyMicros
        - costWindowBaselineCnyMicros) / 1_000_000,
      round: manifestValue?.state?.round ?? null,
      phase: manifestValue?.state?.phase ?? null,
      strategyEvidence: summarizeStrategyEvidence(actions),
      observationTimings,
      updatedAt: new Date().toISOString(),
      ...other,
    }, 0o644);
  }

  async function enterBattle() {
    const button = page.getByRole("button", { name: /^(战桌|Battlefield)$/u });
    if (await button.count()) await button.click();
    await page.getByText(/权威战场|Authoritative Battlefield/u)
      .waitFor({ timeout: 30_000 });
    if (abstractTerrainMode) {
      const background = page.locator("#battlefield-display-map-v1").first();
      if (await background.count()) {
        const toggle = page.getByRole("button", {
          name: /^(地图背景|Map art)$/u,
        });
        await toggle.click();
        await background.waitFor({ state: "detached", timeout: 30_000 });
      }
    }
  }

  async function refreshObservedRoom() {
    const started = performance.now();
    const roomTab = page.getByRole("button", {
      name: /^(房间与规则|Room & rules)$/u,
    });
    if (await roomTab.count()) await roomTab.click();
    const refresh = page.getByRole("button", {
      name: /刷新投影|Refresh projection/u,
    });
    if (await refresh.count() && await refresh.isEnabled()) {
      await refresh.click();
      await page.getByText(
        /已连接权威房间|Authoritative room connected/u,
      ).first().waitFor({ state: "attached", timeout: 60_000 });
    }
    await enterBattle();
    observeTiming("refresh_observed_room", started);
  }

  async function settleBattlefieldVisuals() {
    if (abstractTerrainMode) {
      await page.locator(
        '[aria-label^="战场；"], [aria-label^="Battlefield;"]',
      ).first().waitFor({ state: "visible", timeout: 30_000 });
      await page.evaluate(async () => {
        await new Promise((resolve) => requestAnimationFrame(() =>
          requestAnimationFrame(resolve)));
      });
      return;
    }
    const background = page.locator("#battlefield-display-map-v1").first();
    await background.waitFor({ state: "attached", timeout: 30_000 });
    await page.evaluate(async () => {
      const element = document.querySelector("#battlefield-display-map-v1");
      const href = element?.getAttribute("href")
        || element?.getAttribute("xlink:href");
      if (href) {
        const image = new Image();
        image.src = href;
        await image.decode().catch(() => {});
      }
      await new Promise((resolve) => requestAnimationFrame(() =>
        requestAnimationFrame(resolve)));
    });
  }

  async function capture(seatKey, actionType, revision, phase = "applied") {
    await settleBattlefieldVisuals();
    screenshotCount += 1;
    const filename = `${String(screenshotCount).padStart(4, "0")}-r${
      String(revision ?? "x").padStart(3, "0")}-${safeName(seatKey)}-${
      safeName(actionType)}-${safeName(phase)}.png`;
    const started = performance.now();
    let result;
    try {
      result = await captureOwnedLivePageV1({ page,
        path: path.join(outputDirectory, "screenshots", filename) });
    } finally {
      observeTiming("capture_page", started, { revision, phase,
        recoveryWarning: result?.warning || null });
    }
    return `screenshots/${filename}`;
  }

  async function captureElement(locator, seatKey, actionType, revision,
    evidenceKind, phase = "applied") {
    await settleBattlefieldVisuals();
    screenshotCount += 1;
    const filename = `${String(screenshotCount).padStart(4, "0")}-r${
      String(revision ?? "x").padStart(3, "0")}-${safeName(seatKey)}-${
      safeName(actionType)}-${safeName(evidenceKind)}-${safeName(phase)}.png`;
    const captured = await captureOwnedLiveElementV1({ page, locator,
      path: path.join(outputDirectory, "screenshots", filename) });
    return { screenshot: `screenshots/${filename}`,
      captureMode: captured.captureMode, warning: captured.warning };
  }

  async function captureReviewViews(seatKey, actionType, revision,
    phase = "applied") {
    const board = await captureElement(
      page.locator('[aria-label^="战场；"], [aria-label^="Battlefield;"]'),
      seatKey, actionType, revision, "complete-board", phase);
    const control = await captureElement(
      page.getByTestId("agent-agent-match-control"), seatKey, actionType,
      revision, "agent-control", phase);
    return {
      boardScreenshot: board.screenshot,
      controlScreenshot: control.screenshot,
      boardScreenshotCaptureMode: board.captureMode,
      controlScreenshotCaptureMode: control.captureMode,
      screenshotWarnings: [board.warning && { ...board.warning, view: "board" },
        control.warning && { ...control.warning, view: "agent_control" }]
        .filter(Boolean),
    };
  }

  async function recordUnseen(manifestValue, preActionEvidence = null) {
    const recorded = new Set(actions.map((entryValue) =>
      entryValue.receiptHash).filter(Boolean));
    const unseen = unseenTraces(manifestValue, recorded);
    if (!unseen.length) return 0;
    await refreshObservedRoom();
    for (const [unseenIndex, { seatKey, trace }] of unseen.entries()) {
      const captureStarted = performance.now();
      const transition = (manifestValue.recentAcceptedTransitions || [])
        .find((entryValue) =>
          entryValue.journalHash === trace.applyReceiptHash) || null;
      const actionType = transition?.action?.actionType
        || trace.actionType || trace.candidateId || "agent-action";
      const screenshot = await capture(seatKey, actionType,
        trace.postStateRevision);
      const reviewViews = await captureReviewViews(seatKey, actionType,
        trace.postStateRevision);
      observeTiming("capture_applied_action", captureStarted, {
        stateRevision: trace.postStateRevision,
      });
      const observedRevision = Number(manifestValue.room?.stateRevision);
      const record = {
        index: actions.length + 1,
        actor: "agent",
        sideKey: seatKey,
        round: transition?.postState?.round
          ?? manifestValue.state?.round ?? null,
        phase: transition?.action?.phase
          || manifestValue.state?.phase || null,
        actionType,
        pieceId: transition?.action?.pieceId || trace.pieceId || null,
        publicDecisionSummary: trace.publicDecisionSummary || null,
        decisionMaterialEvidence: trace.decisionMaterialEvidence || null,
        plan: trace.plan || null,
        assessment: trace.assessment || null,
        planRevision: trace.planRevision || null,
        intent: trace.intent || null,
        plannerResult: trace.plannerResult || null,
        lifecycleAssessment: trace.lifecycleAssessment || null,
        formationSelection: trace.formationSelection || null,
        assetPlacementSelection: trace.assetPlacementSelection || null,
        placementRationales: trace.placementRationales
          || trace.publicDecisionSummary?.placementRationales || [],
        selectedReason: trace.selectedReason || null,
        risk: trace.risk || null,
        providerCalls: Number(trace.providerCalls || 0),
        providerInputUnits: Number(trace.providerInputUnits || 0),
        providerOutputUnits: Number(trace.providerOutputUnits || 0),
        matchEstimatedCostCnyMicros:
          Number(trace.matchEstimatedCostCnyMicros || 0),
        receiptHash: trace.applyReceiptHash,
        postStateRevision: trace.postStateRevision,
        postStateHash: trace.postStateHash || null,
        replayMatchesCurrent: trace.replayMatchesCurrent === true,
        screenshot,
        ...reviewViews,
        preActionScreenshot: unseenIndex === 0
          ? preActionEvidence?.pageScreenshot || null : null,
        preActionBoardScreenshot: unseenIndex === 0
          ? preActionEvidence?.boardScreenshot || null : null,
        preActionControlScreenshot: unseenIndex === 0
          ? preActionEvidence?.controlScreenshot || null : null,
        screenshotObservedStateRevision: Number.isSafeInteger(observedRevision)
          ? observedRevision : null,
        historicalUiReconstructionRequired:
          Number.isSafeInteger(observedRevision)
            && Number(trace.postStateRevision) !== observedRevision,
        promptPack: "selfplay_agent_prompt",
        rulesAuthority: true,
        modelDecision: Number(trace.providerCalls || 0) > 0,
        hiddenChainOfThoughtStored: false,
        trainingTruth: false,
      };
      actions.push(record);
      await appendFile(path.join(outputDirectory, "actions.ndjson"),
        `${JSON.stringify(record)}\n`, { encoding: "utf8", mode: 0o644 });
    }
    return unseen.length;
  }

  async function recoverControlPlane(boundary) {
    ensure(boundary?.atomicBoundarySatisfied === true
      && boundary.disposition === "restart_control_plane_without_replay",
    "SLICE248_DURABLE_BOUNDARY_NOT_RECOVERABLE", { boundary });
    ensure(!attachedEntryFile, "SLICE248_ATTACHED_HOST_RECOVERY_REQUIRED", {
      boundary,
    });
    await stopServer(server?.child);
    server = await startServer(outputDirectory, null,
      providerInteractionMode, allowFailedInteractionModeMigration);
    entry = server.entry;
    await page.goto(entry.url, { waitUntil: "networkidle", timeout: 60_000 });
    await page.getByText(/已连接权威房间|Authoritative room connected/u)
      .first().waitFor({ state: "attached", timeout: 60_000 });
    await enterBattle();
    const recovered = await manifest();
    ensure(Number(recovered.room?.stateRevision || 0)
      >= boundary.room.stateRevision
      && actionCount(recovered) >= boundary.totalActionCount,
    "SLICE248_DURABLE_BOUNDARY_RECOVERY_MISMATCH", {
      boundary,
      recoveredStateRevision: recovered.room?.stateRevision ?? null,
      recoveredActionCount: actionCount(recovered),
    });
    return recovered;
  }

  async function driveOne(previous, matchDeadline) {
    const previousCount = actionCount(previous);
    const submissionStartedAt = Date.now();
    let result = null;
    let submissionTransportFailure = null;
    try {
      const button = page.getByTestId("agent-agent-drive-next");
      if (!await button.isVisible()) {
        // Product play now uses continuous auto-drive. The exact-one-action
        // acceptance control is intentionally tucked into the detail panel;
        // opening it is UI-only and must not submit another Room action.
        await page.getByRole("button", { name:
          /展开或收起 Agent 控制台详情|Toggle Agent control details/u })
          .click({ timeout: 30_000 });
      }
      await button.waitFor({ state: "visible", timeout: 60_000 });
      await button.click({ timeout: 30_000 });
      result = { ok: true, job: null, triggeredBy: "product_web_ui" };
    } catch (error) {
      if (server?.processState?.exitObserved) throw error;
      // A browser click can reach the same-origin server before Playwright sees
      // the resulting render. Observe the durable job/SQLite boundary before
      // deciding whether a retry would be safe.
      submissionTransportFailure = safeErrorDetails(error);
    }
    if (result) ensure(result?.ok === true
      && result?.triggeredBy === "product_web_ui",
    "SLICE248_UI_DRIVE_NOT_TRIGGERED", { result });
    let jobId = result?.job?.jobId || null;
    while (Date.now() < matchDeadline) {
      await sleep(2_000);
      const boundary = durableActionBoundary(outputDirectory, previous);
      if (boundary.totalActionCount > previousCount
        || boundary.room.stateRevision
          > Number(previous?.room?.stateRevision || 0)) {
        try {
          return await manifest(300_000);
        } catch (error) {
          if (server?.processState?.exitObserved) throw error;
          if (!isStarcraftTmgTransientControlPlaneReadFailureV1(error)) throw error;
          continue;
        }
      }
      let status;
      try {
        status = await driveStatus();
      } catch (error) {
        if (server?.processState?.exitObserved) throw error;
        if (boundary.atomicBoundarySatisfied) {
          return recoverControlPlane(boundary);
        }
        continue;
      }
      if (!jobId && status.job?.jobId) {
        jobId = status.job.jobId;
      }
      if (!jobId) {
        // The browser click starts an asynchronous POST. A status poll can
        // overtake that POST before the server registers its durable job.
        // Never click again on this observation; wait for the same job ID.
        if (Date.now() - submissionStartedAt < 20_000) continue;
        throw Object.assign(new Error(
          "SLICE248_DRIVE_SUBMISSION_NOT_OBSERVED"), {
          code: "SLICE248_DRIVE_SUBMISSION_NOT_OBSERVED",
          submissionTransportFailure,
          duplicateDriveAuthorized: false,
        });
      }
      if (status.job?.jobId !== jobId) continue;
      if (status.job.status === "failed") {
        throw Object.assign(new Error(
          status.job.failure?.message || "SLICE248_ASYNC_DRIVE_FAILED",
        ), {
          code: status.job.failure?.code
            || "SLICE248_ASYNC_DRIVE_FAILED",
          driveJob: status.job,
        });
      }
      if (status.job.status === "completed") {
        return manifest(300_000);
      }
    }
    throw Object.assign(new Error("SLICE248_MATCH_TIMEOUT"), {
      code: "SLICE248_MATCH_TIMEOUT", jobId,
      submissionTransportFailure,
      durableBoundary: durableActionBoundary(outputDirectory, previous),
    });
  }

  try {
    if (attachedEntryFile) {
      const attachedEntry = JSON.parse(await readFile(attachedEntryFile, "utf8"));
      const origin = new URL(attachedEntry.origin);
      ensure(attachedEntry.schemaVersion
        === "ticket23_slice248_standard_2000_aa_live_entry_v1"
        // Attach owns no server startup. A ready fresh host is as attachable
        // as a resumed one; the live manifest below verifies its Room identity.
        && typeof attachedEntry.resumed === "boolean"
        && path.resolve(attachedEntry.dataDirectory) === resumeDirectory
        && origin.protocol === "http:"
        && ["127.0.0.1", "localhost"].includes(origin.hostname)
        && new URL(attachedEntry.url).origin === origin.origin,
      "SLICE248_ATTACHED_HOST_ENTRY_INVALID");
      server = { child: null, entry: attachedEntry, stderr: () => "",
        processState: { ownership: "external", exitObserved: false } };
    } else {
      server = await startServer(resumeDirectory, forkSourceDirectory ? {
        sourceDirectory: forkSourceDirectory,
        throughRevision: forkThroughRevision,
      } : null, providerInteractionMode, allowFailedInteractionModeMigration,
      pregameArgs);
    }
    entry = server.entry;
    outputDirectory = path.resolve(entry.dataDirectory);
    let costWindowLedger = null;
    if (existsSync(COST_WINDOW_LEDGER)) {
      try {
        const parsed = JSON.parse(readFileSync(COST_WINDOW_LEDGER, "utf8"));
        if (parsed.schemaVersion
          !== "ticket23_slice248_per_room_cost_window_v1") {
          throw new Error("SLICE248_COST_WINDOW_INVALID");
        }
        costWindowLedger = parsed;
      } catch (error) {
        process.stdout.write(`${JSON.stringify({
          event: "cost_window_reporting_warning",
          code: String(error?.message || "SLICE248_COST_WINDOW_UNREADABLE")
            .startsWith("SLICE248_") ? error.message
            : "SLICE248_COST_WINDOW_UNREADABLE",
          roomId: entry.roomId,
          matchExecutionBlocked: false,
        })}\n`);
      }
    }
    // Monetary ancestry is mandatory and independent of optional notice
    // configuration. Never silently reset paid costs when a window is absent.
    const ancestry = entry.versionedRulesFork
      ? resolveTicket23VersionedCostAncestryV1({
        targetDirectory: outputDirectory,
        targetRoomId: entry.roomId,
        sourceRoomId: entry.versionedRulesFork.sourceRoomId,
        rooms: costWindowLedger?.rooms || {},
      }) : null;
    sourceCostAtVersionedForkCnyMicros = Math.round(
      (ancestry?.inheritedCostCny || 0) * 1_000_000);
    costStreamRootRoomId = ancestry?.rootRoomId || entry.roomId;
    const roomWindow = ancestry?.roomWindow
      || Object.values(costWindowLedger?.rooms || {}).find((room) =>
        room?.roomId === entry.roomId);
    if (roomWindow) {
      const baseline = roomWindow.baselineEstimatedCostCny;
      const nextNotice = noticeArgument
        ? noticeStepCnyMicros / 1_000_000 : roomWindow.nextIncrementalNoticeCny;
      if (Number.isFinite(baseline) && baseline >= 0
        && Number.isFinite(nextNotice) && nextNotice > 0) {
        costWindowBaselineCnyMicros = Math.round(baseline * 1_000_000);
        nextCostNotificationCnyMicros = costWindowBaselineCnyMicros
          + Math.round(nextNotice * 1_000_000);
      } else process.stdout.write(`${JSON.stringify({
        event: "cost_window_reporting_warning", code: "SLICE248_COST_WINDOW_INVALID",
        roomId: entry.roomId, matchExecutionBlocked: false,
        inheritedCostPreserved: true,
      })}\n`);
    }
    await mkdir(path.join(outputDirectory, "screenshots"), {
      recursive: true, mode: 0o700,
    });
    if (entry.fork && actions.length === 0) {
      const sourceRows = (await readFile(path.join(forkSourceDirectory,
        "actions.ndjson"), "utf8")).split(/\n/u).filter(Boolean)
        .map((line) => JSON.parse(line)).filter((row) =>
          Number(row.postStateRevision) <= forkThroughRevision);
      const transitionByRevision = new Map(entry.fork.replayedTransitions.map(
        (transition) => [Number(transition.sourceStateRevision), transition]));
      for (const row of sourceRows) {
        const transition = transitionByRevision.get(
          Number(row.postStateRevision));
        if (!transition) continue;
        let screenshot = null;
        if (row.screenshot) {
          const sourceScreenshot = path.join(forkSourceDirectory,
            row.screenshot);
          if (existsSync(sourceScreenshot)) {
            screenshotCount += 1;
            screenshot = `screenshots/${String(screenshotCount).padStart(
              4, "0")}-fork-r${String(row.postStateRevision).padStart(
              3, "0")}-${path.basename(row.screenshot)}`;
            await copyFile(sourceScreenshot, path.join(outputDirectory,
              screenshot));
          }
        }
        actions.push({
          ...row,
          index: actions.length + 1,
          receiptHash: transition.branchJournalHash,
          postStateRevision: transition.branchStateRevision,
          postStateHash: transition.branchStateHash,
          screenshot,
          screenshotObservedStateRevision: transition.branchStateRevision,
          historicalUiReconstructionRequired: false,
          providerCalls: 0,
          providerInputUnits: 0,
          providerOutputUnits: 0,
          matchEstimatedCostCnyMicros: 0,
          forkPrefix: true,
          sourceReceiptHash: transition.sourceJournalHash,
          replayedWithoutProvider: true,
          eligibleForTraining: false,
          trainingTruth: false,
        });
      }
      await writeFile(path.join(outputDirectory, "actions.ndjson"),
        actions.map((row) => JSON.stringify(row)).join("\n") + "\n", {
          encoding: "utf8", mode: 0o644,
        });
    }
    if (entry.resumed) {
      const actionPath = path.join(outputDirectory, "actions.ndjson");
      if (existsSync(actionPath)) {
        actions.push(...(await readFile(actionPath, "utf8")).split(/\n/u)
          .filter(Boolean).map((line) => JSON.parse(line)));
      }
      const files = await readdir(path.join(outputDirectory, "screenshots"));
      screenshotCount = files.reduce((maximum, filename) => Math.max(maximum,
        Number(/^(\d{4})-/u.exec(filename)?.[1] || 0)), 0);
    }
    browser = await chromium.launch({
      headless: true,
      ...(existsSync("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
        ? { executablePath:
          "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" }
        : {}),
    });
    const context = await browser.newContext({
      viewport: { width: 1500, height: 1050 },
      locale: "zh-CN", reducedMotion: "reduce",
      ...(reconcileOnly ? { serviceWorkers: "block" } : {}),
    });
    page = await context.newPage();
    const blockedMutationRequests = [];
    if (reconcileOnly) {
      await page.route("**/*", (route) => {
        const request = route.request();
        if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) {
          blockedMutationRequests.push({ method: request.method(),
            pathname: new URL(request.url()).pathname });
          return route.abort("blockedbyclient");
        }
        return route.continue();
      });
    }
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (url.origin !== entry.origin || !["fetch", "xhr"].includes(
        request.resourceType())) return;
      pendingBrowserReads.set(request, { method: request.method(),
        pathname: url.pathname, startedAt: new Date().toISOString(),
        started: performance.now() });
    });
    page.on("response", (response) => {
      const row = pendingBrowserReads.get(response.request());
      if (row) row.status = response.status();
    });
    const finishBrowserRead = (request, failed = false) => {
      const row = pendingBrowserReads.get(request);
      if (!row) return;
      const { started, ...publicRow } = row;
      browserReads.push({ ...publicRow,
        elapsedMs: Math.round(performance.now() - started),
        ...(failed ? { failure: request.failure()?.errorText || "failed" } : {}) });
      if (browserReads.length > 64) browserReads.shift();
      pendingBrowserReads.delete(request);
    };
    page.on("requestfinished", (request) => finishBrowserRead(request));
    page.on("requestfailed", (request) => finishBrowserRead(request, true));
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(sanitize(message.text()));
    });
    page.on("pageerror", (error) => pageErrors.push(sanitize(error.message)));
    await page.goto(entry.url, { waitUntil: "networkidle", timeout: 60_000 });
    await page.getByText(/已连接权威房间|Authoritative room connected/u)
      .first().waitFor({ state: "attached", timeout: 60_000 });
    await enterBattle();
    let current = await manifest(60_000, {
      allowExistingRetryableFinding: entry.resumed === true,
    });
    ensure(!attachedEntryFile || current.room?.roomId === entry.roomId,
      "SLICE248_ATTACHED_HOST_ROOM_MISMATCH");
    ensure(current.coverage?.engagementScale === "Standard",
      "SLICE248_NOT_STANDARD_SCALE");
    ensure(current.coverage?.mineralSpentBySide?.player1 === 2000
      && current.coverage?.mineralSpentBySide?.player2 === 2000,
    "SLICE248_NOT_2000_POINT_ARMIES");
    // Unit count belongs to the admitted rosters. The fixed pair has 15,
    // while an Agent-selected exact-2000 roster can have a different count.
    ensure(Number.isSafeInteger(current.coverage?.selectedUnitCount)
      && current.coverage.selectedUnitCount >= 2
      && Number(current.coverage?.terrainPieceCount) > 0
      && current.coverage.terrainPieceCount
        === current.map?.rulesTerrainPieceCount,
    "SLICE248_ROOM_CONTENT_DENOMINATOR_MISMATCH");
    ensure(current.map?.mapSeedId === current.coverage?.mapSeedId
      && current.map?.mapRoomFreezeHash
      && current.map?.missionSpatialReachabilityAuditHash
      && current.map.mapRoomFreezeHash
        === current.map.roomFreezeSummary?.roomFreezeHash
      && current.map.missionSpatialReachabilityAuditHash
        === current.map.roomFreezeSummary?.missionSpatialReachabilityAuditHash
      && current.map.roomFreezeSummary?.everyEntrySegmentUsable === true,
    "SLICE248_CERTIFIED_MAP_FREEZE_MISSING", { map: current.map });
    ensure(current.isolation?.independentBotStores === true
      && current.isolation?.independentMatchDecisionJournals === true
      && current.isolation?.independentProviderAttemptAndDecisionStores === true,
    "SLICE248_SEAT_ISOLATION_NOT_PROVEN", { isolation: current.isolation });
    ensure(current.promptPackBySeat?.player1 === "selfplay_agent_prompt"
      && current.promptPackBySeat?.player2 === "selfplay_agent_prompt",
    "SLICE248_SELFPLAY_PROMPT_ROUTE_MISSING");
    ensure(current.orchestrator?.experimentCell?.experimentId
      === "ticket23-standard-2000-agent-agent-live-v1"
      && current.orchestrator?.experimentCell?.scenario?.mapId
        === current.map?.mapSeedId
      && Object.values(current.orchestrator?.experimentCell?.scenario
        ?.rosterIdsBySeat || {}).every((value) => /^[a-f0-9]{64}$/u.test(value)),
    "SLICE248_FORMAL_EXPERIMENT_METADATA_MISMATCH", {
      experimentCell: current.orchestrator?.experimentCell || null,
    });
    ensure(!reconcileOnly || (!["running", "pausing"].includes(
      current.autoDrive?.status) && !["queued", "running"].includes(
      current.driveJob?.status)), "SLICE248_RECONCILE_REQUIRES_IDLE_HOST");
    const recordedActionCountBeforeReconcile = actions.length;
    await capture("room", "connected", current.room?.stateRevision ?? 0,
      "initial");
    await recordUnseen(current);
    if (reconcileOnly) {
      const after = await manifest();
      const authorityUnchanged = ["roomId", "stateRevision", "stateHash",
        "journalHeadHash", "acceptedReceiptCount"].every((key) =>
        after.room?.[key] === current.room?.[key]);
      ensure(authorityUnchanged
        && JSON.stringify(after.usage) === JSON.stringify(current.usage),
      "SLICE248_RECONCILE_CHANGED_AUTHORITY_OR_USAGE");
      ensure(actions.length === Number(after.room?.acceptedReceiptCount)
        && new Set(actions.map((row) => row.receiptHash)).size === actions.length,
      "SLICE248_RECONCILE_RECEIPT_DENOMINATOR_MISMATCH");
      ensure(blockedMutationRequests.length === 0 && pageErrors.length === 0,
        "SLICE248_RECONCILE_BROWSER_WRITE_OR_PAGE_ERROR", {
          blockedMutationRequests, pageErrors,
        });
      const reconciliation = {
        schema: "ticket23_slice248_web_evidence_reconciliation_v1",
        ticket: 23, slice: 248, ok: true, roomId: entry.roomId,
        reconciledAt: new Date().toISOString(),
        stateRevision: after.room.stateRevision,
        stateHash: after.room.stateHash,
        journalHeadHash: after.room.journalHeadHash,
        previouslyRecordedActionCount: recordedActionCountBeforeReconcile,
        recordedActionCount: actions.length, screenshotCount,
        reconciledReceiptHashes: actions.slice(recordedActionCountBeforeReconcile)
          .map((row) => row.receiptHash),
        authorityUnchanged, providerUsageUnchanged: true,
        newAcceptedActions: 0, newProviderCalls: 0,
        browserWriteRequests: 0, matchContinued: false,
        terminal: after.state?.terminal === true || after.state?.gameOver === true,
        eligibleForTraining: false, trainingTruth: false,
      };
      await writeJsonAtomic(path.join(outputDirectory, "reconciliation.json"),
        reconciliation, 0o600);
      await progress("paused", { manifest: after, roomId: entry.roomId,
        reconciliation: "reconciliation.json", matchContinued: false });
      process.stdout.write(`${JSON.stringify(reconciliation)}\n`);
      return;
    }
    // A resumed run may have an authoritative action that predates this
    // runner's local NDJSON mirror. Reconcile first; only later actions are
    // "additional" for a checkpoint request.
    const initialRecordedActionCount = actions.length;
    await progress("running", { manifest: current, roomId: entry.roomId });
    const checkpointTargetActionCount = checkpointAfterAdditionalActions === null
      ? null : initialRecordedActionCount + checkpointAfterAdditionalActions;
    const requestedRoundInitialized = (manifestValue) => {
      if (checkpointAfterRoundInitialized === null
        || Number(manifestValue?.state?.round || 0)
          < checkpointAfterRoundInitialized
        || manifestValue?.state?.phase !== "movement") return false;
      const latest = manifestValue?.recentAcceptedTransitions?.at(-1)
        ?.receipt?.action;
      return latest?.actionType === "choose_first_actor";
    };
    const deadline = Date.now() + MATCH_TIMEOUT_MS;
    let completedDriveProgress = { stateRevision: Number(current.room?.stateRevision || 0),
      actionCount: actionCount(current), noProgressCompletions: 0 };
    while (Date.now() < deadline && actions.length < MAX_ACTIONS
      && (checkpointTargetActionCount === null
        || actions.length < checkpointTargetActionCount)
      && !requestedRoundInitialized(current)
      && !current.state?.terminal && !current.state?.gameOver) {
      const preActionScreenshot = await capture("room", "next-agent-decision",
        current.room?.stateRevision ?? actions.length, "before");
      const preActionReviewViews = await captureReviewViews("room",
        "next-agent-decision", current.room?.stateRevision ?? actions.length,
        "before");
      current = await driveOne(current, deadline);
      completedDriveProgress = advanceCompletedDriveProgressV1(completedDriveProgress, {
        stateRevision: Number(current.room?.stateRevision || 0),
        actionCount: actionCount(current),
        driveJob: current.driveJob,
      });
      await recordUnseen(current, {
        pageScreenshot: preActionScreenshot,
        ...preActionReviewViews,
      });
      await progress("running", { manifest: current, roomId: entry.roomId });
      if (completedDriveProgress.retryAfterMs > 0) {
        await sleep(completedDriveProgress.retryAfterMs);
      }
    }
    if ((checkpointTargetActionCount !== null
        && actions.length >= checkpointTargetActionCount)
      || requestedRoundInitialized(current)) {
      current = await manifest();
      const roundInitialized = requestedRoundInitialized(current);
      const checkpoint = {
        schema: "ticket23_slice248_agent_agent_web_checkpoint_v1",
        ok: true,
        ticket: 23,
        slice: 248,
        roomId: entry.roomId,
        actionCount: actions.length,
        additionalActionCount: checkpointAfterAdditionalActions,
        checkpointReason: roundInitialized
          ? "round_initialized" : "additional_action_count",
        requestedInitializedRound: checkpointAfterRoundInitialized,
        stateRevision: current.room?.stateRevision ?? null,
        round: current.state?.round ?? null,
        phase: current.state?.phase ?? null,
        activeSideKey: current.state?.activeSideKey ?? null,
        providerCalls: current.usage?.providerCalls || 0,
        totalUnits: current.usage?.totalUnits || 0,
        estimatedCostCny:
          Number(current.usage?.estimatedCostCnyMicros || 0) / 1_000_000,
        strategyEvidence: summarizeStrategyEvidence(actions),
        lastAction: actions.at(-1) || null,
        sourceRefreshPerformed: false,
        eligibleForTraining: false,
        trainingTruth: false,
      };
      await writeJsonAtomic(path.join(outputDirectory, "checkpoint.json"),
        checkpoint, 0o644);
      await progress("checkpoint", { manifest: current,
        roomId: entry.roomId, checkpoint: "checkpoint.json" });
      process.stdout.write(`${JSON.stringify({
        ok: true,
        ticket: 23,
        slice: 248,
        checkpoint: true,
        checkpointReason: roundInitialized
          ? "round_initialized" : "additional_action_count",
        actionCount: actions.length,
        stateRevision: current.room?.stateRevision ?? null,
        providerCalls: current.usage?.providerCalls || 0,
        totalUnits: current.usage?.totalUnits || 0,
        estimatedCostCny:
          Number(current.usage?.estimatedCostCnyMicros || 0) / 1_000_000,
        strategyEvidence: summarizeStrategyEvidence(actions),
        checkpointPath: path.relative(ROOT,
          path.join(outputDirectory, "checkpoint.json")),
      }, null, 2)}\n`);
      return;
    }
    ensure(Date.now() < deadline, "SLICE248_MATCH_TIMEOUT");
    ensure(actions.length < MAX_ACTIONS, "SLICE248_ACTION_LIMIT_REACHED");
    current = await manifest();
    ensure(current.state?.terminal === true || current.state?.gameOver === true,
      "SLICE248_MATCH_NOT_TERMINAL", { state: current.state });
    await refreshObservedRoom();
    const finalScreenshot = await capture("room", "terminal",
      current.room?.stateRevision ?? actions.length, "final");
    const seatActionCounts = Object.fromEntries(SEATS.map((seatKey) => [seatKey,
      Number(botProjection(current, seatKey).actionCount || 0)]));
    ensure(seatActionCounts.player1 + seatActionCounts.player2 === actions.length,
      "SLICE248_ACTION_DENOMINATOR_MISMATCH", {
        seatActionCounts, recorded: actions.length,
      });
    const strategyEvidence = summarizeStrategyEvidence(actions);
    const { formationEvidence, decisionMaterialCoverage } = strategyEvidence;
    const perSeatUsage = Object.fromEntries(SEATS.map((seatKey) => [seatKey,
      current.providers?.[seatKey]?.usage || {}]));
    ensure(current.evolutionExport?.terminal === true
      && current.evolutionExport?.deterministicReplayMatchesCurrent === true
      && current.evolutionExport?.governance?.criticalHighFindings === 0
      && current.evolutionExport?.formats?.ndjson === true
      && current.evolutionExport?.formats?.muzero === true
      && current.evolutionExport?.formats?.rlds === true
      && current.evolutionExport?.postgameReviewEpisodeReady === true
      && current.evolutionExport?.postgameReviewDecisionCount
        === current.evolutionExport?.stepCount,
    "SLICE263_TERMINAL_EVOLUTION_EXPORT_MISSING", {
      evolutionExport: current.evolutionExport || null,
    });
    const report = {
      schema: "ticket23_slice248_agent_agent_web_report_v1",
      ok: true, ticket: 23, slice: 248,
      roomId: entry.roomId,
      startedAt,
      completedAt: new Date().toISOString(),
      acceptance: {
        engagementScale: current.coverage.engagementScale,
        mineralSpentBySide: current.coverage.mineralSpentBySide,
        vespeneSpentBySide: current.coverage.vespeneSpentBySide,
        unitCount: current.coverage.selectedUnitCount,
        terrainPieceCount: current.coverage.terrainPieceCount,
        currentProductAbilityExactCount:
          current.coverage.currentProductAbilityExactCount,
        currentProductAbilityPendingCount:
          current.coverage.currentProductAbilityPendingCount,
        terminal: true,
        terminalRound: current.state.round,
        winner: current.state.winner,
        terminalReason: current.state.terminalReason,
        finalScores: current.state.scores,
        authoritativeActionCount: actions.length,
        actionsBySeat: seatActionCounts,
        screenshotCount,
        everyObservedApplyHasScreenshot: actions.every((entryValue) =>
          Boolean(entryValue.screenshot)),
        allAgentReplaysVerified: actions.every((entryValue) =>
          entryValue.replayMatchesCurrent === true),
        allActionsUseSelfplayPrompt: actions.every((entryValue) =>
          entryValue.promptPack === "selfplay_agent_prompt"),
        independentSeatStateAndMemory: current.isolation,
        naturalFormationCanaryCount: formationEvidence.agentSelectedCount,
        formationEvidence,
        decisionMaterialCoverage,
        finalScreenshot,
        map: current.map,
      },
      agents: {
        selectedModels: current.selectedModels,
        promptPackBySeat: current.promptPackBySeat,
        strategySkillRefsBySeat: current.strategySkillRefsBySeat,
        perSeatUsage,
        combinedUsage: {
          ...current.usage,
          estimatedCostCny:
            Number(current.usage?.estimatedCostCnyMicros || 0) / 1_000_000,
        },
        publicPlanAndReasonsCaptured: actions.every((entryValue) =>
          Boolean(entryValue.publicDecisionSummary)),
        hiddenChainOfThoughtStored: false,
      },
      findings: {
        criticalOrHigh: [],
        medium: [
          ...mediumFindings,
          ...(formationEvidence.agentSelectedCount ? [] : [{
            severity: "Medium",
            code: "SLICE262_NATURAL_FORMATION_CANARY_NOT_OBSERVED",
            strategyImpact:
              "slice248_can_complete_but_ticket25_slice262_acceptance_remains_open",
          }]),
          ...(decisionMaterialCoverage.queryCoverage.attack_probability
            .executedReceiptCount ? [] : [{
            severity: "Medium",
            code: "ATTACK_PROBABILITY_NOT_NATURALLY_USED",
            strategyImpact:
              "capability_available_but_new_match_contains_no_usage_evidence",
          }]),
          ...(decisionMaterialCoverage.queryCoverage.fire_zone_exchange
            .executedReceiptCount ? [] : [{
            severity: "Medium",
            code: "FIRE_ZONE_EXCHANGE_NOT_NATURALLY_USED",
            strategyImpact:
              "capability_available_but_new_match_contains_no_usage_evidence",
          }]),
          ...(decisionMaterialCoverage.predictionCalibration
            .availableToPlannerCount
            && !decisionMaterialCoverage.predictionCalibration
              .citedByPlannerCount ? [{
            severity: "Medium",
            code: "PREDICTION_CALIBRATION_AVAILABLE_BUT_NOT_CITED",
            strategyImpact:
              "planner_received_calibration_but_no_public_use_was_observed",
          }] : []),
        ],
        browserConsoleErrors: consoleErrors,
        browserPageErrors: pageErrors,
      },
      evolution: current.evolutionExport,
      sourceRefreshPerformed: false,
      eligibleForTraining: false,
      trainingTruth: false,
      actions,
    };
    ensure(pageErrors.length === 0, "SLICE248_BROWSER_PAGE_ERRORS", {
      pageErrors,
    });
    await writeJsonAtomic(path.join(outputDirectory, "report.json"), report,
      0o644);
    await progress("complete", { manifest: current,
      report: "report.json", finalScreenshot });
    process.stdout.write(`${JSON.stringify({
      ok: true, ticket: 23, slice: 248,
      roomId: entry.roomId,
      terminalRound: current.state.round,
      actionCount: actions.length,
      actionsBySeat: seatActionCounts,
      screenshotCount,
      providerCalls: current.usage.providerCalls,
      totalUnits: current.usage.totalUnits,
      estimatedCostCny:
        Number(current.usage.estimatedCostCnyMicros || 0) / 1_000_000,
      naturalFormationCanaryCount: formationEvidence.agentSelectedCount,
      reportPath: path.relative(ROOT,
        path.join(outputDirectory, "report.json")),
    }, null, 2)}\n`);
  } catch (error) {
    if (outputDirectory) {
      let failureScreenshot = null;
      let failureVisibleText = null;
      try {
        // The normal capture path waits for a healthy battlefield. A refresh
        // failure may leave the Room pane visible, so capture the actual page
        // directly instead of losing the failure evidence to that same wait.
        failureVisibleText = sanitize(await page.locator("body").innerText({
          timeout: 5_000,
        })).slice(0, 8_000);
        screenshotCount += 1;
        const filename = `screenshots/${String(screenshotCount).padStart(
          4, "0")}-runner-visible-failure.png`;
        await page.screenshot({ path: path.join(outputDirectory,
          filename), timeout: 10_000 });
        failureScreenshot = filename;
      } catch {}
      await writeJsonAtomic(path.join(outputDirectory, reconcileOnly
        ? "reconciliation-failure.json" : "failure.json"), {
        schema: "ticket23_slice248_agent_agent_web_failure_v1",
        ok: false, ticket: 23, slice: 248,
        code: String(error?.code || error?.name || "SLICE248_UNHANDLED_FAILURE"),
        message: sanitize(error?.message || error),
        details: Object.fromEntries(Object.entries(error || {}).filter(([key]) =>
          !new Set(["stack", "runnerToken", "credentials"]).has(key))),
        actionCount: actions.length,
        screenshotCount,
        failureScreenshot,
        failureVisibleText,
        observationTimings,
        browserReads,
        pendingBrowserReads: [...pendingBrowserReads.values()].map((row) => {
          const { started, ...publicRow } = row;
          return { ...publicRow,
            elapsedMs: Math.round(performance.now() - started) };
        }),
        serverStderr: sanitize(server?.stderr?.()),
        serverProcess: server?.processState || null,
        error: safeErrorDetails(error),
        lastManifest,
        consoleErrors,
        pageErrors,
        failedAt: new Date().toISOString(),
      }, 0o600);
      await progress(reconcileOnly ? "paused" : "failed", { manifest: lastManifest,
        ...(reconcileOnly
          ? { reconciliationFailureCode: String(error?.code || error?.name),
            matchContinued: false }
          : { failureCode: String(error?.code || error?.name) }),
        failureScreenshot });
    }
    throw error;
  } finally {
    try { await browser?.close(); } catch {}
    await stopServer(server?.child);
  }
}

main().catch((error) => {
  process.stderr.write(`${String(error?.stack || error)}\n`);
  process.exitCode = 1;
});
