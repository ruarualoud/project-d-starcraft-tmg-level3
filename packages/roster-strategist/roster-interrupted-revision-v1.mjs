// Offline continuation of complete public edits from an interrupted response.
// A prefix is candidate data, never an accepted Plan or a model receipt.
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { pruneRosterUndeclaredPublicFieldsV1 as prune } from './public-output-pruning-v1.mjs';
import { validateStarcraftTmgProviderJsonSchemaValueV1 as validate } from '../structured-generation/output-contract-registry-v1.mjs';

const VERSION = 'roster_interrupted_revision_continuation_v1';
function requireCondition(ok, detail) {
  if (!ok) throw Error('ROSTER_INTERRUPTED_REVISION_INVALID:' + detail);
}
function node(nodeType, authority, content) {
  const body = { nodeType, authority, content };
  return { ...body, nodeHash: hash(body) };
}

export function createInterruptedRosterRevisionV1({ sourceRequest, prefix, sourcePlanHash }) {
  const schema = sourceRequest.responseFormat?.schema;
  const paths = schema?.properties?.repairs?.items?.properties?.claimPath?.enum;
  requireCondition(Array.isArray(paths) && sourceRequest.roundKind === 'revision', 'repair_contract');
  requireCondition(prefix.sourceContextHash === sourceRequest.contextHash
    && prefix.sourcePlanHash === sourcePlanHash && prefix.fullParseable === false
    && prefix.sourceOutcome === 'cancelled_incomplete_not_accepted'
    && prefix.trainingTruth === false, 'source_identity');
  const retained = prune({ output: { repairs: prefix.items }, schema });
  const byPath = new Map();
  for (const item of retained.output.repairs) {
    requireCondition(validate(schema.properties.repairs.items, item).ok
      && !byPath.has(item.claimPath), 'retained_item');
    byPath.set(item.claimPath, item);
  }
  const missingPaths = paths.filter(path => !byPath.has(path));
  requireCondition(byPath.size > 0 && missingPaths.length > 0, 'incomplete_prefix_required');
  const prefixHash = hash(prefix);
  return {
    metadata: { version: VERSION, sourceContextHash: sourceRequest.contextHash,
      sourcePlanHash, prefixHash, retainedPaths: [...byPath.keys()], missingPaths,
      priorChargeStatus: prefix.chargeStatus, prefixPruning: retained.receipt },
    prepare(request) {
      // Saved evidence lookups may add nodes/change lookup count. Every original
      // strategic/factual node must still be present and unchanged.
      for (const original of sourceRequest.promptNodes.filter(n => n.nodeType !== 'response-schema')) {
        requireCondition(hash(request.promptNodes.find(n => n.nodeType === original.nodeType)?.content ?? null)
          === hash(original.content), 'source_node_changed:' + original.nodeType);
      }
      requireCondition(hash(request.responseFormat.schema.properties.repairs.items)
        === hash(schema.properties.repairs.items), 'item_contract_changed');
      const instruction = 'Continue the interrupted public revision, not an 18-item rewrite. '
        + 'The complete original Plan, facts and shared Teach context remain below, together with all retained candidate edits. '
        + 'Return a complete replacement for each missing path. Also return a retained path ONLY if you need to amend it for coherent strategy or factual correctness. '
        + 'Do not repeat unchanged retained edits. The host merges these edits and validates ALL originally requested paths together. '
        + 'Retained text is unreviewed model output, not Rules truth; correct it when evidence requires. '
        + 'All original roster, schedule and scoring constraints still apply. Use the existing evidenceRequests dialogue if a saved fact is needed. '
        + 'Return the declared JSON fields only; final evidenceRequests must be empty when that field is present. '
        + 'Explain public decisions, not private reasoning.';
      const promptNodes = request.promptNodes.map(n => n.nodeType !== 'response-schema' ? n : node(n.nodeType, n.authority, {
        ...n.content, requestedClaimPaths: missingPaths, originalRequestedClaimPaths: paths,
        optionalCoherenceAmendmentPaths: [...byPath.keys()], continuationOverridesFullRewrite: true,
        fullReplacementForEachRequestedPath: true, fullPlanValidatedAfterMerge: true,
      }));
      promptNodes.push(node('interrupted-public-revision', 'unreviewed_model_candidate_not_rule_truth', {
        version: VERSION, sourcePlanHash, sourceContextHash: sourceRequest.contextHash,
        prefixHash, missingPaths, retainedRepairs: [...byPath.values()],
        originalRevisionInstruction: request.userMessage, instruction,
      }));
      const body = { ...request, promptNodes, userMessage: instruction };
      return { ...body, contextHash: hash({ version: VERSION, logicalContextHash: request.contextHash,
        prefixHash, promptNodes, userMessage: instruction, responseFormat: request.responseFormat }) };
    },
    merge({ request, physicalRequest, response }) {
      const normalized = prune({ output: response.output, schema: physicalRequest.responseFormat.schema });
      requireCondition(validate(physicalRequest.responseFormat.schema, normalized.output).ok, 'physical_schema');
      // Queries are not completed replacements. They use the original reader
      // and its existing three-batch budget; no partial Plan is applied.
      if (normalized.output.evidenceRequests?.length) return { ...response, output: normalized.output };
      const merged = new Map(byPath), returned = new Set();
      for (const item of normalized.output.repairs) {
        requireCondition(paths.includes(item.claimPath) && !returned.has(item.claimPath), 'duplicate_or_unknown_path');
        returned.add(item.claimPath); merged.set(item.claimPath, item);
      }
      requireCondition(missingPaths.every(path => returned.has(path)), 'missing_completion');
      const output = { ...normalized.output, repairs: paths.map(path => merged.get(path)) };
      requireCondition(output.repairs.every(Boolean) && validate(request.responseFormat.schema, output).ok, 'full_contract');
      const receipt = { providerKind: 'host_assembled_kimi_public_continuation', modelVersion: 'k3',
        contextHash: request.contextHash, outputHash: hash(output), roundKind: request.roundKind,
        outputContractRef: request.responseFormat.outputContractRef, modelReceipt: response.receipt,
        physicalContextHash: physicalRequest.contextHash, sourceContextHash: sourceRequest.contextHash,
        sourcePlanHash, prefixHash, prefixPruning: retained.receipt, completionPruning: normalized.receipt,
        retainedUnchangedPaths: paths.filter(path => byPath.has(path) && !returned.has(path)),
        newlyCompletedPaths: missingPaths,
        amendedRetainedPaths: [...returned].filter(path => byPath.has(path)),
        usage: response.receipt?.usage ?? null, priorInterruptedChargeStatus: prefix.chargeStatus,
        assemblyIsNotSingleModelReply: true, pendingIndependentReview: true, trainingTruth: false };
      return { output, receipt: { ...receipt, receiptHash: hash(receipt) } };
    },
  };
}
