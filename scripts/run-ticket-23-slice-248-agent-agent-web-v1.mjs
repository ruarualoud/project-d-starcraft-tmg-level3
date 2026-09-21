#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { appendFile, mkdir, readFile, readdir, rename, writeFile } from
  "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

import { readStarcraftTmgDurableAgentActionBoundaryV1 } from
  "../packages/online-agent-session/durable-agent-action-boundary-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SERVER = path.join(ROOT,
  "scripts/serve-ticket-23-slice-248-agent-agent-web-v1.mjs");
const MAX_ACTIONS = 180;
const MATCH_TIMEOUT_MS = 10 * 60 * 60_000;
const SEATS = Object.freeze(["player1", "player2"]);
const BLOCKING_SEVERITIES = new Set(["Critical", "High"]);

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

async function startServer(resumeDirectory = null) {
  const child = spawn(process.execPath, [SERVER,
    ...(resumeDirectory ? [
      `--resume-directory=${resumeDirectory}`,
      "--retry-provider-on-resume",
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
    const timeout = setTimeout(() => reject(Object.assign(
      new Error(`SLICE248_SERVER_START_TIMEOUT:${stderr}`),
      { code: "SLICE248_SERVER_START_TIMEOUT" },
    )), 180_000);
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

function durableActionBoundary(runDirectory, previous) {
  return readStarcraftTmgDurableAgentActionBoundaryV1({
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
  const resumeArgument = process.argv.find((entry) =>
    entry.startsWith("--resume-directory="));
  const resumeDirectory = resumeArgument
    ? path.resolve(resumeArgument.slice("--resume-directory=".length)) : null;
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
  const startedAt = new Date().toISOString();
  const actions = [];
  const mediumFindings = [];
  const consoleErrors = [];
  const pageErrors = [];
  let screenshotCount = 0;
  let nextCostNotificationCnyMicros = 100_000_000;
  let server = null;
  let browser = null;
  let page = null;
  let outputDirectory = null;
  let entry = null;
  let lastManifest = null;

  async function manifest(timeoutMs = 60_000) {
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
    lastManifest = result;
    const allFindings = findings(result);
    const blocking = allFindings.filter((finding) =>
      BLOCKING_SEVERITIES.has(String(finding.severity))
        && !finding.resolvedAt);
    ensure(!blocking.length, "SLICE248_CRITICAL_OR_HIGH_FINDING", { blocking });
    for (const finding of allFindings.filter((entryValue) =>
      String(entryValue.severity) === "Medium")) {
      if (!mediumFindings.some((entryValue) => JSON.stringify(entryValue)
        === JSON.stringify(finding))) mediumFindings.push(finding);
    }
    const cost = Number(result.usage?.estimatedCostCnyMicros || 0);
    while (cost >= nextCostNotificationCnyMicros) {
      process.stdout.write(`${JSON.stringify({
        event: "cost_notification",
        ticket: 23,
        slice: 248,
        thresholdCny: nextCostNotificationCnyMicros / 1_000_000,
        currentEstimatedCostCny: cost / 1_000_000,
      })}\n`);
      nextCostNotificationCnyMicros += 100_000_000;
    }
    ensure(cost <= 160_000_000, "SLICE248_AA_BUDGET_EXCEEDED", {
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
      round: manifestValue?.state?.round ?? null,
      phase: manifestValue?.state?.phase ?? null,
      updatedAt: new Date().toISOString(),
      ...other,
    }, 0o644);
  }

  async function enterBattle() {
    const button = page.getByRole("button", { name: /^(战桌|Battlefield)$/u });
    if (await button.count()) await button.click();
    await page.getByText(/权威战场|Authoritative Battlefield/u)
      .waitFor({ timeout: 30_000 });
  }

  async function refreshObservedRoom() {
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
      ).first().waitFor({ timeout: 60_000 });
    }
    await enterBattle();
  }

  async function capture(seatKey, actionType, revision, phase = "applied") {
    screenshotCount += 1;
    const filename = `${String(screenshotCount).padStart(4, "0")}-r${
      String(revision ?? "x").padStart(3, "0")}-${safeName(seatKey)}-${
      safeName(actionType)}-${safeName(phase)}.png`;
    await page.screenshot({
      path: path.join(outputDirectory, "screenshots", filename),
      fullPage: true,
    });
    return `screenshots/${filename}`;
  }

  async function recordUnseen(manifestValue) {
    const recorded = new Set(actions.map((entryValue) =>
      entryValue.receiptHash).filter(Boolean));
    const unseen = unseenTraces(manifestValue, recorded);
    if (!unseen.length) return 0;
    await refreshObservedRoom();
    for (const { seatKey, trace } of unseen) {
      const transition = (manifestValue.recentAcceptedTransitions || [])
        .find((entryValue) =>
          entryValue.journalHash === trace.applyReceiptHash) || null;
      const actionType = transition?.action?.actionType
        || trace.actionType || trace.candidateId || "agent-action";
      const screenshot = await capture(seatKey, actionType,
        trace.postStateRevision);
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
    await stopServer(server?.child);
    server = await startServer(outputDirectory);
    entry = server.entry;
    await page.goto(entry.url, { waitUntil: "networkidle", timeout: 60_000 });
    await page.getByText(/已连接权威房间|Authoritative room connected/u)
      .first().waitFor({ timeout: 60_000 });
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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    let result = null;
    let submissionTransportFailure = null;
    try {
      const response = await fetch(`${entry.origin}/__ticket23/a2a/drive`, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "x-ticket23-runner-token": entry.runnerToken,
        },
        body: JSON.stringify({ retry: false }),
        signal: controller.signal,
      });
      result = await response.json();
    } catch (error) {
      if (server?.processState?.exitObserved) throw error;
      // The server queues the durable job before flushing its 202 response.
      // A transport timeout therefore leaves acceptance unknown; observing the
      // existing job/SQLite boundary is safe, submitting another job is not.
      submissionTransportFailure = safeErrorDetails(error);
    } finally {
      clearTimeout(timeout);
    }
    if (result) ensure(result?.ok === true && result?.job?.jobId,
      "SLICE248_ASYNC_DRIVE_NOT_ACCEPTED", { result });
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
    server = await startServer(resumeDirectory);
    entry = server.entry;
    outputDirectory = path.resolve(entry.dataDirectory);
    await mkdir(path.join(outputDirectory, "screenshots"), {
      recursive: true, mode: 0o700,
    });
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
    });
    page = await context.newPage();
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(sanitize(message.text()));
    });
    page.on("pageerror", (error) => pageErrors.push(sanitize(error.message)));
    await page.goto(entry.url, { waitUntil: "networkidle", timeout: 60_000 });
    await page.getByText(/已连接权威房间|Authoritative room connected/u)
      .first().waitFor({ timeout: 60_000 });
    await enterBattle();
    let current = await manifest();
    ensure(current.coverage?.engagementScale === "Standard",
      "SLICE248_NOT_STANDARD_SCALE");
    ensure(current.coverage?.mineralSpentBySide?.player1 === 2000
      && current.coverage?.mineralSpentBySide?.player2 === 2000,
    "SLICE248_NOT_2000_POINT_ARMIES");
    ensure(current.coverage?.selectedUnitCount === 15
      && current.coverage?.terrainPieceCount === 9,
    "SLICE248_ROOM_CONTENT_DENOMINATOR_MISMATCH");
    ensure(current.map?.mapSeedId === "sc1_lost_temple_v1"
      && current.map?.mapRoomFreezeHash
      && current.map?.missionSpatialReachabilityAuditHash,
    "SLICE248_CERTIFIED_MAP_FREEZE_MISSING", { map: current.map });
    ensure(current.isolation?.independentBotStores === true
      && current.isolation?.independentMatchDecisionJournals === true
      && current.isolation?.independentProviderAttemptAndDecisionStores === true,
    "SLICE248_SEAT_ISOLATION_NOT_PROVEN", { isolation: current.isolation });
    ensure(current.promptPackBySeat?.player1 === "selfplay_agent_prompt"
      && current.promptPackBySeat?.player2 === "selfplay_agent_prompt",
    "SLICE248_SELFPLAY_PROMPT_ROUTE_MISSING");
    ensure(current.selectedModels?.player1 === current.selectedModels?.player2,
      "SLICE248_MODEL_PARITY_MISSING");
    ensure(current.orchestrator?.experimentCell?.experimentId
      === "ticket23-standard-2000-agent-agent-live-v1"
      && current.orchestrator?.experimentCell?.scenario?.mapId
        === "sc1_lost_temple_v1"
      && Object.values(current.orchestrator?.experimentCell?.scenario
        ?.rosterIdsBySeat || {}).every((value) => /^[a-f0-9]{64}$/u.test(value)),
    "SLICE248_FORMAL_EXPERIMENT_METADATA_MISMATCH", {
      experimentCell: current.orchestrator?.experimentCell || null,
    });
    await capture("room", "connected", current.room?.stateRevision ?? 0,
      "initial");
    await recordUnseen(current);
    await progress("running", { manifest: current, roomId: entry.roomId });
    const checkpointTargetActionCount = checkpointAfterAdditionalActions === null
      ? null : actions.length + checkpointAfterAdditionalActions;
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
    while (Date.now() < deadline && actions.length < MAX_ACTIONS
      && (checkpointTargetActionCount === null
        || actions.length < checkpointTargetActionCount)
      && !requestedRoundInitialized(current)
      && !current.state?.terminal && !current.state?.gameOver) {
      current = await driveOne(current, deadline);
      await recordUnseen(current);
      await progress("running", { manifest: current, roomId: entry.roomId });
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
    const naturalFormationActions = actions.filter((entryValue) =>
      entryValue.formationSelection?.selectedOptionId
        || entryValue.formationSelection?.optionId
        || entryValue.formationSelection?.formationOptionId);
    const perSeatUsage = Object.fromEntries(SEATS.map((seatKey) => [seatKey,
      current.providers?.[seatKey]?.usage || {}]));
    ensure(current.evolutionExport?.terminal === true
      && current.evolutionExport?.deterministicReplayMatchesCurrent === true
      && current.evolutionExport?.governance?.criticalHighFindings === 0
      && current.evolutionExport?.formats?.ndjson === true
      && current.evolutionExport?.formats?.muzero === true
      && current.evolutionExport?.formats?.rlds === true,
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
        naturalFormationCanaryCount: naturalFormationActions.length,
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
          ...(naturalFormationActions.length ? [] : [{
            severity: "Medium",
            code: "SLICE262_NATURAL_FORMATION_CANARY_NOT_OBSERVED",
            strategyImpact:
              "slice248_can_complete_but_ticket25_slice262_acceptance_remains_open",
          }]),
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
      naturalFormationCanaryCount: naturalFormationActions.length,
      reportPath: path.relative(ROOT,
        path.join(outputDirectory, "report.json")),
    }, null, 2)}\n`);
  } catch (error) {
    if (outputDirectory) {
      let failureScreenshot = null;
      try {
        failureScreenshot = await capture("runner",
          error?.code || "failure", actions.length, "failure");
      } catch {}
      await writeJsonAtomic(path.join(outputDirectory, "failure.json"), {
        schema: "ticket23_slice248_agent_agent_web_failure_v1",
        ok: false, ticket: 23, slice: 248,
        code: String(error?.code || error?.name || "SLICE248_UNHANDLED_FAILURE"),
        message: sanitize(error?.message || error),
        details: Object.fromEntries(Object.entries(error || {}).filter(([key]) =>
          !new Set(["stack", "runnerToken", "credentials"]).has(key))),
        actionCount: actions.length,
        screenshotCount,
        failureScreenshot,
        serverStderr: sanitize(server?.stderr?.()),
        serverProcess: server?.processState || null,
        error: safeErrorDetails(error),
        lastManifest,
        consoleErrors,
        pageErrors,
        failedAt: new Date().toISOString(),
      }, 0o600);
      await progress("failed", { manifest: lastManifest,
        failureCode: String(error?.code || error?.name), failureScreenshot });
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
