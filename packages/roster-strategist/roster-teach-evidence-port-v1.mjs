import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyPregameSceneLaboratoryDescriptorV1 } from
  "./pregame-scene-laboratory-v1.mjs";

export const ROSTER_TEACH_EVIDENCE_PORT_SCHEMA =
  "starcraft_tmg_roster_teach_evidence_port_v1";
export const ROSTER_TEACH_EVIDENCE_RECEIPT_SCHEMA =
  "starcraft_tmg_roster_teach_evidence_receipt_v1";

const KINDS = new Set([
  "probability", "spatial", "math", "threat_exchange", "scenario",
]);
const HASH = /^[a-f0-9]{64}$/u;

function fail(code) { throw new Error(code); }
function object(value) {
  return value !== null && typeof value === "object"
    && !Array.isArray(value);
}
function clone(value) { return structuredClone(value); }
function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}
function id(value) {
  if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{1,120}$/u.test(value)) {
    fail("ROSTER_TEACH_EVIDENCE_CHALLENGE_ID_INVALID");
  }
  return value;
}

export function createRosterTeachEvidencePortV1(laboratory) {
  const labDescriptor = laboratory?.labDescriptor?.();
  verifyPregameSceneLaboratoryDescriptorV1(labDescriptor);
  if (typeof laboratory.proveMutationZero !== "function"
    || [...KINDS].some((kind) => typeof laboratory[{
      probability: "queryProbability", spatial: "querySpatial",
      math: "queryMath", threat_exchange: "queryThreatExchange",
      scenario: "runScenarioBranch",
    }[kind]] !== "function")) {
    fail("ROSTER_TEACH_EVIDENCE_LABORATORY_INVALID");
  }
  const descriptorBody = {
    schema: ROSTER_TEACH_EVIDENCE_PORT_SCHEMA,
    version: "1.0.0",
    laboratoryDescriptorHash: labDescriptor.descriptorHash,
    readOnly: true,
    canAffectRules: false,
    trainingTruth: false,
  };
  const descriptor = freezeDeep({ ...descriptorBody,
    descriptorHash: hashStarcraftTmgContract(descriptorBody) });
  return freezeDeep({
    descriptor: () => descriptor,
    query(query = {}) {
      if (query.mutationAuthority !== false
        || !HASH.test(String(query.initialFoundationHash || ""))
        || !Array.isArray(query.sourceHashes)
        || query.sourceHashes.length < 1
        || query.sourceHashes.some((value) => !HASH.test(String(value)))) {
        fail("ROSTER_TEACH_EVIDENCE_SCOPE_INVALID");
      }
      const challengeId = id(query.challengeId);
      const request = query.request;
      if (!object(request) || !KINDS.has(request.kind)
        || !object(request.toolRequest)) {
        fail("ROSTER_TEACH_EVIDENCE_REQUEST_INVALID");
      }
      const toolRequest = clone(request.toolRequest);
      // A Teach query is always against the frozen source, never a mutable
      // Room or a branch implicitly selected from another challenge.
      if (Object.hasOwn(toolRequest, "base")
        || Object.hasOwn(toolRequest, "queryId")
        || Object.hasOwn(toolRequest, "branchId")) {
        fail("ROSTER_TEACH_EVIDENCE_BASE_OVERRIDE_FORBIDDEN");
      }
      const common = { ...toolRequest, base: { kind: "source" } };
      const queryId = `teach-${challengeId}`;
      let sourceReceipt = null;
      let unknownReasonCode = null;
      // The lab's lifecycle-branch shorthand advances an arbitrary first
      // legal actor. It is not a forecast of a named opponent response.
      if (request.kind === "math"
        && toolRequest.mathKind === "budget_fit") {
        unknownReasonCode =
          "ROSTER_TEACH_BUDGET_FIT_REQUIRES_SELECTED_ROSTER_AUDIT";
      } else if (request.kind === "scenario"
        && Number(toolRequest.spec?.lifecycleSteps || 0) > 0) {
        unknownReasonCode =
          "ROSTER_TEACH_UNNAMED_LIFECYCLE_IS_NOT_OPPONENT_FORECAST";
      } else {
        try {
          switch (request.kind) {
            case "probability":
              sourceReceipt = laboratory.queryProbability({
                ...common, queryId });
              break;
            case "spatial":
              sourceReceipt = laboratory.querySpatial({ ...common, queryId });
              break;
            case "math":
              sourceReceipt = laboratory.queryMath({ ...common, queryId });
              break;
            case "threat_exchange":
              sourceReceipt = laboratory.queryThreatExchange({
                ...common, queryId });
              break;
            case "scenario":
              sourceReceipt = laboratory.runScenarioBranch({
                ...common, branchId: queryId });
              break;
            default: fail("ROSTER_TEACH_EVIDENCE_REQUEST_INVALID");
          }
        } catch (error) {
          const code = String(error?.code || error?.message || "").split(":")[0];
          if (!/^PREGAME_LAB_[A-Z0-9_]+$/u.test(code)) throw error;
          unknownReasonCode = code;
        }
      }
      const mutationProof = laboratory.proveMutationZero();
      if (mutationProof.sourceStateMutationCount !== 0
        || mutationProof.sourceStateHashUnchanged !== true
        || mutationProof.builderBundleHashUnchanged !== true
        || mutationProof.rulesRuntimeHashUnchanged !== true) {
        fail("ROSTER_TEACH_EVIDENCE_MUTATION_DETECTED");
      }
      if (unknownReasonCode === null && (!object(sourceReceipt)
        || !HASH.test(String(sourceReceipt.receiptHash || "")))) {
        fail("ROSTER_TEACH_EVIDENCE_RECEIPT_INVALID");
      }
      const status = sourceReceipt?.resultStatus === "ok"
        ? "advisory"
        : "unknown";
      const body = {
        schema: ROSTER_TEACH_EVIDENCE_RECEIPT_SCHEMA,
        challengeId,
        requestKind: request.kind,
        requestHash: hashStarcraftTmgContract(request),
        initialFoundationHash: query.initialFoundationHash,
        sourceHashes: clone(query.sourceHashes),
        sourceReceipt: clone(sourceReceipt),
        sourceReceiptHash: sourceReceipt?.receiptHash ?? null,
        mutationProofHash: hashStarcraftTmgContract(mutationProof),
        status,
        unknownReasonCode: unknownReasonCode
          ?? sourceReceipt?.unknownReason ?? null,
        calculationPolicy: request.kind === "math"
          ? "exact_arithmetic_over_model_supplied_inputs_not_rule_truth"
          : null,
        canAffectRules: false,
        trainingTruth: false,
      };
      return freezeDeep({ ...body,
        receiptHash: hashStarcraftTmgContract(body) });
    },
  });
}
