import { FACTION_CARD_PACKAGE_COUNTEREXAMPLE_V1 as known,
  inspectFactionCardPackageSourceDebtV1 } from './faction-card-package-source-audit-v1.mjs';
import { seal, verifySeal, hash, fail } from '../skill-production/common.mjs';

export const FACTION_UNIQUE_RISK_CLAUSE_BINDING_V2 = seal({ version: 'faction_unique_risk_clause_v2',
  knownAssertion: known.badClause, replacement: known.correction,
  target: 'exact_terminal_assertion_after_semicolon_or_at_start_of_risk',
  unaffectedPrefixMayChange: true, quotedOrNegatedCounterexampleNotAutomaticallyEdited: true,
  allOtherTextPreserved: true, freshWholeSectionReviewRequired: true,
  semanticAcceptanceInherited: false, canAffectRules: false, trainingTruth: false });

function clauseStart(risk) {
  if (typeof risk !== 'string' || !risk.endsWith(known.badClause)) return null;
  const start = risk.length - known.badClause.length;
  if (start && ![';', '；'].includes(risk[start - 1])) return null;
  return start;
}

export function inspectFactionUniqueRiskClauseV2({ input, draft }) {
  verifySeal(input);
  // Reuse the independent exact official quotations, never the V1 whole-
  // paragraph finding as evidence that a changed prefix fixed the assertion.
  const baseline = inspectFactionCardPackageSourceDebtV1({ input, draft });
  const findings = draft.recommendations.flatMap((r, index) => {
    const start = clauseStart(r.risk);
    return start === null ? [] : [{ id: known.id, index, path: 'risk', title: r.title,
      recommendationHash: hash(r), text: r.risk, textHash: hash(r.risk),
      clause: known.badClause, clauseStart: start, clauseEnd: r.risk.length,
      sourceRefs: baseline.sourceEvidence.map(e => e.source.ref),
      reason: 'Different Unique cards are not mutually exclusive merely because of Unique; the exact wrong assertion remains despite edits to other sentences.',
      independentSourceCounterexample: true }];
  });
  return seal({ version: 'faction_unique_risk_clause_audit_v2', inputHash: input.hash,
    draftHash: hash(draft), bindingHash: FACTION_UNIQUE_RISK_CLAUSE_BINDING_V2.hash,
    sourceBinding: input.sourceBinding, sourceEvidence: baseline.sourceEvidence, findings,
    knownSemanticDebtBlocksIndependentQualification: findings.length > 0,
    exactKnownCounterexamplesOnly: true, absenceProvesGeneralCorrectness: false,
    newProviderCalls: 0, trainingTruth: false });
}

export function proposeFactionUniqueRiskClauseCorrectionV2({ input, draft }) {
  const audit = inspectFactionUniqueRiskClauseV2({ input, draft });
  if (audit.findings.length !== 1) fail('FACTION_UNIQUE_RISK_CLAUSE_TARGET_NOT_UNIQUE');
  const finding = audit.findings[0];
  if (finding.text.split(known.badClause).length !== 2) fail('FACTION_UNIQUE_RISK_CLAUSE_TARGET_NOT_UNIQUE');
  const proposed = structuredClone(draft), before = finding.text;
  proposed.recommendations[finding.index].risk = before.slice(0, finding.clauseStart) + known.correction;
  return seal({ version: 'faction_unique_clause_correction_proposal_v2', inputHash: input.hash,
    bindingHash: FACTION_UNIQUE_RISK_CLAUSE_BINDING_V2.hash,
    parentDraftHash: hash(draft), proposedDraftHash: hash(proposed), proposedDraft: proposed, audit,
    changes: [{ index: finding.index, path: 'risk', beforeHash: finding.textHash,
      afterHash: hash(proposed.recommendations[finding.index].risk),
      preservedPrefixHash: hash(before.slice(0, finding.clauseStart)), removed: known.badClause, added: known.correction }],
    allUnflaggedFieldsPreserved: true, originalProviderOutputOverwritten: false,
    freshWholeSectionReviewRequired: true, sourceReviewPassed: false, independentEvaluationPassed: false,
    productionApplied: false, runtimeAccepted: false, canAffectRules: false, trainingTruth: false });
}

export function assertNoFactionUniqueRiskClauseV2({ input, candidate }) {
  for (const section of candidate.sections) {
    const audit = inspectFactionUniqueRiskClauseV2({ input, draft: section.draft });
    if (audit.findings.length) fail('FACTION_CANDIDATE_UNIQUE_RISK_CLAUSE_DEBT', { auditHash: audit.hash });
  }
}
