import { factionLimitsCompatibleV1 } from './faction-budget-extension-v1.mjs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, fail } from '../skill-production/common.mjs';
import { FACTION_REVIEW_SOURCE_EXPANSION_BINDING_V1 as binding } from './faction-review-source-expansion-v1.mjs';

export const FACTION_REVIEW_SOURCE_EXPANSION_FILES_V1 = Object.freeze([
  'packages/skill-production-v3/faction-review-source-expansion-v1.mjs',
  'packages/skill-production-v3/faction-review-source-expansion-scope-v1.mjs',
  'packages/skill-production-v3/faction-review-slot-namespace-v1.mjs',
  'packages/skill-production-v3/faction-structured-review-runtime-v1.mjs',
  'packages/skill-production-v3/faction-continuation-v1.mjs',
  'packages/skill-evaluation/faction-structured-replay-v1.mjs',
  'packages/skill-evaluation/faction-production-replay-v1.mjs',
  'scripts/run-ticket-18-faction-strategy-production-v1.mjs',
  'scripts/check-ticket-18-faction-launch-readiness-v1.mjs',
  'scripts/verify-ticket-18-review-source-expansion-v1.mjs',
  'scripts/verify-ticket-18-source-expansion-runtime-v1.mjs',
  'scripts/verify-ticket-18-source-expansion-wiring-v1.mjs',
]);

export function factionReviewSourceExpansionRecipeV1(readiness) {
  verifySeal(readiness);
  if (readiness.version !== 'faction_review_source_expansion_wiring_readiness_v1'
    || readiness.bindingHash !== binding.hash
    || !readiness.passed || readiness.providerCalls !== 0 || !/^[a-f0-9]{64}$/u.test(readiness.runtimeDshProofHash || '')
    || !readiness.coldConsumerPassed || !readiness.ancestorPaidResponsesReused
    || !readiness.negativeBindingsPassed || !readiness.mainParametersBound
    || hash(readiness.codeHashes.map(r => r.file).sort()) !== hash([...FACTION_REVIEW_SOURCE_EXPANSION_FILES_V1].sort()))
    fail('FACTION_REVIEW_SOURCE_EXPANSION_READINESS_REQUIRED');
  return { reviewSourceExpansionBinding: binding, reviewSourceExpansionReadinessHash: readiness.hash };
}

export function validateFactionReviewSourceExpansionMigrationV1({ parent, next, readiness }) {
  const fields = ['reviewSourceExpansionBinding', 'reviewSourceExpansionReadinessHash'];
  if (!fields.some(f => parent[f] !== undefined || next[f] !== undefined)) {
    if (readiness) fail('FACTION_REVIEW_SOURCE_EXPANSION_MIGRATION_UNSCOPED');
    return null;
  }
  [parent, next].forEach(verifySeal);
  const expected = factionReviewSourceExpansionRecipeV1(readiness);
  if (fields.some(f => hash(next[f]) !== hash(expected[f]))
    || parent.reviewSourceExpansionBinding && verifySeal(parent.reviewSourceExpansionBinding).hash !== binding.hash
    || !parent.reviewSlotNamespaceBinding || hash(parent.reviewSlotNamespaceBinding) !== hash(next.reviewSlotNamespaceBinding)
    || !factionLimitsCompatibleV1(parent, next) || ['inputHashes', 'sourceBinding', 'modelHash', 'contextHash', 'dshBindingHash', 'executionModelBinding']
      .some(f => hash(parent[f]) !== hash(next[f]))) fail('FACTION_REVIEW_SOURCE_EXPANSION_MIGRATION_INVALID');
  for (const row of readiness.codeHashes)
    if (next.codeHashes.find(r => r.file === row.file)?.hash !== row.hash)
      fail('FACTION_REVIEW_SOURCE_EXPANSION_MIGRATION_CODE_DRIFT');
  return seal({ version: 'faction_review_source_expansion_migration_v1', bindingHash: binding.hash,
    readinessHash: readiness.hash, files: readiness.codeHashes.map(r => r.file),
    originalAttemptsCopied: 0, accountingReset: false, sourceRefreshed: false,
    semanticAcceptanceInherited: false, trainingTruth: false });
}

// Select exact attempts only from an already validated continuation lineage.
// The caller then verifies the rebuilt request/context and paid evidence before
// hydrating immutable artifacts. No attempts are copied or reset here.
export async function createFactionPriorReviewAttemptReaderV1({ root, filename, lineage }) {
  verifySeal(lineage);
  const recipes = new Map(), capabilities = new Map();
  for (const row of lineage.recipes) {
    if (!/^faction-v1-[a-f0-9]{20}$/u.test(row.runId) || recipes.has(row.runId))
      fail('FACTION_REVIEW_SOURCE_EXPANSION_LINEAGE_INVALID');
    const recipe = verifySeal(JSON.parse(await readFile(path.join(root,
      'build/ticket-18-faction-production-v1', row.runId, 'recipe.json'), 'utf8')));
    if (recipe.hash !== row.recipeHash || row.runId !== 'faction-v1-' + recipe.hash.slice(0, 20))
      fail('FACTION_REVIEW_SOURCE_EXPANSION_LINEAGE_DRIFT');
    recipes.set(row.runId, recipe);
  }
  let cursor = lineage.parentRunId;
  const visited = new Set();
  while (cursor) {
    const recipe = recipes.get(cursor);
    if (!recipe || visited.has(cursor)) fail('FACTION_REVIEW_SOURCE_EXPANSION_LINEAGE_INVALID');
    visited.add(cursor);
    if (recipe.continuation) {
      verifySeal(recipe.continuation);
      if (recipes.get(recipe.continuation.parentRunId)?.hash !== recipe.continuation.parentRecipeHash)
        fail('FACTION_REVIEW_SOURCE_EXPANSION_LINEAGE_DRIFT');
    }
    cursor = recipe.continuation?.parentRunId;
  }
  if (visited.size !== recipes.size) fail('FACTION_REVIEW_SOURCE_EXPANSION_FOREIGN_ANCESTOR');
  const decode = raw => verifySeal(JSON.parse(raw)).value;
  return ({ attemptId, invocationHash }) => {
    if (!/^[a-f0-9]{64}$/u.test(invocationHash || '') || attemptId !== 'structured-' + invocationHash.slice(0, 48))
      fail('FACTION_REVIEW_SOURCE_EXPANSION_ATTEMPT_ID_INVALID');
    const db = new DatabaseSync(filename, { readOnly: true });
    try {
      if (db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n)
        fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
      const matches = [];
      for (const [runId, recipe] of recipes) {
        const journal = db.prepare('SELECT recipe FROM runs WHERE id=?').get(runId);
        if (journal && journal.recipe !== recipe.hash) fail('FACTION_REVIEW_SOURCE_EXPANSION_JOURNAL_DRIFT');
        const attempt = db.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(runId, attemptId);
        if (attempt) {
          if (!journal) fail('FACTION_REVIEW_SOURCE_EXPANSION_JOURNAL_DRIFT');
          matches.push({ attempt, ownerRecipe: recipe });
        }
      }
      if (!matches.length) return null;
      if (matches.length !== 1) fail('FACTION_REVIEW_SOURCE_EXPANSION_PAID_OWNER_NOT_UNIQUE');
      const selected = matches[0], runId = selected.attempt.run;
      if (selected.attempt.state !== 'received'
        && !(selected.attempt.state === 'failed' && ['STRUCTURED_PROVIDER_SCHEMA_INVALID',
          'STRUCTURED_PROVIDER_AMBIGUOUS_SEND'].includes(selected.attempt.code)))
        return selected; // Unknown delivery stays isolated at the executing port.
      const read = suffix => {
        const row = db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'").get(runId, attemptId + suffix);
        if (!row) fail('FACTION_REVIEW_SOURCE_EXPANSION_PRIOR_EVIDENCE_MISSING');
        return decode(row.artifact);
      };
      const body = decode(selected.attempt.response), safeReceipt = body.usageReceipt || body;
      const capHash = safeReceipt.capabilityReceiptHash;
      if (!capabilities.has(capHash)) {
        for (const owner of recipes.keys()) {
          const rows = db.prepare("SELECT response FROM attempts WHERE run=? AND state='received' AND json_extract(response,'$.value.capabilityReceipt.receiptHash')=?")
            .all(owner, capHash);
          for (const row of rows) {
            const cap = decode(row.response).capabilityReceipt;
            if (capabilities.has(capHash) && hash(capabilities.get(capHash)) !== hash(cap))
              fail('FACTION_REVIEW_SOURCE_EXPANSION_CAPABILITY_DRIFT');
            capabilities.set(capHash, cap);
          }
        }
      }
      if (!capabilities.has(capHash)) fail('FACTION_REVIEW_SOURCE_EXPANSION_CAPABILITY_MISSING');
      return { ...selected, capability: capabilities.get(capHash), runtimeReceipt: read('.runtime-receipt'),
        ...(selected.attempt.state === 'received' ? { candidate: read('.candidate') }
          : selected.attempt.code === 'STRUCTURED_PROVIDER_SCHEMA_INVALID'
            ? { issue: read('.issue'), rejected: read('.rejected-candidate') }
            : { issue: read('.issue'), failureReceipt: body }) };
    } finally { db.close(); }
  };
}
