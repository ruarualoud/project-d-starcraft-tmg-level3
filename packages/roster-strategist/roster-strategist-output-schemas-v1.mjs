// Ticket 27 / Slices 269-270 — strict generation-side output contracts.
//
// Closes the saved live round-5 blocker
// (ROSTER_STRATEGIST_FOUNDATION_INVALID:evidence,hypothesisText,implication),
// where the model omitted contracted semantic fields outright and the typed
// alias boundary correctly refused to invent them. The normalization boundary
// is transport-level by design; it can never manufacture missing strategy.
// The generation side must therefore make the contracted field set
// structurally unavoidable: every deliberation round is requested through the
// existing Provider JSON-schema strict subset
// (`project_d_provider_json_schema_strict_v1`, DeepSeek Responses
// `text.format.type = "json_schema"`), so the wire answer must contain exactly
// the contracted public fields before the runtime's normalization boundary
// and full schema/Rules validation run afterwards (both still apply; nothing
// is weakened).
//
// Each schema below is derived from the runtime validators of
// `roster-strategist-runtime-v1.mjs` and is validated against the strict
// subset at module load. The schemas are general: they bind field names,
// types, bounds and enums only — never roster content, candidate identity or
// strategy. `toolRequest` is a closed superset of every laboratory query
// family; fields a need kind does not consume carry schema-mandated
// placeholder values never reach Rules or tool receipts.
//
// Sub-slice 269.9 (closing the saved live round-6 blocker
// ROSTER_STRATEGIST_STRUCTURED_OUTPUT_SCHEMA_INVALID:...vespeneLimit
// Numerator:integer_too_large): every integer bound below is now derived
// from the domain-owned integer rules instead of a host-authored cap. The
// Rules side owns the integer domain: the pregame laboratory accepts any
// safe integer for every math input (`integer()` in
// pregame-scene-laboratory-v1.mjs; its only tighter rule,
// vespeneLimitDenominator >= 1, is enforced there after the runtime's
// canonicalization drops the zero placeholder), and the plan contracts
// accept any non-negative or positive safe integer (`nonNegativeInteger` /
// `positiveInteger` in roster-plan-contracts-v1.mjs, echoed by the Army
// Builder port). The strict Provider subset itself caps expressible integer
// bounds at +/-1,000,000,000 (output-contract-registry-v1
// `assertSchemaNode`), so that subset ceiling is the widest domain-faithful
// bound a generation schema can declare. No narrower host-side cap is
// authored anywhere below; nothing is special-cased to one value, one
// response or one roster.
//
// Sub-slice 269.10 (closing the saved live round-7 blocker
// ROSTER_STRATEGIST_COMPARISON_INVALID:faction_card_instance:...): the
// strict subset cannot pattern-enforce the runtime-owned deterministic
// instance identities, so the comparison schema now publishes the exact
// per-kind instanceId formats ("<sideKey>-faction",
// "<sideKey>-tactical-<n>", "agent-unit-<n>", "<unitInstanceId>-composition",
// "<unitInstanceId>-upgrade-<n>") and the activation-order unit identity in
// field descriptions. The convention is general (fixed per component kind,
// never per value or roster); the runtime's binding validation stays
// byte-for-byte strict.

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  createStarcraftTmgOutputContractV1,
  assertStarcraftTmgOutputContractV1,
  outputContractRefStarcraftTmgV1,
  STARCRAFT_TMG_JSON_SCHEMA_SUBSET_VERSION,
} from "../structured-generation/output-contract-registry-v1.mjs";

export const ROSTER_STRATEGIST_OUTPUT_CONTRACT_SET_SCHEMA =
  "starcraft_tmg_roster_strategist_output_contract_set_v1";
export const ROSTER_STRATEGIST_OUTPUT_CONTRACT_SET_VERSION = "1.2.0";

const DELIBERATION_SCHEMA = "starcraft_tmg_roster_strategist_deliberation_v1";
const MAX_TEXT = 2_000;
const MAX_ID = 200;

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}

// ------------------------------------------------------------ schema atoms

const text = (minLength = 1, maxLength = MAX_TEXT, description = "") => ({
  type: "string", minLength, maxLength,
  ...(description ? { description } : {}),
});
const identifier = (minLength = 1) => text(minLength, MAX_ID);
const integer = (minimum, maximum, description = "") => ({
  type: "integer", minimum, maximum,
  ...(description ? { description } : {}),
});
// Domain-owned integer bounds (sub-slice 269.9; see the module header).
// 1,000,000,000 is the strict subset's widest expressible integer bound, so
// these atoms map the domain's safe-integer rules onto the schema layer:
// non-negative for resource/VP amounts and ratio fields (the laboratory and
// plan contracts reject negatives), positive for domain-positive fields
// (activation ordinals), signed for exact-sum inputs.
const DOMAIN_INTEGER_MAX = 1_000_000_000;
const domainNonNegativeInteger = (description = "") =>
  integer(0, DOMAIN_INTEGER_MAX, description);
const domainPositiveInteger = (description = "") =>
  integer(1, DOMAIN_INTEGER_MAX, description);
const domainSafeInteger = (description = "") =>
  integer(-DOMAIN_INTEGER_MAX, DOMAIN_INTEGER_MAX, description);
const stringList = (minItems, maxItems, itemMin = 1) => ({
  type: "array", minItems, maxItems,
  items: text(itemMin, MAX_ID),
});
const textList = (minItems, maxItems) => ({
  type: "array", minItems, maxItems,
  items: text(1, MAX_TEXT),
});
const closedObject = (properties, description = "") => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
  ...(description ? { description } : {}),
});
const envelope = (roundKind) => ({
  schemaVersion: {
    type: "string", minLength: DELIBERATION_SCHEMA.length,
    maxLength: DELIBERATION_SCHEMA.length, enum: [DELIBERATION_SCHEMA],
    description: "Request-owned constant; copy it verbatim from the request.",
  },
  roundKind: {
    type: "string", minLength: roundKind.length, maxLength: roundKind.length,
    enum: [roundKind],
    description: "Request-owned constant; copy it verbatim from the request.",
  },
});

// ------------------------------------------------------------- sub shapes

const SCORE_ROUTE = closedObject({
  routeKind: {
    type: "string", minLength: 4, maxLength: 32,
    enum: ["mission_marker_control", "attrition", "hybrid", "unknown"],
  },
  routeText: text(),
  scheduleStatus: {
    type: "string", minLength: 7, maxLength: 8,
    enum: ["declared", "unknown"],
  },
  targetVpSchedule: {
    type: "array", minItems: 0, maxItems: 32,
    items: closedObject({
      window: text(1, 64),
      plannedCumulativeVp: domainNonNegativeInteger(),
    }),
  },
  fallbackRouteText: text(),
}, "Public win route and scoring schedule.");

const DEPLOYMENT_CONCEPT = closedObject({
  deploymentConceptText: text(),
  activationOrderStatus: {
    type: "string", minLength: 7, maxLength: 8,
    enum: ["declared", "unknown"],
  },
  activationOrder: {
    type: "array", minItems: 0, maxItems: 32,
    items: closedObject({
      ordinal: domainPositiveInteger(),
      unitInstanceId: text(1, MAX_ID,
        "One of the selected candidate's deterministic unit instance ids "
          + "(\"agent-unit-<n>\", with n the 1-based position of the unit in "
          + "the candidate's units array); never a record key or an "
          + "invented name."),
      phase: {
        type: "string", minLength: 5, maxLength: 8,
        enum: ["movement", "assault", "combat"],
      },
    }),
  },
  reinforcementPolicyText: text(),
  threatTradeText: text(),
  objectiveControlText: text(),
}, "Public deployment, initiative and resource plan.");

const MATH_INPUTS = closedObject({
  mineralBudget: domainNonNegativeInteger(),
  mineralSpent: domainNonNegativeInteger(),
  vespeneSpent: domainNonNegativeInteger(),
  vespeneLimitNumerator: domainNonNegativeInteger(),
  vespeneLimitDenominator: domainNonNegativeInteger(),
  planned: {
    type: "array", minItems: 0, maxItems: 32,
    items: closedObject({
      window: text(1, 64),
      plannedCumulativeVp: domainNonNegativeInteger(),
    }),
  },
  projected: {
    type: "array", minItems: 0, maxItems: 32,
    items: closedObject({
      window: text(1, 64),
      cumulativeVp: domainNonNegativeInteger(),
    }),
  },
  values: {
    type: "array", minItems: 0, maxItems: 128,
    items: domainSafeInteger(),
  },
}, "Closed superset over every laboratory math kind; fields a kind does "
  + "not consume carry zero/empty placeholders and are dropped by the "
  + "runtime's kind-driven canonicalization before the laboratory call. "
  + "Integer bounds are the domain-owned safe-integer rules clipped to the "
  + "strict-subset ceiling; the placeholder zero denominator is dropped "
  + "before the laboratory, which owns the denominator >= 1 rule.");

const SCENARIO_SPEC = closedObject({
  kind: {
    type: "string", minLength: 0, maxLength: 32,
    enum: ["", "hypothetical_geometry", "rules_lifecycle"],
  },
  lifecycleSteps: integer(0, 8),
  phase: {
    type: "string", minLength: 0, maxLength: 8,
    enum: ["", "movement", "assault", "combat"],
  },
  activeSideKey: text(0, 64),
  isolateToPlacedPieces: { type: "boolean" },
  clearTerrain: { type: "boolean" },
  placements: {
    type: "array", minItems: 0, maxItems: 4,
    items: closedObject({
      pieceId: identifier(),
      xInches: integer(0, 1_000),
      yInches: integer(0, 1_000),
    }),
  },
}, "Advisory scenario branch on an isolated clone; hypothetical placements "
  + "claim no Rules legality.");

const FOLLOW_UP = closedObject({
  kind: {
    type: "string", minLength: 0, maxLength: 32,
    enum: ["", "probability", "spatial", "threat_exchange"],
  },
  attackerUnitId: text(0, MAX_ID),
  targetUnitId: text(0, MAX_ID),
  sampleBudget: integer(0, 100_000),
  seatKey: text(0, MAX_ID),
  intent: text(0, MAX_ID),
  subjectUnitIds: stringList(0, 24),
  targetIds: stringList(0, 24),
}, "Bounded follow-up query against the scenario branch state.");

const TOOL_REQUEST = closedObject({
  branchIdRef: text(0, MAX_ID,
    "needId of a prior scenario need whose branch state is the query base; "
      + "empty for the source state"),
  attackerUnitId: text(0, MAX_ID),
  targetUnitId: text(0, MAX_ID),
  seatKey: text(0, MAX_ID),
  intent: text(0, MAX_ID),
  subjectUnitIds: stringList(0, 24),
  targetIds: stringList(0, 24),
  sampleBudget: integer(0, 100_000),
  mathKind: {
    type: "string", minLength: 0, maxLength: 32,
    enum: ["", "budget_fit", "vp_schedule_delta", "integer_sum"],
  },
  inputs: MATH_INPUTS,
  spec: SCENARIO_SPEC,
  followUps: { type: "array", minItems: 0, maxItems: 4, items: FOLLOW_UP },
}, "Closed superset over every laboratory query family; the runtime "
  + "canonicalizes to exactly the fields the declared need kind consumes.");

// ----------------------------------------------------------- round schemas

const FOUNDATION_SCHEMA = closedObject({
  ...envelope("strategy_foundation"),
  scoreRoute: SCORE_ROUTE,
  opponentHypotheses: {
    type: "array", minItems: 1, maxItems: 8,
    items: closedObject({
      hypothesisId: identifier(),
      archetypeLabel: identifier(),
      hypothesisText: text(),
      confidence: {
        type: "string", minLength: 3, maxLength: 7,
        enum: ["unknown", "low", "medium", "high"],
      },
      expectedCounterTexts: textList(0, 32),
      ownCounterResponseIds: stringList(0, 32),
      falsificationText: text(),
    }),
  },
  counterResponses: {
    type: "array", minItems: 0, maxItems: 32,
    items: closedObject({
      responseId: identifier(),
      triggerText: text(),
      responseText: text(),
      linkedHypothesisIds: stringList(0, 32),
    }),
  },
  invalidationTriggers: {
    type: "array", minItems: 1, maxItems: 32,
    items: closedObject({
      triggerId: identifier(),
      observationKind: {
        type: "string", minLength: 7, maxLength: 32,
        enum: ["vp_deficit", "opponent_composition", "battlefield_event",
          "loss_budget", "unknown"],
      },
      triggerText: text(),
      revisionRequiredText: text(),
    }),
  },
  informationNeeds: {
    type: "array", minItems: 1, maxItems: 8,
    items: closedObject({
      needId: identifier(),
      kind: {
        type: "string", minLength: 4, maxLength: 32,
        enum: ["probability", "spatial", "math", "threat_exchange",
          "scenario"],
      },
      questionText: text(),
      toolRequest: TOOL_REQUEST,
    }),
  },
}, "Round 1 public strategy foundation.");

const PROPOSALS_SCHEMA = closedObject({
  ...envelope("candidate_proposals"),
  proposals: {
    type: "array", minItems: 2, maxItems: 4,
    items: closedObject({
      candidateId: identifier(),
      tacticalCardRecordKeys: stringList(0, 8),
      units: {
        type: "array", minItems: 1, maxItems: 24,
        items: closedObject({
          recordKey: identifier(),
          compositionKind: identifier(),
          upgrades: {
            type: "array", minItems: 0, maxItems: 8,
            items: closedObject({ upgradeName: identifier() }),
          },
        }),
      },
      rationaleText: text(),
    }),
  },
}, "Round 2 roster candidate proposals from the Rules-owned menu only.");

const COMPARISON_SCHEMA = closedObject({
  ...envelope("comparison_selection"),
  comparison: closedObject({
    basisTexts: textList(1, 32),
    tradeoffTexts: textList(0, 32),
    selectedCandidateId: identifier(),
  }),
  componentPurposes: {
    type: "array", minItems: 1, maxItems: 32,
    items: closedObject({
      componentKind: {
        type: "string", minLength: 4, maxLength: 32,
        enum: ["faction_card", "tactical_card", "unit", "composition",
          "upgrade"],
        description: "Component class; it fixes the required instanceId "
          + "format (see instanceId).",
      },
      recordKey: text(1, MAX_ID,
        "Rules-owned record key of the component, exactly as it appears in "
          + "the selected candidate; for composition and upgrade purposes "
          + "this is the owning unit's recordKey."),
      instanceId: text(1, MAX_ID,
        "Deterministic instance identity owned by the runtime; copy the "
          + "exact format fixed per componentKind, never invent a semantic "
          + "name: faction_card -> \"<sideKey>-faction\"; tactical_card -> "
          + "\"<sideKey>-tactical-<n>\" with n the 1-based position of "
          + "recordKey in the selected candidate's tacticalCardRecordKeys; "
          + "unit -> \"agent-unit-<n>\" with n the 1-based position of the "
          + "unit in the selected candidate's units array; composition -> "
          + "\"<unitInstanceId>-composition\"; upgrade -> "
          + "\"<unitInstanceId>-upgrade-<n>\" with n the 1-based position "
          + "of the upgrade in the owning unit's upgrades array."),
      publicPurposeText: text(),
      scoringRole: {
        type: "string", minLength: 4, maxLength: 32,
        enum: ["primary_scorer", "support", "counter", "flex", "unknown"],
      },
    }, "Public purpose binding for one roster component."),
  },
  deploymentConcept: DEPLOYMENT_CONCEPT,
  lossResourceBudget: closedObject({
    lossBudgetStatus: {
      type: "string", minLength: 7, maxLength: 8,
      enum: ["declared", "unknown"],
    },
    plannedLossBudget: {
      type: "array", minItems: 0, maxItems: 32,
      items: closedObject({
        resourceKind: text(1, 64),
        window: text(1, 64),
        plannedMaximumLoss: domainNonNegativeInteger(),
      }),
    },
  }),
  publicSummaryText: text(),
}, "Final round comparison, selection and public plan sections.");

const REVISION_SCHEMA = closedObject({
  ...envelope("revision"),
  publicSummaryText: text(),
  revisedScoreRoute: SCORE_ROUTE,
  revisedDeploymentConcept: DEPLOYMENT_CONCEPT,
}, "Revision round public sections; the runtime applies only the sections "
  + "named by the declared revision triggers.");

// -------------------------------------------------------------- contracts

const SCHEMAS_BY_ROUND_KIND = {
  strategy_foundation: {
    schemaName: "roster_strategy_foundation_v1", schema: FOUNDATION_SCHEMA },
  candidate_proposals: {
    schemaName: "roster_strategy_proposals_v1", schema: PROPOSALS_SCHEMA },
  comparison_selection: {
    schemaName: "roster_strategy_comparison_v1", schema: COMPARISON_SCHEMA },
  revision: {
    schemaName: "roster_strategy_revision_v1", schema: REVISION_SCHEMA },
};

const RUNTIME_MODULE_REF = "roster-strategist-runtime-v1";
const componentRef = (suffix) => Object.freeze({
  id: `${RUNTIME_MODULE_REF}.${suffix}`,
  version: ROSTER_STRATEGIST_OUTPUT_CONTRACT_SET_VERSION,
  hash: hashStarcraftTmgContract(
    `roster-strategist-output-contracts:${suffix}:v1`),
});

const CONTRACTS_BY_ROUND_KIND = Object.fromEntries(
  Object.entries(SCHEMAS_BY_ROUND_KIND).map(([roundKind, entry]) => [
    roundKind,
    createStarcraftTmgOutputContractV1({
      id: `ticket27.roster_strategist.round_output.${roundKind}.v1`,
      version: ROSTER_STRATEGIST_OUTPUT_CONTRACT_SET_VERSION,
      schemaName: entry.schemaName,
      providerSchema: entry.schema,
      modelOwnedFields: Object.keys(entry.schema.properties),
      hostOwnedFields: [],
      mapperRef: componentRef(`canonical_tool_request:${roundKind}`),
      semanticValidatorRef: componentRef(`validate_round_output:${roundKind}`),
      description: "Strict generation-side JSON schema for one Roster "
        + `Strategist ${roundKind} deliberation round. Binds field names, `
        + "types, bounds and enums only; never roster content or strategy. "
        + "The runtime's normalization boundary and full schema/Rules "
        + "validation still run on the decoded output.",
    }),
  ]));

const contractSetBody = {
  schema: ROSTER_STRATEGIST_OUTPUT_CONTRACT_SET_SCHEMA,
  version: ROSTER_STRATEGIST_OUTPUT_CONTRACT_SET_VERSION,
  schemaSubsetVersion: STARCRAFT_TMG_JSON_SCHEMA_SUBSET_VERSION,
  contracts: Object.fromEntries(Object.entries(CONTRACTS_BY_ROUND_KIND)
    .map(([roundKind, contract]) => [
      roundKind, {
        schemaName: contract.schemaName,
        outputContractRef: outputContractRefStarcraftTmgV1(contract),
      }])),
  invariants: {
    generationSideFieldSetEnforcement: true,
    schemaFieldSetsMatchRuntimeValidators: true,
    bindsOnlyFieldNamesTypesBoundsAndEnums: true,
    neverBindsRosterContentCandidateIdentityOrStrategy: true,
    placeholderFieldsNeverReachRulesOrToolReceipts: true,
    normalizationBoundaryStillRunsAfterDecoding: true,
    fullSchemaAndRulesValidationStillRunsAfterDecoding: true,
    neverInventsStrategyContent: true,
    neverWeakensLegality: true,
    trainingTruth: false,
  },
};
export const ROSTER_STRATEGIST_OUTPUT_CONTRACT_SET_V1 = freezeDeep({
  ...contractSetBody,
  contractSetHash: hashStarcraftTmgContract(contractSetBody),
});

export function rosterStrategistRoundOutputContractV1(roundKind) {
  const contract = CONTRACTS_BY_ROUND_KIND[String(roundKind || "")];
  if (!contract) {
    fail("ROSTER_STRATEGIST_OUTPUT_CONTRACT_UNKNOWN_ROUND", String(roundKind));
  }
  return contract;
}

export function rosterStrategistRoundOutputContractRefV1(roundKind) {
  return outputContractRefStarcraftTmgV1(
    rosterStrategistRoundOutputContractV1(roundKind));
}

export function verifyRosterStrategistOutputContractSetV1(value) {
  if (!object(value)
    || value.schema !== ROSTER_STRATEGIST_OUTPUT_CONTRACT_SET_SCHEMA
    || value.version !== ROSTER_STRATEGIST_OUTPUT_CONTRACT_SET_VERSION
    || value.schemaSubsetVersion !== STARCRAFT_TMG_JSON_SCHEMA_SUBSET_VERSION
    || value.contractSetHash !== hashStarcraftTmgContract(
      Object.fromEntries(Object.entries(value)
        .filter(([key]) => key !== "contractSetHash")))
    || value.contractSetHash
      !== ROSTER_STRATEGIST_OUTPUT_CONTRACT_SET_V1.contractSetHash
    || value.invariants?.generationSideFieldSetEnforcement !== true
    || value.invariants?.neverInventsStrategyContent !== true
    || value.invariants?.neverWeakensLegality !== true
    || value.invariants?.normalizationBoundaryStillRunsAfterDecoding !== true) {
    fail("ROSTER_STRATEGIST_OUTPUT_CONTRACT_SET_INVALID");
  }
  for (const roundKind of Object.keys(SCHEMAS_BY_ROUND_KIND)) {
    const contract = rosterStrategistRoundOutputContractV1(roundKind);
    assertStarcraftTmgOutputContractV1(contract);
    const bound = value.contracts?.[roundKind];
    if (bound?.schemaName !== contract.schemaName
      || bound?.outputContractRef?.hash !== contract.contractHash) {
      fail("ROSTER_STRATEGIST_OUTPUT_CONTRACT_SET_INVALID", roundKind);
    }
  }
  return true;
}
