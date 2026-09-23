import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

export const ROSTER_PLAN_CONTRACTS_MODULE =
  "packages/roster-strategist/roster-plan-contracts-v1.mjs";
export const ROSTER_PLAN_CONTRACTS_VERSION = "1.1.0";

export const ROSTER_PLAN_SCHEMA = "starcraft_tmg_roster_plan_v1";
export const ROSTER_PLAN_PROVENANCE_SCHEMA =
  "starcraft_tmg_roster_plan_provenance_v1";
export const ROSTER_PLAN_SCORE_ROUTE_SCHEMA =
  "starcraft_tmg_roster_plan_score_route_v1";
export const ROSTER_PLAN_LOSS_RESOURCE_BUDGET_SCHEMA =
  "starcraft_tmg_roster_plan_loss_resource_budget_v1";
export const ROSTER_PLAN_COMPONENT_PURPOSE_SCHEMA =
  "starcraft_tmg_roster_plan_component_purpose_v1";
export const ROSTER_PLAN_DEPLOYMENT_CONCEPT_SCHEMA =
  "starcraft_tmg_roster_plan_deployment_concept_v1";
export const ROSTER_PLAN_OPPONENT_HYPOTHESIS_SCHEMA =
  "starcraft_tmg_roster_plan_opponent_archetype_hypothesis_v1";
export const ROSTER_PLAN_COUNTER_RESPONSE_SCHEMA =
  "starcraft_tmg_roster_plan_counter_response_v1";
export const ROSTER_PLAN_INVALIDATION_TRIGGER_SCHEMA =
  "starcraft_tmg_roster_plan_invalidation_trigger_v1";
export const ROSTER_PLAN_REVISION_SCHEMA =
  "starcraft_tmg_roster_plan_revision_event_v1";
export const ROSTER_PLAN_TOOL_RECEIPT_REFERENCE_SCHEMA =
  "starcraft_tmg_roster_plan_tool_receipt_reference_v1";
export const ROSTER_PLAN_CANDIDATE_SCHEMA =
  "starcraft_tmg_roster_candidate_v1";
export const ROSTER_PLAN_CANDIDATE_COMPARISON_SCHEMA =
  "starcraft_tmg_roster_candidate_comparison_v1";
export const ROSTER_PLAN_BUDGET_ACCEPTANCE_SCHEMA =
  "starcraft_tmg_roster_plan_budget_acceptance_v1";
export const ROSTER_FORMAL_BUDGET_CONTRACT_SCHEMA =
  "starcraft_tmg_roster_formal_budget_contract_v1";

export const ROSTER_PLAN_STATUSES = Object.freeze([
  "no_pregame_plan", "draft", "active", "revised", "abandoned", "completed",
]);
export const ROSTER_PLAN_UNKNOWN = "unknown";
export const ROSTER_PLAN_CONTRACT_BOUNDARY = Object.freeze({
  legalityAuthority: "rules_owned_official_kernels_only",
  strategistsMayNotWaiveRepairOrReinterpretRulesRejections: true,
  hiddenChainOfThoughtPermitted: false,
  rawPromptsOrPrivateModelReasoningPermitted: false,
  unknownStaysUnknown: true,
  trainingTruth: false,
});

// Formal budget acceptance contract (Slice 272, closing the 940/2000 class
// diagnosed in docs/ticket-27-slice-272-diagnosis-budget-underspend-and-\
// retained-closure-v1-2026-09-23.md): a Rules-legal roster is not
// automatically a final formal success. The budget, the menu and the
// near-cap exemption threshold stay Rules/Builder-owned (the Army Builder
// enumeration's mineralBudget and its cheapest positive purchasable
// increment); the utilization-floor TOLERANCE below is a versioned product
// contract value, displayed in the planning UI — never hard-coded per
// roster, per faction or per candidate, and exact budget equality is never
// forced. A plan whose selected roster falls below the floor without the
// menu-derived near-cap exemption cannot close as active/revised/completed;
// it closes as draft with budgetAcceptance unmet. Vespene must stay within
// the Rules-owned formal cap for the budget.
export const ROSTER_PLAN_BUDGET_ACCEPTANCE_STATUSES = Object.freeze([
  "met", "met_near_cap_exemption", "unmet_severe_underspend",
]);
export const ROSTER_FORMAL_BUDGET_CONTRACT_V1 = (() => {
  const body = {
    schema: ROSTER_FORMAL_BUDGET_CONTRACT_SCHEMA,
    version: "1.0.0",
    budgetAndMenuAuthority: "rules_owned_army_builder_port",
    mineralUtilizationFloor: Object.freeze({ numerator: 9, denominator: 10 }),
    nearCapExemptionThresholdDerivation:
      "cheapest_positive_purchasable_increment_in_rules_owned_menu",
    vespeneWithinFormalCapRequired: true,
    activeRevisedCompletedRequireContractMet: true,
    severeUnderspendClosesAsDraftNeverActive: true,
    exactBudgetEqualityNeverForced: true,
    toleranceDisplayedInProductUi: true,
    toleranceDisplayTextZh:
      "正式预算合同:矿物利用率不得低于 90%(9/10,产品合同容差,UI 公示);"
        + "低于下限且不满足菜单推导的贴近上限豁免时,计划只能以草稿收口,"
        + "不算最终正式成功;瓦斯不得超过规则正式上限;从不强制恰好花满预算。",
    toleranceDisplayTextEn:
      "Formal budget contract: mineral utilization must be at least 90% "
        + "(9/10, a product-contract tolerance displayed in the UI); below "
        + "the floor without the menu-derived near-cap exemption the plan "
        + "closes as draft, never as a final formal success; vespene must "
        + "stay within the Rules-owned formal cap; exact budget equality is "
        + "never forced.",
    trainingTruth: false,
  };
  return freezeDeep({ ...body, contractHash: hashStarcraftTmgContract(body) });
})();

const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const ENGAGEMENT_SCALES = new Set(["Skirmish", "Standard", "Grand Offensive"]);
const OPPONENT_INFORMATION_BOUNDARIES = new Set([
  "open_roster", "closed_roster", "unknown",
]);
const ROUTE_KINDS = new Set([
  "mission_marker_control", "attrition", "hybrid", "unknown",
]);
const CONFIDENCE_LEVELS = new Set(["unknown", "low", "medium", "high"]);
const COMPONENT_KINDS = new Set([
  "faction_card", "tactical_card", "unit", "composition", "upgrade",
]);
const SCORING_ROLES = new Set([
  "primary_scorer", "support", "counter", "flex", "unknown",
]);
const RECEIPT_KINDS = new Set(["probability", "spatial", "math", "simulation"]);
const RECEIPT_STATUSES = new Set(["attached", "unknown", "not_applicable"]);
const CANDIDATE_LEGALITY_STATUSES = new Set(["unknown", "legal", "illegal"]);
const TRIGGER_OBSERVATION_KINDS = new Set([
  "vp_deficit", "opponent_composition", "battlefield_event", "loss_budget",
  "unknown",
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
function hash64OrNull(value, code) {
  if (value === null || value === undefined) return null;
  return hash64(value, code);
}
function nonNegativeInteger(value, code) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0) fail(code);
  return number;
}
function positiveInteger(value, code) {
  const number = nonNegativeInteger(value, code);
  if (number < 1) fail(code);
  return number;
}
function stringList(value, code, { allowEmpty = true, max = 64 } = {}) {
  if (!Array.isArray(value) || value.length > max) fail(code);
  if (!allowEmpty && value.length === 0) fail(code);
  const list = value.map((entry) => nonEmpty(entry, code));
  if (new Set(list).size !== list.length) fail(code);
  return list;
}
function exactKeys(value, expected, code) {
  const observed = Object.keys(value || {}).sort();
  const wanted = [...expected].sort();
  if (!isDeepStrictEqual(observed, wanted)) fail(code, observed.join(","));
}
function hashed(body, hashField) {
  return freezeDeep({ ...body, [hashField]: hashStarcraftTmgContract(body) });
}
function verifyHashed(value, schema, hashField, code) {
  if (!object(value) || value.schema !== schema
    || value[hashField] !== hashStarcraftTmgContract(without(value, [hashField]))) {
    fail(code);
  }
  return value;
}
function declaredOrUnknown(status, entries, code) {
  if (status === "unknown") {
    if (entries.length !== 0) fail(code);
    return;
  }
  if (status !== "declared" || entries.length === 0) fail(code);
}

export function createRosterPlanProvenanceV1(input = {}) {
  if (!object(input)) fail("ROSTER_PLAN_PROVENANCE_INVALID");
  const missionStatus = String(input.missionBinding?.status || "");
  if (!["frozen", "unknown"].includes(missionStatus)) {
    fail("ROSTER_PLAN_PROVENANCE_MISSION_STATUS_INVALID");
  }
  const missionBinding = {
    status: missionStatus,
    missionRecordKey: missionStatus === "frozen"
      ? nonEmpty(input.missionBinding?.missionRecordKey, "ROSTER_PLAN_PROVENANCE_INVALID")
      : null,
    deploymentRecordKey: missionStatus === "frozen"
      ? nonEmpty(input.missionBinding?.deploymentRecordKey, "ROSTER_PLAN_PROVENANCE_INVALID")
      : null,
    mapTopologyHash: missionStatus === "frozen"
      ? hash64OrNull(input.missionBinding?.mapTopologyHash, "ROSTER_PLAN_PROVENANCE_INVALID")
      : null,
  };
  const scale = nonEmpty(input.engagementScale, "ROSTER_PLAN_PROVENANCE_INVALID");
  if (!ENGAGEMENT_SCALES.has(scale)) fail("ROSTER_PLAN_PROVENANCE_INVALID", scale);
  const boundary = nonEmpty(input.opponentInformationBoundary,
    "ROSTER_PLAN_PROVENANCE_INVALID");
  if (!OPPONENT_INFORMATION_BOUNDARIES.has(boundary)) {
    fail("ROSTER_PLAN_PROVENANCE_INVALID", boundary);
  }
  const skillVersions = (input.skillVersions || []).map((entry) => ({
    skillId: nonEmpty(entry?.skillId, "ROSTER_PLAN_PROVENANCE_SKILL_INVALID"),
    version: nonEmpty(entry?.version, "ROSTER_PLAN_PROVENANCE_SKILL_INVALID"),
    promoted: entry?.promoted === true,
  })).sort((left, right) => left.skillId.localeCompare(right.skillId));
  const body = {
    schema: ROSTER_PLAN_PROVENANCE_SCHEMA,
    sourceLockHash: hash64(input.sourceLockHash, "ROSTER_PLAN_PROVENANCE_INVALID"),
    sourceSnapshotHash: hash64(input.sourceSnapshotHash, "ROSTER_PLAN_PROVENANCE_INVALID"),
    normalizedDatasetHash: hash64(input.normalizedDatasetHash, "ROSTER_PLAN_PROVENANCE_INVALID"),
    officialRulesVersion: nonEmpty(input.officialRulesVersion, "ROSTER_PLAN_PROVENANCE_INVALID"),
    officialUnitsVersion: nonEmpty(input.officialUnitsVersion, "ROSTER_PLAN_PROVENANCE_INVALID"),
    officialCardsVersion: nonEmpty(input.officialCardsVersion, "ROSTER_PLAN_PROVENANCE_INVALID"),
    unitCompositionUpgradeDataBundleHash: hash64(
      input.unitCompositionUpgradeDataBundleHash, "ROSTER_PLAN_PROVENANCE_INVALID"),
    armyResourceBudgetDataBundleHash: hash64(
      input.armyResourceBudgetDataBundleHash, "ROSTER_PLAN_PROVENANCE_INVALID"),
    factionArmyEligibilityDataBundleHash: hash64(
      input.factionArmyEligibilityDataBundleHash, "ROSTER_PLAN_PROVENANCE_INVALID"),
    engagementScale: scale,
    missionBinding,
    opponentInformationBoundary: boundary,
    skillVersions,
    modelVersion: nonEmpty(input.modelVersion || ROSTER_PLAN_UNKNOWN,
      "ROSTER_PLAN_PROVENANCE_INVALID"),
    promptVersion: nonEmpty(input.promptVersion || ROSTER_PLAN_UNKNOWN,
      "ROSTER_PLAN_PROVENANCE_INVALID"),
    contractsVersion: ROSTER_PLAN_CONTRACTS_VERSION,
    sourceRefreshPerformed: false,
    trainingTruth: false,
  };
  exactKeys(body, ["schema", "sourceLockHash", "sourceSnapshotHash",
    "normalizedDatasetHash", "officialRulesVersion", "officialUnitsVersion",
    "officialCardsVersion", "unitCompositionUpgradeDataBundleHash",
    "armyResourceBudgetDataBundleHash", "factionArmyEligibilityDataBundleHash",
    "engagementScale", "missionBinding", "opponentInformationBoundary",
    "skillVersions", "modelVersion", "promptVersion", "contractsVersion",
    "sourceRefreshPerformed", "trainingTruth"], "ROSTER_PLAN_PROVENANCE_INVALID");
  return hashed(body, "provenanceHash");
}

export function verifyRosterPlanProvenanceV1(value) {
  verifyHashed(value, ROSTER_PLAN_PROVENANCE_SCHEMA, "provenanceHash",
    "ROSTER_PLAN_PROVENANCE_INVALID");
  if (value.sourceRefreshPerformed !== false || value.trainingTruth !== false
    || !ENGAGEMENT_SCALES.has(value.engagementScale)
    || !OPPONENT_INFORMATION_BOUNDARIES.has(value.opponentInformationBoundary)) {
    fail("ROSTER_PLAN_PROVENANCE_INVALID");
  }
  return true;
}

export function createRosterScoreRouteV1(input = {}) {
  if (!object(input)) fail("ROSTER_PLAN_SCORE_ROUTE_INVALID");
  const routeKind = nonEmpty(input.routeKind, "ROSTER_PLAN_SCORE_ROUTE_INVALID");
  if (!ROUTE_KINDS.has(routeKind)) fail("ROSTER_PLAN_SCORE_ROUTE_INVALID", routeKind);
  const scheduleStatus = String(input.scheduleStatus || "");
  const schedule = (input.targetVpSchedule || []).map((entry) => ({
    window: nonEmpty(entry?.window, "ROSTER_PLAN_SCORE_ROUTE_SCHEDULE_INVALID"),
    plannedCumulativeVp: nonNegativeInteger(entry?.plannedCumulativeVp,
      "ROSTER_PLAN_SCORE_ROUTE_SCHEDULE_INVALID"),
  })).sort((left, right) => left.window.localeCompare(right.window));
  if (new Set(schedule.map((entry) => entry.window)).size !== schedule.length) {
    fail("ROSTER_PLAN_SCORE_ROUTE_SCHEDULE_INVALID");
  }
  declaredOrUnknown(scheduleStatus, schedule, "ROSTER_PLAN_SCORE_ROUTE_SCHEDULE_INVALID");
  if (routeKind === "unknown" && scheduleStatus !== "unknown") {
    fail("ROSTER_PLAN_SCORE_ROUTE_INVALID", "unknown_route_requires_unknown_schedule");
  }
  const body = {
    schema: ROSTER_PLAN_SCORE_ROUTE_SCHEMA,
    routeKind,
    routeText: nonEmpty(input.routeText, "ROSTER_PLAN_SCORE_ROUTE_INVALID"),
    scheduleStatus,
    targetVpSchedule: schedule,
    fallbackRouteText: nonEmpty(
      input.fallbackRouteText || ROSTER_PLAN_UNKNOWN, "ROSTER_PLAN_SCORE_ROUTE_INVALID"),
    trainingTruth: false,
  };
  exactKeys(body, ["schema", "routeKind", "routeText", "scheduleStatus",
    "targetVpSchedule", "fallbackRouteText", "trainingTruth"],
    "ROSTER_PLAN_SCORE_ROUTE_INVALID");
  return hashed(body, "scoreRouteHash");
}

export function verifyRosterScoreRouteV1(value) {
  verifyHashed(value, ROSTER_PLAN_SCORE_ROUTE_SCHEMA, "scoreRouteHash",
    "ROSTER_PLAN_SCORE_ROUTE_INVALID");
  declaredOrUnknown(value.scheduleStatus, value.targetVpSchedule || [],
    "ROSTER_PLAN_SCORE_ROUTE_SCHEDULE_INVALID");
  if (value.trainingTruth !== false) fail("ROSTER_PLAN_SCORE_ROUTE_INVALID");
  return true;
}

export function createRosterLossResourceBudgetV1(input = {}) {
  if (!object(input)) fail("ROSTER_PLAN_LOSS_BUDGET_INVALID");
  const lossStatus = String(input.lossBudgetStatus || "");
  const entries = (input.plannedLossBudget || []).map((entry) => ({
    resourceKind: nonEmpty(entry?.resourceKind, "ROSTER_PLAN_LOSS_BUDGET_ENTRY_INVALID"),
    window: nonEmpty(entry?.window, "ROSTER_PLAN_LOSS_BUDGET_ENTRY_INVALID"),
    plannedMaximumLoss: nonNegativeInteger(entry?.plannedMaximumLoss,
      "ROSTER_PLAN_LOSS_BUDGET_ENTRY_INVALID"),
  })).sort((left, right) => (`${left.window}:${left.resourceKind}`)
    .localeCompare(`${right.window}:${right.resourceKind}`));
  declaredOrUnknown(lossStatus, entries, "ROSTER_PLAN_LOSS_BUDGET_INVALID");
  const spendStatus = String(input.mineralSpendIntent?.status || "");
  if (!["declared", "unknown"].includes(spendStatus)) {
    fail("ROSTER_PLAN_LOSS_BUDGET_INVALID");
  }
  const mineralBudget = nonNegativeInteger(input.mineralSpendIntent?.mineralBudget,
    "ROSTER_PLAN_LOSS_BUDGET_INVALID");
  const plannedSpend = spendStatus === "declared"
    ? nonNegativeInteger(input.mineralSpendIntent?.plannedMineralSpend,
      "ROSTER_PLAN_LOSS_BUDGET_INVALID")
    : null;
  if (plannedSpend !== null && plannedSpend > mineralBudget) {
    fail("ROSTER_PLAN_LOSS_BUDGET_INVALID", "planned_spend_exceeds_budget");
  }
  const body = {
    schema: ROSTER_PLAN_LOSS_RESOURCE_BUDGET_SCHEMA,
    lossBudgetStatus: lossStatus,
    plannedLossBudget: entries,
    mineralSpendIntent: { status: spendStatus, mineralBudget, plannedMineralSpend: plannedSpend },
    unspentResourceDisposition: "lost",
    trainingTruth: false,
  };
  exactKeys(body, ["schema", "lossBudgetStatus", "plannedLossBudget",
    "mineralSpendIntent", "unspentResourceDisposition", "trainingTruth"],
    "ROSTER_PLAN_LOSS_BUDGET_INVALID");
  return hashed(body, "lossResourceBudgetHash");
}

export function verifyRosterLossResourceBudgetV1(value) {
  verifyHashed(value, ROSTER_PLAN_LOSS_RESOURCE_BUDGET_SCHEMA,
    "lossResourceBudgetHash", "ROSTER_PLAN_LOSS_BUDGET_INVALID");
  declaredOrUnknown(value.lossBudgetStatus, value.plannedLossBudget || [],
    "ROSTER_PLAN_LOSS_BUDGET_INVALID");
  if (value.trainingTruth !== false) fail("ROSTER_PLAN_LOSS_BUDGET_INVALID");
  return true;
}

export function createRosterComponentPurposeV1(input = {}) {
  if (!object(input)) fail("ROSTER_PLAN_COMPONENT_PURPOSE_INVALID");
  const componentKind = nonEmpty(input.componentKind,
    "ROSTER_PLAN_COMPONENT_PURPOSE_INVALID");
  if (!COMPONENT_KINDS.has(componentKind)) {
    fail("ROSTER_PLAN_COMPONENT_PURPOSE_INVALID", componentKind);
  }
  const scoringRole = nonEmpty(input.scoringRole, "ROSTER_PLAN_COMPONENT_PURPOSE_INVALID");
  if (!SCORING_ROLES.has(scoringRole)) {
    fail("ROSTER_PLAN_COMPONENT_PURPOSE_INVALID", scoringRole);
  }
  const body = {
    schema: ROSTER_PLAN_COMPONENT_PURPOSE_SCHEMA,
    componentKind,
    recordKey: nonEmpty(input.recordKey, "ROSTER_PLAN_COMPONENT_PURPOSE_INVALID"),
    instanceId: nonEmpty(input.instanceId, "ROSTER_PLAN_COMPONENT_PURPOSE_INVALID"),
    publicPurposeText: nonEmpty(input.publicPurposeText,
      "ROSTER_PLAN_COMPONENT_PURPOSE_INVALID"),
    scoringRole,
    trainingTruth: false,
  };
  exactKeys(body, ["schema", "componentKind", "recordKey", "instanceId",
    "publicPurposeText", "scoringRole", "trainingTruth"],
    "ROSTER_PLAN_COMPONENT_PURPOSE_INVALID");
  return hashed(body, "purposeHash");
}

export function verifyRosterComponentPurposeV1(value) {
  verifyHashed(value, ROSTER_PLAN_COMPONENT_PURPOSE_SCHEMA, "purposeHash",
    "ROSTER_PLAN_COMPONENT_PURPOSE_INVALID");
  if (!COMPONENT_KINDS.has(value.componentKind)
    || !SCORING_ROLES.has(value.scoringRole) || value.trainingTruth !== false) {
    fail("ROSTER_PLAN_COMPONENT_PURPOSE_INVALID");
  }
  return true;
}

export function createRosterDeploymentConceptV1(input = {}) {
  if (!object(input)) fail("ROSTER_PLAN_DEPLOYMENT_CONCEPT_INVALID");
  const activationOrderStatus = String(input.activationOrderStatus || "");
  const activationOrder = (input.activationOrder || []).map((entry) => ({
    ordinal: positiveInteger(entry?.ordinal, "ROSTER_PLAN_ACTIVATION_ORDER_INVALID"),
    unitInstanceId: nonEmpty(entry?.unitInstanceId,
      "ROSTER_PLAN_ACTIVATION_ORDER_INVALID"),
    phase: nonEmpty(entry?.phase, "ROSTER_PLAN_ACTIVATION_ORDER_INVALID"),
  })).sort((left, right) => left.ordinal - right.ordinal);
  if (new Set(activationOrder.map((entry) => entry.ordinal)).size
    !== activationOrder.length) {
    fail("ROSTER_PLAN_ACTIVATION_ORDER_INVALID");
  }
  declaredOrUnknown(activationOrderStatus, activationOrder,
    "ROSTER_PLAN_ACTIVATION_ORDER_INVALID");
  const body = {
    schema: ROSTER_PLAN_DEPLOYMENT_CONCEPT_SCHEMA,
    deploymentConceptText: nonEmpty(input.deploymentConceptText,
      "ROSTER_PLAN_DEPLOYMENT_CONCEPT_INVALID"),
    activationOrderStatus,
    activationOrder,
    reinforcementPolicyText: nonEmpty(input.reinforcementPolicyText,
      "ROSTER_PLAN_DEPLOYMENT_CONCEPT_INVALID"),
    threatTradeText: nonEmpty(input.threatTradeText || ROSTER_PLAN_UNKNOWN,
      "ROSTER_PLAN_DEPLOYMENT_CONCEPT_INVALID"),
    objectiveControlText: nonEmpty(input.objectiveControlText || ROSTER_PLAN_UNKNOWN,
      "ROSTER_PLAN_DEPLOYMENT_CONCEPT_INVALID"),
    trainingTruth: false,
  };
  exactKeys(body, ["schema", "deploymentConceptText", "activationOrderStatus",
    "activationOrder", "reinforcementPolicyText", "threatTradeText",
    "objectiveControlText", "trainingTruth"],
    "ROSTER_PLAN_DEPLOYMENT_CONCEPT_INVALID");
  return hashed(body, "deploymentConceptHash");
}

export function verifyRosterDeploymentConceptV1(value) {
  verifyHashed(value, ROSTER_PLAN_DEPLOYMENT_CONCEPT_SCHEMA,
    "deploymentConceptHash", "ROSTER_PLAN_DEPLOYMENT_CONCEPT_INVALID");
  declaredOrUnknown(value.activationOrderStatus, value.activationOrder || [],
    "ROSTER_PLAN_ACTIVATION_ORDER_INVALID");
  if (value.trainingTruth !== false) fail("ROSTER_PLAN_DEPLOYMENT_CONCEPT_INVALID");
  return true;
}

export function createOpponentArchetypeHypothesisV1(input = {}) {
  if (!object(input)) fail("ROSTER_PLAN_OPPONENT_HYPOTHESIS_INVALID");
  const confidence = nonEmpty(input.confidence, "ROSTER_PLAN_OPPONENT_HYPOTHESIS_INVALID");
  if (!CONFIDENCE_LEVELS.has(confidence)) {
    fail("ROSTER_PLAN_OPPONENT_HYPOTHESIS_INVALID", confidence);
  }
  const body = {
    schema: ROSTER_PLAN_OPPONENT_HYPOTHESIS_SCHEMA,
    hypothesisId: nonEmpty(input.hypothesisId, "ROSTER_PLAN_OPPONENT_HYPOTHESIS_INVALID"),
    archetypeLabel: nonEmpty(input.archetypeLabel,
      "ROSTER_PLAN_OPPONENT_HYPOTHESIS_INVALID"),
    hypothesisText: nonEmpty(input.hypothesisText,
      "ROSTER_PLAN_OPPONENT_HYPOTHESIS_INVALID"),
    confidence,
    expectedCounterTexts: stringList(input.expectedCounterTexts || [],
      "ROSTER_PLAN_OPPONENT_HYPOTHESIS_INVALID"),
    ownCounterResponseIds: stringList(input.ownCounterResponseIds || [],
      "ROSTER_PLAN_OPPONENT_HYPOTHESIS_INVALID"),
    falsificationText: nonEmpty(input.falsificationText || ROSTER_PLAN_UNKNOWN,
      "ROSTER_PLAN_OPPONENT_HYPOTHESIS_INVALID"),
    trainingTruth: false,
  };
  exactKeys(body, ["schema", "hypothesisId", "archetypeLabel", "hypothesisText",
    "confidence", "expectedCounterTexts", "ownCounterResponseIds",
    "falsificationText", "trainingTruth"],
    "ROSTER_PLAN_OPPONENT_HYPOTHESIS_INVALID");
  return hashed(body, "hypothesisHash");
}

export function verifyOpponentArchetypeHypothesisV1(value) {
  verifyHashed(value, ROSTER_PLAN_OPPONENT_HYPOTHESIS_SCHEMA, "hypothesisHash",
    "ROSTER_PLAN_OPPONENT_HYPOTHESIS_INVALID");
  if (!CONFIDENCE_LEVELS.has(value.confidence) || value.trainingTruth !== false) {
    fail("ROSTER_PLAN_OPPONENT_HYPOTHESIS_INVALID");
  }
  return true;
}

export function createRosterCounterResponseV1(input = {}) {
  if (!object(input)) fail("ROSTER_PLAN_COUNTER_RESPONSE_INVALID");
  const body = {
    schema: ROSTER_PLAN_COUNTER_RESPONSE_SCHEMA,
    responseId: nonEmpty(input.responseId, "ROSTER_PLAN_COUNTER_RESPONSE_INVALID"),
    triggerText: nonEmpty(input.triggerText, "ROSTER_PLAN_COUNTER_RESPONSE_INVALID"),
    responseText: nonEmpty(input.responseText, "ROSTER_PLAN_COUNTER_RESPONSE_INVALID"),
    linkedHypothesisIds: stringList(input.linkedHypothesisIds || [],
      "ROSTER_PLAN_COUNTER_RESPONSE_INVALID"),
    trainingTruth: false,
  };
  exactKeys(body, ["schema", "responseId", "triggerText", "responseText",
    "linkedHypothesisIds", "trainingTruth"], "ROSTER_PLAN_COUNTER_RESPONSE_INVALID");
  return hashed(body, "responseHash");
}

export function verifyRosterCounterResponseV1(value) {
  verifyHashed(value, ROSTER_PLAN_COUNTER_RESPONSE_SCHEMA, "responseHash",
    "ROSTER_PLAN_COUNTER_RESPONSE_INVALID");
  if (value.trainingTruth !== false) fail("ROSTER_PLAN_COUNTER_RESPONSE_INVALID");
  return true;
}

export function createRosterInvalidationTriggerV1(input = {}) {
  if (!object(input)) fail("ROSTER_PLAN_INVALIDATION_TRIGGER_INVALID");
  const observationKind = nonEmpty(input.observationKind,
    "ROSTER_PLAN_INVALIDATION_TRIGGER_INVALID");
  if (!TRIGGER_OBSERVATION_KINDS.has(observationKind)) {
    fail("ROSTER_PLAN_INVALIDATION_TRIGGER_INVALID", observationKind);
  }
  const body = {
    schema: ROSTER_PLAN_INVALIDATION_TRIGGER_SCHEMA,
    triggerId: nonEmpty(input.triggerId, "ROSTER_PLAN_INVALIDATION_TRIGGER_INVALID"),
    observationKind,
    triggerText: nonEmpty(input.triggerText, "ROSTER_PLAN_INVALIDATION_TRIGGER_INVALID"),
    revisionRequiredText: nonEmpty(input.revisionRequiredText,
      "ROSTER_PLAN_INVALIDATION_TRIGGER_INVALID"),
    trainingTruth: false,
  };
  exactKeys(body, ["schema", "triggerId", "observationKind", "triggerText",
    "revisionRequiredText", "trainingTruth"],
    "ROSTER_PLAN_INVALIDATION_TRIGGER_INVALID");
  return hashed(body, "triggerHash");
}

export function verifyRosterInvalidationTriggerV1(value) {
  verifyHashed(value, ROSTER_PLAN_INVALIDATION_TRIGGER_SCHEMA, "triggerHash",
    "ROSTER_PLAN_INVALIDATION_TRIGGER_INVALID");
  if (!TRIGGER_OBSERVATION_KINDS.has(value.observationKind)
    || value.trainingTruth !== false) {
    fail("ROSTER_PLAN_INVALIDATION_TRIGGER_INVALID");
  }
  return true;
}

export function createRosterPlanRevisionEventV1(input = {}) {
  if (!object(input)) fail("ROSTER_PLAN_REVISION_INVALID");
  const fromPlanVersion = positiveInteger(input.fromPlanVersion,
    "ROSTER_PLAN_REVISION_INVALID");
  const toPlanVersion = positiveInteger(input.toPlanVersion,
    "ROSTER_PLAN_REVISION_INVALID");
  if (toPlanVersion <= fromPlanVersion) fail("ROSTER_PLAN_REVISION_INVALID");
  const body = {
    schema: ROSTER_PLAN_REVISION_SCHEMA,
    revisionId: nonEmpty(input.revisionId, "ROSTER_PLAN_REVISION_INVALID"),
    planId: nonEmpty(input.planId, "ROSTER_PLAN_REVISION_INVALID"),
    fromPlanVersion,
    toPlanVersion,
    previousPlanHash: hash64(input.previousPlanHash, "ROSTER_PLAN_REVISION_INVALID"),
    reasonText: nonEmpty(input.reasonText, "ROSTER_PLAN_REVISION_INVALID"),
    triggerIds: stringList(input.triggerIds || [], "ROSTER_PLAN_REVISION_INVALID"),
    revisedSectionKeys: stringList(input.revisedSectionKeys || [],
      "ROSTER_PLAN_REVISION_INVALID", { allowEmpty: false }),
    trainingTruth: false,
  };
  exactKeys(body, ["schema", "revisionId", "planId", "fromPlanVersion",
    "toPlanVersion", "previousPlanHash", "reasonText", "triggerIds",
    "revisedSectionKeys", "trainingTruth"], "ROSTER_PLAN_REVISION_INVALID");
  return hashed(body, "revisionHash");
}

export function verifyRosterPlanRevisionEventV1(value) {
  verifyHashed(value, ROSTER_PLAN_REVISION_SCHEMA, "revisionHash",
    "ROSTER_PLAN_REVISION_INVALID");
  if (!(value.toPlanVersion > value.fromPlanVersion)
    || value.trainingTruth !== false) {
    fail("ROSTER_PLAN_REVISION_INVALID");
  }
  return true;
}

export function createRosterToolReceiptReferenceV1(input = {}) {
  if (!object(input)) fail("ROSTER_PLAN_TOOL_RECEIPT_REFERENCE_INVALID");
  const receiptKind = nonEmpty(input.receiptKind,
    "ROSTER_PLAN_TOOL_RECEIPT_REFERENCE_INVALID");
  if (!RECEIPT_KINDS.has(receiptKind)) {
    fail("ROSTER_PLAN_TOOL_RECEIPT_REFERENCE_INVALID", receiptKind);
  }
  const status = nonEmpty(input.status, "ROSTER_PLAN_TOOL_RECEIPT_REFERENCE_INVALID");
  if (!RECEIPT_STATUSES.has(status)) {
    fail("ROSTER_PLAN_TOOL_RECEIPT_REFERENCE_INVALID", status);
  }
  const receiptHash = status === "attached"
    ? hash64(input.receiptHash, "ROSTER_PLAN_TOOL_RECEIPT_REFERENCE_INVALID")
    : null;
  if (status !== "attached" && input.receiptHash !== undefined
    && input.receiptHash !== null) {
    fail("ROSTER_PLAN_TOOL_RECEIPT_REFERENCE_INVALID", "unknown_receipt_hash_fabricated");
  }
  const body = {
    schema: ROSTER_PLAN_TOOL_RECEIPT_REFERENCE_SCHEMA,
    referenceId: nonEmpty(input.referenceId,
      "ROSTER_PLAN_TOOL_RECEIPT_REFERENCE_INVALID"),
    receiptKind,
    status,
    receiptHash,
    toolId: status === "not_applicable" ? ROSTER_PLAN_UNKNOWN
      : nonEmpty(input.toolId || ROSTER_PLAN_UNKNOWN,
        "ROSTER_PLAN_TOOL_RECEIPT_REFERENCE_INVALID"),
    querySummaryText: nonEmpty(input.querySummaryText || ROSTER_PLAN_UNKNOWN,
      "ROSTER_PLAN_TOOL_RECEIPT_REFERENCE_INVALID"),
    unknownNotZero: true,
    trainingTruth: false,
  };
  exactKeys(body, ["schema", "referenceId", "receiptKind", "status", "receiptHash",
    "toolId", "querySummaryText", "unknownNotZero", "trainingTruth"],
    "ROSTER_PLAN_TOOL_RECEIPT_REFERENCE_INVALID");
  return hashed(body, "referenceHash");
}

export function verifyRosterToolReceiptReferenceV1(value) {
  verifyHashed(value, ROSTER_PLAN_TOOL_RECEIPT_REFERENCE_SCHEMA, "referenceHash",
    "ROSTER_PLAN_TOOL_RECEIPT_REFERENCE_INVALID");
  if (!RECEIPT_KINDS.has(value.receiptKind) || !RECEIPT_STATUSES.has(value.status)
    || value.unknownNotZero !== true || value.trainingTruth !== false) {
    fail("ROSTER_PLAN_TOOL_RECEIPT_REFERENCE_INVALID");
  }
  if (value.status === "attached" && !HASH_PATTERN.test(String(value.receiptHash))) {
    fail("ROSTER_PLAN_TOOL_RECEIPT_REFERENCE_INVALID");
  }
  if (value.status !== "attached" && value.receiptHash !== null) {
    fail("ROSTER_PLAN_TOOL_RECEIPT_REFERENCE_INVALID", "unknown_receipt_hash_fabricated");
  }
  return true;
}

export function createRosterCandidateV1(input = {}) {
  if (!object(input)) fail("ROSTER_CANDIDATE_INVALID");
  const legalityStatus = nonEmpty(input.legalityStatus, "ROSTER_CANDIDATE_INVALID");
  if (!CANDIDATE_LEGALITY_STATUSES.has(legalityStatus)) {
    fail("ROSTER_CANDIDATE_INVALID", legalityStatus);
  }
  const scaleId = nonEmpty(input.scaleId, "ROSTER_CANDIDATE_INVALID");
  if (!ENGAGEMENT_SCALES.has(scaleId)) fail("ROSTER_CANDIDATE_INVALID", scaleId);
  const units = (input.units || []).map((unit) => ({
    unitInstanceId: nonEmpty(unit?.unitInstanceId, "ROSTER_CANDIDATE_UNIT_INVALID"),
    recordKey: nonEmpty(unit?.recordKey, "ROSTER_CANDIDATE_UNIT_INVALID"),
    compositionKind: nonEmpty(unit?.compositionKind, "ROSTER_CANDIDATE_UNIT_INVALID"),
    upgradeSelections: (unit?.upgradeSelections || []).map((upgrade) => ({
      upgradeName: upgrade?.upgradeName === undefined
        ? null : nonEmpty(upgrade.upgradeName, "ROSTER_CANDIDATE_UPGRADE_INVALID"),
      purchasableUpgradeProfileId: upgrade?.purchasableUpgradeProfileId === undefined
        ? null
        : nonEmpty(upgrade.purchasableUpgradeProfileId,
          "ROSTER_CANDIDATE_UPGRADE_INVALID"),
      nominatedModelId: upgrade?.nominatedModelId === undefined
        ? null : nonEmpty(upgrade.nominatedModelId, "ROSTER_CANDIDATE_UPGRADE_INVALID"),
    })),
  })).sort((left, right) => left.unitInstanceId.localeCompare(right.unitInstanceId));
  if (units.length === 0
    || new Set(units.map((entry) => entry.unitInstanceId)).size !== units.length) {
    fail("ROSTER_CANDIDATE_UNIT_INVALID");
  }
  let legalityReceipt = null;
  if (legalityStatus === "legal") {
    legalityReceipt = { auditResultHash: hash64(input.legalityReceipt?.auditResultHash,
      "ROSTER_CANDIDATE_LEGALITY_INVALID") };
  } else if (legalityStatus === "illegal") {
    legalityReceipt = {
      rejectionReceiptHash: hash64(input.legalityReceipt?.rejectionReceiptHash,
        "ROSTER_CANDIDATE_LEGALITY_INVALID"),
      rulesErrorCode: nonEmpty(input.legalityReceipt?.rulesErrorCode,
        "ROSTER_CANDIDATE_LEGALITY_INVALID"),
      rejectionKind: nonEmpty(input.legalityReceipt?.rejectionKind,
        "ROSTER_CANDIDATE_LEGALITY_INVALID"),
    };
  } else if (input.legalityReceipt !== undefined && input.legalityReceipt !== null) {
    fail("ROSTER_CANDIDATE_LEGALITY_INVALID", "unknown_legality_receipt_fabricated");
  }
  const body = {
    schema: ROSTER_PLAN_CANDIDATE_SCHEMA,
    candidateId: nonEmpty(input.candidateId, "ROSTER_CANDIDATE_INVALID"),
    sideKey: nonEmpty(input.sideKey, "ROSTER_CANDIDATE_INVALID"),
    factionRecordKey: nonEmpty(input.factionRecordKey, "ROSTER_CANDIDATE_INVALID"),
    scaleId,
    mineralBudget: nonNegativeInteger(input.mineralBudget, "ROSTER_CANDIDATE_INVALID"),
    tacticalCardRecordKeys: stringList(input.tacticalCardRecordKeys || [],
      "ROSTER_CANDIDATE_INVALID"),
    units,
    legalityStatus,
    legalityReceipt,
    rulesRemainSoleLegalityAuthority: true,
    trainingTruth: false,
  };
  exactKeys(body, ["schema", "candidateId", "sideKey", "factionRecordKey",
    "scaleId", "mineralBudget", "tacticalCardRecordKeys", "units",
    "legalityStatus", "legalityReceipt", "rulesRemainSoleLegalityAuthority",
    "trainingTruth"], "ROSTER_CANDIDATE_INVALID");
  return hashed(body, "candidateHash");
}

export function verifyRosterCandidateV1(value) {
  verifyHashed(value, ROSTER_PLAN_CANDIDATE_SCHEMA, "candidateHash",
    "ROSTER_CANDIDATE_INVALID");
  if (!CANDIDATE_LEGALITY_STATUSES.has(value.legalityStatus)
    || value.rulesRemainSoleLegalityAuthority !== true
    || value.trainingTruth !== false) {
    fail("ROSTER_CANDIDATE_INVALID");
  }
  if (value.legalityStatus === "legal"
    && !HASH_PATTERN.test(String(value.legalityReceipt?.auditResultHash))) {
    fail("ROSTER_CANDIDATE_LEGALITY_INVALID");
  }
  if (value.legalityStatus === "illegal"
    && (!HASH_PATTERN.test(String(value.legalityReceipt?.rejectionReceiptHash))
      || !value.legalityReceipt?.rulesErrorCode)) {
    fail("ROSTER_CANDIDATE_LEGALITY_INVALID");
  }
  if (value.legalityStatus === "unknown" && value.legalityReceipt !== null) {
    fail("ROSTER_CANDIDATE_LEGALITY_INVALID", "unknown_legality_receipt_fabricated");
  }
  return true;
}

export function createRosterCandidateComparisonV1(input = {}) {
  if (!object(input)) fail("ROSTER_COMPARISON_INVALID");
  const candidateHashes = (input.candidateHashes || []).map((entry) => (
    hash64(entry, "ROSTER_COMPARISON_INVALID"))).sort();
  if (candidateHashes.length < 2
    || new Set(candidateHashes).size !== candidateHashes.length) {
    fail("ROSTER_COMPARISON_INVALID", "at_least_two_distinct_candidates_required");
  }
  const selectionStatus = String(input.selectionStatus || "");
  if (!["selected", "undecided"].includes(selectionStatus)) {
    fail("ROSTER_COMPARISON_INVALID", selectionStatus);
  }
  const selectedCandidateHash = selectionStatus === "selected"
    ? hash64(input.selectedCandidateHash, "ROSTER_COMPARISON_INVALID") : null;
  if (selectedCandidateHash && !candidateHashes.includes(selectedCandidateHash)) {
    fail("ROSTER_COMPARISON_INVALID", "selected_candidate_not_compared");
  }
  const body = {
    schema: ROSTER_PLAN_CANDIDATE_COMPARISON_SCHEMA,
    comparisonId: nonEmpty(input.comparisonId, "ROSTER_COMPARISON_INVALID"),
    candidateHashes,
    basisTexts: stringList(input.basisTexts || [], "ROSTER_COMPARISON_INVALID",
      { allowEmpty: false }),
    tradeoffTexts: stringList(input.tradeoffTexts || [], "ROSTER_COMPARISON_INVALID"),
    selectionStatus,
    selectedCandidateHash,
    receiptReferenceIds: stringList(input.receiptReferenceIds || [],
      "ROSTER_COMPARISON_INVALID"),
    trainingTruth: false,
  };
  exactKeys(body, ["schema", "comparisonId", "candidateHashes", "basisTexts",
    "tradeoffTexts", "selectionStatus", "selectedCandidateHash",
    "receiptReferenceIds", "trainingTruth"], "ROSTER_COMPARISON_INVALID");
  return hashed(body, "comparisonHash");
}

export function verifyRosterCandidateComparisonV1(value) {
  verifyHashed(value, ROSTER_PLAN_CANDIDATE_COMPARISON_SCHEMA, "comparisonHash",
    "ROSTER_COMPARISON_INVALID");
  if (!Array.isArray(value.candidateHashes) || value.candidateHashes.length < 2
    || value.trainingTruth !== false) {
    fail("ROSTER_COMPARISON_INVALID");
  }
  if (value.selectionStatus === "selected"
    && !value.candidateHashes.includes(value.selectedCandidateHash)) {
    fail("ROSTER_COMPARISON_INVALID", "selected_candidate_not_compared");
  }
  return true;
}

const PRESET_ONLY_EMPTY_KEYS = Object.freeze([
  "componentPurposes", "opponentHypotheses", "counterResponses",
  "invalidationTriggers", "revisions", "comparisons", "toolReceiptReferences",
]);
const PLAN_KEYS = Object.freeze([
  "schema", "planId", "planVersion", "planStatus", "sideKey", "presetRoster",
  "planFabricated", "hiddenChainOfThoughtIncluded", "presetBinding", "provenance",
  "rosterCandidate", "scoreRoute", "lossResourceBudget", "componentPurposes",
  "deploymentConcept", "opponentHypotheses", "counterResponses",
  "invalidationTriggers", "revisions", "comparisons", "toolReceiptReferences",
  "publicSummaryText", "authorityBoundary", "trainingTruth", "planHash",
]);
// Contract 1.1.0 (Slice 272) adds the optional budgetAcceptance block. Plans
// written before 1.1.0 remain valid without it (legacy key set); new plans
// always carry the key (null for the preset arm and for unevaluated drafts).
const PLAN_KEYS_WITH_ACCEPTANCE = Object.freeze([
  ...PLAN_KEYS, "budgetAcceptance",
]);

export function createRosterPlanBudgetAcceptanceV1(input = {}) {
  if (!object(input)) fail("ROSTER_PLAN_BUDGET_ACCEPTANCE_INVALID");
  const code = "ROSTER_PLAN_BUDGET_ACCEPTANCE_INVALID";
  const contract = input.contract ?? ROSTER_FORMAL_BUDGET_CONTRACT_V1;
  if (contract.contractHash !== ROSTER_FORMAL_BUDGET_CONTRACT_V1.contractHash) {
    fail(code, "contractHash");
  }
  const mineralBudget = positiveInteger(input.mineralBudget, code);
  const mineralSpent = nonNegativeInteger(input.mineralSpent, code);
  if (mineralSpent > mineralBudget) fail(code, "mineralSpent");
  const mineralUnspent = mineralBudget - mineralSpent;
  const utilizationBasisPoints = Math.round(
    (mineralSpent * 10_000) / mineralBudget);
  const nearCapThresholdMinerals = positiveInteger(
    input.nearCapThresholdMinerals, code);
  const vespeneSpent = nonNegativeInteger(input.vespeneSpent, code);
  const vespeneLimitNumerator = positiveInteger(
    input.vespeneLimitNumerator, code);
  const vespeneLimitDenominator = positiveInteger(
    input.vespeneLimitDenominator, code);
  const vespeneFormalCap = Math.floor(
    vespeneLimitNumerator / vespeneLimitDenominator);
  const vespeneWithinFormalCap = vespeneSpent <= vespeneFormalCap;
  if (!vespeneWithinFormalCap) fail(code, "vespene_formal_cap_exceeded");
  const floor = contract.mineralUtilizationFloor;
  const meetsFloor = mineralSpent * floor.denominator
    >= mineralBudget * floor.numerator;
  const nearCap = mineralUnspent < nearCapThresholdMinerals;
  const expected = nearCap ? "met_near_cap_exemption"
    : meetsFloor ? "met" : "unmet_severe_underspend";
  // The status is always derived from the Rules-verdict facts; a caller may
  // pin it explicitly, but a contradiction fails closed.
  const status = input.status === undefined || input.status === null
    ? expected
    : nonEmpty(input.status, code);
  if (!ROSTER_PLAN_BUDGET_ACCEPTANCE_STATUSES.includes(status)
    || status !== expected) {
    fail(code, `status:${status}!=${expected}`);
  }
  return freezeDeep({
    schema: ROSTER_PLAN_BUDGET_ACCEPTANCE_SCHEMA,
    contractVersion: contract.version,
    contractHash: contract.contractHash,
    status,
    mineralBudget,
    mineralSpent,
    mineralUnspent,
    utilizationBasisPoints,
    floorNumerator: floor.numerator,
    floorDenominator: floor.denominator,
    nearCapThresholdMinerals,
    vespeneSpent,
    vespeneFormalCap,
    vespeneWithinFormalCap,
    toleranceDisplayTextZh: contract.toleranceDisplayTextZh,
    toleranceDisplayTextEn: contract.toleranceDisplayTextEn,
    trainingTruth: false,
  });
}

export function verifyRosterPlanBudgetAcceptanceV1(value) {
  const code = "ROSTER_PLAN_BUDGET_ACCEPTANCE_INVALID";
  if (!object(value) || value.schema !== ROSTER_PLAN_BUDGET_ACCEPTANCE_SCHEMA
    || value.contractVersion !== ROSTER_FORMAL_BUDGET_CONTRACT_V1.version
    || value.contractHash !== ROSTER_FORMAL_BUDGET_CONTRACT_V1.contractHash
    || !ROSTER_PLAN_BUDGET_ACCEPTANCE_STATUSES.includes(value.status)
    || value.vespeneWithinFormalCap !== true
    || value.trainingTruth !== false) {
    fail(code);
  }
  const mineralBudget = positiveInteger(value.mineralBudget, code);
  const mineralSpent = nonNegativeInteger(value.mineralSpent, code);
  const nearCapThresholdMinerals = positiveInteger(
    value.nearCapThresholdMinerals, code);
  const vespeneSpent = nonNegativeInteger(value.vespeneSpent, code);
  const vespeneFormalCap = nonNegativeInteger(value.vespeneFormalCap, code);
  const floor = ROSTER_FORMAL_BUDGET_CONTRACT_V1.mineralUtilizationFloor;
  if (mineralSpent > mineralBudget
    || value.mineralUnspent !== mineralBudget - mineralSpent
    || value.utilizationBasisPoints !== Math.round(
      (mineralSpent * 10_000) / mineralBudget)
    || value.floorNumerator !== floor.numerator
    || value.floorDenominator !== floor.denominator
    || vespeneSpent > vespeneFormalCap) {
    fail(code, "facts_inconsistent");
  }
  const nearCap = value.mineralUnspent < nearCapThresholdMinerals;
  const meetsFloor = mineralSpent * floor.denominator
    >= mineralBudget * floor.numerator;
  const expected = nearCap ? "met_near_cap_exemption"
    : meetsFloor ? "met" : "unmet_severe_underspend";
  if (value.status !== expected) fail(code, `status:${value.status}`);
  return true;
}

function checkPresetEmptiness(plan, code) {
  if (plan.scoreRoute !== null || plan.lossResourceBudget !== null
    || plan.deploymentConcept !== null || plan.rosterCandidate !== null
    || PRESET_ONLY_EMPTY_KEYS.some((key) => (plan[key] || []).length !== 0)) {
    fail(code, "preset_roster_plan_content_fabricated");
  }
}

export function createRosterPlanV1(input = {}) {
  if (!object(input)) fail("ROSTER_PLAN_INVALID");
  const planStatus = nonEmpty(input.planStatus, "ROSTER_PLAN_STATUS_INVALID");
  if (!ROSTER_PLAN_STATUSES.includes(planStatus)) {
    fail("ROSTER_PLAN_STATUS_INVALID", planStatus);
  }
  if (input.planFabricated === true || input.hiddenChainOfThoughtIncluded === true) {
    fail("ROSTER_PLAN_FABRICATION_FORBIDDEN");
  }
  const presetRoster = planStatus === "no_pregame_plan";
  if (input.presetRoster !== undefined && Boolean(input.presetRoster) !== presetRoster) {
    fail("ROSTER_PLAN_PRESET_BINDING_INVALID");
  }
  let presetBinding = null;
  if (presetRoster) {
    presetBinding = {
      rosterHash: hash64(input.presetBinding?.rosterHash,
        "ROSTER_PLAN_PRESET_BINDING_INVALID"),
      armyAuditResultHash: hash64OrNull(input.presetBinding?.armyAuditResultHash,
        "ROSTER_PLAN_PRESET_BINDING_INVALID"),
      presetSource: nonEmpty(input.presetBinding?.presetSource,
        "ROSTER_PLAN_PRESET_BINDING_INVALID"),
    };
  }
  const plan = {
    schema: ROSTER_PLAN_SCHEMA,
    planId: nonEmpty(input.planId, "ROSTER_PLAN_INVALID"),
    planVersion: positiveInteger(input.planVersion, "ROSTER_PLAN_INVALID"),
    planStatus,
    sideKey: nonEmpty(input.sideKey, "ROSTER_PLAN_INVALID"),
    presetRoster,
    planFabricated: false,
    hiddenChainOfThoughtIncluded: false,
    presetBinding,
    provenance: input.provenance ?? null,
    rosterCandidate: input.rosterCandidate ?? null,
    scoreRoute: input.scoreRoute ?? null,
    lossResourceBudget: input.lossResourceBudget ?? null,
    componentPurposes: input.componentPurposes || [],
    deploymentConcept: input.deploymentConcept ?? null,
    opponentHypotheses: input.opponentHypotheses || [],
    counterResponses: input.counterResponses || [],
    invalidationTriggers: input.invalidationTriggers || [],
    revisions: input.revisions || [],
    comparisons: input.comparisons || [],
    toolReceiptReferences: input.toolReceiptReferences || [],
    publicSummaryText: presetRoster ? null
      : nonEmpty(input.publicSummaryText || ROSTER_PLAN_UNKNOWN, "ROSTER_PLAN_INVALID"),
    authorityBoundary: { ...ROSTER_PLAN_CONTRACT_BOUNDARY },
    trainingTruth: false,
    budgetAcceptance: input.budgetAcceptance ?? null,
  };
  const draft = { ...plan, planHash: "" };
  plan.planHash = hashStarcraftTmgContract(without(draft, ["planHash"]));
  verifyRosterPlanV1(plan);
  return freezeDeep(plan);
}

export function createPresetRosterNoPregamePlanV1(input = {}) {
  return createRosterPlanV1({
    ...input,
    planStatus: "no_pregame_plan",
    planVersion: positiveInteger(input.planVersion ?? 1, "ROSTER_PLAN_INVALID"),
    presetRoster: true,
    provenance: null,
    publicSummaryText: null,
  });
}

export function verifyRosterPlanV1(plan) {
  verifyHashed(plan, ROSTER_PLAN_SCHEMA, "planHash", "ROSTER_PLAN_INVALID");
  const observedKeys = Object.keys(plan || {}).sort();
  if (!isDeepStrictEqual(observedKeys, [...PLAN_KEYS].sort())
    && !isDeepStrictEqual(observedKeys, [...PLAN_KEYS_WITH_ACCEPTANCE].sort())) {
    fail("ROSTER_PLAN_INVALID", observedKeys.join(","));
  }
  if (!ROSTER_PLAN_STATUSES.includes(plan.planStatus)
    || !Number.isSafeInteger(plan.planVersion) || plan.planVersion < 1
    || plan.planFabricated !== false || plan.hiddenChainOfThoughtIncluded !== false
    || plan.trainingTruth !== false) {
    fail("ROSTER_PLAN_INVALID");
  }
  if (!isDeepStrictEqual(plan.authorityBoundary, { ...ROSTER_PLAN_CONTRACT_BOUNDARY })) {
    fail("ROSTER_PLAN_AUTHORITY_BOUNDARY_INVALID");
  }
  if (plan.planStatus === "no_pregame_plan") {
    if (plan.presetRoster !== true || !object(plan.presetBinding)
      || !HASH_PATTERN.test(String(plan.presetBinding.rosterHash))
      || plan.provenance !== null || plan.publicSummaryText !== null
      || (plan.budgetAcceptance !== null
        && plan.budgetAcceptance !== undefined)) {
      fail("ROSTER_PLAN_PRESET_BINDING_INVALID");
    }
    checkPresetEmptiness(plan, "ROSTER_PLAN_PRESET_CONTENT_FORBIDDEN");
    return true;
  }
  if (plan.presetRoster !== false || plan.presetBinding !== null) {
    fail("ROSTER_PLAN_PRESET_BINDING_INVALID");
  }
  // Formal budget acceptance (contract 1.1.0, Slice 272): when the block is
  // present its facts must verify; a met contract is mandatory for
  // active/revised/completed, and an unmet (severe-underspend) acceptance
  // can only ever close as draft — never as a final formal success. Plans
  // written before 1.1.0 carry no block and stay valid as legacy evidence.
  const budgetAcceptance = plan.budgetAcceptance ?? null;
  if (budgetAcceptance !== null) {
    verifyRosterPlanBudgetAcceptanceV1(budgetAcceptance);
    if (budgetAcceptance.status === "unmet_severe_underspend"
      && !["draft", "abandoned"].includes(plan.planStatus)) {
      fail("ROSTER_PLAN_BUDGET_ACCEPTANCE_INVALID",
        `unmet_requires_draft:${plan.planStatus}`);
    }
    if (["active", "revised", "completed"].includes(plan.planStatus)
      && budgetAcceptance.status === "unmet_severe_underspend") {
      fail("ROSTER_PLAN_BUDGET_ACCEPTANCE_INVALID",
        `active_requires_met:${plan.planStatus}`);
    }
  }
  verifyRosterPlanProvenanceV1(plan.provenance);
  verifyRosterCandidateV1(plan.rosterCandidate);
  if (["active", "revised", "completed"].includes(plan.planStatus)
    && plan.rosterCandidate.legalityStatus !== "legal") {
    fail("ROSTER_PLAN_LEGALITY_REQUIRED", plan.planStatus);
  }
  if (plan.scoreRoute !== null) verifyRosterScoreRouteV1(plan.scoreRoute);
  if (plan.lossResourceBudget !== null) {
    verifyRosterLossResourceBudgetV1(plan.lossResourceBudget);
  }
  if (plan.deploymentConcept !== null) {
    verifyRosterDeploymentConceptV1(plan.deploymentConcept);
  }
  const purposeKeys = new Set();
  for (const purpose of plan.componentPurposes) {
    verifyRosterComponentPurposeV1(purpose);
    const key = `${purpose.componentKind}:${purpose.instanceId}`;
    if (purposeKeys.has(key)) fail("ROSTER_PLAN_COMPONENT_PURPOSE_DUPLICATE", key);
    purposeKeys.add(key);
  }
  const hypothesisIds = new Set();
  for (const hypothesis of plan.opponentHypotheses) {
    verifyOpponentArchetypeHypothesisV1(hypothesis);
    if (hypothesisIds.has(hypothesis.hypothesisId)) {
      fail("ROSTER_PLAN_OPPONENT_HYPOTHESIS_DUPLICATE", hypothesis.hypothesisId);
    }
    hypothesisIds.add(hypothesis.hypothesisId);
  }
  const responseIds = new Set();
  for (const response of plan.counterResponses) {
    verifyRosterCounterResponseV1(response);
    if (responseIds.has(response.responseId)) {
      fail("ROSTER_PLAN_COUNTER_RESPONSE_DUPLICATE", response.responseId);
    }
    responseIds.add(response.responseId);
    for (const linked of response.linkedHypothesisIds) {
      if (!hypothesisIds.has(linked)) {
        fail("ROSTER_PLAN_COUNTER_RESPONSE_LINK_UNKNOWN", linked);
      }
    }
  }
  for (const hypothesis of plan.opponentHypotheses) {
    for (const responseId of hypothesis.ownCounterResponseIds) {
      if (!responseIds.has(responseId)) {
        fail("ROSTER_PLAN_HYPOTHESIS_RESPONSE_LINK_UNKNOWN", responseId);
      }
    }
  }
  const triggerIds = new Set();
  for (const trigger of plan.invalidationTriggers) {
    verifyRosterInvalidationTriggerV1(trigger);
    if (triggerIds.has(trigger.triggerId)) {
      fail("ROSTER_PLAN_INVALIDATION_TRIGGER_DUPLICATE", trigger.triggerId);
    }
    triggerIds.add(trigger.triggerId);
  }
  const receiptReferenceIds = new Set();
  for (const reference of plan.toolReceiptReferences) {
    verifyRosterToolReceiptReferenceV1(reference);
    if (receiptReferenceIds.has(reference.referenceId)) {
      fail("ROSTER_PLAN_TOOL_RECEIPT_REFERENCE_DUPLICATE", reference.referenceId);
    }
    receiptReferenceIds.add(reference.referenceId);
  }
  for (const comparison of plan.comparisons) {
    verifyRosterCandidateComparisonV1(comparison);
    for (const referenceId of comparison.receiptReferenceIds) {
      if (!receiptReferenceIds.has(referenceId)) {
        fail("ROSTER_PLAN_COMPARISON_RECEIPT_LINK_UNKNOWN", referenceId);
      }
    }
  }
  const revisionIds = new Set();
  for (const revision of plan.revisions) {
    verifyRosterPlanRevisionEventV1(revision);
    if (revisionIds.has(revision.revisionId)
      || revision.planId !== plan.planId
      || revision.toPlanVersion > plan.planVersion) {
      fail("ROSTER_PLAN_REVISION_INVALID", revision.revisionId);
    }
    revisionIds.add(revision.revisionId);
    for (const triggerId of revision.triggerIds) {
      if (!triggerIds.has(triggerId)) {
        fail("ROSTER_PLAN_REVISION_TRIGGER_UNKNOWN", triggerId);
      }
    }
  }
  if (plan.planStatus === "revised" && plan.revisions.length === 0) {
    fail("ROSTER_PLAN_REVISION_INVALID", "revised_status_requires_revision_event");
  }
  return true;
}

export function serializeRosterPlanV1(plan) {
  verifyRosterPlanV1(plan);
  return JSON.stringify(plan);
}

export function parseRosterPlanV1(serialized) {
  let value;
  try {
    value = JSON.parse(String(serialized || ""));
  } catch {
    fail("ROSTER_PLAN_SERIALIZATION_INVALID");
  }
  verifyRosterPlanV1(value);
  return freezeDeep(value);
}

export function verifyRosterPlanRoundTripV1(plan) {
  verifyRosterPlanV1(plan);
  const restored = parseRosterPlanV1(serializeRosterPlanV1(plan));
  if (!isDeepStrictEqual(restored, plan) || restored.planHash !== plan.planHash) {
    fail("ROSTER_PLAN_ROUND_TRIP_DRIFT");
  }
  return true;
}
