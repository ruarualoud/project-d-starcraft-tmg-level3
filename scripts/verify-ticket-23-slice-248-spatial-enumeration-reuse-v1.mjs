import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";

const [capturePath, baselinePath, reportPath, priorPartialPath] = process.argv.slice(2);
const capture = JSON.parse(await readFile(capturePath, "utf8"));
function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
deepFreeze(capture.state);
deepFreeze(capture.domain);
const sourceUrl = new URL(
  "../packages/product-composition/official-selected-roster-spatial-action-runtime-v1.mjs",
  import.meta.url);
const originalSource = await readFile(sourceUrl, "utf8");
const seam = "function domainFor(state, sideKey, piece, actionType, context) {";
assert.ok(originalSource.includes(seam));
const source = originalSource.replace(seam, seam + "\n  domainBuildCalls += 1;")
  .replace(/(\bfrom\s+["'])(\.[^"']+)(["'])/gu,
    (_, before, relative, after) =>
      `${before}${new URL(relative, sourceUrl).href}${after}`)
  + "\nlet domainBuildCalls = 0; export function readDomainBuildCalls() { return domainBuildCalls; }\n";
const runtime = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
const startedAt = performance.now();
const priorPartial = priorPartialPath
  ? JSON.parse(await readFile(priorPartialPath, "utf8")) : null;
const counts = priorPartial ? priorPartial.counts : [];
const outcomes = priorPartial ? priorPartial.outcomes : [];
for (const index of priorPartial ? [] : [0, 16, 0]) {
  const before = runtime.readDomainBuildCalls();
  try {
    runtime.instantiateOfficialSelectedRosterSpatialActionV1(capture.state,
      capture.domain.sourceDomain, capture.parameters[index]);
    outcomes.push({ status: "accepted" });
  } catch (error) {
    outcomes.push({ status: "rejected", message: error.message });
  }
  counts.push(runtime.readDomainBuildCalls() - before);
}
let baseline;
try { baseline = JSON.parse(await readFile(baselinePath, "utf8")); }
catch (error) {
  if (error.code !== "ENOENT") throw error;
  baseline = { counts, outcomes, elapsedMs: Math.round(performance.now() - startedAt) };
  await writeFile(baselinePath, JSON.stringify(baseline) + "\n",
    { flag: "wx", mode: 0o600 });
}
const report = { schemaVersion: "r69_spatial_enumeration_reuse_gate_v1",
  stateRevision: capture.authority.stateRevision, counts,
  baselineCounts: baseline.counts, outcomes,
  elapsedMs: Math.round(performance.now() - startedAt),
  baselineElapsedMs: baseline.elapsedMs,
  coreEvidenceReusedFrom: priorPartialPath || null,
  providerCalls: 0, realRoomMutations: 0, wholeActionOneMinuteAccepted: false };
try {
  if (!priorPartial) {
    assert.deepEqual(outcomes, baseline.outcomes);
    assert.ok(counts[0] > 0);
    assert.deepEqual(counts.slice(1), [0, 0],
      "same deep-immutable state must not rebuild every Unit domain for every candidate");
  }
  const enumerate = runtime.enumerateOfficialSelectedRosterSpatialActionsV1;
  const observe = (state, options) => {
    const before = runtime.readDomainBuildCalls();
    const result = enumerate(state, options);
    return { result, count: runtime.readDomainBuildCalls() - before };
  };
  // The stale-domain check is still performed even when enumeration is reused.
  if (!priorPartial) {
    const stale = structuredClone(capture.domain.sourceDomain);
    stale.constraints.maxDistanceMilliInches += 1;
    assert.throws(() => runtime.instantiateOfficialSelectedRosterSpatialActionV1(
      capture.state, stale, capture.parameters[0]), /SELECTED_SPATIAL_PARAMETER_DOMAIN_STALE/u);
  }
  const ownSeat = observe(capture.state, { sideKey: "player1", includeDisabled: true });
  const otherSeat = observe(capture.state, { sideKey: "player2", includeDisabled: true });
  // This actual seat has no enabled ordinary spatial domain. Its disabled
  // diagnostics still have their own side identity and reusable exact result.
  assert.notStrictEqual(otherSeat.result, ownSeat.result);
  assert.ok(otherSeat.result.candidates.length > 0);
  assert.ok(otherSeat.result.candidates.every(row => row.sideKey === "player2"));
  assert.strictEqual(observe(capture.state,
    { sideKey: "player2", includeDisabled: true }).result, otherSeat.result);
  assert.ok(observe(capture.state, { sideKey: "player1", includeDisabled: false }).count > 0);
  const mutable = structuredClone(capture.state);
  Object.freeze(mutable); // Shallow freezing never certifies its mutable children.
  const firstMutable = observe(mutable, { sideKey: "player1", includeDisabled: true });
  assert.ok(firstMutable.count > 0);
  assert.ok(observe(mutable, { sideKey: "player1", includeDisabled: true }).count > 0);
  mutable.players.player1.passedPhases.movement = true;
  const changed = observe(mutable, { sideKey: "player1", includeDisabled: true });
  assert.notDeepEqual(changed.result, firstMutable.result);
  assert.equal(changed.result.parameterDomains.some(domain =>
    domain.domainId === capture.domain.sourceDomain.domainId), false);
  const anotherState = deepFreeze(structuredClone(capture.state));
  assert.ok(observe(anotherState, { sideKey: "player1", includeDisabled: true }).count > 0);
  report.mutableChildrenAndOtherIdentityNotReused = true;
  report.seatAndDisabledOptionsSeparated = true;
  report.staleDomainStillRejected = true;
  report.status = "passed";
} catch (error) {
  report.status = "failed"; report.message = error.message; process.exitCode = 1;
}
await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report));
