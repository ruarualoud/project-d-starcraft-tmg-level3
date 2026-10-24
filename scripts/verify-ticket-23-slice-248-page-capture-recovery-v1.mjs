// Concrete regression: v20 A111's BEFORE screenshot aborted at Playwright's
// default 30s timeout. Execute the real driver's capture body, not a second driver.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import * as captures from "../packages/online-agent-session/owned-live-capture-v1.mjs";

const [reportPath, originalErrorPath] = process.argv.slice(2);
const report = { providerCalls: 0, roomWrites: 0, actionReexecuted: false,
  realBrowserRecoveryVerified: false };
try {
  const originalError = await readFile(originalErrorPath, "utf8");
  assert.match(originalError, /page\.screenshot: Timeout 30000ms exceeded/u);
  assert.match(originalError, /at capture .*run-ticket-23-slice-248-agent-agent-web-v1\.mjs/u);
  const source = await readFile(new URL("./run-ticket-23-slice-248-agent-agent-web-v1.mjs",
    import.meta.url), "utf8");
  const start = source.indexOf("  async function capture(seatKey,");
  const end = source.indexOf("  async function captureElement(", start);
  assert(start >= 0 && end > start, "ACTUAL_DRIVER_CAPTURE_SEAM_MISSING");
  const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
  const captureAtActualCallSite = new AsyncFunction("page", "settleBattlefieldVisuals",
    "path", "outputDirectory", "safeName", "captureOwnedLivePageV1", "observeTiming",
    `let screenshotCount = 700;\n${source.slice(start, end)}\n`
    + `const screenshot = await capture("room", "next-agent-decision", 111, "before");\n`
    + "return { screenshot, screenshotCount };\n");
  const timeout = () => Object.assign(new Error("page.screenshot: Timeout 30000ms exceeded."),
    { name: "TimeoutError" });
  const calls = [];
  const timings = [];
  let settles = 0;
  const page = { isClosed: () => false, screenshot: async options => {
    calls.push(options);
    if (calls.length === 1) throw timeout();
    return Buffer.from("actual capture boundary fixture");
  } };
  const result = await captureAtActualCallSite(page, async () => { settles += 1; },
    path, "/owned/evidence", value => value,
    captures.captureOwnedLivePageV1, (...args) => timings.push(args));
  assert.equal(result.screenshotCount, 701);
  assert.equal(result.screenshot, "screenshots/0701-r111-room-next-agent-decision-before.png");
  assert.equal(settles, 1);
  assert.equal(calls.length, 2, "SOFT_SCREENSHOT_TIMEOUT_MUST_RECOVER_AT_SAME_CALL_SITE");
  assert.equal(calls[0].path, calls[1].path);
  assert(calls.every(options => options.animations === "disabled" && options.fullPage === true));
  assert(calls.every(options => options.timeout >= 120_000));

  let genuineCalls = 0;
  const genuine = Object.assign(new Error("capture target invalid"), { name: "Error" });
  await assert.rejects(captures.captureOwnedLivePageV1({ path: "same.png", page: {
    isClosed: () => false, screenshot: async () => { genuineCalls += 1; throw genuine; },
  } }), error => error === genuine);
  assert.equal(genuineCalls, 1);

  let closedCalls = 0;
  await assert.rejects(captures.captureOwnedLivePageV1({ path: "same.png", page: {
    isClosed: () => true, screenshot: async () => { closedCalls += 1; throw timeout(); },
  } }), error => error.name === "TimeoutError");
  assert.equal(closedCalls, 1);

  let exhaustedCalls = 0;
  await assert.rejects(captures.captureOwnedLivePageV1({ path: "same.png", page: {
    isClosed: () => false, screenshot: async () => { exhaustedCalls += 1; throw timeout(); },
  } }), error => error.name === "TimeoutError");
  assert.equal(exhaustedCalls, 3, "READONLY_RECOVERY_MUST_BE_BOUNDED");
  report.ok = true;
  report.actualCaptureRecovered = true;
  report.samePageAndPath = true;
  report.screenshotCountAllocatedOnce = true;
  report.captureTimingsRecorded = timings.length;
} catch (error) {
  report.ok = false;
  report.errorName = error.name;
  report.error = error.message;
  throw error;
} finally {
  await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
  console.log(JSON.stringify(report));
}
