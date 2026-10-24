import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const { state } = JSON.parse(await readFile(process.argv[2], "utf8"));
const baselinePath = process.argv[3];
assert.ok(baselinePath, "retain the original projection hashes");
const sourceUrl = new URL(
  "../packages/room-runtime/in-memory-room-v1.mjs", import.meta.url);
const source = await readFile(sourceUrl, "utf8");
const instrumented = source.replace("  cloneRoomStoreValue,",
  "  cloneRoomStoreValue as rawCloneRoomStoreValue,")
  .replace(/(\bfrom\s+["'])(\.[^"']+)(["'])/gu,
    (_, before, relative, after) =>
      `${before}${new URL(relative, sourceUrl).href}${after}`)
  + `
let watchedBoard;
let directBoardClones = 0;
function cloneRoomStoreValue(value) {
  if (value === watchedBoard) directBoardClones += 1;
  return rawCloneRoomStoreValue(value);
}
export function probeProjection(state, seat) {
  watchedBoard = state.board;
  directBoardClones = 0;
  const projection = projectStarcraftTmgStateForViewerV3(state, seat);
  return { projection, directBoardClones };
}
`;
const { probeProjection } = await import(
  `data:text/javascript;base64,${Buffer.from(instrumented).toString("base64")}`);
const hash = value => createHash("sha256")
  .update(JSON.stringify(value)).digest("hex");
const inputHash = hash(state);
const started = performance.now();
const observed = [null, "player1", "player2"].map(seat => {
  const { projection, directBoardClones } = probeProjection(state, seat);
  const projectionHash = hash(projection);
  // Caller-owned projected objects must never alias the authority state.
  projection.board.widthInches = -1;
  assert.equal(hash(state), inputHash);
  return { seat, projectionHash, directBoardClones };
});
const durationMs = Math.round(performance.now() - started);
let baseline;
try { baseline = JSON.parse(await readFile(baselinePath, "utf8")); }
catch (error) {
  if (error.code !== "ENOENT") throw error;
  baseline = { observed, durationMs };
  await writeFile(baselinePath, JSON.stringify(baseline),
    { flag: "wx", mode: 0o600 });
}
assert.deepEqual(observed.map(({ seat, projectionHash }) => ({ seat, projectionHash })),
  baseline.observed.map(({ seat, projectionHash }) => ({ seat, projectionHash })),
  "public and both private seat projections remain byte-identical");
console.log(JSON.stringify({ durationMs, baselineDurationMs: baseline.durationMs,
  observed, providerCalls: 0, roomMutations: 0 }));
assert.ok(observed.every(row => row.directBoardClones === 0),
  "V3 must not clone the same board before the existing V2 ownership clone");
console.log("CAPTURED_VIEWER_CLONE_OK");
