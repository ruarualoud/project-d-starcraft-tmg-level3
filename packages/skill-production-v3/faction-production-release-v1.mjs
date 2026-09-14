import { DatabaseSync } from 'node:sqlite';
import { seal, verifySeal, hash, fail } from '../skill-production/common.mjs';

// Runtime compatibility is managed as a small, explicit release contract.
// File hashes and historical readiness receipts remain useful release evidence,
// but are deliberately not part of the production-start compatibility key.
export const FACTION_PRODUCTION_RELEASE_V1 = seal({
  version: 'faction_production_release_v1',
  release: 'starcraft-tmg.skill-production/1.0.1',
  skillContract: 'starcraft-tmg.faction-strategy/1',
  compatiblePatchPolicy:
    'same_source_inputs_skill_contract_model_budget_and_provider_receipt_semantics',
  hashPolicy: {
    startupBlocking: [
      'official_rules_faq_and_dataset_inputs',
      'skill_schema_and_semantic_contract_versions',
      'provider_request_receipt_and_budget_ledger',
    ],
    identityOnly: [
      'skill_content',
      'checkpoint_content',
      'cached_artifact_content',
    ],
    releaseEvidenceOnly: [
      'implementation_files',
      'test_files',
      'historical_readiness_files',
      'report_paths',
    ],
    identityHashNeverInvalidatesCompatiblePatch: true,
  },
  blockingSeverities: ['critical', 'high'],
  nonBlockingSeverities: ['important', 'medium', 'low'],
  nonBlockingEvidence: [
    'implementation_file_hashes',
    'test_file_hashes',
    'historical_readiness_file_hashes',
    'report_paths',
  ],
  existingSkillsKeepOriginalContentHash: true,
  sameRunCheckpointResume: true,
  sourceRefreshPerformed: false,
  trainingTruth: false,
});

const exactFields = Object.freeze([
  'version',
  'overallRunId',
  'overallDependencyHash',
  'modelLifecycleSelections',
  'nativeOutputCapacityFrozenRoleIds',
  'sharedScenarioReviewContext',
  'qualificationReceiptHash',
  'inputHashes',
  'planHashes',
  'catalogueHash',
  'sourceBinding',
  'contextHash',
  'modelHash',
  'knownRulePolicyHashes',
  'dshBindingHash',
  'limits',
  'proposerBatchFrozenRoleIds',
  'registeredSourceFieldRepair',
  'budgetExtension',
  'target',
  'independentEvaluationAnswersExposed',
  'sourceRefreshPerformed',
  'trainingTruth',
]);

const releaseContractProjection = recipe => {
  verifySeal(recipe);
  const bindingFields = Object.keys(recipe)
    .filter(key => /Binding(?:s)?$/u.test(key))
    .sort();
  const fields = [...new Set([...exactFields, ...bindingFields])].sort();
  return seal({
    version: 'faction_production_release_contract_projection_v1',
    release: FACTION_PRODUCTION_RELEASE_V1.release,
    fields: Object.fromEntries(fields.map(key => [key,
      Object.prototype.hasOwnProperty.call(recipe, key) ? recipe[key] : null])),
    excludedOperationalEvidence: [
      'codeHashes',
      '*ReadinessHash',
      '*ReadinessHashes',
      '*Origin',
      '*Origins',
      'wireKeyHelperRef',
      'continuation',
    ],
    trainingTruth: false,
  });
};

export function adaptExistingFactionProductionSkillV1({ artifact, recipe }) {
  verifySeal(recipe);
  verifySeal(artifact);
  if (artifact.gameId !== 'starcraft-tmg'
    || hash(artifact.sourceBinding) !== hash(recipe.sourceBinding)) {
    fail('FACTION_PRODUCTION_RELEASE_EXISTING_SKILL_SOURCE_DRIFT');
  }
  if (artifact.skillId === 'starcraft-tmg.general-rules-and-strategy') {
    if (artifact.schema !== 'project_d_game_skill_v1'
      || artifact.canAffectStrategy !== true
      || artifact.canAffectRules !== false
      || artifact.trainingTruth !== false) {
      fail('FACTION_PRODUCTION_RELEASE_GENERAL_SKILL_INVALID');
    }
    return seal({
      kind: 'general_rules_and_strategy',
      skillId: artifact.skillId,
      artifactHash: artifact.hash,
      originalContentHashPreserved: true,
      runtimeAccepted: artifact.runtimeAccepted === true,
      trainingTruth: false,
    });
  }
  if (artifact.schema !== 'starcraft_faction_strategy_candidate_v1'
    || !recipe.inputHashes.includes(artifact.inputHash)
    || !recipe.planHashes.includes(artifact.planHash)
    || artifact.overallDependencyHash !== recipe.overallDependencyHash
    || !recipe.knownRulePolicyHashes.includes(artifact.knownRulePolicyHash)
    || artifact.semanticReviewPassed !== true
    || artifact.canAffectRules !== false
    || artifact.trainingTruth !== false) {
    fail('FACTION_PRODUCTION_RELEASE_FACTION_SKILL_INVALID');
  }
  return seal({
    kind: 'faction_strategy_candidate',
    skillId: artifact.skillId,
    factionRecordKey: artifact.factionRecordKey,
    artifactHash: artifact.hash,
    sections: artifact.sections.length,
    originalContentHashPreserved: true,
    runtimeAccepted: artifact.runtimeAccepted === true,
    trainingTruth: false,
  });
}

export function createFactionProductionReleaseManifestV1({
  runId,
  recipe,
  currentRecipe,
  existingSkills = [],
  checkpointSummary = null,
}) {
  [recipe, currentRecipe].forEach(verifySeal);
  if (runId !== 'faction-v1-' + recipe.hash.slice(0, 20)) {
    fail('FACTION_PRODUCTION_RELEASE_RUN_ID_INVALID');
  }
  const released = releaseContractProjection(recipe);
  const current = releaseContractProjection(currentRecipe);
  if (released.hash !== current.hash) {
    const fields = [...new Set([
      ...Object.keys(released.fields),
      ...Object.keys(current.fields),
    ])].sort();
    fail('FACTION_PRODUCTION_RELEASE_CRITICAL_DRIFT', {
      releasedContractHash: released.hash,
      currentContractHash: current.hash,
      changedFields: fields.filter(field =>
        hash(released.fields[field] ?? null) !== hash(current.fields[field] ?? null)),
    });
  }
  if (checkpointSummary && (!Number.isSafeInteger(checkpointSummary.complete)
    || checkpointSummary.complete < 0
    || !Number.isSafeInteger(checkpointSummary.pending)
    || checkpointSummary.pending < 0)) {
    fail('FACTION_PRODUCTION_RELEASE_CHECKPOINT_SUMMARY_INVALID');
  }
  const adaptedSkills = existingSkills.map(artifact =>
    adaptExistingFactionProductionSkillV1({ artifact, recipe }));
  return seal({
    version: 'faction_production_release_manifest_v1',
    releaseBindingHash: FACTION_PRODUCTION_RELEASE_V1.hash,
    release: FACTION_PRODUCTION_RELEASE_V1.release,
    skillContract: FACTION_PRODUCTION_RELEASE_V1.skillContract,
    runId,
    recipeHash: recipe.hash,
    criticalContractHash: released.hash,
    compatibility: 'compatible_patch',
    blockingFindings: [],
    nonBlockingEvidencePolicy:
      'code_test_and_historical_readiness_hash_drift_is_recorded_not_a_startup_gate',
    existingSkills: adaptedSkills,
    checkpointSummary,
    sameRunCheckpointResume: true,
    providerCalls: 0,
    sourceRefreshPerformed: false,
    semanticAcceptanceInherited: false,
    trainingTruth: false,
  });
}

// Rebuild the exact ancestor cache view used when an existing run was first
// created. This preserves old role inputs while the current run itself keeps
// its original recipe and local budget registration.
export function restoreFactionProductionContinuationV1({ filename, manifest }) {
  verifySeal(manifest);
  const owners = new Map((manifest.checkpointInventory?.reusable || [])
    .map(row => [row.id, row.checkpointOwnerRunId]));
  const db = new DatabaseSync(filename, { readOnly: true });
  try {
    const steps = manifest.reusable.map(permit => {
      const ownerRunId = owners.get(permit.id) || manifest.parentRunId;
      const row = db.prepare(
        "SELECT input_hash,artifact FROM steps WHERE run=? AND id=? AND state='complete'")
        .get(ownerRunId, permit.id);
      if (!row) fail('FACTION_PRODUCTION_RELEASE_CHECKPOINT_MISSING');
      const artifact = verifySeal(JSON.parse(row.artifact)).value;
      if (row.input_hash !== permit.inputHash
        || hash(artifact) !== permit.artifactHash) {
        fail('FACTION_PRODUCTION_RELEASE_CHECKPOINT_DRIFT');
      }
      return { id: permit.id, inputHash: permit.inputHash, artifact };
    });
    return { manifest, steps };
  } finally { db.close(); }
}
