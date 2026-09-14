import { hash, seal, verifySeal, fail } from '../skill-production/common.mjs';
import { contextManifestRefStarcraftTmgV1 } from '../structured-generation/context-capsule-v1.mjs';
import { FACTION_MIXED_REVIEW_ASSEMBLY_BINDING_V1 as mixedBinding } from './faction-mixed-review-assembly-v1.mjs';
import { FACTION_REVIEW_DECOMPOSITION_BINDING_V1 as outerBinding } from './faction-review-decomposition-v1.mjs';
import { assertFactionMixedReviewRecipeV1 } from './faction-mixed-review-environment-v1.mjs';

// The existing V5 review wrapper remains unchanged. Its child DAG has an
// explicit new protocol, and is accepted only by this independently bound path.
export function verifyFactionMixedReviewRoleV1({ args, value, roleInput, packetHash, recipe, environment }) {
  verifySeal(value);
  if (!assertFactionMixedReviewRecipeV1(recipe)) fail('FACTION_MIXED_REVIEW_ROLE_BINDING_REQUIRED');
  const expected = { version: 'starcraft_tmg_faction_structured_review_runtime_v1', packetHash,
    roleRef: args.capsule.roleRef, contextManifestRef: contextManifestRefStarcraftTmgV1(args.capsule),
    outputContractRef: args.capsule.outputContractRef,
    executionPolicyRef: args.evidence.originalInvocation.executionPolicyRef, semanticAcceptanceInherited: false };
  const fullRoleId = 'faction.' + args.input.factionRecordKey.split(':')[1] + '.' + args.capsule.roleRef.id;
  // The capsule intentionally uses the canonical semantic role, whereas the
  // transaction Adapter persists a physical role with its bound source epoch.
  // Accept only the exact Host-bound epoch, never an arbitrary stripped suffix.
  const roleIds = new Set([fullRoleId]);
  for (const transaction of recipe.reviewTransactionBindings || []) {
    verifySeal(transaction);
    if (transaction.version === 'faction_review_transaction_binding_v1'
      && transaction.inputHash === args.input.hash
      && transaction.factionRecordKey === args.input.factionRecordKey
      && transaction.contextHash === args.input.frozenSources.hash
      && hash(transaction.sourceBinding) === hash(args.input.sourceBinding))
      roleIds.add(fullRoleId + '.source-evidence-v1.' + transaction.hash.slice(0, 20));
  }
  if (hash(roleInput) !== hash(expected) || !roleIds.has(value.roleId)
    || value.protocol !== outerBinding.version || value.decomposition?.protocol !== mixedBinding.version
    || hash(value.outputContractRef) !== hash(expected.outputContractRef)
    || value.initialContextCapsuleHash !== args.capsule.hash || value.contextCapsuleHash !== args.capsule.hash
    || value.structuredDecodePassed !== true || value.sharedScenarioSourcesIncluded !== true
    || value.sourceDelivery !== 'proof_carrying_decomposed_whole_section_review'
    || value.wireFailureEvidence?.hash !== args.evidence.hash
    || hash(value.output) !== hash(value.decomposition.output) || value.semanticAcceptance !== false || value.trainingTruth !== false)
    fail('FACTION_MIXED_REVIEW_ROLE_DRIFT');
  return environment.verifyAssembly(value.decomposition);
}

// Returns only exact, fully reverified new-protocol steps. The V1 collector
// still processes other old jobs/quarantines; no blanket skipping failed rows.
export function collectFactionMixedReviewStepsV1({ args, rows, attempts, packetHash, recipe, environment }) {
  if (!assertFactionMixedReviewRecipeV1(recipe)) return { steps: [], consumedAttemptIds: [], proof: null };
  const selected = [], consumed = new Set();
  const planHash = environment.plan.hash;
  for (const row of rows) {
    const value = row.artifact;
    if (value?.protocol === mixedBinding.version && value.planHash === planHash) {
      const expected = { planHash, bindingHash: mixedBinding.hash, dshBindingHash: recipe.dshBindingHash };
      if (row.id !== 'faction-mixed-review.' + planHash || row.inputHash !== hash(expected))
        fail('FACTION_MIXED_REVIEW_CHECKPOINT_INPUT_DRIFT');
      environment.verifyAssembly(value); selected.push(row);
    } else if (value?.decomposition?.protocol === mixedBinding.version) {
      const roleInput = { version: 'starcraft_tmg_faction_structured_review_runtime_v1', packetHash,
        roleRef: args.capsule.roleRef, contextManifestRef: contextManifestRefStarcraftTmgV1(args.capsule),
        outputContractRef: args.capsule.outputContractRef,
        executionPolicyRef: args.evidence.originalInvocation.executionPolicyRef, semanticAcceptanceInherited: false };
      if (row.inputHash !== hash(roleInput) || row.id !== value.roleId) fail('FACTION_MIXED_REVIEW_CHECKPOINT_INPUT_DRIFT');
      verifyFactionMixedReviewRoleV1({ args, value, roleInput, packetHash, recipe, environment }); selected.push(row);
    } else if (value?.planHash === planHash && value.jobId && value.attemptId) {
      environment.verifyPart(value);
      // The mixed runtime reads children by authenticated hash from their real
      // owner; it does not need to import/rewrite their old step lease inputs.
      consumed.add(value.attemptId);
    }
  }
  for (const id of consumed) {
    const owned = attempts.filter(a => a.id === id);
    if (owned.length > 1) fail('FACTION_MIXED_REVIEW_DUPLICATE_ATTEMPT');
  }
  return { steps: selected, consumedAttemptIds: [...consumed], proof: seal({
    version: 'faction_mixed_review_continuation_v1', planHash,
    reusable: selected.map(r => ({ id: r.id, inputHash: r.inputHash, artifactHash: hash(r.artifact) })),
    authenticatedCompletedAttemptIds: [...consumed], oldUnknownDeliveryReconciled: false,
    originalAttemptsCopied: 0, providerCalls: 0, semanticAcceptanceInherited: false, trainingTruth: false }) };
}
