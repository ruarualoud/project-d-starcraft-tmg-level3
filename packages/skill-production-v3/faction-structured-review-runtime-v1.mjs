import { hash, seal, verifySeal, fail } from "../skill-production/common.mjs";
import { createFactionReviewContextCapsuleV1 } from
  "./faction-review-context-capsule-v1.mjs";
import { createFactionReviewTargetsV1,
  validateTargetedFactionReviewV1 } from "./faction-review-targets-v1.mjs";
import { validateFactionReviewV1 } from "./faction-strategy-workflow-v1.mjs";
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
import { createStarcraftTmgStructuredGenerationRuntimeV1 } from
  "../structured-generation/structured-generation-runtime-v1.mjs";

export const STARCRAFT_TMG_FACTION_STRUCTURED_REVIEW_RUNTIME_VERSION =
  "starcraft_tmg_faction_structured_review_runtime_v1";

const SOURCE_EPOCH = /\.source-evidence-v1\.[a-f0-9]{20}$/u;
const REVIEW_ROLE = /\.review-target-batch-v1\.(supportive|adversarial)\.([0-3])(?:\.phase-seed-v1\.[a-f0-9]{20})?\.([0-9]+)(?:\.source-evidence-v1\.[a-f0-9]{20})?$/u;

function canonicalRoleId(value) {
  return String(value || "").replace(SOURCE_EPOCH, "");
}

export function deriveFactionLegacyStructuredReviewRoleIdsV1(steps = []) {
  if (!Array.isArray(steps)) throw new TypeError("Continuation steps are invalid");
  const roles = steps.filter((row) => row?.artifact?.structuredDecodePassed !== true)
    .map((row) => canonicalRoleId(row.id))
    .filter((id) => REVIEW_ROLE.test(id));
  if (new Set(roles).size !== roles.length) {
    fail("FACTION_STRUCTURED_REVIEW_LEGACY_ROLE_DUPLICATE");
  }
  return roles;
}

function exactSlotSet(rows, field, length, code) {
  if (!Array.isArray(rows) || rows.length !== length
    || new Set(rows.map((row) => row?.[field])).size !== length
    || rows.some((row) => !Number.isInteger(row[field])
      || row[field] < 0 || row[field] >= length)) fail(code);
}

export function materializeFactionStructuredReviewV1({
  providerOutput, capsule, input, section, draft, reviewIndices,
  requiredSourceRefs, targets,
}) {
  verifySeal(capsule);
  exactSlotSet(providerOutput?.verdicts, "targetSlot",
    targets.targets.length, "FACTION_STRUCTURED_REVIEW_TARGET_SLOT_INVALID");
  exactSlotSet(providerOutput?.coverage, "coverageSlot",
    requiredSourceRefs.length, "FACTION_STRUCTURED_REVIEW_COVERAGE_SLOT_INVALID");
  const task = capsule.localIssue.reviewTask;
  const available = new Map(task.sourceCatalogue
    .filter((row) => row.includedAs !== "not_in_current_faction_scope")
    .map((row) => [row.slot, row.ref]));
  const verdicts = [...providerOutput.verdicts]
    .sort((a, b) => a.targetSlot - b.targetSlot).map((row) => {
      if (!Array.isArray(row.sourceSlots) || !row.sourceSlots.length
        || row.sourceSlots.some((slot) => !available.has(slot))) {
        fail("FACTION_STRUCTURED_REVIEW_SOURCE_SLOT_INVALID");
      }
      const target = targets.targets[row.targetSlot];
      return { targetId: target.targetId, title: target.title,
        focus: row.focus, verdict: row.verdict, reason: row.reason,
        sourceRefs: row.sourceSlots.map((slot) => available.get(slot)) };
    });
  const coverage = [...providerOutput.coverage]
    .sort((a, b) => a.coverageSlot - b.coverageSlot).map((row) => ({
      sourceRef: requiredSourceRefs[row.coverageSlot],
      verdict: row.verdict,
      recommendationIndices: row.recommendationIndices,
      reason: row.reason,
    }));
  const output = { verdicts, coverage };
  const bound = validateTargetedFactionReviewV1(output, targets);
  validateFactionReviewV1(bound.review, {
    input, section, draft, reviewIndices, requiredSourceRefs,
  });
  return { output, bound, receipt: seal({
    version: "faction_structured_review_host_materialization_v1",
    providerOutputHash: hash(providerOutput),
    targetContractHash: targets.hash,
    contextCapsuleHash: capsule.hash,
    materializedOutputHash: hash(output),
    targetIdsHostMaterialized: true,
    titlesHostMaterialized: true,
    sourceRefsHostMaterializedFromSlots: true,
    judgmentsChanged: false,
    semanticAcceptanceInherited: false,
    trainingTruth: false,
  }) };
}

export function createFactionStructuredReviewRuntimeV1(options = {}) {
  const { input, runtime, store, dsh, providerAdapter, egressBinding,
    capabilityReceipt, outputContract, executionPolicy, priceUsage } = options;
  verifySeal(input);
  assertStarcraftTmgProviderCapabilityReceiptV1(capabilityReceipt);
  if (typeof runtime?.role !== "function" || !store
    || typeof dsh?.run !== "function" || typeof providerAdapter?.complete !== "function"
    || typeof priceUsage !== "function") {
    throw new TypeError("Faction structured review dependencies are invalid");
  }
  const outputContractRef = outputContractRefStarcraftTmgV1(outputContract);
  if (capabilityReceipt.outputContractRef.hash !== outputContractRef.hash) {
    fail("FACTION_STRUCTURED_REVIEW_CAPABILITY_DRIFT");
  }
  const policy = Object.freeze({ ...executionPolicy });
  const legacyRoles = new Set(options.legacyStructuredReviewRoleIds || []);
  if (legacyRoles.size !== (options.legacyStructuredReviewRoleIds || []).length) {
    fail("FACTION_STRUCTURED_REVIEW_LEGACY_ROLE_DUPLICATE");
  }
  const executionPolicyRef = {
    id: "policy.faction-target-review.production",
    version: "2026.09.06.1",
    hash: hash(policy),
  };
  return Object.freeze({
    async role(request) {
      const match = REVIEW_ROLE.exec(request.roleId || "");
      if (!match) return runtime.role(request);
      const fullRoleId = `${request.packet.id}.${request.roleId}`;
      if (legacyRoles.has(canonicalRoleId(fullRoleId))) {
        return runtime.role(request);
      }
      verifySeal(request.packet);
      const { section, draft, reviewIndices, coverageRequiredSourceRefs,
        outputRequestAtEnd } = request.workspace || {};
      const targets = outputRequestAtEnd?.targetContract;
      if (request.workspace?.inputHash !== input.hash || !targets
        || targets.hash !== createFactionReviewTargetsV1({ input, section,
          draft, indices: reviewIndices }).hash) {
        fail("FACTION_STRUCTURED_REVIEW_INPUT_DRIFT");
      }
      const canonical = canonicalRoleId(request.roleId);
      const roleRef = { id: canonical, version: "structured-review-v1",
        hash: hash(`${canonical}.structured-review-v1`) };
      const capsule = createFactionReviewContextCapsuleV1({
        factionInput: input, section, draft, reviewIndices,
        coverageRequiredSourceRefs, targets, roleRef, outputContractRef,
        route: match[1],
      });
      const contextManifestRef = contextManifestRefStarcraftTmgV1(capsule);
      const roleInput = {
        version: STARCRAFT_TMG_FACTION_STRUCTURED_REVIEW_RUNTIME_VERSION,
        packetHash: request.packet.hash,
        roleRef,
        contextManifestRef,
        outputContractRef,
        executionPolicyRef,
        semanticAcceptanceInherited: false,
      };
      const lease = store.acquire(fullRoleId, roleInput);
      if (lease.cached) return verifySeal(lease.artifact);
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
      const generated = createStarcraftTmgStructuredGenerationRuntimeV1({
        outputContractRegistry: createStarcraftTmgOutputContractRegistryV1({
          entries: [outputContract],
        }),
        contextManifestRegistry: createStarcraftTmgContextCapsuleRegistryV1({
          entries: [capsule],
        }),
        executionPolicyRegistry: { resolve(value) {
          return value.executionPolicyRef?.hash === executionPolicyRef.hash
            && value.roleRef?.hash === roleRef.hash
            && value.outputContractRef?.hash === outputContractRef.hash
            ? { ok: true, executionPolicy: policy } : { ok: false };
        } },
        capabilityReceiptRegistry: { resolve(value) {
          return value.providerProfileRef?.hash
            === egressBinding.providerProfileRef.hash
            && value.outputContractRef?.hash === outputContractRef.hash
            && value.capability === "responses_json_schema"
            ? { ok: true, capabilityReceipt } : { ok: false };
        } },
        providerAdapter,
        store: storeProxy,
        egressBinding,
        priceUsage,
        classifyFailure: classifyStarcraftTmgStructuredFailureV1,
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
          task: `Run structured target review ${canonical} from its complete section proof capsule and finish.`,
          callModel: bridge.callModel,
          toolPort: Object.freeze({ execute: async () =>
            fail("FACTION_STRUCTURED_REVIEW_TOOL_FORBIDDEN"),
          trace: () => [], readRefs: () => [] }),
          limits: { maxCalls: 1, maxTools: 0,
            maxOutput: policy.maxOutputUnits, maxWallMs: 180_000 },
        });
        if (outcome?.status !== "accepted" || loop.calls !== 1
          || loop.toolTrace.length !== 0) {
          fail("FACTION_STRUCTURED_REVIEW_OUTCOME_REJECTED");
        }
        const materialized = materializeFactionStructuredReviewV1({
          providerOutput: loop.final, capsule, input, section, draft,
          reviewIndices, requiredSourceRefs: coverageRequiredSourceRefs,
          targets,
        });
        options.onProgress?.({ role: request.roleId,
          state: "structured_target_review_complete",
          inputTokens: outcome.usage.input,
          outputTokens: outcome.usage.output,
          estimatedCny: outcome.usage.estimatedCny,
          contextCapsuleBytes: capsule.compiledInputBytes });
        return store.finish(lease, seal({
          output: materialized.output,
          roleId: fullRoleId,
          sourceDelivery: "proof_carrying_whole_section_review_capsule",
          contextCapsuleHash: capsule.hash,
          outputContractRef,
          structuredRuntimeReceiptRef: outcome.receiptRef,
          structuredCandidateRef: outcome.candidateRef,
          hostMaterializationReceipt: materialized.receipt,
          toolReadRefs: [], toolTrace: [], loop,
          structuredDecodePassed: true,
          semanticAcceptance: false,
          trainingTruth: false,
        }));
      } catch (error) {
        store.release(lease);
        throw error;
      }
    },
  });
}
