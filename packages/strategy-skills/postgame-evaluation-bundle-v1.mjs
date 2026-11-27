import { clone, fail, freeze, hash, seal, verifySeal } from '../skill-production/common.mjs';
import { normalizePostgameLearningScopeV1 } from './postgame-learning-assets-v1.mjs';
import { compilePostgameExperienceSnapshotV1 } from './postgame-experience-memory-v1.mjs';
import { assertPostgameProceduralSkillV1, proceduralScopeFromBasisV1 } from './postgame-procedural-skill-v1.mjs';

const schema = 'starcraft_postgame_evaluation_bundle_v1';
const dependencyKeys = new Set(['generalSkillHash', 'ownFactionSkillHash', 'opponentFactionSkillHash', 'basisSkillHash']);

// Research candidates retain their quarantine status. This compiler rebuilds
// only internal Skill dependencies, never Rules/source identities or text.
export function compilePostgameEvaluationBundleV1({ asset, baselineBundle }) {
  if (!['quarantined_candidate', 'retained_baseline'].includes(asset?.status)) {
    fail('POSTGAME_EVALUATION_ASSET_NOT_READY');
  }
  const scope = normalizePostgameLearningScopeV1(asset.scope);
  const entries = baselineBundle?.entries;
  if (!Array.isArray(entries) || !entries.length) fail('POSTGAME_EVALUATION_BASELINE_REQUIRED');
  const refs = entries.map(({ skill }) => ({ id: skill.skillId, version: skill.version, hash: skill.hash }));
  if (hash(refs) !== hash(asset.baselineSkillRefs)) fail('POSTGAME_EVALUATION_BASELINE_MISMATCH');
  const parents = new Map(entries.map(e => [e.skill.hash, verifySeal(clone(e.skill))]));
  if (parents.size !== entries.length || new Set(refs.map(r => r.id)).size !== entries.length) {
    fail('POSTGAME_EVALUATION_DUPLICATE_SKILL');
  }
  const edits = new Map();
  for (const draft of asset.materializedSkills || []) {
    verifySeal(draft);
    const parent = parents.get(draft.parentSkillHash);
    if (!parent || parent.skillId !== draft.skillId || edits.has(parent.hash)
      || draft.status !== 'quarantined_candidate' || draft.runtimeAccepted !== false
      || draft.canAffectRules !== false || hash(draft.sourceBinding) !== hash(parent.sourceBinding)) {
      fail('POSTGAME_EVALUATION_EDIT_BINDING_INVALID');
    }
    edits.set(parent.hash, clone(draft));
  }
  const resolved = new Map(), visiting = new Set(), changes = [];
  function resolve(parentHash) {
    if (resolved.has(parentHash)) return resolved.get(parentHash);
    const parent = parents.get(parentHash);
    if (!parent) fail('POSTGAME_EVALUATION_DEPENDENCY_MISSING');
    if (visiting.has(parentHash)) fail('POSTGAME_EVALUATION_DEPENDENCY_CYCLE');
    visiting.add(parentHash);
    let value = clone(edits.get(parentHash) || parent);
    const rebound = [];
    // The source parent defines dependency identities. A semantic editor has
    // no authority to redirect one Skill to a different faction/version.
    if (hash(value.dependencies || {}) !== hash(parent.dependencies || {})) {
      fail('POSTGAME_EVALUATION_DEPENDENCY_EDIT_FORBIDDEN');
    }
    for (const [key, before] of Object.entries(parent.dependencies || {})) {
      if (!dependencyKeys.has(key)) continue;
      const after = resolve(before).hash;
      if (after !== before) { value.dependencies[key] = after; rebound.push(key); }
    }
    if (rebound.length) {
      const { hash: _old, ...body } = value;
      value = seal({ ...body, version: `${value.version}+bindings.${hash(value.dependencies).slice(0, 12)}`,
        parentSkillHash: parentHash, status: 'quarantined_candidate', runtimeAccepted: false,
        published: false, canAffectRules: false, fullGameStrategyEffectivenessProven: false, trainingTruth: false });
    }
    if (value.hash !== parentHash) changes.push({ skillId: value.skillId, parentHash,
      candidateHash: value.hash, semanticEdit: edits.has(parentHash), reboundDependencies: rebound });
    visiting.delete(parentHash); resolved.set(parentHash, value); return value;
  }
  const nextEntries = entries.map(entry => {
    const skill = resolve(entry.skill.hash);
    return skill.hash === entry.skill.hash ? clone(entry) : {
      ...clone(entry), skill, skillId: skill.skillId, skillHash: skill.hash,
      qualificationRef: { kind: 'unvalidated_postgame_candidate', hash: asset.contentHash },
    };
  });
  const ids = new Set(nextEntries.map(e => e.skill.skillId));
  for (const created of asset.createdSkills || []) {
    assertPostgameProceduralSkillV1(created);
    const basis = parents.get(created.dependencies.basisSkillHash);
    if (!basis || ids.has(created.skillId)
      || hash(created.sourceBinding) !== hash(basis.sourceBinding)
      || hash(created.applicabilityScope) !== hash(proceduralScopeFromBasisV1(basis))) fail('POSTGAME_PROCEDURE_CREATION_BINDING_INVALID');
    ids.add(created.skillId);
    const resolvedBasis = resolve(basis.hash);
    const { hash: _hash, ...body } = created;
    const skill = resolvedBasis.hash === basis.hash ? clone(created)
      : seal({ ...body, dependencies: { basisSkillHash: resolvedBasis.hash } });
    nextEntries.push({ role: 'procedure', skillId: skill.skillId, skillHash: skill.hash, skill,
      qualificationRef: { kind: 'unvalidated_postgame_candidate', hash: asset.contentHash } });
    changes.push({ skillId: skill.skillId, parentHash: null, candidateHash: skill.hash,
      creation: true, semanticEdit: true, reboundDependencies: resolvedBasis.hash === basis.hash ? [] : ['basisSkillHash'] });
  }
  return seal({ schemaVersion: schema, scope, sourceAssetId: asset.reviewId,
    sourceAssetHash: asset.contentHash, sourceEpisodeRefs: clone(asset.sourceEpisodeRefs),
    baselineBundleHash: hash(baselineBundle), entries: nextEntries, changes,
    memoryCandidates: clone(asset.memoryCandidates || []),
    wikiRef: clone(asset.wikiRef || null), purpose: 'isolated_postgame_evaluation',
    runtimeAccepted: false, automaticPromotion: false, canAffectRules: false, trainingTruth: false });
}

export function assertPostgameEvaluationBundleV1(bundle, subjectSeat) {
  verifySeal(bundle);
  if (bundle?.schemaVersion !== schema || bundle.purpose !== 'isolated_postgame_evaluation'
    || normalizePostgameLearningScopeV1(bundle.scope).ownerSeat !== subjectSeat
    || bundle.runtimeAccepted !== false || bundle.canAffectRules !== false) {
    fail('POSTGAME_EVALUATION_BUNDLE_SCOPE_INVALID');
  }
  // Validate the complete joint asset before creating a product room.
  compilePostgameExperienceSnapshotV1(bundle, subjectSeat);
  const byHash = new Map(bundle.entries.map(e => [e.skill.hash, verifySeal(e.skill)]));
  for (const { skill } of bundle.entries) for (const [key, ref] of Object.entries(skill.dependencies || {})) {
    if (dependencyKeys.has(key) && !byHash.has(ref)) fail('POSTGAME_EVALUATION_DEPENDENCY_MISSING');
  }
  return freeze(clone(bundle));
}

export function createPostgameEvaluationBundleServiceV1({ store, assets }) {
  async function prepare({ assetId, scope, baselineBundle }) {
    const asset = await assets.read({ assetId, scope });
    const bundle = compilePostgameEvaluationBundleV1({ asset, baselineBundle });
    const id = `evaluation-bundle:${assetId}`;
    const previous = await store.load(id);
    if (previous) {
      if (previous.bundle.hash !== bundle.hash) fail('POSTGAME_EVALUATION_BUNDLE_CHANGED');
      return freeze(clone(previous));
    }
    const record = { reviewId: id, revision: 0, schemaVersion: 'postgame_evaluation_bundle_record_v1',
      assetId, scope: clone(bundle.scope), bundle, updatedAt: new Date().toISOString() };
    const result = await store.commit(id, null, record);
    if (!result.ok) {
      const concurrent = await store.load(id);
      if (concurrent?.bundle?.hash !== bundle.hash) fail(result.reason || 'POSTGAME_EVALUATION_BUNDLE_COMMIT_FAILED');
      return freeze(clone(concurrent));
    }
    return freeze(clone(record));
  }
  return freeze({ prepare });
}
