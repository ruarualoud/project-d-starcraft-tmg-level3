import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, fail } from '../skill-production/common.mjs';
import { createStarcraftTmgContextCapsuleV1, contextManifestRefStarcraftTmgV1 } from '../structured-generation/context-capsule-v1.mjs';
import { outputContractRefStarcraftTmgV1, validateStarcraftTmgProviderJsonSchemaValueV1 } from '../structured-generation/output-contract-registry-v1.mjs';
import { createFactionReviewContextCapsuleV1 } from './faction-review-context-capsule-v1.mjs';
import { createFactionReviewTargetsV1 } from './faction-review-targets-v1.mjs';
import { materializeFactionStructuredReviewV1 } from './faction-structured-review-runtime-v1.mjs';
import { FACTION_REVIEW_FRAGMENT_CONTRACTS_V1 as contracts, FACTION_REVIEW_FRAGMENT_CONTRACT_BINDING_V1 as contractBinding } from '../../content/skill-generation/ticket-18-faction-review-fragment-contracts-v1.mjs';

export const FACTION_REVIEW_DECOMPOSITION_BINDING_V1 = seal({ version: 'faction_review_decomposition_v1',
  contracts: contractBinding, applicableOrigin: 'settled_complete_wire_failure_without_saved_payload',
  fullSourceAndDraftInputPerJob: true, oneJudgmentPerJob: true, maximumJobs: 7,
  executionPolicy: { maxOutputUnits: 4096, attemptEstimateMicros: 800000, attemptTokenReserve: 500000,
    allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false, idempotentRetrySupported: false,
    encryptedRawQuarantineAvailable: false },
  originalAttemptsNotReissued: true, failedFragmentNotAutomaticallyResampled: true,
  acceptedFragmentsDurable: true, hostQuotesNotProofOfUnderstanding: true,
  semanticAcceptanceInherited: false, trainingTruth: false });
const binding = FACTION_REVIEW_DECOMPOSITION_BINDING_V1;
const readValue = value => verifySeal(JSON.parse(value)).value;

// This is a read-only import, never a copied/repriced paid attempt. Reconstruct
// both hashes from the actual caller context; a report's passed flag is not proof.
export function readFactionWireReviewFailureV1({ filename, runId, attemptId, capsule, invocation, providerRequest }) {
  verifySeal(capsule);
  if (!/^faction-v1-[a-f0-9]{20}$/u.test(runId || '') || !/^structured-[a-f0-9]{48}$/u.test(attemptId || ''))
    fail('FACTION_WIRE_REVIEW_FAILURE_ID_INVALID');
  const db = new DatabaseSync(filename, { readOnly: true });
  let attempt, issue, wireIssue = null;
  try {
    if (db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n)
      fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
    attempt = db.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(runId, attemptId);
    const row = db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'").get(runId, attemptId + '.issue');
    if (!row || !attempt) fail('FACTION_WIRE_REVIEW_FAILURE_MISSING');
    issue = verifySeal(readValue(row.artifact));
    const wire = db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'")
      .get(runId, attemptId + '.wire-issue-v2');
    if (wire) wireIssue = verifySeal(readValue(wire.artifact));
  } finally { db.close(); }
  const receipt = readValue(attempt.response), usage = readValue(attempt.usage);
  const { receiptHash, ...body } = receipt;
  if (attempt.state !== 'failed' || attempt.code !== 'STRUCTURED_PROVIDER_SCHEMA_INVALID'
    || receipt.code !== attempt.code || receipt.status !== 200 || receipt.incompleteReason !== null
    || !receipt.schemaIssues?.some(i => i.path === '$' && i.code === 'provider_json_not_parseable')
    || hash(body) !== receiptHash || issue.safeReceiptHash !== receiptHash
    || issue.rawPayloadPersisted !== false || issue.rejectedCandidateRef !== null
    || wireIssue && (wireIssue.rawPayloadPersisted !== false || wireIssue.originalProviderReceiptHash !== receiptHash)
    || receipt.usageKnown !== true || receipt.physicalAttempts !== 1 || receipt.automaticRetries !== 0
    || !Number.isSafeInteger(attempt.settled) || attempt.settled < 0 || hash(receipt.usage) !== hash(usage))
    fail('FACTION_WIRE_REVIEW_FAILURE_NOT_APPLICABLE');
  const expectedRequest = { schemaVersion: 'starcraft_tmg_structured_provider_request_v1', requestId: attemptId,
    roleRef: capsule.roleRef, instructions: capsule.instructions, input: capsule.compiledInput,
    outputContractRef: capsule.outputContractRef, maxOutputUnits: providerRequest.maxOutputUnits };
  if (hash(providerRequest) !== attempt.request_hash || hash(expectedRequest) !== attempt.request_hash
    || hash(invocation) !== issue.invocationHash || attemptId !== 'structured-' + hash(invocation).slice(0, 48)
    || invocation.contextManifestRef.hash !== capsule.hash || hash(invocation.roleRef) !== hash(capsule.roleRef)
    || hash(invocation.contextManifestRef) !== hash(contextManifestRefStarcraftTmgV1(capsule))
    || hash(invocation.outputContractRef) !== hash(capsule.outputContractRef)
    || hash(receipt.outputContractRef) !== hash(capsule.outputContractRef)
    || invocation.contextPayloadHash !== hash({ instructions: capsule.instructions, input: capsule.compiledInput })
    || invocation.capabilityReceiptHash !== receipt.capabilityReceiptHash)
    fail('FACTION_WIRE_REVIEW_FAILURE_REQUEST_DRIFT');
  return seal({ version: 'faction_wire_review_failure_evidence_v1', runId, attemptId,
    originalIssue: issue, originalReceipt: receipt, originalReceiptHash: receiptHash,
    originalInvocation: invocation, originalRequestHash: attempt.request_hash, originalContextHash: capsule.hash,
    originalSettledMicros: attempt.settled, originalUsage: usage, originalRawRecovered: false,
    originalAttemptHash: hash(attempt), originalProviderCallsReplayed: 0, semanticAcceptanceInherited: false, trainingTruth: false });
}

export function prepareFactionReviewDecompositionV1({ input, capsule, evidence, originalContract, mapping }) {
  [input, capsule, evidence].forEach(verifySeal);
  if (capsule.hash !== evidence.originalContextHash || evidence.version !== 'faction_wire_review_failure_evidence_v1'
    || evidence.originalRawRecovered !== false || capsule.kind !== 'whole_section_review_context'
    || capsule.outputContractRef.hash !== originalContract.contractHash)
    fail('FACTION_REVIEW_DECOMPOSITION_ORIGIN_DRIFT');
  if (mapping.targets.hash !== createFactionReviewTargetsV1({ input, section: mapping.section,
    draft: mapping.draft, indices: mapping.reviewIndices }).hash
    || hash(mapping.draft) !== capsule.section.parentDraftHash
    || hash(mapping.draft) !== hash(capsule.section.completeCurrentDraft)
    || hash(mapping.section) !== hash(capsule.section.section)) fail('FACTION_REVIEW_DECOMPOSITION_MAPPING_DRIFT');
  const rebuilt = createFactionReviewContextCapsuleV1({ factionInput: input, ...mapping,
    coverageRequiredSourceRefs: mapping.requiredSourceRefs, roleRef: capsule.roleRef,
    outputContractRef: capsule.outputContractRef, route: capsule.localIssue.reviewTask.route,
    includeSharedScenarioSources: capsule.immutableBase.sharedScenarioSourcesIncluded === true });
  if (rebuilt.hash !== capsule.hash) fail('FACTION_REVIEW_DECOMPOSITION_ORIGIN_DRIFT');
  const task = capsule.localIssue.reviewTask;
  const jobs = [...task.targetSlots.map(t => ({ kind: 'target', slot: t.slot, targetId: t.targetId,
    recommendationHash: t.recommendationHash })), ...task.coverageSourceSlots.map(c => ({ kind: 'coverage', slot: c.slot, sourceRef: c.ref }))]
    .map(j => ({ ...j, id: j.kind + '.' + j.slot, outputContractRef: outputContractRefStarcraftTmgV1(contracts[j.kind]) }));
  if (!task.targetSlots.length || task.targetSlots.length > 2 || jobs.length > binding.maximumJobs)
    fail('FACTION_REVIEW_DECOMPOSITION_TASK_BOUND_INVALID');
  return seal({ version: binding.version + '.plan', bindingHash: binding.hash, inputHash: input.hash,
    originalContextHash: capsule.hash, mappingHash: hash(mapping), originalOutputContractRef: capsule.outputContractRef,
    origin: { runId: evidence.runId, attemptId: evidence.attemptId, evidenceHash: evidence.hash,
      originalIssueHash: evidence.originalIssue.hash, originalReceiptHash: evidence.originalReceiptHash,
      originalRequestHash: evidence.originalRequestHash, originalSettledMicros: evidence.originalSettledMicros },
    jobs, maximumNewProviderCalls: jobs.length, originalProviderCallsReplayed: 0, originalRawRecovered: false,
    semanticAcceptanceInherited: false, trainingTruth: false });
}

export function createFactionReviewFragmentCapsuleV1(args) {
  const { capsule, plan, jobId, mapping } = args;
  verifySeal(plan);
  if (plan.hash !== prepareFactionReviewDecompositionV1(args).hash) fail('FACTION_REVIEW_DECOMPOSITION_PLAN_DRIFT');
  const job = plan.jobs.find(j => j.id === jobId);
  if (!job) fail('FACTION_REVIEW_FRAGMENT_JOB_INVALID');
  const id = 'faction-review-fragment.' + plan.hash.slice(0, 32) + '.' + job.id;
  const roleRef = { id, version: 'v1', hash: hash({ id, planHash: plan.hash, job }) };
  const contract = contracts[job.kind];
  const fragmentTask = { planHash: plan.hash, job, originalFailure: plan.origin,
    outputScope: 'only_this_one_judgment_full_input_still_authoritative',
    ...(job.kind === 'target' ? { target: mapping.targets.targets[job.slot] }
      : { sourceRef: job.sourceRef, recommendationCatalogue: mapping.draft.recommendations.map((r, slot) => ({
        slot, globalIndex: slot, targetId: 'advice-' + slot + '-' + hash(r).slice(0, 12),
        recommendationHash: hash(r), title: r.title, citesCoverageSource: r.sourceRefs.includes(job.sourceRef) })) }),
    outputRules: job.kind === 'target'
      ? 'Return one judgment for target and all its fields, selecting exact focusPaths from target.fields. Do not author IDs or quotes. Use supplied included sourceSlots. No coverage output.'
      : 'Return coverage for sourceRef only. recommendationSlots address ONLY recommendationCatalogue, never local target slots. Covered must identify actual citing recommendations. Omitted/uncertain must remain visible. No target verdict output.',
  };
  return { job, contract, roleRef, capsule: createStarcraftTmgContextCapsuleV1({
    kind: capsule.kind, roleRef, outputContractRef: job.outputContractRef,
    immutableBase: capsule.immutableBase, section: capsule.section,
    localIssue: { ...capsule.localIssue, fragmentTask },
    protectedFields: [...capsule.protectedFields, { path: 'fragmentPlan', hash: plan.hash }],
    dependencyGraph: capsule.dependencyGraph, sourceIndexRef: capsule.sourceIndexRef,
    expansionToolRef: capsule.expansionToolRef, omittedDomains: capsule.omittedDomains,
    instructions: [
      'Act as the ' + capsule.localIssue.reviewTask.route + ' independent faction source reviewer.',
      'The original full review failed JSON serialization and its raw text is unavailable. This is an explicitly decomposed NEW review, not reconstruction of that text or permission to waive any finding.',
      'The complete original rules, products, whole draft and reviewTask are retained. Review all relevant fields and general-rule dependencies, including timing, costs, exceptions, arithmetic and conditional strategy.',
      'reviewTask describes the parent scope. For THIS output, obey only fragmentTask and its declared output contract. Never emit parent verdict/coverage arrays, IDs, titles, quotes or status flags.',
      'Do not copy long quotations into reason. Explain decisive evidence and uncertainty accurately; keep supported, unsupported and uncertain distinctions. Host binding is not proof of understanding.',
      fragmentTask.outputRules,
      'No semantic acceptance, rule mutation, publication, runtime acceptance or training truth follows from this response.',
    ].join('\n'),
  }) };
}

export function assembleFactionReviewFragmentsV1(args) {
  const { plan, parts, capsule, input, mapping } = args;
  if (plan.hash !== prepareFactionReviewDecompositionV1(args).hash) fail('FACTION_REVIEW_DECOMPOSITION_PLAN_DRIFT');
  if (!Array.isArray(parts) || parts.length !== plan.jobs.length || new Set(parts.map(p => p.jobId)).size !== parts.length)
    fail('FACTION_REVIEW_FRAGMENT_DENOMINATOR');
  const byId = new Map(parts.map(p => [p.jobId, verifySeal(p)])), providerOutput = { verdicts: [], coverage: [] }, refs = [];
  for (const job of plan.jobs) {
    const part = byId.get(job.id), prepared = createFactionReviewFragmentCapsuleV1({ ...args, jobId: job.id });
    if (!part || part.planHash !== plan.hash || part.contextHash !== prepared.capsule.hash
      || part.outputContractHash !== prepared.contract.contractHash || part.semanticAcceptance !== false || part.trainingTruth !== false)
      fail('FACTION_REVIEW_FRAGMENT_BINDING_INVALID');
    if (!validateStarcraftTmgProviderJsonSchemaValueV1(prepared.contract.providerSchema, part.value).ok) fail('FACTION_REVIEW_FRAGMENT_SCHEMA_INVALID');
    if (job.kind === 'target') {
      const { focusPaths, ...judgment } = part.value;
      const target = mapping.targets.targets[job.slot];
      const focus = focusPaths.map(path => {
        const field = target.fields.find(f => f.path === path);
        if (!field || !field.text) fail('FACTION_REVIEW_FRAGMENT_FOCUS_INVALID');
        return { path, quote: field.text.slice(0, 240) };
      });
      providerOutput.verdicts.push({ targetSlot: job.slot, focus, ...judgment });
    } else {
      const { recommendationSlots, ...judgment } = part.value;
      if (recommendationSlots.some(slot => !mapping.draft.recommendations[slot])) fail('FACTION_REVIEW_FRAGMENT_COVERAGE_SLOT_INVALID');
      providerOutput.coverage.push({ coverageSlot: job.slot, recommendationIndices: recommendationSlots, ...judgment });
    }
    refs.push({ jobId: job.id, hash: part.hash });
  }
  const materialized = materializeFactionStructuredReviewV1({ providerOutput, capsule, input, ...mapping,
    reviewReasonMaximum: 16384, reviewSourceMaximum: 128 });
  return seal({ version: binding.version + '.assembly', planHash: plan.hash, partRefs: refs,
    output: materialized.output, hostMaterializationReceipt: materialized.receipt,
    quoteOrigin: 'host_exact_prefix_of_model_selected_candidate_field',
    hostBindingNotUnderstandingProof: true, everyTargetAndRequiredSourcePresent: true,
    modelJudgmentsAndReasonsPreserved: true, originalRawRecovered: false,
    semanticAcceptanceInherited: false, trainingTruth: false });
}
