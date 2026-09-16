#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { appendFile, mkdir, readFile, readdir, rename, writeFile } from
  "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SERVER = path.join(ROOT, "scripts/serve-ticket-20-human-agent-web-v1.mjs");
const EVIDENCE_TICKET = Number(
  process.env.STARCRAFT_TMG_EVIDENCE_TICKET || 23);
const EVIDENCE_SLICE = Number(
  process.env.STARCRAFT_TMG_EVIDENCE_SLICE || 247);
const EVIDENCE_PROFILE = String(
  process.env.STARCRAFT_TMG_EVIDENCE_PROFILE || "ticket23-slice247");
const COST_BASELINE_CNY = 63.543093;
const MAX_ACTIONS = 180;
const PROVIDER_ACTION_TIMEOUT_MS = 6 * 60_000;
const MATCH_TIMEOUT_MS = 6 * 60 * 60_000;
const REPLAY_UI_TIMEOUT_MS = 120_000;
const MAX_TRANSIENT_BOT_DRIVE_ATTEMPTS = 3;
const MAX_CONSECUTIVE_BROWSER_SURFACE_RECOVERIES = 3;
const MAX_ZERO_USAGE_PROVIDER_NETWORK_ATTEMPTS = 12;
const ZERO_USAGE_PROVIDER_NETWORK_REASONS = new Set([
  "provider_dns_resolution_failed",
  "provider_connection_failed",
  "provider_transport_failed",
]);
const TRANSIENT_PROVIDER_FAILURE_REASONS = new Set([
  ...ZERO_USAGE_PROVIDER_NETWORK_REASONS,
  "provider_aborted",
]);
const HIGH_SEVERITIES = new Set(["Critical", "High"]);
const RECOVERABLE_UI_DISPATCH_FAILURES = new Set([
  "SLICE247_UI_NOT_FOREGROUND",
  "SLICE247_LEGAL_SPACE_REQUEST_NOT_DISPATCHED",
  "SLICE247_PREVIEW_REQUEST_NOT_DISPATCHED",
  "SLICE247_APPLY_REQUEST_NOT_DISPATCHED",
]);
const HUMAN_ACTION_PRIORITY = [
  "resolve_mission_start_of_round",
  "determine_current_product_mission_marker_control",
  "score_mission",
  "check_mission_end_game",
  "resolve_current_product_end_of_round_effects",
  "resolve_current_product_cleanup_refresh",
  "resolve_current_product_next_round_initiative",
  "choose_first_actor",
  "pass",
];

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

function actionLabel(action = {}) {
  const explicitChoice = action.chosenFirstActorSideKey
    ?? action.choiceId ?? action.cardName ?? action.abilityName;
  return [action.actionType || "action", action.pieceId,
    action.targetId ?? action.target?.id, explicitChoice]
    .filter(Boolean).join(" · ");
}

function sanitizeServerText(value) {
  return String(value || "")
    .replace(/\b(?:sk|jsk)-[A-Za-z0-9_-]{12,}/gu, "[REDACTED_API_KEY]")
    .replace(/Bearer\s+[^\s]+/giu, "Bearer [REDACTED]")
    .slice(-20_000);
}

async function writeJsonAtomic(filename, value, mode = 0o600) {
  const temporary = `${filename}.next`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8", mode,
  });
  await rename(temporary, filename);
}

async function startServer(resumeDirectory = null) {
  const child = spawn(process.execPath, [SERVER, "--live",
    `--evidence-profile=${EVIDENCE_PROFILE}`,
    ...(resumeDirectory ? [
      `--resume-directory=${resumeDirectory}`,
      "--retry-provider-on-resume",
    ] : [])], {
    cwd: ROOT,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stderr = "";
  child.stderr.on("data", (chunk) => { stderr += sanitizeServerText(chunk); });
  const lines = readline.createInterface({ input: child.stdout });
  const entry = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(Object.assign(
        new Error(`SLICE247_LIVE_SERVER_START_TIMEOUT:${stderr}`),
        { code: "SLICE247_LIVE_SERVER_START_TIMEOUT" },
      )), 180_000);
      const finish = (callback) => (value) => {
        clearTimeout(timeout);
        callback(value);
      };
      lines.on("line", (line) => {
        try {
          const parsed = JSON.parse(line);
          if (parsed.liveMode === true && parsed.origin
            && parsed.liveDataDirectory) {
            finish(resolve)(parsed);
          }
        } catch {}
      });
      child.once("exit", finish((code) => reject(Object.assign(
        new Error(`SLICE247_LIVE_SERVER_EXITED:${code}:${stderr}`),
        { code: "SLICE247_LIVE_SERVER_EXITED" },
      ))));
      child.once("error", finish(reject));
    });
  lines.close();
  return { child, entry, stderr: () => stderr };
}

async function stopServer(child) {
  if (!child || child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    sleep(5_000),
  ]);
  if (child.exitCode === null) child.kill("SIGKILL");
}

function activeModels(piece) {
  return (piece?.models || []).filter((model) =>
    model?.isOnField !== false && model?.isDestroyed !== true);
}

function formationOffsets(profiles, entrySide) {
  const xStep = Math.max(...profiles.map((entry) =>
    Number(entry.baseWidthMilliInches || entry.widthMilliInches || 0)));
  const yStep = Math.max(...profiles.map((entry) =>
    Number(entry.baseDepthMilliInches || entry.depthMilliInches || 0)));
  ensure(xStep > 0 && yStep > 0, "SLICE247_DEPLOY_BASE_PROFILE_MISSING");
  const points = [{ x: 0, y: 0 }];
  for (let ring = 1; points.length < profiles.length; ring += 1) {
    for (let y = -ring; y <= ring; y += 1) {
      for (let x = -ring; x <= ring; x += 1) {
        if (Math.max(Math.abs(x), Math.abs(y)) === ring) {
          points.push({ x: x * xStep, y: y * yStep });
        }
      }
    }
  }
  const compact = points.sort((left, right) =>
    Math.hypot(left.x, left.y) - Math.hypot(right.x, right.y)
      || left.y - right.y || left.x - right.x).slice(0, profiles.length);
  if (entrySide === "bottom") {
    return compact.map(({ x, y }) => ({ x, y: -y }));
  }
  if (entrySide === "left") {
    return compact.map(({ x, y }) => ({ x: -y, y: x }));
  }
  if (entrySide === "right") {
    return compact.map(({ x, y }) => ({ x: y, y: x }));
  }
  return compact;
}

function axisSamples(minimum, maximum, step = 250) {
  if (minimum > maximum) return [];
  const values = [];
  for (let value = Math.ceil(minimum / step) * step;
    value <= maximum; value += step) values.push(value);
  for (const value of [minimum, maximum, Math.round((minimum + maximum) / 2)]) {
    if (value >= minimum && value <= maximum) values.push(value);
  }
  return [...new Set(values)].sort((left, right) => left - right);
}

function domainSource(domain) {
  return domain.sourceDomain || domain;
}

function deployParameters(domain, centerX, centerY) {
  const source = domainSource(domain);
  const profiles = source.constraints.modelProfiles;
  const segment = source.constraints.entrySegments[0];
  const offsets = formationOffsets(profiles, segment.side);
  const rows = profiles.map((profile, index) => ({
    modelId: profile.modelId,
    xMilliInches: centerX + offsets[index].x,
    yMilliInches: centerY + offsets[index].y,
  }));
  return {
    leadingModelId: rows[0].modelId,
    entrySegmentId: segment.segmentId,
    entryAlongEdgeMilliInches: new Set(["top", "bottom"]).has(segment.side)
      ? centerX : centerY,
    path: [rows[0]],
    placements: rows.slice(1),
  };
}

function deployCentres(domain) {
  const source = domainSource(domain);
  const constraints = source.constraints;
  const profiles = constraints.modelProfiles;
  const segment = constraints.entrySegments[0];
  const offsets = formationOffsets(profiles, segment.side);
  const halfWidths = profiles.map((entry) => Math.round(Number(
    entry.baseWidthMilliInches || entry.widthMilliInches) / 2));
  const halfDepths = profiles.map((entry) => Math.round(Number(
    entry.baseDepthMilliInches || entry.depthMilliInches) / 2));
  let minimumX = Math.max(...offsets.map((entry, index) =>
    halfWidths[index] - entry.x));
  let maximumX = Number(constraints.battlefieldWidthMilliInches)
    - Math.max(...offsets.map((entry, index) =>
      entry.x + halfWidths[index]));
  let minimumY = Math.max(...offsets.map((entry, index) =>
    halfDepths[index] - entry.y));
  let maximumY = Number(constraints.battlefieldHeightMilliInches)
    - Math.max(...offsets.map((entry, index) =>
      entry.y + halfDepths[index]));
  const segmentMinimum = Math.round(Number(segment.startInches) * 1000);
  const segmentMaximum = Math.round(Number(segment.endInches) * 1000);
  const maxDistance = Number(constraints.maxDistanceMilliInches);
  if (new Set(["top", "bottom"]).has(segment.side)) {
    minimumX = Math.max(minimumX, segmentMinimum + halfWidths[0]);
    maximumX = Math.min(maximumX, segmentMaximum - halfWidths[0]);
    if (segment.side === "bottom") {
      maximumY = Math.min(maximumY, -halfDepths[0] + maxDistance);
    } else {
      minimumY = Math.max(minimumY,
        Number(constraints.battlefieldHeightMilliInches) + halfDepths[0]
          - maxDistance);
    }
  } else {
    minimumY = Math.max(minimumY, segmentMinimum + halfDepths[0]);
    maximumY = Math.min(maximumY, segmentMaximum - halfDepths[0]);
    if (segment.side === "left") {
      maximumX = Math.min(maximumX, -halfWidths[0] + maxDistance);
    } else {
      minimumX = Math.max(minimumX,
        Number(constraints.battlefieldWidthMilliInches) + halfWidths[0]
          - maxDistance);
    }
  }
  const xs = axisSamples(minimumX, maximumX);
  const ys = axisSamples(minimumY, maximumY);
  const orderedY = segment.side === "top" ? [...ys].reverse() : ys;
  const orderedX = segment.side === "right" ? [...xs].reverse() : xs;
  return new Set(["top", "bottom"]).has(segment.side)
    ? orderedY.flatMap((centerY) => xs.map((centerX) => ({ centerX, centerY })))
    : orderedX.flatMap((centerX) => ys.map((centerY) => ({ centerX, centerY })));
}

function laneClearance(state, domain, centre) {
  const side = domainSource(domain).constraints.entrySegments[0].side;
  const horizontal = new Set(["top", "bottom"]).has(side);
  const blockers = (state?.pieces || []).filter((piece) =>
    piece.id !== domain.pieceId && piece.isOnField === true
      && piece.isDestroyed !== true).flatMap(activeModels);
  if (!blockers.length) return Number.MAX_SAFE_INTEGER;
  const along = horizontal ? centre.centerX : centre.centerY;
  return Math.min(...blockers.map((model) => Math.abs(along
    - Math.round(Number(horizontal ? model.xInches : model.yInches) * 1000))));
}

function criticalFindings(manifest) {
  const bot = manifest?.bot?.bot || manifest?.bot || {};
  return [
    ...(bot.issues || []),
    ...(manifest?.bot?.notificationIssues || []),
    ...(manifest?.provider?.issues || []),
  ].filter((entry) => HIGH_SEVERITIES.has(String(entry?.severity))
    && !entry?.resolvedAt);
}

function botActionCount(manifest) {
  const bot = manifest?.bot?.bot || manifest?.bot || {};
  return Number(bot.actionCount || 0);
}

function shouldDriveAgent(manifest) {
  const bot = manifest?.bot?.bot || manifest?.bot || {};
  const activeSideKey = manifest?.state?.activeSideKey ?? null;
  const driveStatus = String(bot.driveStatus || "");
  if (bot.recovery?.inflight === true
    || new Set(["waiting_provider", "preexecution_search_running",
      "previewing", "applying"]).has(driveStatus)) return true;
  if (activeSideKey === "player2") return true;
  if (activeSideKey === "player1") return false;

  const roomRevision = Number(manifest?.room?.stateRevision);
  const botObservedRevision = Number(bot.lastObservedStateRevision);
  const botAlreadyObservedCurrentRevision = Number.isSafeInteger(roomRevision)
    && Number.isSafeInteger(botObservedRevision)
    && botObservedRevision >= roomRevision;
  return driveStatus !== "waiting_for_other_seat"
    || !botAlreadyObservedCurrentRevision;
}

function isRoomProjectionResponse(response, roomId) {
  if (response.request().method() !== "GET") return false;
  try {
    const url = new URL(response.url());
    return url.pathname
      === `/starcraft-tmg-level3/api/v1/rooms/${encodeURIComponent(roomId)}`;
  } catch {
    return false;
  }
}

async function visibleCardForTitle(page, title) {
  const titles = page.getByText(title, { exact: true });
  for (let index = 0; index < await titles.count(); index += 1) {
    const candidate = titles.nth(index);
    if (await candidate.isVisible()) return candidate.locator("..");
  }
  throw Object.assign(new Error(`SLICE247_ACTION_CARD_MISSING:${title}`), {
    code: "SLICE247_ACTION_CARD_MISSING", title,
  });
}

async function main() {
  const startedAt = new Date().toISOString();
  const resumeArgument = process.argv.find((entryValue) =>
    entryValue.startsWith("--resume-directory="));
  const resumeDirectory = resumeArgument
    ? path.resolve(resumeArgument.slice("--resume-directory=".length)) : null;
  const matchDeadline = Date.now() + MATCH_TIMEOUT_MS;
  let server = null;
  let browser = null;
  let browserContext = null;
  let page = null;
  let entry = null;
  let outputDirectory = null;
  let currentProjection = null;
  let screenshotCount = 0;
  let actionCount = 0;
  let nextCostNotificationCnyMicros = 100_000_000;
  let lastManifest = null;
  const actions = [];
  const consoleErrors = [];
  const pageErrors = [];
  const mediumFindings = [];

  function browserLifecycleFailure(error) {
    const value = `${String(error?.code || "")} ${String(error?.message || "")}`
      + ` ${String(error?.cause || "")}`;
    return /Target page, context or browser has been closed|page\.evaluate:.*closed|browser has been closed|SLICE247_UI_NOT_FOREGROUND/iu
      .test(value);
  }

  function attachPageObservers(targetPage) {
    targetPage.on("console", (message) => {
      if (message.type() === "error"
        && !/WebSocket connection .*\/(?:hot|message).*404/u.test(message.text())) {
        consoleErrors.push(sanitizeServerText(message.text()));
      }
    });
    targetPage.on("pageerror", (error) => pageErrors.push(String(error.message)));
    targetPage.on("response", async (response) => {
      if (!isRoomProjectionResponse(response, entry.roomId)) return;
      try {
        const body = await response.json();
        if (body?.result?.projection) currentProjection = body.result.projection;
      } catch {}
    });
  }

  async function openBrowserSurface(reason) {
    try { await browserContext?.close(); } catch {}
    try { await browser?.close(); } catch {}
    const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    browser = await chromium.launch({
      headless: true,
      ...(existsSync(chromePath) ? { executablePath: chromePath } : {}),
    });
    browserContext = await browser.newContext({
      viewport: { width: 1500, height: 1050 },
      locale: "zh-CN",
      reducedMotion: "reduce",
    });
    page = await browserContext.newPage();
    attachPageObservers(page);
    await page.goto(entry.url, { waitUntil: "networkidle", timeout: 60_000 });
    await page.getByText(/已连接权威房间|Authoritative room connected/u)
      .waitFor({ timeout: 60_000 });
    await enterBattle();
    await refreshRoomProjection();
    return { reason, lifecycle: await browserLifecycleSnapshot() };
  }

  async function progress(status, extra = {}) {
    if (!outputDirectory) return;
    const manifestValue = extra.manifest || null;
    const extraFields = Object.fromEntries(Object.entries(extra)
      .filter(([key]) => key !== "manifest"));
    await writeJsonAtomic(path.join(outputDirectory, "progress.json"), {
      schema: `ticket${EVIDENCE_TICKET}_slice${EVIDENCE_SLICE}_human_agent_web_progress_v1`,
      ticket: EVIDENCE_TICKET,
      slice: EVIDENCE_SLICE,
      status,
      actionCount,
      screenshotCount,
      providerCalls: manifestValue?.providerCalls
        || manifestValue?.provider?.usage?.providerCalls || 0,
      estimatedCostCny: Number(
        manifestValue?.provider?.usage?.estimatedCostCnyMicros || 0) / 1_000_000,
      round: manifestValue?.state?.round ?? null,
      phase: manifestValue?.state?.phase ?? null,
      updatedAt: new Date().toISOString(),
      ...extraFields,
    }, 0o644);
  }

  async function manifest() {
    const result = await page.evaluate(async () => {
      const response = await fetch("/__ticket20/manifest", {
        headers: { accept: "application/json" }, cache: "no-store",
      });
      return response.json();
    });
    lastManifest = result;
    const blocking = criticalFindings(result);
    ensure(!blocking.length, "SLICE247_CRITICAL_OR_HIGH_FINDING", { blocking });
    const allMedium = [
      ...(result?.bot?.bot?.issues || []),
      ...(result?.bot?.notificationIssues || []),
      ...(result?.provider?.issues || []),
    ].filter((finding) => String(finding?.severity) === "Medium");
    for (const finding of allMedium) {
      if (!mediumFindings.some((entryValue) => JSON.stringify(entryValue)
        === JSON.stringify(finding))) mediumFindings.push(finding);
    }
    const cost = Number(result?.provider?.usage?.estimatedCostCnyMicros || 0);
    while (cost >= nextCostNotificationCnyMicros) {
      process.stdout.write(`${JSON.stringify({
        event: "cost_notification",
        thresholdCny: nextCostNotificationCnyMicros / 1_000_000,
        currentEstimatedCostCny: cost / 1_000_000,
      })}\n`);
      nextCostNotificationCnyMicros += 100_000_000;
    }
    return result;
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

  async function appendAction(record) {
    actions.push(record);
    actionCount = actions.length;
    await appendFile(path.join(outputDirectory, "actions.ndjson"),
      `${JSON.stringify(record)}\n`, { encoding: "utf8", mode: 0o644 });
  }

  async function waitForManifest(predicate, timeoutMs, code) {
    const deadline = Date.now() + timeoutMs;
    let latest = null;
    while (Date.now() < deadline) {
      latest = await manifest();
      if (predicate(latest)) return latest;
      await sleep(250);
    }
    throw Object.assign(new Error(code), { code, latest });
  }

  async function enterBattle() {
    await page.getByRole("button", { name: /^(战桌|Battlefield)$/u }).click();
    await page.getByText(/权威战场|Authoritative Battlefield/u)
      .waitFor({ timeout: 20_000 });
  }

  async function browserLifecycleSnapshot() {
    const base = {
      browserConnected: browser?.isConnected?.() === true,
      pagePresent: Boolean(page),
      pageClosed: page?.isClosed?.() ?? true,
    };
    if (!page || page.isClosed()) return {
      ...base,
      visibilityState: "closed",
      online: null,
      hasFocus: false,
      url: null,
    };
    try {
      return { ...base, ...(await page.evaluate(() => ({
        visibilityState: document.visibilityState,
        online: navigator.onLine !== false,
        hasFocus: document.hasFocus(),
        url: window.location.href,
      }))) };
    } catch (error) {
      return { ...base,
        visibilityState: "unavailable",
        online: null,
        hasFocus: false,
        url: null,
        snapshotError: sanitizeServerText(error?.message || error),
      };
    }
  }

  async function ensureOperationalForeground(reason) {
    await page.bringToFront();
    try {
      await page.waitForFunction(() =>
        document.visibilityState === "visible" && navigator.onLine !== false,
      undefined, { timeout: 10_000 });
      await page.getByText(
        /已连接权威房间|Authoritative room connected/u,
      ).first().waitFor({ timeout: 20_000 });
    } catch (error) {
      throw Object.assign(new Error("SLICE247_UI_NOT_FOREGROUND"), {
        code: "SLICE247_UI_NOT_FOREGROUND",
        reason,
        lifecycle: await browserLifecycleSnapshot(),
        cause: String(error?.message || error),
      });
    }
  }

  async function assertOperationalForeground(reason) {
    const lifecycle = await browserLifecycleSnapshot();
    ensure(lifecycle.visibilityState === "visible" && lifecycle.online,
      "SLICE247_UI_NOT_FOREGROUND", { reason, lifecycle });
    return lifecycle;
  }

  async function postThroughUi({ endpoint, click, requestTimeoutMs = 10_000,
    responseTimeoutMs = 30_000, requestFailureCode, responseFailureCode }) {
    await assertOperationalForeground(`before_${endpoint}`);
    const matches = (candidate) => candidate.method() === "POST"
      && candidate.url().endsWith(`/${endpoint}`);
    const requestObservation = page.waitForRequest(matches, {
      timeout: requestTimeoutMs,
    }).then((request) => ({ request }), (error) => ({ error }));
    const responseObservation = page.waitForResponse((response) =>
      matches(response.request()), { timeout: responseTimeoutMs })
      .then((response) => ({ response }), (error) => ({ error }));
    try {
      await click();
    } catch (error) {
      throw Object.assign(new Error(requestFailureCode), {
        code: requestFailureCode,
        endpoint,
        stage: "ui_click",
        lifecycle: await browserLifecycleSnapshot(),
        cause: String(error?.message || error),
      });
    }
    const requestResult = await requestObservation;
    if (!requestResult.request) {
      throw Object.assign(new Error(requestFailureCode), {
        code: requestFailureCode,
        endpoint,
        stage: "request_dispatch",
        lifecycle: await browserLifecycleSnapshot(),
        cause: String(requestResult.error?.message || requestResult.error),
      });
    }
    const responseResult = await responseObservation;
    if (!responseResult.response) {
      throw Object.assign(new Error(responseFailureCode), {
        code: responseFailureCode,
        endpoint,
        stage: "response_wait",
        lifecycle: await browserLifecycleSnapshot(),
        requestUrl: requestResult.request.url(),
        cause: String(responseResult.error?.message || responseResult.error),
      });
    }
    return responseResult.response;
  }

  async function refreshRoomProjection() {
    await page.getByRole("button", { name: /^(房间与规则|Room & rules)$/u })
      .click();
    const refresh = page.getByRole("button", { name: /刷新投影|Refresh projection/u });
    if (await refresh.isEnabled()) {
      const responsePromise = page.waitForResponse((response) =>
        isRoomProjectionResponse(response, entry.roomId), { timeout: 30_000 });
      await refresh.click();
      const body = await (await responsePromise).json();
      if (body?.result?.projection) currentProjection = body.result.projection;
    }
    await enterBattle();
  }

  async function verifyCurrentReplayThroughUi(expectedRevision) {
    await page.getByRole("button", { name: /^(行动|Actions)$/u }).click();
    await page.getByRole("button", {
      name: /^(裁判 \/ 重放|Referee \/ replay)$/u,
    }).click();
    const verify = page.getByRole("button", {
      name: /^(再次验证 Replay|Verify replay again)$/u,
    });
    await verify.waitFor({ state: "visible", timeout: 20_000 });
    await verify.click();
    await page.getByText(`verified revision: ${expectedRevision}`, {
      exact: true,
    }).waitFor({ timeout: REPLAY_UI_TIMEOUT_MS });
    ensure(/matches current:\s*true/iu.test(await page.locator("body").innerText()),
      "SLICE247_RECOVERY_REPLAY_NOT_VERIFIED", { expectedRevision });
  }

  async function recoverUnrecordedHumanTransition(manifestValue) {
    const lastRecordedRevision = actions.reduce((maximum, entryValue) =>
      Math.max(maximum, Number(entryValue.postStateRevision || 0)), 0);
    const currentRevision = Number(manifestValue?.room?.stateRevision || 0);
    if (currentRevision <= lastRecordedRevision) return false;
    const missing = (manifestValue.recentAcceptedTransitions || [])
      .filter((transition) =>
        Number(transition?.postStateRevision || 0) > lastRecordedRevision)
      .sort((left, right) => Number(left.postStateRevision)
        - Number(right.postStateRevision));
    const human = missing.filter((transition) =>
      transition?.action?.sideKey === "player1");
    if (!human.length) return false;
    // The runner stops on the first failed UI observation, so at most the
    // just-accepted human transition may be absent. Anything broader needs a
    // historical reconstruction workflow rather than invented evidence.
    ensure(missing.length === 1 && human.length === 1
      && Number(human[0].preStateRevision) === lastRecordedRevision
      && Number(human[0].postStateRevision) === currentRevision,
    "SLICE247_HUMAN_TRANSITION_RECOVERY_NOT_CONTIGUOUS", {
      lastRecordedRevision,
      currentRevision,
      missingRevisions: missing.map((transition) => ({
        sideKey: transition?.action?.sideKey || null,
        pre: transition?.preStateRevision ?? null,
        post: transition?.postStateRevision ?? null,
      })),
    });
    await verifyCurrentReplayThroughUi(currentRevision);
    const transition = human[0];
    const screenshot = await capture("player1",
      transition.action?.actionType || "recovered-action",
      currentRevision, "recovered");
    await appendAction({
      index: actions.length + 1,
      actor: "human",
      sideKey: "player1",
      round: manifestValue.state?.round ?? null,
      phase: transition.action?.phase || manifestValue.state?.phase || null,
      actionType: transition.action?.actionType || null,
      pieceId: transition.action?.pieceId || null,
      parameters: null,
      legalSpaceHash: transition.legalSpaceHash || null,
      receiptHash: transition.journalHash || null,
      postStateRevision: transition.postStateRevision,
      postStateHash: transition.postStateHash || null,
      replayMatchesCurrent: true,
      recoveredFromAcceptedTransition: true,
      screenshot,
      rulesAuthority: true,
      modelDecision: false,
      trainingTruth: false,
    });
    return true;
  }

  async function loadLegalSpace() {
    await page.getByRole("button", { name: /^(行动|Actions)$/u }).click();
    const button = page.getByRole("button", { name: "Load LegalSpace" });
    await button.waitFor({ state: "visible", timeout: 20_000 });
    const enabledDeadline = Date.now() + 20_000;
    while (!(await button.isEnabled()) && Date.now() < enabledDeadline) {
      await sleep(100);
    }
    ensure(await button.isEnabled(), "SLICE247_LOAD_LEGAL_SPACE_DISABLED");
    const response = await postThroughUi({
      endpoint: "legal-space",
      click: () => button.click(),
      requestFailureCode: "SLICE247_LEGAL_SPACE_REQUEST_NOT_DISPATCHED",
      responseFailureCode: "SLICE247_LEGAL_SPACE_RESPONSE_TIMEOUT",
    });
    const body = await response.json();
    ensure(body?.result?.ok === true && body.result.legalSpace,
      "SLICE247_WEB_LEGAL_SPACE_FAILED", { body });
    await page.getByText(
      `LegalSpace hash: ${body.result.legalSpace.legalSpaceHash}`,
      { exact: true },
    ).waitFor({ timeout: 20_000 });
    return body.result.legalSpace;
  }

  async function previewDirect(title) {
    const card = await visibleCardForTitle(page, title);
    const response = await postThroughUi({
      endpoint: "preview",
      click: () => card.getByRole("button", {
        name: /生成 Preview|^Preview$/u,
      }).click(),
      requestFailureCode: "SLICE247_PREVIEW_REQUEST_NOT_DISPATCHED",
      responseFailureCode: "SLICE247_PREVIEW_RESPONSE_TIMEOUT",
    });
    const body = await response.json();
    ensure(body?.result?.ok === true, "SLICE247_WEB_PREVIEW_FAILED", {
      title, rejection: body?.result,
    });
    await page.getByText(
      /^(?:密封 Preview，等待真人确认|Sealed Preview awaiting human confirmation)$/u,
    )
      .waitFor({ timeout: 20_000 });
  }

  async function fillCoordinate(point) {
    await page.getByLabel(/战场 X 坐标|Battlefield X coordinate/u)
      .fill(String(point.xMilliInches / 1000));
    await page.getByLabel(/战场 Y 坐标|Battlefield Y coordinate/u)
      .fill(String(point.yMilliInches / 1000));
    await page.getByRole("button", {
      name: /添加路径点|Add waypoint|放置下一模型|Place next model/u,
    }).click();
  }

  async function previewDeploy(domain, legalSpace) {
    const title = [domain.actionType, domain.pieceId].filter(Boolean).join(" · ");
    const source = domainSource(domain);
    ensure(source.parameterKind === "official_selected_roster_spatial_path_v1",
      "SLICE247_LIVE_DEPLOY_PARAMETER_KIND_UNEXPECTED", {
        parameterKind: source.parameterKind,
      });
    const candidates = deployCentres(domain).sort((left, right) =>
      laneClearance(currentProjection?.state, domain, right)
        - laneClearance(currentProjection?.state, domain, left)
        || left.centerY - right.centerY || left.centerX - right.centerX);
    const failures = [];
    let parameters = null;
    const parameterCandidates = candidates.map((centre) =>
      deployParameters(domain, centre.centerX, centre.centerY));
    for (let offset = 0; offset < parameterCandidates.length; offset += 64) {
      const batch = parameterCandidates.slice(offset, offset + 64);
      const response = await fetch(
        `${entry.origin}/__ticket23/rules-query/first-legal-parameterized`,
        {
          method: "POST",
          headers: {
            accept: "application/json",
            "content-type": "application/json",
            "x-ticket23-runner-token": entry.runnerRulesQueryToken,
          },
          body: JSON.stringify({
            authority: {
              roomId: legalSpace.roomId,
              matchBindingHash: legalSpace.matchBindingHash,
              stateRevision: legalSpace.stateRevision,
              stateHash: legalSpace.stateHash,
              legalSpaceHash: legalSpace.legalSpaceHash,
              seatKey: legalSpace.sideKey,
            },
            currentLegalSpaceDomain: domain,
            parameterCandidates: batch,
          }),
        },
      );
      const body = await response.json();
      ensure(response.ok && body?.ok === true && body.result,
        "SLICE247_RULES_QUERY_TRANSPORT_FAILED", { status: response.status });
      if (body.result.precision === "exact"
        && body.result.result?.proposalAccepted === true) {
        parameters = body.result.result.selectedParameters;
        break;
      }
      ensure(!HIGH_SEVERITIES.has(String(body.result.findingSeverity)),
        "SLICE247_RULES_QUERY_HIGH_FINDING", { finding: body.result });
      failures.push(...(body.result.failureCodes || [body.result.reason]));
    }
    ensure(parameters, "SLICE247_NO_RULES_LEGAL_DEPLOYMENT", {
      pieceId: domain.pieceId,
      attempted: candidates.length,
      failureCodes: [...new Set(failures)],
    });
    const card = await visibleCardForTitle(page, title);
    await card.getByRole("button", { name: /编辑参数|Edit parameters/u }).click();
    await page.getByRole("button", {
      name: parameters.leadingModelId, exact: true,
    }).click();
    const segment = source.constraints.entrySegments[0];
    await page.getByRole("button", {
      name: `${segment.side} · ${segment.startInches}–${segment.endInches} in`,
      exact: true,
    }).click();
    await page.getByLabel(/沿边进入坐标|Along-edge entry coordinate/u)
      .fill(String(parameters.entryAlongEdgeMilliInches / 1000));
    await fillCoordinate(parameters.path[0]);
    if (parameters.placements.length) {
      await page.getByRole("button", { name: /放置模式|Placement mode/u })
        .click();
      for (const placement of parameters.placements) await fillCoordinate(placement);
    }
    const response = await postThroughUi({
      endpoint: "preview",
      click: () => page.getByRole("button", {
        name: /提交权威 Preview|Request authoritative Preview/u,
      }).click(),
      requestFailureCode: "SLICE247_PREVIEW_REQUEST_NOT_DISPATCHED",
      responseFailureCode: "SLICE247_PREVIEW_RESPONSE_TIMEOUT",
    });
    const body = await response.json();
    ensure(body?.result?.ok === true, "SLICE247_RULES_WEB_PREVIEW_PARITY_FAILED", {
      pieceId: domain.pieceId,
      rejection: body?.result,
    });
    await page.getByText(
      /^(?:密封 Preview，等待真人确认|Sealed Preview awaiting human confirmation)$/u,
    ).waitFor({ timeout: 20_000 });
    return parameters;
  }

  async function applyHuman(selection, legalSpace, parameters = null) {
    const response = await postThroughUi({
      endpoint: "apply",
      click: () => page.getByRole("button", {
        name: /确认并应用|Confirm and apply/u,
      }).click(),
      responseTimeoutMs: 60_000,
      requestFailureCode: "SLICE247_APPLY_REQUEST_NOT_DISPATCHED",
      responseFailureCode: "SLICE247_APPLY_RESPONSE_TIMEOUT",
    });
    const body = await response.json();
    ensure(body?.result?.ok === true, "SLICE247_WEB_APPLY_FAILED", {
      selection, rejection: body?.result,
    });
    await page.getByText(
      /^(?:动作已应用，重放链与当前状态一致。|Action applied; replay chain matches current authority\.)$/u,
    ).waitFor({ timeout: 60_000 });
    await page.getByText(/收据与重放|Receipt & replay/u)
      .waitFor({ timeout: 60_000 });
    await page.getByText(
      `revision: ${body.result.receipt.preStateRevision} → ${
        body.result.receipt.postStateRevision}`,
      { exact: true },
    ).waitFor({ timeout: 20_000 });
    const verifiedRevisionText = page.getByText(
      /^verified revision: \d+$/u,
    );
    await verifiedRevisionText.waitFor({ timeout: REPLAY_UI_TIMEOUT_MS });
    const verifiedRevision = Number((await verifiedRevisionText.textContent())
      ?.match(/\d+$/u)?.[0]);
    ensure(Number.isSafeInteger(verifiedRevision)
      && verifiedRevision >= body.result.receipt.postStateRevision,
    "SLICE247_WEB_REPLAY_REVISION_PRECEDES_RECEIPT", {
      verifiedRevision,
      receiptRevision: body.result.receipt.postStateRevision,
    });
    ensure(/matches current:\s*true/iu.test(await page.locator("body").innerText()),
      "SLICE247_WEB_REPLAY_NOT_VERIFIED");
    currentProjection = body.result.envelope
      ? { ...currentProjection, state: body.result.envelope.state,
        matchBinding: body.result.envelope.matchBinding
          || currentProjection?.matchBinding,
        room: { ...(currentProjection?.room || {}),
          stateRevision: body.result.envelope.stateRevision,
          stateHash: body.result.envelope.stateHash } }
      : currentProjection;
    const revision = body.result.receipt?.postStateRevision
      ?? body.result.envelope?.stateRevision ?? null;
    const screenshot = await capture("player1", selection.actionType, revision);
    await appendAction({
      index: actions.length + 1,
      actor: "human",
      sideKey: "player1",
      round: currentProjection?.state?.round ?? null,
      phase: currentProjection?.state?.phase ?? null,
      actionType: selection.actionType,
      pieceId: selection.pieceId || null,
      parameters,
      legalSpaceHash: legalSpace.legalSpaceHash,
      receiptHash: body.result.receipt?.journalHash || null,
      postStateRevision: revision,
      postStateHash: body.result.receipt?.postStateHash
        || body.result.envelope?.stateHash || null,
      replayMatchesCurrent: true,
      screenshot,
      rulesAuthority: true,
      modelDecision: false,
      trainingTruth: false,
    });
    return body.result;
  }

  async function performHumanTurn() {
    const legalSpace = await loadLegalSpace();
    ensure(Number(legalSpace.unsupportedCount || 0) === 0,
      "SLICE247_UNSUPPORTED_LEGAL_SPACE", {
        unsupportedCount: legalSpace.unsupportedCount,
      });
    const domains = legalSpace.parameterDomains || [];
    let selection = domains.find((entryValue) =>
      entryValue.actionType === "finish_activation");
    if (!selection) selection = domains.find((entryValue) =>
      entryValue.actionType === "deploy");
    let finite = null;
    if (!selection) {
      finite = [...(legalSpace.finiteActions || [])].sort((left, right) => {
        const leftIndex = HUMAN_ACTION_PRIORITY.indexOf(left.action.actionType);
        const rightIndex = HUMAN_ACTION_PRIORITY.indexOf(right.action.actionType);
        return leftIndex - rightIndex || left.actionKey.localeCompare(right.actionKey);
      }).find((entryValue) => HUMAN_ACTION_PRIORITY
        .includes(entryValue.action.actionType));
      if (finite?.action?.actionType === "choose_first_actor") {
        finite = (legalSpace.finiteActions || []).find((entryValue) =>
          entryValue.action?.actionType === "choose_first_actor"
            && entryValue.action?.chosenFirstActorSideKey === "player1") || finite;
      }
      ensure(finite, "SLICE247_NO_HUMAN_PROGRESS_ACTION", {
        finiteTypes: (legalSpace.finiteActions || []).map((entryValue) =>
          entryValue.action?.actionType),
        domainTypes: domains.map((entryValue) => entryValue.actionType),
      });
      selection = finite.action;
    }
    let parameters = null;
    if (selection.actionType === "deploy") {
      parameters = await previewDeploy(selection, legalSpace);
    } else {
      await previewDirect(finite ? actionLabel(finite.action)
        : [selection.actionType, selection.pieceId].filter(Boolean).join(" · "));
    }
    return applyHuman(selection, legalSpace, parameters);
  }

  async function humanTurn() {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      await ensureOperationalForeground(`human_turn_attempt_${attempt}`);
      try {
        return await performHumanTurn();
      } catch (error) {
        const recoverable = attempt === 1
          && RECOVERABLE_UI_DISPATCH_FAILURES.has(String(error?.code));
        if (!recoverable) throw error;
        mediumFindings.push({
          severity: "Medium",
          code: "SLICE247_UI_FOREGROUND_RECOVERED",
          failedOperation: String(error.code),
          attempt,
          lifecycle: error.lifecycle || await browserLifecycleSnapshot(),
          strategyImpact: "none_human_ui_dispatch_only",
        });
      }
    }
    throw Object.assign(new Error("SLICE247_UI_FOREGROUND_RECOVERY_EXHAUSTED"), {
      code: "SLICE247_UI_FOREGROUND_RECOVERY_EXHAUSTED",
    });
  }

  async function delegatePhysicalTasks(manifestValue) {
    const tasks = manifestValue?.bot?.physicalOperation?.tasks || [];
    for (const task of tasks.filter((entryValue) =>
      entryValue.status === "pending_human")) {
      const panel = page.getByTestId("hosted-opponent-operations-panel");
      await panel.getByRole("button", {
        name: /委托 Agent|Delegate to Agent/u,
      }).first().click();
      await waitForManifest((value) => {
        const updated = value?.bot?.physicalOperation?.tasks || [];
        return updated.find((entryValue) => entryValue.taskId === task.taskId)
          ?.status === "completed";
      }, 30_000, "SLICE247_PHYSICAL_DELEGATION_TIMEOUT");
    }
  }

  async function agentTurn(previousManifest) {
    const previousBot = previousManifest?.bot?.bot || previousManifest?.bot || {};
    const previousCount = Number(previousBot.actionCount || 0);
    let updated = previousManifest;
    let driven = null;
    let maximumAttempts = MAX_TRANSIENT_BOT_DRIVE_ATTEMPTS;
    let attemptsPerformed = 0;
    for (let attempt = 1; attempt <= maximumAttempts;
      attempt += 1) {
      attemptsPerformed = attempt;
      driven = await fetch(`${entry.origin}/__ticket23/bot/drive`, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "x-ticket23-runner-token": entry.runnerRulesQueryToken,
        },
        body: JSON.stringify({ retry: attempt > 1 }),
      }).then((response) => response.json()).catch((error) => ({
        ok: false,
        error: String(error?.message || error),
      }));
      updated = await manifest();
      const bot = updated?.bot?.bot || updated?.bot || {};
      if (Number(bot.actionCount || 0) > previousCount
        || updated.state?.terminal === true
        || updated.state?.gameOver === true) break;
      const latestUnresolvedIssue = [...(bot.issues || [])].reverse()
        .find((entryValue) => !entryValue?.resolvedAt) || null;
      const severity = String(driven?.result?.findingSeverity
        || latestUnresolvedIssue?.severity || "");
      const reason = String(driven?.result?.reason
        || latestUnresolvedIssue?.code || "");
      const providerUsage = updated?.provider?.usage || {};
      const zeroUsageNetworkFailure = severity === "Medium"
        && ZERO_USAGE_PROVIDER_NETWORK_REASONS.has(reason)
        && Number(providerUsage.currentAttemptReportedTotalUnits || 0) === 0;
      if (zeroUsageNetworkFailure) {
        maximumAttempts = MAX_ZERO_USAGE_PROVIDER_NETWORK_ATTEMPTS;
      }
      const endpointTransportFailure = driven?.ok === false
        && !driven?.result && typeof driven?.error === "string";
      const transientProviderFailure = TRANSIENT_PROVIDER_FAILURE_REASONS
        .has(reason) && new Set(["Medium", "High"]).has(severity);
      const retryable = attempt < maximumAttempts && (
        driven?.result?.ok === false && severity === "Medium"
        || transientProviderFailure
        || endpointTransportFailure
      );
      if (!retryable) break;
      if (zeroUsageNetworkFailure) {
        await new Promise((resolve) => setTimeout(resolve,
          Math.min(30_000, attempt * 5_000)));
      }
    }
    const observedBot = updated?.bot?.bot || updated?.bot || {};
    const actionAdvanced = Number(observedBot.actionCount || 0) > previousCount;
    const replayVerifiedAdvance = actionAdvanced
      && observedBot.lastReplayMatchesCurrent === true;
    if (!actionAdvanced
      && updated.state?.terminal !== true && updated.state?.gameOver !== true
      && driven?.result?.ok === true
      && driven?.result?.outcome !== "waiting_for_other_seat") {
      updated = await waitForManifest((value) => {
        const bot = value?.bot?.bot || value?.bot || {};
        return Number(bot.actionCount || 0) > previousCount
          || value?.state?.terminal === true || value?.state?.gameOver === true;
      }, PROVIDER_ACTION_TIMEOUT_MS, "SLICE247_AGENT_ACTION_TIMEOUT");
    }
    ensure(driven?.result?.ok === true || replayVerifiedAdvance
      || updated.state?.terminal === true || updated.state?.gameOver === true,
    "SLICE247_AGENT_DRIVE_FAILED", {
      driven,
      responseLossRecoveredFromAuthoritativeManifest: replayVerifiedAdvance,
      attemptsPerformed,
      maximumAttempts,
    });
    const bot = updated?.bot?.bot || updated?.bot || {};
    if (Number(bot.actionCount || 0) > previousCount) {
      await recordUnseenAgentTraces(updated);
      await delegatePhysicalTasks(updated);
    }
    return updated;
  }

  async function recordUnseenAgentTraces(manifestValue) {
    const bot = manifestValue?.bot?.bot || manifestValue?.bot || {};
    const recordedReceiptHashes = new Set(actions.filter((entryValue) =>
      entryValue.actor === "agent" && entryValue.receiptHash)
      .map((entryValue) => entryValue.receiptHash));
    const unseen = (bot.recentTraces || []).filter((trace) =>
      trace?.applyReceiptHash
        && !recordedReceiptHashes.has(trace.applyReceiptHash))
      .sort((left, right) => Number(left.postStateRevision || 0)
        - Number(right.postStateRevision || 0));
    for (const trace of unseen) await recordAgentTrace(manifestValue, trace);
    return unseen.length;
  }

  async function recordAgentTrace(manifestValue, suppliedTrace = null) {
    const bot = manifestValue?.bot?.bot || manifestValue?.bot || {};
    const trace = suppliedTrace || bot.latestTrace || null;
    const revision = trace?.postStateRevision ?? bot.lastAppliedStateRevision ?? null;
    const receiptHash = trace?.applyReceiptHash || bot.lastReceiptHash || null;
    if (receiptHash && actions.some((entryValue) =>
      entryValue.actor === "agent" && entryValue.receiptHash === receiptHash)) {
      return false;
    }
    await page.getByTestId("hosted-opponent-operations-panel")
      .getByText(new RegExp(`(?:机器动作|Agent actions):\\s*${bot.actionCount}`, "iu"))
      .waitFor({ timeout: 20_000 });
    const screenshot = await capture("player2",
      trace?.candidateId || "agent-action", revision);
    const notice = (manifestValue.notifications || []).filter((entryValue) =>
      entryValue.kind === "machine_action_applied"
        && Number(entryValue.postStateRevision) === Number(revision)).at(-1);
    const transition = (manifestValue.recentAcceptedTransitions || [])
      .find((entryValue) => entryValue.journalHash === receiptHash) || null;
    const observedStateRevision = Number(manifestValue.room?.stateRevision);
    await appendAction({
      index: actions.length + 1,
      actor: "agent",
      sideKey: "player2",
      round: manifestValue.state?.round ?? null,
      phase: manifestValue.state?.phase ?? null,
      actionType: transition?.action?.actionType
        || notice?.action?.actionType || trace?.actionType
        || bot.lastDecision?.actionType || trace?.candidateId || null,
      pieceId: transition?.action?.pieceId
        || notice?.action?.pieceId || trace?.pieceId
        || bot.lastDecision?.pieceId || null,
      publicDecisionSummary: trace?.publicDecisionSummary || null,
      plannerResult: trace?.plannerResult || null,
      lifecycleAssessment: trace?.lifecycleAssessment || null,
      formationSelection: trace?.formationSelection || null,
      assetPlacementSelection: trace?.assetPlacementSelection || null,
      placementRationales: trace?.placementRationales
        || trace?.publicDecisionSummary?.placementRationales || [],
      selectedReason: trace?.selectedReason || null,
      risk: trace?.risk || null,
      providerCalls: trace?.providerCalls || 0,
      providerInputUnits: trace?.providerInputUnits || 0,
      providerOutputUnits: trace?.providerOutputUnits || 0,
      matchEstimatedCostCnyMicros:
        trace?.matchEstimatedCostCnyMicros || 0,
      receiptHash,
      postStateRevision: revision,
      postStateHash: trace?.postStateHash || null,
      replayMatchesCurrent: trace?.replayMatchesCurrent === true,
      screenshot,
      screenshotObservedStateRevision: Number.isSafeInteger(observedStateRevision)
        ? observedStateRevision : null,
      historicalUiReconstructionRequired:
        Number.isSafeInteger(observedStateRevision)
          && Number(revision) !== observedStateRevision,
      rulesAuthority: true,
      modelDecision: Number(trace?.providerCalls || 0) > 0,
      hiddenChainOfThoughtStored: false,
      trainingTruth: false,
    });
    return true;
  }

  try {
    server = await startServer(resumeDirectory);
    entry = server.entry;
    outputDirectory = path.resolve(entry.liveDataDirectory);
    await mkdir(path.join(outputDirectory, "screenshots"), {
      recursive: true, mode: 0o700,
    });
    if (entry.resumed === true) {
      const actionPath = path.join(outputDirectory, "actions.ndjson");
      if (existsSync(actionPath)) {
        const prior = (await readFile(actionPath, "utf8")).split(/\n/u)
          .filter(Boolean).map((line) => JSON.parse(line));
        actions.push(...prior);
        actionCount = actions.length;
      }
      const screenshotFiles = await readdir(path.join(outputDirectory,
        "screenshots"));
      screenshotCount = screenshotFiles.reduce((maximum, filename) => {
        const sequence = Number(/^(\d{4})-/u.exec(filename)?.[1] || 0);
        return Math.max(maximum, sequence);
      }, 0);
    }
    await progress("server_ready", {
      roomId: entry.roomId,
      providerModel: entry.providerModel,
      resumed: entry.resumed === true,
    });

    await openBrowserSurface("initial_connection");
    ensure(currentProjection?.state && currentProjection?.matchBinding,
      "SLICE247_INITIAL_AUTHORITY_PROJECTION_MISSING");
    let current = await manifest();
    ensure(current.coverage?.engagementScale === "Standard",
      "SLICE247_NOT_STANDARD_SCALE");
    ensure(current.coverage?.mineralSpentBySide?.player1 === 2000
      && current.coverage?.mineralSpentBySide?.player2 === 2000,
    "SLICE247_NOT_2000_POINT_ARMIES");
    ensure(current.coverage?.selectedUnitCount === 15
      && current.coverage?.terrainPieceCount === 9,
    "SLICE247_ROOM_CONTENT_DENOMINATOR_MISMATCH");
    ensure(current.map?.mapSeedId === "sc1_lost_temple_v1"
      && current.map?.mapRoomFreezeHash
      && current.map?.missionSpatialReachabilityAuditHash
      && current.map?.roomFreezeSummary?.mutationAfterRoomCreationAllowed
        === false,
    "SLICE258_CERTIFIED_MAP_FREEZE_MISSING", { map: current.map });
    await capture("room", "connected", current.room?.stateRevision ?? 0,
      "initial");
    await recoverUnrecordedHumanTransition(current);
    await recordUnseenAgentTraces(current);

    let consecutiveBrowserSurfaceRecoveries = 0;
    while (Date.now() < matchDeadline && actions.length < MAX_ACTIONS
      && current.state?.terminal !== true && current.state?.gameOver !== true) {
      try {
        const machineOwnsTurn = shouldDriveAgent(current);
        if (machineOwnsTurn) {
          current = await agentTurn(current);
          if (!current.state?.terminal && !current.state?.gameOver) {
            await refreshRoomProjection();
            current = await manifest();
          }
        } else {
          const beforeHuman = current;
          await humanTurn();
          // Apply/Replay can finish before the shared client consumes the new
          // envelope. Refresh before asking that client for the next LegalSpace,
          // especially after choose_first_actor.
          await refreshRoomProjection();
          const observed = await manifest();
          if (botActionCount(observed) > botActionCount(beforeHuman)) {
            current = await agentTurn(beforeHuman);
            if (!current.state?.terminal && !current.state?.gameOver) {
              await refreshRoomProjection();
              current = await manifest();
            }
          } else {
            current = observed;
          }
        }
        consecutiveBrowserSurfaceRecoveries = 0;
      } catch (error) {
        if (!browserLifecycleFailure(error)
          || consecutiveBrowserSurfaceRecoveries
            >= MAX_CONSECUTIVE_BROWSER_SURFACE_RECOVERIES) throw error;
        consecutiveBrowserSurfaceRecoveries += 1;
        const failedLifecycle = await browserLifecycleSnapshot();
        const recovery = await openBrowserSurface(
          `loop_recovery_${consecutiveBrowserSurfaceRecoveries}`);
        current = await manifest();
        await recoverUnrecordedHumanTransition(current);
        await recordUnseenAgentTraces(current);
        mediumFindings.push({
          severity: "Medium",
          code: "SLICE247_BROWSER_SURFACE_RECOVERED",
          attempt: consecutiveBrowserSurfaceRecoveries,
          cause: sanitizeServerText(error?.message || error),
          failedLifecycle,
          recoveredLifecycle: recovery.lifecycle,
          authoritativeStateRevision: current.room?.stateRevision ?? null,
          strategyImpact: "none_authority_reconciled_before_next_decision",
        });
      }
      await progress("running", { manifest: current,
        roomId: entry.roomId, providerModel: entry.providerModel });
    }
    ensure(actions.length < MAX_ACTIONS, "SLICE247_ACTION_LIMIT_REACHED");
    ensure(Date.now() < matchDeadline, "SLICE247_MATCH_TIMEOUT");
    current = await manifest();
    ensure(current.state?.terminal === true || current.state?.gameOver === true,
      "SLICE247_MATCH_NOT_TERMINAL", { state: current.state });
    await refreshRoomProjection();
    await page.getByRole("button", { name: /^(行动|Actions)$/u }).click();
    await page.getByRole("button", { name: /裁判 \/ 重放|Referee \/ replay/u })
      .click();
    const finalScreenshot = await capture("room", "terminal",
      current.room?.stateRevision ?? actions.length, "final");
    const providerUsage = current.provider?.usage || {};
    const report = {
      schema: `ticket${EVIDENCE_TICKET}_slice${EVIDENCE_SLICE}_human_agent_web_report_v1`,
      ok: true,
      ticket: EVIDENCE_TICKET,
      slice: EVIDENCE_SLICE,
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
        humanActionCount: actions.filter((entryValue) =>
          entryValue.actor === "human").length,
        agentActionCount: actions.filter((entryValue) =>
          entryValue.actor === "agent").length,
        screenshotCount,
        everyObservedApplyHasScreenshot: actions.every((entryValue) =>
          Boolean(entryValue.screenshot)),
        allAgentReplaysVerified: actions.filter((entryValue) =>
          entryValue.actor === "agent").every((entryValue) =>
          entryValue.replayMatchesCurrent === true),
        finalScreenshot,
        map: current.map,
      },
      agent: {
        model: entry.providerModel,
        providerCalls: providerUsage.providerCalls || 0,
        inputUnits: providerUsage.inputUnits || 0,
        outputUnits: providerUsage.outputUnits || 0,
        totalUnits: providerUsage.totalUnits || 0,
        estimatedCostCnyMicros: providerUsage.estimatedCostCnyMicros || 0,
        estimatedCostCny:
          Number(providerUsage.estimatedCostCnyMicros || 0) / 1_000_000,
        completedBaselineCostCny: COST_BASELINE_CNY,
        costDeltaVsBaselineCny: Number(
          (Number(providerUsage.estimatedCostCnyMicros || 0) / 1_000_000
            - COST_BASELINE_CNY).toFixed(6)),
        publicPlanAndReasonsCaptured: actions.filter((entryValue) =>
          entryValue.actor === "agent").every((entryValue) =>
          Boolean(entryValue.publicDecisionSummary)),
        hiddenChainOfThoughtStored: false,
      },
      findings: {
        criticalOrHigh: [],
        medium: mediumFindings,
        browserConsoleErrors: consoleErrors,
        browserPageErrors: pageErrors,
      },
      sourceRefreshPerformed: false,
      trainingTruth: false,
      actions,
    };
    ensure(pageErrors.length === 0, "SLICE247_BROWSER_PAGE_ERRORS", {
      pageErrors,
    });
    await writeJsonAtomic(path.join(outputDirectory, "report.json"), report,
      0o644);
    await progress("complete", { manifest: current,
      report: "report.json", finalScreenshot });
    process.stdout.write(`${JSON.stringify({
      ok: true,
      ticket: EVIDENCE_TICKET,
      slice: EVIDENCE_SLICE,
      roomId: entry.roomId,
      terminalRound: current.state.round,
      actionCount: actions.length,
      screenshotCount,
      providerCalls: report.agent.providerCalls,
      totalUnits: report.agent.totalUnits,
      estimatedCostCny: report.agent.estimatedCostCny,
      reportPath: path.relative(ROOT, path.join(outputDirectory, "report.json")),
    }, null, 2)}\n`);
  } catch (error) {
    if (outputDirectory) {
      let failureScreenshot = null;
      try {
        failureScreenshot = await capture("runner",
          error?.code || "failure", actionCount, "failure");
      } catch {}
      await writeJsonAtomic(path.join(outputDirectory, "failure.json"), {
        schema: `ticket${EVIDENCE_TICKET}_slice${EVIDENCE_SLICE}_human_agent_web_failure_v1`,
        ok: false,
        ticket: EVIDENCE_TICKET,
        slice: EVIDENCE_SLICE,
        code: String(error?.code || error?.name || "SLICE247_UNHANDLED_FAILURE"),
        message: sanitizeServerText(error?.message || error),
        details: Object.fromEntries(Object.entries(error || {}).filter(([key]) =>
          !new Set(["stack", "url", "seatToken", "credentials"]).has(key))),
        actionCount,
        screenshotCount,
        failureScreenshot,
        serverStderr: sanitizeServerText(server?.stderr?.()),
        consoleErrors,
        pageErrors,
        failedAt: new Date().toISOString(),
      }, 0o600);
      await progress("failed", {
        manifest: lastManifest,
        failureCode: String(error?.code || error?.name),
        failureScreenshot,
      });
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
