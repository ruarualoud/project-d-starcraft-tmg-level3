import { fail, hash, seal, verifySeal, sha256 } from '../skill-production/common.mjs';
import { FACTION_NATIVE_PRODUCTION_CONTRACTS_V1 as contracts } from '../../content/skill-generation/ticket-18-faction-native-production-contracts-v1.mjs';
import { validateStarcraftTmgProviderJsonSchemaValueV1 as validate } from '../structured-generation/output-contract-registry-v1.mjs';

export const FACTION_NATIVE_REFERENCE_SET_RECOVERY_BINDING_V1 = seal({
  version: 'faction_native_reference_set_recovery_v1', scope: 'schema_declared_unique_sourceRefs_only',
  operation: 'retain_first_occurrence_of_exact_equal_existing_source_ids',
  allDistinctReferencesPreserved: true, proseAndJudgmentsChanged: false,
  unknownReferencesRejected: true, originalProviderFailureUnchanged: true,
  semanticAcceptanceInherited: false, trainingTruth: false });

export function normalizeFactionNativeReferenceSetsV1({ value, contract, input }) {
  verifySeal(input);
  const before = validate(contract.providerSchema, value);
  const allowed = before.issues.length > 0 && before.issues.every(i => i.path.endsWith('.sourceRefs')
    && ['array_items_not_unique', 'array_too_long'].includes(i.code));
  if (!allowed) fail('FACTION_NATIVE_REFERENCE_SET_NOT_APPLICABLE');
  const known = new Set(input.frozenSources.prompt.sources.map(s => s.ref)), repairs = [];
  const output = structuredClone(value);
  function walk(node, schema, path) {
    if (schema.type === 'array') { node.forEach((v, i) => walk(v, schema.items, path + '[' + i + ']')); return; }
    if (schema.type !== 'object') return;
    for (const [key, child] of Object.entries(schema.properties)) {
      if (!Object.hasOwn(node, key)) continue;
      if (key === 'sourceRefs' && child.type === 'array' && child.uniqueItems === true && child.items.type === 'string') {
        const original = node[key];
        if (!Array.isArray(original) || original.some(ref => !known.has(ref))) fail('FACTION_NATIVE_REFERENCE_SET_UNKNOWN_SOURCE');
        const unique = [...new Set(original)];
        if (unique.length !== original.length) {
          node[key] = unique;
          repairs.push({ path: path + '.sourceRefs', original, normalized: unique,
            removedIndices: original.flatMap((ref, i) => original.indexOf(ref) === i ? [] : [i]),
            uniqueSetHash: hash([...unique].sort()), proseChanged: false });
        }
      } else walk(node[key], child, path + '.' + key);
    }
  }
  walk(output, contract.providerSchema, '$');
  if (!repairs.length || !validate(contract.providerSchema, output).ok) fail('FACTION_NATIVE_REFERENCE_SET_UNRESOLVED');
  return seal({ version: 'faction_native_reference_set_normalization_v1',
    bindingHash: FACTION_NATIVE_REFERENCE_SET_RECOVERY_BINDING_V1.hash,
    inputHash: input.hash, originalOutputHash: hash(value), output, repairs,
    allDistinctReferencesPreserved: true, proseAndJudgmentsChanged: false,
    semanticAcceptanceInherited: false, trainingTruth: false });
}

export function materializeFactionNativeReferenceSetV1({ input, prepared, evidence }) {
  const { attempt, issue, rejected } = evidence;
  [input, issue, rejected].forEach(verifySeal);
  const receipt = verifySeal(JSON.parse(attempt.response)).value, usage = verifySeal(JSON.parse(attempt.usage)).value;
  const { receiptHash, ...body } = receipt;
  const contract = contracts[prepared.kind];
  if (!contract) fail('FACTION_NATIVE_REFERENCE_SET_KIND_INVALID');
  const original = validate(contract.providerSchema, rejected.providerValue);
  if (attempt.state !== 'failed' || attempt.code !== 'STRUCTURED_PROVIDER_SCHEMA_INVALID'
    || !Number.isSafeInteger(attempt.settled) || hash(body) !== receiptHash
    || receipt.status !== 200 || receipt.incompleteReason !== null || !receipt.usageKnown
    || receipt.physicalAttempts !== 1 || receipt.automaticRetries !== 0 || hash(receipt.usage) !== hash(usage)
    || hash(receipt.schemaIssues) !== hash(original.issues) || hash(rejected.validation) !== hash(original)
    || issue.safeReceiptHash !== receiptHash || rejected.safeReceiptHash !== receiptHash
    || issue.rejectedCandidateRef?.hash !== rejected.hash || issue.invocationHash !== rejected.invocationHash
    || attempt.id !== 'structured-' + rejected.invocationHash.slice(0, 48)
    || hash(receipt.outputContractRef) !== hash(prepared.outputContractRef)
    || hash(rejected.outputContractRef) !== hash(prepared.outputContractRef)
    || hash(rejected.roleRef) !== hash(prepared.roleRef)
    || hash(rejected.contextManifestRef) !== hash(prepared.contextManifestRef)) fail('FACTION_NATIVE_REFERENCE_SET_EVIDENCE_INVALID');
  const normalized = normalizeFactionNativeReferenceSetsV1({ value: rejected.providerValue, contract, input });
  return seal({ version: 'faction_native_reference_set_materialization_v1',
    bindingHash: FACTION_NATIVE_REFERENCE_SET_RECOVERY_BINDING_V1.hash,
    inputHash: input.hash, fullRoleId: prepared.fullRoleId, roleInputHash: hash(prepared.roleInput), nativeKind: prepared.kind,
    originRunId: attempt.run, originAttemptId: attempt.id, originalRequestHash: attempt.request_hash,
    originalIssueHash: issue.hash, rejectedCandidateHash: rejected.hash, originalFailureReceiptHash: receiptHash,
    normalized, output: normalized.output, originalUsage: usage, originalSettledMicros: attempt.settled,
    providerCalls: 0, semanticAcceptanceInherited: false, trainingTruth: false });
}

export async function recoverFactionNativeReferenceSetV1({ input, prepared, evidence, dsh }) {
  const materialization = materializeFactionNativeReferenceSetV1({ input, prepared, evidence });
  const command = { action: 'finish', content: materialization.output };
  const loop = await dsh.run({ task: 'Import complete native output after exact set-reference deduplication',
    callModel: async () => ({ command, receiptHash: materialization.hash,
      usage: { inputUnits: 0, outputUnits: 0, totalUnits: 0, inputCacheHitUnits: 0, inputCacheMissUnits: 0, reasoningOutputUnits: 0 } }),
    toolPort: { execute: () => fail('FACTION_NATIVE_REFERENCE_SET_TOOLS_FORBIDDEN'), trace: () => [], readRefs: () => [] },
    limits: { maxCalls: 1, maxTools: 0, maxOutput: 8192, maxWallMs: 180000 } });
  const value = seal({ roleId: prepared.fullRoleId, protocol: FACTION_NATIVE_REFERENCE_SET_RECOVERY_BINDING_V1.version,
    nativeKind: prepared.kind, output: materialization.output, outputContractRef: prepared.outputContractRef,
    sourceDelivery: 'complete_frozen_sources_and_faction_workspace', sourceContextHash: input.frozenSources.hash,
    contextManifestRef: prepared.contextManifestRef, hostMaterialization: materialization,
    loop, structuredDecodePassed: true, semanticAcceptance: false, originalProviderSchemaPassed: false,
    providerCalls: 0, toolTrace: [], toolReadRefs: [], trainingTruth: false });
  verifyFactionNativeReferenceSetRoleV1({ value, input, prepared, evidence, dshBindingHash: dsh.binding.hash });
  return value;
}

export function verifyFactionNativeReferenceSetRoleV1({ value, input, prepared, evidence, dshBindingHash }) {
  verifySeal(value); verifySeal(value.loop);
  const materialization = materializeFactionNativeReferenceSetV1({ input, prepared, evidence });
  const loop = value.loop, command = { action: 'finish', content: materialization.output };
  if (value.protocol !== FACTION_NATIVE_REFERENCE_SET_RECOVERY_BINDING_V1.version
    || value.hostMaterialization?.hash !== materialization.hash || hash(value.output) !== hash(materialization.output)
    || value.roleId !== prepared.fullRoleId || value.nativeKind !== prepared.kind || value.providerCalls !== 0
    || value.semanticAcceptance !== false || value.originalProviderSchemaPassed !== false
    || loop.runtimeBinding?.hash !== dshBindingHash || !loop.sandboxReceipt || loop.calls !== 1
    || loop.directNetworkUsed !== false || loop.trainingTruth !== false || loop.transcript.length !== 1
    || loop.toolTrace.length || loop.transcript[0].receiptHash !== materialization.hash
    || loop.transcript[0].commandHash !== sha256(JSON.stringify(command))
    || hash(loop.final) !== hash(materialization.output)) fail('FACTION_NATIVE_REFERENCE_SET_CONSUMER_DRIFT');
  return { providerReceiptHashes: [materialization.originalFailureReceiptHash], importedCanaryHash: null };
}
