import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { openReadOnlyProductionReplayV1 } from '../packages/skill-evaluation/read-only-production-replay-v1.mjs';
import { repairGuideFromRulesV1 } from '../packages/skill-evaluation/guide-local-repair-v1.mjs';
import { seal, verifySeal, hash, safe, fail } from '../packages/skill-production/common.mjs';

// Reinterpret only a retained completed response that failed the old strict
// schema. No paid attempt is copied, reissued or marked successful retroactively.
export async function replayGuideReconstructionV1(root, runId, deps, recovery) {
  if (!/^guide-repair-[a-f0-9]{20}$/.test(runId)) fail('GUIDE_REUSE_RUN_INVALID');
  const base = path.join(root, 'build/ticket-18-production-v3', runId);
  const json = async name => verifySeal(JSON.parse(await readFile(path.join(base, name + '.json'), 'utf8')));
  const recipe = await json('recipe'), report = await json('report');
  if (recipe.version !== 'guide_local_repair_and_evaluation_v1' || runId !== 'guide-repair-' + recipe.hash.slice(0, 20)
    || recipe.reuseRunId || recipe.recoveryHash !== recovery?.hash || recipe.feedbackHash !== deps.feedback.hash
    || recipe.teacherHash !== deps.teacher.hash || recipe.candidateHash !== deps.candidate.hash
    || report.recipeHash !== recipe.hash || report.resultHash || report.repairedTeacherHash
    || report.failure?.code !== 'OUTPUT_SCHEMA_INVALID') fail('GUIDE_REUSE_NOT_ELIGIBLE');
  const filename = path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite');
  const db = new DatabaseSync(filename, { readOnly: true }), replay = openReadOnlyProductionReplayV1({ filename, runId, recipe });
  let acquisitions = 0, artifact, delivery;
  try {
    artifact = await repairGuideFromRulesV1({ ...deps, recovery, model: replay.model, store: {
      acquire(id, input) {
        const row = db.prepare('SELECT input_hash,state,artifact FROM steps WHERE run=? AND id=?').get(runId, id);
        if (++acquisitions !== 1 || id !== 'guide-local-source-reconstruction' || !row || row.state !== 'pending'
          || row.artifact || row.input_hash !== hash(safe(input))) fail('GUIDE_REUSE_STEP_DRIFT');
        return { cached: false, id };
      }, finish(lease, value) { return verifySeal(value); }, release() {},
    } });
    if (artifact.losslessProjection?.kind !== 'identical_source_refs_omitted_from_patch_only'
      || !artifact.losslessProjection.procedureTextUnchanged) fail('GUIDE_REUSE_PROJECTION_REQUIRED');
    delivery = replay.evidence(); assert.equal(delivery.receiptHashes.length, 1);
  } finally { db.close(); replay.close(); }
  return seal({ schema: 'starcraft_guide_reconstruction_reuse_v1', runId, recipeHash: recipe.hash, reportHash: report.hash,
    recoveryHash: recovery.hash, feedbackHash: deps.feedback.hash, artifact, delivery, originalFailureRetained: true,
    sourceReferencesUnchanged: true, providerOutputTextUnchanged: true, newProviderCalls: 0, trainingTruth: false });
}

export function materializeReusedGuideV1(store, reuse) {
  verifySeal(reuse);
  if (reuse.schema !== 'starcraft_guide_reconstruction_reuse_v1' || reuse.newProviderCalls !== 0) fail('GUIDE_REUSE_INVALID');
  const lease = store.acquire('reused-source-reconstruction', { reuseHash: reuse.hash });
  return lease.cached ? verifySeal(lease.artifact) : store.finish(lease, reuse.artifact);
}
