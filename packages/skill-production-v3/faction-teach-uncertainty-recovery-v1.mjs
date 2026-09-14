import { fail, hash, seal, verifySeal, sha256 } from '../skill-production/common.mjs';
import { validateTutorLessonV3 } from './runtime.mjs';
import { FACTION_TEACH_OUTPUT_CONTRACT_V1 as contract, FACTION_TEACH_OUTPUT_CONTRACT_REF_V1 as outputContractRef } from '../../content/skill-generation/ticket-18-faction-teach-output-contract-v1.mjs';
import { validateStarcraftTmgProviderJsonSchemaValueV1 } from '../structured-generation/output-contract-registry-v1.mjs';
import { prepareFactionStructuredTeachV1 } from './faction-structured-teach-runtime-v1.mjs';

export const TEACH_UNCERTAINTY_UNKNOWN_MARKER_V1 = '[Host 标记，不是模型结论] 模型未报告本批不确定事项；这不表示没有不确定性。全部教学笔记仍是未验证内容，后续 Challenger、Judge 与独立来源审查必须重新检查条件、例外、冲突与策略效果。';
export const FACTION_TEACH_UNCERTAINTY_RECOVERY_BINDING_V1 = seal({ version: 'faction_teach_uncertainty_recovery_v1',
  outputContractRef, onlyMissingField: 'uncertainties', markerHash: hash(TEACH_UNCERTAINTY_UNKNOWN_MARKER_V1),
  originalLessonPreserved: true, unknownIsNotEmptyOrVerified: true,
  hostAuthorshipExplicit: true, fullContextPreserved: true, newProviderCalls: 0,
  semanticAcceptanceInherited: false, trainingTruth: false });

export function materializeMissingTeachUncertaintyV1({ attempt, issue, rejected, prepared, input }) {
  [issue, rejected, input].forEach(verifySeal);
  const receipt = verifySeal(JSON.parse(attempt.response)).value;
  const usage = verifySeal(JSON.parse(attempt.usage)).value;
  const { receiptHash, ...body } = receipt;
  const expectedIssues = [{ path: '$.uncertainties', code: 'required_field_missing', required: true }];
  const validation = validateStarcraftTmgProviderJsonSchemaValueV1(contract.providerSchema, rejected.providerValue);
  if (attempt.state !== 'failed' || attempt.code !== 'STRUCTURED_PROVIDER_SCHEMA_INVALID'
    || !Number.isSafeInteger(attempt.settled) || hash(body) !== receiptHash
    || receipt.status !== 200 || receipt.incompleteReason !== null || !receipt.usageKnown
    || receipt.physicalAttempts !== 1 || receipt.automaticRetries !== 0
    || hash(receipt.usage) !== hash(usage) || hash(receipt.schemaIssues) !== hash(expectedIssues)
    || hash(validation.issues) !== hash(expectedIssues) || hash(validation) !== hash(rejected.validation)
    || hash(receipt.outputContractRef) !== hash(outputContractRef)
    || hash(rejected.outputContractRef) !== hash(outputContractRef)
    || issue.safeReceiptHash !== receiptHash || rejected.safeReceiptHash !== receiptHash
    || issue.rejectedCandidateRef?.hash !== rejected.hash
    || issue.invocationHash !== rejected.invocationHash
    || attempt.id !== 'structured-' + rejected.invocationHash.slice(0, 48)
    || hash(rejected.roleRef) !== hash(prepared.roleRef)
    || hash(rejected.contextManifestRef) !== hash(prepared.contextManifestRef)
    || prepared.sourceContextHash !== input.frozenSources.hash
    || !prepared.fullRoleId.startsWith('faction.' + input.factionRecordKey.split(':')[1] + '.tutor.capacity-part-v1.'))
    fail('FACTION_TEACH_UNCERTAINTY_RECOVERY_EVIDENCE_INVALID');
  const output = validateTutorLessonV3({ lesson: structuredClone(rejected.providerValue.lesson),
    uncertainties: [TEACH_UNCERTAINTY_UNKNOWN_MARKER_V1] });
  return seal({ version: 'faction_teach_uncertainty_materialization_v1',
    bindingHash: FACTION_TEACH_UNCERTAINTY_RECOVERY_BINDING_V1.hash,
    inputHash: input.hash, fullRoleId: prepared.fullRoleId, roleInputHash: hash(prepared.roleInput),
    originRunId: attempt.run, originAttemptId: attempt.id, originalRequestHash: attempt.request_hash,
    originalIssueHash: issue.hash, rejectedCandidateHash: rejected.hash, originalFailureReceiptHash: receiptHash,
    originalLessonHash: hash(rejected.providerValue.lesson), output,
    fieldProvenance: { lesson: 'original_model_output_unchanged', uncertainties: 'host_unknown_marker_not_model_analysis' },
    providerCalls: 0, originalUsage: usage, originalSettledMicros: attempt.settled,
    independentUncertaintyAssessmentCompleted: false, semanticAcceptanceInherited: false, trainingTruth: false });
}

export async function runTeachUncertaintyImportV1({ materialization, prepared, dsh }) {
  verifySeal(materialization);
  if (materialization.roleInputHash !== hash(prepared.roleInput)
    || materialization.fullRoleId !== prepared.fullRoleId
    || materialization.bindingHash !== FACTION_TEACH_UNCERTAINTY_RECOVERY_BINDING_V1.hash)
    fail('FACTION_TEACH_UNCERTAINTY_IMPORT_DRIFT');
  const command = { action: 'finish', content: materialization.output };
  const loop = await dsh.run({ task: 'Import unchanged Teach notes with explicit Host uncertainty-unknown marker',
    callModel: async () => ({ command, receiptHash: materialization.hash,
      usage: { inputUnits: 0, outputUnits: 0, totalUnits: 0, inputCacheHitUnits: 0, inputCacheMissUnits: 0, reasoningOutputUnits: 0 } }),
    toolPort: { execute: () => fail('FACTION_TEACH_UNCERTAINTY_TOOLS_FORBIDDEN'), trace: () => [], readRefs: () => [] },
    limits: { maxCalls: 1, maxTools: 0, maxOutput: 4096, maxWallMs: 180000 } });
  verifySeal(loop);
  if (loop.calls !== 1 || loop.toolTrace.length || loop.transcript.length !== 1
    || loop.transcript[0].receiptHash !== materialization.hash
    || loop.transcript[0].commandHash !== sha256(JSON.stringify(command))
    || hash(loop.final) !== hash(materialization.output) || loop.directNetworkUsed !== false)
    fail('FACTION_TEACH_UNCERTAINTY_DSH_DRIFT');
  return seal({ roleId: prepared.fullRoleId, protocol: FACTION_TEACH_UNCERTAINTY_RECOVERY_BINDING_V1.version,
    output: materialization.output, outputContractRef, contextManifestRef: prepared.contextManifestRef,
    sourceContextHash: prepared.sourceContextHash, sourceDelivery: 'complete_frozen_sources_and_faction_workspace',
    hostMaterialization: materialization, loop, structuredDecodePassed: true,
    semanticAcceptance: false, independentUncertaintyAssessmentCompleted: false,
    providerCalls: 0, toolTrace: [], toolReadRefs: [], trainingTruth: false });
}

// Caller resolves exact settled evidence from the coordinator's journal.
// Old successes delegate unchanged. No raw lesson is generated a second time.
export function withFactionTeachUncertaintyRecoveryV1({ input, runtime, store, dsh, executionPolicy,
  importedEvidence = [], readCurrentFailure = null, dry = false, onProgress = () => {} }) {
  const imports = new Map(importedEvidence.map(e => [e.rejected.roleRef.id, e]));
  return Object.freeze({ async role(request) {
    if (!/^tutor\.capacity-part-v1\.[a-z_]+$/u.test(request.roleId || '')) return runtime.role(request);
    const prepared = prepareFactionStructuredTeachV1({ input, request, executionPolicy });
    // In read-only consumer replay, the original role-input contract is rebuilt
    // and the replay store itself authenticates the recovery's paid lineage.
    if (dry) return runtime.role(request);
    let evidence = imports.get(prepared.fullRoleId);
    if (!evidence) {
      try { return await runtime.role(request); }
      catch (error) {
        if (error?.code !== 'STRUCTURED_PROVIDER_SCHEMA_INVALID' || !readCurrentFailure) throw error;
        evidence = readCurrentFailure({ prepared, failureReceiptHash: error.safeReceipt?.receiptHash });
        if (!evidence) throw error;
      }
    }
    const materialization = materializeMissingTeachUncertaintyV1({ ...evidence, input, prepared });
    const lease = store.acquire(prepared.fullRoleId, prepared.roleInput);
    if (lease.cached) {
      verifySeal(lease.artifact);
      if (lease.artifact.hostMaterialization?.hash !== materialization.hash) fail('FACTION_TEACH_UNCERTAINTY_CACHED_DRIFT');
      return lease.artifact;
    }
    try {
      const imported = await runTeachUncertaintyImportV1({ materialization, prepared, dsh });
      const result = store.finish(lease, imported);
      onProgress({ stage: 'teach_uncertainty_host_unknown_recovered', role: request.roleId,
        lessonCount: result.output.lesson.length, providerCalls: 0, uncertaintyAnalysisCompleted: false });
      return result;
    } catch (error) { store.release(lease); throw error; }
  } });
}

export function verifyTeachUncertaintyImportedRoleV1({ value, prepared, evidence, input, dshBindingHash }) {
  verifySeal(value);
  const materialization = materializeMissingTeachUncertaintyV1({ ...evidence, prepared, input });
  if (value.protocol !== FACTION_TEACH_UNCERTAINTY_RECOVERY_BINDING_V1.version
    || value.hostMaterialization?.hash !== materialization.hash
    || hash(value.output) !== hash(materialization.output)
    || value.roleId !== prepared.fullRoleId || value.providerCalls !== 0
    || value.semanticAcceptance !== false || value.independentUncertaintyAssessmentCompleted !== false)
    fail('FACTION_TEACH_UNCERTAINTY_CONSUMER_DRIFT');
  verifySeal(value.loop);
  const command = { action: 'finish', content: materialization.output }, loop = value.loop;
  if (loop.runtimeBinding?.hash !== dshBindingHash || !loop.sandboxReceipt || loop.calls !== 1
    || loop.directNetworkUsed !== false || loop.trainingTruth !== false || loop.transcript.length !== 1
    || loop.transcript[0].receiptHash !== materialization.hash
    || loop.transcript[0].commandHash !== sha256(JSON.stringify(command))
    || hash(loop.final) !== hash(materialization.output)) fail('FACTION_TEACH_UNCERTAINTY_DSH_DRIFT');
  return { providerReceiptHashes: [materialization.originalFailureReceiptHash], importedCanaryHash: null };
}
