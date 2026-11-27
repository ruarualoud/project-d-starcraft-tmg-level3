import { clone, fail, freeze, hash, seal, verifySeal } from '../skill-production/common.mjs';

export function compilePostgameExperienceSnapshotV1(bundle, seat) {
  if (!bundle?.memoryCandidates?.length) return null;
  verifySeal(bundle);
  if (bundle.schemaVersion !== 'starcraft_postgame_evaluation_bundle_v1'
    || bundle.purpose !== 'isolated_postgame_evaluation' || bundle.scope?.ownerSeat !== seat) {
    fail('POSTGAME_EXPERIENCE_SCOPE_INVALID');
  }
  const cases = bundle.memoryCandidates.map((memory, index) => {
    verifySeal(memory);
    if (memory.schema !== 'project_d_memento_candidate_v2'
      || !memory.findingId || !memory.lesson?.trim()
      || !memory.scenarioPredicate || !Object.keys(memory.scenarioPredicate).length
      || !Array.isArray(memory.reviseIf) || !memory.reviseIf.length
      || memory.runtimeAccepted !== false || memory.canAffectRules !== false) {
      fail('POSTGAME_EXPERIENCE_CONDITIONS_REQUIRED');
    }
    return { handle: `experience-${index + 1}`, condition: clone(memory.scenarioPredicate),
      lesson: memory.lesson, reviseIf: clone(memory.reviseIf),
      source: { candidateHash: memory.hash, findingId: memory.findingId,
        assetHash: bundle.sourceAssetHash, episodes: clone(bundle.sourceEpisodeRefs) },
      knowledgeStatus: 'unvalidated_conditional_interpretation', rulesAuthority: false };
  });
  return seal({ schemaVersion: 'postgame_experience_snapshot_v1', scope: clone(bundle.scope),
    sourceBundleHash: hash(bundle), cases, frozenForMatch: true,
    purpose: 'isolated_postgame_evaluation', rulesAuthority: false, trainingTruth: false });
}

export function assertPostgameExperienceSnapshotV1(snapshot, seat) {
  if (!snapshot) return null;
  verifySeal(snapshot);
  if (snapshot.schemaVersion !== 'postgame_experience_snapshot_v1'
    || snapshot.scope?.ownerSeat !== seat || snapshot.purpose !== 'isolated_postgame_evaluation'
    || snapshot.rulesAuthority !== false || !Array.isArray(snapshot.cases)) {
    fail('POSTGAME_EXPERIENCE_SCOPE_INVALID');
  }
  return freeze(clone(snapshot));
}

export function projectPostgameExperienceIndexV1(snapshot) {
  if (!snapshot) return null;
  return { version: snapshot.hash, totalCases: snapshot.cases.length,
    cases: snapshot.cases.map(c => ({ handle: c.handle, condition: clone(c.condition) })),
    queryTool: 'retrieve_match_memory', queryField: 'text',
    interpretation: 'Conditional research experiences, not Rules facts or this match history. Query by handle or text; check conditions and reviseIf before applying.' };
}

// Keep exact current-match records intact. Cross-match interpretations have a
// separate result field and never acquire an event sequence or Native receipt.
export function createPostgameExperienceMemoryPortV1({ base, snapshot, scope }) {
  if (!snapshot) return base;
  const frozen = assertPostgameExperienceSnapshotV1(snapshot, scope.seatKey);
  if (typeof base?.query !== 'function') fail('POSTGAME_MATCH_MEMORY_PORT_REQUIRED');
  return freeze({ async query(input) {
    for (const key of ['roomId', 'matchBindingHash', 'seatKey']) {
      if (input.scope?.[key] !== scope[key]) fail('POSTGAME_EXPERIENCE_QUERY_SCOPE_INVALID');
    }
    const current = await base.query(input);
    for (const key of ['roomId', 'matchBindingHash', 'seatKey']) {
      if (current.scope?.[key] !== scope[key]) fail('POSTGAME_MATCH_MEMORY_SCOPE_INVALID');
    }
    const text = String(input.query?.text || '').trim().toLocaleLowerCase();
    const terms = text.split(/\s+/u).filter(Boolean);
    const matches = frozen.cases.filter(c => !terms.length || terms.some(t =>
      `${c.handle} ${JSON.stringify(c.condition)} ${c.lesson}`.toLocaleLowerCase().includes(t)));
    const limit = Math.max(1, Math.min(12, Number(input.query?.limit) || 6));
    const { queryResultHash: _hash, ...body } = current;
    const result = { ...clone(body), conditionalExperiences: {
      snapshotHash: frozen.hash, sourceBundleHash: frozen.sourceBundleHash,
      matchedCount: matches.length, cases: clone(matches.slice(0, limit)),
      hasMore: matches.length > limit, source: 'frozen_cross_match_research_memory',
      rulesAuthority: false, currentMatchHistory: false,
    } };
    return freeze({ ...result, queryResultHash: hash(result) });
  } });
}
