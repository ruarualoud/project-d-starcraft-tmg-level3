import { factionLimitsCompatibleV1 } from './faction-budget-extension-v1.mjs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, fail } from '../skill-production/common.mjs';
import { FACTION_STRUCTURAL_JSON_REVIEW_BINDING_V1 as binding } from './faction-structural-json-runtime-v1.mjs';

export const FACTION_STRUCTURAL_JSON_RECIPE_FIELDS_V1 = Object.freeze([
  'structuralJsonReviewBinding', 'structuralJsonReviewOrigins', 'structuralJsonReviewReadinessHash']);
export const FACTION_STRUCTURAL_JSON_FILES_V1 = Object.freeze([
  'packages/structured-generation/adapters/structural-json-recovery-v1.mjs',
  'packages/structured-generation/authenticated-structural-json-recovery-v1.mjs',
  'packages/skill-production-v3/faction-structural-json-environment-v1.mjs',
  'packages/skill-production-v3/faction-structural-json-runtime-v1.mjs',
  'packages/skill-production-v3/faction-structural-json-scope-v1.mjs',
  'packages/skill-production-v3/faction-structural-json-lane-v1.mjs',
  'packages/skill-production-v3/faction-wire-observation-v1.mjs',
  'packages/skill-production/production-failure-routing-v1.mjs',
  'packages/skill-production-v3/faction-continuation-v1.mjs',
  'packages/skill-evaluation/faction-production-replay-v1.mjs',
  'packages/skill-evaluation/faction-structured-replay-v1.mjs',
  'packages/skill-evaluation/faction-replay-runtime-stack-v1.mjs',
  'scripts/run-ticket-18-faction-strategy-production-v1.mjs',
  'scripts/verify-ticket-18-structural-json-recovery-v1.mjs',
  'scripts/verify-ticket-18-authenticated-structural-json-v1.mjs',
  'scripts/verify-ticket-18-structural-json-wiring-v1.mjs',
  'scripts/check-ticket-18-faction-launch-readiness-v1.mjs',
]);
const fields = FACTION_STRUCTURAL_JSON_RECIPE_FIELDS_V1;
const sortOrigins = origins => [...origins].sort((a, b) => (a.runId + '/' + a.attemptId).localeCompare(b.runId + '/' + b.attemptId));
export function assertFactionStructuralJsonRecipeV1(recipe) {
  if (!fields.some(f => recipe[f] !== undefined)) return false;
  if (fields.some(f => recipe[f] === undefined) || verifySeal(recipe.structuralJsonReviewBinding).hash !== binding.hash
    || !/^[a-f0-9]{64}$/u.test(recipe.structuralJsonReviewReadinessHash || '')
    || !Array.isArray(recipe.structuralJsonReviewOrigins) || !recipe.structuralJsonReviewOrigins.length
    || hash(sortOrigins(recipe.structuralJsonReviewOrigins)) !== hash(recipe.structuralJsonReviewOrigins))
    fail('FACTION_STRUCTURAL_JSON_RECIPE_INVALID');
  const seen = new Set();
  for (const o of recipe.structuralJsonReviewOrigins) {
    if (hash(Object.keys(o).sort()) !== hash(['attemptId', 'issueHash', 'runId'])
      || !/^faction-v1-[a-f0-9]{20}$/u.test(o.runId || '')
      || !/^structured-[a-f0-9]{48}$/u.test(o.attemptId || '') || !/^[a-f0-9]{64}$/u.test(o.issueHash || '')
      || seen.has(o.runId + '/' + o.attemptId)) fail('FACTION_STRUCTURAL_JSON_RECIPE_ORIGIN_INVALID');
    seen.add(o.runId + '/' + o.attemptId);
  }
  return true;
}

// Explicit ancestor selection from an already verified lineage. The original
// issues remain failures; selecting one does not assert its grammar is fixable.
export async function loadFactionStructuralJsonScopeV1({ root, filename, parentRunId, lineage, readiness }) {
  [lineage, readiness].forEach(verifySeal);
  if (lineage.parentRunId !== parentRunId || readiness.version !== 'faction_structural_json_wiring_readiness_v1'
    || !readiness.passed || !readiness.fullReplayConsumerPassed || !readiness.dryAndLiveFactoryPassed
    || readiness.providerCalls !== 0 || !readiness.authenticatedDshProofHash)
    fail('FACTION_STRUCTURAL_JSON_READINESS_REQUIRED');
  const parent = verifySeal(JSON.parse(await readFile(path.join(root,
    'build/ticket-18-faction-production-v1', parentRunId, 'recipe.json'), 'utf8')));
  if (!lineage.recipes.some(r => r.runId === parentRunId && r.recipeHash === parent.hash)
    || !lineage.recipes.some(r => r.runId === readiness.origin.runId)) fail('FACTION_STRUCTURAL_JSON_FOREIGN_LINEAGE');
  const origins = new Map();
  const add = o => {
    const key = o.runId + '/' + o.attemptId;
    if (origins.has(key) && hash(origins.get(key)) !== hash(o)) fail('FACTION_STRUCTURAL_JSON_ORIGIN_CONFLICT');
    origins.set(key, o);
  };
  if (assertFactionStructuralJsonRecipeV1(parent)) parent.structuralJsonReviewOrigins.forEach(add);
  else add(readiness.origin);
  const db = new DatabaseSync(filename, { readOnly: true });
  try {
    if (db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n)
      fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
    const read = raw => verifySeal(JSON.parse(raw)).value;
    for (const row of db.prepare("SELECT artifact FROM steps WHERE run=? AND state='complete' AND json_extract(artifact,'$.value.version')='structured_wire_runtime_v2.issue'").all(parentRunId)) {
      const issue = read(row.artifact);
      if (issue.outputContractRef?.hash === binding.outputContractRef.hash
        && /\.review-target-batch-v1\.(?:supportive|adversarial)\.[0-3](?:\.phase-seed-v1\.[a-f0-9]{20})?\.[0-9]+(?:\.source-context-expansion\.1)?$/u.test(issue.invocation?.roleRef?.id || ''))
        add({ runId: issue.runId, attemptId: issue.attemptId, issueHash: issue.hash });
    }
    for (const o of origins.values()) {
      const owner = lineage.recipes.find(r => r.runId === o.runId);
      const row = db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'").get(o.runId, o.attemptId + '.wire-issue-v2');
      const attempt = db.prepare('SELECT state,code FROM attempts WHERE run=? AND id=?').get(o.runId, o.attemptId);
      if (!owner || db.prepare('SELECT recipe FROM runs WHERE id=?').get(o.runId)?.recipe !== owner.recipeHash
        || !row || read(row.artifact).hash !== o.issueHash || attempt?.state !== 'failed'
        || attempt.code !== 'STRUCTURED_PROVIDER_SCHEMA_INVALID') fail('FACTION_STRUCTURAL_JSON_PAID_ORIGIN_DRIFT');
    }
  } finally { db.close(); }
  const recipeFields = { structuralJsonReviewBinding: binding, structuralJsonReviewOrigins: sortOrigins([...origins.values()]),
    structuralJsonReviewReadinessHash: readiness.hash };
  assertFactionStructuralJsonRecipeV1(recipeFields);
  return { recipeFields, lineageHash: lineage.hash };
}

export function validateFactionStructuralJsonMigrationV1({ parent, next, readiness, scope }) {
  if (!fields.some(f => parent[f] !== undefined || next[f] !== undefined)) {
    if (readiness || scope) fail('FACTION_STRUCTURAL_JSON_MIGRATION_UNSCOPED');
    return null;
  }
  [parent, next, readiness].forEach(verifySeal);
  if (!assertFactionStructuralJsonRecipeV1(next) || !readiness.passed
    || readiness.version !== 'faction_structural_json_wiring_readiness_v1'
    || !readiness.fullReplayConsumerPassed || !readiness.dryAndLiveFactoryPassed || readiness.providerCalls !== 0
    || hash(next.structuralJsonReviewOrigins) !== hash(scope?.recipeFields.structuralJsonReviewOrigins)
    || next.structuralJsonReviewReadinessHash !== readiness.hash
    || hash(readiness.codeHashes.map(r => r.file).sort()) !== hash([...FACTION_STRUCTURAL_JSON_FILES_V1].sort())
    || !factionLimitsCompatibleV1(parent, next) || ['inputHashes', 'sourceBinding', 'modelHash', 'contextHash', 'dshBindingHash'].some(f => hash(parent[f]) !== hash(next[f])))
    fail('FACTION_STRUCTURAL_JSON_MIGRATION_INVALID');
  if (assertFactionStructuralJsonRecipeV1(parent)
    && parent.structuralJsonReviewOrigins.some(o => !next.structuralJsonReviewOrigins.some(n => hash(n) === hash(o))))
    fail('FACTION_STRUCTURAL_JSON_MIGRATION_ORIGIN_REMOVED');
  for (const r of readiness.codeHashes)
    if (next.codeHashes.find(n => n.file === r.file)?.hash !== r.hash) fail('FACTION_STRUCTURAL_JSON_MIGRATION_CODE_DRIFT');
  return seal({ version: 'faction_structural_json_migration_v1', bindingHash: binding.hash,
    readinessHash: readiness.hash, scopeLineageHash: scope.lineageHash, files: readiness.codeHashes.map(r => r.file),
    originalAttemptsCopied: 0, accountingReset: false, semanticAcceptanceInherited: false, trainingTruth: false });
}
