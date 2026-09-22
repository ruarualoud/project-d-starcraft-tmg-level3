// Ticket 27 / Slices 269-270 — typed public-output normalization boundary.
//
// One general boundary between a deliberation Provider's raw public output
// and the strategist's strict schema/Rules validation. It closes the saved
// live round-4 alias-drift blocker
// (ROSTER_STRATEGIST_FOUNDATION_INVALID:hypothesis,implication,observable)
// through an explicit, versioned alias registry instead of per-attempt
// prompt patches.
//
// Admitted operations, and only these:
//   1. Unwrap one admitted transport envelope (a single-channel
//      `channels.roster_strategy` wrapper) — transport shape, no content.
//   2. Stamp request-owned constants (`schemaVersion`, `roundKind`) when both
//      are absent and every present top-level key is a declared public field
//      of the round. Constants carry no strategy content; the request owns
//      them.
//   3. Rename admitted, semantically equivalent public field aliases to
//      their contracted field names (registry below). Values move unchanged.
//
// Hard prohibitions: never invent strategy, never fill missing semantic
// content, never drop or merge keys (an alias/canonical conflict is left
// untouched so strict validation fails closed), never convert value types,
// never weaken legality, never special-case one candidate or one Provider.
// Full existing schema/Rules validation always runs after normalization;
// this boundary never bypasses or replaces it. Every normalization emits a
// hashed provenance receipt recording each admitted operation.

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

export const ROSTER_STRATEGIST_OUTPUT_NORMALIZATION_MODULE =
  "packages/roster-strategist/public-output-normalization-v1.mjs";
export const ROSTER_STRATEGIST_OUTPUT_ALIAS_REGISTRY_SCHEMA =
  "starcraft_tmg_roster_strategist_output_alias_registry_v1";
export const ROSTER_STRATEGIST_OUTPUT_ALIAS_REGISTRY_VERSION = "1.0.0";
export const ROSTER_STRATEGIST_OUTPUT_NORMALIZATION_RECEIPT_SCHEMA =
  "starcraft_tmg_roster_strategist_output_normalization_receipt_v1";

const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const OPERATION_KINDS = new Set([
  "transport_envelope_unwrap",
  "request_owned_constant_stamp",
  "admitted_alias_rename",
]);

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
function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

// -------------------------------------------------------- alias registry
//
// Explicit and versioned. An alias is admitted only when it is a naming
// variant of the contracted public field with the same semantics and value
// shape; renaming moves the value unchanged. Registry contexts are bound to
// one deliberation round so an admitted short name can never leak into a
// round where it would be ambiguous. New aliases require a new registry
// version, never a silent edit.

const DECLARED_PUBLIC_FIELDS_BY_ROUND_KIND = {
  // Declared field sets track the strict output contract set (v1.3.0 adds
  // scoreRouteAuthority to the foundation and resourceUtilization to the
  // comparison; sub-slices 269.13/269.14). Field names only — never content.
  strategy_foundation: ["scoreRoute", "scoreRouteAuthority",
    "opponentHypotheses", "counterResponses",
    "invalidationTriggers", "informationNeeds"],
  candidate_proposals: ["proposals"],
  comparison_selection: ["comparison", "componentPurposes",
    "deploymentConcept", "resourceUtilization", "lossResourceBudget",
    "publicSummaryText"],
  revision: ["publicSummaryText", "revisedScoreRoute",
    "revisedDeploymentConcept"],
};

const ALIAS_CONTEXTS = [
  {
    contextId: "strategy_foundation.opponentHypotheses[]",
    roundKind: "strategy_foundation",
    arrayField: "opponentHypotheses",
    aliases: {
      id: "hypothesisId",
      archetype: "archetypeLabel",
      hypothesis: "hypothesisText",
      expectedCounters: "expectedCounterTexts",
      counterResponseIds: "ownCounterResponseIds",
      falsification: "falsificationText",
      observable: "falsificationText",
    },
  },
  {
    contextId: "strategy_foundation.counterResponses[]",
    roundKind: "strategy_foundation",
    arrayField: "counterResponses",
    aliases: {
      id: "responseId",
      trigger: "triggerText",
      response: "responseText",
      hypothesisIds: "linkedHypothesisIds",
    },
  },
  {
    contextId: "strategy_foundation.invalidationTriggers[]",
    roundKind: "strategy_foundation",
    arrayField: "invalidationTriggers",
    aliases: {
      id: "triggerId",
      trigger: "triggerText",
      revisionRequired: "revisionRequiredText",
    },
  },
  {
    contextId: "strategy_foundation.informationNeeds[]",
    roundKind: "strategy_foundation",
    arrayField: "informationNeeds",
    aliases: {
      id: "needId",
      question: "questionText",
    },
  },
];

const ADMITTED_TRANSPORT_ENVELOPES = [
  {
    envelopeId: "single_channels_wrapper",
    wrapperKey: "channels",
    channelKey: "roster_strategy",
  },
];

const registryBody = {
  schema: ROSTER_STRATEGIST_OUTPUT_ALIAS_REGISTRY_SCHEMA,
  version: ROSTER_STRATEGIST_OUTPUT_ALIAS_REGISTRY_VERSION,
  requestOwnedConstantFields: ["schemaVersion", "roundKind"],
  declaredPublicFieldsByRoundKind: DECLARED_PUBLIC_FIELDS_BY_ROUND_KIND,
  admittedTransportEnvelopes: ADMITTED_TRANSPORT_ENVELOPES,
  contexts: ALIAS_CONTEXTS,
  invariants: {
    renamesOnlyAdmittedAliases: true,
    unwrapsOnlyAdmittedTransportEnvelopes: true,
    stampsOnlyAbsentRequestOwnedConstants: true,
    neverInventsStrategyContent: true,
    neverFillsMissingSemanticContent: true,
    neverDropsOrMergesKeys: true,
    neverConvertsValueTypes: true,
    neverWeakensLegality: true,
    neverSpecialCasesOneCandidateOrProvider: true,
    fullSchemaAndRulesValidationRunsAfterNormalization: true,
  },
};
export const ROSTER_STRATEGIST_OUTPUT_ALIAS_REGISTRY_V1 = freezeDeep({
  ...registryBody,
  registryHash: hashStarcraftTmgContract(registryBody),
});

export function verifyRosterStrategistOutputAliasRegistryV1(value) {
  if (!object(value)
    || value.schema !== ROSTER_STRATEGIST_OUTPUT_ALIAS_REGISTRY_SCHEMA
    || value.version !== ROSTER_STRATEGIST_OUTPUT_ALIAS_REGISTRY_VERSION
    || value.registryHash !== hashStarcraftTmgContract(
      without(value, ["registryHash"]))
    || !Array.isArray(value.contexts) || value.contexts.length < 1
    || value.invariants?.neverFillsMissingSemanticContent !== true
    || value.invariants?.neverWeakensLegality !== true
    || value.invariants?.fullSchemaAndRulesValidationRunsAfterNormalization
      !== true) {
    fail("ROSTER_OUTPUT_ALIAS_REGISTRY_INVALID");
  }
  return true;
}

// ------------------------------------------------------------ boundary

function renameKeyPreservingOrder(entry, alias, canonical) {
  const renamed = {};
  for (const [key, value] of Object.entries(entry)) {
    renamed[key === alias ? canonical : key] = value;
  }
  return renamed;
}

// Normalizes one deliberation round's raw public output. Returns the
// (possibly unchanged) output plus a hashed provenance receipt. The caller
// must still run the full strict schema/Rules validation on the result; an
// identity normalization (no admitted operation matched) is the common case
// for an already-contracted answer and for any answer this boundary does not
// understand — unknown shapes are passed through untouched so validation
// fails closed on them.
export function normalizeRosterStrategistPublicOutputV1(input = {}) {
  const request = object(input.request) ? input.request : {};
  const roundKind = String(request.roundKind || "");
  const schemaVersion = String(request.schemaVersion || "");
  const declaredFields = DECLARED_PUBLIC_FIELDS_BY_ROUND_KIND[roundKind] || [];
  const operations = [];
  let output = clone(input.output);

  // 1. Transport envelope unwrap (at most one admitted layer).
  if (object(output)) {
    for (const envelope of ADMITTED_TRANSPORT_ENVELOPES) {
      const wrapperKeys = Object.keys(output);
      const wrapper = output[envelope.wrapperKey];
      if (wrapperKeys.length === 1 && wrapperKeys[0] === envelope.wrapperKey
        && object(wrapper)
        && Object.keys(wrapper).length === 1
        && object(wrapper[envelope.channelKey])) {
        output = wrapper[envelope.channelKey];
        operations.push(freezeDeep({
          kind: "transport_envelope_unwrap",
          envelopeId: envelope.envelopeId,
          path: `${envelope.wrapperKey}.${envelope.channelKey}`,
        }));
        break;
      }
    }
  }

  // 2. Request-owned constant stamping. Only when both constants are absent
  // and every present top-level key is a declared public field of the round:
  // an otherwise-complete answer that dropped the two constant envelope
  // fields. Wrong or conflicting constant values are never corrected.
  if (object(output) && schemaVersion && roundKind
    && output.schemaVersion === undefined && output.roundKind === undefined) {
    const keys = Object.keys(output);
    if (keys.length > 0 && keys.every((key) => declaredFields.includes(key))) {
      output = { schemaVersion, roundKind, ...output };
      for (const field of ["schemaVersion", "roundKind"]) {
        operations.push(freezeDeep({
          kind: "request_owned_constant_stamp",
          path: field,
          source: "round_request",
        }));
      }
    }
  }

  // 3. Admitted alias renames. A rename happens only when the alias is
  // present and the canonical field is absent; a present canonical field (or
  // a second alias already renamed to it) leaves the extra key in place so
  // strict validation fails closed on the conflict. Values move unchanged.
  if (object(output)) {
    for (const context of ALIAS_CONTEXTS) {
      if (context.roundKind !== roundKind) continue;
      const list = output[context.arrayField];
      if (!Array.isArray(list)) continue;
      for (let index = 0; index < list.length; index += 1) {
        let entry = list[index];
        if (!object(entry)) continue;
        for (const [alias, canonical] of Object.entries(context.aliases)) {
          if (entry[alias] !== undefined && entry[canonical] === undefined) {
            entry = renameKeyPreservingOrder(entry, alias, canonical);
            operations.push(freezeDeep({
              kind: "admitted_alias_rename",
              path: `${context.arrayField}[${index}].${alias}`,
              contextId: context.contextId,
              from: alias,
              to: canonical,
            }));
          }
        }
        list[index] = entry;
      }
    }
  }

  const receiptBody = {
    schema: ROSTER_STRATEGIST_OUTPUT_NORMALIZATION_RECEIPT_SCHEMA,
    registrySchema: ROSTER_STRATEGIST_OUTPUT_ALIAS_REGISTRY_SCHEMA,
    registryVersion: ROSTER_STRATEGIST_OUTPUT_ALIAS_REGISTRY_VERSION,
    registryHash: ROSTER_STRATEGIST_OUTPUT_ALIAS_REGISTRY_V1.registryHash,
    roundKind: roundKind || "unknown",
    inputHash: hashStarcraftTmgContract(input.output ?? null),
    outputHash: hashStarcraftTmgContract(output ?? null),
    changed: operations.length > 0,
    operations,
    semanticContentModified: false,
    missingSemanticContentFilled: false,
    keysDroppedOrMerged: false,
    valueTypesConverted: false,
    legalityWeakened: false,
    candidateSpecialCased: false,
    fullSchemaAndRulesValidationRunsAfterNormalization: true,
    trainingTruth: false,
  };
  return freezeDeep({
    output,
    receipt: freezeDeep({
      ...receiptBody,
      receiptHash: hashStarcraftTmgContract(receiptBody),
    }),
  });
}

export function verifyRosterStrategistOutputNormalizationReceiptV1(value) {
  if (!object(value)
    || value.schema !== ROSTER_STRATEGIST_OUTPUT_NORMALIZATION_RECEIPT_SCHEMA
    || value.receiptHash !== hashStarcraftTmgContract(
      without(value, ["receiptHash"]))
    || value.registrySchema !== ROSTER_STRATEGIST_OUTPUT_ALIAS_REGISTRY_SCHEMA
    || value.registryVersion !== ROSTER_STRATEGIST_OUTPUT_ALIAS_REGISTRY_VERSION
    || value.registryHash
      !== ROSTER_STRATEGIST_OUTPUT_ALIAS_REGISTRY_V1.registryHash
    || !HASH_PATTERN.test(String(value.inputHash || ""))
    || !HASH_PATTERN.test(String(value.outputHash || ""))
    || !Array.isArray(value.operations)
    || value.operations.some((operation) => (
      !object(operation) || !OPERATION_KINDS.has(operation.kind)))
    || value.changed !== (value.operations.length > 0)
    || value.semanticContentModified !== false
    || value.missingSemanticContentFilled !== false
    || value.keysDroppedOrMerged !== false
    || value.valueTypesConverted !== false
    || value.legalityWeakened !== false
    || value.candidateSpecialCased !== false
    || value.fullSchemaAndRulesValidationRunsAfterNormalization !== true
    || value.trainingTruth !== false) {
    fail("ROSTER_OUTPUT_NORMALIZATION_RECEIPT_INVALID");
  }
  return true;
}
