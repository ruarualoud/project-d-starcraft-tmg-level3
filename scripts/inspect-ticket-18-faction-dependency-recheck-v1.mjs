import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { recheckFactionDependencyContextV1 } from '../packages/skill-production-v3/faction-dependency-recheck-v1.mjs';
import { createProductionRuntimeV3 } from '../packages/skill-production-v3/runtime.mjs';
import { loadFrozenSkillEvidence, createEvidenceReader } from '../packages/skill-production/evidence.mjs';
import { prepareDshLoop } from '../packages/skill-production/loops.mjs';
import { openReadOnlyProductionReplayV1 } from '../packages/skill-evaluation/read-only-production-replay-v1.mjs';
import { compareFactionFieldReplayLoopsV1 } from '../packages/skill-evaluation/faction-field-repair-evidence-v1.mjs';
import { seal, verifySeal, sha256, fail } from '../packages/skill-production/common.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [runId, ...extra] = process.argv.slice(2);
if (extra.length || !/^dependency-recheck-[a-f0-9]{20}$/.test(runId || '')) fail('DEPENDENCY_RECHECK_EVIDENCE_ARGUMENTS');
const base = path.join(root, 'build/ticket-18-faction-production-v1');
const json = async n => verifySeal(JSON.parse(await readFile(path.join(base, n + '.json'), 'utf8')));
const [recipe, report, result, captured, input] = await Promise.all([
  json(runId + '/recipe'), json(runId + '/report'), json(runId + '/result'), json(runId + '/source-capture'), json('terran_armed_forces-input')]);
if (runId !== 'dependency-recheck-' + recipe.hash.slice(0, 20) || report.runId !== runId
  || report.recipeHash !== recipe.hash || report.failure || !report.completedSourceRecheck
  || report.resultHash !== result.hash || recipe.inputHash !== input.hash || captured.hash !== recipe.sourceCaptureHash
  || recipe.planHash !== result.plan.hash || result.runtimeAccepted || result.trainingTruth || result.actualRepairPerformed
  || result.completeSectionSourceReviewPassed || result.productionRevisionBudgetReset)
  fail('DEPENDENCY_RECHECK_EVIDENCE_BINDING_DRIFT');
for (const file of ['packages/skill-production-v3/faction-dependency-recheck-v1.mjs',
  'packages/skill-production-v3/faction-source-dependency-context-v1.mjs']) {
  if (recipe.codeHashes.find(c => c.file === file)?.hash !== sha256(await readFile(path.join(root, file))))
    fail('DEPENDENCY_RECHECK_EVIDENCE_CODE_DRIFT');
}
const catalogue = await loadFrozenSkillEvidence(root), dsh = await prepareDshLoop(root);
if (catalogue.hash !== recipe.catalogueHash || dsh.binding.hash !== recipe.dshBindingHash) fail('DEPENDENCY_RECHECK_EVIDENCE_CONTEXT_DRIFT');
const replay = openReadOnlyProductionReplayV1({ filename: path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite'),
  runId, recipe, commandPolicy: 'production_tools' });
const loops = []; let previous = 0, delivery;
try {
  const store = { ...replay.store, finish(lease, value) {
    if (value.roleId) {
      const { hash: ignored, ...body } = replay.evidence();
      loops.push(compareFactionFieldReplayLoopsV1(lease.saved.loop, value.loop,
        seal({ ...body, receiptHashes: body.receiptHashes.slice(previous) })));
      previous = body.receiptHashes.length;
      const { hash: ignoredValue, ...role } = value;
      value = seal({ ...role, loop: lease.saved.loop });
    }
    return replay.store.finish(lease, value);
  } };
  const runtime = createProductionRuntimeV3({ store, reader: createEvidenceReader(catalogue), context: input.frozenSources,
    verifier: {}, model: replay.model, dsh });
  const rebuilt = await recheckFactionDependencyContextV1({ input, captured, runtime, store });
  delivery = replay.evidence();
  if (rebuilt.hash !== result.hash || loops.length !== 2 || delivery.matchedStepIds.length !== 3)
    fail('DEPENDENCY_RECHECK_EVIDENCE_RESULT_DRIFT');
} finally { replay.close(); }
const evidence = seal({ version: 'actual_faction_dependency_recheck_evidence_v1', runId, recipeHash: recipe.hash,
  inputHash: input.hash, captureHash: captured.hash, resultHash: result.hash, delivery, loops,
  actualProviderRequestsMatched: true, originalReviewsPreserved: true, partialReviewNotSectionAcceptance: true,
  newProviderCalls: 0, productionJournalMutated: false, sourceRefreshPerformed: false, trainingTruth: false });
await writeFile(path.join(base, runId, 'verified-evidence.json'), JSON.stringify(evidence, null, 2));
console.log(JSON.stringify({ passed: true, actualRolesReplayed: loops.length, receipts: delivery.receiptHashes.length,
  newProviderCalls: 0, hash: evidence.hash }));
