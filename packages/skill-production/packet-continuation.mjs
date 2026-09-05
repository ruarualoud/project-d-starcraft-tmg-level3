import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, fail } from './common.mjs';

// Raw role outputs may be reused across an explicitly recorded workflow
// correction. Final packet acceptance is NEVER inherited: new validators run.
const WORKFLOW_FILES = new Set([
  'packages/skill-production/packet-contract.mjs', 'packages/skill-production/packet-runtime.mjs',
  'packages/skill-production/packet-continuation.mjs',
  'scripts/run-ticket-18-overall-rules-v2.mjs', 'scripts/verify-ticket-18-packet-production-v1.mjs',
  'scripts/verify-ticket-18-production-readiness-v1.mjs', 'scripts/verify-ticket-18-packet-continuation-v1.mjs',
]);
export function inspectPacketContinuation({ filename, parentRunId, parent, next,
  parentReadiness, nextReadiness, parentExecutionReadiness, nextExecutionReadiness }) {
  [parent, next, parentReadiness, nextReadiness, parentExecutionReadiness, nextExecutionReadiness].forEach(verifySeal);
  if (parentRunId !== 'rules-v2-' + parent.hash.slice(0, 20)) fail('PACKET_CONTINUATION_PARENT_INVALID');
  if (parent.readinessHash !== parentReadiness.hash || next.readinessHash !== nextReadiness.hash
    || parent.productionReadinessHash !== parentExecutionReadiness.hash || next.productionReadinessHash !== nextExecutionReadiness.hash) fail('PACKET_CONTINUATION_READINESS_BINDING_INVALID');
  const identity = recipe => {
    const { hash: h, readinessHash, productionReadinessHash, continuation, ...body } = recipe;
    return body;
  };
  if (hash(identity(parent)) !== hash(identity(next))) fail('PACKET_CONTINUATION_SEMANTIC_DEPENDENCY_DRIFT');
  const codeMap = (...reports) => {
    const map = new Map();
    for (const r of reports) for (const row of r.codeHashes) {
      if (map.has(row.file) && map.get(row.file) !== row.hash) fail('PACKET_CONTINUATION_INCONSISTENT_READINESS');
      map.set(row.file, row.hash);
    }
    return map;
  };
  const previousCodes = codeMap(parentReadiness, parentExecutionReadiness), nextCodes = codeMap(nextReadiness, nextExecutionReadiness);
  const changes = [...new Set([...previousCodes.keys(), ...nextCodes.keys()])]
    .filter(file => previousCodes.get(file) !== nextCodes.get(file));
  if (changes.some(file => !WORKFLOW_FILES.has(file))) fail('PACKET_CONTINUATION_UNREVIEWED_CODE_DRIFT');
  const db = new DatabaseSync(filename, { readOnly: true });
  try {
    if (db.prepare('SELECT recipe FROM runs WHERE id=?').get(parentRunId)?.recipe !== parent.hash) fail('PACKET_CONTINUATION_STORED_RECIPE_MISMATCH');
    if (db.prepare("SELECT count(*) AS n FROM steps WHERE run=? AND state='running'").get(parentRunId).n) fail('PACKET_CONTINUATION_PARENT_RUNNING');
    const attempts = db.prepare('SELECT * FROM attempts WHERE run=?').all(parentRunId);
    if (attempts.some(a => a.state === 'intent')) fail('AMBIGUOUS_EGRESS_NO_RETRY');
    if (attempts.some(a => a.code === 'PROVIDER_PAYMENT_REQUIRED')) fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
    const steps = db.prepare("SELECT id,input_hash,artifact FROM steps WHERE run=? AND state='complete'").all(parentRunId)
      .map(row => ({ id: row.id, inputHash: row.input_hash, artifact: verifySeal(JSON.parse(row.artifact)).value }));
    const parentStart = steps.find(s => s.id === 'production-start')?.artifact.began;
    if (!Number.isSafeInteger(parentStart)) fail('PACKET_CONTINUATION_START_MISSING');
    const ancestor = parent.continuation;
    if (ancestor) verifySeal(ancestor);
    const accounting = { calls: attempts.length + (ancestor?.accounting.calls || 0),
      costMicros: attempts.reduce((n, a) => n + (a.settled ?? a.reserve), 0) + (ancestor?.accounting.costMicros || 0),
      tokens: attempts.reduce((n, a) => n + (a.usage ? verifySeal(JSON.parse(a.usage)).value.totalUnits : a.state === 'not_sent' ? 0 : a.token_reserve), 0)
        + (ancestor?.accounting.tokens || 0) };
    const manifest = seal({ parentRunId, parentRecipeHash: parent.hash, nextBaseRecipeHash: next.hash,
      parentStart, accounting, changes: changes.map(file => ({ file, before: previousCodes.get(file) || null, after: nextCodes.get(file) || null })),
      reusable: steps.filter(s => s.artifact.output && s.artifact.roleId === s.id && !s.id.startsWith('inherited.'))
        .map(s => ({ id: s.id, inputHash: s.inputHash, artifactHash: hash(s.artifact) })),
      policy: 'raw_role_outputs_exact_input_only_new_validator_and_no_final_acceptance_copy', trainingTruth: false });
    return { manifest, steps };
  } finally { db.close(); }
}
