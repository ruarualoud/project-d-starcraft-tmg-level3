import { seal, verifySeal, hash, fail } from '../skill-production/common.mjs';

const ADVANCED = 'core.H3Fn8YSvEvpJZpT57qw1.items.';
const CARDS = ADVANCED + '5', ACTIVE = ADVANCED + '2';
const PASS = 'core.iuUyObNTQ2M8xK4IUqzC.items.2.subItems.0';
const MOVE = 'core.iuUyObNTQ2M8xK4IUqzC.items.5.subItems.2';

// A bounded, source-calibrated *reading* graph. It does not infer action
// legality, adjudicate a disputed review, or replace the complete corpus.
// In particular a citation list supplied by a draft is not a closed set of
// applicable rules. Preserve original passages and expose the dependency edges.
export function createFactionSourceDependencyContextV1({ input, sourceRefs }) {
  verifySeal(input); verifySeal(input.frozenSources);
  const sources = input.frozenSources.prompt.sources, byRef = new Map(sources.map(s => [s.ref, s]));
  if (!Array.isArray(sourceRefs) || !sourceRefs.length || sourceRefs.length > 64
    || new Set(sourceRefs).size !== sourceRefs.length || sourceRefs.some(ref => !byRef.has(ref)))
    fail('FACTION_SOURCE_DEPENDENCY_ROOTS_INVALID');
  const raw = ref => byRef.get(ref)?.passages.map(p => p.text).join('') || '';
  if (!raw(CARDS).includes('any Special Abilities that are resolved using the standard rules described in Parts 10.1 through 10.4.')
    || !raw(ACTIVE).includes('A Unit may only use an Active Ability when it is currently Activated.')
    || !raw(CARDS + '.subItems.1').includes('Every Tactical Card and Faction Card')
    || !raw(PASS).includes('Once a player Passes, they cannot activate any further Units this Phase.')
    || !raw(MOVE).includes('When a rule instructs a Unit to Move, Run, or otherwise reposition using standard movement'))
    fail('FACTION_SOURCE_DEPENDENCY_CALIBRATION_DRIFT');
  const selected = new Set(sourceRefs), queue = [...sourceRefs], edges = [], products = [];
  const add = (from, to, reason) => {
    if (!byRef.has(to)) fail('FACTION_SOURCE_DEPENDENCY_MISSING');
    if (!edges.some(e => e.from === from && e.to === to && e.reason === reason)) edges.push({ from, to, reason });
    if (!selected.has(to)) { selected.add(to); queue.push(to); }
  };
  for (let n = 0; n < queue.length; n++) {
    const ref = queue[n], text = raw(ref);
    if (ref.startsWith('source:')) {
      let product; try { product = JSON.parse(text); } catch { fail('FACTION_SOURCE_DEPENDENCY_PRODUCT_INVALID'); }
      const abilities = ['boosts', 'upgrades'].flatMap(field => (product[field] || [])
        .map((a, index) => ({ field, index, name: a.name, description: a.description,
          // These are literal printed labels, not guessed ability semantics.
          printedLabels: [...String(a.description || '').matchAll(/<([^<>]+)>/gu)].map(m => m[1]) })));
      products.push({ ref, sourceHash: hash(byRef.get(ref)), abilities });
      if (ref.startsWith('source:tactical_cards:')) add(ref, CARDS, 'card_layout_and_general_ability_rules');
      for (const ability of abilities) {
        for (const [label, item] of [['Active', '2'], ['Passive', '3'], ['Reaction', '4']])
          if (ability.printedLabels.includes(label)) add(ref, ADVANCED + item, 'printed_' + label + '_label');
        if (ability.printedLabels.includes('Movement Phase')) add(ref, PASS, 'phase_activation_and_pass_context');
        if (/\b(?:Move|Run)\b/u.test(ability.description || '')) add(ref, MOVE, 'rule_instructed_movement_context');
      }
    }
    if (ref === CARDS) {
      for (const item of ['1', '2', '3', '4']) add(ref, ADVANCED + item, 'explicit_parts_10_1_through_10_4_reference');
      add(ref, CARDS + '.subItems.0', 'card_resource_subsection');
      add(ref, CARDS + '.subItems.1', 'card_state_subsection');
    }
    if (ref === ADVANCED + '4') add(ref, ADVANCED + '4.subItems.0', 'reaction_summary_subsection');
    if (ref === ACTIVE) add(ref, PASS, 'activation_availability_context');
  }
  return seal({ version: 'faction_source_dependency_context_v1', inputHash: input.hash,
    contextHash: input.frozenSources.hash, sourceBinding: input.sourceBinding, roots: sourceRefs, edges,
    sources: sources.filter(s => selected.has(s.ref)), productAbilities: products,
    completeContextStillRequired: true, dependencyCatalogueComplete: false,
    selectionPurpose: 'source_reading_context_not_a_legality_or_acceptance_verdict',
    authoritativeTextRewritten: false, reviewerWaiverGranted: false, trainingTruth: false });
}
