import {postgameWholeGameSourcePagesV1} from './postgame-whole-game-evidence-v1.mjs';
import {postgameDevelopmentSourcePagesV1} from './postgame-development-feedback-v1.mjs';
import { projectPostgameObservedDecisionV1 } from './postgame-observed-decision-v1.mjs';
import { clone, fail, freeze, hash, safe, seal, verifySeal } from '../skill-production/common.mjs';
import { assertPostgameProceduralSkillV1 } from './postgame-procedural-skill-v1.mjs';

// Shared research assets, using the existing durable CAS store. This service
// stages whole candidates; it cannot publish or change a live room's bundle.
const schema = 'starcraft_postgame_learning_assets_v1';
const wikiSchema = 'starcraft_postgame_research_wiki_v1';
const routes = new Set(['RW', 'RS', 'RMV', 'RH']);
const editable = ['procedure', 'skillOptAdvisories'];
const contentFields = ['direction', 'title', 'description', 'applicabilityScope', 'preconditions', 'procedure', 'knowledge', 'skillOptAdvisories',
  'legalityChecks', 'illegalPatterns', 'examples', 'counterExamples', 'sourceRefs'];

export function compilePostgameSkillMaterialsV1(skills) {
  return skills.map((skill, index) => ({
    handle: `skill-${index + 1}`, id: skill.skillId, version: skill.version,
    content: Object.fromEntries(contentFields.filter(k => Object.hasOwn(skill, k))
      .map(k => [k, clone(skill[k])])),
    editableSections: editable.map(field => ({ handle: field,
      operation: Object.hasOwn(skill, field) ? 'replace' : 'add',
      valueType: 'array', available: Object.hasOwn(skill, field) })),
    authority: 'advisory_strategy_rules_remain_external',
  }));
}

export function compilePostgameWikiSourcesV1(episodes, learningContext = null) {
  const wholePages=postgameWholeGameSourcePagesV1(learningContext?.wholeGames||[]);
  const wholeStates=new Set(wholePages.map(p=>p.source.postStateHash));
  return episodes.filter(e => e.evaluationSplit === 'development').flatMap((e, ei) =>
    e.decisions.filter(d=>!wholeStates.has(d.actualOutcome?.postStateHash)).map((d, di) => ({ handle: `episode-${ei + 1}/action-${di + 1}`,
      source: { episodeId: e.episodeId, episodeHash: e.hash, decisionId: d.decisionId,
        checkpoint: clone(d.checkpoint), originalExport: clone(e.engineeringSample || null) },
      context: clone(d.scenarioContext), action: clone(d.actualAction),
      outcome: clone(d.actualOutcome), observedFacts: projectPostgameObservedDecisionV1(d),
      interpretation: { authority: 'historical_model_explanation_not_native_fact',
        content: clone(d.publicDecisionSummary), mustBeCheckedAgainstObservedFacts: true },
      originalTraceHandle: `trace:episode-${ei + 1}/action-${di + 1}`,
      originalOutcomeWasAvailableAtDecisionTime: false,
      authority: 'saved_episode_observation_not_general_strategy_proof' }))).concat(postgameDevelopmentSourcePagesV1(learningContext),wholePages);
}

export function bindPostgameSkillEditV1(value, skills) {
  if (!value.skillHandle && !value.sectionHandle) return clone(value); // immutable old reply format
  const materials = compilePostgameSkillMaterialsV1(skills);
  const index = materials.findIndex(s => s.handle === value.skillHandle);
  const section = materials[index]?.editableSections.find(s => s.handle === value.sectionHandle);
  if (index < 0 || !section) fail('POSTGAME_EDIT_SELECTION_UNKNOWN');
  const targetSkillHash = skills[index].hash;
  const path = `/${section.handle}`;
  if ((value.targetSkillHash && value.targetSkillHash !== targetSkillHash)
    || (value.path && value.path !== path)
    || (value.operation && value.operation !== section.operation)) {
    fail('POSTGAME_EDIT_SELECTION_CONFLICT');
  }
  return { ...clone(value), targetSkillHash, path, operation: section.operation };
}

export function normalizePostgameLearningScopeV1(scope) {
  if (!scope || !routes.has(scope.route)
    || !['player1', 'player2'].includes(scope.ownerSeat)
    || typeof scope.experimentId !== 'string' || !scope.experimentId.trim()) {
    fail('POSTGAME_ASSET_SCOPE_REQUIRED');
  }
  return { experimentId: scope.experimentId, route: scope.route, ownerSeat: scope.ownerSeat };
}

function materialize(skills, candidates) {
  const parents = new Map(skills.map(s => [s.hash, verifySeal(clone(s))]));
  const changed = new Map(), paths = new Set();
  for (const candidate of candidates) {
    verifySeal(candidate);
    const parent = parents.get(candidate.parentSkillRef?.hash);
    if (!parent || candidate.canAffectRules !== false || candidate.runtimeAccepted !== false) {
      fail('POSTGAME_ASSET_PARENT_OR_AUTHORITY_INVALID');
    }
    const edit = candidate.minimalTypedChange;
    const field = editable.find(k => edit?.path === `/${k}`);
    if (!field || !Array.isArray(edit.value)
      || !['replace', 'add'].includes(edit.operation)) fail('POSTGAME_ASSET_EDIT_NOT_SUPPORTED');
    if (edit.targetSkillHash !== parent.hash
      || candidate.parentSkillRef.id !== parent.skillId
      || candidate.parentSkillRef.version !== parent.version) fail('POSTGAME_ASSET_EDIT_PARENT_MISMATCH');
    const key = `${parent.hash}:${field}`;
    if (paths.has(key)) fail('POSTGAME_ASSET_EDIT_CONFLICT');
    paths.add(key);
    const next = changed.get(parent.hash) || clone(parent);
    if ((edit.operation === 'replace') !== Object.hasOwn(parent, field)) {
      fail('POSTGAME_ASSET_EDIT_OPERATION_INVALID');
    }
    next[field] = clone(edit.value);
    changed.set(parent.hash, next);
  }
  return [...changed].map(([parentHash, value]) => {
    const { hash: _hash, ...body } = value;
    // Materialized research draft. The current online Registry has separate
    // qualification/dependency requirements; this does not make it loadable.
    return seal({ ...body, version: `${value.version}+review.${hash(value).slice(0, 12)}`,
      parentSkillHash: parentHash, status: 'quarantined_candidate',
      runtimeAccepted: false, published: false, humanReviewed: false,
      canAffectRules: false, fullGameStrategyEffectivenessProven: false, trainingTruth: false });
  });
}

export function createPostgameLearningAssetServiceV1({ store, now = () => new Date().toISOString() }) {
  async function wikiChain({ wikiId, scope }) {
    const ownedScope = normalizePostgameLearningScopeV1(scope);
    if (!['RW', 'RH'].includes(ownedScope.route)) fail('POSTGAME_WIKI_ROUTE_INVALID');
    const chain = [], visited = new Set();
    let currentId = wikiId;
    while (currentId) {
      if (visited.has(currentId)) fail('POSTGAME_WIKI_LINEAGE_CYCLE');
      visited.add(currentId);
      const row = await store.load(currentId);
      if (row?.schemaVersion !== wikiSchema || hash(row.scope) !== hash(ownedScope)) {
        fail('POSTGAME_WIKI_SCOPE_MISMATCH');
      }
      chain.push(row); currentId = row.parentWikiId;
    }
    return { chain, ownedScope };
  }

  async function readWiki({ wikiId, scope }) {
    const { chain, ownedScope } = await wikiChain({ wikiId, scope });
    const topics = new Map(), archived = [], evolution = [], impacts = [];
    for (const row of [...chain].reverse()) {
      const impactRecord = await store.load(`${row.reviewId}:impacts`);
      if (impactRecord) {
        if (impactRecord.schemaVersion !== 'postgame_wiki_impacts_v1'
          || hash(impactRecord.scope) !== hash(ownedScope)) fail('POSTGAME_WIKI_IMPACT_SCOPE_MISMATCH');
        impacts.push(...clone(impactRecord.entries));
      }
      const changes = [];
      for (const edit of row.entries) {
        for (const topic of edit.supersedesTopics || []) {
          const old = topics.get(topic);
          if (old) { archived.push({ ...old, supersededBy: edit.topic }); topics.delete(topic); }
        }
        const previous = topics.get(edit.topic);
        if (previous) archived.push({ ...previous, supersededBy: edit.topic });
        topics.set(edit.topic, { ...clone(edit),
          origin: { wikiId: row.reviewId, reviewId: row.sourceReviewId, version: row.version },
          rawTraceHandles: edit.sources.map(source => 'archive:' + hash(source)) });
        changes.push({ topic: edit.topic, operation: previous ? 'revise' : 'create',
          supersedesTopics: clone(edit.supersedesTopics || []),
          relatedTopics: clone(edit.relatedTopics || []), contradictsTopics: clone(edit.contradictsTopics || []),
          assessment: edit.modelAssessment });
      }
      evolution.push({ wikiVersion: row.version, changes, retentionReason: row.retentionReason });
    }
    return freeze({ wikiId, version: chain[0]?.version || 0, scope: ownedScope,
      topics: [...topics.values()].map((entry, index) => ({ handle: `topic-${index + 1}`, ...entry })),
      archivedTopics: archived.map((entry, index) => ({ handle: `history-topic-${index + 1}`, ...entry })),
      evolution, impacts,
      authority: 'research_only_unverified_interpretations',
      runtimeAccepted: false, canAffectRules: false, trainingTruth: false });
  }

  async function readWikiSources({ wikiId, scope }) {
    const { chain, ownedScope } = await wikiChain({ wikiId, scope });
    const pages = new Map(), unavailable = new Map();
    for (const row of [...chain].reverse()) {
      let originals = row.sourcePages;
      if (!originals) {
        // Resolve legacy rows from their own development review, never a new run.
        const review = await store.load(row.sourceReviewId);
        originals = review && hash(review.assetScope) === hash(ownedScope)
          ? compilePostgameWikiSourcesV1(review.episodes || []) : [];
      }
      for (const entry of row.entries) for (const source of entry.sources) {
        const handle = 'archive:' + hash(source);
        const original = originals.find(page => hash(page.source) === hash(source));
        if (original) {
          pages.set(handle, { ...clone(original), archiveHandle: handle, sourceReviewId: row.sourceReviewId });
          unavailable.delete(handle);
        } else if (!pages.has(handle)) unavailable.set(handle, {
          handle, source: clone(source), reason: 'original_development_source_unavailable' });
      }
    }
    return freeze({ pages: [...pages.values()], unavailable: [...unavailable.values()] });
  }

  async function stageWiki({ reviewId, scope, parentWikiId = null, episodes, reply, learningContext = null, maintenanceVersion = null, deliveredSourceHandles = null }) {
    const ownedScope = normalizePostgameLearningScopeV1(scope);
    if (!['RW', 'RH'].includes(ownedScope.route)) fail('POSTGAME_WIKI_ROUTE_INVALID');
    const prior = parentWikiId ? await readWiki({ wikiId: parentWikiId, scope: ownedScope }) : null;
    const available = new Map(compilePostgameWikiSourcesV1(episodes, learningContext).map(e => [e.handle, e]));
    if (!Array.isArray(reply?.wikiEdits)) fail('POSTGAME_WIKI_EDITS_REQUIRED');
    if (maintenanceVersion && maintenanceVersion !== 'wiki_maintenance_v2') fail('POSTGAME_WIKI_MAINTENANCE_VERSION_INVALID');
    const priorTopics = new Map((prior?.topics || []).map(topic => [topic.handle, topic]));
    function bindTopics(handles) {
      if (!Array.isArray(handles) || handles.some(h => !priorTopics.has(h))) {
        fail('POSTGAME_WIKI_RELATION_NOT_DELIVERED', { unavailable: Array.isArray(handles)
          ? handles.filter(h => !priorTopics.has(h)) : handles });
      }
      return [...new Set(handles)].map(h => priorTopics.get(h).topic);
    }
    const entries = reply.wikiEdits.map(edit => {
      if (typeof edit.topic !== 'string' || !edit.topic.trim()
        || typeof edit.lesson !== 'string' || !edit.lesson.trim()
        || !Array.isArray(edit.conditions) || !edit.conditions.length
        || edit.conditions.some(v => typeof v !== 'string' || !v.trim())
        || !Array.isArray(edit.limitations) || !edit.limitations.length
        || edit.limitations.some(v => typeof v !== 'string' || !v.trim())
        || !Array.isArray(edit.sourceEvidenceHandles) || !edit.sourceEvidenceHandles.length
        || !['conditional', 'unresolved', 'contradicted'].includes(edit.assessment)) {
        fail('POSTGAME_WIKI_SEMANTIC_CHOICE_REQUIRED');
      }
      const sources = [...new Set(edit.sourceEvidenceHandles)].map(handle => {
        const source = available.get(handle);
        if (!source || deliveredSourceHandles && !deliveredSourceHandles.includes(handle)) fail('POSTGAME_WIKI_SOURCE_NOT_DELIVERED', { handle });
        return clone(source.source);
      });
      const relationships = maintenanceVersion ? {
        relatedTopics: bindTopics(edit.relatedTopicHandles || []),
        contradictsTopics: bindTopics(edit.contradictsTopicHandles || []),
        supersedesTopics: bindTopics(edit.supersedesTopicHandles || []),
      } : {};
      // The same title revises a prior version, whose identity/evidence already
      // live in the parent chain. A related-to-self link adds no semantic claim.
      // Compile that redundant graph edge away; never erase contradictions/merges.
      const hostNormalizations = [];
      if (relationships.relatedTopics?.includes(edit.topic.trim())) {
        relationships.relatedTopics = relationships.relatedTopics.filter(topic => topic !== edit.topic.trim());
        hostNormalizations.push({ kind: 'redundant_revision_self_relation', topic: edit.topic.trim(),
          preservedBy: 'parent_wiki_and_archived_topic_revision' });
      }
      if (Object.values(relationships).some(topics => topics.includes(edit.topic.trim()))) fail('POSTGAME_WIKI_RELATION_SELF');
      if (relationships.supersedesTopics?.some(topic => relationships.contradictsTopics.includes(topic))) fail('POSTGAME_WIKI_RELATION_CONFLICT');
      return { topic: edit.topic.trim(), ...relationships, ...(hostNormalizations.length ? { hostNormalizations } : {}), conditions: clone(edit.conditions), lesson: edit.lesson,
        limitations: clone(edit.limitations), modelAssessment: edit.assessment,
        sources, status: 'unverified_research_entry', runtimeAccepted: false,
        canAffectRules: false, trainingTruth: false };
    });
    if (new Set(entries.map(e => e.topic)).size !== entries.length) fail('POSTGAME_WIKI_TOPIC_CONFLICT');
    const merged = entries.flatMap(e => e.supersedesTopics || []);
    if (new Set(merged).size !== merged.length || merged.some(topic => entries.some(e => e.topic === topic))) fail('POSTGAME_WIKI_MERGE_CONFLICT');
    const body = safe({ schemaVersion: wikiSchema, scope: ownedScope, sourceReviewId: reviewId,
      ...(maintenanceVersion ? { maintenanceVersion, sourcePages: [...available.values()].filter(page =>
        entries.some(entry => entry.sources.some(source => hash(source) === hash(page.source)))) } : {}),
      parentWikiId, version: (prior?.version || 0) + 1, entries,
      retentionReason: entries.length ? null : String(reply.retentionReason || 'No knowledge edits proposed.'),
      runtimeAccepted: false, canAffectRules: false, trainingTruth: false });
    const wikiId = `learning-wiki:${hash(ownedScope)}:${reviewId}`;
    if (wikiId === parentWikiId) fail('POSTGAME_WIKI_LINEAGE_CYCLE');
    const contentHash = hash(body), previous = await store.load(wikiId);
    if (previous && previous.contentHash !== contentHash) fail('POSTGAME_WIKI_IDEMPOTENCY_CONFLICT');
    if (!previous) {
      const result = await store.commit(wikiId, null,
        { ...body, reviewId: wikiId, revision: 0, contentHash, updatedAt: now() });
      if (!result.ok && (await store.load(wikiId))?.contentHash !== contentHash) {
        fail(result.reason || 'POSTGAME_WIKI_COMMIT_FAILED');
      }
    }
    return { wikiId, scope: ownedScope, version: body.version, contentHash };
  }

  async function stageReview({ record, scope }) {
    const ownedScope = normalizePostgameLearningScopeV1(scope);
    if (record.phase !== 'candidate_assets' || !record.reviewId
      || record.calls?.propose?.status !== 'completed') fail('POSTGAME_ASSET_REVIEW_NOT_READY');
    const candidates = clone(record.skillOptCandidates || []);
    const memories = clone(record.mementoCandidates || []);
    const createdSkills = clone(record.createdSkills || []);
    for (const skill of createdSkills) {
      assertPostgameProceduralSkillV1(skill);
      if (skill.evidence?.reviewId !== record.reviewId
        || !record.targetSkills.some(s => s.hash === skill.dependencies.basisSkillHash)) fail('POSTGAME_PROCEDURE_SOURCE_INVALID');
    }
    for (const m of memories) {
      verifySeal(m);
      if (m.runtimeAccepted !== false || m.canAffectRules !== false) fail('POSTGAME_ASSET_MEMORY_AUTHORITY_INVALID');
    }
    const body = safe({ schemaVersion: schema, scope: ownedScope,
      sourceReviewId: record.reviewId,
      ...(record.wikiRef ? { wikiRef: clone(record.wikiRef) } : {}),
      sourceEpisodeRefs: record.episodes.map(e => ({ id: e.episodeId, hash: e.hash,
        split: e.evaluationSplit, engineeringSample: e.engineeringSample || null })),
      baselineSkillRefs: record.targetSkills.map(s => ({ id: s.skillId, version: s.version, hash: s.hash })),
      skillCandidates: candidates, memoryCandidates: memories,
      materializedSkills: materialize(record.targetSkills, candidates),
      ...(createdSkills.length ? { createdSkills } : {}),
      status: record.findingsSummary.blocking ? 'blocked_engineering_or_fact_review'
        : candidates.length || memories.length || createdSkills.length ? 'quarantined_candidate' : 'retained_baseline',
      retentionReason: candidates.length || memories.length || createdSkills.length ? null
        : String(record.calls.propose.result?.retentionReason || 'No asset changes proposed.'),
      memoryAvailableToRuntime: false, runtimeAccepted: false, automaticPromotion: false,
      canAffectRules: false, trainingTruth: false });
    // Hash identifies this exact input, not a compatibility gate on old runs.
    const assetId = `learning-assets:${hash(ownedScope)}:${record.reviewId}`;
    const contentHash = hash(body);
    const previous = await store.load(assetId);
    if (previous) {
      if (previous.contentHash !== contentHash) fail('POSTGAME_ASSET_IDEMPOTENCY_CONFLICT');
      return { assetId, scope: ownedScope, status: previous.status, contentHash };
    }
    const next = { ...body, reviewId: assetId, revision: 0, contentHash, updatedAt: now() };
    const result = await store.commit(assetId, null, next);
    if (!result.ok) {
      const concurrent = await store.load(assetId);
      if (concurrent?.contentHash !== contentHash) fail(result.reason || 'POSTGAME_ASSET_COMMIT_FAILED');
    }
    return { assetId, scope: ownedScope, status: next.status, contentHash };
  }

  async function read({ assetId, scope, purpose = 'research' }) {
    const ownedScope = normalizePostgameLearningScopeV1(scope);
    const record = await store.load(assetId);
    if (record?.schemaVersion !== schema || hash(record.scope) !== hash(ownedScope)) {
      fail('POSTGAME_ASSET_SCOPE_MISMATCH');
    }
    if (purpose !== 'research') fail('POSTGAME_ASSET_NOT_RELEASED');
    return freeze(clone(record));
  }
  return freeze({ stageReview, read, stageWiki, readWiki, readWikiSources });
}
