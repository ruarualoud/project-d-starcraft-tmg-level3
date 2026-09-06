import { seal, verifySeal, hash, fail } from '../skill-production/common.mjs';

const fieldValue = (draft, index, path) => path.split('.').reduce((v, key) => v?.[key], draft.recommendations[index]);

// A source repair is a checkpoint, not permanent immunity from correction.
// Subsequent edits touching it require explicit revalidation. This check never
// calls altered wording false merely because its hash changed, nor permits a
// model-authored `supported` flag to erase the requirement.
export function createFactionRepairRegressionGuardV1({ input, imported }) {
  [input, imported, imported.binding, imported.actualPatch, imported.hostClarification].forEach(verifySeal);
  const { binding, actualPatch: patch, hostClarification: clarification } = imported;
  if (imported.version !== 'verified_phase_field_import_v1' || binding.inputHash !== input.hash
    || binding.patchHash !== patch.hash || binding.hostClarificationHash !== clarification.hash
    || binding.candidateHash !== clarification.actualCandidateHash || clarification.inputHash !== input.hash
    || binding.parentDraftHash !== imported.parentHash || patch.parentDraftHash !== imported.parentHash
    || binding.actualRepairedDraftHash !== patch.draftHash || patch.draftHash !== hash(patch.draft)
    || clarification.parentDraftHash !== patch.draftHash || clarification.draftHash !== hash(clarification.draft)
    || binding.repairedDraftHash !== clarification.draftHash || imported.resultHash !== clarification.draftHash
    || imported.oldReviewAcceptanceInherited !== false || imported.freshWholeSectionReviewRequired !== true
    || imported.trainingTruth !== false || patch.trainingTruth !== false || clarification.trainingTruth !== false)
    fail('FACTION_REPAIR_GUARD_IMPORT_DRIFT');
  const targets = new Map();
  for (const change of patch.changes) {
    if (!Number.isSafeInteger(change.index) || change.index < 0
      || !/^(when|procedure|alternatives|reviseIf|unproven)\.(0|[1-9][0-9]*)$|^risk$/u.test(change.path)
      || hash(fieldValue(patch.draft, change.index, change.path)) !== change.afterHash)
      fail('FACTION_REPAIR_GUARD_FIELD_DRIFT');
    const key = change.index + ':' + change.path;
    if (targets.has(key)) fail('FACTION_REPAIR_GUARD_FIELD_DRIFT');
    targets.set(key, { index: change.index, path: change.path, originalRepairHash: change.afterHash });
  }
  if (!targets.size) fail('FACTION_REPAIR_GUARD_FIELD_DRIFT');
  for (const change of clarification.changes) {
    if (!targets.has(change.index + ':' + change.path)
      || hash(fieldValue(patch.draft, change.index, change.path)) !== change.beforeHash
      || hash(fieldValue(clarification.draft, change.index, change.path)) !== change.afterHash)
      fail('FACTION_REPAIR_GUARD_FIELD_DRIFT');
  }
  return seal({ version: 'faction_repair_regression_guard_v1', inputHash: input.hash, sectionId: binding.sectionId,
    importHash: imported.hash, sourceBinding: input.sourceBinding, checkpointDraftHash: clarification.draftHash,
    protectedFields: [...targets.values()].map(t => ({ ...t,
      title: clarification.draft.recommendations[t.index].title,
      checkpointText: fieldValue(clarification.draft, t.index, t.path),
      checkpointFieldHash: hash(fieldValue(clarification.draft, t.index, t.path)) })),
    policy: 'changed_source_repair_fields_require_new_source_calibrated_revalidation',
    entireDraftCorrectnessProven: false, trainingTruth: false });
}

export function inspectFactionRepairRegressionV1({ input, guard, draft }) {
  [input, guard].forEach(verifySeal);
  if (guard.inputHash !== input.hash || hash(guard.sourceBinding) !== hash(input.sourceBinding)) fail('FACTION_REPAIR_GUARD_SOURCE_DRIFT');
  const changes = guard.protectedFields.flatMap(t => {
    const value = fieldValue(draft, t.index, t.path);
    if (typeof value === 'string' && hash(value) === t.checkpointFieldHash && draft.recommendations[t.index]?.title === t.title) return [];
    return [{ index: t.index, path: t.path, title: t.title, beforeHash: t.checkpointFieldHash,
      afterHash: value === undefined ? null : hash(value), missing: value === undefined,
      disposition: 'source_revalidation_required_not_automatically_false' }];
  });
  return seal({ version: 'faction_repair_regression_inspection_v1', guardHash: guard.hash,
    checkpointDraftHash: guard.checkpointDraftHash, proposedDraftHash: hash(draft), changes,
    requiresRevalidation: changes.length > 0, modelConsensusCannotWaive: true,
    candidateAccepted: false, sourceTruthInferredFromHash: false, trainingTruth: false });
}

export function assertNoFactionImportedRepairRegressionV1({ input, candidate }) {
  const imports = candidate.sections.flatMap(section => (section.edits || [])
    .filter(edit => edit.version === 'verified_phase_field_import_v1').map(imported => ({ section, imported })));
  if (candidate.phaseFieldBinding) {
    verifySeal(candidate.phaseFieldBinding);
    if (imports.length !== 1 || imports[0].imported.binding.hash !== candidate.phaseFieldBinding.hash
      || imports[0].section.section.id !== candidate.phaseFieldBinding.sectionId) fail('FACTION_REPAIR_GUARD_IMPORT_MISSING');
  } else if (imports.length) fail('FACTION_REPAIR_GUARD_IMPORT_MISSING');
  for (const { section, imported } of imports) {
    const guard = createFactionRepairRegressionGuardV1({ input, imported });
    const inspection = inspectFactionRepairRegressionV1({ input, guard, draft: section.draft });
    if (inspection.requiresRevalidation) fail('FACTION_REPAIRED_FIELDS_REQUIRE_REVALIDATION', { inspection });
  }
}
