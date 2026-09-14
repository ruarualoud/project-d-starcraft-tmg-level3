import { materializeFactionStructuredReviewV1 } from './faction-structured-review-runtime-v1.mjs';
import { createFactionReviewContextCapsuleV1 } from './faction-review-context-capsule-v1.mjs';
import { resolveFactionReviewCoverageAddressesV4, FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_V4 as priorAddress } from './faction-review-coverage-address-v4.mjs';
import { verifyFactionExecutionModelReceiptV1, factionExecutionEgressV1,
  factionExecutionProfileV1, factionProfileRefV1 } from './faction-execution-model-v1.mjs';
import { assertStarcraftTmgProviderCapabilityReceiptV1 } from '../structured-generation/provider-capability-receipt-v1.mjs';
import { createStarcraftTmgContextCapsuleV1, verifyStarcraftTmgContextCapsuleV1, contextManifestRefStarcraftTmgV1 } from '../structured-generation/context-capsule-v1.mjs';
import { validateStarcraftTmgProviderJsonSchemaValueV1 } from '../structured-generation/output-contract-registry-v1.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V5 as legacyContract,
  STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_REF_V5 as legacyRef } from '../../content/skill-generation/ticket-18-faction-review-output-contract-v1.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V6 as contract,
  STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_REF_V6 as contractRef,
  FACTION_REVIEW_SLOT_NAMESPACE_BINDING_V1 as binding } from '../../content/skill-generation/ticket-18-faction-review-output-contract-v6.mjs';
import { hash, seal, verifySeal, fail } from '../skill-production/common.mjs';
import { createFactionReviewSourceExpansionV1 } from './faction-review-source-expansion-v1.mjs';
import { prepareFactionStructuralJsonSchemaRepairV2 } from './faction-structural-json-schema-bridge-v2.mjs';
import { FACTION_PARSED_REVIEW_VALUE_BINDING_V2, inspectFactionParsedReviewValueV2 }
  from './faction-parsed-review-value-v1.mjs';
import { planFactionReviewFieldBindingV1, applyFactionReviewFieldBindingV1 }
  from './faction-review-targets-v1.mjs';
import { FACTION_NATIVE_REVIEW_AMBIGUOUS_REPLACEMENT_BINDING_V1 }
  from './faction-native-review-ambiguous-replacement-v1.mjs';
import { FACTION_REVIEW_SOFT_LIMIT_BINDING_V1,
  inspectFactionReviewSoftLimitRecordV1 }
  from './faction-review-soft-limit-v1.mjs';

const contextFields = ['kind', 'roleRef', 'outputContractRef', 'immutableBase', 'section', 'localIssue',
  'protectedFields', 'dependencyGraph', 'sourceIndexRef', 'expansionToolRef', 'omittedDomains', 'instructions'];
const sameSet = (a, b) => hash([...a].sort((x, y) => x - y)) === hash([...b].sort((x, y) => x - y));
const invalid = () => fail('FACTION_REVIEW_SLOT_NAMESPACE_UNRESOLVED');
const schemaCheck = (selected, value) => {
  if (!validateStarcraftTmgProviderJsonSchemaValueV1(selected.providerSchema, value).ok)
    fail('FACTION_REVIEW_SLOT_NAMESPACE_SCHEMA_INVALID');
};

const verdictSeverity = Object.freeze({ supported: 0, uncertain: 1,
  unsupported: 2 });

// A duplicate row is not a missing coordinate. When every Host-declared
// target is still represented and no row points outside the supplied batch,
// keep the most conservative complete Provider row unchanged and retain the
// discarded rows by hash in the coordinate proof. Never infer a missing slot
// from prose and never upgrade an acceptance verdict.
function narrowDuplicateTargetRowsV1(providerOutput, targetCount) {
  const rows = providerOutput.verdicts;
  if (!Array.isArray(rows) || !Number.isSafeInteger(targetCount)
    || targetCount < 1 || rows.length <= targetCount
    || rows.some(row => !Number.isInteger(row.targetSlot)
      || row.targetSlot < 0 || row.targetSlot >= targetCount
      || verdictSeverity[row.verdict] === undefined))
    return { verdicts: structuredClone(rows || []), repairs: [] };
  const groups = new Map();
  for (const row of rows) {
    const group = groups.get(row.targetSlot) || [];
    group.push(row); groups.set(row.targetSlot, group);
  }
  if (groups.size !== targetCount
    || [...Array(targetCount).keys()].some(slot => !groups.has(slot)))
    return { verdicts: structuredClone(rows), repairs: [] };
  const repairs = [], verdicts = [];
  for (let slot = 0; slot < targetCount; slot += 1) {
    const group = groups.get(slot);
    const retained = group.reduce((selected, row) =>
      verdictSeverity[row.verdict] > verdictSeverity[selected.verdict]
        ? row : selected);
    verdicts.push(structuredClone(retained));
    if (group.length > 1) repairs.push({ targetSlot: slot,
      originalRowHashes: group.map(hash), retainedRowHash: hash(retained),
      retainedVerdict: retained.verdict,
      discardedRows: group.filter(row => row !== retained)
        .map(row => ({ hash: hash(row), verdict: row.verdict })),
      policy: 'retain_most_conservative_complete_provider_row',
      verdictOrder: ['unsupported', 'uncertain', 'supported'],
      acceptanceUpgraded: false });
  }
  return { verdicts, repairs };
}

export function createFactionSlotReviewContextV1(options) {
  if (options.outputContractRef && hash(options.outputContractRef) !== hash(contractRef))
    fail('FACTION_REVIEW_SLOT_NAMESPACE_CONTRACT_DRIFT');
  const base = createFactionReviewContextCapsuleV1({ ...options, outputContractRef: contractRef });
  return createStarcraftTmgContextCapsuleV1({ ...Object.fromEntries(contextFields.map(key => [key, base[key]])),
    localIssue: { ...base.localIssue, hostOwns: [...base.localIssue.hostOwns, 'recommendationIndices'],
      reviewTask: { ...base.localIssue.reviewTask,
      outputRules: { ...base.localIssue.reviewTask.outputRules,
        recommendationSlots: 'Coverage uses the same supplied local targetSlots as verdicts.targetSlot. Covered requires at least one supplied slot whose exact recommendation cites that coverage source. Omitted or uncertain may use []. Do not emit recommendationIndices or count the whole draft; the Host performs that mapping.' } } },
    instructions: base.instructions + '\nCoverage recommendationSlots are batch-local target slots, never whole-draft indices. Their meaning is fixed by this contract, not by the wording in reason. Keep every negative or uncertain judgment.',
  });
}

function assertContext(options, native = false) {
  const { capsule, input, section, draft, reviewIndices, requiredSourceRefs, targets } = options;
  verifyStarcraftTmgContextCapsuleV1(capsule);
  if (capsule.localIssue.structuralJsonRecovery) {
    const proof = options.structuralJsonSchemaRepair;
    if (!native || !proof?.baseCapsule || !proof.authenticated)
      fail('FACTION_PARSED_WIRE_SCHEMA_CONTEXT_PROOF_REQUIRED');
    const expectedBase = assertContext({ ...options, capsule: proof.baseCapsule,
      structuralJsonSchemaRepair: null }, true);
    // assertContext returns the un-repaired base for old schema envelopes.
    // A new V2 recovery must bind the exact supplied phase before correction.
    if (expectedBase.hash !== proof.baseCapsule.hash) fail('FACTION_PARSED_WIRE_SCHEMA_BASE_DRIFT');
    const rebuilt = prepareFactionStructuralJsonSchemaRepairV2({ capsule: expectedBase,
      authenticated: proof.authenticated });
    if (rebuilt.hash !== proof.preparationHash || rebuilt.context.hash !== capsule.hash)
      fail('FACTION_PARSED_WIRE_SCHEMA_CONTEXT_DRIFT');
    return rebuilt.context;
  }
  const factory = native ? createFactionSlotReviewContextV1 : createFactionReviewContextCapsuleV1;
  let expected = factory({ factionInput: input, section, draft, reviewIndices,
    coverageRequiredSourceRefs: requiredSourceRefs, targets, roleRef: capsule.roleRef,
    outputContractRef: capsule.outputContractRef, route: capsule.localIssue.reviewTask.route,
    includeSharedScenarioSources: capsule.immutableBase.sharedScenarioSourcesIncluded === true });
  if (capsule.localIssue.sourceContextExpansion || options.sourceContextExpansion) {
    const proof = options.sourceContextExpansion;
    if (!native || !proof?.baseCapsule || !proof.triggerOutput)
      fail('FACTION_REVIEW_SOURCE_EXPANSION_CONTEXT_PROOF_REQUIRED');
    // Reconstruct the original context before accepting any extra source body.
    // The caller must separately authenticate the trigger's paid provenance.
    const base = assertContext({ ...options, capsule: proof.baseCapsule,
      sourceContextExpansion: null }, true);
    if (base.hash !== proof.baseCapsule.hash) fail('FACTION_REVIEW_SOURCE_EXPANSION_BASE_DRIFT');
    const expanded = createFactionReviewSourceExpansionV1({ input, baseCapsule: base,
      triggerOutput: proof.triggerOutput,
      narrativeCapacityProof: proof.narrativeCapacityProof || null });
    if (!expanded || expanded.hash !== proof.preparationHash)
      fail('FACTION_REVIEW_SOURCE_EXPANSION_PROOF_DRIFT');
    expected = expanded.context;
    if (hash(expected.localIssue.sourceContextExpansion) !== hash(capsule.localIssue.sourceContextExpansion))
      fail('FACTION_REVIEW_SOURCE_EXPANSION_CONTEXT_DRIFT');
  }
  // Schema-correction envelopes can carry extra exact-path repair evidence;
  // they cannot change the finite catalogue, complete source graph or draft.
  const fields = ['immutableBase', 'section', 'dependencyGraph', 'sourceIndexRef', 'expansionToolRef', 'omittedDomains'];
  if (fields.some(key => hash(expected[key]) !== hash(capsule[key]))
    || hash(expected.localIssue.reviewTask) !== hash(capsule.localIssue.reviewTask)
    || hash(expected.localIssue.hostOwns) !== hash(capsule.localIssue.hostOwns)
    || expected.protectedFields.some(row => !capsule.protectedFields.some(actual => hash(actual) === hash(row)))
    || !capsule.instructions.startsWith(expected.instructions))
    fail('FACTION_REVIEW_SLOT_NAMESPACE_CONTEXT_DRIFT');
  return expected;
}

function hostResult(options, mapped, proof, version) {
  const value = materializeFactionStructuredReviewV1({ ...options, providerOutput: mapped,
    coverageAddressBinding: null, reviewSourceMaximum: 128 });
  const duplicateNarrowing = proof.duplicateTargetRowsNarrowed || [];
  return { ...value, receipt: seal({ version, bindingHash: binding.hash,
    providerOutputHash: hash(options.providerOutput), mappedProviderOutputHash: hash(mapped),
    contextCapsuleHash: options.capsule.hash, targetContractHash: options.targets.hash,
    materializedOutputHash: hash(value.output), priorMaterializationReceipt: value.receipt,
    coordinateProof: proof, judgmentsChanged: false, reasonsChanged: false,
    sourceRefsChanged: false, originalProviderArtifactsPreserved: true,
    ...(duplicateNarrowing.length ? {
      duplicateTargetRowsNarrowed: true,
      retainedRowsAreOriginalProviderRows: true,
      discardedRowsPreservedByProviderOutputHash: true,
      acceptanceUpgraded: false } : {}),
    semanticAcceptanceInherited: false, runtimeAccepted: false, trainingTruth: false }) };
}

export function materializeFactionSlotReviewV1(options) {
  assertContext(options, true);
  if (options.narrativeCapacityRecord) {
    const record = verifySeal(options.narrativeCapacityRecord);
    if (record.bindingHash === FACTION_REVIEW_SOFT_LIMIT_BINDING_V1.hash) {
      inspectFactionReviewSoftLimitRecordV1({ record, capsule: options.capsule,
        providerOutput: options.providerOutput });
    } else {
      const inspected = inspectFactionParsedReviewValueV2({ capsule: options.capsule,
        authenticated: record.authenticatedProof });
      if (record.version !== FACTION_PARSED_REVIEW_VALUE_BINDING_V2.version
        || record.bindingHash !== FACTION_PARSED_REVIEW_VALUE_BINDING_V2.hash
        || record.originalContextHash !== options.capsule.hash
        || record.capacityProof?.hash !== inspected.capacity.hash
        || hash(inspected.output) !== hash(options.providerOutput))
        fail('FACTION_REVIEW_SLOT_NAMESPACE_NARRATIVE_CAPACITY_DRIFT');
    }
  } else schemaCheck(contract, options.providerOutput);
  const mappings = [];
  const narrowedCoverageClaims = [];
  const repairedCoverageClaims = [];
  const targetNarrowing = narrowDuplicateTargetRowsV1(
    options.providerOutput, options.targets.targets.length);
  const mapped = { verdicts: targetNarrowing.verdicts,
    coverage: options.providerOutput.coverage.map(row => {
      const sourceRef = options.requiredSourceRefs[row.coverageSlot];
      if (!sourceRef) invalid();
      let selected = row.recommendationSlots.flatMap(slot => {
        const target = options.targets.targets[slot];
        if (!target || !target.recommendation.sourceRefs.includes(sourceRef)) {
          narrowedCoverageClaims.push({ coverageSlot: row.coverageSlot,
            sourceRef, droppedTargetSlot: slot,
            reason: target ? 'recommendation_does_not_directly_cite_source'
              : 'target_slot_out_of_range' });
          return [];
        }
        mappings.push({ coverageSlot: row.coverageSlot, sourceRef, targetSlot: slot,
          index: target.index, targetId: target.targetId, recommendationHash: target.recommendationHash });
        return [target.index];
      });
      let materializedVerdict = row.verdict;
      if (row.verdict === 'covered' && !selected.length) {
        const direct = options.targets.targets.flatMap((target, slot) =>
          target.recommendation.sourceRefs.includes(sourceRef)
            ? [{ slot, target }] : []);
        if (direct.length) {
          selected = direct.map(({ slot, target }) => {
            mappings.push({ coverageSlot: row.coverageSlot, sourceRef,
              targetSlot: slot, index: target.index,
              targetId: target.targetId,
              recommendationHash: target.recommendationHash });
            return target.index;
          });
          repairedCoverageClaims.push({ coverageSlot: row.coverageSlot,
            sourceRef, originalRecommendationSlots:
              structuredClone(row.recommendationSlots),
            recoveredTargetSlots: direct.map(({ slot }) => slot),
            policy: 'recover_from_exact_batch_target_source_refs',
            proseUsedToInferAddress: false,
            verdictChanged: false, acceptanceUpgraded: false });
        } else {
          materializedVerdict = 'uncertain';
          repairedCoverageClaims.push({ coverageSlot: row.coverageSlot,
            sourceRef, originalRecommendationSlots:
              structuredClone(row.recommendationSlots),
            recoveredTargetSlots: [],
            policy: 'downgrade_unsupported_covered_coordinate',
            proseUsedToInferAddress: false,
            verdictChanged: true, from: 'covered', to: 'uncertain',
            acceptanceUpgraded: false });
        }
      }
      const { recommendationSlots, ...unchanged } = row;
      return { ...structuredClone(unchanged), verdict: materializedVerdict,
        recommendationIndices: selected };
    }) };
  const coordinateProof = seal({ version: 'native_review_target_slot_mapping_v1',
    targetContractHash: options.targets.hash, mappings, proseUsedToInferAddress: false,
    ...(targetNarrowing.repairs.length ? {
      duplicateTargetRowsNarrowed: targetNarrowing.repairs,
      repair: 'conservative_duplicate_target_row_narrowing',
      action: 'continue', noMissingOrOutOfRangeTargetRepaired: true,
      originalProviderOutputHash: hash(options.providerOutput) } : {}),
    ...(narrowedCoverageClaims.length ? { narrowedCoverageClaims,
      repair: 'drop_only_non_citing_surplus_slots', action: 'continue',
      atLeastOneDirectCitationStillRequiredForCovered: true } : {}),
    ...(repairedCoverageClaims.length ? { repairedCoverageClaims,
      coverageFallback: 'exact_source_ref_readdress_or_conservative_downgrade',
      action: 'continue', proseUsedToInferCoverageAddress: false,
      acceptanceUpgraded: false } : {}),
    semanticAcceptance: false, trainingTruth: false });
  try {
    return hostResult({ ...options,
      ...(options.narrativeCapacityRecord ? { reviewReasonMaximum: null,
        reviewNarrativeCharacterMaximum: null } : {}) }, mapped, coordinateProof,
    'faction_review_native_slot_materialization_v1');
  } catch (error) {
    if (!['FACTION_REVIEW_TARGET_QUOTE_REQUIRED', 'FACTION_REVIEW_TARGET_QUOTE_MISMATCH'].includes(error.code)) throw error;
    // The provider already selected a finite Host-declared field path. When its
    // quote is a paraphrase or a shortened sentence, retain that raw focus as
    // unverified evidence and materialize the exact Host-owned field text. No
    // prose/entity matching chooses a path, and no judgment or source changes.
    const available = new Map(options.capsule.localIssue.reviewTask.sourceCatalogue
      .filter(row => row.includedAs !== 'not_in_current_faction_scope').map(row => [row.slot, row.ref]));
    const original = { verdicts: [...mapped.verdicts].sort((a, b) => a.targetSlot - b.targetSlot).map(row => {
      const target = options.targets.targets[row.targetSlot];
      if (!target || !Array.isArray(row.sourceSlots) || !row.sourceSlots.length
        || row.sourceSlots.some(slot => !available.has(slot))) fail('FACTION_STRUCTURED_REVIEW_SOURCE_SLOT_INVALID');
      return { targetId: target.targetId, title: target.title, focus: structuredClone(row.focus),
        verdict: row.verdict, reason: row.reason, sourceRefs: row.sourceSlots.map(slot => available.get(slot)) };
    }), coverage: [...mapped.coverage].sort((a, b) => a.coverageSlot - b.coverageSlot).map(row => {
      const sourceRef = options.requiredSourceRefs[row.coverageSlot];
      if (!sourceRef) invalid();
      return { sourceRef, verdict: row.verdict, reason: row.reason,
        recommendationIndices: structuredClone(row.recommendationIndices) };
    }) };
    const plan = planFactionReviewFieldBindingV1(original, options.targets);
    const selection = { selections: original.verdicts.map(row => ({ targetId: row.targetId,
      fieldPaths: [...new Set(row.focus.map(focus => focus.path))] })) };
    const rebound = applyFactionReviewFieldBindingV1(original, options.targets, plan, selection);
    const focusByTarget = new Map(rebound.output.verdicts.map(row => [row.targetId, row.focus]));
    const repaired = { ...structuredClone(mapped), verdicts: mapped.verdicts.map(row => {
      const target = options.targets.targets[row.targetSlot], focus = focusByTarget.get(target?.targetId);
      if (!focus) fail('FACTION_REVIEW_BINDING_SELECTION_INVALID');
      return { ...structuredClone(row), focus: structuredClone(focus) };
    }) };
    const materialized = hostResult({ ...options,
      ...(options.narrativeCapacityRecord ? { reviewReasonMaximum: null,
        reviewNarrativeCharacterMaximum: null } : {}) }, repaired, coordinateProof,
      'faction_review_native_slot_materialization_v1');
    const { hash: ignoredReceiptHash, ...receipt } = materialized.receipt;
    return { ...materialized, receipt: seal({ ...receipt,
      version: 'faction_review_explicit_focus_path_materialization_v1',
      strictMaterializationFailure: error.code,
      originalMappedProviderOutputHash: hash(mapped),
      repairedMappedProviderOutputHash: hash(repaired),
      repairedMaterializationReceiptHash: materialized.receipt.hash,
      fieldBindingRecovery: rebound.receipt, modelSelectedPathsReused: true,
      proseUsedToInferAddress: false, originalFocusVerified: false,
      verdictReasonSourceRefsAndCoverageUnchanged: true,
      semanticAcceptanceInherited: false, runtimeAccepted: false, trainingTruth: false }) };
  }
}

// This is an evidence checker, not a journal reader or an egress port. Formal
// callers must obtain these rows from the authenticated actual paid owner.
function paidInvocation(options, capability, attemptId, selectedRef) {
  const maxOutputUnits = 4096;
  const replacement = options.nativeReviewAmbiguousReplacement;
  if (replacement && (verifySeal(replacement).bindingHash
    !== FACTION_NATIVE_REVIEW_AMBIGUOUS_REPLACEMENT_BINDING_V1.hash
    || replacement.replacementAttemptId !== attemptId
    || replacement.replacementCapabilityReceiptHash
      && replacement.replacementCapabilityReceiptHash !== capability.receiptHash
    || replacement.replacementCapability?.receiptHash !== capability.receiptHash))
    fail('FACTION_REVIEW_SLOT_NAMESPACE_REPLACEMENT_DRIFT');
  const providerRequest = { schemaVersion: 'starcraft_tmg_structured_provider_request_v1',
    requestId: attemptId, roleRef: options.capsule.roleRef, instructions: options.capsule.instructions,
    input: options.capsule.compiledInput, outputContractRef: options.capsule.outputContractRef, maxOutputUnits };
  const policy = { maxOutputUnits, attemptEstimateMicros: 800000, attemptTokenReserve: 500000,
    allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false,
    idempotentRetrySupported: false, encryptedRawQuarantineAvailable: false };
  const invocationHash = hash({ schemaVersion: 'starcraft_tmg_structured_generation_runtime_v1.invocation',
    roleRef: options.capsule.roleRef, contextManifestRef: contextManifestRefStarcraftTmgV1(options.capsule),
    outputContractRef: selectedRef, executionPolicyRef: { id: 'policy.faction-target-review.production',
      version: '2026.09.06.1', hash: hash(policy) },
    continuationRef: replacement?.continuationRef || null,
    contextPayloadHash: hash({ instructions: providerRequest.instructions, input: providerRequest.input }),
    capabilityReceiptHash: capability.receiptHash, trainingTruth: false });
  return { providerRequest, invocationHash, maxOutputUnits };
}

export function verifyFactionNativeSlotSchemaFailureV1(options) {
  const { attempt, issue, rejected, ownerRecipe, capability } = options.evidence || {};
  if (!attempt || !issue || !rejected || !ownerRecipe || !capability)
    fail('FACTION_REVIEW_SLOT_NAMESPACE_SCHEMA_FAILURE_EVIDENCE_REQUIRED');
  [issue, rejected, ownerRecipe].forEach(verifySeal);
  assertContext(options, true);
  const receipt = verifySeal(JSON.parse(attempt.response)).value;
  const { receiptHash, ...receiptBody } = receipt;
  assertStarcraftTmgProviderCapabilityReceiptV1(capability);
  const profile = factionExecutionProfileV1({ binding: ownerRecipe.executionModelBinding });
  const validation = validateStarcraftTmgProviderJsonSchemaValueV1(contract.providerSchema, rejected.providerValue);
  const { providerRequest, invocationHash } = paidInvocation(options, capability, attempt.id, contractRef);
  if (attempt.state !== 'failed' || attempt.code !== 'STRUCTURED_PROVIDER_SCHEMA_INVALID'
    || !Number.isSafeInteger(attempt.settled) || attempt.run !== 'faction-v1-' + ownerRecipe.hash.slice(0, 20)
    || !ownerRecipe.inputHashes.includes(options.input.hash) || validation.ok
    || hash(rejected.validation) !== hash(validation) || hash(receipt.schemaIssues) !== hash(validation.issues)
    || receipt.incompleteReason !== null || receipt.usageKnown !== true
    || receipt.physicalAttempts !== 1 || receipt.automaticRetries !== 0
    || hash(verifySeal(JSON.parse(attempt.usage)).value) !== hash(receipt.usage)
    || hash(receiptBody) !== receiptHash || receipt.status !== 200
    || receipt.capabilityReceiptHash !== capability.receiptHash
    || hash(capability.providerProfileRef) !== hash(factionProfileRefV1(profile))
    || hash(capability.outputContractRef) !== hash(contractRef)
    || rejected.safeReceiptHash !== receipt.receiptHash || issue.safeReceiptHash !== receipt.receiptHash
    || issue.rejectedCandidateRef?.hash !== rejected.hash || issue.invocationHash !== invocationHash
    || rejected.invocationHash !== invocationHash || attempt.id !== 'structured-' + invocationHash.slice(0, 48)
    || hash(rejected.roleRef) !== hash(options.capsule.roleRef)
    || hash(rejected.outputContractRef) !== hash(contractRef)
    || hash(receipt.outputContractRef) !== hash(contractRef)
    || rejected.contextManifestRef.hash !== options.capsule.hash
    || attempt.request_hash !== hash(providerRequest))
    fail('FACTION_REVIEW_SLOT_NAMESPACE_SCHEMA_FAILURE_EVIDENCE_DRIFT');
  // The historical failure receipt does not retain reported-model, raw JSON
  // or wire-body identity. Do not invent those proofs. The paid request hash,
  // capability, journal candidate and exact subsequent repair context are
  // authenticated; the successful repair gets the full success-wire verifier.
  return { providerReceiptHash: receipt.receiptHash, originalFailureAccepted: false,
    reportedModelVerified: false, rawWireBodyVerified: false };
}

function verifyPaid(options, native = false) {
  const { candidate, runtimeReceipt, attempt, ownerRecipe, capability } = options.evidence || {};
  if (!candidate || !runtimeReceipt || !attempt || !ownerRecipe || !capability
    || typeof attempt.response !== 'string' || typeof attempt.usage !== 'string')
    fail('FACTION_REVIEW_SLOT_NAMESPACE_PAID_EVIDENCE_REQUIRED');
  [candidate, runtimeReceipt, ownerRecipe].forEach(verifySeal);
  assertContext(options, native);
  const selectedContract = native ? contract : legacyContract;
  const selectedRef = native ? contractRef : legacyRef;
  schemaCheck(selectedContract, options.providerOutput);
  const response = verifySeal(JSON.parse(attempt.response)).value;
  const receipt = response.usageReceipt;
  const { providerRequest, invocationHash, maxOutputUnits } = paidInvocation(options, capability, attempt.id, selectedRef);
  if (attempt.state !== 'received' || attempt.code !== null || !Number.isSafeInteger(attempt.settled)
    || attempt.run !== 'faction-v1-' + ownerRecipe.hash.slice(0, 20)
    || !ownerRecipe.inputHashes.includes(options.input.hash)
    || hash(options.capsule.outputContractRef) !== hash(selectedRef)
    || candidate.contextManifestRef.hash !== options.capsule.hash
    || hash(candidate.roleRef) !== hash(options.capsule.roleRef)
    || hash(candidate.outputContractRef) !== hash(selectedRef)
    || hash(candidate.providerValue) !== hash(options.providerOutput)
    || hash(response.output) !== hash(options.providerOutput)
    || runtimeReceipt.candidateHash !== candidate.hash || runtimeReceipt.status !== 'accepted'
    || candidate.invocationHash !== invocationHash || runtimeReceipt.invocationHash !== invocationHash
    || attempt.id !== 'structured-' + invocationHash.slice(0, 48)
    || runtimeReceipt.attemptId !== attempt.id || attempt.request_hash !== hash(providerRequest)
    || options.nativeReviewAmbiguousReplacement
      && options.nativeReviewAmbiguousReplacement.replacementRequestHash !== hash(providerRequest)
    || candidate.providerReceiptHash !== receipt.receiptHash || runtimeReceipt.providerReceiptHash !== receipt.receiptHash
    || receipt.requestId !== attempt.id || receipt.responseFingerprint !== hash(options.providerOutput)
    || hash(receipt.roleRef) !== hash(candidate.roleRef) || hash(receipt.outputContractRef) !== hash(selectedRef)
    || receipt.physicalAttempts !== 1 || receipt.automaticRetries !== 0
    || hash(verifySeal(JSON.parse(attempt.usage)).value) !== hash(receipt.usage))
    fail('FACTION_REVIEW_SLOT_NAMESPACE_PAID_EVIDENCE_DRIFT');
  const profile = verifyFactionExecutionModelReceiptV1({ receipt, ownerRecipe, capability });
  const egress = factionExecutionEgressV1(profile);
  const requestBody = { model: profile.model, instructions: providerRequest.instructions, input: providerRequest.input,
    reasoning: { effort: 'none' }, temperature: egress.temperature, top_p: egress.topP,
    max_output_tokens: maxOutputUnits, stream: false,
    text: { format: { type: 'json_schema', name: selectedContract.schemaName, schema: selectedContract.providerSchema } } };
  if (hash(requestBody) !== receipt.requestBodyHash) fail('FACTION_REVIEW_SLOT_NAMESPACE_PAID_REQUEST_DRIFT');
  return seal({ ownerRunId: attempt.run, ownerRecipeHash: ownerRecipe.hash, attemptId: attempt.id,
    candidateHash: candidate.hash, runtimeReceiptHash: runtimeReceipt.hash, receiptHash: receipt.receiptHash,
    contextHash: options.capsule.hash, requestHash: attempt.request_hash, requestBodyHash: receipt.requestBodyHash,
    originalUsageHash: hash(receipt.usage), newProviderCalls: 0, trainingTruth: false });
}

export function verifyFactionNativeSlotPaidV1(options) {
  return verifyPaid(options, true);
}

export function recoverFactionExplicitSlotReviewV1(options) {
  const paid = verifyPaid(options);
  const { mapped, mappings } = resolveFactionLegacySlotReferencesV1(options);
  if (!mappings.length) fail('FACTION_REVIEW_SLOT_NAMESPACE_RECOVERY_NOT_NEEDED');
  return hostResult(options, mapped, seal({ version: 'legacy_explicit_targetSlot_recovery_v1',
    paid, mappings, noFuzzyEntityMatching: true, newProviderCalls: 0, semanticAcceptance: false, trainingTruth: false }),
  'faction_review_explicit_slot_recovery_v1');
}

// Pure coordinate proof for tests and diagnostics. It has no paid-origin or
// promotion authority; formal recovery must use the authenticated wrapper.
export function resolveFactionLegacySlotReferencesV1(options) {
  assertContext(options);
  schemaCheck(legacyContract, options.providerOutput);
  // Keep every already-valid historical row exactly as it was. This new path
  // does not reinterpret an old success or infer a slot from an entity name.
  const mappings = [];
  const mapped = { verdicts: structuredClone(options.providerOutput.verdicts),
    coverage: options.providerOutput.coverage.map(row => {
      const sourceRef = options.requiredSourceRefs[row.coverageSlot];
      const oldRow = { sourceRef, verdict: row.verdict, reason: row.reason, recommendationIndices: row.recommendationIndices };
      try {
        const old = resolveFactionReviewCoverageAddressesV4({ coverage: [oldRow],
          targets: options.targets, draft: options.draft, binding: priorAddress });
        return { ...structuredClone(row), recommendationIndices: old.coverage[0].recommendationIndices };
      } catch (error) { if (error.code !== 'FACTION_REVIEW_COVERAGE_EXPLICIT_SLOT_UNRESOLVED') throw error; }
      const declarations = [...row.reason.matchAll(/(?<![A-Za-z0-9_])targetSlot\s+(0|[1-9][0-9]*)(?![A-Za-z0-9_])/gu)];
      const slots = declarations.map(match => Number(match[1]));
      if (row.verdict !== 'covered' || !sourceRef || !row.reason.includes(sourceRef)
        || !slots.length || new Set(slots).size !== slots.length
        || slots.length !== (row.reason.match(/targetSlot/gu) || []).length
        || /target\s+slots?|recommendation\s+(?:index|indices)/iu.test(row.reason)
        || !sameSet(row.recommendationIndices, slots)) invalid();
      const chosen = slots.map(slot => {
        const target = options.targets.targets[slot];
        if (!target || !target.recommendation.sourceRefs.includes(sourceRef)) invalid();
        return target;
      });
      const ids = row.reason.match(/(?<![A-Za-z0-9_-])advice-\d+-[a-f0-9]{12}(?![A-Za-z0-9_-])/gu) || [];
      if (ids.some(id => !chosen.some(target => target.targetId === id))
        || options.draft.recommendations.some((r, index) => row.reason.includes(r.title) && !chosen.some(t => t.index === index))
        || row.recommendationIndices.every(index => options.draft.recommendations[index])
          && row.recommendationIndices.some(index => options.draft.recommendations[index].sourceRefs.includes(sourceRef))) invalid();
      const indices = row.recommendationIndices.map(slot => options.targets.targets[slot].index);
      mappings.push({ coverageSlot: row.coverageSlot, sourceRef, originalRowHash: hash(row),
        reasonHash: hash(row.reason), declarationSpans: declarations.map(match => ({ text: match[0], offset: match.index })),
        targets: chosen.map((target, index) => ({ slot: slots[index], index: target.index,
          targetId: target.targetId, recommendationHash: target.recommendationHash })),
        competingGlobalSourceBinding: false });
      return { ...structuredClone(row), recommendationIndices: indices };
    }) };
  return { mapped, mappings, paidOriginVerified: false, semanticAcceptance: false, trainingTruth: false };
}
