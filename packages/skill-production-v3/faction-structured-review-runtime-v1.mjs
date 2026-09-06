import { hash, seal, verifySeal, fail } from "../skill-production/common.mjs";
import { createFactionReviewContextCapsuleV1,
  createFactionReviewSchemaRepairContextCapsuleV1 } from
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

function pathTokens(path) {
  if (typeof path !== "string" || !path.startsWith("$.")) {
    fail("FACTION_STRUCTURED_REVIEW_SCHEMA_REPAIR_PATH_INVALID");
  }
  const tokens = [];
  const suffix = path.slice(2);
  const matcher = /(?:^|\.)([A-Za-z][A-Za-z0-9_]*)|\[([0-9]+)\]/gu;
  let consumed = 0;
  for (const match of suffix.matchAll(matcher)) {
    if (match.index !== consumed) {
      fail("FACTION_STRUCTURED_REVIEW_SCHEMA_REPAIR_PATH_INVALID");
    }
    tokens.push(match[1] ?? Number(match[2]));
    consumed = match.index + match[0].length;
  }
  if (!tokens.length || consumed !== suffix.length) {
    fail("FACTION_STRUCTURED_REVIEW_SCHEMA_REPAIR_PATH_INVALID");
  }
  return tokens;
}

function maskRepairPaths(value, paths) {
  const result = structuredClone(value);
  for (const path of paths) {
    const tokens = pathTokens(path);
    let cursor = result;
    for (const token of tokens.slice(0, -1)) {
      if (!cursor || typeof cursor !== "object"
        || !Object.hasOwn(cursor, token)) {
        fail("FACTION_STRUCTURED_REVIEW_SCHEMA_REPAIR_PATH_INVALID");
      }
      cursor = cursor[token];
    }
    const last = tokens.at(-1);
    if (!cursor || typeof cursor !== "object"
      || !Object.hasOwn(cursor, last)) {
      fail("FACTION_STRUCTURED_REVIEW_SCHEMA_REPAIR_PATH_INVALID");
    }
    cursor[last] = { hostMaskedSchemaRepairPath: path };
  }
  return result;
}

export function verifyFactionStructuredReviewSchemaRepairScopeV1({
  rejectedCandidate, repairedOutput,
}) {
  verifySeal(rejectedCandidate);
  const paths = rejectedCandidate.validation?.issues?.map((row) => row.path);
  if (!Array.isArray(paths) || !paths.length
    || new Set(paths).size !== paths.length
    || hash(maskRepairPaths(rejectedCandidate.providerValue, paths))
      !== hash(maskRepairPaths(repairedOutput, paths))
    || paths.every((path) => {
      const tokens = pathTokens(path);
      let before = rejectedCandidate.providerValue;
      let after = repairedOutput;
      for (const token of tokens) {
        before = before?.[token]; after = after?.[token];
      }
      return hash(before) === hash(after);
    })) {
    fail("FACTION_STRUCTURED_REVIEW_SCHEMA_REPAIR_SCOPE_INVALID");
  }
  return seal({
    version: "faction_structured_review_schema_repair_scope_v1",
    rejectedCandidateHash: rejectedCandidate.hash,
    repairedOutputHash: hash(repairedOutput),
    allowedChangedPaths: paths,
    allOtherValuesHashEqual: true,
    semanticReReviewPerformed: false,
    trainingTruth: false,
  });
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
      async function runStructured(activeRoleRef, activeCapsule, task) {
        const activeContextRef = contextManifestRefStarcraftTmgV1(
          activeCapsule);
        const generated = createStarcraftTmgStructuredGenerationRuntimeV1({
          outputContractRegistry: createStarcraftTmgOutputContractRegistryV1({
            entries: [outputContract],
          }),
          contextManifestRegistry: createStarcraftTmgContextCapsuleRegistryV1({
            entries: [activeCapsule],
          }),
          executionPolicyRegistry: { resolve(value) {
            return value.executionPolicyRef?.hash === executionPolicyRef.hash
              && value.roleRef?.hash === activeRoleRef.hash
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
        const invocation = { roleRef: activeRoleRef,
          contextManifestRef: activeContextRef, outputContractRef,
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
            task,
            callModel: bridge.callModel,
            toolPort: Object.freeze({ execute: async () =>
              fail("FACTION_STRUCTURED_REVIEW_TOOL_FORBIDDEN"),
            trace: () => [], readRefs: () => [] }),
            limits: { maxCalls: 1, maxTools: 0,
              maxOutput: policy.maxOutputUnits, maxWallMs: 180_000 },
          });
          return { outcome, loop, contextManifestRef: activeContextRef };
        } catch (error) {
          return { outcome, error, loop: null,
            contextManifestRef: activeContextRef };
        }
      }
      try {
        const first = await runStructured(roleRef, capsule,
          `Run structured target review ${canonical} from its complete section proof capsule and finish.`);
        let active = first, activeCapsule = capsule;
        let schemaRepairScope = null;
        if (first.outcome?.status === "quarantined"
          && first.outcome.issueRef?.class === "schema_instance"
          && first.outcome.issueRef?.rejectedCandidateRef) {
          const rejected = store.artifact(
            first.outcome.issueRef.rejectedCandidateRef.id);
          if (!rejected
            || rejected.hash
              !== first.outcome.issueRef.rejectedCandidateRef.hash) {
            fail("FACTION_STRUCTURED_REVIEW_REJECTED_CANDIDATE_MISSING");
          }
          const repairRoleRef = {
            id: `${canonical}.schema-repair.1`,
            version: "structured-review-v1",
            hash: hash(`${canonical}.schema-repair.1.structured-review-v1`),
          };
          activeCapsule = createFactionReviewSchemaRepairContextCapsuleV1({
            capsule, rejectedCandidate: rejected, roleRef: repairRoleRef,
          });
          active = await runStructured(repairRoleRef, activeCapsule,
            `Repair only the exact local schema-instance paths for ${canonical}; preserve every other parsed value and finish once.`);
          if (active.outcome?.status === "accepted" && active.loop) {
            schemaRepairScope =
              verifyFactionStructuredReviewSchemaRepairScopeV1({
                rejectedCandidate: rejected,
                repairedOutput: active.loop.final,
              });
          }
        }
        if (active.outcome?.status !== "accepted" || !active.loop
          || active.loop.calls !== 1
          || active.loop.toolTrace.length !== 0) {
          throw active.error || first.error
            || Object.assign(new Error("FACTION_STRUCTURED_REVIEW_OUTCOME_REJECTED"),
              { code: "FACTION_STRUCTURED_REVIEW_OUTCOME_REJECTED" });
        }
        const materialized = materializeFactionStructuredReviewV1({
          providerOutput: active.loop.final, capsule: activeCapsule,
          input, section, draft,
          reviewIndices, requiredSourceRefs: coverageRequiredSourceRefs,
          targets,
        });
        options.onProgress?.({ role: request.roleId,
          state: "structured_target_review_complete",
          inputTokens: active.outcome.usage.input,
          outputTokens: active.outcome.usage.output,
          estimatedCny: active.outcome.usage.estimatedCny,
          contextCapsuleBytes: activeCapsule.compiledInputBytes,
          schemaRepairApplied: Boolean(schemaRepairScope) });
        return store.finish(lease, seal({
          output: materialized.output,
          roleId: fullRoleId,
          sourceDelivery: "proof_carrying_whole_section_review_capsule",
          contextCapsuleHash: activeCapsule.hash,
          initialContextCapsuleHash: capsule.hash,
          outputContractRef,
          structuredRuntimeReceiptRef: active.outcome.receiptRef,
          structuredCandidateRef: active.outcome.candidateRef,
          hostMaterializationReceipt: materialized.receipt,
          ...(schemaRepairScope ? { schemaRepairScope,
            initialStructuredIssueRef: first.outcome.issueRef } : {}),
          toolReadRefs: [], toolTrace: [], loop: active.loop,
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
