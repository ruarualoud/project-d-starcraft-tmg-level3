import { seal, verifySeal, hash, clone, fail } from '../skill-production/common.mjs';

const observed = '己方已Pass后：Pass后本阶段不能再激活单位，且Tenacity作为主动能力仍需10.2的当前激活窗口，因此己方Pass后通常无法再使用Tenacity；若规则允许卡牌能力在Pass后使用，需与对手确认';
const clarified = '己方已Pass后：Pass后本阶段不能再激活单位，且Tenacity作为主动能力仍需10.2的当前激活窗口，因此己方Pass后不能再使用Tenacity；若计划使用，应在己方Pass之前的合法激活窗口内安排。';

// This is a disclosed deterministic rule-fact correction, not model authorship,
// a new strategy claim, or a generic override of an uncertain model verdict.
export function clarifyFactionPhaseSeedV1({ input, candidate }) {
  [input, candidate].forEach(verifySeal);
  if (candidate.plan.inputHash !== input.hash) fail('FACTION_PHASE_CLARIFICATION_INPUT_DRIFT');
  const draft = clone(candidate.patch.draft), changes = [], sourceEvidence = [];
  const target = candidate.plan.targets.find(t => t.index === 0 && t.path === 'alternatives.1');
  if (target && draft.recommendations[0]?.alternatives[1] === observed) {
    const byRef = new Map(input.frozenSources.prompt.sources.map(source => [source.ref, source]));
    const read = ref => {
      const source = byRef.get(ref); if (!source) fail('FACTION_PHASE_CLARIFICATION_SOURCE_MISSING');
      sourceEvidence.push({ source, sourceHash: hash(source) }); return source.passages.map(p => p.text).join('');
    };
    const active = read('core.H3Fn8YSvEvpJZpT57qw1.items.2');
    const cards = read('core.H3Fn8YSvEvpJZpT57qw1.items.5');
    const passing = read('core.iuUyObNTQ2M8xK4IUqzC.items.2.subItems.0');
    const faction = JSON.parse(read('source:tactical_cards:terran_armed_forces'));
    const tenacity = faction.boosts.find(row => row.name === 'Terran Tenacity');
    if (!active.includes('A Unit may only use an Active Ability when it is currently Activated.')
      || !cards.includes('any Special Abilities that are resolved using the standard rules described in Parts 10.1 through 10.4.')
      || !passing.includes('may Pass instead of activating a Unit.')
      || !passing.includes('Once a player Passes, they cannot activate any further Units this Phase.')
      || !tenacity?.description.includes('<Active> <Movement Phase>')
      || !candidate.plan.targets.find(t => t.targetId === target.targetId)?.findings.some(f => f.id === 'tenacity-not-a-post-pass-active-exception'))
      fail('FACTION_PHASE_CLARIFICATION_SOURCE_DRIFT');
    draft.recommendations[0].alternatives[1] = clarified;
    changes.push({ targetId: target.targetId, index: 0, path: 'alternatives.1', before: observed, after: clarified,
      beforeHash: hash(observed), afterHash: hash(clarified), author: 'host_source_calibrated_rule_fact',
      reason: 'The frozen rules supply no own-Pass exception. Remove only the observed residual discretionary caveat; do not reopen game rules through opponent confirmation.' });
  }
  return seal({ version: 'faction_phase_seed_clarification_v1', inputHash: input.hash, actualCandidateHash: candidate.hash,
    parentDraftHash: candidate.patch.draftHash, draftHash: hash(draft), draft, changes, sourceEvidence,
    actualProviderOutputPreserved: true, modelAuthorshipClaimed: false, exactObservedTextOnly: true,
    newProviderCalls: 0, sourceReviewPassed: false, runtimeAccepted: false, trainingTruth: false });
}
