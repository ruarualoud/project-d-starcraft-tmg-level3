import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { isStarcraftTmgHistoricalResumeFindingV1 } from
  "../packages/online-agent-session/decision-recovery-policy-v1.mjs";

const args = Object.fromEntries(process.argv.slice(2).map((entry) => {
  const match = /^--([^=]+)=(.*)$/u.exec(entry);
  if (!match) throw new Error(`unknown argument: ${entry}`);
  return [match[1], match[2]];
}));
const origin = new URL(args.origin || "");
if (origin.protocol !== "http:"
  || !["127.0.0.1", "localhost"].includes(origin.hostname)) {
  throw new Error("local HTTP origin is required");
}
const roomId = String(args["room-id"] || "").trim();
const runDirectory = path.resolve(String(args["run-directory"] || ""));
const costStopCny = Number(args["cost-stop-cny"] || 95);
const maxNewActions = Number(args["max-new-actions"] || 180);
const allowHistoricalRetryableFinding =
  args["resume-retryable-findings"] === "true";
const startedAt = new Date().toISOString();
if (!roomId || !args["run-directory"]
  || !Number.isFinite(costStopCny) || costStopCny <= 0
  || !Number.isSafeInteger(maxNewActions) || maxNewActions < 1) {
  throw new Error("room-id, run-directory, cost-stop-cny and max-new-actions are required");
}
const evidenceDirectory = path.join(runDirectory, "web-action-evidence");
const ledgerPath = path.join(evidenceDirectory, "actions.ndjson");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let stopRequested = false;
process.on("SIGINT", () => { stopRequested = true; });
process.on("SIGTERM", () => { stopRequested = true; });

async function request(pathname, init) {
  let lastError;
  // A lost POST response is an ambiguous dispatch, never permission to send
  // another action request. Only read-only GETs may be retried here.
  const attempts = String(init?.method || "GET").toUpperCase() === "GET"
    ? 3 : 1;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fetch(new URL(pathname, origin), {
        ...init, signal: AbortSignal.timeout(90_000),
      });
    } catch (error) {
      lastError = error;
      if (attempt + 1 < attempts) await sleep(3_000);
    }
  }
  throw lastError;
}

async function manifest() {
  const response = await request("/__ticket23/a2a/manifest");
  if (!response.ok) throw new Error(`manifest HTTP ${response.status}`);
  const value = await response.json();
  if (value.roomId !== roomId) throw new Error("room identity changed");
  return value;
}

async function roomCookie() {
  const response = await request(`/room/${encodeURIComponent(roomId)}`);
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  if (!response.ok || !cookie) throw new Error("room UI drive cookie unavailable");
  return cookie;
}

async function drive(cookie) {
  const response = await request("/__ticket23/a2a/ui-drive", {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: "{}",
  });
  const value = await response.json();
  if (response.status !== 202 || value.ok !== true
    || !value.job?.jobId) {
    throw new Error(`UI drive was not queued: ${value.reason || response.status}`);
  }
  return value.job.jobId;
}

function blockingFinding(value) {
  return value.orchestrator?.failureAccounting?.findings?.find((entry) =>
    !entry.resolvedAt
      && !isStarcraftTmgHistoricalResumeFindingV1(entry, {
        allowExistingRetryableFinding: allowHistoricalRetryableFinding,
        startedAt,
      })
      && (["Critical", "High"].includes(entry.severity)
        || entry.integrationBlocking === true)) || null;
}

async function main() {
  await mkdir(evidenceDirectory, { recursive: true });
  const existing = await readFile(ledgerPath, "utf8").catch((error) => {
    if (error.code === "ENOENT") return "";
    throw error;
  });
  const captured = new Set(existing.split("\n").filter(Boolean).map((line) =>
    Number(JSON.parse(line).revision)));
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1500, height: 1050 }, deviceScaleFactor: 1,
  });
  let newActions = 0;
  let noProgressJobs = 0;
  let pendingJobId = null;
  try {
    const cookie = await roomCookie();
    while (true) {
      const current = await manifest();
      const revision = current.room?.revision;
      if (!Number.isSafeInteger(revision)) {
        throw new Error("manifest has no authoritative revision");
      }
      const finding = blockingFinding(current);
      if (finding) {
        console.log(JSON.stringify({ stop: "blocking_finding", revision,
          code: finding.code, severity: finding.severity }));
        break;
      }
      if (!captured.has(revision)) {
        await page.goto(new URL(`/room/${encodeURIComponent(roomId)}`, origin)
          .toString(), { waitUntil: "domcontentloaded", timeout: 60_000 });
        await page.waitForFunction((expected) => {
          const text = document.body?.innerText || "";
          return text.includes("已连接权威房间")
            && text.includes(`r${expected}`);
        }, revision, { timeout: 45_000 });
        const mapArtLoad = await page.evaluate(async () => {
          const element = document.querySelector(
            "image#battlefield-display-map-v1");
          const source = element?.getAttribute("href")
            || element?.getAttribute("xlink:href") || "";
          if (!source) return "not_present";
          const image = new Image();
          image.src = source;
          const loaded = await Promise.race([
            image.decode().then(() => "decoded", () => "decode_failed"),
            new Promise((resolve) => setTimeout(() => resolve("load_timeout"),
              15_000)),
          ]);
          await new Promise((resolve) => requestAnimationFrame(() =>
            requestAnimationFrame(resolve)));
          return loaded;
        });
        const stem = `r${String(revision).padStart(3, "0")}`;
        await page.screenshot({ path: path.join(evidenceDirectory,
          `${stem}-top.jpg`), type: "jpeg", quality: 80 });
        await page.evaluate(() => {
          for (const element of document.querySelectorAll("*")) {
            if (element.scrollHeight - element.clientHeight > 350
              && element.clientHeight > 300) {
              element.scrollTop = Math.min(550,
                element.scrollHeight - element.clientHeight);
            }
          }
        });
        await page.screenshot({ path: path.join(evidenceDirectory,
          `${stem}-lower.jpg`), type: "jpeg", quality: 80 });
        const transition = current.recentAcceptedTransitions?.at(-1);
        const row = { revision, roomId,
          stateHash: current.room.stateHash,
          round: current.state?.round,
          phase: current.state?.phase,
          actionType: transition?.postStateRevision === revision
            ? transition.action?.actionType || null : null,
          pieceId: transition?.postStateRevision === revision
            ? transition.action?.pieceId || null : null,
          receiptHash: transition?.postStateRevision === revision
            ? transition.journalHash || null : null,
          providerCalls: current.usage?.providerCalls || 0,
          totalUnits: current.usage?.totalUnits || 0,
          estimatedCostCny: (current.usage?.estimatedCostCnyMicros || 0)
            / 1_000_000,
          mapArtLoad,
          top: `${stem}-top.jpg`, lower: `${stem}-lower.jpg`,
        };
        await appendFile(ledgerPath, `${JSON.stringify(row)}\n`,
          { encoding: "utf8", mode: 0o600 });
        captured.add(revision);
        if (pendingJobId) {
          newActions += 1;
          noProgressJobs = 0;
        }
        console.log(JSON.stringify({ captured: revision,
          action: row.actionType, piece: row.pieceId,
          newActions, costCny: row.estimatedCostCny }));
      }
      if (current.state?.terminal === true
        || current.state?.gameOver === true) {
        console.log(JSON.stringify({ stop: "terminal", revision }));
        break;
      }
      if (stopRequested) {
        console.log(JSON.stringify({ stop: "requested", revision }));
        break;
      }
      if ((current.usage?.estimatedCostCnyMicros || 0) / 1_000_000
        >= costStopCny) {
        console.log(JSON.stringify({ stop: "cost_threshold", revision,
          costStopCny }));
        break;
      }
      if (newActions >= maxNewActions) {
        console.log(JSON.stringify({ stop: "action_limit", revision,
          maxNewActions }));
        break;
      }
      if (["queued", "running"].includes(current.driveJob?.status)) {
        pendingJobId = current.driveJob.jobId;
        await sleep(5_000);
        continue;
      }
      if (["failed", "cancelled"].includes(current.driveJob?.status)) {
        console.log(JSON.stringify({ stop: "drive_not_completed", revision,
          jobId: current.driveJob?.jobId,
          status: current.driveJob?.status }));
        break;
      }
      if (pendingJobId && current.driveJob?.jobId === pendingJobId
        && current.driveJob.status === "completed") {
        if (current.driveJob.failure) {
          console.log(JSON.stringify({ stop: "drive_failure", revision,
            failure: current.driveJob.failure }));
          break;
        }
        noProgressJobs += 1;
        if (noProgressJobs >= 3) {
          console.log(JSON.stringify({ stop: "three_no_progress_jobs",
            revision }));
          break;
        }
      }
      pendingJobId = await drive(cookie);
      console.log(JSON.stringify({ queued: pendingJobId, revision }));
      await sleep(5_000);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ fatal: String(error?.message || error) }));
  process.exitCode = 1;
});
