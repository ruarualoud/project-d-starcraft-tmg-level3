import { seal, verifySeal, hash, fail } from '../skill-production/common.mjs';
import { FACTION_UNIQUE_CROSS_FIELD_AUDIT_BINDING_V1, inspectFactionUniqueCrossFieldDebtV1,
  proposeFactionUniqueCrossFieldCorrectionV1 } from '../skill-evaluation/faction-unique-cross-field-audit-v1.mjs';
import { FACTION_ZERG_CARD_ECONOMY_BINDING_V1, inspectFactionZergCardEconomyDebtV1,
  proposeFactionZergCardEconomyCorrectionV1 } from '../skill-evaluation/faction-zerg-card-economy-audit-v1.mjs';

// One source-adjudicated initial-production intervention, separate from
// replay/reflection upgrades and from transport-envelope recovery.
export const FACTION_INITIAL_SOURCE_CORRECTION_BINDING_V2 = seal({ version: 'faction_initial_source_correction_v2',
  auditBindings: [FACTION_UNIQUE_CROSS_FIELD_AUDIT_BINDING_V1.hash, FACTION_ZERG_CARD_ECONOMY_BINDING_V1.hash],
  source: 'exact_observed_official_source_counterexamples', stage: 'initial_skill_production',
  applyAllKnownFieldsAtomically: true, preserveAllOtherFields: true,
  originalPaidProseAndJudgmentsPreserved: true, freshWholeSectionReviewRequired: true,
  modelNegativeJudgmentsWaived: false, revisionBudgetReset: false,
  independentAcceptanceInherited: false, runtimeAccepted: false, trainingTruth: false });

export function validateFactionInitialSourceCorrectionBindingV2(binding) {
  if (verifySeal(binding).hash !== FACTION_INITIAL_SOURCE_CORRECTION_BINDING_V2.hash)
    fail('FACTION_INITIAL_SOURCE_CORRECTION_BINDING_INVALID');
  return binding;
}

export function inspectFactionInitialSourceDebtV2({ input, draft }) {
  const audits = [inspectFactionUniqueCrossFieldDebtV1({ input, draft }), inspectFactionZergCardEconomyDebtV1({ input, draft })];
  return seal({ version: 'faction_initial_source_debt_v2', inputHash: input.hash, parentDraftHash: hash(draft),
    audits, findings: audits.flatMap(a => a.findings),
    absenceProvesGeneralCorrectness: false, trainingTruth: false });
}

export function createFactionInitialSourceCorrectionV2({ input, draft, binding }) {
  validateFactionInitialSourceCorrectionBindingV2(binding);
  const audit = inspectFactionInitialSourceDebtV2({ input, draft });
  if (!audit.findings.length) return null;
  let proposedDraft = draft;
  const proposals = [];
  for (const [inspect, propose] of [
    [inspectFactionUniqueCrossFieldDebtV1, proposeFactionUniqueCrossFieldCorrectionV1],
    [inspectFactionZergCardEconomyDebtV1, proposeFactionZergCardEconomyCorrectionV1],
  ]) {
    if (!inspect({ input, draft: proposedDraft }).findings.length) continue;
    const proposal = propose({ input, draft: proposedDraft });
    proposals.push(proposal); proposedDraft = proposal.proposedDraft;
  }
  if (hash(draft) === hash(proposedDraft)) fail('FACTION_INITIAL_SOURCE_CORRECTION_NO_PROGRESS');
  const after = inspectFactionInitialSourceDebtV2({ input, draft: proposedDraft });
  if (after.findings.length) fail('FACTION_INITIAL_SOURCE_CORRECTION_DEBT_REMAINS');
  return seal({ version: 'faction_initial_source_correction_candidate_v2', bindingHash: binding.hash,
    inputHash: input.hash, parentDraftHash: hash(draft), proposedDraftHash: hash(proposedDraft), proposedDraft,
    audit, proposals, changes: proposals.flatMap(p => p.changes), after,
    initialProductionNotReflectionUpgrade: true, oldProviderOutputOverwritten: false,
    productionApplied: false, freshWholeSectionReviewRequired: true,
    semanticAcceptanceInherited: false, independentEvaluationPassed: false,
    runtimeAccepted: false, canAffectRules: false, trainingTruth: false });
}
