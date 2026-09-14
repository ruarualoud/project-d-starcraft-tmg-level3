import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { hash, seal, verifySeal, fail } from '../skill-production/common.mjs';
import { prepareFactionReviewDecompositionV1, createFactionReviewFragmentCapsuleV1,
  FACTION_REVIEW_DECOMPOSITION_BINDING_V1 } from './faction-review-decomposition-v1.mjs';
import { factionReviewFragmentLeaseInputV1 } from './faction-review-decomposition-runtime-v1.mjs';
import { resolveFactionJournalRecipeV1 } from './faction-review-decomposition-continuation-v1.mjs';
import { contextManifestRefStarcraftTmgV1 } from '../structured-generation/context-capsule-v1.mjs';
import { verifyStarcraftTmgProviderCapabilityCurrentV1 } from '../structured-generation/provider-capability-receipt-v1.mjs';
import { factionExecutionProfileV1, factionExecutionEgressV1, factionProfileRefV1 } from './faction-execution-model-v1.mjs';
import { FACTION_MODEL_LIFECYCLE_BINDING_V1, selectFactionExecutionModelV1 } from './faction-model-lifecycle-v1.mjs';

export const FACTION_AMBIGUOUS_REPLACEMENT_BINDING_V1 = seal({ version: 'faction_ambiguous_replacement_v1',
  authorization: 'existing_user_generation_rebilling_authorization_and_2026_09_09_resume_terran',
  eligibleFailure: 'STRUCTURED_PROVIDER_AMBIGUOUS_SEND', maximumReplacementAttemptsPerOrigin: 1,
  originalDisposition: 'abandoned_unknown_delivery_reserve_retained_not_reconciled',
  oldAttemptMutationAllowed: false, oldAttemptReplayAllowed: false,
  fullContextUnchanged: true, negativeOutputResamplingAllowed: false,
  modelLifecycleBindingHash: FACTION_MODEL_LIFECYCLE_BINDING_V1.hash,
  dispatchRequiresDurableSingleUseClaim: true, accountingReset: false,
  semanticAcceptanceInherited: false, trainingTruth: false });
const binding = FACTION_AMBIGUOUS_REPLACEMENT_BINDING_V1;
const invalid = suffix => fail('FACTION_AMBIGUOUS_REPLACEMENT_' + suffix);
const decode = value => value == null ? null : verifySeal(JSON.parse(value)).value;
const policy = FACTION_REVIEW_DECOMPOSITION_BINDING_V1.executionPolicy;
const policyRef = { id: 'policy.faction-review-fragment.production', version: 'v1', hash: hash(policy) };
const readManifestDefault = id => JSON.parse(readFileSync(new URL('../../build/ticket-18-faction-production-v1/' + id + '/recipe.json', import.meta.url), 'utf8'));

// Rebuild the entire actual fragment request. Quarantine text/hash alone is not
// permission: authenticate its paid owner, actual failed row, receipt and input.
export function authenticateFactionAmbiguousFragmentV1({ filename, parentRunId, parentRecipe, args,
  quarantine, readManifest = readManifestDefault }) {
  verifySeal(parentRecipe);
  const plan = prepareFactionReviewDecompositionV1(args);
  const prepared = createFactionReviewFragmentCapsuleV1({ ...args, plan, jobId: quarantine.jobId });
  const db = new DatabaseSync(filename, { readOnly: true });
  try {
    if (db.prepare('SELECT count(*) n FROM attempts WHERE code=?').get('PROVIDER_PAYMENT_REQUIRED').n)
      fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
    let current = parentRecipe, currentId = parentRunId;
    const chain = [], recipes = new Map();
    while (current) {
      verifySeal(current);
      if (chain.includes(currentId) || currentId !== 'faction-v1-' + current.hash.slice(0, 20)
        || current.contextHash !== parentRecipe.contextHash || current.modelHash !== parentRecipe.modelHash
        || hash(current.sourceBinding) !== hash(parentRecipe.sourceBinding)
        || hash(current.inputHashes) !== hash(parentRecipe.inputHashes)) invalid('LINEAGE_DRIFT');
      const journal = db.prepare('SELECT recipe FROM runs WHERE id=?').get(currentId);
      if (journal ? journal.recipe !== current.hash : currentId === parentRunId || !current.continuation
        || db.prepare('SELECT count(*) n FROM steps WHERE run=?').get(currentId).n
        || db.prepare('SELECT count(*) n FROM attempts WHERE run=?').get(currentId).n) invalid('LINEAGE_DRIFT');
      if (db.prepare('SELECT count(*) n FROM steps WHERE run=? AND state=?').get(currentId, 'running').n
        || db.prepare('SELECT count(*) n FROM attempts WHERE run=? AND state=?').get(currentId, 'intent').n)
        invalid('PARENT_NOT_TERMINAL');
      chain.push(currentId); recipes.set(currentId, current);
      const next = current.continuation;
      if (!next) break;
      verifySeal(next);
      currentId = next.parentRunId; current = verifySeal(readManifest(currentId));
      if (current.hash !== next.parentRecipeHash) invalid('LINEAGE_DRIFT');
    }
    if (!chain.includes(quarantine.originRunId)
      || !parentRecipe.continuation?.reviewDecompositionMigration?.childContinuation?.quarantinedTasks
        ?.some(row => hash(row) === hash(quarantine))) invalid('QUARANTINE_SCOPE');
    const owner = resolveFactionJournalRecipeV1({ db, runId: quarantine.originRunId,
      expectedHash: recipes.get(quarantine.originRunId).hash, readManifest });
    const attempt = db.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(quarantine.originRunId, quarantine.originAttemptId);
    const issueRow = db.prepare('SELECT artifact FROM steps WHERE run=? AND id=? AND state=?')
      .get(quarantine.originRunId, quarantine.originAttemptId + '.issue', 'complete');
    const receipt = decode(attempt?.response), issue = issueRow ? verifySeal(decode(issueRow.artifact)) : null;
    const { receiptHash, ...receiptBody } = receipt || {};
    if (!attempt || !issue || attempt.state !== 'failed' || attempt.code !== binding.eligibleFailure
      || receipt.code !== attempt.code || receipt.status !== null || receipt.usageKnown !== false
      || receipt.requestMayHaveBeenSent !== true || receipt.requestDefinitelyNotSent !== false
      || receipt.physicalAttempts !== 1 || receipt.automaticRetries !== 0 || receipt.payloadHash !== null
      || attempt.usage !== null || attempt.settled !== null || !Number.isSafeInteger(attempt.reserve) || attempt.reserve < 1
      || hash(receiptBody) !== receiptHash || issue.safeReceiptHash !== receiptHash
      || quarantine.receiptHash !== receiptHash || quarantine.requestHash !== attempt.request_hash
      || quarantine.code !== attempt.code || quarantine.newProviderCallsPermitted !== 0
      || quarantine.policyHash !== parentRecipe.executionPolicyBinding?.hash) invalid('ORIGIN_INVALID');
    const fullRoleId = 'faction.' + args.input.factionRecordKey.split(':')[1] + '.' + args.capsule.roleRef.id;
    if (quarantine.fullRoleId !== fullRoleId) invalid('ROLE_SCOPE');
    const capabilityRows = db.prepare("SELECT run,response FROM attempts WHERE state='received' AND json_extract(response,'$.value.capabilityReceipt.receiptHash')=?")
      .all(receipt.capabilityReceiptHash).filter(row => chain.includes(row.run));
    if (capabilityRows.length !== 1) invalid('ORIGINAL_CAPABILITY_MISSING');
    const capabilityResponse = decode(capabilityRows[0].response), originalCapability = capabilityResponse.capabilityReceipt;
    const originalProfile = factionExecutionProfileV1({ binding: owner.executionModelBinding || null });
    if (capabilityResponse.ok !== true || !verifyStarcraftTmgProviderCapabilityCurrentV1({ receipt: originalCapability,
      providerProfileRef: factionProfileRefV1(originalProfile), endpointPath: '/responses', endpointDialect: 'deepseek_responses_v1',
      model: originalProfile.model, capability: 'responses_json_schema', outputContractRef: prepared.job.outputContractRef,
      now: originalCapability.probedAt }).ok) invalid('ORIGINAL_CAPABILITY_DRIFT');
    const leaseInput = factionReviewFragmentLeaseInputV1({ prepared, plan, dshBindingHash: owner.dshBindingHash,
      capability: { receiptHash: receipt.capabilityReceiptHash } });
    const invocation = { schemaVersion: 'starcraft_tmg_structured_generation_runtime_v1.invocation', roleRef: prepared.roleRef,
      contextManifestRef: contextManifestRefStarcraftTmgV1(prepared.capsule), outputContractRef: prepared.job.outputContractRef,
      executionPolicyRef: policyRef, continuationRef: null,
      contextPayloadHash: hash({ instructions: prepared.capsule.instructions, input: prepared.capsule.compiledInput }),
      capabilityReceiptHash: receipt.capabilityReceiptHash, trainingTruth: false };
    const request = { schemaVersion: 'starcraft_tmg_structured_provider_request_v1', requestId: attempt.id,
      roleRef: prepared.roleRef, instructions: prepared.capsule.instructions, input: prepared.capsule.compiledInput,
      outputContractRef: prepared.job.outputContractRef, maxOutputUnits: policy.maxOutputUnits };
    if (hash(invocation) !== issue.invocationHash || hash(invocation) !== leaseInput.invocationHash
      || attempt.id !== 'structured-' + hash(invocation).slice(0, 48) || hash(request) !== attempt.request_hash
      || hash(receipt.outputContractRef) !== hash(prepared.job.outputContractRef)) invalid('FULL_REQUEST_DRIFT');
    return { prepared, plan, proof: seal({ version: 'faction_authenticated_ambiguous_fragment_v1', bindingHash: binding.hash,
      parentRunId, parentRecipeHash: parentRecipe.hash, originRunId: attempt.run, originRecipeHash: owner.hash,
      originAttemptId: attempt.id, originalAttemptHash: hash(attempt), originalRequestHash: attempt.request_hash,
      originalReceiptHash: receiptHash, originalIssueHash: issue.hash, originalInvocation: invocation,
      originalCapabilityReceiptHash: originalCapability.receiptHash, originalModel: originalProfile.model,
      originalReserveMicros: attempt.reserve, originalTokenReserve: attempt.token_reserve,
      originalUsageKnown: false, originalResultAvailable: false, fullRoleId: quarantine.fullRoleId,
      planHash: plan.hash, jobId: prepared.job.id, contextHash: prepared.capsule.hash,
      originalOutputContractRef: prepared.job.outputContractRef, sourceInputHash: args.input.hash,
      originalAttemptMutation: false, providerCalls: 0, semanticAcceptance: false, trainingTruth: false }) };
  } finally { db.close(); }
}

// Preparation only. A runtime must authenticate again, claim one durable slot,
// then use its existing structured runtime/DSH/receipt-consumer, not call fetch.
export function prepareFactionAmbiguousReplacementV1({ authenticated, authenticateOrigin, selection,
  legacyProfileRef, capability, now, authenticateUnavailable = null, unavailable = null }) {
  if (typeof authenticateOrigin !== 'function') invalid('AUTHENTICATION_REQUIRED');
  const fresh = authenticateOrigin();
  if (!fresh || verifySeal(fresh.proof).hash !== verifySeal(authenticated.proof).hash) invalid('AUTHENTICATION_DRIFT');
  const { prepared, plan, proof } = fresh;
  const chosen = selectFactionExecutionModelV1({ selectedBinding: FACTION_MODEL_LIFECYCLE_BINDING_V1,
    legacyProfileRef, priorDecision: selection, now, unavailable, authenticateUnavailable });
  if (chosen.decision.hash !== selection.hash) invalid('MODEL_SELECTION_CHANGED');
  const egressBinding = factionExecutionEgressV1(chosen.profile);
  if (!capability || !verifyStarcraftTmgProviderCapabilityCurrentV1({ receipt: capability,
    providerProfileRef: factionProfileRefV1(chosen.profile), endpointPath: egressBinding.endpoint.path,
    endpointDialect: egressBinding.endpointDialect, model: chosen.profile.model, capability: 'responses_json_schema',
    outputContractRef: prepared.job.outputContractRef, now }).ok) invalid('CAPABILITY_REQUIRED');
  const grant = seal({ version: 'faction_ambiguous_replacement_grant_v1', bindingHash: binding.hash,
    originRunId: proof.originRunId, originAttemptId: proof.originAttemptId,
    originalAttemptHash: proof.originalAttemptHash, originalRequestHash: proof.originalRequestHash,
    originalReceiptHash: proof.originalReceiptHash, originalReserveMicros: proof.originalReserveMicros,
    sourceInputHash: proof.sourceInputHash, planHash: plan.hash, jobId: prepared.job.id, contextHash: prepared.capsule.hash,
    outputContractRef: prepared.job.outputContractRef, maximumReplacementAttempts: 1,
    disposition: binding.originalDisposition, trainingTruth: false });
  const invocation = { ...proof.originalInvocation, capabilityReceiptHash: capability.receiptHash,
    continuationRef: { id: 'faction-ambiguous-replacement.' + grant.hash.slice(0, 32), version: 'v1', hash: grant.hash } };
  const request = { schemaVersion: 'starcraft_tmg_structured_provider_request_v1',
    requestId: 'structured-' + hash(invocation).slice(0, 48), roleRef: prepared.roleRef,
    instructions: prepared.capsule.instructions, input: prepared.capsule.compiledInput,
    outputContractRef: prepared.job.outputContractRef, maxOutputUnits: policy.maxOutputUnits };
  if (request.requestId === proof.originAttemptId || hash(request) === proof.originalRequestHash) invalid('ORIGINAL_REISSUE');
  return { grant, invocation, request, prepared, plan, egressBinding, capability, selection,
    dispatchPermittedWithoutDurableClaim: false, providerCalls: 0 };
}
