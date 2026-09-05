import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { seal, verifySeal, hash, safe, fail, integer, clone } from "./common.mjs";

// One journal owns attempts, reservations, normalized artifacts and CAS leases.
// A process dying after intent cannot make the request safe to repeat.
export function openProductionStore(filename, { runId, recipeHash, maxCalls = 180,
  maxCostMicros = 50_000_000, maxTokens = 5_000_000, now = () => Date.now() } = {}) {
  if (!/^[a-zA-Z0-9._-]{4,120}$/.test(runId) || !/^[a-f0-9]{64}$/.test(recipeHash)) fail("RUN_ID_INVALID");
  integer(maxCalls, 1, 1000); integer(maxCostMicros, 1, 1e9);
  const db = new DatabaseSync(filename);
  db.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000");
  db.exec("CREATE TABLE IF NOT EXISTS runs(id TEXT PRIMARY KEY, recipe TEXT NOT NULL, cap INTEGER NOT NULL, calls INTEGER NOT NULL, token_cap INTEGER NOT NULL);" +
    "CREATE TABLE IF NOT EXISTS steps(run TEXT, id TEXT, input_hash TEXT NOT NULL, generation INTEGER NOT NULL, owner TEXT, expires INTEGER, state TEXT NOT NULL, artifact TEXT, PRIMARY KEY(run,id));" +
    "CREATE TABLE IF NOT EXISTS attempts(run TEXT, id TEXT, request_hash TEXT NOT NULL, state TEXT NOT NULL, reserve INTEGER NOT NULL, settled INTEGER, usage TEXT, response TEXT, code TEXT, token_reserve INTEGER NOT NULL, PRIMARY KEY(run,id));");
  const initial = db.prepare("SELECT * FROM runs WHERE id=?").get(runId);
  if (initial && (initial.recipe !== recipeHash || initial.cap !== maxCostMicros || initial.calls !== maxCalls || initial.token_cap !== maxTokens)) fail("RUN_RECIPE_DRIFT");
  if (!initial) db.prepare("INSERT INTO runs VALUES(?,?,?,?,?)").run(runId, recipeHash, maxCostMicros, maxCalls, maxTokens);
  const encode = (v) => JSON.stringify(safe(seal({ value: v })));
  const decode = (v) => v === null || v === undefined ? null : clone(verifySeal(JSON.parse(v)).value);
  function transaction(fn) {
    db.exec("BEGIN IMMEDIATE");
    try { const value = fn(); db.exec("COMMIT"); return value; }
    catch (error) { db.exec("ROLLBACK"); throw error; }
  }
  function summary({ allRuns = false } = {}) {
    const rows = allRuns ? db.prepare("SELECT * FROM attempts ORDER BY run,id").all()
      : db.prepare("SELECT * FROM attempts WHERE run=? ORDER BY id").all(runId);
    return seal({ runId, recipeHash, calls: rows.length,
      reservedOrSettledMicros: rows.reduce((n, r) => n + (r.settled ?? r.reserve), 0),
      knownTokens: rows.reduce((n, r) => n + (decode(r.usage)?.totalUnits || 0), 0),
      reservedOrSettledTokens: rows.reduce((n, r) => n + (decode(r.usage)?.totalUnits ?? (r.state === "not_sent" ? 0 : r.token_reserve)), 0),
      unknownCalls: rows.filter((r) => !r.usage && r.state !== "not_sent").length,
      attempts: rows.map(({ id, state, reserve, settled, code, response }) => ({ id, state, reserve, settled, code,
        ...(state === "failed" ? { responseOutcome: decode(response)?.responseOutcome || null } : {}) })),
      steps: db.prepare("SELECT id,state,generation FROM steps WHERE run=? ORDER BY id").all(runId),
      currency: "CNY", invoice: false, trainingTruth: false });
  }
  function acquire(id, input, ttl = 300_000) {
    return transaction(() => {
      const inputHash = hash(safe(input)); const row = db.prepare("SELECT * FROM steps WHERE run=? AND id=?").get(runId, id);
      if (row && row.input_hash !== inputHash) fail("STEP_INPUT_DRIFT");
      if (row?.state === "complete") return { cached: true, artifact: decode(row.artifact) };
      if (row?.state === "running" && row.expires > now()) fail("STEP_LEASE_BUSY");
      const generation = (row?.generation || 0) + 1, owner = randomUUID();
      db.prepare("INSERT INTO steps VALUES(?,?,?,?,?,?,?,NULL) ON CONFLICT(run,id) DO UPDATE SET generation=excluded.generation,owner=excluded.owner,expires=excluded.expires,state=excluded.state")
        .run(runId, id, inputHash, generation, owner, now() + ttl, "running");
      return { id, inputHash, generation, owner, cached: false };
    });
  }
  function finish(lease, value) {
    const result = db.prepare("UPDATE steps SET state='complete',artifact=?,owner=NULL WHERE run=? AND id=? AND owner=? AND generation=? AND expires>? AND state='running'")
      .run(encode(value), runId, lease.id, lease.owner, lease.generation, now());
    if (result.changes !== 1) fail("STEP_LEASE_STALE");
    return decode(db.prepare("SELECT artifact FROM steps WHERE run=? AND id=?").get(runId, lease.id).artifact);
  }
  function release(lease) {
    db.prepare("UPDATE steps SET state='pending',owner=NULL WHERE run=? AND id=? AND owner=? AND generation=? AND state='running'")
      .run(runId, lease.id, lease.owner, lease.generation);
  }
  function reserve(id, request, estimateMicros, tokenReserve = 1) {
    integer(estimateMicros, 1, maxCostMicros);
    integer(tokenReserve, 1, maxTokens);
    return transaction(() => {
      const row = db.prepare("SELECT * FROM attempts WHERE run=? AND id=?").get(runId, id);
      if (row) {
        if (row.request_hash !== hash(request)) fail("ATTEMPT_INPUT_DRIFT");
        if (row.state === "received") return { cached: true, response: decode(row.response) };
        if (row.state === "failed") return { failed: true, code: row.code, usageKnown: !!row.usage };
        fail(row.state === "intent" ? "AMBIGUOUS_EGRESS_NO_RETRY" : "ATTEMPT_ALREADY_SETTLED", { priorCode: row.code });
      }
      const totals = summary();
      if (totals.attempts.some((attempt) => attempt.code === "PROVIDER_PAYMENT_REQUIRED")) fail("API_BALANCE_EXHAUSTED_STOP_ALL_WORK");
      if (totals.calls >= maxCalls || totals.reservedOrSettledMicros + estimateMicros > maxCostMicros
        || totals.reservedOrSettledTokens + tokenReserve > maxTokens) fail("PRODUCTION_BUDGET_EXHAUSTED");
      db.prepare("INSERT INTO attempts VALUES(?,?,?,'intent',?,NULL,NULL,NULL,NULL,?)").run(runId, id, hash(safe(request)), estimateMicros, tokenReserve);
      return { cached: false };
    });
  }
  function settle(id, { usage = null, costMicros = null, response = null, failureReceipt = null, code = null, definitelyNotSent = false } = {}) {
    if (usage) {
      safe(usage);
      for (const field of ["inputUnits", "outputUnits", "totalUnits"]) integer(usage[field]);
      if (usage.totalUnits < usage.inputUnits + usage.outputUnits) fail("USAGE_INVALID");
      if (costMicros !== null) integer(costMicros, 0, 1e9);
    } else if (costMicros !== null && !definitelyNotSent) fail("UNKNOWN_USAGE_MUST_RETAIN_RESERVE");
    const result = db.prepare("UPDATE attempts SET state=?,settled=?,usage=?,response=?,code=? WHERE run=? AND id=? AND state='intent'")
      .run(definitelyNotSent ? "not_sent" : response ? "received" : "failed",
        definitelyNotSent ? 0 : costMicros, usage ? encode(usage) : null,
        response || failureReceipt ? encode(response || failureReceipt) : null, code, runId, id);
    if (result.changes !== 1) fail("ATTEMPT_SETTLEMENT_CONFLICT");
  }
  return Object.freeze({ acquire, finish, release, reserve, settle, summary, close: () => db.close(),
    globalSummary: () => summary({ allRuns: true }),
    artifact: (id) => decode(db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'").get(runId, id)?.artifact) });
}
