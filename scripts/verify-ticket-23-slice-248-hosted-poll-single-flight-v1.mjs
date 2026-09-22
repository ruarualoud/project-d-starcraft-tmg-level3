#!/usr/bin/env node
// Reproduce the real r51 observer failure: the HostedOpponent panel sends
// another GET every 1.5s while previous reads remain pending for 100+ seconds.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL(
  "../apps/starcraft-tmg-expo/components/battlefield/hosted-opponent-operations-panel.tsx",
  import.meta.url), "utf8");
const marker = "const read = useCallback(";
const start = source.indexOf(marker) + marker.length;
const end = source.indexOf("\n  }, [baseUrl, roomId]);", start);
assert(start >= marker.length && end > start);
const callback = source.slice(start, end) + "\n  }";
const calls = [], projections = [], errors = [];
const readRequestRef = { current: null };
const makeRead = (roomId) => new Function("fetch", "API_PREFIX", "baseUrl",
  "roomId", "readRequestRef", "setProjection", "setError",
  `return (${callback});`)(
  (url, options) => new Promise((resolve, reject) => calls.push({
    url, options, resolve, reject,
  })), "/starcraft-tmg-level3/bot/api/v1", "", roomId, readRequestRef,
  (value) => projections.push(value), (value) => errors.push(value),
);
const read = makeRead("room-a");
const first = read(), timer = read(), manual = read();
assert.equal(calls.length, 1,
  "pending HostedOpponent reads must coalesce; old callback sends three requests");
const projection = { bot: { lastAppliedStateRevision: 51 },
  physicalOperation: { tasks: [{ taskId: "retain-complete-task-list" }] } };
calls[0].resolve({ ok: true, async json() {
  return { result: { ok: true, projection } };
} });
await Promise.all([first, timer, manual]);
assert.deepEqual(projections, [projection], "no evidence/physical tasks trimmed");
assert.equal(readRequestRef.current, null);

const failed = read();
calls[1].reject(new Error("network interruption"));
await failed;
assert.equal(errors.at(-1), "network interruption");
assert.equal(readRequestRef.current, null, "failure releases the read slot");

const oldRoom = read();
const readNewRoom = makeRead("room-b");
const newRoom = readNewRoom();
assert.equal(calls[2].options.signal.aborted, true,
  "switching rooms cancels the obsolete read");
calls[3].resolve({ ok: true, async json() {
  return { result: { ok: true, projection: { roomId: "room-b" } } };
} });
await newRoom;
calls[2].resolve({ ok: true, async json() {
  return { result: { ok: true, projection: { roomId: "obsolete-room-a" } } };
} });
await oldRoom;
assert.deepEqual(projections.at(-1), { roomId: "room-b" });
assert.equal(projections.length, 2, "late obsolete response is not published");
assert.equal(readRequestRef.current, null);
await makeRead(null)();
assert.equal(calls.length, 4, "unbound panel sends no request");
console.log(JSON.stringify({ ok: true, realHostedPanelCallback: true,
  overlapBeforeRepair: 3, overlapAfterRepair: 1,
  fullProjectionPreserved: true, failureReleasesRead: true,
  staleRoomCancelledAndIgnored: true, providerCalls: 0, roomMutations: 0 }));
