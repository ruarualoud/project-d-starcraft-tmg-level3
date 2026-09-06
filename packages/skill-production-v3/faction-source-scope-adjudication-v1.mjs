import { seal, verifySeal, hash, clone, fail } from '../skill-production/common.mjs';

const KNOWN_ADVICE = '472805aa068c5459d6d8852c3b55f87730d98c964d6d09874e5aaf805874cee9';
const KNOWN_REASON = 'Advanced Medic Facilities原文仅称"Supply Value counts as 0 when calculating the Supply Pool"，未明示不影响Mission Marker争夺；Freedom Fighters原文限定"for Contesting Mission Markers and completing objectives"，作用域区分方向合理，但两能力同时作用于同一单位时（补给视为0 vs 下限1）的精确交互无官方来源裁决，建议已列入unproven，属未验证边界而非确定性断言。';
const MEDIC_TEXT = 'This Unit’s Supply Value counts as 0 when calculating the Supply Pool.';
const RAYNOR_TEXT = 'The Supply Value of all Friendly Units Within 8" of this Unit cannot be reduced below 1 for Contesting Mission Markers and completing objectives.';

// A narrowly source-calibrated resolution of one observed reviewer doubt.
// This is a host scope inference from exact official predicates, not an LLM
// majority vote, a complete Rules execution or a generic no-change escape.
export function adjudicateFactionSourceScopesV1({ input, draft, issues }) {
  verifySeal(input); verifySeal(issues);
  if (issues.parentHash !== hash(draft)) fail('FACTION_SCOPE_ADJUDICATION_PARENT_DRIFT');
  const resolutions = [], open = [];
  for (const issue of issues.issues) {
    if (input.factionRecordKey !== 'tactical_cards:terran_armed_forces'
      || issue.kind !== 'recommendation_source_or_condition' || issue.oldHash !== KNOWN_ADVICE
      || hash(draft.recommendations[issue.index]) !== KNOWN_ADVICE
      || issue.findings.length !== 1 || issue.findings[0].verdict !== 'uncertain'
      || issue.findings[0].kind === 'independent_source_counterexample'
      || issue.findings[0].reason !== KNOWN_REASON) { open.push(clone(issue)); continue; }
    const fact = (recordKey, abilityName, expectedText) => {
      const source = input.factionEvidence.armyPool.find(p => p.source.recordKey === recordKey)?.source;
      const ability = source?.content.upgrades.find(a => a.name === abilityName);
      const bound = input.frozenSources.manifest.sourceHashes.find(s => s.ref === source?.ref);
      if (!ability || ability.description !== expectedText || !bound) fail('FACTION_SCOPE_ADJUDICATION_SOURCE_DRIFT');
      return { ref: source.ref, sourceHash: bound.hash, abilityName, exactDescription: ability.description };
    };
    const evidence = [fact('army_units:medic', 'Advanced Medic Facilities', MEDIC_TEXT),
      fact('army_units:jim_raynor', 'Freedom Fighters', RAYNOR_TEXT)];
    const scopes = [
      { ability: 'Advanced Medic Facilities', appliesOnlyTo: ['supply_pool_calculation'], operation: 'count_supply_as_zero' },
      { ability: 'Freedom Fighters', appliesOnlyTo: ['mission_marker_contest', 'objective_completion'], operation: 'supply_floor_one_within_eight_inches' },
    ];
    const intersection = scopes[0].appliesOnlyTo.filter(s => scopes[1].appliesOnlyTo.includes(s));
    if (intersection.length) fail('FACTION_SCOPE_ADJUDICATION_NOT_DISJOINT');
    resolutions.push(seal({ issueHash: hash(issue), adviceHash: KNOWN_ADVICE, finding: issue.findings[0], evidence, scopes, intersection,
      disposition: 'no_change_supported_for_this_exact_scope_doubt',
      rationale: 'The zero replacement applies when calculating the Supply Pool; the floor applies when contesting/completing objectives. These predicates do not act on the same calculation. No special precedence between them is needed for the stated scope separation.',
      limits: 'Does not prove every statement in this advice, optimal play, other abilities, complete marker eligibility or a Room transition. Declared unproven strategic effects remain unproven.',
      originalFindingRetained: true, independentSourceFailuresWaived: false, actualRulesExecution: false, trainingTruth: false }));
  }
  const { hash: ignored, ...body } = issues;
  return seal({ rawIssuesHash: issues.hash, resolutions,
    openIssues: seal({ ...body, issues: open, openIssues: open.length, sourceScopeResolutionHashes: resolutions.map(r => r.hash), trainingTruth: false }),
    allOtherIssuesRetained: true, trainingTruth: false });
}
