import { DatabaseSync } from 'node:sqlite';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyFactionSourceFieldRepairV2, inspectFactionRegisteredSourceDebtV2 } from '../packages/skill-production-v3/faction-source-field-repair-v2.mjs';
import { seal, verifySeal, hash, sha256, fail } from '../packages/skill-production/common.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), runId = process.argv[2];
if (!/^faction-v1-[a-f0-9]{20}$/.test(runId || '')) fail('FACTION_SOURCE_REPAIR_INSPECTION_ARGUMENTS');
const base = path.join(root, 'build/ticket-18-faction-production-v1');
const json = async n => verifySeal(JSON.parse(await readFile(path.join(base, n + '.json'), 'utf8')));
const input = await json('terran_armed_forces-input'), recipe = await json(runId + '/recipe');
if (runId !== 'faction-v1-' + recipe.hash.slice(0, 20) || !recipe.inputHashes.includes(input.hash)
  || !recipe.registeredSourceFieldRepair) fail('FACTION_SOURCE_REPAIR_INSPECTION_RECIPE');
const sectionId = 'faction.terran_armed_forces.unit_roles.1';
const db = new DatabaseSync(path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite'), { readOnly: true });
let report;
try {
  if (db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n) fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
  const read = (run, id) => {
    const r = db.prepare("SELECT input_hash,artifact FROM steps WHERE run=? AND id=? AND state='complete'").get(run, id);
    return r ? { inputHash: r.input_hash, value: verifySeal(JSON.parse(r.artifact)).value } : null;
  };
  const patches = db.prepare("SELECT id,artifact FROM steps WHERE run=? AND state='complete'").all(runId)
    .filter(r => r.id.startsWith(sectionId + '.registered-source-fields-v2.') && r.id.endsWith('.patch'))
    .map(r => ({ id: r.id.slice(0, -6), value: verifySeal(verifySeal(JSON.parse(r.artifact)).value) }));
  if (patches.length !== 1) fail('FACTION_SOURCE_REPAIR_INSPECTION_PATCH_DENOMINATOR');
  const { id: repairId, value: result } = patches[0], plan = result.plan;
  if (verifySeal(read(runId, repairId + '.issue')?.value).hash !== plan.hash) fail('FACTION_SOURCE_REPAIR_INSPECTION_ISSUE_DRIFT');
  const responses = new Map(), chain = []; let current = recipe, id = runId, before = null, beforeRun = null;
  while (id) {
    if (chain.includes(id) || db.prepare('SELECT recipe FROM runs WHERE id=?').get(id)?.recipe !== current.hash
      || current.modelHash !== recipe.modelHash || current.contextHash !== recipe.contextHash) fail('FACTION_SOURCE_REPAIR_INSPECTION_ANCESTOR');
    chain.push(id);
    const old = read(id, sectionId + '.result')?.value;
    if (old && hash(old.draft) === plan.draftHash) { before = verifySeal(old); beforeRun = id; }
    for (const row of db.prepare("SELECT response FROM attempts WHERE run=? AND state='received'").all(id)) {
      const response = verifySeal(JSON.parse(row.response)).value, h = response.usageReceipt.receiptHash;
      if (responses.has(h)) fail('FACTION_SOURCE_REPAIR_INSPECTION_DUPLICATE_RECEIPT');
      responses.set(h, { originRunId: id, response });
    }
    const parentId = current.continuation?.parentRunId; if (!parentId) break;
    const parent = await json(parentId + '/recipe');
    if (parent.hash !== current.continuation.parentRecipeHash) fail('FACTION_SOURCE_REPAIR_INSPECTION_ANCESTOR');
    id = parentId; current = parent;
  }
  if (!before || result.artifactHashes.length !== Math.ceil(plan.targets.length / plan.batchSize)) fail('FACTION_SOURCE_REPAIR_INSPECTION_PROOF_MISSING');
  const replacements = [], receiptHashes = [];
  for (let ordinal = 0; ordinal < result.artifactHashes.length; ordinal++) {
    const roleId = 'faction.terran_armed_forces.' + repairId + '.batch.' + ordinal * plan.batchSize;
    const currentRole = read(runId, roleId), role = verifySeal(currentRole?.value);
    if (role.hash !== result.artifactHashes[ordinal] || !role.loop.transcript.length) fail('FACTION_SOURCE_REPAIR_INSPECTION_ROLE_DRIFT');
    for (const [n, t] of role.loop.transcript.entries()) {
      const origin = responses.get(t.receiptHash), response = origin?.response;
      if (!response) fail('FACTION_SOURCE_REPAIR_INSPECTION_RECEIPT_MISSING');
      const originalRole = read(origin.originRunId, roleId), { receiptHash, ...body } = response.usageReceipt;
      const command = response.output.channels?.skill;
      if (!originalRole || originalRole.inputHash !== currentRole.inputHash || verifySeal(originalRole.value).hash !== role.hash
        || hash(body) !== receiptHash || body.status !== 200 || body.physicalAttempts !== 1 || body.automaticRetries !== 0
        || body.providerProfileRef.hash !== recipe.modelHash || body.responseFingerprint !== sha256(JSON.stringify(response.output))
        || !command || t.call !== n + 1 || sha256(JSON.stringify(command)) !== t.commandHash) fail('FACTION_SOURCE_REPAIR_INSPECTION_RECEIPT_DRIFT');
      if (n === role.loop.transcript.length - 1 && (command.action !== 'finish' || hash(command.content) !== hash(role.output)))
        fail('FACTION_SOURCE_REPAIR_INSPECTION_FINAL_DRIFT');
      receiptHashes.push(receiptHash);
    }
    replacements.push(...role.output.replacements);
  }
  const patch = applyFactionSourceFieldRepairV2({ replacements }, { input, section: before.section, draft: before.draft, plan });
  if (patch.hash !== result.patch.hash) fail('FACTION_SOURCE_REPAIR_INSPECTION_REAPPLICATION_DRIFT');
  const completed = read(runId, sectionId + '.result')?.value;
  report = seal({ version: 'actual_faction_source_field_repair_inspection_v2', runId, recipeHash: recipe.hash,
    planHash: plan.hash, patchHash: patch.hash, resultHash: result.hash, beforeRun, beforeSectionHash: before.hash,
    actualRawRoleHashes: result.artifactHashes, actualReceiptHashes: receiptHashes,
    knownDebtBefore: inspectFactionRegisteredSourceDebtV2({ input, draft: before.draft }).findings.length,
    knownDebtAfter: patch.debtAfter.findings.length, changes: patch.changes,
    changedTexts: plan.targets.map(t => { const [field, n] = t.path.split('.'); return { index: t.index, path: t.path,
      before: t.oldText, after: n === undefined ? patch.draft.recommendations[t.index][field] : patch.draft.recommendations[t.index][field][Number(n)] }; }),
    unchangedRecommendationIndices: patch.unchangedRecommendationIndices, unflaggedFieldsPreserved: true,
    actualProviderOutputsReapplied: true, wholeSectionReviewCompleted: !!completed?.semanticReviewPassed && hash(completed.draft) === patch.draftHash,
    exactDshProviderRequestsReplayed: false, generalSemanticCorrectnessProven: false, runtimeAccepted: false, newProviderCalls: 0, trainingTruth: false });
} finally { db.close(); }
await writeFile(path.join(base, runId, 'source-field-repair-v2-inspection.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ runId, actualChangedFields: report.changes.length, knownDebtBefore: report.knownDebtBefore,
  knownDebtAfter: report.knownDebtAfter, wholeSectionReviewCompleted: report.wholeSectionReviewCompleted, providerCalls: 0, hash: report.hash }));
