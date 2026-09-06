import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { loadFrozenSkillEvidence, createEvidenceReader } from '../skill-production/evidence.mjs';
import { createGlobalProductionContext } from '../skill-production-v3/context.mjs';
import { createProductionRuntimeV3 } from '../skill-production-v3/runtime.mjs';
import { repairFactionPhaseFieldsV1 } from '../skill-production-v3/faction-phase-field-repair-v1.mjs';
import { prepareDshLoop } from '../skill-production/loops.mjs';
import { openReadOnlyProductionReplayV1 } from './read-only-production-replay-v1.mjs';
import { compareFactionFieldReplayLoopsV1 } from './faction-field-repair-evidence-v1.mjs';
import { seal, verifySeal, sha256, fail } from '../skill-production/common.mjs';

export async function inspectFactionPhaseFieldEvidenceV1({ root, runId }) {
  if (!/^phase-repair-[a-f0-9]{20}$/.test(runId || '')) fail('FACTION_PHASE_EVIDENCE_ARGUMENTS');
  const base = path.join(root, 'build/ticket-18-faction-production-v1');
  const json = async n => verifySeal(JSON.parse(await readFile(path.join(base, n + '.json'), 'utf8')));
  const [recipe, report, candidate, sourceSection, capture, input] = await Promise.all([
    json(runId + '/recipe'), json(runId + '/report'), json(runId + '/candidate'), json(runId + '/source-section'),
    json(runId + '/source-capture'), json('terran_armed_forces-input')]);
  if (recipe.version !== 'faction_phase_field_repair_run_v1' || runId !== 'phase-repair-' + recipe.hash.slice(0, 20)
    || report.runId !== runId || report.recipeHash !== recipe.hash || report.failure || !report.actualPatchProduced
    || report.candidateHash !== candidate.hash || recipe.inputHash !== input.hash
    || recipe.sectionResultHash !== sourceSection.hash || recipe.sourceCaptureHash !== capture.hash
    || candidate.sourceReviewPassed !== false || candidate.runtimeAccepted !== false || candidate.trainingTruth !== false)
    fail('FACTION_PHASE_EVIDENCE_BINDING_DRIFT');
  const originalCapture = await json(recipe.sourceRunId + '/failed-review-role-input');
  const priorEvidence = await json(recipe.sourceRunId + '/review-metadata-recovery-readiness');
  if (originalCapture.hash !== capture.hash || priorEvidence.hash !== recipe.priorRequestEvidenceHash
    || priorEvidence.capturedRoleHash !== capture.hash || !priorEvidence.exactPriorProviderRequestsMatched
    || !priorEvidence.passed || capture.recipeHash !== recipe.sourceRecipeHash)
    fail('FACTION_PHASE_EVIDENCE_SOURCE_DRIFT');
  const producerFile = 'packages/skill-production-v3/faction-phase-field-repair-v1.mjs';
  if (recipe.codeHashes.find(c => c.file === producerFile)?.hash !== sha256(await readFile(path.join(root, producerFile))))
    fail('FACTION_PHASE_EVIDENCE_PRODUCER_DRIFT');
  const catalogue = await loadFrozenSkillEvidence(root), context = createGlobalProductionContext(catalogue);
  if (catalogue.hash !== recipe.catalogueHash || context.hash !== recipe.contextHash) fail('FACTION_PHASE_EVIDENCE_CONTEXT_DRIFT');
  const replay = openReadOnlyProductionReplayV1({ filename: path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite'),
    runId, recipe, commandPolicy: 'production_tools' });
  const loopComparisons = []; let previousReceiptCount = 0, delivery;
  try {
    const dsh = await prepareDshLoop(root);
    if (dsh.binding.hash !== recipe.dshBindingHash) fail('FACTION_PHASE_EVIDENCE_DSH_DRIFT');
    const store = { ...replay.store, finish(lease, value) {
      if (value.roleId) {
        const { hash: ignoredDelivery, ...body } = replay.evidence();
        const scoped = seal({ ...body, receiptHashes: body.receiptHashes.slice(previousReceiptCount) });
        loopComparisons.push(compareFactionFieldReplayLoopsV1(lease.saved.loop, value.loop, scoped));
        previousReceiptCount = body.receiptHashes.length;
        const { hash: ignoredRole, ...role } = value;
        value = seal({ ...role, loop: lease.saved.loop });
      }
      return replay.store.finish(lease, value);
    } };
    const runtime = createProductionRuntimeV3({ store, reader: createEvidenceReader(catalogue), context, verifier: {}, model: replay.model, dsh });
    const rebuilt = await repairFactionPhaseFieldsV1({ input, section: sourceSection.section, draft: sourceSection.draft, runtime, store });
    delivery = replay.evidence();
    const expectedRoles = Math.ceil(candidate.plan.targets.length / candidate.plan.batchSize);
    if (rebuilt.hash !== candidate.hash || rebuilt.plan.hash !== recipe.planHash
      || loopComparisons.length !== expectedRoles || delivery.matchedStepIds.length !== expectedRoles + 2)
      fail('FACTION_PHASE_EVIDENCE_RESULT_DRIFT');
  } finally { replay.close(); }
  const evidence = seal({ version: 'actual_faction_phase_field_evidence_v1', runId, recipeHash: recipe.hash,
    sourceRunId: recipe.sourceRunId, sourceRecipeHash: recipe.sourceRecipeHash, sourceSectionHash: sourceSection.hash,
    sourceCaptureHash: capture.hash, priorRequestEvidenceHash: priorEvidence.hash,
    inputHash: input.hash, candidateHash: candidate.hash, planHash: candidate.plan.hash,
    parentDraftHash: candidate.patch.parentDraftHash, repairedDraftHash: candidate.patch.draftHash,
    delivery, loopComparisons, actualProviderRequestsReplayed: true, actualProviderOutputReapplied: true,
    changedFields: candidate.patch.changes, unchangedRecommendationIndices: candidate.patch.unchangedRecommendationIndices,
    independentSourceReviewPassed: false, actualRoomReplayPerformed: false, runtimeAccepted: false,
    newProviderCalls: 0, trainingTruth: false });
  return { input, sourceSection, candidate, evidence };
}
