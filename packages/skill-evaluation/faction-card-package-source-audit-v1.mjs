import { seal, verifySeal, hash, fail } from '../skill-production/common.mjs';

// Exact observed counterexample, not a keyword-based classifier of arbitrary prose.
export const FACTION_CARD_PACKAGE_COUNTEREXAMPLE_V1 = Object.freeze({
  id: 'different-unique-tactical-cards-are-not-mutually-exclusive',
  path: 'risk',
  observed: 'Proxy 的 Armed and Ready 消耗单位整个激活（推断，未直接证实），若部署后无法立即行动，可能浪费关键单位的输出机会；Tech Lab 成本更高但仅 +1 Core，若 Core 槽位已足则 Elite 槽位可能闲置；两者均 Unique，错误选择后无法在同一军队中补购另一张。',
  badClause: '两者均 Unique，错误选择后无法在同一军队中补购另一张。',
  correction: 'Unique 限制每一种卡各一份；不能仅凭 Unique 标记推导两种不同卡互斥，仍须按其他编军规则校验。',
});
const REFERENCES = [
  ['core.Rj6sMyNODPQ8OHUc9Clp.items.1.subItems.4', 'If a Tactical Card is marked as Unique, only one copy may be included in the army.'],
  ['core.u3zNStKpd5XegMjmJfMS.items.3', 'Unique Marking: If present, only one copy of this card may be included in an army.'],
];

export function inspectFactionCardPackageSourceDebtV1({ input, draft }) {
  verifySeal(input);
  const sources = new Map(input.frozenSources.prompt.sources.map(s => [s.ref, s]));
  const sourceEvidence = REFERENCES.map(([ref, quote]) => {
    const source = sources.get(ref), span = source?.passages.find(p => p.spanId === 'p1');
    if (!span?.text.includes(quote)) fail('FACTION_CARD_PACKAGE_UNIQUE_SOURCE_DRIFT');
    return { source, sourceHash: hash(source), spanId: span.spanId, quote, quoteHash: hash(quote) };
  });
  const counterexample = FACTION_CARD_PACKAGE_COUNTEREXAMPLE_V1;
  const findings = draft.recommendations.flatMap((r, index) => r.risk === counterexample.observed ? [{
    id: counterexample.id, index, path: 'risk', title: r.title, recommendationHash: hash(r),
    text: r.risk, textHash: hash(r.risk), sourceRefs: REFERENCES.map(([ref]) => ref),
    reason: 'Unique 只限制同一张卡的份数；不能将它推导为两种不同卡互斥。同条 procedure 已写各购一张，风险字段与之矛盾。',
    independentSourceCounterexample: true,
  }] : []);
  return seal({ version: 'faction_card_package_source_audit_v1', inputHash: input.hash, draftHash: hash(draft),
    sourceBinding: input.sourceBinding, findings, sourceEvidence,
    knownSemanticDebtBlocksIndependentQualification: findings.length > 0,
    exactKnownCounterexamplesOnly: true, absenceProvesGeneralCorrectness: false,
    newProviderCalls: 0, sourceRefreshPerformed: false, trainingTruth: false });
}

export function assertNoFactionCardPackageSourceDebtV1({ input, candidate }) {
  for (const section of candidate.sections) {
    const audit = inspectFactionCardPackageSourceDebtV1({ input, draft: section.draft });
    if (audit.knownSemanticDebtBlocksIndependentQualification)
      fail('FACTION_CANDIDATE_CARD_PACKAGE_SOURCE_DEBT', { auditHash: audit.hash });
  }
}

// A source-adjudicated proposal only. Production must bind the exact parent,
// run fresh whole-section reviews and independent evaluation before adoption.
export function proposeFactionUniqueClauseCorrectionV1({ input, draft }) {
  const audit = inspectFactionCardPackageSourceDebtV1({ input, draft });
  if (audit.findings.length !== 1) fail('FACTION_CARD_PACKAGE_CORRECTION_NOT_UNIQUE');
  const finding = audit.findings[0], proposed = structuredClone(draft), rule = FACTION_CARD_PACKAGE_COUNTEREXAMPLE_V1;
  proposed.recommendations[finding.index].risk = finding.text.replace(rule.badClause, rule.correction);
  return seal({ version: 'faction_unique_clause_correction_proposal_v1', inputHash: input.hash,
    parentDraftHash: hash(draft), proposedDraftHash: hash(proposed), proposedDraft: proposed,
    audit, changes: [{ index: finding.index, path: 'risk', beforeHash: finding.textHash,
      afterHash: hash(proposed.recommendations[finding.index].risk), removed: rule.badClause, added: rule.correction }],
    allUnflaggedFieldsPreserved: true, originalProviderOutputOverwritten: false,
    freshWholeSectionReviewRequired: true, sourceReviewPassed: false, independentEvaluationPassed: false,
    productionApplied: false, runtimeAccepted: false, canAffectRules: false, trainingTruth: false });
}
