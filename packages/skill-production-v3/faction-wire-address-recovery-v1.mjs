import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { seal, verifySeal, hash, fail } from '../skill-production/common.mjs';
import { factionReviewDecompositionArgsV1 } from './faction-review-decomposition-continuation-v1.mjs';
import { prepareFactionReviewDecompositionV1, createFactionReviewFragmentCapsuleV1,
  FACTION_REVIEW_DECOMPOSITION_BINDING_V1 } from './faction-review-decomposition-v1.mjs';
import { loadFactionOpeningFenceEnvironmentV1 } from './faction-opening-fence-environment-v1.mjs';
import { inspectFactionWireKeyHelperV2 } from './faction-wire-recovery-environment-v2.mjs';
import { AUTHENTICATED_OPENING_FENCE_RECOVERY_BINDING_V1 as openingBinding } from '../structured-generation/authenticated-opening-fence-recovery-v1.mjs';
import { FACTION_DUAL_COORDINATE_REVIEW_BINDING_V1 as addressBinding } from './faction-dual-coordinate-review-binding-v1.mjs';
import { readFactionStructuredSuccessEvidenceV1 } from '../skill-evaluation/faction-structured-success-evidence-v1.mjs';
import { createFactionReviewContextCapsuleV1 } from './faction-review-context-capsule-v1.mjs';
import { createStarcraftTmgProviderProfileRegistryV2 } from '../secure-provider-runtime/provider-profile-registry-v2.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as profile } from '../../content/skill-generation/offline-provider-profile-v1.mjs';

export const FACTION_WIRE_ADDRESS_RECOVERY_RECIPE_FIELDS_V1 = Object.freeze([
  'openingFenceRecoveryBinding', 'openingFenceRecoveryOrigins', 'dualCoordinateReviewBinding',
  'dualCoordinateReviewOrigins', 'wireAddressRecoveryReadinessHash']);

export function assertFactionWireAddressRecipeScopeV1(recipe) {
  const fields = FACTION_WIRE_ADDRESS_RECOVERY_RECIPE_FIELDS_V1;
  if (!fields.some(f => recipe[f] !== undefined)) return false;
  if (fields.some(f => recipe[f] === undefined)
    || verifySeal(recipe.openingFenceRecoveryBinding).hash !== openingBinding.hash
    || verifySeal(recipe.dualCoordinateReviewBinding).hash !== addressBinding.hash
    || !/^[a-f0-9]{64}$/u.test(recipe.wireAddressRecoveryReadinessHash || '')
    || !Array.isArray(recipe.openingFenceRecoveryOrigins) || recipe.openingFenceRecoveryOrigins.length !== 1
    || !Array.isArray(recipe.dualCoordinateReviewOrigins) || recipe.dualCoordinateReviewOrigins.length !== 1)
    fail('FACTION_WIRE_ADDRESS_RECIPE_SCOPE_INVALID');
  for (const o of [...recipe.openingFenceRecoveryOrigins, ...recipe.dualCoordinateReviewOrigins])
    if (!recipe.inputHashes.includes(o.inputHash) || !/^faction-v1-[a-f0-9]{20}$/u.test(o.runId || '')
      || !/^structured-[a-f0-9]{48}$/u.test(o.attemptId || '') || !/^[a-f0-9]{64}$/u.test(o.contextHash || ''))
      fail('FACTION_WIRE_ADDRESS_RECIPE_ORIGIN_INVALID');
  return true;
}

function preparedFragment({ filename, input, diagnosis, contextHash }) {
  const args = factionReviewDecompositionArgsV1({ filename, input, diagnosis });
  const plan = prepareFactionReviewDecompositionV1(args);
  const matches = plan.jobs.map(job => createFactionReviewFragmentCapsuleV1({ ...args, plan, jobId: job.id }))
    .filter(p => p.capsule.hash === contextHash);
  if (matches.length !== 1) fail('FACTION_WIRE_ADDRESS_FRAGMENT_CONTEXT_MISSING');
  return matches[0];
}

export async function prepareFactionWireAddressRecoveryV1({ filename, inputs, reviewDiagnosis, actualDiagnosis, egressBinding, helperRef }) {
  [reviewDiagnosis, actualDiagnosis].forEach(verifySeal);
  const terranInput = inputs.find(i => i.hash === reviewDiagnosis.inputHash);
  const zergInput = inputs.find(i => i.hash === actualDiagnosis.zerg.inputHash);
  if (!terranInput || !zergInput || actualDiagnosis.version !== 'faction_actual_resume_diagnosis_v1'
    || actualDiagnosis.productionRecoveryApplied === true) fail('FACTION_WIRE_ADDRESS_DIAGNOSIS_INVALID');
  const db = new DatabaseSync(filename, { readOnly: true });
  let issue;
  try {
    if (db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n)
      fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
    const row = db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'")
      .get(actualDiagnosis.runId, actualDiagnosis.terran.attemptId + '.wire-issue-v2');
    issue = row && verifySeal(verifySeal(JSON.parse(row.artifact)).value);
  } finally { db.close(); }
  if (!issue || issue.hash !== actualDiagnosis.terran.issueHash) fail('FACTION_WIRE_ADDRESS_ACTUAL_ISSUE_DRIFT');
  const prepared = preparedFragment({ filename, input: terranInput, diagnosis: reviewDiagnosis,
    contextHash: issue.invocation.contextManifestRef.hash });
  const openingFenceRecovery = await loadFactionOpeningFenceEnvironmentV1({ filename, egressBinding, helperRef,
    origins: [{ runId: actualDiagnosis.runId, attemptId: issue.attemptId, prepared,
      executionPolicy: FACTION_REVIEW_DECOMPOSITION_BINDING_V1.executionPolicy }] });
  const proof = openingFenceRecovery.proofs[0];
  if (hash(proof.providerValue) !== actualDiagnosis.terran.valueHash
    || proof.normalization.hash !== actualDiagnosis.terran.normalization.hash) fail('FACTION_WIRE_ADDRESS_DECODE_DRIFT');
  const evidence = readFactionStructuredSuccessEvidenceV1({ filename, runId: actualDiagnosis.runId, attemptId: actualDiagnosis.zerg.attemptId });
  const w = actualDiagnosis.zerg.request.workspace, c = evidence.candidate;
  const capsule = createFactionReviewContextCapsuleV1({ factionInput: zergInput, section: w.section, draft: w.draft,
    reviewIndices: w.reviewIndices, coverageRequiredSourceRefs: w.coverageRequiredSourceRefs, targets: w.outputRequestAtEnd.targetContract,
    roleRef: c.roleRef, outputContractRef: c.outputContractRef, route: 'supportive', includeSharedScenarioSources: true });
  if (c.hash !== actualDiagnosis.zerg.originalCandidateHash || c.providerReceiptHash !== actualDiagnosis.zerg.originalReceiptHash
    || capsule.hash !== c.contextManifestRef.hash || capsule.hash !== actualDiagnosis.zerg.capsuleHash)
    fail('FACTION_WIRE_ADDRESS_REVIEW_CONTEXT_DRIFT');
  const recipeFields = {
    openingFenceRecoveryBinding: openingBinding,
    openingFenceRecoveryOrigins: [{ inputHash: terranInput.hash, runId: proof.originRunId, attemptId: proof.originAttemptId,
      contextHash: proof.contextManifestRef.hash, proofHash: proof.hash }],
    dualCoordinateReviewBinding: addressBinding,
    dualCoordinateReviewOrigins: [{ inputHash: zergInput.hash, runId: evidence.attempt.run, attemptId: evidence.attempt.id,
      contextHash: capsule.hash, candidateHash: c.hash, receiptHash: c.providerReceiptHash }],
  };
  return { recipeFields, openingFenceRecovery, completeReviewImports: [{ inputHash: zergInput.hash, evidence }] };
}

// Independent candidate/replay entrypoint; never borrow the producer's in-memory
// proof, and never load Terran's private raw recovery into a Zerg-only review.
export async function loadFactionOpeningFenceRecipeEnvironmentV1({ root, recipe, input }) {
  if (!assertFactionWireAddressRecipeScopeV1(recipe)) return null;
  const origins = recipe.openingFenceRecoveryOrigins.filter(o => o.inputHash === input.hash);
  if (!origins.length) return null;
  const filename = path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite');
  const diagnosis = verifySeal(JSON.parse(await readFile(path.join(root,
    'build/ticket-18-faction-production-v1/terran-wire-context-diagnosis-v2.json'), 'utf8')));
  const helperRef = await inspectFactionWireKeyHelperV2();
  if (helperRef.hash !== recipe.wireKeyHelperRef?.hash || diagnosis.inputHash !== input.hash)
    fail('FACTION_WIRE_ADDRESS_CONSUMER_DEPENDENCY_DRIFT');
  const registry = createStarcraftTmgProviderProfileRegistryV2({ entries: [{ providerProfile: profile, responsePath: '/responses' }],
    allowedProviders: ['deepseek-openai-compatible-direct'] });
  const egressBinding = registry.resolveEgressBinding({ profileRef: { id: profile.providerProfileId,
    version: profile.version, hash: profile.integrity.hash } }).egressBinding;
  const environment = await loadFactionOpeningFenceEnvironmentV1({ filename, helperRef, egressBinding,
    origins: origins.map(o => ({ runId: o.runId, attemptId: o.attemptId,
      prepared: preparedFragment({ filename, input, diagnosis, contextHash: o.contextHash }),
      executionPolicy: FACTION_REVIEW_DECOMPOSITION_BINDING_V1.executionPolicy })) });
  if (hash(environment.proofs.map(p => ({ inputHash: input.hash, runId: p.originRunId, attemptId: p.originAttemptId,
    contextHash: p.contextManifestRef.hash, proofHash: p.hash }))) !== hash(origins)) fail('FACTION_WIRE_ADDRESS_CONSUMER_ORIGIN_DRIFT');
  return environment;
}
