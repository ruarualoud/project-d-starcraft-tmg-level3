import { DatabaseSync } from 'node:sqlite';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyFactionUnitRoleFieldRepairV1 } from '../packages/skill-production-v3/faction-unit-role-field-repair-v1.mjs';
import { inspectFactionUnitRoleDebtV1 } from '../packages/skill-evaluation/faction-unit-role-debt-v1.mjs';
import { seal, verifySeal, hash, sha256, fail } from '../packages/skill-production/common.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), runId = process.argv[2];
if (!/^faction-v1-[a-f0-9]{20}$/.test(runId || '')) fail('FACTION_UNIT_REPAIR_INSPECTION_ARGUMENTS');
const base = path.join(root, 'build/ticket-18-faction-production-v1');
const json = async n => verifySeal(JSON.parse(await readFile(path.join(base, n + '.json'), 'utf8')));
const input = await json('terran_armed_forces-input'), recipe = await json(runId + '/recipe');
if (runId !== 'faction-v1-' + recipe.hash.slice(0, 20) || !recipe.inputHashes.includes(input.hash)) fail('FACTION_UNIT_REPAIR_INSPECTION_RECIPE');
const sectionId = 'faction.terran_armed_forces.unit_roles.1';
const db = new DatabaseSync(path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite'), { readOnly: true });
let report;
try {
  if (db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n) fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
  if (db.prepare('SELECT recipe FROM runs WHERE id=?').get(runId)?.recipe !== recipe.hash) fail('FACTION_UNIT_REPAIR_INSPECTION_JOURNAL');
  const read = (run, id) => {
    const r = db.prepare("SELECT input_hash,artifact FROM steps WHERE run=? AND id=? AND state='complete'").get(run, id);
    return r ? { inputHash: r.input_hash, value: verifySeal(JSON.parse(r.artifact)).value } : null;
  };
  const patches = db.prepare("SELECT id,artifact FROM steps WHERE run=? AND state='complete'").all(runId)
    .filter(r => r.id.startsWith(sectionId + '.known-unit-fields.') && r.id.endsWith('.patch'))
    .map(r => ({ id: r.id, value: verifySeal(verifySeal(JSON.parse(r.artifact)).value) }));
  if (patches.length !== 1) fail('FACTION_UNIT_REPAIR_INSPECTION_PATCH_DENOMINATOR');
  const result = patches[0].value, plan = result.plan, issueId = patches[0].id.slice(0, -'.patch'.length) + '.issue';
  if (verifySeal(read(runId, issueId)?.value).hash !== plan.hash) fail('FACTION_UNIT_REPAIR_INSPECTION_ISSUE_DRIFT');
  const roleId = 'faction.terran_armed_forces.' + patches[0].id.slice(0, -'.patch'.length);
  const currentRole = read(runId, roleId), role = verifySeal(currentRole?.value);
  if (role.hash !== result.artifactHash || role.loop.transcript.length !== 1) fail('FACTION_UNIT_REPAIR_INSPECTION_ROLE_DRIFT');
  const transcript = role.loop.transcript[0], receipts = [];
  let before = null, beforeRun = null, id = runId, current = recipe; const seen = new Set();
  while (id) {
    if (seen.has(id) || db.prepare('SELECT recipe FROM runs WHERE id=?').get(id)?.recipe !== current.hash) fail('FACTION_UNIT_REPAIR_INSPECTION_ANCESTOR');
    seen.add(id);
    const oldSection = read(id, sectionId + '.result')?.value;
    if (oldSection && hash(oldSection.draft) === plan.draftHash) { before = oldSection; beforeRun = id; }
    for (const row of db.prepare("SELECT response FROM attempts WHERE run=? AND state='received'").all(id)) {
      const response = verifySeal(JSON.parse(row.response)).value;
      if (response?.usageReceipt?.receiptHash === transcript.receiptHash) receipts.push({ id, response });
    }
    const nextId = current.continuation?.parentRunId;
    if (!nextId) break;
    const parent = await json(nextId + '/recipe');
    if (parent.hash !== current.continuation.parentRecipeHash) fail('FACTION_UNIT_REPAIR_INSPECTION_ANCESTOR');
    id = nextId; current = parent;
  }
  if (!before || receipts.length !== 1) fail('FACTION_UNIT_REPAIR_INSPECTION_PROOF_MISSING');
  const { id: originRunId, response } = receipts[0], { receiptHash, ...receiptBody } = response.usageReceipt;
  const originalRole = read(originRunId, roleId);
  if (!originalRole || originalRole.inputHash !== currentRole.inputHash || verifySeal(originalRole.value).hash !== role.hash
    || hash(receiptBody) !== receiptHash || receiptBody.status !== 200 || receiptBody.physicalAttempts !== 1 || receiptBody.automaticRetries !== 0
    || receiptBody.providerProfileRef.hash !== recipe.modelHash || receiptBody.responseFingerprint !== sha256(JSON.stringify(response.output))
    || response.output.channels.skill.action !== 'finish' || hash(response.output.channels.skill.content) !== hash(role.output)
    || hash(response.output.channels.skill) !== transcript.commandHash) fail('FACTION_UNIT_REPAIR_INSPECTION_RECEIPT_DRIFT');
  const patch = applyFactionUnitRoleFieldRepairV1(role.output, { input, section: before.section, draft: before.draft, plan });
  if (patch.hash !== result.patch.hash) fail('FACTION_UNIT_REPAIR_INSPECTION_REAPPLICATION_DRIFT');
  const currentSection = read(runId, sectionId + '.result')?.value;
  report = seal({ version: 'actual_faction_unit_role_field_repair_inspection_v1', runId, recipeHash: recipe.hash,
    resultHash: result.hash, planHash: plan.hash, beforeRun, beforeSectionHash: before.hash,
    actualRoleHash: role.hash, actualReceiptHash: receiptHash, receiptOriginRunId: originRunId,
    knownDebtBefore: inspectFactionUnitRoleDebtV1({ input, draft: before.draft }).findings.length,
    knownDebtAfter: patch.knownDebtAfter.findings.length, changes: patch.changes,
    changedTexts: plan.targets.map(t => ({ index: t.index, path: t.path, before: t.oldText,
      after: patch.draft.recommendations[t.index][t.path.split('.')[0]][Number(t.path.split('.')[1])] })),
    unchangedRecommendationIndices: patch.unchangedRecommendationIndices,
    actualProviderOutputReapplied: true, unflaggedFieldsPreserved: true,
    wholeSectionReviewCompleted: !!currentSection?.semanticReviewPassed && hash(currentSection.draft) === patch.draftHash,
    fullDshProviderRequestReplayPerformed: false, generalSemanticCorrectnessProven: false, runtimeAccepted: false,
    newProviderCalls: 0, trainingTruth: false });
} finally { db.close(); }
await writeFile(path.join(base, runId, 'unit-role-repair-inspection.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ runId, actualChangedFields: report.changes.length, knownDebtBefore: report.knownDebtBefore,
  knownDebtAfter: report.knownDebtAfter, wholeSectionReviewCompleted: report.wholeSectionReviewCompleted,
  providerCalls: 0, hash: report.hash }));
