import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, fail } from '../../packages/skill-production/common.mjs';
import { loadFactionParsedValueActualFixtureV1 } from './faction-parsed-value-actual-fixture-v1.mjs';
import { factionReviewDecompositionArgsV1 } from '../../packages/skill-production-v3/faction-review-decomposition-continuation-v1.mjs';
import { createFactionReviewBatchPlanV1 } from '../../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { createFactionReviewTargetsV1 } from '../../packages/skill-production-v3/faction-review-targets-v1.mjs';
import { prepareFactionSlotReviewRoleV1 } from '../../packages/skill-production-v3/faction-slot-review-runtime-v1.mjs';
import { readFactionTeachFailureEvidenceV1 } from '../../packages/skill-evaluation/faction-teach-failure-evidence-v1.mjs';

export async function loadFactionContractProjectionActualFixturesV1() {
  const base = 'build/ticket-18-faction-production-v1/';
  const runId = 'faction-v1-bf7beab1dccb73982637';
  const json = async file => verifySeal(JSON.parse(await readFile(base + file + '.json', 'utf8')));
  const recipe = await json(runId + '/recipe'), zerg = await loadFactionParsedValueActualFixtureV1();
  const filename = zerg.filename, terran = await json(runId + '/terran_armed_forces-input');
  const diagnosis = await json('terran-wire-context-diagnosis-v2');
  const terranContext = factionReviewDecompositionArgsV1({ filename, input: terran, diagnosis });
  const db = new DatabaseSync(filename, { readOnly: true });
  try {
    if (db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n)
      fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
    const rows = [{ name: 'zerg_zero_coverage_obligations', input: zerg.input, mapping: zerg.prepared.mapping,
      attemptId: 'structured-3a895c858d911bdfedf7713ac62021f70f5ce25fffd3f1d8', first: 4,
      suffix: '.source-evidence-v1.3cd990702ff2ba8b4acc' },
    { name: 'terran_administrative_extension', input: terran, mapping: terranContext.mapping,
      attemptId: 'structured-6f7eabc84868941d63e625d382d9b666988bd81744e47572', first: 4,
      suffix: '.source-evidence-v1.3f8eeb087607ebe8f490' }];
    return rows.map(row => {
      const evidence = readFactionTeachFailureEvidenceV1({ filename, runId, attemptId: row.attemptId });
      const receipt = verifySeal(JSON.parse(evidence.attempt.response)).value;
      const caps = db.prepare("SELECT response FROM attempts WHERE state='received' AND json_extract(response,?)=?")
        .all('$.value.capabilityReceipt.receiptHash', receipt.capabilityReceiptHash)
        .map(r => verifySeal(JSON.parse(r.response)).value.capabilityReceipt);
      if (!caps.length || caps.some(c => hash(c) !== hash(caps[0]))) fail('ACTUAL_PROJECTION_CAPABILITY_DRIFT');
      const { section, draft } = row.mapping, input = row.input;
      const batch = createFactionReviewBatchPlanV1({ section, draft }).batches.find(b => b.first === row.first);
      const packet = seal({ id: 'faction.' + input.factionRecordKey.split(':')[1], inputHash: input.hash, sourceBinding: input.sourceBinding });
      const request = { packet, roleId: evidence.rejected.roleRef.id + row.suffix,
        workspace: { inputHash: input.hash, section, draft, reviewIndices: batch.reviewIndices,
          coverageRequiredSourceRefs: batch.requiredSourceRefs,
          outputRequestAtEnd: { targetContract: createFactionReviewTargetsV1({ input, section, draft, indices: batch.reviewIndices }) } } };
      const prepared = prepareFactionSlotReviewRoleV1({ input, request, executionPolicy: zerg.executionPolicy });
      if (prepared.capsule.hash !== evidence.rejected.contextManifestRef.hash) fail('ACTUAL_PROJECTION_CONTEXT_DRIFT');
      return { name: row.name, filename, runId, recipe, input, request, prepared, executionPolicy: zerg.executionPolicy,
        originalEvidence: { ...evidence, ownerRecipe: recipe, capability: caps[0] } };
    });
  } finally { db.close(); }
}
