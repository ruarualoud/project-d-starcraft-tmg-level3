import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  assertStarcraftTmgOutputContractV1,
  createStarcraftTmgOutputContractV1,
  outputContractRefStarcraftTmgV1,
} from "../structured-generation/output-contract-registry-v1.mjs";
import { ROSTER_PUBLIC_CLAIM_PATHS_V1 } from
  "./roster-public-claim-paths-v1.mjs";

// A cited review may need only a few public prose fields changed. Returning
// the whole plan on each repair can exhaust the Provider output cap, even
// though the immutable roster, schedule and other prose already passed.
// The model owns every replacement; the host applies only named,
// reviewed paths and revalidates the complete revised plan.
export const AGENT_SCHEDULED_CLAIM_REPAIR_PATHS_V1 =
  ROSTER_PUBLIC_CLAIM_PATHS_V1;
// Keep retained v1 Provider contracts immutable. Newly supported fields use
// the existing exact-request v2 contract, not a changed historical schema.
export const AGENT_SCHEDULED_LEGACY_CLAIM_REPAIR_PATHS_V1 = Object.freeze(
  ROSTER_PUBLIC_CLAIM_PATHS_V1.filter((path) => (
    path !== "scoreRoute.fallbackRouteText")));

const schema = {
  type: "object", additionalProperties: false,
  properties: {
    schemaVersion: { type: "string", minLength: 1, maxLength: 80, enum: [
      "starcraft_tmg_roster_strategist_deliberation_v1"] },
    roundKind: { type: "string", minLength: 1, maxLength: 16,
      enum: ["revision"] },
    repairs: {
      type: "array", minItems: 1, maxItems: 5,
      description: "Exactly one full replacement text for each requested "
        + "public claim path, no other fields or plan rewrite.",
      items: {
        type: "object", additionalProperties: false,
        properties: {
          claimPath: { type: "string", minLength: 1, maxLength: 80,
            enum: AGENT_SCHEDULED_LEGACY_CLAIM_REPAIR_PATHS_V1 },
          replacementText: { type: "string", minLength: 1,
            maxLength: 16000 },
        },
        required: ["claimPath", "replacementText"],
      },
    },
  },
  required: ["schemaVersion", "roundKind", "repairs"],
};

const ref = (name) => Object.freeze({
  id: `agent-scheduled-claim-repair-v1.${name}`,
  version: "1.0.0",
  hash: hashStarcraftTmgContract(
    `agent-scheduled-claim-repair-v1:${name}`),
});

export const AGENT_SCHEDULED_CLAIM_REPAIR_OUTPUT_CONTRACT_V1 =
  createStarcraftTmgOutputContractV1({
    id: "ticket27.agent_scheduled.claim_repair.v1",
    version: "1.0.0",
    schemaName: "roster_agent_scheduled_claim_repair_v1",
    providerSchema: schema,
    modelOwnedFields: Object.keys(schema.properties),
    hostOwnedFields: [],
    mapperRef: ref("normalize_named_public_claims"),
    semanticValidatorRef: ref("validate_reviewed_claim_replacements"),
    description: "Bounded public-claim repair for an immutable Agent roster "
      + "and Rules-checked arrival schedule; no full-plan regeneration.",
  });

assertStarcraftTmgOutputContractV1(
  AGENT_SCHEDULED_CLAIM_REPAIR_OUTPUT_CONTRACT_V1);

export const AGENT_SCHEDULED_CLAIM_REPAIR_OUTPUT_CONTRACT_REF_V1 =
  outputContractRefStarcraftTmgV1(
    AGENT_SCHEDULED_CLAIM_REPAIR_OUTPUT_CONTRACT_V1);

// Component instance IDs come from the locked roster, not a static schema.
// Bind a v2 Provider enum to precisely the cited paths requested for this
// revision; the legacy v1 contract remains resolvable for retained replies.
export function createAgentScheduledClaimRepairOutputContractV2(paths) {
  if (!Array.isArray(paths) || paths.length < 1 || paths.length > 5
    || new Set(paths).size !== paths.length
    || paths.some((path) => typeof path !== "string"
      || path.length < 1 || path.length > 160)) {
    throw new TypeError("AGENT_SCHEDULED_CLAIM_REPAIR_PATHS_INVALID");
  }
  const requestedPaths = [...paths].sort();
  const pathSetHash = hashStarcraftTmgContract(requestedPaths);
  const providerSchema = structuredClone(schema);
  providerSchema.properties.repairs.minItems = requestedPaths.length;
  providerSchema.properties.repairs.maxItems = requestedPaths.length;
  providerSchema.properties.repairs.items.properties.claimPath = {
    type: "string", minLength: 1, maxLength: 160,
    enum: requestedPaths,
  };
  const refV2 = (name) => Object.freeze({
    id: `agent-scheduled-claim-repair-v2.${name}`,
    version: "2.0.0",
    hash: hashStarcraftTmgContract(
      `agent-scheduled-claim-repair-v2:${name}`),
  });
  const contract = createStarcraftTmgOutputContractV1({
    id: `ticket27.agent_scheduled.claim_repair.v2.${pathSetHash.slice(0, 16)}`,
    version: "2.0.0",
    schemaName: `roster_agent_claim_repair_${pathSetHash.slice(0, 16)}`,
    providerSchema,
    modelOwnedFields: Object.keys(providerSchema.properties),
    hostOwnedFields: [],
    mapperRef: refV2("normalize_named_public_claims"),
    semanticValidatorRef: refV2("validate_reviewed_claim_replacements"),
    description: "Exact cited public-claim repair for the immutable roster "
      + "and arrival schedule, including one named component instance.",
  });
  assertStarcraftTmgOutputContractV1(contract);
  return Object.freeze({ contract,
    contractRef: outputContractRefStarcraftTmgV1(contract) });
}

// A complete cited review may expose more than five related claims. V3
// binds one structured response to every requested path so the host can
// apply all replacements in one plan revision instead of mutating five
// fields, reviewing an inconsistent intermediate plan, then repeating.
// V1/V2 contracts and retained paid replies stay immutable.
export function createAgentScheduledClaimRepairOutputContractV3(paths) {
  if (!Array.isArray(paths) || paths.length < 1 || paths.length > 64
    || new Set(paths).size !== paths.length
    || paths.some((path) => typeof path !== "string"
      || path.length < 1 || path.length > 160)) {
    throw new TypeError("AGENT_SCHEDULED_COORDINATED_REPAIR_PATHS_INVALID");
  }
  const requestedPaths = [...paths].sort();
  const pathSetHash = hashStarcraftTmgContract(requestedPaths);
  const providerSchema = structuredClone(schema);
  providerSchema.properties.repairs.minItems = requestedPaths.length;
  providerSchema.properties.repairs.maxItems = requestedPaths.length;
  providerSchema.properties.repairs.items.properties.claimPath = {
    type: "string", minLength: 1, maxLength: 160,
    enum: requestedPaths,
  };
  const refV3 = (name) => Object.freeze({
    id: `agent-scheduled-claim-repair-v3.${name}`,
    version: "3.0.0",
    hash: hashStarcraftTmgContract(
      `agent-scheduled-claim-repair-v3:${name}`),
  });
  const contract = createStarcraftTmgOutputContractV1({
    id: `ticket27.agent_scheduled.claim_repair.v3.${pathSetHash.slice(0, 16)}`,
    version: "3.0.0",
    schemaName: `roster_agent_coordinated_repair_${pathSetHash.slice(0, 16)}`,
    providerSchema,
    modelOwnedFields: Object.keys(providerSchema.properties),
    hostOwnedFields: [],
    mapperRef: refV3("normalize_named_public_claims"),
    semanticValidatorRef: refV3("validate_reviewed_claim_replacements"),
    description: "One coordinated public-claim revision for the immutable "
      + "roster and Rules-audited arrival schedule.",
  });
  assertStarcraftTmgOutputContractV1(contract);
  return Object.freeze({ contract,
    contractRef: outputContractRefStarcraftTmgV1(contract) });
}

// V4 adds an optional read-only evidence turn. A reply either requests saved
// evidence (no partial application), or supplies all coordinated replacements.
// Existing V1–V3 contracts/paid replies stay immutable and remain supported.
export function createAgentScheduledClaimRepairOutputContractV4(paths) {
  const previous = createAgentScheduledClaimRepairOutputContractV3(paths);
  const providerSchema = structuredClone(previous.contract.providerSchema);
  providerSchema.properties.repairs.minItems = 0;
  providerSchema.properties.repairs.description = 'Empty while requesting retained evidence; otherwise one complete replacement for every requested path.';
  providerSchema.properties.evidenceRequests = {
    type: 'array', minItems: 0, maxItems: 8,
    description: 'Optional batch of exact saved-evidence lookups. Empty when returning final repairs. No simulation or mutation.',
    items: { type: 'object', additionalProperties: false, required: ['receiptHash', 'path'],
      properties: { receiptHash: { type: 'string', minLength: 64, maxLength: 64 },
        path: { type: 'string', minLength: 0, maxLength: 2000,
          description: 'Dot path within the referenced original; empty returns its value or child index.' } } },
  };
  providerSchema.required.push('evidenceRequests');
  const pathSetHash = hashStarcraftTmgContract([...paths].sort());
  const component = name => ({ id: `agent-scheduled-claim-repair-v4.${name}`,
    version: '4.0.0', hash: hashStarcraftTmgContract(`agent-scheduled-claim-repair-v4:${name}`) });
  const contract = createStarcraftTmgOutputContractV1({
    id: `ticket27.agent_scheduled.claim_repair.v4.${pathSetHash.slice(0, 16)}`,
    version: '4.0.0', schemaName: `roster_agent_evidence_repair_${pathSetHash.slice(0, 16)}`,
    providerSchema, modelOwnedFields: Object.keys(providerSchema.properties), hostOwnedFields: [],
    mapperRef: component('retained_read_or_coordinated_revision'),
    semanticValidatorRef: component('immutable_plan_and_actual_evidence'),
    description: 'Optional retained-evidence lookup before one coordinated immutable-roster Plan revision.',
  });
  return Object.freeze({ contract, contractRef: outputContractRefStarcraftTmgV1(contract) });
}
