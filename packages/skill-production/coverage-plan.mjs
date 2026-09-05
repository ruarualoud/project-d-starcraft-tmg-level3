import { seal, verifySeal, hash, fail, integer } from './common.mjs';
import { sourceSpans } from './spans.mjs';

const GENERAL_ID = 'skill.starcraft-tmg.how-to-play';
const FACTIONS = ['terran_armed_forces', 'zerg_swarm'];
export function createFirstFivePlan(catalogue, { maxSpans = 10, maxChars = 8000 } = {}) {
  verifySeal(catalogue); integer(maxSpans, 1, 20); integer(maxChars, 1000, 20000);
  const rows = catalogue.rows.filter(r => r.id.startsWith('core.') || r.id.startsWith('faq-v1:'));
  const eligible = rows.filter(r => !r.quarantined);
  const address = (row, span) => ({ ref: row.id, spanId: span.spanId, sourceHash: row.hash,
    textHash: hash(span.text), chars: span.text.length });
  const faqContext = eligible.filter(r => r.id.startsWith('faq-v1:'))
    .flatMap(row => sourceSpans(row).map(span => address(row, span)));
  const packets = []; let pending = [], chars = 0;
  function flush() {
    if (!pending.length) return;
    packets.push(seal({ id: 'rules-reading-' + String(packets.length + 1).padStart(3, '0'),
      skillId: GENERAL_ID, passages: pending, contextPassages: faqContext, chars, sourceBinding: catalogue.sourceBinding,
      catalogueHash: catalogue.hash, trainingTruth: false }));
    pending = []; chars = 0;
  }
  // Keep source order and whole deterministic spans. No topic regex can drop a
  // FAQ, unfamiliar heading or rule. A packet is a production job, not a Skill.
  for (const row of eligible) for (const span of sourceSpans(row)) {
    if (span.text.length > maxChars) fail('SOURCE_SPAN_EXCEEDS_PACKET');
    if (pending.length >= maxSpans || chars + span.text.length > maxChars) flush();
    pending.push(address(row, span));
    chars += span.text.length;
  }
  flush();
  const factions = FACTIONS.map(id => {
    const row = catalogue.rows.find(r => r.id === 'source:tactical_cards:' + id);
    if (!row || row.quarantined || !JSON.parse(row.text).isFactionCard) fail('OFFICIAL_FACTION_MISSING');
    return { skillId: 'skill.starcraft-tmg.faction.tactical-cards-' + id.replaceAll('_', '-'),
      family: 'faction', label: row.title, primarySourceRef: row.id, dependencies: [GENERAL_ID] };
  });
  const skills = [{ skillId: GENERAL_ID, family: 'how_to_play', dependencies: [] }, ...factions,
    ...factions.map((own, i) => ({ skillId: 'skill.starcraft-tmg.matchup.' + FACTIONS[i] + '-vs-' + FACTIONS[1 - i],
      family: 'matchup', ownFactionSkillId: own.skillId, opponentFactionSkillId: factions[1 - i].skillId,
      dependencies: [GENERAL_ID, ...factions.map(f => f.skillId)] }))];
  return seal({ version: 'first-five-production-plan-v1', catalogueHash: catalogue.hash,
    sourceBinding: catalogue.sourceBinding, limits: { maxSpans, maxChars }, skills, packets,
    counts: { skills: skills.length, sourceRows: rows.length, eligibleSourceRows: eligible.length,
      quarantinedSourceRows: rows.length - eligible.length, passages: packets.reduce((n, p) => n + p.passages.length, 0),
      readingPackets: packets.length },
    excluded: rows.filter(r => r.quarantined).map(r => ({ ref: r.id, hash: r.hash, reason: 'source_placeholder_quarantined' })),
    atomIndex: catalogue.atomIndex, sourceRefreshPerformed: false, trainingTruth: false,
    coverageMeaning: 'complete_reading_assignment_not_proof_of_semantic_or_executable_coverage' });
}

export function verifyFirstFivePlan(plan, catalogue) {
  verifySeal(plan);
  const expected = createFirstFivePlan(catalogue, plan.limits);
  if (expected.hash !== plan.hash) fail('PRODUCTION_COVERAGE_PLAN_DRIFT');
  return plan;
}
