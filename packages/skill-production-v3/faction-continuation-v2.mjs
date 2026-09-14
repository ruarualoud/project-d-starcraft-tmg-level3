import { DatabaseSync } from 'node:sqlite';
import { seal, verifySeal, hash, fail } from '../skill-production/common.mjs';
import { inspectFactionContinuationV1 } from './faction-continuation-v1.mjs';
import { readFactionTeachFailureEvidenceV1 } from
  '../skill-evaluation/faction-teach-failure-evidence-v1.mjs';
import { FACTION_OUTLINE_CAPACITY_BINDING_V1,
  inspectFactionOutlineCapacityEvidenceV1 } from './faction-outline-capacity-envelope-v1.mjs';
import { FACTION_MODEL_LIFECYCLE_BINDING_V1 } from './faction-model-lifecycle-v1.mjs';
import { FACTION_NATIVE_ITEMS_ENVELOPE_BINDING_V1,
  inspectFactionNativeItemsEnvelopeEvidenceV1 } from
  './faction-native-items-envelope-recovery-v1.mjs';

export const FACTION_OUTLINE_CAPACITY_MIGRATION_FILES_V1 = Object.freeze([
  'packages/skill-production-v3/faction-outline-capacity-envelope-v1.mjs',
  'packages/skill-production-v3/faction-outline-capacity-recovery-v1.mjs',
  'packages/skill-production-v3/faction-outline-capacity-runtime-v1.mjs',
  'packages/skill-production-v3/faction-strategy-workflow-v2.mjs',
  'packages/skill-production-v3/faction-continuation-v2.mjs',
  'scripts/verify-ticket-18-faction-outline-capacity-v1.mjs',
  'scripts/run-ticket-18-faction-strategy-production-v2.mjs',
  'scripts/verify-ticket-18-faction-model-fallback-production-v1.mjs',
]);

export const FACTION_NATIVE_ITEMS_ENVELOPE_MIGRATION_FILES_V1 = Object.freeze([
  'packages/skill-production-v3/faction-native-items-envelope-recovery-v1.mjs',
  'packages/skill-production-v3/faction-native-items-envelope-runtime-v1.mjs',
  'packages/skill-production-v3/faction-volatile-structural-reissue-v1.mjs',
  'packages/skill-production-v3/faction-continuation-v2.mjs',
  'scripts/run-ticket-18-faction-strategy-production-v2.mjs',
  'scripts/verify-ticket-18-faction-native-items-envelope-v1.mjs',
]);

const FACTION_RETIRED_EXECUTION_MODEL_FILES_V1 = Object.freeze([
  'content/skill-generation/offline-provider-profile-v3.mjs',
  'scripts/verify-ticket-18-faction-execution-model-v1.mjs',
  'scripts/verify-ticket-18-faction-model-cutover-wiring-v1.mjs',
]);

function projectV1MigrationRecipe(recipe, parent,
  { outlineIntroduced, modelLifecycleIntroduced,
    itemsEnvelopeIntroduced = false,
    itemsEnvelopeMigrationActive = itemsEnvelopeIntroduced }) {
  const { hash: ignored, outlineCapacityBinding,
    outlineCapacityReadinessHash, outlineCapacityOrigin,
    modelLifecycleBinding, modelLifecycleSelections,
    modelLifecycleReadinessHash, itemsEnvelopeBinding,
    itemsEnvelopeReadinessHash, itemsEnvelopeOrigin, ...body } = recipe;
  let codeHashes = body.codeHashes.filter(row =>
    !(outlineIntroduced || modelLifecycleIntroduced)
    || !FACTION_OUTLINE_CAPACITY_MIGRATION_FILES_V1.includes(row.file));
  if (itemsEnvelopeMigrationActive) codeHashes = codeHashes.flatMap(row => {
    if (!FACTION_NATIVE_ITEMS_ENVELOPE_MIGRATION_FILES_V1.includes(row.file))
      return [row];
    const prior = parent.codeHashes.find(entry => entry.file === row.file);
    return prior ? [prior] : [];
  });
  // The lifecycle migration intentionally removes the retired beta-only entry
  // files from real recipes. Frozen V1 treats a removed code-hash row as an
  // unrelated dependency change, so its compatibility projection retains the
  // authenticated parent rows without restoring those files to the real V2
  // recipe or making them executable again.
  if (parent.modelLifecycleBinding && !parent.executionModelBinding) {
    const present = new Set(codeHashes.map(row => row.file));
    for (const file of FACTION_RETIRED_EXECUTION_MODEL_FILES_V1) {
      const prior = parent.codeHashes.find(row => row.file === file);
      if (prior && !present.has(file)) codeHashes.push(prior);
    }
  }
  const projected = { ...body,
    ...(modelLifecycleIntroduced ? {
      executionModelBinding: parent.executionModelBinding,
      executionModelReadinessHash: parent.executionModelReadinessHash,
    } : {}),
    ...(parent.modelLifecycleBinding && !parent.executionModelBinding
      ? { executionModelBinding: null } : {}),
    codeHashes };
  if (!outlineIntroduced) Object.assign(projected, {
    outlineCapacityBinding, outlineCapacityReadinessHash,
    outlineCapacityOrigin,
  });
  if (!modelLifecycleIntroduced) Object.assign(projected, {
    modelLifecycleBinding, modelLifecycleSelections,
    modelLifecycleReadinessHash: parent.modelLifecycleBinding
      ? parent.modelLifecycleReadinessHash : modelLifecycleReadinessHash,
  });
  if (!itemsEnvelopeIntroduced) Object.assign(projected,
    itemsEnvelopeMigrationActive ? {
      itemsEnvelopeBinding: parent.itemsEnvelopeBinding,
      itemsEnvelopeReadinessHash: parent.itemsEnvelopeReadinessHash,
      itemsEnvelopeOrigin: parent.itemsEnvelopeOrigin,
    } : { itemsEnvelopeBinding, itemsEnvelopeReadinessHash,
      itemsEnvelopeOrigin });
  return seal(projected);
}

// Frozen V1 validators compare the retired executionModelBinding directly and
// hash it without accepting `undefined`. Keep the authentic parent seal and DB
// identity, but expose null only to legacy property reads at this call seam.
function projectV1ParentView(parent) {
  if (!parent.modelLifecycleBinding
    || parent.executionModelBinding !== undefined) return parent;
  return new Proxy(parent, { get(target, property, receiver) {
    if (property === 'executionModelBinding') return null;
    return Reflect.get(target, property, receiver);
  } });
}

function inspectFactionContinuationV1Compat({ parent, next, ...args }) {
  try {
    return inspectFactionContinuationV1({ ...args,
      parent: projectV1ParentView(parent), next });
  } catch (error) {
    if (error.code === 'FACTION_CONTINUATION_DEPENDENCY_DRIFT') {
      const files = [...new Set([...parent.codeHashes, ...next.codeHashes]
        .map(row => row.file))];
      error.diagnostic = { ...(error.diagnostic || {}),
        projectedCodeChanges: files.filter(file =>
          parent.codeHashes.find(row => row.file === file)?.hash
            !== next.codeHashes.find(row => row.file === file)?.hash),
      };
    }
    throw error;
  }
}

function collectFactionItemsEnvelopeImportsV1({ filename, runIds, origins,
  inputs, binding }) {
  if (!Array.isArray(inputs) || !inputs.length) return [];
  if (!Array.isArray(runIds) || !runIds.length
    || new Set(runIds).size !== runIds.length
    || runIds.some(runId => !/^faction-v1-[a-f0-9]{20}$/u.test(runId)))
    fail('FACTION_NATIVE_ITEMS_ENVELOPE_ANCESTRY_INVALID');
  inputs.forEach(verifySeal);
  if (!Array.isArray(origins) || !origins.length
    || origins.some(row => !runIds.includes(row.runId)
      || !/^structured-[a-f0-9]{48}$/u.test(row.attemptId || '')))
    fail('FACTION_NATIVE_ITEMS_ENVELOPE_ORIGIN_SCOPE_INVALID');
  const imported = [];
  for (const { runId, attemptId } of origins) {
    const evidence = readFactionTeachFailureEvidenceV1({ filename,
      runId, attemptId });
    const faction = /^faction\.([a-z0-9_]+)\./u.exec(
      evidence.rejected.roleRef?.id || '')?.[1];
    const input = inputs.find(row =>
      row.factionRecordKey === 'tactical_cards:' + faction);
    if (!input) continue;
    try {
      const inspected = inspectFactionNativeItemsEnvelopeEvidenceV1({ input,
        evidence, binding });
      imported.push({ input, evidence, inspected });
    } catch (error) {
      if (error.code !== 'FACTION_NATIVE_ITEMS_ENVELOPE_NOT_APPLICABLE')
        throw error;
    }
  }
  return imported;
}

function attachFactionHostCompositeCheckpointsV2({ filename, parentRunId,
  next, base }) {
  const reasonerBinding = next.targetCompletionBinding?.reasoner;
  if (!reasonerBinding) return base;
  const db = new DatabaseSync(filename, { readOnly: true });
  try {
    const rows = db.prepare("SELECT id,input_hash,artifact FROM steps WHERE run=? AND state='complete' AND json_extract(artifact,'$.value.protocol')='faction_reasoner_answer_completion_v1'")
      .all(parentRunId).map(row => ({ id: row.id, inputHash: row.input_hash,
        artifact: verifySeal(JSON.parse(row.artifact)).value }));
    const additions = [];
    for (const row of rows) {
      const value = row.artifact;
      if (value.roleId !== row.id || value.nativeKind !== 'reasoner'
        || value.hostMaterialization?.bindingHash !== reasonerBinding.hash
        || value.hostMaterialization?.roleInputHash !== row.inputHash
        || !next.inputHashes.includes(value.hostMaterialization?.inputHash)
        || value.structuredDecodePassed !== true
        || value.originalProviderSchemaPassed !== false
        || value.semanticAcceptance !== false || value.runtimeAccepted !== false
        || !Array.isArray(value.completionPartRefs)
        || !value.completionPartRefs.length
        || value.completionPartRefs.some(ref => !base.steps.some(step =>
          step.id === ref.id && step.artifact.hash === ref.hash))) {
        fail('FACTION_HOST_COMPOSITE_CHECKPOINT_INVALID');
      }
      if (!base.steps.some(step => step.id === row.id)) additions.push(row);
    }
    if (!additions.length) return base;
    const steps = [...base.steps, ...additions];
    const { hash: ignoredManifest, ...manifestBody } = base.manifest;
    const reusable = [...manifestBody.reusable, ...additions.map(row => ({
      id: row.id, inputHash: row.inputHash, artifactHash: hash(row.artifact),
    }))];
    const manifest = seal({ ...manifestBody, reusable,
      hostCompositeCheckpoints: additions.map(row => ({ id: row.id,
        inputHash: row.inputHash, artifactHash: hash(row.artifact),
        protocol: row.artifact.protocol,
        childRefsHash: hash(row.artifact.completionPartRefs) })),
      policy: manifestBody.policy
        + '_plus_authenticated_host_composite_checkpoint_exact_input_only' });
    return { ...base, steps, manifest };
  } finally { db.close(); }
}

export function inspectFactionContinuationV2(args) {
  const { filename, parentRunId, parent, parentReport, next,
    outlineCapacityMigration, modelLifecycleMigration,
    itemsEnvelopeMigration, ...v1Args } = args;
  [parent, parentReport, next].forEach(verifySeal);
  const introduced = !parent.outlineCapacityBinding;
  const modelLifecycleIntroduced = !parent.modelLifecycleBinding
    && !!next.modelLifecycleBinding;
  const itemsEnvelopeIntroduced = !parent.itemsEnvelopeBinding
    && !!next.itemsEnvelopeBinding;
  const itemsEnvelopeReadinessChanged = !!parent.itemsEnvelopeBinding
    && parent.itemsEnvelopeReadinessHash !== next.itemsEnvelopeReadinessHash;
  const itemsEnvelopeMigrationActive = itemsEnvelopeIntroduced
    || itemsEnvelopeReadinessChanged;
  let modelLifecycleProof = null;
  if (parent.modelLifecycleBinding
    && (hash(parent.modelLifecycleBinding)
      !== hash(next.modelLifecycleBinding || null)
      || hash(parent.modelLifecycleSelections)
        !== hash(next.modelLifecycleSelections || null))) {
    fail('FACTION_MODEL_LIFECYCLE_DRIFT');
  }
  if (modelLifecycleIntroduced) {
    const readiness = modelLifecycleMigration?.readiness;
    [next.modelLifecycleBinding, next.modelLifecycleSelections,
      readiness].forEach(verifySeal);
    if (!parent.executionModelBinding || next.executionModelBinding
      || next.modelLifecycleBinding.hash
        !== FACTION_MODEL_LIFECYCLE_BINDING_V1.hash
      || readiness.hash !== next.modelLifecycleReadinessHash
      || readiness.bindingHash !== next.modelLifecycleBinding.hash
      || readiness.selectionPairHash !== next.modelLifecycleSelections.hash
      || !readiness.passed || readiness.providerCalls !== 0
      || !readiness.productionEntrypointWired
      || readiness.selectedModel !== next.modelLifecycleBinding.fallbackModel
      || readiness.selectionReason !== 'local_beta_window_closed'
      || next.modelLifecycleSelections.base.selection !== 'stable_fallback'
      || next.modelLifecycleSelections.capacity.selection !== 'stable_fallback'
      || !readiness.bothOutputCapacitiesCovered
      || !readiness.oldPaidArtifactOwnersPreserved
      || !readiness.noQualityFallback || !readiness.noAmbiguousSendRetry) {
      fail('FACTION_MODEL_LIFECYCLE_MIGRATION_INVALID');
    }
    for (const row of readiness.codeHashes)
      if (next.codeHashes.find(entry => entry.file === row.file)?.hash
        !== row.hash) fail('FACTION_MODEL_LIFECYCLE_CODE_DRIFT');
    modelLifecycleProof = {
      readinessHash: readiness.hash,
      bindingHash: next.modelLifecycleBinding.hash,
      selectionPairHash: next.modelLifecycleSelections.hash,
      selectedModel: readiness.selectedModel,
      reason: readiness.selectionReason,
      policy: 'explicit_sticky_retirement_fallback_preserve_actual_paid_artifact_owners',
      providerCalls: 0,
      semanticAcceptanceInherited: false,
    };
  } else if (parent.modelLifecycleBinding
    && parent.modelLifecycleReadinessHash
      !== next.modelLifecycleReadinessHash) {
    const readiness = modelLifecycleMigration?.readiness;
    verifySeal(readiness);
    if (readiness.hash !== next.modelLifecycleReadinessHash
      || readiness.bindingHash !== next.modelLifecycleBinding.hash
      || readiness.selectionPairHash !== next.modelLifecycleSelections.hash
      || !readiness.passed || readiness.providerCalls !== 0
      || !readiness.productionEntrypointWired
      || readiness.selectedModel !== next.modelLifecycleBinding.fallbackModel
      || readiness.selectionReason !== 'local_beta_window_closed'
      || !readiness.bothOutputCapacitiesCovered
      || !readiness.oldPaidArtifactOwnersPreserved
      || !readiness.noQualityFallback || !readiness.noAmbiguousSendRetry) {
      fail('FACTION_MODEL_LIFECYCLE_READINESS_REFRESH_INVALID');
    }
    for (const row of readiness.codeHashes)
      if (next.codeHashes.find(entry => entry.file === row.file)?.hash
        !== row.hash) fail('FACTION_MODEL_LIFECYCLE_CODE_DRIFT');
    modelLifecycleProof = {
      priorReadinessHash: parent.modelLifecycleReadinessHash,
      readinessHash: readiness.hash,
      bindingHash: next.modelLifecycleBinding.hash,
      selectionPairHash: next.modelLifecycleSelections.hash,
      selectedModel: readiness.selectedModel,
      reason: 'production_entrypoint_readiness_refresh_same_model_selection',
      policy: 'same_sticky_selection_new_code_readiness_no_model_transition',
      providerCalls: 0,
      semanticAcceptanceInherited: false,
    };
  } else if (!!parent.modelLifecycleBinding !== !!next.modelLifecycleBinding
    || modelLifecycleMigration) {
    fail('FACTION_MODEL_LIFECYCLE_MIGRATION_UNSCOPED');
  }
  if (parent.itemsEnvelopeBinding
    && hash(parent.itemsEnvelopeBinding)
      !== hash(next.itemsEnvelopeBinding || null)) {
    fail('FACTION_NATIVE_ITEMS_ENVELOPE_BINDING_DRIFT');
  }
  let itemsEnvelopeProof = null;
  let itemsEnvelopeImports = [];
  if (next.itemsEnvelopeBinding) {
    if (next.itemsEnvelopeBinding.hash
        !== FACTION_NATIVE_ITEMS_ENVELOPE_BINDING_V1.hash) {
      fail('FACTION_NATIVE_ITEMS_ENVELOPE_BINDING_INVALID');
    }
    const itemInputs = itemsEnvelopeMigration?.inputs;
    if (!Array.isArray(itemInputs) || itemInputs.length !== 2)
      fail('FACTION_NATIVE_ITEMS_ENVELOPE_INPUTS_REQUIRED');
    itemInputs.forEach(verifySeal);
    const ancestorRunIds = parent.continuation?.checkpointInventory?.ancestors
      ?.map(row => row.runId) || [];
    const itemOriginRunIds = [...new Set([parentRunId,
      ...ancestorRunIds])];
    const envelopeReadiness = itemsEnvelopeMigration?.readiness;
    verifySeal(envelopeReadiness);
    const found = collectFactionItemsEnvelopeImportsV1({ filename,
      runIds: itemOriginRunIds, origins: [{
        runId: envelopeReadiness.originRunId,
        attemptId: envelopeReadiness.originAttemptId }], inputs: itemInputs,
      binding: next.itemsEnvelopeBinding });
    itemsEnvelopeImports = found.map(row => row.evidence);
    if (itemsEnvelopeMigrationActive) {
      const readiness = envelopeReadiness;
      if (!readiness.passed || readiness.providerCalls !== 0
        || readiness.bindingHash !== next.itemsEnvelopeBinding.hash
        || readiness.hash !== next.itemsEnvelopeReadinessHash
        || itemsEnvelopeIntroduced && readiness.originRunId !== parentRunId
        || !itemOriginRunIds.includes(readiness.originRunId)
        || readiness.originRunId !== next.itemsEnvelopeOrigin?.runId
        || readiness.originAttemptId !== next.itemsEnvelopeOrigin?.attemptId
        || !next.inputHashes.includes(readiness.inputHash)
        || !readiness.oldProviderSchemaRejects
        || !readiness.normalizedProviderSchemaAccepts
        || !readiness.originalCandidateBytesPreserved
        || readiness.fieldValuesChanged !== false
        || !readiness.onlyEnvelopeShapeIssuesAccepted
        || !readiness.unknownSourcesRejected
        || !readiness.nonEnvelopeIssuesRejected
        || readiness.semanticAcceptanceInherited !== false) {
        fail('FACTION_NATIVE_ITEMS_ENVELOPE_READINESS_INVALID');
      }
      for (const row of readiness.codeHashes) {
        if (next.codeHashes.find(entry => entry.file === row.file)?.hash
            !== row.hash) fail('FACTION_NATIVE_ITEMS_ENVELOPE_CODE_DRIFT');
      }
      const origin = found.find(row =>
        row.evidence.attempt.id === readiness.originAttemptId
        && row.input.hash === readiness.inputHash);
      if (!origin || origin.inspected.hash !== readiness.evidenceHash
        || origin.inspected.originalFailureReceiptHash
          !== readiness.originalFailureReceiptHash
        || origin.inspected.rejectedCandidateHash
          !== readiness.rejectedCandidateHash
        || origin.inspected.normalized.originalOutputHash
          !== readiness.originalOutputHash
        || origin.inspected.normalized.outputHash
          !== readiness.normalizedOutputHash) {
        fail('FACTION_NATIVE_ITEMS_ENVELOPE_ORIGIN_DRIFT');
      }
      itemsEnvelopeProof = {
        ...(itemsEnvelopeReadinessChanged ? {
          priorReadinessHash: parent.itemsEnvelopeReadinessHash } : {}),
        readinessHash: readiness.hash,
        bindingHash: next.itemsEnvelopeBinding.hash,
        originRunId: readiness.originRunId,
        originAttemptId: readiness.originAttemptId,
        evidenceHash: readiness.evidenceHash,
        policy: 'lossless_transport_envelope_move_then_existing_whole_section_review',
        providerCalls: 0,
        semanticAcceptanceInherited: false,
      };
    }
  } else if (itemsEnvelopeMigration || next.itemsEnvelopeReadinessHash
    || next.itemsEnvelopeOrigin) {
    fail('FACTION_NATIVE_ITEMS_ENVELOPE_MIGRATION_UNSCOPED');
  }
  if (parent.outlineCapacityBinding
    && hash(parent.outlineCapacityBinding)
      !== hash(next.outlineCapacityBinding || null)) {
    fail('FACTION_OUTLINE_CAPACITY_BINDING_DRIFT');
  }
  if (!next.outlineCapacityBinding) {
    if (outlineCapacityMigration || next.outlineCapacityReadinessHash
      || next.outlineCapacityOrigin) {
      fail('FACTION_OUTLINE_CAPACITY_MIGRATION_UNSCOPED');
    }
    return inspectFactionContinuationV1Compat({ filename, parentRunId,
      parent, parentReport, next, ...v1Args });
  }
  if (next.outlineCapacityBinding.hash
      !== FACTION_OUTLINE_CAPACITY_BINDING_V1.hash) {
    fail('FACTION_OUTLINE_CAPACITY_BINDING_INVALID');
  }
  if (!introduced) {
    if (outlineCapacityMigration)
      fail('FACTION_OUTLINE_CAPACITY_MIGRATION_ALREADY_APPLIED');
    const projectedNext = projectV1MigrationRecipe(next, parent,
      { outlineIntroduced: false, modelLifecycleIntroduced,
        itemsEnvelopeIntroduced, itemsEnvelopeMigrationActive });
    const base = attachFactionHostCompositeCheckpointsV2({ filename,
      parentRunId, next, base: inspectFactionContinuationV1Compat({ filename,
        parentRunId, parent, parentReport, next: projectedNext,
        ...v1Args }) });
    if (!itemsEnvelopeMigrationActive && !itemsEnvelopeImports.length)
      return base;
    const { hash: ignoredManifest, ...manifestBody } = base.manifest;
    const permits = itemsEnvelopeImports.map(evidence => ({
      inputHash: itemsEnvelopeMigration.inputs.find(input =>
        evidence.rejected.roleRef.id.startsWith('faction.'
          + input.factionRecordKey.split(':')[1] + '.')).hash,
      originRunId: evidence.attempt.run,
      originAttemptId: evidence.attempt.id,
      fullRoleId: evidence.rejected.roleRef.id,
      rejectedCandidateHash: evidence.rejected.hash,
      originalFailureReceiptHash: evidence.issue.safeReceiptHash,
    }));
    const manifest = seal({ ...manifestBody,
      nextBaseRecipeHash: next.hash,
      changes: [...new Set([...manifestBody.changes,
        ...(itemsEnvelopeMigrationActive
          ? FACTION_NATIVE_ITEMS_ENVELOPE_MIGRATION_FILES_V1 : [])])],
      ...(itemsEnvelopeProof ? (itemsEnvelopeIntroduced
        ? { itemsEnvelopeMigration: itemsEnvelopeProof }
        : { itemsEnvelopeReadinessRefresh: itemsEnvelopeProof }) : {}),
      ...(modelLifecycleProof
        ? { modelLifecycleReadinessRefresh: modelLifecycleProof } : {}),
      ...(permits.length ? { itemsEnvelopeImports: permits } : {}),
      policy: manifestBody.policy
        + '_plus_lossless_native_items_envelope_import',
    });
    return { ...base, manifest, itemsEnvelopeImports };
  }
  const readiness = outlineCapacityMigration?.readiness;
  const input = outlineCapacityMigration?.input;
  [readiness, input].forEach(verifySeal);
  if (!readiness.passed || readiness.providerCalls !== 0
    || readiness.bindingHash !== next.outlineCapacityBinding.hash
    || readiness.hash !== next.outlineCapacityReadinessHash
    || readiness.originRunId !== parentRunId
    || readiness.originRunId !== next.outlineCapacityOrigin?.runId
    || readiness.originAttemptId !== next.outlineCapacityOrigin?.attemptId
    || readiness.inputHash !== input.hash
    || !next.inputHashes.includes(input.hash)
    || !readiness.oldProviderSchemaRejects
    || !readiness.newHostSchemaAccepts
    || !readiness.originalCandidateBytesPreserved
    || !readiness.onlyNarrativeCapacityIssuesAccepted
    || !readiness.unknownSourcesRejected
    || !readiness.nonCapacityIssuesRejected
    || readiness.semanticAcceptanceInherited !== false) {
    fail('FACTION_OUTLINE_CAPACITY_READINESS_INVALID');
  }
  for (const row of readiness.codeHashes) {
    if (next.codeHashes.find(entry => entry.file === row.file)?.hash !== row.hash)
      fail('FACTION_OUTLINE_CAPACITY_CODE_DRIFT');
  }
  const evidence = readFactionTeachFailureEvidenceV1({ filename,
    runId: readiness.originRunId, attemptId: readiness.originAttemptId });
  const inspected = inspectFactionOutlineCapacityEvidenceV1({ input,
    evidence, binding: next.outlineCapacityBinding });
  if (inspected.hash !== readiness.evidenceHash
    || inspected.originalFailureReceiptHash
      !== readiness.originalFailureReceiptHash
    || inspected.rejectedCandidateHash !== readiness.rejectedCandidateHash
    || inspected.normalized.originalOutputHash !== readiness.originalOutputHash
    || hash(inspected.normalized.focusLengths) !== hash(readiness.focusLengths)) {
    fail('FACTION_OUTLINE_CAPACITY_ORIGIN_DRIFT');
  }
  const projectedNext = projectV1MigrationRecipe(next, parent,
    { outlineIntroduced: introduced, modelLifecycleIntroduced,
      itemsEnvelopeIntroduced, itemsEnvelopeMigrationActive });
  const base = attachFactionHostCompositeCheckpointsV2({ filename, parentRunId,
    next, base: inspectFactionContinuationV1Compat({ filename, parentRunId,
      parent, parentReport, next: projectedNext, ...v1Args }) });
  const { hash: ignoredManifest, ...manifestBody } = base.manifest;
  const permit = {
    inputHash: input.hash,
    originRunId: readiness.originRunId,
    originAttemptId: readiness.originAttemptId,
    evidenceHash: inspected.hash,
    fullRoleId: inspected.roleRef.id,
    rejectedCandidateHash: inspected.rejectedCandidateHash,
    originalFailureReceiptHash: inspected.originalFailureReceiptHash,
    originalOutputHash: inspected.normalized.originalOutputHash,
  };
  const manifest = seal({
    ...manifestBody,
    nextBaseRecipeHash: next.hash,
    changes: [...new Set([...manifestBody.changes,
      ...FACTION_OUTLINE_CAPACITY_MIGRATION_FILES_V1,
      ...(itemsEnvelopeMigrationActive
        ? FACTION_NATIVE_ITEMS_ENVELOPE_MIGRATION_FILES_V1 : [])])],
    outlineCapacityMigration: {
      readinessHash: readiness.hash,
      bindingHash: next.outlineCapacityBinding.hash,
      permit,
      policy: 'frozen_provider_target_plus_versioned_host_capacity_and_exact_paid_candidate_import',
      providerCalls: 0,
      semanticAcceptanceInherited: false,
    },
    ...(modelLifecycleProof ? {
      modelLifecycleMigration: modelLifecycleProof,
    } : {}),
    ...(itemsEnvelopeProof ? (itemsEnvelopeIntroduced
      ? { itemsEnvelopeMigration: itemsEnvelopeProof }
      : { itemsEnvelopeReadinessRefresh: itemsEnvelopeProof }) : {}),
    ...(itemsEnvelopeImports.length ? { itemsEnvelopeImports:
      itemsEnvelopeImports.map(evidence => ({
        originRunId: evidence.attempt.run,
        originAttemptId: evidence.attempt.id,
        fullRoleId: evidence.rejected.roleRef.id,
        rejectedCandidateHash: evidence.rejected.hash,
        originalFailureReceiptHash: evidence.issue.safeReceiptHash,
      })) } : {}),
    policy: manifestBody.policy
      + '_plus_authenticated_outline_capacity_import_without_rewrite',
  });
  return { ...base, manifest, outlineCapacityImports: [evidence],
    itemsEnvelopeImports };
}
