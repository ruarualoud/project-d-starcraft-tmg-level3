import { factionLimitsCompatibleV1 } from './faction-budget-extension-v1.mjs';
import { DatabaseSync } from 'node:sqlite';
import { seal, verifySeal, hash, fail } from '../skill-production/common.mjs';
import { FACTION_ZERG_UNIT_TIMING_BINDING_V1 as binding,
  proposeFactionZergUnitTimingCorrectionV1 } from '../skill-evaluation/faction-zerg-unit-timing-audit-v1.mjs';
import { readFactionStructuredSuccessEvidenceV1 } from '../skill-evaluation/faction-structured-success-evidence-v1.mjs';
import { createFactionReviewContextCapsuleV1 } from './faction-review-context-capsule-v1.mjs';

export function readFactionZergUnitTimingOriginV1({ filename, input, diagnosis }) {
  [input, diagnosis].forEach(verifySeal);
  if (diagnosis.originRunId !== 'faction-v1-3241bb0aff2eda69e7c9'
    || diagnosis.originAttemptId !== 'structured-686b1584cab5543e1679878a7917529d4141f00aabd67730'
    || diagnosis.inputHash !== input.hash || !diagnosis.actualContextRebuilt)
    fail('FACTION_ZERG_UNIT_ORIGIN_INVALID');
  const evidence = readFactionStructuredSuccessEvidenceV1({ filename,
    runId: diagnosis.originRunId, attemptId: diagnosis.originAttemptId });
  const w = diagnosis.request.workspace, c = evidence.candidate;
  const capsule = createFactionReviewContextCapsuleV1({ factionInput: input, section: w.section, draft: w.draft,
    reviewIndices: w.reviewIndices, coverageRequiredSourceRefs: w.coverageRequiredSourceRefs,
    targets: w.outputRequestAtEnd.targetContract, roleRef: c.roleRef, outputContractRef: c.outputContractRef,
    route: 'adversarial', includeSharedScenarioSources: true });
  if (c.hash !== diagnosis.originalCandidateHash || c.providerReceiptHash !== diagnosis.originalReceiptHash
    || capsule.hash !== c.contextManifestRef.hash || capsule.hash !== diagnosis.capsuleHash)
    fail('FACTION_ZERG_UNIT_ORIGIN_DRIFT');
  const proposal = proposeFactionZergUnitTimingCorrectionV1({ input, draft: w.draft, binding });
  if (proposal?.changes.length !== 5) fail('FACTION_ZERG_UNIT_ORIGIN_DENOMINATOR');
  return seal({ version: 'faction_zerg_unit_timing_origin_v1', inputHash: input.hash,
    originRunId: diagnosis.originRunId, originAttemptId: diagnosis.originAttemptId,
    diagnosisHash: diagnosis.hash, originalCandidateHash: c.hash, originalReceiptHash: c.providerReceiptHash,
    capsuleHash: capsule.hash, proposal, sourceContextAuthenticated: true, trainingTruth: false });
}

export function validateFactionZergUnitTimingMigrationV1({ filename, parentRunId, parent, next, gate, diagnosis, inputs }) {
  if (!parent.zergUnitTimingBinding && !next.zergUnitTimingBinding) {
    if (gate || next.zergUnitTimingReadinessHash || parent.zergUnitTimingReadinessHash)
      fail('FACTION_ZERG_UNIT_MIGRATION_UNSCOPED');
    return null;
  }
  [parent, next, next.zergUnitTimingBinding, gate].forEach(verifySeal);
  if (next.zergUnitTimingBinding.hash !== binding.hash
    || parent.zergUnitTimingBinding && parent.zergUnitTimingBinding.hash !== binding.hash
    || !parent.zergUnitTimingBinding && parentRunId !== 'faction-v1-3241bb0aff2eda69e7c9'
    || gate.binding?.hash !== binding.hash || !gate.passed || gate.providerCalls !== 0
    || gate.hash !== next.zergUnitTimingReadinessHash || !gate.fullDraftPreserved
    || !gate.correctedBeforePaidReview || !gate.freshWholeSectionReviewRequired
    || !gate.negativeReviewBlocks || !gate.sqliteRestartPassed || !gate.runnerParametersBound
    || !gate.independentDebtVetoPassed || !gate.originalEvidenceAuthenticated
    || hash(parent.inputHashes) !== hash(next.inputHashes) || !factionLimitsCompatibleV1(parent, next))
    fail('FACTION_ZERG_UNIT_MIGRATION_INVALID');
  const db = new DatabaseSync(filename, { readOnly: true });
  try {
    if (db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n)
      fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
    if (db.prepare("SELECT count(*) n FROM attempts WHERE run=? AND state='intent'").get(parentRunId).n
      || db.prepare("SELECT count(*) n FROM steps WHERE run=? AND state='running'").get(parentRunId).n)
      fail('FACTION_ZERG_UNIT_PARENT_NOT_TERMINAL');
  } finally { db.close(); }
  const input = inputs?.find(i => i.hash === diagnosis?.inputHash);
  if (!input || !next.inputHashes.includes(input.hash)) fail('FACTION_ZERG_UNIT_INPUT_MISSING');
  const origin = readFactionZergUnitTimingOriginV1({ filename, input, diagnosis });
  if (origin.hash !== gate.origin.hash) fail('FACTION_ZERG_UNIT_ORIGIN_DRIFT');
  for (const row of gate.codeHashes)
    if (next.codeHashes.find(c => c.file === row.file)?.hash !== row.hash) fail('FACTION_ZERG_UNIT_CODE_DRIFT');
  return seal({ version: 'faction_zerg_unit_timing_migration_v1', bindingHash: binding.hash,
    readinessHash: gate.hash, originHash: origin.hash, parentRunId, files: gate.codeHashes.map(c => c.file),
    accountingReset: false, acceptanceInherited: false, trainingTruth: false });
}
