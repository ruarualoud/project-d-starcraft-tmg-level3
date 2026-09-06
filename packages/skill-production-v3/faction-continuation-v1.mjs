import { DatabaseSync } from 'node:sqlite';
import { seal, verifySeal, hash, fail } from '../skill-production/common.mjs';

export function inspectFactionContinuationV1({ filename, parentRunId, parent, parentReport, next }) {
  [parent, parentReport, next].forEach(verifySeal);
  if (parent.version !== 'faction_strategy_production_v1' || parentRunId !== 'faction-v1-' + parent.hash.slice(0, 20)
    || parentReport.runId !== parentRunId || parentReport.recipeHash !== parent.hash || !parentReport.failure) fail('FACTION_CONTINUATION_PARENT_INVALID');
  const strip = r => { const { hash: ignored, codeHashes, workflowReadinessHash, dshContextReadinessHash, continuation, ...body } = r; return body; };
  if (hash(strip(parent)) !== hash(strip(next))) fail('FACTION_CONTINUATION_CONTRACT_DRIFT');
  const allowed = new Set(['packages/skill-production-v3/faction-strategy-workflow-v1.mjs',
    'packages/skill-production-v3/faction-continuation-v1.mjs', 'scripts/run-ticket-18-faction-strategy-production-v1.mjs']);
  const changes = [...new Set([...parent.codeHashes, ...next.codeHashes].map(r => r.file))].filter(file =>
    parent.codeHashes.find(r => r.file === file)?.hash !== next.codeHashes.find(r => r.file === file)?.hash);
  if (changes.some(f => !allowed.has(f))) fail('FACTION_CONTINUATION_DEPENDENCY_DRIFT');
  const db = new DatabaseSync(filename, { readOnly: true });
  try {
    if (db.prepare('SELECT recipe FROM runs WHERE id=?').get(parentRunId)?.recipe !== parent.hash) fail('FACTION_CONTINUATION_JOURNAL_DRIFT');
    if (db.prepare("SELECT count(*) n FROM steps WHERE run=? AND state='running'").get(parentRunId).n) fail('FACTION_CONTINUATION_PARENT_RUNNING');
    if (db.prepare("SELECT count(*) n FROM attempts WHERE state='intent'").get().n) fail('AMBIGUOUS_EGRESS_NO_RETRY');
    if (db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n) fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
    const attempts = db.prepare('SELECT usage,settled,reserve,state,token_reserve FROM attempts WHERE run=?').all(parentRunId);
    const rows = db.prepare("SELECT id,input_hash,artifact FROM steps WHERE run=? AND state='complete'").all(parentRunId)
      .map(r => ({ id: r.id, inputHash: r.input_hash, artifact: verifySeal(JSON.parse(r.artifact)).value }));
    const began = rows.find(r => r.id === 'production-start')?.artifact.began;
    if (!Number.isSafeInteger(began)) fail('FACTION_CONTINUATION_START_MISSING');
    const ancestor = parent.continuation; if (ancestor) verifySeal(ancestor);
    const accounting = { calls: (ancestor?.accounting.calls || 0) + attempts.length,
      costMicros: (ancestor?.accounting.costMicros || 0) + attempts.reduce((n, r) => n + (r.settled ?? r.reserve), 0),
      tokens: (ancestor?.accounting.tokens || 0) + attempts.reduce((n, r) => n + (r.usage ? verifySeal(JSON.parse(r.usage)).value.totalUnits : r.state === 'not_sent' ? 0 : r.token_reserve), 0) };
    if (accounting.calls >= next.limits.maxCalls || accounting.costMicros >= next.limits.maxCostMicros
      || accounting.tokens >= next.limits.maxTokens) fail('FACTION_CONTINUATION_BUDGET_EXHAUSTED');
    // Reuse paid raw role outputs only. Candidate/review decisions and typed
    // issue journals are reconstructed under the current validators.
    const steps = rows.filter(r => r.artifact?.roleId === r.id && r.artifact?.loop?.transcript);
    const manifest = seal({ parentRunId, parentRecipeHash: parent.hash, nextBaseRecipeHash: next.hash,
      parentStart: began, accounting, changes,
      reusable: steps.map(r => ({ id: r.id, inputHash: r.inputHash, artifactHash: hash(r.artifact) })),
      policy: 'exact_input_raw_roles_only_no_attempt_copy_no_acceptance_inheritance', trainingTruth: false });
    return { manifest, steps };
  } finally { db.close(); }
}
