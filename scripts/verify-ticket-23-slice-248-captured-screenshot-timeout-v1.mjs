// A r51 is accepted but locator.screenshot timed out waiting for UI stability.
// Reproduce the same Playwright boundary locally without a room or a model.
import assert from "node:assert/strict";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { captureOwnedLiveElementV1 } from
  "../packages/online-agent-session/owned-live-capture-v1.mjs";

const directory = process.argv[2];
assert(directory);
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  await page.setContent(`<style>
    @keyframes drift { from { transform: translateX(0) } to { transform: translateX(80px) } }
    #board { width:400px;height:300px;background:#16394a;animation:drift .2s infinite alternate linear }
    </style><main><h1>Accepted revision 51 — observation only</h1><div id="board">Board</div></main>`);
  const file = path.join(directory, "unstable-board-fallback.png");
  let result, failure;
  try {
    result = await captureOwnedLiveElementV1({ page, locator: page.locator("#board"),
      path: file, timeoutMs: 180 });
  } catch (error) { failure = error; }
  assert.equal(failure, undefined,
    "accepted action evidence must survive an element-stability TimeoutError");
  assert.equal(result.captureMode, "full_page_fallback");
  assert.equal(result.warning.code, "ELEMENT_STABILITY_TIMEOUT");
  assert((await stat(file)).size > 0, "fallback is a real browser image");
  console.log(JSON.stringify({ ok: true, screenshot: file,
    captureMode: result.captureMode, providerCalls: 0, roomMutations: 0 }));
} finally { await browser.close(); }
