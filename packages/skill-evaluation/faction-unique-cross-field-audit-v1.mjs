import { seal, verifySeal, hash, fail } from '../skill-production/common.mjs';
import { inspectFactionCardPackageSourceDebtV1, FACTION_CARD_PACKAGE_COUNTEREXAMPLE_V1 } from './faction-card-package-source-audit-v1.mjs';

const clause = '两者均为 Unique，不可同时购买。';
const cards = ['source:tactical_cards:barracks__proxy_', 'source:tactical_cards:barracks__tech_lab_'];
export const FACTION_UNIQUE_CROSS_FIELD_AUDIT_BINDING_V1 = seal({ version: 'faction_unique_cross_field_audit_v1',
  clause, requiredCards: cards, scope: 'all_advice_fields_exact_unquoted_terminal_assertion',
  sourceGroundedCounterexampleOnly: true, absenceProvesGeneralCorrectness: false, canAffectRules: false, trainingTruth: false });

export function inspectFactionUniqueCrossFieldDebtV1({ input, draft }) {
  verifySeal(input);
  const { sourceEvidence } = inspectFactionCardPackageSourceDebtV1({ input, draft });
  const findings = [];
  for (const [index, advice] of draft.recommendations.entries()) {
    if (!cards.every(ref => advice.sourceRefs.includes(ref))) continue;
    for (const key of ['title', 'when', 'procedure', 'alternatives', 'risk', 'reviseIf', 'unproven']) {
      const rows = Array.isArray(advice[key]) ? advice[key].map((text, n) => ({ path: key + '.' + n, text })) : [{ path: key, text: advice[key] }];
      for (const row of rows) {
        if (typeof row.text !== 'string' || !row.text.endsWith(clause)) continue;
        const start = row.text.length - clause.length, prefix = row.text.slice(0, start);
        // Quoted/negated examples are not automatically treated as assertions.
        if (start && !['，', '；', ';'].includes(prefix.at(-1)) || /[“”「」『』"]|错误观点|错误示例|反例|不能认为|不要认为|并非/u.test(prefix)) continue;
        findings.push({ id: 'different-unique-cards-procedure-mutual-exclusion', index, path: row.path,
          text: row.text, textHash: hash(row.text), recommendationHash: hash(advice), clauseStart: start, clauseEnd: row.text.length,
          sourceRefs: sourceEvidence.map(e => e.source.ref), sourceGrounded: true });
      }
    }
  }
  return seal({ version: 'faction_unique_cross_field_audit_v1.result', inputHash: input.hash, draftHash: hash(draft),
    bindingHash: FACTION_UNIQUE_CROSS_FIELD_AUDIT_BINDING_V1.hash, sourceEvidence, findings,
    knownSemanticDebtBlocksIndependentQualification: findings.length > 0, absenceProvesGeneralCorrectness: false,
    providerCalls: 0, trainingTruth: false });
}

export function assertNoFactionUniqueCrossFieldDebtV1({ input, candidate }) {
  for (const section of candidate.sections) {
    const audit = inspectFactionUniqueCrossFieldDebtV1({ input, draft: section.draft });
    if (audit.findings.length) fail('FACTION_CANDIDATE_UNIQUE_CROSS_FIELD_DEBT', { auditHash: audit.hash });
  }
}

// Explicit local proposal, never an in-place rewrite of a Provider artifact.
// Production must reproduce this parent and perform fresh whole-section review.
export function proposeFactionUniqueCrossFieldCorrectionV1({ input, draft }) {
  const audit = inspectFactionUniqueCrossFieldDebtV1({ input, draft });
  if (!audit.findings.length) fail('FACTION_UNIQUE_CROSS_FIELD_NO_TARGET');
  const proposedDraft = structuredClone(draft), changes = [];
  for (const finding of audit.findings) {
    const [key, ordinal] = finding.path.split('.'), value = finding.text.slice(0, finding.clauseStart) + FACTION_CARD_PACKAGE_COUNTEREXAMPLE_V1.correction;
    if (ordinal === undefined) proposedDraft.recommendations[finding.index][key] = value;
    else proposedDraft.recommendations[finding.index][key][Number(ordinal)] = value;
    changes.push({ index: finding.index, path: finding.path, beforeHash: finding.textHash, afterHash: hash(value),
      preservedPrefixHash: hash(finding.text.slice(0, finding.clauseStart)) });
  }
  return seal({ version: 'faction_unique_cross_field_correction_proposal_v1', inputHash: input.hash, audit,
    parentDraftHash: hash(draft), proposedDraftHash: hash(proposedDraft), proposedDraft, changes,
    productionApplied: false, freshWholeSectionReviewRequired: true, semanticAcceptanceInherited: false,
    independentEvaluationPassed: false, runtimeAccepted: false, trainingTruth: false });
}
