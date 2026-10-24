import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { createSqliteStarcraftTmgLiveDecisionStoreV1,
  decodeStarcraftTmgLiveDecisionRecordV1 } from
  "../packages/online-agent-session/sqlite-live-decision-store-v1.mjs";

const [databasePath, choiceKey, reportPath] = process.argv.slice(2);
const source = new DatabaseSync(databasePath, { readOnly: true });
let row;
try {
  const rows = source.prepare(
    "SELECT * FROM sc_live_decision_records").all();
  assert.equal(rows.length, 1);
  [row] = rows;
} finally {
  source.close();
}
const captured = decodeStarcraftTmgLiveDecisionRecordV1(row.record_json);
assert(captured.decisions[choiceKey]);
const nativeStringify = JSON.stringify;
const digest = value => createHash("sha256")
  .update(nativeStringify(value)).digest("hex");
const deepFreeze = value => {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
};
for (const decision of Object.values(captured.decisions)) deepFreeze(decision);
const captureHash = digest(captured);
const frozenKeys = new Set(Object.keys(captured.decisions));
const memoryDatabase = new DatabaseSync(":memory:");
const store = createSqliteStarcraftTmgLiveDecisionStoreV1({
  filename: ":memory:", database: memoryDatabase,
});
memoryDatabase.prepare(`INSERT INTO sc_live_decision_records
  (scope_key, revision, record_json, updated_at) VALUES (?, ?, ?, ?)`)
  .run(row.scope_key, row.revision, row.record_json, row.updated_at);
const at = step => new Date(Date.parse(captured.updatedAt) + step).toISOString();
const next = (previous, step, changes = {}) => ({ ...previous, ...changes,
  revision: previous.revision + 1, updatedAt: at(step) });
let testWrites = 0;
const save = async (previous, updated) => {
  const result = await store.commit(captured.scope.scopeKey, previous.revision,
    updated);
  assert.equal(result.ok, true);
  testWrites += 1;
};
let report;
try {
  // Warm the real codec once. The next metadata update must not revisit the
  // immutable decision graphs. This is not a model/room operation.
  const first = next(captured, 1);
  await save(captured, first);
  const second = next(first, 2, { issues: [...first.issues,
    { code: "ISOLATED_CODEC_REGRESSION_FIXTURE", severity: "Medium" }] });
  const visits = new Map();
  JSON.stringify = (value, replacer, space) => {
    if (replacer !== undefined) return nativeStringify(value, replacer, space);
    return nativeStringify(value, function (key, child) {
      if (child && typeof child === "object"
        && frozenKeys.has(child.choiceKey)) {
        visits.set(child.choiceKey, (visits.get(child.choiceKey) || 0) + 1);
      }
      return child;
    }, space);
  };
  try { await save(first, second); } finally { JSON.stringify = nativeStringify; }
  const loaded = await store.load(captured.scope.scopeKey);
  assert.equal(digest(loaded), digest(second), "complete encoded JSON preserved");
  const newRow = memoryDatabase.prepare(
    "SELECT record_json FROM sc_live_decision_records").get();
  const envelope = JSON.parse(newRow.record_json);
  assert.equal(envelope.schemaVersion,
    "starcraft_tmg_sqlite_live_decision_gzip_record_v1");
  assert.equal(envelope.encoding, "gzip-base64");
  assert.equal(envelope.revision, second.revision);

  // Shallow Object.freeze is not proof of immutable descendants. Such a
  // selected choice must be serialized afresh after its warning array changes.
  const mutableDescendant = JSON.parse(nativeStringify(
    captured.decisions[choiceKey]));
  Object.freeze(mutableDescendant);
  assert.equal(Object.isFrozen(mutableDescendant.warnings), false);
  const third = next(second, 3, { decisions: { ...second.decisions,
    [choiceKey]: mutableDescendant } });
  await save(second, third);
  mutableDescendant.warnings.push("MUTABLE_DESCENDANT_MUST_NOT_BE_CACHED");
  const fourth = next(third, 4);
  await save(third, fourth);
  const mutableLoaded = await store.load(captured.scope.scopeKey);
  assert.equal(digest(mutableLoaded), digest(fourth));
  assert(mutableLoaded.decisions[choiceKey].warnings.includes(
    "MUTABLE_DESCENDANT_MUST_NOT_BE_CACHED"));
  const conflict = await store.commit(captured.scope.scopeKey,
    captured.revision, next(captured, 5));
  assert.equal(conflict.ok, false);
  assert.equal(conflict.reason, "LIVE_DECISION_STORE_REVISION_CONFLICT");
  assert.equal(memoryDatabase.prepare(
    "SELECT revision FROM sc_live_decision_records").get().revision,
  fourth.revision);
  assert.equal(digest(captured), captureHash);
  report = {
    schemaVersion: "captured_live_history_codec_regression_v1",
    status: visits.size === 0 ? "passed" : "failed",
    captureBytes: Buffer.byteLength(nativeStringify(captured)),
    decisionCount: frozenKeys.size, warmMetadataHistoryVisits: visits.size,
    warmMetadataTotalHistoryVisits: [...visits.values()].reduce((a, b) => a + b, 0),
    previousEncodedBytes: Buffer.byteLength(row.record_json),
    cachedEncodedBytes: Buffer.byteLength(newRow.record_json),
    completeStoredJsonHash: digest(second), originalCaptureHash: captureHash,
    completeEncodedJsonPreserved: true, originalGzipEnvelopeSchemaPreserved: true,
    mutableDescendantNeverCached: true, failedCompareAndSwapPreserved: true,
    sourceReadOnly: true, testStoreWrites: testWrites,
    liveDatabaseWrites: 0, providerCalls: 0, roomMutations: 0,
    performanceScope: "codec traversal; not whole-action latency",
  };
} finally {
  JSON.stringify = nativeStringify;
  store.close();
  memoryDatabase.close();
}
await writeFile(reportPath, nativeStringify(report, null, 2) + "\n", { mode: 0o600 });
assert.equal(report.warmMetadataHistoryVisits, 0,
  "BUG: a metadata update re-encodes every immutable historical decision");
console.log(nativeStringify({ passed: true,
  warmMetadataHistoryVisits: report.warmMetadataHistoryVisits,
  cachedEncodedBytes: report.cachedEncodedBytes, providerCalls: 0 }));
