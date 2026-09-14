import { factionLimitsCompatibleV1 } from './faction-budget-extension-v1.mjs';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { seal, verifySeal, hash, fail } from '../skill-production/common.mjs';
import { contextManifestRefStarcraftTmgV1 } from '../structured-generation/context-capsule-v1.mjs';
import { createStarcraftTmgProviderProfileRegistryV2 } from '../secure-provider-runtime/provider-profile-registry-v2.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as profile } from '../../content/skill-generation/offline-provider-profile-v1.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V5 as originalContract } from '../../content/skill-generation/ticket-18-faction-review-output-contract-v1.mjs';
import { FACTION_REVIEW_DECOMPOSITION_BINDING_V1 as binding, readFactionWireReviewFailureV1,
  prepareFactionReviewDecompositionV1, createFactionReviewFragmentCapsuleV1 } from './faction-review-decomposition-v1.mjs';
import { verifyFactionReviewFragmentRuntimeV1, verifyFactionReviewDecompositionRuntimeV1,
  factionReviewFragmentLeaseInputV1 } from './faction-review-decomposition-runtime-v1.mjs';
import { readFactionStructuredSuccessEvidenceV1 } from '../skill-evaluation/faction-structured-success-evidence-v1.mjs';
import { openingFenceForFactionFragmentV1, FACTION_FRAGMENT_OPENING_FENCE_PROTOCOL_V1 } from './faction-fragment-opening-fence-v1.mjs';
import { verifyProductionExecutionPolicyV1 } from '../skill-production/execution-policy-v1.mjs';
import { openFactionMixedReviewEnvironmentV1 } from './faction-mixed-review-environment-v1.mjs';
import { collectFactionMixedReviewStepsV1 } from './faction-mixed-review-role-v1.mjs';

// runs.recipe is the authoritative manifest hash. Production writes the
// manifest file; some older/injected runners additionally stored a checkpoint.
// Both representations must match that same hash. Never manufacture a missing
// recipe or fall back after finding a contradictory checkpoint.
export function resolveFactionJournalRecipeV1({ db, runId, expectedHash,
  readManifest = id => JSON.parse(readFileSync(new URL('../../build/ticket-18-faction-production-v1/' + id + '/recipe.json', import.meta.url), 'utf8')) }) {
  if (!/^faction-v1-[a-f0-9]{20}$/u.test(runId || '') || !/^[a-f0-9]{64}$/u.test(expectedHash || '')
    || runId !== 'faction-v1-' + expectedHash.slice(0, 20)
    || db.prepare('SELECT recipe FROM runs WHERE id=?').get(runId)?.recipe !== expectedHash)
    fail('FACTION_REVIEW_FRAGMENT_ANCESTRY_DRIFT');
  const row = db.prepare("SELECT artifact FROM steps WHERE run=? AND id='recipe' AND state='complete'").get(runId);
  const recipe = row ? verifySeal(verifySeal(JSON.parse(row.artifact)).value) : verifySeal(readManifest(runId));
  if (recipe.hash !== expectedHash) fail('FACTION_REVIEW_FRAGMENT_ANCESTRY_DRIFT');
  return recipe;
}

export function factionReviewDecompositionArgsV1({ filename, input, diagnosis }) {
  verifySeal(diagnosis);
  const w = diagnosis.request.workspace;
  return { input, originalContract, capsule: diagnosis.capsule,
    evidence: readFactionWireReviewFailureV1({ filename, runId: diagnosis.originRunId, attemptId: diagnosis.originAttemptId,
      capsule: diagnosis.capsule, invocation: diagnosis.invocation, providerRequest: diagnosis.providerRequest }),
    mapping: { section: w.section, draft: w.draft, targets: w.outputRequestAtEnd.targetContract,
      reviewIndices: w.reviewIndices, requiredSourceRefs: w.coverageRequiredSourceRefs } };
}

// The caller supplies already lineage-checked rows. Only independently replayed
// fragment records are returned as continuation candidates; attempts and costs
// are NEVER copied. Missing materialization after a sent request blocks a new
// run instead of silently paying again (the original run remains resumable).
export function collectFactionReviewDecompositionStepsV1({ args, rows, dshBindingHash, egressBinding,
  resolveCapability, readSuccessEvidence, attempts = [], fullRoleId, packetHash, allowedRunIds, openingFenceRecovery,
  executionPolicyBinding = null }) {
  if (executionPolicyBinding) verifyProductionExecutionPolicyV1(executionPolicyBinding);
  const plan = prepareFactionReviewDecompositionV1(args), prefix = 'faction-review-decomposition.' + plan.hash;
  const selected = [], pendingRecoveries = [], quarantinedTasks = [], byId = new Map(rows.map(r => [r.id, r]));
  for (const job of plan.jobs) {
    const row = byId.get(prefix + '.' + job.id);
    if (!row) continue;
    const part = verifySeal(row.artifact);
    if (!allowedRunIds?.includes(part.runId)) fail('FACTION_REVIEW_FRAGMENT_FOREIGN_ANCESTOR');
    const prepared = createFactionReviewFragmentCapsuleV1({ ...args, plan, jobId: job.id });
    const recovered = part.protocol === FACTION_FRAGMENT_OPENING_FENCE_PROTOCOL_V1
      ? openingFenceForFactionFragmentV1({ prepared, recovery: openingFenceRecovery }) : null;
    let capability;
    if (part.protocol === FACTION_FRAGMENT_OPENING_FENCE_PROTOCOL_V1) {
      if (!recovered || !allowedRunIds.includes(recovered.proof.originRunId)) fail('FACTION_REVIEW_FRAGMENT_FOREIGN_ANCESTOR');
      capability = resolveCapability(recovered.proof.invocation.capabilityReceiptHash);
    } else {
      const success = readSuccessEvidence({ runId: part.runId, attemptId: part.attemptId });
      const response = verifySeal(JSON.parse(success.attempt.response)).value;
      capability = resolveCapability(response.usageReceipt.capabilityReceiptHash);
    }
    if (!capability) fail('FACTION_REVIEW_FRAGMENT_CONTINUATION_CAPABILITY_MISSING');
    verifyFactionReviewFragmentRuntimeV1({ ...args, plan, part, prepared, egressBinding, capability, dshBindingHash, readSuccessEvidence, openingFenceRecovery });
    if (row.inputHash !== hash(factionReviewFragmentLeaseInputV1({ prepared, capability, plan, dshBindingHash, openingFenceRecovery })))
      fail('FACTION_REVIEW_FRAGMENT_CONTINUATION_INPUT_DRIFT');
    selected.push(row);
  }
  // Resolve request membership from the durable role's exact capsule, not a
  // code/message regex. This also catches settled-success-before-part crashes.
  for (const attempt of attempts) {
    const response = attempt.response && verifySeal(JSON.parse(attempt.response)).value;
    const role = response?.usageReceipt?.roleRef || response?.roleRef;
    const step = rows.find(r => r.id === attempt.id + '.wire-issue-v2') || rows.find(r => r.id === attempt.id + '.issue');
    const issue = step?.artifact;
    const byPart = selected.some(r => r.artifact.attemptId === attempt.id);
    const knownRole = role?.id?.startsWith('faction-review-fragment.' + plan.hash.slice(0, 32) + '.');
    const knownContext = issue?.invocation?.contextManifestRef && plan.jobs.some(job =>
      createFactionReviewFragmentCapsuleV1({ ...args, plan, jobId: job.id }).capsule.hash === issue.invocation.contextManifestRef.hash);
    const knownContract = plan.jobs.some(job => job.outputContractRef.hash === (response?.outputContractRef?.hash || issue?.outputContractRef?.hash));
    const exactInvocation = executionPolicyBinding && issue?.invocationHash && response?.capabilityReceiptHash
      ? plan.jobs.map(job => {
        const prepared = createFactionReviewFragmentCapsuleV1({ ...args, plan, jobId: job.id });
        const leaseInput = factionReviewFragmentLeaseInputV1({ prepared, plan, dshBindingHash,
          capability: { receiptHash: response.capabilityReceiptHash } });
        return leaseInput.invocationHash === issue.invocationHash
          && attempt.id === 'structured-' + issue.invocationHash.slice(0, 48) ? job.id : null;
      }).filter(Boolean) : [];
    if ((knownRole || knownContext || knownContract) && !byPart) {
      if (executionPolicyBinding && exactInvocation.length === 1
        && attempt.state === 'failed' && attempt.code === 'STRUCTURED_PROVIDER_AMBIGUOUS_SEND'
        && allowedRunIds?.includes(attempt.run) && response?.requestMayHaveBeenSent === true
        && response.requestDefinitelyNotSent !== true && response.usageKnown === false) {
        const { receiptHash, ...receiptBody } = response;
        verifySeal(issue);
        if (hash(receiptBody) !== receiptHash || issue.safeReceiptHash !== receiptHash)
          fail('FACTION_REVIEW_FRAGMENT_RECEIPT_DRIFT');
        quarantinedTasks.push({ fullRoleId, jobId: exactInvocation[0], originRunId: attempt.run, originAttemptId: attempt.id,
          requestHash: attempt.request_hash, receiptHash, code: attempt.code,
          policyHash: executionPolicyBinding.hash, newProviderCallsPermitted: 0 });
        continue;
      }
      const matches = plan.jobs.map(job => {
        const prepared = createFactionReviewFragmentCapsuleV1({ ...args, plan, jobId: job.id });
        const recovered = openingFenceForFactionFragmentV1({ prepared, recovery: openingFenceRecovery });
        return recovered && { job, ...recovered };
      }).filter(r => r && r.proof.originRunId === attempt.run && r.proof.originAttemptId === attempt.id);
      const recovered = matches.length === 1 ? matches[0] : null;
      if (!recovered || !allowedRunIds?.includes(attempt.run) || attempt.state !== 'failed'
        || attempt.code !== 'STRUCTURED_PROVIDER_SCHEMA_INVALID' || !issue
        || recovered.proof.originalWireIssueHash !== issue.hash
        || recovered.proof.originalRequestHash !== attempt.request_hash
        || recovered.proof.originalProviderReceiptHash !== response?.receiptHash
        || recovered.proof.invocation.contextManifestRef.hash !== issue.invocation?.contextManifestRef?.hash)
        fail('FACTION_REVIEW_FRAGMENT_UNMATERIALIZED_ATTEMPT_STOP');
      // Not a reusable success and not an allowance to resend. The new runtime
      // must materialize this exact authenticated origin with zero Provider.
      pendingRecoveries.push({ jobId: recovered.job.id, proofHash: recovered.proof.hash,
        originRunId: attempt.run, originAttemptId: attempt.id, originalRequestHash: attempt.request_hash,
        originalReceiptHash: response.receiptHash, newProviderCallsPermitted: 0 });
    }
  }
  const parent = byId.get(prefix), roleRow = byId.get(fullRoleId);
  const verifyValue = value => {
    const capabilities = Object.fromEntries(Object.entries(value.capabilityReceiptHashes).map(([k, h]) => [k, resolveCapability(h)]));
    if (Object.values(capabilities).some(c => !c)) fail('FACTION_REVIEW_FRAGMENT_CONTINUATION_CAPABILITY_MISSING');
    return verifyFactionReviewDecompositionRuntimeV1({ ...args, value, egressBinding, capabilities, dshBindingHash,
      resolveFragment: id => byId.get(id)?.artifact, readSuccessEvidence, openingFenceRecovery });
  };
  if (parent) { verifyValue(verifySeal(parent.artifact)); selected.push(parent); }
  if (roleRow?.artifact?.protocol === binding.version) {
    const value = verifySeal(roleRow.artifact);
    const expectedInput = { version: 'starcraft_tmg_faction_structured_review_runtime_v1', packetHash,
      roleRef: args.capsule.roleRef, contextManifestRef: contextManifestRefStarcraftTmgV1(args.capsule),
      outputContractRef: args.capsule.outputContractRef, executionPolicyRef: args.evidence.originalInvocation.executionPolicyRef,
      semanticAcceptanceInherited: false };
    if (roleRow.inputHash !== hash(expectedInput) || value.roleId !== fullRoleId
      || value.contextCapsuleHash !== args.capsule.hash || value.initialContextCapsuleHash !== args.capsule.hash
      || value.wireFailureEvidence.hash !== args.evidence.hash || value.semanticAcceptance !== false || value.trainingTruth !== false
      || hash(value.output) !== hash(value.decomposition.output) || value.structuredDecodePassed !== true)
      fail('FACTION_REVIEW_DECOMPOSITION_CONTINUATION_ROLE_DRIFT');
    verifyValue(value.decomposition); selected.push(roleRow);
  }
  return { steps: selected, proof: seal({ version: 'faction_review_decomposition_continuation_v1', planHash: plan.hash,
    reusable: selected.map(r => ({ id: r.id, inputHash: r.inputHash, artifactHash: hash(r.artifact) })),
    ...(pendingRecoveries.length ? { pendingRecoveries } : {}),
    ...(quarantinedTasks.length ? { quarantinedTasks } : {}),
    originalAttemptsCopied: 0, newProviderCalls: 0, semanticAcceptanceInherited: false, trainingTruth: false }) };
}

export function validateFactionReviewDecompositionMigrationV1({ filename, parentRunId, parent, next, readiness, diagnosis, inputs, openingFenceRecovery }) {
  const fields = ['reviewDecompositionBinding', 'reviewDecompositionReadinessHash', 'reviewDecompositionOrigins'];
  if (!fields.some(f => parent[f] !== undefined || next[f] !== undefined)) return null;
  if (fields.some(f => next[f] === undefined)) fail('FACTION_REVIEW_DECOMPOSITION_BINDING_REMOVED');
  if (openingFenceRecovery && next.openingFenceRecoveryBinding?.hash !== openingFenceRecovery.binding.hash)
    fail('FACTION_REVIEW_DECOMPOSITION_OPENING_FENCE_UNBOUND');
  [readiness, next.reviewDecompositionBinding, diagnosis].forEach(verifySeal);
  if (next.reviewDecompositionBinding.hash !== binding.hash || readiness.binding?.hash !== binding.hash
    || readiness.hash !== next.reviewDecompositionReadinessHash || readiness.diagnosisHash !== diagnosis.hash
    || !readiness.passed || readiness.providerCalls !== 0 || !readiness.component?.actualReviewWrapperPassed
    || !readiness.component.structuredRoleConsumerPassed || !readiness.component.actualSqliteRestartPassed
    || !readiness.component.globalPaymentStopPassed || !readiness.component.dryNoProviderPassed
    || !readiness.crossRunContinuationPassed || !readiness.partialFragmentContinuationPassed
    || parent.reviewDecompositionBinding && parent.reviewDecompositionBinding.hash !== binding.hash
    || !parent.reviewDecompositionBinding && parentRunId !== diagnosis.originRunId
    || hash(parent.inputHashes) !== hash(next.inputHashes) || !factionLimitsCompatibleV1(parent, next))
    fail('FACTION_REVIEW_DECOMPOSITION_MIGRATION_INVALID');
  const input = inputs?.find(i => i.hash === diagnosis.inputHash);
  if (!input || !next.inputHashes.includes(input.hash)) fail('FACTION_REVIEW_DECOMPOSITION_INPUT_MISSING');
  const args = factionReviewDecompositionArgsV1({ filename, input, diagnosis });
  const plan = prepareFactionReviewDecompositionV1(args);
  const origins = [{ inputHash: input.hash, runId: args.evidence.runId, attemptId: args.evidence.attemptId,
    evidenceHash: args.evidence.hash, contextHash: args.capsule.hash }];
  if (hash(origins) !== hash(next.reviewDecompositionOrigins) || readiness.planHash !== plan.hash
    || parent.reviewDecompositionOrigins && hash(parent.reviewDecompositionOrigins) !== hash(origins))
    fail('FACTION_REVIEW_DECOMPOSITION_ORIGINS_DRIFT');
  for (const c of readiness.codeHashes)
    if (next.codeHashes.find(r => r.file === c.file)?.hash !== c.hash) fail('FACTION_REVIEW_DECOMPOSITION_CODE_DRIFT');
  const db = new DatabaseSync(filename, { readOnly: true });
  let collected;
  try {
    if (db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n) fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
    if (db.prepare("SELECT count(*) n FROM attempts WHERE run=? AND state='intent'").get(parentRunId).n
      || db.prepare("SELECT count(*) n FROM steps WHERE run=? AND state='running'").get(parentRunId).n)
      fail('FACTION_REVIEW_DECOMPOSITION_PARENT_NOT_TERMINAL');
    const rows = db.prepare("SELECT id,input_hash,artifact FROM steps WHERE run=? AND state='complete'").all(parentRunId)
      .map(r => ({ id: r.id, inputHash: r.input_hash, artifact: verifySeal(JSON.parse(r.artifact)).value }));
    const allowedRunIds = [parentRunId];
    if (rows.some(r => r.artifact?.planHash === plan.hash || r.artifact?.protocol === binding.version)) {
      let ancestor = parent.continuation;
      while (ancestor) {
        if (allowedRunIds.includes(ancestor.parentRunId)) fail('FACTION_REVIEW_FRAGMENT_ANCESTRY_CYCLE');
        const recipe = resolveFactionJournalRecipeV1({ db, runId: ancestor.parentRunId, expectedHash: ancestor.parentRecipeHash });
        allowedRunIds.push(ancestor.parentRunId); ancestor = recipe.continuation;
      }
    }
    const registry = createStarcraftTmgProviderProfileRegistryV2({ entries: [{ providerProfile: profile, responsePath: '/responses' }], allowedProviders: ['deepseek-openai-compatible-direct'] });
    const egressBinding = registry.resolveEgressBinding({ profileRef: { id: profile.providerProfileId, version: profile.version, hash: profile.integrity.hash } }).egressBinding;
    const attempts = db.prepare('SELECT * FROM attempts WHERE run=?').all(parentRunId);
    let mixed = { steps: [], consumedAttemptIds: [], proof: null };
    if (parent.mixedReviewBinding) {
      const link = parent.continuation;
      const prior = resolveFactionJournalRecipeV1({ db, runId: link.parentRunId, expectedHash: link.parentRecipeHash });
      const environment = openFactionMixedReviewEnvironmentV1({ filename, recipe: parent,
        parentRunId: link.parentRunId, parentRecipe: prior, args, openingFenceRecovery });
      try { mixed = collectFactionMixedReviewStepsV1({ args, rows, attempts, packetHash: diagnosis.request.packet.hash,
        recipe: parent, environment }); }
      finally { environment.close(); }
    }
    const mixedIds = new Set(mixed.steps.map(r => r.id)), consumed = new Set(mixed.consumedAttemptIds);
    collected = collectFactionReviewDecompositionStepsV1({ args,
      rows: rows.filter(r => !mixedIds.has(r.id) && !consumed.has(r.artifact?.attemptId)),
      dshBindingHash: parent.dshBindingHash, egressBinding,
      allowedRunIds, openingFenceRecovery,
      fullRoleId: diagnosis.request.packet.id + '.' + diagnosis.request.roleId, packetHash: diagnosis.request.packet.hash,
      attempts: attempts.filter(a => !consumed.has(a.id)),
      executionPolicyBinding: next.executionPolicyBinding || null,
      resolveCapability: identity => {
        const row = db.prepare("SELECT response FROM attempts WHERE state='received' AND json_extract(response,'$.value.capabilityReceipt.receiptHash')=? LIMIT 1").get(identity);
        return row ? verifySeal(JSON.parse(row.response)).value.capabilityReceipt : null;
      }, readSuccessEvidence: q => readFactionStructuredSuccessEvidenceV1({ filename, ...q }) });
    if (mixed.proof) {
      collected.steps.push(...mixed.steps);
      const { hash: ignored, ...body } = collected.proof;
      collected.proof = seal({ ...body, mixedContinuation: mixed.proof,
        reusable: collected.steps.map(r => ({ id: r.id, inputHash: r.inputHash, artifactHash: hash(r.artifact) })) });
    }
    const inheritedQuarantines = parent.continuation?.reviewDecompositionMigration?.childContinuation?.quarantinedTasks || [];
    if (inheritedQuarantines.length) {
      verifyProductionExecutionPolicyV1(next.executionPolicyBinding);
      for (const prior of inheritedQuarantines) {
        const original = db.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(prior.originRunId, prior.originAttemptId);
        const receipt = original?.response && verifySeal(JSON.parse(original.response)).value;
        if (prior.policyHash !== next.executionPolicyBinding.hash || prior.newProviderCallsPermitted !== 0
          || original?.state !== 'failed' || original.code !== prior.code
          || original.request_hash !== prior.requestHash || receipt?.receiptHash !== prior.receiptHash)
          fail('FACTION_REVIEW_FRAGMENT_QUARANTINE_ORIGIN_DRIFT');
      }
      const { hash: ignored, ...proofBody } = collected.proof;
      const combined = new Map([...inheritedQuarantines, ...(collected.proof.quarantinedTasks || [])]
        .map(row => [row.originRunId + ':' + row.originAttemptId, row]));
      collected.proof = seal({ ...proofBody, quarantinedTasks: [...combined.values()] });
    }
  } finally { db.close(); }
  return { steps: collected.steps, proof: seal({ version: 'faction_review_decomposition_migration_v1',
    bindingHash: binding.hash, readinessHash: readiness.hash, planHash: plan.hash,
    originRunId: args.evidence.runId, originAttemptId: args.evidence.attemptId,
    originalReceiptHash: args.evidence.originalReceiptHash, files: readiness.codeHashes.map(c => c.file),
    childContinuation: collected.proof, accountingReset: false, semanticAcceptanceInherited: false, trainingTruth: false }) };
}
