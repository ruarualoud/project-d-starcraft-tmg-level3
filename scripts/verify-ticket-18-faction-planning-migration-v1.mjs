import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { seal, verifySeal, hash, sha256 } from '../packages/skill-production/common.mjs';
import { FACTION_PROPOSER_BATCH_BINDING_V1 as proposerBinding } from '../packages/skill-production-v3/faction-proposer-batches-v1.mjs';
import { FACTION_UNIQUE_RISK_CLAUSE_BINDING_V2 as uniqueBinding } from '../packages/skill-evaluation/faction-unique-risk-clause-v2.mjs';
import { FACTION_PLANNING_MIGRATION_FILES_V1 as files, readFactionPlanningOriginV1,
  validateFactionPlanningMigrationV1 } from '../packages/skill-production-v3/faction-planning-migration-v1.mjs';
const base = 'build/ticket-18-faction-production-v1/', filename = 'build/ticket-17-production-redesign-v1/production.sqlite';
const read = async name => verifySeal(JSON.parse(await readFile(base + name + '.json', 'utf8')));
const gates = await Promise.all(['proposer-batches-unit-readiness', 'unique-risk-clause-unit-readiness',
  'proposer-native-wiring-readiness', 'planning-workflow-readiness'].map(read));
for (const gate of gates) {
  assert.equal(gate.passed, true); assert.equal(gate.providerCalls, 0);
  for (const row of gate.codeHashes) assert.equal(sha256(await readFile(row.file)), row.hash, row.file);
}
const [unit, unique, native, workflow] = gates;
const origin = readFactionPlanningOriginV1({ filename });
assert.equal(unit.binding.hash, proposerBinding.hash);
assert.equal(unique.binding.hash, uniqueBinding.hash);
assert.equal(native.actualDshSessions, 3);
assert.equal(native.actualRequestBodyConsumerReplayPassed, true);
assert.equal(native.originalReceiptHash, origin.originalReceiptHash);
assert.equal(workflow.actualSectionHash, origin.actualSectionHash);
assert.equal(workflow.actualRejectedOutlineHash, origin.actualRejectedOutlineHash);
assert.equal(workflow.actualNoProgressRepairHash, origin.actualNoProgressRepairHash);
assert.deepEqual([...workflow.frozenRoleIds].sort(), origin.frozenRoleIds);
assert.equal(workflow.negativeJudgmentsPreserved, true);
assert.equal(workflow.noProgressRepairRejected, true);
let checks = 11;
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) })));
const body = { passed: true, proposerBinding, uniqueBinding, origin, gates: gates.map(g => g.hash), codeHashes,
  nativeConsumerReplayPassed: true, fullContextPreserved: true, freshWholeSectionReviewRequired: true,
  negativeJudgmentsPreserved: true, noProgressRepairRejected: true, actualDshSessions: native.actualDshSessions,
  originalPaidFailureRetained: true, oldWritingPlansFrozenNotSemanticallyAccepted: true,
  workflowChecks: workflow.checks, nativeChecks: native.checks,
  productionRunnerWired: true, actualNewProductionExecuted: false,
  actualNewFactionSkillsAccepted: 0, providerCalls: 0, strategyEffectivenessProven: false, trainingTruth: false };
const parent = await read(origin.originRunId + '/recipe'), readiness = seal(body);
const next = seal({ ...parent, proposerBatchBinding: proposerBinding, uniqueRiskClauseBinding: uniqueBinding,
  proposerBatchFrozenRoleIds: origin.frozenRoleIds, planningRepairReadinessHash: readiness.hash,
  codeHashes: [...parent.codeHashes.filter(r => !files.includes(r.file)), ...codeHashes] });
const args = { filename, parentRunId: origin.originRunId, parent, next, readiness };
assert.ok(validateFactionPlanningMigrationV1(args)); checks++;
for (const [mutate, code] of [
  [n => delete n.uniqueRiskClauseBinding, 'FACTION_PLANNING_BINDING_REMOVED_OR_PARTIAL'],
  [n => n.proposerBatchFrozenRoleIds = [...n.proposerBatchFrozenRoleIds,
    'faction.terran_armed_forces.faction.terran_armed_forces.card_packages.2.proposer'], 'FACTION_PLANNING_MIGRATION_EVIDENCE_DRIFT'],
  [n => n.proposerBatchFrozenRoleIds = [], 'FACTION_PLANNING_MIGRATION_EVIDENCE_DRIFT'],
  [n => n.codeHashes.find(r => r.file === files[0]).hash = hash('drift'), 'FACTION_PLANNING_MIGRATION_CODE_DRIFT'],
]) {
  const changed = structuredClone(next); mutate(changed);
  assert.throws(() => validateFactionPlanningMigrationV1({ ...args, next: changed }), { code }); checks++;
}
assert.throws(() => validateFactionPlanningMigrationV1({ ...args, parentRunId: 'faction-v1-' + '0'.repeat(20) }),
  { code: 'FACTION_PLANNING_MIGRATION_ORIGIN_INVALID' }); checks++;
assert.ok(validateFactionPlanningMigrationV1({ ...args, parent: next, parentRunId: 'faction-v1-' + next.hash.slice(0, 20) })); checks++;
const report = seal({ ...body, checks });
assert.ok(validateFactionPlanningMigrationV1({ ...args, readiness: report, next: seal({ ...next, planningRepairReadinessHash: report.hash }) }));
await writeFile(base + 'planning-repair-readiness.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, nativeChecks: native.checks, workflowChecks: workflow.checks,
  actualDshSessions: 3, providerCalls: 0, hash: report.hash }));
