import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { openReadOnlyProductionReplayV1 } from '../packages/skill-evaluation/read-only-production-replay-v1.mjs';
import { repairGuideFromRulesV1 } from '../packages/skill-evaluation/guide-local-repair-v1.mjs';
import { seal, verifySeal, hash, safe, fail } from '../packages/skill-production/common.mjs';

export async function inspectGuideNoProgressV1(root, runId, deps) {
  if (!/^guide-repair-[a-f0-9]{20}$/.test(runId)) fail('GUIDE_NO_PROGRESS_RUN_INVALID');
  const base = path.join(root, 'build/ticket-18-production-v3', runId);
  const json = async name => verifySeal(JSON.parse(await readFile(path.join(base, name + '.json'), 'utf8')));
  const recipe = await json('recipe'), report = await json('report');
  if (recipe.version !== 'guide_local_repair_and_evaluation_v1' || runId !== 'guide-repair-' + recipe.hash.slice(0, 20)
    || recipe.recoveryHash || recipe.feedbackHash !== deps.feedback.hash || recipe.teacherHash !== deps.teacher.hash
    || recipe.candidateHash !== deps.candidate.hash || report.recipeHash !== recipe.hash || report.resultHash
    || report.repairedTeacherHash || report.failure?.code !== 'GUIDE_PATCH_NO_PROGRESS') fail('GUIDE_NO_PROGRESS_NOT_ELIGIBLE');
  const filename = path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite');
  const db = new DatabaseSync(filename, { readOnly: true });
  const replay = openReadOnlyProductionReplayV1({ filename, runId, recipe });
  let acquisitions = 0, delivery;
  try {
    // This failed step has no completed artifact. Rebuild its exact input and
    // paid request, and require normalization to reject the same actual output.
    await assert.rejects(() => repairGuideFromRulesV1({ ...deps, model: replay.model, store: {
      acquire(id, input) {
        const row = db.prepare('SELECT input_hash,state,artifact FROM steps WHERE run=? AND id=?').get(runId, id);
        if (++acquisitions !== 1 || id !== 'guide-local-development-editor' || !row || row.state === 'running'
          || row.state === 'complete' || row.artifact || row.input_hash !== hash(safe(input))) fail('GUIDE_NO_PROGRESS_STEP_DRIFT');
        return { cached: false, id };
      },
      finish() { fail('GUIDE_NO_PROGRESS_UNEXPECTED_SUCCESS'); }, release() {},
    } }), { code: 'GUIDE_PATCH_NO_PROGRESS' });
    delivery = replay.evidence(); assert.equal(delivery.receiptHashes.length, 1);
  } finally { db.close(); replay.close(); }
  return seal({ schema: 'starcraft_guide_no_progress_evidence_v1', runId, recipeHash: recipe.hash,
    reportHash: report.hash, candidateHash: deps.candidate.hash, teacherHash: deps.teacher.hash, feedbackHash: deps.feedback.hash,
    receiptHashes: delivery.receiptHashes, actualRequestReconstructed: true, actualUnchangedOutputRejected: true,
    sourceFirstAlreadyUsed: false, failureCode: 'GUIDE_PATCH_NO_PROGRESS', newProviderCalls: 0, trainingTruth: false });
}
