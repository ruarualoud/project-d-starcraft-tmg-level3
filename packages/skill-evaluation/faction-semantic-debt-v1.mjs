import { seal, verifySeal, hash, fail } from '../skill-production/common.mjs';

// A persisted independent counterexample, not a general natural-language
// theorem prover. Production model consensus cannot waive this exact debt.
export function inspectFactionSemanticDebtV1({ input, draft }) {
  verifySeal(input);
  if (!Array.isArray(draft?.recommendations)) fail('FACTION_SEMANTIC_DEBT_DRAFT_INVALID');
  const source = ref => {
    const row = input.frozenSources.prompt.sources.find(s => s.ref === ref);
    const manifest = input.frozenSources.manifest.sourceHashes.find(s => s.ref === ref);
    if (!row || !manifest) fail('FACTION_SEMANTIC_DEBT_SOURCE_UNAVAILABLE');
    return { source: row, sourceHash: manifest.hash };
  };
  const reaction = source('core.H3Fn8YSvEvpJZpT57qw1.items.4');
  const academy = source('source:tactical_cards:academy'), medic = source('source:army_units:medic');
  if (!reaction.source.passages.some(p => p.text.includes('Each player may resolve only one Reaction per each Activation.'))
    || !academy.source.passages.some(p => p.text.includes('Advanced Training <Reaction> <Any Phase>: Once per Round')))
    fail('FACTION_SEMANTIC_DEBT_SOURCE_DRIFT');
  let medicRecord;
  try { medicRecord = JSON.parse(medic.source.passages.map(p => p.text).join(' ')); }
  catch { fail('FACTION_SEMANTIC_DEBT_SOURCE_DRIFT'); }
  if (!medicRecord.upgrades?.find(u => u.name === 'Life Support')?.activation.includes('<Reaction>')) fail('FACTION_SEMANTIC_DEBT_SOURCE_DRIFT');
  const badText = '对手以高伤害攻击迫使Medic频繁使用Life Support时，优先保留Advanced Training用于最关键的减伤反应';
  const findings = draft.recommendations.flatMap((r, index) => {
    if (!Array.isArray(r.reviseIf) || r.reviseIf.some(t => typeof t !== 'string')) fail('FACTION_SEMANTIC_DEBT_DRAFT_INVALID');
    return r.reviseIf.flatMap((text, n) => text.includes(badText) ? [{
      id: 'academy-life-support-stale-revise-if-v1', index, path: 'reviseIf.' + n, recommendationHash: hash(r),
      text, textHash: hash(text), kind: 'known_source_backed_whole_advice_consistency_debt',
      sourceRefs: [reaction.source.ref, academy.source.ref, medic.source.ref],
      reason: 'Life Support and Advanced Training are both Reactions; a single activation cannot resolve both for that player. The revised procedure excludes the combination, but the retained adjustment advice still recommends its damage-reduction use.',
      scope: 'This exact Medic/Academy damage-reduction recommendation; not all Support abilities or complete action legality.',
    }] : []);
  });
  return seal({ version: 'faction_semantic_debt_v1', inputHash: input.hash, draftHash: hash(draft),
    sourceBinding: input.sourceBinding, sourceEvidence: [reaction, academy, medic], findings,
    knownSemanticDebtBlocksIndependentQualification: findings.length > 0,
    absenceProvesGeneralCorrectness: false, newProviderCalls: 0, runtimeAccepted: false, trainingTruth: false });
}
