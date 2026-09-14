import { factionLimitsCompatibleV1 } from './faction-budget-extension-v1.mjs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, fail } from '../skill-production/common.mjs';
import { readFactionTeachFailureEvidenceV1 } from '../skill-evaluation/faction-teach-failure-evidence-v1.mjs';
import { FACTION_FIELD_RECOVERY_BINDING_V1, FACTION_FIELD_RECOVERY_BINDING_V2,
  FACTION_FIELD_RECOVERY_BINDING_V3 as binding } from './faction-field-recovery-v1.mjs';
import { createFactionReviewSchemaRepairContextCapsuleV1 } from './faction-review-context-capsule-v1.mjs';

export const FACTION_FIELD_RECOVERY_RECIPE_FIELDS_V1 = Object.freeze([
  'fieldRecoveryBinding', 'fieldRecoveryOrigins', 'fieldRecoveryReadinessHash']);
export const FACTION_FIELD_RECOVERY_FILES_V1 = Object.freeze([
  'packages/structured-generation/field-codec-v1.mjs',
  'packages/skill-production-v3/faction-field-recovery-v1.mjs',
  'packages/skill-production-v3/faction-field-recovery-scope-v1.mjs',
  'packages/skill-production-v3/faction-field-recovery-lane-v1.mjs',
  'packages/skill-production-v3/faction-continuation-v1.mjs',
  'packages/skill-evaluation/faction-production-replay-v1.mjs',
  'packages/skill-evaluation/faction-structured-replay-v1.mjs',
  'scripts/run-ticket-18-faction-strategy-production-v1.mjs',
  'scripts/check-ticket-18-faction-launch-readiness-v1.mjs',
  'scripts/verify-ticket-18-field-recovery-wiring-v1.mjs',
]);
const fields = FACTION_FIELD_RECOVERY_RECIPE_FIELDS_V1;
const decode = raw => verifySeal(JSON.parse(raw)).value;
const sorted = rows => [...rows].sort((a, b) => (a.runId + '/' + a.attemptId).localeCompare(b.runId + '/' + b.attemptId));
const originRef = e => ({ runId: e.attempt.run, attemptId: e.attempt.id, rejectedCandidateHash: e.rejected.hash });

export function assertFactionFieldRecoveryRecipeV1(recipe) {
  if (!fields.some(f => recipe[f] !== undefined)) return false;
  const suppliedBinding = verifySeal(recipe.fieldRecoveryBinding);
  if (fields.some(f => recipe[f] === undefined)
    || ![FACTION_FIELD_RECOVERY_BINDING_V1.hash, FACTION_FIELD_RECOVERY_BINDING_V2.hash, binding.hash]
      .includes(suppliedBinding.hash)
    || !/^[a-f0-9]{64}$/u.test(recipe.fieldRecoveryReadinessHash || '')
    || !Array.isArray(recipe.fieldRecoveryOrigins)
    || hash(sorted(recipe.fieldRecoveryOrigins)) !== hash(recipe.fieldRecoveryOrigins))
    fail('FACTION_FIELD_RECOVERY_RECIPE_INVALID');
  const seen = new Set();
  for (const o of recipe.fieldRecoveryOrigins) {
    const key = o.runId + '/' + o.attemptId;
    if (hash(Object.keys(o).sort()) !== hash(['attemptId', 'rejectedCandidateHash', 'runId'])
      || !/^faction-v1-[a-f0-9]{20}$/u.test(o.runId || '')
      || !/^structured-[a-f0-9]{48}$/u.test(o.attemptId || '')
      || !/^[a-f0-9]{64}$/u.test(o.rejectedCandidateHash || '') || seen.has(key))
      fail('FACTION_FIELD_RECOVERY_ORIGIN_INVALID');
    seen.add(key);
  }
  return true;
}

// SQLite step leases are CAS ownership windows, not durable Provider intent.
// An expired local lease is safe for acquire() to take over; a live/unknown
// lease or any Provider intent remains non-terminal and fail-closed.
export function classifyFactionFieldRecoveryOwnerActivityV1({ attempts, steps, now = Date.now() }) {
  if (!Array.isArray(attempts) || !Array.isArray(steps) || !Number.isFinite(now))
    throw new TypeError('Faction field-recovery owner activity is invalid');
  const intentAttemptIds = attempts.filter(row => row?.state === 'intent')
    .map(row => String(row.id || '')).sort();
  const running = steps.filter(row => row?.state === 'running');
  const expiredRunningStepIds = running
    .filter(row => Number.isFinite(row.expires) && row.expires <= now)
    .map(row => String(row.id || '')).sort();
  const liveRunningStepIds = running
    .filter(row => !Number.isFinite(row.expires) || row.expires > now)
    .map(row => String(row.id || '')).sort();
  return Object.freeze({ intentAttemptIds: Object.freeze(intentAttemptIds),
    liveRunningStepIds: Object.freeze(liveRunningStepIds),
    expiredRunningStepIds: Object.freeze(expiredRunningStepIds),
    terminal: intentAttemptIds.length === 0 && liveRunningStepIds.length === 0 });
}

function openOwners({ filename, recipes, currentRunId = null, allowCurrentRunning = false }) {
  const db = new DatabaseSync(filename, { readOnly: true });
  try {
    if (db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n)
      fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
    const owners = new Map();
    for (const recipe of recipes) {
      verifySeal(recipe);
      const id = 'faction-v1-' + recipe.hash.slice(0, 20);
      const journal = db.prepare('SELECT recipe FROM runs WHERE id=?').get(id);
      if (owners.has(id) || journal && journal.recipe !== recipe.hash
        || !journal && (!recipe.continuation
          || db.prepare('SELECT count(*) n FROM attempts WHERE run=?').get(id).n
          || db.prepare('SELECT count(*) n FROM steps WHERE run=?').get(id).n))
        fail('FACTION_FIELD_RECOVERY_OWNER_DRIFT');
      const activity = classifyFactionFieldRecoveryOwnerActivityV1({
        attempts: db.prepare('SELECT id,state FROM attempts WHERE run=?').all(id),
        steps: db.prepare('SELECT id,state,expires FROM steps WHERE run=?').all(id),
      });
      if (activity.intentAttemptIds.length
        || !(allowCurrentRunning && id === currentRunId) && activity.liveRunningStepIds.length)
        fail('FACTION_FIELD_RECOVERY_ANCESTOR_NOT_TERMINAL');
      owners.set(id, recipe);
    }
    for (let i = 0; i < recipes.length; i++) {
      const r = recipes[i], next = recipes[i + 1];
      if (r.continuation) verifySeal(r.continuation);
      if (next ? r.continuation?.parentRecipeHash !== next.hash
        || r.continuation.parentRunId !== 'faction-v1-' + next.hash.slice(0, 20) : Boolean(r.continuation))
        fail('FACTION_FIELD_RECOVERY_LINEAGE_INVALID');
    }
    return { db, owners };
  } catch (error) { db.close(); throw error; }
}

// Only actual attempt owners count. Copied rejected-candidate steps without
// their original paid row never become new evidence or a new retry allowance.
function readFailures(db, owners) {
  const capabilities = new Map(), failures = [];
  for (const id of owners.keys()) {
    for (const row of db.prepare("SELECT response FROM attempts WHERE run=? AND state='received'").all(id)) {
      const response = decode(row.response), cap = response?.ok === true && response.capabilityReceipt;
      if (!cap) continue;
      if (capabilities.has(cap.receiptHash) && hash(capabilities.get(cap.receiptHash)) !== hash(cap))
        fail('FACTION_FIELD_RECOVERY_CAPABILITY_CONFLICT');
      capabilities.set(cap.receiptHash, cap);
    }
    for (const row of db.prepare("SELECT a.id,s.artifact FROM attempts a JOIN steps s ON s.run=a.run AND s.id=a.id||'.rejected-candidate' WHERE a.run=? AND a.state='failed' AND a.code='STRUCTURED_PROVIDER_SCHEMA_INVALID' AND s.state='complete'").all(id)) {
      const rejected = decode(row.artifact);
      if (rejected.outputContractRef?.hash !== binding.outputContractRef.hash) continue;
      failures.push({ runId: id, attemptId: row.id, rejected });
    }
  }
  return { capabilities, failures };
}

// Shared read-only selection for live, dry and cold consumers; each invocation
// opens the journal anew. Binding selection is explicit, paid authentication
// and Host materialization are separate and happen after this lookup.
export function readFactionFieldRecoveryEvidenceV1({ filename, recipe, ancestors, prepared,
  currentRunId = null, allowCurrentRunning = false, expectedMaterialization = null }) {
  if (!assertFactionFieldRecoveryRecipeV1(recipe)) fail('FACTION_FIELD_RECOVERY_BINDING_REQUIRED');
  if (currentRunId && currentRunId !== 'faction-v1-' + recipe.hash.slice(0, 20))
    fail('FACTION_FIELD_RECOVERY_CURRENT_OWNER_DRIFT');
  const { db, owners } = openOwners({ filename, recipes: [recipe, ...ancestors], currentRunId, allowCurrentRunning });
  try {
    const { capabilities, failures } = readFailures(db, owners);
    const originals = failures.filter(e => e.rejected.contextManifestRef?.hash === prepared.capsule.hash
      && e.rejected.roleRef?.hash === prepared.capsule.roleRef.hash);
    if (!originals.length) {
      if (expectedMaterialization) fail('FACTION_FIELD_RECOVERY_ACTUAL_ORIGIN_MISSING');
      return null;
    }
    if (originals.length !== 1) fail('FACTION_FIELD_RECOVERY_ORIGINAL_NOT_UNIQUE');
    const repairId = prepared.capsule.roleRef.id + '.schema-repair.1';
    const repairContext = createFactionReviewSchemaRepairContextCapsuleV1({ capsule: prepared.capsule,
      rejectedCandidate: originals[0].rejected,
      roleRef: { id: repairId, version: 'structured-review-v1', hash: hash(repairId + '.structured-review-v1') } });
    const repairs = failures.filter(e => e.rejected.roleRef?.id === repairId
      && e.rejected.contextManifestRef?.hash === repairContext.hash);
    if (repairs.length > 1) fail('FACTION_FIELD_RECOVERY_REPAIR_NOT_UNIQUE');
    const read = origin => {
      const evidence = readFactionTeachFailureEvidenceV1({ filename, runId: origin.runId, attemptId: origin.attemptId });
      const receipt = decode(evidence.attempt.response);
      if (origin.runId !== currentRunId && !recipe.fieldRecoveryOrigins.some(o => hash(o) === hash(originRef(evidence))))
        fail('FACTION_FIELD_RECOVERY_UNBOUND_ORIGIN');
      const capability = capabilities.get(receipt.capabilityReceiptHash);
      if (!capability) fail('FACTION_FIELD_RECOVERY_PAID_CAPABILITY_MISSING');
      return { ...evidence, ownerRecipe: owners.get(origin.runId), capability };
    };
    const evidence = { originalEvidence: read(originals[0]), repairEvidence: repairs.length ? read(repairs[0]) : null };
    if (expectedMaterialization) {
      for (const [key, ref] of [['originalEvidence', 'originalEvidenceRef'], ['repairEvidence', 'repairEvidenceRef']]) {
        const e = evidence[key], expected = expectedMaterialization[ref];
        if (Boolean(e) !== Boolean(expected) || e && (e.attempt.run !== expected.ownerRunId
          || e.attempt.id !== expected.attemptId || hash(e.attempt) !== expected.originalRowHash
          || e.rejected.hash !== expected.rejectedCandidateHash)) fail('FACTION_FIELD_RECOVERY_ACTUAL_EVIDENCE_DRIFT');
      }
    }
    return evidence;
  } finally { db.close(); }
}

export async function loadFactionFieldRecoveryScopeV1({ root, filename, parentRunId, lineage, readiness }) {
  [lineage, readiness].forEach(verifySeal);
  if (lineage.parentRunId !== parentRunId || readiness.version !== 'faction_field_recovery_wiring_readiness_v1'
    || !readiness.passed || !readiness.fullReplayConsumerPassed || !readiness.dryAndLiveFactoryPassed
    || readiness.providerCalls !== 0 || !readiness.authenticatedDshProofHash)
    fail('FACTION_FIELD_RECOVERY_READINESS_REQUIRED');
  const ancestors = await Promise.all(lineage.recipes.map(async ref => {
    const r = verifySeal(JSON.parse(await readFile(path.join(root, 'build/ticket-18-faction-production-v1', ref.runId, 'recipe.json'), 'utf8')));
    if (ref.recipeHash !== r.hash || ref.runId !== 'faction-v1-' + r.hash.slice(0, 20)) fail('FACTION_FIELD_RECOVERY_LINEAGE_INVALID');
    return r;
  }));
  if ('faction-v1-' + ancestors[0]?.hash.slice(0, 20) !== parentRunId) fail('FACTION_FIELD_RECOVERY_LINEAGE_INVALID');
  const { db, owners } = openOwners({ filename, recipes: ancestors });
  try {
    const { failures } = readFailures(db, owners);
    const origins = sorted(failures.map(e => ({ runId: e.runId, attemptId: e.attemptId, rejectedCandidateHash: e.rejected.hash })));
    const parent = ancestors[0];
    if (assertFactionFieldRecoveryRecipeV1(parent)
      && parent.fieldRecoveryOrigins.some(o => !origins.some(n => hash(n) === hash(o)))) fail('FACTION_FIELD_RECOVERY_ORIGIN_REMOVED');
    const recipeFields = { fieldRecoveryBinding: binding, fieldRecoveryOrigins: origins, fieldRecoveryReadinessHash: readiness.hash };
    assertFactionFieldRecoveryRecipeV1(recipeFields);
    return { recipeFields, ancestors, lineageHash: lineage.hash };
  } finally { db.close(); }
}

export function validateFactionFieldRecoveryMigrationV1({ parent, next, readiness, scope }) {
  if (!fields.some(f => parent[f] !== undefined || next[f] !== undefined)) {
    if (readiness || scope) fail('FACTION_FIELD_RECOVERY_MIGRATION_UNSCOPED');
    return null;
  }
  [parent, next, readiness].forEach(verifySeal);
  if (!assertFactionFieldRecoveryRecipeV1(next) || next.fieldRecoveryBinding.hash !== binding.hash
    || readiness.version !== 'faction_field_recovery_wiring_readiness_v1'
    || !readiness.passed || !readiness.fullReplayConsumerPassed || !readiness.dryAndLiveFactoryPassed
    || readiness.providerCalls !== 0 || next.fieldRecoveryReadinessHash !== readiness.hash
    || hash(next.fieldRecoveryOrigins) !== hash(scope?.recipeFields.fieldRecoveryOrigins)
    || hash(readiness.codeHashes.map(r => r.file).sort()) !== hash([...FACTION_FIELD_RECOVERY_FILES_V1].sort())
    || !factionLimitsCompatibleV1(parent, next) || ['inputHashes', 'sourceBinding', 'modelHash', 'contextHash', 'dshBindingHash'].some(f => hash(parent[f]) !== hash(next[f])))
    fail('FACTION_FIELD_RECOVERY_MIGRATION_INVALID');
  if (assertFactionFieldRecoveryRecipeV1(parent)
    && parent.fieldRecoveryOrigins.some(o => !next.fieldRecoveryOrigins.some(n => hash(n) === hash(o))))
    fail('FACTION_FIELD_RECOVERY_ORIGIN_REMOVED');
  for (const row of readiness.codeHashes)
    if (next.codeHashes.find(r => r.file === row.file)?.hash !== row.hash) fail('FACTION_FIELD_RECOVERY_MIGRATION_CODE_DRIFT');
  return seal({ version: 'faction_field_recovery_migration_v1', bindingHash: binding.hash,
    readinessHash: readiness.hash, lineageHash: scope.lineageHash, files: readiness.codeHashes.map(r => r.file),
    originalAttemptsCopied: 0, accountingReset: false, semanticAcceptanceInherited: false, trainingTruth: false });
}
