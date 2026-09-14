import { DatabaseSync } from 'node:sqlite';
import { seal, verifySeal, hash, fail } from '../skill-production/common.mjs';
import { FACTION_PROPOSER_BATCH_BINDING_V1 } from './faction-proposer-batches-v1.mjs';
import { FACTION_UNIQUE_RISK_CLAUSE_BINDING_V2 } from '../skill-evaluation/faction-unique-risk-clause-v2.mjs';

const ORIGIN = 'faction-v1-c7ca14be3b96ade06b22';
export const FACTION_PLANNING_MIGRATION_FILES_V1 = Object.freeze([
  'packages/skill-production-v3/faction-proposer-batches-v1.mjs',
  'packages/skill-production-v3/faction-planning-migration-v1.mjs',
  'packages/skill-production-v3/faction-strategy-workflow-v1.mjs',
  'packages/skill-production-v3/faction-native-production-runtime-v1.mjs',
  'packages/skill-production-v3/faction-continuation-v1.mjs',
  'packages/skill-evaluation/faction-unique-risk-clause-v2.mjs',
  'packages/skill-evaluation/faction-structured-replay-v1.mjs',
  'packages/skill-evaluation/faction-replay-runtime-stack-v1.mjs',
  'packages/skill-evaluation/faction-candidate-evidence-v1.mjs',
  'scripts/run-ticket-18-faction-strategy-production-v1.mjs',
  'scripts/verify-ticket-18-faction-proposer-batches-v1.mjs',
  'scripts/verify-ticket-18-faction-unique-risk-clause-v2.mjs',
  'scripts/verify-ticket-18-faction-proposer-native-wiring-v1.mjs',
  'scripts/verify-ticket-18-faction-planning-workflow-v1.mjs',
  'scripts/verify-ticket-18-faction-planning-migration-v1.mjs',
]);

export function readFactionPlanningOriginV1({ filename }) {
  const db = new DatabaseSync(filename, { readOnly: true });
  try {
    if (db.prepare("SELECT count(*) AS n FROM steps WHERE run=? AND state='running'").get(ORIGIN).n
      || db.prepare("SELECT count(*) AS n FROM attempts WHERE run=? AND state='intent'").get(ORIGIN).n)
      fail('FACTION_PLANNING_ORIGIN_NOT_TERMINAL');
    if (db.prepare("SELECT count(*) AS n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n)
      fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
    const rows = db.prepare("SELECT id,artifact FROM steps WHERE run=? AND state='complete'").all(ORIGIN)
      .map(row => ({ id: row.id, artifact: verifySeal(JSON.parse(row.artifact)).value }));
    const sections = rows.filter(r => r.id.endsWith('.result') && r.artifact.section && r.artifact.semanticReviewPassed);
    // Freeze the six historical writing plans only, NOT semantic acceptance.
    // Chapter six still receives V2 correction/fresh review. Chapter seven's
    // completed Proposer/outline are excluded because its section failed.
    const frozenRoleIds = sections.map(row => 'faction.terran_armed_forces.' + row.artifact.section.id + '.proposer').sort();
    if (frozenRoleIds.length !== 6 || frozenRoleIds.some(id => !rows.some(row => row.id === id && row.artifact.roleId === id)))
      fail('FACTION_PLANNING_ORIGIN_FREEZE_INVALID');
    const get = id => { const value = rows.find(row => row.id === id)?.artifact;
      if (!value) fail('FACTION_PLANNING_ORIGIN_ARTIFACT_MISSING'); return verifySeal(value); };
    const chapter = get('faction.terran_armed_forces.card_packages.1.result');
    const outline = get('faction.terran_armed_forces.faction.terran_armed_forces.card_packages.2.generator-outline');
    const noProgress = get('faction.terran_armed_forces.faction.terran_armed_forces.card_packages.2.generator-outline.source-reconstruction.v1');
    const attemptId = 'structured-5ecd3e5fabd4e02899caf6911d8293273da034cf7c3fcec3';
    const attempt = db.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(ORIGIN, attemptId);
    if (attempt?.state !== 'failed' || attempt.code !== 'STRUCTURED_PROVIDER_INCOMPLETE' || !(attempt.settled > 0))
      fail('FACTION_PLANNING_ORIGIN_ATTEMPT_INVALID');
    const receipt = verifySeal(JSON.parse(attempt.response)).value;
    if (receipt.incompleteReason !== 'max_output_tokens' || receipt.usage?.outputUnits !== 8192 || receipt.outputTextHash !== null)
      fail('FACTION_PLANNING_ORIGIN_ATTEMPT_INVALID');
    return seal({ originRunId: ORIGIN, originAttemptId: attemptId, originalReceiptHash: receipt.receiptHash,
      actualSectionHash: chapter.hash, actualRejectedOutlineHash: outline.hash, actualNoProgressRepairHash: noProgress.hash,
      frozenRoleIds, sourceRefreshPerformed: false, acceptanceInherited: false, trainingTruth: false });
  } finally { db.close(); }
}

export function validateFactionPlanningMigrationV1({ filename, parentRunId, parent, next, readiness }) {
  const fields = ['proposerBatchBinding', 'proposerBatchFrozenRoleIds', 'uniqueRiskClauseBinding', 'planningRepairReadinessHash'];
  if (!fields.some(f => parent[f] !== undefined || next[f] !== undefined)) {
    if (readiness) fail('FACTION_PLANNING_MIGRATION_UNSCOPED'); return null;
  }
  if (fields.some(f => next[f] === undefined)) fail('FACTION_PLANNING_BINDING_REMOVED_OR_PARTIAL');
  [next.proposerBatchBinding, next.uniqueRiskClauseBinding, readiness].forEach(verifySeal);
  if (next.proposerBatchBinding.hash !== FACTION_PROPOSER_BATCH_BINDING_V1.hash
    || next.uniqueRiskClauseBinding.hash !== FACTION_UNIQUE_RISK_CLAUSE_BINDING_V2.hash
    || !readiness.passed || readiness.providerCalls !== 0 || readiness.hash !== next.planningRepairReadinessHash
    || readiness.proposerBinding.hash !== next.proposerBatchBinding.hash || readiness.uniqueBinding.hash !== next.uniqueRiskClauseBinding.hash
    || !readiness.nativeConsumerReplayPassed || !readiness.fullContextPreserved || !readiness.freshWholeSectionReviewRequired
    || !readiness.negativeJudgmentsPreserved || !readiness.noProgressRepairRejected || readiness.actualDshSessions !== 3)
    fail('FACTION_PLANNING_MIGRATION_INVALID');
  if (!parent.proposerBatchBinding && parentRunId !== ORIGIN) fail('FACTION_PLANNING_MIGRATION_ORIGIN_INVALID');
  if (parent.proposerBatchBinding && fields.filter(f => f !== 'planningRepairReadinessHash').some(f => hash(parent[f]) !== hash(next[f])))
    fail('FACTION_PLANNING_MIGRATION_BINDING_DRIFT');
  const origin = readFactionPlanningOriginV1({ filename });
  if (hash(origin) !== hash(readiness.origin) || hash(origin.frozenRoleIds) !== hash(next.proposerBatchFrozenRoleIds))
    fail('FACTION_PLANNING_MIGRATION_EVIDENCE_DRIFT');
  for (const file of FACTION_PLANNING_MIGRATION_FILES_V1) {
    const row = readiness.codeHashes.find(r => r.file === file);
    if (!row || row.hash !== next.codeHashes.find(r => r.file === file)?.hash) fail('FACTION_PLANNING_MIGRATION_CODE_DRIFT');
  }
  return seal({ version: 'faction_planning_migration_v1', files: FACTION_PLANNING_MIGRATION_FILES_V1,
    readinessHash: readiness.hash, originHash: origin.hash,
    policy: 'freeze_six_old_plans_not_acceptance_new_bounded_plans_and_generation_ids_fresh_unique_review',
    paidFailuresRetained: true, accountingReset: false, trainingTruth: false });
}
