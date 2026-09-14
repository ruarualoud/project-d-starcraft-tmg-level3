import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { hash, verifySeal, fail } from '../skill-production/common.mjs';
import { FACTION_AMBIGUOUS_REPLACEMENT_BINDING_V1, authenticateFactionAmbiguousFragmentV1,
  prepareFactionAmbiguousReplacementV1 } from './faction-ambiguous-replacement-v1.mjs';
import { FACTION_MODEL_LIFECYCLE_BINDING_V1, selectFactionExecutionModelV1 } from './faction-model-lifecycle-v1.mjs';
import { factionExecutionProfileV1, factionExecutionEgressV1, factionProfileRefV1,
  FACTION_EXECUTION_MODEL_BINDING_V1 } from './faction-execution-model-v1.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as legacy } from '../../content/skill-generation/offline-provider-profile-v1.mjs';
import { FACTION_MIXED_REVIEW_ASSEMBLY_BINDING_V1, verifyFactionMixedReviewAssemblyV1 } from './faction-mixed-review-assembly-v1.mjs';
import { readFactionReplacementDispatchChoiceV1, verifyFactionReplacementFragmentV1,
  FACTION_REPLACEMENT_FRAGMENT_PROTOCOL_V1 } from './faction-ambiguous-replacement-runtime-v1.mjs';
import { FACTION_FRAGMENT_OPENING_FENCE_PROTOCOL_V1 } from './faction-fragment-opening-fence-v1.mjs';
import { factionReviewFragmentLeaseInputV1, verifyFactionReviewFragmentRuntimeV1 } from './faction-review-decomposition-runtime-v1.mjs';
import { createFactionReviewFragmentCapsuleV1, prepareFactionReviewDecompositionV1 } from './faction-review-decomposition-v1.mjs';
import { readFactionStructuredSuccessEvidenceV1 } from '../skill-evaluation/faction-structured-success-evidence-v1.mjs';

export const FACTION_MIXED_REVIEW_RECIPE_FIELDS_V1 = Object.freeze([
  'mixedReviewBinding', 'ambiguousReplacementBinding', 'mixedReviewReadinessHash', 'mixedReviewLegacyRoleIds']);
const decode = raw => verifySeal(JSON.parse(raw)).value;
const readManifestDefault = id => verifySeal(JSON.parse(readFileSync(new URL(
  '../../build/ticket-18-faction-production-v1/' + id + '/recipe.json', import.meta.url), 'utf8')));
export function assertFactionMixedReviewRecipeV1(recipe) {
  const fields = FACTION_MIXED_REVIEW_RECIPE_FIELDS_V1;
  if (!fields.some(f => recipe[f] !== undefined)) return false;
  if (fields.some(f => recipe[f] === undefined)
    || verifySeal(recipe.mixedReviewBinding).hash !== FACTION_MIXED_REVIEW_ASSEMBLY_BINDING_V1.hash
    || verifySeal(recipe.ambiguousReplacementBinding).hash !== FACTION_AMBIGUOUS_REPLACEMENT_BINDING_V1.hash
    || !/^[a-f0-9]{64}$/u.test(recipe.mixedReviewReadinessHash)
    || !Array.isArray(recipe.mixedReviewLegacyRoleIds) || recipe.mixedReviewLegacyRoleIds.length !== 1
    || !/^faction\.[a-z0-9_]+\.faction\.[a-z0-9_]+\.[a-z0-9_.-]+\.review-target-batch-v1\.(supportive|adversarial)\.[0-3]\.[0-9]+$/u.test(recipe.mixedReviewLegacyRoleIds[0]))
    fail('FACTION_MIXED_REVIEW_RECIPE_INVALID');
  return true;
}

export function factionMixedReviewLegacyRoleIdsV1(recipe, legacyRoleIds) {
  if (!assertFactionMixedReviewRecipeV1(recipe)) return legacyRoleIds;
  return [...new Set([...legacyRoleIds, ...recipe.mixedReviewLegacyRoleIds])].sort();
}

// Shared read-only source of actual ownership for producer and independent
// consumer. It never edits an ancestor or treats a JSON fixture as a paid row.
export function openFactionMixedReviewEnvironmentV1({ filename, recipe, parentRunId, parentRecipe,
  args, openingFenceRecovery, readManifest = readManifestDefault }) {
  if (!assertFactionMixedReviewRecipeV1(recipe)) fail('FACTION_MIXED_REVIEW_BINDING_REQUIRED');
  if (recipe.continuation?.parentRunId !== parentRunId || recipe.continuation.parentRecipeHash !== parentRecipe.hash
    || ['contextHash', 'inputHashes', 'sourceBinding', 'dshBindingHash'].some(k => hash(recipe[k]) !== hash(parentRecipe[k]))
    || !recipe.inputHashes.includes(args.input.hash)) fail('FACTION_MIXED_REVIEW_PARENT_SCOPE');
  const plan = prepareFactionReviewDecompositionV1(args);
  const db = new DatabaseSync(filename, { readOnly: true });
  let closed = false;
  const runId = 'faction-v1-' + recipe.hash.slice(0, 20), ancestors = [];
  try {
    let current = parentRecipe, owner = parentRunId;
    while (current) {
      verifySeal(current);
      const journal = db.prepare('SELECT recipe FROM runs WHERE id=?').get(owner);
      if (owner !== 'faction-v1-' + current.hash.slice(0, 20) || ancestors.some(r => r.id === owner)
        || journal && journal.recipe !== current.hash
        || !journal && (db.prepare('SELECT count(*) n FROM attempts WHERE run=?').get(owner).n
          || db.prepare('SELECT count(*) n FROM steps WHERE run=?').get(owner).n || !current.continuation)
        || current.contextHash !== parentRecipe.contextHash || hash(current.inputHashes) !== hash(parentRecipe.inputHashes)
        || hash(current.sourceBinding) !== hash(parentRecipe.sourceBinding)) fail('FACTION_MIXED_REVIEW_LINEAGE_DRIFT');
      ancestors.push({ id: owner, recipe: current });
      if (!current.continuation) break;
      const link = verifySeal(current.continuation);
      owner = link.parentRunId; current = verifySeal(readManifest(owner));
      if (current.hash !== link.parentRecipeHash) fail('FACTION_MIXED_REVIEW_LINEAGE_DRIFT');
    }
    const allowedRunIds = [runId, ...ancestors.map(r => r.id)];
    const stop = () => {
      if (db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n)
        fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
    };
    stop();
    const quarantines = parentRecipe.continuation?.reviewDecompositionMigration?.childContinuation?.quarantinedTasks || [];
    const relevant = quarantines.filter(q => q.fullRoleId === 'faction.' + args.input.factionRecordKey.split(':')[1] + '.' + args.capsule.roleRef.id);
    if (relevant.length !== 1) fail('FACTION_MIXED_REVIEW_QUARANTINE_SCOPE');
    const authArgs = { filename, parentRunId, parentRecipe, args, quarantine: relevant[0], readManifest };
    const authenticateOrigin = () => authenticateFactionAmbiguousFragmentV1(authArgs);
    const authenticated = authenticateOrigin();
    if (recipe.mixedReviewLegacyRoleIds[0] !== authenticated.proof.fullRoleId)
      fail('FACTION_MIXED_REVIEW_LEGACY_ROUTE_SCOPE');
    const readCapabilityReceipt = identity => {
      stop();
      const rows = db.prepare("SELECT run,response FROM attempts WHERE state='received' AND json_extract(response,'$.value.capabilityReceipt.receiptHash')=?")
        .all(identity).filter(row => allowedRunIds.includes(row.run));
      if (rows.length !== 1 || decode(rows[0].response).ok !== true) fail('FACTION_MIXED_REVIEW_ACTUAL_CAPABILITY_MISSING');
      return decode(rows[0].response).capabilityReceipt;
    };
    const readSuccessEvidence = q => {
      if (!allowedRunIds.includes(q.runId)) fail('FACTION_MIXED_REVIEW_FOREIGN_OWNER');
      return readFactionStructuredSuccessEvidenceV1({ filename, ...q });
    };
    const profileFor = capability => {
      const profile = factionExecutionProfileV1({ binding: capability.model === FACTION_EXECUTION_MODEL_BINDING_V1.model
        ? FACTION_EXECUTION_MODEL_BINDING_V1 : null });
      if (capability.model !== profile.model || hash(capability.providerProfileRef) !== hash(factionProfileRefV1(profile)))
        fail('FACTION_MIXED_REVIEW_UNKNOWN_EXECUTION');
      return profile;
    };
    const readFragment = ref => {
      stop();
      const rows = db.prepare("SELECT run,artifact FROM steps WHERE state='complete' AND json_extract(artifact,'$.value.hash')=?")
        .all(ref.hash).filter(r => allowedRunIds.includes(r.run));
      if (!rows.length) fail('FACTION_MIXED_REVIEW_FRAGMENT_MISSING');
      const part = verifySeal(decode(rows[0].artifact));
      if (rows.some(r => hash(decode(r.artifact)) !== hash(part)) || !allowedRunIds.includes(part.runId)
        || part.hash !== ref.hash || part.jobId !== ref.jobId || part.runId !== ref.runId || part.attemptId !== ref.attemptId)
        fail('FACTION_MIXED_REVIEW_FRAGMENT_OWNER_DRIFT');
      return part;
    };
    const resolveExecution = ({ part }) => {
      const receipt = part.protocol === FACTION_FRAGMENT_OPENING_FENCE_PROTOCOL_V1 ? null
        : decode(readSuccessEvidence({ runId: part.runId, attemptId: part.attemptId }).attempt.response).usageReceipt;
      const identity = receipt?.capabilityReceiptHash || part.openingFenceRecoveryRecord?.proof?.invocation?.capabilityReceiptHash;
      const capability = readCapabilityReceipt(identity);
      return { capability, egressBinding: factionExecutionEgressV1(profileFor(capability)), readSuccessEvidence, openingFenceRecovery };
    };
    const prepareReplacement = ({ capability, now = new Date().toISOString(), selection = null }) => {
      const selected = selection || selectFactionExecutionModelV1({ selectedBinding: FACTION_MODEL_LIFECYCLE_BINDING_V1,
        legacyProfileRef: factionProfileRefV1(legacy), now }).decision;
      const authenticateReplacement = () => prepareFactionAmbiguousReplacementV1({ authenticated, authenticateOrigin,
        selection: selected, legacyProfileRef: factionProfileRefV1(legacy), capability: readCapabilityReceipt(capability.receiptHash), now });
      return { replacement: authenticateReplacement(), authenticateReplacement, readSuccessEvidence, readCapabilityReceipt,
        readDispatchChoice: grant => readFactionReplacementDispatchChoiceV1({ filename, grant }) };
    };
    const resolveReplacement = ({ part }) => {
      const evidence = readSuccessEvidence({ runId: part.runId, attemptId: part.attemptId });
      const receipt = decode(evidence.attempt.response).usageReceipt;
      const capability = readCapabilityReceipt(receipt.capabilityReceiptHash);
      // Historical verification uses the actual send instant. A new send uses
      // current time and an actual current capability through prepareReplacement.
      if (!Number.isFinite(Date.parse(receipt.startedAt))) fail('FACTION_MIXED_REVIEW_SEND_TIME_MISSING');
      return prepareReplacement({ capability, now: receipt.startedAt });
    };
    const resolveJobs = () => {
      stop();
      const parts = db.prepare("SELECT run,artifact FROM steps WHERE state='complete' AND json_extract(artifact,'$.value.planHash')=? AND json_type(artifact,'$.value.jobId')='text'")
        .all(plan.hash).filter(r => allowedRunIds.includes(r.run)).map(r => verifySeal(decode(r.artifact)));
      return plan.jobs.map(job => {
        const matches = [...new Map(parts.filter(p => p.jobId === job.id).map(p => [p.hash, p])).values()];
        if (matches.length > 1) fail('FACTION_MIXED_REVIEW_CONFLICTING_JOB_RESULTS');
        if (matches.length) { const p = matches[0]; return { jobId: job.id, kind: 'inherited',
          ref: { jobId: job.id, hash: p.hash, runId: p.runId, attemptId: p.attemptId } }; }
        if (job.id === authenticated.prepared.job.id) return { jobId: job.id, kind: 'replacement', originalAttemptId: authenticated.proof.originAttemptId };
        const prepared = createFactionReviewFragmentCapsuleV1({ ...args, plan, jobId: job.id });
        const caps = db.prepare("SELECT run,response FROM attempts WHERE state='received' AND json_type(response,'$.value.capabilityReceipt')='object'")
          .all().filter(r => allowedRunIds.includes(r.run)).map(r => decode(r.response).capabilityReceipt)
          .filter(c => c.outputContractRef.hash === prepared.job.outputContractRef.hash);
        for (const capability of caps) {
          const lease = factionReviewFragmentLeaseInputV1({ prepared, capability, plan, dshBindingHash: recipe.dshBindingHash });
          if (db.prepare('SELECT count(*) n FROM attempts WHERE id=?').get('structured-' + lease.invocationHash.slice(0, 48)).n)
            fail('FACTION_MIXED_REVIEW_UNMATERIALIZED_ATTEMPT_STOP');
        }
        return { jobId: job.id, kind: 'fresh' };
      });
    };
    const verifyAssembly = value => verifyFactionMixedReviewAssemblyV1({ args, value, readFragment,
      resolveExecution, resolveReplacement, dshBindingHash: recipe.dshBindingHash });
    const verifyPart = part => {
      const prepared = createFactionReviewFragmentCapsuleV1({ ...args, plan, jobId: part.jobId });
      if (part.protocol === FACTION_REPLACEMENT_FRAGMENT_PROTOCOL_V1)
        return verifyFactionReplacementFragmentV1({ ...resolveReplacement({ part }), part, dshBindingHash: recipe.dshBindingHash });
      return verifyFactionReviewFragmentRuntimeV1({ ...args, ...resolveExecution({ part }), part, prepared, plan,
        dshBindingHash: recipe.dshBindingHash });
    };
    return Object.freeze({ plan, allowedRunIds, authenticated, readFragment, readCapabilityReceipt,
      readSuccessEvidence, resolveExecution, resolveReplacement, prepareReplacement, resolveJobs, verifyAssembly, verifyPart,
      close() { if (!closed) { closed = true; db.close(); } } });
  } catch (error) { db.close(); throw error; }
}
