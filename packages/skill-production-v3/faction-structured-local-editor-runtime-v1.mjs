import { hash, seal, verifySeal, fail } from "../skill-production/common.mjs";
import { createFactionLocalEditorContextCapsuleV1,
  isolateFactionLocalEditorIssueV1 } from
  "./faction-local-editor-context-capsule-v1.mjs";
import { createStarcraftTmgContextCapsuleRegistryV1,
  contextManifestRefStarcraftTmgV1 } from
  "../structured-generation/context-capsule-v1.mjs";
import { createStarcraftTmgStructuredDshModelBridgeV1 } from
  "../structured-generation/dsh-command-mapper-v1.mjs";
import { classifyStarcraftTmgStructuredFailureV1 } from
  "../structured-generation/failure-classifier-v1.mjs";
import { assertStarcraftTmgProviderCapabilityReceiptV1 } from
  "../structured-generation/provider-capability-receipt-v1.mjs";
import { createStarcraftTmgOutputContractRegistryV1,
  outputContractRefStarcraftTmgV1 } from
  "../structured-generation/output-contract-registry-v1.mjs";
import { createStructuredRuntimeWithWireRecoveryV2 } from
  "../structured-generation/structured-runtime-selection-v2.mjs";
import { validateFactionEditorDraftEnvelopeBindingV2, recoverFactionEditorDraftEnvelopeV2 } from './faction-editor-draft-envelope-v2.mjs';

export const STARCRAFT_TMG_FACTION_STRUCTURED_LOCAL_EDITOR_RUNTIME_VERSION =
  "starcraft_tmg_faction_structured_local_editor_runtime_v1";

const SOURCE_EPOCH = /\.source-evidence-v1\.[a-f0-9]{20}$/u;

function canonicalRoleId(value) {
  return String(value || "").replace(SOURCE_EPOCH, "");
}

export function deriveFactionLegacyPromptRoleIdsV1(steps = [], promptLineage = null) {
  if (!Array.isArray(steps)) throw new TypeError("Continuation steps are invalid");
  if (promptLineage) verifySeal(promptLineage);
  const origins = new Map((promptLineage?.rows || []).map(row => [row.roleId, row]));
  const roles = steps.filter(row => {
    if (!promptLineage) return true; // Preserve frozen callers without lineage.
    // Continuations also carry separately verified fragments/assemblies. Use
    // the same role-record boundary as the lineage resolver; an auxiliary
    // checkpoint cannot acquire or require a prompt identity.
    if (row?.artifact?.roleId === undefined && !origins.has(row?.id)) return false;
    // A known role must not evade validation by dropping/changing its roleId.
    if (row?.artifact?.roleId !== row?.id) fail('FACTION_PROMPT_LINEAGE_STEP_DRIFT');
    return true;
  }).filter((row) => row?.artifact?.structuredDecodePassed !== true
    && row?.artifact?.structuredImportHash === undefined)
    .filter(row => {
      if (!promptLineage) return true; // Frozen historical callers retain their exact behavior.
      const origin = origins.get(row.id);
      if (!origin || origin.inputHash !== row.inputHash || origin.artifactHash !== hash(row.artifact)) {
        fail('FACTION_PROMPT_LINEAGE_STEP_DRIFT');
      }
      return origin.promptProtocol === 'legacy_json_prompt_v1';
    })
    .map((row) => canonicalRoleId(row.id))
    .filter((id) => /\.(?:reasoner|judge|generator-items\.[0-9]+|editor\.[0-3](?:\.phase-seed-v1\.[a-f0-9]{20})?\.[0-9]+|source-reconstruction\.[0-3](?:\.phase-seed-v1\.[a-f0-9]{20})?\.[0-9]+)$/u.test(id));
  if (new Set(roles).size !== roles.length) {
    fail("FACTION_STRUCTURED_EDITOR_LEGACY_ROLE_DUPLICATE");
  }
  return roles;
}

function eligibleRole(value) {
  return /\.editor\.[0-3](?:\.phase-seed-v1\.[a-f0-9]{20})?\.[0-9]+(?:\.source-evidence-v1\.[a-f0-9]{20})?$/u
    .test(String(value || ""));
}

function localContext(request) {
  const workspace = request.workspace;
  if (!workspace?.section || !workspace?.draft || !workspace?.issues
    || workspace.parentHash !== hash(workspace.draft)
    || workspace.issues.parentHash !== workspace.parentHash
    || workspace.issues.issues.length !== 1) {
    fail("FACTION_STRUCTURED_EDITOR_CONTEXT_INVALID");
  }
  verifySeal(workspace.issues);
  let issues = workspace.issues;
  if (workspace.allIssues) {
    verifySeal(workspace.allIssues);
    if (workspace.allIssues.parentHash !== workspace.parentHash
      || workspace.allIssues.sectionId !== workspace.section.id) {
      fail("FACTION_STRUCTURED_EDITOR_SOURCE_ISSUES_DRIFT");
    }
    const matches = workspace.allIssues.issues
      .map((issue, index) => ({ issue, index }))
      .filter((row) => hash(row.issue) === hash(workspace.localIssue));
    if (matches.length !== 1) {
      fail("FACTION_STRUCTURED_EDITOR_LOCAL_ISSUE_NOT_UNIQUE");
    }
    issues = isolateFactionLocalEditorIssueV1({
      issues: workspace.allIssues,
      issueOrdinal: matches[0].index,
    });
  }
  if (workspace.repairConflictHistory) {
    verifySeal(workspace.repairConflictHistory);
    if (workspace.repairConflictHistory.targetIndex
      !== issues.issues[0].index
      || workspace.repairConflictHistory.currentIssueHash
        !== hash(issues.issues[0])) {
      fail("FACTION_STRUCTURED_EDITOR_CONFLICT_HISTORY_DRIFT");
    }
  }
  return { section: workspace.section, draft: workspace.draft,
    issues, repairConflictHistory: workspace.repairConflictHistory || null };
}

export function prepareFactionStructuredLocalEditorRoleV1({ input, request, outputContract, executionPolicy }) {
  verifySeal(input); verifySeal(request.packet);
  if (!eligibleRole(request.roleId) || request.packet.inputHash !== input.hash || request.workspace?.inputHash !== input.hash)
    fail('FACTION_STRUCTURED_EDITOR_INPUT_DRIFT');
  const context = localContext(request), canonical = canonicalRoleId(request.roleId);
  const roleRef = { id: canonical, version: 'structured-v1', hash: hash(`${canonical}.structured-v1`) };
  const outputContractRef = outputContractRefStarcraftTmgV1(outputContract);
  const executionPolicyRef = { id: 'policy.faction-local-editor.production', version: '2026.09.06.1', hash: hash(executionPolicy) };
  const capsule = createFactionLocalEditorContextCapsuleV1({ factionInput: input,
    section: context.section, draft: context.draft, issues: context.issues, issueOrdinal: 0,
    repairConflictHistory: context.repairConflictHistory, roleRef, outputContractRef });
  const contextManifestRef = contextManifestRefStarcraftTmgV1(capsule);
  const roleInput = { version: STARCRAFT_TMG_FACTION_STRUCTURED_LOCAL_EDITOR_RUNTIME_VERSION,
    packetHash: request.packet.hash, roleRef, contextManifestRef, outputContractRef,
    executionPolicyRef, semanticAcceptanceInherited: false };
  return { fullRoleId: `${request.packet.id}.${request.roleId}`, canonical, capsule, roleRef,
    contextManifestRef, outputContractRef, executionPolicyRef, roleInput };
}

export function createFactionStructuredLocalEditorImportV1(input = {}) {
  [input.recipe, input.report, input.hostMaterialization,
    input.capsule].forEach(verifySeal);
  const outputContractRef = outputContractRefStarcraftTmgV1(
    input.outputContract);
  if (!input.report.passed || input.report.runId !== input.recipeRunId
    || input.report.recipeHash !== input.recipe.hash
    || input.hostMaterialization.runId !== input.recipeRunId
    || input.recipe.contextManifestRef.hash !== input.capsule.hash
    || input.capsule.outputContractRef.hash !== outputContractRef.hash
    || input.hostMaterialization.rawAdviceHash !== hash(input.rawAdvice)
    || input.report.localEditor?.hostMaterializationHash
      !== input.hostMaterialization.hash
    || input.report.localEditor?.runtimeOutcome?.status !== "accepted"
    || input.report.localEditor?.paidCallsThisExecution !== 1
    || input.report.localEditor?.inputReductionAtLeast70Percent !== true
    || input.hostMaterialization.semanticAcceptance !== false
    || input.hostMaterialization.freshWholeSectionReviewStatus !== "pending_r6") {
    fail("FACTION_STRUCTURED_EDITOR_IMPORT_INVALID");
  }
  return seal({
    version: "faction_structured_local_editor_import_v1",
    originRunId: input.recipeRunId,
    originRecipeHash: input.recipe.hash,
    originReportHash: input.report.hash,
    originHostMaterializationHash: input.hostMaterialization.hash,
    roleRef: input.capsule.roleRef,
    contextCapsuleHash: input.capsule.hash,
    outputContractRef,
    rawAdvice: input.rawAdvice,
    rawAdviceHash: hash(input.rawAdvice),
    actualDshCalls: input.report.localEditor.dshCalls,
    actualProviderCalls: input.report.localEditor.paidCallsThisExecution,
    inputReductionFraction: input.report.localEditor.inputReductionFraction,
    semanticAcceptanceInherited: false,
    freshWholeSectionReviewRequired: true,
    trainingTruth: false,
  });
}

export function createFactionStructuredLocalEditorRuntimeV1(options = {}) {
  const { input, runtime, store, dsh, providerAdapter, egressBinding,
    capabilityReceipt, outputContract, executionPolicy, priceUsage } = options;
  verifySeal(input);
  assertStarcraftTmgProviderCapabilityReceiptV1(capabilityReceipt);
  if (typeof runtime?.role !== "function" || !store
    || typeof dsh?.run !== "function" || typeof providerAdapter?.complete !== "function"
    || typeof priceUsage !== "function") {
    throw new TypeError("Faction structured editor dependencies are invalid");
  }
  const outputContractRef = outputContractRefStarcraftTmgV1(outputContract);
  if (capabilityReceipt.outputContractRef.hash !== outputContractRef.hash) {
    fail("FACTION_STRUCTURED_EDITOR_CAPABILITY_DRIFT");
  }
  const policy = Object.freeze({ ...executionPolicy });
  if (options.editorEnvelopeBinding) validateFactionEditorDraftEnvelopeBindingV2(options.editorEnvelopeBinding, options.draftEnvelopeBinding);
  if (options.editorEnvelopeBinding && hash(policy) !== options.editorEnvelopeBinding.executionPolicyHash)
    fail('FACTION_EDITOR_ENVELOPE_EXECUTION_POLICY_DRIFT');
  const legacyPromptRoles = new Set(options.legacyPromptRoleIds || []);
  if (legacyPromptRoles.size !== (options.legacyPromptRoleIds || []).length) {
    fail("FACTION_STRUCTURED_EDITOR_LEGACY_ROLE_DUPLICATE");
  }
  const executionPolicyRef = {
    id: "policy.faction-local-editor.production",
    version: "2026.09.06.1",
    hash: hash(policy),
  };
  const imports = new Map();
  for (const imported of options.imports || []) {
    verifySeal(imported);
    const key = `${imported.roleRef.hash}:${imported.contextCapsuleHash}`;
    if (imports.has(key) || imported.outputContractRef.hash !== outputContractRef.hash) {
      fail("FACTION_STRUCTURED_EDITOR_IMPORT_DRIFT");
    }
    imports.set(key, imported);
  }

  return Object.freeze({
    async role(request) {
      if (!eligibleRole(request.roleId)) return runtime.role(request);
      const fullRoleId = `${request.packet.id}.${request.roleId}`;
      if (legacyPromptRoles.has(canonicalRoleId(fullRoleId))) {
        return runtime.role(request);
      }
      verifySeal(request.packet);
      if (request.workspace?.inputHash !== input.hash) {
        fail("FACTION_STRUCTURED_EDITOR_INPUT_DRIFT");
      }
      const prepared = prepareFactionStructuredLocalEditorRoleV1({ input, request, outputContract, executionPolicy: policy });
      const { canonical, roleRef, capsule, contextManifestRef, roleInput } = prepared;
      const lease = store.acquire(fullRoleId, roleInput);
      if (lease.cached) return verifySeal(lease.artifact);
      const envelopeEvidenceMatches = (options.editorEnvelopeImports || []).filter(e =>
        e.rejected.roleRef.id === roleRef.id && e.rejected.contextManifestRef.hash === contextManifestRef.hash);
      if (envelopeEvidenceMatches.length > 1) { store.release(lease); fail('FACTION_EDITOR_ENVELOPE_IMPORT_AMBIGUOUS'); }
      const envelopeEvidence = envelopeEvidenceMatches[0];
      if (options.editorEnvelopeBinding && envelopeEvidence) {
        if (options.dry === true) {
          store.release(lease); options.onEnvelopeImport?.({ roleId: fullRoleId });
          fail('FACTION_PREFLIGHT_FIRST_EDITOR_ENVELOPE_IMPORT');
        }
        try { return store.finish(lease, await recoverFactionEditorDraftEnvelopeV2({ input, request, prepared,
          evidence: envelopeEvidence, binding: options.editorEnvelopeBinding, draftEnvelopeBinding: options.draftEnvelopeBinding, dsh })); }
        catch (error) { store.release(lease); throw error; }
      }
      const imported = imports.get(`${roleRef.hash}:${capsule.hash}`);
      if (imported) {
        const artifact = seal({
          output: imported.rawAdvice,
          roleId: fullRoleId,
          sourceDelivery: "proof_carrying_local_capsule_import",
          contextCapsuleHash: capsule.hash,
          outputContractRef,
          structuredImportHash: imported.hash,
          structuredDecodePassed: true,
          semanticAcceptance: false,
          freshWholeSectionReviewRequired: true,
          trainingTruth: false,
        });
        return store.finish(lease, artifact);
      }
      const candidates = new Map();
      const storeProxy = {
        ...store,
        finish(candidateLease, value) {
          const saved = store.finish(candidateLease, value);
          if (String(saved?.version || "").endsWith(".candidate")) {
            candidates.set(saved.hash, saved);
          }
          return saved;
        },
      };
      let providerFailure = null;
      const generated = createStructuredRuntimeWithWireRecoveryV2({
        wireRecovery: options.wireRecovery,
        outputContractRegistry: createStarcraftTmgOutputContractRegistryV1({
          entries: [outputContract],
        }),
        contextManifestRegistry: createStarcraftTmgContextCapsuleRegistryV1({
          entries: [capsule],
        }),
        executionPolicyRegistry: {
          resolve(value) {
            return value.executionPolicyRef?.hash === executionPolicyRef.hash
              && value.roleRef?.hash === roleRef.hash
              && value.outputContractRef?.hash === outputContractRef.hash
              ? { ok: true, executionPolicy: policy } : { ok: false };
          },
        },
        capabilityReceiptRegistry: {
          resolve(value) {
            return value.providerProfileRef?.hash
              === egressBinding.providerProfileRef.hash
              && value.outputContractRef?.hash === outputContractRef.hash
              && value.capability === "responses_json_schema"
              ? { ok: true, capabilityReceipt } : { ok: false };
          },
        },
        providerAdapter: options.editorEnvelopeBinding ? { ...providerAdapter, async complete(args) {
          try { return await providerAdapter.complete(args); }
          catch (error) { providerFailure = error; throw error; }
        } } : providerAdapter,
        store: storeProxy,
        egressBinding,
        priceUsage,
        classifyFailure(args) {
          // The V2 selector preserves this observer even when it replaces
          // the Adapter. Capture the original error only for the explicitly
          // bound recovery route; frozen legacy callers retain the DSH
          // rejection they previously received.
          if (options.editorEnvelopeBinding) providerFailure = args.error;
          return classifyStarcraftTmgStructuredFailureV1(args);
        },
        readCandidate: (candidateRef) => candidates.get(candidateRef.hash),
      });
      const invocation = { roleRef, contextManifestRef, outputContractRef,
        executionPolicyRef, continuationRef: null };
      let outcome = null;
      const bridge = createStarcraftTmgStructuredDshModelBridgeV1({
        generate: async () => {
          outcome = await generated.generateStructured(invocation);
          return outcome;
        },
        readCandidate: generated.readCandidate,
        bindInvocation: () => invocation,
      });
      try {
        const loop = await dsh.run({
          task: `Run structured local editor ${canonical} from its bound proof capsule and finish.`,
          callModel: bridge.callModel,
          toolPort: Object.freeze({ execute: async () =>
            fail("FACTION_STRUCTURED_EDITOR_TOOL_FORBIDDEN"),
          trace: () => [], readRefs: () => [] }),
          limits: { maxCalls: 1, maxTools: 0,
            maxOutput: policy.maxOutputUnits, maxWallMs: 180_000 },
        });
        if (outcome?.status !== "accepted" || loop.calls !== 1
          || loop.toolTrace.length !== 0) {
          fail("FACTION_STRUCTURED_EDITOR_OUTCOME_REJECTED");
        }
        options.onProgress?.({ role: request.roleId,
          state: "structured_local_editor_complete",
          inputTokens: outcome.usage.input,
          outputTokens: outcome.usage.output,
          estimatedCny: outcome.usage.estimatedCny,
          contextCapsuleBytes: capsule.compiledInputBytes });
        return store.finish(lease, seal({
          output: loop.final,
          roleId: fullRoleId,
          sourceDelivery: "proof_carrying_local_capsule",
          contextCapsuleHash: capsule.hash,
          outputContractRef,
          structuredRuntimeReceiptRef: outcome.receiptRef,
          structuredCandidateRef: outcome.candidateRef,
          toolReadRefs: [],
          toolTrace: [],
          loop,
          structuredDecodePassed: true,
          semanticAcceptance: false,
          freshWholeSectionReviewRequired: true,
          trainingTruth: false,
        }));
      } catch (error) {
        if (options.editorEnvelopeBinding && providerFailure?.code === 'STRUCTURED_PROVIDER_SCHEMA_INVALID'
          && options.readEditorEnvelopeFailure) {
          try {
            const evidence = options.readEditorEnvelopeFailure({ prepared, failureReceiptHash: providerFailure.safeReceipt?.receiptHash });
            if (evidence.rejected.safeReceiptHash !== providerFailure.safeReceipt?.receiptHash)
              fail('FACTION_EDITOR_ENVELOPE_EVIDENCE_INVALID');
            const recovered = await recoverFactionEditorDraftEnvelopeV2({ input, request, prepared, evidence,
              binding: options.editorEnvelopeBinding, draftEnvelopeBinding: options.draftEnvelopeBinding, dsh });
            options.onProgress?.({ role: request.roleId, state: 'structured_local_editor_envelope_recovered',
              providerCalls: 0, originalProviderFailurePreserved: true, freshWholeSectionReviewRequired: true });
            return store.finish(lease, recovered);
          } catch (recoveryError) {
            if (recoveryError.code !== 'FACTION_EDITOR_ENVELOPE_NOT_APPLICABLE') {
              store.release(lease); throw recoveryError;
            }
          }
        }
        store.release(lease);
        throw providerFailure || error;
      }
    },
  });
}
