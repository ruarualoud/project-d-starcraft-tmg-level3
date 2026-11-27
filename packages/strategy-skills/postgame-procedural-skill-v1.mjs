import { clone, fail, freeze, hash, seal, verifySeal } from '../skill-production/common.mjs';

export function proceduralScopeFromBasisV1(skill) {
  if (skill.strategyCategory === 'learned_procedure') return clone(skill.applicabilityScope);
  if (skill.direction?.family === 'matchup') return {
    ownFaction: skill.direction.ownFaction, opponentFaction: skill.direction.opponentFaction };
  if (skill.factionRecordKey) return { ownFaction: skill.factionRecordKey, opponentFaction: null };
  if (skill.skillId === 'starcraft-tmg.general-rules-and-strategy') return { ownFaction: null, opponentFaction: null };
  fail('POSTGAME_PROCEDURE_BASIS_SCOPE_UNKNOWN');
}

// Model writes the procedure and its conditions. Identity, source lineage,
// dependencies and faction routing are inherited by Host, not invented text.
export function compilePostgameProceduralSkillV1({ reviewId, scope, creation, targetSkills, wiki }) {
  const index = /^skill-([1-9]\d*)$/u.exec(creation.basisSkillHandle)?.[1];
  const basis = index ? targetSkills[Number(index) - 1] : null;
  if (!basis) fail('POSTGAME_PROCEDURE_BASIS_REQUIRED');
  verifySeal(basis);
  const topics = creation.wikiTopicHandles.map(handle => {
    const topic = wiki?.topics.find(t => t.handle === handle);
    if (!topic) fail('POSTGAME_PROCEDURE_WIKI_SOURCE_REQUIRED');
    return { wikiId: wiki.wikiId, version: wiki.version, topic: topic.topic,
      sources: clone(topic.sources), modelAssessment: topic.modelAssessment };
  });
  return seal({ schema: 'project_d_game_skill_v1', gameId: 'starcraft-tmg', skillType: 'strategy',
    strategyCategory: 'learned_procedure',
    skillId: `starcraft-tmg.procedure.${hash({ reviewId, scope, title: creation.title }).slice(0, 24)}`,
    version: '1.0.0-research-candidate', title: creation.title, description: creation.description,
    rulesVersion: basis.rulesVersion, sourceBinding: clone(basis.sourceBinding),
    sourceRefs: clone(basis.sourceRefs || []), dependencies: { basisSkillHash: basis.hash },
    applicabilityScope: proceduralScopeFromBasisV1(basis),
    preconditions: clone(creation.applicableWhen),
    procedure: [{ axis: 'learned_procedure', title: creation.title, when: clone(creation.applicableWhen),
      objective: creation.expectedBenefit, steps: clone(creation.steps),
      alternatives: [{ option: creation.description, preferWhen: creation.applicableWhen.join('; ') }],
      risk: creation.knownRisk, reviseIf: clone(creation.reviseIf), requiredQueries: [] }],
    evidence: { reviewId, wikiTopicRefs: topics, basisSkillId: basis.skillId, basisSkillHash: basis.hash },
    status: 'quarantined_candidate', runtimeAccepted: false, published: false, canAffectStrategy: true,
    canAffectRules: false, fullGameStrategyEffectivenessProven: false, trainingTruth: false });
}

export function assertPostgameProceduralSkillV1(skill) {
  verifySeal(skill);
  const scope = skill.applicabilityScope;
  if (skill.strategyCategory !== 'learned_procedure' || skill.gameId !== 'starcraft-tmg'
    || skill.skillType !== 'strategy' || skill.canAffectRules !== false || skill.runtimeAccepted !== false
    || !skill.skillId?.startsWith('starcraft-tmg.procedure.') || !scope
    || !['ownFaction', 'opponentFaction'].every(k => scope[k] === null || /^tactical_cards:[a-z0-9_]+$/u.test(scope[k]))
    || (scope.opponentFaction && !scope.ownFaction) || !skill.dependencies?.basisSkillHash
    || !Array.isArray(skill.procedure) || !skill.procedure.length) fail('POSTGAME_PROCEDURE_INVALID');
  return skill;
}

export function selectPostgameProceduralEntriesV1(entries, ownFaction, opponentFaction) {
  const selected = entries.filter(e => e.role === 'procedure').filter(entry => {
    const skill = assertPostgameProceduralSkillV1(entry.skill);
    const scope = skill.applicabilityScope;
    return (!scope.ownFaction || scope.ownFaction === ownFaction)
      && (!scope.opponentFaction || scope.opponentFaction === opponentFaction);
  });
  if (new Set(selected.map(e => e.skill.skillId)).size !== selected.length) fail('POSTGAME_PROCEDURE_DUPLICATE');
  return freeze(clone(selected));
}
