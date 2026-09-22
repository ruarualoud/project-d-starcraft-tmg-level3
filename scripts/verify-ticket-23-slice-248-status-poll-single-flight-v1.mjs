#!/usr/bin/env node
// Exercise the actual component callback with a deferred HTTP response. The
// real defect is timer/manual reads piling up while a prior read is pending.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL(
  "../apps/starcraft-tmg-expo/components/battlefield/agent-agent-match-control.tsx",
  import.meta.url), "utf8");
const startMarker = "const readStatus = useCallback(";
const start = source.indexOf(startMarker) + startMarker.length;
const end = source.indexOf("\n  }, []);", start);
assert(start >= startMarker.length && end > start,
  "the test must exercise the real readStatus callback, not a duplicate implementation");
const callback = source.slice(start, end) + "\n  }";
const calls = [];
const snapshots = [];
const notes = [];
const availability = [];
const hiddenRef = { current: false };
const statusReadInFlightRef = { current: false };
const readStatus = new Function("fetch", "STATUS_PATH", "hiddenRef",
  "statusReadInFlightRef", "setAvailability", "setSnapshot", "setReadNote",
  "asRecord", `return (${callback});`)(
  (url, options) => new Promise((resolve, reject) => calls.push({ url, options, resolve, reject })),
  "/__ticket23/a2a/ui-status", hiddenRef, statusReadInFlightRef,
  (value) => availability.push(value), (value) => snapshots.push(value),
  (value) => notes.push(value), (value) => value && typeof value === "object" ? value : {},
);
const first = readStatus();
const timerTick = readStatus();
const afterDriveRefresh = readStatus();
assert.equal(calls.length, 1,
  "pending status response must coalesce timer ticks and post-drive reads; old code sends 3");
assert.equal(calls[0].options.credentials, "same-origin");
const manifest = { room: { stateRevision: 44 }, state: { phase: "cleanup" },
  usage: { totalUnits: 9529523 }, dataWiringAudit: { status: "passed" } };
calls[0].resolve({ status: 200, ok: true, async json() {
  return { ok: true, job: { status: "completed" }, manifest };
} });
await Promise.all([first, timerTick, afterDriveRefresh]);
assert.deepEqual(snapshots, [{ job: { status: "completed" }, manifest }]);
assert.equal(statusReadInFlightRef.current, false);

const errorRead = readStatus();
assert.equal(calls.length, 2, "completed reads permit the next normal poll");
calls[1].reject(new Error("temporary transport failure"));
await errorRead;
assert.equal(notes.at(-1), "A2A_STATUS_UNREACHABLE");
assert.equal(statusReadInFlightRef.current, false, "network failure releases the pending flag");

const deniedRead = readStatus();
calls[2].resolve({ status: 403, ok: false });
await deniedRead;
assert.equal(availability.at(-1), "hidden");
assert.equal(statusReadInFlightRef.current, false);
await readStatus();
assert.equal(calls.length, 3, "unavailable experimental surface stays hidden");
assert.match(source, /const statusReadInFlightRef = useRef\(false\)/u);
console.log(JSON.stringify({ ok: true, realComponentCallback: true,
  overlapRequestsBeforeRepair: 3, overlapRequestsAfterRepair: 1,
  completeManifestPreserved: true, successAndFailureRelease: true,
  providerCalls: 0, roomMutations: 0, trainingTruth: false }));
