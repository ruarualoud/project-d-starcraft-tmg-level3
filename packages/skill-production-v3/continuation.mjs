import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, fail } from '../skill-production/common.mjs';

const WORKFLOW_FILES = new Set(['packages/skill-production-v3/runtime.mjs',
  'packages/skill-production-v3/citation-repair.mjs', 'packages/skill-production-v3/continuation.mjs',
  'packages/skill-production-v3/structure-repair.mjs', 'scripts/verify-ticket-18-claim-packing-v3.mjs',
  'packages/skill-production-v3/address-repair.mjs', 'scripts/verify-ticket-18-address-repair-v3.mjs',
  'scripts/run-ticket-18-overall-rules-v3.mjs', 'scripts/verify-ticket-18-production-v3.mjs',
  'scripts/verify-ticket-18-dsh-full-context-v3.mjs', 'scripts/verify-ticket-18-citation-repair-v3.mjs',
  'scripts/verify-ticket-18-continuation-v3.mjs', 'packages/skill-production-v3/external-repair.mjs',
  'scripts/run-ticket-18-external-repair-v3.mjs', 'scripts/verify-ticket-18-external-findings-v3.mjs',
  'scripts/verify-ticket-18-no-progress-v3.mjs']);
const EXTERNAL_ONLY_FILES = new Set(['packages/skill-production-v3/repair-gate.mjs']);
const OVERALL_VERSION = 'overall-rules-production-v3-complete-and-exam';
const OVERALL_ONLY_FILES = new Set(['packages/skill-production/model.mjs', 'scripts/run-ticket-18-overall-production-v3.mjs',
  'scripts/verify-ticket-18-output-capacity-v3.mjs', 'scripts/verify-ticket-18-tutor-artifact-v3.mjs']);

export function inspectV3Continuation({ filename, parentRunId, parent, next, parentReports, nextReports }) {
  [parent, next, ...parentReports, ...nextReports].forEach(verifySeal);
  const overall = parent.version === OVERALL_VERSION;
  if (parentRunId !== (overall ? 'overall-v3-' : 'rules-v3-') + parent.hash.slice(0, 20)) fail('V3_CONTINUATION_PARENT_INVALID');
  const identity = recipe => {
    const { hash: h, mainReadinessHash, contractReadinessHash, capacityReadinessHash, auditReadinessHash, outputCapacityReadinessHash, codeHashes, continuation, ...body } = recipe;
    return body;
  };
  if (hash(identity(parent)) !== hash(identity(next))) fail('V3_CONTINUATION_IDENTITY_DRIFT');
  for (const [recipe, reports] of [[parent, parentReports], [next, nextReports]]) {
    for (const field of ['mainReadinessHash', 'contractReadinessHash', 'capacityReadinessHash',
      ...(recipe.version === 'v3-external-source-repair' ? ['auditReadinessHash'] : []),
      ...(recipe.outputCapacityReadinessHash ? ['outputCapacityReadinessHash'] : [])]) {
      if (!reports.some(r => r.hash === recipe[field] && r.passed)) fail('V3_CONTINUATION_READINESS_MISSING');
    }
  }
  const codes = (recipe, reports) => {
    const result = new Map();
    for (const row of [recipe, ...reports].flatMap(r => r.codeHashes || [])) {
      if (result.has(row.file) && result.get(row.file) !== row.hash) fail('V3_CONTINUATION_CODE_INCONSISTENT');
      result.set(row.file, row.hash);
    }
    return result;
  };
  const oldCodes = codes(parent, parentReports), newCodes = codes(next, nextReports);
  const changes = [...new Set([...oldCodes.keys(), ...newCodes.keys()])].filter(file => oldCodes.get(file) !== newCodes.get(file));
  if (changes.some(file => !WORKFLOW_FILES.has(file)
    && !(parent.version === 'v3-external-source-repair' && EXTERNAL_ONLY_FILES.has(file))
    && !(overall && OVERALL_ONLY_FILES.has(file)))) fail('V3_CONTINUATION_UNAPPROVED_DEPENDENCY_DRIFT');
  const db = new DatabaseSync(filename, { readOnly: true });
  try {
    if (db.prepare('SELECT recipe FROM runs WHERE id=?').get(parentRunId)?.recipe !== parent.hash) fail('V3_CONTINUATION_STORED_RECIPE_DRIFT');
    if (db.prepare("SELECT count(*) AS n FROM steps WHERE run=? AND state='running'").get(parentRunId).n) fail('V3_CONTINUATION_PARENT_RUNNING');
    const attempts = db.prepare('SELECT * FROM attempts WHERE run=?').all(parentRunId);
    if (attempts.some(a => a.state === 'intent')) fail('AMBIGUOUS_EGRESS_NO_RETRY');
    if (attempts.some(a => a.code === 'PROVIDER_PAYMENT_REQUIRED')) fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
    const steps = db.prepare("SELECT id,input_hash,artifact FROM steps WHERE run=? AND state='complete'").all(parentRunId)
      .map(row => ({ id: row.id, inputHash: row.input_hash, artifact: verifySeal(JSON.parse(row.artifact)).value }));
    const parentStart = steps.find(s => s.id === 'production-start')?.artifact.began;
    if (!Number.isSafeInteger(parentStart)) fail('V3_CONTINUATION_START_MISSING');
    const ancestor = parent.continuation; if (ancestor) verifySeal(ancestor);
    const accounting = { calls: attempts.length + (ancestor?.accounting.calls || 0),
      costMicros: attempts.reduce((n, a) => n + (a.settled ?? a.reserve), 0) + (ancestor?.accounting.costMicros || 0),
      tokens: attempts.reduce((n, a) => n + (a.usage ? verifySeal(JSON.parse(a.usage)).value.totalUnits
        : a.state === 'not_sent' ? 0 : a.token_reserve), 0) + (ancestor?.accounting.tokens || 0) };
    const manifest = seal({ parentRunId, parentRecipeHash: parent.hash, nextBaseRecipeHash: next.hash, parentStart, accounting,
      changes: changes.map(file => ({ file, before: oldCodes.get(file) || null, after: newCodes.get(file) || null })),
      reusable: steps.filter(s => s.artifact.output && s.artifact.roleId === s.id && !s.id.startsWith('inherited.')
        || parent.version === 'v3-external-source-repair' && s.id === 'external-audit-probes.before')
        .map(s => ({ id: s.id, inputHash: s.inputHash, artifactHash: hash(s.artifact) })),
      policy: 'raw_roles_exact_input_only_recompute_inventory_issues_final_acceptance_no_attempt_copy', trainingTruth: false });
    return { manifest, steps };
  } finally { db.close(); }
}
