import { hash, seal, verifySeal, fail } from '../skill-production/common.mjs';

export const STARCRAFT_TMG_FACTION_REPAIR_CONFLICT_HISTORY_VERSION =
  'starcraft_tmg_faction_repair_conflict_history_v1';

export function createFactionRepairConflictHistoryV1({ rounds, issue }) {
  if (!Array.isArray(rounds) || !Number.isInteger(issue?.index)) return null;
  rounds.forEach(verifySeal);
  const entries = rounds.flatMap(round => round.issues?.issues
    ?.filter(row => row.kind === 'recommendation_source_or_condition'
      && row.index === issue.index)
    .map(row => ({ revision: round.revision,
      issueHash: hash(row), rejectedRecommendationHash: row.oldHash,
      findings: structuredClone(row.findings) })) || []);
  if (!entries.length
    || entries.at(-1).issueHash !== hash(issue)
    || entries.some(row => !Number.isInteger(row.revision)
      || !/^[a-f0-9]{64}$/u.test(row.rejectedRecommendationHash)
      || !Array.isArray(row.findings) || !row.findings.length)) {
    fail('FACTION_REPAIR_CONFLICT_HISTORY_INVALID');
  }
  // One ordinary edit plus its fresh review is not an oscillation. Escalate
  // only after the same recommendation remains negative across three sealed
  // review rounds, so already-closed historical chapters keep exact reuse.
  if (entries.length < 3) return null;
  return seal({
    version: STARCRAFT_TMG_FACTION_REPAIR_CONFLICT_HISTORY_VERSION,
    sectionId: rounds.at(-1).sectionId,
    targetIndex: issue.index,
    currentIssueHash: hash(issue),
    entries,
    rejectedRecommendationHashes: [...new Set(entries
      .map(row => row.rejectedRecommendationHash))],
    repeatedNegativeRounds: entries.length,
    semanticOppositionProvenByHost: false,
    conservativeRepairRequired: true,
    resolutionPolicy: 'do_not_choose_the_opposite_assertion_remove_every_disputed_certainty_keep_only_independently_supported_strategy_and_explicit_unproven_branches',
    sourceReviewPassed: false,
    trainingTruth: false,
  });
}

export function verifyFactionRepairConflictProgressV1({ history, patch }) {
  verifySeal(history);
  const replacement = patch?.replacements?.find(row =>
    row.index === history.targetIndex);
  if (!replacement || patch.replacements.filter(row =>
    row.index === history.targetIndex).length !== 1) {
    fail('FACTION_REPAIR_CONFLICT_PATCH_INVALID');
  }
  const candidateHash = hash(replacement.value);
  if (history.rejectedRecommendationHashes.includes(candidateHash)) {
    fail('FACTION_REPAIR_REJECTED_VERSION_RESTORED', { candidateHash });
  }
  return seal({
    version: 'faction_repair_conflict_progress_receipt_v1',
    historyHash: history.hash,
    targetIndex: history.targetIndex,
    candidateHash,
    rejectedVersionsRestored: false,
    semanticConflictResolved: false,
    freshWholeSectionReviewRequired: true,
    trainingTruth: false,
  });
}
