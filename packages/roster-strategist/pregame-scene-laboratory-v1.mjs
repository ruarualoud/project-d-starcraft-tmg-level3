import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  estimateStarcraftTmgAttackProbabilityV1,
  estimateStarcraftTmgFireZoneExchangeV1,
} from "../online-agent-session/combat-estimation-runtime-v1.mjs";
import { buildStarcraftTmgTacticalRelationshipGraphV1 } from
  "../online-agent-session/tactical-relationship-graph-v1.mjs";
import { verifyOfficialArmyBuilderQueryPortDescriptorV1 } from
  "./army-builder-query-port-v1.mjs";

export const PREGAME_SCENE_LABORATORY_MODULE =
  "packages/roster-strategist/pregame-scene-laboratory-v1.mjs";
export const PREGAME_SCENE_LABORATORY_VERSION = "1.0.0";

export const PREGAME_LAB_DESCRIPTOR_SCHEMA =
  "starcraft_tmg_pregame_scene_laboratory_descriptor_v1";
export const PREGAME_LAB_SPATIAL_RECEIPT_SCHEMA =
  "starcraft_tmg_pregame_lab_spatial_receipt_v1";
export const PREGAME_LAB_PROBABILITY_RECEIPT_SCHEMA =
  "starcraft_tmg_pregame_lab_probability_receipt_v1";
export const PREGAME_LAB_MATH_RECEIPT_SCHEMA =
  "starcraft_tmg_pregame_lab_math_receipt_v1";
export const PREGAME_LAB_THREAT_EXCHANGE_RECEIPT_SCHEMA =
  "starcraft_tmg_pregame_lab_threat_exchange_receipt_v1";
export const PREGAME_LAB_SCENARIO_BRANCH_RECEIPT_SCHEMA =
  "starcraft_tmg_pregame_lab_scenario_branch_receipt_v1";
export const PREGAME_LAB_SAME_STATE_AB_RECEIPT_SCHEMA =
  "starcraft_tmg_pregame_lab_same_state_ab_receipt_v1";
export const PREGAME_LAB_MUTATION_ZERO_PROOF_SCHEMA =
  "starcraft_tmg_pregame_lab_mutation_zero_proof_v1";

const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const SIDE_KEY_PATTERN = /^player[12]$/u;
const MAX_RELATIONSHIPS_PER_RECEIPT = 16;
const MAX_PLACEMENTS_PER_BRANCH = 4;
const MAX_LIFECYCLE_STEPS_PER_BRANCH = 8;
const MAX_BRANCHES = 16;
const MIN_SAMPLE_BUDGET = 36;
const MAX_SAMPLE_BUDGET = 216;
const DEFAULT_SAMPLE_BUDGET = 36;
const MATH_KINDS = new Set(["budget_fit", "vp_schedule_delta", "integer_sum"]);
const ACTIVATION_PHASES = new Set(["movement", "assault", "combat"]);

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
function nonEmpty(value, code) {
  const text = String(value || "").trim();
  if (!text) fail(code);
  return text;
}
function hash64(value, code) {
  const text = String(value || "");
  if (!HASH_PATTERN.test(text)) fail(code);
  return text;
}
function integer(value, code) {
  const number = Number(value);
  if (!Number.isSafeInteger(number)) fail(code);
  return number;
}
function finiteNumber(value, code) {
  const number = Number(value);
  if (!Number.isFinite(number)) fail(code);
  return number;
}
function hashedReceipt(body) {
  return freezeDeep({ ...body, receiptHash: hashStarcraftTmgContract(body) });
}
function jsonBytes(value) {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

function verifyReceipt(value, schema, flags, code) {
  if (!object(value) || value.schema !== schema
    || value.receiptHash !== hashStarcraftTmgContract(without(value, ["receiptHash"]))) {
    fail(code);
  }
  for (const [key, expected] of Object.entries(flags)) {
    if (value[key] !== expected) fail(code, key);
  }
  if (!HASH_PATTERN.test(String(value.sourceStateHash || ""))
    || !HASH_PATTERN.test(String(value.baseStateHash || ""))) {
    fail(code, "state_binding");
  }
  return true;
}

const COMMON_FLAGS = Object.freeze({
  unknownNotZero: true,
  mutatesSourceState: false,
  hostPreferenceWeightsApplied: false,
  providerCalls: 0,
  trainingTruth: false,
});

export function createPregameSceneLaboratoryV1(input = {}) {
  if (!object(input)) fail("PREGAME_LAB_INVALID");
  const laboratoryId = nonEmpty(input.laboratoryId || "pregame-scene-laboratory-v1",
    "PREGAME_LAB_INVALID");
  const sourceState = input.sourceState;
  if (!object(sourceState) || !object(sourceState.board)
    || !Array.isArray(sourceState.pieces)) {
    fail("PREGAME_LAB_SOURCE_STATE_INVALID");
  }
  const rulesRuntime = input.rulesRuntime;
  if (typeof rulesRuntime?.enumerate !== "function"
    || typeof rulesRuntime?.apply !== "function"
    || !HASH_PATTERN.test(String(rulesRuntime?.descriptor?.runtimeHash || ""))) {
    fail("PREGAME_LAB_RULES_RUNTIME_INVALID");
  }
  const armyBuilderPort = input.armyBuilderPort;
  if (typeof armyBuilderPort?.evaluateRosterCandidate !== "function"
    || typeof armyBuilderPort?.portDescriptor !== "function") {
    fail("PREGAME_LAB_BUILDER_PORT_INVALID");
  }
  const portDescriptor = armyBuilderPort.portDescriptor();
  verifyOfficialArmyBuilderQueryPortDescriptorV1(portDescriptor);
  const sourceRoomRef = input.sourceRoomRef === undefined
    || input.sourceRoomRef === null ? null : freezeDeep({
      roomId: nonEmpty(input.sourceRoomRef?.roomId, "PREGAME_LAB_ROOM_REF_INVALID"),
      stateRevision: integer(input.sourceRoomRef?.stateRevision ?? 0,
        "PREGAME_LAB_ROOM_REF_INVALID"),
    });
  const matchBinding = input.matchBinding === undefined
    ? null : clone(input.matchBinding);

  const sourceStateHash = hashStarcraftTmgContract(sourceState);
  const builderBundleHash = portDescriptor.unitCompositionUpgradeDataBundleHash;
  const rulesRuntimeHash = rulesRuntime.descriptor.runtimeHash;

  const descriptorBody = {
    schema: PREGAME_LAB_DESCRIPTOR_SCHEMA,
    laboratoryId,
    version: PREGAME_SCENE_LABORATORY_VERSION,
    sourceStateHash,
    sourceRoomRef,
    builderBundleHash,
    portDescriptorHash: portDescriptor.descriptorHash,
    rulesRuntimeHash,
    readOnly: true,
    mutatesRoomState: false,
    mutatesBuilderState: false,
    mutatesSourceData: false,
    reimplementsRules: false,
    resultsBoundToSourceState: true,
    unknownStaysUnknown: true,
    hostPreferenceWeightsApplied: false,
    sameStateABComparisonSupported: true,
    scenarioBranchesOperateOnClonesOnly: true,
    hypotheticalPlacementsAreAdvisoryNotRulesLegality: true,
    providerCalls: 0,
    trainingTruth: false,
  };
  const descriptor = freezeDeep({ ...descriptorBody,
    descriptorHash: hashStarcraftTmgContract(descriptorBody) });

  const branches = new Map();
  const receiptLog = [];
  let operationCount = 0;

  function sharedFields() {
    return {
      laboratoryId,
      laboratoryVersion: PREGAME_SCENE_LABORATORY_VERSION,
      sourceStateHash,
      sourceRoomRef,
      builderBundleHash,
      rulesRuntimeHash,
      ...COMMON_FLAGS,
    };
  }

  function resolveBaseState(base) {
    if (base === undefined || base === null || base.kind === "source") {
      return { state: sourceState, baseStateHash: sourceStateHash };
    }
    if (base.kind === "branch") {
      const branchStateHash = hash64(base.branchStateHash, "PREGAME_LAB_BASE_INVALID");
      const branch = branches.get(branchStateHash);
      if (!branch) fail("PREGAME_LAB_BRANCH_UNKNOWN", branchStateHash);
      return { state: branch.state, baseStateHash: branchStateHash };
    }
    fail("PREGAME_LAB_BASE_INVALID");
  }

  function noteOperation(receipt) {
    operationCount += 1;
    receiptLog.push(receipt.receiptHash);
    return receipt;
  }

  function unknownReceipt(schema, idField, idValue, baseStateHash, unknownReason,
    extra = {}) {
    return hashedReceipt({
      schema,
      [idField]: idValue,
      ...sharedFields(),
      baseStateHash,
      resultStatus: "unknown",
      unknownReason: nonEmpty(unknownReason, "PREGAME_LAB_UNKNOWN_REASON"),
      ...extra,
    });
  }

  function summarizeRelationship(relationship) {
    const threats = relationship.threats;
    const threatsJson = jsonBytes(threats ?? null);
    return freezeDeep({
      edgeId: relationship.edgeId,
      fromUnitId: relationship.fromUnitId,
      toUnitId: relationship.toUnitId,
      relation: relationship.relation,
      nearestPhysicalEdges: clone(relationship.nearestPhysicalEdges ?? null),
      engaged: relationship.engagement?.engaged ?? null,
      lineOfSight: {
        assessedModelPairCount:
          relationship.lineOfSight?.assessedModelPairCount ?? null,
        visibleModelPairCount:
          relationship.lineOfSight?.visibleModelPairCount ?? null,
      },
      threatsSummary: threatsJson <= 8192 ? clone(threats ?? null) : null,
      threatsByteCount: threatsJson,
      relationshipHash: hashStarcraftTmgContract(relationship),
    });
  }

  function querySpatial(query = {}) {
    const queryId = nonEmpty(query.queryId, "PREGAME_LAB_QUERY_ID_REQUIRED");
    const seatKey = String(query.seatKey || "");
    if (!SIDE_KEY_PATTERN.test(seatKey)) fail("PREGAME_LAB_SEAT_INVALID", seatKey);
    const { state, baseStateHash } = resolveBaseState(query.base);
    const working = clone(state);
    const intent = String(query.intent || "threat_scan");
    const graph = buildStarcraftTmgTacticalRelationshipGraphV1({
      state: working,
      seatKey,
      request: {
        intent,
        maximumRelations: Number(query.maximumRelations || 16),
        ...(Array.isArray(query.subjectUnitIds)
          ? { subjectUnitIds: [...query.subjectUnitIds] } : {}),
        ...(Array.isArray(query.targetIds)
          ? { targetIds: [...query.targetIds] } : {}),
      },
    });
    const relationships = graph.relationships || [];
    if (relationships.length === 0) {
      return noteOperation(unknownReceipt(PREGAME_LAB_SPATIAL_RECEIPT_SCHEMA,
        "queryId", queryId, baseStateHash, "no_active_relationships_in_base_state",
        {
          intent,
          seatKey,
          relationshipGraphHash: graph.relationshipGraphHash,
          relationships: [],
        }));
    }
    return noteOperation(hashedReceipt({
      schema: PREGAME_LAB_SPATIAL_RECEIPT_SCHEMA,
      queryId,
      ...sharedFields(),
      baseStateHash,
      resultStatus: "ok",
      unknownReason: null,
      intent,
      seatKey,
      relationshipGraphHash: graph.relationshipGraphHash,
      precisionPolicy: clone(graph.precisionPolicy ?? null),
      relationships: relationships.slice(0, MAX_RELATIONSHIPS_PER_RECEIPT)
        .map(summarizeRelationship),
      relationshipCount: relationships.length,
      truncated: relationships.length > MAX_RELATIONSHIPS_PER_RECEIPT,
    }));
  }

  function findRangedDomain(state, attackerUnitId, targetUnitId) {
    const legal = rulesRuntime.enumerate(state, {
      sideKey: state.activeSideKey || state.firstPlayerSideKey,
      includeDisabled: false,
    });
    return (legal.parameterDomains || []).find((entry) => {
      const domain = entry?.sourceDomain || entry;
      return domain?.pieceId === attackerUnitId
        && domain?.parameterSchema?.targetUnitId?.enum?.includes(targetUnitId);
    }) || null;
  }

  function queryProbability(query = {}) {
    const queryId = nonEmpty(query.queryId, "PREGAME_LAB_QUERY_ID_REQUIRED");
    const attackerUnitId = nonEmpty(query.attackerUnitId,
      "PREGAME_LAB_PROBABILITY_ATTACKER_REQUIRED");
    const targetUnitId = nonEmpty(query.targetUnitId,
      "PREGAME_LAB_PROBABILITY_TARGET_REQUIRED");
    const sampleBudget = Math.max(MIN_SAMPLE_BUDGET,
      Math.min(MAX_SAMPLE_BUDGET,
        Number(query.sampleBudget || DEFAULT_SAMPLE_BUDGET)));
    const { state, baseStateHash } = resolveBaseState(query.base);
    const working = clone(state);
    const domain = findRangedDomain(working, attackerUnitId, targetUnitId);
    if (!domain) {
      return noteOperation(unknownReceipt(PREGAME_LAB_PROBABILITY_RECEIPT_SCHEMA,
        "queryId", queryId, baseStateHash,
        "no_current_legal_ranged_domain_for_attacker_target_pair",
        {
          attackerUnitId,
          targetUnitId,
          estimate: null,
        }));
    }
    let estimate;
    try {
      estimate = estimateStarcraftTmgAttackProbabilityV1({
        state: working,
        domain,
        parameters: { targetUnitId },
        sampleBudget,
      });
    } catch (error) {
      return noteOperation(unknownReceipt(PREGAME_LAB_PROBABILITY_RECEIPT_SCHEMA,
        "queryId", queryId, baseStateHash,
        `estimation_unavailable:${String(error?.message || error).slice(0, 120)}`,
        {
          attackerUnitId,
          targetUnitId,
          estimate: null,
        }));
    }
    const outcomes = estimate.outcomes || {};
    return noteOperation(hashedReceipt({
      schema: PREGAME_LAB_PROBABILITY_RECEIPT_SCHEMA,
      queryId,
      ...sharedFields(),
      baseStateHash,
      resultStatus: "ok",
      unknownReason: null,
      attackerUnitId,
      targetUnitId,
      estimate: {
        estimateHash: hash64(estimate.estimateHash,
          "PREGAME_LAB_PROBABILITY_ESTIMATE_INVALID"),
        domainId: estimate.domainId,
        weaponName: estimate.weaponName ?? null,
        chanceCount: estimate.chance?.count ?? null,
        sampleBudget,
        expectedDamage: outcomes.expectedDamage ?? null,
        expectedCasualties: outcomes.expectedCasualties ?? null,
        lossStateCount: Array.isArray(outcomes.lossStateDistribution)
          ? outcomes.lossStateDistribution.length : null,
        currentSupplyBefore: outcomes.currentSupplyBefore ?? null,
        reactionWindowCount: Array.isArray(estimate.reactionOpportunitySet?.windows)
          ? estimate.reactionOpportunitySet.windows.length : null,
        rulesMechanicsPerOutcome: estimate.rulesMechanicsPerOutcome === true,
        precision: estimate.precision ?? null,
        uncertainty: clone(estimate.uncertainty ?? null),
        assumptions: clone(estimate.assumptions ?? null),
      },
    }));
  }

  function queryThreatExchange(query = {}) {
    const queryId = nonEmpty(query.queryId, "PREGAME_LAB_QUERY_ID_REQUIRED");
    const seatKey = String(query.seatKey || "");
    if (!SIDE_KEY_PATTERN.test(seatKey)) fail("PREGAME_LAB_SEAT_INVALID", seatKey);
    const sampleBudget = Math.max(MIN_SAMPLE_BUDGET,
      Math.min(MAX_SAMPLE_BUDGET,
        Number(query.sampleBudget || DEFAULT_SAMPLE_BUDGET)));
    const { state, baseStateHash } = resolveBaseState(query.base);
    const working = clone(state);
    const legal = rulesRuntime.enumerate(working, {
      sideKey: seatKey,
      includeDisabled: false,
    });
    const exchange = estimateStarcraftTmgFireZoneExchangeV1({
      state: working,
      seatKey,
      currentLegalSpaceDomains: legal.parameterDomains || [],
      request: {
        maximumRelations: Number(query.maximumRelations || 16),
        sampleBudget,
        ...(Number.isSafeInteger(Number(query.maximumAttacks))
          ? { maximumAttacks: Number(query.maximumAttacks) } : {}),
      },
    });
    if (exchange.comparisonPolicy?.unknownValuesNeverPromotedToZero !== true) {
      fail("PREGAME_LAB_THREAT_EXCHANGE_POLICY_DRIFT");
    }
    return noteOperation(hashedReceipt({
      schema: PREGAME_LAB_THREAT_EXCHANGE_RECEIPT_SCHEMA,
      queryId,
      ...sharedFields(),
      baseStateHash,
      resultStatus: "ok",
      unknownReason: null,
      seatKey,
      exchange: {
        estimateHash: hash64(exchange.estimateHash,
          "PREGAME_LAB_THREAT_EXCHANGE_INVALID"),
        currentRelationshipGraphHash: exchange.currentRelationshipGraphHash,
        attackEstimateCount: (exchange.attackEstimates || []).length,
        attackEstimateFailureCount: (exchange.attackEstimateFailures || []).length,
        alternatives: (exchange.alternatives || []).map((alternative) => ({
          kind: alternative.kind,
          status: alternative.status,
          expectedDamageDealt: alternative.expectedDamageDealt ?? null,
          expectedDamageReceived: alternative.expectedDamageReceived ?? null,
          expectedCasualtiesDealt: alternative.expectedCasualtiesDealt ?? null,
          expectedCasualtiesReceived: alternative.expectedCasualtiesReceived ?? null,
          mayBeRankedAsKnownValue: alternative.mayBeRankedAsKnownValue === true,
          receivedOutcomeUnknownReason:
            alternative.receivedOutcomeUnknownReason ?? null,
        })),
        unknownValuesNeverPromotedToZero: true,
        opponentReturnFirePolicy:
          exchange.comparisonPolicy?.opponentReturnFire ?? null,
      },
    }));
  }

  function queryMath(query = {}) {
    const queryId = nonEmpty(query.queryId, "PREGAME_LAB_QUERY_ID_REQUIRED");
    const mathKind = nonEmpty(query.mathKind, "PREGAME_LAB_MATH_KIND_REQUIRED");
    if (!MATH_KINDS.has(mathKind)) fail("PREGAME_LAB_MATH_KIND_UNKNOWN", mathKind);
    const { baseStateHash } = resolveBaseState(query.base);
    const inputs = object(query.inputs) ? clone(query.inputs) : fail("PREGAME_LAB_MATH_INPUTS_INVALID");
    let result;
    if (mathKind === "budget_fit") {
      const mineralBudget = integer(inputs.mineralBudget, "PREGAME_LAB_MATH_INPUTS_INVALID");
      const mineralSpent = integer(inputs.mineralSpent, "PREGAME_LAB_MATH_INPUTS_INVALID");
      const vespeneSpent = integer(inputs.vespeneSpent, "PREGAME_LAB_MATH_INPUTS_INVALID");
      const numerator = integer(inputs.vespeneLimitNumerator, "PREGAME_LAB_MATH_INPUTS_INVALID");
      const denominator = integer(inputs.vespeneLimitDenominator, "PREGAME_LAB_MATH_INPUTS_INVALID");
      if (denominator < 1) fail("PREGAME_LAB_MATH_INPUTS_INVALID", "denominator");
      result = {
        mineralBudget,
        mineralSpent,
        mineralRemaining: mineralBudget - mineralSpent,
        mineralWithinBudget: mineralSpent <= mineralBudget,
        vespeneSpent,
        vespeneLimit: {
          numerator: mineralBudget * numerator,
          denominator,
        },
        vespeneWithinLimit: vespeneSpent * denominator <= mineralBudget * numerator,
        exactIntegerArithmetic: true,
        unspentResourceDisposition: "lost",
      };
    } else if (mathKind === "vp_schedule_delta") {
      const planned = Array.isArray(inputs.planned) ? inputs.planned : fail("PREGAME_LAB_MATH_INPUTS_INVALID");
      const projected = Array.isArray(inputs.projected) ? inputs.projected : fail("PREGAME_LAB_MATH_INPUTS_INVALID");
      const projectedByWindow = new Map(projected.map((entry) => [
        nonEmpty(entry?.window, "PREGAME_LAB_MATH_INPUTS_INVALID"),
        integer(entry?.cumulativeVp, "PREGAME_LAB_MATH_INPUTS_INVALID"),
      ]));
      result = {
        deltas: planned.map((entry) => {
          const window = nonEmpty(entry?.window, "PREGAME_LAB_MATH_INPUTS_INVALID");
          const plannedCumulativeVp = integer(entry?.plannedCumulativeVp,
            "PREGAME_LAB_MATH_INPUTS_INVALID");
          const projectedCumulativeVp = projectedByWindow.has(window)
            ? projectedByWindow.get(window) : null;
          return {
            window,
            plannedCumulativeVp,
            projectedCumulativeVp,
            deltaVp: projectedCumulativeVp === null
              ? null : projectedCumulativeVp - plannedCumulativeVp,
            projectionStatus: projectedCumulativeVp === null
              ? "unknown" : "projected",
          };
        }),
        unknownStaysUnknown: true,
      };
    } else {
      const values = Array.isArray(inputs.values) ? inputs.values : fail("PREGAME_LAB_MATH_INPUTS_INVALID");
      if (values.length > 256) fail("PREGAME_LAB_MATH_INPUTS_INVALID", "values");
      result = {
        total: values.reduce((sum, value) => sum
          + integer(value, "PREGAME_LAB_MATH_INPUTS_INVALID"), 0),
        count: values.length,
        exactIntegerArithmetic: true,
      };
    }
    return noteOperation(hashedReceipt({
      schema: PREGAME_LAB_MATH_RECEIPT_SCHEMA,
      queryId,
      ...sharedFields(),
      baseStateHash,
      resultStatus: "ok",
      unknownReason: null,
      mathKind,
      result,
    }));
  }

  function applyPlacement(state, placement) {
    const pieceId = nonEmpty(placement.pieceId, "PREGAME_LAB_PLACEMENT_INVALID");
    const xInches = finiteNumber(placement.xInches, "PREGAME_LAB_PLACEMENT_INVALID");
    const yInches = finiteNumber(placement.yInches, "PREGAME_LAB_PLACEMENT_INVALID");
    const width = finiteNumber(state.board.widthInches, "PREGAME_LAB_SOURCE_STATE_INVALID");
    const height = finiteNumber(state.board.heightInches, "PREGAME_LAB_SOURCE_STATE_INVALID");
    if (xInches < 0 || xInches > width || yInches < 0 || yInches > height) {
      fail("PREGAME_LAB_PLACEMENT_OUT_OF_BOUNDS", pieceId);
    }
    const piece = (state.pieces || []).find((entry) => entry.id === pieceId);
    if (!piece) fail("PREGAME_LAB_PLACEMENT_PIECE_UNKNOWN", pieceId);
    const spread = placement.modelSpreadInches === undefined
      ? 1.5 : finiteNumber(placement.modelSpreadInches,
        "PREGAME_LAB_PLACEMENT_INVALID");
    piece.isOnField = true;
    let index = 0;
    for (const model of (piece.models || []).filter((entry) => !entry.isDestroyed)) {
      model.isOnField = true;
      model.xInches = xInches + (index % 3) * spread;
      model.yInches = yInches + Math.floor(index / 3) * spread;
      model.elevation = "ground";
      model.supportTerrainIds = [];
      model.adjacentAccessPointIds = [];
      index += 1;
    }
    return { pieceId, xInches, yInches, placedModelCount: index };
  }

  function runScenarioBranch(request = {}) {
    const branchId = nonEmpty(request.branchId, "PREGAME_LAB_BRANCH_ID_REQUIRED");
    const spec = object(request.spec) ? clone(request.spec)
      : fail("PREGAME_LAB_BRANCH_SPEC_INVALID");
    const branchKind = nonEmpty(spec.kind, "PREGAME_LAB_BRANCH_KIND_REQUIRED");
    if (!["hypothetical_geometry", "rules_lifecycle"].includes(branchKind)) {
      fail("PREGAME_LAB_BRANCH_KIND_UNKNOWN", branchKind);
    }
    if (branches.size >= MAX_BRANCHES) fail("PREGAME_LAB_BRANCH_LIMIT_REACHED");
    const { state: baseState, baseStateHash } = resolveBaseState(request.base);
    const working = clone(baseState);
    const lifecycleSteps = [];
    const requestedSteps = Number(spec.lifecycleSteps || 0);
    if (!Number.isSafeInteger(requestedSteps)
      || requestedSteps < 0 || requestedSteps > MAX_LIFECYCLE_STEPS_PER_BRANCH) {
      fail("PREGAME_LAB_BRANCH_STEP_BOUND_INVALID");
    }
    if (requestedSteps > 0 && !matchBinding) {
      fail("PREGAME_LAB_BRANCH_MATCH_BINDING_REQUIRED");
    }
    for (let step = 0; step < requestedSteps; step += 1) {
      const legal = rulesRuntime.enumerate(working, {
        sideKey: working.activeSideKey || working.firstPlayerSideKey,
        includeDisabled: false,
      });
      const candidate = (legal.candidates || []).find((entry) => (
        entry.isEnabled !== false));
      if (!candidate) {
        lifecycleSteps.push({ step, status: "no_enabled_candidate" });
        break;
      }
      const applied = rulesRuntime.apply(working, candidate, { matchBinding });
      for (const key of Object.keys(working)) delete working[key];
      Object.assign(working, applied.state);
      lifecycleSteps.push({
        step,
        status: "applied",
        actionHash: hashStarcraftTmgContract(candidate),
        phase: applied.state.phase,
        stage: applied.state.stage,
      });
    }
    const placementsEcho = [];
    if (Array.isArray(spec.placements) && spec.placements.length > 0) {
      if (spec.placements.length > MAX_PLACEMENTS_PER_BRANCH) {
        fail("PREGAME_LAB_BRANCH_PLACEMENT_BOUND_EXCEEDED");
      }
      if (spec.isolateToPlacedPieces === true) {
        const placedIds = new Set(spec.placements.map((entry) => String(entry?.pieceId)));
        for (const piece of working.pieces) {
          if (placedIds.has(piece.id)) continue;
          piece.isOnField = false;
          for (const model of piece.models || []) model.isOnField = false;
        }
      }
      if (spec.clearTerrain === true) {
        working.board.terrain = [];
        working.board.accessPoints = [];
      }
      if (spec.phase !== undefined) {
        const phase = nonEmpty(spec.phase, "PREGAME_LAB_BRANCH_PHASE_INVALID");
        if (!ACTIVATION_PHASES.has(phase)) {
          fail("PREGAME_LAB_BRANCH_PHASE_INVALID", phase);
        }
        const sideKey = nonEmpty(spec.activeSideKey, "PREGAME_LAB_BRANCH_SIDE_INVALID");
        if (!SIDE_KEY_PATTERN.test(sideKey)) {
          fail("PREGAME_LAB_BRANCH_SIDE_INVALID", sideKey);
        }
        working.phase = phase;
        working.stage = "unit_activation";
        working.activeSideKey = sideKey;
        working.pendingAction = null;
        working.pendingReactionWindow = null;
        working.selectedRosterActivationWindow = null;
        delete working.pendingCurrentProductRangedSequence;
        delete working.pendingCurrentProductRangedCasualtyChoice;
        working.players[sideKey].passedPhases = {
          ...(working.players[sideKey].passedPhases || {}),
          [phase]: false,
        };
        const round = Number(working.round || 1);
        working.phaseFirstActorByRound = {
          ...(working.phaseFirstActorByRound || {}),
          [`${round}:${phase}`]: {
            round,
            phase,
            markerHolderSideKey: working.firstPlayerSideKey,
            chosenFirstActorSideKey: sideKey,
          },
        };
      }
      for (const placement of spec.placements) {
        placementsEcho.push(applyPlacement(working, placement));
      }
    }
    const branchStateHash = hashStarcraftTmgContract(working);
    if (branches.has(branchStateHash)) fail("PREGAME_LAB_BRANCH_DUPLICATE");
    branches.set(branchStateHash, freezeDeep({
      branchId,
      branchStateHash,
      parentStateHash: baseStateHash,
      specHash: hashStarcraftTmgContract(spec),
      state: working,
    }));
    return noteOperation(hashedReceipt({
      schema: PREGAME_LAB_SCENARIO_BRANCH_RECEIPT_SCHEMA,
      branchId,
      ...sharedFields(),
      baseStateHash,
      parentStateHash: baseStateHash,
      resultStatus: "ok",
      unknownReason: null,
      branchKind,
      specHash: hashStarcraftTmgContract(spec),
      branchStateHash,
      rulesLifecycleTransitionsApplied:
        lifecycleSteps.filter((entry) => entry.status === "applied").length,
      lifecycleSteps,
      hypotheticalPlacements: placementsEcho,
      advisoryOnly: true,
      authorityClaim: branchKind === "rules_lifecycle"
        ? "rules_legal_transitions_on_isolated_clone_only"
        : "advisory_hypothetical_geometry_not_rules_legality",
      branchStateRegisteredForQueries: true,
    }));
  }

  function compareCandidatesSameState(request = {}) {
    const comparisonId = nonEmpty(request.comparisonId,
      "PREGAME_LAB_COMPARISON_ID_REQUIRED");
    const candidates = request.candidates;
    if (!Array.isArray(candidates) || candidates.length !== 2) {
      fail("PREGAME_LAB_COMPARISON_TWO_CANDIDATES_REQUIRED");
    }
    const rows = candidates.map((entry, index) => {
      const candidateRef = nonEmpty(entry?.candidateRef,
        "PREGAME_LAB_COMPARISON_CANDIDATE_INVALID");
      if (!object(entry?.candidateInput)) {
        fail("PREGAME_LAB_COMPARISON_CANDIDATE_INVALID", candidateRef);
      }
      const candidateInputHash = hashStarcraftTmgContract(
        clone(entry.candidateInput));
      const verdict = armyBuilderPort.evaluateRosterCandidate(
        clone(entry.candidateInput));
      const legal = verdict.schema
        === "starcraft_tmg_army_builder_roster_verdict_v1";
      return freezeDeep({
        candidateRef,
        proposalOrder: index,
        candidateInputHash,
        legalityStatus: legal ? "legal" : verdict.status,
        verdictOrRejectionHash: legal ? verdict.verdictHash : verdict.receiptHash,
        rulesErrorCode: legal ? null : verdict.rulesErrorCode ?? null,
        rejectionKind: legal ? null : verdict.rejectionKind ?? null,
        mineralSpent: legal ? verdict.summary.mineralSpent : null,
        mineralBudget: legal ? verdict.summary.mineralBudget : null,
        vespeneSpent: legal ? verdict.summary.vespeneSpent : null,
        unitCount: legal ? verdict.summary.unitCount : null,
        startingSupply: legal ? verdict.summary.startingSupply : null,
        auditResultHash: legal ? verdict.auditResultHash : null,
      });
    });
    if (rows[0].candidateInputHash === rows[1].candidateInputHash) {
      fail("PREGAME_LAB_COMPARISON_DISTINCT_CANDIDATES_REQUIRED");
    }
    return noteOperation(hashedReceipt({
      schema: PREGAME_LAB_SAME_STATE_AB_RECEIPT_SCHEMA,
      comparisonId,
      ...sharedFields(),
      baseStateHash: sourceStateHash,
      resultStatus: "ok",
      unknownReason: null,
      sameSourceStateHash: sourceStateHash,
      sameBuilderBundleHash: builderBundleHash,
      samePortDescriptorHash: portDescriptor.descriptorHash,
      candidates: rows,
      ranking: null,
      rankingAuthority: "agent_deliberation_only_laboratory_never_ranks",
      legalityAuthority: "rules_owned_army_builder_port_only",
    }));
  }

  function proveMutationZero() {
    const recomputedSourceStateHash = hashStarcraftTmgContract(sourceState);
    const proof = hashedReceipt({
      schema: PREGAME_LAB_MUTATION_ZERO_PROOF_SCHEMA,
      ...sharedFields(),
      baseStateHash: sourceStateHash,
      resultStatus: "ok",
      unknownReason: null,
      operationCount,
      branchCount: branches.size,
      receiptLog: [...receiptLog],
      sourceStateHashUnchanged: recomputedSourceStateHash === sourceStateHash,
      recomputedSourceStateHash,
      builderBundleHashUnchanged:
        portDescriptor.unitCompositionUpgradeDataBundleHash === builderBundleHash,
      rulesRuntimeHashUnchanged:
        rulesRuntime.descriptor.runtimeHash === rulesRuntimeHash,
      sourceStateMutationCount:
        recomputedSourceStateHash === sourceStateHash ? 0 : -1,
    });
    if (proof.sourceStateHashUnchanged !== true
      || proof.builderBundleHashUnchanged !== true
      || proof.rulesRuntimeHashUnchanged !== true) {
      fail("PREGAME_LAB_MUTATION_DETECTED");
    }
    return proof;
  }

  return freezeDeep({
    labDescriptor: () => descriptor,
    querySpatial,
    queryProbability,
    queryThreatExchange,
    queryMath,
    runScenarioBranch,
    compareCandidatesSameState,
    proveMutationZero,
  });
}

export function verifyPregameSceneLaboratoryDescriptorV1(descriptorValue) {
  if (!object(descriptorValue)
    || descriptorValue.schema !== PREGAME_LAB_DESCRIPTOR_SCHEMA
    || descriptorValue.descriptorHash !== hashStarcraftTmgContract(
      without(descriptorValue, ["descriptorHash"]))
    || descriptorValue.readOnly !== true
    || descriptorValue.mutatesRoomState !== false
    || descriptorValue.mutatesBuilderState !== false
    || descriptorValue.mutatesSourceData !== false
    || descriptorValue.reimplementsRules !== false
    || descriptorValue.resultsBoundToSourceState !== true
    || descriptorValue.unknownStaysUnknown !== true
    || descriptorValue.hostPreferenceWeightsApplied !== false
    || descriptorValue.sameStateABComparisonSupported !== true
    || descriptorValue.scenarioBranchesOperateOnClonesOnly !== true
    || descriptorValue.hypotheticalPlacementsAreAdvisoryNotRulesLegality !== true
    || descriptorValue.providerCalls !== 0
    || descriptorValue.trainingTruth !== false
    || !HASH_PATTERN.test(String(descriptorValue.sourceStateHash || ""))
    || !HASH_PATTERN.test(String(descriptorValue.builderBundleHash || ""))) {
    fail("PREGAME_LAB_DESCRIPTOR_INVALID");
  }
  return true;
}

export function verifyPregameLabSpatialReceiptV1(receipt) {
  return verifyReceipt(receipt, PREGAME_LAB_SPATIAL_RECEIPT_SCHEMA,
    COMMON_FLAGS, "PREGAME_LAB_SPATIAL_RECEIPT_INVALID");
}

export function verifyPregameLabProbabilityReceiptV1(receipt) {
  verifyReceipt(receipt, PREGAME_LAB_PROBABILITY_RECEIPT_SCHEMA,
    COMMON_FLAGS, "PREGAME_LAB_PROBABILITY_RECEIPT_INVALID");
  if (receipt.resultStatus === "ok"
    && !HASH_PATTERN.test(String(receipt.estimate?.estimateHash || ""))) {
    fail("PREGAME_LAB_PROBABILITY_RECEIPT_INVALID", "estimate_hash");
  }
  if (receipt.resultStatus === "unknown"
    && (receipt.estimate !== null || !receipt.unknownReason)) {
    fail("PREGAME_LAB_PROBABILITY_RECEIPT_INVALID", "unknown_must_not_estimate");
  }
  return true;
}

export function verifyPregameLabMathReceiptV1(receipt) {
  return verifyReceipt(receipt, PREGAME_LAB_MATH_RECEIPT_SCHEMA,
    COMMON_FLAGS, "PREGAME_LAB_MATH_RECEIPT_INVALID");
}

export function verifyPregameLabThreatExchangeReceiptV1(receipt) {
  verifyReceipt(receipt, PREGAME_LAB_THREAT_EXCHANGE_RECEIPT_SCHEMA,
    COMMON_FLAGS, "PREGAME_LAB_THREAT_EXCHANGE_RECEIPT_INVALID");
  if (receipt.resultStatus === "ok"
    && (receipt.exchange?.unknownValuesNeverPromotedToZero !== true
      || !HASH_PATTERN.test(String(receipt.exchange?.estimateHash || "")))) {
    fail("PREGAME_LAB_THREAT_EXCHANGE_RECEIPT_INVALID");
  }
  return true;
}

export function verifyPregameLabScenarioBranchReceiptV1(receipt) {
  verifyReceipt(receipt, PREGAME_LAB_SCENARIO_BRANCH_RECEIPT_SCHEMA,
    COMMON_FLAGS, "PREGAME_LAB_BRANCH_RECEIPT_INVALID");
  if (!HASH_PATTERN.test(String(receipt.branchStateHash || ""))
    || receipt.advisoryOnly !== true
    || receipt.branchStateRegisteredForQueries !== true) {
    fail("PREGAME_LAB_BRANCH_RECEIPT_INVALID");
  }
  return true;
}

export function verifyPregameLabSameStateABReceiptV1(receipt) {
  verifyReceipt(receipt, PREGAME_LAB_SAME_STATE_AB_RECEIPT_SCHEMA,
    COMMON_FLAGS, "PREGAME_LAB_AB_RECEIPT_INVALID");
  if (receipt.sameSourceStateHash !== receipt.sourceStateHash
    || receipt.sameBuilderBundleHash !== receipt.builderBundleHash
    || receipt.ranking !== null
    || receipt.rankingAuthority
      !== "agent_deliberation_only_laboratory_never_ranks"
    || !Array.isArray(receipt.candidates) || receipt.candidates.length !== 2) {
    fail("PREGAME_LAB_AB_RECEIPT_INVALID");
  }
  return true;
}

export function verifyPregameLabMutationZeroProofV1(proof) {
  verifyReceipt(proof, PREGAME_LAB_MUTATION_ZERO_PROOF_SCHEMA,
    COMMON_FLAGS, "PREGAME_LAB_MUTATION_ZERO_PROOF_INVALID");
  if (proof.sourceStateHashUnchanged !== true
    || proof.builderBundleHashUnchanged !== true
    || proof.rulesRuntimeHashUnchanged !== true
    || proof.sourceStateMutationCount !== 0) {
    fail("PREGAME_LAB_MUTATION_ZERO_PROOF_INVALID");
  }
  return true;
}
