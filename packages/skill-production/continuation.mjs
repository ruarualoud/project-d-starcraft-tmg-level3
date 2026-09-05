import { DatabaseSync } from "node:sqlite";
import { hash, seal, verifySeal, fail } from "./common.mjs";

// Explicit, audited workflow correction. This is not version compatibility:
// source, semantic gates, model, tools and budgets must remain identical.
const ALLOWED_CHANGES = new Set([
  "packages/skill-production/runtime.mjs", "packages/skill-production/continuation.mjs",
  "scripts/run-ticket-17-production-pilot-v1.mjs", "scripts/verify-ticket-17-production-redesign-v1.mjs",
]);
export function inspectContinuation(filename, parentRunId, parent, next) {
  verifySeal(parent); verifySeal(next);
  if (!/^pilot-[a-f0-9]{20}$/.test(parentRunId) || parentRunId !== "pilot-" + parent.hash.slice(0, 20)) fail("CONTINUATION_PARENT_INVALID");
  const { hash: pHash, codeHashes: pCodes, continuation: ancestor, ...pBody } = parent;
  const { hash: nHash, codeHashes: nCodes, ...nBody } = next;
  if (hash(pBody) !== hash(nBody)) fail("CONTINUATION_CONTRACT_DRIFT");
  const files = [...new Set([...pCodes, ...nCodes].map((r) => r.file))];
  const changes = files.filter((file) => pCodes.find((r) => r.file === file)?.hash !== nCodes.find((r) => r.file === file)?.hash);
  if (changes.some((file) => !ALLOWED_CHANGES.has(file))) fail("CONTINUATION_DEPENDENCY_DRIFT");
  const db = new DatabaseSync(filename, { readOnly: true });
  try {
    if (db.prepare("SELECT recipe FROM runs WHERE id=?").get(parentRunId)?.recipe !== parent.hash) fail("CONTINUATION_PARENT_RECIPE_MISMATCH");
    if (db.prepare("SELECT count(*) AS n FROM steps WHERE run=? AND state='running'").get(parentRunId).n) fail("CONTINUATION_PARENT_RUNNING");
    const attempts = db.prepare("SELECT state,code,usage,settled,reserve,token_reserve FROM attempts WHERE run=?").all(parentRunId);
    if (attempts.some((a) => a.state === "intent")) fail("AMBIGUOUS_EGRESS_NO_RETRY");
    if (attempts.some((a) => a.code === "PROVIDER_PAYMENT_REQUIRED")) fail("API_BALANCE_EXHAUSTED_STOP_ALL_WORK");
    const steps = db.prepare("SELECT id,input_hash,artifact FROM steps WHERE run=? AND state='complete'").all(parentRunId)
      .map((r) => ({ id: r.id, inputHash: r.input_hash, artifact: verifySeal(JSON.parse(r.artifact)).value }));
    const parentStart = steps.find((r) => r.id === "pilot-start")?.artifact.began;
    if (!Number.isSafeInteger(parentStart)) fail("CONTINUATION_START_MISSING");
    if (ancestor) verifySeal(ancestor);
    const accounting = { calls: attempts.length + (ancestor?.accounting.calls || 0),
      costMicros: attempts.reduce((n, a) => n + (a.settled ?? a.reserve), 0) + (ancestor?.accounting.costMicros || 0),
      tokens: attempts.reduce((n, a) => n + (a.usage ? verifySeal(JSON.parse(a.usage)).value.totalUnits : a.state === "not_sent" ? 0 : a.token_reserve), 0) + (ancestor?.accounting.tokens || 0) };
    const manifest = seal({ parentRunId, parentRecipeHash: parent.hash, nextBaseRecipeHash: next.hash,
      changes: changes.map((file) => ({ file, before: pCodes.find((r) => r.file === file)?.hash || null,
        after: nCodes.find((r) => r.file === file)?.hash || null })), parentStart, accounting,
      reusable: steps.filter((r) => r.id !== "pilot-start" && !r.id.startsWith("inherited.") && !r.id.endsWith(".chapter")).map((r) =>
        ({ id: r.id, inputHash: r.inputHash, artifactHash: hash(r.artifact) })),
      policy: "exact_input_only_revalidate_every_chapter_no_attempt_copy", trainingTruth: false });
    return { manifest, steps };
  } finally { db.close(); }
}
export function withCheckpointContinuation(store, continuation) {
  verifySeal(continuation.manifest);
  const records = new Map(continuation.steps.map((r) => [r.id, r]));
  const authorized = new Map(continuation.manifest.reusable.map((r) => [r.id, r]));
  return Object.freeze({ ...store, acquire(id, input, ttl) {
    const lease = store.acquire(id, input, ttl);
    if (lease.cached) return lease;
    const row = records.get(id), permit = authorized.get(id);
    if (!row || !permit || hash(input) !== permit.inputHash || row.inputHash !== permit.inputHash) return lease;
    if (hash(row.artifact) !== permit.artifactHash) { store.release(lease); fail("CONTINUATION_ARTIFACT_TAMPERED"); }
    const receipt = store.acquire("inherited." + id, { manifestHash: continuation.manifest.hash, id });
    if (!receipt.cached) store.finish(receipt, { parentRunId: continuation.manifest.parentRunId,
      parentRecipeHash: continuation.manifest.parentRecipeHash, inputHash: permit.inputHash,
      artifactHash: permit.artifactHash, newPhysicalCalls: 0 });
    return { cached: true, artifact: store.finish(lease, row.artifact) };
  } });
}
